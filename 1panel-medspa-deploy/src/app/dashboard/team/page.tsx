'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Loader2, Shield, User, Crown } from 'lucide-react';

interface Employee {
  id: string;
  username: string;
  name: string;
  phone: string | null;
  role: string;
  status: string;
  createdAt: string;
}

export default function TeamPage() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/dashboard/team')
      .then((r) => r.json())
      .then((data) => { if (data.employees) setEmployees(data.employees); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const roleIcon = (role: string) => {
    if (role === 'owner') return <Crown className="w-3.5 h-3.5 text-amber-500" />;
    if (role === 'manager') return <Shield className="w-3.5 h-3.5 text-blue-500" />;
    return <User className="w-3.5 h-3.5 text-gray-400" />;
  };

  const roleLabel = (role: string) => {
    const map: Record<string, string> = { owner: '负责人', manager: '管理员', staff: '员工' };
    return map[role] || role;
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">团队管理</h1>
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5" />团队成员 ({employees.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">暂无团队成员</p>
          ) : (
            <div className="space-y-2">
              {employees.map((emp) => (
                <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center text-sm font-medium text-pink-600">
                      {emp.name.charAt(0)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{emp.name}</p>
                        <div className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-0.5 rounded-full">
                          {roleIcon(emp.role)}
                          <span>{roleLabel(emp.role)}</span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">{emp.username}{emp.phone ? ` · ${emp.phone}` : ''}</p>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${emp.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-500'}`}>
                    {emp.status === 'active' ? '在职' : '已禁用'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
