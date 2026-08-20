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
import { BaseTextHandler } from "./base";

export class ChatHandler extends BaseTextHandler {
  async handleChatCompletionsWithBody(
    requestBody: ChatCompletionRequest,
    apiKey: string,
  ): Promise<Response> {
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
      );
    } else {
      return this.handleNonStreamingChat(
        processedMessages,
        cleanModel,
        apiKey,
        webSearchConfig,
      );
    }
  }

  private async handleNonStreamingChat(
    messages: Message[],
    model: string,
    apiKey: string,
    webSearchConfig?: WebSearchConfig,
  ): Promise<Response> {
    const data = await this.sendNonStreamingRequest(
      messages,
      model,
      apiKey,
      webSearchConfig,
    );

    const openAIResponse = this.transformToOpenAIFormat(data, model);
    return createSuccessResponse(openAIResponse);
  }

  private async handleStreamingChat(
    messages: Message[],
    model: string,
    apiKey: string,
    webSearchConfig?: WebSearchConfig,
  ): Promise<Response> {
    const response = await this.sendStreamingRequest(
      messages,
      model,
      apiKey,
      webSearchConfig,
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
  ): ChatCompletionResponse {
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
            content: extractOneMinContent(data),
          },
          finish_reason: "stop",
        },
      ],
      usage: {
        prompt_tokens: data.usage?.prompt_tokens || 0,
        completion_tokens: data.usage?.completion_tokens || 0,
        total_tokens: data.usage?.total_tokens || 0,
      },
    };
  }
}
