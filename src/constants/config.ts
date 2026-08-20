/**
 * Configuration constants
 */

// Rate limiting configuration
export const RATE_LIMIT_CONFIG = {
  windowMs: 60 * 1000, // 1 minute window
  maxRequests: 180, // Maximum 180 requests per minute
  maxTokens: 100000, // Maximum 100k tokens per minute
};

// Default model configuration
export const DEFAULT_MODEL = "open-mistral-nemo";
export const DEFAULT_IMAGE_MODEL = "black-forest-labs/flux-schnell";

// Fixed token estimate for non-text requests (audio, image) in rate limiting
export const MEDIA_REQUEST_TOKEN_ESTIMATE = 1000;

// Audio file constraints (matching OpenAI's limits)
export const MAX_AUDIO_FILE_SIZE = 25 * 1024 * 1024; // 25MB

export const SUPPORTED_AUDIO_MIME_TYPES = new Set([
  "audio/mpeg",
  "audio/mp3",
  "audio/mp4",
  "audio/m4a",
  "audio/wav",
  "audio/webm",
  "audio/ogg",
  "audio/flac",
  "audio/x-m4a",
  "audio/x-wav",
]);

// Whisper model IDs (uses response_format/temperature in promptObject)
export const WHISPER_MODEL_IDS = new Set(["whisper-1"]);

// Models that support audio translation (AUDIO_TRANSLATOR feature)
// Currently only whisper-1 supports translation to English
export const AUDIO_TRANSLATION_MODEL_IDS = new Set(["whisper-1"]);

// Hardcoded fallback for speech models (in case the API doesn't return them)
export const FALLBACK_SPEECH_MODEL_IDS = [
  "whisper-1",
  "latest_long",
  "latest_short",
  "phone_call",
  "telephony",
  "telephony_short",
  "medical_dictation",
  "medical_conversation",
];

// API endpoints
export const API_ENDPOINTS = {
  CHAT_COMPLETIONS: "/v1/chat/completions",
  RESPONSES: "/v1/responses",
  MESSAGES: "/v1/messages",
  IMAGES_GENERATIONS: "/v1/images/generations",
  AUDIO_TRANSCRIPTIONS: "/v1/audio/transcriptions",
  AUDIO_TRANSLATIONS: "/v1/audio/translations",
  MODELS: "/v1/models",
} as const;
