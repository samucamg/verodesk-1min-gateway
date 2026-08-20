import { createMiddleware } from "hono/factory";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { HonoEnv } from "../types/hono";
import { toAnthropicError, toOpenAIError } from "../utils/errors";

export const errorHandler = createMiddleware<HonoEnv>(async (c, next) => {
  try {
    await next();
  } catch (error) {
    console.error("Request error:", {
      error: error,
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      type: error?.constructor?.name,
      url: c.req.url,
      method: c.req.method,
    });

    // Return Anthropic format for /v1/messages paths
    const path = new URL(c.req.url).pathname;
    if (path.startsWith("/v1/messages")) {
      const errorData = toAnthropicError(error);
      return c.json(
        {
          type: "error",
          error: {
            type: errorData.type,
            message: errorData.message,
          },
        },
        errorData.status as ContentfulStatusCode,
      );
    }

    // Use the unified error handler for consistent OpenAI API format
    const errorData = toOpenAIError(error);

    return c.json(
      {
        error: {
          message: errorData.message,
          type: errorData.type,
          param: errorData.param,
          code: errorData.code,
        },
      },
      errorData.status as ContentfulStatusCode,
    );
  }
});
