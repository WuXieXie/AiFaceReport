'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAppStore } from '@/lib/store';
import {
  Sparkles, Settings, Building2,
  Key, MessageSquare, FolderTree, LogOut, Save, Loader2,
} from 'lucide-react';
import CategoriesTab from './CategoriesTab';
import PromptsTab from './PromptsTab';
import OrgsTab from './OrgsTab';

type Tab = 'config' | 'orgs' | 'categories' | 'prompts';
type ConfigPanel = 'analysis' | 'image';

export default function AdminPage() {
  const router = useRouter();
  const { user, setUser } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('config');
  const [activeConfigPanel, setActiveConfigPanel] = useState<ConfigPanel>('analysis');
  const [saving, setSaving] = useState(false);
  const [configs, setConfigs] = useState<Record<string, string>>({
    ai_analysis_provider: 'openai',
    ai_image_provider: 'openai',
    ai_image_mode: 'edit',
    openai_api_key: '',
    openai_base_url: 'https://api.openai.com/v1',
    openai_model: 'gpt-5.4',
    openai_image_model: 'gpt-image-1',
    xai_api_key: '',
    xai_base_url: 'https://api.x.ai/v1',
    xai_model: 'grok-4.20',
    xai_image_model: 'grok-imagine-image',
    credits_per_analysis: '1',
  });

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.user?.type === 'admin') {
          setUser(data.user);
        } else {
          router.replace('/login');
        }
      })
      .catch(() => router.replace('/login'))
      .finally(() => setLoading(false));
  }, [router, setUser]);

  useEffect(() => {
    if (!loading && user?.type === 'admin') {
      fetch('/api/admin/config')
        .then((r) => r.json())
        .then((data) => {
          if (data.configs) {
            const map: Record<string, string> = {};
            data.configs.forEach((c: { key: string; value: string }) => { map[c.key] = c.value; });
            setConfigs((prev) => ({ ...prev, ...map }));
          }
        })
        .catch(() => {});
    }
  }, [loading, user]);

  const handleSaveConfig = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ configs }),
      });
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.replace('/login');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const tabs = [
    { id: 'config' as Tab, label: '接口配置', icon: Key },
    { id: 'orgs' as Tab, label: '机构管理', icon: Building2 },
    { id: 'categories' as Tab, label: '项目类别', icon: FolderTree },
    { id: 'prompts' as Tab, label: '提示词预设', icon: MessageSquare },
  ];
  const analysisProvider = configs.ai_analysis_provider === 'grok' ? 'grok' : 'openai';
  const imageProvider = configs.ai_image_provider === 'grok' ? 'grok' : 'openai';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-pink-500 to-rose-600 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold">管理后台</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-1" />退出
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <div className="w-56 shrink-0">
            <nav className="space-y-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
                    activeTab === tab.id
                      ? 'bg-primary/10 text-primary font-medium'
                      : 'text-muted-foreground hover:bg-secondary'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1 space-y-6">
            {/* API Config */}
            {activeTab === 'config' && (
              <Card className="border-0 shadow-sm">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5" />接口配置</CardTitle>
                  <CardDescription>配置文本分析与提拉线图片生成接口，可分别切换 OpenAI 或 Grok</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveConfigPanel('analysis')}
                      className={`rounded-lg border p-4 text-left transition-colors ${
                        activeConfigPanel === 'analysis'
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-white hover:bg-secondary/60'
                      }`}
                    >
                      <p className="font-medium">文本分析配置</p>
                      <p className="mt-1 text-xs text-muted-foreground">配置面诊 JSON 分析接口、Key、Base URL 和分析模型。</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveConfigPanel('image')}
                      className={`rounded-lg border p-4 text-left transition-colors ${
                        activeConfigPanel === 'image'
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-white hover:bg-secondary/60'
                      }`}
                    >
                      <p className="font-medium">提拉线图片配置</p>
                      <p className="mt-1 text-xs text-muted-foreground">配置面部提拉线标注图接口、图片模型和生成方式。</p>
                    </button>
                  </div>

                  {activeConfigPanel === 'analysis' && (
                    <div className="space-y-4 rounded-lg border bg-white p-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">文本分析供应商</label>
                        <select
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={configs.ai_analysis_provider}
                          onChange={(e) => setConfigs({ ...configs, ai_analysis_provider: e.target.value })}
                        >
                          <option value="openai">OpenAI</option>
                          <option value="grok">Grok / xAI</option>
                        </select>
                      </div>

                      {analysisProvider === 'openai' ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">OpenAI API Key</label>
                            <Input
                              type="password"
                              placeholder="sk-..."
                              value={configs.openai_api_key}
                              onChange={(e) => setConfigs({ ...configs, openai_api_key: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">OpenAI API Base URL</label>
                            <Input
                              placeholder="https://api.openai.com/v1"
                              value={configs.openai_base_url}
                              onChange={(e) => setConfigs({ ...configs, openai_base_url: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">OpenAI 分析模型</label>
                            <Input
                              placeholder="gpt-5.4"
                              value={configs.openai_model}
                              onChange={(e) => setConfigs({ ...configs, openai_model: e.target.value })}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Grok / xAI API Key</label>
                            <Input
                              type="password"
                              placeholder="xai-..."
                              value={configs.xai_api_key}
                              onChange={(e) => setConfigs({ ...configs, xai_api_key: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Grok / xAI Base URL</label>
                            <Input
                              placeholder="https://api.x.ai/v1"
                              value={configs.xai_base_url}
                              onChange={(e) => setConfigs({ ...configs, xai_base_url: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Grok 分析模型</label>
                            <Input
                              placeholder="grok-4.20"
                              value={configs.xai_model}
                              onChange={(e) => setConfigs({ ...configs, xai_model: e.target.value })}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {activeConfigPanel === 'image' && (
                    <div className="space-y-4 rounded-lg border bg-white p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">提拉线图片供应商</label>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={configs.ai_image_provider}
                            onChange={(e) => setConfigs({ ...configs, ai_image_provider: e.target.value })}
                          >
                            <option value="openai">OpenAI</option>
                            <option value="grok">Grok / xAI</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">图片生成方式</label>
                          <select
                            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={configs.ai_image_mode}
                            onChange={(e) => setConfigs({ ...configs, ai_image_mode: e.target.value })}
                          >
                            <option value="edit">基于原图编辑</option>
                            <option value="generate">参考原图生成新图</option>
                          </select>
                        </div>
                      </div>

                      {imageProvider === 'openai' ? (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">OpenAI API Key</label>
                            <Input
                              type="password"
                              placeholder="sk-..."
                              value={configs.openai_api_key}
                              onChange={(e) => setConfigs({ ...configs, openai_api_key: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">OpenAI API Base URL</label>
                            <Input
                              placeholder="https://api.openai.com/v1"
                              value={configs.openai_base_url}
                              onChange={(e) => setConfigs({ ...configs, openai_base_url: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">OpenAI 图片模型</label>
                            <Input
                              placeholder="gpt-image-1"
                              value={configs.openai_image_model}
                              onChange={(e) => setConfigs({ ...configs, openai_image_model: e.target.value })}
                            />
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Grok / xAI API Key</label>
                            <Input
                              type="password"
                              placeholder="xai-..."
                              value={configs.xai_api_key}
                              onChange={(e) => setConfigs({ ...configs, xai_api_key: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Grok / xAI Base URL</label>
                            <Input
                              placeholder="https://api.x.ai/v1"
                              value={configs.xai_base_url}
                              onChange={(e) => setConfigs({ ...configs, xai_base_url: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Grok 图片模型</label>
                            <Input
                              placeholder="grok-imagine-image"
                              value={configs.xai_image_model}
                              onChange={(e) => setConfigs({ ...configs, xai_image_model: e.target.value })}
                            />
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-medium">每次分析消耗积分</label>
                    <Input
                      type="number"
                      value={configs.credits_per_analysis}
                      onChange={(e) => setConfigs({ ...configs, credits_per_analysis: e.target.value })}
                    />
                  </div>
                  <Button onClick={handleSaveConfig} disabled={saving}>
                    {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                    保存配置
                  </Button>
                </CardContent>
              </Card>
            )}

            {activeTab === 'orgs' && <OrgsTab />}
            {activeTab === 'categories' && <CategoriesTab />}
            {activeTab === 'prompts' && <PromptsTab />}
          </div>
        </div>
      </div>
    </div>
  );
}
