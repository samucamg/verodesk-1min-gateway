/**
 * Response type definitions for API endpoints
 */

export interface OneMinChatResponse {
  requestId?: string;
  content?: string;
  aiRecord?: {
    aiRecordDetail: {
      resultObject: string[];
    };
  };
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface OneMinImageResponse {
  aiRecord: {
    temporaryUrl?: string;
    aiRecordDetail: {
      resultObject: string[];
    };
  };
}

export interface RateLimitRecord {
  requestCount: number;
  tokenCount: number;
  windowStart: number;
}

export interface RateLimitConfig {
  windowMs: number; // Time window (milliseconds)
  maxRequests: number; // Maximum requests
  maxTokens?: number; // Maximum tokens (optional)
}
