import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

function dashboardPath(role: 'Student' | 'Examiner' | 'Administrator'): string {
  if (role === 'Student') return '/student/dashboard';
  if (role === 'Examiner') return '/examiner/dashboard';
  return '/admin/dashboard';
}

export function LoginPage() {
  const { login, isLoading } = useApp();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  async function handleLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      const user = await login(email.trim(), password);
      navigate(dashboardPath(user.role));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed. Please try again.');
    }
  }

  return (
    <main className="auth-page">
      <Link className="brand-lockup" to="/" aria-label="Verity home"><span className="brand-mark">V</span><span>verity</span></Link>
      <section className="auth-card">
        <p className="eyebrow">WELCOME BACK</p>
        <h1>Sign in to Verity</h1>
        <p className="mut">Continue to your examination workspace.</p>
        <form onSubmit={handleLogin}>
          <label htmlFor="em">Email address</label>
          <input id="em" type="email" value={email} autoComplete="username" onChange={(event) => setEmail(event.target.value)} required />
          <label htmlFor="pw">Password</label>
          <div className="pw"><input id="pw" type={showPw ? 'text' : 'password'} value={password} autoComplete="current-password" onChange={(event) => setPassword(event.target.value)} required />
            <button type="button" onClick={() => setShowPw((value) => !value)} aria-label={showPw ? 'Hide password' : 'Show password'}>{showPw ? 'Hide' : 'Show'}</button>
          </div>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <button className="btn auth-submit" disabled={isLoading}>{isLoading ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="auth-footer">New to Verity? <Link to="/register">Create a student account</Link></p>
        <p className="auth-footer"><Link to="/accept-invitation">Have an invitation? Set up your account</Link></p>
      </section>
      <p className="auth-legal">Your role and access are determined by your account.</p>
    </main>
  );
}
