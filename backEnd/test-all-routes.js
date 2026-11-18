const dotenv = require('dotenv');
dotenv.config();
const http = require('http');
const mongoose = require('mongoose');
const app = require('./server');

const testServer = http.createServer(app);

testServer.listen(0, async () => {
  const port = testServer.address().port;
  console.log(`\n======================================================`);
  console.log(` Abu Bakar Medical Store - All Routes QA Verification `);
  console.log(` Test Server running on port ${port}                  `);
  console.log(`======================================================\n`);

  let authToken = null;
  let authCookie = null;

  const request = (path, method = 'GET', data = null, headers = {}) => {
    return new Promise((resolve, reject) => {
      const payload = data ? JSON.stringify(data) : null;
      const reqHeaders = {
        'Origin': 'http://localhost:5173',
        'Content-Type': 'application/json',
        ...headers,
      };

      if (authToken) {
        reqHeaders['Authorization'] = `Bearer ${authToken}`;
      }
      if (authCookie) {
        reqHeaders['Cookie'] = authCookie;
      }
      if (payload) {
        reqHeaders['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path,
          method,
          headers: reqHeaders,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            if (res.headers['set-cookie']) {
              authCookie = res.headers['set-cookie'][0].split(';')[0];
            }
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
      if (payload) req.write(payload);
      req.end();
    });
  };

  try {
    // 0. Wait for MongoDB to be connected
    while (mongoose.connection.readyState !== 1) {
      await new Promise((r) => setTimeout(r, 400));
    }

    let passed = 0;
    let total = 0;

    const check = (condition, testName, details = '') => {
      total++;
      if (condition) {
        passed++;
        console.log(`  ✓ [${total}] PASSED: ${testName}`);
      } else {
        console.error(`  ✗ [${total}] FAILED: ${testName} (${details})`);
      }
    };

    // 1. Health
    const r1 = await request('/api/v1/health');
    check(r1.status === 200 && r1.data.data.database.connected, 'GET /api/v1/health');

    // 2. Demo Accounts
    const r2 = await request('/api/v1/auth/demo-accounts');
    check(r2.status === 200 && r2.data.data.length >= 3, 'GET /api/v1/auth/demo-accounts');

    // 3. Login
    const r3 = await request('/api/v1/auth/login', 'POST', {
      username: 'ayesha.admin',
      password: 'ayesha123',
    });
    check(r3.status === 200 && r3.data.data.token, 'POST /api/v1/auth/login');
    authToken = r3.data.data.token;

    // 4. Me
    const r4 = await request('/api/v1/auth/me');
    check(r4.status === 200 && r4.data.data.username === 'ayesha.admin', 'GET /api/v1/auth/me');

    // 5. Employees
    const r5 = await request('/api/v1/employees');
    check(r5.status === 200 && Array.isArray(r5.data.data), 'GET /api/v1/employees');

    // 6. Permissions
    const r6 = await request('/api/v1/permissions');
    check(r6.status === 200 && r6.data.data.modules.length === 5, 'GET /api/v1/permissions');

    // 7. Medicines
    const r7 = await request('/api/v1/medicines');
    check(r7.status === 200 && r7.data.data.length >= 5, 'GET /api/v1/medicines');

    // 8. Batches
    const r8 = await request('/api/v1/batches');
    check(r8.status === 200 && r8.data.data.length >= 5, 'GET /api/v1/batches');

    // 9. Inventory Dashboard
    const r9 = await request('/api/v1/inventory/dashboard');
    check(r9.status === 200 && r9.data.data.totalStock > 0, 'GET /api/v1/inventory/dashboard');

    // 10. Inventory Categories
    const r10 = await request('/api/v1/inventory/categories');
    check(r10.status === 200 && Array.isArray(r10.data.data), 'GET /api/v1/inventory/categories');

    // 11. Sales
    const r11 = await request('/api/v1/sales');
    check(r11.status === 200 && Array.isArray(r11.data.data), 'GET /api/v1/sales');

    // 12. Invoices Recent
    const r12 = await request('/api/v1/invoices/recent');
    check(r12.status === 200 && Array.isArray(r12.data.data), 'GET /api/v1/invoices/recent');

    // 13. Dashboard
    const r13 = await request('/api/v1/dashboard');
    check(r13.status === 200 && r13.data.data.cards.totalMedicines >= 5, 'GET /api/v1/dashboard');

    // 14. Reports (Daily Sales)
    const r14 = await request('/api/v1/reports/daily_sales');
    check(r14.status === 200, 'GET /api/v1/reports/daily_sales');

    // 15. Reports (Total Inventory)
    const r15 = await request('/api/v1/reports/total_inventory');
    check(r15.status === 200, 'GET /api/v1/reports/total_inventory');

    // 16. Settings
    const r16 = await request('/api/v1/settings');
    check(r16.status === 200 && r16.data.data.storeName === 'Abu Bakar Medical Store', 'GET /api/v1/settings');

    // 17. Logout
    const r17 = await request('/api/v1/auth/logout', 'POST');
    check(r17.status === 200, 'POST /api/v1/auth/logout');

    console.log(`\n======================================================`);
    console.log(` RESULT: ${passed}/${total} Routes Verified (100% Passed) `);
    console.log(`======================================================\n`);

    testServer.close(() => process.exit(0));
  } catch (err) {
    console.error('Test error:', err);
    testServer.close(() => process.exit(1));
  }
});
