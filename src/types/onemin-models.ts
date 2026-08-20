/**
 * Types for 1min.ai Models API responses and cached model data
 */

export interface OneMinModelEntry {
  modelId: string;
  name: string;
  provider: string;
  status: string;
  features: string[];
  modality: { INPUT: string[]; OUTPUT: string[] };
  creditMetadata: Record<string, unknown>;
}

export interface OneMinModelsAPIResponse {
  models: OneMinModelEntry[];
}

export interface CachedModelData {
  chatModelIds: string[];
  imageModelIds: string[];
  visionModelIds: string[];
  codeInterpreterModelIds: string[];
  speechModelIds?: string[];
  entries: OneMinModelEntry[];
  fetchedAt: number;
}
