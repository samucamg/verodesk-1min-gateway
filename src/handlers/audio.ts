import { DEFAULT_TTS_MODEL } from "../constants/config";
import {
  isAudioTranslationModel,
  isSpeechModel,
} from "../services/model-registry";
import type { AudioResponseFormat, OneMinChatResponse } from "../types";
import {
  ApiError,
  createSuccessResponse,
  extractOneMinContent,
  ValidationError,
} from "../utils";
import {
  type AudioData,
  audioMimeToExtension,
  parseAudioFormData,
  uploadAudioToAsset,
  validateAudioFile,
} from "../utils/audio";
import { BaseTextHandler } from "./base";

export class AudioHandler extends BaseTextHandler {
  // --- TTS (Text-to-Speech) ---
  async handleSpeechGeneration(
    request: Request,
    apiKey?: string,
  ): Promise<Response> {
    const requestBody = (await request.json()) as Record<string, unknown>;
    if (!requestBody.input) {
      throw new ValidationError("Input text field is required", "input");
    }

    const requestedModel = (requestBody.model as string) || DEFAULT_TTS_MODEL;
    const voiceStr = (requestBody.voice as string) || "";
    let promptObject: Record<string, unknown> = {};
    let modelForApi = requestedModel;

    if (requestedModel === "google-tts") {
      const langCode = voiceStr.length >= 5 ? voiceStr.slice(0, 5) : "en-US";
      promptObject = {
        text: requestBody.input,
        name: voiceStr || "en-US-Standard-A",
        languageCode: (requestBody.languageCode as string) || langCode,
        ssmlGender: (requestBody.ssmlGender as string) || "FEMALE",
        speakingRate: requestBody.speed || 1.0,
        pitch: requestBody.pitch || 0,
        volumeGainDb: requestBody.volumeGainDb || 0,
        audioEncoding: (
          (requestBody.response_format as string) || "MP3"
        ).toUpperCase(),
      };
    } else if (
      requestedModel === "elevenlabs-tts" ||
      requestedModel.startsWith("eleven_")
    ) {
      const actualModelId =
        requestedModel === "elevenlabs-tts"
          ? requestBody.model_id || "eleven_multilingual_v2"
          : requestedModel;

      modelForApi = "elevenlabs-tts";

      promptObject = {
        text: requestBody.input,
        voice_id: voiceStr || "Xb7hH8MSUJpSbSDYk0k2",
        model_id: actualModelId,
        voice_settings: requestBody.voice_settings || {
          stability: 0.5,
          similarity_boost: 0.5,
          style: 0,
          use_speaker_boost: true,
        },
        output_format: requestBody.output_format || "mp3_44100_128",
        optimize_streaming_latency: requestBody.optimize_streaming_latency || 0,
        language_code: requestBody.language_code || "en",
      };
    } else {
      // Padrao OpenAI (tts-1)
      promptObject = {
        text: requestBody.input,
        voice: voiceStr || "alloy",
        response_format: requestBody.response_format || "mp3",
        speed: requestBody.speed || 1.0,
      };
    }

    // biome-ignore lint/suspicious/noExplicitAny: Payload dinamico para a API 1min
    const requestBodyForAPI: any = {
      type: "TEXT_TO_SPEECH",
      model: modelForApi,
      promptObject: promptObject,
    };

    const data = await this.apiService.sendAudioRequest(
      requestBodyForAPI,
      apiKey,
    );

    const openAIResponse = this.transformToOpenAIFormat(data);
    return createSuccessResponse(openAIResponse);
  }

  // biome-ignore lint/suspicious/noExplicitAny: Resposta com estrutura dinamica da API
  private transformToOpenAIFormat(data: any): Record<string, unknown> {
    const temporaryUrl = data?.aiRecord?.temporaryUrl;
    if (!temporaryUrl) {
      throw new ApiError(
        "Nenhuma URL de audio temporaria assinada foi retornada pela API",
        500,
      );
    }

    return {
      created: Math.floor(Date.now() / 1000),
      data: [{ url: temporaryUrl }],
    };
  }

  // --- Transcription & Translation (STT) ---
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
      return createSuccessResponse({
        task,
        language: "",
        duration: 0,
        text,
        segments: [],
      });
    }

    return createSuccessResponse({ text });
  }
}
