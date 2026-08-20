export interface Env {
  ONE_MIN_CHAT_API_URL: string;
  ONE_MIN_API_URL: string;
  ONE_MIN_ASSET_URL: string;
  ONE_MIN_MODELS_API_URL: string;
  ONE_MIN_API_KEY?: string;
  AUTH_TOKEN?: string;
  RATE_LIMIT_STORE: KVNamespace;
  MODEL_CACHE: KVNamespace;
  WEB_SEARCH_NUM_OF_SITE?: string;
  WEB_SEARCH_MAX_WORD?: string;
}
