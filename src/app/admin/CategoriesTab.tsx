'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FolderTree, Plus, Pencil, Trash2, Loader2, X, Check } from 'lucide-react';

interface Category {
  id: string;
  name: string;
  description: string | null;
  icon: string | null;
  sortOrder: number;
  status: string;
}

export default function CategoriesTab() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '', sortOrder: 0 });
  const [saving, setSaving] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/admin/categories');
      const data = await res.json();
      if (data.categories) setCategories(data.categories);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch('/api/admin/categories', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, ...form }),
        });
      } else {
        await fetch('/api/admin/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', description: '', sortOrder: 0 });
      await fetchCategories();
    } catch {}
    setSaving(false);
  };

  const handleEdit = (cat: Category) => {
    setEditingId(cat.id);
    setForm({ name: cat.name, description: cat.description || '', sortOrder: cat.sortOrder });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此类别？')) return;
    try {
      await fetch('/api/admin/categories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await fetchCategories();
    } catch {}
  };

  const handleToggleStatus = async (cat: Category) => {
    await fetch('/api/admin/categories', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: cat.id, status: cat.status === 'active' ? 'disabled' : 'active' }),
    });
    await fetchCategories();
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
              <CardTitle className="flex items-center gap-2"><FolderTree className="w-5 h-5" />项目类别管理</CardTitle>
              <CardDescription className="mt-1">管理医美项目类别</CardDescription>
            </div>
            <Button size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', description: '', sortOrder: 0 }); }}>
              <Plus className="w-4 h-4 mr-1" />添加类别
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
              <h4 className="text-sm font-medium">{editingId ? '编辑类别' : '新增类别'}</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Input placeholder="类别名称 *" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input placeholder="描述" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                <Input type="number" placeholder="排序" value={form.sortOrder} onChange={(e) => setForm({ ...form, sortOrder: parseInt(e.target.value) || 0 })} />
              </div>
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

          {categories.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无项目类别</p>
          ) : (
            <div className="space-y-2">
              {categories.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between p-3 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <span className={`w-2 h-2 rounded-full ${cat.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div>
                      <p className="font-medium text-sm">{cat.name}</p>
                      {cat.description && <p className="text-xs text-muted-foreground">{cat.description}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-muted-foreground mr-2">排序: {cat.sortOrder}</span>
                    <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(cat)} className="h-8 px-2">
                      {cat.status === 'active' ? '禁用' : '启用'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleEdit(cat)} className="h-8 px-2">
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(cat.id)} className="h-8 px-2 text-destructive hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
