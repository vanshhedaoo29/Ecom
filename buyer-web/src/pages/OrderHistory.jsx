// src/pages/OrderHistory.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import '../theme.css';

const css = `
  .orders-root { min-height:100vh; background:var(--grey-50); }
  .orders-body { max-width:900px; margin:0 auto; padding:48px 40px 80px; }
  .orders-title { font-family:var(--font-display); font-size:40px; font-weight:300; margin-bottom:8px; }
  .orders-sub { font-size:12px; color:var(--grey-400); letter-spacing:1px; margin-bottom:48px; }

  /* STATUS FILTER */
  .status-tabs { display:flex; gap:0; border-bottom:1px solid var(--grey-200); margin-bottom:40px; }
  .status-tab {
    padding:14px 24px; background:none; border:none; border-bottom:2px solid transparent;
    font-family:var(--font-body); font-size:11px; letter-spacing:2px; text-transform:uppercase;
    font-weight:500; color:var(--grey-400); cursor:pointer; transition:all var(--transition);
  }
  .status-tab:hover { color:var(--black); }
  .status-tab.active { color:var(--black); border-bottom-color:var(--black); }

  /* ORDER CARD */
  .order-card { background:var(--white); border:1px solid var(--grey-200); margin-bottom:16px; }
  .order-card-head {
    display:flex; align-items:center; justify-content:space-between;
    padding:20px 28px; border-bottom:1px solid var(--grey-100);
  }
  .order-id { font-size:12px; color:var(--grey-500); font-weight:300; }
  .order-id strong { color:var(--black); font-weight:500; }
  .order-date { font-size:11px; color:var(--grey-400); }
  .order-status-badge {
    font-size:9px; letter-spacing:2px; text-transform:uppercase; font-weight:600;
    padding:5px 12px; border:1px solid;
  }
  .status-pending { color:#d97706; border-color:#fde68a; background:#fffbeb; }
  .status-confirmed { color:#2563eb; border-color:#bfdbfe; background:#eff6ff; }
  .status-shipped { color:#7c3aed; border-color:#ddd6fe; background:#f5f3ff; }
  .status-delivered { color:#16a34a; border-color:#bbf7d0; background:#f0fdf4; }
  .status-cancelled { color:#dc2626; border-color:#fecaca; background:#fff5f5; }
  .status-paid { color:#16a34a; border-color:#bbf7d0; background:#f0fdf4; }

  .order-card-body { padding:24px 28px; }
  .order-items-list { display:flex; flex-direction:column; gap:16px; margin-bottom:24px; }
  .order-item { display:flex; align-items:center; gap:16px; }
  .order-item-img {
    width:64px; height:80px; background:var(--grey-100); flex-shrink:0;
    display:flex; align-items:center; justify-content:center; font-size:24px; overflow:hidden;
  }
  .order-item-img img { width:100%; height:100%; object-fit:cover; }
  .order-item-info { flex:1; }
  .order-item-name { font-family:var(--font-display); font-size:16px; font-weight:400; margin-bottom:4px; }
  .order-item-meta { font-size:12px; color:var(--grey-400); font-weight:300; }
  .order-item-price { font-size:14px; font-weight:500; color:var(--black); }

  /* TRACKING */
  .order-tracking { border-top:1px solid var(--grey-100); padding-top:20px; }
  .tracking-label { font-size:10px; letter-spacing:2px; text-transform:uppercase; color:var(--grey-400); margin-bottom:16px; }
  .tracking-steps { display:flex; align-items:center; gap:0; }
  .tracking-step { display:flex; flex-direction:column; align-items:center; flex:1; position:relative; }
  .tracking-step:not(:last-child)::after {
    content:''; position:absolute; top:10px; left:50%; width:100%; height:1px;
    background:var(--grey-200); z-index:0;
  }
  .tracking-step.done:not(:last-child)::after { background:var(--black); }
  .step-dot {
    width:20px; height:20px; border-radius:50%; border:2px solid var(--grey-200);
    background:var(--white); z-index:1; display:flex; align-items:center; justify-content:center;
    font-size:9px; margin-bottom:8px;
  }
  .tracking-step.done .step-dot { background:var(--black); border-color:var(--black); color:var(--white); }
  .tracking-step.current .step-dot { border-color:var(--black); background:var(--white); }
  .step-label { font-size:9px; letter-spacing:1px; text-transform:uppercase; color:var(--grey-400); text-align:center; }
  .tracking-step.done .step-label { color:var(--black); }
  .tracking-step.current .step-label { color:var(--black); font-weight:600; }

  .order-footer { display:flex; align-items:center; justify-content:space-between; padding:16px 28px; border-top:1px solid var(--grey-100); }
  .order-total { font-family:var(--font-display); font-size:22px; font-weight:400; }
  .order-total-label { font-size:11px; color:var(--grey-400); margin-right:8px; }

  /* EMPTY */
  .orders-empty { text-align:center; padding:100px 20px; }
  .orders-empty h3 { font-family:var(--font-display); font-size:32px; font-weight:300; color:var(--grey-300); margin-bottom:12px; }
  .orders-empty p { font-size:13px; color:var(--grey-300); margin-bottom:32px; }

  /* LOADING */
  .orders-loading { display:flex; align-items:center; justify-content:center; padding:100px; gap:12px; color:var(--grey-300); font-size:13px; }

  @media(max-width:768px){ .orders-body{padding:32px 20px 60px} .tracking-steps{flex-wrap:wrap;gap:8px} }
`;

const TRACKING_STEPS = ['Placed','Confirmed','Shipped','Delivered'];

function getStatusClass(status) {
  const s = status?.toLowerCase();
  if (s==='pending') return 'status-pending';
  if (s==='confirmed') return 'status-confirmed';
  if (s==='shipped') return 'status-shipped';
  if (s==='delivered') return 'status-delivered';
  if (s==='cancelled') return 'status-cancelled';
  if (s==='paid') return 'status-paid';
  return 'status-pending';
}

function getStepIndex(status) {
  const s = status?.toLowerCase();
  if (s==='pending'||s==='paid') return 0;
  if (s==='confirmed') return 1;
  if (s==='shipped') return 2;
  if (s==='delivered') return 3;
  return 0;
}

const TABS = ['All','Pending','Confirmed','Shipped','Delivered'];

export default function OrderHistory() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');

  useEffect(() => {
    api.get('/orders')
      .then(r => setOrders(r.data.orders||[]))
      .catch(()=>{})
      .finally(()=>setLoading(false));
  }, []);

  const filtered = orders.filter(o => activeTab==='All' || o.status?.toLowerCase()===activeTab.toLowerCase());

  return (
    <>
      <style>{css}</style>
      <div className="orders-root">
        <nav className="w-nav">
          <div className="w-nav-logo" onClick={()=>navigate('/')} style={{cursor:'pointer'}}>Webon</div>
          <div className="w-nav-links">
            <button className="w-nav-link" onClick={()=>navigate('/')}>Home</button>
            <button className="w-nav-link" onClick={()=>navigate('/profile')}>Profile</button>
            <button className="w-nav-link" onClick={()=>navigate('/cart')}>Cart</button>
          </div>
        </nav>

        <div className="orders-body">
          <h1 className="orders-title">My Orders</h1>
          <p className="orders-sub">Track and manage your purchases</p>

          <div className="status-tabs">
            {TABS.map(t=>(
              <button key={t} className={`status-tab ${activeTab===t?'active':''}`} onClick={()=>setActiveTab(t)}>{t}</button>
            ))}
          </div>

          {loading ? (
            <div className="orders-loading"><span className="w-spinner"/> Loading orders…</div>
          ) : filtered.length===0 ? (
            <div className="orders-empty">
              <h3>No orders yet</h3>
              <p>{activeTab==='All' ? "You haven't placed any orders." : `No ${activeTab.toLowerCase()} orders.`}</p>
              <button className="btn-primary" style={{padding:'14px 40px',fontSize:'11px',letterSpacing:'2px'}} onClick={()=>navigate('/')}>Start Shopping</button>
            </div>
          ) : (
            filtered.map(order => {
              const stepIdx = getStepIndex(order.status);
              const items = order.items||order.order_items||[];
              return (
                <div key={order.id} className="order-card">
                  <div className="order-card-head">
                    <div>
                      <div className="order-id">Order <strong>#{order.id}</strong></div>
                      <div className="order-date">{order.created_at ? new Date(order.created_at).toLocaleDateString('en-IN',{day:'numeric',month:'long',year:'numeric'}) : '—'}</div>
                    </div>
                    <div className={`order-status-badge ${getStatusClass(order.status)}`}>{order.status||'Pending'}</div>
                  </div>

                  <div className="order-card-body">
                    {/* Items */}
                    {items.length>0 && (
                      <div className="order-items-list">
                        {items.slice(0,3).map((item,i)=>{
                          const p = item.product||item;
                          return (
                            <div key={i} className="order-item">
                              <div className="order-item-img">
                                {p?.image_urls?.[0] ? <img src={p.image_urls[0]} alt={p.name}/> : '📦'}
                              </div>
                              <div className="order-item-info">
                                <div className="order-item-name">{p?.name||'Product'}</div>
                                <div className="order-item-meta">
                                  {item.size&&`Size: ${item.size} · `}Qty: {item.quantity||1}
                                </div>
                              </div>
                              <div className="order-item-price">₹{((p?.price||0)*(item.quantity||1)).toLocaleString('en-IN')}</div>
                            </div>
                          );
                        })}
                        {items.length>3&&<div style={{fontSize:12,color:'var(--grey-400)'}}>+{items.length-3} more items</div>}
                      </div>
                    )}

                    {/* Tracking */}
                    {order.status?.toLowerCase()!=='cancelled' && (
                      <div className="order-tracking">
                        <div className="tracking-label">Order Tracking</div>
                        <div className="tracking-steps">
                          {TRACKING_STEPS.map((step,i)=>(
                            <div key={step} className={`tracking-step ${i<stepIdx?'done':''} ${i===stepIdx?'current':''}`}>
                              <div className="step-dot">{i<stepIdx?'✓':''}</div>
                              <div className="step-label">{step}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="order-footer">
                    <div style={{fontSize:12,color:'var(--grey-400)'}}>
                      {items.length} item{items.length!==1?'s':''}
                    </div>
                    <div>
                      <span className="order-total-label">Total</span>
                      <span className="order-total">₹{(order.total_amount||order.total||0).toLocaleString('en-IN')}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
}
