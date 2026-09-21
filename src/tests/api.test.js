const test = require('node:test');
const assert = require('node:assert');
const http = require('http');
const app = require('../server.js');

const TEST_PORT = 3001;

test('HomePulse Server API Endpoint Tests', async (t) => {
  let server;

  // Start temporary test server
  await new Promise((resolve) => {
    server = app.listen(TEST_PORT, () => {
      resolve();
    });
  });

  t.after(() => {
    if (server) server.close();
  });

  await t.test('GET /api/devices should return list of devices', async () => {
    const data = await makeRequest(`http://localhost:${TEST_PORT}/api/devices`);
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data));
    assert.ok(data.data.length >= 10, 'Should contain at least 10 devices');
  });

  await t.test('GET /api/routines should return automation routines', async () => {
    const data = await makeRequest(`http://localhost:${TEST_PORT}/api/routines`);
    assert.strictEqual(data.success, true);
    assert.ok(Array.isArray(data.data));
    assert.ok(data.data.length >= 4, 'Should contain at least 4 routines');
  });

  await t.test('GET /api/telemetry/live should return live IoT feed', async () => {
    const data = await makeRequest(`http://localhost:${TEST_PORT}/api/telemetry/live`);
    assert.strictEqual(data.success, true);
    assert.ok(typeof data.data.ambientTemp === 'number');
    assert.ok(typeof data.data.currentPowerKw === 'number');
  });

  await t.test('GET /api/energy-budget should return tariff cost estimator metrics', async () => {
    const data = await makeRequest(`http://localhost:${TEST_PORT}/api/energy-budget`);
    assert.strictEqual(data.success, true);
    assert.ok(typeof data.data.monthlyKWhBudget === 'number');
    assert.ok(typeof data.data.costToDate === 'number');
    assert.ok(typeof data.data.projectedCost === 'number');
  });
});

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}
