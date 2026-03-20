// src/pages/Home.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import socket from '../socket';
import '../theme.css';

const CATEGORIES = ['All','Fashion','Electronics','Beauty','Home','Food','Sports'];

const css = `
  .home-hero {
    border-bottom: 1px solid var(--grey-200);
    padding: 64px 48px 48px;
    display: flex;
    flex-direction: column;
    gap: 32px;
  }
  .hero-top { display:flex; align-items:flex-end; justify-content:space-between; gap:32px; }
  .hero-title {
    font-family:var(--font-display); font-size:64px; font-weight:300;
    line-height:1; letter-spacing:-1px; color:var(--black);
  }
  .hero-title em { font-style:italic; }
  .hero-live-count {
    display:flex; align-items:center; gap:8px;
    font-size:11px; letter-spacing:2px; text-transform:uppercase;
    color:var(--grey-500); white-space:nowrap; margin-bottom:8px;
  }
  .hero-search-row {
    display:flex; align-items:center; gap:0;
    border:1px solid var(--black); max-width:480px;
  }
  .hero-search {
    flex:1; padding:13px 20px; border:none; outline:none;
    font-family:var(--font-body); font-size:13px; font-weight:300;
    background:var(--white); color:var(--black); letter-spacing:0.5px;
  }
  .hero-search::placeholder { color:var(--grey-300); }
  .search-btn {
    padding:13px 20px; background:var(--black); border:none; color:var(--white);
    font-size:12px; cursor:pointer; letter-spacing:1px; transition:background var(--transition);
  }
  .search-btn:hover { background:var(--grey-600); }
  .filter-bar {
    display:flex; align-items:center; gap:0;
    border-bottom:1px solid var(--grey-200);
    overflow-x:auto;
  }
  .filter-bar::-webkit-scrollbar { display:none; }
  .filter-chip {
    padding:16px 28px; background:none; border:none; border-bottom:2px solid transparent;
    font-family:var(--font-body); font-size:11px; letter-spacing:2px; text-transform:uppercase;
    font-weight:500; color:var(--grey-400); cursor:pointer; white-space:nowrap;
    transition:color var(--transition), border-color var(--transition);
  }
  .filter-chip:hover { color:var(--black); }
  .filter-chip.active { color:var(--black); border-bottom-color:var(--black); }

  /* SECTION */
  .home-section { padding:48px 48px 0; }
  .section-head { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:32px; }
  .section-title {
    font-family:var(--font-display); font-size:32px; font-weight:300;
    color:var(--black); display:flex; align-items:center; gap:12px;
  }
  .section-count { font-size:12px; color:var(--grey-400); letter-spacing:1px; }

  /* GRID */
  .shops-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:1px; background:var(--grey-200); margin-bottom:1px; }

  /* CARD */
  .shop-card {
    background:var(--white); cursor:pointer; overflow:hidden;
    transition:transform var(--transition);
    position:relative;
  }
  .shop-card:hover { z-index:2; }
  .shop-card:hover .card-img img { transform:scale(1.04); }
  .shop-card:hover .card-watch-btn { opacity:1; transform:translateY(0); }
  .card-img {
    position:relative; height:220px; overflow:hidden;
    background:var(--grey-100); display:flex; align-items:center; justify-content:center;
  }
  .card-img img { width:100%; height:100%; object-fit:cover; transition:transform 0.4s ease; }
  .card-img-placeholder { font-size:48px; color:var(--grey-300); }
  .card-live-badge {
    position:absolute; top:12px; left:12px;
  }
  .card-viewers {
    position:absolute; top:12px; right:12px;
    background:rgba(0,0,0,0.6); color:rgba(255,255,255,0.85);
    font-size:10px; letter-spacing:1px; padding:4px 8px; font-weight:500;
  }
  .card-watch-btn {
    position:absolute; bottom:0; left:0; right:0;
    background:var(--black); color:var(--white);
    padding:12px; text-align:center; font-size:10px; letter-spacing:2px;
    text-transform:uppercase; font-weight:500;
    opacity:0; transform:translateY(8px);
    transition:opacity 0.22s ease, transform 0.22s ease;
  }
  .shop-card.is-live .card-watch-btn { background:var(--live-red); }
  .card-body { padding:20px 20px 24px; }
  .card-name { font-family:var(--font-display); font-size:20px; font-weight:400; color:var(--black); margin-bottom:6px; }
  .card-meta { display:flex; align-items:center; justify-content:space-between; }
  .card-seller { font-size:12px; color:var(--grey-400); font-weight:300; }
  .card-cat {
    font-size:9px; letter-spacing:2px; text-transform:uppercase;
    color:var(--grey-400); font-weight:500; border:1px solid var(--grey-200); padding:3px 8px;
  }
  .card-city { font-size:11px; color:var(--grey-300); margin-top:8px; }

  /* SKELETON */
  .skel-card { background:var(--white); }
  .skel-img { height:220px; background:linear-gradient(90deg,var(--grey-100) 25%,var(--grey-200) 50%,var(--grey-100) 75%); background-size:200% 100%; animation:shimmer 1.6s infinite; }
  .skel-body { padding:20px; display:flex; flex-direction:column; gap:10px; }
  .skel-line { height:13px; border-radius:0; background:linear-gradient(90deg,var(--grey-100) 25%,var(--grey-200) 50%,var(--grey-100) 75%); background-size:200% 100%; animation:shimmer 1.6s infinite; }
  @keyframes shimmer { from{background-position:200% 0} to{background-position:-200% 0} }

  /* EMPTY */
  .home-empty { padding:80px 48px; text-align:center; }
  .home-empty h3 { font-family:var(--font-display); font-size:28px; font-weight:300; color:var(--grey-400); margin-bottom:8px; }
  .home-empty p { font-size:13px; color:var(--grey-300); }

  /* ERROR */
  .home-error { margin:0 48px 24px; padding:14px 20px; background:var(--white); border:1px solid #fecaca; color:#dc2626; font-size:13px; display:flex; align-items:center; justify-content:space-between; }
  .retry-btn { background:none; border:none; color:#dc2626; font-size:12px; cursor:pointer; letter-spacing:1px; text-decoration:underline; }

  @media(max-width:768px){
    .home-hero{padding:32px 20px 32px}
    .hero-title{font-size:40px}
    .home-section{padding:32px 20px 0}
    .filter-bar{padding:0 20px}
    .filter-chip{padding:14px 18px}
    .shops-grid{grid-template-columns:1fr 1fr}
  }
`;

function SkeletonCard() {
  return (
    <div className="skel-card">
      <div className="skel-img"/>
      <div className="skel-body">
        <div className="skel-line" style={{width:'60%'}}/>
        <div className="skel-line" style={{width:'40%',height:'10px'}}/>
      </div>
    </div>
  );
}

function ShopCard({ shop, onEnter }) {
  return (
    <div className={`shop-card ${shop.is_live?'is-live':''}`} onClick={()=>onEnter(shop)}>
      <div className="card-img">
        {shop.logo_url ? <img src={shop.logo_url} alt={shop.name}/> : <div className="card-img-placeholder">🛍</div>}
        {shop.is_live && <><div className="card-live-badge"><span className="live-pill"><span className="live-dot"/>Live</span></div>{shop.viewer_count!==undefined&&<div className="card-viewers">👁 {shop.viewer_count}</div>}</>}
        <div className="card-watch-btn">{shop.is_live?'Watch Live':'Browse Shop'}</div>
      </div>
      <div className="card-body">
        <div className="card-name">{shop.name}</div>
        <div className="card-meta">
          <div className="card-seller">{shop.seller_name||'Seller'}</div>
          {shop.category&&<div className="card-cat">{shop.category}</div>}
        </div>
        {shop.city&&<div className="card-city">{shop.city}</div>}
      </div>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const [shops, setShops] = useState([]);
  const [liveSessions, setLiveSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [search, setSearch] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    const u = localStorage.getItem('user');
    if (u) setUser(JSON.parse(u));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const [sr, lr] = await Promise.all([api.get('/shops'), api.get('/live')]);
      setShops(sr.data.shops||[]);
      setLiveSessions(lr.data.sessions||[]);
    } catch { setError('Could not load shops. Please check your connection.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchData(); const t=setInterval(fetchData,30000); return ()=>clearInterval(t); }, [fetchData]);

  useEffect(() => {
    socket.on('live_ended', ({liveSessionId}) => {
      setShops(p=>p.map(s=>s.live_session_id===liveSessionId?{...s,is_live:false}:s));
    });
    return ()=>socket.off('live_ended');
  }, []);

  const handleLogout = () => { localStorage.removeItem('token'); localStorage.removeItem('user'); navigate('/login'); };

  const handleEnterShop = (shop) => {
    if (shop.is_live) {
      const session = liveSessions.find(s=>s.shop_id===shop.id||s.shop_name===shop.name);
      if (session) { navigate(`/live/${session.id||session.agora_channel}`,{state:{shop,session}}); return; }
    }
    navigate(`/shop/${shop.id}`,{state:{shop}});
  };

  const filtered = shops.filter(s => {
    const matchCat = activeCategory==='All'||s.category?.toLowerCase()===activeCategory.toLowerCase();
    const matchSearch = !search||s.name?.toLowerCase().includes(search.toLowerCase())||s.seller_name?.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  const liveShops = filtered.filter(s=>s.is_live);
  const offlineShops = filtered.filter(s=>!s.is_live);

  return (
    <>
      <style>{css}</style>
      <div className="w-page">
        {/* NAV */}
        <nav className="w-nav">
          <div className="w-nav-logo">Webon</div>
          <div className="w-nav-links">
            {user ? (
              <>
                <button className="w-nav-link" onClick={()=>navigate('/wishlist')}>Wishlist</button>
                <button className="w-nav-link" onClick={()=>navigate('/orders')}>Orders</button>
                <button className="w-nav-link" onClick={()=>navigate('/profile')}>Profile</button>
                <button className="w-nav-icon-btn" onClick={()=>navigate('/cart')}>
                  Cart
                </button>
                <button className="w-nav-link" onClick={handleLogout}>Sign Out</button>
              </>
            ) : (
              <>
                <button className="w-nav-link" onClick={()=>navigate('/login')}>Sign In</button>
                <button className="btn-primary" style={{padding:'10px 24px',fontSize:'10px',letterSpacing:'2px'}} onClick={()=>navigate('/register')}>Register</button>
              </>
            )}
          </div>
        </nav>

        {/* HERO */}
        <div className="home-hero">
          <div className="hero-top">
            <h1 className="hero-title">Shop <em>live,</em><br/>shop now.</h1>
            <div>
              <div className="hero-live-count">
                <span className="live-pill"><span className="live-dot"/>Live</span>
                {liveShops.length} shops streaming now
              </div>
            </div>
          </div>
          <div className="hero-search-row">
            <input className="hero-search" placeholder="Search shops, sellers, products…" value={search} onChange={e=>setSearch(e.target.value)} onKeyDown={e=>e.key==='Enter'&&e.target.blur()}/>
            <button className="search-btn">Search</button>
          </div>
        </div>

        {/* FILTERS */}
        <div className="filter-bar">
          {CATEGORIES.map(cat=>(
            <button key={cat} className={`filter-chip ${activeCategory===cat?'active':''}`} onClick={()=>setActiveCategory(cat)}>{cat}</button>
          ))}
        </div>

        {/* ERROR */}
        {error && (
          <div className="home-error">{error}<button className="retry-btn" onClick={fetchData}>Retry</button></div>
        )}

        {/* LIVE NOW */}
        {(loading||liveShops.length>0) && (
          <div className="home-section">
            <div className="section-head">
              <div className="section-title">
                <span className="live-pill"><span className="live-dot"/>Live Now</span>
              </div>
              {!loading&&<span className="section-count">{liveShops.length} streaming</span>}
            </div>
            <div className="shops-grid">
              {loading ? Array.from({length:3}).map((_,i)=><SkeletonCard key={i}/>) : liveShops.map(s=><ShopCard key={s.id} shop={s} onEnter={handleEnterShop}/>)}
            </div>
          </div>
        )}

        {/* ALL SHOPS */}
        <div className="home-section" style={{paddingBottom:64}}>
          <div className="section-head">
            <h2 className="section-title">All Shops</h2>
            {!loading&&<span className="section-count">{offlineShops.length} shops</span>}
          </div>
          {loading ? (
            <div className="shops-grid">{Array.from({length:6}).map((_,i)=><SkeletonCard key={i}/>)}</div>
          ) : offlineShops.length===0 ? (
            <div className="home-empty">
              <h3>No shops found</h3>
              <p>Try a different category or search term.</p>
            </div>
          ) : (
            <div className="shops-grid">{offlineShops.map(s=><ShopCard key={s.id} shop={s} onEnter={handleEnterShop}/>)}</div>
          )}
        </div>
      </div>
    </>
  );
}