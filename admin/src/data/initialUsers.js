import {
  USER_ROLES,
  EMPLOYEE_STATUS,
  DEFAULT_ADMIN_PERMISSIONS,
} from '../utils/constants.js';
import { hashDemoPassword } from '../utils/security.js';

export const INITIAL_USERS = [
  {
    employeeId: 'EMP-001',
    id: 'emp_001',
    name: 'Huzaifa Zafi',
    username: 'huzaifazafi',
    password: hashDemoPassword('admin1234'),
    role: USER_ROLES.ADMIN,
    status: EMPLOYEE_STATUS.ACTIVE,
    email: 'huzaifazafi156@gmail.com',
    phone: '+923001234567',
    createdAt: '2026-01-01T00:00:00.000Z',
    permissions: DEFAULT_ADMIN_PERMISSIONS,
  },
];
