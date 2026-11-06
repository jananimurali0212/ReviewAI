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

