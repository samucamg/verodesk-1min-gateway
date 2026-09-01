import { Hono } from "hono";
import type { HonoEnv } from "../types/hono";

const app = new Hono<HonoEnv>();

app.get("/", (c) => {
  const origin = new URL(c.req.url).origin;
  return c.text(
    "Congratulations! Your API is working! You can now make requests to the API.\n\n" +
      "Available endpoints:\n" +
      `- Chat Completions: ${origin}/v1/chat/completions\n` +
      `- Responses: ${origin}/v1/responses\n` +
      `- Image Generation: ${origin}/v1/images/generations\n` +
      `- Audio Speech (TTS): ${origin}/v1/audio/speech\n` +
      `- Audio Transcriptions: ${origin}/v1/audio/transcriptions\n` +
      `- Audio Translations: ${origin}/v1/audio/translations\n` +
      `- Models: ${origin}/v1/models`,
  );
});

export default app;
