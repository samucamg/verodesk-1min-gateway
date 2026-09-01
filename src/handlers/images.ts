/**
 * Image generation endpoint handler
 */

import { DEFAULT_IMAGE_MODEL } from "../constants";
import { isImageGenerationModel } from "../services/model-registry";
import type {
  ImageGenerationRequest,
  ImageGenerationResponse,
  OneMinImageResponse,
} from "../types";
import { ApiError, createSuccessResponse, ValidationError } from "../utils";
import { BaseTextHandler } from "./base";

export class ImageHandler extends BaseTextHandler {
  async handleImageGeneration(
    request: Request,
    apiKey?: string,
  ): Promise<Response> {
    // Usamos 'any' aqui para aceitar os campos customizados que você enviou no N8N/curl
    const requestBody: any = await request.json();

    if (!requestBody.prompt) {
      throw new ValidationError("Prompt field is required", "prompt");
    }

    const model = requestBody.model || DEFAULT_IMAGE_MODEL;

    if (!(await isImageGenerationModel(model, this.env))) {
      throw new ValidationError(
        `Model '${model}' does not support image generation`,
        "model",
        "model_not_supported",
      );
    }

    const requestBodyForAPI: any = this.apiService.buildImageRequestBody(
      requestBody.prompt,
      model,
      requestBody.n,
      requestBody.size,
    );

    // INJEÇÃO DINÂMICA: Pegamos o que você mandou no JSON ou usamos webp como fallback
    if (!requestBodyForAPI.promptObject) {
      requestBodyForAPI.promptObject = {};
    }
    requestBodyForAPI.promptObject.output_format =
      requestBody.output_format || "webp";

    // Mapeando a compressão/qualidade (aceita os dois nomes)
    if (requestBody.output_compression || requestBody.output_quality) {
      requestBodyForAPI.promptObject.output_quality =
        requestBody.output_compression || requestBody.output_quality;
    }

    const data = await this.apiService.sendImageRequest(
      requestBodyForAPI,
      apiKey,
    );

    const openAIResponse = this.transformToOpenAIFormat(data, requestBody);
    return createSuccessResponse(openAIResponse);
  }

  private transformToOpenAIFormat(
    data: any,
    _originalRequest: ImageGenerationRequest,
  ): ImageGenerationResponse {
    const temporaryUrl = data?.aiRecord?.temporaryUrl;

    if (!temporaryUrl) {
      throw new ApiError(
        "Nenhuma URL temporaria assinada foi retornada pela API",
        500,
      );
    }

    return {
      created: Math.floor(Date.now() / 1000),
      data: [{ url: temporaryUrl }],
    };
  }
}
