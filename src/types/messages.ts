/**
 * Message types for chat completions
 */

import type { ToolCallItem } from "../utils/tool-emulator";

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
  role: "system" | "user" | "assistant" | "tool" | "function" | string;
  content: MessageContent | null;
  name?: string;
  tool_calls?: ToolCallItem[];
  tool_call_id?: string;
}
