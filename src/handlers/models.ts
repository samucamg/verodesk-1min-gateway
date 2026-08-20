/**
 * Models endpoint handler
 */

import { getModelData } from "../services/model-registry";
import type { Env, ModelObject, ModelsResponse } from "../types";
import { createSuccessResponse } from "../utils";

export async function handleModelsEndpoint(env: Env): Promise<Response> {
  const data = await getModelData(env);

  const chatSet = new Set(data.chatModelIds);
  const visionSet = new Set(data.visionModelIds);
  const codeInterpreterSet = new Set(data.codeInterpreterModelIds);

  const models: ModelObject[] = data.entries.map((entry) => ({
    id: entry.modelId,
    object: "model",
    created: Math.floor(data.fetchedAt / 1000),
    owned_by: entry.provider || "1min-ai",
    permission: [] as unknown[],
    root: entry.modelId,
    parent: null as unknown,
    capabilities: {
      vision: visionSet.has(entry.modelId),
      code_interpreter: codeInterpreterSet.has(entry.modelId),
      retrieval: chatSet.has(entry.modelId),
    },
  }));

  const response: ModelsResponse = {
    object: "list",
    data: models,
  };

  return createSuccessResponse(response);
}
