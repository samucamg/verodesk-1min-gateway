/**
 * Anthropic Messages API endpoint handler
 * Handles requests in Anthropic SDK format and returns Anthropic-compatible responses
 */

import { DEFAULT_MODEL } from "../constants";
import type {
  AnthropicContentBlock,
  AnthropicMessage,
  AnthropicMessageRequest,
  AnthropicMessageResponse,
  AnthropicTextContent,
  Message,
  OneMinChatResponse,
} from "../types";
import {
  calculateTokens,
  estimateInputTokens,
  extractOneMinContent,
  ResponseSanitizer,
  ToolCallingEmulator,
  type ToolDefinition,
  ValidationError,
  validateModelAndMessages,
  type WebSearchConfig,
} from "../utils";
import { writeSSEEventWithType } from "../utils/sse";
import { executeStreamingPipeline } from "../utils/streaming";
import { BaseTextHandler } from "./base";

export class MessagesHandler extends BaseTextHandler {
  async handleMessages(
    requestBody: AnthropicMessageRequest,
    apiKey: string,
  ): Promise<Response> {
    // Validate required fields
    if (!requestBody.messages || !Array.isArray(requestBody.messages)) {
      throw new ValidationError("messages: Field required");
    }

    if (!requestBody.max_tokens || requestBody.max_tokens <= 0) {
      throw new ValidationError("max_tokens: Field required");
    }

    const rawModel = requestBody.model || DEFAULT_MODEL;

    // Convert Anthropic messages to internal format
    const internalMessages = this.convertToInternalMessages(
      requestBody.messages,
      requestBody.system,
    );

    const { cleanModel, webSearchConfig, processedMessages } =
      await validateModelAndMessages(rawModel, internalMessages, this.env);

    const hasTools =
      Array.isArray(requestBody.tools) && requestBody.tools.length > 0;
    const tools: ToolDefinition[] | undefined =
      hasTools && requestBody.tools
        ? requestBody.tools.map((t) => ({
            name: t.name,
            description: t.description,
            input_schema: t.input_schema as unknown as Record<string, unknown>,
          }))
        : undefined;
    const toolChoice = requestBody.tool_choice;

    let finalMessages = processedMessages;
    if (
      hasTools &&
      typeof toolChoice === "object" &&
      toolChoice !== null &&
      (toolChoice as { type?: string }).type === "none"
    ) {
      // tool_choice is none, do not inject
    } else if (hasTools && tools) {
      finalMessages = ToolCallingEmulator.injectToolsIntoMessages(
        processedMessages,
        tools,
        toolChoice,
      );
    }

    // Handle streaming vs non-streaming
    if (requestBody.stream) {
      return this.handleStreamingMessage(
        finalMessages,
        cleanModel,
        apiKey,
        webSearchConfig,
        tools,
      );
    } else {
      return this.handleNonStreamingMessage(
        finalMessages,
        cleanModel,
        apiKey,
        webSearchConfig,
        tools,
      );
    }
  }

  private convertToInternalMessages(
    messages: AnthropicMessage[],
    system?: string | AnthropicTextContent[],
  ): Message[] {
    const internalMessages: Message[] = [];

    // Add system message if present (Anthropic puts system at top-level)
    if (system) {
      const systemText =
        typeof system === "string"
          ? system
          : system.map((block) => block.text).join("\n");
      internalMessages.push({
        role: "system",
        content: systemText,
      });
    }

    // Convert each Anthropic message
    for (const msg of messages) {
      const content = this.extractAnthropicContent(msg.content);
      internalMessages.push({
        role: msg.role,
        content,
      });
    }

    return internalMessages;
  }

  private extractAnthropicContent(
    content: string | AnthropicContentBlock[],
  ): string {
    if (typeof content === "string") {
      return content;
    }

    // Check for unsupported image blocks
    const hasImages = content.some((block) => block.type === "image");
    if (hasImages) {
      throw new ValidationError(
        "Image content blocks in Anthropic format are not yet supported. Use the OpenAI Chat Completions API (/v1/chat/completions) for vision requests.",
        "content",
        "unsupported_content_type",
      );
    }

    // Extract text from content blocks
    const textParts: string[] = [];
    for (const block of content) {
      if (block.type === "text") {
        textParts.push(block.text);
      } else if (block.type === "tool_result") {
        const resultText =
          typeof block.content === "string"
            ? block.content
            : block.content.map((b) => b.text).join("\n");
        const unpacked = ResponseSanitizer.unpackMemoryContent(resultText);
        textParts.push(
          `[Contexto do Sistema - Informação Recuperada]:\n${unpacked}`,
        );
      } else if (block.type === "tool_use") {
        textParts.push(
          `[Assistente consultou: ${block.name}(${JSON.stringify(block.input || {})})]`,
        );
      }
    }
    return textParts.join("\n");
  }

  private async handleNonStreamingMessage(
    messages: Message[],
    model: string,
    apiKey: string,
    webSearchConfig?: WebSearchConfig,
    tools?: ToolDefinition[],
  ): Promise<Response> {
    const data = await this.sendNonStreamingRequest(
      messages,
      model,
      apiKey,
      webSearchConfig,
    );

    const anthropicResponse = this.transformToAnthropicFormat(
      data,
      model,
      messages,
      tools,
    );

    return new Response(JSON.stringify(anthropicResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  private async handleStreamingMessage(
    messages: Message[],
    model: string,
    apiKey: string,
    webSearchConfig?: WebSearchConfig,
    tools?: ToolDefinition[],
  ): Promise<Response> {
    const response = await this.sendStreamingRequest(
      messages,
      model,
      apiKey,
      webSearchConfig,
    );

    const messageId = `msg_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`;

    if (tools && tools.length > 0) {
      return executeStreamingPipeline(response, {
        onStart: async (writer) => {
          const messageStart: AnthropicMessageResponse = {
            id: messageId,
            type: "message",
            role: "assistant",
            content: [],
            model,
            stop_reason: null,
            stop_sequence: null,
            usage: {
              input_tokens: estimateInputTokens(messages),
              output_tokens: 0,
            },
          };
          await writeSSEEventWithType(writer, "message_start", {
            type: "message_start",
            message: messageStart,
          });
          await writeSSEEventWithType(writer, "ping", { type: "ping" });
        },
        onChunk: async (_writer, _chunk) => {
          // Buffers content in pipeline accumulator to prevent tool call JSON leakage
        },
        onEnd: async (writer, accumulatedContent) => {
          const toolCalls = ToolCallingEmulator.parseResponse(
            accumulatedContent,
            tools,
          );

          const outputTokens = calculateTokens(accumulatedContent, model);

          if (toolCalls && toolCalls.length > 0) {
            for (let i = 0; i < toolCalls.length; i++) {
              const tc = toolCalls[i];
              if (!tc) continue;
              const toolUseId = tc.id.replace("call_", "toolu_");

              await writeSSEEventWithType(writer, "content_block_start", {
                type: "content_block_start",
                index: i,
                content_block: {
                  type: "tool_use",
                  id: toolUseId,
                  name: tc.function.name,
                  input: {},
                },
              });

              await writeSSEEventWithType(writer, "content_block_delta", {
                type: "content_block_delta",
                index: i,
                delta: {
                  type: "input_json_delta",
                  partial_json: tc.function.arguments,
                },
              });

              await writeSSEEventWithType(writer, "content_block_stop", {
                type: "content_block_stop",
                index: i,
              });
            }

            await writeSSEEventWithType(writer, "message_delta", {
              type: "message_delta",
              delta: { stop_reason: "tool_use" },
              usage: { output_tokens: outputTokens },
            });
          } else {
            const cleanContent =
              ResponseSanitizer.cleanOutput(accumulatedContent);

            await writeSSEEventWithType(writer, "content_block_start", {
              type: "content_block_start",
              index: 0,
              content_block: { type: "text", text: "" },
            });

            await writeSSEEventWithType(writer, "content_block_delta", {
              type: "content_block_delta",
              index: 0,
              delta: { type: "text_delta", text: cleanContent },
            });

            await writeSSEEventWithType(writer, "content_block_stop", {
              type: "content_block_stop",
              index: 0,
            });

            await writeSSEEventWithType(writer, "message_delta", {
              type: "message_delta",
              delta: { stop_reason: "end_turn" },
              usage: { output_tokens: outputTokens },
            });
          }

          await writeSSEEventWithType(writer, "message_stop", {
            type: "message_stop",
          });
        },
      });
    }

    return executeStreamingPipeline(response, {
      onStart: async (writer) => {
        // Send message_start event
        const messageStart: AnthropicMessageResponse = {
          id: messageId,
          type: "message",
          role: "assistant",
          content: [],
          model,
          stop_reason: null,
          stop_sequence: null,
          usage: {
            input_tokens: estimateInputTokens(messages),
            output_tokens: 0,
          },
        };
        await writeSSEEventWithType(writer, "message_start", {
          type: "message_start",
          message: messageStart,
        });

        // Send content_block_start
        await writeSSEEventWithType(writer, "content_block_start", {
          type: "content_block_start",
          index: 0,
          content_block: { type: "text", text: "" },
        });

        // Send ping
        await writeSSEEventWithType(writer, "ping", { type: "ping" });
      },
      onChunk: async (writer, chunk) => {
        await writeSSEEventWithType(writer, "content_block_delta", {
          type: "content_block_delta",
          index: 0,
          delta: { type: "text_delta", text: chunk },
        });
      },
      onEnd: async (writer, accumulatedContent) => {
        // Send content_block_stop
        await writeSSEEventWithType(writer, "content_block_stop", {
          type: "content_block_stop",
          index: 0,
        });

        // Send message_delta with stop reason and usage
        const outputTokens = calculateTokens(accumulatedContent, model);
        await writeSSEEventWithType(writer, "message_delta", {
          type: "message_delta",
          delta: { stop_reason: "end_turn" },
          usage: { output_tokens: outputTokens },
        });

        // Send message_stop
        await writeSSEEventWithType(writer, "message_stop", {
          type: "message_stop",
        });
      },
    });
  }

  private transformToAnthropicFormat(
    data: OneMinChatResponse,
    model: string,
    messages: Message[],
    tools?: ToolDefinition[],
  ): AnthropicMessageResponse {
    const rawContent = extractOneMinContent(data);
    const toolCalls = tools
      ? ToolCallingEmulator.parseResponse(rawContent, tools)
      : null;

    const inputTokens =
      data.usage?.prompt_tokens || estimateInputTokens(messages);
    const outputTokens =
      data.usage?.completion_tokens || calculateTokens(rawContent, model);

    if (toolCalls && toolCalls.length > 0) {
      const anthropicContent: AnthropicContentBlock[] = toolCalls.map((tc) => {
        let inputObj: Record<string, unknown> = {};
        try {
          inputObj = JSON.parse(tc.function.arguments);
        } catch {
          inputObj = { input: tc.function.arguments };
        }
        return {
          type: "tool_use",
          id: tc.id.replace("call_", "toolu_"),
          name: tc.function.name,
          input: inputObj,
        };
      });

      return {
        id: `msg_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`,
        type: "message",
        role: "assistant",
        content: anthropicContent,
        model,
        stop_reason: "tool_use",
        stop_sequence: null,
        usage: {
          input_tokens: inputTokens,
          output_tokens: outputTokens,
        },
      };
    }

    const cleanContent = ResponseSanitizer.cleanOutput(rawContent);

    return {
      id: `msg_${crypto.randomUUID().replace(/-/g, "").slice(0, 20)}`,
      type: "message",
      role: "assistant",
      content: [{ type: "text", text: cleanContent }],
      model,
      stop_reason: "end_turn",
      stop_sequence: null,
      usage: {
        input_tokens: inputTokens,
        output_tokens: outputTokens,
      },
    };
  }
}
