import React, { useState, useRef, useEffect, useCallback } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import { 
  SupportedLanguage, 
  LanguageDetectResult, 
  CodeSubmitResult 
} from '../types';
import { SUPPORTED_LANGUAGES } from '../services/mockData';
import { detectLanguageApi, submitCodeApi } from '../services/api';

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
  const [submissionResult, setSubmissionResult] = useState<CodeSubmitResult | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    setValidationError(null);
    setValidationWarning(null);
    setValidationSuccess(null);
    setIsManualOverride(false);
  };

  // Handle Review submission to backend
  const handleReviewCode = async () => {
    setValidationError(null);
    setValidationWarning(null);
    setValidationSuccess(null);
    setSubmissionResult(null);

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
      const response = await submitCodeApi({
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

      setSubmissionResult(response);
      setValidationSuccess(
        `Code submitted successfully for ${response.filename} (${response.language}). Payload verified and queued for Day 3 AI review.`
      );
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit code to backend.';
      setValidationError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Compute metrics
  const lineCount = code ? code.split('\n').length : 0;
  const charCount = code.length;

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Top Banner / Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Code2 className="h-5 w-5 text-purple-400" />
            <span>Code Submission & Language Detection</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Submit source code via paste or file upload with automatic multi-language detection
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
      {validationSuccess && submissionResult && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200 backdrop-blur-sm shadow-sm animate-fadeIn space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-semibold text-emerald-300">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
              <span>{submissionResult.message}</span>
            </div>
            <button
              onClick={() => {
                setValidationSuccess(null);
                setSubmissionResult(null);
              }}
              className="text-emerald-400 hover:text-emerald-100"
            >
              &times;
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px] text-slate-300">
            <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">File:</span>
              <span className="text-white truncate block">{submissionResult.filename}</span>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Language:</span>
              <span className="text-purple-300 capitalize block">{submissionResult.language}</span>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Length / Lines:</span>
              <span className="text-slate-200 block">{submissionResult.code_length} chars ({submissionResult.lines_count || lineCount} lines)</span>
            </div>
            <div className="bg-slate-900/60 rounded-lg p-2 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Tracking ID:</span>
              <span className="text-indigo-300 truncate block">{submissionResult.submission_id || 'N/A'}</span>
            </div>
          </div>
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
        <div className="h-[520px] w-full bg-[#0F172A]">
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
                <span>Submitting Code...</span>
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
    </div>
  );
};
