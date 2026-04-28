import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const orgId = session.organizationId;
    if (!orgId) {
      return NextResponse.json({ employees: [] });
    }

    const employees = await prisma.employee.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        username: true,
        name: true,
        phone: true,
        role: true,
        status: true,
        createdAt: true,
      },
      orderBy: [
        { role: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return NextResponse.json({ employees });
  } catch (error) {
    console.error('Get team error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
