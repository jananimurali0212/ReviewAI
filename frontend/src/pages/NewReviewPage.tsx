import React, { useState, useRef } from 'react';
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
  ChevronDown
} from 'lucide-react';
import { SupportedLanguage } from '../types';
import { SUPPORTED_LANGUAGES } from '../services/mockData';

export const NewReviewPage: React.FC = () => {
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('python');
  const [code, setCode] = useState<string>(
    SUPPORTED_LANGUAGES.find((l) => l.id === 'python')?.sampleSnippet || ''
  );
  const [fileName, setFileName] = useState<string>('sample_script.py');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentLanguageConfig = SUPPORTED_LANGUAGES.find((l) => l.id === selectedLanguage);

  // Handle programming language selection
  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setSelectedLanguage(newLang);
    const langConfig = SUPPORTED_LANGUAGES.find((l) => l.id === newLang);
    if (langConfig) {
      // If filename still has previous extension or is default, update filename
      const baseName = fileName.includes('.') ? fileName.split('.')[0] : fileName;
      setFileName(`${baseName}${langConfig.extension}`);
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setValidationError(null);
    setValidationSuccess(null);
    setFileName(file.name);

    // Auto-detect dropdown language from file extension if known
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    const matchedLang = SUPPORTED_LANGUAGES.find((l) => l.extension === ext);
    if (matchedLang) {
      setSelectedLanguage(matchedLang.id);
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setCode(content || '');
    };
    reader.onerror = () => {
      setValidationError('Failed to read the uploaded file.');
    };
    reader.readAsText(file);

    // Reset file input value to allow selecting the same file again
    event.target.value = '';
  };

  // Handle paste from clipboard
  const handlePasteCode = async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (clipboardText) {
        setCode(clipboardText);
        setValidationError(null);
        setValidationSuccess(null);
        if (fileName === 'sample_script.py') {
          setFileName('pasted_code' + (currentLanguageConfig?.extension || '.txt'));
        }
      }
    } catch {
      setValidationError('Clipboard permission denied. Please paste directly into the editor.');
    }
  };

  // Handle clear code
  const handleClearCode = () => {
    setCode('');
    setFileName('untitled' + (currentLanguageConfig?.extension || '.txt'));
    setValidationError(null);
    setValidationSuccess(null);
  };

  // Handle Review submission validation (Day 1 scope)
  const handleReviewCode = () => {
    setValidationError(null);
    setValidationSuccess(null);

    if (!code || code.trim() === '') {
      setValidationError('Please enter, paste, or upload code before submitting for review.');
      return;
    }

    // Day 1 restriction: Do not call Gemini or fake an AI review
    setValidationSuccess(
      `Code validation passed for ${fileName} (${code.trim().split('\n').length} lines). AI review pipeline is scheduled for Day 2 integration.`
    );
  };

  // Compute line count and character stats
  const lineCount = code ? code.split('\n').length : 0;
  const charCount = code.length;

  return (
    <div className="space-y-6">
      {/* Top Banner / Breadcrumb & Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
            <Code2 className="h-5 w-5 text-purple-400" />
            <span>Code Submission & Editor</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Input source code for syntax verification and prepare submission payload
          </p>
        </div>

        {/* Action Buttons: Paste, Upload, Clear */}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileUpload}
            className="hidden"
            accept=".py,.java,.c,.cpp,.js,.ts,.go,.rs,.php,.cs,.html,.css,.sql,.txt"
          />

          <button
            type="button"
            onClick={handlePasteCode}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white active:scale-95"
            title="Paste code from clipboard"
          >
            <ClipboardCopy className="h-3.5 w-3.5 text-purple-400" />
            <span>Paste Code</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2 text-xs font-medium text-slate-300 transition-all hover:bg-slate-700 hover:text-white active:scale-95"
            title="Upload source file from disk"
          >
            <Upload className="h-3.5 w-3.5 text-sky-400" />
            <span>Upload File</span>
          </button>

          <button
            type="button"
            onClick={handleClearCode}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-xs font-medium text-rose-400 transition-all hover:bg-rose-500/10 hover:border-rose-500/30 active:scale-95"
            title="Clear editor contents"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Clear</span>
          </button>
        </div>
      </div>

      {/* Validation Feedback Messages */}
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

      {validationSuccess && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300 backdrop-blur-sm shadow-sm animate-fadeIn">
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
          <div className="flex-1 font-medium">{validationSuccess}</div>
          <button
            onClick={() => setValidationSuccess(null)}
            className="text-emerald-400 hover:text-emerald-200"
          >
            &times;
          </button>
        </div>
      )}

      {/* Editor Main Container */}
      <div className="rounded-2xl border border-slate-800 bg-[#0F172A]/80 shadow-2xl overflow-hidden flex flex-col">
        {/* Editor Toolbar Header */}
        <div className="flex flex-wrap items-center justify-between border-b border-slate-800 bg-[#0B0F19] px-4 py-3 gap-3">
          {/* File Name Display */}
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

          {/* Language Dropdown & Metadata */}
          <div className="flex items-center space-x-4">
            {/* Language Selector */}
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
            onChange={(val) => setCode(val || '')}
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
              Language detection & AI inspection hook into this buffer in Day 2.
            </span>
          </div>

          <button
            type="button"
            onClick={handleReviewCode}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-2.5 text-xs font-semibold text-white shadow-md shadow-purple-600/30 transition-all hover:opacity-95 hover:shadow-purple-600/40 active:scale-95"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Review Code</span>
          </button>
        </div>
      </div>
    </div>
  );
};
