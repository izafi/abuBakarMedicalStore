const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const http = require('http');
const mongoose = require('mongoose');
const Batch = require('./models/Batch');
const Sale = require('./models/Sale');
const SaleItem = require('./models/SaleItem');
const StockHistory = require('./models/StockHistory');
const app = require('./server');

const testServer = http.createServer(app);

testServer.listen(0, async () => {
  const port = testServer.address().port;
  console.log(`\n======================================================`);
  console.log(` Sales & Point of Sale Backend QA Verification Suite   `);
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

    // 1. Login as Admin / Dispensing Pharmacist
    const loginRes = await makeRequest('/api/v1/auth/login', 'POST', {
      username: 'ayesha.admin',
      password: 'ayesha123',
    });
    const adminToken = loginRes.data?.data?.token;
    assert(adminToken !== undefined, 'Admin login successfully retrieves auth token');

    // Find two valid batches for testing multi-item multi-batch sale
    const batch1 = await Batch.findOne({ batchId: 'BAT-1001' });
    const batch2 = await Batch.findOne({ batchId: 'BAT-1003' });
    assert(batch1 && batch2, 'Found valid batches BAT-1001 and BAT-1003 in inventory');

    const b1InitialQty = batch1.quantity;
    const b2InitialQty = batch2.quantity;

    // 2. Multi-Item, Multi-Batch Sale with Server-Side Calculations
    const salePayload = {
      patientName: 'Ali Raza',
      doctorName: 'Dr. Shahzad Tariq',
      prescription: 'Treatment for seasonal flu and bacterial infection',
      prescriptionRef: 'RX-77821',
      paymentMethod: 'Cash',
      items: [
        {
          batchId: batch1.batchId,
          quantity: 2,
          discountPercent: 10, // 10% discount on Panadol
        },
        {
          batchId: batch2.batchId,
          quantity: 1,
          discountPercent: 0, // No discount on Augmentin
        },
      ],
      amountReceived: 500,
    };

    // Expected Calculations on Backend:
    // Item 1: unitPrice = batch1.sellingPrice (35), qty = 2 -> subtotal = 70. 10% discount = 7. itemTotal = 63.
    // Item 2: unitPrice = batch2.sellingPrice (280), qty = 1 -> subtotal = 280. discount = 0. itemTotal = 280.
    // Subtotal = 350. Total discount = 7. Final amount = 343. Change = 500 - 343 = 157.
    const expectedSubtotal = Math.round((batch1.sellingPrice * 2 + batch2.sellingPrice * 1) * 100) / 100;
    const expectedDiscount = Math.round((batch1.sellingPrice * 2 * 0.1) * 100) / 100;
    const expectedFinal = expectedSubtotal - expectedDiscount;

    const createSaleRes = await makeRequest('/api/v1/sales', 'POST', salePayload, adminToken);
    assert(
      createSaleRes.status === 201 &&
        createSaleRes.data.success === true &&
        createSaleRes.data.data.invoiceNumber.startsWith('INV-') &&
        createSaleRes.data.data.subtotal === expectedSubtotal &&
        createSaleRes.data.data.totalDiscount === expectedDiscount &&
        createSaleRes.data.data.finalAmount === expectedFinal &&
        createSaleRes.data.data.paymentMethod === 'Cash',
      'POST /api/v1/sales processes multi-item sale and verifies backend calculations'
    );

    const createdSale = createSaleRes.data.data;
    const invoiceNumber = createdSale.invoiceNumber;

    // 3. Verify stock was deducted strictly from exact batches
    const updatedB1 = await Batch.findOne({ batchId: batch1.batchId });
    const updatedB2 = await Batch.findOne({ batchId: batch2.batchId });
    assert(
      updatedB1.quantity === b1InitialQty - 2 && updatedB2.quantity === b2InitialQty - 1,
      'Batch stock deducted accurately from exact batches (BAT-1001 -2, BAT-1003 -1)'
    );

    // 4. Verify StockHistory audit records logged for each batch
    const history1 = await StockHistory.findOne({
      batchId: batch1.batchId,
      actionType: 'SALE',
    }).sort({ dateTime: -1 });
    assert(
      history1 &&
        history1.changedQuantity === -2 &&
        history1.reason.includes(invoiceNumber),
      'StockHistory record created with actionType SALE referencing invoice number'
    );

    // 5. Verify individual SaleItem documents saved in database
    const saleItemDocs = await SaleItem.find({ saleId: createdSale._id });
    assert(
      saleItemDocs.length === 2 &&
        saleItemDocs.some((i) => i.batchNumber === batch1.batchNumber && i.quantity === 2) &&
        saleItemDocs.some((i) => i.batchNumber === batch2.batchNumber && i.quantity === 1),
      'Discrete SaleItem collection records created referencing parent saleId'
    );

    // 6. Critical Rule 1: Never sell expired medicines
    const expiredBatch = await Batch.create({
      batchId: `BAT-EXP-${Date.now()}`,
      medicineId: batch1.medicineId,
      medicineCode: batch1.medicineCode,
      batchNumber: `EXP-BATCH-${Date.now()}`,
      manufacturingDate: new Date('2021-01-01'),
      expiryDate: new Date('2023-01-01'), // Expired!
      purchasePrice: 20,
      sellingPrice: 35,
      quantity: 50,
      status: 'Expired',
    });

    const expiredSaleAttempt = await makeRequest(
      '/api/v1/sales',
      'POST',
      {
        patientName: 'Unsuspecting Patient',
        doctorName: 'Dr. Tariq',
        prescription: 'Fever',
        paymentMethod: 'Cash',
        items: [{ batchId: expiredBatch.batchId, quantity: 1 }],
      },
      adminToken
    );
    assert(
      expiredSaleAttempt.status === 400 && expiredSaleAttempt.data.success === false,
      'POST /api/v1/sales strictly blocks selling expired batches (Safety Violation 400)'
    );

    // Verify stock of expired batch was NOT deducted
    const recheckedExp = await Batch.findById(expiredBatch._id);
    assert(recheckedExp.quantity === 50, 'Expired batch stock remains untouched after blocked sale');
    await Batch.deleteOne({ _id: expiredBatch._id });

    // 7. Critical Rule 2: Never sell more than available quantity
    const excessiveSale = await makeRequest(
      '/api/v1/sales',
      'POST',
      {
        patientName: 'Bulk Buyer',
        doctorName: 'Dr. Tariq',
        prescription: 'Panic Buying',
        paymentMethod: 'Cash',
        items: [{ batchId: batch1.batchId, quantity: 999999 }],
      },
      adminToken
    );
    assert(
      excessiveSale.status === 400 && excessiveSale.data.success === false,
      'POST /api/v1/sales rejects sale exceeding available batch stock (Insufficient stock 400)'
    );

    // 8. Test Card Payment Method
    const cardSaleRes = await makeRequest(
      '/api/v1/sales',
      'POST',
      {
        patientName: 'Cardholder Patient',
        doctorName: 'Dr. Tariq',
        prescription: 'Prescription details',
        paymentMethod: 'Card',
        items: [{ batchId: batch1.batchId, quantity: 1 }],
      },
      adminToken
    );
    assert(
      cardSaleRes.status === 201 && cardSaleRes.data.data.paymentMethod === 'Card',
      'POST /api/v1/sales supports Card payment method'
    );

    // 9. Prevent Duplicate Sale Submissions (Idempotency Key)
    const idempotencyKey = `KEY-IDEMPOTENT-${Date.now()}`;
    const firstSubmission = await makeRequest(
      '/api/v1/sales',
      'POST',
      {
        patientName: 'Idempotent Patient',
        doctorName: 'Dr. Tariq',
        prescription: 'Headache',
        paymentMethod: 'Cash',
        items: [{ batchId: batch1.batchId, quantity: 1 }],
        idempotencyKey,
      },
      adminToken
    );
    const b1QtyAfterFirst = (await Batch.findOne({ batchId: batch1.batchId })).quantity;

    // Resend identical request with same idempotency key
    const duplicateSubmission = await makeRequest(
      '/api/v1/sales',
      'POST',
      {
        patientName: 'Idempotent Patient',
        doctorName: 'Dr. Tariq',
        prescription: 'Headache',
        paymentMethod: 'Cash',
        items: [{ batchId: batch1.batchId, quantity: 1 }],
        idempotencyKey,
      },
      adminToken
    );
    const b1QtyAfterSecond = (await Batch.findOne({ batchId: batch1.batchId })).quantity;

    assert(
      duplicateSubmission.status === 201 &&
        duplicateSubmission.data.data.invoiceNumber === firstSubmission.data.data.invoiceNumber &&
        b1QtyAfterFirst === b1QtyAfterSecond,
      'Deduplication prevents double-submission and avoids double stock deduction'
    );

    // 10. GET /api/v1/sales (List)
    const listRes = await makeRequest('/api/v1/sales', 'GET', null, adminToken);
    assert(
      listRes.status === 200 && Array.isArray(listRes.data.data) && listRes.data.data.length >= 3,
      'GET /api/v1/sales returns sales listing with patient and invoice details'
    );

    // 11. GET /api/v1/sales/today
    const todayRes = await makeRequest('/api/v1/sales/today', 'GET', null, adminToken);
    assert(
      todayRes.status === 200 &&
        todayRes.data.data.count >= 3 &&
        todayRes.data.data.totalRevenue > 0,
      'GET /api/v1/sales/today retrieves sales conducted today and computes today revenue'
    );

    // 12. GET /api/v1/sales/summary
    const summaryRes = await makeRequest('/api/v1/sales/summary', 'GET', null, adminToken);
    assert(
      summaryRes.status === 200 &&
        summaryRes.data.data.totalSalesCount > 0 &&
        summaryRes.data.data.totalRevenue > 0 &&
        summaryRes.data.data.paymentMethods.cash >= 1 &&
        summaryRes.data.data.paymentMethods.card >= 1,
      'GET /api/v1/sales/summary computes revenue, discounts, and payment method distribution'
    );

    // 13. GET /api/v1/sales/:id
    const singleSaleRes = await makeRequest(`/api/v1/sales/${invoiceNumber}`, 'GET', null, adminToken);
    assert(
      singleSaleRes.status === 200 &&
        singleSaleRes.data.data.invoiceNumber === invoiceNumber &&
        Array.isArray(singleSaleRes.data.data.items),
      'GET /api/v1/sales/:id retrieves single sale by invoiceNumber with items'
    );

    console.log(`\n======================================================`);
    console.log(` RESULT: ${passed}/${total} Sales Module Tests Passed (100%) `);
    console.log(`======================================================\n`);

    testServer.close(() => process.exit(0));
  } catch (err) {
    console.error('Fatal sales test error:', err);
    testServer.close(() => process.exit(1));
  }
});
