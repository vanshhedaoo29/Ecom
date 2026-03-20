// src/pages/Checkout.jsx
import React, { useState } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axios';
import '../theme.css';

const css = `
  .co-root { min-height:100vh; background:var(--grey-50); }
  .co-body { max-width:1000px; margin:0 auto; padding:48px 48px 80px; display:grid; grid-template-columns:1fr 360px; gap:48px; align-items:start; }

  .co-section { background:var(--white); border:1px solid var(--grey-200); margin-bottom:20px; }
  .co-section-head { padding:22px 28px; border-bottom:1px solid var(--grey-100); display:flex; align-items:center; gap:12px; }
  .co-step-num { width:24px; height:24px; background:var(--black); color:var(--white); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:600; flex-shrink:0; }
  .co-section-title { font-size:11px; letter-spacing:2px; text-transform:uppercase; font-weight:500; }
  .co-section-body { padding:28px; }

  .co-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  .co-form-full { grid-column:1/-1; }

  /* PAYMENT OPTIONS */
  .pay-options { display:flex; flex-direction:column; gap:12px; }
  .pay-opt { display:flex; align-items:center; gap:16px; padding:18px 20px; border:1px solid var(--grey-200); cursor:pointer; transition:border-color var(--transition); }
  .pay-opt:hover { border-color:var(--grey-400); }
  .pay-opt.selected { border-color:var(--black); }
  .pay-radio { width:18px; height:18px; border-radius:50%; border:2px solid var(--grey-300); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:border-color var(--transition); }
  .pay-opt.selected .pay-radio { border-color:var(--black); }
  .pay-dot { width:8px; height:8px; border-radius:50%; background:var(--black); opacity:0; transition:opacity var(--transition); }
  .pay-opt.selected .pay-dot { opacity:1; }
  .pay-icon { font-size:22px; }
  .pay-label-title { font-size:14px; font-weight:400; margin-bottom:2px; }
  .pay-label-sub { font-size:11px; color:var(--grey-400); font-weight:300; }

  /* NAV STEPS */
  .co-steps { display:flex; align-items:center; gap:8px; font-size:11px; color:var(--grey-300); }
  .co-step { display:flex; align-items:center; gap:6px; }
  .co-step.active { color:var(--black); font-weight:500; }
  .co-step.done { color:var(--grey-400); }

  /* SUMMARY */
  .co-summary { background:var(--white); border:1px solid var(--grey-200); padding:28px; position:sticky; top:calc(var(--nav-h)+24px); }
  .co-summary-title { font-family:var(--font-display); font-size:22px; font-weight:300; margin-bottom:24px; }
  .co-sum-line { display:flex; justify-content:space-between; padding:10px 0; font-size:13px; color:var(--grey-500); border-bottom:1px solid var(--grey-100); font-weight:300; }
  .co-sum-line:last-of-type { border:none; }
  .co-sum-total { display:flex; justify-content:space-between; align-items:baseline; padding:18px 0 0; border-top:1px solid var(--grey-200); margin-top:8px; }
  .co-sum-total-lbl { font-size:11px; letter-spacing:2px; text-transform:uppercase; font-weight:500; }
  .co-sum-total-val { font-family:var(--font-display); font-size:28px; font-weight:300; }
  .pay-btn { width:100%; padding:16px; margin-top:24px; font-size:11px; letter-spacing:2px; display:flex; align-items:center; justify-content:center; gap:8px; }
  .co-secure { margin-top:12px; text-align:center; font-size:11px; color:var(--grey-300); }

  /* SUCCESS */
  .co-success { grid-column:1/-1; min-height:60vh; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; gap:20px; padding:60px; }
  .success-mark { width:72px; height:72px; border:2px solid var(--black); display:flex; align-items:center; justify-content:center; font-size:28px; animation:pop 0.4s cubic-bezier(0.34,1.56,0.64,1); }
  @keyframes pop{from{transform:scale(0);opacity:0}to{transform:scale(1);opacity:1}}
  .co-success h2 { font-family:var(--font-display); font-size:36px; font-weight:300; }
  .co-success p { font-size:13px; color:var(--grey-400); max-width:360px; }

  @media(max-width:768px){
    .co-body{grid-template-columns:1fr;padding:24px 20px 60px}
    .co-form-grid{grid-template-columns:1fr}
    .co-summary{position:static}
  }
`;

function loadRazorpay() {
  return new Promise(res => {
    if (window.Razorpay) { res(true); return; }
    const s = document.createElement('script');
    s.src = 'https://checkout.razorpay.com/v1/checkout.js';
    s.onload = ()=>res(true); s.onerror = ()=>res(false);
    document.body.appendChild(s);
  });
}

export default function Checkout() {
  const { orderId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [order] = useState(state?.order||null);
  const [payMethod, setPayMethod] = useState('razorpay');
  const [paying, setPaying] = useState(false);
  const [success, setSuccess] = useState(false);
  const user = JSON.parse(localStorage.getItem('user')||'{}');

  const [address, setAddress] = useState({ fullName:user.name||'', phone:'', line1:'', city:'', state:'', pincode:'' });
  const handleAddr = e => setAddress(a=>({...a,[e.target.name]:e.target.value}));

  const handlePay = async () => {
    const { fullName, phone, line1, city, state:st, pincode } = address;
    if (!fullName||!phone||!line1||!city||!st||!pincode) { alert('Please fill in all address fields.'); return; }
    setPaying(true);
    try {
      const loaded = await loadRazorpay();
      if (!loaded) { alert('Payment gateway failed to load.'); setPaying(false); return; }
      const r = await api.post('/payments/create-order',{ orderId:orderId||order?.id });
      const { razorpayOrderId, amount, currency, key } = r.data;
      const opts = {
        key, amount, currency,
        name:'Webon', description:'Order Payment', order_id:razorpayOrderId,
        prefill:{ name:fullName, contact:phone, email:user.email||'' },
        theme:{ color:'#0a0a0a' },
        handler: async (res) => {
          try {
            await api.post('/payments/verify',{ razorpay_order_id:res.razorpay_order_id, razorpay_payment_id:res.razorpay_payment_id, razorpay_signature:res.razorpay_signature, orderId:orderId||order?.id });
            setSuccess(true);
          } catch { alert('Payment verification failed. Contact support.'); }
          finally { setPaying(false); }
        },
        modal:{ ondismiss:()=>setPaying(false) }
      };
      new window.Razorpay(opts).open();
    } catch(err) { alert(err.response?.data?.message||'Payment failed.'); setPaying(false); }
  };

  const total = order?.total_amount||order?.total||0;

  return (
    <>
      <style>{css}</style>
      <div className="co-root">
        <nav className="w-nav">
          <div className="w-nav-logo" onClick={()=>navigate('/')} style={{cursor:'pointer'}}>Webon</div>
          <div className="co-steps">
            <div className="co-step done">Cart</div>
            <span>›</span>
            <div className="co-step active">Checkout</div>
            <span>›</span>
            <div className="co-step">Confirm</div>
          </div>
          <button className="w-nav-link" onClick={()=>navigate('/cart')}>← Back to Cart</button>
        </nav>

        <div className="co-body">
          {success ? (
            <div className="co-success">
              <div className="success-mark">✓</div>
              <h2>Order Confirmed</h2>
              <p>Your payment was successful. You'll receive a confirmation shortly.</p>
              <button className="btn-primary" style={{padding:'14px 40px',fontSize:'11px',letterSpacing:'2px'}} onClick={()=>navigate('/')}>Continue Shopping</button>
              <button className="btn-secondary" style={{padding:'13px 40px',fontSize:'11px',letterSpacing:'2px'}} onClick={()=>navigate('/orders')}>View Orders</button>
            </div>
          ) : (
            <>
              <div>
                {/* Address */}
                <div className="co-section">
                  <div className="co-section-head">
                    <div className="co-step-num">1</div>
                    <div className="co-section-title">Delivery Address</div>
                  </div>
                  <div className="co-section-body">
                    <div className="co-form-grid">
                      <div className="w-form-group">
                        <label className="w-label">Full Name</label>
                        <input className="w-input" name="fullName" value={address.fullName} onChange={handleAddr} placeholder="Recipient name"/>
                      </div>
                      <div className="w-form-group">
                        <label className="w-label">Phone</label>
                        <input className="w-input" name="phone" value={address.phone} onChange={handleAddr} placeholder="+91 XXXXX XXXXX"/>
                      </div>
                      <div className="w-form-group co-form-full">
                        <label className="w-label">Address</label>
                        <input className="w-input" name="line1" value={address.line1} onChange={handleAddr} placeholder="House / Flat / Street / Area"/>
                      </div>
                      <div className="w-form-group">
                        <label className="w-label">City</label>
                        <input className="w-input" name="city" value={address.city} onChange={handleAddr} placeholder="City"/>
                      </div>
                      <div className="w-form-group">
                        <label className="w-label">State</label>
                        <input className="w-input" name="state" value={address.state} onChange={handleAddr} placeholder="State"/>
                      </div>
                      <div className="w-form-group">
                        <label className="w-label">PIN Code</label>
                        <input className="w-input" name="pincode" value={address.pincode} onChange={handleAddr} placeholder="6-digit PIN" maxLength={6}/>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment */}
                <div className="co-section">
                  <div className="co-section-head">
                    <div className="co-step-num">2</div>
                    <div className="co-section-title">Payment Method</div>
                  </div>
                  <div className="co-section-body">
                    <div className="pay-options">
                      {[
                        {id:'razorpay',icon:'💳',title:'Razorpay',sub:'Cards, UPI, Net Banking, Wallets'},
                        {id:'cod',icon:'💵',title:'Cash on Delivery',sub:'Pay when your order arrives'},
                      ].map(m=>(
                        <div key={m.id} className={`pay-opt ${payMethod===m.id?'selected':''}`} onClick={()=>setPayMethod(m.id)}>
                          <div className="pay-radio"><div className="pay-dot"/></div>
                          <div className="pay-icon">{m.icon}</div>
                          <div><div className="pay-label-title">{m.title}</div><div className="pay-label-sub">{m.sub}</div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary */}
              <div className="co-summary">
                <h3 className="co-summary-title">Summary</h3>
                <div className="co-sum-line"><span>Items</span><span>₹{total.toLocaleString('en-IN')}</span></div>
                <div className="co-sum-line"><span>Delivery</span><span style={{color:'#16a34a'}}>Free</span></div>
                <div className="co-sum-line"><span>Payment</span><span style={{textTransform:'capitalize'}}>{payMethod==='razorpay'?'Online':'COD'}</span></div>
                <div className="co-sum-total">
                  <span className="co-sum-total-lbl">Total</span>
                  <span className="co-sum-total-val">₹{total.toLocaleString('en-IN')}</span>
                </div>
                <button className="btn-primary pay-btn" onClick={handlePay} disabled={paying}>
                  {paying ? <span className="w-spinner"/> : `Pay ₹${total.toLocaleString('en-IN')}`}
                </button>
                <div className="co-secure">🔒 Secured by Razorpay</div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}