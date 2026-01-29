import React from 'react';
import { LayoutDashboard, PlayCircle, PlusSquare, CalendarClock, Library, Settings } from 'lucide-react';

interface NavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  dailyProgress?: {
      current: number;
      total: number;
      percent: number;
  };
}

const NAV_ITEMS = [
  { id: 'dashboard', icon: LayoutDashboard, label: '仪表盘' },
  // 'review' item removed as it's now a primary action on the Dashboard
  { id: 'create', icon: PlusSquare, label: '创建' },
  { id: 'calendar', icon: CalendarClock, label: '时间轴' },
  { id: 'library', icon: Library, label: '知识库' },
  { id: 'settings', icon: Settings, label: '设置' },
];

export const Navigation: React.FC<NavigationProps> = ({ activeTab, setActiveTab, dailyProgress }) => {
  return (
    <>
      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 md:hidden z-50 pb-safe">
        <div className="flex justify-around items-center h-16">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${
                  isActive ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-slate-900 text-slate-300 h-screen fixed left-0 top-0 border-r border-slate-800 shadow-xl">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center space-x-2 text-white">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-indigo-600 flex items-center justify-center">
              <span className="font-bold text-lg">C</span>
            </div>
            <span className="font-semibold text-xl tracking-tight">CogniCurve</span>
          </div>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center space-x-3 w-full px-4 py-3 rounded-xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-primary-600 text-white shadow-lg shadow-primary-900/50'
                    : 'hover:bg-slate-800 hover:text-white'
                }`}
              >
                <Icon size={20} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                <span className="font-medium">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Real Daily Goal Stats */}
        <div className="p-6 border-t border-slate-800">
          <div className="bg-slate-800 rounded-xl p-4">
             <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-semibold uppercase text-slate-500">今日目标</h4>
                <span className="text-xs font-bold text-primary-400">{dailyProgress ? `${dailyProgress.percent}%` : '0%'}</span>
             </div>
             
             <div className="w-full bg-slate-700 h-2 rounded-full mb-2 overflow-hidden">
               <div 
                 className="bg-emerald-500 h-2 rounded-full transition-all duration-1000 ease-out" 
                 style={{ width: `${dailyProgress ? dailyProgress.percent : 0}%` }}
               ></div>
             </div>
             
             <p className="text-xs text-slate-400 flex justify-between">
                 <span>已复习</span>
                 <span className="text-white font-medium">
                     {dailyProgress ? dailyProgress.current : 0} / {dailyProgress ? dailyProgress.total : 0}
                 </span>
             </p>
          </div>
        </div>
      </aside>
    </>
  );
};