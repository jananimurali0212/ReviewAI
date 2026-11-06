import React, { useState } from 'react';
import { 
  History, 
  Search, 
  Filter, 
  FileCode2, 
  AlertTriangle, 
  Clock, 
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { MOCK_FULL_HISTORY } from '../services/mockData';
import { ReviewHistoryItem } from '../types';

export const ReviewHistoryPage: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | 'Completed' | 'Needs Attention'>('All');
  const [selectedReview, setSelectedReview] = useState<ReviewHistoryItem | null>(null);

  const filteredReviews = MOCK_FULL_HISTORY.filter((item) => {
    const matchesSearch = 
      item.projectName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.language.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <History className="h-5 w-5 text-purple-400" />
            <span>Review History</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Historical audit logs of scanned repositories, vulnerability summaries, and resolutions
          </p>
        </div>

        <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/10 px-3 py-1 text-xs text-purple-300">
          <Sparkles className="h-3.5 w-3.5 text-purple-400" />
          <span>Placeholder Records (Day 1 Mock Data)</span>
        </div>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-slate-800 bg-[#0F172A]/80 p-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by project, file name, or language..."
            className="w-full rounded-lg border border-slate-700/80 bg-[#0B0F19] pl-9 pr-4 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400 pl-2">
            <Filter className="h-3.5 w-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-slate-700 bg-[#0B0F19] px-3 py-2 text-xs text-slate-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
          >
            <option value="All">All Reviews ({MOCK_FULL_HISTORY.length})</option>
            <option value="Completed">Completed</option>
            <option value="Needs Attention">Needs Attention</option>
          </select>
        </div>
      </div>

      {/* Review History Table Layout */}
      <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/70 backdrop-blur-sm overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#0B0F19]/60 text-slate-400 font-semibold uppercase tracking-wider">
                <th className="py-3.5 pl-5 pr-3">Project & File</th>
                <th className="py-3.5 px-4">Language</th>
                <th className="py-3.5 px-4">Review Date</th>
                <th className="py-3.5 px-4">Issues Detected</th>
                <th className="py-3.5 px-4">Review Status</th>
                <th className="py-3.5 pr-5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredReviews.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-xs text-slate-500">
                    No review history matches the selected filters.
                  </td>
                </tr>
              ) : (
                filteredReviews.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => setSelectedReview(item)}
                  >
                    <td className="py-4 pl-5 pr-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-transform">
                          <FileCode2 className="h-4 w-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-white group-hover:text-purple-300 transition-colors">
                            {item.projectName}
                          </div>
                          <div className="text-[11px] font-mono text-slate-400">
                            {item.fileName}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span className="rounded-md border border-slate-700 bg-slate-800/90 px-2.5 py-1 text-[11px] font-mono text-slate-300">
                        {item.language}
                      </span>
                    </td>

                    <td className="py-4 px-4 text-slate-400 font-mono text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <Clock className="h-3 w-3 text-slate-400" />
                        <span>{item.reviewDate}</span>
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-slate-200 font-medium">
                          {item.issueCount} {item.issueCount === 1 ? 'issue' : 'issues'}
                        </span>
                        {item.criticalIssues > 0 && (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-rose-400 border border-rose-500/30">
                            <AlertTriangle className="h-2.5 w-2.5" />
                            {item.criticalIssues} critical
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-4 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                          item.status === 'Completed'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}
                      >
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${
                            item.status === 'Completed' ? 'bg-emerald-400' : 'bg-amber-400'
                          }`}
                        />
                        {item.status}
                      </span>
                    </td>

                    <td className="py-4 pr-5 text-right">
                      <button
                        className="inline-flex items-center gap-1 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                        title="View Record Details"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Details Modal (Inspection Preview for Placeholder) */}
      {selectedReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-700 bg-[#0F172A] p-6 shadow-2xl animate-fadeIn">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <FileCode2 className="h-5 w-5 text-purple-400" />
                <h3 className="font-semibold text-white">{selectedReview.projectName}</h3>
              </div>
              <button
                onClick={() => setSelectedReview(null)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                &times;
              </button>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">File Name:</span>
                <span className="font-mono text-slate-200">{selectedReview.fileName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Language:</span>
                <span className="font-mono text-purple-400">{selectedReview.language}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Date:</span>
                <span className="font-mono text-slate-200">{selectedReview.reviewDate}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Total Issues:</span>
                <span className="font-mono text-slate-200">{selectedReview.issueCount}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Critical Issues:</span>
                <span className="font-mono text-rose-400 font-semibold">{selectedReview.criticalIssues}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800">
                <span className="text-slate-400">Status:</span>
                <span className="text-emerald-400 font-semibold">{selectedReview.status}</span>
              </div>
              <div className="p-3 rounded-xl bg-purple-900/10 border border-purple-500/20 text-purple-300 text-[11px] mt-2">
                Note: Detailed AST analysis graphs and AI breakdown will be connected during Day 3 and Day 4 database integration.
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedReview(null)}
                className="rounded-xl bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
