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
  HelpCircle, 
  X, 
  FileCode, 
  AlertTriangle,
  Flame,
  ShieldAlert,
  Bug,
  Zap,
  Wrench,
  Palette,
  Lightbulb,
  Clock,
  Cpu,
  Filter
} from 'lucide-react';
import { 
  SupportedLanguage, 
  LanguageDetectResult, 
  CodeSubmitResult,
  ReviewReport,
  SeverityLevel,
  FindingCategory
} from '../types';
import { SUPPORTED_LANGUAGES } from '../services/mockData';
import { detectLanguageApi, submitCodeApi, analyzeCodeReviewApi } from '../services/api';

export const NewReviewPage: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('python');
  const [code, setCode] = useState<string>(
    SUPPORTED_LANGUAGES.find((l) => l.id === 'python')?.sampleSnippet || ''
  );
  const [fileName, setFileName] = useState<string>('sample_script.py');
  const [uploadedFile, setUploadedFile] = useState<{ name: string; size: number } | null>(null);
  const [isManualOverride, setIsManualOverride] = useState<boolean>(false);

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
  const [severityFilter, setSeverityFilter] = useState<SeverityLevel | 'all'>('all');
  const [categoryFilter, setCategoryFilter] = useState<FindingCategory | 'all'>('all');

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
        // Silently capture background detection failures without blocking editor
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

    // Enforce 1 MB file size limit before loading
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

    // Validate file extension against supported languages
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
      // Run detection with force auto-select on file upload
      triggerLanguageDetection(content, file.name, true);
    };
    reader.onerror = () => {
      setValidationError('Failed to read the uploaded source file from disk.');
    };
    reader.readAsText(file);

    // Reset file input value to allow selecting the same file again
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

        // Trigger immediate detection for pasted code
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

    // Debounce detection call by 700ms when typing
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
  };

  // Handle Review submission and live Gemini AI analysis
  const handleReviewCode = async () => {
    setValidationError(null);
    setValidationWarning(null);
    setValidationSuccess(null);
    setSubmissionResult(null);
    setReviewReport(null);

    // Client-side validation: empty check
    if (!code || !code.trim()) {
      setValidationError('Code submission cannot be empty. Please enter, paste, or upload source code.');
      return;
    }

    // Client-side validation: size check
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

      // Step 2: Trigger live Gemini AI analysis
      const report = await analyzeCodeReviewApi({
        code,
        language: selectedLanguage,
        filename: fileName || undefined,
      });

      setReviewReport(report);
      setValidationSuccess(
        `AI review completed for ${report.file}! Identified ${report.total_findings} finding(s) with ${report.model}.`
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

  // Compute metrics
  const lineCount = code ? code.split('\n').length : 0;
  const charCount = code.length;

  // Filtered findings according to active user filters
  const filteredFindings = useMemo(() => {
    if (!reviewReport) return [];
    return reviewReport.findings.filter((finding) => {
      const matchesSeverity = severityFilter === 'all' || finding.severity === severityFilter;
      const matchesCategory = categoryFilter === 'all' || finding.category === categoryFilter;
      return matchesSeverity && matchesCategory;
    });
  }, [reviewReport, severityFilter, categoryFilter]);

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

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Banner / Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Code2 className="h-5 w-5 text-purple-400" />
            <span>AI Code Review & Inspection</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Submit code in any of the 21 supported languages for deep Gemini AI analysis
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

      {/* Uploaded File Notification Banner */}
      {uploadedFile && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-2.5 text-xs text-sky-300 backdrop-blur-sm shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <FileCode className="h-4 w-4 text-sky-400" />
            <span>
              Loaded file: <strong className="text-white font-mono">{uploadedFile.name}</strong> (
              {(uploadedFile.size / 1024).toFixed(1)} KB)
            </span>
          </div>
          <button
            onClick={handleRemoveFile}
            className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-rose-400 transition-colors"
            title="Remove uploaded file and reset filename"
          >
            <X className="h-3.5 w-3.5" />
            <span>Remove File</span>
          </button>
        </div>
      )}

      {/* Validation & Warning Feedback Messages */}
      {validationError && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-xs text-rose-300 backdrop-blur-sm shadow-sm animate-fadeIn">
          <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
          <div className="flex-1 font-medium">{validationError}</div>
          <button
            onClick={() => setValidationError(null)}
            className="text-rose-400 hover:text-rose-200"
          >
            &times;
          </button>
        </div>
      )}

      {validationWarning && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 text-xs text-amber-300 backdrop-blur-sm shadow-sm animate-fadeIn">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
          <div className="flex-1 font-medium">{validationWarning}</div>
          <button
            onClick={() => setValidationWarning(null)}
            className="text-amber-400 hover:text-amber-200"
          >
            &times;
          </button>
        </div>
      )}

      {/* Submission Success Alert */}
      {validationSuccess && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200 backdrop-blur-sm shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
            <span>{validationSuccess}</span>
          </div>
          <button
            onClick={() => setValidationSuccess(null)}
            className="text-emerald-400 hover:text-emerald-100"
          >
            &times;
          </button>
        </div>
      )}

      {/* Editor Main Container */}
      <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Editor Toolbar Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-[#0B0F19] px-4 py-3 gap-3">
          {/* File Name Display & Input */}
          <div className="flex items-center space-x-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <FileText className="h-3.5 w-3.5" />
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-xs font-medium text-slate-400">File:</span>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="bg-transparent text-xs font-mono font-semibold text-slate-100 focus:outline-none focus:ring-1 focus:ring-purple-500/50 rounded px-1.5 py-0.5 border border-transparent hover:border-slate-700"
                placeholder="filename.ext"
              />
            </div>
          </div>

          {/* Detection Status Indicator & Language Dropdown */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Real-time Detection Status Badge */}
            {isDetecting ? (
              <div className="inline-flex items-center gap-1.5 text-[11px] text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2.5 py-1 rounded-full animate-pulse">
                <Loader2 className="h-3 w-3 animate-spin" />
                <span>Detecting language...</span>
              </div>
            ) : detectionInfo ? (
              detectionInfo.is_reliable && detectionInfo.language_name ? (
                <div 
                  className="inline-flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-full cursor-help"
                  title={detectionInfo.message}
                >
                  <Sparkles className="h-3 w-3" />
                  <span>
                    Auto-detected: <strong>{detectionInfo.language_name}</strong> ({Math.round(detectionInfo.confidence * 100)}%)
                  </span>
                </div>
              ) : detectionInfo.requires_manual_selection ? (
                <div 
                  className="inline-flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-full cursor-help"
                  title={detectionInfo.message}
                >
                  <HelpCircle className="h-3 w-3" />
                  <span>Language uncertain • Please confirm</span>
                </div>
              ) : null
            ) : null}

            {/* Language Selector Dropdown (21 Languages) */}
            <div className="flex items-center space-x-2">
              <label htmlFor="language-select" className="text-xs text-slate-400 font-medium">
                Language:
              </label>
              <div className="relative">
                <select
                  id="language-select"
                  value={selectedLanguage}
                  onChange={(e) => handleLanguageChange(e.target.value as SupportedLanguage)}
                  className="appearance-none rounded-lg border border-slate-700 bg-slate-800/90 pl-3 pr-8 py-1.5 text-xs font-mono text-purple-300 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 cursor-pointer"
                >
                  {SUPPORTED_LANGUAGES.map((lang) => (
                    <option key={lang.id} value={lang.id} className="bg-slate-900 text-slate-200">
                      {lang.name} ({lang.extension})
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              </div>
            </div>

            {/* Metrics pills */}
            <div className="hidden sm:flex items-center space-x-2 border-l border-slate-800 pl-4 text-[11px] text-slate-400 font-mono">
              <span>{lineCount} lines</span>
              <span>•</span>
              <span>{charCount} chars</span>
            </div>
          </div>
        </div>

        {/* Monaco Code Editor Embed */}
        <div className="h-[460px] w-full bg-[#0F172A]">
          <Editor
            height="100%"
            language={currentLanguageConfig?.monacoLang || 'python'}
            value={code}
            onChange={handleEditorChange}
            theme="vs-dark"
            options={{
              minimap: { enabled: true, maxColumn: 80 },
              fontSize: 13,
              fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 4,
              wordWrap: 'on',
              lineNumbers: 'on',
              renderLineHighlight: 'all',
              lineDecorationsWidth: 10,
              padding: { top: 12, bottom: 12 },
              smoothScrolling: true,
              cursorBlinking: 'smooth',
            }}
          />
        </div>

        {/* Editor Bottom Bar & Review Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-t border-slate-800 bg-[#0B0F19] px-5 py-3.5 gap-4">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Info className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>
              Monaco active in <strong className="text-slate-300">{currentLanguageConfig?.name}</strong> mode. 
              {isManualOverride && <span className="text-amber-400 ml-1">(Manual selection active)</span>}
            </span>
          </div>

          <button
            type="button"
            onClick={handleReviewCode}
            disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-purple-600/30 transition-all hover:opacity-95 hover:shadow-purple-600/40 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Analyzing with Gemini AI...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Review Code</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Loading Progress State Card */}
      {isSubmitting && (
        <div className="rounded-2xl border border-purple-500/20 bg-purple-950/20 p-8 backdrop-blur-md text-center space-y-4 animate-pulse">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 shadow-lg shadow-purple-500/10">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-semibold text-white">Gemini AI Analysis in Progress</h3>
            <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
              Analyzing syntax, security boundaries, correctness edge cases, and performance in {currentLanguageConfig?.name}...
            </p>
          </div>
        </div>
      )}

      {/* DAY 3: GEMINI AI REVIEW REPORT INTERFACE */}
      {reviewReport && (
        <div ref={reportRef} className="space-y-6 pt-4 animate-fadeIn">
          {/* Report Header Card */}
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/90 p-6 backdrop-blur-md shadow-2xl space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-purple-400 bg-purple-500/10 px-2.5 py-0.5 rounded-full border border-purple-500/20 font-mono">
                    <Sparkles className="h-3 w-3" />
                    <span>Gemini AI Code Review</span>
                  </span>
                  <span className="text-xs font-mono text-slate-400">ID: {reviewReport.id}</span>
                </div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>Analysis Results for</span>
                  <span className="text-purple-300 font-mono">{reviewReport.file}</span>
                </h3>
              </div>

              {/* Execution Metadata Pills */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-300">
                <div className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 border border-slate-800">
                  <Cpu className="h-3.5 w-3.5 text-purple-400" />
                  <span>{reviewReport.model}</span>
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

            {/* Severity Summary Cards (Section A) */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {/* Total Findings */}
              <div className="rounded-xl border border-slate-800 bg-[#0B0F19] p-3 text-center">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total</span>
                <div className="text-xl font-bold font-mono text-white mt-0.5">
                  {reviewReport.total_findings}
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
              {/* Medium */}
              <div className="rounded-xl border border-amber-500/20 bg-amber-950/20 p-3 text-center">
                <span className="text-[10px] uppercase font-semibold text-amber-400 tracking-wider">Medium</span>
                <div className="text-xl font-bold font-mono text-amber-300 mt-0.5">
                  {reviewReport.severity_breakdown.medium}
                </div>
              </div>
              {/* Low */}
              <div className="rounded-xl border border-sky-500/20 bg-sky-950/20 p-3 text-center">
                <span className="text-[10px] uppercase font-semibold text-sky-400 tracking-wider">Low</span>
                <div className="text-xl font-bold font-mono text-sky-300 mt-0.5">
                  {reviewReport.severity_breakdown.low}
                </div>
              </div>
              {/* Info */}
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3 text-center">
                <span className="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Info</span>
                <div className="text-xl font-bold font-mono text-slate-300 mt-0.5">
                  {reviewReport.severity_breakdown.info}
                </div>
              </div>
            </div>

            {/* Positive Observations (Section D) */}
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

            {/* General Recommendations */}
            {reviewReport.general_recommendations.length > 0 && (
              <div className="rounded-xl border border-indigo-500/20 bg-indigo-950/15 p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-indigo-300">
                  <Lightbulb className="h-4 w-4 text-indigo-400" />
                  <span>Architecture & Hygiene Recommendations</span>
                </div>
                <ul className="space-y-1 pl-5 list-disc text-xs text-indigo-200/90 leading-relaxed">
                  {reviewReport.general_recommendations.map((rec, idx) => (
                    <li key={idx}>{rec}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Findings Filter Bar (Section C) */}
          <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Filter className="h-3.5 w-3.5 text-purple-400" />
                <span>Filter Findings ({filteredFindings.length} of {reviewReport.total_findings})</span>
              </div>
              {(severityFilter !== 'all' || categoryFilter !== 'all') && (
                <button
                  onClick={() => {
                    setSeverityFilter('all');
                    setCategoryFilter('all');
                  }}
                  className="text-[11px] text-purple-400 hover:text-purple-300 underline"
                >
                  Reset filters
                </button>
              )}
            </div>

            {/* Severity Filter Pills */}
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
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
                        ? 'bg-purple-600 text-white shadow'
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
                        ? 'bg-indigo-600 text-white shadow'
                        : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <span className="capitalize">{cat}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Findings List (Section B) */}
          <div className="space-y-4">
            {filteredFindings.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/70 p-8 text-center space-y-2">
                <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-semibold text-white">No Findings Match Active Filters</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  {reviewReport.total_findings === 0 
                    ? 'No significant bugs, security risks, or defects were identified in this source code.' 
                    : 'Try clearing or switching the severity and category filters to inspect other findings.'}
                </p>
              </div>
            ) : (
              filteredFindings.map((finding) => {
                const sevInfo = getSeverityBadge(finding.severity);
                const catInfo = getCategoryBadge(finding.category);

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

                        {/* Confidence Indicator */}
                        <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                          Confidence: <strong className="text-slate-200 capitalize">{finding.confidence}</strong>
                        </span>

                        {/* AI Provenance Badge */}
                        <span className="text-[10px] font-mono text-purple-300 bg-purple-950/40 px-2 py-0.5 rounded border border-purple-800/30">
                          AI: Gemini
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
