'use client';

import { useCallback, useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateTimeSeconds } from '@/lib/display';
import { getUploadUrl } from '@/lib/uploads';
import { isReportImagePending, shouldPollReport } from '@/lib/report-status';
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer,
} from 'recharts';
import {
  ArrowLeft, AlertCircle,
  Lightbulb, TrendingUp, Download, Loader2, ImageIcon,
} from 'lucide-react';

interface Dimension { name: string; score: number; comment: string; }
interface Diagnosis { area: string; problem: string; severity: string; detail: string; }
interface Recommendation { project: string; category: string; description: string; priority: string; expectedEffect: string; }
interface Comparison { area: string; before: string; after: string; improvement: string; }

interface ReportData {
  id: string;
  title: string;
  imageUrl: string;
  overlayUrl: string | null;
  aiReportUrl: string | null;
  overallScore: number;
  textReport: string;
  status: string;
  createdAt: string;
}

export default function ReportDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [report, setReport] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);

  const reportId = params.id as string;

  const fetchReport = useCallback(() => {
    return fetch(`/api/analysis?id=${reportId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.report) {
          setReport(data.report);
          return data.report as ReportData;
        }
        return null;
      })
      .catch(() => null);
  }, [reportId]);

  useEffect(() => {
    fetchReport().finally(() => setLoading(false));
  }, [fetchReport]);

  useEffect(() => {
    if (!report || !shouldPollReport(report)) return;
    const timer = window.setInterval(() => {
      fetchReport();
    }, 3000);
    return () => window.clearInterval(timer);
  }, [fetchReport, report]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!report) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">报告不存在或加载失败</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>返回</Button>
      </div>
    );
  }

  let analysis: {
    overallScore: number;
    overallComment: string;
    dimensions: Dimension[];
    diagnosis: Diagnosis[];
    recommendations: Recommendation[];
    comparison: Comparison[];
  } | null = null;

  if (report.textReport) {
    try {
      analysis = JSON.parse(report.textReport);
    } catch (e) {
      analysis = null;
    }
  }

  if (!analysis) {
    return (
      <div className="text-center py-20">
        <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">正在生成分析结果...</p>
        <Button variant="outline" className="mt-4" onClick={() => router.back()}>返回</Button>
      </div>
    );
  }

  const radarData = analysis.dimensions.map((d) => ({
    subject: d.name,
    score: d.score,
    fullMark: 100,
  }));

  const severityColor = (s: string) => {
    if (s === '轻度') return 'text-green-600 bg-green-50';
    if (s === '中度') return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const priorityColor = (p: string) => {
    if (p === '高') return 'text-red-600 bg-red-50';
    if (p === '中') return 'text-amber-600 bg-amber-50';
    return 'text-blue-600 bg-blue-50';
  };
  const fullReportImageUrl = report.aiReportUrl || report.overlayUrl;
  const imagePending = isReportImagePending(report);

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">{report.title || '面诊分析报告'}</h1>
            <p className="text-sm text-muted-foreground">
              {formatDateTimeSeconds(report.createdAt)}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm">
          <Download className="w-4 h-4 mr-1" />
          导出报告
        </Button>
      </div>

      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader><CardTitle className="text-lg">AI完整报告图片</CardTitle></CardHeader>
        <CardContent className="p-0 bg-gray-50">
          {fullReportImageUrl ? (
            <img src={getUploadUrl(fullReportImageUrl)} alt="AI完整报告图片" className="w-full max-h-[1200px] object-contain" />
          ) : (
            <div className="min-h-[320px] flex flex-col items-center justify-center gap-3 text-muted-foreground">
              {imagePending ? (
                <Loader2 className="w-9 h-9 text-primary animate-spin" />
              ) : (
                <ImageIcon className="w-9 h-9" />
              )}
              <div className="text-center">
                <p className="font-medium text-foreground">{imagePending ? '报告图片生成中' : '报告图片暂未生成'}</p>
                <p className="text-sm mt-1">分析结果已生成，图片完成后会自动显示</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Original Image */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader><CardTitle className="text-lg">面部照片</CardTitle></CardHeader>
        <CardContent className="p-0">
          <img src={getUploadUrl(report.imageUrl)} alt="面部照片" className="w-full max-h-[500px] object-contain bg-gray-50" />
        </CardContent>
      </Card>

      {/* Overall Score + Radar Chart */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-lg">综合评分</CardTitle></CardHeader>
          <CardContent className="flex flex-col items-center">
            <div className="relative w-32 h-32 mb-4">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="#f3f4f6" strokeWidth="3" />
                <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  fill="none" stroke="url(#scoreGradient)" strokeWidth="3"
                  strokeDasharray={`${analysis.overallScore}, 100`} strokeLinecap="round" />
                <defs>
                  <linearGradient id="scoreGradient">
                    <stop offset="0%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#f43f5e" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-primary">{analysis.overallScore}</span>
                <span className="text-xs text-muted-foreground">/ 100</span>
              </div>
            </div>
            <p className="text-sm text-center text-muted-foreground leading-relaxed">
              {analysis.overallComment}
            </p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-sm">
          <CardHeader><CardTitle className="text-lg">六维美学指数</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#f0f0f0" />
                <PolarAngleAxis dataKey="subject" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 10 }} />
                <Radar name="评分" dataKey="score" stroke="#ec4899" fill="#ec4899" fillOpacity={0.2} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Dimension Details */}
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-lg">维度详解</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {analysis.dimensions.map((d, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-secondary/50">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-sm font-bold text-primary">{d.score}</span>
                </div>
                <div>
                  <h4 className="font-medium text-sm">{d.name}</h4>
                  <p className="text-xs text-muted-foreground mt-1">{d.comment}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Diagnosis */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-500" />
            面部问题诊断
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.diagnosis.map((d, i) => (
              <div key={i} className="p-4 rounded-lg border bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">{d.area}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${severityColor(d.severity)}`}>
                    {d.severity}
                  </span>
                </div>
                <p className="text-sm font-medium text-foreground">{d.problem}</p>
                <p className="text-sm text-muted-foreground mt-1">{d.detail}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Recommendations */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-primary" />
            推荐改善方案
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.recommendations.map((r, i) => (
              <div key={i} className="p-4 rounded-lg border bg-white">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">{r.project || r.category || '推荐项目'}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">{r.category}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${priorityColor(r.priority)}`}>
                    优先级: {r.priority}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{r.description}</p>
                <p className="text-sm text-primary mt-1">预期效果: {r.expectedEffect}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Effect Comparison */}
      <Card className="border-0 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-green-500" />
            效果预期对比
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {analysis.comparison.map((c, i) => (
              <div key={i} className="grid grid-cols-3 gap-4 p-4 rounded-lg border bg-white">
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">区域</span>
                  <span className="font-medium text-sm">{c.area}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">改善前</span>
                  <span className="text-sm text-red-600">{c.before}</span>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground block mb-1">改善后</span>
                  <span className="text-sm text-green-600">{c.after}</span>
                  <span className="text-xs text-primary block mt-0.5">{c.improvement}</span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
