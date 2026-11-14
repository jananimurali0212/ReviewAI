import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Editor from '@monaco-editor/react';
import { 
  Code2, 
  Upload, 
  ClipboardCopy, 
  Trash2, 
  Play, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  Info, 
  ChevronDown, 
  Loader2, 
  Sparkles, 
  X, 
  FileCode, 
  AlertTriangle,
  Flame,
  ShieldAlert,
  Bug,
  Zap,
  Wrench,
  Palette,
  Clock,
  Cpu,
  Filter,
  Check,
  Undo2,
  GitCommit,
  Layers

} from 'lucide-react';
import { 
  SupportedLanguage, 
  LanguageDetectResult, 
  CodeSubmitResult,
  ReviewReport,
  SeverityLevel,
  FindingCategory,
  FindingSource,
  SuggestedFix
} from '../types';
import { SUPPORTED_LANGUAGES } from '../services/mockData';
import { 
  detectLanguageApi, 
  submitCodeApi, 
  analyzeCodeReviewApi,
  suggestFixApi,
  applyFixApi,
  rejectFixApi
} from '../services/api';

export const NewReviewPage: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('python');
  const [code, setCode] = useState<string>(
    SUPPORTED_LANGUAGES.find((l) => l.id === 'python')?.sampleSnippet || ''
  );
  const [fileName, setFileName] = useState<string>('sample_script.py');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);

  // Analysis mode: combined (default), static_only, ai_only
  const [reviewMode, setReviewMode] = useState<'combined' | 'static_only' | 'ai_only'>('combined');

  // Status & API states
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDetecting, setIsDetecting] = useState<boolean>(false);
  const [detectionInfo, setDetectionInfo] = useState<LanguageDetectResult | null>(null);
  const [, setSubmissionResult] = useState<CodeSubmitResult | null>(null);
  const [reviewReport, setReviewReport] = useState<ReviewReport | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);

  // Filter states for Review Report
  const [sourceFilter, setSourceFilter] = useState<FindingSource | 'all'>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<FindingCategory | 'all'>('all');

  // Day 4: Fix Suggestion and Developer Approval Workflow states
  const [fixSuggestions, setFixSuggestions] = useState<Record<string, SuggestedFix>>({});
  const [isGeneratingFix, setIsGeneratingFix] = useState<Record<string, boolean>>({});
  const [isApplyingFix, setIsApplyingFix] = useState<Record<string, boolean>>({});
  const [fixStatus, setFixStatus] = useState<Record<string, 'idle' | 'suggested' | 'applied' | 'rejected' | 'stale'>>({});
  const [fixErrorMessage, setFixErrorMessage] = useState<Record<string, string>>({});
  const [undoHistory, setUndoHistory] = useState<{ previousCode: string; findingId: string }[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  const currentLanguageConfig = SUPPORTED_LANGUAGES.find((l) => l.id === selectedLanguage);

  // Debounced language detection function for pasted/typed content
  const triggerLanguageDetection = useCallback(
    async (codeSnippet: string, currentFile?: string, forceAutoSelect: boolean = false) => {
      if (!codeSnippet.trim() && !currentFile) {
        setDetectionInfo(null);
        return;
      }

      setIsDetecting(true);
      try {
        const result = await detectLanguageApi({
          code: codeSnippet,
          filename: currentFile,
        });
        setDetectionInfo(result);

        // Auto-update language selector if reliable and not manually locked (or forced by upload)
        if (result.is_reliable && result.detected_language) {
          if (!isManualOverride || forceAutoSelect) {
            setSelectedLanguage(result.detected_language);
          }
        }
      } catch (err) {
        console.warn('Background language detection error:', err);
      } finally {
        setIsDetecting(false);
      }
    },
    [isManualOverride]
  );

  // Handle programming language selection (Manual Override)
  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setSelectedLanguage(newLang);
    setIsManualOverride(true);
    setValidationError(null);

    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.id === newLang);
    if (langConfig && fileName) {
      const baseName = fileName.includes('.') ? fileName.split('.')[0] : fileName;
      setFileName(`${baseName}${langConfig.extension}`);
    }
  };

  // Handle source file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setValidationError(null);
    setValidationWarning(null);
    setValidationSuccess(null);
    setSubmissionResult(null);
    setReviewReport(null);

    const MAX_SIZE = 1_048_576; // 1 MB
    if (file.size > MAX_SIZE) {
      setValidationError(
        `File '${file.name}' (${(file.size / 1024).toFixed(1)} KB) exceeds the 1 MB limit. Please select a smaller file.`
      );
      event.target.value = '';
      return;
    }

    setFileName(file.name);
    setUploadedFile({ name: file.name, size: file.size });

    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    const isExtensionSupported = SUPPORTED_LANGUAGES.some(
      (l) => l.extension.toLowerCase() === fileExt
    );

    if (!isExtensionSupported && file.name.includes('.')) {
      setValidationWarning(
        `Warning: '${fileExt}' is not a recognized extension for the 21 supported languages. Please verify your selected language.`
      );
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || '';
      setCode(content);
      triggerLanguageDetection(content, file.name, true);
    };
    reader.onerror = () => {
      setValidationError('Failed to read the uploaded source file from disk.');
    };
    reader.readAsText(file);

    event.target.value = '';
  };

  // Handle remove uploaded file
  const handleRemoveFile = () => {
    setUploadedFile(null);
    setFileName('untitled' + (currentLanguageConfig?.extension || '.txt'));
    setValidationWarning(null);
    setValidationError(null);
  };

  // Handle paste code from clipboard
  const handlePasteCode = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        setCode(clipboardText);
        setValidationError(null);
        setValidationSuccess(null);
        setSubmissionResult(null);
        setReviewReport(null);
        setIsManualOverride(false);

        if (fileName === 'sample_script.py' || uploadedFile) {
          setUploadedFile(null);
          setFileName('pasted_code' + (currentLanguageConfig?.extension || '.txt'));
        }

        triggerLanguageDetection(clipboardText, undefined, true);
      }
    } catch {
      setValidationError('Clipboard read permission was denied. Please paste directly into the Monaco Editor.');
    }
  };

  // Handle editor text change with debounced detection
  const handleEditorChange = (value: string | undefined) => {
    const updated = value || '';
    setCode(updated);
    setValidationSuccess(null);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    if (updated.length > 20 && !uploadedFile) {
      debounceTimerRef.current = setTimeout(() => {
        triggerLanguageDetection(updated, fileName, false);
      }, 700);
    }
  };

  // Clean up debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Handle clear all
  const handleClearAll = () => {
    setCode('');
    setUploadedFile(null);
    setFileName('untitled' + (currentLanguageConfig?.extension || '.txt'));
    setDetectionInfo(null);
    setSubmissionResult(null);
    setReviewReport(null);
    setValidationError(null);
    setValidationWarning(null);
    setValidationSuccess(null);
    setIsManualOverride(false);
    setFixSuggestions({});
    setFixStatus({});
    setUndoHistory([]);
  };

  // Handle Review submission (AI, Static, or Combined)
  const handleReviewCode = async () => {
    setValidationError(null);
    setValidationWarning(null);
    setValidationSuccess(null);
    setSubmissionResult(null);
    setReviewReport(null);

    if (!code || !code.trim()) {
      setValidationError('Code submission cannot be empty. Please enter, paste, or upload source code.');
      return;
    }

    const blob = new Blob([code]);
    if (blob.size > 1_048_576) {
      setValidationError(`Code size (${(blob.size / 1024).toFixed(1)} KB) exceeds the 1 MB maximum limit.`);
      return;
    }

    setIsSubmitting(true);
    try {
      // Step 1: Submit code metadata to Day 2 submission endpoint
      const submitResp = await submitCodeApi({
        code,
        language: selectedLanguage,
        filename: fileName || undefined,
        language_detected: detectionInfo?.is_reliable ?? false,
        submission_type: uploadedFile ? 'file_upload' : 'paste',
        metadata: {
          client_timestamp: new Date().toISOString(),
          file_size_bytes: blob.size,
        },
      });
      setSubmissionResult(submitResp);

      // Step 2: Trigger analysis (combined or static)
      const report = await analyzeCodeReviewApi({
        code,
        language: selectedLanguage,
        filename: fileName || undefined,
        mode: reviewMode,
      });

      setReviewReport(report);
      setValidationSuccess(
        `Analysis complete for ${report.file}! Total ${report.total_findings} finding(s) ` +
        `(${report.ai_findings_count} AI, ${report.static_findings_count} Static).`
      );

      // Scroll smoothly down to the review report
      setTimeout(() => {
        reportRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to complete code review analysis.';
      setValidationError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Day 4: Handle Generate / Suggest Fix
  const handleGenerateFix = async (findingId: string) => {
    if (!reviewReport) return;
    const finding = reviewReport.findings.find((f) => f.id === findingId);
    if (!finding) return;

    setIsGeneratingFix((prev) => ({ ...prev, [findingId]: true }));
    setFixErrorMessage((prev) => ({ ...prev, [findingId]: '' }));

    try {
      const fix = await suggestFixApi({
        finding_id: findingId,
        code,
        language: selectedLanguage,
        filename: fileName || undefined,
        finding,
      });

      setFixSuggestions((prev) => ({ ...prev, [findingId]: fix }));
      setFixStatus((prev) => ({ ...prev, [findingId]: 'suggested' }));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to generate fix';
      setFixErrorMessage((prev) => ({ ...prev, [findingId]: msg }));
    } finally {
      setIsGeneratingFix((prev) => ({ ...prev, [findingId]: false }));
    }
  };

  // Day 4: Handle Approve & Apply Fix
  const handleApproveFix = async (findingId: string) => {
    const fix = fixSuggestions[findingId];
    if (!fix) return;

    setIsApplyingFix((prev) => ({ ...prev, [findingId]: true }));
    setFixErrorMessage((prev) => ({ ...prev, [findingId]: '' }));

    try {
      const response = await applyFixApi({
        code,
        fix,
        filename: fileName || undefined,
      });

      if (response.success) {
        // Record undo state
        setUndoHistory((prev) => [{ previousCode: code, findingId }, ...prev]);
        // Update Monaco Editor source code
        setCode(response.updated_code);
        setFixStatus((prev) => ({ ...prev, [findingId]: 'applied' }));
        setValidationSuccess(`Fix applied for ${findingId}! Lines ${fix.start_line}-${fix.end_line} updated.`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to apply fix';
      setFixStatus((prev) => ({ ...prev, [findingId]: 'stale' }));
      setFixErrorMessage((prev) => ({ ...prev, [findingId]: msg }));
    } finally {
      setIsApplyingFix((prev) => ({ ...prev, [findingId]: false }));
    }
  };

  // Day 4: Handle Reject Fix
  const handleRejectFix = async (findingId: string) => {
    try {
      await rejectFixApi({ finding_id: findingId, reason: 'Rejected by developer' });
      setFixStatus((prev) => ({ ...prev, [findingId]: 'rejected' }));
    } catch (err) {
      console.warn('Reject fix call error:', err);
      setFixStatus((prev) => ({ ...prev, [findingId]: 'rejected' }));
    }
  };

  // Day 4: Handle Undo Applied Fix
  const handleUndoFix = (findingId: string) => {
    const historyEntry = undoHistory.find((entry) => entry.findingId === findingId);
    if (historyEntry) {
      setCode(historyEntry.previousCode);
      setUndoHistory((prev) => prev.filter((entry) => entry.findingId !== findingId));
      setFixStatus((prev) => ({ ...prev, [findingId]: 'suggested' }));
      setValidationSuccess(`Reverted fix for ${findingId}. Previous code restored.`);
    }
  };

  // Compute metrics
  const lineCount = code ? code.split('\n').length : 0;
  const charCount = code.length;

  // Filtered findings according to active user filters (source, severity, category)
  const filteredFindings = useMemo(() => {
    if (!reviewReport) return [];
    return reviewReport.findings.filter((finding) => {
      const matchesSource = 
        sourceFilter === 'all' || 
        (sourceFilter === 'ai_and_static' && finding.source === 'ai_and_static') ||
        (sourceFilter === 'ai' && (finding.source === 'ai' || finding.source === 'gemini_ai')) ||
        (sourceFilter === 'static' && finding.source === 'static');
      
      const matchesSeverity = severityFilter === 'all' || finding.severity === severityFilter;
      const matchesCategory = categoryFilter === 'all' || finding.category === categoryFilter;
      return matchesSource && matchesSeverity && matchesCategory;
    });
  }, [reviewReport, sourceFilter, severityFilter, categoryFilter]);

  // Helper styling badges for finding categories
  const getCategoryBadge = (category: FindingCategory) => {
    switch (category) {
      case 'correctness':
        return {
          icon: <Bug className="h-3.5 w-3.5" />,
          label: 'Correctness',
          className: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
        };
      case 'security':
        return {
          icon: <ShieldAlert className="h-3.5 w-3.5" />,
          label: 'Security',
          className: 'bg-red-500/15 text-red-300 border-red-500/30',
        };
      case 'performance':
        return {
          icon: <Zap className="h-3.5 w-3.5" />,
          label: 'Performance',
          className: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
        };
      case 'maintainability':
        return {
          icon: <Wrench className="h-3.5 w-3.5" />,
          label: 'Maintainability',
          className: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
        };
      case 'style':
        return {
          icon: <Palette className="h-3.5 w-3.5" />,
          label: 'Style',
          className: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20',
        };
      default:
        return {
          icon: <Info className="h-3.5 w-3.5" />,
          label: category,
          className: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  // Helper styling badges for severity levels
  const getSeverityBadge = (severity: SeverityLevel) => {
    switch (severity) {
      case 'critical':
        return {
          icon: <Flame className="h-3.5 w-3.5" />,
          label: 'Critical',
          cardBorder: 'border-red-500/40 hover:border-red-500/70',
          badgeClass: 'bg-red-500/20 text-red-300 border-red-500/40',
        };
      case 'high':
        return {
          icon: <AlertTriangle className="h-3.5 w-3.5" />,
          label: 'High',
          cardBorder: 'border-orange-500/30 hover:border-orange-500/60',
          badgeClass: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
        };
      case 'medium':
        return {
          icon: <AlertCircle className="h-3.5 w-3.5" />,
          label: 'Medium',
          cardBorder: 'border-amber-500/30 hover:border-amber-500/60',
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        };
      case 'low':
        return {
          icon: <Info className="h-3.5 w-3.5" />,
          label: 'Low',
          cardBorder: 'border-sky-500/20 hover:border-sky-500/50',
          badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        };
      case 'info':
      default:
        return {
          icon: <Info className="h-3.5 w-3.5" />,
          label: 'Info',
          cardBorder: 'border-slate-800 hover:border-slate-700',
          badgeClass: 'bg-slate-800 text-slate-300 border-slate-700',
        };
    }
  };

  // Helper styling badges for finding source (AI vs Static vs Verified)
  const getSourceBadge = (source: string, analyzerName?: string) => {
    if (source === 'ai_and_static' || source === 'both') {
      return {
        label: `AI + Static Verified (${analyzerName || 'Linters'})`,
        className: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 font-semibold',
        icon: <CheckCircle2 className="h-3 w-3 text-emerald-400" />,
      };
    }
    if (source === 'static') {
      return {
        label: `Static: ${analyzerName ? analyzerName.toUpperCase() : 'Linter'}`,
        className: 'bg-purple-950/50 text-purple-300 border-purple-800/40',
        icon: <Wrench className="h-3 w-3 text-purple-400" />,
      };
    }
    return {
      label: 'AI: Gemini',
      className: 'bg-sky-950/50 text-sky-300 border-sky-800/40',
      icon: <Sparkles className="h-3 w-3 text-sky-400" />,
    };
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner / Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Code2 className="h-5 w-5 text-purple-400" />
            <span>AI Code Review & Static Analysis</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Deep Gemini AI review, static analyzers (Ruff, Bandit, ESLint), and developer-approved fix suggestions
          </p>
        </div>

        {/* Action Buttons: Paste, Upload, Clear */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".py,.java,.c,.cpp,.cc,.cxx,.hpp,.hxx,.js,.jsx,.mjs,.cjs,.ts,.tsx,.mts,.cts,.go,.rs,.php,.phtml,.cs,.rb,.kt,.kts,.swift,.dart,.r,.scala,.sc,.pl,.pm,.lua,.html,.htm,.css,.sql,.txt"
          />

          <button
            type="button"
            onClick={handlePasteCode}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white active:scale-95"
            title="Paste code from clipboard and auto-detect language"
          >
            <ClipboardCopy className="h-3.5 w-3.5 text-purple-400" />
            <span>Paste Code</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white active:scale-95"
            title="Upload source file from disk (Max 1 MB)"
          >
            <Upload className="h-3.5 w-3.5 text-sky-400" />
            <span>Upload File</span>
          </button>

          <button
            type="button"
            onClick={handleClearAll}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-medium text-rose-400 transition-all hover:bg-rose-500/10 hover:border-rose-500/30 active:scale-95"
            title="Clear editor and reset state"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {validationError && (
        <div className="rounded-xl border border-red-500/30 bg-red-950/20 p-4 text-xs text-red-300 flex items-start gap-3 animate-fadeIn">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">{validationError}</div>
          <button onClick={() => setValidationError(null)} className="text-red-400 hover:text-red-200">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {validationWarning && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-4 text-xs text-amber-300 flex items-start gap-3 animate-fadeIn">
          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
          <div className="flex-1">{validationWarning}</div>
          <button onClick={() => setValidationWarning(null)} className="text-amber-400 hover:text-amber-200">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {validationSuccess && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-xs text-emerald-300 flex items-start gap-3 animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="flex-1">{validationSuccess}</div>
          <button onClick={() => setValidationSuccess(null)} className="text-emerald-400 hover:text-emerald-200">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Editor & Submission Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Monaco Editor (3 Cols on desktop) */}
        <div className="lg:col-span-3 rounded-2xl border border-slate-800 bg-[#0F172A]/90 overflow-hidden shadow-xl flex flex-col">
          {/* Editor Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 bg-[#070A11] px-4 py-2.5 text-xs">
            <div className="flex items-center gap-2">
              <FileCode className="h-4 w-4 text-purple-400" />
              <span className="font-mono text-slate-200 font-medium">{fileName}</span>
              {uploadedFile && (
                <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] font-mono text-sky-400 border border-sky-500/20">
                  {(uploadedFile.size / 1024).toFixed(1)} KB
                </span>
              )}
            </div>

            {/* Language Selector & Detection Pill */}
            <div className="flex items-center gap-2.5">
              {isDetecting && (
                <div className="flex items-center gap-1.5 text-purple-400 font-medium animate-pulse text-[11px]">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  <span>Detecting...</span>
                </div>
              )}

              {detectionInfo && !isDetecting && (
                <div
                  className={`flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border ${
                    detectionInfo.is_reliable
                      ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                      : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                  }`}
                  title={detectionInfo.message}
                >
                  <Sparkles className="h-3 w-3" />
                  <span>
                    {detectionInfo.is_reliable
                      ? `${detectionInfo.language_name} (${Math.round(detectionInfo.confidence * 100)}%)`
                      : 'Uncertain detection'}
                  </span>
                </div>
              )}

              <div className="relative">
                <select
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
                  className="appearance-none rounded-lg border border-slate-700 bg-slate-900 py-1 pl-2.5 pr-7 text-xs text-slate-200 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id}>
                      {lang.name} ({lang.extension})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>
          </div>

          {/* Monaco Code Editor */}
          <div className="h-[460px] w-full">
            <Editor
              height="100%"
              language={currentLanguageConfig?.monacoLang || 'python'}
              value={code}
              onChange={handleEditorChange}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
                padding: { top: 12, bottom: 12 },
              }}
            />
          </div>

          {/* Editor Footer Bar */}
          <div className="flex items-center justify-between border-t border-slate-800 bg-[#070A11] px-4 py-2 text-[11px] text-slate-400 font-mono">
            <div className="flex items-center gap-4">
              <span>Lines: <strong className="text-slate-300">{lineCount}</strong></span>
              <span>Characters: <strong className="text-slate-300">{charCount}</strong></span>
              {undoHistory.length > 0 && (
                <span className="text-emerald-400 font-sans">
                  {undoHistory.length} patch(es) applied
                </span>
              )}
            </div>
            <div>
              <span>Syntax: <strong className="text-purple-300">{currentLanguageConfig?.name}</strong></span>
            </div>
          </div>
        </div>

        {/* Sidebar Controls & Mode Selection */}
        <div className="space-y-4">
          {/* Analysis Mode Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Layers className="h-4 w-4 text-purple-400" />
              <span>Analysis Engine Mode</span>
            </h3>

            <div className="space-y-2">
              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  reviewMode === 'combined'
                    ? 'border-purple-500/50 bg-purple-950/20 text-white'
                    : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reviewMode"
                  value="combined"
                  checked={reviewMode === 'combined'}
                  onChange={() => setReviewMode('combined')}
                  className="mt-0.5 accent-purple-500"
                />
                <div className="text-xs">
                  <div className="font-medium text-slate-200">Combined Review (Recommended)</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Gemini AI + Static Analyzers (Ruff, Bandit, ESLint) deduplicated</div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  reviewMode === 'static_only'
                    ? 'border-purple-500/50 bg-purple-950/20 text-white'
                    : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reviewMode"
                  value="static_only"
                  checked={reviewMode === 'static_only'}
                  onChange={() => setReviewMode('static_only')}
                  className="mt-0.5 accent-purple-500"
                />
                <div className="text-xs">
                  <div className="font-medium text-slate-200">Static Analysis Only</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Instant local linters & security checks without AI tokens</div>
                </div>
              </label>

              <label
                className={`flex items-start gap-2.5 p-2.5 rounded-xl border cursor-pointer transition-all ${
                  reviewMode === 'ai_only'
                    ? 'border-purple-500/50 bg-purple-950/20 text-white'
                    : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reviewMode"
                  value="ai_only"
                  checked={reviewMode === 'ai_only'}
                  onChange={() => setReviewMode('ai_only')}
                  className="mt-0.5 accent-purple-500"
                />
                <div className="text-xs">
                  <div className="font-medium text-slate-200">Gemini AI Only</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Pure LLM semantic analysis and architectural feedback</div>
                </div>
              </label>
            </div>
          </div>

          {/* Active File Details */}
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-4 space-y-3">
            <h3 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <FileText className="h-4 w-4 text-sky-400" />
              <span>Target File Metadata</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">File Name:</span>
                <span className="font-mono text-slate-200 font-medium truncate max-w-[140px]">{fileName}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Language:</span>
                <span className="text-purple-300 font-medium">{currentLanguageConfig?.name}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-800/60">
                <span className="text-slate-400">Upload Source:</span>
                <span className="text-slate-300">{uploadedFile ? 'Disk Upload' : 'Pasted / Editor'}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">Max Limit:</span>
                <span className="text-slate-300 font-mono">1.0 MB</span>
              </div>
            </div>

            {uploadedFile && (
              <button
                type="button"
                onClick={handleRemoveFile}
                className="w-full text-center text-xs text-rose-400 hover:text-rose-300 hover:underline pt-2"
              >
                Remove uploaded file
              </button>
            )}
          </div>

          {/* Submit / Trigger Analysis Button */}
          <button
            type="button"
            disabled={isSubmitting || !code.trim()}
            onClick={handleReviewCode}
            className={`w-full flex items-center justify-center gap-2 rounded-xl py-3 px-4 text-xs font-semibold shadow-lg transition-all ${
              isSubmitting || !code.trim()
                ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
                : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white hover:from-purple-500 hover:to-indigo-500 active:scale-95 shadow-purple-900/30'
            }`}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Running Analysis...</span>
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-white" />
                <span>Review Code ({reviewMode === 'static_only' ? 'Static' : 'AI + Static'})</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* --- Day 3 & Day 4 Review Findings & Report Section --- */}
      {reviewReport && (
        <div ref={reportRef} className="space-y-6 pt-6 border-t border-slate-800 animate-fadeIn">
          {/* Report Header Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/90 p-5 backdrop-blur-sm shadow-xl space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-400" />
                    <span>Inspection Report: {reviewReport.file}</span>
                  </h3>
                  <span className="rounded-full bg-purple-500/10 px-2.5 py-0.5 text-xs font-medium text-purple-300 border border-purple-500/20">
                    {reviewReport.language}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  Engine: <span className="font-mono text-slate-200">{reviewReport.model}</span>
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 border border-slate-800">
                  <Cpu className="h-3.5 w-3.5 text-purple-400" />
                  <span>{reviewReport.findings.length} Finding(s)</span>
                </div>
                {reviewReport.duration_ms && (
                  <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 border border-slate-800">
                    <Clock className="h-3.5 w-3.5 text-sky-400" />
                    <span>{reviewReport.duration_ms} ms</span>
                  </div>
                )}
              </div>
            </div>

            {/* Executive Summary */}
            <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-4 text-xs text-slate-200 leading-relaxed">
              <span className="font-semibold text-white block mb-1">Executive Summary:</span>
              <p>{reviewReport.summary}</p>
            </div>

            {/* KPI Summary Cards: AI, Static, Combined, Severities */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Total Findings */}
              <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-3 text-center">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total</span>
                <div className="text-xl font-bold font-mono text-white mt-0.5">
                  {reviewReport.total_findings}
                </div>
              </div>

              {/* AI Findings */}
              <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-3 text-center">
                <span className="text-[10px] uppercase font-semibold text-sky-400 tracking-wider">AI (Gemini)</span>
                <div className="text-xl font-bold font-mono text-sky-300 mt-0.5">
                  {reviewReport.ai_findings_count}
                </div>
              </div>

              {/* Static Analysis */}
              <div className="rounded-xl border border-purple-500/20 bg-purple-950/20 p-3 text-center">
                <span className="text-[10px] uppercase font-semibold text-purple-400 tracking-wider">Static Linters</span>
                <div className="text-xl font-bold font-mono text-purple-300 mt-0.5">
                  {reviewReport.static_findings_count}
                </div>
              </div>

              {/* Verified by Both */}
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/25 p-3 text-center">
                <span className="text-[10px] uppercase font-semibold text-emerald-400 tracking-wider">AI + Static</span>
                <div className="text-xl font-bold font-mono text-emerald-300 mt-0.5">
                  {reviewReport.combined_findings_count}
                </div>
              </div>

              {/* Critical */}
              <div className="rounded-xl border border-red-500/20 bg-red-950/20 p-3 text-center">
                <span className="text-[10px] uppercase font-semibold text-red-400 tracking-wider">Critical</span>
                <div className="text-xl font-bold font-mono text-red-300 mt-0.5">
                  {reviewReport.severity_breakdown.critical}
                </div>
              </div>

              {/* High */}
              <div className="rounded-xl border border-orange-500/20 bg-orange-950/20 p-3 text-center">
                <span className="text-[10px] uppercase font-semibold text-orange-400 tracking-wider">High</span>
                <div className="text-xl font-bold font-mono text-orange-300 mt-0.5">
                  {reviewReport.severity_breakdown.high}
                </div>
              </div>
            </div>

            {/* Positive Observations */}
            {reviewReport.positive_observations.length > 0 && (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
                  <Sparkles className="h-4 w-4 text-emerald-400" />
                  <span>Strengths & Positive Observations</span>
                </div>
                <ul className="space-y-1 pl-5 list-disc text-xs text-emerald-200/90 leading-relaxed">
                  {reviewReport.positive_observations.map((obs, idx) => (
                    <li key={idx}>{obs}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Findings Filter Bar */}
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Filter className="h-3.5 w-3.5 text-purple-400" />
                <span>Filter Findings ({filteredFindings.length} of {reviewReport.total_findings})</span>
              </div>
              {(sourceFilter !== 'all' || severityFilter !== 'all' || categoryFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSourceFilter('all');
                    setSeverityFilter('all');
                    setCategoryFilter('all');
                  }}
                  className="text-[11px] text-purple-400 hover:text-purple-300 underline"
                >
                  Reset all filters
                </button>
              )}
            </div>

            {/* Source Filter Pills (Day 4) */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Source:</span>
              {(['all', 'ai_and_static', 'static', 'ai'] as const).map((src) => {
                const label = 
                  src === 'all' ? `All (${reviewReport.total_findings})` :
                  src === 'ai_and_static' ? `AI + Static Verified (${reviewReport.combined_findings_count})` :
                  src === 'static' ? `Static Linters (${reviewReport.static_findings_count})` :
                  `AI Only (${reviewReport.ai_findings_count})`;

                return (
                  <button
                    key={src}
                    onClick={() => setSourceFilter(src)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      sourceFilter === src
                        ? 'bg-purple-600 text-white shadow'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>

            {/* Severity Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs border-t border-slate-800/80 pt-2.5">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Severity:</span>
              {(['all', 'critical', 'high', 'medium', 'low', 'info'] as const).map((sev) => {
                const count = sev === 'all' 
                  ? reviewReport.total_findings 
                  : reviewReport.severity_breakdown[sev];
                return (
                  <button
                    key={sev}
                    onClick={() => setSeverityFilter(sev)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      severityFilter === sev
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span className="capitalize">{sev}</span>
                    <span className="ml-1 opacity-70">({count})</span>
                  </button>
                );
              })}
            </div>

            {/* Category Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs border-t border-slate-800/80 pt-2.5">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Category:</span>
              {(['all', 'correctness', 'security', 'performance', 'maintainability', 'style'] as const).map((cat) => {
                return (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all ${
                      categoryFilter === cat
                        ? 'bg-slate-700 text-white shadow'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span className="capitalize">{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Findings List with Intelligent Fix Preview & Approval */}
          <div className="space-y-4">
            {filteredFindings.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/70 p-8 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-semibold text-white">No Findings Match Active Filters</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {reviewReport.total_findings === 0 
                    ? 'No significant bugs, security risks, or lint errors were identified in this source code.' 
                    : 'Try switching the source, severity, or category filters to view other diagnostics.'}
                </p>
              </div>
            ) : (
              filteredFindings.map((finding) => {
                const sevInfo = getSeverityBadge(finding.severity);
                const catInfo = getCategoryBadge(finding.category);
                const srcInfo = getSourceBadge(finding.source, finding.analyzer_name);

                const currentFix = fixSuggestions[finding.id];
                const status = fixStatus[finding.id] || 'idle';
                const isFixing = isGeneratingFix[finding.id] || false;
                const isApplying = isApplyingFix[finding.id] || false;
                const errorMsg = fixErrorMessage[finding.id];

                return (
                  <div
                    key={finding.id}
                    className={`rounded-2xl border ${sevInfo.cardBorder} bg-[#0F172A]/90 p-5 backdrop-blur-sm shadow-xl transition-all duration-200 space-y-3.5`}
                  >
                    {/* Finding Header Badges & File Location */}
                    <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-slate-800/80 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Severity Badge */}
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${sevInfo.badgeClass}`}>
                          {sevInfo.icon}
                          <span className="capitalize">{sevInfo.label}</span>
                        </span>

                        {/* Category Badge */}
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${catInfo.className}`}>
                          {catInfo.icon}
                          <span>{catInfo.label}</span>
                        </span>

                        {/* Source Badge (AI, Static, or Both) */}
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${srcInfo.className}`}>
                          {srcInfo.icon}
                          <span>{srcInfo.label}</span>
                        </span>

                        {/* Rule ID Badge */}
                        {finding.rule_id && (
                          <span className="text-[10px] font-mono text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/30">
                            {finding.rule_id}
                          </span>
                        )}

                        {/* Confidence Indicator */}
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          Confidence: <strong className="text-slate-200 capitalize">{finding.confidence}</strong>
                        </span>
                      </div>

                      {/* Line Number Callout */}
                      <div className="text-[11px] font-mono text-purple-300 bg-slate-900/90 px-2.5 py-1 rounded-lg border border-slate-800">
                        {finding.file}:{finding.start_line === finding.end_line ? `Line ${finding.start_line}` : `Lines ${finding.start_line}-${finding.end_line}`}
                      </div>
                    </div>

                    {/* Title */}
                    <h4 className="text-sm font-bold text-white tracking-tight flex items-start gap-2">
                      <span>{finding.title}</span>
                    </h4>

                    {/* Evidence Snippet */}
                    {finding.evidence && (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">
                          Code Evidence:
                        </span>
                        <pre className="rounded-xl border border-slate-800 bg-[#070A11] p-3 text-xs font-mono text-purple-200 overflow-x-auto">
                          <code>{finding.evidence}</code>
                        </pre>
                      </div>
                    )}

                    {/* Explanation */}
                    <div className="space-y-1 text-xs text-slate-300 leading-relaxed">
                      <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider block">
                        Problem Analysis:
                      </span>
                      <p>{finding.explanation}</p>
                    </div>

                    {/* Recommendation */}
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-950/15 p-3.5 space-y-1 text-xs text-emerald-200/90 leading-relaxed">
                      <div className="flex items-center gap-1.5 text-emerald-300 font-semibold text-[11px]">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Recommended Resolution:</span>
                      </div>
                      <p>{finding.recommendation}</p>
                    </div>

                    {/* --- Day 4 Intelligent Fix Suggestion & Patch Preview Box --- */}
                    <div className="border-t border-slate-800/80 pt-3 space-y-3">
                      {status === 'idle' && (
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400">
                            Automated intelligent code repair available for this finding.
                          </span>
                          <button
                            type="button"
                            onClick={() => handleGenerateFix(finding.id)}
                            disabled={isFixing}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-500/40 bg-purple-950/30 px-3 py-1.5 text-xs font-medium text-purple-200 hover:bg-purple-900/50 hover:text-white transition-all active:scale-95"
                          >
                            {isFixing ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>Generating Fix...</span>
                              </>
                            ) : (
                              <>
                                <Wrench className="h-3.5 w-3.5 text-purple-400" />
                                <span>Suggest Fix</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {/* Fix Error Notification */}
                      {errorMsg && (
                        <div className="rounded-xl border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-300 flex items-start gap-2">
                          <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                          <div className="flex-1">{errorMsg}</div>
                        </div>
                      )}

                      {/* Proposed Patch Diff Preview */}
                      {currentFix && (status === 'suggested' || status === 'stale') && (
                        <div className="rounded-xl border border-purple-500/30 bg-[#070A11] p-4 space-y-3 animate-fadeIn">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-purple-300 flex items-center gap-1.5">
                              <GitCommit className="h-3.5 w-3.5" />
                              <span>Proposed Patch Preview (Lines {currentFix.start_line}-{currentFix.end_line})</span>
                            </span>
                            <span className="text-[10px] text-slate-400 font-mono">Requires developer approval</span>
                          </div>

                          <p className="text-xs text-slate-300 italic">{currentFix.explanation}</p>

                          {/* Code Diff Box */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                            {/* Original */}
                            <div className="rounded-lg border border-red-500/30 bg-red-950/10 p-2.5 space-y-1">
                              <div className="text-[10px] font-semibold text-red-400 uppercase tracking-wider flex items-center gap-1">
                                <span>- Original Code</span>
                              </div>
                              <pre className="text-red-200/90 whitespace-pre-wrap overflow-x-auto">
                                <code>{currentFix.original_code}</code>
                              </pre>
                            </div>

                            {/* Replacement */}
                            <div className="rounded-lg border border-emerald-500/30 bg-emerald-950/10 p-2.5 space-y-1">
                              <div className="text-[10px] font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                                <span>+ Proposed Replacement</span>
                              </div>
                              <pre className="text-emerald-200/90 whitespace-pre-wrap overflow-x-auto">
                                <code>{currentFix.replacement_code}</code>
                              </pre>
                            </div>
                          </div>

                          {/* Action Buttons: Approve, Reject */}
                          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                            <button
                              type="button"
                              onClick={() => handleRejectFix(finding.id)}
                              className="px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800/80 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-all"
                            >
                              Reject Fix
                            </button>
                            <button
                              type="button"
                              disabled={isApplying}
                              onClick={() => handleApproveFix(finding.id)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-500 transition-all active:scale-95 shadow-md shadow-emerald-900/30"
                            >
                              {isApplying ? (
                                <>
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  <span>Applying Patch...</span>
                                </>
                              ) : (
                                <>
                                  <Check className="h-3.5 w-3.5" />
                                  <span>Approve & Apply Fix</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Status: Fix Applied */}
                      {status === 'applied' && (
                        <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-3.5 flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs font-medium text-emerald-300">
                            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            <span>Patch successfully applied to Monaco Editor workspace.</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleUndoFix(finding.id)}
                            className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-200 underline font-medium"
                          >
                            <Undo2 className="h-3.5 w-3.5" />
                            <span>Undo Fix</span>
                          </button>
                        </div>
                      )}

                      {/* Status: Fix Rejected */}
                      {status === 'rejected' && (
                        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-xs text-slate-400 flex items-center justify-between">
                          <span>Developer rejected suggested fix. Original code preserved.</span>
                          <button
                            type="button"
                            onClick={() => handleGenerateFix(finding.id)}
                            className="text-xs text-purple-400 hover:text-purple-300 underline"
                          >
                            Re-open Fix
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
