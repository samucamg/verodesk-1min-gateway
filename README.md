<div align="center">

# VeroDesk 1min Gateway

### Universal serverless AI gateway for the 1min.ai ecosystem
### Gateway universal de IA, serverless, para o ecossistema 1min.ai

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/samucamg/verodesk-1min-gateway)

[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?style=for-the-badge&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Hono](https://img.shields.io/badge/Hono-E36002?style=for-the-badge&logo=hono&logoColor=white)](https://hono.dev/)
[![1min.ai](https://img.shields.io/badge/1min.ai-AI_Platform-6C47FF?style=for-the-badge)](https://1min.ai/)

[![Version](https://img.shields.io/github/package-json/v/samucamg/verodesk-1min-gateway?label=version&color=0ea5e9)](https://github.com/samucamg/verodesk-1min-gateway/releases)
[![License](https://img.shields.io/badge/license-MIT-22c55e)](LICENSE)
[![OpenAI Compatible](https://img.shields.io/badge/OpenAI-compatible-412991?logo=openai&logoColor=white)](#-openai-compatible-api)
[![Anthropic Compatible](https://img.shields.io/badge/Anthropic-compatible-191919)](#-anthropic-messages-api)

**[🇺🇸 English](#english) · [🇧🇷 Português](#portugues)**

</div>

---

<a id="english"></a>
# 🇺🇸 English

## ✨ Overview

**VeroDesk 1min Gateway** is a serverless, edge-native API gateway that makes the 1min.ai ecosystem available through familiar OpenAI-compatible and Anthropic-compatible contracts. It centralizes upstream credentials, dynamically discovers models, translates payloads and streaming events, and exposes chat, structured responses, image generation, transcription, translation, and multi-engine text-to-speech through a single controlled endpoint.

Built with TypeScript, Hono, and Cloudflare Workers, it is suited to SDKs, n8n workflows, private frontends, backend services, and multi-provider AI applications that need to protect upstream credentials while retaining a straightforward client integration.

| [![OpenAI](https://img.shields.io/badge/🔌-OpenAI_compatible-412991?style=flat-square)](#-openai-compatible-api) | [![Anthropic](https://img.shields.io/badge/🧩-Anthropic_bridge-191919?style=flat-square)](#-anthropic-messages-api) | [![Security](https://img.shields.io/badge/🔐-Protected_credentials-16a34a?style=flat-square)](#-authentication-and-secrets) | [![Streaming](https://img.shields.io/badge/⚡-SSE_streaming-f59e0b?style=flat-square)](#-models-streaming-cache-and-limits) |
|---|---|---|---|
| Chat, Responses, images, audio, models | `POST /v1/messages` | Master proxy with `AUTH_TOKEN` | OpenAI and Anthropic events |

## 🚀 One-click Cloudflare deploy

> **Recommended installation path.** No terminal, local clone, or Wrangler installation is required. The deployment flow creates a copy of the repository in GitHub and deploys the Worker in Cloudflare.

<div align="center">

## [Deploy your VeroDesk instance to Cloudflare](https://deploy.workers.cloudflare.com/?url=https://github.com/samucamg/verodesk-1min-gateway)

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/samucamg/verodesk-1min-gateway)

</div>

### 📋 Prerequisites

- A GitHub account to create the repository copy during the deployment flow.
- A Cloudflare account with Workers and KV access.
- A valid 1min.ai API key to use as `ONE_MIN_API_KEY`.

### 🧩 Fill in the deployment form

The animation below shows the one-click deployment form and its required values:

![Animated Cloudflare deployment form: project name, two KV namespaces, 1min.ai key, and authentication token](https://cdn.jsdelivr.net/gh/samucamg/imagens/Ingles-Curso/2026/08/1mim-deploy-cloudflare_1787339418.gif)

> 📌 **Use three distinct names.** The Worker/project name and both KV namespace names identify different Cloudflare resources, so they cannot be the same.

| Field | Safe example | Purpose |
|---|---|---|
| **Project name** | `verodesk-1min-gateway` | Must be unique in your Cloudflare account; it is used in the Worker name and default `workers.dev` URL. |
| **Rate-limit KV namespace** | `verodesk-rate-limit-store` | Stores distributed rate-limit state. Must differ from the project and model-cache names. |
| **Model-cache KV namespace** | `verodesk-model-cache` | Stores the dynamic model catalog cache. Must differ from the other two names. |
| **`ONE_MIN_API_KEY`** | Your 1min.ai API key | Protected upstream billing credential. |
| **`AUTH_TOKEN`** | A long random secret | Private token clients use to access your gateway in master proxy mode. |
| **`ONE_MIN_CHAT_API_URL`** | `https://api.1min.ai/api/chat-with-ai` | Keep the deployment form default unless 1min.ai documents a change. |

### 🔑 Generate a secure gateway token

`AUTH_TOKEN` is your gateway password, not your 1min.ai key. Store it in a password manager and never expose it to untrusted users. Use at least 16 characters, including upper-case letters, lower-case letters, and numbers.

```bash
openssl rand -base64 24 | tr -d '\n' | tr '+/' 'Aa' | cut -c1-24
```

### ✅ After deploy

1. Copy the Worker URL, usually `https://PROJECT.YOUR-SUBDOMAIN.workers.dev`.
2. Open `https://YOUR_WORKER_URL/` to check the health response.
3. Test the dynamic catalog with `GET /v1/models`.
4. Set your client base URL to `https://YOUR_WORKER_URL/v1`.

```bash
curl https://YOUR_WORKER_URL/v1/models \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN"
```

## 🧰 Main features

- **🔌 OpenAI compatibility:** Chat Completions, Responses API, images, audio transcription, audio translation, speech generation, and model discovery.
- **🧩 Anthropic compatibility:** `POST /v1/messages` translates Anthropic Messages API requests and SSE events.
- **🔐 Master proxy:** `AUTH_TOKEN` lets clients access the gateway without ever receiving `ONE_MIN_API_KEY`.
- **🔊 Multi-engine TTS:** one OpenAI-style endpoint routes requests to OpenAI, Google, or ElevenLabs engines.
- **🧠 Dynamic models:** model IDs and available capabilities are obtained from the upstream catalog.
- **⚡ Distributed controls:** Cloudflare KV stores a sliding-window rate limit for requests and weighted token usage.
- **💾 Two-tier cache:** isolate memory and KV cache the model catalog for speed and upstream resilience.
- **🌊 Streaming translation:** UTF-8-safe SSE handling for OpenAI-style and Anthropic-style consumers.
- **🖼️ Image controls:** supported image flows accept `output_format` and `output_quality` overrides.
- **🛡️ Edge protection:** cached CORS preflight handling and security headers for browser-facing deployments.
- **🛠️ ReAct tool-calling emulation:** OpenAI and Anthropic tool definitions are converted into a controlled ReAct prompt when the selected upstream model does not provide native tool calls. The gateway parses balanced JSON, strips `<think>` output, returns OpenAI `tool_calls` or Anthropic `tool_use`, and accepts the corresponding tool-result turn.
- **🌐 Native web search and optional web hub:** append `:online` to a model ID to request 1min.ai native web search where supported. Optional protected routes expose `POST /v1/search` through SearXNG and `POST /v1/web/fetch` through Jina Reader.

## 🗺️ Endpoint matrix

| Method | Endpoint | Compatibility | Description |
|---|---|---|---|
| `GET` | `/` | Gateway | Health check and endpoint discovery |
| `GET` | `/v1/models` | OpenAI-style | Dynamic upstream model catalog |
| `POST` | `/v1/chat/completions` | OpenAI | Chat, vision input, and SSE streaming |
| `POST` | `/v1/responses` | OpenAI | Structured Responses API and reasoning controls |
| `POST` | `/v1/messages` | Anthropic | Messages API translation and streaming |
| `POST` | `/v1/images/generations` | OpenAI | Image generation |
| `POST` | `/v1/audio/speech` | OpenAI | Multi-engine text-to-speech |
| `POST` | `/v1/audio/transcriptions` | OpenAI | Multipart speech-to-text |
| `POST` | `/v1/audio/translations` | OpenAI | Audio translation to English |
| `POST` | `/v1/search` | Gateway | Optional SearXNG web search hub |
| `POST` | `/v1/web/fetch` | Gateway | Optional Jina Reader URL-content extraction |

## 🔐 Authentication and secrets

| Mode | Client sends | Worker behavior | Best for |
|---|---|---|---|
| Client-managed upstream key | 1min.ai key in `Authorization: Bearer ...` | Relays the supplied credential upstream | Development and fully trusted direct clients |
| Master proxy | Gateway `AUTH_TOKEN` in `Authorization: Bearer ...` | Validates the token and injects `ONE_MIN_API_KEY` upstream | n8n, frontends, internal APIs, and production |

In master proxy mode, keep `ONE_MIN_API_KEY` only in Cloudflare secrets. Never add it to commits, README examples, screenshots, frontend JavaScript, or URLs.

### Optional web-hub secrets

The built-in `:online` suffix uses the upstream 1min.ai web-search capability when that capability is available for the selected model. The optional direct endpoints are independent of that suffix: `/v1/search` needs a reachable SearXNG instance, while `/v1/web/fetch` uses Jina Reader. Configure the SearXNG values only when you intend to expose `/v1/search`:

```bash
npx wrangler secret put SEARXNG_URL
npx wrangler secret put SEARXNG_SECRET
```

Do not expose an unauthenticated SearXNG deployment through this Worker. Both optional routes should remain behind the same gateway authentication middleware as the model routes.

### 🔄 Credential rotation

If either credential is exposed: revoke or regenerate it, update the corresponding Cloudflare secret, redeploy if necessary, update authorized applications, and inspect usage and logs.

## 🧠 Models, streaming, cache, and limits

`GET /v1/models` returns the live catalog discovered from 1min.ai. Model capabilities—including vision, code-interpreter support, web search, and modalities—are derived from upstream metadata when available. Always query this endpoint before hard-coding a model identifier.

### 💾 Model-cache strategy

1. The Worker checks memory in the active isolate.
2. On a miss, it checks the `MODEL_CACHE` Cloudflare KV namespace.
3. On a KV miss or expiration, it requests the catalog from 1min.ai and refreshes both layers.
4. A previously valid catalog can be served during a transient upstream failure.

The intended cache windows are approximately 5 minutes in memory and 1 hour in KV.

### 🚦 Rate limiting and token accounting

Cloudflare KV-backed sliding windows identify a consumer by IP and/or authorization credential, evaluate request and weighted-token counters, persist state in `RATE_LIMIT_STORE`, and return HTTP `429` when the active policy is exceeded. Token usage uses `gpt-tokenizer` where applicable, with a heuristic fallback.

Configure real limits according to your upstream plan, expected traffic, and risk tolerance; README values are not a production quota policy.

### 🌊 SSE streaming

Set `stream: true` to receive incremental Server-Sent Events. Use `curl -N` in terminal tests so the client does not buffer the response.

## 💬 OpenAI-compatible API

### ✍️ Chat Completions

```bash
curl -X POST https://YOUR_WORKER_URL/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Explain the purpose of a distributed API gateway."}],
    "stream": false
  }'
```

### 🛠️ Function calling and tool results

Pass standard OpenAI `tools` definitions to Chat Completions. The gateway preserves the client contract: a tool request returns `finish_reason: "tool_calls"`; execute the requested function in your application, then send a new conversation turn containing a `role: "tool"` message with the matching `tool_call_id`. With `stream: true`, tool-call deltas are emitted as `choices[0].delta.tool_calls`.

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://YOUR_WORKER_URL/v1",
  apiKey: "YOUR_AUTH_TOKEN",
});

const first = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "What is the weather in Mantena?" }],
  tools: [{
    type: "function",
    function: {
      name: "get_weather",
      description: "Returns current weather for a location.",
      parameters: {
        type: "object",
        properties: { location: { type: "string" } },
        required: ["location"],
        additionalProperties: false
      }
    }
  }],
  tool_choice: "auto"
});

const assistant = first.choices[0].message;
if (first.choices[0].finish_reason === "tool_calls") {
  const call = assistant.tool_calls?.[0];
  if (!call) throw new Error("Missing tool call");
  const result = JSON.stringify({ location: "Mantena", condition: "clear", celsius: 24 });
  const final = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "user", content: "What is the weather in Mantena?" },
      assistant,
      { role: "tool", tool_call_id: call.id, content: result }
    ]
  });
  console.log(final.choices[0].message.content);
}
```

The gateway does not execute functions, shell commands, or client-side tools itself. It only normalizes the model request and response; the calling application must authorize and execute each tool.

### 🤖 Setting up in n8n (AI Agent, Tools & RAG)

VeroDesk 1min Gateway integrates seamlessly with **n8n AI Agent**, **OpenAI Chat Model**, and **LangChain / Vector Store** nodes.

#### 1. Configure the OpenAI Model Node in n8n
1. Add an **OpenAI Chat Model** node (or connect it as the Model sub-node of an **AI Agent**).
2. Create/edit the OpenAI Credential:
   * **API Key:** Your `AUTH_TOKEN` (from your Cloudflare Worker).
   * **Base URL (under Advanced Options):** `https://YOUR_WORKER_URL/v1`
3. In the Model field, choose or type any supported model ID (e.g., `gpt-4o`, `claude-3-5-sonnet`, `deepseek/deepseek-chat`).
   * *Tip:* Append `:online` (e.g. `gpt-4o:online`) to automatically activate 1min.ai native web search without needing external search nodes.

#### 2. Connecting Tools (Web Search, APIs, Calculators)
1. Add an **AI Agent** node in n8n with **Tools Agent** or **Conversational Agent** mode.
2. Attach Tool sub-nodes to the AI Agent:
   * **Custom Tool / HTTP Request Tool:** For external APIs or database lookups.
   * **Search Tool:** (e.g., Tavily, SerpAPI, SearXNG, or Custom HTTP Tool).
3. The gateway will emulate standard OpenAI `tool_calls` for models that lack native function calling, returning strict tool requests to n8n and receiving tool results back via `role: "tool"`.

#### 3. Connecting RAG (Vector Stores & Memory)
1. Connect a Vector Store node (e.g., **Qdrant Vector Store**, **Pinecone**, **Postgres / pgvector**, or **In-Memory Vector Store**) as a Tool or Retriever in n8n.
2. When the RAG retrieval returns documents with metadata (e.g., `pageContent` and timestamps), the gateway's built-in **`ResponseSanitizer`** automatically extracts clean text and formats it as `[Contexto do Sistema - Informação Recuperada]`.
3. **Anti-Leak Guarantee:** The agent's final text and voice messages (for WhatsApp, Telegram, or TTS) remain completely clean and human-friendly—free of `<think>`, `Tool: [...]`, or raw JSON leakage.

### 👁️ Vision input

For a vision-capable model, send an array containing text and `image_url` content:

```json
{
  "model": "gpt-4o",
  "messages": [{
    "role": "user",
    "content": [
      {"type": "text", "text": "What do you see in this image?"},
      {"type": "image_url", "image_url": {"url": "https://example.com/image.jpg"}}
    ]
  }]
}
```

### 📦 Responses API and structured output

`POST /v1/responses` supports simple `input`, conversational `messages`, `json_object`, JSON Schema, reasoning controls, vision-compatible input, and streaming.

```bash
curl -X POST https://YOUR_WORKER_URL/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "model": "gpt-4.1",
    "input": "Create a compact profile for a software engineer.",
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "user_profile",
        "schema": {
          "type": "object",
          "properties": {"name": {"type": "string"}, "skills": {"type": "array", "items": {"type": "string"}}},
          "required": ["name"]
        }
      }
    },
    "reasoning_effort": "high"
  }'
```

## 🌐 Direct web endpoints

These optional endpoints are useful when an application needs explicit search or page extraction rather than model-mediated search. They use the gateway authorization header and must not be treated as an unrestricted public proxy.

```bash
curl -X POST https://YOUR_WORKER_URL/v1/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{"query":"latest artificial intelligence news","limit":5}'

curl -X POST https://YOUR_WORKER_URL/v1/web/fetch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{"url":"https://example.com/article"}'
```

`/v1/search` requires `SEARXNG_URL`; configure `SEARXNG_SECRET` if the selected SearXNG instance requires an authentication secret. `/v1/web/fetch` returns cleaned page content via Jina Reader and should be protected by normal gateway access controls.

## 🖼️ Image generation

`POST /v1/images/generations` uses an OpenAI-style image request. For compatible upstream engines, use `output_format` and `output_quality` to optimize the generated output.

```bash
curl -X POST https://YOUR_WORKER_URL/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "model": "black-forest-labs/flux-2-klein-4b",
    "prompt": "A cinematic sunset over mountains, high detail",
    "n": 1,
    "size": "1024x1024",
    "output_format": "webp",
    "output_quality": 85
  }'
```

## 🎙️ Audio and text-to-speech

### 📝 Transcription and translation

```bash
curl -X POST https://YOUR_WORKER_URL/v1/audio/transcriptions \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -F "file=@audio.mp3" \
  -F "model=whisper-1" \
  -F "response_format=text"
```

| Endpoint | Main fields | Notes |
|---|---|---|
| `/v1/audio/transcriptions` | `file`, `model`, optional `language`, `prompt`, `response_format`, `temperature` | Output can include `json`, `text`, `verbose_json`, `srt`, or `vtt` where supported. |
| `/v1/audio/translations` | `file`, `model` | Translates spoken audio to English text. |

### 🔊 Multi-engine TTS

```bash
curl -X POST https://YOUR_WORKER_URL/v1/audio/speech \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{"model":"tts-1","voice":"alloy","input":"Hello from VeroDesk.","format":"mp3"}' \
  --output speech.mp3
```

| Target engine | Representative model | Supported options may include |
|---|---|---|
| OpenAI | `tts-1` | Voice and output format |
| Google | `google-tts` | `speakingRate`, `pitch`, language settings |
| ElevenLabs | `elevenlabs-tts` | `voice_settings`, stability, similarity settings |

## 🧩 Anthropic Messages API

`POST /v1/messages` accepts Anthropic-style messages and translates output to Anthropic-oriented SSE events such as `message_start`, content-block events, deltas, and terminal events.

```bash
curl -X POST https://YOUR_WORKER_URL/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: YOUR_AUTH_TOKEN" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-5-sonnet",
    "max_tokens": 512,
    "messages": [{"role": "user", "content": "Explain why cache invalidation is difficult."}]
  }'
```

Add `"stream": true` for Anthropic SSE. Model availability is dynamic, so query `/v1/models` first.

### Tool use

`POST /v1/messages` also accepts Anthropic `tools` and returns `tool_use` content blocks, including `content_block_start` and incremental input deltas during streaming. Return the external result in a subsequent user message containing a `tool_result` block with the matching `tool_use_id`. As with OpenAI compatibility, the client executes and authorizes the actual tool; the Worker never executes it.

## 🛠️ Local development and manual deploy

### 📋 Requirements

- Node.js 18 or newer and npm
- Cloudflare account with Workers and KV enabled
- Wrangler authenticated against the target account
- 1min.ai API key

```bash
git clone https://github.com/samucamg/verodesk-1min-gateway.git
cd verodesk-1min-gateway
npm install
cp .dev.vars.example .dev.vars

wrangler kv:namespace create "RATE_LIMIT_STORE"
wrangler kv:namespace create "MODEL_CACHE"
npm run dev
```

Use `.dev.vars` only for local secrets and keep it untracked. Add the generated KV IDs to their matching bindings in `wrangler.jsonc`.

```text
ONE_MIN_API_KEY=replace_with_your_upstream_key
AUTH_TOKEN=replace_with_a_long_random_gateway_token
```

### ✅ Validate, build, and deploy

```bash
npx tsc --noEmit
git diff --check
npm run build
npm run deploy
```

## 🌐 Custom domain and operations

1. Ensure the domain is active and its DNS is managed by Cloudflare.
2. Open the deployed VeroDesk Worker in **Workers & Pages**.
3. Open **Triggers**, then **Custom Domains**.
4. Select **Add Custom Domain**, enter `api.example.com`, and finish the flow.
5. Use `https://api.example.com/v1` as the client base URL.

Cloudflare provisions TLS and routing during this process. Restrict CORS to real production browser origins whenever possible.

### 🩺 Troubleshooting

| Symptom | Likely cause | Check |
|---|---|---|
| `401` or `403` | Missing, invalid, or mismatched credential | `Authorization`, `AUTH_TOKEN`, and `ONE_MIN_API_KEY` mode |
| `429` | Request or token policy exceeded | Rate-limit settings and KV binding |
| Model unavailable | Upstream catalog changed | Call `GET /v1/models` |
| KV binding error | Missing namespace or incorrect ID | `wrangler.jsonc` and production bindings |
| Browser CORS error | Blocked origin or preflight failure | Allowed origins and CORS middleware |
| No incremental streaming | Client buffers SSE or expects the wrong event contract | Test with `curl -N`; confirm OpenAI vs. Anthropic event format |

## 🏗️ Architecture

```text
OpenAI SDK / Anthropic SDK / n8n / Frontend / Backend
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
```

## 🤝 Contributing and license

1. Fork the repository or create a feature branch.
2. Document compatibility changes with request and response examples.
3. Run type validation and build checks.
4. Add or update tests where applicable.
5. Open a focused pull request.

This project is released under the [MIT License](LICENSE).

---

<a id="portugues"></a>
# 🇧🇷 Português

## ✨ Visão geral

O **VeroDesk 1min Gateway** é um gateway de API serverless e nativo de borda que disponibiliza o ecossistema 1min.ai por meio de contratos compatíveis com OpenAI e Anthropic. Ele centraliza credenciais upstream, descobre modelos dinamicamente, traduz payloads e eventos de streaming e expõe chat, respostas estruturadas, geração de imagens, transcrição, tradução e texto para fala multi-motor em um único endpoint controlado.

Construído com TypeScript, Hono e Cloudflare Workers, ele atende SDKs, automações n8n, frontends privados, serviços de backend e aplicações de IA multi-provedor que precisam proteger credenciais upstream sem complicar a integração do cliente.

| [![OpenAI](https://img.shields.io/badge/🔌-Compatível_com_OpenAI-412991?style=flat-square)](#-api-compativel-com-openai) | [![Anthropic](https://img.shields.io/badge/🧩-Ponte_Anthropic-191919?style=flat-square)](#-anthropic-messages-api-1) | [![Segurança](https://img.shields.io/badge/🔐-Credenciais_protegidas-16a34a?style=flat-square)](#-autenticacao-e-segredos) | [![Streaming](https://img.shields.io/badge/⚡-Streaming_SSE-f59e0b?style=flat-square)](#-modelos-streaming-cache-e-limites) |
|---|---|---|---|
| Chat, Responses, imagens, áudio e modelos | `POST /v1/messages` | Master proxy com `AUTH_TOKEN` | Eventos OpenAI e Anthropic |

## 🚀 Deploy Cloudflare em 1 clique

> **Caminho de instalação recomendado.** Não é necessário terminal, clone local ou instalação do Wrangler. O fluxo de implantação cria uma cópia do repositório no GitHub e implanta o Worker no Cloudflare.

<div align="center">

## [Implante sua instância VeroDesk no Cloudflare](https://deploy.workers.cloudflare.com/?url=https://github.com/samucamg/verodesk-1min-gateway)

[![Implantar no Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/samucamg/verodesk-1min-gateway)

</div>

### 📋 Pré-requisitos

- Uma conta GitHub para criar a cópia do repositório durante o fluxo de implantação.
- Uma conta Cloudflare com acesso a Workers e KV.
- Uma chave de API 1min.ai válida para usar como `ONE_MIN_API_KEY`.

### 🧩 Preenchimento do formulário de deploy

A animação abaixo mostra o formulário de implantação em um clique e os valores necessários:

![Formulário animado de deploy no Cloudflare: nome do projeto, dois namespaces KV, chave 1min.ai e token de autenticação](https://cdn.jsdelivr.net/gh/samucamg/imagens/Ingles-Curso/2026/08/1mim-deploy-cloudflare_1787339418.gif)

> 📌 **Use três nomes distintos.** O nome do Worker/projeto e os dois nomes de namespace KV identificam recursos diferentes do Cloudflare; portanto, não podem ser iguais.

| Campo | Exemplo seguro | Finalidade |
|---|---|---|
| **Nome do projeto** | `verodesk-1min-gateway` | Deve ser único na sua conta Cloudflare; é usado no nome do Worker e na URL padrão `workers.dev`. |
| **Namespace KV de rate limit** | `verodesk-rate-limit-store` | Armazena o estado distribuído de limite de uso. Deve ser diferente do projeto e do cache de modelos. |
| **Namespace KV de cache de modelos** | `verodesk-model-cache` | Armazena o cache do catálogo dinâmico. Deve ser diferente dos outros dois nomes. |
| **`ONE_MIN_API_KEY`** | Sua chave de API 1min.ai | Credencial upstream protegida, associada ao consumo e faturamento. |
| **`AUTH_TOKEN`** | Um segredo aleatório longo | Token privado usado pelos clientes no modo master proxy. |
| **`ONE_MIN_CHAT_API_URL`** | `https://api.1min.ai/api/chat-with-ai` | Mantenha o padrão do formulário, salvo alteração documentada pela 1min.ai. |

### 🔑 Gere um token de gateway seguro

`AUTH_TOKEN` é a senha do seu gateway, não a chave 1min.ai. Guarde-o em um gerenciador de senhas e nunca o exponha a usuários não confiáveis. Use pelo menos 16 caracteres, com maiúsculas, minúsculas e números.

```bash
openssl rand -base64 24 | tr -d '\n' | tr '+/' 'Aa' | cut -c1-24
```

### ✅ Depois do deploy

1. Copie a URL do Worker, normalmente `https://PROJETO.SEUSUBDOMINIO.workers.dev`.
2. Abra `https://SUA_URL_DO_WORKER/` para verificar o health check.
3. Teste o catálogo dinâmico com `GET /v1/models`.
4. Configure a base URL do cliente como `https://SUA_URL_DO_WORKER/v1`.

```bash
curl https://SUA_URL_DO_WORKER/v1/models \
  -H "Authorization: Bearer SEU_AUTH_TOKEN"
```

## 🧰 Funcionalidades principais

- **🔌 Compatibilidade OpenAI:** Chat Completions, Responses API, imagens, transcrição de áudio, tradução de áudio, geração de fala e descoberta de modelos.
- **🧩 Compatibilidade Anthropic:** `POST /v1/messages` traduz requisições da Anthropic Messages API e eventos SSE.
- **🔐 Master proxy:** `AUTH_TOKEN` permite acesso dos clientes sem que recebam `ONE_MIN_API_KEY`.
- **🔊 TTS multi-motor:** um endpoint estilo OpenAI roteia para OpenAI, Google ou ElevenLabs.
- **🧠 Modelos dinâmicos:** IDs de modelos e capacidades disponíveis vêm do catálogo upstream.
- **⚡ Controles distribuídos:** Cloudflare KV mantém janela deslizante para requisições e uso ponderado de tokens.
- **💾 Cache em duas camadas:** memória do isolate e KV armazenam o catálogo de modelos para velocidade e resiliência.
- **🌊 Tradução de streaming:** tratamento SSE seguro em UTF-8 para consumidores OpenAI e Anthropic.
- **🖼️ Controles de imagem:** fluxos compatíveis aceitam overrides de `output_format` e `output_quality`.
- **🛡️ Proteção de borda:** preflight CORS em cache e headers de segurança para implantações acessadas pelo navegador.
- **🛠️ Emulação ReAct de tool calling:** definições de ferramentas OpenAI e Anthropic são convertidas em um prompt ReAct controlado quando o modelo upstream não oferece chamadas nativas. O gateway interpreta JSON balanceado, remove saída `<think>`, devolve `tool_calls` no formato OpenAI ou `tool_use` no formato Anthropic e aceita o turno subsequente de resultado da ferramenta.
- **🌐 Busca web nativa e hub web opcional:** acrescente `:online` ao ID do modelo para solicitar a busca web nativa da 1min.ai quando houver suporte. Rotas protegidas opcionais expõem `POST /v1/search` via SearXNG e `POST /v1/web/fetch` via Jina Reader.

## 🗺️ Matriz de endpoints

| Método | Endpoint | Compatibilidade | Descrição |
|---|---|---|---|
| `GET` | `/` | Gateway | Health check e descoberta de endpoints |
| `GET` | `/v1/models` | Estilo OpenAI | Catálogo dinâmico de modelos upstream |
| `POST` | `/v1/chat/completions` | OpenAI | Chat, entrada de visão e streaming SSE |
| `POST` | `/v1/responses` | OpenAI | Responses API estruturada e controles de raciocínio |
| `POST` | `/v1/messages` | Anthropic | Tradução da Messages API e streaming |
| `POST` | `/v1/images/generations` | OpenAI | Geração de imagens |
| `POST` | `/v1/audio/speech` | OpenAI | Texto para fala multi-motor |
| `POST` | `/v1/audio/transcriptions` | OpenAI | Fala para texto via multipart |
| `POST` | `/v1/audio/translations` | OpenAI | Tradução de áudio para inglês |
| `POST` | `/v1/search` | Gateway | Hub opcional de busca web via SearXNG |
| `POST` | `/v1/web/fetch` | Gateway | Extração opcional de conteúdo de URL via Jina Reader |

## 🔐 Autenticação e segredos

| Modo | Cliente envia | Comportamento do Worker | Melhor uso |
|---|---|---|---|
| Chave upstream do cliente | Chave 1min.ai em `Authorization: Bearer ...` | Repassa a credencial recebida ao upstream | Desenvolvimento e clientes diretos totalmente confiáveis |
| Master proxy | `AUTH_TOKEN` do gateway em `Authorization: Bearer ...` | Valida o token e injeta `ONE_MIN_API_KEY` | n8n, frontends, APIs internas e produção |

No modo master proxy, mantenha `ONE_MIN_API_KEY` exclusivamente em secrets do Cloudflare. Nunca a coloque em commits, exemplos de README, capturas de tela, JavaScript de frontend ou URLs.

### Secrets opcionais do hub web

O sufixo `:online` usa a capacidade de busca web upstream da 1min.ai quando ela está disponível para o modelo escolhido. Os endpoints diretos opcionais são independentes desse sufixo: `/v1/search` requer uma instância SearXNG acessível, enquanto `/v1/web/fetch` usa o Jina Reader. Configure os valores SearXNG apenas se for expor `/v1/search`:

```bash
npx wrangler secret put SEARXNG_URL
npx wrangler secret put SEARXNG_SECRET
```

Não exponha uma instância SearXNG sem autenticação por meio deste Worker. As duas rotas opcionais devem permanecer protegidas pelo mesmo middleware de autenticação das rotas de modelos.

### 🔄 Rotação de credenciais

Se uma das credenciais for exposta: revogue ou regenere o valor, atualize o secret correspondente no Cloudflare, faça novo deploy se necessário, atualize as aplicações autorizadas e revise consumo e logs.

## 🧠 Modelos, streaming, cache e limites

`GET /v1/models` retorna o catálogo ativo descoberto na 1min.ai. Capacidades de modelo — visão, suporte a intérprete de código, busca web e modalidades — são derivadas dos metadados upstream quando disponíveis. Sempre consulte esse endpoint antes de fixar um ID de modelo.

### 💾 Estratégia de cache de modelos

1. O Worker verifica a memória do isolate ativo.
2. Em caso de ausência, consulta o namespace `MODEL_CACHE` no Cloudflare KV.
3. Em caso de ausência ou expiração no KV, solicita o catálogo à 1min.ai e atualiza as duas camadas.
4. Um catálogo previamente válido pode ser usado durante uma falha temporária do upstream.

As janelas previstas são aproximadamente 5 minutos em memória e 1 hora no KV.

### 🚦 Rate limiting e contagem de tokens

Janelas deslizantes no Cloudflare KV identificam um consumidor por IP e/ou credencial, avaliam contadores de requisição e tokens ponderados, persistem estado em `RATE_LIMIT_STORE` e retornam HTTP `429` quando a política ativa é excedida. O consumo usa `gpt-tokenizer` quando aplicável, com fallback heurístico.

Configure limites reais de acordo com seu plano upstream, tráfego esperado e tolerância de risco; valores de README não são uma política de cotas de produção.

### 🌊 Streaming SSE

Defina `stream: true` para receber Server-Sent Events de modo incremental. Em testes de terminal, use `curl -N` para evitar que a resposta seja armazenada em buffer.

## 💬 API compatível com OpenAI

### ✍️ Chat Completions

```bash
curl -X POST https://SUA_URL_DO_WORKER/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_AUTH_TOKEN" \
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Explique a finalidade de um gateway de API distribuído."}],
    "stream": false
  }'
```

### 🛠️ Function calling e resultados de ferramentas

Envie definições OpenAI padrão em `tools` para Chat Completions. O gateway preserva o contrato do cliente: uma solicitação de ferramenta retorna `finish_reason: "tool_calls"`; execute a função na sua aplicação e envie um novo turno com mensagem `role: "tool"` e o `tool_call_id` correspondente. Com `stream: true`, os deltas de ferramenta são emitidos em `choices[0].delta.tool_calls`.

```typescript
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://SUA_URL_DO_WORKER/v1",
  apiKey: "SEU_AUTH_TOKEN",
});

const primeira = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [{ role: "user", content: "Como está o tempo em Mantena?" }],
  tools: [{
    type: "function",
    function: {
      name: "get_weather",
      description: "Retorna o clima atual de uma localidade.",
      parameters: {
        type: "object",
        properties: { location: { type: "string" } },
        required: ["location"],
        additionalProperties: false
      }
    }
  }],
  tool_choice: "auto"
});

const assistant = primeira.choices[0].message;
if (primeira.choices[0].finish_reason === "tool_calls") {
  const call = assistant.tool_calls?.[0];
  if (!call) throw new Error("Tool call ausente");
  const resultado = JSON.stringify({ location: "Mantena", condition: "clear", celsius: 24 });
  const final = await client.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "user", content: "Como está o tempo em Mantena?" },
      assistant,
      { role: "tool", tool_call_id: call.id, content: resultado }
    ]
  });
  console.log(final.choices[0].message.content);
}
```

O gateway não executa funções, comandos de shell ou ferramentas do cliente. Ele apenas normaliza a requisição e a resposta do modelo; a aplicação chamadora precisa autorizar e executar cada ferramenta.

### 🤖 Configuração no n8n (AI Agent, Ferramentas e RAG)

O VeroDesk 1min Gateway se integra de forma transparente com os nós **AI Agent**, **OpenAI Chat Model** e **Vector Store / LangChain** do **n8n**.

#### 1. Configurar o nó OpenAI Chat Model no n8n
1. Adicione um nó **OpenAI Chat Model** (ou conecte-o como sub-nó de modelo em um **AI Agent**).
2. Crie ou edite a credencial OpenAI:
   * **API Key:** O seu `AUTH_TOKEN` (definido no Cloudflare Worker).
   * **Base URL (em Opções Avançadas):** `https://SUA_URL_DO_WORKER/v1`
3. No campo de modelo, digite ou selecione o ID desejado (ex: `gpt-4o`, `claude-3-5-sonnet`, `deepseek/deepseek-chat`).
   * *Dica:* Acrescente o sufixo `:online` (ex: `gpt-4o:online`) para ativar a busca web nativa da 1min.ai sem precisar de nós externos de busca.

#### 2. Conectando Ferramentas (Busca Web, APIs, Calculadoras)
1. Configure o nó **AI Agent** no n8n no modo **Tools Agent** ou **Conversational Agent**.
2. Conecte sub-nós de ferramentas ao AI Agent:
   * **Custom Tool / HTTP Request:** Para consultas a bancos de dados, ERPs ou APIs externas.
   * **Ferramenta de Busca Web:** (ex: Tavily, SerpAPI, SearXNG ou ferramenta HTTP customizada).
3. O gateway emula chamadas de ferramentas no padrão OpenAI (`tool_calls`), retornando as instruções de execução para o n8n e recebendo o retorno em turnos subsequentes (`role: "tool"`).

#### 3. Conectando RAG (Bancos Vetoriais e Memória)
1. Conecte um nó de banco vetorial (ex: **Qdrant Vector Store**, **Pinecone**, **Postgres / pgvector**) como Ferramenta de Recuperação (Retriever) no n8n.
2. Quando a busca vetorial recuperar documentos com metadados (ex: `pageContent` e `metadata.timestamp`), o **`ResponseSanitizer`** do gateway desempacota o payload em texto puro legível, formatando como `[Contexto do Sistema - Informação Recuperada]`.
3. **Garantia Anti-Vazamento:** A resposta final entregue ao usuário (WhatsApp, Telegram ou sintetizadores de voz/TTS) conterá apenas a fala humana natural, sem vazar código JSON, raciocínio `<think>` ou tags residuais `Tool:`.

### 👁️ Entrada de visão

Para modelos compatíveis com visão, envie um array com conteúdo de texto e `image_url`:

```json
{
  "model": "gpt-4o",
  "messages": [{
    "role": "user",
    "content": [
      {"type": "text", "text": "O que há nesta imagem?"},
      {"type": "image_url", "image_url": {"url": "https://example.com/image.jpg"}}
    ]
  }]
}
```

### 📦 Responses API e saída estruturada

`POST /v1/responses` suporta `input` simples, `messages` conversacionais, `json_object`, JSON Schema, controles de raciocínio, entrada compatível com visão e streaming.

```bash
curl -X POST https://SUA_URL_DO_WORKER/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_AUTH_TOKEN" \
  -d '{
    "model": "gpt-4.1",
    "input": "Crie um perfil compacto para um engenheiro de software.",
    "response_format": {
      "type": "json_schema",
      "json_schema": {
        "name": "perfil_de_usuario",
        "schema": {
          "type": "object",
          "properties": {"nome": {"type": "string"}, "habilidades": {"type": "array", "items": {"type": "string"}}},
          "required": ["nome"]
        }
      }
    },
    "reasoning_effort": "high"
  }'
```

## 🌐 Endpoints web diretos

Estes endpoints opcionais são úteis quando a aplicação precisa de busca explícita ou extração de página, em vez de busca mediada pelo modelo. Eles usam o header de autorização do gateway e não devem ser tratados como proxy público irrestrito.

```bash
curl -X POST https://SUA_URL_DO_WORKER/v1/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_AUTH_TOKEN" \
  -d '{"query":"últimas notícias sobre inteligência artificial","limit":5}'

curl -X POST https://SUA_URL_DO_WORKER/v1/web/fetch \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_AUTH_TOKEN" \
  -d '{"url":"https://exemplo.com/artigo"}'
```

`/v1/search` requer `SEARXNG_URL`; configure `SEARXNG_SECRET` se a instância SearXNG escolhida exigir segredo de autenticação. `/v1/web/fetch` retorna conteúdo limpo de páginas via Jina Reader e deve permanecer protegido pelos controles normais de acesso do gateway.

## 🖼️ Geração de imagens

`POST /v1/images/generations` usa uma requisição de imagem no estilo OpenAI. Para motores upstream compatíveis, use `output_format` e `output_quality` para otimizar a saída gerada.

```bash
curl -X POST https://SUA_URL_DO_WORKER/v1/images/generations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_AUTH_TOKEN" \
  -d '{
    "model": "black-forest-labs/flux-2-klein-4b",
    "prompt": "Pôr do sol cinematográfico sobre montanhas, alto nível de detalhe",
    "n": 1,
    "size": "1024x1024",
    "output_format": "webp",
    "output_quality": 85
  }'
```

## 🎙️ Áudio e texto para fala

### 📝 Transcrição e tradução

```bash
curl -X POST https://SUA_URL_DO_WORKER/v1/audio/transcriptions \
  -H "Authorization: Bearer SEU_AUTH_TOKEN" \
  -F "file=@audio.mp3" \
  -F "model=whisper-1" \
  -F "response_format=text"
```

| Endpoint | Campos principais | Observações |
|---|---|---|
| `/v1/audio/transcriptions` | `file`, `model`, `language`, `prompt`, `response_format`, `temperature` | Saídas podem incluir `json`, `text`, `verbose_json`, `srt` e `vtt`, quando suportadas. |
| `/v1/audio/translations` | `file`, `model` | Traduz fala para texto em inglês. |

### 🔊 TTS multi-motor

```bash
curl -X POST https://SUA_URL_DO_WORKER/v1/audio/speech \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer SEU_AUTH_TOKEN" \
  -d '{"model":"tts-1","voice":"alloy","input":"Olá, VeroDesk.","format":"mp3"}' \
  --output fala.mp3
```

| Motor de destino | Modelo representativo | Opções compatíveis podem incluir |
|---|---|---|
| OpenAI | `tts-1` | Voz e formato de saída |
| Google | `google-tts` | `speakingRate`, `pitch` e idioma |
| ElevenLabs | `elevenlabs-tts` | `voice_settings`, estabilidade e similaridade |

## 🧩 Anthropic Messages API

`POST /v1/messages` aceita mensagens no formato Anthropic e traduz a saída para eventos SSE orientados a Anthropic, como `message_start`, eventos de bloco de conteúdo, deltas e eventos terminais.

```bash
curl -X POST https://SUA_URL_DO_WORKER/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: SEU_AUTH_TOKEN" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "claude-3-5-sonnet",
    "max_tokens": 512,
    "messages": [{"role": "user", "content": "Explique por que a invalidação de cache é difícil."}]
  }'
```

Acrescente `"stream": true` para SSE Anthropic. A disponibilidade de modelos é dinâmica, então consulte `/v1/models` primeiro.

### Uso de ferramentas

`POST /v1/messages` também aceita `tools` no formato Anthropic e retorna blocos de conteúdo `tool_use`, incluindo `content_block_start` e deltas incrementais de entrada em streaming. Devolva o resultado externo em uma mensagem de usuário subsequente contendo um bloco `tool_result` com o `tool_use_id` correspondente. Assim como na compatibilidade OpenAI, o cliente executa e autoriza a ferramenta real; o Worker nunca a executa.

## 🛠️ Desenvolvimento local e deploy manual

### 📋 Requisitos

- Node.js 18 ou superior e npm
- Conta Cloudflare com Workers e KV habilitados
- Wrangler autenticado na conta de destino
- Chave de API 1min.ai

```bash
git clone https://github.com/samucamg/verodesk-1min-gateway.git
cd verodesk-1min-gateway
npm install
cp .dev.vars.example .dev.vars

wrangler kv:namespace create "RATE_LIMIT_STORE"
wrangler kv:namespace create "MODEL_CACHE"
npm run dev
```

Use `.dev.vars` somente para segredos locais e mantenha-o fora do Git. Adicione os IDs de KV gerados aos bindings correspondentes em `wrangler.jsonc`.

```text
ONE_MIN_API_KEY=substitua_pela_sua_chave_upstream
AUTH_TOKEN=substitua_por_um_token_aleatorio_longo
```

### ✅ Validar, buildar e implantar

```bash
npx tsc --noEmit
git diff --check
npm run build
npm run deploy
```

## 🌐 Domínio personalizado e operação

1. Garanta que o domínio esteja ativo e com DNS gerenciado pela Cloudflare.
2. Abra o Worker VeroDesk implantado em **Workers & Pages**.
3. Abra **Triggers** e depois **Custom Domains**.
4. Selecione **Add Custom Domain**, informe `api.seudominio.com.br` e conclua o fluxo.
5. Use `https://api.seudominio.com.br/v1` como base URL do cliente.

O Cloudflare provisiona TLS e roteamento nesse processo. Restrinja CORS às origens reais de navegador em produção sempre que possível.

### 🩺 Diagnóstico

| Sintoma | Causa provável | Verifique |
|---|---|---|
| `401` ou `403` | Credencial ausente, inválida ou incompatível | `Authorization`, `AUTH_TOKEN` e modo `ONE_MIN_API_KEY` |
| `429` | Política de requisições ou tokens excedida | Configuração de rate limit e binding KV |
| Modelo indisponível | Catálogo upstream mudou | Chame `GET /v1/models` |
| Erro de binding KV | Namespace ausente ou ID incorreto | `wrangler.jsonc` e bindings de produção |
| Erro CORS no navegador | Origem bloqueada ou falha no preflight | Origens permitidas e middleware CORS |
| Streaming não incremental | Cliente faz buffer de SSE ou espera outro contrato | Teste com `curl -N`; confirme o formato OpenAI ou Anthropic |

## 🏗️ Arquitetura

```text
SDK OpenAI / SDK Anthropic / n8n / Frontend / Backend
                         |
                         v
              Cloudflare Worker + Hono Router
                         |
      +------------------+-------------------+
      |                  |                   |
      v                  v                   v
 Autenticação        CORS/Segurança      Rate Limiter
 Master Proxy        Cache Preflight     Cloudflare KV
      |                                      |
      +------------------+-------------------+
                         v
 Chat | Responses | Messages | Imagens | Áudio | Modelos
                         |
                         v
             Tradutores de Payload e Eventos SSE
                         |
                         v
                   APIs upstream da 1min.ai
```

## 🤝 Contribuições e licença

1. Faça um fork ou crie uma branch de funcionalidade.
2. Documente mudanças de compatibilidade com exemplos de requisição e resposta.
3. Execute validação de tipos e build.
4. Adicione ou atualize testes quando aplicável.
5. Abra um pull request focado e objetivo.

Este projeto é disponibilizado sob a [Licença MIT](LICENSE).
