import React, { useState, useMemo, useRef } from 'react';
import { LearningItem, CardType, Tag } from '../types';
import { Search, Filter, MoreHorizontal, BookOpen, Clock, X, Calendar, ArrowUpDown, ChevronDown, Edit2, Save, RotateCcw, CheckSquare, Layers, Tag as TagIcon, CheckCircle2, Download, Upload, FileJson } from 'lucide-react';

interface LibraryProps {
  items: LearningItem[];
  onUpdateItem: (item: LearningItem) => void;
  onImportItems?: (items: LearningItem[]) => void;
}

type SortKey = 'createdAt' | 'title' | 'lastReviewedAt' | 'retentionScore';
type SortDirection = 'asc' | 'desc';

export const Library: React.FC<LibraryProps> = ({ items, onUpdateItem, onImportItems }) => {
  // --- State: View & Selection ---
  const [selectedItem, setSelectedItem] = useState<LearningItem | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  // --- State: Batch Mode ---
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [batchActionStep, setBatchActionStep] = useState<'none' | 'status' | 'tag'>('none');
  const [batchTagInput, setBatchTagInput] = useState('');

  // --- State: Filters ---
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({ start: '', end: '' });

  // --- State: Sorting ---
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: SortDirection }>({
    key: 'createdAt',
    direction: 'desc'
  });

  // --- State: Editing Form ---
  const [editForm, setEditForm] = useState<Partial<LearningItem>>({});
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Derived Data: Available Tags ---
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    items.forEach(item => item.tags.forEach(t => tags.add(t.name)));
    return Array.from(tags);
  }, [items]);

  // --- Logic: Filtering & Sorting ---
  const processedItems = useMemo(() => {
    let result = [...items];

    // 1. Search
    if (search) {
      const lowerSearch = search.toLowerCase();
      result = result.filter(item => 
        item.title.toLowerCase().includes(lowerSearch) || 
        item.contentFront.toLowerCase().includes(lowerSearch)
      );
    }

    // 2. Filter by Tags (OR logic - match any selected tag)
    if (selectedTags.length > 0) {
      result = result.filter(item => 
        item.tags.some(t => selectedTags.includes(t.name))
      );
    }

    // 3. Filter by Status
    if (selectedStatuses.length > 0) {
      result = result.filter(item => selectedStatuses.includes(item.status));
    }

    // 4. Filter by Date Range
    if (dateRange.start) {
      result = result.filter(item => new Date(item.createdAt) >= new Date(dateRange.start));
    }
    if (dateRange.end) {
      const endDate = new Date(dateRange.end);
      endDate.setHours(23, 59, 59, 999); // Include the whole end day
      result = result.filter(item => new Date(item.createdAt) <= endDate);
    }

    // 5. Sorting
    result.sort((a, b) => {
      let aValue: any = a[sortConfig.key];
      let bValue: any = b[sortConfig.key];

      // Handle null dates for lastReviewedAt
      if (sortConfig.key === 'lastReviewedAt') {
        aValue = aValue ? new Date(aValue).getTime() : 0;
        bValue = bValue ? new Date(bValue).getTime() : 0;
      } else if (sortConfig.key === 'createdAt') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [items, search, selectedTags, selectedStatuses, dateRange, sortConfig]);

  // --- Handlers: JSON Import/Export ---

  const handleExportJSON = () => {
    // Convert data to JSON string
    const dataStr = JSON.stringify(items, null, 2);
    // Create a Blob
    const blob = new Blob([dataStr], { type: 'application/json' });
    // Create download link
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `CogniCurve_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
      fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
          const content = evt.target?.result as string;
          if (!content) return;

          try {
              // Parse JSON with date revival
              const parsedData = JSON.parse(content, (key, value) => {
                 // Simple regex to check for ISO date strings
                 if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(value)) {
                     return new Date(value);
                 }
                 return value;
              });

              if (Array.isArray(parsedData)) {
                  // Basic validation: check if items have 'id' and 'type'
                  const validItems = parsedData.filter(i => i.id && i.type && i.title);
                  
                  if (validItems.length > 0 && onImportItems) {
                      const confirmMsg = `成功解析 ${validItems.length} 条数据 (JSON)。\n\n是否导入？这将与现有数据合并。`;
                      if (confirm(confirmMsg)) {
                          // Ensure IDs are unique to avoid collision if importing same file twice (optional, but safer to re-id)
                          // For a pure backup/restore, we might want to keep IDs.
                          // Let's keep IDs but assume the App.tsx handles merge or overwrite.
                          // Actually, generating new IDs is safer for "Importing" external lists.
                          
                          // Strategy: Ask user? For simplicity, we regenerate IDs to treat them as NEW copies.
                          const rehydratedItems = validItems.map(item => ({
                              ...item,
                              id: `imported-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                              status: 'new', // Reset progress for imported shared decks
                              reviewCount: 0,
                              retentionScore: 0,
                              lastReviewedAt: null,
                              nextReviewAt: new Date()
                          }));
                          
                          onImportItems(rehydratedItems);
                          alert('导入成功！所有条目已添加为新卡片。');
                      }
                  } else {
                      alert('文件格式正确，但未找到有效的卡片数据。');
                  }
              } else {
                  alert('无效的 JSON 结构。必须是卡片数组。');
              }
          } catch (err) {
              console.error(err);
              alert('解析 JSON 失败。请确保文件未损坏。');
          }
      };
      reader.readAsText(file);
      
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };


  // --- Handlers: Batch Mode ---

  const toggleBatchMode = () => {
    if (isBatchMode) {
        // Exit batch mode
        setIsBatchMode(false);
        setSelectedIds(new Set());
        setBatchActionStep('none');
    } else {
        // Enter batch mode
        setIsBatchMode(true);
        setShowFilters(false);
    }
  };

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
        newSet.delete(id);
    } else {
        newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const selectAll = () => {
    if (selectedIds.size === processedItems.length) {
        setSelectedIds(new Set());
    } else {
        const newSet = new Set<string>();
        processedItems.forEach(i => newSet.add(i.id));
        setSelectedIds(newSet);
    }
  };

  const executeBatchStatusUpdate = (status: 'new' | 'learning' | 'review' | 'mastered') => {
      if (confirm(`确定要将选中的 ${selectedIds.size} 个条目状态更改为 "${status}" 吗？`)) {
          selectedIds.forEach(id => {
              const item = items.find(i => i.id === id);
              if (item) {
                  onUpdateItem({ ...item, status });
              }
          });
          setIsBatchMode(false);
          setSelectedIds(new Set());
          setBatchActionStep('none');
      }
  };

  const executeBatchAddTag = () => {
      if (!batchTagInput.trim()) return;
      
      const newTagName = batchTagInput.trim();
      
      selectedIds.forEach(id => {
          const item = items.find(i => i.id === id);
          if (item) {
              // Check if tag exists
              if (!item.tags.some(t => t.name === newTagName)) {
                  const newTagObj = {
                      id: `tag-${Date.now()}-${Math.random()}`,
                      name: newTagName,
                      color: 'bg-slate-100 text-slate-800'
                  };
                  onUpdateItem({ ...item, tags: [...item.tags, newTagObj] });
              }
          }
      });
      
      setBatchTagInput('');
      setIsBatchMode(false);
      setSelectedIds(new Set());
      setBatchActionStep('none');
  };

  // --- Handlers: Filters & Sort ---

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const toggleStatus = (status: string) => {
    setSelectedStatuses(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const startEdit = () => {
    if (selectedItem) {
      setEditForm({ ...selectedItem });
      setIsEditing(true);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setEditForm({});
  };

  const saveEdit = () => {
    if (selectedItem && editForm.title && editForm.contentFront) {
      const updatedItem = { ...selectedItem, ...editForm } as LearningItem;
      onUpdateItem(updatedItem);
      setSelectedItem(updatedItem); // Update local modal view
      setIsEditing(false);
    } else {
        alert("标题和正面内容不能为空");
    }
  };

  return (
    <div className="space-y-6 pb-32 md:pb-0 h-full relative">
      <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept=".json" />
      
      {/* --- Header & Search Bar --- */}
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-end">
             <div>
                <h2 className="text-2xl font-bold text-slate-900">知识库</h2>
                <p className="text-slate-500 text-sm">共 {items.length} 个条目，显示 {processedItems.length} 个。</p>
            </div>
            <div className="flex gap-2">
                 {/* Icons Swapped as requested: Export gets Upload (Arrow Up), Import gets Download (Arrow Down) */}
                 <button 
                    onClick={handleExportJSON}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    title="导出备份 (JSON)"
                >
                    <Upload size={16} /> <span className="hidden sm:inline">导出</span>
                </button>
                 <button 
                    onClick={handleImportClick}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    title="导入备份 (JSON)"
                >
                    <Download size={16} /> <span className="hidden sm:inline">导入</span>
                </button>
                <div className="w-px h-6 bg-slate-300 mx-1"></div>
                <button 
                    onClick={toggleBatchMode}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        isBatchMode 
                        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' 
                        : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                >
                    <CheckSquare size={16} />
                    <span className="hidden sm:inline">{isBatchMode ? '退出批量' : '批量管理'}</span>
                </button>
                <button 
                    onClick={() => setShowFilters(!showFilters)}
                    disabled={isBatchMode}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                        showFilters ? 'bg-slate-800 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
                    } ${isBatchMode ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <Filter size={16} />
                    <span className="hidden sm:inline">筛选</span>
                    {(selectedTags.length > 0 || selectedStatuses.length > 0 || dateRange.start || dateRange.end) && (
                        <span className="w-2 h-2 rounded-full bg-primary-500"></span>
                    )}
                </button>
            </div>
        </div>
        
        <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
                type="text" 
                placeholder="搜索标题、内容关键词..." 
                className="pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 w-full shadow-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                disabled={isBatchMode}
            />
        </div>
      </div>

      {/* --- Batch Mode Sub-Header --- */}
      {isBatchMode && (
          <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-2xl flex justify-between items-center animate-fade-in">
              <div className="flex items-center gap-3">
                  <div className="bg-indigo-100 p-2 rounded-lg text-indigo-600">
                      <Layers size={20} />
                  </div>
                  <div>
                      <p className="font-bold text-indigo-900 text-sm">批量选择模式</p>
                      <p className="text-xs text-indigo-600">已选择 {selectedIds.size} 个条目</p>
                  </div>
              </div>
              <button 
                onClick={selectAll}
                className="text-xs font-semibold text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors"
              >
                  {selectedIds.size === processedItems.length ? '取消全选' : '全选当前'}
              </button>
          </div>
      )}

      {/* --- Advanced Filters Panel --- */}
      {showFilters && !isBatchMode && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm animate-fade-in space-y-5">
            {/* Sorting */}
            <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-3">排序方式</h4>
                <div className="flex flex-wrap gap-2">
                    {[
                        { key: 'createdAt', label: '创建时间' },
                        { key: 'title', label: '标题' },
                        { key: 'lastReviewedAt', label: '最近复习' },
                        { key: 'retentionScore', label: '记忆保持率' }
                    ].map((opt) => (
                        <button
                            key={opt.key}
                            onClick={() => handleSort(opt.key as SortKey)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border flex items-center gap-1.5 transition-all ${
                                sortConfig.key === opt.key 
                                ? 'bg-primary-50 border-primary-500 text-primary-700' 
                                : 'bg-slate-50 border-transparent text-slate-600 hover:bg-slate-100'
                            }`}
                        >
                            {opt.label}
                            {sortConfig.key === opt.key && (
                                <ArrowUpDown size={12} className={sortConfig.direction === 'asc' ? 'rotate-180' : ''} />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            <div className="h-px bg-slate-100"></div>

            {/* Tags */}
            <div>
                <h4 className="text-xs font-semibold text-slate-400 uppercase mb-3">标签筛选</h4>
                <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => (
                        <button
                            key={tag}
                            onClick={() => toggleTag(tag)}
                            className={`px-3 py-1 rounded-full text-xs transition-colors border ${
                                selectedTags.includes(tag)
                                ? 'bg-slate-800 text-white border-slate-800'
                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                            }`}
                        >
                            {tag}
                        </button>
                    ))}
                    {allTags.length === 0 && <span className="text-xs text-slate-400">暂无标签</span>}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Status */}
                <div>
                     <h4 className="text-xs font-semibold text-slate-400 uppercase mb-3">学习状态</h4>
                     <div className="flex flex-wrap gap-3">
                        {['new', 'learning', 'review', 'mastered'].map(status => {
                             const labels: Record<string, string> = { new: '新条目', learning: '学习中', review: '复习', mastered: '已掌握' };
                             return (
                                <label key={status} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                    <input 
                                        type="checkbox" 
                                        checked={selectedStatuses.includes(status)}
                                        onChange={() => toggleStatus(status)}
                                        className="rounded text-primary-600 focus:ring-primary-500"
                                    />
                                    {labels[status]}
                                </label>
                             );
                        })}
                     </div>
                </div>

                {/* Date Range */}
                <div>
                    <h4 className="text-xs font-semibold text-slate-400 uppercase mb-3">创建日期</h4>
                    <div className="flex items-center gap-2">
                        <input 
                            type="date" 
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary-500"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                        />
                        <span className="text-slate-400">-</span>
                        <input 
                            type="date" 
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-primary-500"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                        />
                    </div>
                </div>
            </div>
            
            <div className="flex justify-end pt-2">
                 <button 
                    onClick={() => {
                        setSelectedTags([]);
                        setSelectedStatuses([]);
                        setDateRange({ start: '', end: '' });
                        setSearch('');
                    }}
                    className="text-xs text-rose-500 hover:text-rose-600 font-medium flex items-center gap-1"
                >
                    <RotateCcw size={12} /> 重置所有筛选
                </button>
            </div>
        </div>
      )}

      {/* --- Item Grid (Flat View) --- */}
      {processedItems.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-slate-400">
              <BookOpen size={48} className="mb-4 opacity-50" />
              <p>没有找到匹配的条目。</p>
          </div>
      ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {processedItems.map(item => {
                const isSelected = selectedIds.has(item.id);
                return (
                    <div 
                        key={item.id} 
                        onClick={() => {
                            if (isBatchMode) {
                                toggleSelection(item.id);
                            } else {
                                setSelectedItem(item);
                            }
                        }}
                        className={`group bg-white p-5 rounded-2xl shadow-sm border transition-all flex flex-col h-full relative overflow-hidden ${
                            isBatchMode 
                                ? 'cursor-pointer' 
                                : 'cursor-pointer hover:shadow-md hover:border-primary-100'
                        } ${
                            isSelected 
                                ? 'border-indigo-500 ring-2 ring-indigo-100 bg-indigo-50/10' 
                                : isBatchMode 
                                    ? 'border-slate-200 opacity-80 hover:opacity-100' 
                                    : 'border-slate-100'
                        }`}
                    >
                        {isBatchMode && (
                             <div className={`absolute top-4 right-4 w-6 h-6 rounded-full border-2 flex items-center justify-center z-10 transition-colors ${
                                 isSelected ? 'bg-indigo-500 border-indigo-500 text-white' : 'bg-white border-slate-300'
                             }`}>
                                 {isSelected && <CheckCircle2 size={14} />}
                             </div>
                        )}

                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center space-x-2">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    item.status === 'mastered' ? 'bg-emerald-100 text-emerald-700' : 
                                    item.status === 'learning' ? 'bg-amber-100 text-amber-700' :
                                    'bg-slate-100 text-slate-600'
                                }`}>
                                    {item.type}
                                </span>
                            </div>
                            <div className="flex items-center gap-1">
                                <span className="text-[10px] text-slate-400 mr-1">
                                    {new Date(item.createdAt).toLocaleDateString('zh-CN')}
                                </span>
                                {!isBatchMode && (
                                    <>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditForm({ ...item });
                                                setSelectedItem(item);
                                                setIsEditing(true);
                                            }}
                                            className="p-1.5 text-slate-300 hover:text-primary-600 hover:bg-primary-50 rounded-full transition-colors"
                                            title="编辑"
                                        >
                                            <Edit2 size={14} />
                                        </button>
                                        <button className="p-1.5 text-slate-300 hover:text-slate-600 rounded-full hover:bg-slate-100 transition-colors">
                                            <MoreHorizontal size={16} />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        <h3 className="font-semibold text-slate-800 mb-2 truncate">{item.title}</h3>
                        <p className="text-sm text-slate-500 line-clamp-2 mb-4 h-10 flex-grow">{item.contentFront}</p>

                        {item.mediaUrl && (
                            <div className="mb-4 h-24 bg-slate-50 rounded-lg overflow-hidden border border-slate-100 flex items-center justify-center">
                                <img src={item.mediaUrl} alt="Preview" className="max-h-full max-w-full object-cover" />
                            </div>
                        )}

                        <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                            <div className="flex items-center space-x-2 overflow-hidden">
                                {item.tags.slice(0, 2).map(tag => (
                                    <span key={tag.id} className="text-[10px] px-2 py-1 bg-slate-50 rounded-full text-slate-500 truncate max-w-[80px]">{tag.name}</span>
                                ))}
                            </div>
                            
                            <div className="flex items-center space-x-1" title="记忆评分">
                                <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div 
                                        className={`h-full rounded-full ${
                                            item.retentionScore > 80 ? 'bg-emerald-500' :
                                            item.retentionScore > 50 ? 'bg-primary-500' : 'bg-rose-500'
                                        }`} 
                                        style={{ width: `${item.retentionScore}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })}
          </div>
      )}

      {/* --- Batch Mode Action Bar (Bottom Fixed) --- */}
      {isBatchMode && selectedIds.size > 0 && (
          <div className="fixed bottom-24 md:bottom-8 left-0 right-0 z-40 px-6 pointer-events-none flex justify-center animate-bounce-in">
              <div className="bg-slate-900 text-white p-2 rounded-2xl shadow-2xl flex items-center gap-2 pointer-events-auto max-w-xl w-full">
                  
                  {batchActionStep === 'none' ? (
                      <>
                        <div className="px-4 text-sm font-semibold border-r border-slate-700 whitespace-nowrap">
                            已选 {selectedIds.size} 项
                        </div>
                        <button 
                            onClick={() => setBatchActionStep('status')}
                            className="flex-1 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                            <Layers size={16} /> 更改状态
                        </button>
                        <button 
                             onClick={() => setBatchActionStep('tag')}
                            className="flex-1 px-4 py-3 rounded-xl hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                            <TagIcon size={16} /> 添加标签
                        </button>
                      </>
                  ) : batchActionStep === 'status' ? (
                      <>
                        <button onClick={() => setBatchActionStep('none')} className="p-3 hover:bg-slate-800 rounded-xl"><X size={16}/></button>
                        <div className="flex-1 flex gap-1 overflow-x-auto">
                            {[
                                { id: 'new', label: '重置(New)', color: 'bg-slate-700' },
                                { id: 'learning', label: '学习中', color: 'bg-amber-600' },
                                { id: 'review', label: '待复习', color: 'bg-blue-600' },
                                { id: 'mastered', label: '已掌握', color: 'bg-emerald-600' },
                            ].map(opt => (
                                <button
                                    key={opt.id}
                                    onClick={() => executeBatchStatusUpdate(opt.id as any)}
                                    className={`px-3 py-2 rounded-lg text-xs font-bold whitespace-nowrap ${opt.color} hover:opacity-90`}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                      </>
                  ) : (
                      <>
                        <button onClick={() => setBatchActionStep('none')} className="p-3 hover:bg-slate-800 rounded-xl"><X size={16}/></button>
                        <input 
                            type="text" 
                            autoFocus
                            placeholder="输入新标签名称..."
                            className="flex-1 bg-slate-800 border-none outline-none text-white px-3 py-2 rounded-lg text-sm"
                            value={batchTagInput}
                            onChange={(e) => setBatchTagInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && executeBatchAddTag()}
                        />
                        <button 
                            onClick={executeBatchAddTag}
                            className="px-4 py-2 bg-indigo-600 rounded-lg text-xs font-bold hover:bg-indigo-500"
                        >
                            添加
                        </button>
                      </>
                  )}
              </div>
          </div>
      )}

      {/* --- Detail / Edit Modal --- */}
      {selectedItem && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onClick={() => { setSelectedItem(null); setIsEditing(false); }}>
              <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto animate-fade-in" onClick={e => e.stopPropagation()}>
                  <div className="p-6 md:p-8 space-y-6">
                      
                      {/* Modal Header */}
                      <div className="flex justify-between items-start">
                          <div className="flex-1 mr-4">
                              <div className="flex items-center gap-2 mb-2">
                                  <span className="px-2 py-1 bg-slate-100 rounded text-xs font-bold text-slate-600 uppercase">{selectedItem.type}</span>
                                  <span className="text-xs text-slate-400 flex items-center gap-1"><Calendar size={12}/> 创建于 {new Date(selectedItem.createdAt).toLocaleDateString('zh-CN')}</span>
                              </div>
                              {isEditing ? (
                                  <input 
                                    type="text" 
                                    value={editForm.title || ''}
                                    onChange={e => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                                    className="text-2xl font-bold text-slate-900 w-full border-b-2 border-primary-500 outline-none pb-1 bg-transparent"
                                  />
                              ) : (
                                  <h2 className="text-2xl font-bold text-slate-900">{selectedItem.title}</h2>
                              )}
                          </div>
                          <div className="flex items-center gap-2">
                              {!isEditing ? (
                                  <>
                                    <button onClick={startEdit} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors" title="编辑">
                                        <Edit2 size={20} />
                                    </button>
                                    <button onClick={() => setSelectedItem(null)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
                                        <X size={24} />
                                    </button>
                                  </>
                              ) : (
                                  <>
                                    <button onClick={saveEdit} className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-full transition-colors shadow-lg shadow-primary-500/30" title="保存">
                                        <Save size={20} />
                                    </button>
                                    <button onClick={cancelEdit} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors" title="取消">
                                        <X size={24} />
                                    </button>
                                  </>
                              )}
                          </div>
                      </div>

                      {selectedItem.mediaUrl && !isEditing && (
                          <div className="rounded-xl overflow-hidden border border-slate-200 bg-slate-50 flex items-center justify-center max-h-80">
                              <img src={selectedItem.mediaUrl} alt="Visual content" className="max-w-full max-h-full" />
                          </div>
                      )}
                      {/* Note: Simplified edit for media - allowing removal only in text mode for now or keeping as is */}

                      <div className="space-y-4">
                          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
                              <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">正面内容 / 问题</h4>
                              {isEditing ? (
                                  <textarea 
                                    value={editForm.contentFront || ''}
                                    onChange={e => setEditForm(prev => ({ ...prev, contentFront: e.target.value }))}
                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-800 text-lg outline-none focus:border-primary-500 min-h-[100px]"
                                  />
                              ) : (
                                  <p className="text-slate-800 text-lg whitespace-pre-wrap">{selectedItem.contentFront}</p>
                              )}
                          </div>

                          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
                              <h4 className="text-xs font-semibold text-emerald-600 uppercase mb-2">背面内容 / 解析</h4>
                              {isEditing ? (
                                  <textarea 
                                    value={editForm.contentBack || ''}
                                    onChange={e => setEditForm(prev => ({ ...prev, contentBack: e.target.value }))}
                                    className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-800 text-lg outline-none focus:border-primary-500 min-h-[100px]"
                                  />
                              ) : (
                                  <p className="text-slate-800 text-lg whitespace-pre-wrap">{selectedItem.contentBack}</p>
                              )}
                          </div>
                          
                          {(selectedItem.extraContext || isEditing) && (
                              <div className="p-4 rounded-2xl border border-slate-100">
                                  <h4 className="text-xs font-semibold text-slate-400 uppercase mb-2">补充背景</h4>
                                  {isEditing ? (
                                     <textarea 
                                        value={editForm.extraContext || ''}
                                        onChange={e => setEditForm(prev => ({ ...prev, extraContext: e.target.value }))}
                                        placeholder="添加补充背景..."
                                        className="w-full bg-white border border-slate-200 rounded-xl p-3 text-sm outline-none focus:border-primary-500 min-h-[60px]"
                                      />
                                  ) : (
                                      <p className="text-slate-600 text-sm">{selectedItem.extraContext}</p>
                                  )}
                              </div>
                          )}
                      </div>

                      {!isEditing && (
                        <div className="pt-6 border-t border-slate-100 flex justify-between items-center">
                            <div className="flex gap-2">
                                {selectedItem.tags.map(tag => (
                                    <span key={tag.id} className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">{tag.name}</span>
                                ))}
                            </div>
                            <div className="text-right">
                                <p className="text-xs text-slate-400 uppercase">当前记忆率</p>
                                <p className={`font-bold text-xl ${
                                    selectedItem.retentionScore > 80 ? 'text-emerald-500' : 
                                    selectedItem.retentionScore > 50 ? 'text-primary-500' : 'text-rose-500'
                                }`}>
                                    {selectedItem.retentionScore}%
                                </p>
                            </div>
                        </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};