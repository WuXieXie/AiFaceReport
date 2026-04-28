import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildFaceOverlayPrompt,
  createLiftLineOverlaySvg,
  createSystemReportSvg,
  normalizeReportImagePng,
  type ReportImageAnalysis,
} from './report-image';

const analysis: ReportImageAnalysis = {
  overallScore: 91,
  overallComment: '整体轮廓清晰，面中部支撑良好，下颌线仍有提升空间。',
  dimensions: [
    { name: '面部轮廓', score: 91, comment: '轮廓清晰' },
    { name: '五官比例', score: 88, comment: '比例协调' },
    { name: '皮肤质感', score: 86, comment: '质感稳定' },
    { name: '面部对称', score: 90, comment: '左右均衡' },
    { name: '年轻指数', score: 84, comment: '轻度松弛' },
    { name: '整体和谐', score: 92, comment: '整体自然' },
  ],
  diagnosis: [
    { area: '苹果肌区域', problem: '轻度下垂', severity: '轻度', detail: '面中部饱满度尚可，但动态表情后支撑略弱。' },
  ],
  recommendations: [
    { project: '面部提升', category: '抗衰项目', description: '改善下颌缘和面中部松弛。', priority: '高', expectedEffect: '轮廓更清晰' },
  ],
  comparison: [
    { area: '下颌缘', before: '线条略松散', after: '边界更清楚', improvement: '改善约60%' },
  ],
};

test('face overlay prompt only asks for lifting annotations', () => {
  const prompt = buildFaceOverlayPrompt();

  assert.match(prompt, /淡红色/);
  assert.match(prompt, /以原图作为主要参考/);
  assert.match(prompt, /只允许将面部角度调整为正面面诊视角/);
  assert.match(prompt, /不对原图背景产生改变/);
  assert.match(prompt, /提拉线使用白色虚线表示，间隔较大，线条细/);
  assert.match(prompt, /添加箭头表示提拉方向/);
  assert.match(prompt, /提拉方向/);
  assert.match(prompt, /向太阳穴或耳前/);
  assert.match(prompt, /苹果肌、法令纹、下颌线/);
  assert.match(prompt, /medical aesthetic lifting diagram/);
  assert.match(prompt, /facial vector mapping/);
  assert.doesNotMatch(prompt, /白色或浅色背景/);
  assert.doesNotMatch(prompt, /六维美学指数/);
  assert.doesNotMatch(prompt, /完整报告/);
  assert.doesNotMatch(prompt, /推荐改善方案/);
});

test('face overlay prompt uses only the fixed user prompt without structured vectors', () => {
  const prompt = buildFaceOverlayPrompt('edit', undefined, [
    { side: 'left', area: '法令纹', start: { x: 0.42, y: 0.58 }, end: { x: 0.28, y: 0.38 } },
    { side: 'right', area: '下颌缘', start: { x: 0.64, y: 0.76 }, end: { x: 0.78, y: 0.62 } },
  ]);

  assert.doesNotMatch(prompt, /严格按以下/);
  assert.doesNotMatch(prompt, /0\.42/);
  assert.match(prompt, /基于上传的人脸照片，生成医美面部提拉线设计图/);
  assert.match(prompt, /保持医学美学逻辑，不可随意绘制/);
  assert.match(prompt, /不遮挡五官，不改变原图人物/);
});

test('system report SVG includes full report content and embedded source image', () => {
  const svg = createSystemReportSvg({
    analysis,
    markedImageDataUrl: 'data:image/jpeg;base64,abc123',
    generatedAt: '2026/04/27 21:06:52',
  });

  assert.match(svg, /<svg/);
  assert.match(svg, /data:image\/jpeg;base64,abc123/);
  assert.match(svg, /Noto Sans CJK SC/);
  assert.match(svg, /六维美学指数/);
  assert.match(svg, /面部问题诊断/);
  assert.match(svg, /面部问题详解/);
  assert.match(svg, /推荐改善方案/);
  assert.match(svg, /效果预期对比/);
});

test('system report SVG never renders undefined recommendation project', () => {
  const svg = createSystemReportSvg({
    analysis: {
      ...analysis,
      recommendations: [
        { project: undefined as unknown as string, category: '线雕提升', description: '根据面部松弛方向规划提升向量。', priority: '高', expectedEffect: '轮廓更紧致' },
      ],
    },
    markedImageDataUrl: 'data:image/jpeg;base64,abc123',
    generatedAt: '2026/04/28 14:23:19',
  });

  assert.doesNotMatch(svg, /undefined/);
  assert.match(svg, /线雕提升/);
});

test('system report SVG clamps long narrative text to prevent section overlap', () => {
  const longAnalysis: ReportImageAnalysis = {
    ...analysis,
    overallComment: `面部整体轮廓流畅，但需要控制长文本布局。${'整体评价内容'.repeat(80)}整体评价尾部不应出现`,
    diagnosis: [
      {
        area: '眼下泪沟区域',
        problem: '轻度凹陷',
        severity: '轻度',
        detail: `问题详解需要限制行数。${'眼下泪沟与法令纹细节'.repeat(100)}问题详解尾部不应出现`,
      },
    ],
  };

  const svg = createSystemReportSvg({
    analysis: longAnalysis,
    markedImageDataUrl: 'data:image/jpeg;base64,abc123',
    generatedAt: '2026/04/28 00:01:09',
  });
  const narrativeYValues = [...svg.matchAll(/<text x="60" y="(\d+)" class="muted">/g)].map((match) => Number(match[1]));

  assert.doesNotMatch(svg, /整体评价尾部不应出现/);
  assert.doesNotMatch(svg, /问题详解尾部不应出现/);
  assert.ok(Math.max(...narrativeYValues) < 1580);
});

test('system report SVG separates diagnosis detail and comparison sections', () => {
  const svg = createSystemReportSvg({
    analysis,
    markedImageDataUrl: 'data:image/jpeg;base64,abc123',
    generatedAt: '2026/04/28 13:39:12',
  });
  const detailTitle = svg.match(/面部问题详解/);
  const comparisonTitle = svg.match(/效果预期对比/);
  const comparisonRow = svg.match(/<rect x="60" y="(\d+)" width="1080" height="76"/);

  assert.ok(detailTitle?.index && comparisonTitle?.index);
  assert.ok(comparisonTitle.index > detailTitle.index);
  assert.equal(comparisonRow?.[1], '1662');
});

test('system lift-line overlay uses controlled medical vectors instead of AI mesh markup', () => {
  const svg = createLiftLineOverlaySvg(1024, 1024);

  assert.match(svg, /stroke="#ffffff"/);
  assert.match(svg, /stroke-dasharray="18 28"/);
  assert.match(svg, /fill="#fb7185"/);
  assert.doesNotMatch(svg, /<text/);
  assert.doesNotMatch(svg, /marker-end/);
  assert.equal((svg.match(/class="lift-vector"/g) || []).length, 6);
  assert.equal((svg.match(/class="lift-point"/g) || []).length, 12);
});

test('system lift-line overlay uses personalized AI vectors with variable count', () => {
  const svg = createLiftLineOverlaySvg(1000, 800, [
    { side: 'left', area: '法令纹', start: { x: 0.42, y: 0.58 }, end: { x: 0.28, y: 0.38 } },
    { side: 'right', area: '下颌缘', start: { x: 0.64, y: 0.76 }, end: { x: 0.78, y: 0.62 } },
    { side: 'right', area: '苹果肌', start: { x: 62, y: 66 }, end: { x: 74, y: 50 } },
  ]);

  assert.equal((svg.match(/class="lift-vector"/g) || []).length, 3);
  assert.equal((svg.match(/class="lift-point"/g) || []).length, 6);
  assert.match(svg, /x1="420" y1="464" x2="280" y2="304"/);
  assert.match(svg, /x1="620" y1="528" x2="740" y2="400"/);
});

test('normalizes embedded face image to PNG before report composition', async () => {
  const jpeg = Buffer.from(
    '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////2wBDAf//////////////////////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIQAxAAAAH/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAEFAqf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAEDAQE/ASP/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oACAECAQE/ASP/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAY/Al//xAAUEAEAAAAAAAAAAAAAAAAAAAAA/9oACAEBAAE/IV//2gAMAwEAAgADAAAAEP/EFBQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQMBAT8QH//EFBQRAQAAAAAAAAAAAAAAAAAAABD/2gAIAQIBAT8QH//EFBABAQAAAAAAAAAAAAAAAAAAABD/2gAIAQEAAT8QH//Z',
    'base64'
  );

  const png = await normalizeReportImagePng(jpeg);

  assert.equal(png.subarray(1, 4).toString('ascii'), 'PNG');
});
