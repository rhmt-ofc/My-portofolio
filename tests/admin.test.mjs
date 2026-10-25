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
  assert.ok(responseData.projects.length >= 10);
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

test('admin endpoint move_to_front requires id', async () => {
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
    body: { action: 'move_to_front' }
  }, res);
  assert.equal(statusCode, 400);
});

test('admin endpoint detect_banner validates target url', async () => {
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
    body: { action: 'detect_banner' }
  }, res);
  assert.equal(statusCode, 400);
  assert.match(responseData.error, /URL/i);
});

test('admin endpoint detect_banner finds og banner on Repo Flow', async () => {
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
    body: { action: 'detect_banner', url: 'https://auto-reporistory-githb.vercel.app/' }
  }, res);
  assert.equal(statusCode, 200);
  assert.equal(responseData.success, true);
  assert.ok(responseData.bannerUrl);
  assert.match(responseData.bannerUrl, /banner\.png$/);
});
