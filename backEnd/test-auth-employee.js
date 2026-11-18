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
  console.log(` Employee & Auth Module Comprehensive QA Verification `);
  console.log(` Test Server running on port ${port}                  `);
  console.log(`======================================================\n`);

  let cookieJar = {};

  const makeRequest = (path, method = 'GET', data = null, token = null, cookie = null) => {
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
          path,
          method,
          headers,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            let setCookie = null;
            if (res.headers['set-cookie']) {
              setCookie = res.headers['set-cookie'][0].split(';')[0];
            }
            try {
              resolve({
                status: res.statusCode,
                headers: res.headers,
                setCookie,
                data: JSON.parse(body),
              });
            } catch {
              resolve({
                status: res.statusCode,
                headers: res.headers,
                setCookie,
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

    // 1. Check Demo Accounts endpoint
    const demoRes = await makeRequest('/api/v1/auth/demo-accounts');
    assert(
      demoRes.status === 200 && demoRes.data.data.length >= 3,
      'GET /api/v1/auth/demo-accounts returns demo employees',
      `Found ${demoRes.data.data?.length}`
    );

    // 2. Login as Admin: Ayesha Khan
    const ayeshaLogin = await makeRequest('/api/v1/auth/login', 'POST', {
      username: 'ayesha.admin',
      password: 'ayesha123',
    });
    assert(
      ayeshaLogin.status === 200 &&
        ayeshaLogin.data.data.token &&
        ayeshaLogin.data.data.user.role === 'Admin' &&
        !ayeshaLogin.data.data.user.password,
      'POST /api/v1/auth/login - Admin (Ayesha Khan) success & password omitted',
      JSON.stringify(ayeshaLogin.data)
    );
    const adminToken = ayeshaLogin.data.data.token;
    const adminCookie = ayeshaLogin.setCookie;
    assert(
      adminCookie && adminCookie.includes('token='),
      'Login sets HTTP-only token cookie for session'
    );

    // 3. Login as Employee: Bilal Ahmed
    const bilalLogin = await makeRequest('/api/v1/auth/login', 'POST', {
      username: 'bilal.pharma',
      password: 'bilal123',
    });
    assert(
      bilalLogin.status === 200 &&
        bilalLogin.data.data.user.role === 'Employee' &&
        bilalLogin.data.data.user.permissions.sales.view === true,
      'POST /api/v1/auth/login - Employee (Bilal Ahmed) success with permissions matrix'
    );
    const employeeToken = bilalLogin.data.data.token;

    // 4. Login with invalid password
    const badLogin = await makeRequest('/api/v1/auth/login', 'POST', {
      username: 'ayesha.admin',
      password: 'wrongpassword',
    });
    assert(
      badLogin.status === 401 && badLogin.data.success === false,
      'POST /api/v1/auth/login - Rejects incorrect password with 401'
    );

    // 5. GET /api/v1/auth/me for authenticated user
    const meRes = await makeRequest('/api/v1/auth/me', 'GET', null, adminToken);
    assert(
      meRes.status === 200 &&
        meRes.data.data.username === 'ayesha.admin' &&
        meRes.data.data.permissions.medicines.view === true,
      'GET /api/v1/auth/me - Retrieves admin profile and permissions'
    );

    // 6. POST /api/v1/auth/verify-password - Positive case (Checkout verification)
    const verifyPos = await makeRequest(
      '/api/v1/auth/verify-password',
      'POST',
      { password: 'ayesha123' },
      adminToken
    );
    assert(
      verifyPos.status === 200 && verifyPos.data.data.verified === true,
      'POST /api/v1/auth/verify-password - Successfully verifies authenticated employee password'
    );

    // 7. POST /api/v1/auth/verify-password - Negative case
    const verifyNeg = await makeRequest(
      '/api/v1/auth/verify-password',
      'POST',
      { password: 'wrongpassword' },
      adminToken
    );
    assert(
      verifyNeg.status === 401 && verifyNeg.data.success === false,
      'POST /api/v1/auth/verify-password - Rejects invalid password for checkout verification'
    );

    // 8. GET /api/v1/employees as Admin
    const empListAdmin = await makeRequest('/api/v1/employees', 'GET', null, adminToken);
    assert(
      empListAdmin.status === 200 &&
        Array.isArray(empListAdmin.data.data) &&
        empListAdmin.data.data.length >= 3,
      'GET /api/v1/employees - Admin can view full employees list'
    );

    // 9. GET /api/v1/employees as Employee without employee view permission (Access Denied)
    const empListEmp = await makeRequest('/api/v1/employees', 'GET', null, employeeToken);
    assert(
      empListEmp.status === 403 && empListEmp.data.success === false,
      'GET /api/v1/employees - Standard employee denied with 403 (Access Denied)'
    );

    // 10. POST /api/v1/employees as Employee (Forbidden)
    const createByEmp = await makeRequest(
      '/api/v1/employees',
      'POST',
      {
        name: 'Hacker User',
        username: 'hacker',
        email: 'hacker@store.pk',
        password: 'pass',
      },
      employeeToken
    );
    assert(
      createByEmp.status === 403 && createByEmp.data.success === false,
      'POST /api/v1/employees - Non-admin cannot manage/create employees (403 Forbidden)'
    );

    // 11. POST /api/v1/employees as Admin (Create new test employee)
    const testUsername = `test.emp.${Date.now()}`;
    const testEmail = `${testUsername}@store.pk`;
    const createByAdmin = await makeRequest(
      '/api/v1/employees',
      'POST',
      {
        name: 'Test Pharmacist',
        username: testUsername,
        email: testEmail,
        password: 'testpassword123',
        role: 'Employee',
      },
      adminToken
    );
    assert(
      createByAdmin.status === 201 &&
        createByAdmin.data.data.username === testUsername &&
        createByAdmin.data.data.permissions.medicines.view === true,
      'POST /api/v1/employees - Admin creates new employee and seeds default permissions'
    );
    const createdEmpId = createByAdmin.data.data.id || createByAdmin.data.data._id;

    // 12. GET /api/v1/employees/:id
    const singleEmp = await makeRequest(`/api/v1/employees/${createdEmpId}`, 'GET', null, adminToken);
    assert(
      singleEmp.status === 200 && singleEmp.data.data.name === 'Test Pharmacist',
      'GET /api/v1/employees/:id - Admin retrieves single employee details'
    );

    // 13. PUT /api/v1/employees/:id (Update name and email)
    const updateEmp = await makeRequest(
      `/api/v1/employees/${createdEmpId}`,
      'PUT',
      { name: 'Updated Pharmacist' },
      adminToken
    );
    assert(
      updateEmp.status === 200 && updateEmp.data.data.name === 'Updated Pharmacist',
      'PUT /api/v1/employees/:id - Admin updates employee details'
    );

    // 14. PATCH /api/v1/employees/:id/status (Toggle Active -> Inactive)
    const toggleStatus = await makeRequest(
      `/api/v1/employees/${createdEmpId}/status`,
      'PATCH',
      {},
      adminToken
    );
    assert(
      toggleStatus.status === 200 && toggleStatus.data.data.status === 'Inactive',
      'PATCH /api/v1/employees/:id/status - Toggles employee to Inactive'
    );

    // 15. Attempt login with Inactive account (Suspended 403)
    const inactiveLogin = await makeRequest('/api/v1/auth/login', 'POST', {
      username: testUsername,
      password: 'testpassword123',
    });
    assert(
      inactiveLogin.status === 403 && inactiveLogin.data.success === false,
      'POST /api/v1/auth/login - Deactivated / Inactive account is rejected with 403'
    );

    // 16. GET /api/v1/permissions/:employeeId
    const getPerms = await makeRequest(`/api/v1/permissions/${createdEmpId}`, 'GET', null, adminToken);
    assert(
      getPerms.status === 200 && getPerms.data.data.permissions.medicines.view === true,
      'GET /api/v1/permissions/:employeeId - Retrieves module permission schema'
    );

    // 17. PUT /api/v1/permissions/:employeeId as Admin (Grant delete on medicines)
    const updatePerms = await makeRequest(
      `/api/v1/permissions/${createdEmpId}`,
      'PUT',
      {
        medicines: { view: true, add: true, edit: true, delete: true },
      },
      adminToken
    );
    assert(
      updatePerms.status === 200 && updatePerms.data.data.permissions.medicines.delete === true,
      'PUT /api/v1/permissions/:employeeId - Admin updates individual module permissions'
    );

    // 18. PUT /api/v1/permissions/:employeeId as Employee (Forbidden 403)
    const updatePermsByEmp = await makeRequest(
      `/api/v1/permissions/${createdEmpId}`,
      'PUT',
      {
        medicines: { view: true, add: true, edit: true, delete: true },
      },
      employeeToken
    );
    assert(
      updatePermsByEmp.status === 403 && updatePermsByEmp.data.success === false,
      'PUT /api/v1/permissions/:employeeId - Employee cannot update permissions (403 Forbidden)'
    );

    // 19. Guard: Prevent last active Admin deletion
    const ayeshaId = ayeshaLogin.data.data.user.id;
    // Attempt to delete Ayesha Khan (or self-deletion)
    const selfDelete = await makeRequest(`/api/v1/employees/${ayeshaId}`, 'DELETE', null, adminToken);
    assert(
      selfDelete.status === 400 && selfDelete.data.success === false,
      'DELETE /api/v1/employees/:id - Prevents self-deletion of active Admin'
    );

    // 20. Guard: Prevent deactivating the last active Admin
    const deactAdmin = await makeRequest(
      `/api/v1/employees/${ayeshaId}/status`,
      'PATCH',
      {},
      adminToken
    );
    assert(
      deactAdmin.status === 400 && deactAdmin.data.success === false,
      'PATCH /api/v1/employees/:id/status - Prevents deactivating the last active Admin'
    );

    // 21. DELETE /api/v1/employees/:id (Delete the created test employee)
    const deleteEmp = await makeRequest(
      `/api/v1/employees/${createdEmpId}`,
      'DELETE',
      null,
      adminToken
    );
    assert(
      deleteEmp.status === 200 && deleteEmp.data.success === true,
      'DELETE /api/v1/employees/:id - Admin successfully deletes test employee'
    );

    // 22. POST /api/v1/auth/change-password
    const changePass = await makeRequest(
      '/api/v1/auth/change-password',
      'POST',
      {
        currentPassword: 'ayesha123',
        newPassword: 'ayesha123_updated',
      },
      adminToken
    );
    assert(
      changePass.status === 200 && changePass.data.success === true,
      'POST /api/v1/auth/change-password - Successfully changes password'
    );

    // Revert password back to original 'ayesha123' so demo credentials remain intact
    await makeRequest(
      '/api/v1/auth/change-password',
      'POST',
      {
        currentPassword: 'ayesha123_updated',
        newPassword: 'ayesha123',
      },
      adminToken
    );

    // 23. POST /api/v1/auth/logout
    const logoutRes = await makeRequest('/api/v1/auth/logout', 'POST', null, adminToken);
    assert(
      logoutRes.status === 200 && logoutRes.data.success === true,
      'POST /api/v1/auth/logout - Successfully clears session'
    );

    console.log(`\n======================================================`);
    console.log(` RESULT: ${passed}/${total} Auth & Employee Tests Passed `);
    console.log(`======================================================\n`);

    testServer.close(() => process.exit(0));
  } catch (err) {
    console.error('Fatal test runner error:', err);
    testServer.close(() => process.exit(1));
  }
});
