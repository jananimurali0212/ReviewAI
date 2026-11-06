import React, { useState } from 'react';
import { 
  Settings, 
  User, 
  Palette, 
  Cpu, 
  Info, 
  Check, 
  Sparkles,
  Save
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  // Profile state (placeholder)
  const [profileName, setProfileName] = useState('Senior Security Engineer');
  const [profileEmail, setProfileEmail] = useState('engineer@reviewai.dev');
  const [role, setRole] = useState('Tech Lead / Reviewer');

  // Appearance state
  const [theme, setTheme] = useState<'dark' | 'midnight'>('midnight');
  const [editorFontSize, setEditorFontSize] = useState('13px');
  const [minimapEnabled, setMinimapEnabled] = useState(true);

  // AI Provider configuration state (UI Only - no keys exposed or requested)
  const [aiProvider, setAiProvider] = useState('gemini-2.5-flash');
  const [temperature, setTemperature] = useState(0.2);
  const [strictness, setStrictness] = useState('high');

  const [savedNotification, setSavedNotification] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedNotification(true);
    setTimeout(() => setSavedNotification(false), 3000);
  };

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Settings className="h-5 w-5 text-purple-400" />
            <span>Application Settings</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure profile preferences, editor experience, and AI model parameters
          </p>
        </div>

        {savedNotification && (
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3.5 py-1.5 text-xs text-emerald-300 animate-fadeIn">
            <Check className="h-4 w-4 text-emerald-400" />
            <span>Preferences updated</span>
          </div>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Profile Information */}
        <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Profile Information</h3>
              <p className="text-xs text-slate-400">Account identity and author signature for review reports</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Display Name
              </label>
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-xs text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                value={profileEmail}
                onChange={(e) => setProfileEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-xs text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Reviewer Role / Title
              </label>
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-xs text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Appearance & Editor Preference */}
        <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Palette className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Appearance & Editor Preferences</h3>
              <p className="text-xs text-slate-400">Customize UI theme and Monaco code view aesthetics</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Platform Theme
              </label>
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as any)}
                className="w-full rounded-xl border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-xs text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="midnight">Deep Midnight Navy (Active)</option>
                <option value="dark">Charcoal Slate</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Monaco Editor Font Size
              </label>
              <select
                value={editorFontSize}
                onChange={(e) => setEditorFontSize(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-xs text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              >
                <option value="12px">12px (Compact)</option>
                <option value="13px">13px (Recommended)</option>
                <option value="14px">14px (Standard)</option>
                <option value="16px">16px (Large)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Minimap Preview
              </label>
              <div className="flex items-center h-9 mt-1">
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={minimapEnabled}
                    onChange={(e) => setMinimapEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                  <span className="ml-3 text-xs font-medium text-slate-300">
                    {minimapEnabled ? 'Visible' : 'Hidden'}
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: AI Provider Configuration (UI Only - Strict Security) */}
        <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4 mb-5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Cpu className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">AI Provider Configuration</h3>
              <p className="text-xs text-slate-400">
                Model reasoning tier selection (Managed securely on backend; keys never exposed to client)
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-purple-500/20 bg-purple-900/10 p-3.5 text-xs text-purple-300 flex items-start gap-2.5">
              <Sparkles className="h-4 w-4 text-purple-400 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-white">Secure Architecture Guarantee</p>
                <p className="text-slate-300 mt-0.5">
                  AI providers and credentials are routed exclusively through backend environment variables on Day 2. 
                  Frontend clients do not prompt for or transmit raw API keys.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  AI Model Profile
                </label>
                <select
                  value={aiProvider}
                  onChange={(e) => setAiProvider(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-xs text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="gemini-2.5-pro">Google Gemini 2.5 Pro (Deep Code Reasoning)</option>
                  <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (Ultra-Low Latency)</option>
                  <option value="custom-llm">Custom Self-Hosted Model (Enterprise)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Review Strictness Filter
                </label>
                <select
                  value={strictness}
                  onChange={(e) => setStrictness(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-[#0B0F19] px-3.5 py-2 text-xs text-slate-100 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  <option value="high">High (Security vulnerabilities, strict styling, complexity)</option>
                  <option value="medium">Medium (Standard clean code & bugs)</option>
                  <option value="critical-only">Critical-Only (Severe crash/exploit bugs)</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <div className="flex justify-between items-center mb-1.5">
                  <label className="text-xs font-medium text-slate-300">
                    Model Sampling Temperature: <span className="font-mono text-purple-400">{temperature}</span>
                  </label>
                  <span className="text-[11px] text-slate-400">Lower = More deterministic analysis</span>
                </div>
                <input
                  type="range"
                  min="0.0"
                  max="1.0"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Application Information */}
        <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-6 backdrop-blur-sm">
          <div className="flex items-center gap-3 border-b border-slate-800/80 pb-4 mb-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Info className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white">Application Information</h3>
              <p className="text-xs text-slate-400">Platform release metadata and runtime specifications</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="flex justify-between p-3 rounded-xl bg-[#0B0F19] border border-slate-800">
              <span className="text-slate-400">Application:</span>
              <span className="font-semibold text-white">ReviewAI Platform</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-[#0B0F19] border border-slate-800">
              <span className="text-slate-400">Release Stage:</span>
              <span className="font-mono text-purple-400 font-medium">Day 1 Foundation</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-[#0B0F19] border border-slate-800">
              <span className="text-slate-400">Frontend Stack:</span>
              <span className="font-mono text-slate-300">React 18 + Vite + TS + Tailwind</span>
            </div>
            <div className="flex justify-between p-3 rounded-xl bg-[#0B0F19] border border-slate-800">
              <span className="text-slate-400">Backend Stack:</span>
              <span className="font-mono text-slate-300">FastAPI + Uvicorn (Python 3.12)</span>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-purple-600/30 transition-all hover:opacity-95 active:scale-95"
          >
            <Save className="h-4 w-4" />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
};
