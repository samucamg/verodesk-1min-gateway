import { cors } from "hono/cors";
import { createMiddleware } from "hono/factory";

const baseCors = cors({
  origin: "*",
  allowMethods: ["GET", "POST", "OPTIONS"],
  allowHeaders: [
    "Content-Type",
    "Authorization",
    "x-api-key",
    "anthropic-version",
  ],
  exposeHeaders: [
    "X-RateLimit-Limit", 
    "X-RateLimit-Remaining", 
    "X-RateLimit-Reset"
  ],
  maxAge: 86400, // Cache de preflight por 24 horas (economiza requisicoes no Worker)
});

export const corsMiddleware = createMiddleware(async (c, next) => {
  // Executa o CORS padrao e aguarda a resolucao da rota
  await baseCors(c, next);
  
  // Injeta headers de seguranca estritos na resposta final
  c.res.headers.set("X-Content-Type-Options", "nosniff");
  c.res.headers.set("X-Frame-Options", "DENY");
  c.res.headers.set("X-XSS-Protection", "1; mode=block");
  c.res.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
});
