/**
 * Base handler class with shared constructor and service setup
 */

import { OneMinApiService } from "../services";
import type { Env, Message, OneMinChatResponse } from "../types";
import type { WebSearchConfig } from "../utils/model-parser";

export abstract class BaseTextHandler {
  protected env: Env;
  protected apiService: OneMinApiService;

  constructor(env: Env) {
    this.env = env;
    this.apiService = new OneMinApiService(env);
  }

  /**
   * Build request body and send a non-streaming chat request to 1min.ai.
   * Returns the parsed OneMinChatResponse.
   */
  protected async sendNonStreamingRequest(
    messages: Message[],
    model: string,
    apiKey: string,
    webSearchConfig?: WebSearchConfig,
  ): Promise<OneMinChatResponse> {
    const requestBody = await this.apiService.buildChatRequestBody(
      messages,
      model,
      apiKey,
      webSearchConfig,
    );

    const response = await this.apiService.sendChatRequest(
      requestBody,
      false,
      apiKey,
    );
    return (await response.json()) as OneMinChatResponse;
  }

  /**
   * Build request body and send a streaming chat request to 1min.ai.
   * Returns the raw streaming Response for pipeline processing.
   */
  protected async sendStreamingRequest(
    messages: Message[],
    model: string,
    apiKey: string,
    webSearchConfig?: WebSearchConfig,
  ): Promise<Response> {
    const requestBody = await this.apiService.buildChatRequestBody(
      messages,
      model,
      apiKey,
      webSearchConfig,
    );

    return this.apiService.sendChatRequest(requestBody, true, apiKey);
  }
}
