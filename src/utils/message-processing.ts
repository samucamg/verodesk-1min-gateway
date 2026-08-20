/**
 * Shared message processing utilities
 * Used by chat, responses, and messages handlers
 */

import type {
  ImageContent,
  Message,
  MessageContent,
  TextContent,
} from "../types";
import { extractImageFromContent } from "./image";

/**
 * Extract text from MessageContent (handles both string and array formats)
 */
export function extractTextFromMessageContent(content: MessageContent): string {
  if (typeof content === "string") {
    return content;
  }
  const textParts: string[] = [];
  for (const item of content) {
    if (item.type === "text" && "text" in item) {
      textParts.push((item as TextContent).text);
    }
  }
  return textParts.join("\n");
}

/**
 * Extract all text from a messages array (for token counting)
 * Accepts broad content types to work with OpenAI, Anthropic, and internal formats.
 */
export function extractAllMessageText(
  messages: Array<{ content?: string | unknown[] }>,
): string {
  const parts: string[] = [];
  for (const msg of messages) {
    if (msg.content === undefined || msg.content === null) continue;
    if (typeof msg.content === "string") {
      parts.push(msg.content);
    } else if (Array.isArray(msg.content)) {
      for (const item of msg.content) {
        if (
          typeof item === "object" &&
          item !== null &&
          "type" in item &&
          "text" in item &&
          typeof (item as { text: unknown }).text === "string"
        ) {
          parts.push((item as { text: string }).text);
        }
      }
    }
  }
  return parts.join(" ");
}

/**
 * Process messages in a single pass:
 * - Checks for images
 * - Converts image format for 1min.ai API
 * Returns both the processed messages and hasImages flag.
 */
export function processMessagesWithImageCheck(messages: Message[]): {
  processedMessages: Message[];
  hasImages: boolean;
} {
  let hasImages = false;
  const processedMessages = messages.map((message) => {
    if (Array.isArray(message.content)) {
      const imageUrl = extractImageFromContent(message.content);
      if (imageUrl) {
        hasImages = true;
        return {
          role: message.role,
          content: (message.content as (TextContent | ImageContent)[]).map(
            (item) => {
              if (item.type === "image_url") {
                return {
                  type: "image_url" as const,
                  image_url: { url: item.image_url.url },
                };
              }
              return item;
            },
          ),
          name: message.name,
        } as Message;
      }
    }
    return message;
  });
  return { processedMessages, hasImages };
}
