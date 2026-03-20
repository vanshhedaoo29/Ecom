// src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import socket from '../socket';
import '../theme.css';

export default function Login() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('Please fill in all fields.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      socket.emit('register', { userId: user.id });
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{`
        .auth-root { min-height:100vh; display:grid; grid-template-columns:1fr 1fr; }
        .auth-visual {
          background: var(--black);
          display:flex; flex-direction:column; align-items:center; justify-content:center;
          gap:40px; position:relative; overflow:hidden; padding:60px;
        }
        .auth-visual::before {
          content:''; position:absolute;
          width:500px;height:500px; border:1px solid rgba(255,255,255,0.04);
          border-radius:50%; top:50%;left:50%; transform:translate(-50%,-50%);
        }
        .auth-visual::after {
          content:''; position:absolute;
          width:300px;height:300px; border:1px solid rgba(255,255,255,0.07);
          border-radius:50%; top:50%;left:50%; transform:translate(-50%,-50%);
        }
        .auth-logo {
          font-family:var(--font-display); font-size:52px; font-weight:300;
          letter-spacing:14px; text-transform:uppercase; color:var(--white); z-index:2;
        }
        .auth-tagline {
          font-size:10px; letter-spacing:4px; text-transform:uppercase;
          color:rgba(255,255,255,0.25); z-index:2;
        }
        .auth-features { display:flex; flex-direction:column; gap:18px; z-index:2; }
        .auth-feature {
          display:flex; align-items:center; gap:14px;
          color:rgba(255,255,255,0.4); font-size:12px; font-weight:300; letter-spacing:0.5px;
        }
        .auth-feature-line { width:20px; height:1px; background:rgba(255,255,255,0.2); flex-shrink:0; }
        .auth-panel {
          display:flex; flex-direction:column; justify-content:center;
          padding:80px 72px; background:var(--white);
        }
        .auth-panel-label {
          font-size:10px; letter-spacing:3px; text-transform:uppercase;
          color:var(--grey-400); margin-bottom:12px; display:block;
        }
        .auth-panel-title {
          font-family:var(--font-display); font-size:44px; font-weight:300;
          color:var(--black); line-height:1.08; margin-bottom:48px;
        }
        .auth-form { display:flex; flex-direction:column; gap:24px; }
        .auth-submit { margin-top:8px; width:100%; padding:16px; font-size:11px; letter-spacing:2px; }
        .auth-footer { margin-top:32px; font-size:12px; color:var(--grey-400); }
        .auth-footer a { color:var(--black); font-weight:500; border-bottom:1px solid var(--black); padding-bottom:1px; }
        @media(max-width:768px){.auth-root{grid-template-columns:1fr}.auth-visual{display:none}.auth-panel{padding:48px 28px}}
      `}</style>
      <div className="auth-root">
        <div className="auth-visual">
          <div className="auth-logo">Webon</div>
          <div className="auth-tagline">Live Shopping Redefined</div>
          <div className="auth-features">
            {['Watch sellers stream live','1-on-1 video with sellers','AR try-on technology','Instant secure checkout'].map(f=>(
              <div key={f} className="auth-feature"><div className="auth-feature-line"/>{f}</div>
            ))}
          </div>
        </div>
        <div className="auth-panel">
          <span className="auth-panel-label">Welcome back</span>
          <h1 className="auth-panel-title">Sign in to<br/>your account</h1>
          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="w-error">{error}</div>}
            <div className="w-form-group">
              <label className="w-label">Email Address</label>
              <input className="w-input" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange}/>
            </div>
            <div className="w-form-group">
              <label className="w-label">Password</label>
              <input className="w-input" type="password" name="password" placeholder="Your password" value={form.password} onChange={handleChange}/>
            </div>
            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? <span className="w-spinner"/> : 'Sign In'}
            </button>
          </form>
          <div className="auth-footer">New to Webon? <Link to="/register">Create an account</Link></div>
        </div>
      </div>
    </>
  );
}