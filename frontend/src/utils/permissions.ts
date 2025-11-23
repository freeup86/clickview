/**
 * Permission Utilities
 *
 * Helper functions for checking and managing dashboard permissions
 */

export type PermissionRole = 'viewer' | 'editor' | 'admin' | 'owner';

export interface UserPermission {
  role: PermissionRole;
  userId: string;
  dashboardId: string;
}

/**
 * Permission hierarchy (higher roles include all lower permissions)
 */
const ROLE_HIERARCHY: Record<PermissionRole, number> = {
  viewer: 1,
  editor: 2,
  admin: 3,
  owner: 4,
};

/**
 * Check if user has at least the specified role
 */
export function hasPermission(
  userRole: PermissionRole,
  requiredRole: PermissionRole
): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Check if user can view dashboard
 */
export function canView(role: PermissionRole): boolean {
  return hasPermission(role, 'viewer');
}

/**
 * Check if user can edit dashboard
 */
export function canEdit(role: PermissionRole): boolean {
  return hasPermission(role, 'editor');
}

/**
 * Check if user can manage dashboard settings
 */
export function canManageSettings(role: PermissionRole): boolean {
  return hasPermission(role, 'admin');
}

/**
 * Check if user can manage permissions
 */
export function canManagePermissions(role: PermissionRole): boolean {
  return hasPermission(role, 'admin');
}

/**
 * Check if user can delete dashboard
 */
export function canDelete(role: PermissionRole): boolean {
  return hasPermission(role, 'admin');
}

/**
 * Check if user is owner
 */
export function isOwner(role: PermissionRole): boolean {
  return role === 'owner';
}

/**
 * Get available actions for a role
 */
export function getAvailableActions(role: PermissionRole): string[] {
  const actions: string[] = [];

  if (canView(role)) {
    actions.push('view', 'export', 'refresh');
  }

  if (canEdit(role)) {
    actions.push('edit_widgets', 'add_widgets', 'remove_widgets', 'edit_filters');
  }

  if (canManageSettings(role)) {
    actions.push('edit_settings', 'share', 'manage_permissions');
  }

  if (canDelete(role)) {
    actions.push('delete');
  }

  if (isOwner(role)) {
    actions.push('transfer_ownership');
  }

  return actions;
}

/**
 * Get role display info
 */
export function getRoleInfo(role: PermissionRole): {
  label: string;
  description: string;
  icon: string;
  color: string;
} {
  switch (role) {
    case 'viewer':
      return {
        label: 'Viewer',
        description: 'Can view dashboard',
        icon: '👁️',
        color: 'blue',
      };
    case 'editor':
      return {
        label: 'Editor',
        description: 'Can view and edit',
        icon: '✏️',
        color: 'green',
      };
    case 'admin':
      return {
        label: 'Admin',
        description: 'Full control',
        icon: '👑',
        color: 'purple',
      };
    case 'owner':
      return {
        label: 'Owner',
        description: 'Dashboard owner',
        icon: '⭐',
        color: 'yellow',
      };
  }
}

/**
 * Validate password strength for protected shares
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 6) {
    errors.push('Password must be at least 6 characters');
  }

  if (password.length > 128) {
    errors.push('Password must be less than 128 characters');
  }

  // Optional: Add more complexity requirements
  // if (!/[A-Z]/.test(password)) {
  //   errors.push('Password must contain at least one uppercase letter');
  // }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate share token (client-side helper)
 */
export function generateShareToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

/**
 * Check if share link is expired
 */
export function isShareLinkExpired(expiresAt: string | null): boolean {
  if (!expiresAt) return false;
  return new Date(expiresAt) < new Date();
}

/**
 * Format permission for display
 */
export function formatPermissionDisplay(permission: {
  role: PermissionRole;
  userName?: string;
  teamName?: string;
}): string {
  const roleInfo = getRoleInfo(permission.role);
  const name = permission.userName || permission.teamName || 'Unknown';
  return `${name} - ${roleInfo.label}`;
}
