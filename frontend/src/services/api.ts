/**
 * ReviewAI Backend API Client
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export interface HealthResponse {
  status: string;
  service: string;
  version: string;
}

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

