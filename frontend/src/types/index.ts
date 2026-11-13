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


export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'info';
export type FindingCategory = 'correctness' | 'security' | 'performance' | 'maintainability' | 'style';
export type ConfidenceLevel = 'low' | 'medium' | 'high';

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
  source: string;
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
}

export interface ReviewAnalyzePayload {
  code: string;
  language: string;
  filename?: string;
}
