// src/pages/Profile.jsx
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import '../theme.css';

const css = `
  .profile-root { min-height:100vh; background:var(--grey-50); }
  .profile-body { max-width:800px; margin:0 auto; padding:48px 40px 80px; }
  .profile-page-title { font-family:var(--font-display); font-size:40px; font-weight:300; color:var(--black); margin-bottom:8px; }
  .profile-page-sub { font-size:12px; color:var(--grey-400); letter-spacing:1px; margin-bottom:48px; }

  .profile-card { background:var(--white); border:1px solid var(--grey-200); margin-bottom:24px; }
  .profile-card-header { padding:24px 32px; border-bottom:1px solid var(--grey-200); }
  .profile-card-title { font-size:11px; letter-spacing:3px; text-transform:uppercase; color:var(--black); font-weight:500; }
  .profile-card-body { padding:32px; }

  /* AVATAR */
  .avatar-section { display:flex; align-items:center; gap:32px; }
  .avatar-circle {
    width:88px; height:88px; border-radius:50%; background:var(--black);
    display:flex; align-items:center; justify-content:center;
    font-family:var(--font-display); font-size:36px; color:var(--white); font-weight:300;
    overflow:hidden; flex-shrink:0; cursor:pointer; position:relative;
  }
  .avatar-circle img { width:100%; height:100%; object-fit:cover; }
  .avatar-overlay {
    position:absolute; inset:0; background:rgba(0,0,0,0.5);
    display:flex; align-items:center; justify-content:center;
    opacity:0; transition:opacity var(--transition); border-radius:50%;
    font-size:11px; color:var(--white); letter-spacing:1px; text-align:center;
  }
  .avatar-circle:hover .avatar-overlay { opacity:1; }
  .avatar-info h3 { font-family:var(--font-display); font-size:24px; font-weight:300; margin-bottom:4px; }
  .avatar-info p { font-size:12px; color:var(--grey-400); }
  .avatar-upload-note { font-size:11px; color:var(--grey-300); margin-top:8px; }

  /* FORM */
  .profile-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; }
  .profile-form-full { grid-column:1/-1; }
  .profile-actions { display:flex; align-items:center; gap:16px; margin-top:32px; }
  .save-btn { padding:14px 40px; font-size:11px; letter-spacing:2px; }
  .save-msg { font-size:12px; color:#16a34a; letter-spacing:0.5px; }

  /* STATS */
  .stats-row { display:grid; grid-template-columns:repeat(3,1fr); gap:1px; background:var(--grey-200); }
  .stat-box { background:var(--white); padding:28px 24px; text-align:center; cursor:pointer; transition:background var(--transition); }
  .stat-box:hover { background:var(--grey-50); }
  .stat-val { font-family:var(--font-display); font-size:36px; font-weight:300; color:var(--black); margin-bottom:4px; }
  .stat-lbl { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--grey-400); }

  /* DANGER */
  .danger-section { display:flex; align-items:center; justify-content:space-between; }
  .danger-info h4 { font-size:14px; font-weight:500; margin-bottom:4px; }
  .danger-info p { font-size:12px; color:var(--grey-400); font-weight:300; }
  .danger-btn {
    padding:11px 24px; background:none; border:1px solid #dc2626;
    color:#dc2626; font-family:var(--font-body); font-size:11px; letter-spacing:1px;
    cursor:pointer; transition:all var(--transition);
  }
  .danger-btn:hover { background:#dc2626; color:var(--white); }

  @media(max-width:768px){
    .profile-body{padding:32px 20px 60px}
    .profile-form-grid{grid-template-columns:1fr}
    .stats-row{grid-template-columns:1fr 1fr}
    .avatar-section{flex-direction:column;align-items:flex-start}
  }
`;

export default function Profile() {
  const navigate = useNavigate();
  const fileRef = useRef(null);
  const [user, setUser] = useState(null);
  const [form, setForm] = useState({ name:'', phone:'' });
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const u = JSON.parse(localStorage.getItem('user')||'{}');
    setUser(u);
    setForm({ name:u.name||'', phone:u.phone||'' });
    setAvatarUrl(u.avatar_url||'');
    api.get('/auth/me').then(r => {
      const fresh = r.data.user;
      setUser(fresh);
      setForm({ name:fresh.name||'', phone:fresh.phone||'' });
      setAvatarUrl(fresh.avatar_url||'');
      localStorage.setItem('user', JSON.stringify(fresh));
    }).catch(()=>{});
    api.get('/orders').then(r=>setOrders(r.data.orders||[])).catch(()=>{});
  }, []);

  const handleChange = e => setForm(f=>({...f,[e.target.name]:e.target.value}));

  const handleSave = async () => {
    setLoading(true); setSaved(false);
    try {
      const res = await api.put('/auth/profile', { name:form.name, phone:form.phone });
      const updated = { ...user, ...res.data.user, name:form.name, phone:form.phone };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
      setSaved(true);
      setTimeout(()=>setSaved(false), 3000);
    } catch(e) { alert('Failed to save. Please try again.'); }
    finally { setLoading(false); }
  };

  const handleAvatarClick = () => fileRef.current?.click();

  const handleAvatarChange = async e => {
    const file = e.target.files[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('avatar', file);
    try {
      const res = await api.post('/upload/avatar', fd, { headers:{'Content-Type':'multipart/form-data'} });
      const url = res.data.url;
      setAvatarUrl(url);
      await api.put('/auth/profile', { avatar_url:url });
      const updated = { ...user, avatar_url:url };
      localStorage.setItem('user', JSON.stringify(updated));
      setUser(updated);
    } catch { alert('Avatar upload failed.'); }
  };

  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); };

  if (!user) return null;

  return (
    <>
      <style>{css}</style>
      <div className="profile-root">
        <nav className="w-nav">
          <div className="w-nav-logo" onClick={()=>navigate('/')} style={{cursor:'pointer'}}>Webon</div>
          <div className="w-nav-links">
            <button className="w-nav-link" onClick={()=>navigate('/')}>Home</button>
            <button className="w-nav-link" onClick={()=>navigate('/orders')}>Orders</button>
            <button className="w-nav-link" onClick={()=>navigate('/wishlist')}>Wishlist</button>
            <button className="w-nav-link" onClick={()=>navigate('/cart')}>Cart</button>
          </div>
        </nav>

        <div className="profile-body">
          <h1 className="profile-page-title">My Account</h1>
          <p className="profile-page-sub">Manage your profile, orders and preferences</p>

          {/* STATS */}
          <div className="profile-card" style={{marginBottom:24}}>
            <div className="stats-row">
              <div className="stat-box" onClick={()=>navigate('/orders')}>
                <div className="stat-val">{orders.length}</div>
                <div className="stat-lbl">Orders</div>
              </div>
              <div className="stat-box" onClick={()=>navigate('/wishlist')}>
                <div className="stat-val">0</div>
                <div className="stat-lbl">Wishlist</div>
              </div>
              <div className="stat-box" onClick={()=>navigate('/cart')}>
                <div className="stat-val">—</div>
                <div className="stat-lbl">Cart</div>
              </div>
            </div>
          </div>

          {/* AVATAR + NAME */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title">Profile Photo</div>
            </div>
            <div className="profile-card-body">
              <div className="avatar-section">
                <div className="avatar-circle" onClick={handleAvatarClick}>
                  {avatarUrl ? <img src={avatarUrl} alt="avatar"/> : (user.name?.[0]?.toUpperCase()||'U')}
                  <div className="avatar-overlay">Change</div>
                </div>
                <input ref={fileRef} type="file" accept="image/*" style={{display:'none'}} onChange={handleAvatarChange}/>
                <div className="avatar-info">
                  <h3>{user.name}</h3>
                  <p>{user.email}</p>
                  <div className="avatar-upload-note">Click photo to upload new image</div>
                </div>
              </div>
            </div>
          </div>

          {/* EDIT FORM */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title">Personal Information</div>
            </div>
            <div className="profile-card-body">
              <div className="profile-form-grid">
                <div className="w-form-group">
                  <label className="w-label">Full Name</label>
                  <input className="w-input" name="name" value={form.name} onChange={handleChange} placeholder="Your full name"/>
                </div>
                <div className="w-form-group">
                  <label className="w-label">Phone Number</label>
                  <input className="w-input" name="phone" value={form.phone} onChange={handleChange} placeholder="+91 XXXXX XXXXX"/>
                </div>
                <div className="w-form-group profile-form-full">
                  <label className="w-label">Email Address</label>
                  <input className="w-input" value={user.email||''} disabled style={{opacity:0.5,cursor:'not-allowed'}}/>
                </div>
              </div>
              <div className="profile-actions">
                <button className="btn-primary save-btn" onClick={handleSave} disabled={loading}>
                  {loading ? <span className="w-spinner"/> : 'Save Changes'}
                </button>
                {saved && <span className="save-msg">✓ Saved successfully</span>}
              </div>
            </div>
          </div>

          {/* DANGER ZONE */}
          <div className="profile-card">
            <div className="profile-card-header">
              <div className="profile-card-title">Account</div>
            </div>
            <div className="profile-card-body">
              <div className="danger-section">
                <div className="danger-info">
                  <h4>Sign out</h4>
                  <p>You will be logged out of your account on this device.</p>
                </div>
                <button className="danger-btn" onClick={handleLogout}>Sign Out</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
