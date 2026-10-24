const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');

const { app } = require('../index.js');
const { hashPassword, verifyPassword } = require('../auth/password');
const { clearSessionCookie, getSessionUser, setSessionCookie } = require('../auth/session');
const { isEmailConfigured } = require('../auth/email');

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

function authenticatedCookie() {
  let cookies = [];
  const response = {
    getHeader: () => cookies,
    setHeader: (name, value) => {
      if (name === 'Set-Cookie') cookies = Array.isArray(value) ? value : [value];
    }
  };
  setSessionCookie(response, { _id: 'test-user-id', username: 'Tester' });
  return cookies.find((cookie) => cookie.startsWith('comments_session=')).split(';')[0];
}

test('root route opens the login page', async () => {
  await withServer(async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/`, { redirect: 'manual' });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/login');
  });
});

test('comments routes redirect guests to login', async () => {
  await withServer(async (port) => {
    const [boardResponse, newCommentResponse] = await Promise.all([
      fetch(`http://127.0.0.1:${port}/comments`, { redirect: 'manual' }),
      fetch(`http://127.0.0.1:${port}/comments/new`, { redirect: 'manual' })
    ]);

    assert.equal(boardResponse.status, 302);
    assert.equal(boardResponse.headers.get('location'), '/login');
    assert.equal(newCommentResponse.status, 302);
    assert.equal(newCommentResponse.headers.get('location'), '/login');
  });
});

test('login and signup pages render account forms', async () => {
  await withServer(async (port) => {
    const [loginResponse, signupResponse] = await Promise.all([
      fetch(`http://127.0.0.1:${port}/login`),
      fetch(`http://127.0.0.1:${port}/signup`)
    ]);

    assert.equal(loginResponse.status, 200);
    const loginHtml = await loginResponse.text();
    assert.match(loginHtml, /action="\/login"/);
    assert.match(loginHtml, /href="\/forgot-password"/);
    assert.doesNotMatch(loginHtml, /Back to the comments board/);
    assert.equal(signupResponse.status, 200);
    const signupHtml = await signupResponse.text();
    assert.match(signupHtml, /action="\/signup"/);
    assert.match(signupHtml, /name="confirmPassword"/);
    assert.doesNotMatch(signupHtml, /Back to the comments board/);
  });
});

test('password recovery displays separate email, code-verification, and password steps', async () => {
  await withServer(async (port) => {
    const [forgotResponse, verifyResponse, resetResponse] = await Promise.all([
      fetch(`http://127.0.0.1:${port}/forgot-password`),
      fetch(`http://127.0.0.1:${port}/verify-reset-code?email=tester%40example.com`),
      fetch(`http://127.0.0.1:${port}/reset-password`, { redirect: 'manual' })
    ]);

    assert.equal(forgotResponse.status, 200);
    assert.match(await forgotResponse.text(), /action="\/forgot-password"/);
    assert.equal(verifyResponse.status, 200);
    const verifyHtml = await verifyResponse.text();
    assert.match(verifyHtml, /action="\/verify-reset-code"/);
    assert.match(verifyHtml, /name="code"/);
    assert.match(verifyHtml, /tester@example.com/);
    assert.equal(resetResponse.status, 302);
    assert.equal(resetResponse.headers.get('location'), '/forgot-password');
  });
});

test('password reset form is unavailable without successful OTP verification', async () => {
  await withServer(async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'password=strong-password&confirmPassword=strong-password',
      redirect: 'manual'
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/forgot-password');
  });
});

test('malformed OTP is rejected before database access', async () => {
  await withServer(async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/verify-reset-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'email=tester%40example.com&code=123'
    });

    assert.equal(response.status, 400);
    assert.match(await response.text(), /Enter the six-digit code from your email/);
  });
});

test('reset-password page contains only new-password fields after verification', async () => {
  const html = await require('fs').promises.readFile(
    require('path').join(__dirname, '..', 'views', 'auth', 'reset-password.ejs'),
    'utf8'
  );
  assert.match(html, /name="password"/);
  assert.match(html, /name="confirmPassword"/);
  assert.doesNotMatch(html, /name="code"/);
  assert.doesNotMatch(html, /name="email"/);
});

test('forgot-password rejects malformed email addresses before database access', async () => {
  await withServer(async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'email=not-an-email'
    });

    assert.equal(response.status, 400);
    assert.match(await response.text(), /Enter a valid email address/);
  });
});

test('SMTP readiness requires a host, valid port, sender, and paired credentials', () => {
  const keys = ['MAIL_HOST', 'MAIL_PORT', 'MAIL_USER', 'MAIL_PASS', 'MAIL_FROM'];
  const previous = Object.fromEntries(keys.map((key) => [key, process.env[key]]));

  try {
    process.env.MAIL_HOST = 'smtp.example.test';
    process.env.MAIL_PORT = '587';
    process.env.MAIL_FROM = 'Threadline <no-reply@example.test>';
    delete process.env.MAIL_USER;
    delete process.env.MAIL_PASS;
    assert.equal(isEmailConfigured(), true);

    process.env.MAIL_USER = 'account';
    assert.equal(isEmailConfigured(), false);
    process.env.MAIL_PASS = 'secret';
    assert.equal(isEmailConfigured(), true);
    process.env.MAIL_PORT = 'not-a-port';
    assert.equal(isEmailConfigured(), false);
  } finally {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  }
});

test('comments pages use the shared Threadline layout', async () => {
  await withServer(async (port) => {
    const paths = ['/comments', '/comments/new', '/comments/c1', '/comments/c1/edit'];
    const cookie = authenticatedCookie();
    const responses = await Promise.all(paths.map((page) => fetch(`http://127.0.0.1:${port}${page}`, {
      headers: { Cookie: cookie }
    })));

    for (const response of responses) {
      assert.equal(response.status, 200);
      assert.match(await response.text(), /class="brand site-brand"/);
    }
  });
});

test('signup rejects invalid account details before accessing the database', async () => {
  await withServer(async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'username=A&email=not-an-email&password=short&confirmPassword=different'
    });

    assert.equal(response.status, 400);
    assert.match(await response.text(), /Your name must be between 2 and 50 characters/);
  });
});

test('login rejects malformed email addresses before accessing the database', async () => {
  await withServer(async (port) => {
    const response = await fetch(`http://127.0.0.1:${port}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'email=not-an-email&password=anything'
    });

    assert.equal(response.status, 400);
    assert.match(await response.text(), /Enter a valid email and password/);
  });
});

test('password hashes and signed session cookies validate correctly', async () => {
  const hash = await hashPassword('a-strong-test-password');
  assert.notEqual(hash, 'a-strong-test-password');
  assert.equal(await verifyPassword('a-strong-test-password', hash), true);
  assert.equal(await verifyPassword('incorrect-password', hash), false);

  let cookie;
  const response = {
    getHeader: () => cookie,
    setHeader: (name, value) => { if (name === 'Set-Cookie') cookie = value; }
  };
  setSessionCookie(response, { _id: 'user-id', username: 'Tester' });
  const sessionCookie = cookie.find((value) => value.startsWith('comments_session='));
  const request = { headers: { cookie: sessionCookie.split(';')[0] } };
  assert.deepEqual(getSessionUser(request), { id: 'user-id', username: 'Tester' });
  request.headers.cookie = `${sessionCookie.split(';')[0].slice(0, -1)}x`;
  assert.equal(getSessionUser(request), null);

  clearSessionCookie(response);
  assert.match(cookie.join(';'), /Max-Age=0/);
});

test('create route redirects with a success message', async () => {
  await withServer(async (port) => {
    const cookie = authenticatedCookie();
    const response = await fetch(`http://127.0.0.1:${port}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
      body: 'username=Tester&comment=Hello+from+test',
      redirect: 'manual'
    });

    assert.equal(response.status, 302);
    assert.equal(response.headers.get('location'), '/comments?message=Comment%20added%20successfully&type=success');
  });
});

test('update route redirects with a success message', async () => {
  await withServer(async (port) => {
    const cookie = authenticatedCookie();
    const createResponse = await fetch(`http://127.0.0.1:${port}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', Cookie: cookie },
      body: 'username=Tester&comment=Original+comment',
      redirect: 'manual'
    });

    const createdLocation = createResponse.headers.get('location');
    const match = createdLocation.match(/message=Comment%20added%20successfully/);
    assert.ok(match);

    const commentListResponse = await fetch(`http://127.0.0.1:${port}/comments`, {
      headers: { Cookie: cookie },
      redirect: 'manual'
    });
    assert.equal(commentListResponse.status, 200);
  });
});
