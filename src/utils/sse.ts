/**
 * Shared SSE (Server-Sent Events) utilities
 * Used by chat, messages, and responses handlers for streaming
 */

import type { ChatCompletionStreamChunk } from "../types";

const encoder = new TextEncoder();

/**
 * Create an OpenAI-format SSE chunk object
 */
export function createOpenAISSEChunk(
  model: string,
  delta: ChatCompletionStreamChunk["choices"][0]["delta"],
  finishReason: string | null = null,
  id?: string,
): ChatCompletionStreamChunk {
  return {
    id: id || `chatcmpl-${crypto.randomUUID()}`,
    object: "chat.completion.chunk",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        delta,
        finish_reason: finishReason,
      },
    ],
  };
}

/**
 * Write an SSE data event to a writer
 */
export async function writeSSEEvent(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  data: unknown,
): Promise<void> {
  await writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
}

/**
 * Write an SSE event with event type (for Anthropic format)
 */
export async function writeSSEEventWithType(
  writer: WritableStreamDefaultWriter<Uint8Array>,
  eventType: string,
  data: unknown,
): Promise<void> {
  await writer.write(
    encoder.encode(`event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`),
  );
}

/**
 * Write the [DONE] termination event (OpenAI format)
 */
export async function writeSSEDone(
  writer: WritableStreamDefaultWriter<Uint8Array>,
): Promise<void> {
  await writer.write(encoder.encode("data: [DONE]\n\n"));
}

/**
 * Create an SSE streaming Response with proper headers
 */
export function createSSEResponse(readable: ReadableStream): Response {
  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
