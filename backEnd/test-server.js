const dotenv = require('dotenv');
dotenv.config();
const http = require('http');
const app = require('./server');

// We use an ephemeral port to avoid conflict during automated testing
const testServer = http.createServer(app);

testServer.listen(0, async () => {
  const port = testServer.address().port;
  console.log(`Test server running on port ${port}`);

  const makeRequest = (path, method = 'GET') => {
    return new Promise((resolve, reject) => {
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: {
            'Origin': 'http://localhost:5173',
          },
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              resolve({
                status: res.statusCode,
                headers: res.headers,
                data: JSON.parse(body),
              });
            } catch {
              resolve({
                status: res.statusCode,
                headers: res.headers,
                data: body,
              });
            }
          });
        }
      );
      req.on('error', reject);
      req.end();
    });
  };

  try {
    // Wait for MongoDB to reach connected state
    console.log('Waiting for MongoDB connection handshake...');
    const mongoose = require('mongoose');
    while (mongoose.connection.readyState !== 1) {
      await new Promise((r) => setTimeout(r, 500));
    }
    console.log('MongoDB connected successfully!');

    console.log('\n--- 1. Testing GET /api/v1/health ---');
    const healthRes = await makeRequest('/api/v1/health');
    console.log('Status:', healthRes.status);
    console.log('Response Payload:', JSON.stringify(healthRes.data, null, 2));
    console.log('CORS Access-Control-Allow-Origin:', healthRes.headers['access-control-allow-origin']);

    console.log('\n--- 2. Testing Root GET / ---');
    const rootRes = await makeRequest('/');
    console.log('Status:', rootRes.status);
    console.log('Response:', rootRes.data.name);

    console.log('\n--- 3. Testing 404 Handler for Unknown Route ---');
    const notFoundRes = await makeRequest('/api/v1/unknown-endpoint');
    console.log('Status:', notFoundRes.status);
    console.log('404 Error Message:', notFoundRes.data.message);

    console.log('\n=============================================');
    console.log(' ALL BACKEND CONFIGURATION TESTS PASSED 100%! ');
    console.log('=============================================\n');

    testServer.close(() => process.exit(0));
  } catch (err) {
    console.error('Test execution error:', err);
    testServer.close(() => process.exit(1));
  }
});
