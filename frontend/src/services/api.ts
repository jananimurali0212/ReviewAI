/**
 * ReviewAI Backend API Client
 */
import { 
  CodeSubmitPayload, 
  CodeSubmitResult, 
  LanguageDetectPayload, 
  LanguageDetectResult,
  ReviewAnalyzePayload,
  ReviewReport,
  SuggestedFix,
  SuggestFixPayload,
  ApplyFixPayload,
  ApplyFixResponse,
  RejectFixPayload,
  AnalyzerToolStatus,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

/**
 * Checks connectivity and health of the FastAPI backend.
 */
export const checkBackendHealth = async (): Promise<HealthResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    if (!response.ok) {
      throw new Error(`Health check failed with status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error('Backend health check error:', error);
    throw error;
  }
};

/**
 * Sends source code and optional filename to backend for automatic language detection.
 */
export const detectLanguageApi = async (
  payload: LanguageDetectPayload
): Promise<LanguageDetectResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/code/detect-language`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Language detection failed (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error('Language detection API error:', error);
    throw error;
  }
};

/**
 * Submits source code with selected language and filename to backend.
 */
export const submitCodeApi = async (
  payload: CodeSubmitPayload
): Promise<CodeSubmitResult> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/code/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const message = errData.detail || `Code submission failed (${response.status})`;
      throw new Error(message);
    }

    return await response.json();
  } catch (error) {
    console.error('Code submission API error:', error);
    throw error;
  }
};

/**
 * Requests deep code review analysis from combined AI and static analyzers.
 */
export const analyzeCodeReviewApi = async (
  payload: ReviewAnalyzePayload
): Promise<ReviewReport> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reviews/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      let message = errData.detail || `Analysis failed (${response.status})`;
      
      if (response.status === 429) {
        message = 'Gemini AI rate limit reached. Please wait a moment and try again.';
      } else if (response.status === 504) {
        message = 'Review analysis timed out. Try submitting a smaller code snippet.';
      } else if (response.status === 401) {
        message = 'Gemini API authentication failed. Please verify the API key in backend/.env.';
      }
      
      throw new Error(message);
    }

    return await response.json();
  } catch (error) {
    console.error('Code review API error:', error);
    throw error;
  }
};

/**
 * Executes static code analysis only (Ruff, Bandit, ESLint) without calling AI.
 */
export const analyzeStaticOnlyApi = async (
  payload: ReviewAnalyzePayload
): Promise<ReviewReport> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reviews/static-analysis`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Static analysis failed (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error('Static analysis API error:', error);
    throw error;
  }
};

/**
 * Generates an intelligent, minimal fix suggestion for a finding.
 */
export const suggestFixApi = async (
  payload: SuggestFixPayload
): Promise<SuggestedFix> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reviews/suggest-fix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Failed to generate fix suggestion (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error('Suggest fix API error:', error);
    throw error;
  }
};

/**
 * Applies a developer-approved patch to the source code with stale patch validation.
 */
export const applyFixApi = async (
  payload: ApplyFixPayload
): Promise<ApplyFixResponse> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reviews/apply-fix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Failed to apply fix (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error('Apply fix API error:', error);
    throw error;
  }
};

/**
 * Records user rejection of a proposed fix suggestion.
 */
export const rejectFixApi = async (
  payload: RejectFixPayload
): Promise<{ finding_id: string; status: string; reason: string }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reviews/reject-fix`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Failed to record rejection (${response.status})`);
    }

    return await response.json();
  } catch (error) {
    console.error('Reject fix API error:', error);
    throw error;
  }
};

/**
 * Fetches status of all registered static analysis tools on the system.
 */
export const fetchAnalyzersStatusApi = async (): Promise<{ status: string; tools: Record<string, AnalyzerToolStatus> }> => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/reviews/analyzers`);
    if (!response.ok) {
      throw new Error(`Failed to fetch analyzer status (${response.status})`);
    }
    return await response.json();
  } catch (error) {
    console.error('Fetch analyzer status error:', error);
    throw error;
  }
};
