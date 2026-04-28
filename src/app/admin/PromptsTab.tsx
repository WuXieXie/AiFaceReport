'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { MessageSquare, Plus, Pencil, Trash2, Loader2, X, Check, Star } from 'lucide-react';

interface Prompt {
  id: string;
  name: string;
  category: string | null;
  content: string;
  isDefault: boolean;
  status: string;
}

const CATEGORIES = [
  { value: 'analysis', label: '面诊分析' },
  { value: 'report', label: '报告生成' },
  { value: 'overlay', label: '提拉线生成' },
];

export default function PromptsTab() {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', category: 'analysis', content: '', isDefault: false });
  const [saving, setSaving] = useState(false);

  const fetchPrompts = async () => {
    try {
      const res = await fetch('/api/admin/prompts');
      const data = await res.json();
      if (data.prompts) setPrompts(data.prompts);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchPrompts(); }, []);

  const handleSubmit = async () => {
    if (!form.name.trim() || !form.content.trim()) return;
    setSaving(true);
    try {
      const method = editingId ? 'PUT' : 'POST';
      const body = editingId ? { id: editingId, ...form } : form;
      await fetch('/api/admin/prompts', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', category: 'analysis', content: '', isDefault: false });
      await fetchPrompts();
    } catch {}
    setSaving(false);
  };

  const handleEdit = (p: Prompt) => {
    setEditingId(p.id);
    setForm({ name: p.name, category: p.category || 'analysis', content: p.content, isDefault: p.isDefault });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此提示词？')) return;
    try {
      await fetch('/api/admin/prompts', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await fetchPrompts();
    } catch {}
  };

  const getCategoryLabel = (value: string | null) => {
    return CATEGORIES.find((c) => c.value === value)?.label || value || '--';
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><MessageSquare className="w-5 h-5" />提示词预设</CardTitle>
              <CardDescription className="mt-1">管理不同场景的AI提示词模板</CardDescription>
            </div>
            <Button size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', category: 'analysis', content: '', isDefault: false }); }}>
              <Plus className="w-4 h-4 mr-1" />添加提示词
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
              <h4 className="text-sm font-medium">{editingId ? '编辑提示词' : '新增提示词'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Input placeholder="提示词名称 *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
              <textarea
                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="提示词内容 *"
                value={form.content}
                onChange={(e) => setForm({ ...form, content: e.target.value })}
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded"
                />
                设为默认提示词
              </label>
              <div className="flex gap-2">
                <Button size="sm" onClick={handleSubmit} disabled={saving}>
                  {saving ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                  {editingId ? '保存' : '添加'}
                </Button>
                <Button size="sm" variant="outline" onClick={() => { setShowForm(false); setEditingId(null); }}>
                  <X className="w-4 h-4 mr-1" />取消
                </Button>
              </div>
            </div>
          )}

          {prompts.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无提示词预设</p>
          ) : (
            <div className="space-y-2">
              {prompts.map((p) => (
                <div key={p.id} className="p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{p.name}</p>
                      {p.isDefault && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{getCategoryLabel(p.category)}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(p)} className="h-8 px-2">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(p.id)} className="h-8 px-2 text-destructive hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{p.content}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
