import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'admin') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const orgId = req.nextUrl.searchParams.get('orgId');
    const where = orgId ? { organizationId: orgId } : {};

    const employees = await prisma.employee.findMany({
      where,
      include: { organization: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    });

    // Remove passwords
    const safe = employees.map(({ password: _, ...rest }) => rest);

    return NextResponse.json({ employees: safe });
  } catch (error) {
    console.error('Get employees error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'admin') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { username, password, name, phone, role, organizationId } = await req.json();
    if (!username || !password || !name || !organizationId) {
      return NextResponse.json({ error: '请填写必填字段' }, { status: 400 });
    }

    const existing = await prisma.employee.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: '用户名已存在' }, { status: 400 });
    }

    const hashedPw = await bcrypt.hash(password, 10);
    const employee = await prisma.employee.create({
      data: {
        username,
        password: hashedPw,
        name,
        phone,
        role: role || 'staff',
        organizationId,
      },
    });

    const { password: _, ...safe } = employee;
    return NextResponse.json({ employee: safe });
  } catch (error) {
    console.error('Create employee error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'admin') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { id, name, phone, role, status, password } = await req.json();
    if (!id) {
      return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    }

    const data: Record<string, unknown> = { name, phone, role, status };
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const employee = await prisma.employee.update({ where: { id }, data });
    const { password: _, ...safe } = employee;

    return NextResponse.json({ employee: safe });
  } catch (error) {
    console.error('Update employee error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
