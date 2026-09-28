import { Logger } from '@nestjs/common';

export interface ChatCompletionMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIProviderCompletionOptions {
  temperature?: number;
  timeoutMs?: number;
}

export interface AIProviderCompletionResult {
  content: string;
  model: string;
}

/**
 * Abstract AIProvider contract.
 * ReviewService and AIService depend only on this abstraction, never directly on OpenAI SDKs.
 */
export interface AIProvider {
  complete(
    messages: ChatCompletionMessage[],
    options?: AIProviderCompletionOptions,
  ): Promise<AIProviderCompletionResult | null>;
}

export class OpenAICompatibleProvider implements AIProvider {
  private readonly logger = new Logger(OpenAICompatibleProvider.name);

  constructor(
    private readonly config: {
      baseUrl: string;
      apiKey?: string;
      modelName: string;
    },
  ) {}

  async complete(
    messages: ChatCompletionMessage[],
    options: AIProviderCompletionOptions = {},
  ): Promise<AIProviderCompletionResult | null> {
    const baseUrl = (this.config.baseUrl || '').trim().replace(/\/+$/, '');
    if (!baseUrl) return null;

    if (
      (baseUrl.includes('api.openai.com') || baseUrl.includes('openrouter.ai')) &&
      (!this.config.apiKey || this.config.apiKey.trim() === '')
    ) {
      return null;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (this.config.apiKey && this.config.apiKey.trim().length > 0) {
      headers['Authorization'] = `Bearer ${this.config.apiKey.trim()}`;
    }

    const payload = {
      model: this.config.modelName || 'gpt-4o-mini',
      messages,
      temperature: options.temperature ?? 0.2,
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(
        () => controller.abort(),
        options.timeoutMs ?? 25000,
      );
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (!response.ok) {
        this.logger.warn(
          `OpenAI-Compatible Provider at ${baseUrl} returned HTTP ${response.status}`,
        );
        return null;
      }

      const data: any = await response.json();
      const content = data?.choices?.[0]?.message?.content;
      if (typeof content === 'string' && content.trim().length > 0) {
        return {
          content: content.trim(),
          model: data?.model || this.config.modelName,
        };
      }
      return null;
    } catch (err: any) {
      this.logger.debug(
        `Provider endpoint ${baseUrl} unreachable (${err?.message}).`,
      );
      return null;
    }
  }
}
