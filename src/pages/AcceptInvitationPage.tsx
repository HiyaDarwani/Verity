import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '../context/AppContext';

function homeFor(role: string) {
  if (role === 'Student') return '/student/dashboard';
  if (role === 'Examiner') return '/examiner/dashboard';
  return '/admin/dashboard';
}

export function AcceptInvitationPage() {
  const [params] = useSearchParams();
  const { acceptInvitation, isLoading } = useApp();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const token = params.get('token') ?? '';

  async function handleAccept(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const user = await acceptInvitation(token, password);
      navigate(homeFor(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'This invitation could not be accepted.');
    }
  }

  return (
    <main className="auth-page">
      <Link className="brand-lockup" to="/" aria-label="Verity home"><span className="brand-mark">V</span><span>verity</span></Link>
      <section className="auth-card">
        <p className="eyebrow">ACCOUNT INVITATION</p>
        <h1>Set up your account</h1>
        <p className="mut">Choose a password to accept your Verity invitation.</p>
        {!token ? <div className="alert alert-error" role="alert">The invitation link is missing its setup token.</div> : (
          <form onSubmit={handleAccept}>
            <label htmlFor="invite-password">New password</label>
            <input id="invite-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} required />
            <p className="field-hint">Use at least 8 characters. Invitation links can only be used once.</p>
            {error && <div className="alert alert-error" role="alert">{error}</div>}
            <button className="btn auth-submit" disabled={isLoading}>{isLoading ? 'Setting up account…' : 'Accept invitation'}</button>
          </form>
        )}
        <p className="auth-footer"><Link to="/login">Return to sign in</Link></p>
      </section>
    </main>
  );
}
