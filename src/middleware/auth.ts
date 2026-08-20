import { createMiddleware } from "hono/factory";
import type { HonoEnv } from "../types/hono";
import { AuthenticationError } from "../utils/errors";

export const authMiddleware = createMiddleware<HonoEnv>(async (c, next) => {
  // Support both OpenAI-style Bearer token and Anthropic-style x-api-key
  const incomingKey =
    c.req.header("Authorization")?.replace("Bearer ", "") ||
    c.req.header("x-api-key");

  if (!incomingKey) {
    throw new AuthenticationError("API key is required");
  }

  let finalApiKey = incomingKey;

  // Se AUTH_TOKEN estiver configurado no Worker
  if (c.env.AUTH_TOKEN) {
    if (incomingKey === c.env.AUTH_TOKEN) {
      // Cliente usou a senha do proxy; usa a chave real configurada em ONE_MIN_API_KEY
      if (!c.env.ONE_MIN_API_KEY) {
        throw new AuthenticationError(
          "AUTH_TOKEN validado, mas ONE_MIN_API_KEY nao esta configurada no Worker."
        );
      }
      finalApiKey = c.env.ONE_MIN_API_KEY;
    } else if (incomingKey !== c.env.ONE_MIN_API_KEY) {
      // Nao correspondeu nem ao AUTH_TOKEN nem a ONE_MIN_API_KEY
      throw new AuthenticationError("Invalid API key");
    }
  }

  c.set("apiKey", finalApiKey);
  await next();
});
