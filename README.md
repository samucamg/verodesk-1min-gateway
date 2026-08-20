# VeroDesk 1min Gateway

Middleware serverless construído com Hono para Cloudflare Workers. Atua como um adaptador universal traduzindo requisições de clientes OpenAI e Anthropic para o ecossistema 1min.ai.

## Arquitetura e Deploy

Este projeto não contém credenciais hardcoded e está estruturado para implantação direta via GitHub conectado ao painel do Cloudflare.

### Como realizar o Deploy pelo Cloudflare Dashboard:

1. Acesse seu painel no Cloudflare e vá em **Workers & Pages**.
2. Clique em **Create application** -> Selecione a aba **Workers** e vincule este repositório do GitHub.
3. Acesse as configurações do Worker criado, vá em **Settings** -> **Variables and Secrets**.
4. Crie as seguintes variáveis de ambiente secretas (Encrypt):
   - `ONE_MIN_API_KEY`: Sua chave privada da 1min.ai.
   - `AUTH_TOKEN`: Senha ou token de autenticação que seu N8N/Frontend usará para acessar este gateway.
5. Acesse **Settings** -> **Bindings** -> **KV Namespace Bindings** e adicione:
   - `RATE_LIMIT_STORE`: Selecione o namespace previamente criado para o controle de taxa.
   - `MODEL_CACHE`: Selecione o namespace previamente criado para cache do catálogo.

Ao fazer push na branch `master`, o Cloudflare puxará as alterações automaticamente, respeitando as variáveis isoladas no painel web.
