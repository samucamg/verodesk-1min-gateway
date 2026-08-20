/**
 * Message types for chat completions
 */

export interface TextContent {
  type: "text";
  text: string;
}

export interface ImageContent {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
}

export type MessageContent = string | (TextContent | ImageContent)[];

export interface Message {
  role: "system" | "user" | "assistant";
  content: MessageContent;
  name?: string;
}
