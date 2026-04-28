import { prisma } from './prisma';
import { assertProviderReady, resolveAIProviders, type AIEndpointConfig, type ImageEndpointConfig } from './ai-providers';
import { buildFaceOverlayPrompt, createLiftLineOverlayPng } from './report-image';

const API_TIMEOUT = 180000; // 180 seconds

async function getAIConfig() {
  const configs = await prisma.systemConfig.findMany();
  const map: Record<string, string> = {};
  configs.forEach((config) => { map[config.key] = config.value; });
  return resolveAIProviders(map);
}

function extractResponseText(data: Record<string, unknown>): string {
  let content = '';
  const output = data.output as Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
  if (output) {
    for (const item of output) {
      if (item.type === 'message' && item.content) {
        for (const c of item.content) {
          if (c.type === 'output_text' && c.text) {
            content += c.text;
          }
        }
      }
    }
  }
  return content;
}

export interface AnalysisResult {
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
}

export async function analyzeImage(
  imageBase64: string,
  promptOverride?: string
): Promise<AnalysisResult> {
  const { analysis } = await getAIConfig();
  assertProviderReady(analysis);

  const defaultPrompt = await getAnalysisPrompt();
  const systemPrompt = promptOverride || defaultPrompt;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${analysis.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${analysis.apiKey}`,
      },
      body: JSON.stringify({
        model: analysis.model,
        store: false,
        input: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: '请对这张面部照片进行完整的医美面诊分析，按照指定JSON格式返回结果。',
              },
              {
                type: 'input_image',
                image_url: `data:image/jpeg;base64,${imageBase64}`,
              },
            ],
          },
        ],
        text: {
          format: {
            type: 'json_object',
          },
        },
        max_output_tokens: 4096,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('API Error:', response.status, errorText);
      throw new Error(`API 请求失败: ${response.status}`);
    }

    const data = await response.json();
    const content = extractResponseText(data);

    if (!content) {
      console.error('API response:', JSON.stringify(data));
      throw new Error('AI 分析未返回结果');
    }

    return JSON.parse(content) as AnalysisResult;
  } finally {
    clearTimeout(timeout);
  }
}

function extractResponseGeneratedImage(data: Record<string, unknown>): string | null {
  const output = data.output as Array<{ type?: string; result?: string }>;
  if (!Array.isArray(output)) return null;

  return output.find((item) => item.type === 'image_generation_call' && item.result)?.result || null;
}

export function extractImageApiBase64(data: Record<string, unknown>): string | null {
  const images = data.data as Array<{ b64_json?: string; url?: string }>;
  return Array.isArray(images) ? images[0]?.b64_json || null : null;
}

function imageBase64ToBuffer(value: string): Buffer {
  return Buffer.from(value, 'base64');
}

async function generateOpenAIOverlayWithResponses(
  config: ImageEndpointConfig,
  prompt: string,
  imageBase64: string,
  mimeType = 'image/jpeg'
): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${config.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        store: false,
        input: [
          {
            role: 'user',
            content: [
              {
                type: 'input_text',
                text: prompt,
              },
              {
                type: 'input_image',
                image_url: `data:${mimeType};base64,${imageBase64}`,
              },
            ],
          },
        ],
        tools: [
          {
            type: 'image_generation',
            size: '1024x1024',
            quality: 'medium',
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image API Error:', response.status, errorText);
      throw new Error(`图片生成失败: ${response.status}`);
    }

    const data = await response.json();
    const imageData = extractResponseGeneratedImage(data);
    if (!imageData) {
      console.error('Image API response:', JSON.stringify(data));
      throw new Error('AI 未返回提拉线图片');
    }

    return Buffer.from(imageData, 'base64');
  } finally {
    clearTimeout(timeout);
  }
}

async function generateOpenAIOverlayWithEdit(
  config: ImageEndpointConfig,
  prompt: string,
  imageBase64: string,
  mimeType = 'image/jpeg'
): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const form = new FormData();
    form.append('model', config.model);
    form.append('prompt', prompt);
    form.append('size', '1024x1024');
    form.append('quality', 'medium');
    form.append('response_format', 'b64_json');
    form.append('image', new Blob([Buffer.from(imageBase64, 'base64')], { type: mimeType }), 'face.jpg');

    const response = await fetch(`${config.baseUrl}/images/edits`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: form,
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Image edit API Error:', response.status, errorText);
      throw new Error(`图片编辑失败: ${response.status}`);
    }

    const data = await response.json();
    const imageData = extractImageApiBase64(data);
    if (!imageData) throw new Error('AI 未返回提拉线图片');
    return imageBase64ToBuffer(imageData);
  } finally {
    clearTimeout(timeout);
  }
}

async function generateGrokOverlay(
  config: ImageEndpointConfig,
  prompt: string,
  imageBase64: string,
  mimeType = 'image/jpeg'
): Promise<Buffer> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), API_TIMEOUT);

  try {
    const response = await fetch(`${config.baseUrl}/images/edits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: config.model,
        prompt,
        image: {
          type: 'image_url',
          image_url: `data:${mimeType};base64,${imageBase64}`,
        },
        response_format: 'b64_json',
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Grok image API Error:', response.status, errorText);
      throw new Error(`Grok 图片生成失败: ${response.status}`);
    }

    const data = await response.json();
    const imageData = extractImageApiBase64(data);
    if (!imageData) throw new Error('Grok 未返回提拉线图片');
    return imageBase64ToBuffer(imageData);
  } finally {
    clearTimeout(timeout);
  }
}

export async function generateFaceOverlayImage(
  imageBase64: string,
  mimeType = 'image/jpeg',
  analysis?: AnalysisResult
): Promise<Buffer> {
  void analysis;
  const fallback = () => createLiftLineOverlayPng(Buffer.from(imageBase64, 'base64'));

  try {
    const { image } = await getAIConfig();
    assertProviderReady(image);
    const prompt = buildFaceOverlayPrompt(image.mode, await getOverlayPrompt());

    if (image.provider === 'grok') {
      return await generateGrokOverlay(image, prompt, imageBase64, mimeType);
    }

    if (image.mode === 'generate') {
      return await generateOpenAIOverlayWithResponses(image, prompt, imageBase64, mimeType);
    }

    return await generateOpenAIOverlayWithEdit(image, prompt, imageBase64, mimeType);
  } catch (error) {
    console.error('AI lift-line image generation failed, falling back to local overlay:', error);
    return fallback();
  }
}

async function getOverlayPrompt(): Promise<string | undefined> {
  const preset = await prisma.promptPreset.findFirst({
    where: { category: 'overlay', isDefault: true, status: 'active' },
  });

  return preset?.content;
}

async function getAnalysisPrompt(): Promise<string> {
  const preset = await prisma.promptPreset.findFirst({
    where: { category: 'analysis', isDefault: true, status: 'active' },
  });

  if (preset) return preset.content;

  return `你是一位专业的医美面诊分析师。请对提供的面部照片进行详细的美学分析。

请严格按照以下JSON格式返回分析结果：
{
  "overallScore": 85,
  "overallComment": "整体面部轮廓优良，五官比例协调...",
  "dimensions": [
    {"name": "面部轮廓", "score": 88, "comment": "..."},
    {"name": "五官比例", "score": 82, "comment": "..."},
    {"name": "皮肤质感", "score": 79, "comment": "..."},
    {"name": "面部对称", "score": 90, "comment": "..."},
    {"name": "年轻指数", "score": 85, "comment": "..."},
    {"name": "整体和谐", "score": 86, "comment": "..."}
  ],
  "diagnosis": [
    {"area": "法令纹区域", "problem": "法令纹偏深", "severity": "中度", "detail": "..."},
    ...
  ],
  "recommendations": [
    {"project": "玻尿酸填充", "category": "注射类", "description": "...", "priority": "高", "expectedEffect": "..."},
    ...
  ],
  "comparison": [
    {"area": "法令纹", "before": "深度法令纹，显老态", "after": "纹路明显减淡", "improvement": "改善约70%"},
    ...
  ]
}

注意：
1. 六维美学指数每项满分100分
2. 分析要专业、详细、具有可操作性
3. 推荐方案要贴合实际医美项目`;
}
