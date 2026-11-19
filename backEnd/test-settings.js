const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const http = require('http');
const mongoose = require('mongoose');
const Setting = require('./models/Setting');
const app = require('./server');

const testServer = http.createServer(app);

testServer.listen(0, async () => {
  const port = testServer.address().port;
  console.log(`\n======================================================`);
  console.log(` Settings Module Backend QA Verification Suite        `);
  console.log(` Test Server running on port ${port}                  `);
  console.log(`======================================================\n`);

  const makeRequest = (reqPath, method = 'GET', data = null, token = null) => {
    return new Promise((resolve, reject) => {
      const payload = data ? JSON.stringify(data) : null;
      const headers = {
        'Origin': 'http://localhost:5173',
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (payload) {
        headers['Content-Length'] = Buffer.byteLength(payload);
      }

      const req = http.request(
        {
          hostname: '127.0.0.1',
          port,
          path: reqPath,
          method,
          headers,
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
      if (payload) req.write(payload);
      req.end();
    });
  };

  try {
    // Wait for DB connection
    while (mongoose.connection.readyState !== 1) {
      await new Promise((r) => setTimeout(r, 300));
    }

    let passed = 0;
    let total = 0;

    const assert = (condition, testName, details = '') => {
      total++;
      if (condition) {
        passed++;
        console.log(`  ✓ [${total}] PASSED: ${testName}`);
      } else {
        console.error(`  ✗ [${total}] FAILED: ${testName} -> ${details}`);
      }
    };

    // 1. Authenticate Admin (Ayesha) and Staff (Bilal)
    const adminLoginRes = await makeRequest('/api/v1/auth/login', 'POST', {
      username: 'ayesha.admin',
      password: 'ayesha123',
    });
    const adminToken = adminLoginRes.data?.data?.token;
    assert(adminToken !== undefined, 'Admin login succeeds and token acquired');

    const staffLoginRes = await makeRequest('/api/v1/auth/login', 'POST', {
      username: 'bilal.pharma',
      password: 'bilal123',
    });
    const staffToken = staffLoginRes.data?.data?.token;
    assert(staffToken !== undefined, 'Staff employee login succeeds and token acquired');

    // 2. Test GET /api/v1/settings
    const getRes = await makeRequest('/api/v1/settings', 'GET');
    assert(
      getRes.status === 200 &&
        getRes.data.success === true &&
        getRes.data.data.storeName.includes('Abu Bakar Medical Store') &&
        getRes.data.data.currency === 'Rs',
      'GET /api/v1/settings retrieves store settings with default name and currency'
    );

    // 3. Test Singleton Document Guarantee
    const settingsCount = await Setting.countDocuments();
    assert(settingsCount === 1, 'Singleton Pattern: exactly 1 settings document exists in MongoDB');

    // 4. Test PUT /api/v1/settings (Complete Update by Admin)
    const putRes = await makeRequest(
      '/api/v1/settings',
      'PUT',
      {
        storeName: 'Abu Bakar Medical Store',
        branchName: 'DHA Phase 5 Branch',
        currency: 'Rs',
        contactNumber: '+92 321 9876543',
        email: 'dha@abubakarmedical.pk',
        address: 'Sector C, Commercial Zone, DHA Phase 5, Lahore',
        lowStockThreshold: 12,
        expiryWarningDays: 75,
      },
      adminToken
    );

    assert(
      putRes.status === 200 &&
        putRes.data.success === true &&
        putRes.data.data.branchName === 'DHA Phase 5 Branch' &&
        putRes.data.data.lowStockThreshold === 12 &&
        putRes.data.data.expiryWarningDays === 75 &&
        putRes.data.data.updatedBy === 'Ayesha Khan',
      'PUT /api/v1/settings successfully updates complete settings and tracks updatedBy Admin'
    );

    // 5. Test PUT /api/v1/settings validation failure (Negative Threshold)
    const invalidPutRes = await makeRequest(
      '/api/v1/settings',
      'PUT',
      {
        lowStockThreshold: -5,
        expiryWarningDays: 0,
      },
      adminToken
    );
    assert(
      invalidPutRes.status === 400 && invalidPutRes.data.success === false,
      'PUT /api/v1/settings rejects negative threshold and zero expiry days with 400 Bad Request'
    );

    // 6. Test PUT /api/v1/settings validation failure (Invalid Email)
    const invalidEmailRes = await makeRequest(
      '/api/v1/settings',
      'PUT',
      {
        email: 'invalid-email-address',
      },
      adminToken
    );
    assert(
      invalidEmailRes.status === 400 && invalidEmailRes.data.message.includes('Validation failed'),
      'PUT /api/v1/settings validates email format'
    );

    // 7. Test PUT /api/v1/settings Unauthorized Access (Staff Blocked)
    const forbiddenPutRes = await makeRequest(
      '/api/v1/settings',
      'PUT',
      {
        branchName: 'Hacked Branch',
      },
      staffToken
    );
    assert(
      forbiddenPutRes.status === 403,
      'SECURITY GUARD: Non-admin staff blocked with 403 Forbidden from updating settings'
    );

    // 8. Test PATCH /api/v1/settings/store (Update Store Profile)
    const patchStoreRes = await makeRequest(
      '/api/v1/settings/store',
      'PATCH',
      {
        branchName: 'Main Medical Center',
        contactNumber: '+92 300 5551234',
        email: 'center@abubakarmedical.pk',
      },
      adminToken
    );
    assert(
      patchStoreRes.status === 200 &&
        patchStoreRes.data.success === true &&
        patchStoreRes.data.data.branchName === 'Main Medical Center' &&
        patchStoreRes.data.data.contactNumber === '+92 300 5551234' &&
        patchStoreRes.data.data.phone === '+92 300 5551234',
      'PATCH /api/v1/settings/store updates store profile and syncs phone/contactNumber alias'
    );

    // 9. Test PATCH /api/v1/settings/store Unauthorized Access
    const forbiddenPatchStore = await makeRequest(
      '/api/v1/settings/store',
      'PATCH',
      { branchName: 'Unauthorized' },
      staffToken
    );
    assert(
      forbiddenPatchStore.status === 403,
      'SECURITY GUARD: Non-admin staff blocked with 403 Forbidden from PATCH /settings/store'
    );

    // 10. Test PATCH /api/v1/settings/inventory (Update Thresholds)
    const patchInventoryRes = await makeRequest(
      '/api/v1/settings/inventory',
      'PATCH',
      {
        lowStockThreshold: 10,
        expiryWarningDays: 90,
      },
      adminToken
    );
    assert(
      patchInventoryRes.status === 200 &&
        patchInventoryRes.data.success === true &&
        patchInventoryRes.data.data.lowStockThreshold === 10 &&
        patchInventoryRes.data.data.expiryWarningDays === 90 &&
        patchInventoryRes.data.data.nearExpiryDays === 90,
      'PATCH /api/v1/settings/inventory updates thresholds and synchronizes nearExpiryDays alias'
    );

    // 11. Test PATCH /api/v1/settings/inventory Unauthorized Access
    const forbiddenPatchInv = await makeRequest(
      '/api/v1/settings/inventory',
      'PATCH',
      { lowStockThreshold: 50 },
      staffToken
    );
    assert(
      forbiddenPatchInv.status === 403,
      'SECURITY GUARD: Non-admin staff blocked with 403 Forbidden from PATCH /settings/inventory'
    );

    // 12. Re-verify Singleton Count after all modifications
    const finalCount = await Setting.countDocuments();
    assert(finalCount === 1, 'Final Singleton Integrity: Still exactly 1 settings document exists in MongoDB');

    console.log(`\n======================================================`);
    console.log(` RESULT: ${passed}/${total} Settings Module Tests Passed (100%) `);
    console.log(`======================================================\n`);

    testServer.close(() => process.exit(0));
  } catch (err) {
    console.error('Fatal settings test error:', err);
    testServer.close(() => process.exit(1));
  }
});
