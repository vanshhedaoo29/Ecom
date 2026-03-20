// src/pages/Wishlist.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../theme.css';

const css = `
  .wl-root { min-height:100vh; background:var(--grey-50); }
  .wl-body { max-width:1100px; margin:0 auto; padding:48px 40px 80px; }
  .wl-title { font-family:var(--font-display); font-size:40px; font-weight:300; margin-bottom:8px; }
  .wl-sub { font-size:12px; color:var(--grey-400); letter-spacing:1px; margin-bottom:48px; }
  .wl-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:1px; background:var(--grey-200); }
  .wl-card { background:var(--white); cursor:pointer; transition:background var(--transition); }
  .wl-card:hover { background:var(--grey-50); }
  .wl-img { height:280px; background:var(--grey-100); display:flex; align-items:center; justify-content:center; font-size:48px; overflow:hidden; position:relative; }
  .wl-img img { width:100%; height:100%; object-fit:cover; }
  .wl-remove {
    position:absolute; top:12px; right:12px;
    width:32px; height:32px; background:var(--white); border:1px solid var(--grey-200);
    display:flex; align-items:center; justify-content:center; cursor:pointer;
    font-size:14px; transition:all var(--transition);
  }
  .wl-remove:hover { background:var(--black); color:var(--white); border-color:var(--black); }
  .wl-info { padding:16px 20px 20px; }
  .wl-name { font-family:var(--font-display); font-size:18px; font-weight:400; margin-bottom:4px; }
  .wl-price { font-size:14px; font-weight:500; color:var(--black); margin-bottom:12px; }
  .wl-add-btn { width:100%; padding:12px; font-size:10px; letter-spacing:2px; }
  .wl-empty { text-align:center; padding:100px 20px; }
  .wl-empty h3 { font-family:var(--font-display); font-size:32px; font-weight:300; color:var(--grey-300); margin-bottom:12px; }
  .wl-empty p { font-size:13px; color:var(--grey-300); margin-bottom:32px; }
  @media(max-width:768px){ .wl-body{padding:32px 20px 60px} .wl-grid{grid-template-columns:1fr 1fr} }
`;

const WISHLIST_KEY = 'webon_wishlist';

export function addToWishlist(product) {
  const existing = JSON.parse(localStorage.getItem(WISHLIST_KEY)||'[]');
  if (!existing.find(p=>p.id===product.id)) {
    localStorage.setItem(WISHLIST_KEY, JSON.stringify([...existing, product]));
  }
}

export function removeFromWishlist(productId) {
  const existing = JSON.parse(localStorage.getItem(WISHLIST_KEY)||'[]');
  localStorage.setItem(WISHLIST_KEY, JSON.stringify(existing.filter(p=>p.id!==productId)));
}

export function isInWishlist(productId) {
  const existing = JSON.parse(localStorage.getItem(WISHLIST_KEY)||'[]');
  return existing.some(p=>p.id===productId);
}

export default function Wishlist() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);

  useEffect(() => {
    setItems(JSON.parse(localStorage.getItem(WISHLIST_KEY)||'[]'));
  }, []);

  const handleRemove = (id) => {
    removeFromWishlist(id);
    setItems(prev=>prev.filter(p=>p.id!==id));
  };

  return (
    <>
      <style>{css}</style>
      <div className="wl-root">
        <nav className="w-nav">
          <div className="w-nav-logo" onClick={()=>navigate('/')} style={{cursor:'pointer'}}>Webon</div>
          <div className="w-nav-links">
            <button className="w-nav-link" onClick={()=>navigate('/')}>Home</button>
            <button className="w-nav-link" onClick={()=>navigate('/orders')}>Orders</button>
            <button className="w-nav-link" onClick={()=>navigate('/profile')}>Profile</button>
            <button className="w-nav-link" onClick={()=>navigate('/cart')}>Cart</button>
          </div>
        </nav>

        <div className="wl-body">
          <h1 className="wl-title">Wishlist</h1>
          <p className="wl-sub">{items.length} saved item{items.length!==1?'s':''}</p>

          {items.length===0 ? (
            <div className="wl-empty">
              <h3>Nothing saved yet</h3>
              <p>Items you save while browsing will appear here.</p>
              <button className="btn-primary" style={{padding:'14px 40px',fontSize:'11px',letterSpacing:'2px'}} onClick={()=>navigate('/')}>Browse Shops</button>
            </div>
          ) : (
            <div className="wl-grid">
              {items.map(p=>(
                <div key={p.id} className="wl-card">
                  <div className="wl-img">
                    {p.image_urls?.[0] ? <img src={p.image_urls[0]} alt={p.name}/> : '👗'}
                    <button className="wl-remove" onClick={e=>{e.stopPropagation();handleRemove(p.id);}}>✕</button>
                  </div>
                  <div className="wl-info">
                    <div className="wl-name">{p.name}</div>
                    <div className="wl-price">₹{p.price?.toLocaleString('en-IN')}</div>
                    <button className="btn-primary wl-add-btn" onClick={()=>navigate(`/product/${p.id}`,{state:{product:p}})}>View Product</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
