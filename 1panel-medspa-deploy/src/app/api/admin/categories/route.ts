import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.type !== 'admin') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const categories = await prisma.projectCategory.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return NextResponse.json({ categories });
  } catch (error) {
    console.error('Get categories error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'admin') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { name, description, icon, sortOrder } = await req.json();
    if (!name) {
      return NextResponse.json({ error: '名称不能为空' }, { status: 400 });
    }

    const category = await prisma.projectCategory.create({
      data: { name, description, icon, sortOrder: sortOrder || 0 },
    });

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Create category error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'admin') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { id, name, description, icon, sortOrder, status } = await req.json();
    if (!id) {
      return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    }

    const category = await prisma.projectCategory.update({
      where: { id },
      data: { name, description, icon, sortOrder, status },
    });

    return NextResponse.json({ category });
  } catch (error) {
    console.error('Update category error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'admin') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { id } = await req.json();
    await prisma.projectCategory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete category error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
