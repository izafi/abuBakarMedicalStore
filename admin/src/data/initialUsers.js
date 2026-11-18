import {
  USER_ROLES,
  EMPLOYEE_STATUS,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS,
  PERMISSION_MODULES,
} from '../utils/constants.js';
import { hashDemoPassword } from '../utils/security.js';

export const INITIAL_USERS = [
  {
    employeeId: 'EMP-001',
    id: 'emp_001',
    name: 'Ayesha Khan',
    username: 'ayesha.admin',
    password: hashDemoPassword('ayesha123'),
    role: USER_ROLES.ADMIN,
    status: EMPLOYEE_STATUS.ACTIVE,
    email: 'ayesha.khan@abmstore.pk',
    phone: '+92 300 1122334',
    createdAt: '2026-01-10T08:00:00Z',
    permissions: DEFAULT_ADMIN_PERMISSIONS,
  },
  {
    employeeId: 'EMP-002',
    id: 'emp_002',
    name: 'Bilal Ahmed',
    username: 'bilal.pharma',
    password: hashDemoPassword('bilal123'),
    role: USER_ROLES.EMPLOYEE,
    status: EMPLOYEE_STATUS.ACTIVE,
    email: 'bilal.ahmed@abmstore.pk',
    phone: '+92 321 4455667',
    createdAt: '2026-02-15T09:30:00Z',
    // Bilal has access to medicines, inventory, and sales, plus read reports
    permissions: {
      ...DEFAULT_EMPLOYEE_PERMISSIONS,
      [PERMISSION_MODULES.MEDICINES]: { view: true, add: true, edit: true, delete: false },
      [PERMISSION_MODULES.INVENTORY]: { view: true, add: true, edit: true, delete: false },
      [PERMISSION_MODULES.SALES]: { view: true, add: true, edit: true, delete: false },
      [PERMISSION_MODULES.EMPLOYEES]: { view: false, add: false, edit: false, delete: false },
      [PERMISSION_MODULES.REPORTS]: { view: true, add: false, edit: false, delete: false },
    },
  },
  {
    employeeId: 'EMP-003',
    id: 'emp_003',
    name: 'Sana Malik',
    username: 'sana.cashier',
    password: hashDemoPassword('sana123'),
    role: USER_ROLES.EMPLOYEE,
    status: EMPLOYEE_STATUS.ACTIVE,
    email: 'sana.malik@abmstore.pk',
    phone: '+92 333 7788990',
    createdAt: '2026-03-01T10:00:00Z',
    // Sana specializes in Sales & Counter, with view-only on medicines catalog
    permissions: {
      [PERMISSION_MODULES.MEDICINES]: { view: true, add: false, edit: false, delete: false },
      [PERMISSION_MODULES.INVENTORY]: { view: false, add: false, edit: false, delete: false },
      [PERMISSION_MODULES.SALES]: { view: true, add: true, edit: false, delete: false },
      [PERMISSION_MODULES.EMPLOYEES]: { view: false, add: false, edit: false, delete: false },
      [PERMISSION_MODULES.REPORTS]: { view: false, add: false, edit: false, delete: false },
    },
  },
];
