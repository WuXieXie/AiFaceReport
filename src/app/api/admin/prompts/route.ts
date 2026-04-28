import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getSession();
    if (!session || session.type !== 'admin') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }
    const prompts = await prisma.promptPreset.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ prompts });
  } catch (error) {
    console.error('Get prompts error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'admin') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { name, category, content, isDefault } = await req.json();
    if (!name || !content) {
      return NextResponse.json({ error: '名称和内容不能为空' }, { status: 400 });
    }

    // If setting as default, unset other defaults in same category
    if (isDefault && category) {
      await prisma.promptPreset.updateMany({
        where: { category, isDefault: true },
        data: { isDefault: false },
      });
    }

    const prompt = await prisma.promptPreset.create({
      data: { name, category, content, isDefault: isDefault || false },
    });

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Create prompt error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'admin') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { id, name, category, content, isDefault, status } = await req.json();
    if (!id) {
      return NextResponse.json({ error: '缺少ID' }, { status: 400 });
    }

    if (isDefault && category) {
      await prisma.promptPreset.updateMany({
        where: { category, isDefault: true, id: { not: id } },
        data: { isDefault: false },
      });
    }

    const prompt = await prisma.promptPreset.update({
      where: { id },
      data: { name, category, content, isDefault, status },
    });

    return NextResponse.json({ prompt });
  } catch (error) {
    console.error('Update prompt error:', error);
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
    await prisma.promptPreset.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete prompt error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
