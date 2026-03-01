import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/Card';
import { useToast } from '@/store/toast-store';
import { useAppStore } from '@/store/app-store';
import { useRoleGate } from '@/hooks/useRoleGate';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const ROLES = ['super_admin', 'admin', 'plant_head', 'manager', 'supervisor', 'view_only'] as const;
const ROLE_COLORS: Record<string, string> = {
  super_admin: 'var(--status-critical)',
  admin: 'var(--status-danger)',
  plant_head: 'var(--status-warning)',
  manager: 'var(--accent-cyan)',
  supervisor: '#3b82f6',
  view_only: 'var(--text-dim)',
};

interface AppUser {
  id: string;
  username: string;
  full_name: string;
  role: string;
  email: string | null;
  phone: string | null;
  is_active: number;
  last_login_at: string | null;
  created_at: string;
}

export function UserManagement() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState<AppUser | null>(null);
  const { canAccess } = useRoleGate();
  const { toast } = useToast();
  const currentUser = useAppStore((s) => s.currentUser);
  const organization = useAppStore((s) => s.organization);

  const load = useCallback(async () => {
    const orgId = organization?.id;
    if (!orgId) return;
    const list = (await window.advancesafe?.admin?.users?.getAll?.(orgId)) ?? [];
    setUsers(list as AppUser[]);
    setLoading(false);
  }, [organization?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const handleUpdateRole = async (userId: string, newRole: string) => {
    if (!currentUser?.id || userId === currentUser.id) return;
    const result = await window.advancesafe?.admin?.users?.updateRole?.({ userId, newRole, updatedBy: currentUser.id });
    if (result?.success) {
      toast.success('Role updated');
      load();
    } else {
      toast.error(result?.error ?? 'Update failed');
    }
  };

  const handleDeactivate = async (user: AppUser) => {
    if (!currentUser?.id || user.id === currentUser.id) return;
    const result = await window.advancesafe?.admin?.users?.deactivate?.({ userId: user.id, deactivatedBy: currentUser.id });
    if (result?.success) {
      toast.success('User deactivated');
      setConfirmDeactivate(null);
      load();
    } else {
      toast.error(result?.error ?? 'Failed');
    }
  };

  const handleActivate = async (user: AppUser) => {
    if (!currentUser?.id) return;
    await window.advancesafe?.admin?.users?.activate?.({ userId: user.id, activatedBy: currentUser.id });
    toast.success('User activated');
    load();
  };

  if (!canAccess('admin')) {
    return <p className="font-mono text-sm text-[var(--text-dim)]">You do not have permission to manage users.</p>;
  }

  if (loading) return <LoadingSpinner size="md" center />;

  return (
    <Card>
      <div className="flex items-center justify-between">
        <h2 className="font-rajdhani text-lg font-bold text-[var(--text-primary)]">USERS & ROLES</h2>
        <button type="button" onClick={() => setAddOpen(true)} className="rounded bg-[var(--accent-cyan)] px-3 py-1.5 font-mono text-sm font-medium text-[var(--bg-primary)]">Add user</button>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse font-mono text-xs">
          <thead>
            <tr className="border-b border-[var(--border-default)] text-left text-[var(--text-dim)]">
              <th className="py-2 pr-2">Name</th>
              <th className="py-2 pr-2">Username</th>
              <th className="py-2 pr-2">Role</th>
              <th className="py-2 pr-2">Status</th>
              <th className="py-2 pr-2">Last login</th>
              <th className="py-2 pr-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-[var(--border-default)]">
                <td className="py-2 pr-2 text-[var(--text-primary)]">{u.full_name}</td>
                <td className="py-2 pr-2 text-[var(--text-secondary)]">{u.username}</td>
                <td className="py-2 pr-2">
                  <span className="rounded px-1.5 py-0.5 font-semibold" style={{ color: ROLE_COLORS[u.role] ?? 'var(--text-dim)' }}>{u.role}</span>
                </td>
                <td className="py-2 pr-2">{u.is_active ? 'Active' : 'Inactive'}</td>
                <td className="py-2 pr-2 text-[var(--text-dim)]">{u.last_login_at ? new Date(u.last_login_at).toLocaleString() : '—'}</td>
                <td className="py-2 pr-2">
                  {u.id !== currentUser?.id && (
                    <>
                      <select value={u.role} onChange={(e) => handleUpdateRole(u.id, e.target.value)} className="mr-1 rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-1 py-0.5 text-[var(--text-primary)]">
                        {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                      </select>
                      {u.is_active ? (
                        <button type="button" onClick={() => setConfirmDeactivate(u)} className="text-[var(--status-critical)]">Deactivate</button>
                      ) : (
                        <button type="button" onClick={() => handleActivate(u)} className="text-[var(--accent-cyan)]">Activate</button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {users.length === 0 && <p className="mt-2 font-mono text-sm text-[var(--text-dim)]">No users yet.</p>}

      <ConfirmDialog open={!!confirmDeactivate} title="Deactivate user" message={confirmDeactivate ? `Deactivate ${confirmDeactivate.full_name}? They will not be able to sign in.` : ''} onConfirm={() => confirmDeactivate && handleDeactivate(confirmDeactivate)} onCancel={() => setConfirmDeactivate(null)} />

      {addOpen && <AddUserModal orgId={organization?.id ?? ''} currentUserId={currentUser?.id ?? ''} onClose={() => { setAddOpen(false); load(); }} />}
    </Card>
  );
}

function AddUserModal({ orgId, currentUserId, onClose }: { orgId: string; currentUserId: string; onClose: () => void }) {
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [role, setRole] = useState('view_only');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!username.trim() || !fullName.trim() || !password) {
      toast.error('Fill required fields');
      return;
    }
    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    setSaving(true);
    try {
      const result = await window.advancesafe?.admin?.users?.create?.({
        organizationId: orgId,
        fullName: fullName.trim(),
        username: username.trim(),
        role,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        password,
        createdBy: currentUserId,
      });
      if (result?.success) {
        toast.success('User created');
        onClose();
      } else {
        toast.error(result?.error ?? 'Create failed');
      }
    } catch {
      toast.error('Create failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
        <h3 className="font-rajdhani text-lg font-bold text-[var(--text-primary)]">Add user</h3>
        <div className="mt-3 space-y-2">
          <div>
            <label className="font-mono text-[10px] text-[var(--text-secondary)]">Full name *</label>
            <input value={fullName} onChange={(e) => setFullName(e.target.value)} maxLength={100} className="mt-0.5 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]" />
          </div>
          <div>
            <label className="font-mono text-[10px] text-[var(--text-secondary)]">Username * (alphanumeric + _)</label>
            <input value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} maxLength={50} className="mt-0.5 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]" />
          </div>
          <div>
            <label className="font-mono text-[10px] text-[var(--text-secondary)]">Role</label>
            <select value={role} onChange={(e) => setRole(e.target.value)} className="mt-0.5 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]">
              {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="font-mono text-[10px] text-[var(--text-secondary)]">Email</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-0.5 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]" />
          </div>
          <div>
            <label className="font-mono text-[10px] text-[var(--text-secondary)]">Phone</label>
            <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))} className="mt-0.5 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]" />
          </div>
          <div>
            <label className="font-mono text-[10px] text-[var(--text-secondary)]">Password * (min 8 chars, 1 upper, 1 number, 1 special)</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-0.5 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]" />
          </div>
          <div>
            <label className="font-mono text-[10px] text-[var(--text-secondary)]">Confirm password</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-0.5 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]" />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded border border-[var(--border-default)] px-3 py-1.5 font-mono text-sm text-[var(--text-secondary)]">Cancel</button>
          <button type="button" onClick={handleCreate} disabled={saving} className="rounded bg-[var(--accent-cyan)] px-3 py-1.5 font-mono text-sm font-medium text-[var(--bg-primary)] disabled:opacity-50">Create user</button>
        </div>
      </div>
    </div>
  );
}
