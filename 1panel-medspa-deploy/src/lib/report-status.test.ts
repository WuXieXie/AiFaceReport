import assert from 'node:assert/strict';
import test from 'node:test';
import { isReportImagePending, shouldPollReport } from './report-status';

test('marks report image as pending after text analysis returns', () => {
  assert.equal(isReportImagePending({ status: 'image_processing', overlayUrl: null, aiReportUrl: null }), true);
  assert.equal(shouldPollReport({ status: 'image_processing', overlayUrl: null, aiReportUrl: null }), true);
});

test('stops image placeholder once any report image exists', () => {
  assert.equal(isReportImagePending({ status: 'image_processing', overlayUrl: '/api/uploads/overlay.png', aiReportUrl: null }), false);
  assert.equal(isReportImagePending({ status: 'completed', overlayUrl: null, aiReportUrl: '/api/uploads/report.png' }), false);
  assert.equal(shouldPollReport({ status: 'completed', overlayUrl: null, aiReportUrl: '/api/uploads/report.png' }), false);
});
