import assert from 'node:assert/strict';
import test from 'node:test';
import { buildFaceOverlayPrompt } from './report-image';
import { resolveAIProviders } from './ai-providers';

test('face overlay prompt only asks the image model for lift-line markup', () => {
  const prompt = buildFaceOverlayPrompt();

  assert.match(prompt, /淡红色/);
  assert.match(prompt, /虚线表示，间隔较大，线条细/);
  assert.match(prompt, /向太阳穴或耳前/);
  assert.match(prompt, /提拉方向/);
  assert.doesNotMatch(prompt, /六维美学指数/);
  assert.doesNotMatch(prompt, /完整报告/);
  assert.doesNotMatch(prompt, /推荐改善方案/);
});

test('resolves OpenAI and Grok provider configuration independently', () => {
  const providers = resolveAIProviders({
    ai_analysis_provider: 'grok',
    ai_image_provider: 'openai',
    ai_image_mode: 'generate',
    openai_api_key: 'openai-key',
    openai_base_url: 'https://api.openai.com/v1',
    openai_model: 'gpt-5.4',
    openai_image_model: 'gpt-image-1',
    xai_api_key: 'xai-key',
    xai_base_url: 'https://api.x.ai/v1',
    xai_model: 'grok-4.20',
    xai_image_model: 'grok-imagine-image',
  });

  assert.equal(providers.analysis.provider, 'grok');
  assert.equal(providers.analysis.apiKey, 'xai-key');
  assert.equal(providers.analysis.baseUrl, 'https://api.x.ai/v1');
  assert.equal(providers.image.provider, 'openai');
  assert.equal(providers.image.model, 'gpt-image-1');
  assert.equal(providers.image.mode, 'generate');
});
