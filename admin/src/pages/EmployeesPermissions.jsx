import { useState } from 'react';
import {
  Shield,
  Plus,
  KeyRound,
  Trash2,
  Edit2,
  Eye,
  Lock,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Card, CardHeader } from '../components/common/Card';
import { Table } from '../components/common/Table';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Input } from '../components/common/Input';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import {
  USER_ROLES,
  EMPLOYEE_STATUS,
  PERMISSION_MODULES,
  PERMISSION_ACTIONS,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS,
} from '../utils/constants';
import { validateEmployee } from '../utils/validators';

export const EmployeesPermissions = () => {
  const {
    users,
    currentUser,
    switchUser,
    addEmployee,
    updateEmployee,
    deleteEmployee,
    toggleEmployeeStatus,
    changeEmployeePassword,
    hasPermission,
  } = useAuth();
  const toast = useToast();

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Form State
  const initialForm = {
    employeeId: '',
    name: '',
    username: '',
    password: '',
    role: USER_ROLES.EMPLOYEE,
    status: EMPLOYEE_STATUS.ACTIVE,
    email: '',
    phone: '',
    permissions: JSON.parse(JSON.stringify(DEFAULT_EMPLOYEE_PERMISSIONS)),
  };
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});

  const moduleList = [
    { key: PERMISSION_MODULES.MEDICINES, label: 'Medicines Management' },
    { key: PERMISSION_MODULES.INVENTORY, label: 'Inventory & Stock' },
    { key: PERMISSION_MODULES.SALES, label: 'Sales & POS Billing' },
    { key: PERMISSION_MODULES.EMPLOYEES, label: 'Employees & Permissions' },
    { key: PERMISSION_MODULES.REPORTS, label: 'Financial Reports' },
  ];

  const actionList = [
    { key: PERMISSION_ACTIONS.VIEW, label: 'View' },
    { key: PERMISSION_ACTIONS.ADD, label: 'Add' },
    { key: PERMISSION_ACTIONS.EDIT, label: 'Edit' },
    { key: PERMISSION_ACTIONS.DELETE, label: 'Delete' },
  ];

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFormData({
      ...initialForm,
      employeeId: `EMP-${String(Date.now()).slice(-3)}`,
      permissions: JSON.parse(JSON.stringify(DEFAULT_EMPLOYEE_PERMISSIONS)),
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingEmployee(emp);
    setFormData({
      employeeId: emp.employeeId,
      name: emp.name,
      username: emp.username,
      password: '',
      role: emp.role,
      status: emp.status,
      email: emp.email || '',
      phone: emp.phone || '',
      permissions: JSON.parse(
        JSON.stringify(
          emp.permissions ||
            (emp.role === USER_ROLES.ADMIN
              ? DEFAULT_ADMIN_PERMISSIONS
              : DEFAULT_EMPLOYEE_PERMISSIONS)
        )
      ),
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handlePermissionToggle = (modKey, actKey) => {
    if (formData.role === USER_ROLES.ADMIN) return; // Admin has full bypass
    setFormData((prev) => {
      const currentMod = prev.permissions[modKey] || {};
      const updatedMod = { ...currentMod, [actKey]: !currentMod[actKey] };
      return {
        ...prev,
        permissions: { ...prev.permissions, [modKey]: updatedMod },
      };
    });
  };

  const handleSaveEmployee = (e) => {
    e.preventDefault();
    const validation = validateEmployee(
      formData,
      users,
      editingEmployee ? editingEmployee.employeeId : null
    );

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      toast.showError('Please resolve employee form errors');
      return;
    }

    try {
      if (editingEmployee) {
        updateEmployee(editingEmployee.employeeId, formData);
        toast.showSuccess(`Updated ${formData.name}'s profile and permissions`);
      } else {
        addEmployee(formData);
        toast.showSuccess(`Created employee account for ${formData.name} (${formData.employeeId})`);
      }
      setIsFormOpen(false);
      setEditingEmployee(null);
    } catch (err) {
      toast.showError(err.message);
    }
  };

  const handleToggleStatus = (emp) => {
    try {
      const newStatus = toggleEmployeeStatus(emp.employeeId);
      toast.showSuccess(`${emp.name} is now ${newStatus}`);
    } catch (err) {
      toast.showError(err.message);
    }
  };

  const handleChangePassword = (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      toast.showError('Password must be at least 4 characters');
      return;
    }
    try {
      changeEmployeePassword(passwordTarget.employeeId, newPassword);
      toast.showSuccess(`Demo password updated for ${passwordTarget.name}`);
      setPasswordTarget(null);
      setNewPassword('');
    } catch (err) {
      toast.showError(err.message);
    }
  };

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    try {
      deleteEmployee(deleteTarget.employeeId);
      toast.showSuccess(`Removed staff account for ${deleteTarget.name}`);
      setDeleteTarget(null);
    } catch (err) {
      toast.showError(err.message);
    }
  };

  const columns = [
    {
      header: 'Employee ID',
      accessor: 'employeeId',
      render: (u) => (
        <span className="font-mono text-xs font-bold text-gray-700 bg-gray-50 px-2 py-0.5 rounded border border-gray-100">
          {u.employeeId}
        </span>
      ),
    },
    {
      header: 'Staff Member',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-[#E8F6EF] text-[#1C9A58] border border-[#BDE8D2] flex items-center justify-center font-black text-sm">
            {u.name.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">{u.name}</p>
            <p className="text-xs text-gray-400 font-mono">@{u.username}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Role',
      accessor: 'role',
      render: (u) => (
        <Badge variant={u.role === USER_ROLES.ADMIN ? 'primary' : 'default'} dot>
          {u.role}
        </Badge>
      ),
    },
    {
      header: 'Status',
      render: (u) => (
        <Badge
          variant={u.status === EMPLOYEE_STATUS.ACTIVE ? 'success' : 'danger'}
          dot
        >
          {u.status}
        </Badge>
      ),
    },
    {
      header: 'Contact Info',
      render: (u) => (
        <div className="text-xs text-gray-600">
          <p>{u.email || 'N/A'}</p>
          <p className="text-gray-400 text-[11px]">{u.phone}</p>
        </div>
      ),
    },
    {
      header: 'Actions',
      align: 'right',
      render: (u) => {
        const isCurrent = currentUser?.employeeId === u.employeeId;
        const canEditEmp = hasPermission('employees', 'edit');
        const canDeleteEmp = hasPermission('employees', 'delete');

        return (
          <div className="flex items-center justify-end gap-1.5">
            {/* View Profile */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setViewingEmployee(u)}
              className="text-gray-500 hover:text-[#1C9A58] p-1.5"
              title="View Profile & Permissions"
            >
              <Eye className="w-4 h-4" />
            </Button>

            {/* Quick Switch */}
            <Button
              variant={isCurrent ? 'primary' : 'outline'}
              size="sm"
              iconLeft={KeyRound}
              disabled={u.status === EMPLOYEE_STATUS.INACTIVE}
              onClick={() => {
                switchUser(u.employeeId);
                toast.showSuccess(`Switched session to ${u.name}`);
              }}
              className="text-xs font-semibold"
            >
              {isCurrent ? 'Active' : 'Switch'}
            </Button>

            {/* Edit */}
            {canEditEmp && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleOpenEdit(u)}
                className="text-gray-500 hover:text-[#1C9A58] p-1.5"
                title="Edit Employee"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            )}

            {/* Change Password */}
            {canEditEmp && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPasswordTarget(u);
                  setNewPassword('');
                }}
                className="text-gray-500 hover:text-amber-600 p-1.5"
                title="Change Demo Password"
              >
                <Lock className="w-4 h-4" />
              </Button>
            )}

            {/* Toggle Status */}
            {canEditEmp && !isCurrent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleToggleStatus(u)}
                className={`p-1.5 ${
                  u.status === EMPLOYEE_STATUS.ACTIVE
                    ? 'text-gray-400 hover:text-rose-600'
                    : 'text-emerald-600 hover:text-emerald-700'
                }`}
                title={u.status === EMPLOYEE_STATUS.ACTIVE ? 'Deactivate' : 'Activate'}
              >
                {u.status === EMPLOYEE_STATUS.ACTIVE ? (
                  <UserX className="w-4 h-4" />
                ) : (
                  <UserCheck className="w-4 h-4" />
                )}
              </Button>
            )}

            {/* Delete */}
            {canDeleteEmp && !isCurrent && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setDeleteTarget(u)}
                className="text-rose-400 hover:text-rose-600 p-1.5"
                title="Delete Employee"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Title & Add Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">
            Employee Management & Authentication
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure individual permission matrices (View, Add, Edit, Delete), activate staff, and switch demo sessions.
          </p>
        </div>

        {hasPermission('employees', 'add') && (
          <Button
            variant="primary"
            iconLeft={Plus}
            onClick={handleOpenAdd}
            className="shadow-sm font-bold"
          >
            Add New Employee
          </Button>
        )}
      </div>

      {/* Staff Accounts Table */}
      <Table columns={columns} data={users} />

      {/* Permission Matrix Guide */}
      <Card>
        <CardHeader
          title="Role Permissions Policy & Granular Controls"
          subtitle="System permissions enforced on pages, navigation links, and operation buttons"
          action={
            <div className="flex items-center gap-1.5 text-xs text-gray-500 font-semibold">
              <Shield className="w-4 h-4 text-[#1C9A58]" />
              <span>Session Enforcement Active</span>
            </div>
          }
        />
        <div className="mt-3 text-xs text-gray-600 leading-relaxed">
          <p>
            • <strong>Admin (Ayesha Khan)</strong> holds universal unrestricted access across all pharmaceutical catalogs, stock audits, billing, and system controls.
          </p>
          <p className="mt-1">
            • <strong>Employees (Bilal Ahmed, Sana Malik)</strong> only view and execute actions explicitly enabled in their individual permission matrix.
          </p>
        </div>
      </Card>

      {/* Add / Edit Employee Modal with Granular Permission Grid */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={editingEmployee ? `Edit Employee: ${editingEmployee.name}` : 'Register New Employee'}
        subtitle="Manage credentials and customize module-by-module permission access."
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSaveEmployee}>
              {editingEmployee ? 'Save Changes' : 'Create Employee'}
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveEmployee} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Input
              label="Employee ID"
              required
              disabled={Boolean(editingEmployee)}
              value={formData.employeeId}
              onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
              placeholder="e.g. EMP-004"
            />
            <Input
              label="Full Name"
              required
              value={formData.name}
              error={formErrors.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. Tariq Mehmood"
            />
            <Input
              label="System Username"
              required
              value={formData.username}
              error={formErrors.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              placeholder="e.g. tariq.pharma"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {!editingEmployee && (
              <Input
                label="Demo Password"
                type="password"
                required
                value={formData.password}
                error={formErrors.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="••••••••"
              />
            )}

            <Input
              label="Role"
              type="select"
              value={formData.role}
              options={[USER_ROLES.EMPLOYEE, USER_ROLES.ADMIN]}
              onChange={(e) => {
                const newRole = e.target.value;
                setFormData({
                  ...formData,
                  role: newRole,
                  permissions:
                    newRole === USER_ROLES.ADMIN
                      ? DEFAULT_ADMIN_PERMISSIONS
                      : DEFAULT_EMPLOYEE_PERMISSIONS,
                });
              }}
            />

            <Input
              label="Account Status"
              type="select"
              value={formData.status}
              options={[EMPLOYEE_STATUS.ACTIVE, EMPLOYEE_STATUS.INACTIVE]}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            />

            <Input
              label="Phone Contact"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="+92 300 0000000"
            />
          </div>

          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="employee@abmstore.pk"
          />

          {/* Granular Permission Matrix */}
          <div className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-gray-800">
                  Individual Module Permissions
                </h4>
                <p className="text-[11px] text-gray-500">
                  {formData.role === USER_ROLES.ADMIN
                    ? 'Admin automatically holds universal permission across all actions.'
                    : 'Toggle authorization for each specific operational action.'}
                </p>
              </div>
              {formData.role === USER_ROLES.ADMIN && (
                <Badge variant="primary" size="sm">
                  Full Access
                </Badge>
              )}
            </div>

            <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-500 font-bold uppercase text-[10px]">
                    <th className="py-2 px-3">Module</th>
                    {actionList.map((act) => (
                      <th key={act.key} className="py-2 px-3 text-center">
                        {act.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {moduleList.map((mod) => (
                    <tr key={mod.key} className="hover:bg-gray-50/50">
                      <td className="py-2.5 px-3 font-semibold text-gray-800">
                        {mod.label}
                      </td>
                      {actionList.map((act) => {
                        const isChecked =
                          formData.role === USER_ROLES.ADMIN ||
                          Boolean(formData.permissions?.[mod.key]?.[act.key]);

                        return (
                          <td key={act.key} className="py-2.5 px-3 text-center">
                            <input
                              type="checkbox"
                              disabled={formData.role === USER_ROLES.ADMIN}
                              checked={isChecked}
                              onChange={() => handlePermissionToggle(mod.key, act.key)}
                              className="w-4 h-4 text-[#1C9A58] rounded border-gray-300 focus:ring-[#1C9A58] cursor-pointer disabled:opacity-50"
                            />
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </form>
      </Modal>

      {/* View Employee Profile Modal */}
      {viewingEmployee && (
        <Modal
          isOpen={Boolean(viewingEmployee)}
          onClose={() => setViewingEmployee(null)}
          title={`Employee Profile: ${viewingEmployee.name}`}
          subtitle={`Employee ID: ${viewingEmployee.employeeId}`}
          size="md"
          footer={
            <Button variant="outline" onClick={() => setViewingEmployee(null)}>
              Close
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-4 rounded-xl bg-gray-50 border border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-[#1C9A58] text-white flex items-center justify-center font-bold text-base">
                  {viewingEmployee.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 text-sm">{viewingEmployee.name}</h4>
                  <p className="text-gray-400 font-mono">@{viewingEmployee.username}</p>
                </div>
              </div>
              <div className="text-right">
                <Badge variant={viewingEmployee.role === USER_ROLES.ADMIN ? 'primary' : 'default'}>
                  {viewingEmployee.role}
                </Badge>
                <p className="text-[10px] text-gray-400 mt-1">Status: {viewingEmployee.status}</p>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-gray-100 bg-white space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Contact & Account Details
              </span>
              <p>Email: <strong>{viewingEmployee.email || 'N/A'}</strong></p>
              <p>Phone: <strong>{viewingEmployee.phone || 'N/A'}</strong></p>
              <p>Registered Date: <strong>{new Date(viewingEmployee.createdAt).toLocaleDateString()}</strong></p>
            </div>

            {/* Permissions breakdown */}
            <div className="p-3.5 rounded-xl border border-gray-100 bg-white space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                Authorized Module Actions
              </span>
              <div className="space-y-1.5 pt-1">
                {moduleList.map((m) => {
                  const perms = viewingEmployee.role === USER_ROLES.ADMIN
                    ? { view: true, add: true, edit: true, delete: true }
                    : viewingEmployee.permissions?.[m.key] || {};

                  return (
                    <div key={m.key} className="flex items-center justify-between py-1 border-b border-gray-50">
                      <span className="font-semibold text-gray-800">{m.label}</span>
                      <div className="flex items-center gap-1.5">
                        {actionList.map((a) => (
                          <span
                            key={a.key}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              perms[a.key]
                                ? 'bg-emerald-50 text-[#1C9A58] border border-emerald-100'
                                : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {a.label}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Change Password Modal */}
      {passwordTarget && (
        <Modal
          isOpen={Boolean(passwordTarget)}
          onClose={() => setPasswordTarget(null)}
          title="Change Demo Password"
          subtitle={`Set a new demo login credential for ${passwordTarget.name}`}
          size="sm"
          footer={
            <>
              <Button variant="outline" onClick={() => setPasswordTarget(null)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleChangePassword}>
                Update Password
              </Button>
            </>
          }
        >
          <form onSubmit={handleChangePassword} className="space-y-3">
            <Input
              label="New Demo Password"
              type="password"
              required
              placeholder="Minimum 4 characters"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoFocus
            />
          </form>
        </Modal>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
        title="Remove Staff Account"
        message={`Are you sure you want to permanently delete "${deleteTarget?.name}"? They will no longer be able to log in to this pharmacy store.`}
        confirmText="Confirm Delete"
        variant="danger"
      />
    </div>
  );
};

export default EmployeesPermissions;
