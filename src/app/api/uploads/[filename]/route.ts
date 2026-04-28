import { NextRequest, NextResponse } from 'next/server';
import { readFile } from 'fs/promises';
import { extname, join } from 'path';
import { getSession } from '@/lib/auth';
import { getUploadDir, getUploadFileName } from '@/lib/uploads';

const CONTENT_TYPES: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml; charset=utf-8',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { filename: string } }
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  try {
    const fileName = getUploadFileName(decodeURIComponent(params.filename));
    const filePath = join(getUploadDir(), fileName);
    const buffer = await readFile(filePath);
    const contentType = CONTENT_TYPES[extname(fileName).toLowerCase()] || 'application/octet-stream';

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'private, max-age=31536000, immutable',
      },
    });
  } catch {
    return NextResponse.json({ error: '图片不存在' }, { status: 404 });
  }
}
