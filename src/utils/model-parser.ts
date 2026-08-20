/**
 * Model name parser for handling :online suffix functionality
 */

import type { Env } from "../types";

export interface ModelParseResult {
  originalModel: string;
  hasOnlineSuffix: boolean;
  isValid: boolean;
  error?: string;
}

export interface WebSearchConfig {
  webSearch: boolean;
  numOfSite: number;
  maxWord: number;
}

const ONLINE_SUFFIX = ":online";
const DEFAULT_NUM_OF_SITE = 1;
const DEFAULT_MAX_WORD = 500;

/**
 * Parse model name and detect :online suffix
 * All chat models support web search, so no model-specific validation needed.
 */
export function parseModelName(modelName: string): ModelParseResult {
  if (!modelName || typeof modelName !== "string") {
    return {
      originalModel: "",
      hasOnlineSuffix: false,
      isValid: false,
      error: "Model name cannot be empty",
    };
  }

  const trimmedModel = modelName.trim();

  // Check if model has :online suffix (check this first, before rejecting colons)
  if (trimmedModel.endsWith(ONLINE_SUFFIX)) {
    const originalModel = trimmedModel.slice(0, -ONLINE_SUFFIX.length);

    // Validate that original model name is not empty
    if (!originalModel) {
      return {
        originalModel: "",
        hasOnlineSuffix: true,
        isValid: false,
        error: "Model name cannot be empty",
      };
    }

    return {
      originalModel,
      hasOnlineSuffix: true,
      isValid: true,
    };
  }

  // Check for unsupported colon suffix (not :online)
  if (trimmedModel.includes(":")) {
    return {
      originalModel: "",
      hasOnlineSuffix: false,
      isValid: false,
      error: "Invalid model name format. Only ':online' suffix is supported",
    };
  }

  // Standard model name without suffix
  return {
    originalModel: trimmedModel,
    hasOnlineSuffix: false,
    isValid: true,
  };
}

/**
 * Get web search configuration with default values
 */
export function getWebSearchConfig(env?: Partial<Env>): WebSearchConfig {
  const numOfSite = env?.WEB_SEARCH_NUM_OF_SITE
    ? parseInt(env.WEB_SEARCH_NUM_OF_SITE, 10)
    : DEFAULT_NUM_OF_SITE;

  const maxWord = env?.WEB_SEARCH_MAX_WORD
    ? parseInt(env.WEB_SEARCH_MAX_WORD, 10)
    : DEFAULT_MAX_WORD;

  return {
    webSearch: true,
    numOfSite:
      Number.isNaN(numOfSite) || numOfSite <= 0
        ? DEFAULT_NUM_OF_SITE
        : numOfSite,
    maxWord: Number.isNaN(maxWord) || maxWord <= 0 ? DEFAULT_MAX_WORD : maxWord,
  };
}

/**
 * Parse model name and return both clean model and web search config if applicable
 */
export function parseAndGetConfig(
  modelName: string,
  env?: Partial<Env>,
): {
  cleanModel: string;
  webSearchConfig?: WebSearchConfig;
  error?: string;
} {
  const parseResult = parseModelName(modelName);

  if (!parseResult.isValid) {
    return {
      cleanModel: "",
      error: parseResult.error,
    };
  }

  if (parseResult.hasOnlineSuffix) {
    return {
      cleanModel: parseResult.originalModel,
      webSearchConfig: getWebSearchConfig(env),
    };
  }

  return {
    cleanModel: parseResult.originalModel,
  };
}
