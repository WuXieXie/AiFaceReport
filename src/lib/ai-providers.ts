export type AIProviderName = 'openai' | 'grok';
export type ImageMode = 'edit' | 'generate';

export interface AIEndpointConfig {
  provider: AIProviderName;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface ImageEndpointConfig extends AIEndpointConfig {
  mode: ImageMode;
}

export interface AIProviderConfig {
  analysis: AIEndpointConfig;
  image: ImageEndpointConfig;
}

type ConfigMap = Record<string, string | undefined>;

function normalizeProvider(value: string | undefined): AIProviderName {
  return value === 'grok' ? 'grok' : 'openai';
}

function normalizeImageMode(value: string | undefined): ImageMode {
  return value === 'generate' ? 'generate' : 'edit';
}

function normalizeBaseUrl(value: string): string {
  const trimmed = value.replace(/\/+$/, '');
  try {
    const url = new URL(trimmed);
    if (!url.pathname || url.pathname === '/') {
      url.pathname = '/v1';
      return url.toString().replace(/\/+$/, '');
    }
  } catch {
    return trimmed;
  }
  return trimmed;
}

function getEndpoint(configs: ConfigMap, provider: AIProviderName, image = false): AIEndpointConfig {
  if (provider === 'grok') {
    return {
      provider,
      apiKey: configs.xai_api_key || process.env.XAI_API_KEY || '',
      baseUrl: normalizeBaseUrl(configs.xai_base_url || process.env.XAI_BASE_URL || 'https://api.x.ai/v1'),
      model: image
        ? configs.xai_image_model || process.env.XAI_IMAGE_MODEL || 'grok-imagine-image'
        : configs.xai_model || process.env.XAI_MODEL || 'grok-4.20',
    };
  }

  return {
    provider,
    apiKey: configs.openai_api_key || process.env.OPENAI_API_KEY || '',
    baseUrl: normalizeBaseUrl(configs.openai_base_url || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'),
    model: image
      ? configs.openai_image_model || process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1'
      : configs.openai_model || process.env.OPENAI_MODEL || 'gpt-5.4',
  };
}

export function resolveAIProviders(configs: ConfigMap): AIProviderConfig {
  const analysisProvider = normalizeProvider(configs.ai_analysis_provider || process.env.AI_ANALYSIS_PROVIDER);
  const imageProvider = normalizeProvider(configs.ai_image_provider || process.env.AI_IMAGE_PROVIDER);

  return {
    analysis: getEndpoint(configs, analysisProvider),
    image: {
      ...getEndpoint(configs, imageProvider, true),
      mode: normalizeImageMode(configs.ai_image_mode || process.env.AI_IMAGE_MODE),
    },
  };
}

export function assertProviderReady(config: AIEndpointConfig): void {
  if (!config.apiKey || config.apiKey === 'sk-your-openai-api-key-here' || config.apiKey === 'xai-your-api-key-here') {
    const name = config.provider === 'grok' ? 'Grok/xAI' : 'OpenAI';
    throw new Error(`请先在管理后台配置 ${name} API Key`);
  }
}
