/** UserForm.tsx – add / edit user modal form */

import { useState } from 'react';
import type { User, UserRole } from '../../types/user';

interface Props {
  user?: User;
  onSave: (data: Pick<User, 'name' | 'email' | 'role'>) => void;
  onCancel: () => void;
}

const ROLES: UserRole[] = ['Student', 'Examiner', 'Administrator'];

export function UserForm({ user, onSave, onCancel }: Props) {
  const [name, setName] = useState(user?.name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [role, setRole] = useState<UserRole>(user?.role ?? 'Student');
  const [error, setError] = useState('');

  function handleSave() {
    if (!name.trim() || !/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a name and a valid email.');
      return;
    }
    setError('');
    onSave({ name: name.trim(), email: email.trim(), role });
  }

  return (
    <div className="ov" role="dialog" aria-modal="true" aria-labelledby="uf-title">
      <div className="dlg">
        <h3 id="uf-title">{user ? 'Edit user' : 'Add user'}</h3>

        <label htmlFor="un">Name</label>
        <input id="un" value={name} onChange={(e) => setName(e.target.value)} />

        <label htmlFor="um">Email</label>
        <input
          id="um"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <label htmlFor="ur">Role</label>
        <select
          id="ur"
          value={role}
          onChange={(e) => setRole(e.target.value as UserRole)}
        >
          {ROLES.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>

        {error && <p className="err" role="alert">{error}</p>}

        <div className="bar" style={{ justifyContent: 'flex-end', marginTop: '1rem' }}>
          <button className="btn sec" onClick={onCancel}>Cancel</button>
          <button className="btn" onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}
