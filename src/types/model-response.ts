/**
 * Model response types
 */

export interface ModelCapabilities {
  vision: boolean;
  code_interpreter: boolean;
  retrieval: boolean;
}

export interface ModelObject {
  id: string;
  object: "model";
  created: number;
  owned_by: string;
  permission: unknown[];
  root: string;
  parent: unknown;
  capabilities: ModelCapabilities;
}

export interface ModelsResponse {
  object: "list";
  data: ModelObject[];
}
