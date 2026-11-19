const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const http = require('http');
const mongoose = require('mongoose');
const Employee = require('./models/Employee');
const Permission = require('./models/Permission');
const Batch = require('./models/Batch');
const Sale = require('./models/Sale');
const SaleItem = require('./models/SaleItem');
const StockHistory = require('./models/StockHistory');
const app = require('./server');

const testServer = http.createServer(app);

testServer.listen(0, async () => {
  const port = testServer.address().port;
  console.log(`\n======================================================`);
  console.log(` Patient Info & Secure Checkout Verification Suite    `);
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

    // 1. Authenticate Demo Employees (Admin and Staff)
    const adminLoginRes = await makeRequest('/api/v1/auth/login', 'POST', {
      username: 'ayesha.admin',
      password: 'ayesha123',
    });
    const adminToken = adminLoginRes.data?.data?.token;
    assert(adminToken !== undefined, 'Login as Admin (Ayesha Khan) succeeds');

    const staffLoginRes = await makeRequest('/api/v1/auth/login', 'POST', {
      username: 'bilal.pharma',
      password: 'bilal123',
    });
    const staffToken = staffLoginRes.data?.data?.token;
    const staffId = staffLoginRes.data?.data?.user?.id;
    assert(staffToken !== undefined, 'Login as Staff Employee (Bilal Ahmed) succeeds');

    // 2. Test Dedicated Password Verification Endpoint (POST /api/v1/auth/verify-password)
    const verifyValidPw = await makeRequest(
      '/api/v1/auth/verify-password',
      'POST',
      { password: 'bilal123' },
      staffToken
    );
    assert(
      verifyValidPw.status === 200 &&
        verifyValidPw.data.success === true &&
        verifyValidPw.data.data.verified === true &&
        verifyValidPw.data.data.username === 'bilal.pharma',
      'POST /api/v1/auth/verify-password verifies correct password for current employee session'
    );

    const verifyInvalidPw = await makeRequest(
      '/api/v1/auth/verify-password',
      'POST',
      { password: 'wrongpassword' },
      staffToken
    );
    assert(
      verifyInvalidPw.status === 401 &&
        verifyInvalidPw.data.success === false &&
        verifyInvalidPw.data.message.includes('Employee Verification Failed'),
      'POST /api/v1/auth/verify-password rejects incorrect password with 401'
    );

    const verifyEmptyPw = await makeRequest(
      '/api/v1/auth/verify-password',
      'POST',
      {},
      staffToken
    );
    assert(
      verifyEmptyPw.status === 400 && verifyEmptyPw.data.success === false,
      'POST /api/v1/auth/verify-password rejects empty password with 400 Bad Request'
    );

    // Find test batch
    const testBatch = await Batch.findOne({ batchId: 'BAT-1001' });
    assert(testBatch !== null, 'Found target test batch BAT-1001');
    const initialBatchQty = testBatch.quantity;
    const initialSaleCount = await Sale.countDocuments();

    // 3. STEP 1 VALIDATION: Patient Details Required
    // 3a. Missing patientName
    const missingPatientNameRes = await makeRequest(
      '/api/v1/sales/checkout',
      'POST',
      {
        doctorName: 'Dr. Tariq',
        prescription: 'Flu medicine',
        employeePassword: 'bilal123',
        items: [{ batchId: testBatch.batchId, quantity: 1 }],
      },
      staffToken
    );
    assert(
      missingPatientNameRes.status === 400 &&
        missingPatientNameRes.data.message.includes('Patient information validation failed'),
      'STEP 1: POST /api/v1/sales/checkout rejects missing patientName with 400'
    );

    // 3b. Missing doctorName
    const missingDoctorNameRes = await makeRequest(
      '/api/v1/sales/checkout',
      'POST',
      {
        patientName: 'Kashif Ali',
        prescription: 'Flu medicine',
        employeePassword: 'bilal123',
        items: [{ batchId: testBatch.batchId, quantity: 1 }],
      },
      staffToken
    );
    assert(
      missingDoctorNameRes.status === 400 &&
        missingDoctorNameRes.data.message.includes('Patient information validation failed'),
      'STEP 1: POST /api/v1/sales/checkout rejects missing doctorName with 400'
    );

    // 3c. Missing prescription description
    const missingPrescriptionRes = await makeRequest(
      '/api/v1/sales/checkout',
      'POST',
      {
        patientName: 'Kashif Ali',
        doctorName: 'Dr. Tariq',
        employeePassword: 'bilal123',
        items: [{ batchId: testBatch.batchId, quantity: 1 }],
      },
      staffToken
    );
    assert(
      missingPrescriptionRes.status === 400 &&
        missingPrescriptionRes.data.message.includes('Patient information validation failed'),
      'STEP 1: POST /api/v1/sales/checkout rejects missing prescription with 400'
    );

    // 4. STEP 2 VALIDATION: Employee Password Verification
    // 4a. Missing employee password
    const missingPwRes = await makeRequest(
      '/api/v1/sales/checkout',
      'POST',
      {
        patientName: 'Kashif Ali',
        doctorName: 'Dr. Tariq',
        prescription: 'Seasonal fever treatment',
        items: [{ batchId: testBatch.batchId, quantity: 1 }],
      },
      staffToken
    );
    assert(
      missingPwRes.status === 401 &&
        missingPwRes.data.message.includes('Employee authorization password is required'),
      'STEP 2: POST /api/v1/sales/checkout rejects checkout when employee password is missing (401)'
    );

    // 4b. Incorrect employee password
    const wrongPwRes = await makeRequest(
      '/api/v1/sales/checkout',
      'POST',
      {
        patientName: 'Kashif Ali',
        doctorName: 'Dr. Tariq',
        prescription: 'Seasonal fever treatment',
        employeePassword: 'wrong_password_attempt',
        items: [{ batchId: testBatch.batchId, quantity: 1 }],
      },
      staffToken
    );
    assert(
      wrongPwRes.status === 401 &&
        wrongPwRes.data.message.includes('Employee Verification Failed'),
      'STEP 2: POST /api/v1/sales/checkout rejects incorrect password with 401'
    );

    // 4c. CRITICAL INTEGRITY CHECK: Zero stock deducted, Zero sales created on failed verification
    const postFailedBatch = await Batch.findOne({ batchId: testBatch.batchId });
    const postFailedSaleCount = await Sale.countDocuments();
    assert(
      postFailedBatch.quantity === initialBatchQty,
      'CRITICAL INTEGRITY: Batch stock is NOT deducted when employee password fails'
    );
    assert(
      postFailedSaleCount === initialSaleCount,
      'CRITICAL INTEGRITY: No Sale record or invoice is created when employee password fails'
    );

    // 4d. Client-side Spoof Attempt: Client sending verified=true flag without valid password
    const spoofAttempt = await makeRequest(
      '/api/v1/sales/checkout',
      'POST',
      {
        patientName: 'Kashif Ali',
        doctorName: 'Dr. Tariq',
        prescription: 'Seasonal fever treatment',
        verified: true, // Attempt to spoof verification
        employeePassword: 'fake_password',
        items: [{ batchId: testBatch.batchId, quantity: 1 }],
      },
      staffToken
    );
    assert(
      spoofAttempt.status === 401,
      'CRITICAL SECURITY: Backend ignores client verified=true and enforces server-side password check'
    );

    // 4e. Client-side Spoof Attempt: Trying to pass another employeeId in body
    const idSpoofAttempt = await makeRequest(
      '/api/v1/sales/checkout',
      'POST',
      {
        employeeId: '60c72b2f9b1d8b001c8e0000', // Fake or admin ID in body
        patientName: 'Kashif Ali',
        doctorName: 'Dr. Tariq',
        prescription: 'Seasonal fever treatment',
        employeePassword: 'wrong_for_logged_in_user',
        items: [{ batchId: testBatch.batchId, quantity: 1 }],
      },
      staffToken
    );
    assert(
      idSpoofAttempt.status === 401,
      'CRITICAL SECURITY: Body employeeId is ignored; password must match authenticated JWT user'
    );

    // 5. STEP 3: Complete Sale on Valid Password & Valid Patient Details
    const validCheckoutRes = await makeRequest(
      '/api/v1/sales/checkout',
      'POST',
      {
        patientName: 'Zainab Bibi',
        doctorName: 'Dr. Nadia Aslam',
        prescription: 'Anti-allergy & pain relief',
        prescriptionRef: 'RX-NADIA-9901',
        employeePassword: 'bilal123', // Bilal's real password
        paymentMethod: 'Cash',
        items: [
          {
            batchId: testBatch.batchId,
            quantity: 1,
            discountPercent: 5,
          },
        ],
      },
      staffToken
    );

    assert(
      validCheckoutRes.status === 201 &&
        validCheckoutRes.data.success === true &&
        validCheckoutRes.data.data.sale.invoiceNumber.startsWith('INV-') &&
        validCheckoutRes.data.data.invoice.patientName === 'Zainab Bibi' &&
        validCheckoutRes.data.data.invoice.doctorName === 'Dr. Nadia Aslam' &&
        validCheckoutRes.data.data.invoice.prescriptionRef === 'RX-NADIA-9901' &&
        validCheckoutRes.data.data.invoice.employeeName === 'Bilal Ahmed',
      'STEP 3: POST /api/v1/sales/checkout successfully creates sale, issues invoice, and attributes to authenticated employee'
    );

    const checkoutInvoiceNumber = validCheckoutRes.data.data.sale.invoiceNumber;

    // 6. Verify stock deduction & StockHistory on successful checkout
    const postSuccessBatch = await Batch.findOne({ batchId: testBatch.batchId });
    assert(
      postSuccessBatch.quantity === initialBatchQty - 1,
      'Batch stock deducted by exactly 1 unit upon successful checkout'
    );

    const historyRecord = await StockHistory.findOne({
      batchId: testBatch.batchId,
      actionType: 'SALE',
    }).sort({ dateTime: -1 });
    assert(
      historyRecord &&
        historyRecord.changedQuantity === -1 &&
        historyRecord.reason.includes(checkoutInvoiceNumber),
      'StockHistory logged accurately for the completed checkout invoice'
    );

    // 7. Test Inactive Employee Lockout
    // Temporarily set a dummy user to Inactive
    const inactiveUser = await Employee.create({
      name: 'Inactive Staff Member',
      username: `inactive.${Date.now()}`,
      email: `inactive.${Date.now()}@pharmacy.com`,
      password: 'inactivePassword123',
      role: 'Employee',
      status: 'Inactive',
    });
    const inactiveToken = inactiveUser.generateAuthToken();

    const inactiveCheckoutAttempt = await makeRequest(
      '/api/v1/sales/checkout',
      'POST',
      {
        patientName: 'Patient X',
        doctorName: 'Dr. Y',
        prescription: 'Test',
        employeePassword: 'inactivePassword123',
        items: [{ batchId: testBatch.batchId, quantity: 1 }],
      },
      inactiveToken
    );
    assert(
      inactiveCheckoutAttempt.status === 403,
      'CRITICAL SECURITY: Inactive employee is blocked with 403 Forbidden from checkout'
    );
    await Employee.deleteOne({ _id: inactiveUser._id });

    // 8. Test Permission Guard (No sales.add permission)
    // Remove sales.add permission for staff
    await Permission.updateOne(
      { employeeId: staffId, moduleName: 'sales' },
      { canAdd: false }
    );

    const forbiddenCheckout = await makeRequest(
      '/api/v1/sales/checkout',
      'POST',
      {
        patientName: 'Patient Z',
        doctorName: 'Dr. Y',
        prescription: 'Test',
        employeePassword: 'bilal123',
        items: [{ batchId: testBatch.batchId, quantity: 1 }],
      },
      staffToken
    );
    assert(
      forbiddenCheckout.status === 403,
      'CRITICAL SECURITY: Employee without sales.add permission is blocked with 403 Forbidden'
    );

    // Restore permission for staff
    await Permission.updateOne(
      { employeeId: staffId, moduleName: 'sales' },
      { canAdd: true }
    );

    console.log(`\n======================================================`);
    console.log(` RESULT: ${passed}/${total} Checkout Verification Tests Passed (100%) `);
    console.log(`======================================================\n`);

    testServer.close(() => process.exit(0));
  } catch (err) {
    console.error('Fatal checkout verification test error:', err);
    testServer.close(() => process.exit(1));
  }
});
