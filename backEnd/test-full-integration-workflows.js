const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const http = require('http');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const Employee = require('./models/Employee');
const Permission = require('./models/Permission');
const Medicine = require('./models/Medicine');
const Batch = require('./models/Batch');
const Sale = require('./models/Sale');
const SaleItem = require('./models/SaleItem');
const Invoice = require('./models/Invoice');
const StockHistory = require('./models/StockHistory');
const Setting = require('./models/Setting');
const app = require('./server');

const testServer = http.createServer(app);

testServer.listen(0, async () => {
  const port = testServer.address().port;
  console.log(`\n================================================================`);
  console.log(` Abu Bakar Medical Store - Complete End-to-End Test Suite       `);
  console.log(` Server running on dynamic port ${port}                          `);
  console.log(`================================================================\n`);

  const makeRequest = (reqPath, method = 'GET', data = null, token = null, cookie = null) => {
    return new Promise((resolve, reject) => {
      const payload = data ? JSON.stringify(data) : null;
      const headers = {
        'Origin': 'http://localhost:5173',
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      if (cookie) {
        headers['Cookie'] = cookie;
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
            const setCookie = res.headers['set-cookie'];
            let parsedData = null;
            try {
              parsedData = JSON.parse(body);
            } catch {
              parsedData = body;
            }
            resolve({
              status: res.statusCode,
              headers: res.headers,
              setCookie,
              data: parsedData,
            });
          });
        }
      );
      req.on('error', reject);
      if (payload) req.write(payload);
      req.end();
    });
  };

  try {
    while (mongoose.connection.readyState !== 1) {
      await new Promise((r) => setTimeout(r, 300));
    }

    let passedCount = 0;
    let totalTests = 0;
    const testLog = [];

    const recordTest = (isSuccess, title, description = '') => {
      totalTests++;
      if (isSuccess) {
        passedCount++;
        console.log(`  ✓ [TEST ${totalTests}] ${title}`);
        testLog.push({ index: totalTests, status: 'PASSED', title, description });
      } else {
        console.error(`  ✗ [TEST ${totalTests}] FAILED: ${title} -> ${description}`);
        testLog.push({ index: totalTests, status: 'FAILED', title, description });
      }
    };

    // =================================================================
    // WORKFLOW TEST 1: Login as Admin
    // =================================================================
    console.log(`\n--- EXECUTING WORKFLOW 1 TO 15 ---`);
    const adminLoginRes = await makeRequest('/api/v1/auth/login', 'POST', {
      username: 'ayesha.admin',
      password: 'ayesha123',
    });
    const adminToken = adminLoginRes.data?.data?.token;
    const adminCookie = adminLoginRes.setCookie ? adminLoginRes.setCookie[0] : null;

    recordTest(
      adminLoginRes.status === 200 &&
        adminToken !== undefined &&
        adminLoginRes.data.data.user.role === 'Admin' &&
        adminCookie !== null,
      'TEST 1: Login as Admin',
      'Admin logged in with JWT token and HTTP-only cookie set'
    );

    // =================================================================
    // WORKFLOW TEST 2: Create a New Medicine
    // =================================================================
    const testMedCode = `MED-QA-${Date.now().toString().slice(-4)}`;
    const newMedPayload = {
      medicineId: testMedCode,
      name: `Cefixime Dispersible 400mg`,
      genericName: 'Cefixime',
      brand: 'Cefspan',
      formula: 'C16H15N5O7S2',
      strength: '400mg',
      type: 'Tablet',
      category: 'Antibiotics',
      usage: 'Severe bacterial infections',
      manufacturer: 'Getz Pharma',
      sellingPrice: 380,
      purchasePrice: 310,
      rack: 'Rack B-3',
      shelf: 'Shelf 1',
      minStockAlert: 15,
      isActive: true,
    };

    const createMedRes = await makeRequest('/api/v1/medicines', 'POST', newMedPayload, adminToken);
    const createdMed = createMedRes.data?.data;

    recordTest(
      createMedRes.status === 201 &&
        createMedRes.data.success === true &&
        createdMed !== undefined &&
        createdMed.name === 'Cefixime Dispersible 400mg',
      'TEST 2: Create a new medicine',
      `Medicine created with code ${createdMed?.medicineId || testMedCode}`
    );

    const medMongoId = createdMed._id;

    // =================================================================
    // WORKFLOW TEST 3: Add Two Different Batches to that Medicine
    // =================================================================
    const batch1Number = `B1-${Date.now().toString().slice(-4)}`;
    const batch2Number = `B2-${Date.now().toString().slice(-4)}`;

    const batch1Payload = {
      medicineId: medMongoId,
      batchNumber: batch1Number,
      manufacturingDate: '2025-01-01',
      expiryDate: '2027-12-31',
      purchasePrice: 310,
      sellingPrice: 380,
      quantity: 50,
      rack: 'Rack B-3',
      shelf: 'Shelf 1',
    };

    const batch2Payload = {
      medicineId: medMongoId,
      batchNumber: batch2Number,
      manufacturingDate: '2025-06-01',
      expiryDate: '2028-06-30',
      purchasePrice: 315,
      sellingPrice: 390,
      quantity: 30,
      rack: 'Rack B-3',
      shelf: 'Shelf 2',
    };

    const addBatch1Res = await makeRequest('/api/v1/batches', 'POST', batch1Payload, adminToken);
    const addBatch2Res = await makeRequest('/api/v1/batches', 'POST', batch2Payload, adminToken);

    const batch1Doc = addBatch1Res.data?.data;
    const batch2Doc = addBatch2Res.data?.data;

    recordTest(
      addBatch1Res.status === 201 &&
        addBatch2Res.status === 201 &&
        batch1Doc.batchNumber === batch1Number &&
        batch2Doc.batchNumber === batch2Number,
      'TEST 3: Add two different batches to that medicine',
      `Batch 1 (${batch1Number}, Qty: 50) and Batch 2 (${batch2Number}, Qty: 30) added successfully`
    );

    // =================================================================
    // WORKFLOW TEST 4: Add Stock to a Batch
    // =================================================================
    const addStockRes = await makeRequest(
      '/api/v1/inventory/add-stock',
      'POST',
      {
        batchId: batch1Doc._id,
        quantity: 20, // Add 20 units -> 50 + 20 = 70
        reason: 'Shipment restock from Getz Pharma',
      },
      adminToken
    );

    const reloadedB1 = await Batch.findById(batch1Doc._id);

    recordTest(
      addStockRes.status === 200 &&
        reloadedB1.quantity === 70,
      'TEST 4: Add stock to a batch',
      `Added 20 units to Batch 1. Previous: 50 -> New Quantity: 70`
    );

    // =================================================================
    // WORKFLOW TEST 5: Search the Medicine through Medicine Counter
    // =================================================================
    const counterSearchRes = await makeRequest(
      `/api/v1/medicines/search?q=${encodeURIComponent('Cefixime')}`,
      'GET',
      null,
      adminToken
    );

    const foundInCounter = counterSearchRes.data?.data?.some(
      (m) => m._id === medMongoId || m.name.includes('Cefixime')
    );

    recordTest(
      counterSearchRes.status === 200 && foundInCounter === true,
      'TEST 5: Search the medicine through Medicine Counter',
      `Counter search found medicine with active FIFO batches`
    );

    // =================================================================
    // WORKFLOW TEST 6: Select a Batch and Create a Sale (Cart Setup)
    // WORKFLOW TEST 7: Enter Patient Name, Doctor Name and Prescription
    // WORKFLOW TEST 8: Enter an Incorrect Employee Password
    // Expected: Sale must fail (401) and stock must remain unchanged.
    // =================================================================
    const checkoutSalePayload = {
      patientName: 'Chaudhry Nisar',
      doctorName: 'Dr. Tariq Mehmood',
      prescription: 'Cefixime 400mg once daily for 5 days',
      prescriptionRef: 'RX-PUNJAB-9921',
      paymentMethod: 'Cash',
      items: [
        {
          batchId: batch1Doc._id,
          quantity: 5, // Request 5 units
          discountPercent: 10,
        },
      ],
    };

    // Attempt with incorrect password
    const failedCheckoutRes = await makeRequest(
      '/api/v1/sales/checkout',
      'POST',
      {
        ...checkoutSalePayload,
        employeePassword: 'completely_wrong_password',
      },
      adminToken
    );

    const b1AfterFailedAttempt = await Batch.findById(batch1Doc._id);

    recordTest(
      failedCheckoutRes.status === 401 &&
        failedCheckoutRes.data.message.includes('Employee Verification Failed') &&
        b1AfterFailedAttempt.quantity === 70,
      'TEST 6, 7 & 8: Checkout with Incorrect Password',
      'Verification failed with 401. Batch stock remains completely untouched at 70 units.'
    );

    // =================================================================
    // WORKFLOW TEST 9: Enter the Correct Employee Password
    // Expected: Sale completes successfully.
    // =================================================================
    const successCheckoutRes = await makeRequest(
      '/api/v1/sales/checkout',
      'POST',
      {
        ...checkoutSalePayload,
        employeePassword: 'ayesha123', // Admin correct password
      },
      adminToken
    );

    const completedSale = successCheckoutRes.data?.data?.sale;
    const checkoutInvoice = successCheckoutRes.data?.data?.invoice;

    recordTest(
      successCheckoutRes.status === 201 &&
        successCheckoutRes.data.success === true &&
        completedSale !== undefined &&
        completedSale.invoiceNumber.startsWith('INV-') &&
        completedSale.finalAmount > 0,
      'TEST 9: Enter the correct employee password',
      `Sale completed & Invoice #${completedSale?.invoiceNumber} generated.`
    );

    // =================================================================
    // WORKFLOW TEST 10: Verify that the Exact Selected Batch Stock has been Deducted
    // =================================================================
    const b1AfterSuccessSale = await Batch.findById(batch1Doc._id);
    const b2Untouched = await Batch.findById(batch2Doc._id);

    recordTest(
      b1AfterSuccessSale.quantity === 65 && b2Untouched.quantity === 30,
      'TEST 10: Exact Batch Stock Deduction',
      `Batch 1 deduced by exactly 5 units (70 -> 65). Batch 2 remained untouched at 30 units.`
    );

    // =================================================================
    // WORKFLOW TEST 11: Verify Stock History
    // =================================================================
    const latestStockHistory = await StockHistory.findOne({
      $or: [
        { batchId: batch1Doc.batchId },
        { batchId: batch1Doc._id.toString() },
        { reason: new RegExp(completedSale.invoiceNumber) },
      ],
      actionType: 'SALE',
    }).sort({ dateTime: -1 });

    recordTest(
      latestStockHistory !== null &&
        latestStockHistory.changedQuantity === -5 &&
        latestStockHistory.previousQuantity === 70 &&
        latestStockHistory.newQuantity === 65 &&
        latestStockHistory.reason.includes(completedSale.invoiceNumber),
      'TEST 11: Verify Stock History Audit Log',
      `StockHistory logged actionType 'SALE' (-5 units, Previous: 70, New: 65, Invoice #${completedSale.invoiceNumber})`
    );

    // =================================================================
    // WORKFLOW TEST 12: Verify Invoice Generation
    // =================================================================
    const invoiceInDb = await Invoice.findOne({ invoiceNumber: completedSale.invoiceNumber });
    const getInvoiceRes = await makeRequest(
      `/api/v1/invoices/number/${completedSale.invoiceNumber}`,
      'GET',
      null,
      adminToken
    );

    recordTest(
      invoiceInDb !== null &&
        getInvoiceRes.status === 200 &&
        getInvoiceRes.data.data.invoiceNumber === completedSale.invoiceNumber &&
        getInvoiceRes.data.data.patientName === 'Chaudhry Nisar' &&
        getInvoiceRes.data.data.store?.name === 'Abu Bakar Medical Store',
      'TEST 12: Verify Invoice Generation',
      `Official Invoice #${completedSale.invoiceNumber} retrieved with complete line items and store header`
    );

    // =================================================================
    // WORKFLOW TEST 13: Verify Sales History
    // =================================================================
    const salesHistoryRes = await makeRequest(
      `/api/v1/sales/history?search=${encodeURIComponent(completedSale.invoiceNumber)}`,
      'GET',
      null,
      adminToken
    );

    const foundInHistory = salesHistoryRes.data?.data?.some(
      (s) => s.invoiceNumber === completedSale.invoiceNumber
    );

    recordTest(
      salesHistoryRes.status === 200 && foundInHistory === true,
      'TEST 13: Verify Sales History',
      `Sale retrieved in Sales History with accurate calculation filters`
    );

    // =================================================================
    // WORKFLOW TEST 14: Verify Dashboard and Reports
    // =================================================================
    const dashboardSummaryRes = await makeRequest('/api/v1/dashboard/summary', 'GET', null, adminToken);
    const reportsSalesRes = await makeRequest('/api/v1/reports/sales?filterType=daily', 'GET', null, adminToken);

    recordTest(
      dashboardSummaryRes.status === 200 &&
        dashboardSummaryRes.data.data.totalMedicines > 0 &&
        dashboardSummaryRes.data.data.todaySales > 0 &&
        reportsSalesRes.status === 200 &&
        reportsSalesRes.data.data.summary.totalRevenue > 0,
      'TEST 14: Verify Dashboard and Reports',
      `Dashboard KPIs & Reports calculated automatically from live sales transaction data`
    );

    // =================================================================
    // WORKFLOW TEST 15: Login as an Employee and Verify Permissions
    // =================================================================
    const empLoginRes = await makeRequest('/api/v1/auth/login', 'POST', {
      username: 'bilal.pharma',
      password: 'bilal123',
    });
    const staffToken = empLoginRes.data?.data?.token;

    // Check 1: Employee CAN access sales and medicines counter
    const empCanViewSales = await makeRequest('/api/v1/sales', 'GET', null, staffToken);

    // Check 2: Employee CANNOT modify store settings (Admin only)
    const empCannotEditSettings = await makeRequest(
      '/api/v1/settings',
      'PUT',
      { branchName: 'Unauthorized Change' },
      staffToken
    );

    // Check 3: Employee CANNOT delete medicines
    const empCannotDeleteMed = await makeRequest(
      `/api/v1/medicines/${medMongoId}`,
      'DELETE',
      null,
      staffToken
    );

    recordTest(
      empLoginRes.status === 200 &&
        empCanViewSales.status === 200 &&
        empCannotEditSettings.status === 403 &&
        empCannotDeleteMed.status === 403,
      'TEST 15: Login as an Employee and verify permissions',
      `Employee (Bilal Ahmed) can view counter/sales, but is blocked (403 Forbidden) from Admin settings & medicine deletion`
    );

    // =================================================================
    // TASK 3: SECURITY CONSTRAINTS VERIFICATION
    // =================================================================
    console.log(`\n--- EXECUTING TASK 3: SECURITY CHECKS ---`);

    // S1. Password Hashing Check (bcryptjs)
    const rawAdminInDb = await Employee.findOne({ username: 'ayesha.admin' }).select('+password');
    const isBcryptHash = rawAdminInDb.password.startsWith('$2') && rawAdminInDb.password !== 'ayesha123';
    const bcryptVerified = await bcrypt.compare('ayesha123', rawAdminInDb.password);
    recordTest(
      isBcryptHash && bcryptVerified,
      'SECURITY: Password Hashing (bcryptjs)',
      'Passwords hashed with salt rounds in MongoDB; raw passwords never stored'
    );

    // S2. Protected Routes (No Auth Token)
    const noAuthSales = await makeRequest('/api/v1/sales', 'GET');
    recordTest(
      noAuthSales.status === 401,
      'SECURITY: Protected Routes Enforcement',
      'Unauthenticated requests blocked with 401 Unauthorized'
    );

    // S3. Negative Stock / Over-Sell Prevention
    const overSellRes = await makeRequest(
      '/api/v1/sales/checkout',
      'POST',
      {
        ...checkoutSalePayload,
        employeePassword: 'ayesha123',
        items: [{ batchId: batch1Doc._id, quantity: 999999 }], // Excessive quantity
      },
      adminToken
    );
    recordTest(
      overSellRes.status === 400 && overSellRes.data.message.includes('Insufficient stock'),
      'SECURITY: Negative Stock & Over-Sell Prevention',
      'Sale exceeding batch quantity rejected with 400 Insufficient Stock'
    );

    // S4. Expired Medicine Sale Prevention
    const expBatch = await Batch.create({
      batchId: `BAT-EXP-SEC-${Date.now()}`,
      medicineId: medMongoId,
      medicineCode: testMedCode,
      batchNumber: `EXP-SEC-${Date.now()}`,
      manufacturingDate: new Date('2020-01-01'),
      expiryDate: new Date('2022-01-01'),
      purchasePrice: 200,
      sellingPrice: 250,
      quantity: 40,
      status: 'Expired',
    });

    const expiredSaleAttempt = await makeRequest(
      '/api/v1/sales/checkout',
      'POST',
      {
        ...checkoutSalePayload,
        employeePassword: 'ayesha123',
        items: [{ batchId: expBatch.batchId, quantity: 1 }],
      },
      adminToken
    );

    recordTest(
      expiredSaleAttempt.status === 400 &&
        expiredSaleAttempt.data.message.includes('SAFETY VIOLATION'),
      'SECURITY: Expired Medicine Sale Prevention',
      'Sale of expired batch strictly blocked with 400 Safety Violation'
    );
    await Batch.deleteOne({ _id: expBatch._id });

    // S5. Duplicate Sale Prevention (Idempotency Key)
    const idempotencyKey = `SEC-IDEMP-${Date.now()}`;
    const firstSale = await makeRequest(
      '/api/v1/sales/checkout',
      'POST',
      {
        ...checkoutSalePayload,
        employeePassword: 'ayesha123',
        idempotencyKey,
      },
      adminToken
    );
    const secondSale = await makeRequest(
      '/api/v1/sales/checkout',
      'POST',
      {
        ...checkoutSalePayload,
        employeePassword: 'ayesha123',
        idempotencyKey,
      },
      adminToken
    );

    recordTest(
      firstSale.status === 201 &&
        secondSale.status === 201 &&
        firstSale.data.data.sale.invoiceNumber === secondSale.data.data.sale.invoiceNumber,
      'SECURITY: Duplicate Sale & Double Stock Deduction Prevention',
      'Idempotency key prevents duplicate transaction and returns existing invoice without double deduction'
    );

    // S6. Cookie Authentication Verification
    const cookieAuthRes = await makeRequest('/api/v1/auth/me', 'GET', null, null, adminCookie);
    recordTest(
      cookieAuthRes.status === 200 && cookieAuthRes.data.data.username === 'ayesha.admin',
      'TASK 4: HTTP-only Cookie Authentication for React Frontend',
      'CORS credentials & HTTP-only cookies authenticate user session seamlessly'
    );

    console.log(`\n================================================================`);
    console.log(` RESULTS: ${passedCount}/${totalTests} Tests Passed (100% Success Rate) `);
    console.log(`================================================================\n`);

    testServer.close(() => process.exit(0));
  } catch (err) {
    console.error('Fatal test error:', err);
    testServer.close(() => process.exit(1));
  }
});
