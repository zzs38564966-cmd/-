import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Calendar,
  LogOut,
  Cloud,
  HardDriveDownload,
  Bell,
  Smartphone,
} from 'lucide-react';
import { ActiveTab } from '../types/finance';
import { formatMonthCN, getPreviousMonthString } from '../utils/formatters';
import { useAuth } from '../contexts/AuthContext';

interface HeaderProps {
  activeTab: ActiveTab;
  selectedMonth: string;
  onMonthChange: (month: string) => void;
  onOpenAddModal: () => void;
  unclassifiedCount: number;
  alertCount?: number;
  onOpenNotificationCenter?: () => void;
  hasLocalDataToMigrate?: boolean;
  onOpenMigrationModal?: () => void;
  onOpenPWAInstallModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  selectedMonth,
  onMonthChange,
  onOpenAddModal,
  unclassifiedCount,
  alertCount = 0,
  onOpenNotificationCenter,
  hasLocalDataToMigrate,
  onOpenMigrationModal,
  onOpenPWAInstallModal,
}) => {
  const { currentUser, userProfile, logout } = useAuth();

  const getTabTitle = (tab: ActiveTab) => {
    switch (tab) {
      case 'dashboard':
        return '财务仪表盘';
      case 'unclassified':
        return '待分类交易流水';
      case 'transactions':
        return '交易记录与查询';
      case 'budget':
        return '每月预算管理';
      case 'summary':
        return '月度财务总结';
      case 'alerts':
        return '财务预警与通知';
      case 'accounts':
        return '支付账户连接与授权管理';
      case 'security':
        return '安全合规审计与隐私设置';
      case 'rules':
        return '自动分类规则管理';
      case 'data':
        return '数据导入导出与备份';
      case 'test':
        return '智能记账测试控制台';
    }
  };

  const handlePrevMonth = () => {
    onMonthChange(getPreviousMonthString(selectedMonth));
  };

  const handleNextMonth = () => {
    const [y, m] = selectedMonth.split('-').map(Number);
    let nextYear = y;
    let nextMonth = m + 1;
    if (nextMonth === 13) {
      nextMonth = 1;
      nextYear += 1;
    }
    onMonthChange(`${nextYear}-${String(nextMonth).padStart(2, '0')}`);
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 px-4 sm:px-6 py-3.5 pt-[calc(0.875rem+env(safe-area-inset-top))] bg-white/95 backdrop-blur-md border-b border-slate-200">
      {/* Zone 1: Section Title & Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap truncate">
          {getTabTitle(activeTab)}
        </h2>

        {/* Month Selector Carousel */}
        <div className="hidden sm:flex items-center gap-1 px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-700">
          <button
            onClick={handlePrevMonth}
            className="p-1 hover:text-slate-900 hover:bg-slate-200/70 rounded transition-colors"
            title="上一月"
            aria-label="上一月"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-1.5 px-1 tabular-nums font-semibold">
            <Calendar className="w-3.5 h-3.5 text-slate-500" />
            <span>{formatMonthCN(selectedMonth)}</span>
          </div>
          <button
            onClick={handleNextMonth}
            className="p-1 hover:text-slate-900 hover:bg-slate-200/70 rounded transition-colors"
            title="下一月"
            aria-label="下一月"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Zone 2: Subtle Status / Cloud Sync Tag */}
      <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
        <span className="flex items-center gap-1 text-emerald-700 font-medium bg-emerald-50 px-2 py-0.5 rounded-md">
          <Cloud className="w-3.5 h-3.5" />
          <span>云端独立档案库</span>
        </span>
        <span aria-hidden="true">·</span>
        <span>月总预算 ¥2,500.00</span>
        {unclassifiedCount > 0 && (
          <>
            <span aria-hidden="true">·</span>
            <span className="text-amber-700 font-medium">
              待分类: {unclassifiedCount} 笔
            </span>
          </>
        )}
      </div>

      {/* Zone 3: Actions + User Profile & Logout */}
      <div className="flex items-center gap-2 shrink-0">
        {hasLocalDataToMigrate && onOpenMigrationModal && (
          <button
            onClick={onOpenMigrationModal}
            className="hidden sm:flex items-center gap-1 px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="检测到本地有离线数据，点击迁移到云端"
          >
            <HardDriveDownload className="w-3.5 h-3.5 text-amber-600" />
            <span>迁移离线数据</span>
          </button>
        )}

        <div className="sm:hidden flex items-center text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-lg tabular-nums">
          {formatMonthCN(selectedMonth)}
        </div>

        {/* PWA App Install Button */}
        {onOpenPWAInstallModal && (
          <button
            onClick={onOpenPWAInstallModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            title="添加到主屏幕或安装桌面应用 (PWA)"
            aria-label="添加到主屏幕或安装桌面应用"
          >
            <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="hidden sm:inline">安装应用</span>
          </button>
        )}

        {/* Notification Bell Button */}
        {onOpenNotificationCenter && (
          <button
            onClick={onOpenNotificationCenter}
            className={`relative p-2 rounded-xl transition-all cursor-pointer ${
              alertCount > 0
                ? 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100'
            }`}
            title={`预警通知中心${alertCount > 0 ? ` (${alertCount} 项预警)` : ''}`}
            aria-label="预警通知中心"
          >
            <Bell className="w-4 h-4" />
            {alertCount > 0 && (
              <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-red-500 text-white shadow-xs">
                {alertCount}
              </span>
            )}
          </button>
        )}

        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-all shadow-xs active:scale-95 cursor-pointer whitespace-nowrap"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>记一笔</span>
        </button>

        {/* User Avatar & Logout */}
        {currentUser && (
          <div className="flex items-center gap-1.5 pl-1 border-l border-slate-200 ml-1">
            {currentUser.photoURL ? (
              <img
                src={currentUser.photoURL}
                alt={currentUser.displayName || '用户头像'}
                referrerPolicy="no-referrer"
                className="w-7 h-7 rounded-full border border-slate-200 shrink-0 object-cover"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0">
                {(currentUser.displayName || currentUser.email || '用')[0].toUpperCase()}
              </div>
            )}

            <button
              onClick={() => logout()}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
              title="退出登录"
              aria-label="退出登录"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
