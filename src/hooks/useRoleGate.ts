import { useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import type { AppRole } from '@/types';

const ROLE_ORDER: Record<string, number> = {
  super_admin: 0,
  admin: 1,
  plant_head: 2,
  manager: 3,
  supervisor: 4,
  view_only: 5,
};

function roleLevel(role: string): number {
  return ROLE_ORDER[role] ?? 99;
}

export function useRoleGate(): {
  canAccess: (minRole: AppRole | string) => boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  canManageUsers: boolean;
  canManageOrg: boolean;
  canManageDangerZone: boolean;
  role: string | null;
} {
  const currentUser = useAppStore((s) => s.currentUser);

  return useMemo(() => {
    const role = currentUser?.role ?? null;
    const level = role != null ? roleLevel(role) : 99;

    const canAccess = (minRole: AppRole | string): boolean => {
      if (!currentUser) return false;
      return level <= roleLevel(minRole);
    };

    return {
      canAccess,
      isSuperAdmin: role === 'super_admin',
      isAdmin: role !== null && level <= 1,
      canManageUsers: role !== null && level <= 1,
      canManageOrg: role !== null && level <= 2,
      canManageDangerZone: role === 'super_admin',
      role,
    };
  }, [currentUser]);
}
