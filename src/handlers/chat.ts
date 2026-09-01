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
  ResponseSanitizer,
  ToolCallingEmulator,
  type ToolDefinition,
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
    signal?: AbortSignal,
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

    const hasTools =
      Array.isArray(requestBody.tools) && requestBody.tools.length > 0;
    const tools = hasTools
      ? (requestBody.tools as ToolDefinition[])
      : undefined;
    const toolChoice = requestBody.tool_choice;

    let finalMessages = processedMessages;
    if (hasTools && tools && toolChoice !== "none") {
      finalMessages = ToolCallingEmulator.injectToolsIntoMessages(
        processedMessages,
        tools,
        toolChoice,
      );
    }

    if (requestBody.stream) {
      return this.handleStreamingChat(
        finalMessages,
        cleanModel,
        apiKey,
        webSearchConfig,
        signal,
        tools,
      );
    } else {
      return this.handleNonStreamingChat(
        finalMessages,
        cleanModel,
        apiKey,
        webSearchConfig,
        signal,
        tools,
      );
    }
  }

  private async handleNonStreamingChat(
    messages: Message[],
    model: string,
    apiKey: string,
    webSearchConfig?: WebSearchConfig,
    signal?: AbortSignal,
    tools?: ToolDefinition[],
  ): Promise<Response> {
    const data = await this.sendNonStreamingRequest(
      messages,
      model,
      apiKey,
      webSearchConfig,
      signal,
    );

    const openAIResponse = this.transformToOpenAIFormat(
      data,
      model,
      messages,
      tools,
    );
    return createSuccessResponse(openAIResponse);
  }

  private async handleStreamingChat(
    messages: Message[],
    model: string,
    apiKey: string,
    webSearchConfig?: WebSearchConfig,
    signal?: AbortSignal,
    tools?: ToolDefinition[],
  ): Promise<Response> {
    const response = await this.sendStreamingRequest(
      messages,
      model,
      apiKey,
      webSearchConfig,
      signal,
    );

    if (tools && tools.length > 0) {
      return executeStreamingPipeline(response, {
        onChunk: async (_writer, _chunk) => {
          // Buffers content in pipeline accumulator to prevent tool call JSON leakage
        },
        onEnd: async (writer, accumulatedContent) => {
          const toolCalls = ToolCallingEmulator.parseResponse(
            accumulatedContent,
            tools,
          );

          if (toolCalls && toolCalls.length > 0) {
            for (let i = 0; i < toolCalls.length; i++) {
              const tc = toolCalls[i];
              if (!tc) continue;
              const returnChunk = createOpenAISSEChunk(
                model,
                {
                  tool_calls: [
                    {
                      index: i,
                      id: tc.id,
                      type: "function",
                      function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments,
                      },
                    },
                  ],
                },
                null,
              );
              await writeSSEEvent(writer, returnChunk);
            }
            const finalChunk = createOpenAISSEChunk(model, {}, "tool_calls");
            await writeSSEEvent(writer, finalChunk);
          } else {
            const cleanContent =
              ResponseSanitizer.cleanOutput(accumulatedContent);
            if (cleanContent) {
              const returnChunk = createOpenAISSEChunk(
                model,
                { content: cleanContent },
                null,
              );
              await writeSSEEvent(writer, returnChunk);
            }
            const finalChunk = createOpenAISSEChunk(model, {}, "stop");
            await writeSSEEvent(writer, finalChunk);
          }
          await writeSSEDone(writer);
        },
      });
    }

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
    messages: Message[],
    tools?: ToolDefinition[],
  ): ChatCompletionResponse {
    const rawContent = extractOneMinContent(data);
    const toolCalls = tools
      ? ToolCallingEmulator.parseResponse(rawContent, tools)
      : null;

    let content: string | null = null;
    let finishReason = "stop";

    if (toolCalls && toolCalls.length > 0) {
      finishReason = "tool_calls";
      content = null;
    } else {
      content = ResponseSanitizer.cleanOutput(rawContent);
    }

    // Calculo Real de Tokens
    const promptTokens = estimateInputTokens(messages);
    const completionTokens = calculateTokens(content || rawContent, model);
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
            ...(toolCalls && toolCalls.length > 0
              ? { tool_calls: toolCalls }
              : {}),
          },
          finish_reason: finishReason,
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
