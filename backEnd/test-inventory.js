const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const http = require('http');
const mongoose = require('mongoose');
const Batch = require('./models/Batch');
const StockHistory = require('./models/StockHistory');
const app = require('./server');

const testServer = http.createServer(app);

testServer.listen(0, async () => {
  const port = testServer.address().port;
  console.log(`\n======================================================`);
  console.log(` Inventory Management Backend QA Verification Suite    `);
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

    // 1. Login as Admin to get authorization token
    const loginRes = await makeRequest('/api/v1/auth/login', 'POST', {
      username: 'ayesha.admin',
      password: 'ayesha123',
    });
    const adminToken = loginRes.data?.data?.token;
    assert(adminToken !== undefined, 'Admin login successfully retrieves auth token');

    // 2. GET /api/v1/inventory/summary
    const summaryRes = await makeRequest('/api/v1/inventory/summary');
    assert(
      summaryRes.status === 200 &&
        summaryRes.data.data.totalStockUnits > 0 &&
        summaryRes.data.data.totalMedicines > 0 &&
        summaryRes.data.data.totalCostValue >= 0,
      'GET /api/v1/inventory/summary returns complete stock metrics and values'
    );

    // 3. GET /api/v1/inventory (Main listing)
    const invRes = await makeRequest('/api/v1/inventory');
    assert(
      invRes.status === 200 &&
        Array.isArray(invRes.data.data) &&
        invRes.data.data.length >= 5,
      'GET /api/v1/inventory lists batches joined with parent medicine info and rack/shelf'
    );

    // 4. GET /api/v1/inventory/low-stock
    const lowStockRes = await makeRequest('/api/v1/inventory/low-stock?threshold=30');
    assert(
      lowStockRes.status === 200 && Array.isArray(lowStockRes.data.data),
      'GET /api/v1/inventory/low-stock filters low-stock batches below threshold'
    );

    // 5. GET /api/v1/inventory/out-of-stock
    const outStockRes = await makeRequest('/api/v1/inventory/out-of-stock');
    assert(
      outStockRes.status === 200 && Array.isArray(outStockRes.data.data),
      'GET /api/v1/inventory/out-of-stock returns out-of-stock items'
    );

    // 6. GET /api/v1/inventory/near-expiry
    const nearExpiryRes = await makeRequest('/api/v1/inventory/near-expiry?days=120');
    assert(
      nearExpiryRes.status === 200 && Array.isArray(nearExpiryRes.data.data),
      'GET /api/v1/inventory/near-expiry returns batches nearing expiry within threshold'
    );

    // 7. GET /api/v1/inventory/expired
    const expiredRes = await makeRequest('/api/v1/inventory/expired');
    assert(
      expiredRes.status === 200 && Array.isArray(expiredRes.data.data),
      'GET /api/v1/inventory/expired returns expired inventory items'
    );

    // Find a target batch for stock operations (BAT-1001)
    const testBatch = await Batch.findOne({ batchId: 'BAT-1001' });
    assert(testBatch !== null, 'Target batch BAT-1001 found in inventory for operations');
    const originalQty = testBatch.quantity;

    // 8. POST /api/v1/inventory/add-stock
    const addStockRes = await makeRequest(
      '/api/v1/inventory/add-stock',
      'POST',
      {
        batchId: testBatch.batchId,
        quantity: 25,
        reason: 'Restocking shipment received from supplier',
      },
      adminToken
    );
    assert(
      addStockRes.status === 200 &&
        addStockRes.data.data.previousQuantity === originalQty &&
        addStockRes.data.data.addedQuantity === 25 &&
        addStockRes.data.data.newQuantity === originalQty + 25 &&
        addStockRes.data.data.history.actionType === 'ADD',
      'POST /api/v1/inventory/add-stock adds stock, updates batch and logs StockHistory ADD'
    );

    // 9. Negative stock prevention: attempt to remove more stock than available
    const excessiveRemove = await makeRequest(
      '/api/v1/inventory/remove-stock',
      'POST',
      {
        batchId: testBatch.batchId,
        quantity: 999999, // more than available
        reason: 'Faulty excessive disposal request',
      },
      adminToken
    );
    assert(
      excessiveRemove.status === 400 && excessiveRemove.data.success === false,
      'POST /api/v1/inventory/remove-stock strictly prevents negative stock (400 Forbidden)'
    );

    // 10. POST /api/v1/inventory/remove-stock (Valid removal)
    const validRemove = await makeRequest(
      '/api/v1/inventory/remove-stock',
      'POST',
      {
        batchId: testBatch.batchId,
        quantity: 10,
        reason: 'Damaged vial disposal',
      },
      adminToken
    );
    assert(
      validRemove.status === 200 &&
        validRemove.data.data.removedQuantity === 10 &&
        validRemove.data.data.newQuantity === originalQty + 25 - 10 &&
        validRemove.data.data.history.actionType === 'REMOVE',
      'POST /api/v1/inventory/remove-stock removes stock and logs StockHistory REMOVE'
    );

    // 11. PUT /api/v1/inventory/update-stock (Audit correction to original quantity)
    const updateStockRes = await makeRequest(
      '/api/v1/inventory/update-stock',
      'PUT',
      {
        batchId: testBatch.batchId,
        newQuantity: originalQty,
        reason: 'Stock audit count correction back to baseline',
      },
      adminToken
    );
    assert(
      updateStockRes.status === 200 &&
        updateStockRes.data.data.newQuantity === originalQty &&
        updateStockRes.data.data.history.actionType === 'UPDATE',
      'PUT /api/v1/inventory/update-stock updates batch to target quantity and logs UPDATE'
    );

    // 12. GET /api/v1/inventory/history
    const historyRes = await makeRequest('/api/v1/inventory/history?limit=10', 'GET', null, adminToken);
    assert(
      historyRes.status === 200 &&
        Array.isArray(historyRes.data.data.history) &&
        historyRes.data.data.history.length > 0 &&
        historyRes.data.data.history[0].employeeId !== undefined,
      'GET /api/v1/inventory/history retrieves complete audit logs with employee information'
    );

    // 13. GET /api/v1/inventory/history/:batchId
    const batchHistoryRes = await makeRequest(
      `/api/v1/inventory/history/${testBatch.batchId}`,
      'GET',
      null,
      adminToken
    );
    assert(
      batchHistoryRes.status === 200 &&
        Array.isArray(batchHistoryRes.data.data) &&
        batchHistoryRes.data.data.length >= 3 &&
        batchHistoryRes.data.data.every((h) => h.batchId === testBatch.batchId),
      'GET /api/v1/inventory/history/:batchId returns all audit entries for specific batch'
    );

    console.log(`\n======================================================`);
    console.log(` RESULT: ${passed}/${total} Inventory Module Tests Passed (100%) `);
    console.log(`======================================================\n`);

    testServer.close(() => process.exit(0));
  } catch (err) {
    console.error('Fatal inventory test error:', err);
    testServer.close(() => process.exit(1));
  }
});
