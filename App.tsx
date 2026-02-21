import React, { useState, useEffect, useCallback } from 'react';
import {
  LayoutDashboard,
  PackagePlus,
  ClipboardList,
  FileCheck,
  Hammer,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  User as UserIcon,
  ChevronRight,
  CircleCheckBig,
  Plus,
  TrendingUp,
  AlertCircle,
  Briefcase,
  Target,
  FileText,
  BarChart3,
  Settings,
  HelpCircle
} from 'lucide-react';
import {
  AppState,
  ProductionStatus,
  Step1SFProduction,
  Step2SJCPlanning,
  Step3SFEntry,
  Step5Crushing
} from './types';
import { UserRecord, hasPageAccess } from './components/src/loginApi';

// Components
import Dashboard from './components/Dashboard';
import Step1List from './components/Step1List';
import Step2List from './components/Step2List';
import Step3List from './components/Step3List';
import Step4List from './components/Step4List';
import Step5List from './components/Step5List';
import Login from './components/Login';
import PassaryLogo from './components/PassaryLogo';

// Initial Dummy Data for demonstration
const initialDummyData: AppState = {
  productions: [
    {
      id: 'p1',
      timestamp: new Date().toISOString(),
      sfSrNo: 'SF-116',
      name: 'Standard Quartz Powder',
      qty: 1000,
      notes: 'Main industrial order',
      totalPlanned: 700,
      totalMade: 450,
      pending: 550,
      status: ProductionStatus.IN_PROGRESS
    },
    {
      id: 'p2',
      timestamp: new Date().toISOString(),
      sfSrNo: 'SF-117',
      name: 'Premium Silica Grit',
      qty: 500,
      notes: 'High priority export',
      totalPlanned: 500,
      totalMade: 500,
      pending: 0,
      status: ProductionStatus.COMPLETED
    }
  ],
  jobCards: [
    { id: 'j1', sjcSrNo: 'SJC-381', sfProductionId: 'p1', supervisorName: 'Rahul Kumar', productName: 'Standard Quartz Powder', qty: 300, date: '2023-10-25', actualMade: 300 },
    { id: 'j2', sjcSrNo: 'SJC-382', sfProductionId: 'p1', supervisorName: 'Amit Singh', productName: 'Standard Quartz Powder', qty: 400, date: '2023-10-26', actualMade: 150 }
  ],
  actualEntries: [
    {
      id: 'e1', sjcId: 'j1', sfProductionId: 'p1', supervisorName: 'Rahul Kumar', date: '2023-10-25', productName: 'Standard Quartz Powder',
      qtyProduced: 300, rawMaterials: [{ name: 'Raw Stone', qty: 320 }, { name: 'Fuel', qty: 10 }, { name: 'Lubricant', qty: 2 }], isAnyEndProduct: false, endProductName: '', endProductQty: 0,
      narration: 'Smooth run', startReading: 1000, endReading: 1050, machineRunningHours: 50
    }
  ],
  crushingEntries: []
};

// Storage keys
const AUTH_STORAGE_KEY = 'protrack_user';
const STATE_STORAGE_KEY = 'protrack_state_v4';
const ACTIVE_TAB_KEY = 'protrack_active_tab';

const App: React.FC = () => {
  // Initialize user from localStorage (persisted login)
  const [currentUser, setCurrentUser] = useState<UserRecord | null>(() => {
    const saved = localStorage.getItem(AUTH_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  });

  // Initialize active tab from localStorage
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = localStorage.getItem(ACTIVE_TAB_KEY);
    return savedTab || 'dashboard';
  });

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(STATE_STORAGE_KEY);
    return saved ? JSON.parse(saved) : initialDummyData;
  });

  // Persist user session
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(currentUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [currentUser]);

  // Persist active tab
  useEffect(() => {
    localStorage.setItem(ACTIVE_TAB_KEY, activeTab);
  }, [activeTab]);

  // Persist app state
  useEffect(() => {
    localStorage.setItem(STATE_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const handleUpdateState = useCallback((updater: (prev: AppState) => AppState) => {
    setState(prev => {
      const newState = updater(prev);

      const updatedJobCards = newState.jobCards.map(sjc => {
        const sjcActualMade = newState.actualEntries
          .filter(entry => entry.sjcId === sjc.id)
          .reduce((sum, entry) => sum + entry.qtyProduced, 0);
        return { ...sjc, actualMade: sjcActualMade };
      });

      const updatedProductions = newState.productions.map(prod => {
        const totalPlanned = updatedJobCards
          .filter(sjc => sjc.sfProductionId === prod.id)
          .reduce((sum, sjc) => sum + sjc.qty, 0);

        const totalMade = newState.actualEntries
          .filter(entry => entry.sfProductionId === prod.id)
          .reduce((sum, entry) => sum + entry.qtyProduced, 0);

        const pending = prod.qty - totalMade;
        let status = ProductionStatus.PENDING;
        if (totalMade > 0) status = ProductionStatus.IN_PROGRESS;
        if (pending <= 0) status = ProductionStatus.COMPLETED;

        return {
          ...prod,
          totalPlanned,
          totalMade,
          pending: Math.max(0, pending),
          status
        };
      });

      return {
        ...newState,
        jobCards: updatedJobCards,
        productions: updatedProductions
      };
    });
  }, []);

  const handleLogin = (user: UserRecord) => {
    setCurrentUser(user);
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  if (!currentUser) {
    return <Login onLogin={handleLogin} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard state={state} />;
      case 'step1': return <Step1List state={state} onUpdate={handleUpdateState} />;
      case 'step2': return <Step2List state={state} onUpdate={handleUpdateState} />;
      case 'step3': return <Step3List state={state} onUpdate={handleUpdateState} />;
      case 'step4': return <Step4List state={state} onUpdate={handleUpdateState} />;
      case 'step5': return <Step5List state={state} onUpdate={handleUpdateState} />;
      default: return <Dashboard state={state} />;
    }
  };

  const allNavItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'step1', label: 'SF Production', icon: PackagePlus },
    { id: 'step2', label: 'Job Card Planning', icon: ClipboardList },
    { id: 'step3', label: 'Actual Entry', icon: FileCheck },
    { id: 'step4', label: 'Mark Done', icon: CircleCheckBig },
    { id: 'step5', label: 'Crushing', icon: Hammer },
  ];

  // Filter nav items based on the user's page access
  const navItems = allNavItems.filter((item) =>
    hasPageAccess(currentUser?.pageAccess ?? [], item.label)
  );

  return (
    <div className="flex h-screen bg-[#F4F7FE] overflow-hidden">
      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Fixed Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-xl transition-transform duration-300 transform lg:static lg:translate-x-0 h-full flex flex-col
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col items-center justify-center px-6 py-5 border-b border-slate-100 bg-white">
          <PassaryLogo variant="dark" />
          <button onClick={() => setIsSidebarOpen(false)} className="absolute top-4 right-4 lg:hidden text-slate-400">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`
                  flex items-center w-full px-4 py-3 rounded-xl transition-all duration-200
                  ${activeTab === item.id
                    ? 'bg-[#84a93c] text-white shadow-lg shadow-emerald-100'
                    : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800'}
                `}
              >
                <item.icon size={20} className="mr-3" />
                <span className="font-semibold text-sm">{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-100">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-4 py-3 text-slate-500 rounded-xl hover:bg-red-50 hover:text-red-600 transition-all text-sm font-bold"
          >
            <LogOut size={20} className="mr-3" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Scrollable Content */}
      <div className="flex-1 flex flex-col min-w-0 relative">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-6 bg-white border-b border-slate-100 sticky top-0 z-30 shrink-0">
          <div className="flex items-center">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 mr-4 text-slate-600 lg:hidden hover:bg-slate-50 rounded-lg"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-lg font-bold text-[#84a93c] tracking-tight">
                {navItems.find(i => i.id === activeTab)?.label || 'PASMIN System'}
              </h1>
              <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider">Enterprise Production tracking</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <button className="p-2 text-slate-400 hover:text-[#84a93c] hover:bg-emerald-50 rounded-full relative transition-colors">
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div className="flex items-center space-x-2 pl-2 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-800">{currentUser?.name || currentUser?.username}</p>
                <p className="text-[10px] text-emerald-500 font-bold uppercase">Online</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-[#84a93c] shadow-sm border border-emerald-100">
                <UserIcon size={18} />
              </div>
            </div>
          </div>
        </header>

        {/* View Area - Scrollable */}
        <div className="flex-1 overflow-y-auto p-6 pb-20 space-y-6">
          {renderContent()}
        </div>

        {/* Fixed Footer */}
        <footer className="absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm border-t border-slate-100 px-6 py-3 flex justify-center items-center z-30">
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
            Powered by <span className="text-[#84a93c]"><a href="https://botivate.in">Botivate</a></span>
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;