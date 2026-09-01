# 1min-Relay Universal API Gateway

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/7a6163/1min-relay-worker)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-F38020?style=flat-square&logo=cloudflare&logoColor=white)

[English](#english) | [Português](#português) | [Español](#español)

---

<a id="english"></a>
## English

### Enterprise-Grade Universal OpenAI Wrapper

**1min-Relay Gateway** is a high-performance serverless middleware built on Cloudflare Workers. It acts as a universal adapter between OpenAI-compatible clients and the proprietary 1min.ai API ecosystem.

The gateway preserves a strict, client-friendly OpenAI-compatible interface while translating payloads, provider-specific options, authentication, streaming semantics, and response formats upstream. It is designed for scalable edge execution with distributed caching, multi-engine audio routing, and global rate limiting.

### Architecture Highlights

- **Flexible universal wrapper:** Strict 1:1 mapping of OpenAI-style requests for chat, images, audio, and the Responses API, including structured outputs backed by JSON Schema.
- **Provider-agnostic multi-engine TTS:** A single standard endpoint dynamically translates requests to OpenAI, Google, and ElevenLabs TTS engines while preserving engine-specific options.
- **Two-tier distributed cache:** Combines isolate-memory caching with Cloudflare KV edge storage to reduce model-catalog latency and provide resilience during upstream instability.
- **Global edge rate limiting:** A Cloudflare KV sliding-window limiter tracks request volume and weighted generated-token consumption by client IP and authorization key.
- **Precision token accounting:** Uses `gpt-tokenizer` as a fallback heuristic for consistent usage metering and cost-auditing workflows.
- **Structured Responses API:** Supports JSON Schema constrained output and configurable reasoning effort (`low`, `medium`, `high`).
- **Resilient streaming:** UTF-8-safe decoding and SSE event mapping maintain real-time streaming integrity without character corruption.

### Supported Endpoints

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/v1/models` | Dynamic model catalog |
| `POST` | `/v1/chat/completions` | Chat and vision-compatible completions |
| `POST` | `/v1/responses` | Structured outputs and Responses API requests |
| `POST` | `/v1/images/generations` | Image generation, including Flux-family models |
| `POST` | `/v1/audio/speech` | Multi-engine TTS routing |
| `POST` | `/v1/audio/transcriptions` | Speech-to-text transcription |
| `POST` | `/v1/audio/translations` | Audio translation |

### TTS Routing

Clients send requests to `POST /v1/audio/speech` using a familiar OpenAI-style contract. The gateway identifies the target engine and translates supported parameters before forwarding the request.

| Engine | Typical model identifier | Example provider-specific settings |
|---|---|---|
| OpenAI | `tts-1` | Voice and format options |
| Google | `google-tts` | `speakingRate`, pitch, language settings |
| ElevenLabs | `elevenlabs-tts` | `voice_settings`, stability, similarity options |

Example request:

```bash
curl https://api.example.com/v1/audio/speech \
  -X POST \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "tts-1",
    "voice": "alloy",
    "input": "Hello from the 1min-Relay Gateway."
  }' \
  --output speech.mp3
```

### Two-Tier Model Cache

The model registry is dynamically retrieved from the upstream provider rather than maintained as a static list in source code.

1. The worker checks its in-memory isolate cache.
2. On a miss, it checks the Cloudflare KV model cache.
3. If no valid cached catalog exists, it requests the catalog from the upstream API and refreshes the cache layers.

The intended cache policy is a short-lived in-memory cache (for example, 5 minutes) paired with a longer-lived Cloudflare KV cache (for example, 1 hour). This design lowers latency for fixed or slowly changing catalogs and provides a last-known-good response when the upstream catalog is temporarily unavailable.

### Rate Limiting and Usage Control

Rate limiting uses a sliding-window strategy backed by Cloudflare KV. Limits can be evaluated per IP address and authorization key, enabling protection against both anonymous abuse and key-specific bursts.

The limiter can account for more than request count: generated-token consumption can be weighted into the same policy, supporting quotas that more closely reflect actual model usage.

### Prerequisites

- Node.js and npm
- A Cloudflare account
- Wrangler CLI access authenticated for the target Cloudflare account
- Cloudflare KV namespaces for rate limiting and model caching
- Upstream 1min.ai API credentials and endpoint configuration

### Installation

```bash
git clone https://github.com/7a6163/1min-relay-worker.git
cd 1min-relay-worker
npm install
```

### Cloudflare KV Setup

Create the namespaces required by the worker:

```bash
wrangler kv:namespace create "RATE_LIMIT_STORE"
wrangler kv:namespace create "MODEL_CACHE"
```

Copy the generated namespace IDs into `wrangler.jsonc`. Configure bindings and environment variables according to the project's configuration contract. Do not commit API keys or other secrets to the repository.

A representative binding layout is:

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "RATE_LIMIT_STORE",
      "id": "YOUR_RATE_LIMIT_NAMESPACE_ID"
    },
    {
      "binding": "MODEL_CACHE",
      "id": "YOUR_MODEL_CACHE_NAMESPACE_ID"
    }
  ]
}
```

### Validation and Deployment

Validate TypeScript before deployment:

```bash
npx tsc --noEmit
```

Deploy to Cloudflare Workers:

```bash
npm run deploy
```

### Custom Domain

To expose the gateway through a domain such as `api.yourdomain.com` instead of the default `workers.dev` address:

1. Ensure the domain is active in Cloudflare and its DNS is managed by Cloudflare.
2. Open **Workers & Pages** in the Cloudflare Dashboard.
3. Select the deployed worker.
4. Open the **Triggers** tab.
5. Under **Custom Domains**, select **Add Custom Domain**.
6. Enter `api.yourdomain.com` and complete the flow.

Cloudflare provisions TLS and routes the domain to the Worker as part of the custom-domain configuration.

---

<a id="português"></a>
## Português

### Wrapper Universal OpenAI de Nível Corporativo

O **1min-Relay Gateway** é um middleware serverless de alta performance executado em Cloudflare Workers. Ele atua como um adaptador universal entre clientes compatíveis com OpenAI e o ecossistema proprietário da API 1min.ai.

O gateway mantém uma interface compatível com o padrão OpenAI e traduz payloads, opções específicas de provedores, autenticação, streaming e formatos de resposta para o upstream. A arquitetura foi projetada para execução na borda, cache distribuído, roteamento de áudio multi-motor e rate limiting global.

### Diferenciais Arquiteturais

- **Wrapper universal flexível:** Mapeamento rigoroso de requisições no padrão OpenAI para chat, imagens, áudio e Responses API, incluindo saídas estruturadas com JSON Schema.
- **Roteamento TTS multi-motor:** Um único endpoint padrão traduz dinamicamente requisições para os motores de TTS da OpenAI, Google e ElevenLabs, incluindo propriedades específicas de cada provedor.
- **Cache distribuído em duas camadas:** Combina cache em memória no isolate com Cloudflare KV na borda para reduzir a latência do catálogo de modelos e aumentar a resiliência contra indisponibilidade upstream.
- **Rate limiting global na borda:** Limitador em janela deslizante baseado em Cloudflare KV, capaz de rastrear requisições e consumo ponderado de tokens por IP e chave de autorização.
- **Contagem precisa de tokens:** Integração com `gpt-tokenizer` como heurística de fallback para medição de uso e auditoria de custos.
- **Responses API estruturada:** Suporte a respostas restritas por JSON Schema e ao controle de esforço de raciocínio (`low`, `medium`, `high`).
- **Streaming resiliente:** Decodificação segura de UTF-8 e mapeamento de eventos SSE para transmissão de tokens em tempo real sem corrupção de caracteres.

### Endpoints Suportados

| Método | Endpoint | Finalidade |
|---|---|---|
| `GET` | `/v1/models` | Catálogo dinâmico de modelos |
| `POST` | `/v1/chat/completions` | Chat e conclusões compatíveis com visão |
| `POST` | `/v1/responses` | Saídas estruturadas e requisições da Responses API |
| `POST` | `/v1/images/generations` | Geração de imagens, incluindo modelos da família Flux |
| `POST` | `/v1/audio/speech` | Roteamento TTS multi-motor |
| `POST` | `/v1/audio/transcriptions` | Transcrição de fala para texto |
| `POST` | `/v1/audio/translations` | Tradução de áudio |

### Cache de Modelos em 2 Camadas

O registro de modelos é obtido dinamicamente do provedor upstream, em vez de depender de uma lista estática no código-fonte.

1. O Worker consulta primeiro o cache em memória do isolate.
2. Em caso de ausência, consulta o cache de modelos no Cloudflare KV.
3. Sem um catálogo válido em cache, consulta a API upstream e atualiza as camadas de cache.

A política prevista usa cache em memória de curta duração, por exemplo 5 minutos, associado a cache mais duradouro no Cloudflare KV, por exemplo 1 hora. Isso reduz a latência do catálogo e preserva uma resposta válida conhecida caso o upstream esteja temporariamente indisponível.

### Configuração e Deploy

```bash
git clone https://github.com/7a6163/1min-relay-worker.git
cd 1min-relay-worker
npm install

wrangler kv:namespace create "RATE_LIMIT_STORE"
wrangler kv:namespace create "MODEL_CACHE"

npx tsc --noEmit
npm run deploy
```

Após criar os namespaces, atualize o `wrangler.jsonc` com os IDs gerados e configure as variáveis de ambiente e credenciais da API upstream. Nunca versione chaves de API ou segredos no repositório.

### Domínio Personalizado

Para servir a API em um domínio como `api.seudominio.com.br`:

1. Confirme que o domínio está ativo e que o DNS é gerenciado pela Cloudflare.
2. Abra **Workers & Pages** no painel da Cloudflare.
3. Selecione o Worker implantado.
4. Acesse a aba **Triggers**.
5. Em **Custom Domains**, clique em **Add Custom Domain**.
6. Informe `api.seudominio.com.br` e conclua o fluxo de configuração.

A Cloudflare provisionará o TLS e direcionará o domínio para o Worker.

---

<a id="español"></a>
## Español

### Wrapper Universal OpenAI de Nivel Empresarial

**1min-Relay Gateway** es un middleware serverless de alto rendimiento construido sobre Cloudflare Workers. Funciona como un adaptador universal entre clientes compatibles con OpenAI y el ecosistema propietario de la API 1min.ai.

Mantiene una interfaz compatible con OpenAI mientras traduce payloads, autenticación, opciones específicas de proveedores, streaming y formatos de respuesta hacia el upstream. La solución incluye caché distribuida, enrutamiento TTS multi-motor y control de tasa global en el edge.

### Capacidades Principales

- **Wrapper universal:** Traducción estricta de solicitudes de chat, imágenes, audio y Responses API con soporte de JSON Schema.
- **TTS multi-motor:** El endpoint `/v1/audio/speech` dirige solicitudes a OpenAI, Google o ElevenLabs y adapta los parámetros de cada motor.
- **Caché de dos niveles:** Memoria del isolate y Cloudflare KV reducen latencia y mejoran la resiliencia ante fallos temporales del upstream.
- **Rate limiting distribuido:** Ventana deslizante en Cloudflare KV para solicitudes y consumo ponderado de tokens por IP y clave de autorización.
- **Streaming confiable:** Decodificación UTF-8 y mapeo SSE para preservar la integridad de la transmisión en tiempo real.

### Inicio Rápido

```bash
git clone https://github.com/7a6163/1min-relay-worker.git
cd 1min-relay-worker
npm install
wrangler kv:namespace create "RATE_LIMIT_STORE"
wrangler kv:namespace create "MODEL_CACHE"
npx tsc --noEmit
npm run deploy
```

Configura los IDs de KV, las variables de entorno y las credenciales upstream en `wrangler.jsonc` antes del despliegue. Mantén las claves y secretos fuera del control de versiones.

### Licencia

Consulta el archivo de licencia del repositorio, si está disponible.
