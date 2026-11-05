import { ArrowRight, BookOpenCheck, ClipboardCheck, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="public-page">
      <header className="public-nav">
        <Link className="brand-lockup" to="/" aria-label="Verity home"><span className="brand-mark">V</span><span>verity</span></Link>
        <span className="sp" />
        <Link className="btn sec" to="/login">Sign in</Link>
        <Link className="btn" to="/register">Create student account <ArrowRight size={16} /></Link>
      </header>
      <main>
        <section className="hero">
          <div className="hero-copy">
            <p className="eyebrow">ASSESSMENT, MADE CLEAR</p>
            <h1>Examinations you can trust.</h1>
            <p className="lead">One calm, reliable workspace for creating examinations, supporting students and reviewing results.</p>
            <div className="hero-actions"><Link className="btn" to="/register">Get started <ArrowRight size={16} /></Link><Link className="btn sec" to="/login">Sign in to Verity</Link></div>
          </div>
          <div className="hero-art" aria-hidden="true">
            <div className="hero-graphic"><div className="hero-glyph">V</div><span className="hero-orbit one"><BookOpenCheck size={23} /></span><span className="hero-orbit two"><ShieldCheck size={22} /></span></div>
          </div>
        </section>
        <section className="feat" aria-label="Platform capabilities">
          <div><span className="feat-icon"><BookOpenCheck size={20} /></span><h3>Examinations in one place</h3><p className="sm mut">Create structured assessments with MCQ and written questions, marks and clear instructions.</p></div>
          <div><span className="feat-icon"><ClipboardCheck size={20} /></span><h3>A smoother student experience</h3><p className="sm mut">A focused exam workspace with clear progress, saved answers and a reliable timer.</p></div>
          <div><span className="feat-icon"><ShieldCheck size={20} /></span><h3>Transparent review</h3><p className="sm mut">Review recorded examination events and evaluate written work in context.</p></div>
        </section>
      </main>
      <footer className="public-footer"><span>© 2026 Verity</span><span>Assessment with clarity and care.</span></footer>
    </div>
  );
}
