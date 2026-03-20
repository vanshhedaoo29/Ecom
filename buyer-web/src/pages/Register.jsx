// src/pages/Register.jsx
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import socket from '../socket';
import '../theme.css';

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name:'', email:'', password:'', confirmPassword:'' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => { setForm({...form,[e.target.name]:e.target.value}); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name||!form.email||!form.password) { setError('Please fill in all fields.'); return; }
    if (form.password.length<6) { setError('Password must be at least 6 characters.'); return; }
    if (form.password!==form.confirmPassword) { setError('Passwords do not match.'); return; }
    setLoading(true);
    try {
      const res = await api.post('/auth/register',{ name:form.name, email:form.email, password:form.password, role:'buyer' });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      socket.emit('register',{ userId:user.id });
      navigate('/');
    } catch(err) {
      setError(err.response?.data?.message||'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <>
      <style>{`
        .auth-root{min-height:100vh;display:grid;grid-template-columns:1fr 1fr;}
        .auth-visual{background:var(--black);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:40px;position:relative;overflow:hidden;padding:60px;}
        .auth-visual::before{content:'';position:absolute;width:500px;height:500px;border:1px solid rgba(255,255,255,0.04);border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%);}
        .auth-visual::after{content:'';position:absolute;width:300px;height:300px;border:1px solid rgba(255,255,255,0.07);border-radius:50%;top:50%;left:50%;transform:translate(-50%,-50%);}
        .auth-logo{font-family:var(--font-display);font-size:52px;font-weight:300;letter-spacing:14px;text-transform:uppercase;color:var(--white);z-index:2;}
        .auth-tagline{font-size:10px;letter-spacing:4px;text-transform:uppercase;color:rgba(255,255,255,0.25);z-index:2;}
        .auth-features{display:flex;flex-direction:column;gap:18px;z-index:2;}
        .auth-feature{display:flex;align-items:center;gap:14px;color:rgba(255,255,255,0.4);font-size:12px;font-weight:300;}
        .auth-feature-line{width:20px;height:1px;background:rgba(255,255,255,0.2);flex-shrink:0;}
        .auth-panel{display:flex;flex-direction:column;justify-content:center;padding:60px 72px;background:var(--white);overflow-y:auto;}
        .auth-panel-label{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:var(--grey-400);margin-bottom:12px;display:block;}
        .auth-panel-title{font-family:var(--font-display);font-size:42px;font-weight:300;color:var(--black);line-height:1.08;margin-bottom:40px;}
        .auth-form{display:flex;flex-direction:column;gap:20px;}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:16px;}
        .auth-submit{margin-top:8px;width:100%;padding:16px;font-size:11px;letter-spacing:2px;}
        .auth-footer{margin-top:24px;font-size:12px;color:var(--grey-400);}
        .auth-footer a{color:var(--black);font-weight:500;border-bottom:1px solid var(--black);padding-bottom:1px;}
        .auth-terms{margin-top:16px;font-size:11px;color:var(--grey-300);letter-spacing:0.3px;}
        @media(max-width:768px){.auth-root{grid-template-columns:1fr}.auth-visual{display:none}.auth-panel{padding:48px 28px}.form-row{grid-template-columns:1fr}}
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
          <span className="auth-panel-label">Join Webon</span>
          <h1 className="auth-panel-title">Create your<br/>account</h1>
          <form className="auth-form" onSubmit={handleSubmit}>
            {error && <div className="w-error">{error}</div>}
            <div className="w-form-group">
              <label className="w-label">Full Name</label>
              <input className="w-input" type="text" name="name" placeholder="Your full name" value={form.name} onChange={handleChange}/>
            </div>
            <div className="w-form-group">
              <label className="w-label">Email Address</label>
              <input className="w-input" type="email" name="email" placeholder="you@example.com" value={form.email} onChange={handleChange}/>
            </div>
            <div className="form-row">
              <div className="w-form-group">
                <label className="w-label">Password</label>
                <input className="w-input" type="password" name="password" placeholder="Min. 6 chars" value={form.password} onChange={handleChange}/>
              </div>
              <div className="w-form-group">
                <label className="w-label">Confirm</label>
                <input className="w-input" type="password" name="confirmPassword" placeholder="Repeat" value={form.confirmPassword} onChange={handleChange}/>
              </div>
            </div>
            <button type="submit" className="btn-primary auth-submit" disabled={loading}>
              {loading ? <span className="w-spinner"/> : 'Create Account'}
            </button>
          </form>
          <div className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></div>
          <div className="auth-terms">By registering you agree to our Terms of Service and Privacy Policy.</div>
        </div>
      </div>
    </>
  );
}