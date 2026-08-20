/**
 * Audio transcription and translation endpoint handler
 */

import {
  isAudioTranslationModel,
  isSpeechModel,
} from "../services/model-registry";
import type { AudioResponseFormat, OneMinChatResponse } from "../types";
import {
  type AudioData,
  audioMimeToExtension,
  parseAudioFormData,
  uploadAudioToAsset,
  validateAudioFile,
} from "../utils/audio";
import { ValidationError } from "../utils/errors";
import { createSuccessResponse, extractOneMinContent } from "../utils/response";
import { BaseTextHandler } from "./base";

export class AudioHandler extends BaseTextHandler {
  async handleTranscription(
    request: Request,
    apiKey: string,
  ): Promise<Response> {
    const parsed = await parseAudioFormData(request);

    await validateAudioFile(parsed.file);

    if (!(await isSpeechModel(parsed.model, this.env))) {
      throw new ValidationError(
        `Model '${parsed.model}' does not support speech-to-text`,
        "model",
        "model_not_supported",
      );
    }

    const audioUrl = await this.uploadAudio(parsed.file, apiKey);

    const requestBody = this.apiService.buildSpeechToTextRequestBody(
      audioUrl,
      parsed.model,
      parsed.language,
      parsed.responseFormat,
      parsed.prompt,
      parsed.temperature,
    );

    const data = await this.apiService.sendAudioRequest(requestBody, apiKey);

    return this.formatResponse(data, parsed.responseFormat, "transcribe");
  }

  async handleTranslation(request: Request, apiKey: string): Promise<Response> {
    const parsed = await parseAudioFormData(request);

    await validateAudioFile(parsed.file);

    if (!isAudioTranslationModel(parsed.model)) {
      throw new ValidationError(
        `Model '${parsed.model}' does not support audio translation. Only whisper-1 is supported for translation.`,
        "model",
        "model_not_supported",
      );
    }

    const audioUrl = await this.uploadAudio(parsed.file, apiKey);

    const requestBody = this.apiService.buildAudioTranslatorRequestBody(
      audioUrl,
      parsed.model,
      parsed.responseFormat,
      parsed.temperature,
      parsed.prompt,
    );

    const data = await this.apiService.sendAudioRequest(requestBody, apiKey);

    return this.formatResponse(data, parsed.responseFormat, "translate");
  }

  private async uploadAudio(file: File, apiKey: string): Promise<string> {
    const mimeType = file.type || "audio/mpeg";
    const ext = audioMimeToExtension(mimeType);
    const filename = `audio-${crypto.randomUUID()}${ext}`;
    const arrayBuffer = await file.arrayBuffer();

    const audioData: AudioData = {
      data: arrayBuffer,
      mimeType,
      filename,
    };

    return uploadAudioToAsset(audioData, apiKey, this.env.ONE_MIN_ASSET_URL);
  }

  private formatResponse(
    data: OneMinChatResponse,
    responseFormat: AudioResponseFormat,
    task: "transcribe" | "translate",
  ): Response {
    const text = extractOneMinContent(data);

    if (responseFormat === "vtt") {
      return new Response(text, {
        headers: { "Content-Type": "text/vtt; charset=utf-8" },
      });
    }

    if (responseFormat === "srt" || responseFormat === "text") {
      return new Response(text, {
        headers: { "Content-Type": "text/plain; charset=utf-8" },
      });
    }

    if (responseFormat === "verbose_json") {
      // 1min.ai does not return segment/duration data;
      // return best-effort response with available fields
      return createSuccessResponse({
        task,
        language: "",
        duration: 0,
        text,
        segments: [],
      });
    }

    // Default: json format
    return createSuccessResponse({ text });
  }
}
