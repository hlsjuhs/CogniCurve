import React from 'react';
import { AlgorithmSettings, Difficulty } from '../types';
import { Save, RefreshCw, Zap, Clock, Brain, BarChart2, Activity } from 'lucide-react';
import { DEFAULT_SETTINGS, getEbbinghausSchedule } from '../services/srsSystem';

interface SettingsViewProps {
  settings: AlgorithmSettings;
  onUpdateSettings: (newSettings: AlgorithmSettings) => void;
  onReset: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({ settings, onUpdateSettings, onReset }) => {
  
  // Guard against undefined settings (migration safety)
  const safeSettings = settings.requestRetention ? settings : DEFAULT_SETTINGS;
  const ebbinghausSteps = getEbbinghausSchedule();

  const handleRetentionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = parseFloat(e.target.value);
      if (val >= 0.7 && val <= 0.99) {
          onUpdateSettings({ ...safeSettings, requestRetention: val });
      }
  };

  return (
    <div className="space-y-8 pb-24 md:pb-0 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
           <h2 className="text-2xl font-bold text-slate-900">记忆算法配置</h2>
           <p className="text-slate-500 text-sm">FSRS v4.5 自适应调度系统</p>
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
                <Activity size={20} />
             </div>
             <div>
                <h3 className="font-semibold text-slate-900">核心参数：期望保留率 (Request Retention)</h3>
                <p className="text-sm text-slate-500 mt-1 max-w-xl">
                   此设置直接决定复习间隔的计算。
                   <br/>
                   <span className="text-indigo-600 font-medium">关联逻辑：</span> 当您在复习时点击“简单/困难”时，算法会计算出卡片能维持多久。如果您在此处设定较高的保留率，系统会强制缩短该间隔，以确保您在那一天仍有大概率记得。
                </p>
             </div>
          </div>
        </div>
        
        <div className="p-8">
            <div className="flex items-center gap-6 mb-4">
                <input 
                    type="range" 
                    min="0.70" 
                    max="0.99" 
                    step="0.01" 
                    value={safeSettings.requestRetention || 0.9}
                    onChange={handleRetentionChange}
                    className="flex-1 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
                />
                <div className="w-20 text-center font-bold text-2xl text-slate-800">
                    {Math.round((safeSettings.requestRetention || 0.9) * 100)}%
                </div>
            </div>
            <div className="flex justify-between text-xs text-slate-400 font-medium px-1">
                <span>0.70 (最低频率/容易遗忘)</span>
                <span>0.90 (推荐平衡点)</span>
                <span>0.99 (高频复习/考试冲刺)</span>
            </div>
        </div>
      </div>

      {/* Classic Ebbinghaus Reference (Restored) */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
          <div className="flex items-center gap-3 mb-6 relative z-10">
              <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                  <Clock size={20} />
              </div>
              <div>
                  <h3 className="font-semibold text-slate-900">经典艾宾浩斯遗忘周期 (参考基准)</h3>
                  <p className="text-xs text-slate-400">FSRS 算法会根据您的实际记忆情况，围绕此基准进行个性化动态调整。</p>
              </div>
          </div>
          
          {/* Visual Cycle Display */}
          <div className="relative z-10">
              <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-3">
                  {ebbinghausSteps.map((step, idx) => (
                      <div key={idx} className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-amber-200 hover:bg-amber-50 transition-colors group">
                          <span className="text-[10px] text-slate-400 uppercase tracking-widest mb-1 group-hover:text-amber-500">
                              阶段 {idx + 1}
                          </span>
                          <span className="font-bold text-slate-700 text-sm text-center group-hover:text-amber-700">
                              {step.label}
                          </span>
                      </div>
                  ))}
              </div>
          </div>

          {/* Background Decoration */}
          <div className="absolute -bottom-10 -right-10 opacity-5 pointer-events-none">
              <Brain size={200} />
          </div>
      </div>

      {/* Technical Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-slate-900 text-slate-300 rounded-3xl p-6 shadow-xl relative overflow-hidden">
             <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                    <BarChart2 size={20} className="text-primary-400"/>
                    <h3 className="font-semibold text-white">FSRS 权重参数 (Weights)</h3>
                </div>
                <p className="text-xs text-slate-400 mb-4">这些参数定义了算法如何响应您的“遗忘”、“困难”、“一般”和“简单”评价。</p>
                <div className="font-mono text-[10px] bg-black/30 p-3 rounded-xl break-all leading-relaxed text-slate-500">
                    w = [{safeSettings.w ? safeSettings.w.join(', ') : 'Default'}]
                </div>
             </div>
        </div>

        <div className="bg-white text-slate-600 rounded-3xl p-6 border border-slate-200 shadow-sm">
             <div className="flex items-center gap-3 mb-4">
                 <Zap size={20} className="text-emerald-500"/>
                 <h3 className="font-semibold text-slate-900">算法工作原理</h3>
             </div>
             <p className="text-sm leading-relaxed mb-3">
                 系统根据以下公式动态计算间隔：
                 <br />
                 <code className="text-xs bg-slate-100 p-1 rounded text-slate-800 block mt-2 mb-2 font-mono">I = S × 9 × (1/R - 1)</code>
             </p>
             <ul className="text-sm space-y-1 list-disc list-inside text-slate-500 text-xs">
                 <li><strong className="text-slate-700">I (Interval):</strong> 下次复习间隔天数</li>
                 <li><strong className="text-slate-700">S (Stability):</strong> 记忆稳定性（由复习按钮反馈决定）</li>
                 <li><strong className="text-slate-700">R (Retention):</strong> 您上方设置的期望保留率</li>
             </ul>
        </div>
      </div>
    </div>
  );
};