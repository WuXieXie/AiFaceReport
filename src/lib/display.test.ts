import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDateTimeSeconds } from './display';

test('formats report time to seconds', () => {
  assert.equal(formatDateTimeSeconds('2026-04-27T13:06:52.000Z'), '2026/04/27 21:06:52');
});

test('uses API upload URLs for stored images', async () => {
  const { getUploadUrl } = await import('./uploads');

  assert.equal(getUploadUrl('face.jpg'), '/api/uploads/face.jpg');
  assert.equal(getUploadUrl('/uploads/face.jpg'), '/api/uploads/face.jpg');
  assert.equal(getUploadUrl('/api/uploads/face.jpg'), '/api/uploads/face.jpg');
});
