// Backend integration point — connect to FastAPI at NEXT_PUBLIC_API_BASE_URL
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 2 min timeout for long scans
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 404) {
      return Promise.reject(new Error('Scan not found. The scan ID may be invalid or expired.'));
    }
    if (error.response?.status === 422) {
      return Promise.reject(new Error('Invalid repository URL. Please provide a valid GitHub URL.'));
    }
    if (error.code === 'ECONNABORTED') {
      return Promise.reject(new Error('Scan timed out. The repository may be too large. Try again.'));
    }
    return Promise.reject(error);
  }
);

// --- API METHODS ---

export interface ScanRequest {
  repo_url: string;
}

export interface ScanResponse {
  scan_id: string;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  total_vulnerabilities: number;
  message: string;
}

export interface Vulnerability {
  cve_id: string;
  package_name: string;
  installed_version: string;
  fixed_version: string | null;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  fix_confidence?: 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  fix_suggestion: string;
  cvss_score: number;
  published_date: string;
}

export interface ScanResult {
  scan_id: string;
  repo_url: string;
  status: 'completed' | 'failed';
  scanned_at: string;
  duration_seconds: number;
  total_vulnerabilities: number;
  dependencies_scanned: number;
  vulnerabilities: Vulnerability[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

export interface HistoryItem {
  scan_id: string;
  repo_url: string;
  scanned_at: string;
  total_vulnerabilities: number;
  status: 'completed' | 'failed';
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

// POST /api/scan — initiate a new scan
export async function startScan(repo_url: string): Promise<ScanResponse> {
  // Backend integration: POST /api/scan
  const response = await apiClient.post<ScanResponse>('/api/scan', { repo_url });
  return response.data;
}

// GET /api/results/{scan_id} — fetch scan results
export async function getScanResults(scan_id: string): Promise<ScanResult> {
  // Backend integration: GET /api/results/{scan_id}
  const response = await apiClient.get<ScanResult>(`/api/results/${scan_id}`);
  return response.data;
}

// GET /api/history — fetch scan history
export async function getScanHistory(): Promise<HistoryItem[]> {
  // Backend integration: GET /api/history
  const response = await apiClient.get<HistoryItem[]>('/api/history');
  return response.data;
}