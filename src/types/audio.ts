/**
 * Audio transcription and translation types (OpenAI Whisper API compatible)
 */

export type AudioResponseFormat =
  | "json"
  | "text"
  | "srt"
  | "verbose_json"
  | "vtt";

export interface AudioTranscriptionRequest {
  file: File;
  model: string;
  language?: string;
  prompt?: string;
  response_format?: AudioResponseFormat;
  temperature?: number;
}

export interface AudioTranslationRequest {
  file: File;
  model: string;
  prompt?: string;
  response_format?: AudioResponseFormat;
  temperature?: number;
}

export interface AudioTranscriptionResponse {
  text: string;
}

export interface AudioVerboseResponse {
  task: "transcribe" | "translate";
  language: string;
  duration: number;
  text: string;
  segments: AudioSegment[];
}

export interface AudioSegment {
  id: number;
  seek: number;
  start: number;
  end: number;
  text: string;
}

export interface ParsedAudioFormData {
  file: File;
  model: string;
  language?: string;
  prompt?: string;
  responseFormat: AudioResponseFormat;
  temperature?: number;
}
