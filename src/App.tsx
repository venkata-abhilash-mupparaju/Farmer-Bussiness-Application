import React, { useState, useEffect, useMemo } from 'react';
import { Header } from './components/Header';
import { HomeDashboard } from './components/HomeDashboard';
import { BuyModal } from './components/BuyModal';
import { SellModal } from './components/SellModal';
import { DebtManager } from './components/DebtManager';
import { ExpensesModal } from './components/ExpensesModal';
import { ReportsView } from './components/ReportsView';
import { PinLockScreen } from './components/PinLockScreen';
import { SupabaseSettingsModal } from './components/SupabaseSettingsModal';
import { ConfirmationModal } from './components/ConfirmationModal';
import { VoiceAssistantButton } from './components/VoiceAssistantButton';
import { ChangePinModal } from './components/ChangePinModal';
import { InstallGuideModal } from './components/InstallGuideModal';

import {
  Purchase,
  Sale,
  DebtRepayment,
  Expense,
  Customer,
  AppSettings
} from './types';
import { storage } from './services/storage';
import { supabaseService } from './services/supabaseClient';
import {
  calculateInventoryStatus,
  calculateCustomerDebts,
  calculateDailySummary,
  calculateOverallMetrics
} from './services/financialCalculations';
import { Language } from './i18n/translations';
import { voice } from './services/voice';

export const App: React.FC = () => {
  // App Settings & PIN
  const [settings, setSettings] = useState<AppSettings>(() => storage.getSettings());
  const [isLocked, setIsLocked] = useState<boolean>(() => settings.pin_enabled);
  const [lang, setLang] = useState<Language>(() => settings.language || 'te');
  const [voiceEnabled, setVoiceEnabled] = useState<boolean>(() => settings.voice_enabled ?? true);

  // Active Date (Daily Session Management)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [currentDate, setCurrentDate] = useState<string>(todayStr);

  // Core Data State
  const [purchases, setPurchases] = useState<Purchase[]>(() => storage.getPurchases());
  const [sales, setSales] = useState<Sale[]>(() => storage.getSales());
  const [customers, setCustomers] = useState<Customer[]>(() => storage.getCustomers());
  const [repayments, setRepayments] = useState<DebtRepayment[]>(() => storage.getRepayments());
  const [expenses, setExpenses] = useState<Expense[]>(() => storage.getExpenses());

  // Modal Open States
  const [isBuyOpen, setIsBuyOpen] = useState(false);
  const [isSellOpen, setIsSellOpen] = useState(false);
  const [isDebtOpen, setIsDebtOpen] = useState(false);
  const [isExpensesOpen, setIsExpensesOpen] = useState(false);
  const [isReportsOpen, setIsReportsOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);

  // Delete Confirmation State
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'purchase' | 'sale' | 'repayment' | 'expense';
    id: string;
    title: string;
    message: string;
  } | null>(null);

  // PWA Installation & Standalone state
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState<boolean>(() => {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true
    );
  });
  const [showInstallGuide, setShowInstallGuide] = useState<boolean>(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const handleInstallApp = async () => {
    if (deferredPrompt) {
      voice.playTone('tap');
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        voice.playTone('cash');
        const msg = lang === 'te' ? 'యాప్ ఫోన్‌లో ఇన్‌స్టాల్ అయింది!' : 'App installed on your phone!';
        voice.speak(msg, lang);
        setIsStandalone(true);
      }
      setDeferredPrompt(null);
    } else {
      setShowInstallGuide(true);
    }
  };

  // Auto sync to cloud when data changes if connected
  const autoSyncToCloud = () => {
    supabaseService.syncData({
      purchases: storage.getPurchases(),
      sales: storage.getSales(),
      customers: storage.getCustomers(),
      repayments: storage.getRepayments(),
      expenses: storage.getExpenses(),
    });
  };

  // Refresh data from storage
  const reloadData = () => {
    setPurchases(storage.getPurchases());
    setSales(storage.getSales());
    setCustomers(storage.getCustomers());
    setRepayments(storage.getRepayments());
    setExpenses(storage.getExpenses());
    const s = storage.getSettings();
    setSettings(s);
    setLang(s.language || 'te');
    setVoiceEnabled(s.voice_enabled ?? true);
  };

  // Toggle Language
  const handleLanguageToggle = () => {
    const nextLang: Language = lang === 'te' ? 'en' : 'te';
    setLang(nextLang);
    storage.saveSettings({ language: nextLang });
  };

  // Toggle Voice
  const handleVoiceToggle = () => {
    const nextVoice = !voiceEnabled;
    setVoiceEnabled(nextVoice);
    storage.saveSettings({ voice_enabled: nextVoice });
  };

  // Update Settings
  const handleSaveSettings = (newSettings: Partial<AppSettings>) => {
    const updated = storage.saveSettings(newSettings);
    setSettings(updated);
  };

  // Update PIN
  const handleUpdatePin = (newPin: string) => {
    const updated = storage.saveSettings({ pin: newPin });
    setSettings(updated);
  };

  // Calculations: Inventory, Customer Debts, Daily Summary
  const inventory = useMemo(() => {
    return calculateInventoryStatus(purchases, sales);
  }, [purchases, sales]);

  const { customerDebts, totalOutstandingDebt } = useMemo(() => {
    return calculateCustomerDebts(customers, sales, repayments);
  }, [customers, sales, repayments]);

  const dailySummary = useMemo(() => {
    return calculateDailySummary(
      currentDate,
      purchases,
      sales,
      repayments,
      expenses,
      inventory
    );
  }, [currentDate, purchases, sales, repayments, expenses, inventory]);

  // Today's specific lists
  const purchasesToday = useMemo(
    () => purchases.filter((p) => p.date === currentDate),
    [purchases, currentDate]
  );
  const salesToday = useMemo(
    () => sales.filter((s) => s.date === currentDate),
    [sales, currentDate]
  );
  const repaymentsToday = useMemo(
    () => repayments.filter((r) => r.date === currentDate),
    [repayments, currentDate]
  );
  const expensesToday = useMemo(
    () => expenses.filter((e) => e.date === currentDate),
    [expenses, currentDate]
  );

  // Action Handlers
  const handleSavePurchase = (newPurchase: Purchase) => {
    storage.savePurchase(newPurchase);
    setPurchases(storage.getPurchases());
    autoSyncToCloud();
  };

  const handleSaveSale = (newSale: Sale): { success: boolean; error?: string } => {
    const result = storage.saveSale(newSale);
    if (!result.success) {
      return result;
    }
    setSales(storage.getSales());
    setCustomers(storage.getCustomers());
    autoSyncToCloud();
    return result;
  };

  const handleRecordRepayment = (newRepayment: DebtRepayment) => {
    storage.saveRepayment(newRepayment);
    setRepayments(storage.getRepayments());
    autoSyncToCloud();
  };

  const handleSaveExpense = (newExpense: Expense) => {
    storage.saveExpense(newExpense);
    setExpenses(storage.getExpenses());
    autoSyncToCloud();
  };

  // Safe Deletions with Confirmation (Section 3 Requirement)
  const handleDeletePurchasePrompt = (id: string) => {
    setConfirmDelete({
      type: 'purchase',
      id,
      title: lang === 'te' ? 'కొనుగోలు రికార్డును తొలగించాలా?' : 'Delete Purchase Record?',
      message:
        lang === 'te'
          ? 'ఈ కొనుగోలు రికార్డును తొలగిస్తే ఇన్వెంటరీ నిల్వలు మరియు లెక్కలు మారతాయి.'
          : 'Deleting this purchase will permanently update inventory stock and calculations.',
    });
  };

  const handleDeleteSalePrompt = (id: string) => {
    setConfirmDelete({
      type: 'sale',
      id,
      title: lang === 'te' ? 'అమ్మకం రికార్డును తొలగించాలా?' : 'Delete Sale Record?',
      message:
        lang === 'te'
          ? 'ఈ అమ్మకం రికార్డును తొలగిస్తే కస్టమర్ బాకీ మరియు లాభ నష్టాల లెక్కలు మారతాయి.'
          : 'Deleting this sale will adjust customer debt balance and profit.',
    });
  };

  const handleDeleteRepaymentPrompt = (id: string) => {
    setConfirmDelete({
      type: 'repayment',
      id,
      title: lang === 'te' ? 'బాకీ వసూలు రికార్డును తొలగించాలా?' : 'Delete Repayment Record?',
      message:
        lang === 'te'
          ? 'ఈ రికార్డును తొలగిస్తే కస్టమర్ బాకీ తిరిగి పెరుగుతుంది.'
          : 'Deleting this will restore the outstanding customer debt.',
    });
  };

  const handleDeleteExpensePrompt = (id: string) => {
    setConfirmDelete({
      type: 'expense',
      id,
      title: lang === 'te' ? 'ఖర్చు రికార్డును తొలగించాలా?' : 'Delete Expense Record?',
      message:
        lang === 'te'
          ? 'ఈ ఖర్చు రికార్డును తొలగించాలనుకుంటున్నారా?'
          : 'Do you want to permanently delete this expense record?',
    });
  };

  const executeConfirmedDelete = () => {
    if (!confirmDelete) return;

    if (confirmDelete.type === 'purchase') {
      storage.deletePurchase(confirmDelete.id);
      setPurchases(storage.getPurchases());
    } else if (confirmDelete.type === 'sale') {
      storage.deleteSale(confirmDelete.id);
      setSales(storage.getSales());
    } else if (confirmDelete.type === 'repayment') {
      storage.deleteRepayment(confirmDelete.id);
      setRepayments(storage.getRepayments());
    } else if (confirmDelete.type === 'expense') {
      storage.deleteExpense(confirmDelete.id);
      setExpenses(storage.getExpenses());
    }

    setConfirmDelete(null);
    autoSyncToCloud();
  };

  // If App is Locked with PIN
  if (isLocked) {
    return (
      <>
        <PinLockScreen
          correctPin={settings.pin}
          onUnlock={() => setIsLocked(false)}
          lang={lang}
          onUpdatePin={handleUpdatePin}
          isStandalone={isStandalone}
          onInstallApp={handleInstallApp}
        />
        <InstallGuideModal
          isOpen={showInstallGuide}
          onClose={() => {
            voice.stop();
            setShowInstallGuide(false);
          }}
          lang={lang}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 text-gray-900 flex flex-col font-sans">
      {/* Top Header with live database connection status */}
      <Header
        currentDate={currentDate}
        onDateChange={setCurrentDate}
        lang={lang}
        onLanguageToggle={handleLanguageToggle}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={handleVoiceToggle}
        onLockApp={() => setIsLocked(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenChangePin={() => setIsChangePinOpen(true)}
      />

      {/* Main Home Dashboard */}
      <main className="flex-1">
        <HomeDashboard
          currentDate={currentDate}
          summary={dailySummary}
          inventory={inventory}
          totalOutstandingDebt={totalOutstandingDebt}
          purchasesToday={purchasesToday}
          salesToday={salesToday}
          repaymentsToday={repaymentsToday}
          expensesToday={expensesToday}
          lang={lang}
          onOpenBuy={() => setIsBuyOpen(true)}
          onOpenSell={() => setIsSellOpen(true)}
          onOpenDebt={() => setIsDebtOpen(true)}
          onOpenReports={() => setIsReportsOpen(true)}
          onOpenExpenses={() => setIsExpensesOpen(true)}
          onDeletePurchase={handleDeletePurchasePrompt}
          onDeleteSale={handleDeleteSalePrompt}
          onDeleteRepayment={handleDeleteRepaymentPrompt}
          onDeleteExpense={handleDeleteExpensePrompt}
          isStandalone={isStandalone}
          onInstallApp={handleInstallApp}
        />
      </main>

      {/* Floating Voice Assistant Button */}
      {voiceEnabled && (
        <VoiceAssistantButton
          lang={lang}
          summary={dailySummary}
          onOpenBuy={() => setIsBuyOpen(true)}
          onOpenSell={() => setIsSellOpen(true)}
          onOpenDebt={() => setIsDebtOpen(true)}
          onOpenReports={() => setIsReportsOpen(true)}
        />
      )}

      {/* Modals */}
      <BuyModal
        isOpen={isBuyOpen}
        onClose={() => {
          voice.stop();
          setIsBuyOpen(false);
        }}
        onSave={handleSavePurchase}
        currentDate={currentDate}
        lang={lang}
      />

      <SellModal
        isOpen={isSellOpen}
        onClose={() => {
          voice.stop();
          setIsSellOpen(false);
        }}
        onSave={handleSaveSale}
        currentDate={currentDate}
        customers={customers}
        inventory={inventory}
        lang={lang}
      />

      <DebtManager
        isOpen={isDebtOpen}
        onClose={() => {
          voice.stop();
          setIsDebtOpen(false);
        }}
        customerDebts={customerDebts}
        totalOutstandingDebt={totalOutstandingDebt}
        onRecordRepayment={handleRecordRepayment}
        currentDate={currentDate}
        lang={lang}
      />

      <ExpensesModal
        isOpen={isExpensesOpen}
        onClose={() => {
          voice.stop();
          setIsExpensesOpen(false);
        }}
        onSave={handleSaveExpense}
        currentDate={currentDate}
        lang={lang}
      />

      <ReportsView
        isOpen={isReportsOpen}
        onClose={() => {
          voice.stop();
          setIsReportsOpen(false);
        }}
        currentDate={currentDate}
        purchases={purchases}
        sales={sales}
        repayments={repayments}
        expenses={expenses}
        inventory={inventory}
        customerDebts={customerDebts}
        totalOutstandingDebt={totalOutstandingDebt}
        lang={lang}
      />

      <SupabaseSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => {
          voice.stop();
          setIsSettingsOpen(false);
        }}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onRefreshData={reloadData}
        lang={lang}
      />

      <ConfirmationModal
        isOpen={!!confirmDelete}
        title={confirmDelete?.title || ''}
        message={confirmDelete?.message || ''}
        onConfirm={executeConfirmedDelete}
        onCancel={() => {
          voice.stop();
          setConfirmDelete(null);
        }}
        lang={lang}
      />

      <ChangePinModal
        isOpen={isChangePinOpen}
        onClose={() => {
          voice.stop();
          setIsChangePinOpen(false);
        }}
        currentPin={settings.pin}
        onUpdatePin={(newPin) => {
          handleUpdatePin(newPin);
          setIsChangePinOpen(false);
        }}
        lang={lang}
      />

      <InstallGuideModal
        isOpen={showInstallGuide}
        onClose={() => {
          voice.stop();
          setShowInstallGuide(false);
        }}
        lang={lang}
      />
    </div>
  );
};

export default App;
