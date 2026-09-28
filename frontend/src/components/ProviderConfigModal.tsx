'use client';

import React, { useState } from 'react';
import {
  X,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Activity,
  Star,
  Edit3,
} from 'lucide-react';
import { AiProviderConfig } from '@/types';
import { api } from '@/lib/api';

interface ProviderConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  providers: AiProviderConfig[];
  onRefreshProviders: () => Promise<void>;
}

const PROVIDER_PRESETS = [
  {
    label: 'OpenAI API',
    name: 'OpenAI Cloud API',
    providerType: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    modelName: 'gpt-4o-mini',
  },
  {
    label: 'LM Studio (Local)',
    name: 'LM Studio Local Server',
    providerType: 'lm-studio',
    baseUrl: 'http://localhost:1234/v1',
    modelName: 'qwen2.5-coder-7b-instruct',
  },
  {
    label: 'Ollama (Local)',
    name: 'Ollama Local Server',
    providerType: 'ollama',
    baseUrl: 'http://localhost:11434/v1',
    modelName: 'llama3.1:8b',
  },
  {
    label: 'OpenRouter',
    name: 'OpenRouter Gateway',
    providerType: 'openrouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    modelName: 'anthropic/claude-3.5-sonnet',
  },
];

export function ProviderConfigModal({
  isOpen,
  onClose,
  providers,
  onRefreshProviders,
}: ProviderConfigModalProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('Custom OpenAI-Compatible Endpoint');
  const [providerType, setProviderType] = useState('openai-compatible');
  const [baseUrl, setBaseUrl] = useState('http://localhost:1234/v1');
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('qwen2.5-coder-7b-instruct');
  const [isDefault, setIsDefault] = useState(true);

  const [saving, setSaving] = useState(false);
  const [testingId, setTestingId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    reachable: boolean;
    message: string;
    discoveredModels?: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const applyPreset = (preset: (typeof PROVIDER_PRESETS)[0]) => {
    setEditingId(null);
    setName(preset.name);
    setProviderType(preset.providerType);
    setBaseUrl(preset.baseUrl);
    setModelName(preset.modelName);
    setApiKey('');
    setTestResult(null);
    setError(null);
  };

  const startEdit = (p: AiProviderConfig) => {
    setEditingId(p.id);
    setName(p.name);
    setProviderType(p.providerType);
    setBaseUrl(p.baseUrl);
    setModelName(p.modelName);
    setApiKey('');
    setIsDefault(p.isDefault);
    setTestResult(null);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        await api.updateProvider(editingId, {
          name,
          providerType,
          baseUrl,
          modelName,
          ...(apiKey.trim() ? { apiKey: apiKey.trim() } : {}),
          isDefault,
        });
      } else {
        await api.createProvider({
          name,
          providerType,
          baseUrl,
          apiKey: apiKey.trim(),
          modelName,
          isDefault,
        });
      }
      await onRefreshProviders();
      setEditingId(null);
      setApiKey('');
    } catch (err: any) {
      setError(err?.message || 'Failed to save provider configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await api.updateProvider(id, { isDefault: true });
      await onRefreshProviders();
    } catch (err: any) {
      setError(err?.message || 'Could not set default provider');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteProvider(id);
      await onRefreshProviders();
    } catch (err: any) {
      setError(err?.message || 'Could not delete provider');
    }
  };

  const handleTestConfig = async (providerId?: string) => {
    setTestingId(providerId || 'form');
    setTestResult(null);
    try {
      const res = await api.testProvider(
        providerId
          ? { providerId }
          : { baseUrl, apiKey: apiKey.trim(), modelName },
      );
      setTestResult(res);
    } catch (err: any) {
      setTestResult({
        reachable: false,
        message: err?.message || 'Connection test failed',
      });
    } finally {
      setTestingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-4xl rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl overflow-hidden my-8">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <Cpu className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">
                AI Provider Configuration (OpenAI-Compatible Endpoints)
              </h2>
              <p className="text-xs text-slate-400">
                Configure Base URL, API Key, and Model Name for OpenAI, LM Studio, Ollama, OpenRouter, or custom servers.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
          {/* Left column: Saved Providers */}
          <div className="lg:col-span-6 p-5 space-y-3 max-h-[540px] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Configured Providers ({providers.length})
              </h3>
              <button
                type="button"
                onClick={() => {
                  setEditingId(null);
                  setName('New OpenAI-Compatible Provider');
                  setBaseUrl('http://localhost:1234/v1');
                  setModelName('local-model');
                  setApiKey('');
                }}
                className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300"
              >
                <Plus className="w-3.5 h-3.5" /> Add New
              </button>
            </div>

            {providers.map((p) => (
              <div
                key={p.id}
                className={`p-3.5 rounded-xl border transition ${
                  p.isDefault
                    ? 'border-indigo-500/50 bg-indigo-500/10'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {p.name}
                      </span>
                      {p.isDefault && (
                        <span className="px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold">
                          ACTIVE DEFAULT
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-mono text-slate-400 mt-1 break-all">
                      {p.baseUrl}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-slate-300">
                      <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-sky-300">
                        Model: {p.modelName}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                        Key: {p.hasApiKey ? p.maskedApiKey : 'None (Local)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    {!p.isDefault && (
                      <button
                        type="button"
                        onClick={() => handleSetDefault(p.id)}
                        title="Set as Default Provider"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-300 hover:bg-slate-800 transition"
                      >
                        <Star className="w-4 h-4" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleTestConfig(p.id)}
                      title="Test Connection"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-300 hover:bg-slate-800 transition"
                    >
                      <Activity className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => startEdit(p)}
                      title="Edit Provider"
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-300 hover:bg-slate-800 transition"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    {providers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDelete(p.id)}
                        title="Delete Provider"
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Right column: Add / Edit Form + Quick Presets */}
          <div className="lg:col-span-6 p-5 space-y-4">
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block mb-2">
                1-Click Provider Templates
              </span>
              <div className="grid grid-cols-2 gap-2">
                {PROVIDER_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => applyPreset(preset)}
                    className="px-3 py-2 rounded-lg border border-slate-800 bg-slate-950 hover:border-indigo-500/50 hover:bg-indigo-500/10 text-left transition"
                  >
                    <div className="text-xs font-semibold text-slate-200">
                      {preset.label}
                    </div>
                    <div className="text-[10px] font-mono text-slate-400 truncate">
                      {preset.baseUrl}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSave} className="space-y-3 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-indigo-300">
                  {editingId ? 'Edit Selected Provider' : 'Add / Configure Provider'}
                </h4>
                {editingId && (
                  <button
                    type="button"
                    onClick={() => setEditingId(null)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel Edit
                  </button>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Display Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. LM Studio Qwen Coder"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300 mb-1">
                  Base URL (OpenAI-Compatible Endpoint)
                </label>
                <input
                  type="url"
                  required
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1 or http://localhost:1234/v1"
                  className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Model Name
                  </label>
                  <input
                    type="text"
                    required
                    value={modelName}
                    onChange={(e) => setModelName(e.target.value)}
                    placeholder="gpt-4o-mini / llama3.1:8b"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    API Key {editingId ? '(Leave blank to keep existing)' : '(Optional for local)'}
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(e) => setIsDefault(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-950 text-indigo-600"
                />
                Use as active default AI provider for reviews and chat
              </label>

              {error && (
                <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300">
                  {error}
                </div>
              )}

              {testResult && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-start gap-2 ${
                    testResult.reachable
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-200'
                  }`}
                >
                  {testResult.reachable ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-1">
                    <p>{testResult.message}</p>
                    {testResult.discoveredModels &&
                      testResult.discoveredModels.length > 0 && (
                        <p className="text-[11px] font-mono text-slate-300">
                          Discovered models: {testResult.discoveredModels.slice(0, 5).join(', ')}
                        </p>
                      )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <button
                  type="button"
                  disabled={testingId !== null}
                  onClick={() => handleTestConfig()}
                  className="px-3.5 py-2 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 transition"
                >
                  {testingId === 'form' ? 'Testing...' : 'Test Endpoint'}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition"
                >
                  {saving
                    ? 'Saving...'
                    : editingId
                      ? 'Update Provider Configuration'
                      : 'Save Provider Configuration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
