import React, { useMemo, useState, useEffect } from 'react';
import { EbbinghausChart } from './EbbinghausChart';
import { LearningItem, CardType } from '../types';
import { Brain, Clock, AlertCircle, TrendingUp, CheckCircle, PlayCircle, ArrowRight, Zap, Coffee, Hourglass } from 'lucide-react';

interface DashboardProps {
  items: LearningItem[];
  onStartReview: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ items, onStartReview }) => {
  const [now, setNow] = useState(new Date());

  // Refresh timer every minute to update "Next Review" countdowns
  useEffect(() => {
      const timer = setInterval(() => setNow(new Date()), 60000);
      return () => clearInterval(timer);
  }, []);

  const dueItems = items.filter(i => i.nextReviewAt <= now);
  const overdueItems = items.filter(i => i.nextReviewAt < new Date(now.getTime() - 86400000));
  
  // Logic to find the Next Upcoming Item (for intraday waiting state)
  const nextUpItem = useMemo(() => {
      if (dueItems.length > 0) return null;
      
      const upcoming = items
        .filter(i => i.nextReviewAt > now)
        .sort((a, b) => a.nextReviewAt.getTime() - b.nextReviewAt.getTime());
      
      return upcoming.length > 0 ? upcoming[0] : null;
  }, [items, dueItems, now]);

  // Determine if we are in an "Intraday Wait" state
  // Meaning: No reviews NOW, but there are reviews Later Today (or very soon)
  const isIntradayWait = useMemo(() => {
      if (!nextUpItem) return false;
      const diff = nextUpItem.nextReviewAt.getTime() - now.getTime();
      const isToday = nextUpItem.nextReviewAt.toDateString() === now.toDateString();
      // If it's today OR within next 4 hours (e.g. late night studying spilling into next morning)
      return isToday || diff < 4 * 60 * 60 * 1000;
  }, [nextUpItem, now]);

  // Real Calculation: Average Retention
  const learnedItems = items.filter(i => i.status !== 'new');
  const avgRetention = useMemo(() => {
    if (learnedItems.length === 0) return 0;
    const total = learnedItems.reduce((acc, curr) => acc + curr.retentionScore, 0);
    return Math.round(total / learnedItems.length);
  }, [learnedItems]);

  // Real Calculation: Streak
  const streak = useMemo(() => {
    if (items.length === 0) return 0;
    const reviewDates = new Set<string>();
    items.forEach(item => {
      if (item.lastReviewedAt) {
        reviewDates.add(new Date(item.lastReviewedAt).toDateString());
      }
    });

    let currentStreak = 0;
    const d = new Date();
    if (!reviewDates.has(d.toDateString())) {
        d.setDate(d.getDate() - 1);
        if (!reviewDates.has(d.toDateString())) return 0;
    }
    while (reviewDates.has(d.toDateString())) {
        currentStreak++;
        d.setDate(d.getDate() - 1);
    }
    return currentStreak;
  }, [items]);

  // Simulation: Weekly Improvement
  const retentionDelta = useMemo(() => {
     if (learnedItems.length === 0) return 0;
     const avgStability = learnedItems.reduce((acc, i) => acc + i.stability, 0) / learnedItems.length;
     return (1.5 + (avgStability * 0.5)).toFixed(1);
  }, [learnedItems]);

  // Format time for Next Up
  const getNextReviewTimeDisplay = () => {
      if (!nextUpItem) return '';
      const diffMins = Math.ceil((nextUpItem.nextReviewAt.getTime() - now.getTime()) / 60000);
      
      if (diffMins < 60) return `${diffMins} 分钟后`;
      const hours = Math.floor(diffMins / 60);
      const mins = diffMins % 60;
      return `${hours} 小时 ${mins} 分钟后`;
  };

  return (
    <div className="space-y-6 animate-fade-in pb-24 md:pb-0">
      
      {/* Top Section: Hero + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left: Hero Card (Greeting + Action) */}
        <div className={`lg:col-span-2 rounded-[2rem] p-8 text-white relative overflow-hidden shadow-2xl transition-all duration-500 flex flex-col justify-between min-h-[280px] ${
            isIntradayWait 
            ? 'bg-slate-800 shadow-slate-900/10' // Intraday Wait Mode (Darker, Calmer)
            : 'bg-slate-900 shadow-slate-900/20' // Default / Review Mode
        }`}>
             {/* Background Decoration */}
             <div className="absolute top-0 right-0 p-0 opacity-10 pointer-events-none">
                {isIntradayWait ? <Hourglass size={400} className="-mr-16 -mt-16" /> : <Brain size={400} className="-mr-16 -mt-16" />}
             </div>
             <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />

             {/* Content */}
             <div className="relative z-10">
                <div className="flex justify-between items-start">
                   <div>
                       <div className="flex items-center gap-2 mb-2">
                           <span className={`w-2 h-2 rounded-full animate-pulse ${isIntradayWait ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                           <span className={`text-xs font-bold uppercase tracking-wider ${isIntradayWait ? 'text-amber-400' : 'text-emerald-400'}`}>
                               {isIntradayWait ? '记忆巩固中' : '系统就绪'}
                           </span>
                       </div>
                       <h1 className="text-3xl md:text-4xl font-bold mb-3 tracking-tight">
                           {dueItems.length > 0 ? '早上好，研究员' : isIntradayWait ? '大脑休息时间' : '今日任务已完成'}
                       </h1>
                       <p className="text-slate-400 max-w-lg text-sm md:text-base leading-relaxed">
                          {dueItems.length > 0 
                             ? <span>当前认知负荷处于最佳水平。您有 <span className="text-white font-bold">{dueItems.length}</span> 个知识节点即将进入遗忘区。</span>
                             : isIntradayWait
                               ? <span>您刚才学习的知识正在进行神经突触巩固。请稍作休息，<span className="text-white font-bold">{getNextReviewTimeDisplay()}</span> 再来复习以达到最佳效果。</span>
                               : '今日计划已全部清空。保持良好的睡眠有助于长期记忆的形成。明天见！'
                          }
                       </p>
                   </div>
                </div>
             </div>

             {/* Action Button Area */}
             <div className="relative z-10 mt-8">
                {isIntradayWait ? (
                    <div className="inline-flex items-center gap-4 bg-slate-700/50 rounded-full pr-6 pl-2 py-2 border border-slate-600">
                        <div className="w-12 h-12 rounded-full bg-slate-600 flex items-center justify-center text-amber-400">
                            <Coffee size={24} />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">下一次复习</span>
                            <span className="text-base font-bold text-white flex items-center gap-2">
                                {nextUpItem?.nextReviewAt.toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})}
                                <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                    {getNextReviewTimeDisplay()}
                                </span>
                            </span>
                        </div>
                    </div>
                ) : (
                    <button 
                        onClick={onStartReview}
                        disabled={dueItems.length === 0}
                        className={`group w-full md:w-auto min-w-[200px] pl-2 pr-6 py-2 rounded-full transition-all duration-300 flex items-center gap-3 ${
                        dueItems.length > 0 
                            ? 'bg-white text-slate-900 hover:bg-primary-50 hover:scale-[1.02] shadow-xl shadow-slate-900/20'
                            : 'bg-emerald-900/30 text-emerald-100/50 cursor-not-allowed border border-emerald-900/50'
                        }`}
                    >
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                            dueItems.length > 0 ? 'bg-primary-600 text-white group-hover:bg-primary-500' : 'bg-emerald-900/50 text-emerald-700'
                        }`}>
                            {dueItems.length > 0 ? <PlayCircle size={24} fill="currentColor" /> : <CheckCircle size={24} />}
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-xs font-bold uppercase tracking-wider opacity-60">
                                {dueItems.length > 0 ? 'Review Session' : 'All Clear'}
                            </span>
                            <span className="text-base font-bold">
                                {dueItems.length > 0 ? '开始复习' : '今日已完成'}
                            </span>
                        </div>
                        {dueItems.length > 0 && (
                            <ArrowRight size={18} className="ml-auto text-slate-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-transform" />
                        )}
                    </button>
                )}
             </div>
        </div>

        {/* Right: Stats Stack */}
        <div className="flex flex-col gap-4">
             {/* Retention Card */}
            <div className="flex-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group hover:border-emerald-100 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <TrendingUp size={80} />
                </div>
                <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                         <div className="p-1.5 bg-emerald-100 text-emerald-600 rounded-lg">
                             <TrendingUp size={16} />
                         </div>
                         <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">记忆保持率</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-slate-900">{avgRetention}%</span>
                        <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">+ {retentionDelta}%</span>
                    </div>
                </div>
            </div>

            {/* Streak Card */}
            <div className="flex-1 bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex flex-col justify-center relative overflow-hidden group hover:border-amber-100 transition-colors">
                 <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                    <Zap size={80} />
                </div>
                 <div className="relative z-10">
                    <div className="flex items-center gap-2 mb-2">
                         <div className="p-1.5 bg-amber-100 text-amber-600 rounded-lg">
                             <Zap size={16} />
                         </div>
                         <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">连续打卡</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-slate-900">{streak}</span>
                        <span className="text-sm font-medium text-slate-400">天</span>
                    </div>
                </div>
            </div>

            {/* Overdue Items (Small) */}
             {overdueItems.length > 0 && (
                 <div className="bg-rose-50 border border-rose-100 px-4 py-3 rounded-2xl flex items-center justify-between">
                     <div className="flex items-center gap-2">
                         <AlertCircle size={16} className="text-rose-500" />
                         <span className="text-xs font-bold text-rose-700">逾期条目</span>
                     </div>
                     <span className="text-sm font-bold text-rose-700">{overdueItems.length}</span>
                 </div>
             )}
        </div>
      </div>

      {/* Chart & Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
           <EbbinghausChart items={items} />
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
           <div className="flex justify-between items-center mb-6">
               <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                   {isIntradayWait ? '待机队列 (稍后复习)' : '即将到来'}
               </h3>
               <button className="text-xs text-primary-600 font-medium hover:text-primary-700">查看全部</button>
           </div>
           
           <div className="space-y-4">
             {(isIntradayWait && nextUpItem ? [nextUpItem, ...dueItems] : dueItems).slice(0, 4).map((item, idx) => {
                 const isNextWait = isIntradayWait && idx === 0 && dueItems.length === 0;
                 return (
                    <div key={item.id} className={`group flex items-center gap-4 cursor-pointer ${isNextWait ? 'opacity-100' : 'opacity-100'}`}>
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                item.type === CardType.BASIC ? 'bg-primary-500' : 
                                item.type === CardType.CLOZE ? 'bg-indigo-500' : 'bg-amber-500'
                        }`} />
                        <div className="flex-1 min-w-0 pb-4 border-b border-slate-50 group-last:border-0 group-last:pb-0">
                                <div className="flex justify-between">
                                    <p className="font-semibold text-slate-800 text-sm truncate group-hover:text-primary-600 transition-colors">{item.title}</p>
                                    {isNextWait && <span className="text-[10px] text-amber-500 font-bold">{item.nextReviewAt.toLocaleTimeString('zh-CN', {hour: '2-digit', minute:'2-digit'})}</span>}
                                </div>
                                <p className="text-xs text-slate-400 truncate mt-0.5">{item.contentFront}</p>
                        </div>
                        <div className="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">
                            {item.type.split(' ')[0]}
                        </div>
                    </div>
                 );
             })}
             
             {dueItems.length === 0 && !isIntradayWait && (
               <div className="py-8 text-center">
                  <p className="text-sm text-slate-400">所有计划已完成</p>
               </div>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};