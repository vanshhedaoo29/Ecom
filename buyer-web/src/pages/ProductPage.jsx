// src/pages/ProductPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { addToWishlist, removeFromWishlist, isInWishlist } from './Wishlist';
import '../theme.css';

const css = `
  .pp-root { min-height:100vh; background:var(--white); }
  .pp-body { max-width:1100px; margin:0 auto; padding:48px 48px 80px; display:grid; grid-template-columns:1fr 1fr; gap:80px; align-items:start; }
  .pp-gallery { position:sticky; top:calc(var(--nav-h) + 24px); }
  .pp-main-img { width:100%; aspect-ratio:3/4; overflow:hidden; background:var(--grey-100); display:flex; align-items:center; justify-content:center; margin-bottom:8px; }
  .pp-main-img img { width:100%; height:100%; object-fit:cover; transition:transform 0.4s ease; }
  .pp-main-img:hover img { transform:scale(1.03); }
  .pp-no-img { font-size:72px; color:var(--grey-200); }
  .pp-thumbs { display:flex; gap:6px; }
  .pp-thumb { width:72px; height:90px; overflow:hidden; cursor:pointer; border:2px solid transparent; background:var(--grey-100); transition:border-color var(--transition); }
  .pp-thumb.active { border-color:var(--black); }
  .pp-thumb img { width:100%; height:100%; object-fit:cover; }

  .pp-info { padding-top:8px; }
  .pp-breadcrumb { display:flex; align-items:center; gap:8px; font-size:11px; color:var(--grey-300); margin-bottom:20px; }
  .pp-breadcrumb span { cursor:pointer; transition:color var(--transition); }
  .pp-breadcrumb span:hover { color:var(--black); }
  .pp-name { font-family:var(--font-display); font-size:40px; font-weight:300; line-height:1.1; color:var(--black); margin-bottom:16px; }
  .pp-price { font-size:26px; font-weight:500; color:var(--black); margin-bottom:8px; }
  .pp-price-note { font-size:11px; color:var(--grey-400); margin-bottom:32px; }
  .pp-divider { height:1px; background:var(--grey-100); margin:28px 0; }

  .pp-section-label { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--grey-400); margin-bottom:14px; font-weight:500; }
  .pp-sizes { display:flex; gap:8px; flex-wrap:wrap; }
  .pp-size {
    min-width:48px; height:48px; padding:0 14px; background:var(--white); border:1px solid var(--grey-200);
    font-family:var(--font-body); font-size:13px; font-weight:400; cursor:pointer; color:var(--black);
    transition:all var(--transition); display:flex; align-items:center; justify-content:center;
  }
  .pp-size:hover { border-color:var(--black); }
  .pp-size.selected { background:var(--black); color:var(--white); border-color:var(--black); }

  .pp-dims { display:flex; gap:16px; }
  .pp-dim { flex:1; border:1px solid var(--grey-100); padding:16px; text-align:center; }
  .pp-dim-val { font-family:var(--font-display); font-size:24px; font-weight:300; }
  .pp-dim-lbl { font-size:9px; letter-spacing:2px; text-transform:uppercase; color:var(--grey-400); margin-top:4px; }

  .pp-qty { display:flex; align-items:center; border:1px solid var(--grey-200); width:fit-content; }
  .qty-btn { width:44px; height:44px; background:none; border:none; font-size:18px; cursor:pointer; color:var(--black); transition:background var(--transition); }
  .qty-btn:hover:not(:disabled) { background:var(--grey-100); }
  .qty-btn:disabled { opacity:0.3; cursor:not-allowed; }
  .qty-val { width:44px; text-align:center; font-size:14px; font-weight:400; }

  .pp-cta { display:flex; gap:12px; margin-top:8px; }
  .pp-add-btn { flex:1; padding:16px; font-size:11px; letter-spacing:2px; }
  .pp-wish-btn {
    width:52px; height:52px; background:none; border:1px solid var(--grey-200);
    font-size:20px; cursor:pointer; transition:all var(--transition); display:flex; align-items:center; justify-content:center;
  }
  .pp-wish-btn:hover { border-color:var(--black); }
  .pp-wish-btn.active { background:var(--black); border-color:var(--black); color:var(--white); }

  /* TOAST */
  .pp-toast {
    position:fixed; bottom:32px; left:50%; transform:translateX(-50%) translateY(80px);
    background:var(--black); color:var(--white); padding:14px 28px;
    font-size:12px; letter-spacing:1px; opacity:0; transition:transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s; z-index:200;
  }
  .pp-toast.show { transform:translateX(-50%) translateY(0); opacity:1; }

  .pp-loading { min-height:60vh; display:flex; align-items:center; justify-content:center; gap:12px; color:var(--grey-300); }

  @media(max-width:768px){
    .pp-body{grid-template-columns:1fr;gap:40px;padding:24px 20px 60px}
    .pp-gallery{position:static}
    .pp-name{font-size:32px}
  }
`;

export default function ProductPage() {
  const { productId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [product, setProduct] = useState(state?.product||null);
  const [selectedImg, setSelectedImg] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [adding, setAdding] = useState(false);
  const [wished, setWished] = useState(false);
  const [toast, setToast] = useState({ show:false, msg:'' });

  useEffect(() => {
    if (!product) {
      api.get(`/products/${productId}`).then(r=>setProduct(r.data.product)).catch(()=>navigate('/'));
    }
  }, [productId]);

  useEffect(() => {
    if (product) setWished(isInWishlist(product.id));
  }, [product]);

  const showToast = (msg) => {
    setToast({show:true,msg});
    setTimeout(()=>setToast(t=>({...t,show:false})),2200);
  };

  const handleAddToCart = async () => {
    if (product?.sizes_available?.length>0 && !selectedSize) { showToast('Please select a size'); return; }
    setAdding(true);
    try {
      await api.post('/cart',{ product_id:product.id, quantity, size:selectedSize||null });
      showToast('Added to cart');
    } catch(err) { showToast(err.response?.data?.message||'Failed to add'); }
    finally { setAdding(false); }
  };

  const handleWishlist = () => {
    if (wished) { removeFromWishlist(product.id); setWished(false); showToast('Removed from wishlist'); }
    else { addToWishlist(product); setWished(true); showToast('Saved to wishlist'); }
  };

  if (!product) return (
    <>
      <style>{css}</style>
      <div className="pp-root"><div className="pp-loading"><span className="w-spinner"/> Loading…</div></div>
    </>
  );

  const images = product.image_urls||[];

  return (
    <>
      <style>{css}</style>
      <div className="pp-root">
        <nav className="w-nav">
          <div className="w-nav-logo" onClick={()=>navigate('/')} style={{cursor:'pointer'}}>Webon</div>
          <div className="w-nav-links">
            <button className="w-nav-link" onClick={()=>navigate(-1)}>← Back</button>
            <button className="w-nav-link" onClick={()=>navigate('/wishlist')}>Wishlist</button>
            <button className="w-nav-link" onClick={()=>navigate('/cart')}>Cart</button>
          </div>
        </nav>

        <div className="pp-body">
          {/* Gallery */}
          <div className="pp-gallery">
            <div className="pp-main-img">
              {images.length>0 ? <img src={images[selectedImg]} alt={product.name}/> : <div className="pp-no-img">👗</div>}
            </div>
            {images.length>1 && (
              <div className="pp-thumbs">
                {images.map((url,i)=>(
                  <div key={i} className={`pp-thumb ${selectedImg===i?'active':''}`} onClick={()=>setSelectedImg(i)}>
                    <img src={url} alt={`view ${i+1}`}/>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="pp-info">
            <div className="pp-breadcrumb">
              <span onClick={()=>navigate('/')}>Home</span>
              <span>›</span>
              <span>{product.name}</span>
            </div>

            <h1 className="pp-name">{product.name}</h1>
            <div className="pp-price">₹{product.price?.toLocaleString('en-IN')}</div>
            <div className="pp-price-note">Inclusive of all taxes · Free delivery</div>

            <div className="pp-divider"/>

            {product.sizes_available?.length>0 && (
              <div style={{marginBottom:28}}>
                <div className="pp-section-label">Select Size</div>
                <div className="pp-sizes">
                  {product.sizes_available.map(s=>(
                    <button key={s} className={`pp-size ${selectedSize===s?'selected':''}`} onClick={()=>setSelectedSize(s)}>{s}</button>
                  ))}
                </div>
              </div>
            )}

            {(product.garment_width_cm||product.garment_height_cm) && (
              <div style={{marginBottom:28}}>
                <div className="pp-section-label">Dimensions</div>
                <div className="pp-dims">
                  {product.garment_width_cm&&<div className="pp-dim"><div className="pp-dim-val">{product.garment_width_cm}cm</div><div className="pp-dim-lbl">Width</div></div>}
                  {product.garment_height_cm&&<div className="pp-dim"><div className="pp-dim-val">{product.garment_height_cm}cm</div><div className="pp-dim-lbl">Height</div></div>}
                </div>
              </div>
            )}

            <div style={{marginBottom:28}}>
              <div className="pp-section-label">Quantity</div>
              <div className="pp-qty">
                <button className="qty-btn" disabled={quantity<=1} onClick={()=>setQuantity(q=>q-1)}>−</button>
                <span className="qty-val">{quantity}</span>
                <button className="qty-btn" disabled={quantity>=10} onClick={()=>setQuantity(q=>q+1)}>+</button>
              </div>
            </div>

            <div className="pp-divider"/>

            <div className="pp-cta">
              <button className="btn-primary pp-add-btn" onClick={handleAddToCart} disabled={adding}>
                {adding ? <span className="w-spinner"/> : 'Add to Cart'}
              </button>
              <button className={`pp-wish-btn ${wished?'active':''}`} onClick={handleWishlist}>
                {wished ? '♥' : '♡'}
              </button>
            </div>
          </div>
        </div>

        <div className={`pp-toast ${toast.show?'show':''}`}>{toast.msg}</div>
      </div>
    </>
  );
}