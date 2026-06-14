const assert = require('node:assert/strict');
const { test } = require('node:test');

const { csrfProtection } = require('../middleware/csrfProtection');

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };

  return response;
};

test('csrfProtection skips safe methods', () => {
  let nextCalled = false;

  csrfProtection(
    { method: 'GET' },
    createResponse(),
    () => {
      nextCalled = true;
    }
  );

  assert.equal(nextCalled, true);
});

test('csrfProtection rejects invalid tokens and returns the session token', async () => {
  const req = {
    method: 'POST',
    body: {},
    session: {
      csrfToken: 'current-token',
      save(callback) {
        callback();
      },
    },
    get(header) {
      if (header === 'X-CSRF-Token') return 'stale-token';
      return undefined;
    },
  };
  const res = createResponse();

  await new Promise((resolve, reject) => {
    csrfProtection(req, res, reject);
    setImmediate(resolve);
  });

  assert.equal(res.statusCode, 403);
  assert.equal(res.body.success, false);
  assert.equal(res.body.message, 'Invalid CSRF token');
  assert.equal(res.body.csrfToken, 'current-token');
});

test('csrfProtection allows matching tokens', () => {
  let nextCalled = false;
  const req = {
    method: 'POST',
    body: {},
    session: { csrfToken: 'current-token' },
    get(header) {
      if (header === 'X-CSRF-Token') return 'current-token';
      return undefined;
    },
  };

  csrfProtection(req, createResponse(), () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});
