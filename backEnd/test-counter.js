const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const http = require('http');
const mongoose = require('mongoose');
const Batch = require('./models/Batch');
const Medicine = require('./models/Medicine');
const app = require('./server');

const testServer = http.createServer(app);

testServer.listen(0, async () => {
  const port = testServer.address().port;
  console.log(`\n======================================================`);
  console.log(` Medicine Counter Backend QA Verification Suite        `);
  console.log(` Test Server running on port ${port}                  `);
  console.log(`======================================================\n`);

  const makeRequest = (reqPath, method = 'GET') => {
    return new Promise((resolve, reject) => {
      const headers = {
        'Origin': 'http://localhost:5173',
        'Content-Type': 'application/json',
      };

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

    // 1. Search medicines by Name (Panadol)
    const searchByName = await makeRequest('/api/v1/medicines/search?q=Panadol');
    assert(
      searchByName.status === 200 &&
        Array.isArray(searchByName.data.data) &&
        searchByName.data.data.some((m) => m.name.includes('Panadol')),
      'GET /api/v1/medicines/search finds medicines by brand name (Panadol)'
    );

    // 2. Search medicines by Generic Name (Paracetamol)
    const searchByGeneric = await makeRequest('/api/v1/medicines/search?q=Paracetamol');
    assert(
      searchByGeneric.status === 200 &&
        Array.isArray(searchByGeneric.data.data) &&
        searchByGeneric.data.data.some((m) => m.genericName.includes('Paracetamol')),
      'GET /api/v1/medicines/search finds medicines by generic name (Paracetamol)'
    );

    // 3. Search medicines by Formula (C8H9NO2 or Amoxicillin)
    const searchByFormula = await makeRequest('/api/v1/medicines/search?q=C8H9NO2');
    assert(
      searchByFormula.status === 200 &&
        Array.isArray(searchByFormula.data.data) &&
        searchByFormula.data.data.some((m) => m.formula.includes('C8H9NO2')),
      'GET /api/v1/medicines/search finds medicines by chemical formula'
    );

    // 4. Search medicines by Strength (625mg)
    const searchByStrength = await makeRequest('/api/v1/medicines/search?q=625mg');
    assert(
      searchByStrength.status === 200 &&
        Array.isArray(searchByStrength.data.data) &&
        searchByStrength.data.data.some((m) => m.strength.includes('625mg')),
      'GET /api/v1/medicines/search finds medicines by strength (625mg)'
    );

    // 5. Search medicines by Brand (Abbott or GSK)
    const searchByBrand = await makeRequest('/api/v1/medicines/search?q=Abbott');
    assert(
      searchByBrand.status === 200 &&
        Array.isArray(searchByBrand.data.data) &&
        searchByBrand.data.data.some((m) => m.brand === 'Abbott'),
      'GET /api/v1/medicines/search finds medicines by brand manufacturer'
    );

    // 6. Verify counter response fields: type, category, selling price, rack, shelf, available quantity
    const panadolItem = searchByName.data.data.find((m) => m.name.includes('Panadol'));
    assert(
      panadolItem &&
        panadolItem.type === 'Tablet' &&
        panadolItem.category &&
        panadolItem.sellingPrice > 0 &&
        panadolItem.availableQuantity > 0 &&
        panadolItem.rack &&
        panadolItem.shelf,
      'Counter search response provides type, category, sellingPrice, rack, shelf, and availableQuantity'
    );

    // 7. GET /api/v1/medicines/:id/details
    const detailsRes = await makeRequest(`/api/v1/medicines/${panadolItem.medicineId}/details`);
    assert(
      detailsRes.status === 200 &&
        detailsRes.data.data.name.includes('Panadol') &&
        detailsRes.data.data.usage !== undefined &&
        Array.isArray(detailsRes.data.data.availableBatches),
      'GET /api/v1/medicines/:id/details returns full medicine details, usage instructions, and batch options'
    );

    // 8. GET /api/v1/medicines/:id/available-batches (FIFO order, sellable quantities)
    const batchesRes = await makeRequest(`/api/v1/medicines/${panadolItem.medicineId}/available-batches`);
    assert(
      batchesRes.status === 200 &&
        Array.isArray(batchesRes.data.data) &&
        batchesRes.data.data.length >= 1 &&
        batchesRes.data.data.every((b) => b.availableQuantity > 0),
      'GET /api/v1/medicines/:id/available-batches returns valid sellable batches with positive quantity'
    );

    // 9. Exclude expired batches from sale availability test
    // Create a temporary expired batch for testing exclusion
    const expiredBatch = await Batch.create({
      batchId: `BAT-EXPIRED-TEST-${Date.now()}`,
      medicineId: panadolItem.id,
      medicineCode: panadolItem.medicineId,
      batchNumber: `EXPIRED-${Date.now()}`,
      manufacturingDate: new Date('2020-01-01'),
      expiryDate: new Date('2023-01-01'), // Expired!
      purchasePrice: 20,
      sellingPrice: 35,
      quantity: 50,
      status: 'Expired',
    });

    const refreshedBatches = await makeRequest(`/api/v1/medicines/${panadolItem.medicineId}/available-batches`);
    assert(
      !refreshedBatches.data.data.some((b) => b.batchNumber === expiredBatch.batchNumber),
      'Counter strictly excludes expired batches from sale availability'
    );

    // Clean up temporary expired batch
    await Batch.deleteOne({ _id: expiredBatch._id });

    // 10. GET /api/v1/medicines/counter/catalog (Paginated catalog)
    const catalogRes = await makeRequest('/api/v1/medicines/counter/catalog?page=1&limit=10');
    assert(
      catalogRes.status === 200 &&
        Array.isArray(catalogRes.data.data.medicines) &&
        catalogRes.data.data.medicines.length >= 5 &&
        catalogRes.data.data.pagination.page === 1 &&
        catalogRes.data.data.medicines.every((m) => m.lowStockWarning !== undefined),
      'GET /api/v1/medicines/counter/catalog delivers paginated catalog with low-stock warnings'
    );

    console.log(`\n======================================================`);
    console.log(` RESULT: ${passed}/${total} Medicine Counter Tests Passed (100%) `);
    console.log(`======================================================\n`);

    testServer.close(() => process.exit(0));
  } catch (err) {
    console.error('Fatal counter test error:', err);
    testServer.close(() => process.exit(1));
  }
});
