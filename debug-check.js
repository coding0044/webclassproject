const http = require('node:http');
const { app } = require('./index.js');

(async () => {
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const { port } = server.address();
  const response = await fetch(`http://127.0.0.1:${port}/`);
  console.log('status=', response.status);
  console.log('location=', response.headers.get('location'));
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
})();
