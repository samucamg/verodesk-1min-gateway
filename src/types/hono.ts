import type { Env } from "./index";

export type HonoEnv = {
  Bindings: Env;
  Variables: {
    apiKey: string;
    rateLimitInfo: RateLimitInfo;
  };
};

export interface RateLimitInfo {
  clientId: string;
  tokenCount: number;
  allowed: boolean;
  requestCount: number;
  remaining: number;
  resetTime: number;
}

export interface AuthContext {
  apiKey: string;
  validated: boolean;
}

export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

export interface RateLimitContext {
  clientId: string;
  tokenCount: number;
  allowed: boolean;
}
