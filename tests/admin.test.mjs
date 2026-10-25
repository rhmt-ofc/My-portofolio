import test from 'node:test';
import assert from 'node:assert/strict';
import adminHandler from '../api/admin.js';

test('admin endpoint rejects invalid pin', async () => {
  let statusCode = 0;
  let responseData = null;
  const res = {
    setHeader: () => {},
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; }
  };

  await adminHandler({ method: 'GET', headers: { 'x-admin-key': 'salah_total' } }, res);
  assert.equal(statusCode, 401);
  assert.equal(responseData?.authenticated, false);
});

test('admin endpoint accepts correct default pin', async () => {
  let statusCode = 0;
  let responseData = null;
  const res = {
    setHeader: () => {},
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; }
  };

  await adminHandler({ method: 'GET', headers: { 'x-admin-key': 'rahmat2026' } }, res);
  assert.equal(statusCode, 200);
  assert.equal(responseData?.success, true);
  assert.equal(responseData?.authenticated, true);
  assert.ok(Array.isArray(responseData?.projects));
  assert.ok(responseData.projects.length >= 18);
});

test('admin endpoint rejects unsupported methods', async () => {
  let statusCode = 0;
  let responseData = null;
  const res = {
    setHeader: () => {},
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; }
  };

  await adminHandler({ method: 'DELETE', headers: { 'x-admin-key': 'rahmat2026' } }, res);
  assert.equal(statusCode, 405);
});

test('admin endpoint validates project name on save_project', async () => {
  let statusCode = 0;
  let responseData = null;
  const res = {
    setHeader: () => {},
    status: (code) => { statusCode = code; return res; },
    json: (data) => { responseData = data; }
  };

  await adminHandler({
    method: 'POST',
    headers: { 'x-admin-key': 'rahmat2026' },
    body: { action: 'save_project', project: {} }
  }, res);
  assert.equal(statusCode, 400);
  assert.match(responseData.error, /Nama Project/i);
});
