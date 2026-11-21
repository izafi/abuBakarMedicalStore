import { useState, useEffect, useCallback } from 'react';
import {
  USER_ROLES,
  EMPLOYEE_STATUS,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS,
} from '../utils/constants';
import { INITIAL_USERS } from '../data/initialUsers';
import { authService } from '../services/authService';
import { employeeService } from '../services/employeeService';
import { getAuthToken } from '../services/apiClient';
import { AuthContext } from './contexts';

export const AuthProvider = ({ children }) => {
  const [users, setUsers] = useState(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState(INITIAL_USERS[0] || null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch employees dynamically from backend API
  const fetchEmployees = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await employeeService.getEmployees();
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        const normalized = res.data.map((u, idx) => ({
          ...u,
          employeeId: u.employeeId || (u._id || u.id ? `EMP-${String(u._id || u.id).slice(-4).toUpperCase()}` : `EMP-00${idx + 1}`),
        }));
        setUsers(normalized);
        // If current user is set, refresh their profile with updated permissions
        setCurrentUser((prev) => {
          if (!prev) return normalized[0];
          const matched = normalized.find(
            (u) =>
              u._id === prev._id ||
              u.id === prev.id ||
              u.employeeId === prev.employeeId ||
              u.username === prev.username
          );
          return matched || normalized[0];
        });
      }
    } catch (err) {
      console.warn('[AuthContext] Could not fetch employees from API:', err.message);
      // Fallback to demo accounts endpoint if admin endpoint requires authentication
      try {
        const demoRes = await authService.getDemoAccounts();
        if (demoRes?.data && Array.isArray(demoRes.data) && demoRes.data.length > 0) {
          const normalizedDemo = demoRes.data.map((u, idx) => ({
            ...u,
            employeeId: u.employeeId || (u._id || u.id ? `EMP-${String(u._id || u.id).slice(-4).toUpperCase()}` : `EMP-00${idx + 1}`),
          }));
          setUsers(normalizedDemo);
        }
      } catch (demoErr) {
        console.warn('[AuthContext] Demo accounts fallback error:', demoErr.message);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEmployees();
    // Auto-authenticate default terminal admin if token not present in memory
    if (!getAuthToken()) {
      authService.login('huzaifazafi', 'admin1234').catch((e) => {
        console.warn('[AuthContext] Terminal auto-auth notice:', e.message);
      });
    }
  }, [fetchEmployees]);

  // Login via API with credentials
  const login = useCallback(
    async (usernameOrId, password = 'password123') => {
      // Find if this is an account selection or raw credentials
      const targetUser = users.find(
        (u) =>
          u.employeeId === usernameOrId ||
          u.id === usernameOrId ||
          u._id === usernameOrId ||
          u.username === usernameOrId
      );

      const username = targetUser ? targetUser.username : usernameOrId;

      try {
        const res = await authService.login(username, password);
        if (res?.data?.user) {
          setCurrentUser(res.data.user);
          return true;
        }
      } catch (err) {
        // If server is in offline/test mode or password differs, allow switching demo account
        if (targetUser) {
          if (targetUser.status === EMPLOYEE_STATUS.INACTIVE) {
            throw new Error('This account has been deactivated. Please contact your administrator.');
          }
          setCurrentUser(targetUser);
          return true;
        }
        throw err;
      }
      return false;
    },
    [users]
  );

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch (err) {
      console.warn('[AuthContext] Logout warning:', err.message);
    } finally {
      setCurrentUser(null);
    }
  }, []);

  const switchUser = useCallback(
    (employeeId) => {
      return login(employeeId);
    },
    [login]
  );

  // Add Employee via backend API
  const addEmployee = useCallback(
    async (employeeData) => {
      try {
        const res = await employeeService.createEmployee(employeeData);
        if (res?.data) {
          await fetchEmployees();
          return res.data;
        }
      } catch (err) {
        console.error('[AuthContext] Failed to create employee via API:', err);
        // Optimistic addition
        const newEmp = {
          ...employeeData,
          id: `emp_${Date.now()}`,
          _id: `emp_${Date.now()}`,
          createdAt: new Date().toISOString(),
          permissions:
            employeeData.permissions ||
            (employeeData.role === USER_ROLES.ADMIN
              ? DEFAULT_ADMIN_PERMISSIONS
              : DEFAULT_EMPLOYEE_PERMISSIONS),
        };
        setUsers((prev) => [...prev, newEmp]);
        return newEmp;
      }
    },
    [fetchEmployees]
  );

  // Edit Employee via backend API
  const updateEmployee = useCallback(
    async (employeeId, updatedFields) => {
      const target = users.find(
        (u) => u.employeeId === employeeId || u.id === employeeId || u._id === employeeId
      );
      const targetId = target?._id || target?.id || employeeId;

      try {
        await employeeService.updateEmployee(targetId, updatedFields);
        if (updatedFields.permissions) {
          try {
            await employeeService.updatePermissions(targetId, updatedFields.permissions);
          } catch (permErr) {
            console.warn('[AuthContext] Update permissions endpoint note:', permErr.message);
          }
        }
        await fetchEmployees();
      } catch (err) {
        console.warn('[AuthContext] API employee update warning:', err.message);
        // Optimistic local update
        setUsers((prev) =>
          prev.map((u) => {
            if (u.employeeId === employeeId || u.id === employeeId || u._id === employeeId) {
              const updated = { ...u, ...updatedFields };
              if (currentUser?.employeeId === employeeId || currentUser?.id === employeeId || currentUser?._id === employeeId) {
                setCurrentUser(updated);
              }
              return updated;
            }
            return u;
          })
        );
      }
    },
    [users, currentUser, fetchEmployees]
  );

  // Delete Employee via backend API
  const deleteEmployee = useCallback(
    async (employeeId) => {
      const target = users.find(
        (u) => u.employeeId === employeeId || u.id === employeeId || u._id === employeeId
      );
      if (!target) return;

      const adminCount = users.filter((u) => u.role === USER_ROLES.ADMIN).length;
      if (target.role === USER_ROLES.ADMIN && adminCount <= 1) {
        throw new Error('Cannot delete the last remaining Administrator account.');
      }

      const targetId = target._id || target.id || employeeId;
      try {
        await employeeService.deleteEmployee(targetId);
        await fetchEmployees();
      } catch (err) {
        console.warn('[AuthContext] API employee delete warning:', err.message);
        setUsers((prev) =>
          prev.filter((u) => u.employeeId !== employeeId && u.id !== employeeId && u._id !== employeeId)
        );
      }

      if (currentUser?.employeeId === employeeId || currentUser?.id === employeeId || currentUser?._id === employeeId) {
        const remaining = users.filter(
          (u) => u.employeeId !== employeeId && u.id !== employeeId && u._id !== employeeId
        );
        setCurrentUser(remaining[0] || null);
      }
    },
    [users, currentUser, fetchEmployees]
  );

  // Activate / Deactivate Employee via backend API
  const toggleEmployeeStatus = useCallback(
    async (employeeId) => {
      const target = users.find(
        (u) => u.employeeId === employeeId || u.id === employeeId || u._id === employeeId
      );
      if (!target) return;

      if (
        target.role === USER_ROLES.ADMIN &&
        target.status === EMPLOYEE_STATUS.ACTIVE &&
        users.filter((u) => u.role === USER_ROLES.ADMIN && u.status === EMPLOYEE_STATUS.ACTIVE).length <= 1
      ) {
        throw new Error('Cannot deactivate the only active Administrator.');
      }

      const targetId = target._id || target.id || employeeId;
      try {
        await employeeService.toggleStatus(targetId);
        await fetchEmployees();
      } catch (err) {
        console.warn('[AuthContext] API employee toggle status warning:', err.message);
        const newStatus =
          target.status === EMPLOYEE_STATUS.ACTIVE
            ? EMPLOYEE_STATUS.INACTIVE
            : EMPLOYEE_STATUS.ACTIVE;
        await updateEmployee(employeeId, { status: newStatus });
      }
    },
    [users, updateEmployee, fetchEmployees]
  );

  // Change Demo Password via backend API
  const changeEmployeePassword = useCallback(
    async (employeeId, newPlainPassword) => {
      try {
        await authService.changePassword({ newPassword: newPlainPassword });
      } catch {
        await updateEmployee(employeeId, { password: newPlainPassword });
      }
    },
    [updateEmployee]
  );

  // Reusable Permission Checker
  const hasPermission = useCallback(
    (moduleName, action = 'view') => {
      if (!currentUser) return false;
      if (currentUser.status === EMPLOYEE_STATUS.INACTIVE) return false;
      if (currentUser.role === USER_ROLES.ADMIN) return true;
      return Boolean(currentUser.permissions?.[moduleName]?.[action]);
    },
    [currentUser]
  );

  const resetToDemoEmployees = useCallback(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: Boolean(currentUser),
        users,
        employees: users,
        isLoading,
        error,
        refreshEmployees: fetchEmployees,
        login,
        logout,
        switchUser,
        addEmployee,
        updateEmployee,
        deleteEmployee,
        toggleEmployeeStatus,
        changeEmployeePassword,
        hasPermission,
        isAdmin: currentUser?.role === USER_ROLES.ADMIN,
        resetToDemoEmployees,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;
