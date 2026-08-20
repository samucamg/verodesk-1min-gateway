/**
 * Shared streaming pipeline infrastructure
 * Eliminates duplicated TransformStream/reader/writer boilerplate across handlers
 */

import { createSSEResponse } from "./sse";
import { SimpleUTF8Decoder } from "./utf8-decoder";

const encoder = new TextEncoder();

export interface StreamingCallbacks {
  onStart?: (writer: WritableStreamDefaultWriter<Uint8Array>) => Promise<void>;
  onChunk: (
    writer: WritableStreamDefaultWriter<Uint8Array>,
    chunk: string,
  ) => Promise<void>;
  onEnd: (
    writer: WritableStreamDefaultWriter<Uint8Array>,
    accumulatedContent: string,
  ) => Promise<void>;
}

/**
 * Check if text looks like SSE format (line-anchored check for "data: " or "event: ").
 * Issue #4: anchored to line start to avoid false positives from response content.
 */
const SSE_LINE_PATTERN = /(^|\n)(data|event): /;
function isSSEFormat(text: string): boolean {
  return SSE_LINE_PATTERN.test(text);
}

/**
 * Parse SSE content events from 1min.ai streaming response.
 * Only extracts delta text from `event: content` events.
 * Ignores `event: result` (full response) and `event: done` (terminator).
 * Returns null if no SSE structure was found (caller should use raw text).
 *
 * Issue #6: eventType persists across multiple data lines within the same event block,
 * only reset on empty line or next event: line.
 */
function parseSSEChunks(text: string): string[] | null {
  const chunks: string[] = [];
  const lines = text.split("\n");
  let hasSSEStructure = false;
  let currentEventType = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim();

    // Empty line marks end of an SSE event block — reset event type
    if (!line) {
      currentEventType = "";
      continue;
    }

    // Track event type
    if (line.startsWith("event: ")) {
      hasSSEStructure = true;
      currentEventType = line.slice(7).trim();
      continue;
    }

    // Process data lines
    if (line.startsWith("data: ")) {
      hasSSEStructure = true;
      const dataStr = line.slice(6);
      if (dataStr === "[DONE]") continue;

      // Skip non-content events (result, done, error)
      if (currentEventType && currentEventType !== "content") {
        continue;
      }

      try {
        const parsed = JSON.parse(dataStr) as Record<string, unknown>;
        if (typeof parsed.content === "string" && parsed.content) {
          chunks.push(parsed.content);
        }
      } catch {
        // Not JSON — treat as raw text content if from a content event
        if (dataStr.trim()) {
          chunks.push(dataStr);
        }
      }
    }
  }

  return hasSSEStructure ? chunks : null;
}

/**
 * Execute a streaming pipeline that parses SSE events from 1min.ai.
 * The upstream response is SSE-formatted; we extract content chunks
 * and pass them to the callbacks for re-formatting into client SSE.
 */
export function executeStreamingPipeline(
  response: Response,
  callbacks: StreamingCallbacks,
): Response {
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();

  const reader = response.body?.getReader();
  if (!reader) {
    writer.close().catch(() => {});
    return createSSEResponse(readable);
  }

  (async () => {
    try {
      const utf8Decoder = new SimpleUTF8Decoder();
      let accumulatedContent = "";
      let buffer = "";
      // Issue #5: defer SSE detection until first double-newline boundary
      let detectedSSE: boolean | null = null;

      if (callbacks.onStart) {
        await callbacks.onStart(writer);
      }

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const decoded = utf8Decoder.decode(value, done);
        if (!decoded) continue;

        // Accumulate into buffer first; detect format once we have a complete event
        buffer += decoded;

        // Issue #5: defer detection until we see a double-newline (complete SSE event)
        if (detectedSSE === null) {
          if (buffer.includes("\n\n")) {
            detectedSSE = isSSEFormat(buffer);
            if (!detectedSSE) {
              // Issue #9: use console.warn instead of console.log
              console.warn(
                "Streaming: raw text mode (upstream is not SSE-formatted)",
              );
              // Flush entire buffer as raw text
              accumulatedContent += buffer;
              await callbacks.onChunk(writer, buffer);
              buffer = "";
            }
          }
          // If no double-newline yet, keep buffering
          if (detectedSSE === null) continue;
        }

        if (!detectedSSE) {
          // Raw text mode (legacy/fallback)
          accumulatedContent += buffer;
          await callbacks.onChunk(writer, buffer);
          buffer = "";
          continue;
        }

        // SSE mode: split on double newlines
        const parts = buffer.split("\n\n");
        buffer = parts.pop() || "";

        for (const part of parts) {
          const chunks = parseSSEChunks(part);
          if (chunks) {
            for (const chunk of chunks) {
              // Issue #1: dedup using running accumulated string (O(1) per check)
              // 1min.ai sends the full accumulated text as the final content event
              if (accumulatedContent && chunk === accumulatedContent) continue;

              accumulatedContent += chunk;
              await callbacks.onChunk(writer, chunk);
            }
          }
        }
      }

      // Process any remaining buffer (SSE mode only)
      if (detectedSSE && buffer.trim()) {
        const chunks = parseSSEChunks(buffer);
        if (chunks) {
          for (const chunk of chunks) {
            if (accumulatedContent && chunk === accumulatedContent) continue;

            accumulatedContent += chunk;
            await callbacks.onChunk(writer, chunk);
          }
        }
      }

      await callbacks.onEnd(writer, accumulatedContent);
      await writer.close();
    } catch (error) {
      console.error("Streaming pipeline error:", error);
      try {
        const errorMessage =
          error instanceof Error ? error.message : "Stream interrupted";
        await writer.write(
          encoder.encode(
            `data: ${JSON.stringify({ error: { message: errorMessage, type: "server_error" } })}\n\n`,
          ),
        );
        await writer.close();
      } catch {
        await writer.abort(error).catch(() => {});
      }
    }
  })();

  return createSSEResponse(readable);
}
