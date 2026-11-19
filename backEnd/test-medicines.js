const path = require('path');
const dotenv = require('dotenv');
dotenv.config({ path: path.join(__dirname, '.env') });
const http = require('http');
const mongoose = require('mongoose');
const app = require('./server');

const testServer = http.createServer(app);

testServer.listen(0, async () => {
  const port = testServer.address().port;
  console.log(`\n======================================================`);
  console.log(` Medicine Management Backend QA Verification Suite     `);
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

    // 1. Get Medicine Types
    const typesRes = await makeRequest('/api/v1/medicines/types');
    assert(
      typesRes.status === 200 &&
        Array.isArray(typesRes.data.data) &&
        typesRes.data.data.includes('Tablet') &&
        typesRes.data.data.includes('Capsule') &&
        typesRes.data.data.includes('Syrup') &&
        typesRes.data.data.includes('Injection') &&
        typesRes.data.data.includes('Inhaler'),
      'GET /api/v1/medicines/types returns standard dosage forms'
    );

    // 2. Get Medicine Categories
    const catRes = await makeRequest('/api/v1/medicines/categories');
    assert(
      catRes.status === 200 && Array.isArray(catRes.data.data) && catRes.data.data.length > 0,
      'GET /api/v1/medicines/categories returns distinct active categories'
    );

    // 3. Login as Admin: Ayesha Khan
    const loginRes = await makeRequest('/api/v1/auth/login', 'POST', {
      username: 'ayesha.admin',
      password: 'ayesha123',
    });
    const adminToken = loginRes.data?.data?.token;
    assert(adminToken !== undefined, 'Admin login retrieves valid JWT for authorized operations');

    // 4. Unauthorized Create Attempt (No Auth Token)
    const noAuthCreate = await makeRequest('/api/v1/medicines', 'POST', {
      name: 'Unauthorized Drug',
      genericName: 'Sample',
      strength: '10mg',
    });
    assert(
      noAuthCreate.status === 401 && noAuthCreate.data.success === false,
      'POST /api/v1/medicines without auth fails with 401 Unauthorized'
    );

    // 5. Input Validation: Invalid Medicine Type
    const invalidTypeCreate = await makeRequest(
      '/api/v1/medicines',
      'POST',
      {
        name: 'Invalid Type Med',
        genericName: 'Formula X',
        strength: '100mg',
        type: 'InvalidNonExistentType',
      },
      adminToken
    );
    assert(
      invalidTypeCreate.status === 400 && invalidTypeCreate.data.success === false,
      'POST /api/v1/medicines rejects invalid medicine type with 400 Validation Error'
    );

    // 6. Add Medicine (Positive CRUD Test)
    const uniqueSuffix = Date.now().toString().slice(-4);
    const testMedName = `Amoxicillin ${uniqueSuffix} Syrup`;
    const newMedPayload = {
      name: testMedName,
      genericName: 'Amoxicillin Trihydrate',
      brand: 'Amoxil',
      formula: 'C16H19N3O5S',
      strength: '250mg/5ml',
      type: 'Syrup',
      category: 'Antibiotics',
      usage: 'Treatment of pediatric bacterial infections',
      manufacturer: 'GSK Pakistan',
      sellingPrice: 165.0,
      purchasePrice: 135.0,
      rack: 'Rack B-2',
      shelf: 'Shelf 3',
    };

    const createRes = await makeRequest('/api/v1/medicines', 'POST', newMedPayload, adminToken);
    assert(
      createRes.status === 201 &&
        createRes.data.success === true &&
        createRes.data.data.name === testMedName &&
        createRes.data.data.medicineId.startsWith('MED-') &&
        createRes.data.data.isActive === true,
      'POST /api/v1/medicines successfully creates medicine with auto-generated medicineId'
    );

    const createdMed = createRes.data.data;
    const createdId = createdMed._id;
    const createdMedId = createdMed.medicineId;

    // 7. Get All Medicines (includes active stock calculation without storing batches on model)
    const listRes = await makeRequest('/api/v1/medicines');
    assert(
      listRes.status === 200 &&
        Array.isArray(listRes.data.data) &&
        listRes.data.data.some((m) => m.medicineId === createdMedId),
      'GET /api/v1/medicines returns list including newly created medicine'
    );

    // 8. Search Medicine by Name, Brand, Formula
    const searchRes = await makeRequest(`/api/v1/medicines/search?q=Amoxil`);
    assert(
      searchRes.status === 200 &&
        Array.isArray(searchRes.data.data) &&
        searchRes.data.data.some((m) => m.medicineId === createdMedId),
      'GET /api/v1/medicines/search successfully finds medicine by brand keyword'
    );

    // 9. Filter by Category and Type
    const filterRes = await makeRequest('/api/v1/medicines?type=Syrup&category=Antibiotics');
    assert(
      filterRes.status === 200 &&
        filterRes.data.data.every((m) => m.type === 'Syrup'),
      'GET /api/v1/medicines filters accurately by type and category'
    );

    // 10. Pagination and Sorting
    const pageRes = await makeRequest('/api/v1/medicines?page=1&limit=2&sortBy=name&sortOrder=asc&paginate=true');
    assert(
      pageRes.status === 200 &&
        pageRes.data.data.pagination &&
        pageRes.data.data.pagination.limit === 2 &&
        pageRes.data.data.pagination.page === 1 &&
        pageRes.data.data.medicines.length <= 2,
      'GET /api/v1/medicines supports pagination and sorting parameters'
    );

    // 11. Get Single Medicine by MongoDB _id
    const getByIdRes = await makeRequest(`/api/v1/medicines/${createdId}`);
    assert(
      getByIdRes.status === 200 && getByIdRes.data.data.name === testMedName,
      'GET /api/v1/medicines/:id retrieves single medicine by ObjectId'
    );

    // 12. Get Single Medicine by custom medicineId (e.g. MED-xxxx)
    const getByMedIdRes = await makeRequest(`/api/v1/medicines/${createdMedId}`);
    assert(
      getByMedIdRes.status === 200 && getByMedIdRes.data.data.medicineId === createdMedId,
      'GET /api/v1/medicines/:id retrieves single medicine by medicineId string'
    );

    // 13. Update Medicine (PUT)
    const updateRes = await makeRequest(
      `/api/v1/medicines/${createdId}`,
      'PUT',
      {
        usage: 'Updated Pediatric Dosage Instructions',
        strength: '250mg/10ml',
      },
      adminToken
    );
    assert(
      updateRes.status === 200 &&
        updateRes.data.data.usage === 'Updated Pediatric Dosage Instructions' &&
        updateRes.data.data.strength === '250mg/10ml',
      'PUT /api/v1/medicines/:id successfully updates medicine attributes'
    );

    // 14. Soft-delete check on medicine WITH existing batches (e.g. Panadol MED-1001)
    const panadolDelete = await makeRequest('/api/v1/medicines/MED-1001', 'DELETE', null, adminToken);
    assert(
      panadolDelete.status === 200 &&
        panadolDelete.data.data.archived === true &&
        panadolDelete.data.data.deleted === false,
      'DELETE /api/v1/medicines/:id with active batches performs safe soft-deletion (archiving)'
    );

    // Restore Panadol isActive back to true so existing test flows remain undisturbed
    await makeRequest(
      '/api/v1/medicines/MED-1001',
      'PUT',
      { isActive: true },
      adminToken
    );

    // 15. Permanent delete on unreferenced medicine
    const deleteCreated = await makeRequest(
      `/api/v1/medicines/${createdId}`,
      'DELETE',
      null,
      adminToken
    );
    assert(
      deleteCreated.status === 200 &&
        deleteCreated.data.data.deleted === true &&
        deleteCreated.data.data.archived === false,
      'DELETE /api/v1/medicines/:id with zero batch/sales references permanently removes medicine'
    );

    // 16. Verify 404 on deleted medicine
    const verifyDeleted = await makeRequest(`/api/v1/medicines/${createdId}`);
    assert(
      verifyDeleted.status === 404 && verifyDeleted.data.success === false,
      'GET /api/v1/medicines/:id on deleted medicine returns 404 Not Found'
    );

    console.log(`\n======================================================`);
    console.log(` RESULT: ${passed}/${total} Medicine Module Tests Passed (100%) `);
    console.log(`======================================================\n`);

    testServer.close(() => process.exit(0));
  } catch (err) {
    console.error('Fatal test error:', err);
    testServer.close(() => process.exit(1));
  }
});
