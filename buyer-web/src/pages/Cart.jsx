// src/pages/Cart.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import '../theme.css';

const css = `
  .cart-root { min-height:100vh; background:var(--grey-50); }
  .cart-body { max-width:1100px; margin:0 auto; padding:48px 48px 80px; display:grid; grid-template-columns:1fr 380px; gap:48px; align-items:start; }
  .cart-main-title { font-family:var(--font-display); font-size:40px; font-weight:300; margin-bottom:4px; }
  .cart-count-txt { font-size:12px; color:var(--grey-400); letter-spacing:1px; margin-bottom:40px; }

  /* ITEMS */
  .cart-items { display:flex; flex-direction:column; }
  .cart-item { display:flex; gap:20px; padding:28px 0; border-bottom:1px solid var(--grey-200); animation:fade-in 0.2s ease; }
  @keyframes fade-in{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
  .cart-item-img { width:100px; height:130px; background:var(--grey-100); flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:32px; }
  .cart-item-img img { width:100%; height:100%; object-fit:cover; }
  .cart-item-info { flex:1; display:flex; flex-direction:column; justify-content:space-between; }
  .cart-item-name { font-family:var(--font-display); font-size:20px; font-weight:400; margin-bottom:4px; }
  .cart-item-meta { font-size:12px; color:var(--grey-400); font-weight:300; }
  .cart-item-bottom { display:flex; align-items:center; justify-content:space-between; }
  .cart-item-price { font-size:18px; font-weight:500; }
  .cart-item-actions { display:flex; align-items:center; gap:16px; }
  .cart-qty { display:flex; align-items:center; border:1px solid var(--grey-200); }
  .cqty-btn { width:36px; height:36px; background:none; border:none; font-size:16px; cursor:pointer; transition:background var(--transition); }
  .cqty-btn:hover:not(:disabled) { background:var(--grey-100); }
  .cqty-btn:disabled { opacity:0.3; cursor:not-allowed; }
  .cqty-val { width:36px; text-align:center; font-size:13px; }
  .cart-remove { background:none; border:none; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:var(--grey-300); cursor:pointer; transition:color var(--transition); }
  .cart-remove:hover { color:var(--black); }

  /* CLEAR */
  .cart-header-row { display:flex; align-items:baseline; justify-content:space-between; margin-bottom:0; }
  .cart-clear-btn { background:none; border:none; font-size:11px; letter-spacing:1px; text-transform:uppercase; color:var(--grey-300); cursor:pointer; transition:color var(--transition); }
  .cart-clear-btn:hover { color:var(--black); }

  /* SUMMARY */
  .cart-summary { background:var(--white); border:1px solid var(--grey-200); padding:32px; position:sticky; top:calc(var(--nav-h)+24px); }
  .summary-heading { font-family:var(--font-display); font-size:24px; font-weight:300; margin-bottom:28px; }
  .summary-line { display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom:1px solid var(--grey-100); font-size:13px; color:var(--grey-500); font-weight:300; }
  .summary-line:last-of-type { border:none; }
  .summary-total-row { display:flex; justify-content:space-between; align-items:baseline; padding:20px 0 0; border-top:1px solid var(--grey-200); margin-top:8px; }
  .summary-total-lbl { font-size:11px; letter-spacing:2px; text-transform:uppercase; font-weight:500; }
  .summary-total-val { font-family:var(--font-display); font-size:30px; font-weight:300; }
  .checkout-btn { width:100%; padding:16px; margin-top:24px; font-size:11px; letter-spacing:2px; }
  .checkout-note { margin-top:14px; font-size:11px; color:var(--grey-300); text-align:center; letter-spacing:0.3px; }

  /* EMPTY */
  .cart-empty { grid-column:1/-1; text-align:center; padding:100px 20px; }
  .cart-empty h2 { font-family:var(--font-display); font-size:36px; font-weight:300; color:var(--grey-300); margin-bottom:12px; }
  .cart-empty p { font-size:13px; color:var(--grey-300); margin-bottom:32px; }

  /* LOADING */
  .cart-loading { min-height:50vh; display:flex; align-items:center; justify-content:center; gap:12px; color:var(--grey-300); font-size:13px; }

  /* MODAL */
  .modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center; z-index:200; }
  .modal-box { background:var(--white); border:1px solid var(--grey-200); padding:40px; max-width:360px; width:90%; text-align:center; }
  .modal-box h3 { font-family:var(--font-display); font-size:24px; font-weight:300; margin-bottom:8px; }
  .modal-box p { font-size:13px; color:var(--grey-400); margin-bottom:28px; }
  .modal-btns { display:flex; gap:12px; }
  .modal-cancel { flex:1; padding:13px; background:none; border:1px solid var(--grey-200); font-family:var(--font-body); font-size:12px; letter-spacing:1px; text-transform:uppercase; cursor:pointer; transition:all var(--transition); }
  .modal-cancel:hover { border-color:var(--black); }
  .modal-confirm { flex:1; padding:13px; background:var(--black); border:1px solid var(--black); color:var(--white); font-family:var(--font-body); font-size:12px; letter-spacing:1px; text-transform:uppercase; cursor:pointer; }

  @media(max-width:768px){ .cart-body{grid-template-columns:1fr;padding:24px 20px 60px} .cart-summary{position:static} }
`;

export default function Cart() {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);

  const fetchCart = useCallback(async () => {
    try {
      const r = await api.get('/cart');
      setItems(r.data.items||[]);
      setTotal(r.data.total||0);
    } catch {}
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const updateQty = async (id, qty) => {
    if (qty<1) return;
    setItems(p=>p.map(i=>i.id===id?{...i,quantity:qty}:i));
    try { await api.put(`/cart/${id}`,{quantity:qty}); fetchCart(); }
    catch { fetchCart(); }
  };

  const deleteItem = async (id) => {
    setItems(p=>p.filter(i=>i.id!==id));
    try { await api.delete(`/cart/${id}`); fetchCart(); }
    catch { fetchCart(); }
  };

  const clearCart = async () => {
    setShowClearModal(false);
    try { await api.delete('/cart'); setItems([]); setTotal(0); }
    catch { fetchCart(); }
  };

  const handleCheckout = async () => {
    if (!items.length) return;
    setPlacingOrder(true);
    try {
      const shopId = items[0]?.shop_id||items[0]?.product?.shop_id;
      const r = await api.post('/orders',{ shop_id:shopId, shipping_address:'Pending' });
      navigate(`/checkout/${r.data.order?.id}`,{state:{order:r.data.order}});
    } catch(err) { alert(err.response?.data?.message||'Could not place order.'); }
    finally { setPlacingOrder(false); }
  };

  const itemCount = items.reduce((s,i)=>s+i.quantity,0);

  if (loading) return (
    <>
      <style>{css}</style>
      <div className="cart-root"><div className="cart-loading"><span className="w-spinner"/> Loading cart…</div></div>
    </>
  );

  return (
    <>
      <style>{css}</style>
      <div className="cart-root">
        <nav className="w-nav">
          <div className="w-nav-logo" onClick={()=>navigate('/')} style={{cursor:'pointer'}}>Webon</div>
          <div className="w-nav-links">
            <button className="w-nav-link" onClick={()=>navigate('/')}>← Continue Shopping</button>
            <button className="w-nav-link" onClick={()=>navigate('/orders')}>Orders</button>
            <button className="w-nav-link" onClick={()=>navigate('/profile')}>Profile</button>
          </div>
        </nav>

        <div className="cart-body">
          {items.length===0 ? (
            <div className="cart-empty">
              <h2>Your cart is empty</h2>
              <p>Browse our shops and add something you love.</p>
              <button className="btn-primary" style={{padding:'14px 40px',fontSize:'11px',letterSpacing:'2px'}} onClick={()=>navigate('/')}>Explore Shops</button>
            </div>
          ) : (
            <>
              <div>
                <div className="cart-header-row">
                  <div>
                    <h1 className="cart-main-title">Shopping Cart</h1>
                    <div className="cart-count-txt">{itemCount} item{itemCount!==1?'s':''}</div>
                  </div>
                  <button className="cart-clear-btn" onClick={()=>setShowClearModal(true)}>Clear all</button>
                </div>
                <div className="cart-items">
                  {items.map(item=>{
                    const p = item.product||item;
                    return (
                      <div key={item.id} className="cart-item">
                        <div className="cart-item-img">
                          {p?.image_urls?.[0] ? <img src={p.image_urls[0]} alt={p.name}/> : '👗'}
                        </div>
                        <div className="cart-item-info">
                          <div>
                            <div className="cart-item-name">{p.name||'Product'}</div>
                            <div className="cart-item-meta">{item.size&&`Size: ${item.size} · `}₹{p.price} each</div>
                          </div>
                          <div className="cart-item-bottom">
                            <div className="cart-item-price">₹{((p.price||0)*item.quantity).toLocaleString('en-IN')}</div>
                            <div className="cart-item-actions">
                              <div className="cart-qty">
                                <button className="cqty-btn" disabled={item.quantity<=1} onClick={()=>updateQty(item.id,item.quantity-1)}>−</button>
                                <span className="cqty-val">{item.quantity}</span>
                                <button className="cqty-btn" disabled={item.quantity>=10} onClick={()=>updateQty(item.id,item.quantity+1)}>+</button>
                              </div>
                              <button className="cart-remove" onClick={()=>deleteItem(item.id)}>Remove</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="cart-summary">
                <h3 className="summary-heading">Order Summary</h3>
                <div className="summary-line"><span>Subtotal ({itemCount} items)</span><span>₹{total.toLocaleString('en-IN')}</span></div>
                <div className="summary-line"><span>Delivery</span><span style={{color:'#16a34a'}}>Free</span></div>
                <div className="summary-line"><span>Taxes</span><span>Included</span></div>
                <div className="summary-total-row">
                  <span className="summary-total-lbl">Total</span>
                  <span className="summary-total-val">₹{total.toLocaleString('en-IN')}</span>
                </div>
                <button className="btn-primary checkout-btn" onClick={handleCheckout} disabled={placingOrder||!items.length}>
                  {placingOrder ? <span className="w-spinner"/> : 'Proceed to Checkout'}
                </button>
                <div className="checkout-note">🔒 Secure checkout · Free returns within 7 days</div>
              </div>
            </>
          )}
        </div>

        {showClearModal && (
          <div className="modal-overlay">
            <div className="modal-box">
              <h3>Clear cart?</h3>
              <p>All items will be removed from your cart.</p>
              <div className="modal-btns">
                <button className="modal-cancel" onClick={()=>setShowClearModal(false)}>Cancel</button>
                <button className="modal-confirm" onClick={clearCart}>Clear All</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}