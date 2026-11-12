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
