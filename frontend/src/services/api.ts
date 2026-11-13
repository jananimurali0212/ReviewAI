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
 * Requests deep multi-language AI code review analysis from Gemini.
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
      const message = errData.detail || `AI code review failed with status: ${response.status}`;
      throw new Error(message);
    }

    return await response.json();
  } catch (error) {
    console.error('AI code review API error:', error);
    throw error;
  }
};
