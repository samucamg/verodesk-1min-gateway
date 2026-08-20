/**
 * API response types for OpenAI-compatible responses
 */

export interface ChatCompletionResponse {
  id: string;
  object: "chat.completion";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface ChatCompletionStreamChunk {
  id: string;
  object: "chat.completion.chunk";
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
    };
    finish_reason: string | null;
  }>;
}

export interface OneMinStreamChunk {
  requestId: string;
  receivedMessage: string;
  createDate: string;
}

export interface ImageGenerationResponse {
  created: number;
  data: Array<{
    url?: string;
    b64_json?: string;
    revised_prompt?: string;
  }>;
}

// OpenAI Responses API types

export interface ResponsesOutputText {
  type: "output_text";
  text: string;
}

export interface ResponsesOutputMessage {
  type: "message";
  id: string;
  role: "assistant";
  content: ResponsesOutputText[];
  status: "completed" | "failed" | "in_progress";
}

export type ResponsesOutputItem = ResponsesOutputMessage;

export interface ResponsesAPIResponse {
  id: string;
  object: "response";
  created_at: number;
  model: string;
  output: ResponsesOutputItem[];
  status: "completed" | "failed" | "in_progress";
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

// Responses API streaming event types

export interface ResponsesStreamCreatedEvent {
  type: "response.created";
  response: ResponsesAPIResponse;
}

export interface ResponsesStreamDoneEvent {
  type: "response.done";
  response: ResponsesAPIResponse;
}

export interface ResponsesStreamOutputItemAddedEvent {
  type: "response.output_item.added";
  output_index: number;
  item: ResponsesOutputItem;
}

export interface ResponsesStreamOutputItemDoneEvent {
  type: "response.output_item.done";
  output_index: number;
  item: ResponsesOutputItem;
}

export interface ResponsesStreamContentPartAddedEvent {
  type: "response.content_part.added";
  output_index: number;
  content_index: number;
  part: ResponsesOutputText;
}

export interface ResponsesStreamContentPartDoneEvent {
  type: "response.content_part.done";
  output_index: number;
  content_index: number;
  part: ResponsesOutputText;
}

export interface ResponsesStreamTextDeltaEvent {
  type: "response.output_text.delta";
  output_index: number;
  content_index: number;
  delta: string;
}

export interface ResponsesStreamTextDoneEvent {
  type: "response.output_text.done";
  output_index: number;
  content_index: number;
  text: string;
}

export type ResponsesStreamEvent =
  | ResponsesStreamCreatedEvent
  | ResponsesStreamDoneEvent
  | ResponsesStreamOutputItemAddedEvent
  | ResponsesStreamOutputItemDoneEvent
  | ResponsesStreamContentPartAddedEvent
  | ResponsesStreamContentPartDoneEvent
  | ResponsesStreamTextDeltaEvent
  | ResponsesStreamTextDoneEvent;
