import React, { useMemo } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { LearningItem } from '../types';

interface EbbinghausChartProps {
  items?: LearningItem[];
}

export const EbbinghausChart: React.FC<EbbinghausChartProps> = ({ items = [] }) => {
  // Generate real data based on the provided items
  const chartData = useMemo(() => {
    // Fallback if no items exist yet
    if (items.length === 0) {
       return [
        { day: '第0天', retention: 100, predicted: 100 },
        { day: '第1天', retention: 50, predicted: 90 },
        { day: '第2天', retention: 35, predicted: 85 },
        { day: '第3天', retention: 25, predicted: 82 },
        { day: '第4天', retention: 20, predicted: 95 },
        { day: '第5天', retention: 15, predicted: 90 },
        { day: '第6天', retention: 10, predicted: 88 },
        { day: '第7天', retention: 5, predicted: 85 },
       ];
    }

    const days = 7;
    const data = [];
    const activeItems = items.filter(i => i.status !== 'new');
    const itemCount = activeItems.length || 1;

    for (let d = 0; d <= days; d++) {
        let totalRetention = 0;
        let totalPredicted = 0;

        // Current time baseline
        const now = new Date().getTime();

        activeItems.forEach(item => {
            const lastReview = item.lastReviewedAt ? new Date(item.lastReviewedAt).getTime() : item.createdAt.getTime();
            
            // --- 1. Natural Decay Curve (Gray Dotted) ---
            // Simulates what happens if user STOPS reviewing today.
            // t = days elapsed since last review + d future days
            const elapsedDays = (now - lastReview) / (1000 * 3600 * 24);
            const t = elapsedDays + d;
            
            // Ebbinghaus Approximation: R = 100 * e^(-t / S)
            // S (Stability) is roughly the days to 36% retention (1/e). 
            // In our SRS, S=1 is ~1 day. We scale it slightly for visual clarity if needed, 
            // but let's stick to the raw math.
            const S = Math.max(0.5, item.stability * 3); // Scale S to make the curve less brutal for UI demo purposes
            const R_natural = 100 * Math.exp(-t / S);
            totalRetention += R_natural;


            // --- 2. Predicted Curve (Green Solid) ---
            // Simulates the effect of following the schedule.
            // If d is past the next review date, we assume retention resets to 100% and decays slower.
            const dueTime = new Date(item.nextReviewAt).getTime();
            const daysUntilDue = (dueTime - now) / (1000 * 3600 * 24);

            let R_pred = 0;
            if (d > daysUntilDue) {
                // Future review happens
                // The curve "bounces" back. 
                // Reset t to (d - daysUntilDue). New Stability S' > S.
                const t_new = d - daysUntilDue;
                const S_new = S * 1.5; // Assume 50% stability boost per review
                R_pred = 100 * Math.exp(-t_new / S_new);
            } else {
                // Before the future review, it follows the natural decay (or current state)
                R_pred = R_natural;
            }
            totalPredicted += R_pred;
        });

        data.push({
            day: d === 0 ? '今天' : `+${d}天`,
            retention: Math.round(totalRetention / itemCount),
            predicted: Math.round(totalPredicted / itemCount)
        });
    }
    return data;
  }, [items]);

  return (
    <div className="w-full h-64 bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">记忆衰减曲线</h3>
        <span className="text-xs text-slate-400">模拟预测模型</span>
      </div>
      <ResponsiveContainer width="100%" height="80%">
        <AreaChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorRetention" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorPredicted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis 
            dataKey="day" 
            tick={{ fontSize: 10, fill: '#94a3b8' }} 
            axisLine={false} 
            tickLine={false} 
          />
          <YAxis 
            tick={{ fontSize: 10, fill: '#94a3b8' }} 
            axisLine={false} 
            tickLine={false}
            domain={[0, 100]}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '8px', color: '#fff' }}
            itemStyle={{ color: '#cbd5e1' }}
            formatter={(value: number, name: string) => {
                if (name === 'predicted') return [`${value}%`, '复习后保持率'];
                if (name === 'retention') return [`${value}%`, '自然衰减'];
                return [value, name];
            }}
          />
          <Area 
            type="monotone" 
            dataKey="predicted" 
            stroke="#10b981" 
            strokeWidth={2} 
            fill="url(#colorPredicted)" 
            name="predicted"
            dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
          />
           <Area 
            type="monotone" 
            dataKey="retention" 
            stroke="#94a3b8" 
            strokeWidth={2} 
            strokeDasharray="4 4"
            fill="url(#colorRetention)" 
            name="retention"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};