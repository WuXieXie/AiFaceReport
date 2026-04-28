'use client';

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, Camera, X, Loader2, ScanFace, ImagePlus } from 'lucide-react';

type UploadStatus = 'idle' | 'preview' | 'scanning' | 'analyzing' | 'done' | 'error';

export default function AnalysisPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [status, setStatus] = useState<UploadStatus>('idle');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('请选择图片文件');
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
      setStatus('preview');
      setError('');
    };
    reader.readAsDataURL(file);
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
      });
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
      }, 100);
    } catch {
      setError('无法访问摄像头，请检查权限设置');
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], 'capture.jpg', { type: 'image/jpeg' });
      setImageFile(file);
      setImagePreview(canvas.toDataURL('image/jpeg'));
      setStatus('preview');
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setShowCamera(false);
  };

  const startAnalysis = async () => {
    if (!imageFile) return;
    setStatus('scanning');
    setError('');

    // Simulate scan animation for 2.5s then start actual analysis
    setTimeout(async () => {
      setStatus('analyzing');
      try {
        const formData = new FormData();
        formData.append('image', imageFile);

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 180000);
        const res = await fetch('/api/analysis', { method: 'POST', body: formData, signal: controller.signal });
        clearTimeout(timeout);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || '分析失败');
          setStatus('error');
          return;
        }

        setStatus('done');
        router.push(`/dashboard/reports/${data.reportId}`);
      } catch {
        setError('网络错误，请重试');
        setStatus('error');
      }
    }, 2500);
  };

  const resetUpload = () => {
    setImagePreview(null);
    setImageFile(null);
    setStatus('idle');
    setError('');
    stopCamera();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">面诊分析</h1>
        <p className="text-muted-foreground">上传面部照片，获取AI智能面诊分析报告</p>
      </div>

      {/* Upload Area */}
      {status === 'idle' && !showCamera && (
        <Card className="border-0 shadow-sm">
          <CardContent className="p-8">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-pink-200 rounded-2xl p-12 text-center cursor-pointer hover:border-primary hover:bg-pink-50/50 transition-all group"
            >
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-pink-100 to-rose-100 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                <ImagePlus className="w-10 h-10 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">点击上传面部照片</h3>
              <p className="text-sm text-muted-foreground mb-4">支持 JPG、PNG 格式，建议正面照</p>
              <div className="flex items-center justify-center gap-4">
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}>
                  <Upload className="w-4 h-4 mr-2" />
                  选择文件
                </Button>
                <Button variant="outline" size="sm" onClick={(e) => { e.stopPropagation(); startCamera(); }}>
                  <Camera className="w-4 h-4 mr-2" />
                  拍照识别
                </Button>
              </div>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
          </CardContent>
        </Card>
      )}

      {/* Camera View */}
      {showCamera && (
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg">拍照识别</CardTitle>
            <Button variant="ghost" size="icon" onClick={stopCamera}><X className="w-5 h-5" /></Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative aspect-[4/3] bg-black">
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              <div className="absolute inset-0 border-4 border-white/20 rounded-lg pointer-events-none" />
            </div>
            <div className="p-4 flex justify-center">
              <Button onClick={capturePhoto} size="lg" className="rounded-full w-16 h-16 p-0">
                <Camera className="w-8 h-8" />
              </Button>
            </div>
          </CardContent>
          <canvas ref={canvasRef} className="hidden" />
        </Card>
      )}

      {/* Image Preview */}
      {(status === 'preview' || status === 'error') && imagePreview && (
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className="relative">
              <img src={imagePreview} alt="预览" className="w-full max-h-[500px] object-contain bg-gray-50" />
              <button onClick={resetUpload} className="absolute top-3 right-3 w-8 h-8 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              {error && (
                <div className="text-sm text-destructive bg-destructive/10 rounded-md p-3">{error}</div>
              )}

              <div className="flex gap-3">
                <Button onClick={startAnalysis} className="flex-1" size="lg">
                  <ScanFace className="w-5 h-5 mr-2" />
                  开始分析
                </Button>
                <Button onClick={resetUpload} variant="outline" size="lg">
                  重新上传
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scanning Animation */}
      {(status === 'scanning' || status === 'analyzing') && imagePreview && (
        <Card className="border-0 shadow-sm overflow-hidden">
          <CardContent className="p-0">
            <div className={`relative ${status === 'scanning' ? 'scan-animation' : ''}`}>
              <img src={imagePreview} alt="分析中" className="w-full max-h-[500px] object-contain bg-gray-50 opacity-80" />
              <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
            </div>
            <div className="p-6 flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-lg font-medium">
                {status === 'scanning' ? 'AI正在扫描面部特征...' : '正在生成分析报告...'}
              </p>
              <p className="text-sm text-muted-foreground">
                {status === 'scanning' ? '识别面部轮廓与关键点位' : '综合分析六维美学指数'}
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
