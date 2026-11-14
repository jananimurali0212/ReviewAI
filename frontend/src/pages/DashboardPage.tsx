import React from 'react';
import { 
  FileCode2, 
  AlertTriangle, 
  Flame, 
  ArrowRight, 
  CheckCircle2, 
  Clock, 
  Sparkles,
  TrendingUp,
  Cpu,
  Layers
} from 'lucide-react';
import { NavPage } from '../types';
import { MOCK_DASHBOARD_METRICS, MOCK_RECENT_REVIEWS } from '../services/mockData';

interface DashboardPageProps {
  onNavigate: (page: NavPage) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-r from-purple-900/30 via-indigo-950/40 to-slate-900/60 p-6 sm:p-8 backdrop-blur-md shadow-xl">
        <div className="absolute -right-12 -top-12 h-64 w-64 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
              <Sparkles className="h-3.5 w-3.5 text-purple-400" />
              <span>Day 1 Project Foundation Active</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Code Intelligence & Security Platform
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed">
              ReviewAI automatically analyzes code across 21 programming languages to uncover logic flaws, 
              performance bottlenecks, and security vulnerabilities with surgical precision.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('new-review')}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-600/30 transition-all hover:scale-[1.02] hover:opacity-95 active:scale-95"
            >
              <FileCode2 className="h-4 w-4" />
              <span>New Code Review</span>
              <ArrowRight className="h-4 w-4 ml-1" />
            </button>
            <button
              onClick={() => onNavigate('history')}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 text-sm font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white"
            >
              <span>View History</span>
            </button>
          </div>
        </div>
      </div>

      {/* Key Metric Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Total Reviews Card */}
        <div className="group relative rounded-2xl border border-slate-800 bg-[#0F172A]/70 p-6 backdrop-blur-sm transition-all duration-300 hover:border-purple-500/40 hover:shadow-lg hover:shadow-purple-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Reviews</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-110 transition-transform">
              <FileCode2 className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
              {MOCK_DASHBOARD_METRICS.totalReviews}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              {MOCK_DASHBOARD_METRICS.totalReviewsTrend}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Source code submissions processed across repositories
          </p>
        </div>

        {/* Issues Detected Card */}
        <div className="group relative rounded-2xl border border-slate-800 bg-[#0F172A]/70 p-6 backdrop-blur-sm transition-all duration-300 hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-950/20">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Issues Detected</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 group-hover:scale-110 transition-transform">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
              {MOCK_DASHBOARD_METRICS.issuesDetected}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-400">
              {MOCK_DASHBOARD_METRICS.issuesTrend}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Code smells, performance hits, and lint anomalies
          </p>
        </div>

        {/* Critical Issues Card */}
        <div className="group relative rounded-2xl border border-slate-800 bg-[#0F172A]/70 p-6 backdrop-blur-sm transition-all duration-300 hover:border-rose-500/40 hover:shadow-lg hover:shadow-rose-950/20 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Critical Issues</span>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-110 transition-transform">
              <Flame className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-3xl font-extrabold tracking-tight text-white font-mono">
              {MOCK_DASHBOARD_METRICS.criticalIssues}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              {MOCK_DASHBOARD_METRICS.criticalTrend}
            </span>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Severe security risks, memory leaks, and null dereferences
          </p>
        </div>
      </div>

      {/* Architecture Highlights & Recent Reviews */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Reviews Table Section (2 Cols) */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-[#0F172A]/70 p-6 backdrop-blur-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h3 className="text-base font-semibold text-white">Recent Code Reviews</h3>
              <p className="text-xs text-slate-400">Latest analysis records and inspection health</p>
            </div>
            <button
              onClick={() => onNavigate('history')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-purple-400 hover:text-purple-300"
            >
              <span>View all</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                  <th className="pb-3 pl-2">Project / File</th>
                  <th className="pb-3 px-3">Language</th>
                  <th className="pb-3 px-3">Date</th>
                  <th className="pb-3 px-3">Issues</th>
                  <th className="pb-3 pr-2 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {MOCK_RECENT_REVIEWS.map((review) => (
                  <tr
                    key={review.id}
                    className="group hover:bg-slate-800/40 transition-colors cursor-pointer"
                    onClick={() => onNavigate('history')}
                  >
                    <td className="py-3.5 pl-2 font-medium text-slate-200">
                      <div>
                        <div className="font-semibold text-white">{review.projectName}</div>
                        <div className="text-[11px] font-mono text-purple-300/80">{review.fileName}</div>
                      </div>
                    </td>
                    <td className="py-3.5 px-3">
                      <span className="rounded-md border border-slate-700 bg-slate-800/90 px-2 py-1 text-[11px] font-mono text-slate-300">
                        {review.language}
                      </span>
                    </td>
                    <td className="py-3.5 px-3 text-slate-400 font-mono text-[11px]">
                      {review.reviewDate}
                    </td>
                    <td className="py-3.5 px-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-200">{review.issueCount}</span>
                        {review.criticalIssues > 0 && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/30">
                            {review.criticalIssues} crit
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3.5 pr-2 text-right">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          review.status === 'Completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            review.status === 'Completed' ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                        />
                        {review.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* System Capabilities & Day 1 Roadmap (1 Col) */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/70 p-6 backdrop-blur-sm">
            <h3 className="text-base font-semibold text-white mb-2 flex items-center gap-2">
              <Cpu className="h-4 w-4 text-purple-400" />
              <span>Multi-Language Engine</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Supported parser syntaxes ready for code submission:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {[
                'Python', 'Java', 'C', 'C++', 'JavaScript', 
                'TypeScript', 'Go', 'Rust', 'PHP', 'C#', 
                'Ruby', 'Kotlin', 'Swift', 'Dart', 'R',
                'Scala', 'Perl', 'Lua', 'HTML', 'CSS', 'SQL'
              ].map((lang) => (
                <span
                  key={lang}
                  className="rounded-lg border border-slate-800 bg-[#0B0F19] px-2.5 py-1 text-[11px] font-mono text-slate-300"
                >
                  {lang}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-purple-900/30 bg-gradient-to-br from-purple-950/20 to-slate-900/80 p-6 backdrop-blur-sm">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Layers className="h-4 w-4 text-indigo-400" />
              <span>5-Day Roadmap Status</span>
            </h3>
            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Day 1: UI Foundation & Monaco Editor (Completed)</span>
              </li>
              <li className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Day 2: Code Submission & Language Detection (Completed)</span>
              </li>
              <li className="flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 className="h-3.5 w-3.5" />
                <span>Day 3: Gemini AI Code Review Engine (Completed)</span>
              </li>
              <li className="flex items-center gap-2 text-purple-400 font-medium">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Day 4: Static Analysis & Intelligent Fix Suggestions (Active)</span>
              </li>
              <li className="flex items-center gap-2 text-slate-400">
                <Clock className="h-3.5 w-3.5" />
                <span>Day 5: Performance & Final Polish</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
