import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const where = session.type === 'admin'
      ? {}
      : { organizationId: session.organizationId };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalReports, completedReports, todayReports] = await Promise.all([
      prisma.report.count({ where }),
      prisma.report.count({ where: { ...where, status: 'completed' } }),
      prisma.report.count({ where: { ...where, createdAt: { gte: today } } }),
    ]);

    let credits = 0;
    if (session.organizationId) {
      const org = await prisma.organization.findUnique({
        where: { id: session.organizationId },
      });
      credits = org?.credits || 0;
    }

    return NextResponse.json({
      stats: { totalReports, completedReports, todayReports, credits },
    });
  } catch (error) {
    console.error('Stats error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
