/**
 * Response utilities for consistent API responses
 *
 * CORS headers are handled globally by the Hono CORS middleware (src/middleware/cors.ts).
 * Response utilities should NOT add CORS headers manually.
 */

import type { OneMinChatResponse } from "../types";

/**
 * Extract text content from a 1min.ai response, with consistent fallback logic.
 */
export function extractOneMinContent(data: OneMinChatResponse): string {
  const content =
    data.aiRecord?.aiRecordDetail?.resultObject?.[0] || data.content;
  if (!content) {
    console.warn(
      "Empty response from 1min.ai — no resultObject or content field",
    );
    return "";
  }
  return content;
}

export function createSuccessResponse<T = unknown>(
  data: T,
  status: number = 200,
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
    },
  });
}
