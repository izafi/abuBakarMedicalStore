const express = require('express');
const { getReport } = require('../controller/reportController');
const { authenticate } = require('../middleware/authMiddleware');
const { checkPermission } = require('../middleware/permissionMiddleware');

const router = express.Router();

router.use(authenticate);

router.get('/:reportType', checkPermission('reports', 'view'), getReport);

module.exports = router;
