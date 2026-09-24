export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
export type AppTheme = 'dark' | 'gray' | 'light' | 'termius';

export interface KeyValuePair {
  id: string;
  key: string;
  value: string;
  active: boolean;
}

export type AuthType = 'none' | 'bearer' | 'basic' | 'apikey';

export interface RequestConfig {
  id: string;
  name?: string;
  method: HttpMethod;
  url: string;
  queryParams: KeyValuePair[];
  headers: KeyValuePair[];
  body: string;
  authType: AuthType;
  authConfig: Record<string, string>;
}

export interface ResponseDetails {
  success: boolean;
  status?: number;
  statusText?: string;
  time?: number;
  size?: number;
  headers?: Record<string, string>;
  body?: any;
  error?: string;
}

export interface TabData {
  id: string;
  request: RequestConfig;
  response?: ResponseDetails;
  loading: boolean;
  folderName?: string;
}

export interface HistoryItem {
  id: string;
  timestamp: number;
  request: RequestConfig;
  folderName?: string;
}

export interface SavedRequest {
  id: string;
  name: string;
  folderName: string;
  request: RequestConfig;
}
