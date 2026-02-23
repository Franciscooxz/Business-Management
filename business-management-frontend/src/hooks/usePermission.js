import useAuthStore from '../store/authStore';

/**
 * Hook para verificar permisos del usuario autenticado.
 *
 * Uso:
 *   const { can, canAny, isAdmin } = usePermission();
 *   if (can('invoices.create')) { ... }
 *   if (canAny(['invoices.create', 'invoices.edit'])) { ... }
 */
export function usePermission() {
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);

  const isSuperAdmin = user?.roles?.includes('super_admin') ?? false;
  const isAdmin = isSuperAdmin || user?.role === 'admin' || user?.roles?.includes('admin');

  const can = (permission) => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return permissions.includes(permission);
  };

  const canAny = (permissionList) => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return permissionList.some((p) => permissions.includes(p));
  };

  const canAll = (permissionList) => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return permissionList.every((p) => permissions.includes(p));
  };

  return { can, canAny, canAll, isAdmin, isSuperAdmin };
}

export default usePermission;
