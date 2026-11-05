import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export function RegisterPage() {
  const { register, isLoading } = useApp();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleRegister(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    try {
      await register(name.trim(), email.trim(), password);
      navigate('/student/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account.');
    }
  }

  return (
    <main className="auth-page">
      <Link className="brand-lockup" to="/" aria-label="Verity home"><span className="brand-mark">V</span><span>verity</span></Link>
      <section className="auth-card">
        <p className="eyebrow">STUDENT ACCOUNT</p>
        <h1>Create your account</h1>
        <p className="mut">Register to view and take available examinations.</p>
        <form onSubmit={handleRegister}>
          <label htmlFor="register-name">Full name</label>
          <input id="register-name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={160} />
          <label htmlFor="register-email">Email address</label>
          <input id="register-email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required maxLength={320} />
          <label htmlFor="register-password">Password</label>
          <input id="register-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={128} required />
          <p className="field-hint">Use at least 8 characters.</p>
          {error && <div className="alert alert-error" role="alert">{error}</div>}
          <button className="btn auth-submit" disabled={isLoading}>{isLoading ? 'Creating account…' : 'Create student account'}</button>
        </form>
        <p className="auth-footer">Already registered? <Link to="/login">Sign in</Link></p>
      </section>
      <p className="auth-legal">By creating an account, you agree to follow the instructions provided for each examination.</p>
    </main>
  );
}
