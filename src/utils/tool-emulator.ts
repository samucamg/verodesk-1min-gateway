/**
 * Tool Calling Emulator for 1min.ai
 * Translates OpenAI / Anthropic tool definitions into rigid ReAct system instructions
 * and parses balanced JSON outputs back into tool call objects.
 */

import type { Message } from "../types";

export interface ToolCallItem {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON serialized string for OpenAI compatibility
  };
}

export interface ToolDefinition {
  type?: string;
  name?: string;
  description?: string;
  parameters?: Record<string, unknown>;
  input_schema?: Record<string, unknown>;
  function?: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
}

export class ToolCallingEmulator {
  /**
   * Converte ferramentas (OpenAI ou Anthropic) em System Prompt ReAct rígido
   */
  static injectToolsPrompt(
    systemPrompt: string,
    tools: ToolDefinition[],
    toolChoice?: unknown,
  ): string {
    if (!tools || tools.length === 0 || toolChoice === "none") {
      return systemPrompt;
    }

    const toolDescriptions = tools.map((t) => {
      const name = t.function?.name || t.name || "unnamed_tool";
      const desc = t.function?.description || t.description || "Sem descrição";
      const params = t.function?.parameters || t.input_schema || {};
      return `- **${name}**: ${desc}\n  Parâmetros (JSON Schema): ${JSON.stringify(params)}`;
    });

    let forceInstruction = "";
    if (
      typeof toolChoice === "object" &&
      toolChoice !== null &&
      "function" in toolChoice &&
      typeof (toolChoice as { function?: { name?: string } }).function?.name ===
        "string"
    ) {
      const targetName = (toolChoice as { function: { name: string } }).function
        .name;
      forceInstruction = `\nATENÇÃO: Você É OBRIGADO a executar a ferramenta: "${targetName}".`;
    } else if (
      typeof toolChoice === "object" &&
      toolChoice !== null &&
      "name" in toolChoice &&
      typeof (toolChoice as { name?: string }).name === "string"
    ) {
      const targetName = (toolChoice as { name: string }).name;
      forceInstruction = `\nATENÇÃO: Você É OBRIGADO a executar a ferramenta: "${targetName}".`;
    } else if (
      toolChoice === "required" ||
      (typeof toolChoice === "object" &&
        toolChoice !== null &&
        (toolChoice as { type?: string }).type === "any")
    ) {
      forceInstruction = `\nATENÇÃO: Você É OBRIGADO a executar pelo menos uma das ferramentas disponíveis antes de responder.`;
    }

    const injection = `
=== SISTEMA DE EXECUÇÃO DE FERRAMENTAS (TOOL CALLING) ===
Você tem acesso às seguintes ferramentas:
${toolDescriptions.join("\n\n")}
${forceInstruction}

DIRETRIZES RÍGIDAS DE SAÍDA:
1. SE você precisar consultar uma ferramenta para responder, responda EXCLUSIVAMENTE com o bloco JSON da ferramenta.
2. NUNCA adicione mensagens como 'Deixa eu ver...', 'Vou pesquisar...', saudações ou explicações antes ou depois do JSON ao invocar uma ferramenta.
3. SE a informação já foi recuperada e consta no histórico ou contexto, responda DIRETAMENTE ao usuário em linguagem natural amigável.
4. NUNCA escreva prefixos como 'Tool:', 'Observation:', 'Assistant:' ou 'AI:' no meio da sua resposta final.
5. NUNCA exiba código JSON bruto ou estruturas de metadados para o usuário final.

Formato estrito de acionamento de ferramentas:
\`\`\`json
{
  "tool_calls": [
    {
      "id": "call_${crypto.randomUUID().slice(0, 8)}",
      "type": "function",
      "function": {
        "name": "NOME_DA_FERRAMENTA",
        "arguments": {
          "parametro": "valor"
        }
      }
    }
  ]
}
\`\`\`
========================================================`;

    return systemPrompt ? `${systemPrompt}\n\n${injection}` : injection.trim();
  }

  /**
   * Helper para injetar prompt de ferramentas na lista de mensagens
   */
  static injectToolsIntoMessages(
    messages: Message[],
    tools: ToolDefinition[],
    toolChoice?: unknown,
  ): Message[] {
    if (!tools || tools.length === 0 || toolChoice === "none") {
      return messages;
    }

    const newMessages = [...messages];
    const sysIdx = newMessages.findIndex((m) => m.role === "system");
    const sysMsg = sysIdx >= 0 ? newMessages[sysIdx] : undefined;
    if (sysMsg) {
      const existingContent =
        typeof sysMsg.content === "string" ? sysMsg.content : "";
      newMessages[sysIdx] = {
        role: "system",
        content: ToolCallingEmulator.injectToolsPrompt(
          existingContent,
          tools,
          toolChoice,
        ),
        name: sysMsg.name,
      };
    } else {
      newMessages.unshift({
        role: "system",
        content: ToolCallingEmulator.injectToolsPrompt("", tools, toolChoice),
      });
    }

    return newMessages;
  }

  /**
   * Extrai tool calls suportando Markdown e JSON balanceado
   */
  static parseResponse(
    content: string,
    allowedTools?: ToolDefinition[],
  ): ToolCallItem[] | null {
    if (!content || typeof content !== "string") return null;

    // 0. Remove blocos <think>...</think> de modelos com raciocínio
    const sanitized = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    if (!sanitized) return null;

    // 1. Tenta blocos Markdown ```json ... ```
    const mdMatches = [
      ...sanitized.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi),
    ];
    for (const match of mdMatches) {
      if (!match?.[1]) continue;
      const candidate = match[1].trim();
      const parsed = ToolCallingEmulator.safeJsonParse(candidate);
      if (parsed) {
        const extracted = ToolCallingEmulator.extractFromDecoded(
          parsed,
          allowedTools,
        );
        if (extracted) return extracted;
      }
    }

    // 2. Parser balanceado que varre todas as aberturas '{'
    const balancedList =
      ToolCallingEmulator.extractAllBalancedJsonBlocks(sanitized);
    for (const block of balancedList) {
      const extracted = ToolCallingEmulator.extractFromDecoded(
        block,
        allowedTools,
      );
      if (extracted) return extracted;
    }

    return null;
  }

  private static extractAllBalancedJsonBlocks(text: string): unknown[] {
    const results: unknown[] = [];
    let searchFrom = 0;

    while (searchFrom < text.length) {
      const start = text.indexOf("{", searchFrom);
      if (start === -1) break;

      let braceCount = 0;
      let insideString = false;
      let isEscaped = false;

      for (let i = start; i < text.length; i++) {
        const char = text[i];

        if (insideString) {
          if (isEscaped) {
            isEscaped = false;
          } else if (char === "\\") {
            isEscaped = true;
          } else if (char === '"') {
            insideString = false;
          }
          continue;
        }

        if (char === '"') {
          insideString = true;
          continue;
        }

        if (char === "{") {
          braceCount++;
        } else if (char === "}") {
          braceCount--;
          if (braceCount === 0) {
            const candidate = text.slice(start, i + 1);
            const decoded = ToolCallingEmulator.safeJsonParse(candidate);
            if (decoded && typeof decoded === "object") {
              results.push(decoded);
            }
            searchFrom = i + 1;
            break;
          }
        }
      }

      if (braceCount !== 0) {
        searchFrom = start + 1;
      }
    }

    return results;
  }

  private static extractFromDecoded(
    data: unknown,
    allowedTools?: ToolDefinition[],
  ): ToolCallItem[] | null {
    if (!data || typeof data !== "object") return null;
    const record = data as Record<string, unknown>;

    const validNames = allowedTools
      ? allowedTools
          .map((t) => t.function?.name || t.name)
          .filter((n): n is string => typeof n === "string")
      : null;

    const isAllowedName = (name: string): boolean => {
      if (!validNames || validNames.length === 0) return true;
      return validNames.includes(name);
    };

    // Padrão A: { tool_calls: [...] }
    if (Array.isArray(record.tool_calls) && record.tool_calls.length > 0) {
      const items: ToolCallItem[] = [];
      for (const tc of record.tool_calls) {
        if (!tc || typeof tc !== "object") continue;
        const item = tc as Record<string, unknown>;
        const fnObj = (item.function as Record<string, unknown>) || {};
        const name = (fnObj.name as string) || (item.name as string);
        const rawArgs = fnObj.arguments ?? item.arguments ?? {};
        const argsStr = ToolCallingEmulator.normalizeArguments(rawArgs);

        if (name && isAllowedName(name)) {
          items.push({
            id:
              (item.id as string) || `call_${crypto.randomUUID().slice(0, 8)}`,
            type: "function",
            function: { name, arguments: argsStr },
          });
        }
      }
      return items.length > 0 ? items : null;
    }

    // Padrão B: Chamada única de função { name: "...", arguments: {...} } ou { function: { name: "...", arguments: ... } }
    if (record.name && typeof record.name === "string") {
      const name = record.name;
      if (
        (record.arguments !== undefined || record.parameters !== undefined) &&
        isAllowedName(name)
      ) {
        const rawArgs = record.arguments ?? record.parameters ?? {};
        return [
          {
            id: `call_${crypto.randomUUID().slice(0, 8)}`,
            type: "function",
            function: {
              name,
              arguments: ToolCallingEmulator.normalizeArguments(rawArgs),
            },
          },
        ];
      }
    }

    if (
      record.function &&
      typeof record.function === "object" &&
      typeof (record.function as Record<string, unknown>).name === "string"
    ) {
      const fnObj = record.function as Record<string, unknown>;
      const name = fnObj.name as string;
      if (isAllowedName(name)) {
        const rawArgs = fnObj.arguments ?? fnObj.parameters ?? {};
        return [
          {
            id: `call_${crypto.randomUUID().slice(0, 8)}`,
            type: "function",
            function: {
              name,
              arguments: ToolCallingEmulator.normalizeArguments(rawArgs),
            },
          },
        ];
      }
    }

    return null;
  }

  /**
   * Garante que os argumentos sejam uma string JSON válida
   */
  static normalizeArguments(args: unknown): string {
    if (typeof args === "string") {
      try {
        const parsed = JSON.parse(args);
        return JSON.stringify(parsed);
      } catch {
        return JSON.stringify({ input: args });
      }
    } else if (typeof args === "object" && args !== null) {
      return JSON.stringify(args);
    }
    return JSON.stringify({});
  }

  private static safeJsonParse(str: string): unknown {
    try {
      return JSON.parse(str);
    } catch {
      return null;
    }
  }
}
