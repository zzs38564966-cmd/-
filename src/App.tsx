/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  ActiveTab,
  AlertItem,
  AlertRuleConfig,
  BudgetSettings,
  CategoryRule,
  ConnectedAccount,
  PaymentChannel,
  Transaction,
} from './types/finance';
import { getCurrentMonthString } from './utils/formatters';
import { DEFAULT_BUDGET_SETTINGS, loadBudgetSettings } from './utils/storage';
import { PRESET_CATEGORY_RULES } from './utils/rulesEngine';
import { loadLocalConnectedAccounts, saveLocalConnectedAccounts } from './utils/accountDefaults';
import {
  DEFAULT_ALERT_CONFIG,
  loadLocalAlertConfig,
  saveLocalAlertConfig,
  loadAlertHistory,
  saveAlertHistory,
  evaluateFinancialAlerts,
  sendPrivacySafeDesktopNotification,
  isCurrentlyInQuietHours,
  AlertHistoryRecord,
} from './utils/alertEngine';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import {
  getUserTransactions,
  addUserTransaction,
  updateUserTransaction,
  deleteUserTransaction,
  getUserBudget,
  saveUserBudget,
  getUserCategoryRules,
  saveUserCategoryRule,
  deleteUserCategoryRule,
  batchAddUserTransactions,
  getUserAlertConfig,
  saveUserAlertConfig,
  getUserConnectedAccounts,
  saveUserConnectedAccounts,
  deleteUserTransactionsByChannel,
  deleteAllUserTransactions,
  wipeAllUserData,
} from './services/firestoreService';
import { LoginView } from './components/LoginView';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { UnclassifiedView } from './components/UnclassifiedView';
import { TransactionsView } from './components/TransactionsView';
import { BudgetView } from './components/BudgetView';
import { SummaryView } from './components/SummaryView';
import { ProfileView } from './components/ProfileView';
import { DataManagementView } from './components/DataManagementView';
import { RulesManagementView } from './components/RulesManagementView';
import { IntelligentTestView } from './components/IntelligentTestView';
import { AlertsView } from './components/AlertsView';
import { AccountsView } from './components/AccountsView';
import { SecurityAuditView } from './components/SecurityAuditView';
import { NotificationCenterDrawer } from './components/NotificationCenterDrawer';
import { TransactionFormModal } from './components/TransactionFormModal';
import { MigrationModal } from './components/MigrationModal';
import { OfflineBanner } from './components/OfflineBanner';
import { PWAInstallModal } from './components/PWAInstallModal';
import { Sparkles, Check, RotateCcw, Undo2 } from 'lucide-react';


function WorkbenchContent() {
  const { currentUser, userProfile, loading: authLoading, completeOnboarding } = useAuth();

  // Navigation tab
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');

  // Currently focused month (YYYY-MM)
  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthString());

  // Cloud Transactions, Budget, Category Rules, and Alert Settings for current user
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [budget, setBudget] = useState<BudgetSettings>(DEFAULT_BUDGET_SETTINGS);
  const [rules, setRules] = useState<CategoryRule[]>(PRESET_CATEGORY_RULES);
  const [alertConfig, setAlertConfig] = useState<AlertRuleConfig>(loadLocalAlertConfig);
  const [alertHistory, setAlertHistory] = useState<Record<string, AlertHistoryRecord>>(loadAlertHistory);
  const [connectedAccounts, setConnectedAccounts] = useState<ConnectedAccount[]>(loadLocalConnectedAccounts);
  const [isNotificationDrawerOpen, setIsNotificationDrawerOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);

  // Modals & PWA
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [undoToast, setUndoToast] = useState<{
    id: string;
    amount: number;
    category: string;
  } | null>(null);
  const undoTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Migration from local storage
  const [localTransactions, setLocalTransactions] = useState<Transaction[]>([]);
  const [localBudget, setLocalBudget] = useState<BudgetSettings>(DEFAULT_BUDGET_SETTINGS);
  const [isMigrationModalOpen, setIsMigrationModalOpen] = useState(false);
  const [isPWAInstallModalOpen, setIsPWAInstallModalOpen] = useState(false);


  // Check legacy local storage on mount
  useEffect(() => {
    try {
      const rawLocal = localStorage.getItem('finance_workbench_transactions_v1');
      if (rawLocal) {
        const parsed = JSON.parse(rawLocal);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setLocalTransactions(parsed);
          setLocalBudget(loadBudgetSettings());
        }
      }
    } catch (e) {
      console.warn('No legacy local transactions found or parse error:', e);
    }
  }, []);

  // Fetch Cloud data when user changes
  const loadCloudUserData = useCallback(async (userId: string) => {
    setDataLoading(true);
    try {
      const [cloudTxs, cloudBudget, cloudRules, cloudAlertConfig, cloudAccounts] = await Promise.all([
        getUserTransactions(userId),
        getUserBudget(userId),
        getUserCategoryRules(userId),
        getUserAlertConfig(userId),
        getUserConnectedAccounts(userId),
      ]);
      setTransactions(cloudTxs);
      setBudget(cloudBudget);
      setRules(cloudRules);
      if (cloudAlertConfig) {
        setAlertConfig(cloudAlertConfig);
        saveLocalAlertConfig(cloudAlertConfig);
      }
      if (cloudAccounts) {
        setConnectedAccounts(cloudAccounts);
        saveLocalConnectedAccounts(cloudAccounts);
      }
    } catch (err) {
      console.error('Error fetching cloud data:', err);
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (currentUser?.uid) {
      loadCloudUserData(currentUser.uid);
    } else {
      setTransactions([]);
      setDataLoading(false);
    }
  }, [currentUser, loadCloudUserData]);

  // Evaluate financial alerts in real-time (UNCONDITIONAL HOOK)
  const activeAlerts = useMemo(() => {
    return evaluateFinancialAlerts(transactions, budget, alertConfig, alertHistory);
  }, [transactions, budget, alertConfig, alertHistory]);

  // Desktop notification side-effect with quiet hours & privacy filtering (UNCONDITIONAL HOOK)
  useEffect(() => {
    if (
      alertConfig.channels.browserDesktop &&
      activeAlerts.length > 0 &&
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'granted'
    ) {
      const inQuiet =
        alertConfig.quietHours.enabled &&
        isCurrentlyInQuietHours(alertConfig.quietHours.start, alertConfig.quietHours.end);

      if (!inQuiet) {
        const highestSeverity = activeAlerts.some((a) => a.severity === 'danger')
          ? 'danger'
          : activeAlerts.some((a) => a.severity === 'warning')
          ? 'warning'
          : 'info';
        sendPrivacySafeDesktopNotification(activeAlerts.length, highestSeverity);
      }
    }
  }, [activeAlerts.length, alertConfig]);

  // Alert snoozing and dismissal handlers
  const handleSnoozeAlert = useCallback((alertId: string) => {
    setAlertHistory((prev) => {
      const next = {
        ...prev,
        [alertId]: {
          ...prev[alertId],
          id: alertId,
          snoozedUntil: Date.now() + 24 * 60 * 60 * 1000,
        },
      };
      saveAlertHistory(next);
      return next;
    });
  }, []);

  const handleDismissAlert = useCallback((alertId: string) => {
    setAlertHistory((prev) => {
      const next = {
        ...prev,
        [alertId]: {
          ...prev[alertId],
          id: alertId,
          dismissedAt: Date.now(),
        },
      };
      saveAlertHistory(next);
      return next;
    });
  }, []);

  const handleResetCooldowns = useCallback(() => {
    setAlertHistory({});
    saveAlertHistory({});
  }, []);

  const handleSaveAlertConfig = useCallback(async (newConfig: AlertRuleConfig) => {
    setAlertConfig(newConfig);
    saveLocalAlertConfig(newConfig);
    if (currentUser?.uid) {
      try {
        await saveUserAlertConfig(currentUser.uid, newConfig);
      } catch (err) {
        console.warn('Failed to sync alert config to cloud:', err);
      }
    }
  }, [currentUser]);

  // Connected accounts handlers
  const handleSaveConnectedAccounts = useCallback(async (newAccounts: ConnectedAccount[]) => {
    setConnectedAccounts(newAccounts);
    saveLocalConnectedAccounts(newAccounts);
    if (currentUser?.uid) {
      try {
        await saveUserConnectedAccounts(currentUser.uid, newAccounts);
      } catch (e) {
        console.warn('Failed to sync connected accounts to cloud:', e);
      }
    }
  }, [currentUser]);

  const handleDeleteChannelTransactions = useCallback(async (channel: PaymentChannel) => {
    if (!currentUser) return 0;
    const count = await deleteUserTransactionsByChannel(currentUser.uid, channel);
    setTransactions((prev) => prev.filter((t) => t.channel !== channel));
    return count;
  }, [currentUser]);

  const handleDeleteAllTransactions = useCallback(async () => {
    if (!currentUser) return 0;
    const count = await deleteAllUserTransactions(currentUser.uid);
    setTransactions([]);
    return count;
  }, [currentUser]);

  const handleWipeAllUserData = useCallback(async () => {
    if (!currentUser) return;
    await wipeAllUserData(currentUser.uid);
    setTransactions([]);
    setBudget(DEFAULT_BUDGET_SETTINGS);
    setRules(PRESET_CATEGORY_RULES);
    setConnectedAccounts(loadLocalConnectedAccounts());
    setAlertConfig(loadLocalAlertConfig());
  }, [currentUser]);

  // Transaction mutations
  const handleAddTransaction = async (
    newTxData: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
  ) => {
    if (!currentUser) return;
    try {
      const createdTx = await addUserTransaction(currentUser.uid, newTxData);
      setTransactions((prev) => [createdTx, ...prev]);

      if (createdTx.date) {
        const txMonth = createdTx.date.slice(0, 7);
        if (txMonth !== selectedMonth) {
          setSelectedMonth(txMonth);
        }
      }

      // Trigger 6-second undo toast
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      setUndoToast({
        id: createdTx.id,
        amount: createdTx.amount,
        category: createdTx.category,
      });
      undoTimerRef.current = setTimeout(() => {
        setUndoToast(null);
      }, 6000);
    } catch (error) {
      alert('保存交易失败，请检查网络连接后重试。');
    }
  };

  const handleUndoRecentTransaction = async () => {
    if (!undoToast || !currentUser) return;
    const targetId = undoToast.id;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoToast(null);
    await handleDeleteTransaction(targetId);
  };


  const handleUpdateTransaction = async (updatedTx: Transaction) => {
    if (!currentUser) return;
    try {
      await updateUserTransaction(currentUser.uid, updatedTx);
      setTransactions((prev) =>
        prev.map((item) => (item.id === updatedTx.id ? updatedTx : item))
      );
    } catch (error) {
      alert('更新交易失败，请检查网络连接后重试。');
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteUserTransaction(currentUser.uid, id);
      setTransactions((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      alert('删除记录失败，请检查网络连接后重试。');
    }
  };

  const handleUpdateBudget = async (newBudget: BudgetSettings) => {
    if (!currentUser) return;
    try {
      await saveUserBudget(currentUser.uid, newBudget);
      setBudget(newBudget);
    } catch (error) {
      alert('保存预算失败，请重试。');
    }
  };

  const handleSaveRule = async (rule: CategoryRule) => {
    if (!currentUser) return;
    try {
      const saved = await saveUserCategoryRule(currentUser.uid, rule);
      setRules((prev) => {
        const idx = prev.findIndex((r) => r.id === saved.id);
        if (idx >= 0) {
          const copy = [...prev];
          copy[idx] = saved;
          return copy;
        }
        return [saved, ...prev];
      });
    } catch (err) {
      alert('保存分类规则失败，请检查网络后重试。');
    }
  };

  const handleDeleteRule = async (ruleId: string) => {
    if (!currentUser) return;
    try {
      await deleteUserCategoryRule(currentUser.uid, ruleId);
      setRules((prev) => prev.filter((r) => r.id !== ruleId));
    } catch (err) {
      alert('删除规则失败，请重试。');
    }
  };

  const handleBatchImport = async (
    txList: Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>[]
  ) => {
    if (!currentUser) return;
    try {
      const createdTxs = await batchAddUserTransactions(currentUser.uid, txList);
      setTransactions((prev) => [...createdTxs, ...prev]);
    } catch (err) {
      alert('批量导入账单失败，请重试。');
    }
  };

  const handleRefreshData = (newTxs: Transaction[], newBudget: BudgetSettings) => {
    setTransactions(newTxs);
    setBudget(newBudget);
  };

  const handleMigrationComplete = async () => {
    if (currentUser?.uid) {
      await loadCloudUserData(currentUser.uid);
      setLocalTransactions([]);
    }
  };

  // Auth Loading state (NOW SAFELY AFTER ALL HOOKS)
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold text-xl mb-4 animate-pulse">
          ¥
        </div>
        <p className="text-sm font-semibold text-slate-700">正在验证个人身份与安全凭据...</p>
        <p className="text-xs text-slate-400 mt-1">云端加密规则正在保护您的账簿数据</p>
      </div>
    );
  }

  // Not logged in: Show Login View (NOW SAFELY AFTER ALL HOOKS)
  if (!currentUser) {
    return <LoginView />;
  }

  // Count unclassified transactions
  const unclassifiedCount = transactions.filter(
    (tx) => !tx.isCategorized || tx.category === '待分类'
  ).length;

  return (
    <div className="flex h-screen w-full bg-slate-50/60 text-slate-900 font-sans antialiased overflow-hidden">
      {/* Desktop Left Sidebar */}
      <Sidebar
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unclassifiedCount={unclassifiedCount}
        alertCount={activeAlerts.length}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onOpenPWAInstallModal={() => setIsPWAInstallModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Offline Notification Banner */}
        <OfflineBanner />

        {/* Top Header */}
        <Header
          activeTab={activeTab}
          selectedMonth={selectedMonth}
          onMonthChange={setSelectedMonth}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          unclassifiedCount={unclassifiedCount}
          alertCount={activeAlerts.length}
          onOpenNotificationCenter={() => setIsNotificationDrawerOpen(true)}
          hasLocalDataToMigrate={localTransactions.length > 0}
          onOpenMigrationModal={() => setIsMigrationModalOpen(true)}
          onOpenPWAInstallModal={() => setIsPWAInstallModalOpen(true)}
        />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 pb-[calc(6rem+env(safe-area-inset-bottom))] lg:pb-12">
          {/* New User Onboarding Banner */}
          {userProfile && !userProfile.hasCompletedOnboarding && (
            <div className="mb-6 p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl sm:rounded-3xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-white/10 rounded-xl shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white">
                    欢迎来到您的专属个人财务云空间！
                  </h3>
                  <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                    已为您独立分配全新的 2,500 元月预算（生活费 1080 / AI漫剧 350 / 投资 300 / 应急储蓄 500 / 灵活资金 270）。当前空间与任何其他账号绝对物理隔离，跨电脑与 iPhone 手机端实时同步。
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
                {localTransactions.length > 0 && (
                  <button
                    onClick={() => setIsMigrationModalOpen(true)}
                    className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    迁移本地历史 ({localTransactions.length}笔)
                  </button>
                )}
                <button
                  onClick={() => completeOnboarding()}
                  className="px-3.5 py-1.5 bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl text-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>已知晓，完成引导</span>
                </button>
              </div>
            </div>
          )}

          {/* Loading Indicator while fetching cloud records */}
          {dataLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <RotateCcw className="w-6 h-6 animate-spin mb-2 text-slate-600" />
              <p className="text-xs font-medium text-slate-600">正在同步您的云端专属数据...</p>
            </div>
          ) : (
            <>
              {activeTab === 'dashboard' && (
                <DashboardView
                  selectedMonth={selectedMonth}
                  transactions={transactions}
                  budget={budget}
                  activeAlerts={activeAlerts}
                  showInPageBanner={alertConfig.channels.inPageBanner}
                  onNavigateToTab={setActiveTab}
                  onOpenAddModal={() => setIsAddModalOpen(true)}
                  onEditTransaction={setEditingTransaction}
                  onSnoozeAlert={handleSnoozeAlert}
                />
              )}

              {activeTab === 'unclassified' && (
                <UnclassifiedView
                  transactions={transactions}
                  onUpdateTransaction={handleUpdateTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  onOpenEditModal={setEditingTransaction}
                />
              )}

              {activeTab === 'transactions' && (
                <TransactionsView
                  transactions={transactions}
                  selectedMonth={selectedMonth}
                  onOpenAddModal={() => setIsAddModalOpen(true)}
                  onOpenEditModal={setEditingTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                />
              )}

              {activeTab === 'budget' && (
                <BudgetView
                  selectedMonth={selectedMonth}
                  transactions={transactions}
                  budget={budget}
                  onUpdateBudget={handleUpdateBudget}
                  onNavigateToTab={setActiveTab}
                />
              )}

              {activeTab === 'summary' && (
                <SummaryView
                  selectedMonth={selectedMonth}
                  transactions={transactions}
                  budget={budget}
                  onNavigateToTab={setActiveTab}
                />
              )}

              {activeTab === 'alerts' && (
                <AlertsView
                  transactions={transactions}
                  budget={budget}
                  config={alertConfig}
                  activeAlerts={activeAlerts}
                  onSaveConfig={handleSaveAlertConfig}
                  onSnoozeAlert={handleSnoozeAlert}
                  onDismissAlert={handleDismissAlert}
                  onResetCooldowns={handleResetCooldowns}
                />
              )}

              {activeTab === 'accounts' && (
                <AccountsView
                  accounts={connectedAccounts}
                  transactions={transactions}
                  onSaveAccounts={handleSaveConnectedAccounts}
                  onDeleteChannelTransactions={handleDeleteChannelTransactions}
                  onBatchImport={handleBatchImport}
                  onNavigateToTab={setActiveTab}
                />
              )}

              {activeTab === 'security' && (
                <SecurityAuditView
                  transactions={transactions}
                  budget={budget}
                  rules={rules}
                  onDeleteAllTransactions={handleDeleteAllTransactions}
                  onWipeAllUserData={handleWipeAllUserData}
                  onRefreshData={() => currentUser?.uid && loadCloudUserData(currentUser.uid)}
                />
              )}

              {activeTab === 'data' && (
                <DataManagementView
                  transactions={transactions}
                  budget={budget}
                  rules={rules}
                  onRefreshData={handleRefreshData}
                  onBatchImport={handleBatchImport}
                  onOpenMigrationModal={() => setIsMigrationModalOpen(true)}
                  hasLocalData={localTransactions.length > 0}
                  onNavigateToTab={setActiveTab}
                />
              )}

              {activeTab === 'rules' && (
                <RulesManagementView
                  rules={rules}
                  onSaveRule={handleSaveRule}
                  onDeleteRule={handleDeleteRule}
                />
              )}

              {activeTab === 'test' && (
                <IntelligentTestView
                  existingTransactions={transactions}
                  rules={rules}
                />
              )}

              {activeTab === 'profile' && (
                <ProfileView
                  transactions={transactions}
                  budget={budget}
                  rules={rules}
                  onNavigateToTab={setActiveTab}
                  onOpenPWAInstallModal={() => setIsPWAInstallModalOpen(true)}
                  unclassifiedCount={unclassifiedCount}
                  alertCount={activeAlerts.length}
                />
              )}
            </>
          )}
        </main>
      </div>

      {/* Notification Center Slide-over Drawer */}
      <NotificationCenterDrawer
        isOpen={isNotificationDrawerOpen}
        onClose={() => setIsNotificationDrawerOpen(false)}
        alerts={activeAlerts}
        quietHours={alertConfig.quietHours}
        onSnoozeAlert={handleSnoozeAlert}
        onDismissAlert={handleDismissAlert}
        onNavigateToTab={setActiveTab}
      />

      {/* Mobile Bottom Navigation */}
      <MobileNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unclassifiedCount={unclassifiedCount}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      {/* Unified Transaction Modal (Create & Edit) */}
      <TransactionFormModal
        isOpen={isAddModalOpen || editingTransaction !== null}
        mode={editingTransaction !== null ? 'edit' : 'create'}
        initialTransaction={editingTransaction}
        rules={rules}
        existingTransactions={transactions}
        onAddRule={handleSaveRule}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingTransaction(null);
        }}
        onSubmit={(txData) => {
          if (editingTransaction !== null) {
            handleUpdateTransaction(txData as Transaction);
            setEditingTransaction(null);
          } else {
            handleAddTransaction(
              txData as Omit<Transaction, 'id' | 'createdAt' | 'updatedAt'>
            );
            setIsAddModalOpen(false);
          }
        }}
      />

      {/* Migration Modal */}
      <MigrationModal
        isOpen={isMigrationModalOpen}
        userId={currentUser.uid}
        localTransactions={localTransactions}
        localBudget={localBudget}
        existingCloudTransactions={transactions}
        onClose={() => setIsMigrationModalOpen(false)}
        onMigrationComplete={handleMigrationComplete}
      />

      {/* PWA App Install Guide Modal */}
      <PWAInstallModal
        isOpen={isPWAInstallModalOpen}
        onClose={() => setIsPWAInstallModalOpen(false)}
      />

      {/* Undo Toast Notification (Floating above mobile bottom nav) */}
      {undoToast && (
        <aside
          role="status"
          aria-live="polite"
          className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] lg:bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2.5 bg-slate-900/95 text-white rounded-2xl shadow-xl backdrop-blur-md border border-slate-700 text-xs sm:text-sm animate-in fade-in slide-in-from-bottom-2 duration-200 select-none max-w-[90vw]"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
            <span className="truncate">
              已记一笔: {undoToast.category} ¥{undoToast.amount.toFixed(2)}
            </span>
          </div>
          <button
            onClick={handleUndoRecentTransaction}
            className="flex items-center gap-1 px-3 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-xl text-xs cursor-pointer active:scale-95 transition-transform shrink-0"
          >
            <Undo2 className="w-3.5 h-3.5" />
            <span>撤销</span>
          </button>
        </aside>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <WorkbenchContent />
    </AuthProvider>
  );
}
