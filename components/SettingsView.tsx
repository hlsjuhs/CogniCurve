import React from 'react';
import { AlgorithmSettings, Difficulty } from '../types';
import { Save, RefreshCw, Zap, Clock } from 'lucide-react';

interface SettingsViewProps {
  settings: AlgorithmSettings;
  onUpdateSettings: (newSettings: AlgorithmSettings) => void;
  onReset: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings, onReset }) => {
  
  const handleChange = (difficulty: Difficulty, field: 'multiplier' | 'stabilityMod', value: string) => {
    const numValue = parseFloat(value);
    if (isNaN(numValue)) return;
    
    onUpdateSettings({
      ...settings,
      [difficulty]: {
        ...settings[difficulty],
        [field]: numValue
      }
    });
  };

  const difficultyLabels = {
    [Difficulty.FORGOTTEN]: { label: '已遗忘 (Forgotten)', color: 'text-rose-500', bg: 'bg-rose-50' },
    [Difficulty.HARD]: { label: '困难 (Hard)', color: 'text-amber-500', bg: 'bg-amber-50' },
    [Difficulty.MEDIUM]: { label: '一般 (Medium)', color: 'text-blue-500', bg: 'bg-blue-50' },
    [Difficulty.EASY]: { label: '简单 (Easy)', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  };

  const order = [Difficulty.FORGOTTEN, Difficulty.HARD, Difficulty.MEDIUM, Difficulty.EASY];

  return (
    <div className="space-y-8 pb-24 md:pb-0 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-slate-900">复习算法设置</h2>
           <p className="text-slate-500 text-sm">自定义间隔重复系统(SRS)的计算核心参数。</p>
        </div>
        <button 
          onClick={onReset}
          className="text-sm text-slate-500 hover:text-slate-800 flex items-center gap-1 px-3 py-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <RefreshCw size={14} /> 恢复默认
        </button>
      </div>

      {/* Main Algorithm Config */}
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-start gap-3">
             <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                <Zap size={20} />
             </div>
             <div>
                <h3 className="font-semibold text-slate-900">核心公式配置</h3>
                <p className="text-sm text-slate-500 font-mono mt-1 bg-slate-100 inline-block px-2 py-1 rounded">
                   Next_Interval = Interval × Multiplier × Stability
                </p>
             </div>
          </div>
        </div>
        
        <div className="p-6 grid gap-6">
          <div className="grid grid-cols-12 gap-4 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 px-2">
             <div className="col-span-4">反馈类型</div>
             <div className="col-span-4">间隔倍率 (Multiplier)</div>
             <div className="col-span-4">稳定度系数 (S Factor)</div>
          </div>

          {order.map((diff) => (
            <div key={diff} className={`grid grid-cols-12 gap-4 items-center p-4 rounded-xl ${difficultyLabels[diff].bg}`}>
               <div className="col-span-4 font-semibold text-slate-700 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${difficultyLabels[diff].color.replace('text', 'bg')}`}></div>
                  {difficultyLabels[diff].label}
               </div>
               
               <div className="col-span-4">
                  <input 
                    type="number" 
                    step="0.1"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                    value={settings[diff].multiplier}
                    onChange={(e) => handleChange(diff, 'multiplier', e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">x {settings[diff].multiplier}</p>
               </div>

               <div className="col-span-4">
                  <input 
                    type="number" 
                    step="0.05"
                    className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-700 font-mono focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-all"
                    value={settings[diff].stabilityMod}
                    onChange={(e) => handleChange(diff, 'stabilityMod', e.target.value)}
                  />
                  <p className="text-[10px] text-slate-400 mt-1">S x {settings[diff].stabilityMod}</p>
               </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reference Table */}
      <div className="bg-slate-900 text-slate-300 rounded-3xl p-6 shadow-xl">
         <div className="flex items-center gap-3 mb-6">
             <Clock size={20} className="text-primary-400"/>
             <h3 className="font-semibold text-white">艾宾浩斯标准复习周期表 (参考)</h3>
         </div>
         <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
             {[
               { i: 1, t: '0 天', desc: '初次学习' },
               { i: 2, t: '10 分钟', desc: '抑制瞬时遗忘' },
               { i: 3, t: '1 小时', desc: '稳定短期记忆' },
               { i: 4, t: '1 天', desc: '转向中期记忆' },
               { i: 5, t: '2 天', desc: '第一轮强化' },
               { i: 6, t: '4 天', desc: '延缓遗忘' },
               { i: 7, t: '7 天', desc: '周期巩固' },
               { i: 8, t: '15 天', desc: '长期记忆启动' },
               { i: 9, t: '30 天', desc: '月度巩固' },
               { i: 10, t: '60 天', desc: '防止衰退' },
               { i: 11, t: '120 天', desc: '半长期保持' },
               { i: 12, t: '365 天', desc: '永久记忆' },
             ].map((item) => (
               <div key={item.i} className="bg-slate-800 p-3 rounded-xl border border-slate-700/50">
                  <span className="text-xs font-mono text-slate-500">#{item.i}</span>
                  <div className="text-lg font-bold text-white my-1">{item.t}</div>
                  <div className="text-[10px] text-primary-300">{item.desc}</div>
               </div>
             ))}
         </div>
         <p className="text-xs text-slate-500 mt-6 text-center">系统将根据您上方的参数设置，通过算法自动逼近此理想曲线。</p>
      </div>
    </div>
  );
};