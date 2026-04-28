import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { analyzeImage, generateFaceOverlayImage } from '@/lib/openai';
import { formatDateTimeSeconds } from '@/lib/display';
import { getUploadDir, getUploadUrl } from '@/lib/uploads';
import { createSystemReportPng, normalizeReportImagePng } from '@/lib/report-image';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

export const maxDuration = 180;

async function generateReportImagesInBackground(options: {
  reportId: string;
  uploadDir: string;
  imageBuffer: Buffer;
  imageBase64: string;
  mimeType: string;
  analysisResult: Awaited<ReturnType<typeof analyzeImage>>;
  generatedAt: string;
}) {
  const { reportId, uploadDir, imageBuffer, imageBase64, mimeType, analysisResult, generatedAt } = options;

  try {
    let markedImageBuffer: Buffer = imageBuffer;
    try {
      markedImageBuffer = await generateFaceOverlayImage(imageBase64, mimeType, analysisResult);
    } catch (imageError) {
      console.error('AI lift-line image generation failed, using original image in report:', imageError);
    }
    markedImageBuffer = await normalizeReportImagePng(markedImageBuffer);

    const markedImageName = `${Date.now()}-${Math.random().toString(36).slice(2)}-lift-lines.png`;
    await writeFile(join(uploadDir, markedImageName), markedImageBuffer);
    const markedImageUrl = getUploadUrl(markedImageName);

    const fullReportName = `${Date.now()}-${Math.random().toString(36).slice(2)}-full-report.png`;
    const fullReportBuffer = await createSystemReportPng({
      analysis: analysisResult,
      markedImageDataUrl: `data:image/png;base64,${markedImageBuffer.toString('base64')}`,
      generatedAt,
    });
    await writeFile(join(uploadDir, fullReportName), fullReportBuffer);
    const fullReportUrl = getUploadUrl(fullReportName);

    await prisma.report.update({
      where: { id: reportId },
      data: {
        status: 'completed',
        overlayUrl: markedImageUrl,
        aiReportUrl: fullReportUrl,
      },
    });
  } catch (error) {
    console.error('Background report image generation failed:', error);
    await prisma.report.update({
      where: { id: reportId },
      data: { status: 'completed' },
    }).catch((updateError) => {
      console.error('Failed to mark report image generation finished:', updateError);
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.type !== 'employee') {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('image') as File;

    if (!file) {
      return NextResponse.json({ error: '请上传图片' }, { status: 400 });
    }

    // Check credits
    const org = await prisma.organization.findUnique({
      where: { id: session.organizationId },
    });

    if (!org || org.credits < 1) {
      return NextResponse.json({ error: '积分不足，请联系管理员充值' }, { status: 403 });
    }

    // Save uploaded image
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const mimeType = file.type || 'image/jpeg';

    const uploadDir = getUploadDir();
    await mkdir(uploadDir, { recursive: true });
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;
    const filePath = join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // Create report record
    const report = await prisma.report.create({
      data: {
        title: `面诊分析 - ${formatDateTimeSeconds(new Date())}`,
        imageUrl: getUploadUrl(fileName),
        status: 'analyzing',
        organizationId: session.organizationId!,
        employeeId: session.id,
      },
    });

    // Run analysis (async-like but in request for now)
    try {
      const analysisResult = await analyzeImage(base64);
      const generatedAt = formatDateTimeSeconds(new Date());

      // Persist text analysis first so the UI can render immediately while images continue in background.
      await prisma.report.update({
        where: { id: report.id },
        data: {
          status: 'image_processing',
          overallScore: analysisResult.overallScore,
          dimensions: JSON.stringify(analysisResult.dimensions),
          diagnosis: JSON.stringify(analysisResult.diagnosis),
          recommendations: JSON.stringify(analysisResult.recommendations),
          textReport: JSON.stringify(analysisResult),
        },
      });

      // Deduct credits
      await prisma.organization.update({
        where: { id: session.organizationId },
        data: { credits: { decrement: 1 } },
      });

      await prisma.creditLog.create({
        data: {
          organizationId: session.organizationId!,
          amount: -1,
          balance: org.credits - 1,
          type: 'consume',
          description: `面诊分析消耗 - 报告ID: ${report.id}`,
        },
      });

      void generateReportImagesInBackground({
        reportId: report.id,
        uploadDir,
        imageBuffer: buffer,
        imageBase64: base64,
        mimeType,
        analysisResult,
        generatedAt,
      });

      return NextResponse.json({
        success: true,
        reportId: report.id,
        analysis: analysisResult,
        imagePending: true,
      });
    } catch (analysisError) {
      await prisma.report.update({
        where: { id: report.id },
        data: { status: 'failed' },
      });
      console.error('Analysis error:', analysisError);
      return NextResponse.json(
        { error: 'AI分析失败，请稍后重试', reportId: report.id },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Analysis route error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const reportId = searchParams.get('id');

    if (reportId) {
      const report = await prisma.report.findUnique({ where: { id: reportId } });
      if (!report) {
        return NextResponse.json({ error: '报告不存在' }, { status: 404 });
      }
      return NextResponse.json({ report });
    }

    const where = session.type === 'admin'
      ? {}
      : { organizationId: session.organizationId };

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { employee: { select: { name: true } } },
    });

    return NextResponse.json({ reports });
  } catch (error) {
    console.error('Get reports error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
