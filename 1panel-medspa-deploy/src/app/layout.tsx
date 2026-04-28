import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '医美智能面诊系统',
  description: '专业AI医美面诊分析与咨询辅助平台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gradient-to-br from-pink-50/30 via-white to-rose-50/20 antialiased">
        {children}
      </body>
    </html>
  );
}
