import { useState, useMemo } from 'react';
import {
  Shield,
  Plus,
  KeyRound,
  Trash2,
  Edit2,
  Eye,
  EyeOff,
  Lock,
  UserCheck,
  UserX,
  Users,
  Search,
  X,
  RotateCcw,
  Mail,
  Phone,
  ShieldCheck,
  ShieldAlert,
  CheckCircle2,
  Filter,
  Check,
  User,
  UserPlus,
  UserCog,
  Hash,
  AtSign,
  Activity,
  Pill,
  Boxes,
  Receipt,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';
import { Modal } from '../components/common/Modal';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import FilterDropdown from '../components/common/FilterDropdown';
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

  // Search & Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [viewingEmployee, setViewingEmployee] = useState(null);
  const [passwordTarget, setPasswordTarget] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showFormPassword, setShowFormPassword] = useState(false);
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const initialForm = {
    employeeId: '',
    name: '',
    username: '',
    password: '',
    role: USER_ROLES.EMPLOYEE,
    status: EMPLOYEE_STATUS.ACTIVE,
    email: '',
    phone: '+92',
    permissions: JSON.parse(JSON.stringify(DEFAULT_EMPLOYEE_PERMISSIONS)),
  };
  const [formData, setFormData] = useState(initialForm);
  const [formErrors, setFormErrors] = useState({});

  // Phone input handler enforcing "+92" prefix, digits only, and max 13 characters
  const handlePhoneChange = (e) => {
    let val = e.target.value;
    if (!val) {
      setFormData((prev) => ({ ...prev, phone: '' }));
      if (formErrors.phone) setFormErrors((prev) => ({ ...prev, phone: '' }));
      return;
    }

    // Always enforce +92 prefix
    if (!val.startsWith('+92')) {
      const digitsOnly = val.replace(/\D/g, '');
      val = '+92' + digitsOnly;
    } else {
      const suffix = val.slice(3).replace(/\D/g, '');
      val = '+92' + suffix;
    }

    // Hard limit to exactly 13 characters
    if (val.length > 13) {
      val = val.slice(0, 13);
    }

    setFormData((prev) => ({ ...prev, phone: val }));
    if (formErrors.phone) {
      setFormErrors((prev) => ({ ...prev, phone: '' }));
    }
  };

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

  // Aggregate KPI Metrics
  const metrics = useMemo(() => {
    const totalStaff = users.length;
    const activeStaff = users.filter((u) => u.status === EMPLOYEE_STATUS.ACTIVE).length;
    const adminCount = users.filter((u) => u.role === USER_ROLES.ADMIN).length;
    const employeeCount = users.filter((u) => u.role === USER_ROLES.EMPLOYEE).length;

    return { totalStaff, activeStaff, adminCount, employeeCount };
  }, [users]);

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        u.name?.toLowerCase().includes(q) ||
        u.employeeId?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phone?.toLowerCase().includes(q);

      const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
      const matchesStatus = statusFilter === 'ALL' || u.status === statusFilter;

      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchQuery, roleFilter, statusFilter]);

  // Reset Filters
  const handleResetFilters = () => {
    setSearchQuery('');
    setRoleFilter('ALL');
    setStatusFilter('ALL');
  };

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setShowFormPassword(false);
    setFormData({
      ...initialForm,
      employeeId: `EMP-${String(Date.now()).slice(-3)}`,
      phone: '+92',
      permissions: JSON.parse(JSON.stringify(DEFAULT_EMPLOYEE_PERMISSIONS)),
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingEmployee(emp);
    setShowFormPassword(false);
    setFormData({
      employeeId: emp.employeeId,
      name: emp.name,
      username: emp.username,
      password: '',
      role: emp.role,
      status: emp.status,
      email: emp.email || '',
      phone: emp.phone || '+92',
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
    if (formData.role === USER_ROLES.ADMIN) return;
    setFormData((prev) => {
      const currentMod = prev.permissions[modKey] || {};
      const updatedMod = { ...currentMod, [actKey]: !currentMod[actKey] };
      return {
        ...prev,
        permissions: { ...prev.permissions, [modKey]: updatedMod },
      };
    });
  };

  // Quick Permission Matrix Presets
  const handleGrantAllPermissions = () => {
    if (formData.role === USER_ROLES.ADMIN) return;
    const allPerms = {
      medicines: { view: true, add: true, edit: true, delete: true },
      inventory: { view: true, add: true, edit: true, delete: true },
      sales: { view: true, add: true, edit: true, delete: true },
      employees: { view: false, add: false, edit: false, delete: false },
      reports: { view: true, add: true, edit: true, delete: true },
    };
    setFormData((prev) => ({ ...prev, permissions: allPerms }));
    toast.showSuccess('Granted full operational access (View, Add, Edit, Delete)');
  };

  const handleSetViewOnlyPermissions = () => {
    if (formData.role === USER_ROLES.ADMIN) return;
    const viewOnly = {
      medicines: { view: true, add: false, edit: false, delete: false },
      inventory: { view: true, add: false, edit: false, delete: false },
      sales: { view: true, add: false, edit: false, delete: false },
      employees: { view: false, add: false, edit: false, delete: false },
      reports: { view: true, add: false, edit: false, delete: false },
    };
    setFormData((prev) => ({ ...prev, permissions: viewOnly }));
    toast.showSuccess('Permissions set to View Only (Add, Edit, Delete disabled)');
  };

  const handleClearAllPermissions = () => {
    if (formData.role === USER_ROLES.ADMIN) return;
    const cleared = {
      medicines: { view: false, add: false, edit: false, delete: false },
      inventory: { view: false, add: false, edit: false, delete: false },
      sales: { view: false, add: false, edit: false, delete: false },
      employees: { view: false, add: false, edit: false, delete: false },
      reports: { view: false, add: false, edit: false, delete: false },
    };
    setFormData((prev) => ({ ...prev, permissions: cleared }));
    toast.showSuccess('All module permissions cleared');
  };

  const handleSaveEmployee = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    const validation = validateEmployee(
      formData,
      users,
      editingEmployee ? (editingEmployee.employeeId || editingEmployee._id || editingEmployee.id) : null
    );

    if (!validation.isValid) {
      setFormErrors(validation.errors);
      toast.showError('Please resolve employee form errors');
      return;
    }

    try {
      setIsSubmitting(true);
      const targetId = editingEmployee?._id || editingEmployee?.id || editingEmployee?.employeeId;
      if (editingEmployee) {
        await updateEmployee(targetId, formData);
        toast.showSuccess(`Updated ${formData.name}'s profile and permissions`);
      } else {
        await addEmployee(formData);
        toast.showSuccess(`Created employee account for ${formData.name} (${formData.employeeId})`);
      }
      setIsFormOpen(false);
      setEditingEmployee(null);
    } catch (err) {
      toast.showError(err.message || 'Failed to save employee changes');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (emp) => {
    try {
      const nextStatus = await toggleEmployeeStatus(emp.employeeId || emp._id || emp.id);
      const displayStatus = nextStatus || (emp.status === 'Active' ? 'Inactive' : 'Active');
      toast.showSuccess(`${emp.name} is now ${displayStatus}`);
    } catch (err) {
      toast.showError(err.message || 'Failed to update employee status');
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 4) {
      toast.showError('Password must be at least 4 characters');
      return;
    }
    try {
      await changeEmployeePassword(passwordTarget.employeeId || passwordTarget._id || passwordTarget.id, newPassword);
      toast.showSuccess(`Password updated successfully for ${passwordTarget.name}`);
      setPasswordTarget(null);
      setNewPassword('');
    } catch (err) {
      toast.showError(err.message || 'Failed to update password');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteEmployee(deleteTarget.employeeId || deleteTarget._id || deleteTarget.id);
      toast.showSuccess(`Staff account for ${deleteTarget.name} has been removed`);
      setDeleteTarget(null);
    } catch (err) {
      toast.showError(err.message || 'Failed to remove staff account');
    }
  };

  return (
    <div className="space-y-4 font-sans select-none">
      {/* =========================================================================
          PAGE HEADER (Clean, Elegant & High-Contrast)
          ========================================================================= */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-black tracking-tight flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-[#1C9A58]" />
            </div>
            <span>Staff & Permissions</span>
          </h1>
          <div className="flex items-center gap-2 flex-wrap mt-0.5 text-xs text-black font-semibold">
            <span>Manage team credentials, roles, and granular module access</span>
            <span className="text-slate-300">&bull;</span>
            <span className="inline-flex items-center gap-1 font-bold text-[#1C9A58]">
              <span className="w-2 h-2 rounded-full bg-[#1C9A58] animate-pulse"></span>
              {metrics.totalStaff} Member{metrics.totalStaff === 1 ? '' : 's'} ({metrics.activeStaff} Active)
            </span>
          </div>
        </div>

        {hasPermission('employees', 'add') && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="bg-[#1C9A58] hover:bg-[#0F3A2C] text-white font-bold text-xs px-3.5 py-2.5 rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
            <span>Add Team Member</span>
          </button>
        )}
      </div>

      {/* =========================================================================
          SLIM & CLEAN TOOLBAR (Single Row Search + Role Tabs)
          ========================================================================= */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
        {/* Search Input */}
        <div className="relative flex-1 w-full sm:max-w-md">
          <Search className="w-4 h-4 text-black absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, username, email, phone..."
            className="w-full h-9 pl-9 pr-8 text-xs bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58]/20 focus:border-[#1C9A58] text-black font-bold transition-all placeholder:text-slate-400 placeholder:font-normal"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="w-5 h-5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-black absolute right-2.5 top-1/2 -translate-y-1/2 flex items-center justify-center cursor-pointer transition-colors"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x">
          <button
            type="button"
            onClick={handleResetFilters}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              roleFilter === 'ALL' && statusFilter === 'ALL'
                ? 'bg-black text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-black border border-slate-200'
            }`}
          >
            All Staff ({metrics.totalStaff})
          </button>
          <button
            type="button"
            onClick={() => {
              setRoleFilter(USER_ROLES.ADMIN);
              setStatusFilter('ALL');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              roleFilter === USER_ROLES.ADMIN
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-950 border border-purple-200'
            }`}
          >
            Admins ({metrics.adminCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setRoleFilter(USER_ROLES.EMPLOYEE);
              setStatusFilter('ALL');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              roleFilter === USER_ROLES.EMPLOYEE
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-200'
            }`}
          >
            Staff ({metrics.employeeCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter(EMPLOYEE_STATUS.ACTIVE);
              setRoleFilter('ALL');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
              statusFilter === EMPLOYEE_STATUS.ACTIVE && roleFilter === 'ALL'
                ? 'bg-[#1C9A58] text-white shadow-xs'
                : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-950 border border-emerald-200'
            }`}
          >
            Active ({metrics.activeStaff})
          </button>
        </div>
      </div>

      {/* =========================================================================
          STREAMLINED STAFF TABLE (Generous Spacing, Clean & NO Clipping)
          ========================================================================= */}
      <div className="w-full bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="w-full overflow-x-auto no-scrollbar overscroll-x-contain touch-pan-x">
          <table className="w-full min-w-[700px] lg:min-w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none">
                <th className="py-3 px-4 text-black font-bold whitespace-nowrap">
                  Staff Member
                </th>
                <th className="py-3 px-3 text-black font-bold whitespace-nowrap">
                  Role
                </th>
                <th className="py-3 px-3 text-black font-bold whitespace-nowrap">
                  Status
                </th>
                <th className="py-3 px-4 text-black font-bold whitespace-nowrap">
                  Contact
                </th>
                <th className="py-3 px-4 text-right text-black font-bold whitespace-nowrap min-w-[150px]">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs bg-white">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-black">
                    <Users className="w-9 h-9 mx-auto mb-2 text-slate-400 stroke-[1.8]" />
                    <p className="font-bold text-black text-sm">No team members found</p>
                    <p className="text-xs text-slate-500 font-semibold mt-0.5">
                      Try adjusting your search query or filter selection.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="mt-3 px-3.5 py-1.5 text-xs font-bold bg-black text-white rounded-lg hover:bg-neutral-800 transition-colors cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = currentUser?.employeeId === u.employeeId || currentUser?.username === u.username || currentUser?._id === u._id;
                  const canEditEmp = hasPermission('employees', 'edit');
                  const canDeleteEmp = hasPermission('employees', 'delete');

                  return (
                    <tr
                      key={u.id || u.employeeId || u._id}
                      className="hover:bg-slate-50/80 transition-colors"
                    >
                      {/* 1. Staff Member Avatar & Name */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-xs border ${
                            u.role === USER_ROLES.ADMIN
                              ? 'bg-purple-100 text-purple-900 border-purple-200'
                              : 'bg-emerald-100 text-emerald-900 border-emerald-200'
                          }`}>
                            {u.name?.charAt(0) || 'U'}
                          </div>
                          <div>
                            <p
                              onClick={() => setViewingEmployee(u)}
                              className="font-bold text-black text-xs sm:text-sm hover:text-[#1C9A58] transition-colors cursor-pointer leading-tight"
                              title="Click to view full profile & permissions"
                            >
                              {u.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 2. Role Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {u.role === USER_ROLES.ADMIN ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-950 border border-purple-300">
                            <Shield className="w-3 h-3 text-purple-700" />
                            <span>Admin</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-950 border border-blue-300">
                            <User className="w-3 h-3 text-blue-600" />
                            <span>Employee</span>
                          </span>
                        )}
                      </td>

                      {/* 3. Status Badge */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        {u.status === EMPLOYEE_STATUS.ACTIVE ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-950 border border-emerald-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse inline-block" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-950 border border-rose-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 inline-block" />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>

                      {/* 4. Contact Info */}
                      <td className="py-3 px-4">
                        <div className="space-y-0.5">
                          <p className="text-black font-bold text-xs flex items-center gap-1.5">
                            <Mail className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{u.email || 'N/A'}</span>
                          </p>
                          <p className="text-[11px] text-slate-600 font-semibold flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400 shrink-0" />
                            <span>{u.phone || 'N/A'}</span>
                          </p>
                        </div>
                      </td>

                      {/* 5. Action Buttons (Spacious, Uncramped, High-Contrast) */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* View Profile & Matrix */}
                          <button
                            type="button"
                            onClick={() => setViewingEmployee(u)}
                            className="p-1.5 text-black hover:text-[#1C9A58] bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer transition-colors shadow-xs"
                            title="View Profile & Permissions Matrix"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Edit Employee */}
                          {canEditEmp && (
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(u)}
                              className="p-1.5 text-black hover:text-blue-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer transition-colors shadow-xs"
                              title="Edit Employee Credentials & Permissions"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Change Password */}
                          {canEditEmp && (
                            <button
                              type="button"
                              onClick={() => {
                                setPasswordTarget(u);
                                setNewPassword('');
                              }}
                              className="p-1.5 text-black hover:text-amber-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg cursor-pointer transition-colors shadow-xs"
                              title="Change Password"
                            >
                              <Lock className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Toggle Status (Activate / Deactivate) */}
                          {canEditEmp && !isCurrent && (
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(u)}
                              className={`p-1.5 rounded-lg border border-slate-300 cursor-pointer transition-colors shadow-xs ${
                                u.status === EMPLOYEE_STATUS.ACTIVE
                                  ? 'text-black hover:text-rose-600 bg-white hover:bg-rose-50'
                                  : 'text-black hover:text-emerald-700 bg-white hover:bg-emerald-50'
                              }`}
                              title={u.status === EMPLOYEE_STATUS.ACTIVE ? 'Deactivate Account' : 'Activate Account'}
                            >
                              {u.status === EMPLOYEE_STATUS.ACTIVE ? (
                                <UserX className="w-3.5 h-3.5" />
                              ) : (
                                <UserCheck className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}

                          {/* Delete Account */}
                          {canDeleteEmp && !isCurrent && (
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(u)}
                              className="p-1.5 text-rose-600 hover:text-rose-700 bg-white hover:bg-rose-50 border border-rose-300 rounded-lg cursor-pointer transition-colors shadow-xs"
                              title="Delete Account"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* =========================================================================
          ADD / EDIT EMPLOYEE MODAL (Abu Bakar Medical Store Theme, Eye-Catching)
          ========================================================================= */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-[#1C9A58] to-teal-400 text-white shadow-xs flex items-center justify-center shrink-0">
              {editingEmployee ? (
                <UserCog className="w-5 h-5 drop-shadow-xs stroke-[2.2]" />
              ) : (
                <UserPlus className="w-5 h-5 drop-shadow-xs stroke-[2.2]" />
              )}
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-black tracking-tight leading-tight">
                {editingEmployee ? `Edit Employee: ${editingEmployee.name}` : 'Register New Employee'}
              </h2>
              <p className="text-xs text-black font-semibold mt-0.5">
                {editingEmployee
                  ? `Updating credentials and permissions for ID: ${editingEmployee.employeeId}`
                  : 'Manage credentials and customize module-by-module permission access.'}
              </p>
            </div>
          </div>
        }
        size="xl"
        footer={
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 w-full">
            <div className="flex items-center gap-2 text-xs font-bold text-black text-center sm:text-left">
              <ShieldCheck className="w-4 h-4 text-emerald-700 stroke-[2.5] shrink-0" />
              <span>Role-based access control with live session enforcement</span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="flex-1 sm:flex-initial text-xs font-bold border border-slate-300 hover:border-black text-black px-4 py-2 rounded-lg cursor-pointer transition-colors bg-white hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEmployee}
                disabled={isSubmitting}
                className="flex-1 sm:flex-initial text-xs font-bold bg-[#1C9A58] hover:bg-[#158046] text-white px-5 py-2 rounded-lg cursor-pointer transition-all shadow-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
                    <span>{editingEmployee ? 'Save Changes' : 'Create Employee'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        }
      >
        <form onSubmit={handleSaveEmployee} className="space-y-4 font-sans select-none">
          {/* Row 1: Employee ID, Full Name, System Username */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* 1. Employee ID */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1.5 flex items-center justify-between">
                <span>
                  Employee ID <span className="text-rose-600 font-bold">*</span>
                </span>
                <span className="text-[10px] text-neutral-600 font-semibold normal-case">
                  Unique store code
                </span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-700">
                  <Hash className="w-4 h-4 stroke-[2.2]" />
                </div>
                <input
                  type="text"
                  disabled={Boolean(editingEmployee)}
                  value={formData.employeeId}
                  onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                  placeholder="e.g. EMP-004"
                  className="w-full h-10 pl-9 pr-3 text-xs font-mono font-bold text-black bg-slate-100 disabled:bg-slate-100 disabled:text-black border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] focus:border-[#1C9A58] transition-colors"
                />
              </div>
            </div>

            {/* 2. Full Name */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1.5">
                Full Name <span className="text-rose-600 font-bold">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-emerald-700">
                  <User className="w-4 h-4 stroke-[2.2]" />
                </div>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    const lettersOnly = e.target.value.replace(/[^a-zA-Z\s]/g, '');
                    setFormData({ ...formData, name: lettersOnly });
                    if (formErrors.name) setFormErrors({ ...formErrors, name: '' });
                  }}
                  placeholder="e.g. Tariq Mehmood"
                  className={`w-full h-10 pl-9 pr-3 text-xs font-bold text-black bg-slate-50 hover:bg-white focus:bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] transition-colors placeholder:text-neutral-500 ${formErrors.name ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                />
              </div>
              {formErrors.name && (
                <p className="text-[11px] text-rose-600 font-bold mt-1">{formErrors.name}</p>
              )}
            </div>

            {/* 3. System Username */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1.5">
                System Username <span className="text-rose-600 font-bold">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-700">
                  <AtSign className="w-4 h-4 stroke-[2.2]" />
                </div>
                <input
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g. tariq.pharma"
                  className={`w-full h-10 pl-9 pr-3 text-xs font-mono font-bold text-black bg-slate-50 hover:bg-white focus:bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] transition-colors placeholder:text-neutral-500 ${formErrors.username ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                />
              </div>
              {formErrors.username && (
                <p className="text-[11px] text-rose-600 font-bold mt-1">{formErrors.username}</p>
              )}
            </div>
          </div>

          {/* Row 2: Password, Role, Status, Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            {/* Password (only for new employees) with Eye Toggle */}
            {!editingEmployee && (
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1.5">
                  Password <span className="text-rose-600 font-bold">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-700">
                    <Lock className="w-4 h-4 stroke-[2.2]" />
                  </div>
                  <input
                    type={showFormPassword ? 'text' : 'password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="••••••••"
                    className={`w-full h-10 pl-9 pr-9 text-xs font-bold text-black bg-slate-50 hover:bg-white focus:bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] transition-colors placeholder:text-neutral-500 ${formErrors.password ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                      }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowFormPassword(!showFormPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-black cursor-pointer transition-colors"
                    tabIndex={-1}
                  >
                    {showFormPassword ? (
                      <EyeOff className="w-4 h-4 stroke-[2]" />
                    ) : (
                      <Eye className="w-4 h-4 stroke-[2]" />
                    )}
                  </button>
                </div>
                {formErrors.password && (
                  <p className="text-[11px] text-rose-600 font-bold mt-1">{formErrors.password}</p>
                )}
              </div>
            )}

            {/* Role */}
            <div className={editingEmployee ? 'sm:col-span-1' : ''}>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1.5">
                Role
              </label>
              <FilterDropdown
                value={formData.role}
                onChange={(newRole) => {
                  setFormData({
                    ...formData,
                    role: newRole,
                    permissions:
                      newRole === USER_ROLES.ADMIN
                        ? DEFAULT_ADMIN_PERMISSIONS
                        : DEFAULT_EMPLOYEE_PERMISSIONS,
                  });
                }}
                options={[
                  {
                    label: 'Employee',
                    value: USER_ROLES.EMPLOYEE,
                    icon: <User className="w-3.5 h-3.5 text-blue-600" />,
                  },
                  {
                    label: 'Admin',
                    value: USER_ROLES.ADMIN,
                    icon: <Shield className="w-3.5 h-3.5 text-purple-700" />,
                  },
                ]}
                icon={<Shield className="w-4 h-4 stroke-[2.2] text-purple-700" />}
                buttonClassName="h-10 text-xs font-bold text-black bg-slate-50 hover:bg-white focus:bg-white border-slate-300 rounded-lg"
                className="w-full"
              />
            </div>

            {/* Account Status */}
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1.5">
                Account Status
              </label>
              <FilterDropdown
                value={formData.status}
                onChange={(newStatus) => setFormData({ ...formData, status: newStatus })}
                options={[
                  {
                    label: 'Active',
                    value: EMPLOYEE_STATUS.ACTIVE,
                    icon: <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block" />,
                  },
                  {
                    label: 'Inactive',
                    value: EMPLOYEE_STATUS.INACTIVE,
                    icon: <span className="w-2 h-2 rounded-full bg-rose-600 inline-block" />,
                  },
                ]}
                icon={<Activity className="w-4 h-4 stroke-[2.2] text-emerald-700" />}
                buttonClassName="h-10 text-xs font-bold text-black bg-slate-50 hover:bg-white focus:bg-white border-slate-300 rounded-lg"
                className="w-full"
              />
            </div>

            {/* Phone Contact (Strict 13 chars starting with +92) */}
            <div className={editingEmployee ? 'sm:col-span-2' : ''}>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-black">
                  Phone Contact <span className="text-rose-600 font-bold">*</span>
                </label>
                <span className={`text-[10px] font-mono font-bold ${formData.phone?.length === 13 ? 'text-emerald-700' : 'text-slate-500'}`}>
                  {formData.phone?.length || 0}/13 chars
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-teal-700">
                  <Phone className="w-4 h-4 stroke-[2.2]" />
                </div>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={handlePhoneChange}
                  placeholder="+923001234567"
                  maxLength={13}
                  className={`w-full h-10 pl-9 pr-3 text-xs font-bold font-mono text-black bg-slate-50 hover:bg-white focus:bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] transition-colors placeholder:text-neutral-500 ${formErrors.phone ? 'border-rose-400 bg-rose-50/30' : 'border-slate-300'
                    }`}
                />
              </div>
              {formErrors.phone ? (
                <p className="text-[11px] text-rose-600 font-bold mt-1">{formErrors.phone}</p>
              ) : (
                <p className="text-[10px] text-slate-500 font-semibold mt-1">
                  Must start with +92 followed by 10 digits (exact 13 characters)
                </p>
              )}
            </div>
          </div>

          {/* Row 3: Email Address */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-700">
                <Mail className="w-4 h-4 stroke-[2.2]" />
              </div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="employee@abmstore.pk"
                className="w-full h-10 pl-9 pr-3 text-xs font-bold text-black bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] transition-colors placeholder:text-neutral-500"
              />
            </div>
          </div>

          {/* Row 4: Granular Permission Matrix Box (Eye-Catching, Themed) */}
          <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 border border-slate-300 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-black flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-[#1C9A58] stroke-[2.5]" />
                  <span>Individual Module Permissions Matrix</span>
                </h4>
                <p className="text-[11px] text-black font-semibold mt-0.5">
                  {formData.role === USER_ROLES.ADMIN
                    ? 'Admin automatically holds universal permission across all operations.'
                    : 'Toggle authorization for each specific operational action.'}
                </p>
              </div>

              {formData.role === USER_ROLES.ADMIN ? (
                <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-100 text-purple-950 border border-purple-300 shadow-2xs flex items-center gap-1 self-start sm:self-auto">
                  <Shield className="w-3.5 h-3.5 text-purple-700 stroke-[2.2]" />
                  <span>Full Override Enabled</span>
                </span>
              ) : (
                <div className="flex items-center gap-1.5 flex-wrap self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={handleGrantAllPermissions}
                    className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-100 text-emerald-950 hover:bg-emerald-200 border border-emerald-300 cursor-pointer transition-colors shadow-2xs"
                    title="Enable all actions across all modules"
                  >
                    Grant All
                  </button>
                  <button
                    type="button"
                    onClick={handleSetViewOnlyPermissions}
                    className="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-100 text-blue-950 hover:bg-blue-200 border border-blue-300 cursor-pointer transition-colors shadow-2xs"
                    title="Enable View only (Read-only mode)"
                  >
                    View Only
                  </button>
                  <button
                    type="button"
                    onClick={handleClearAllPermissions}
                    className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-200 text-black hover:bg-slate-300 border border-slate-300 cursor-pointer transition-colors shadow-2xs"
                    title="Uncheck all permissions"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* Matrix Table with Module Icons and Colorful Badges */}
            <div className="overflow-x-auto rounded-lg border border-slate-300 bg-white shadow-2xs no-scrollbar overscroll-x-contain touch-pan-x">
              <table className="w-full min-w-[460px] sm:min-w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/90 border-b border-slate-300 text-[11px] font-bold text-black uppercase tracking-wider select-none">
                    <th className="py-2.5 px-3 whitespace-nowrap">Pharmacy Module</th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-emerald-950 font-bold">
                        <Eye className="w-3 h-3 text-emerald-700 stroke-[2.2]" /> View
                      </span>
                    </th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-blue-950 font-bold">
                        <Plus className="w-3 h-3 text-blue-700 stroke-[2.5]" /> Add
                      </span>
                    </th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-amber-950 font-bold">
                        <Edit2 className="w-3 h-3 text-amber-700 stroke-[2.2]" /> Edit
                      </span>
                    </th>
                    <th className="py-2.5 px-3 text-center whitespace-nowrap">
                      <span className="inline-flex items-center gap-1 text-rose-950 font-bold">
                        <Trash2 className="w-3 h-3 text-rose-700 stroke-[2.2]" /> Delete
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {moduleList.map((mod) => {
                    const ModuleIcon =
                      mod.key === PERMISSION_MODULES.MEDICINES
                        ? Pill
                        : mod.key === PERMISSION_MODULES.INVENTORY
                          ? Boxes
                          : mod.key === PERMISSION_MODULES.SALES
                            ? Receipt
                            : mod.key === PERMISSION_MODULES.EMPLOYEES
                              ? Users
                              : TrendingUp;

                    const iconColor =
                      mod.key === PERMISSION_MODULES.MEDICINES
                        ? 'text-emerald-700 bg-emerald-100 border-emerald-300'
                        : mod.key === PERMISSION_MODULES.INVENTORY
                          ? 'text-teal-700 bg-teal-100 border-teal-300'
                          : mod.key === PERMISSION_MODULES.SALES
                            ? 'text-blue-700 bg-blue-100 border-blue-300'
                            : mod.key === PERMISSION_MODULES.EMPLOYEES
                              ? 'text-purple-700 bg-purple-100 border-purple-300'
                              : 'text-indigo-700 bg-indigo-100 border-indigo-300';

                    return (
                      <tr key={mod.key} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 shadow-2xs ${iconColor}`}>
                              <ModuleIcon className="w-3.5 h-3.5 stroke-[2.2]" />
                            </div>
                            <span className="font-bold text-black text-xs">
                              {mod.label}
                            </span>
                          </div>
                        </td>
                        {actionList.map((act) => {
                          const isChecked =
                            formData.role === USER_ROLES.ADMIN ||
                            Boolean(formData.permissions?.[mod.key]?.[act.key]);

                          return (
                            <td key={act.key} className="py-2.5 px-3 text-center">
                              <label className="inline-flex items-center justify-center cursor-pointer p-1">
                                <input
                                  type="checkbox"
                                  disabled={formData.role === USER_ROLES.ADMIN}
                                  checked={isChecked}
                                  onChange={() => handlePermissionToggle(mod.key, act.key)}
                                  className="w-4 h-4 text-[#1C9A58] rounded border-slate-300 focus:ring-[#1C9A58] cursor-pointer disabled:opacity-50 accent-[#1C9A58]"
                                />
                              </label>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </form>
      </Modal>

      {/* =========================================================================
          VIEW EMPLOYEE PROFILE MODAL (Website Theme & Eye-Catching)
          ========================================================================= */}
      {viewingEmployee && (
        <Modal
          isOpen={Boolean(viewingEmployee)}
          onClose={() => setViewingEmployee(null)}
          title={
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 via-[#1C9A58] to-teal-400 text-white shadow-xs flex items-center justify-center shrink-0">
                <User className="w-5 h-5 drop-shadow-xs stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-black tracking-tight leading-tight">
                  Employee Profile: {viewingEmployee.name}
                </h2>
                <p className="text-xs text-black font-semibold mt-0.5">
                  Employee ID: {viewingEmployee.employeeId} &bull; System Role: {viewingEmployee.role}
                </p>
              </div>
            </div>
          }
          size="md"
          footer={
            <div className="flex items-center justify-end w-full">
              <button
                type="button"
                onClick={() => setViewingEmployee(null)}
                className="w-full sm:w-auto text-xs font-bold border border-slate-300 hover:border-black text-black px-5 py-2 rounded-lg cursor-pointer transition-colors bg-white hover:bg-slate-100 shadow-2xs"
              >
                Close Profile
              </button>
            </div>
          }
        >
          <div className="space-y-3 text-xs font-sans select-none">
            {/* Header Card */}
            <div className="p-3 sm:p-3.5 rounded-xl bg-slate-50 border border-slate-300 flex items-center justify-between gap-2.5 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-emerald-100 text-[#1C9A58] border border-emerald-300 flex items-center justify-center font-black text-sm sm:text-base shadow-2xs shrink-0">
                  {viewingEmployee.name?.charAt(0) || 'U'}
                </div>
                <div className="min-w-0">
                  <h4 className="font-bold text-black text-xs sm:text-sm truncate">{viewingEmployee.name}</h4>
                  <p className="text-black font-semibold font-mono text-[11px] sm:text-xs mt-0.5 truncate">@{viewingEmployee.username}</p>
                </div>
              </div>
              <div className="text-right shrink-0">
                {viewingEmployee.role === USER_ROLES.ADMIN ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-950 border border-purple-300 shadow-2xs">
                    <Shield className="w-3 h-3 text-purple-700 stroke-[2.2]" /> Admin
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-950 border border-blue-300 shadow-2xs">
                    Employee
                  </span>
                )}
                <p className="text-[10px] sm:text-[11px] text-black font-bold mt-1">Status: {viewingEmployee.status}</p>
              </div>
            </div>

            {/* Contact Details */}
            <div className="p-3 rounded-xl border border-slate-300 bg-white space-y-1.5 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-black block pb-1 border-b border-slate-200">
                Contact & Account Details
              </span>
              <p className="text-black font-semibold break-all text-xs">Email: <strong className="text-black font-bold">{viewingEmployee.email || 'N/A'}</strong></p>
              <p className="text-black font-semibold text-xs">Phone: <strong className="text-black font-bold">{viewingEmployee.phone || 'N/A'}</strong></p>
              <p className="text-black font-semibold text-xs">Registered Date: <strong className="text-black font-bold">{new Date(viewingEmployee.createdAt || Date.now()).toLocaleDateString()}</strong></p>
            </div>

            {/* Permissions breakdown */}
            <div className="p-3 rounded-xl border border-slate-300 bg-white space-y-2 shadow-2xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-black block pb-1 border-b border-slate-200">
                Authorized Module Actions
              </span>
              <div className="space-y-1.5 pt-1">
                {moduleList.map((m) => {
                  const perms = viewingEmployee.role === USER_ROLES.ADMIN
                    ? { view: true, add: true, edit: true, delete: true }
                    : viewingEmployee.permissions?.[m.key] || {};

                  return (
                    <div key={m.key} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 py-1.5 border-b border-slate-100 last:border-0">
                      <span className="font-bold text-black text-xs">{m.label}</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {actionList.map((a) => (
                          <span
                            key={a.key}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${perms[a.key]
                              ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                              : 'bg-slate-100 text-neutral-400'
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

      {/* =========================================================================
          CHANGE DEMO PASSWORD MODAL (Website Theme)
          ========================================================================= */}
      {passwordTarget && (
        <Modal
          isOpen={Boolean(passwordTarget)}
          onClose={() => setPasswordTarget(null)}
          title={
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400 text-white shadow-xs flex items-center justify-center shrink-0">
                <Lock className="w-5 h-5 drop-shadow-xs stroke-[2.2]" />
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-black tracking-tight leading-tight">
                  Change Password
                </h2>
                <p className="text-xs text-black font-semibold mt-0.5">
                  Set a new login password for {passwordTarget.name} ({passwordTarget.employeeId})
                </p>
              </div>
            </div>
          }
          size="sm"
          footer={
            <div className="grid grid-cols-2 sm:flex sm:items-center sm:justify-end gap-2 w-full">
              <button
                type="button"
                onClick={() => {
                  setPasswordTarget(null);
                  setShowModalPassword(false);
                }}
                className="w-full sm:w-auto text-xs font-bold border border-slate-300 hover:border-black text-black px-4 py-2.5 rounded-lg cursor-pointer transition-colors bg-white hover:bg-slate-100 flex items-center justify-center"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleChangePassword}
                className="w-full sm:w-auto text-xs font-bold bg-[#1C9A58] hover:bg-[#158046] text-white px-4 py-2.5 rounded-lg cursor-pointer transition-colors shadow-xs flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4 stroke-[2.2]" />
                <span>Update Password</span>
              </button>
            </div>
          }
        >
          <form onSubmit={handleChangePassword} className="space-y-3 font-sans select-none">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-black mb-1.5">
                New Password <span className="text-rose-600">*</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-amber-700">
                  <Lock className="w-4 h-4 stroke-[2.2]" />
                </div>
                <input
                  type={showModalPassword ? 'text' : 'password'}
                  required
                  placeholder="Minimum 4 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoFocus
                  className="w-full h-10 pl-9 pr-9 text-xs font-bold text-black bg-slate-50 hover:bg-white focus:bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1C9A58] transition-colors placeholder:text-neutral-500"
                />
                <button
                  type="button"
                  onClick={() => setShowModalPassword(!showModalPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-black cursor-pointer transition-colors"
                  tabIndex={-1}
                >
                  {showModalPassword ? (
                    <EyeOff className="w-4 h-4 stroke-[2]" />
                  ) : (
                    <Eye className="w-4 h-4 stroke-[2]" />
                  )}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* =========================================================================
          DELETE CONFIRMATION DIALOG
          ========================================================================= */}
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
