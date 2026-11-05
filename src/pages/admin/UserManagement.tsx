/** UserManagement.tsx – Administrator User Accounts */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import { DashboardLayout } from '../../layouts/DashboardLayout';
import { Badge } from '../../components/common/Badge';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { UserForm } from '../../components/forms/UserForm';
import { Toast } from '../../components/common/Toast';
import { useToast } from '../../hooks/useToast';
import type { User, UserRole } from '../../types/user';
import type { UserInvitation } from '../../types/api';

const ROLES: UserRole[] = ['Student', 'Examiner', 'Administrator'];

export function UserManagement() {
  const { users, createUser, updateUser, setUserActive, isLoading, error } = useApp();
  const { message, toast } = useToast();

  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [toggleActiveUser, setToggleActiveUser] = useState<User | null>(null);
  const [createdInvitation, setCreatedInvitation] = useState<UserInvitation | null>(null);
  const [copiedInvitation, setCopiedInvitation] = useState(false);

  const filteredUsers = users.filter((u) => {
    const matchesQuery =
      u.name.toLowerCase().includes(query.toLowerCase()) ||
      u.email.toLowerCase().includes(query.toLowerCase());
    const matchesRole = !roleFilter || u.role === roleFilter;
    return matchesQuery && matchesRole;
  });

  async function handleSave(data: Pick<User, 'name' | 'email' | 'role'>) {
    // Check for duplicate email
    const duplicate = users.find(
      (u) =>
        u.email.toLowerCase() === data.email.toLowerCase() &&
        u.id !== editingUser?.id,
    );
    if (duplicate) {
      toast('A user with this email address already exists');
      return;
    }

    try {
      if (editingUser) {
        await updateUser(editingUser.id, data);
        setEditingUser(null);
        toast('User updated');
      } else {
        const invitation = await createUser(data);
        setCreatedInvitation(invitation);
        setCopiedInvitation(false);
        setIsCreating(false);
        toast('Invitation created');
      }
    } catch {
      toast('Failed to save user');
    }
  }

  async function handleToggleActive() {
    if (toggleActiveUser) {
      const nextActive = !toggleActiveUser.active;
      try {
        await setUserActive(toggleActiveUser.id, nextActive);
        setToggleActiveUser(null);
        toast(`User ${nextActive ? 'activated' : 'deactivated'}`);
      } catch {
        toast('Failed to update user status');
      }
    }
  }

  async function copyInvitationLink() {
    if (!createdInvitation) return;
    const setupUrl = new URL(`/accept-invitation?token=${encodeURIComponent(createdInvitation.token)}`, window.location.origin).toString();
    try {
      await navigator.clipboard.writeText(setupUrl);
      setCopiedInvitation(true);
      toast('Invitation setup link copied');
    } catch {
      toast('Could not copy the invitation link. Select and copy the link shown here.');
    }
  }

  return (
    <DashboardLayout title="Users">
      {error && (
        <div className="err" role="alert" style={{ marginBottom: '1rem' }}>
          {error}
        </div>
      )}

      <div className="bar">
        <input
          placeholder="Search users"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search users"
        />
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          aria-label="Filter by role"
        >
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <span className="sp" />
        <button className="btn" onClick={() => setIsCreating(true)}>
          Add user
        </button>
      </div>

      {createdInvitation && (
        <div className="alert alert-info" role="status">
          Invitation for {createdInvitation.email} expires {new Date(createdInvitation.expiresAt).toLocaleString()}.
          Share this one-time setup token with the invitee; it will only be shown here once.
          <p><Link className="invitation-link" to={`/accept-invitation?token=${encodeURIComponent(createdInvitation.token)}`}>Open account setup</Link></p>
          <p><code>{createdInvitation.token}</code></p>
          <button className="btn sec sm2 copy-invitation" onClick={() => void copyInvitationLink()}>{copiedInvitation ? 'Link copied' : 'Copy setup link'}</button>
          <button className="btn sec sm2" onClick={() => setCreatedInvitation(null)}>Dismiss</button>
        </div>
      )}

      <div className="tw">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="mut">
                  Loading users…
                </td>
              </tr>
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="mut">
                  {error ? 'Unable to load users.' : 'No users match your criteria.'}
                </td>
              </tr>
            ) : (
              filteredUsers.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
                  <td>{u.email}</td>
                  <td>{u.role}</td>
                  <td>
                    <Badge
                      label={u.active ? 'Active' : 'Inactive'}
                      colorKey={u.active ? 'Active_user' : 'Inactive'}
                    />
                  </td>
                  <td>
                    <div className="row">
                      <button
                        className="btn sec sm2"
                        onClick={() => setEditingUser(u)}
                      >
                        Edit
                      </button>
                      <button
                        className="status-toggle"
                        type="button"
                        role="switch"
                        aria-checked={u.active}
                        aria-label={`${u.active ? 'Deactivate' : 'Activate'} ${u.name}`}
                        onClick={() => setToggleActiveUser(u)}
                      >
                        <span aria-hidden="true" className="status-toggle-track"><i /></span>
                        <span>{u.active ? 'Active' : 'Inactive'}</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Modal */}
      {(isCreating || editingUser) && (
        <UserForm
          user={editingUser ?? undefined}
          onSave={handleSave}
          onCancel={() => {
            setIsCreating(false);
            setEditingUser(null);
          }}
        />
      )}

      {/* Confirm Deactivate / Activate */}
      {toggleActiveUser && (
        <ConfirmDialog
          title={`${toggleActiveUser.active ? 'Deactivate' : 'Activate'} User`}
          message={`${toggleActiveUser.active ? 'Deactivate' : 'Activate'} ${toggleActiveUser.name}?`}
          confirmLabel={toggleActiveUser.active ? 'Deactivate' : 'Activate'}
          danger={toggleActiveUser.active}
          onConfirm={handleToggleActive}
          onCancel={() => setToggleActiveUser(null)}
        />
      )}

      <Toast message={message} />
    </DashboardLayout>
  );
}
