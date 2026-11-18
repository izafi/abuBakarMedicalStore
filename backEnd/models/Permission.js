const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Employee',
      required: [true, 'Employee ID reference is required'],
      index: true,
    },
    moduleName: {
      type: String,
      required: [true, 'Module name is required'],
      enum: ['medicines', 'inventory', 'sales', 'employees', 'reports'],
      index: true,
    },
    canView: {
      type: Boolean,
      default: false,
    },
    canAdd: {
      type: Boolean,
      default: false,
    },
    canEdit: {
      type: Boolean,
      default: false,
    },
    canDelete: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Guarantee one permission document per employee per module
permissionSchema.index({ employeeId: 1, moduleName: 1 }, { unique: true });

// Static helper to initialize default permissions for an employee based on role
permissionSchema.statics.seedDefaultsForEmployee = async function (employeeId, role = 'Employee') {
  const modules = ['medicines', 'inventory', 'sales', 'employees', 'reports'];
  const permissionsToCreate = [];

  for (const moduleName of modules) {
    if (role === 'Admin') {
      permissionsToCreate.push({
        employeeId,
        moduleName,
        canView: true,
        canAdd: true,
        canEdit: true,
        canDelete: true,
      });
    } else {
      // Default standard employee permissions
      switch (moduleName) {
        case 'medicines':
          permissionsToCreate.push({
            employeeId,
            moduleName,
            canView: true,
            canAdd: true,
            canEdit: true,
            canDelete: false,
          });
          break;
        case 'inventory':
          permissionsToCreate.push({
            employeeId,
            moduleName,
            canView: true,
            canAdd: true,
            canEdit: false,
            canDelete: false,
          });
          break;
        case 'sales':
          permissionsToCreate.push({
            employeeId,
            moduleName,
            canView: true,
            canAdd: true,
            canEdit: true,
            canDelete: false,
          });
          break;
        case 'employees':
          permissionsToCreate.push({
            employeeId,
            moduleName,
            canView: false,
            canAdd: false,
            canEdit: false,
            canDelete: false,
          });
          break;
        case 'reports':
          permissionsToCreate.push({
            employeeId,
            moduleName,
            canView: true,
            canAdd: false,
            canEdit: false,
            canDelete: false,
          });
          break;
        default:
          permissionsToCreate.push({
            employeeId,
            moduleName,
            canView: false,
            canAdd: false,
            canEdit: false,
            canDelete: false,
          });
      }
    }
  }

  // Upsert all permissions
  for (const p of permissionsToCreate) {
    await this.findOneAndUpdate(
      { employeeId: p.employeeId, moduleName: p.moduleName },
      { $set: p },
      { upsert: true, new: true }
    );
  }
};

module.exports = mongoose.model('Permission', permissionSchema);
