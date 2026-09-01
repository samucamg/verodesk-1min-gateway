/**
 * Models endpoint handler with Cloudflare KV Caching
 */

import { getModelData } from "../services/model-registry";
import type { Env, ModelObject, ModelsResponse } from "../types";
import { createSuccessResponse } from "../utils";

export async function handleModelsEndpoint(env: Env): Promise<Response> {
  const CACHE_KEY = "1min_models_response_v1";

  // 1. Tentar recuperar o catalogo formatado diretamente do KV Cache
  try {
    if (env.MODEL_CACHE) {
      const cachedData = await env.MODEL_CACHE.get(CACHE_KEY, "json");
      if (cachedData) {
        return createSuccessResponse(cachedData as ModelsResponse);
      }
    }
  } catch (error) {
    console.warn("Falha ao ler do MODEL_CACHE KV. Recorrendo a origem.", error);
  }

  // 2. Cache Miss: Buscar da origem e processar
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

  // 3. Salvar no KV Cache para as proximas requisicoes (TTL: 3600 segundos / 1 hora)
  try {
    if (env.MODEL_CACHE) {
      await env.MODEL_CACHE.put(CACHE_KEY, JSON.stringify(response), {
        expirationTtl: 3600,
      });
    }
  } catch (error) {
    console.warn("Falha ao escrever no MODEL_CACHE KV.", error);
  }

  return createSuccessResponse(response);
}
