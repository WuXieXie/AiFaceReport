'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Building2, Plus, Pencil, Loader2, X, Check, Users, FileText, CreditCard } from 'lucide-react';

interface Organization {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  description: string | null;
  status: string;
  credits: number;
  _count: { employees: number; reports: number };
}

export default function OrgsTab() {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', address: '', phone: '', description: '', credits: 0,
    ownerUsername: '', ownerPassword: '', ownerName: '',
  });
  const [saving, setSaving] = useState(false);

  const fetchOrgs = async () => {
    try {
      const res = await fetch('/api/admin/organizations');
      const data = await res.json();
      if (data.organizations) setOrgs(data.organizations);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { fetchOrgs(); }, []);

  const handleSubmit = async () => {
    if (!form.name.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await fetch('/api/admin/organizations', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: editingId, name: form.name, address: form.address, phone: form.phone, description: form.description, credits: form.credits }),
        });
      } else {
        await fetch('/api/admin/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        });
      }
      setShowForm(false);
      setEditingId(null);
      setForm({ name: '', address: '', phone: '', description: '', credits: 0, ownerUsername: '', ownerPassword: '', ownerName: '' });
      await fetchOrgs();
    } catch {}
    setSaving(false);
  };

  const handleEdit = (org: Organization) => {
    setEditingId(org.id);
    setForm({
      name: org.name, address: org.address || '', phone: org.phone || '',
      description: org.description || '', credits: org.credits,
      ownerUsername: '', ownerPassword: '', ownerName: '',
    });
    setShowForm(true);
  };

  const handleToggleStatus = async (org: Organization) => {
    await fetch('/api/admin/organizations', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: org.id, status: org.status === 'active' ? 'disabled' : 'active' }),
    });
    await fetchOrgs();
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const fieldLabelClass = 'text-xs font-medium text-muted-foreground';

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><Building2 className="w-5 h-5" />机构管理</CardTitle>
              <CardDescription className="mt-1">管理医美机构及其员工</CardDescription>
            </div>
            <Button size="sm" onClick={() => { setShowForm(true); setEditingId(null); setForm({ name: '', address: '', phone: '', description: '', credits: 0, ownerUsername: '', ownerPassword: '', ownerName: '' }); }}>
              <Plus className="w-4 h-4 mr-1" />添加机构
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
              <div className="mb-6 p-4 bg-gray-50 rounded-lg space-y-3">
                <h4 className="text-sm font-medium">{editingId ? '编辑机构' : '新增机构'}</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <label className="space-y-1.5">
                    <span className={fieldLabelClass}>机构名称 <span className="text-destructive">*</span></span>
                    <Input placeholder="例如：示范医美机构" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    <span className="text-[11px] text-muted-foreground">用于后台列表、员工所属机构和报告归属展示。</span>
                  </label>
                  <label className="space-y-1.5">
                    <span className={fieldLabelClass}>联系电话</span>
                    <Input placeholder="例如：010-12345678" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                    <span className="text-[11px] text-muted-foreground">支持座机或手机号，便于管理员联系机构。</span>
                  </label>
                  <label className="space-y-1.5">
                    <span className={fieldLabelClass}>机构地址</span>
                    <Input placeholder="例如：北京市朝阳区示范路1号" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                    <span className="text-[11px] text-muted-foreground">填写门店或总部地址，可为空。</span>
                  </label>
                  <label className="space-y-1.5">
                    <span className={fieldLabelClass}>机构简介</span>
                    <Input placeholder="例如：专注轻医美和抗衰项目" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    <span className="text-[11px] text-muted-foreground">简短说明机构定位，会显示在机构列表中。</span>
                  </label>
                  <label className="space-y-1.5">
                    <span className={fieldLabelClass}>{editingId ? '当前积分' : '初始积分'}</span>
                    <Input type="number" min={0} placeholder="例如：100" value={form.credits} onChange={(e) => setForm({ ...form, credits: parseInt(e.target.value, 10) || 0 })} />
                    <span className="text-[11px] text-muted-foreground">每次面诊分析会扣减积分，不能小于 0。</span>
                  </label>
                </div>
                {!editingId && (
                  <>
                    <h5 className="text-sm font-medium text-muted-foreground pt-2">机构负责人（可选）</h5>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <label className="space-y-1.5">
                        <span className={fieldLabelClass}>负责人用户名</span>
                        <Input placeholder="例如：demo_owner" value={form.ownerUsername} onChange={(e) => setForm({ ...form, ownerUsername: e.target.value })} />
                        <span className="text-[11px] text-muted-foreground">用于负责人登录员工端。</span>
                      </label>
                      <label className="space-y-1.5">
                        <span className={fieldLabelClass}>负责人密码</span>
                        <Input type="password" placeholder="建议至少 6 位" value={form.ownerPassword} onChange={(e) => setForm({ ...form, ownerPassword: e.target.value })} />
                        <span className="text-[11px] text-muted-foreground">创建后请通知负责人及时修改。</span>
                      </label>
                      <label className="space-y-1.5">
                        <span className={fieldLabelClass}>负责人姓名</span>
                        <Input placeholder="例如：张医生" value={form.ownerName} onChange={(e) => setForm({ ...form, ownerName: e.target.value })} />
                        <span className="text-[11px] text-muted-foreground">显示在团队成员与报告记录中。</span>
                      </label>
                    </div>
                  </>
                )}
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

          {orgs.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无机构</p>
          ) : (
            <div className="space-y-3">
              {orgs.map((org) => (
                <div key={org.id} className="p-4 rounded-lg border bg-white hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${org.status === 'active' ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <p className="font-medium">{org.name}</p>
                      </div>
                      {org.description && <p className="text-sm text-muted-foreground mt-1">{org.description}</p>}
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        {org.phone && <span>电话: {org.phone}</span>}
                        {org.address && <span>地址: {org.address}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="sm" variant="ghost" onClick={() => handleToggleStatus(org)} className="h-8 px-2 text-xs">
                        {org.status === 'active' ? '禁用' : '启用'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleEdit(org)} className="h-8 px-2">
                        <Pencil className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t text-sm">
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <Users className="w-3.5 h-3.5" /><span>{org._count.employees} 员工</span>
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground">
                      <FileText className="w-3.5 h-3.5" /><span>{org._count.reports} 报告</span>
                    </div>
                    <div className="flex items-center gap-1 text-primary font-medium">
                      <CreditCard className="w-3.5 h-3.5" /><span>{org.credits} 积分</span>
                    </div>
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
