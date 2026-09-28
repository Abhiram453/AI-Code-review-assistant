import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

export interface AiProviderRecord {
  id: string;
  user_id: string;
  name: string;
  provider_type: string;
  base_url: string;
  api_key: string;
  model_name: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

@Injectable()
export class ProvidersService {
  constructor(private readonly db: DatabaseService) {}

  private sanitizeProvider(row: AiProviderRecord) {
    const key = row.api_key || '';
    const maskedKey = key.length > 0 ? '••••••••••••••' : '';
    return {
      id: row.id,
      name: row.name,
      providerType: row.provider_type,
      baseUrl: row.base_url,
      modelName: row.model_name,
      hasApiKey: key.length > 0,
      maskedApiKey: maskedKey,
      isDefault: row.is_default,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async listProviders(userId: string) {
    await this.db.seedUserDefaultProviders(userId);
    const res = await this.db.query<AiProviderRecord>(
      `SELECT * FROM ai_providers
       WHERE user_id = $1
       ORDER BY is_default DESC, created_at ASC`,
      [userId],
    );
    return res.rows.map((r) => this.sanitizeProvider(r));
  }

  async getActiveProviderForUser(userId: string, providerId?: string): Promise<AiProviderRecord> {
    await this.db.seedUserDefaultProviders(userId);

    if (providerId) {
      const specific = await this.db.query<AiProviderRecord>(
        'SELECT * FROM ai_providers WHERE id = $1 AND user_id = $2',
        [providerId, userId],
      );
      if (specific.rowCount > 0) {
        return specific.rows[0];
      }
    }

    const def = await this.db.query<AiProviderRecord>(
      'SELECT * FROM ai_providers WHERE user_id = $1 ORDER BY is_default DESC, created_at ASC LIMIT 1',
      [userId],
    );
    if (def.rowCount > 0) {
      return def.rows[0];
    }

    return {
      id: 'fallback_default',
      user_id: userId,
      name: 'Default OpenAI-Compatible Endpoint',
      provider_type: 'openai-compatible',
      base_url: process.env.DEFAULT_AI_BASE_URL || 'http://localhost:1234/v1',
      api_key: process.env.DEFAULT_AI_API_KEY || '',
      model_name: process.env.DEFAULT_AI_MODEL || 'local-model',
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }

  async createProvider(
    userId: string,
    dto: {
      name: string;
      providerType?: string;
      baseUrl: string;
      apiKey?: string;
      modelName: string;
      isDefault?: boolean;
    },
  ) {
    const cleanBaseUrl = (dto.baseUrl || '').trim().replace(/\/+$/, '');
    const cleanModel = (dto.modelName || '').trim();
    const cleanName = (dto.name || '').trim() || 'Custom AI Provider';

    if (!cleanBaseUrl.startsWith('http://') && !cleanBaseUrl.startsWith('https://')) {
      throw new BadRequestException('Base URL must start with http:// or https://');
    }
    if (!cleanModel) {
      throw new BadRequestException('Model Name is required');
    }

    if (dto.isDefault) {
      await this.db.query('UPDATE ai_providers SET is_default = FALSE WHERE user_id = $1', [
        userId,
      ]);
    }

    const id = `prov_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const res = await this.db.query<AiProviderRecord>(
      `INSERT INTO ai_providers (id, user_id, name, provider_type, base_url, api_key, model_name, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        id,
        userId,
        cleanName,
        dto.providerType || 'openai-compatible',
        cleanBaseUrl,
        dto.apiKey ?? '',
        cleanModel,
        Boolean(dto.isDefault),
      ],
    );

    return this.sanitizeProvider(res.rows[0]);
  }

  async updateProvider(
    userId: string,
    providerId: string,
    dto: {
      name?: string;
      providerType?: string;
      baseUrl?: string;
      apiKey?: string;
      modelName?: string;
      isDefault?: boolean;
    },
  ) {
    const existing = await this.db.query<AiProviderRecord>(
      'SELECT * FROM ai_providers WHERE id = $1 AND user_id = $2',
      [providerId, userId],
    );
    if (existing.rowCount === 0) {
      throw new NotFoundException('AI provider configuration not found');
    }

    const current = existing.rows[0];
    const nextName = dto.name !== undefined ? dto.name.trim() : current.name;
    const nextType = dto.providerType !== undefined ? dto.providerType : current.provider_type;
    const nextBaseUrl =
      dto.baseUrl !== undefined ? dto.baseUrl.trim().replace(/\/+$/, '') : current.base_url;
    const nextModel = dto.modelName !== undefined ? dto.modelName.trim() : current.model_name;
    const nextApiKey = dto.apiKey !== undefined ? dto.apiKey : current.api_key;
    const nextDefault = dto.isDefault !== undefined ? Boolean(dto.isDefault) : current.is_default;

    if (nextDefault) {
      await this.db.query('UPDATE ai_providers SET is_default = FALSE WHERE user_id = $1', [
        userId,
      ]);
    }

    const updated = await this.db.query<AiProviderRecord>(
      `UPDATE ai_providers
       SET name = $1,
           provider_type = $2,
           base_url = $3,
           api_key = $4,
           model_name = $5,
           is_default = $6,
           updated_at = NOW()
       WHERE id = $7 AND user_id = $8
       RETURNING *`,
      [nextName, nextType, nextBaseUrl, nextApiKey, nextModel, nextDefault, providerId, userId],
    );

    return this.sanitizeProvider(updated.rows[0]);
  }

  async deleteProvider(userId: string, providerId: string) {
    const res = await this.db.query(
      'DELETE FROM ai_providers WHERE id = $1 AND user_id = $2 RETURNING id',
      [providerId, userId],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException('AI provider not found');
    }
    return { deleted: true, id: providerId };
  }

  async testProviderConnection(
    userId: string,
    providerIdOrConfig: {
      providerId?: string;
      baseUrl?: string;
      apiKey?: string;
      modelName?: string;
    },
  ) {
    let baseUrl = (providerIdOrConfig.baseUrl || '').trim().replace(/\/+$/, '');
    let apiKey = providerIdOrConfig.apiKey || '';
    let modelName = providerIdOrConfig.modelName || '';

    if (providerIdOrConfig.providerId) {
      const record = await this.getActiveProviderForUser(userId, providerIdOrConfig.providerId);
      baseUrl = baseUrl || record.base_url;
      apiKey = apiKey || record.api_key;
      modelName = modelName || record.model_name;
    }

    const startTime = Date.now();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const response = await fetch(`${baseUrl}/models`, {
        method: 'GET',
        headers,
        signal: controller.signal,
      });
      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;

      if (response.ok) {
        const data: any = await response.json().catch(() => ({}));
        const models = Array.isArray(data?.data)
          ? data.data.slice(0, 15).map((m: any) => m.id || m.name)
          : [];
        return {
          reachable: true,
          status: response.status,
          latencyMs,
          baseUrl,
          modelName,
          discoveredModels: models,
          message: `Connected to ${baseUrl} in ${latencyMs}ms (${models.length} models listed).`,
        };
      }

      return {
        reachable: false,
        status: response.status,
        latencyMs,
        baseUrl,
        modelName,
        discoveredModels: [],
        message: `Endpoint responded with HTTP ${response.status}. Check API key or server status. Hybrid static analysis fallback remains available.`,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        reachable: false,
        status: 0,
        latencyMs,
        baseUrl,
        modelName,
        discoveredModels: [],
        message: `Endpoint at ${baseUrl} is currently offline (${err?.message || 'connection refused'}). Reviews and Chat will seamlessly use the built-in Hybrid Static Analysis engine until the endpoint is started.`,
      };
    }
  }
}
