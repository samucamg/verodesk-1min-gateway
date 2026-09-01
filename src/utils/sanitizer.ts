/**
 * Utilitário de limpeza e sanitização de respostas para evitar vazamento
 * de logs, chamadas de ferramenta e metadados de memória no chat final.
 */

export class ResponseSanitizer {
  /**
   * Sanitiza a resposta final do assistente removendo resquícios de execução
   */
  static cleanOutput(text: string): string {
    if (!text || typeof text !== "string") return "";

    let cleaned = text;

    // 1. Remove blocos de raciocínio de modelos (<think>...</think>)
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "");

    // 2. Remove blocos vazados no formato "Tool: [...]" ou "Tool: {...}"
    cleaned = cleaned.replace(/Tool:\s*(?:\[[\s\S]*?\]|\{[\s\S]*?\})\s*/gi, "");

    // 3. Remove blocos Markdown ```json contendo tool_calls vazados
    cleaned = cleaned.replace(
      /```(?:json)?\s*\{\s*"tool_calls"[\s\S]*?\}\s*```/gi,
      "",
    );

    // 4. Remove introduções de busca seguidas de quebra se a resposta real já estiver no texto
    // Exemplo: "Okay, Samuel! Entendido. Vou procurar... \n\n Sim, Samuel, achei aqui!"
    cleaned = cleaned.replace(
      /^(?:Okay|Ok|Certo|Entendido)[^.\n]*?(?:procurar|pesquisar|buscar)[^.\n]*?\.\s*/gim,
      "",
    );

    // 5. Remove prefixos de papéis vazados no início de linhas (ex: "Assistant:", "AI:", "Emma:")
    cleaned = cleaned.replace(/^(?:Assistant|AI|Emma|Bot|System):\s*/gim, "");

    return cleaned.trim();
  }

  /**
   * Desempacota payloads complexos de memória (ex: LangChain Memory, Vector Store)
   * transformando JSONs aninhados com `pageContent` em texto puro legível.
   */
  static unpackMemoryContent(rawContent: unknown): string {
    if (!rawContent) return "";

    // Se já for string simples
    if (typeof rawContent === "string") {
      const trimmed = rawContent.trim();
      // Tenta verificar se a string é um JSON serializado
      if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
        try {
          const parsed = JSON.parse(trimmed);
          return ResponseSanitizer.unpackMemoryContent(parsed);
        } catch {
          return rawContent;
        }
      }
      return rawContent;
    }

    // Se for array (ex: LangChain documents ou tool results)
    if (Array.isArray(rawContent)) {
      return rawContent
        .map((item) => ResponseSanitizer.unpackMemoryContent(item))
        .filter(Boolean)
        .join("\n");
    }

    // Se for objeto estruturado de resposta
    if (typeof rawContent === "object" && rawContent !== null) {
      const record = rawContent as Record<string, unknown>;

      // Caso 1: Formato LangChain Vector Store Document { pageContent: "...", metadata: {...} }
      if (typeof record.pageContent === "string") {
        let text = record.pageContent;
        const metadata = record.metadata as Record<string, unknown> | undefined;
        if (metadata?.timestamp) {
          text += ` (Data de Registro: ${metadata.timestamp})`;
        }
        return text;
      }

      // Caso 2: Objeto genérico com response/text
      if (typeof record.text === "string") return record.text;
      if (record.response)
        return ResponseSanitizer.unpackMemoryContent(record.response);

      // Fallback: Retorna como string JSON limpa
      return JSON.stringify(rawContent);
    }

    return String(rawContent);
  }
}
