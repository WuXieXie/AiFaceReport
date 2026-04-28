import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.type !== 'admin') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const configs = await prisma.systemConfig.findMany();
    return NextResponse.json({ configs });
  } catch (error) {
    console.error('Get config error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'admin') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { configs } = await req.json();
    for (const [key, value] of Object.entries(configs)) {
      await prisma.systemConfig.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value), label: key, group: 'api' },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save config error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
