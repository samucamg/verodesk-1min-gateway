import { createMiddleware } from "hono/factory";
import type { HonoEnv, RateLimitInfo } from "../types/hono";
import { RateLimitError } from "../utils/errors";
import { getClientId, RateLimiter } from "./rate-limit";

export const createRateLimitMiddleware = (tokenCount: number = 0) => {
  return createMiddleware<HonoEnv>(async (c, next) => {
    const rateLimiter = new RateLimiter(c.env);
    const result = await rateLimiter.middleware(c.req.raw, tokenCount);

    if (!result.allowed) {
      throw new RateLimitError("Rate limit exceeded");
    }

    const rateLimitInfo: RateLimitInfo = {
      clientId: await getClientId(c.req.raw),
      tokenCount,
      allowed: result.allowed,
      requestCount: 1,
      remaining: 0,
      resetTime: Date.now() + 60000,
    };

    c.set("rateLimitInfo", rateLimitInfo);
    await next();
  });
};

export const rateLimitMiddleware = createRateLimitMiddleware();
