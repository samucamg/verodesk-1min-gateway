/**
 * 1min.ai API specific types
 */

export interface WebSearchSettings {
  webSearch: boolean;
  numOfSite?: number;
  maxWord?: number;
}

export interface HistorySettings {
  isMixed: boolean;
  historyMessageLimit?: number;
}

export interface PromptSettings {
  webSearchSettings?: WebSearchSettings;
  historySettings?: HistorySettings;
  withMemories?: boolean;
}

export interface PromptAttachments {
  images?: string[];
  files?: string[];
}

export interface OneMinPromptObject {
  prompt: string;
  settings?: PromptSettings;
  attachments?: PromptAttachments;
  conversationId?: string;
  // Legacy fields used by non-chat features (image generation)
  n?: number;
  size?: string;
  // Audio (Speech-to-Text / Audio Translator) fields
  audioUrl?: string;
  response_format?: string; // snake_case: matches 1min.ai API field name
  temperature?: number;
  language?: string;
}

export interface OneMinRequestBody {
  type: string;
  model: string;
  promptObject: OneMinPromptObject;
  brandVoiceId?: string;
  metadata?: Record<string, unknown>;
}
