import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createToken } from '@/lib/auth';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { username, password, type } = await req.json();

    if (!username || !password || !type) {
      return NextResponse.json({ error: '请填写完整信息' }, { status: 400 });
    }

    if (type === 'admin') {
      const admin = await prisma.admin.findUnique({ where: { username } });
      if (!admin) {
        return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
      }
      const valid = await bcrypt.compare(password, admin.password);
      if (!valid) {
        return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
      }

      const token = await createToken({
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role,
        type: 'admin',
      });

      const res = NextResponse.json({ success: true, user: { name: admin.name, role: admin.role } });
      res.cookies.set('token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });
      return res;
    }

    // Employee login
    const employee = await prisma.employee.findUnique({
      where: { username },
      include: { organization: true },
    });

    if (!employee) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    if (employee.status !== 'active') {
      return NextResponse.json({ error: '账号已被禁用' }, { status: 403 });
    }

    if (employee.organization.status !== 'active') {
      return NextResponse.json({ error: '所属机构已被禁用' }, { status: 403 });
    }

    const valid = await bcrypt.compare(password, employee.password);
    if (!valid) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    const token = await createToken({
      id: employee.id,
      username: employee.username,
      name: employee.name,
      role: employee.role,
      type: 'employee',
      organizationId: employee.organizationId,
      organizationName: employee.organization.name,
    });

    const res = NextResponse.json({
      success: true,
      user: {
        name: employee.name,
        role: employee.role,
        organization: employee.organization.name,
      },
    });

    res.cookies.set('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return res;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
