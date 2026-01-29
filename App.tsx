import React, { useState, useMemo, useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { Dashboard } from './components/Dashboard';
import { ReviewSession } from './components/ReviewSession';
import { Library } from './components/Library';
import { CreateItem } from './components/CreateItem';
import { CalendarView } from './components/CalendarView';
import { SettingsView } from './components/SettingsView';
import { MOCK_ITEMS } from './services/mockData';
import { LearningItem, AlgorithmSettings, Tag } from './types';
import { DEFAULT_SETTINGS } from './services/srsSystem';

const STORAGE_KEY_ITEMS = 'cognicurve_items';
const STORAGE_KEY_SETTINGS = 'cognicurve_settings';
const STORAGE_KEY_DAILY = 'cognicurve_daily_stats';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isReviewing, setIsReviewing] = useState(false);
  
  // --- 1. Load Initial State (Persistence) ---
  const [items, setItems] = useState<LearningItem[]>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_ITEMS);
      if (saved) {
          try {
              // Revive Date objects from JSON strings
              return JSON.parse(saved, (key, value) => {
                  if (key === 'createdAt' || key === 'lastReviewedAt' || key === 'nextReviewAt') {
                      return value ? new Date(value) : null;
                  }
                  return value;
              });
          } catch (e) {
              console.error("Failed to load items", e);
          }
      }
      return MOCK_ITEMS;
  });

  const [algorithmSettings, setAlgorithmSettings] = useState<AlgorithmSettings>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_SETTINGS);
      return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });

  // Track daily progress: { date: 'YYYY-MM-DD', count: 0 }
  const [dailyStats, setDailyStats] = useState<{ date: string; count: number }>(() => {
      const saved = localStorage.getItem(STORAGE_KEY_DAILY);
      const todayStr = new Date().toDateString();
      if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.date === todayStr) return parsed;
      }
      return { date: todayStr, count: 0 };
  });

  // --- 2. Persist Changes ---
  useEffect(() => {
      try {
        localStorage.setItem(STORAGE_KEY_ITEMS, JSON.stringify(items));
      } catch (e) {
        console.error("LocalStorage Save Error", e);
        if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED')) {
             alert('警告：本地存储空间已满！\n\n无法保存新的学习进度。请尝试删除一些带有大图片的卡片，或清理浏览器缓存。');
        }
      }
  }, [items]);

  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(algorithmSettings));
  }, [algorithmSettings]);

  useEffect(() => {
      localStorage.setItem(STORAGE_KEY_DAILY, JSON.stringify(dailyStats));
  }, [dailyStats]);

  // --- 3. Derived Real-time Data ---
  const availableTags = useMemo(() => {
    const uniqueTags = new Map<string, Tag>();
    items.forEach(item => {
        item.tags.forEach(tag => {
            uniqueTags.set(tag.name, tag);
        });
    });
    return Array.from(uniqueTags.values());
  }, [items]);

  // Calculate Real Progress
  // Goal = (Reviewed Today) + (Currently Due)
  const dueCount = useMemo(() => items.filter(i => i.nextReviewAt <= new Date()).length, [items]);
  const todayGoalTotal = dailyStats.count + dueCount; 
  const todayProgressPercent = todayGoalTotal > 0 ? Math.round((dailyStats.count / todayGoalTotal) * 100) : 0;

  // --- Handlers ---

  const startReview = () => {
    setIsReviewing(true);
  };

  const endReview = () => {
    setIsReviewing(false);
    setActiveTab('dashboard');
  };

  const handleAddItem = (newItem: LearningItem) => {
    const itemWithSRS = {
        ...newItem,
        currentInterval: 0,
        stability: 1.0
    };
    setItems(prevItems => [itemWithSRS, ...prevItems]);
  };

  const handleImportItems = (newItems: LearningItem[]) => {
      // Logic to merge imported items. We prepend them to be seen first.
      // We don't check for duplicates strictly by ID because imports usually imply "New" items unless we implemented a sync logic.
      // To be safe, the importer in Library generates new IDs if needed, or we trust the input.
      setItems(prevItems => [...newItems, ...prevItems]);
      // Optional: Switch to library tab or show toast
  };

  const handleDeleteItems = (idsToDelete: string[]) => {
      setItems(prevItems => prevItems.filter(item => !idsToDelete.includes(item.id)));
  };

  const handleUpdateItem = (updatedItem: LearningItem) => {
    setItems(prevItems => prevItems.map(item => item.id === updatedItem.id ? updatedItem : item));
  };

  const handleItemReviewed = () => {
      setDailyStats(prev => {
          const todayStr = new Date().toDateString();
          if (prev.date !== todayStr) {
              return { date: todayStr, count: 1 };
          }
          return { ...prev, count: prev.count + 1 };
      });
  };

  if (isReviewing) {
    return (
      <ReviewSession 
        items={items.filter(i => i.nextReviewAt <= new Date())} 
        settings={algorithmSettings}
        onUpdateItem={handleUpdateItem}
        onReviewItem={handleItemReviewed} // Hook for stats
        onComplete={endReview} 
        onExit={endReview} 
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard items={items} onStartReview={startReview} />;
      case 'review':
        return (
          <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
             <h2 className="text-xl font-bold text-slate-700">准备好专注了吗？</h2>
             <p className="text-slate-500">当前有 {dueCount} 个待复习条目。</p>
             <button 
                onClick={startReview} 
                disabled={dueCount === 0}
                className={`px-6 py-3 text-white rounded-full font-medium shadow-lg transition-transform ${dueCount > 0 ? 'bg-primary-600 hover:scale-105' : 'bg-slate-400 cursor-not-allowed'}`}
             >
               {dueCount > 0 ? '开始复习' : '暂无任务'}
             </button>
          </div>
        );
      case 'create':
        return <CreateItem onAddItem={handleAddItem} availableTags={availableTags} />;
      case 'calendar':
        return <CalendarView items={items} />;
      case 'library':
        return (
            <Library 
                items={items} 
                onUpdateItem={handleUpdateItem} 
                onImportItems={handleImportItems} 
                onDeleteItems={handleDeleteItems}
            />
        );
      case 'settings':
        return (
            <SettingsView 
                settings={algorithmSettings} 
                onUpdateSettings={setAlgorithmSettings} 
                onReset={() => setAlgorithmSettings(DEFAULT_SETTINGS)}
            />
        );
      default:
        return <Dashboard items={items} onStartReview={startReview} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 font-sans text-slate-900">
      <Navigation 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        dailyProgress={{
            current: dailyStats.count,
            total: todayGoalTotal,
            percent: todayProgressPercent
        }}
      />
      
      <main className="flex-1 md:ml-64 p-4 md:p-8 lg:p-12 max-w-7xl mx-auto w-full transition-all">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;