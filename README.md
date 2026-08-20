# VeroDesk 1min Gateway

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/samucamg/verodesk-1min-gateway)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat-square&logo=typescript&logoColor=white)
![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-F38020?style=flat-square&logo=cloudflare&logoColor=white)
![GitHub package.json version](https://img.shields.io/github/package-json/v/samucamg/verodesk-1min-gateway)
![License](https://img.shields.io/badge/License-MIT-green.svg)

[English](#english) | [Português](#português) | [Español](#español)

A high-performance universal API gateway for the 1min.ai ecosystem. Built with TypeScript, Hono, and Cloudflare Workers, VeroDesk provides OpenAI-compatible and Anthropic-compatible interfaces, dynamic model discovery, distributed edge controls, streaming translation, and multi-engine text-to-speech.

> **Project position:** VeroDesk is an independent evolution inspired by the architectural foundations of `1min-relay-worker`. It is not presented as a fork. It preserves the proven relay, caching, token-accounting, streaming, image, and speech-to-text capabilities while extending the system with Anthropic Messages compatibility, multi-engine TTS, proxy authentication, image-output overrides, and hardened edge middleware.

---

<a id="english"></a>
## English

### Overview

**VeroDesk 1min Gateway** is a serverless edge gateway that accepts familiar OpenAI and Anthropic request contracts and translates them to the 1min.ai API ecosystem. It allows applications, SDKs, automations, and internal services to use one controlled API surface while the worker handles provider-specific payload mapping, upstream authentication, response normalization, SSE streaming, model discovery, and usage protection.

The project is suitable for OpenAI-compatible clients, Anthropic/Claude-compatible clients, n8n workflows, private frontends, server-side applications, and multi-provider AI integrations where the upstream 1min.ai credential must remain protected.

### Why VeroDesk

- **OpenAI-compatible API surface:** Chat Completions, Responses, images, audio transcription, audio translation, speech generation, and model discovery.
- **Anthropic Messages API bridge:** `POST /v1/messages` accepts Anthropic-style messages and translates requests and streaming events to the gateway pipeline.
- **Master proxy authentication:** Clients can authenticate with a gateway token while the Worker injects the protected upstream `ONE_MIN_API_KEY`.
- **Multi-engine TTS:** One OpenAI-style speech endpoint routes requests to OpenAI, Google, or ElevenLabs engines and maps engine-specific options.
- **Dynamic model registry:** Models and capabilities are obtained from the upstream provider rather than hardcoded in the repository.
- **Two-tier caching:** Isolate-memory and Cloudflare KV cache the model catalog to reduce latency and preserve a last-known-good catalog during temporary upstream failures.
- **Distributed usage controls:** Cloudflare KV-backed sliding-window controls track request volume and weighted token consumption across edge instances.
- **Streaming fidelity:** UTF-8-safe decoding and Server-Sent Events mapping preserve streaming behavior for OpenAI-style and Anthropic-style consumers.
- **Image optimization controls:** Image requests can use output format and quality overrides for supported Flux-family generation flows.
- **Edge hardening:** CORS preflight caching and security headers reduce unnecessary worker work and enforce safer browser behavior.

### Endpoint Matrix

| Method | Endpoint | Compatibility | Description |
|---|---|---|---|
| `GET` | `/` | Gateway | Health and endpoint discovery |
| `GET` | `/v1/models` | OpenAI-style | Dynamic upstream model catalog |
| `POST` | `/v1/chat/completions` | OpenAI | Chat completions, vision, and SSE streaming |
| `POST` | `/v1/responses` | OpenAI | Responses API, structured output, and reasoning controls |
| `POST` | `/v1/messages` | Anthropic | Anthropic Messages API translation and streaming |
| `POST` | `/v1/images/generations` | OpenAI | Image generation with provider-aware overrides |
| `POST` | `/v1/audio/speech` | OpenAI | Multi-engine text-to-speech |
| `POST` | `/v1/audio/transcriptions` | OpenAI | Speech-to-text using multipart form data |
| `POST` | `/v1/audio/translations` | OpenAI | Audio translation to English |

### Authentication Modes

VeroDesk supports two operational patterns. Choose one deliberately according to whether the gateway is public, private, or used by trusted server-side applications.

| Mode | Client sends | Worker behavior | Recommended use |
|---|---|---|---|
| Client-managed upstream key | A valid 1min.ai key in `Authorization: Bearer ...` | Relays the supplied credential upstream | Trusted direct clients and development |
| Master proxy mode | The gateway `AUTH_TOKEN` in `Authorization: Bearer ...` | Validates the gateway token and injects `ONE_MIN_API_KEY` upstream | n8n, frontends, internal APIs, and cost-controlled production deployments |

In master proxy mode, the upstream key is never delivered to the browser, workflow consumer, or downstream application. Treat `ONE_MIN_API_KEY` and `AUTH_TOKEN` as secrets; do not put them in source control, examples, screenshots, or client-side JavaScript.

### Dynamic Models and Capabilities

`GET /v1/models` returns the active catalog discovered from the upstream API. The gateway does not depend on a static model list. Model capabilities—such as vision, code-interpreter support, web-search support, or supported modalities—are derived from upstream model metadata when available.

The lookup follows a two-tier strategy:

1. Check the in-memory cache associated with the active Worker isolate.
2. On a memory miss, check the `MODEL_CACHE` Cloudflare KV namespace.
3. On a KV miss or expiration, request the catalog from 1min.ai and refresh the cache layers.
4. When applicable, serve the last valid cached catalog to improve resilience during transient upstream instability.

The intended cache windows are 5 minutes in memory and 1 hour in Cloudflare KV. These values reduce catalog latency while keeping model information reasonably fresh.

```bash
curl https://YOUR_WORKER_DOMAIN/v1/models \
  -H "Authorization: Bearer YOUR_GATEWAY_OR_UPSTREAM_KEY"
```

### OpenAI Chat Completions

`POST /v1/chat/completions` accepts standard OpenAI-style messages. It supports regular JSON responses and streaming responses, plus image input for vision-capable models.

```bash
curl -X POST https://YOUR_WORKER_DOMAIN/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GATEWAY_OR_UPSTREAM_KEY" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": "Explain the purpose of a distributed API gateway."
      }
    ],
    "stream": false
  }'
```

#### Vision input

For a vision-capable model, send content as an array containing text and an `image_url`. The URL may be a remote URL or a supported data URL.

```bash
curl -X POST https://YOUR_WORKER_DOMAIN/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GATEWAY_OR_UPSTREAM_KEY" \
  -d '{
    "model": "gpt-4o",
    "messages": [
      {
        "role": "user",
        "content": [
          {"type": "text", "text": "What do you see in this image?"},
          {"type": "image_url", "image_url": {"url": "https://example.com/image.jpg"}}
        ]
      }
    ]
  }'
```

#### Streaming chat

Set `stream` to `true` to receive Server-Sent Events. Consumers should process events incrementally until the terminal event is received.

```bash
curl -N -X POST https://YOUR_WORKER_DOMAIN/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GATEWAY_OR_UPSTREAM_KEY" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Tell a short story about edge computing."}],
    "stream": true
  }'
```

### OpenAI Responses API

`POST /v1/responses` supports the OpenAI Responses contract for straightforward input, conversational messages, JSON-object output, JSON Schema output, reasoning control, vision-compatible input, and streaming.

#### Simple input

```bash
curl -X POST https://YOUR_WORKER_DOMAIN/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GATEWAY_OR_UPSTREAM_KEY" \
  -d '{
    "model": "gpt-4.1",
    "input": "Write a three-sentence bedtime story about a unicorn.",
    "reasoning_effort": "medium"
  }'
```

#### Conversation input

```bash
curl -X POST https://YOUR_WORKER_DOMAIN/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GATEWAY_OR_UPSTREAM_KEY" \
  -d '{
    "model": "gpt-4.1",
    "messages": [
      {"role": "user", "content": "Analyze the advantages and drawbacks of remote work."}
    ],
    "reasoning_effort": "high"
  }'
```

#### JSON object output

```bash
curl -X POST https://YOUR_WORKER_DOMAIN/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GATEWAY_OR_UPSTREAM_KEY" \
  -d '{
    "model": "gpt-4.1",
    "input": "Summarize the benefits of regular exercise.",
    "response_format": {"type": "json_object"},
    "reasoning_effort": "high"
  }'
```

#### JSON Schema output

```bash
curl -X POST https://YOUR_WORKER_DOMAIN/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GATEWAY_OR_UPSTREAM_KEY" \
  -d '{
    "model": "gpt-4.1",
    "input": "Create a user profile for John Doe, age 30, software engineer.",
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "user_profile",
        "description": "A user profile object",
        "schema": {
          "type": "object",
          "properties": {
            "name": {"type": "string"},
            "age": {"type": "number"},
            "profession": {"type": "string"},
            "skills": {"type": "array", "items": {"type": "string"}},
            "experience_years": {"type": "number"}
          },
          "required": ["name", "age", "profession"]
        }
      }
    },
    "reasoning_effort": "high"
  }'
```

**Responses API features**

- JSON object and JSON Schema structured output modes
- Reasoning depth selection through `low`, `medium`, and `high`
- Vision-compatible content where supported by the selected model
- OpenAI-compatible SSE streaming, including a terminal completion event
- Payload normalization designed to improve structured-response reliability

### Anthropic Messages API

`POST /v1/messages` is the VeroDesk compatibility layer for Anthropic Messages API consumers. It accepts Anthropic-style message requests, converts them to the relay representation, and converts streamed output into Anthropic-oriented SSE events such as `message_start`, content block events, delta events, and terminal events.

```bash
curl -X POST https://YOUR_WORKER_DOMAIN/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_GATEWAY_OR_UPSTREAM_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-5-sonnet",
    "max_tokens": 512,
    "messages": [
      {"role": "user", "content": "Explain why cache invalidation is difficult."}
    ]
  }'
```

For streaming, include `"stream": true` and consume the response as Server-Sent Events using the Anthropic event contract. Exact model availability is dynamic; query `/v1/models` and select a model available in the upstream catalog.

### Image Generation

`POST /v1/images/generations` exposes image generation through an OpenAI-style request. Alongside standard fields such as `model`, `prompt`, `n`, and `size`, the VeroDesk image path supports output optimization overrides for applicable models.

```bash
curl -X POST https://YOUR_WORKER_DOMAIN/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GATEWAY_OR_UPSTREAM_KEY" \
  -d '{
    "model": "black-forest-labs/flux-2-klein-4b",
    "prompt": "A cinematic sunset over mountains, high detail",
    "n": 1,
    "size": "1024x1024",
    "output_format": "webp",
    "output_quality": 85
  }'
```

`output_format` and `output_quality` are translated when the selected upstream image engine supports them. This permits bandwidth-conscious responses without requiring the client to know the upstream provider-specific payload shape.

### Audio: Speech-to-Text and Translation

#### Transcription

`POST /v1/audio/transcriptions` accepts `multipart/form-data` and translates audio into text through supported Whisper or Google Speech models.

```bash
curl -X POST https://YOUR_WORKER_DOMAIN/v1/audio/transcriptions \
  -H "Authorization: Bearer YOUR_GATEWAY_OR_UPSTREAM_KEY" \
  -F "file=@audio.mp3" \
  -F "model=whisper-1" \
  -F "response_format=text"
```

| Field | Type | Required | Description |
|---|---|---:|---|
| `file` | File | Yes | Audio input such as mp3, mp4, m4a, wav, webm, ogg, or flac; upstream limits apply |
| `model` | string | Yes | Available speech-recognition model identifier |
| `language` | string | No | Language hint; use the syntax required by the selected engine |
| `prompt` | string | No | Guidance for style, vocabulary, or transcription context |
| `response_format` | string | No | Common formats include `json`, `text`, `verbose_json`, `srt`, and `vtt` |
| `temperature` | number | No | Sampling temperature when supported by the selected engine |

#### Translation

`POST /v1/audio/translations` translates spoken audio to English text. It uses the same multipart workflow as transcription, except `language` is not applicable.

```bash
curl -X POST https://YOUR_WORKER_DOMAIN/v1/audio/translations \
  -H "Authorization: Bearer YOUR_GATEWAY_OR_UPSTREAM_KEY" \
  -F "file=@foreign-audio.mp3" \
  -F "model=whisper-1"
```

#### OpenAI SDK example

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://YOUR_WORKER_DOMAIN/v1",
    api_key="YOUR_GATEWAY_OR_UPSTREAM_KEY",
)

with open("audio.mp3", "rb") as audio_file:
    transcript = client.audio.transcriptions.create(
        model="whisper-1",
        file=audio_file,
    )

print(transcript.text)
```

### Multi-Engine Text-to-Speech

`POST /v1/audio/speech` is an OpenAI-style TTS endpoint with provider-aware routing. Clients send a standard speech request; the gateway selects and translates to the appropriate OpenAI, Google, or ElevenLabs engine.

| Target engine | Representative model | Examples of translated engine-specific options |
|---|---|---|
| OpenAI | `tts-1` | Voice and output format |
| Google | `google-tts` | `speakingRate`, `pitch`, language configuration |
| ElevenLabs | `elevenlabs-tts` | `voice_settings`, stability, similarity settings |

```bash
curl -X POST https://YOUR_WORKER_DOMAIN/v1/audio/speech \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_GATEWAY_OR_UPSTREAM_KEY" \
  -d '{
    "model": "tts-1",
    "voice": "alloy",
    "input": "Hello from VeroDesk 1min Gateway.",
    "format": "mp3"
  }' \
  --output speech.mp3
```

Provider-specific fields can be included when supported by the selected target engine. For example, a Google-targeted request may contain `speakingRate` and `pitch`, while an ElevenLabs-targeted request may include a `voice_settings` object. Use model discovery and upstream availability to select valid models and voices.

### Rate Limiting and Token Accounting

VeroDesk uses a Cloudflare KV-backed sliding-window design so usage controls remain effective across globally distributed Worker instances. The policy evaluates both request volume and weighted token usage, allowing the gateway to protect upstream spend rather than merely cap HTTP calls.

The rate-limiting workflow:

1. Identifies the consumer through client IP and/or authorization credential.
2. Evaluates the active sliding-window request and token counters.
3. Calculates token usage with `gpt-tokenizer` where applicable and falls back to a heuristic when exact tokenization is not possible.
4. Persists control state in `RATE_LIMIT_STORE` with an appropriate TTL.
5. Returns an HTTP `429` response and rate-limit metadata when a policy is exceeded.

Configure actual thresholds to match your upstream subscription, expected traffic, and risk tolerance. Do not rely on a README example as a quota policy; inspect the deployed configuration before operating a public endpoint.

### CORS and Security Headers

Browser-facing deployments benefit from the middleware layer:

- Cached CORS preflight responses reduce unnecessary requests reaching endpoint handlers.
- A long preflight cache policy can be used to reduce repeated browser `OPTIONS` traffic.
- Security headers such as `X-Content-Type-Options` and `Strict-Transport-Security` help enforce safer browser behavior on HTTPS deployments.
- Gateway authentication avoids exposing the upstream billing credential to frontends and third-party workflow tools.

Restrict allowed origins in production whenever possible. A permissive CORS policy is convenient for testing but inappropriate for a publicly reachable credentialed API.

### Installation and Local Development

#### Prerequisites

- Node.js 18 or newer
- npm
- A Cloudflare account with Workers and KV enabled
- Wrangler CLI for local development or manual deployment
- A 1min.ai API key

#### Clone and install

```bash
git clone https://github.com/samucamg/verodesk-1min-gateway.git
cd verodesk-1min-gateway
npm install
```

#### Configure local secrets

Copy the local environment example and add development-only values:

```bash
cp .dev.vars.example .dev.vars
```

Use `.dev.vars` for local secrets. Keep it untracked. Configure non-secret upstream endpoint variables in `wrangler.jsonc` according to the project configuration, including the chat, feature, asset, and model endpoints when required.

A representative setup is:

```text
ONE_MIN_API_KEY=replace_with_your_upstream_key
AUTH_TOKEN=replace_with_a_long_gateway_token
```

#### Create KV namespaces

```bash
wrangler kv:namespace create "RATE_LIMIT_STORE"
wrangler kv:namespace create "MODEL_CACHE"
```

Copy the generated namespace IDs into `wrangler.jsonc`:

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

#### Start development mode

```bash
npm run dev
```

The local Worker normally listens on the URL printed by Wrangler. Replace `YOUR_WORKER_DOMAIN` in the examples with that local origin for development.

### Deploy with Cloudflare Dashboard

The preferred repository-connected deployment path is Cloudflare Dashboard, not a mandatory local CLI deployment.

1. Open **Cloudflare Dashboard** and go to **Workers & Pages**.
2. Select **Create application** and choose the GitHub repository deployment flow available for Workers.
3. Connect GitHub if prompted and select `samucamg/verodesk-1min-gateway`.
4. Review the build and deployment settings detected from the repository.
5. Create or bind the `RATE_LIMIT_STORE` and `MODEL_CACHE` KV namespaces in the Worker settings.
6. Add `ONE_MIN_API_KEY` as an encrypted secret.
7. Add `AUTH_TOKEN` as an encrypted secret if master proxy authentication is enabled.
8. Deploy and copy the generated `workers.dev` URL.
9. Call `GET /` and `GET /v1/models` to validate the deployment before connecting applications.

The deploy button at the top of this document provides a one-click alternative for the Cloudflare deployment flow.

### Manual Deployment

For environments where Wrangler is preferred:

```bash
npm run build
npm run deploy
```

Before deploying, validate the project and inspect the working tree:

```bash
npx tsc --noEmit
git diff --check
git status
```

### Custom Domain

To expose the gateway as `api.example.com` rather than only through `workers.dev`:

1. Ensure the domain is active in Cloudflare and DNS is managed by Cloudflare.
2. Open **Workers & Pages** and select the deployed VeroDesk Worker.
3. Open **Triggers**.
4. Under **Custom Domains**, select **Add Custom Domain**.
5. Enter `api.example.com` and complete the configuration.
6. Update clients to use `https://api.example.com/v1` as their OpenAI-compatible base URL.

Cloudflare provisions TLS and routes the custom domain to the Worker during this configuration flow.

### Operational Validation

Run these checks after a configuration or deployment change:

```bash
npx tsc --noEmit
npm run build
curl -i https://YOUR_WORKER_DOMAIN/
curl -i https://YOUR_WORKER_DOMAIN/v1/models \
  -H "Authorization: Bearer YOUR_GATEWAY_OR_UPSTREAM_KEY"
```

Review the following before making the gateway public:

- KV bindings resolve correctly in the target environment.
- `ONE_MIN_API_KEY` and `AUTH_TOKEN` are configured as secrets, not committed variables.
- CORS origins are restricted for browser deployments.
- Model discovery returns expected upstream models.
- A chat request, an SSE request, an audio request, and an image request complete successfully.
- Rate-limit behavior is tested with non-production credentials.

### Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| `401` or `403` | Missing, invalid, or mismatched gateway/upstream credential | Verify `Authorization`, `AUTH_TOKEN`, and `ONE_MIN_API_KEY` mode |
| `429` | Request or token usage policy exceeded | Inspect rate-limit configuration and KV binding |
| Model is unavailable | Dynamic upstream catalog changed | Call `GET /v1/models`; do not rely on a hardcoded model ID |
| KV binding error | Namespace missing or binding ID is wrong | Check `wrangler.jsonc` and Worker production bindings |
| Browser CORS failure | Origin is not permitted or preflight is blocked | Review CORS middleware and allowed origins |
| Streaming corruption or no incremental output | Client is buffering SSE or expects the wrong event contract | Use `curl -N`; verify whether the consumer expects OpenAI or Anthropic events |
| TTS parameter rejected | Engine-specific setting used with an incompatible target | Select the target engine/model and send only supported settings |
| Deployment build failure | Dependencies or TypeScript configuration are inconsistent | Run `npm install`, `npx tsc --noEmit`, and `npm run build` locally |

### Architecture

```text
OpenAI SDK / Anthropic SDK / n8n / Frontend / Server
                         |
                         v
              Cloudflare Worker + Hono Router
                         |
      +------------------+-------------------+
      |                  |                   |
      v                  v                   v
 Auth Middleware     CORS/Security       Rate Limiter
 Master Proxy        Preflight Cache     Cloudflare KV
      |                                      |
      +------------------+-------------------+
                         v
      Chat | Responses | Messages | Images | Audio | Models
                         |
                         v
                 Payload / SSE Translators
                         |
                         v
                    1min.ai Upstream APIs
                         |
                         v
      OpenAI, Anthropic, Google, ElevenLabs, Flux, Whisper
```

### Technology Stack

- **TypeScript:** typed application code and maintainable endpoint contracts
- **Hono:** lightweight routing and edge middleware composition
- **Cloudflare Workers:** serverless execution close to clients
- **Cloudflare KV:** distributed model cache and rate-limit state
- **gpt-tokenizer:** token-accounting support and fallback usage estimation
- **Server-Sent Events:** real-time response streaming

### Contributing

1. Fork the repository or create a feature branch.
2. Keep endpoint compatibility changes documented with request and response examples.
3. Run type validation and build checks.
4. Add or update tests when applicable.
5. Open a pull request with a focused description of the architectural impact.

### License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

<a id="português"></a>
## Português

### Visão Geral

O **VeroDesk 1min Gateway** é um gateway universal, serverless e executado na borda com Cloudflare Workers. Ele recebe contratos compatíveis com OpenAI e Anthropic, traduz payloads para o ecossistema 1min.ai e centraliza autenticação, descoberta de modelos, streaming, controle de consumo e roteamento de recursos multimodais.

O projeto é uma evolução independente inspirada na base arquitetural do `1min-relay-worker`. Ele preserva as capacidades de relay, cache, rate limiting, contagem de tokens, streaming, imagens e STT, e amplia a proposta com suporte à Messages API da Anthropic, TTS multi-motor, autenticação de proxy, otimizações de imagem e middleware de borda endurecido.

### Funcionalidades

- **Compatibilidade OpenAI:** `/v1/chat/completions`, `/v1/responses`, `/v1/images/generations`, endpoints de áudio e `/v1/models`.
- **Compatibilidade Anthropic:** `/v1/messages` traduz requisições e eventos SSE no padrão da Messages API.
- **Autenticação dual:** o cliente pode usar sua chave upstream ou um `AUTH_TOKEN`; no modo proxy, o Worker injeta `ONE_MIN_API_KEY` sem expor a credencial de faturamento.
- **TTS multi-motor:** `/v1/audio/speech` roteia para OpenAI, Google ou ElevenLabs e traduz opções específicas, como `speakingRate`, `pitch` e `voice_settings`.
- **Cache de modelos em duas camadas:** memória do isolate por cerca de 5 minutos e Cloudflare KV por cerca de 1 hora.
- **Rate limiting distribuído:** janela deslizante no KV por IP e/ou chave de autorização, ponderada por volume de requisições e tokens.
- **Responses API estruturada:** saídas em JSON, JSON Schema, esforço de raciocínio e streaming SSE.
- **Visão e imagens:** entrada de imagem em chat e geração de imagens com `output_format` e `output_quality` quando suportados pelo motor selecionado.
- **Áudio:** transcrição, tradução e síntese de voz com contratos compatíveis com clientes OpenAI.
- **Segurança de borda:** cache de preflight CORS e headers de segurança para reduzir carga e fortalecer consumo via navegador.

### Início rápido

```bash
git clone https://github.com/samucamg/verodesk-1min-gateway.git
cd verodesk-1min-gateway
npm install
cp .dev.vars.example .dev.vars

wrangler kv:namespace create "RATE_LIMIT_STORE"
wrangler kv:namespace create "MODEL_CACHE"

npm run dev
```

Cadastre os IDs dos namespaces KV em `wrangler.jsonc`. Para execução protegida, configure `ONE_MIN_API_KEY` e `AUTH_TOKEN` como segredos no ambiente Cloudflare; jamais os versione no repositório.

### Deploy pelo Dashboard Cloudflare

1. Acesse **Workers & Pages** no painel Cloudflare.
2. Crie um Worker a partir do repositório GitHub `samucamg/verodesk-1min-gateway`.
3. Configure os bindings `RATE_LIMIT_STORE` e `MODEL_CACHE`.
4. Adicione `ONE_MIN_API_KEY` como secret.
5. Adicione `AUTH_TOKEN` como secret caso utilize o modo master proxy.
6. Faça o deploy e valide `GET /` e `GET /v1/models`.

O botão **Deploy to Cloudflare** no início deste documento é a alternativa de implantação com um clique.

### Domínio personalizado

No Worker implantado, abra **Triggers** em **Workers & Pages**, escolha **Add Custom Domain** e informe, por exemplo, `api.seudominio.com.br`. Com o DNS gerenciado pela Cloudflare, o TLS e o roteamento são provisionados durante o fluxo.

### Uso com SDK OpenAI

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://api.seudominio.com.br/v1",
    api_key="SEU_AUTH_TOKEN",
)

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Olá, VeroDesk."}],
)

print(response.choices[0].message.content)
```

Consulte as seções em inglês para a matriz completa de endpoints, exemplos de `curl`, parâmetros de áudio, JSON Schema, Anthropic Messages API, arquitetura e diagnóstico.

---

<a id="español"></a>
## Español

### Resumen

**VeroDesk 1min Gateway** es un gateway universal y serverless ejecutado en Cloudflare Workers. Recibe contratos compatibles con OpenAI y Anthropic, traduce solicitudes al ecosistema 1min.ai y concentra autenticación, catálogo dinámico de modelos, streaming, control de consumo y enrutamiento multimodal.

Es una evolución independiente inspirada en la arquitectura de `1min-relay-worker`, no un fork presentado como tal. Mantiene relay, caché, límites distribuidos, conteo de tokens, streaming, imágenes y STT, y añade Anthropic Messages API, TTS multi-motor, autenticación proxy, controles de salida de imágenes y middleware de edge reforzado.

### Capacidades

- API compatible con OpenAI para chat, Responses, imágenes, audio y modelos.
- Puente para Anthropic Messages API mediante `POST /v1/messages`.
- Modo proxy con `AUTH_TOKEN`, que protege `ONE_MIN_API_KEY` frente a clientes finales.
- TTS desde un único endpoint para OpenAI, Google y ElevenLabs.
- Caché de modelos de dos niveles: memoria del isolate y Cloudflare KV.
- Ventana deslizante distribuida para solicitudes y uso ponderado de tokens.
- JSON Schema, objetos JSON, razonamiento y streaming SSE en Responses API.
- Transcripción, traducción y síntesis de audio; visión e imágenes con optimizaciones cuando el motor las admite.

### Implementación

```bash
git clone https://github.com/samucamg/verodesk-1min-gateway.git
cd verodesk-1min-gateway
npm install

wrangler kv:namespace create "RATE_LIMIT_STORE"
wrangler kv:namespace create "MODEL_CACHE"

npm run dev
```

Configura los IDs de KV en `wrangler.jsonc` y guarda `ONE_MIN_API_KEY` y `AUTH_TOKEN` como secretos de Cloudflare. Para desplegar desde GitHub, crea un Worker en **Workers & Pages**, selecciona el repositorio, enlaza los namespaces KV, añade los secretos y publica.

Consulta la sección en inglés para contratos completos de endpoints, ejemplos de solicitudes, configuración de dominio personalizado, diagnóstico y detalles de arquitectura.
