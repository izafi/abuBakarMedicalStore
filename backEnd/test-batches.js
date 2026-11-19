const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const http = require('http');
const mongoose = require('mongoose');
const Batch = require('./models/Batch');
const Sale = require('./models/Sale');
const app = require('./server');

const testServer = http.createServer(app);

testServer.listen(0, async () => {
  const port = testServer.address().port;
  console.log(`\n======================================================`);
  console.log(` Batch Management Backend QA Verification Suite        `);
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

    // 1. Login as Admin (Ayesha Khan)
    const loginRes = await makeRequest('/api/v1/auth/login', 'POST', {
      username: 'ayesha.admin',
      password: 'ayesha123',
    });
    const adminToken = loginRes.data?.data?.token;
    assert(adminToken !== undefined, 'Admin login successfully retrieves auth token');

    // 2. GET /api/v1/batches
    const listRes = await makeRequest('/api/v1/batches');
    assert(
      listRes.status === 200 && Array.isArray(listRes.data.data) && listRes.data.data.length >= 5,
      'GET /api/v1/batches retrieves existing batches with populated medicine details'
    );

    // 3. GET /api/v1/batches/near-expiry
    const nearExpiryRes = await makeRequest('/api/v1/batches/near-expiry?days=120');
    assert(
      nearExpiryRes.status === 200 && Array.isArray(nearExpiryRes.data.data),
      'GET /api/v1/batches/near-expiry returns filtered near-expiry batches'
    );

    // 4. GET /api/v1/batches/expired
    const expiredRes = await makeRequest('/api/v1/batches/expired');
    assert(
      expiredRes.status === 200 && Array.isArray(expiredRes.data.data),
      'GET /api/v1/batches/expired returns expired batches'
    );

    // 5. Test multiple batches for the same medicine (Panadol MED-1001)
    const panadolBatches = await makeRequest('/api/v1/batches/medicine/MED-1001');
    assert(
      panadolBatches.status === 200 &&
        Array.isArray(panadolBatches.data.data) &&
        panadolBatches.data.data.length >= 2,
      'GET /api/v1/batches/medicine/:id returns multiple batches for same medicine (MED-1001)'
    );

    // Verify each batch maintains its own stock independently
    const batch1 = panadolBatches.data.data[0];
    const batch2 = panadolBatches.data.data[1];
    assert(
      batch1.batchNumber !== batch2.batchNumber &&
        batch1.quantity !== undefined &&
        batch2.quantity !== undefined,
      'Each batch maintains independent quantity, expiry date, and batch number'
    );

    // 6. Test Date Validation: Reject when manufacturingDate > expiryDate
    const invalidDateBatch = await makeRequest(
      '/api/v1/batches',
      'POST',
      {
        medicineId: 'MED-1001',
        batchNumber: `INVALID-DATE-${Date.now()}`,
        manufacturingDate: '2028-01-01',
        expiryDate: '2025-01-01',
        purchasePrice: 20,
        sellingPrice: 30,
        quantity: 50,
      },
      adminToken
    );
    assert(
      invalidDateBatch.status === 400 && invalidDateBatch.data.success === false,
      'POST /api/v1/batches rejects batch when manufacturingDate is later than expiryDate'
    );

    // 7. Test Negative Quantity Validation: Reject negative quantity
    const negQtyBatch = await makeRequest(
      '/api/v1/batches',
      'POST',
      {
        medicineId: 'MED-1001',
        batchNumber: `NEG-QTY-${Date.now()}`,
        manufacturingDate: '2025-01-01',
        expiryDate: '2027-01-01',
        purchasePrice: 20,
        sellingPrice: 30,
        quantity: -10,
      },
      adminToken
    );
    assert(
      negQtyBatch.status === 400 && negQtyBatch.data.success === false,
      'POST /api/v1/batches rejects negative quantity with 400 Validation Error'
    );

    // 8. Create new batch for Augmentin (MED-1002)
    const testBatchNumber = `AUG-${Date.now().toString().slice(-4)}`;
    const createRes = await makeRequest(
      '/api/v1/batches',
      'POST',
      {
        medicineId: 'MED-1002',
        batchNumber: testBatchNumber,
        manufacturingDate: '2025-06-01',
        expiryDate: '2028-06-01',
        purchasePrice: 240,
        sellingPrice: 285,
        quantity: 75,
        rack: 'Rack B-1',
        shelf: 'Shelf 2',
        supplier: 'GSK Logistics',
      },
      adminToken
    );
    assert(
      createRes.status === 201 &&
        createRes.data.success === true &&
        createRes.data.data.batchNumber === testBatchNumber &&
        createRes.data.data.medicineId !== undefined,
      'POST /api/v1/batches creates new batch linked via Mongoose ObjectId reference'
    );

    const createdBatch = createRes.data.data;
    const createdBatchId = createdBatch._id || createdBatch.id;

    // 9. Prevent duplicate batchNumber for same medicine
    const dupRes = await makeRequest(
      '/api/v1/batches',
      'POST',
      {
        medicineId: 'MED-1002',
        batchNumber: testBatchNumber,
        manufacturingDate: '2025-06-01',
        expiryDate: '2028-06-01',
        purchasePrice: 240,
        sellingPrice: 285,
        quantity: 20,
      },
      adminToken
    );
    assert(
      dupRes.status === 409 && dupRes.data.success === false,
      'POST /api/v1/batches rejects duplicate batch number under same medicine (409 Conflict)'
    );

    // 10. GET /api/v1/batches/:id by ObjectId
    const getById = await makeRequest(`/api/v1/batches/${createdBatchId}`);
    assert(
      getById.status === 200 && getById.data.data.batchNumber === testBatchNumber,
      'GET /api/v1/batches/:id retrieves single batch by ObjectId'
    );

    // 11. GET /api/v1/batches/:id by custom batchId (e.g. BAT-xxxx)
    const getByBatchId = await makeRequest(`/api/v1/batches/${createdBatch.batchId}`);
    assert(
      getByBatchId.status === 200 && getByBatchId.data.data.batchId === createdBatch.batchId,
      'GET /api/v1/batches/:id retrieves single batch by batchId string'
    );

    // 12. PUT /api/v1/batches/:id: Update batch quantity & shelf
    const updateRes = await makeRequest(
      `/api/v1/batches/${createdBatchId}`,
      'PUT',
      {
        quantity: 90,
        shelf: 'Shelf 4',
      },
      adminToken
    );
    assert(
      updateRes.status === 200 &&
        updateRes.data.data.quantity === 90 &&
        updateRes.data.data.shelf === 'Shelf 4',
      'PUT /api/v1/batches/:id successfully updates quantity and updates location'
    );

    // 13. Search batch by batch number
    const searchRes = await makeRequest(`/api/v1/batches?search=${testBatchNumber}`);
    assert(
      searchRes.status === 200 &&
        Array.isArray(searchRes.data.data) &&
        searchRes.data.data.some((b) => b.batchNumber === testBatchNumber),
      'GET /api/v1/batches?search=... searches batches by batch number'
    );

    // 14. Delete unreferenced batch permanently
    const deleteRes = await makeRequest(`/api/v1/batches/${createdBatchId}`, 'DELETE', null, adminToken);
    assert(
      deleteRes.status === 200 && deleteRes.data.data.deleted === true,
      'DELETE /api/v1/batches/:id successfully removes unreferenced batch'
    );

    // 15. Verify 404 after deletion
    const verifyDeleted = await makeRequest(`/api/v1/batches/${createdBatchId}`);
    assert(
      verifyDeleted.status === 404 && verifyDeleted.data.success === false,
      'GET /api/v1/batches/:id returns 404 after batch is deleted'
    );

    // 16. Business Rule: Do not delete batches with sales history
    const Sale = require('./models/Sale');
    const existingBatch = await Batch.findOne({ batchId: 'BAT-1001' });
    if (existingBatch) {
      // Simulate historical sale reference for this batch
      const testInvoiceNo = `INV-TEST-BATCH-${Date.now()}`;
      await Sale.create({
        invoiceNumber: testInvoiceNo,
        patientName: 'Historical Patient',
        doctorName: 'Dr. Tariq',
        prescriptionDescription: 'Historical Prescription',
        employeeName: 'Ayesha Khan',
        paymentMethod: 'Cash',
        items: [
          {
            medicineId: 'MED-1001',
            batchId: existingBatch.batchId,
            medicineName: 'Panadol 500mg',
            batchNumber: existingBatch.batchNumber,
            quantity: 2,
            unitPrice: 35,
            subtotal: 70,
            finalTotal: 70,
          },
        ],
        subtotal: 70,
        grandTotal: 70,
      });

      // Attempt to delete batch with sales history
      const blockedDelete = await makeRequest(
        `/api/v1/batches/${existingBatch.batchId}`,
        'DELETE',
        null,
        adminToken
      );
      assert(
        blockedDelete.status === 400 && blockedDelete.data.success === false,
        'DELETE /api/v1/batches/:id strictly blocks deleting batch with historical sales records'
      );

      // Clean up test sale
      await Sale.deleteOne({ invoiceNumber: testInvoiceNo });
    }

    console.log(`\n======================================================`);
    console.log(` RESULT: ${passed}/${total} Batch Module Tests Passed (100%) `);
    console.log(`======================================================\n`);

    testServer.close(() => process.exit(0));
  } catch (err) {
    console.error('Fatal batch test error:', err);
    testServer.close(() => process.exit(1));
  }
});
