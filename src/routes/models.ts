import { Hono } from "hono";
import { handleModelsEndpoint } from "../handlers";
import { authMiddleware } from "../middleware/auth";
import type { ModelsResponse } from "../types";
import type { HonoEnv } from "../types/hono";

const app = new Hono<HonoEnv>();

app.get("/", authMiddleware, async (c) => {
  const response = await handleModelsEndpoint(c.env);
  const data = (await response.json()) as ModelsResponse;
  return c.json(data);
});

export default app;
