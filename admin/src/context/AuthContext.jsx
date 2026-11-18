import { useState, useEffect, useCallback } from 'react';
import {
  STORAGE_KEYS,
  USER_ROLES,
  EMPLOYEE_STATUS,
  DEFAULT_ADMIN_PERMISSIONS,
  DEFAULT_EMPLOYEE_PERMISSIONS,
} from '../utils/constants';
import { INITIAL_USERS } from '../data/initialUsers';
import { storage } from '../utils/storage';
import { hashDemoPassword } from '../utils/security';
import { AuthContext } from './contexts';

export const AuthProvider = ({ children }) => {
  const [users, setUsers] = useState(() => {
    return storage.get(STORAGE_KEYS.EMPLOYEES, INITIAL_USERS);
  });

  const [currentUser, setCurrentUser] = useState(() => {
    const saved = storage.get(STORAGE_KEYS.AUTH_USER, null);
    if (saved && users.some((u) => u.employeeId === saved.employeeId)) {
      const liveUser = users.find((u) => u.employeeId === saved.employeeId);
      return liveUser || null;
    }
    // Default to Ayesha Khan (Admin)
    return users[0] || null;
  });

  useEffect(() => {
    storage.set(STORAGE_KEYS.EMPLOYEES, users);
  }, [users]);

  useEffect(() => {
    if (currentUser) {
      storage.set(STORAGE_KEYS.AUTH_USER, currentUser);
    } else {
      storage.remove(STORAGE_KEYS.AUTH_USER);
    }
  }, [currentUser]);

  // Login / Switch Account
  const login = useCallback(
    (employeeId) => {
      const found = users.find(
        (u) => u.employeeId === employeeId || u.id === employeeId
      );
      if (found) {
        if (found.status === EMPLOYEE_STATUS.INACTIVE) {
          throw new Error('This account has been deactivated. Please contact your administrator.');
        }
        setCurrentUser(found);
        return true;
      }
      return false;
    },
    [users]
  );

  const logout = useCallback(() => {
    setCurrentUser(null);
  }, []);

  const switchUser = useCallback(
    (employeeId) => {
      return login(employeeId);
    },
    [login]
  );

  // Add Employee
  const addEmployee = useCallback((employeeData) => {
    const autoId = `EMP-${String(Date.now()).slice(-4)}`;
    const newEmployee = {
      employeeId: employeeData.employeeId?.trim() || autoId,
      id: `emp_${Date.now()}`,
      name: employeeData.name.trim(),
      username: employeeData.username.trim(),
      password: hashDemoPassword(employeeData.password || 'demo123'),
      role: employeeData.role || USER_ROLES.EMPLOYEE,
      status: employeeData.status || EMPLOYEE_STATUS.ACTIVE,
      email: employeeData.email?.trim() || '',
      phone: employeeData.phone?.trim() || '',
      createdAt: new Date().toISOString(),
      permissions:
        employeeData.permissions ||
        (employeeData.role === USER_ROLES.ADMIN
          ? DEFAULT_ADMIN_PERMISSIONS
          : DEFAULT_EMPLOYEE_PERMISSIONS),
    };

    setUsers((prev) => [...prev, newEmployee]);
    return newEmployee;
  }, []);

  // Edit Employee
  const updateEmployee = useCallback(
    (employeeId, updatedFields) => {
      setUsers((prev) =>
        prev.map((u) => {
          if (u.employeeId === employeeId || u.id === employeeId) {
            const updated = {
              ...u,
              ...updatedFields,
              // If password is provided in plain text, hash it safely
              password: updatedFields.password
                ? hashDemoPassword(updatedFields.password)
                : u.password,
            };
            // If the updated user is the active user, update currentUser state as well
            if (currentUser?.employeeId === employeeId || currentUser?.id === employeeId) {
              setCurrentUser(updated);
            }
            return updated;
          }
          return u;
        })
      );
    },
    [currentUser]
  );

  // Delete Employee
  const deleteEmployee = useCallback(
    (employeeId) => {
      const target = users.find(
        (u) => u.employeeId === employeeId || u.id === employeeId
      );
      if (!target) return;

      const adminCount = users.filter((u) => u.role === USER_ROLES.ADMIN).length;
      if (target.role === USER_ROLES.ADMIN && adminCount <= 1) {
        throw new Error('Cannot delete the last remaining Administrator account.');
      }

      setUsers((prev) =>
        prev.filter((u) => u.employeeId !== employeeId && u.id !== employeeId)
      );

      if (currentUser?.employeeId === employeeId || currentUser?.id === employeeId) {
        const remaining = users.filter(
          (u) => u.employeeId !== employeeId && u.id !== employeeId
        );
        setCurrentUser(remaining[0] || null);
      }
    },
    [users, currentUser]
  );

  // Activate / Deactivate Employee
  const toggleEmployeeStatus = useCallback(
    (employeeId) => {
      const target = users.find(
        (u) => u.employeeId === employeeId || u.id === employeeId
      );
      if (!target) return;

      if (
        target.role === USER_ROLES.ADMIN &&
        target.status === EMPLOYEE_STATUS.ACTIVE &&
        users.filter((u) => u.role === USER_ROLES.ADMIN && u.status === EMPLOYEE_STATUS.ACTIVE).length <= 1
      ) {
        throw new Error('Cannot deactivate the only active Administrator.');
      }

      const newStatus =
        target.status === EMPLOYEE_STATUS.ACTIVE
          ? EMPLOYEE_STATUS.INACTIVE
          : EMPLOYEE_STATUS.ACTIVE;

      updateEmployee(employeeId, { status: newStatus });
      return newStatus;
    },
    [users, updateEmployee]
  );

  // Change Demo Password
  const changeEmployeePassword = useCallback(
    (employeeId, newPlainPassword) => {
      updateEmployee(employeeId, { password: newPlainPassword });
    },
    [updateEmployee]
  );

  // Reusable Permission Checker
  const hasPermission = useCallback(
    (moduleName, action = 'view') => {
      if (!currentUser) return false;
      // Inactive employee has zero access
      if (currentUser.status === EMPLOYEE_STATUS.INACTIVE) return false;
      // Administrator has full bypass access
      if (currentUser.role === USER_ROLES.ADMIN) return true;
      // Check employee's specific permission matrix
      return Boolean(currentUser.permissions?.[moduleName]?.[action]);
    },
    [currentUser]
  );

  const resetToDemoEmployees = useCallback(() => {
    setUsers(INITIAL_USERS);
    storage.set(STORAGE_KEYS.EMPLOYEES, INITIAL_USERS);
    setCurrentUser(INITIAL_USERS[0]);
    storage.set(STORAGE_KEYS.AUTH_USER, INITIAL_USERS[0]);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated: Boolean(currentUser),
        users,
        employees: users, // alias for employee management
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
