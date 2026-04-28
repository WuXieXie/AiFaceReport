import assert from 'node:assert/strict';
import test from 'node:test';
import { extractImageApiBase64 } from './openai';

test('image API result extraction accepts base64 and ignores remote URLs', () => {
  assert.equal(extractImageApiBase64({ data: [{ b64_json: 'abc123' }] }), 'abc123');
  assert.equal(extractImageApiBase64({ data: [{ url: 'https://example.com/image.png' }] }), null);
});
