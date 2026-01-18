import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from 'recharts';
import { Lightbulb } from 'lucide-react';

const retentionData = [
  { name: '周一', rate: 40 },
  { name: '周二', rate: 55 },
  { name: '周三', rate: 65 },
  { name: '周四', rate: 60 },
  { name: '周五', rate: 78 },
  { name: '周六', rate: 85 },
  { name: '周日', rate: 88 },
];

const activityData = [
  { name: '回忆', value: 120 },
  { name: '学习', value: 45 },
  { name: '跳过', value: 12 },
];

export const Analytics: React.FC = () => {
  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <h2 className="text-2xl font-bold text-slate-900">认知洞察</h2>

      {/* AI Insight Card */}
      <div className="bg-gradient-to-r from-indigo-500 to-primary-600 p-6 rounded-3xl text-white shadow-xl shadow-primary-900/20 flex items-start gap-4">
        <div className="p-3 bg-white/20 rounded-full backdrop-blur-sm">
            <Lightbulb className="text-yellow-300" size={24} />
        </div>
        <div>
            <h3 className="font-bold text-lg mb-1">优化建议</h3>
            <p className="text-indigo-100 text-sm leading-relaxed">
                我们注意到您在晚上 7:00 左右对 <span className="font-semibold text-white">"微积分"</span> 类目的记忆效果一般。
                认知负荷理论建议将这些复杂主题移至您的早晨时段（上午 9:00），可能会提升 15% 的记忆保持率。
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Retention Trend */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 uppercase mb-6">记忆保持率趋势</h3>
            <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={retentionData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                        />
                        <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={3} dot={{r: 4, strokeWidth: 0, fill:'#3b82f6'}} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* Breakdown */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700 uppercase mb-6">活动分类</h3>
            <div className="h-64">
                 <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={activityData}>
                         <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                         <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94a3b8' }} />
                         <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '8px', border: 'none' }} />
                         <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
};