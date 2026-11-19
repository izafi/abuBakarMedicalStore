const reportsController = require('./reportsController');

module.exports = {
  ...reportsController,
  getReport: reportsController.getGenericReport,
};
