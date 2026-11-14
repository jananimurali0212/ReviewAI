export type NavPage = 'dashboard' | 'new-review' | 'history' | 'settings';

export type SupportedLanguage = 
  | 'python'
  | 'java'
  | 'c'
  | 'cpp'
  | 'javascript'
  | 'typescript'
  | 'go'
  | 'rust'
  | 'php'
  | 'csharp'
  | 'ruby'
  | 'kotlin'
  | 'swift'
  | 'dart'
  | 'r'
  | 'scala'
  | 'perl'
  | 'lua'
  | 'html'
  | 'css'
  | 'sql';

export interface LanguageOption {
  id: SupportedLanguage;
  name: string;
  extension: string;
  monacoLang: string;
  sampleSnippet: string;
}

export interface ReviewHistoryItem {
  id: string;
  projectName: string;
  fileName: string;
  language: string;
  reviewDate: string;
  issueCount: number;
  status: 'Completed' | 'Pending' | 'Needs Attention';
  criticalIssues: number;
}

export interface CodeSubmitPayload {
  code: string;
  language: string;
  filename?: string;
  language_detected?: boolean;
  submission_type?: 'paste' | 'file_upload' | 'github';
  metadata?: Record<string, unknown>;
}

export interface CodeSubmitResult {
  success: boolean;
  filename: string;
  language: string;
  language_detected: boolean;
  message: string;
  code_length: number;
  lines_count?: number;
  submission_id?: string;
  created_at?: string;
}

export interface LanguageDetectPayload {
  code?: string;
  filename?: string;
}

export interface LanguageCandidate {
  language: string;
  name: string;
  confidence: number;
}

export interface LanguageDetectResult {
  detected_language: SupportedLanguage | null;
  language_name: string | null;
  confidence: number;
  is_reliable: boolean;
  requires_manual_selection: boolean;
  detection_source: 'extension' | 'content' | 'shebang' | 'extension_content_hybrid' | 'none';
  alternatives: LanguageCandidate[];
  message: string;
}

// --- Day 3 & Day 4 Review & Static Analysis Types ---

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type FindingCategory = 'correctness' | 'security' | 'performance' | 'maintainability' | 'style';
export type ConfidenceLevel = 'low' | 'medium' | 'high';
export type FindingSource = 'ai' | 'static' | 'ai_and_static' | 'gemini_ai';

export interface ReviewFinding {
  id: string;
  title: string;
  category: FindingCategory;
  severity: SeverityLevel;
  file: string;
  start_line: number;
  end_line: number;
  evidence: string;
  explanation: string;
  recommendation: string;
  confidence: ConfidenceLevel;
  source: FindingSource | string;
  analyzer_name?: string;
  rule_id?: string;
  fix_available?: boolean;
  merged_sources?: string[];
}

export interface ReviewSeverityBreakdown {
  critical: number;
  high: number;
  medium: number;
  low: number;
  info: number;
}

export interface ReviewReport {
  id: string;
  file: string;
  language: string;
  model: string;
  summary: string;
  total_findings: number;
  severity_breakdown: ReviewSeverityBreakdown;
  findings: ReviewFinding[];
  positive_observations: string[];
  general_recommendations: string[];
  analyzed_at: string;
  duration_ms?: number;
  status: 'completed' | 'warning' | 'failed';
  ai_findings_count: number;
  static_findings_count: number;
  combined_findings_count: number;
  analyzers_executed: string[];
  analyzer_errors?: Record<string, string>;
}

export interface ReviewAnalyzePayload {
  code: string;
  language: string;
  filename?: string;
  mode?: 'combined' | 'ai_only' | 'static_only';
}

// --- Day 4 Intelligent Fix Types ---

export interface SuggestedFix {
  finding_id: string;
  file: string;
  start_line: number;
  end_line: number;
  original_code: string;
  replacement_code: string;
  explanation: string;
  diff?: string;
  applied?: boolean;
}

export interface SuggestFixPayload {
  finding_id: string;
  code: string;
  language: string;
  filename?: string;
  finding?: ReviewFinding;
}

export interface ApplyFixPayload {
  code: string;
  fix: SuggestedFix;
  filename?: string;
}

export interface ApplyFixResponse {
  success: boolean;
  updated_code: string;
  message: string;
  lines_affected: number;
  undo_available: boolean;
}

export interface RejectFixPayload {
  finding_id: string;
  reason?: string;
}

export interface AnalyzerToolStatus {
  name: string;
  supported_languages: string[];
  available: boolean;
  version: string;
}
