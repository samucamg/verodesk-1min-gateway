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
    const requestBody: ImageGenerationRequest = await request.json();

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

    const requestBodyForAPI = this.apiService.buildImageRequestBody(
      requestBody.prompt,
      model,
      requestBody.n,
      requestBody.size,
    );

    const data = await this.apiService.sendImageRequest(
      requestBodyForAPI,
      apiKey,
    );

    const openAIResponse = this.transformToOpenAIFormat(data, requestBody);
    return createSuccessResponse(openAIResponse);
  }

  private transformToOpenAIFormat(
    data: OneMinImageResponse,
    _originalRequest: ImageGenerationRequest,
  ): ImageGenerationResponse {
    const imageUrls = data.aiRecord?.aiRecordDetail?.resultObject;

    if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
      throw new ApiError("No image URLs found in API response", 500);
    }

    return {
      created: Math.floor(Date.now() / 1000),
      data: imageUrls.map((url: string) => ({ url })),
    };
  }
}
