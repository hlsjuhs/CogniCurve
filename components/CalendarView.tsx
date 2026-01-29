import React, { useState, useMemo } from 'react';
import { LearningItem, CardType, Difficulty } from '../types';
import { calculateNextReview, DEFAULT_SETTINGS } from '../services/srsSystem';
import { Calendar, ChevronLeft, ChevronRight, Clock, FileText, CheckCircle2, Milestone } from 'lucide-react';

interface CalendarViewProps {
    items?: LearningItem[]; 
}

export const CalendarView: React.FC<CalendarViewProps> = ({ items = [] }) => {
  const [selectedDateOffset, setSelectedDateOffset] = useState(0);

  // --- Simulation Engine ---
  // Calculates projected workload for the next 30 days assuming "Medium" responses
  const projectedSchedule = useMemo(() => {
    const schedule: Record<string, LearningItem[]> = {};
    const MAX_DAYS = 35; // Look ahead range
    
    // Initialize schedule buckets
    const today = new Date();
    today.setHours(0,0,0,0);
    
    for (let i = 0; i < MAX_DAYS; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        schedule[d.toDateString()] = [];
    }

    // Deep copy items to simulate future states without mutating original data
    // We only need relevant fields for simulation
    let simItems = items.map(item => ({
        ...item,
        simNextReview: new Date(item.nextReviewAt).getTime()
    }));

    // Simulation Loop: Day by Day
    for (let dayOffset = 0; dayOffset < MAX_DAYS; dayOffset++) {
        const currentDate = new Date(today);
        currentDate.setDate(currentDate.getDate() + dayOffset);
        const currentTimestampStart = currentDate.getTime();
        const currentTimestampEnd = currentTimestampStart + 86400000;
        const dateKey = currentDate.toDateString();

        // 1. Find items due TODAY (or overdue if dayOffset is 0)
        const dueIndices: number[] = [];
        
        simItems.forEach((item, index) => {
            if (dayOffset === 0) {
                 // For today: include overdue
                 if (item.simNextReview <= currentTimestampEnd) {
                     dueIndices.push(index);
                 }
            } else {
                 // For future: include strictly falling in this day
                 if (item.simNextReview >= currentTimestampStart && item.simNextReview < currentTimestampEnd) {
                     dueIndices.push(index);
                 }
            }
        });

        // 2. Add them to schedule bucket
        dueIndices.forEach(idx => {
            schedule[dateKey].push(items[idx]); // Store ref to original item for display
        });

        // 3. SIMULATE REVIEW (Predict future)
        // Assume user rates them "MEDIUM" on this day, calculating new NextReviewAt
        dueIndices.forEach(idx => {
            const item = simItems[idx];
            
            // Convert sim item back to LearningItem shape for calculation function (partially)
            // We use the 'Medium' setting from defaults
            const result = calculateNextReview(
                item as LearningItem, 
                Difficulty.MEDIUM, 
                DEFAULT_SETTINGS
            );
            
            // Update the simulated item's next review time
            if (result.nextReviewAt) {
                 // If the calculation results in a time SOONER than current simulation day (e.g. intraday),
                 // we push it to the same day or next day depending on logic.
                 // Ideally, we just update the timestamp.
                 
                 // However, calculateNextReview uses 'now' inside it. We need to mock 'now' 
                 // effectively or add the interval to the Current Simulation Date.
                 // Since calculateNextReview logic uses Date(), it's hard to perfectly simulate without refactoring.
                 // Approximation: New Time = Current Sim Date + Interval
                 
                 const projectedIntervalDays = result.currentInterval || 1;
                 const newReviewTime = currentTimestampStart + (projectedIntervalDays * 86400000);
                 
                 simItems[idx].simNextReview = newReviewTime;
                 simItems[idx].currentInterval = projectedIntervalDays;
                 simItems[idx].stability = result.stability || item.stability;
            }
        });
    }

    return schedule;
  }, [items]);

  // Generate heatmap data (Next 35 days)
  const heatmapDays = Array.from({ length: 35 }).map((_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      d.setHours(0,0,0,0);
      const key = d.toDateString();
      const count = projectedSchedule[key]?.length || 0;
      return { date: d, count, key };
  });

  const selectedDate = new Date();
  selectedDate.setDate(selectedDate.getDate() + selectedDateOffset);
  const selectedDateKey = selectedDate.toDateString();
  // Deduplicate items in list view (same item reviewed twice in a day only shown once)
  const rawSelectedItems = projectedSchedule[selectedDateKey] || [];
  const selectedItems = Array.from(new Set(rawSelectedItems.map(i => i.id)))
    .map(id => rawSelectedItems.find(i => i.id === id)!);

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <div className="flex justify-between items-center">
        <div>
            <h2 className="text-2xl font-bold text-slate-900">复习时间轴</h2>
            <p className="text-slate-500 text-sm">未来 30 天认知负荷预测 (基于一般难度估算)</p>
        </div>
      </div>

      {/* Heatmap Section */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex justify-between items-center mb-6">
            <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <Milestone size={18} /> 复习强度热力图
            </h3>
             <div className="flex gap-1 items-center">
                 <span className="text-[10px] text-slate-400">空闲</span>
                 <div className="w-3 h-3 rounded-sm bg-slate-100"></div>
                 <div className="w-3 h-3 rounded-sm bg-emerald-200"></div>
                 <div className="w-3 h-3 rounded-sm bg-emerald-400"></div>
                 <div className="w-3 h-3 rounded-sm bg-emerald-600"></div>
                 <span className="text-[10px] text-slate-400">繁忙</span>
             </div>
        </div>
        
        <div className="flex flex-wrap gap-2 justify-center md:justify-start">
             {heatmapDays.map((day, i) => {
                 let colorClass = 'bg-slate-100 text-slate-400';
                 if (day.count > 15) colorClass = 'bg-emerald-600 text-white';
                 else if (day.count > 8) colorClass = 'bg-emerald-400 text-white';
                 else if (day.count > 0) colorClass = 'bg-emerald-200 text-emerald-900';

                 const isSelected = i === selectedDateOffset;
                 const isToday = i === 0;

                 return (
                     <button 
                        key={i} 
                        onClick={() => setSelectedDateOffset(i)}
                        className={`w-9 h-11 rounded-lg ${colorClass} text-xs font-medium flex flex-col items-center justify-center transition-all relative ${isSelected ? 'ring-2 ring-primary-500 ring-offset-2 scale-110 z-10 shadow-lg' : 'hover:scale-105'}`} 
                        title={`${day.date.toLocaleDateString()} - 预计 ${day.count} 个任务`}
                     >
                        <span className="text-[8px] opacity-70 uppercase mb-0.5">{isToday ? '今' : ['日','一','二','三','四','五','六'][day.date.getDay()]}</span>
                        <span className="font-bold">{day.date.getDate()}</span>
                     </button>
                 );
             })}
        </div>
      </div>

      {/* Detail List for Selected Day */}
      <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 min-h-[300px]">
        <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
                <Calendar className="text-primary-500" size={20} />
                <h3 className="font-semibold text-slate-700">
                    {selectedDateOffset === 0 ? '今天' : selectedDate.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' })} 的计划
                </h3>
                <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs font-bold">
                    {selectedItems.length} 条目
                </span>
            </div>
            <div className="flex gap-2">
                <button 
                    onClick={() => setSelectedDateOffset(prev => Math.max(0, prev - 1))}
                    disabled={selectedDateOffset === 0}
                    className="p-1 hover:bg-slate-100 rounded disabled:opacity-30"
                >
                    <ChevronLeft size={16} />
                </button>
                <button 
                    onClick={() => setSelectedDateOffset(prev => prev + 1)}
                    className="p-1 hover:bg-slate-100 rounded"
                >
                    <ChevronRight size={16} />
                </button>
            </div>
        </div>

        {selectedItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400">
                <CheckCircle2 size={48} className="mb-2 opacity-20" />
                <p>这一天没有特定的复习任务。</p>
                <p className="text-xs">系统预测您将处于空闲状态。</p>
            </div>
        ) : (
            <div className="space-y-3">
                {selectedItems.map((item) => (
                    <div key={item.id} className="flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-primary-100 hover:bg-slate-50 transition-all group">
                        <div className={`w-1 flex-shrink-0 rounded-full ${
                             item.type === CardType.BASIC ? 'bg-primary-500' : 
                             item.type === CardType.CASE ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}></div>
                        <div className="flex-1">
                            <div className="flex justify-between items-start">
                                <h4 className="font-medium text-slate-900">{item.title}</h4>
                                <span className="text-[10px] text-slate-400 bg-white border border-slate-200 px-1.5 py-0.5 rounded">
                                    S: {item.stability}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 mt-1 line-clamp-1">{item.contentFront}</p>
                            <div className="flex items-center gap-3 mt-2">
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <Clock size={10} /> 间隔: {Math.round(item.currentInterval)} 天
                                </span>
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                    <FileText size={10} /> {item.type}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </div>
    </div>
  );
};