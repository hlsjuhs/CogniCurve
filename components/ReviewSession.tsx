import React, { useState, useEffect, useMemo } from 'react';
import { LearningItem, Difficulty, AlgorithmSettings, CardType } from '../types';
import { calculateNextReview } from '../services/srsSystem';
import { X, RotateCcw, ThumbsUp, Check, Award, Maximize2, Minimize2, ZoomIn } from 'lucide-react';
import { AlertCircle } from 'lucide-react';

interface ReviewSessionProps {
  items: LearningItem[];
  settings: AlgorithmSettings;
  onUpdateItem: (item: LearningItem) => void;
  onReviewItem?: () => void;
  onComplete: () => void;
  onExit: () => void;
}

// Utility to shuffle array (Fisher-Yates) for Interleaved Practice
const shuffleArray = <T,>(array: T[]): T[] => {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
};

export const ReviewSession: React.FC<ReviewSessionProps> = ({ items, settings, onUpdateItem, onReviewItem, onComplete, onExit }) => {
  // Optimization: Initialize queue with SHUFFLED items for Interleaved Practice
  // This helps memory retention better than blocked practice (AAABBB vs ABABAB)
  const [queue, setQueue] = useState<LearningItem[]>(() => shuffleArray(items));
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [sessionStats, setSessionStats] = useState({ correct: 0, hard: 0 });
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const currentItem = queue[currentIndex];

  useEffect(() => {
    // If props change significantly, you might want to reset, but usually review session is modal
  }, [items]);

  const annotations = useMemo(() => {
      if (!currentItem || currentItem.type !== CardType.VISUAL || !currentItem.extraContext) return [];
      try {
          const parsed = JSON.parse(currentItem.extraContext);
          return Array.isArray(parsed.visualAnnotations) ? parsed.visualAnnotations : [];
      } catch {
          return [];
      }
  }, [currentItem]);

  const handleFlip = () => setIsFlipped(!isFlipped);

  const handleResponse = (difficulty: Difficulty) => {
    if (!currentItem) return;

    // 1. Calculate new state using the SRS System
    const updates = calculateNextReview(currentItem, difficulty, settings);
    
    // 2. Update the actual item
    const updatedItem = { ...currentItem, ...updates };
    onUpdateItem(updatedItem);

    // 3. Update Daily Stats (Global)
    if (onReviewItem) {
        onReviewItem();
    }

    // 4. Update session stats (Local)
    if (difficulty === Difficulty.EASY || difficulty === Difficulty.MEDIUM) {
        setSessionStats(prev => ({ ...prev, correct: prev.correct + 1}));
    } else {
        setSessionStats(prev => ({ ...prev, hard: prev.hard + 1}));
    }

    // 5. Move next
    if (currentIndex < queue.length - 1) {
      setIsFlipped(false);
      setTimeout(() => setCurrentIndex(prev => prev + 1), 150);
    } else {
      onComplete();
    }
  };
  
  const getNextIntervalPreview = (diff: Difficulty) => {
      if (!currentItem) return '';
      const update = calculateNextReview(currentItem, diff, settings);
      const days = update.currentInterval || 0;
      
      if (days < 0.005) return '1 分钟';
      if (days < 0.03) return '30 分钟';
      if (days < 1) return '< 1 天';
      return `${Math.round(days)} 天`;
  };

  const getTextLengthConfig = (text: string, isFront: boolean) => {
      const cleanText = text.replace(/{{c\d::|}}/g, ''); 
      const len = cleanText.length;

      if (isFront) {
          if (len <= 5) return { 
              container: "items-center justify-center text-center",
              text: "text-6xl md:text-8xl font-bold tracking-tight leading-tight"
          };
          if (len <= 20) return { 
              container: "items-center justify-center text-center", 
              text: "text-4xl md:text-6xl font-bold leading-tight"
          };
          if (len <= 50) return { 
              container: "items-center justify-center text-center", 
              text: "text-3xl md:text-5xl font-semibold leading-snug"
          };
          if (len <= 100) return { 
              container: "items-center justify-center text-center", 
              text: "text-2xl md:text-4xl font-medium leading-relaxed"
          };
          return { 
              container: "items-start justify-start text-left pt-2", 
              text: "text-xl md:text-3xl font-medium leading-relaxed" 
          };
      } else {
          if (len <= 10) return { 
              container: "items-center justify-center text-center", 
              text: "text-5xl md:text-7xl font-bold text-slate-800 leading-tight" 
          };
          if (len <= 40) return { 
              container: "items-center justify-center text-center", 
              text: "text-3xl md:text-5xl font-medium text-slate-700 leading-normal" 
          };
          if (len <= 120) return { 
              container: "items-center justify-center text-center", 
              text: "text-2xl md:text-3xl font-medium text-slate-700 leading-relaxed" 
          };
          return { 
              container: "items-start justify-start text-left pt-2", 
              text: "text-lg md:text-2xl text-slate-600 leading-relaxed" 
          };
      }
  };

  const renderFrontContent = () => {
    if (!currentItem) return null;

    const styleConfig = getTextLengthConfig(currentItem.contentFront, true);
    let contentNode: React.ReactNode = currentItem.contentFront;

    if (currentItem.type === CardType.CLOZE) {
        const parts = currentItem.contentFront.split(/({{c1::.*?}})/g);
        contentNode = (
            <span className="inline leading-relaxed">
                {parts.map((part, i) => {
                    if (part.startsWith('{{c1::') && part.endsWith('}}')) {
                        return (
                            <span key={i} className="bg-slate-200 text-slate-400 px-2 py-0.5 rounded mx-1 font-mono text-[0.9em] align-middle shadow-inner border border-slate-300 select-none">
                                [ ... ]
                            </span>
                        );
                    }
                    return <span key={i}>{part}</span>;
                })}
            </span>
        );
    }

    return (
        <div className={`w-full h-full flex flex-col ${styleConfig.container} overflow-y-auto no-scrollbar`}>
             <div className={`${styleConfig.text} font-serif text-slate-800 max-w-full break-words`}>
                {contentNode}
             </div>
             
             {currentItem.mediaUrl && (
                 <div className="mt-6 w-full flex justify-center flex-shrink-0 group/image relative">
                    <div 
                        className="relative rounded-xl border border-slate-100 bg-slate-50 overflow-hidden max-h-[40vh] w-auto inline-block shadow-sm cursor-zoom-in"
                        onClick={(e) => { e.stopPropagation(); setZoomedImage(currentItem.mediaUrl || null); }}
                    >
                        <img src={currentItem.mediaUrl} className="max-h-[40vh] w-auto object-contain" alt="Visual content" />
                        
                        {annotations.map((ann: any) => (
                        <div 
                            key={ann.id}
                            className={`absolute flex items-center justify-center ${ann.color || 'bg-primary-500/20 border-2 border-primary-500'}`}
                            style={{ 
                                left: `${ann.x}%`, 
                                top: `${ann.y}%`, 
                                width: `${ann.width}%`, 
                                height: `${ann.height}%`,
                                opacity: ann.opacity ?? 1
                            }}
                        >
                            <span className="bg-primary-600 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-sm absolute -top-2 -left-2 font-bold z-10" style={{ opacity: 1 }}>
                                {ann.label}
                            </span>
                        </div>
                        ))}

                        <div className="absolute inset-0 bg-black/0 group-hover/image:bg-black/10 transition-colors flex items-center justify-center opacity-0 group-hover/image:opacity-100">
                             <div className="bg-white/90 p-2 rounded-full shadow-lg backdrop-blur-sm">
                                 <ZoomIn size={20} className="text-slate-700" />
                             </div>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
  };

  const renderBackContent = () => {
      if (!currentItem) return null;
      const styleConfig = getTextLengthConfig(currentItem.contentBack || '', false);
      let contentNode: React.ReactNode = currentItem.contentBack;

      if (currentItem.type === CardType.CLOZE) {
          const parts = currentItem.contentFront.split(/({{c1::.*?}})/g);
          contentNode = (
              <div className="space-y-6 w-full text-left">
                  <div className="text-xl md:text-3xl text-slate-800 leading-relaxed font-serif">
                      {parts.map((part, i) => {
                          if (part.startsWith('{{c1::') && part.endsWith('}}')) {
                              const content = part.replace('{{c1::', '').replace('}}', '');
                              return (
                                  <span key={i} className="bg-primary-50 text-primary-700 px-1.5 py-0.5 rounded border-b-2 border-primary-400 font-semibold mx-1">
                                      {content}
                                  </span>
                              );
                          }
                          return <span key={i}>{part}</span>;
                      })}
                  </div>
                  {currentItem.contentBack && (
                      <div className="bg-amber-50 p-5 rounded-2xl border border-amber-100 text-base md:text-lg text-slate-700 leading-relaxed shadow-sm">
                          <span className="text-xs font-bold text-amber-600 uppercase mb-2 block tracking-wider flex items-center gap-1">
                             <Award size={12}/> 解析 / 备注
                          </span>
                          {currentItem.contentBack}
                      </div>
                  )}
              </div>
          );
          return (
             <div className="w-full h-full flex flex-col items-start justify-start pt-4 overflow-y-auto no-scrollbar">
                {contentNode}
             </div>
          );
      }

      return (
          <div className={`w-full h-full flex flex-col ${styleConfig.container} overflow-y-auto no-scrollbar`}>
            <div className={`${styleConfig.text} whitespace-pre-wrap max-w-full break-words`}>
                {contentNode}
            </div>
          </div>
      );
  };

  if (!currentItem) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 text-center p-8">
        <Award size={64} className="text-primary-500 mb-6" />
        <h2 className="text-3xl font-bold text-slate-900 mb-2">复习完成！</h2>
        <p className="text-slate-500 mb-8 max-w-md">
            您今天强化了 {items.length} 个神经连接通路。
            请稍作休息，让大脑进行记忆巩固。
        </p>
        <button onClick={onExit} className="px-8 py-3 bg-slate-900 text-white rounded-full font-medium hover:bg-slate-800 transition-colors">
            返回仪表盘
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-100 z-50 flex flex-col">
      <div className="px-6 py-4 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20 border-b border-slate-200/50">
        <div className="flex flex-col">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                专注模式 • {currentIndex + 1} / {queue.length}
            </span>
            <div className="w-32 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-primary-600 transition-all duration-500 ease-out"
                    style={{ width: `${((currentIndex) / queue.length) * 100}%` }}
                />
            </div>
        </div>
        <button 
          onClick={onExit}
          className="p-2 rounded-full hover:bg-slate-200 text-slate-500 transition-colors"
          title="退出复习"
        >
          <X size={24} />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 md:p-6 perspective-1000 overflow-hidden">
        <div 
          className="relative w-full max-w-3xl h-full max-h-[80vh] md:aspect-[4/3] cursor-pointer group"
          onClick={handleFlip}
          style={{ perspective: '1000px' }}
        >
            <div className={`relative w-full h-full transition-all duration-500 transform-style-3d shadow-2xl rounded-[2rem] bg-white border border-slate-100 ${isFlipped ? 'rotate-y-180' : ''}`}>
                <div className="absolute inset-0 backface-hidden flex flex-col p-6 md:p-10 bg-white rounded-[2rem]">
                    <div className="flex justify-between items-start mb-2 flex-shrink-0">
                         <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border ${
                             currentItem.type === CardType.CLOZE ? 'bg-amber-50 text-amber-700 border-amber-100' :
                             currentItem.type === CardType.VISUAL ? 'bg-indigo-50 text-indigo-700 border-indigo-100' :
                             'bg-slate-50 text-slate-600 border-slate-100'
                         }`}>
                            {currentItem.type}
                        </span>
                        {!isFlipped && <span className="text-xs text-slate-300 font-medium">正面</span>}
                    </div>

                    <div className="flex-1 min-h-0 relative">
                        {renderFrontContent()}
                    </div>
                    
                    <div className="mt-4 flex justify-center flex-shrink-0">
                         <p className="text-slate-300 text-xs font-semibold uppercase tracking-widest animate-pulse">点击翻转</p>
                    </div>
                </div>

                <div className="absolute inset-0 backface-hidden rotate-y-180 flex flex-col p-6 md:p-10 bg-slate-50 rounded-[2rem]">
                     <div className="flex justify-between items-start mb-2 flex-shrink-0">
                         <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide bg-primary-50 text-primary-700 border border-primary-100">
                            答案
                        </span>
                     </div>

                    <div className="flex-1 min-h-0 relative">
                        {renderBackContent()}
                    </div>
                </div>
            </div>
        </div>
      </div>

      <div className="bg-white/90 backdrop-blur-lg px-6 border-t border-slate-200 z-20 flex items-center justify-center h-32 pb-4">
        {!isFlipped ? (
             <button 
                onClick={handleFlip}
                className="w-full max-w-md h-16 bg-slate-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-slate-900/20 hover:bg-slate-800 hover:scale-[1.01] transition-all active:scale-95 flex items-center justify-center"
            >
                显示答案
            </button>
        ) : (
            <div className="grid grid-cols-4 gap-3 max-w-3xl w-full h-full pt-4">
                <button 
                    onClick={(e) => { e.stopPropagation(); handleResponse(Difficulty.FORGOTTEN); }}
                    className="flex flex-col items-center justify-center rounded-2xl bg-slate-100 hover:bg-rose-100 hover:text-rose-700 hover:border-rose-200 border-2 border-transparent transition-all group active:scale-95 h-full max-h-24"
                >
                    <RotateCcw className="mb-1 text-slate-400 group-hover:text-rose-600" size={20} />
                    <span className="text-xs font-bold">已遗忘</span>
                    <span className="text-[10px] text-slate-400 font-medium group-hover:text-rose-600/70">{getNextIntervalPreview(Difficulty.FORGOTTEN)}</span>
                </button>

                <button 
                     onClick={(e) => { e.stopPropagation(); handleResponse(Difficulty.HARD); }}
                    className="flex flex-col items-center justify-center rounded-2xl bg-slate-100 hover:bg-amber-100 hover:text-amber-700 hover:border-amber-200 border-2 border-transparent transition-all group active:scale-95 h-full max-h-24"
                >
                    <AlertCircle className="mb-1 text-slate-400 group-hover:text-amber-600" size={20} />
                    <span className="text-xs font-bold">困难</span>
                    <span className="text-[10px] text-slate-400 font-medium group-hover:text-amber-600/70">{getNextIntervalPreview(Difficulty.HARD)}</span>
                </button>

                <button 
                     onClick={(e) => { e.stopPropagation(); handleResponse(Difficulty.MEDIUM); }}
                    className="flex flex-col items-center justify-center rounded-2xl bg-slate-100 hover:bg-blue-100 hover:text-blue-700 hover:border-blue-200 border-2 border-transparent transition-all group active:scale-95 h-full max-h-24"
                >
                    <Check className="mb-1 text-slate-400 group-hover:text-blue-600" size={20} />
                    <span className="text-xs font-bold">一般</span>
                    <span className="text-[10px] text-slate-400 font-medium group-hover:text-blue-600/70">{getNextIntervalPreview(Difficulty.MEDIUM)}</span>
                </button>

                <button 
                     onClick={(e) => { e.stopPropagation(); handleResponse(Difficulty.EASY); }}
                    className="flex flex-col items-center justify-center rounded-2xl bg-slate-100 hover:bg-emerald-100 hover:text-emerald-700 hover:border-emerald-200 border-2 border-transparent transition-all group active:scale-95 h-full max-h-24"
                >
                    <ThumbsUp className="mb-1 text-slate-400 group-hover:text-emerald-600" size={20} />
                    <span className="text-xs font-bold">简单</span>
                    <span className="text-[10px] text-slate-400 font-medium group-hover:text-emerald-600/70">{getNextIntervalPreview(Difficulty.EASY)}</span>
                </button>
            </div>
        )}
      </div>

      {zoomedImage && (
          <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 animate-fade-in" onClick={() => setZoomedImage(null)}>
              <div className="relative max-w-full max-h-full">
                  <img src={zoomedImage} alt="Zoomed" className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl" />
                  <button onClick={() => setZoomedImage(null)} className="absolute -top-12 right-0 md:-right-12 text-white/70 hover:text-white p-2">
                      <X size={32} />
                  </button>
              </div>
          </div>
      )}
      <style>{`
        .rotate-y-180 { transform: rotateY(180deg); }
        .transform-style-3d { transform-style: preserve-3d; }
        .backface-hidden { -webkit-backface-visibility: hidden; backface-visibility: hidden; }
      `}</style>
    </div>
  );
};