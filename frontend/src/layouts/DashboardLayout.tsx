import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Code2, 
  History, 
  Settings, 
  ShieldCheck, 
  Activity, 
  Menu, 
  X, 
  Sparkles
} from 'lucide-react';
import { NavPage } from '../types';
import { checkBackendHealth, HealthResponse } from '../services/api';

interface DashboardLayoutProps {
  currentPage: NavPage;
  onNavigate: (page: NavPage) => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  currentPage,
  onNavigate,
  children,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [backendHealth, setBackendHealth] = useState<HealthResponse | null>(null);
  const [isHealthChecking, setIsHealthChecking] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchHealth = async () => {
      try {
        const data = await checkBackendHealth();
        if (isMounted) {
          setBackendHealth(data);
          setIsHealthChecking(false);
        }
      } catch {
        if (isMounted) {
          setBackendHealth(null);
          setIsHealthChecking(false);
        }
      }
    };

    fetchHealth();
    const interval = setInterval(fetchHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const navItems = [
    {
      id: 'dashboard' as NavPage,
      label: 'Dashboard',
      icon: LayoutDashboard,
      badge: undefined,
    },
    {
      id: 'new-review' as NavPage,
      label: 'New Review',
      icon: Code2,
      badge: 'Editor',
    },
    {
      id: 'history' as NavPage,
      label: 'Review History',
      icon: History,
      badge: '10',
    },
    {
      id: 'settings' as NavPage,
      label: 'Settings',
      icon: Settings,
      badge: undefined,
    },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#070a13] text-slate-100">
      {/* Mobile Menu Backdrop */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-slate-800/80 bg-[#0B0F19] transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand Logo & Header */}
        <div className="flex h-16 items-center justify-between border-b border-slate-800/80 px-5">
          <div className="flex items-center space-x-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 shadow-lg shadow-purple-600/30">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className="font-bold tracking-tight text-white text-lg">ReviewAI</span>
                <span className="rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-400 border border-purple-500/20">
                  v0.1
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">AI Code Reviewer</p>
            </div>
          </div>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 lg:hidden"
            aria-label="Close menu"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Platform Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentPage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-600/20 to-indigo-600/10 text-white border border-purple-500/30 shadow-sm shadow-purple-900/20'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <Icon
                    className={`h-4 w-4 transition-colors ${
                      isActive ? 'text-purple-400' : 'text-slate-400 group-hover:text-slate-200'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      isActive
                        ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Sidebar Footer with Live API Status */}
        <div className="border-t border-slate-800/80 p-3 space-y-3">
          <div className="rounded-xl border border-slate-800/70 bg-[#0F172A]/70 p-3">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
                <Activity className="h-3 w-3 text-slate-400" />
                Backend Status
              </span>
              <div className="flex items-center gap-1.5">
                <span
                  className={`h-2 w-2 rounded-full ${
                    isHealthChecking
                      ? 'bg-amber-400 animate-pulse'
                      : backendHealth
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50'
                      : 'bg-rose-400 shadow-sm shadow-rose-400/50'
                  }`}
                />
                <span className="text-[11px] font-mono text-slate-300">
                  {isHealthChecking
                    ? 'Checking...'
                    : backendHealth
                    ? 'Online'
                    : 'Offline'}
                </span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 truncate">
              {backendHealth ? `FastAPI ${backendHealth.version}` : 'Run: uvicorn app.main:app'}
            </div>
          </div>

          <div className="flex items-center justify-between px-2 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-purple-400" /> Day 1 Baseline
            </span>
            <span className="text-slate-400 font-mono">React + TS</span>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Header Bar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800/80 bg-[#0B0F19]/90 backdrop-blur-md px-6">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-slate-200 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-base font-semibold text-white capitalize">
                {currentPage === 'new-review' ? 'New Code Review' : currentPage.replace('-', ' ')}
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Advanced multi-language source code quality & security inspection
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {currentPage !== 'new-review' && (
              <button
                onClick={() => onNavigate('new-review')}
                className="hidden sm:inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-purple-600/25 transition-all hover:opacity-95 active:scale-95"
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>New Review</span>
              </button>
            )}

            <div className="flex items-center space-x-3 border-l border-slate-800 pl-4">
              <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-purple-500 to-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-inner">
                RA
              </div>
              <div className="hidden md:block text-left text-xs">
                <p className="font-medium text-slate-200">Dev Team</p>
                <p className="text-[10px] text-slate-400">admin@reviewai.dev</p>
              </div>
            </div>
          </div>
        </header>

        {/* Scrollable Viewport */}
        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-gradient-to-b from-[#0B0F19] to-[#070a13]">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
