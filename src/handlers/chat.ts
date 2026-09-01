/**
 * Chat completions endpoint handler
 */

import { DEFAULT_MODEL } from "../constants";
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  Message,
  OneMinChatResponse,
} from "../types";
import {
  createSuccessResponse,
  extractOneMinContent,
  ValidationError,
  validateModelAndMessages,
  type WebSearchConfig,
} from "../utils";
import {
  createOpenAISSEChunk,
  writeSSEDone,
  writeSSEEvent,
} from "../utils/sse";
import { executeStreamingPipeline } from "../utils/streaming";
import { calculateTokens, estimateInputTokens } from "../utils/tokens";
import { BaseTextHandler } from "./base";

export class ChatHandler extends BaseTextHandler {
  async handleChatCompletionsWithBody(
    requestBody: ChatCompletionRequest,
    apiKey: string,
    signal?: AbortSignal
  ): Promise<Response> {
    // Sanitizacao explicita: Remover parametros nao suportados pela 1min.ai
    // Forcamos o cast para any para garantir a exclusao mesmo se a tipagem nao prever
    delete (requestBody as any).temperature;
    delete (requestBody as any).top_p;
    delete (requestBody as any).max_tokens;
    delete (requestBody as any).frequency_penalty;
    delete (requestBody as any).presence_penalty;

    if (!requestBody.messages || !Array.isArray(requestBody.messages)) {
      throw new ValidationError(
        "Messages field is required and must be an array",
        "messages",
      );
    }

    const rawModel = requestBody.model || DEFAULT_MODEL;

    const { cleanModel, webSearchConfig, processedMessages } =
      await validateModelAndMessages(
        rawModel,
        requestBody.messages as Message[],
        this.env,
      );

    if (requestBody.stream) {
      return this.handleStreamingChat(
        processedMessages,
        cleanModel,
        apiKey,
        webSearchConfig,
        signal
      );
    } else {
      return this.handleNonStreamingChat(
        processedMessages,
        cleanModel,
        apiKey,
        webSearchConfig,
        signal
      );
    }
  }

  private async handleNonStreamingChat(
    messages: Message[],
    model: string,
    apiKey: string,
    webSearchConfig?: WebSearchConfig,
    signal?: AbortSignal
  ): Promise<Response> {
    const data = await this.sendNonStreamingRequest(
      messages,
      model,
      apiKey,
      webSearchConfig,
      signal
    );

    const openAIResponse = this.transformToOpenAIFormat(data, model, messages);
    return createSuccessResponse(openAIResponse);
  }

  private async handleStreamingChat(
    messages: Message[],
    model: string,
    apiKey: string,
    webSearchConfig?: WebSearchConfig,
    signal?: AbortSignal
  ): Promise<Response> {
    const response = await this.sendStreamingRequest(
      messages,
      model,
      apiKey,
      webSearchConfig,
      signal
    );

    return executeStreamingPipeline(response, {
      onChunk: async (writer, chunk) => {
        const returnChunk = createOpenAISSEChunk(
          model,
          { content: chunk },
          null,
        );
        await writeSSEEvent(writer, returnChunk);
      },
      onEnd: async (writer) => {
        const finalChunk = createOpenAISSEChunk(model, {}, "stop");
        await writeSSEEvent(writer, finalChunk);
        await writeSSEDone(writer);
      },
    });
  }

  private transformToOpenAIFormat(
    data: OneMinChatResponse,
    model: string,
    messages: Message[]
  ): ChatCompletionResponse {
    const content = extractOneMinContent(data);
    
    // Calculo Real de Tokens
    const promptTokens = estimateInputTokens(messages);
    const completionTokens = calculateTokens(content, model);
    const totalTokens = promptTokens + completionTokens;

    return {
      id: `chatcmpl-${crypto.randomUUID()}`,
      object: "chat.completion",
      created: Math.floor(Date.now() / 1000),
      model: model,
      choices: [
        {
          index: 0,
          message: {
            role: "assistant",
            content: content,
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: promptTokens,
        completion_tokens: completionTokens,
        total_tokens: totalTokens,
      },
    };
  }
}
