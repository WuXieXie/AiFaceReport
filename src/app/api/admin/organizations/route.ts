import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.type !== 'admin') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const organizations = await prisma.organization.findMany({
      include: {
        _count: { select: { employees: true, reports: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ organizations });
  } catch (error) {
    console.error('Get orgs error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'admin') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { name, address, phone, description, credits, ownerUsername, ownerPassword, ownerName } = await req.json();
    if (!name) {
      return NextResponse.json({ error: '机构名称不能为空' }, { status: 400 });
    }

    const org = await prisma.organization.create({
      data: { name, address, phone, description, credits: credits || 0 },
    });

    // Create owner employee if provided
    if (ownerUsername && ownerPassword && ownerName) {
      const existing = await prisma.employee.findUnique({ where: { username: ownerUsername } });
      if (existing) {
        return NextResponse.json({ error: '用户名已存在' }, { status: 400 });
      }
      const hashedPw = await bcrypt.hash(ownerPassword, 10);
      await prisma.employee.create({
        data: {
          username: ownerUsername,
          password: hashedPw,
          name: ownerName,
          role: 'owner',
          organizationId: org.id,
        },
      });
    }

    return NextResponse.json({ organization: org });
  } catch (error) {
    console.error('Create org error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'admin') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { id, name, address, phone, description, status, credits } = await req.json();
    if (!id) {
      return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    }

    const org = await prisma.organization.update({
      where: { id },
      data: { name, address, phone, description, status, credits },
    });

    return NextResponse.json({ organization: org });
  } catch (error) {
    console.error('Update org error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
