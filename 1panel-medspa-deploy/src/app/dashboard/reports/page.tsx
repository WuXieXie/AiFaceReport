'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { formatDateTimeSeconds } from '@/lib/display';
import { getUploadUrl } from '@/lib/uploads';
import { FileText, Clock, CheckCircle, XCircle, Loader2, ScanFace } from 'lucide-react';

interface Report {
  id: string;
  title: string;
  imageUrl: string;
  status: string;
  overallScore: number | null;
  createdAt: string;
  employee: { name: string };
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/analysis')
      .then((r) => r.json())
      .then((data) => { if (data.reports) setReports(data.reports); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const statusIcon = (s: string) => {
    if (s === 'completed') return <CheckCircle className="w-4 h-4 text-green-500" />;
    if (s === 'analyzing' || s === 'image_processing') return <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />;
    if (s === 'failed') return <XCircle className="w-4 h-4 text-red-500" />;
    return <Clock className="w-4 h-4 text-amber-500" />;
  };

  const statusText = (s: string) => {
    const map: Record<string, string> = { pending: '待分析', analyzing: '分析中', image_processing: '图片生成中', completed: '已完成', failed: '失败' };
    return map[s] || s;
  };

  if (loading) {
    return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 text-primary animate-spin" /></div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">分析报告</h1>
          <p className="text-muted-foreground">查看所有面诊分析报告</p>
        </div>
        <Link href="/dashboard/analysis">
          <Button><ScanFace className="w-4 h-4 mr-2" />新建分析</Button>
        </Link>
      </div>

      {reports.length === 0 ? (
        <Card className="border-0 shadow-sm">
          <CardContent className="py-20 text-center">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground">暂无分析报告</p>
            <Link href="/dashboard/analysis">
              <Button className="mt-4" variant="outline">开始第一次分析</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reports.map((report) => (
            <Link key={report.id} href={`/dashboard/reports/${report.id}`}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer overflow-hidden">
                <div className="aspect-[4/3] bg-gray-100 relative">
                  <img src={getUploadUrl(report.imageUrl)} alt="" className="w-full h-full object-cover" />
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-white/90 backdrop-blur-sm rounded-full px-2 py-1">
                    {statusIcon(report.status)}
                    <span className="text-xs">{statusText(report.status)}</span>
                  </div>
                  {report.overallScore && (
                    <div className="absolute bottom-2 left-2 bg-gradient-to-r from-pink-500 to-rose-600 text-white rounded-full px-3 py-1 text-sm font-bold">
                      {report.overallScore}分
                    </div>
                  )}
                </div>
                <CardContent className="p-4">
                  <h3 className="font-medium text-sm truncate">{report.title || '面诊分析报告'}</h3>
                  <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                    <span>{report.employee?.name}</span>
                    <span>{formatDateTimeSeconds(report.createdAt)}</span>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
