const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { app } = require('../index.js');

async function withServer(callback) {
  const server = http.createServer(app);

  await new Promise((resolve) => server.listen(0, resolve));

  const { port } = server.address();
  try {
    await callback(port);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('root route redirects to the comments listing', async () => {
  await withServer(async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/`, { redirect: 'manual' });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/comments');
  });
});

test('create route redirects with a success message', async () => {
  await withServer(async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'username=Tester&comment=Hello+from+test',
      redirect: 'manual'
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/comments?message=Comment%20added%20successfully&type=success');
  });
});

test('update route redirects with a success message', async () => {
  await withServer(async (port) => {
    const createResponse = await fetch(`http://127.0.0.1:${port}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'username=Tester&comment=Original+comment',
      redirect: 'manual'
    });

    const createdLocation = createResponse.headers.get('location');
    const match = createdLocation.match(/message=Comment%20added%20successfully/);
    assert.ok(match);

    const commentListResponse = await fetch(`http://127.0.0.1:${port}/comments`, { redirect: 'manual' });
    assert.equal(commentListResponse.status, 200);
  });
});
