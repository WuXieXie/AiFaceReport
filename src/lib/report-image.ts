import sharp from 'sharp';

export interface ReportImageAnalysis {
  overallScore: number;
  overallComment: string;
  dimensions: {
    name: string;
    score: number;
    comment: string;
  }[];
  diagnosis: {
    area: string;
    problem: string;
    severity: string;
    detail: string;
  }[];
  recommendations: {
    project: string;
    category: string;
    description: string;
    priority: string;
    expectedEffect: string;
  }[];
  comparison: {
    area: string;
    before: string;
    after: string;
    improvement: string;
  }[];
  liftVectors?: LiftLineVector[];
}

export interface LiftLineVector {
  side?: 'left' | 'right' | 'center' | string;
  area?: string;
  start: {
    x: number;
    y: number;
  };
  end: {
    x: number;
    y: number;
  };
}

interface SystemReportSvgOptions {
  analysis: ReportImageAnalysis;
  markedImageDataUrl: string;
  generatedAt: string;
}

const WIDTH = 1200;
const HEIGHT = 2100;

function escapeXml(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function truncate(value: string, max = 46): string {
  return value.length > max ? `${value.slice(0, max - 1)}...` : value;
}

function wrapText(value: string, max = 26): string[] {
  const lines: string[] = [];
  for (let i = 0; i < value.length; i += max) {
    lines.push(value.slice(i, i + max));
  }
  return lines.length ? lines : [''];
}

function clampLines(lines: string[], maxLines: number): string[] {
  if (lines.length <= maxLines) return lines;
  const next = lines.slice(0, maxLines);
  next[maxLines - 1] = `${next[maxLines - 1].slice(0, Math.max(0, next[maxLines - 1].length - 3))}...`;
  return next;
}

function textBlock(
  value: string,
  x: number,
  y: number,
  max = 28,
  lineHeight = 28,
  className = 'muted',
  maxLines = Number.POSITIVE_INFINITY
): string {
  return clampLines(wrapText(value, max), maxLines)
    .map((line, index) => `<text x="${x}" y="${y + index * lineHeight}" class="${className}">${escapeXml(line)}</text>`)
    .join('');
}

function sectionTitle(title: string, x: number, y: number): string {
  return `<text x="${x}" y="${y}" class="section-title">${escapeXml(title)}</text>`;
}

function radarChart(analysis: ReportImageAnalysis): string {
  const cx = 305;
  const cy = 720;
  const radius = 130;
  const dimensions = analysis.dimensions.slice(0, 6);
  const angleStep = (Math.PI * 2) / Math.max(dimensions.length, 1);

  const polygonPoints = dimensions
    .map((dimension, index) => {
      const angle = -Math.PI / 2 + index * angleStep;
      const r = radius * Math.max(0, Math.min(100, dimension.score)) / 100;
      return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
    })
    .join(' ');

  const grids = [0.25, 0.5, 0.75, 1]
    .map((ratio) => {
      const points = dimensions
        .map((_, index) => {
          const angle = -Math.PI / 2 + index * angleStep;
          const r = radius * ratio;
          return `${cx + Math.cos(angle) * r},${cy + Math.sin(angle) * r}`;
        })
        .join(' ');
      return `<polygon points="${points}" fill="none" stroke="#f3d4dc" stroke-width="1.5"/>`;
    })
    .join('');

  const axes = dimensions
    .map((dimension, index) => {
      const angle = -Math.PI / 2 + index * angleStep;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      const labelX = cx + Math.cos(angle) * (radius + 46);
      const labelY = cy + Math.sin(angle) * (radius + 46);
      return `
        <line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#f6c7d3" stroke-width="1"/>
        <text x="${labelX}" y="${labelY}" class="radar-label" text-anchor="middle">${escapeXml(dimension.name)}</text>
        <text x="${labelX}" y="${labelY + 24}" class="radar-score" text-anchor="middle">${dimension.score}</text>
      `;
    })
    .join('');

  return `
    <g>
      ${grids}
      ${axes}
      <polygon points="${polygonPoints}" fill="#fb7185" fill-opacity="0.22" stroke="#e11d48" stroke-width="4"/>
    </g>
  `;
}

function diagnosisRows(analysis: ReportImageAnalysis): string {
  return analysis.diagnosis.slice(0, 4).map((item, index) => {
    const y = 1010 + index * 92;
    return `
      <rect x="60" y="${y - 42}" width="510" height="76" rx="18" fill="#fff7f8" stroke="#ffd2dc"/>
      <text x="86" y="${y - 12}" class="item-title">${escapeXml(item.area)} · ${escapeXml(item.severity)}</text>
      <text x="86" y="${y + 20}" class="muted">${escapeXml(truncate(`${item.problem}：${item.detail}`, 23))}</text>
    `;
  }).join('');
}

function recommendationRows(analysis: ReportImageAnalysis): string {
  return analysis.recommendations.slice(0, 4).map((item, index) => {
    const y = 1010 + index * 92;
    const project = item.project || item.category || '推荐项目';
    const priority = item.priority || '中';
    return `
      <rect x="630" y="${y - 42}" width="510" height="76" rx="18" fill="#f8fafc" stroke="#e5e7eb"/>
      <text x="656" y="${y - 12}" class="item-title">${escapeXml(project)} · 优先级${escapeXml(priority)}</text>
      <text x="656" y="${y + 20}" class="muted">${escapeXml(truncate(`${item.description}，${item.expectedEffect}`, 23))}</text>
    `;
  }).join('');
}

function comparisonRows(analysis: ReportImageAnalysis): string {
  return analysis.comparison.slice(0, 4).map((item, index) => {
    const y = 1700 + index * 92;
    return `
      <rect x="60" y="${y - 38}" width="1080" height="76" rx="16" fill="#ffffff" stroke="#edf2f7"/>
      <text x="88" y="${y + 8}" class="item-title">${escapeXml(item.area)}</text>
      <text x="270" y="${y - 8}" class="muted">改善前：${escapeXml(truncate(item.before, 18))}</text>
      <text x="270" y="${y + 24}" class="muted">改善后：${escapeXml(truncate(item.after, 18))}</text>
      <text x="1088" y="${y + 8}" class="accent" text-anchor="end">${escapeXml(truncate(item.improvement, 9))}</text>
    `;
  }).join('');
}

type OverlayPoint = { x: number; y: number };

const DEFAULT_LIFT_VECTORS: LiftLineVector[] = [
  { side: 'left', area: '法令纹', start: { x: 0.43, y: 0.58 }, end: { x: 0.32, y: 0.40 } },
  { side: 'left', area: '口角', start: { x: 0.40, y: 0.66 }, end: { x: 0.26, y: 0.50 } },
  { side: 'left', area: '下颌缘', start: { x: 0.38, y: 0.74 }, end: { x: 0.25, y: 0.62 } },
  { side: 'right', area: '法令纹', start: { x: 0.57, y: 0.58 }, end: { x: 0.68, y: 0.40 } },
  { side: 'right', area: '口角', start: { x: 0.60, y: 0.66 }, end: { x: 0.74, y: 0.50 } },
  { side: 'right', area: '下颌缘', start: { x: 0.62, y: 0.74 }, end: { x: 0.75, y: 0.62 } },
];

function normalizeUnitCoordinate(value: number): number {
  const unitValue = value > 1 ? value / 100 : value;
  return Math.max(0.04, Math.min(0.96, unitValue));
}

function normalizePoint(point: OverlayPoint): OverlayPoint {
  return {
    x: normalizeUnitCoordinate(point.x),
    y: normalizeUnitCoordinate(point.y),
  };
}

function normalizeLiftVectors(vectors?: LiftLineVector[]): LiftLineVector[] {
  const valid = vectors
    ?.filter((vector) => Number.isFinite(vector.start?.x) && Number.isFinite(vector.start?.y) && Number.isFinite(vector.end?.x) && Number.isFinite(vector.end?.y))
    .slice(0, 8)
    .map((vector) => ({
      ...vector,
      start: normalizePoint(vector.start),
      end: normalizePoint(vector.end),
    }));

  return valid?.length ? valid : DEFAULT_LIFT_VECTORS;
}

function scalePoint(point: OverlayPoint, width: number, height: number): OverlayPoint {
  return {
    x: Math.round(point.x * width),
    y: Math.round(point.y * height),
  };
}

function liftVector(start: OverlayPoint, end: OverlayPoint, width: number, height: number): string {
  const s = scalePoint(start, width, height);
  const e = scalePoint(end, width, height);
  return `
    <line x1="${s.x}" y1="${s.y}" x2="${e.x}" y2="${e.y}" stroke="#111827" stroke-opacity="0.24" stroke-width="6" stroke-dasharray="18 28" stroke-linecap="round"/>
    <line class="lift-vector" x1="${s.x}" y1="${s.y}" x2="${e.x}" y2="${e.y}" stroke="#ffffff" stroke-width="4" stroke-dasharray="18 28" stroke-linecap="round"/>
  `;
}

function liftPoint(point: OverlayPoint, width: number, height: number): string {
  const p = scalePoint(point, width, height);
  return `
    <circle cx="${p.x}" cy="${p.y}" r="10" fill="#ffffff" fill-opacity="0.5"/>
    <circle class="lift-point" cx="${p.x}" cy="${p.y}" r="7" fill="#fb7185" fill-opacity="0.82" stroke="#fecdd3" stroke-width="2"/>
  `;
}

export function createLiftLineOverlaySvg(width: number, height: number, liftVectors?: LiftLineVector[]): string {
  const vectors = normalizeLiftVectors(liftVectors);
  const points = vectors.flatMap((vector) => [vector.start, vector.end]);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${vectors.map((vector) => liftVector(vector.start, vector.end, width, height)).join('')}
    ${points.map((point) => liftPoint(point, width, height)).join('')}
  </svg>`;
}

export function buildFaceOverlayPrompt(
  mode: 'edit' | 'generate' = 'edit',
  override?: string,
  liftVectors?: LiftLineVector[]
): string {
  void liftVectors;
  const base = mode === 'generate'
    ? '基于上传的人脸照片，生成医美面部提拉线设计图。以原图作为主要参考，保持原图人物身份、脸型、五官比例、表情气质和整体真实感；只允许将面部角度调整为正面面诊视角。'
    : '基于上传的人脸照片，生成医美面部提拉线设计图。以原图作为主要参考，请在原图基础上编辑，只添加提拉线设计标注；只允许将面部角度调整为正面面诊视角。';

  const domainRules = `
要求：
1. 标注面部提拉线（线雕路径），从下向上提拉
2. 使用淡红色点位标注埋线入口
3. 提拉线使用白色虚线表示，间隔较大，线条细
4. 添加箭头表示提拉方向（向上、向太阳穴或耳前）
5. 重点区域：苹果肌、法令纹、下颌线
6. 保持医学美学逻辑，不可随意绘制
7. 风格简洁、干净、偏医疗可视化
8. 不遮挡五官，不改变原图人物
9. 不对原图背景产生改变，只在面部区域叠加轻微UI感的医疗可视化标注

风格参考：
医美面诊分析图 / medical aesthetic lifting diagram / facial vector mapping

额外限制：
只生成面部提拉线设计图，不要生成报告版式、雷达图、评分、表格、标题或大段文字。
不要生成血腥、针头、手术创口或夸张医疗场景。`;

  const required = `${base}

${override?.trim() ? `\n补充要求：\n${override.trim()}\n` : ''}
${domainRules}`;

  return required;
}

export function createSystemReportSvg({ analysis, markedImageDataUrl, generatedAt }: SystemReportSvgOptions): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <clipPath id="photoClip"><rect x="640" y="170" width="500" height="640" rx="28"/></clipPath>
    <linearGradient id="hero" x1="0" x2="1">
      <stop offset="0%" stop-color="#fb7185"/>
      <stop offset="100%" stop-color="#e11d48"/>
    </linearGradient>
    <style>
      .title { font: 700 52px Arial, "Microsoft YaHei", sans-serif; fill: #111827; }
      text { font-family: "Noto Sans CJK SC", "Noto Sans SC", "Microsoft YaHei", Arial, sans-serif; }
      .title { font-size: 52px; font-weight: 700; fill: #111827; }
      .subtitle { font-size: 24px; font-weight: 400; fill: #6b7280; }
      .section-title { font-size: 30px; font-weight: 700; fill: #111827; }
      .item-title { font-size: 22px; font-weight: 700; fill: #111827; }
      .muted { font-size: 20px; font-weight: 400; fill: #4b5563; }
      .accent { font-size: 20px; font-weight: 700; fill: #e11d48; }
      .score { font-size: 78px; font-weight: 800; fill: #e11d48; }
      .radar-label { font-size: 18px; font-weight: 500; fill: #374151; }
      .radar-score { font-size: 18px; font-weight: 700; fill: #e11d48; }
    </style>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="#fffafb"/>
  <rect x="36" y="36" width="1128" height="2028" rx="34" fill="#ffffff" stroke="#ffe4ea"/>

  <text x="60" y="105" class="title">AI完整面诊报告</text>
  <text x="62" y="148" class="subtitle">生成时间：${escapeXml(generatedAt)}</text>
  <rect x="60" y="190" width="500" height="160" rx="28" fill="#fff1f4"/>
  <text x="92" y="255" class="subtitle">综合评分</text>
  <text x="90" y="330" class="score">${analysis.overallScore}</text>
  <text x="230" y="327" class="subtitle">/ 100</text>
  <rect x="60" y="378" width="500" height="120" rx="18" fill="#ffffff"/>
  ${textBlock(`整体评价：${analysis.overallComment}`, 60, 415, 24, 28, 'muted', 4)}

  <image href="${escapeXml(markedImageDataUrl)}" x="640" y="170" width="500" height="640" preserveAspectRatio="xMidYMid slice" clip-path="url(#photoClip)"/>
  <rect x="640" y="170" width="500" height="640" rx="28" fill="none" stroke="#fecdd3" stroke-width="3"/>
  <text x="655" y="848" class="subtitle">淡红色点位与白色大间隔虚线展示提拉改善方向</text>

  ${sectionTitle('六维美学指数', 60, 535)}
  ${radarChart(analysis)}

  ${sectionTitle('面部问题诊断', 60, 920)}
  ${diagnosisRows(analysis)}
  ${sectionTitle('推荐改善方案', 630, 920)}
  ${recommendationRows(analysis)}

  ${sectionTitle('面部问题详解', 60, 1390)}
  ${textBlock(analysis.diagnosis.map((item) => `${item.area}：${item.detail}`).join('；'), 60, 1432, 48, 30, 'muted', 4)}

  ${sectionTitle('效果预期对比', 60, 1625)}
  ${comparisonRows(analysis)}
  </svg>`;
}

export async function createSystemReportPng(options: SystemReportSvgOptions): Promise<Buffer> {
  return sharp(Buffer.from(createSystemReportSvg(options)))
    .png()
    .toBuffer();
}

export async function normalizeReportImagePng(image: Buffer): Promise<Buffer> {
  return sharp(image)
    .rotate()
    .png()
    .toBuffer();
}

export async function createLiftLineOverlayPng(image: Buffer, liftVectors?: LiftLineVector[]): Promise<Buffer> {
  const base = await sharp(image)
    .rotate()
    .resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: false })
    .png()
    .toBuffer();
  const metadata = await sharp(base).metadata();
  const width = metadata.width || 1024;
  const height = metadata.height || 1024;

  return sharp(base)
    .composite([{ input: Buffer.from(createLiftLineOverlaySvg(width, height, liftVectors)), left: 0, top: 0 }])
    .png()
    .toBuffer();
}
