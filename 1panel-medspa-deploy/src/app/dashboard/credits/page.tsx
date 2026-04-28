'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard, Plus, Loader2, TrendingDown, TrendingUp } from 'lucide-react';

interface CreditLogItem {
  id: string;
  amount: number;
  balance: number;
  type: string;
  description: string | null;
  createdAt: string;
}

export default function CreditsPage() {
  const [credits, setCredits] = useState<number | null>(null);
  const [logs, setLogs] = useState<CreditLogItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/dashboard/stats').then((r) => r.json()),
      fetch('/api/dashboard/credits').then((r) => r.json()).catch(() => ({ logs: [] })),
    ])
      .then(([stats, creditsData]) => {
        if (stats.stats?.credits !== undefined) setCredits(stats.stats.credits);
        if (creditsData.logs) setLogs(creditsData.logs);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">积分管理</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm bg-gradient-to-br from-pink-500 to-rose-600 text-white">
          <CardContent className="p-6">
            <p className="text-sm opacity-80">当前积分余额</p>
            <p className="text-4xl font-bold mt-2">{credits ?? '--'}</p>
            <Button variant="secondary" className="mt-4" disabled>
              <Plus className="w-4 h-4 mr-2" />
              充值积分（即将开放）
            </Button>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-lg flex items-center gap-2"><CreditCard className="w-5 h-5" />积分说明</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• 每次面诊分析消耗 1 积分</p>
            <p>• 生成AI完整报告图片额外消耗 1 积分</p>
            <p>• 充值功能即将开放，敬请期待</p>
            <p>• 如需充值请联系管理员</p>
          </CardContent>
        </Card>
      </div>

      {logs.length > 0 && (
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-lg">积分记录</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-2">
              {logs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div className="flex items-center gap-3">
                    {log.amount > 0 ? (
                      <TrendingUp className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingDown className="w-4 h-4 text-red-500" />
                    )}
                    <div>
                      <p className="text-sm">{log.description || (log.amount > 0 ? '积分充值' : '积分消费')}</p>
                      <p className="text-xs text-muted-foreground">{new Date(log.createdAt).toLocaleString('zh-CN')}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${log.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {log.amount > 0 ? '+' : ''}{log.amount}
                    </p>
                    <p className="text-xs text-muted-foreground">余额: {log.balance}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
