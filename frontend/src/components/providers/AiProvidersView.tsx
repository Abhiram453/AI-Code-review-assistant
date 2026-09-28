'use client';

import React, { useState } from 'react';
import {
  Plus,
  Trash2,
  Activity,
  Check,
  Star,
  User,
  Lock,
  Cpu,
  Sliders,
} from 'lucide-react';
import { AiProviderConfig, UserProfile } from '@/types';
import { api } from '@/lib/api';
import { Button, InlineErrorState } from '@/components/ui/Primitives';

interface AiProvidersViewProps {
  providers: AiProviderConfig[];
  onRefreshProviders: () => Promise<void>;
}

type ConnectionState = 'untested' | 'testing' | 'connected' | 'failed';

export function AiProvidersView({
  providers,
  onRefreshProviders,
}: AiProvidersViewProps) {
  const [connStatus, setConnStatus] = useState<Record<string, ConnectionState>>(
    () => {
      const init: Record<string, ConnectionState> = {};
      for (const p of providers) {
        if (p.isDefault) init[p.id] = 'connected';
      }
      return init;
    },
  );
  const [connMessage, setConnMessage] = useState<Record<string, string>>({});
  const [drafts, setDrafts] = useState<
    Record<
      string,
      { name: string; baseUrl: string; modelName: string; apiKey: string }
    >
  >({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);

  // New provider form
  const [newName, setNewName] = useState('Custom OpenAI-Compatible');
  const [newType, setNewType] = useState('openai-compatible');
  const [newBaseUrl, setNewBaseUrl] = useState('http://localhost:1234/v1');
  const [newModel, setNewModel] = useState('qwen2.5-coder-7b-instruct');
  const [newApiKey, setNewApiKey] = useState('');
  const [error, setError] = useState<string | null>(null);

  const getDraft = (p: AiProviderConfig) =>
    drafts[p.id] || {
      name: p.name,
      baseUrl: p.baseUrl,
      modelName: p.modelName,
      apiKey: '',
    };

  const updateDraft = (
    p: AiProviderConfig,
    patch: Partial<{
      name: string;
      baseUrl: string;
      modelName: string;
      apiKey: string;
    }>,
  ) => {
    const current = getDraft(p);
    setDrafts((prev) => ({
      ...prev,
      [p.id]: { ...current, ...patch },
    }));
  };

  const handleTest = async (p: AiProviderConfig) => {
    const d = getDraft(p);
    setConnStatus((prev) => ({ ...prev, [p.id]: 'testing' }));
    try {
      const res = await api.testProvider({
        providerId: p.id,
        baseUrl: d.baseUrl,
        modelName: d.modelName,
        ...(d.apiKey.trim() ? { apiKey: d.apiKey.trim() } : {}),
      });
      setConnStatus((prev) => ({
        ...prev,
        [p.id]: res.reachable ? 'connected' : 'failed',
      }));
      setConnMessage((prev) => ({ ...prev, [p.id]: res.message }));
    } catch (err: any) {
      setConnStatus((prev) => ({ ...prev, [p.id]: 'failed' }));
      setConnMessage((prev) => ({
        ...prev,
        [p.id]: err?.message || 'Connection failed',
      }));
    }
  };

  const handleSaveProvider = async (p: AiProviderConfig) => {
    const d = getDraft(p);
    setSavingId(p.id);
    setError(null);
    try {
      await api.updateProvider(p.id, {
        name: d.name,
        baseUrl: d.baseUrl,
        modelName: d.modelName,
        ...(d.apiKey.trim() ? { apiKey: d.apiKey.trim() } : {}),
      });
      await onRefreshProviders();
      updateDraft(p, { apiKey: '' });
    } catch (err: any) {
      setError(err?.message || 'Failed to save provider');
    } finally {
      setSavingId(null);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await api.updateProvider(id, { isDefault: true });
      setConnStatus((prev) => ({ ...prev, [id]: 'connected' }));
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

  const handleCreateNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingId('new');
    setError(null);
    try {
      await api.createProvider({
        name: newName,
        providerType: newType,
        baseUrl: newBaseUrl,
        modelName: newModel,
        apiKey: newApiKey.trim(),
        isDefault: true,
      });
      await onRefreshProviders();
      setShowAddForm(false);
      setNewApiKey('');
    } catch (err: any) {
      setError(err?.message || 'Failed to add provider');
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#27272A]">
        <div>
          <h1 className="text-lg font-semibold text-[#F4F4F5] tracking-tight">
            AI Providers
          </h1>
          <p className="text-xs text-[#A1A1AA] mt-0.5">
            Connect CodeLens AI to your preferred AI model.
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          leftIcon={<Plus className="w-3.5 h-3.5" />}
          onClick={() => setShowAddForm((v) => !v)}
        >
          + Add Provider
        </Button>
      </div>

      {error && (
        <InlineErrorState
          title="AI provider configuration error"
          message={error}
          onRetry={() => setError(null)}
        />
      )}

      {/* + Add Provider Form */}
      {showAddForm && (
        <form
          onSubmit={handleCreateNew}
          className="rounded-lg border border-[#8B5CF6]/40 bg-[#141418] p-5 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#A78BFA]">
              Add OpenAI-Compatible Provider
            </h3>
            <div className="flex items-center gap-1.5 text-[11px]">
              {[
                {
                  label: 'OpenAI',
                  url: 'https://api.openai.com/v1',
                  model: 'gpt-4o-mini',
                  type: 'openai',
                },
                {
                  label: 'LM Studio',
                  url: 'http://localhost:1234/v1',
                  model: 'qwen2.5-coder-7b-instruct',
                  type: 'lm-studio',
                },
                {
                  label: 'Ollama',
                  url: 'http://localhost:11434/v1',
                  model: 'llama3.1:8b',
                  type: 'ollama',
                },
              ].map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setNewName(preset.label);
                    setNewBaseUrl(preset.url);
                    setNewModel(preset.model);
                    setNewType(preset.type);
                  }}
                  className="px-2 py-0.5 rounded bg-[#0F0F12] border border-[#27272A] text-[#A1A1AA] hover:text-[#F4F4F5]"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">
                Provider Name
              </label>
              <input
                type="text"
                required
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-[#0F0F12] border border-[#27272A] text-xs text-[#F4F4F5]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">
                Base URL
              </label>
              <input
                type="url"
                required
                value={newBaseUrl}
                onChange={(e) => setNewBaseUrl(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-[#0F0F12] border border-[#27272A] text-xs font-mono text-[#F4F4F5]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">
                Model
              </label>
              <input
                type="text"
                required
                value={newModel}
                onChange={(e) => setNewModel(e.target.value)}
                className="w-full px-3 py-1.5 rounded bg-[#0F0F12] border border-[#27272A] text-xs font-mono text-[#F4F4F5]"
              />
            </div>
            <div>
              <label className="block text-xs text-[#A1A1AA] mb-1">
                API Key
              </label>
              <input
                type="password"
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="••••••••••••••"
                className="w-full px-3 py-1.5 rounded bg-[#0F0F12] border border-[#27272A] text-xs font-mono text-[#F4F4F5]"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={savingId === 'new'}
            >
              Save Provider
            </Button>
          </div>
        </form>
      )}

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {providers.map((p) => {
          const d = getDraft(p);
          const state =
            connStatus[p.id] || (p.isDefault ? 'connected' : 'untested');

          return (
            <div
              key={p.id}
              className={`rounded-lg border p-4 space-y-3.5 transition ${
                p.isDefault
                  ? 'border-[#8B5CF6]/50 bg-[#141418] shadow-cl-glow'
                  : 'border-[#27272A] bg-[#141418]'
              }`}
            >
              {/* Card Top Row: Name + Connection Status */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-[#F4F4F5]">
                    {p.name}
                  </span>
                  {p.isDefault && (
                    <span className="px-1.5 py-0.5 rounded bg-[#8B5CF6]/15 text-[#A78BFA] border border-[#8B5CF6]/30 text-[10px] font-mono uppercase">
                      Active
                    </span>
                  )}
                </div>

                {/* Connection States: ● Connected | ○ Not tested | × Connection failed */}
                <div className="text-xs font-mono">
                  {state === 'connected' ? (
                    <span className="inline-flex items-center gap-1.5 text-[#22C55E]">
                      <span>●</span> Connected
                    </span>
                  ) : state === 'failed' ? (
                    <span className="inline-flex items-center gap-1.5 text-[#EF4444]">
                      <span>×</span> Connection failed
                    </span>
                  ) : state === 'testing' ? (
                    <span className="inline-flex items-center gap-1.5 text-[#A78BFA]">
                      <span>◌</span> Testing...
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 text-[#71717A]">
                      <span>○</span> Not tested
                    </span>
                  )}
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-2.5">
                <div>
                  <label className="block text-[11px] text-[#71717A] mb-1">
                    Base URL
                  </label>
                  <input
                    type="url"
                    value={d.baseUrl}
                    onChange={(e) =>
                      updateDraft(p, { baseUrl: e.target.value })
                    }
                    className="w-full px-2.5 py-1.5 rounded bg-[#0F0F12] border border-[#27272A] text-xs font-mono text-[#F4F4F5] focus:outline-none focus:border-[#8B5CF6]"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] text-[#71717A] mb-1">
                      Model
                    </label>
                    <input
                      type="text"
                      value={d.modelName}
                      onChange={(e) =>
                        updateDraft(p, { modelName: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded bg-[#0F0F12] border border-[#27272A] text-xs font-mono text-[#F4F4F5] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-[#71717A] mb-1">
                      API Key
                    </label>
                    <input
                      type="password"
                      value={d.apiKey}
                      onChange={(e) =>
                        updateDraft(p, { apiKey: e.target.value })
                      }
                      placeholder={p.hasApiKey ? '••••••••••••••' : '••••••••••••••'}
                      className="w-full px-2.5 py-1.5 rounded bg-[#0F0F12] border border-[#27272A] text-xs font-mono text-[#F4F4F5] placeholder:text-[#71717A] focus:outline-none focus:border-[#8B5CF6]"
                    />
                  </div>
                </div>
              </div>

              {connMessage[p.id] && (
                <div className="text-[11px] text-[#A1A1AA] bg-[#0F0F12] border border-[#27272A] rounded px-2.5 py-1.5">
                  {connMessage[p.id]}
                </div>
              )}

              {/* Actions: Test Connection, Save, Delete */}
              <div className="flex items-center justify-between pt-2 border-t border-[#27272A]/80">
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="secondary"
                    size="xs"
                    leftIcon={<Activity className="w-3 h-3" />}
                    onClick={() => handleTest(p)}
                  >
                    Test Connection
                  </Button>
                  {!p.isDefault && (
                    <Button
                      variant="ghost"
                      size="xs"
                      leftIcon={<Star className="w-3 h-3" />}
                      onClick={() => handleSetDefault(p.id)}
                    >
                      Set Default
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    variant="primary"
                    size="xs"
                    disabled={savingId === p.id}
                    leftIcon={<Check className="w-3 h-3" />}
                    onClick={() => handleSaveProvider(p)}
                  >
                    {savingId === p.id ? 'Saving...' : 'Save'}
                  </Button>
                  {providers.length > 1 && (
                    <Button
                      variant="danger"
                      size="xs"
                      leftIcon={<Trash2 className="w-3 h-3" />}
                      onClick={() => handleDelete(p.id)}
                    >
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// --- SECTION 16: SETTINGS VIEW ---
export function SettingsView({
  user,
  providers,
  onUserUpdated,
  onOpenProvidersTab,
}: {
  user: UserProfile;
  providers: AiProviderConfig[];
  onUserUpdated: (u: UserProfile) => void;
  onOpenProvidersTab: () => void;
}) {
  const [name, setName] = useState(user.name);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [defaultTemplate, setDefaultTemplate] = useState('security');
  const [autoIndex, setAutoIndex] = useState(true);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const activeProvider =
    providers.find((p) => p.isDefault) || providers[0];

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const updated = await api.updateProfile({ name });
      onUserUpdated({ ...user, name: updated.name });
      setStatusMsg('Account profile updated.');
      setTimeout(() => setStatusMsg(null), 2500);
    } catch (err: any) {
      setStatusMsg(err?.message || 'Could not update profile');
    }
  };

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.updatePassword({
        currentPassword: currentPassword || undefined,
        newPassword,
      });
      setCurrentPassword('');
      setNewPassword('');
      setStatusMsg(res.message);
      setTimeout(() => setStatusMsg(null), 2500);
    } catch (err: any) {
      setStatusMsg(err?.message || 'Could not update password');
    }
  };

  return (
    <div className="space-y-5 max-w-3xl mx-auto">
      <div className="pb-3 border-b border-[#27272A]">
        <h1 className="text-lg font-semibold text-[#F4F4F5] tracking-tight">
          Settings
        </h1>
        <p className="text-xs text-[#A1A1AA] mt-0.5">
          Manage your developer account, security credentials, AI providers, and workspace preferences.
        </p>
      </div>

      {statusMsg && (
        <div className="rounded-md bg-[#22C55E]/15 border border-[#22C55E]/30 px-3.5 py-2 text-xs text-[#22C55E]">
          {statusMsg}
        </div>
      )}

      {/* 1. Account */}
      <form
        onSubmit={handleSaveProfile}
        className="rounded-lg border border-[#27272A] bg-[#141418] p-4 space-y-3"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-[#F4F4F5]">
          <User className="w-3.5 h-3.5 text-[#A78BFA]" />
          Account
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-[#71717A] mb-1">
              Display Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 rounded bg-[#0F0F12] border border-[#27272A] text-xs text-[#F4F4F5]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#71717A] mb-1">
              Email Address
            </label>
            <input
              type="email"
              disabled
              value={user.email}
              className="w-full px-3 py-1.5 rounded bg-[#09090B] border border-[#27272A] text-xs text-[#71717A] cursor-not-allowed"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" size="xs">
            Save Account
          </Button>
        </div>
      </form>

      {/* 2. Security */}
      <form
        onSubmit={handleSavePassword}
        className="rounded-lg border border-[#27272A] bg-[#141418] p-4 space-y-3"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-[#F4F4F5]">
          <Lock className="w-3.5 h-3.5 text-[#A78BFA]" />
          Security
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] text-[#71717A] mb-1">
              Current Password
            </label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••••••••"
              className="w-full px-3 py-1.5 rounded bg-[#0F0F12] border border-[#27272A] text-xs text-[#F4F4F5]"
            />
          </div>
          <div>
            <label className="block text-[11px] text-[#71717A] mb-1">
              New Password
            </label>
            <input
              type="password"
              required
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full px-3 py-1.5 rounded bg-[#0F0F12] border border-[#27272A] text-xs text-[#F4F4F5]"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button type="submit" variant="secondary" size="xs">
            Update Password
          </Button>
        </div>
      </form>

      {/* 3. AI Providers Summary */}
      <div className="rounded-lg border border-[#27272A] bg-[#141418] p-4 flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-[#F4F4F5]">
            <Cpu className="w-3.5 h-3.5 text-[#A78BFA]" />
            AI Providers
          </div>
          <p className="text-xs text-[#A1A1AA]">
            Active model:{' '}
            <span className="font-mono text-[#F4F4F5]">
              {activeProvider?.modelName || 'qwen2.5-coder-7b-instruct'}
            </span>{' '}
            via{' '}
            <span className="font-mono text-[#71717A]">
              {activeProvider?.baseUrl || 'http://localhost:1234/v1'}
            </span>
          </p>
        </div>
        <Button variant="secondary" size="xs" onClick={onOpenProvidersTab}>
          Manage Providers →
        </Button>
      </div>

      {/* 4. Preferences */}
      <div className="rounded-lg border border-[#27272A] bg-[#141418] p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs font-semibold text-[#F4F4F5]">
          <Sliders className="w-3.5 h-3.5 text-[#A78BFA]" />
          Preferences
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#A1A1AA]">Default Review Mode</span>
          <select
            value={defaultTemplate}
            onChange={(e) => setDefaultTemplate(e.target.value)}
            className="px-2.5 py-1 rounded bg-[#0F0F12] border border-[#27272A] text-xs text-[#F4F4F5]"
          >
            <option value="security">Security Review</option>
            <option value="performance">Performance Review</option>
            <option value="quality">Code Quality Review</option>
          </select>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-[#A1A1AA]">
            Automatically build context index on ZIP upload
          </span>
          <input
            type="checkbox"
            checked={autoIndex}
            onChange={(e) => setAutoIndex(e.target.checked)}
            className="rounded border-[#27272A] bg-[#0F0F12] text-[#8B5CF6]"
          />
        </div>
      </div>
    </div>
  );
}
