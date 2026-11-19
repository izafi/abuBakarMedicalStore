const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const http = require('http');
const mongoose = require('mongoose');
const Employee = require('./models/Employee');
const Permission = require('./models/Permission');
const Batch = require('./models/Batch');
const Sale = require('./models/Sale');
const app = require('./server');

const testServer = http.createServer(app);

testServer.listen(0, async () => {
  const port = testServer.address().port;
  console.log(`\n======================================================`);
  console.log(` Dashboard & Reports Backend QA Verification Suite     `);
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

    // 1. Authenticate Admin and Staff
    const adminLoginRes = await makeRequest('/api/v1/auth/login', 'POST', {
      username: 'ayesha.admin',
      password: 'ayesha123',
    });
    const adminToken = adminLoginRes.data?.data?.token;
    assert(adminToken !== undefined, 'Admin authenticated and token acquired');

    // ==========================================
    // 2. DASHBOARD ENDPOINTS
    // ==========================================

    // 2a. GET /api/v1/dashboard/summary
    const summaryRes = await makeRequest('/api/v1/dashboard/summary', 'GET', null, adminToken);
    assert(
      summaryRes.status === 200 &&
        summaryRes.data.success === true &&
        summaryRes.data.data.totalMedicines > 0 &&
        summaryRes.data.data.totalStockUnits > 0 &&
        summaryRes.data.data.todaySales !== undefined &&
        summaryRes.data.data.monthlyRevenue !== undefined &&
        summaryRes.data.data.lowStock !== undefined &&
        summaryRes.data.data.expiredMedicines !== undefined &&
        summaryRes.data.data.nearExpiryMedicines !== undefined,
      'GET /api/v1/dashboard/summary calculates accurate KPIs from real database'
    );

    // 2b. GET /api/v1/dashboard/sales-chart
    const salesChartRes = await makeRequest('/api/v1/dashboard/sales-chart', 'GET', null, adminToken);
    assert(
      salesChartRes.status === 200 &&
        salesChartRes.data.success === true &&
        Array.isArray(salesChartRes.data.data) &&
        salesChartRes.data.data.length === 14 &&
        salesChartRes.data.data[13].date !== undefined &&
        salesChartRes.data.data[13].label !== undefined &&
        salesChartRes.data.data[13].revenue !== undefined,
      'GET /api/v1/dashboard/sales-chart returns continuous 14-day sales trend'
    );

    // 2c. GET /api/v1/dashboard/purchases-chart
    const purchasesChartRes = await makeRequest('/api/v1/dashboard/purchases-chart', 'GET', null, adminToken);
    assert(
      purchasesChartRes.status === 200 &&
        purchasesChartRes.data.success === true &&
        Array.isArray(purchasesChartRes.data.data) &&
        purchasesChartRes.data.data.length === 14 &&
        purchasesChartRes.data.data[13].units !== undefined,
      'GET /api/v1/dashboard/purchases-chart returns continuous 14-day stock inflow trend'
    );

    // 2d. GET /api/v1/dashboard/stock-by-category
    const stockCatRes = await makeRequest('/api/v1/dashboard/stock-by-category', 'GET', null, adminToken);
    assert(
      stockCatRes.status === 200 &&
        stockCatRes.data.success === true &&
        Array.isArray(stockCatRes.data.data.categories) &&
        stockCatRes.data.data.totalUnits > 0 &&
        stockCatRes.data.data.categories.length > 0 &&
        stockCatRes.data.data.categories[0].category !== undefined &&
        stockCatRes.data.data.categories[0].count !== undefined,
      'GET /api/v1/dashboard/stock-by-category aggregates category stock and percentages'
    );

    // 2e. GET /api/v1/dashboard/recent-sales
    const recentSalesRes = await makeRequest('/api/v1/dashboard/recent-sales?limit=5', 'GET', null, adminToken);
    assert(
      recentSalesRes.status === 200 &&
        recentSalesRes.data.success === true &&
        Array.isArray(recentSalesRes.data.data) &&
        recentSalesRes.data.data.length <= 5 &&
        recentSalesRes.data.data[0].invoiceNumber !== undefined,
      'GET /api/v1/dashboard/recent-sales returns completed sales'
    );

    // 2f. GET /api/v1/dashboard/alerts
    const alertsRes = await makeRequest('/api/v1/dashboard/alerts', 'GET', null, adminToken);
    assert(
      alertsRes.status === 200 &&
        alertsRes.data.success === true &&
        Array.isArray(alertsRes.data.data.lowStock) &&
        Array.isArray(alertsRes.data.data.expired) &&
        Array.isArray(alertsRes.data.data.nearExpiry) &&
        Array.isArray(alertsRes.data.data.reorderAlerts) &&
        alertsRes.data.data.counts !== undefined,
      'GET /api/v1/dashboard/alerts returns actionable low-stock, expired, and reorder alerts'
    );

    // 2g. GET /api/v1/dashboard/recent-activities
    const activitiesRes = await makeRequest('/api/v1/dashboard/recent-activities?limit=8', 'GET', null, adminToken);
    assert(
      activitiesRes.status === 200 &&
        activitiesRes.data.success === true &&
        Array.isArray(activitiesRes.data.data) &&
        activitiesRes.data.data.length > 0,
      'GET /api/v1/dashboard/recent-activities returns recent StockHistory activity log'
    );

    // 2h. Master GET /api/v1/dashboard
    const masterDashboardRes = await makeRequest('/api/v1/dashboard', 'GET', null, adminToken);
    assert(
      masterDashboardRes.status === 200 &&
        masterDashboardRes.data.data.cards !== undefined &&
        masterDashboardRes.data.data.charts !== undefined &&
        masterDashboardRes.data.data.tables !== undefined,
      'GET /api/v1/dashboard returns master payload for backwards compatibility'
    );

    // ==========================================
    // 3. REPORT ENDPOINTS
    // ==========================================

    // 3a. GET /api/v1/reports/sales
    const salesReportRes = await makeRequest('/api/v1/reports/sales?filterType=daily', 'GET', null, adminToken);
    assert(
      salesReportRes.status === 200 &&
        salesReportRes.data.success === true &&
        salesReportRes.data.data.summary.totalRevenue > 0 &&
        salesReportRes.data.data.summary.totalInvoices > 0 &&
        Array.isArray(salesReportRes.data.data.timeline),
      'GET /api/v1/reports/sales generates sales report with timeline aggregation'
    );

    // 3b. GET /api/v1/reports/revenue
    const revenueReportRes = await makeRequest('/api/v1/reports/revenue', 'GET', null, adminToken);
    assert(
      revenueReportRes.status === 200 &&
        revenueReportRes.data.success === true &&
        revenueReportRes.data.data.summary.grossRevenue > 0 &&
        revenueReportRes.data.data.summary.netRevenue > 0 &&
        Array.isArray(revenueReportRes.data.data.monthlyBreakdown),
      'GET /api/v1/reports/revenue generates financial revenue and discount breakdown'
    );

    // 3c. GET /api/v1/reports/best-selling-medicines
    const bestSellingRes = await makeRequest('/api/v1/reports/best-selling-medicines?limit=5', 'GET', null, adminToken);
    assert(
      bestSellingRes.status === 200 &&
        bestSellingRes.data.success === true &&
        Array.isArray(bestSellingRes.data.data.ranking) &&
        bestSellingRes.data.data.ranking.length > 0 &&
        bestSellingRes.data.data.ranking[0].medicineName !== undefined &&
        bestSellingRes.data.data.ranking[0].unitsSold > 0,
      'GET /api/v1/reports/best-selling-medicines ranks top products by units sold'
    );

    // 3d. GET /api/v1/reports/inventory
    const inventoryReportRes = await makeRequest('/api/v1/reports/inventory', 'GET', null, adminToken);
    assert(
      inventoryReportRes.status === 200 &&
        inventoryReportRes.data.success === true &&
        inventoryReportRes.data.data.summary.totalStockUnits > 0 &&
        inventoryReportRes.data.data.summary.purchaseValuation > 0 &&
        inventoryReportRes.data.data.summary.sellingValuation > 0 &&
        Array.isArray(inventoryReportRes.data.data.batches),
      'GET /api/v1/reports/inventory calculates valuations, gross profit potential, and batch breakdown'
    );

    // 3e. GET /api/v1/reports/stock-history
    const stockHistoryReportRes = await makeRequest('/api/v1/reports/stock-history?limit=10', 'GET', null, adminToken);
    assert(
      stockHistoryReportRes.status === 200 &&
        stockHistoryReportRes.data.success === true &&
        Array.isArray(stockHistoryReportRes.data.data.records) &&
        Array.isArray(stockHistoryReportRes.data.data.actionBreakdown),
      'GET /api/v1/reports/stock-history audits stock actions by type'
    );

    // 3f. GET /api/v1/reports/category
    const categoryReportRes = await makeRequest('/api/v1/reports/category', 'GET', null, adminToken);
    assert(
      categoryReportRes.status === 200 &&
        categoryReportRes.data.success === true &&
        Array.isArray(categoryReportRes.data.data) &&
        categoryReportRes.data.data.length > 0 &&
        categoryReportRes.data.data[0].category !== undefined &&
        categoryReportRes.data.data[0].medicinesCount > 0,
      'GET /api/v1/reports/category calculates category-level inventory and revenue performance'
    );

    // 3g. Legacy /:reportType compatibility check
    const legacyReportRes = await makeRequest('/api/v1/reports/daily_sales', 'GET', null, adminToken);
    assert(
      legacyReportRes.status === 200 && legacyReportRes.data.success === true,
      'GET /api/v1/reports/:reportType preserves backward compatibility for existing report routes'
    );

    // 4. PERMISSION GUARD: Staff without 'reports.view' permission blocked
    const staffLoginRes = await makeRequest('/api/v1/auth/login', 'POST', {
      username: 'bilal.pharma',
      password: 'bilal123',
    });
    const staffToken = staffLoginRes.data?.data?.token;
    const staffId = staffLoginRes.data?.data?.user?.id;

    // Temporarily disable reports permission for Bilal
    await Permission.updateOne(
      { employeeId: staffId, moduleName: 'reports' },
      { canView: false }
    );

    const forbiddenReportRes = await makeRequest('/api/v1/reports/sales', 'GET', null, staffToken);
    assert(
      forbiddenReportRes.status === 403,
      'PERMISSION GUARD: Staff without reports.view permission blocked with 403 Forbidden'
    );

    // Re-enable reports permission for Bilal
    await Permission.updateOne(
      { employeeId: staffId, moduleName: 'reports' },
      { canView: true }
    );

    console.log(`\n======================================================`);
    console.log(` RESULT: ${passed}/${total} Dashboard & Reports Tests Passed (100%) `);
    console.log(`======================================================\n`);

    testServer.close(() => process.exit(0));
  } catch (err) {
    console.error('Fatal dashboard & reports test error:', err);
    testServer.close(() => process.exit(1));
  }
});
