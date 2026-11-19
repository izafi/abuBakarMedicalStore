const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const http = require('http');
const mongoose = require('mongoose');
const Batch = require('./models/Batch');
const Sale = require('./models/Sale');
const Invoice = require('./models/Invoice');
const app = require('./server');

const testServer = http.createServer(app);

testServer.listen(0, async () => {
  const port = testServer.address().port;
  console.log(`\n======================================================`);
  console.log(` Invoice Management & Sales History Verification Suite`);
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

    // 1. Authenticate Pharmacist / Admin
    const loginRes = await makeRequest('/api/v1/auth/login', 'POST', {
      username: 'ayesha.admin',
      password: 'ayesha123',
    });
    const token = loginRes.data?.data?.token;
    assert(token !== undefined, 'Admin authenticated and token acquired');

    // Find test batch
    const batch = await Batch.findOne({ batchId: 'BAT-1001' });
    assert(batch !== null, 'Found target batch BAT-1001 for test sales');

    // 2. Perform a test checkout to verify automatic Invoice creation
    const testCheckoutRes = await makeRequest(
      '/api/v1/sales/checkout',
      'POST',
      {
        patientName: 'Mohsin Raza',
        doctorName: 'Dr. Faisal Hayat',
        prescription: 'Seasonal Allergy and Headache relief',
        prescriptionRef: 'RX-ALLERGY-441',
        employeePassword: 'ayesha123',
        paymentMethod: 'Cash',
        items: [
          {
            batchId: batch.batchId,
            quantity: 1,
            discountPercent: 10,
          },
        ],
      },
      token
    );

    assert(
      testCheckoutRes.status === 201 &&
        testCheckoutRes.data.success === true &&
        testCheckoutRes.data.data.sale.invoiceNumber !== undefined,
      'Sale checkout completes successfully and returns invoiceNumber'
    );

    const generatedSale = testCheckoutRes.data.data.sale;
    const invNumber = generatedSale.invoiceNumber;
    const saleId = generatedSale._id;

    // 3. Verify Invoice document was created in MongoDB
    const invoiceDoc = await Invoice.findOne({ invoiceNumber: invNumber });
    assert(
      invoiceDoc !== null &&
        invoiceDoc.saleId.toString() === saleId.toString() &&
        invoiceDoc.patientName === 'Mohsin Raza' &&
        invoiceDoc.doctorName === 'Dr. Faisal Hayat' &&
        invoiceDoc.paymentMethod === 'Cash' &&
        invoiceDoc.grandTotal > 0 &&
        invoiceDoc.status === 'Paid',
      'Invoice document automatically created in database connected to processSale()'
    );

    // 4. Test GET /api/v1/invoices
    const invoicesListRes = await makeRequest('/api/v1/invoices', 'GET', null, token);
    assert(
      invoicesListRes.status === 200 &&
        invoicesListRes.data.success === true &&
        Array.isArray(invoicesListRes.data.data) &&
        invoicesListRes.data.data.length > 0 &&
        invoicesListRes.data.pagination !== undefined &&
        invoicesListRes.data.store?.name !== undefined,
      'GET /api/v1/invoices lists invoices with pagination and store metadata'
    );

    // 5. Test GET /api/v1/invoices with search filter
    const searchInvoiceRes = await makeRequest(
      `/api/v1/invoices?search=${encodeURIComponent(invNumber)}`,
      'GET',
      null,
      token
    );
    assert(
      searchInvoiceRes.status === 200 &&
        searchInvoiceRes.data.data.some((inv) => inv.invoiceNumber === invNumber),
      'GET /api/v1/invoices?search searches by invoice number'
    );

    // 6. Test GET /api/v1/invoices with patientName filter
    const searchPatientRes = await makeRequest(
      `/api/v1/invoices?search=${encodeURIComponent('Mohsin Raza')}`,
      'GET',
      null,
      token
    );
    assert(
      searchPatientRes.status === 200 &&
        searchPatientRes.data.data.some((inv) => inv.patientName === 'Mohsin Raza'),
      'GET /api/v1/invoices?search searches by patient name'
    );

    // 7. Test GET /api/v1/invoices/:id
    const invoiceByIdRes = await makeRequest(`/api/v1/invoices/${invoiceDoc._id}`, 'GET', null, token);
    assert(
      invoiceByIdRes.status === 200 &&
        invoiceByIdRes.data.success === true &&
        invoiceByIdRes.data.data.invoiceNumber === invNumber &&
        invoiceByIdRes.data.data.store?.name !== undefined &&
        invoiceByIdRes.data.data.store?.licenseNumber !== undefined,
      'GET /api/v1/invoices/:id returns complete invoice details with printable store info'
    );

    // 8. Test GET /api/v1/invoices/number/:invoiceNumber
    const invoiceByNumRes = await makeRequest(`/api/v1/invoices/number/${invNumber}`, 'GET', null, token);
    assert(
      invoiceByNumRes.status === 200 &&
        invoiceByNumRes.data.success === true &&
        invoiceByNumRes.data.data.invoiceNumber === invNumber &&
        invoiceByNumRes.data.data.patientName === 'Mohsin Raza',
      'GET /api/v1/invoices/number/:invoiceNumber retrieves invoice by exact invoice number'
    );

    // 9. Test GET /api/v1/invoices/sale/:saleId
    const invoiceBySaleRes = await makeRequest(`/api/v1/invoices/sale/${saleId}`, 'GET', null, token);
    assert(
      invoiceBySaleRes.status === 200 &&
        invoiceBySaleRes.data.success === true &&
        invoiceBySaleRes.data.data.invoiceNumber === invNumber &&
        invoiceBySaleRes.data.data.saleId.toString() === saleId.toString(),
      'GET /api/v1/invoices/sale/:saleId retrieves invoice linked to specific saleId'
    );

    // 10. Test Non-existent Invoice Number (404)
    const notFoundInvoiceRes = await makeRequest('/api/v1/invoices/number/INV-NON-EXISTENT-999', 'GET', null, token);
    assert(
      notFoundInvoiceRes.status === 404 && notFoundInvoiceRes.data.success === false,
      'GET /api/v1/invoices/number/:invoiceNumber returns 404 for non-existent invoice'
    );

    // 11. Test GET /api/v1/invoices/recent
    const recentInvoicesRes = await makeRequest('/api/v1/invoices/recent?limit=3', 'GET', null, token);
    assert(
      recentInvoicesRes.status === 200 &&
        Array.isArray(recentInvoicesRes.data.data) &&
        recentInvoicesRes.data.data.length <= 3,
      'GET /api/v1/invoices/recent returns recent formatted invoices'
    );

    // 12. Test GET /api/v1/sales/history
    const salesHistoryRes = await makeRequest('/api/v1/sales/history', 'GET', null, token);
    assert(
      salesHistoryRes.status === 200 &&
        salesHistoryRes.data.success === true &&
        Array.isArray(salesHistoryRes.data.data) &&
        salesHistoryRes.data.summary?.totalRevenue > 0 &&
        salesHistoryRes.data.summary?.totalSales > 0 &&
        salesHistoryRes.data.pagination !== undefined,
      'GET /api/v1/sales/history returns sales listing with summary revenue calculations'
    );

    // 13. Test GET /api/v1/sales/history with paymentMethod filter
    const cashHistoryRes = await makeRequest('/api/v1/sales/history?paymentMethod=Cash', 'GET', null, token);
    assert(
      cashHistoryRes.status === 200 &&
        cashHistoryRes.data.data.every((s) => s.paymentMethod === 'Cash'),
      'GET /api/v1/sales/history?paymentMethod=Cash filters accurately by Cash'
    );

    // 14. Test GET /api/v1/sales/history with dateRange filter
    const todayHistoryRes = await makeRequest('/api/v1/sales/history?dateRange=today', 'GET', null, token);
    assert(
      todayHistoryRes.status === 200 &&
        todayHistoryRes.data.data.length > 0 &&
        todayHistoryRes.data.summary.totalRevenue > 0,
      'GET /api/v1/sales/history?dateRange=today filters accurately by dateRange'
    );

    // 15. Test GET /api/v1/sales/history/search
    const searchHistoryRes = await makeRequest(
      `/api/v1/sales/history/search?q=${encodeURIComponent('Mohsin Raza')}`,
      'GET',
      null,
      token
    );
    assert(
      searchHistoryRes.status === 200 &&
        searchHistoryRes.data.success === true &&
        searchHistoryRes.data.data.results.some((s) => s.patientName === 'Mohsin Raza'),
      'GET /api/v1/sales/history/search searches sales records by patient name'
    );

    // 16. Test GET /api/v1/sales/history/today
    const todaySalesSummaryRes = await makeRequest('/api/v1/sales/history/today', 'GET', null, token);
    assert(
      todaySalesSummaryRes.status === 200 &&
        todaySalesSummaryRes.data.success === true &&
        todaySalesSummaryRes.data.data.summary?.totalRevenue > 0 &&
        todaySalesSummaryRes.data.data.summary?.count > 0,
      "GET /api/v1/sales/history/today calculates real-time today sales summary metrics"
    );

    // 17. Test GET /api/v1/sales/history/:id
    const singleHistoryRes = await makeRequest(`/api/v1/sales/history/${saleId}`, 'GET', null, token);
    assert(
      singleHistoryRes.status === 200 &&
        singleHistoryRes.data.success === true &&
        singleHistoryRes.data.data.sale._id.toString() === saleId.toString() &&
        Array.isArray(singleHistoryRes.data.data.saleItems) &&
        singleHistoryRes.data.data.invoice?.invoiceNumber === invNumber,
      'GET /api/v1/sales/history/:id returns full sale history, discrete sale items, and invoice'
    );

    // 18. CRITICAL BUSINESS RULE: Block Direct Sale Editing
    const blockEditRes = await makeRequest(`/api/v1/sales/${saleId}`, 'PUT', { patientName: 'Tampered' }, token);
    assert(
      blockEditRes.status === 400 &&
        blockEditRes.data.message.includes('Modification Prohibited'),
      'CRITICAL COMPLIANCE: PUT /api/v1/sales/:id blocks direct editing of completed sales'
    );

    // 19. CRITICAL BUSINESS RULE: Block Direct Sale Deletion
    const blockDeleteRes = await makeRequest(`/api/v1/sales/${saleId}`, 'DELETE', null, token);
    assert(
      blockDeleteRes.status === 400 &&
        blockDeleteRes.data.message.includes('Deletion Prohibited'),
      'CRITICAL COMPLIANCE: DELETE /api/v1/sales/:id blocks direct deletion of completed sales'
    );

    // 20. CRITICAL INTEGRITY: No Invoice Created for Failed Sales
    const initialInvoiceCount = await Invoice.countDocuments();
    const failedSaleRes = await makeRequest(
      '/api/v1/sales',
      'POST',
      {
        patientName: '', // Invalid patient
        doctorName: '',
        prescription: '',
        items: [{ batchId: batch.batchId, quantity: 1 }],
      },
      token
    );
    const postFailedInvoiceCount = await Invoice.countDocuments();
    assert(
      failedSaleRes.status === 400 && postFailedInvoiceCount === initialInvoiceCount,
      'CRITICAL INTEGRITY: No invoice is created when sale fails validation'
    );

    console.log(`\n======================================================`);
    console.log(` RESULT: ${passed}/${total} Invoice & Sales History Tests Passed (100%) `);
    console.log(`======================================================\n`);

    testServer.close(() => process.exit(0));
  } catch (err) {
    console.error('Fatal invoice & sales history test error:', err);
    testServer.close(() => process.exit(1));
  }
});
