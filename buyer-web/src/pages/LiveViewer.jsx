// src/pages/LiveViewer.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import api from '../api/axios';
import socket from '../socket';
import '../theme.css';

const css = `
  .lv-root { height:100vh; background:var(--black); display:flex; flex-direction:column; color:var(--white); font-family:var(--font-body); }

  /* TOP BAR */
  .lv-topbar { height:56px; background:rgba(0,0,0,0.9); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between; padding:0 24px; flex-shrink:0; z-index:50; }
  .lv-back { background:none; border:none; color:rgba(255,255,255,0.5); cursor:pointer; font-family:var(--font-body); font-size:12px; letter-spacing:1px; text-transform:uppercase; transition:color var(--transition); }
  .lv-back:hover { color:var(--white); }
  .lv-shop-info { display:flex; align-items:center; gap:10px; font-size:14px; font-weight:400; }
  .lv-viewers { font-size:12px; color:rgba(255,255,255,0.4); }

  /* VIDEO */
  .lv-body { flex:1; position:relative; background:#000; display:flex; align-items:center; justify-content:center; overflow:hidden; }
  #remote-video-container { width:100%; height:100%; }
  #remote-video-container video { width:100%!important; height:100%!important; object-fit:cover!important; }
  .lv-video-gradient { position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,0.7) 0%,transparent 40%); pointer-events:none; }
  .lv-seller-info { position:absolute; bottom:160px; left:20px; background:rgba(0,0,0,0.55); backdrop-filter:blur(8px); padding:10px 16px; }
  .lv-seller-name { font-size:13px; color:rgba(255,255,255,0.8); font-weight:300; }

  /* NO STREAM / ENDED */
  .lv-no-stream { display:flex; flex-direction:column; align-items:center; gap:12px; color:rgba(255,255,255,0.2); text-align:center; }
  .lv-no-stream-icon { font-size:48px; opacity:0.2; }
  .lv-no-stream h3 { font-family:var(--font-display); font-size:22px; color:rgba(255,255,255,0.25); font-weight:300; }
  .lv-ended-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.85); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; z-index:10; }
  .lv-ended-overlay h2 { font-family:var(--font-display); font-size:28px; font-weight:300; color:rgba(255,255,255,0.5); }
  .lv-back-btn { padding:10px 24px; background:var(--white); border:none; color:var(--black); font-family:var(--font-body); font-size:11px; letter-spacing:2px; text-transform:uppercase; cursor:pointer; }

  /* ACTION BUTTONS — floating bottom right */
  .lv-action-btns {
    position:absolute;
    bottom:160px;
    right:20px;
    display:flex;
    flex-direction:column;
    gap:10px;
    z-index:10;
  }

  .lv-call-btn {
    display:flex; align-items:center; gap:8px;
    padding:12px 20px;
    background:var(--white);
    border:none;
    color:var(--black);
    font-family:var(--font-body);
    font-size:11px; letter-spacing:2px; text-transform:uppercase; font-weight:500;
    cursor:pointer;
    transition:opacity var(--transition);
    white-space:nowrap;
  }
  .lv-call-btn:hover { opacity:0.88; }
  .lv-call-btn:disabled { opacity:0.4; cursor:not-allowed; }

  .lv-ar-btn {
    display:flex; align-items:center; gap:8px;
    padding:12px 20px;
    background:rgba(255,255,255,0.1);
    border:1px solid rgba(255,255,255,0.25);
    backdrop-filter:blur(8px);
    color:var(--white);
    font-family:var(--font-body);
    font-size:11px; letter-spacing:2px; text-transform:uppercase; font-weight:500;
    cursor:pointer;
    transition:all var(--transition);
    white-space:nowrap;
  }
  .lv-ar-btn:hover { background:rgba(255,255,255,0.2); border-color:rgba(255,255,255,0.5); }

  /* Calling state */
  .lv-calling-toast {
    position:absolute; top:70px; left:50%; transform:translateX(-50%) translateY(-20px);
    background:rgba(255,255,255,0.1); backdrop-filter:blur(12px);
    border:1px solid rgba(255,255,255,0.2);
    padding:12px 24px; font-size:12px; letter-spacing:1px; text-transform:uppercase;
    color:var(--white); opacity:0; transition:all 0.3s; z-index:30; white-space:nowrap;
  }
  .lv-calling-toast.show { opacity:1; transform:translateX(-50%) translateY(0); }

  /* PRODUCTS STRIP — overlaid at bottom of video */
  .lv-products-strip {
    position:absolute;
    bottom:0; left:0; right:0;
    padding:14px 20px 18px;
    background:linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%);
    z-index:5;
  }
  .lv-products-label { font-size:9px; letter-spacing:2px; text-transform:uppercase; color:rgba(255,255,255,0.3); margin-bottom:10px; }
  .lv-products-scroll { display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; }
  .lv-products-scroll::-webkit-scrollbar { height:2px; }
  .lv-products-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.15); }
  .lv-product-chip {
    display:flex; align-items:center; gap:8px;
    background:rgba(255,255,255,0.1); border:1px solid rgba(255,255,255,0.15);
    backdrop-filter:blur(8px); padding:8px 12px; cursor:pointer; flex-shrink:0;
    transition:border-color var(--transition), background var(--transition);
  }
  .lv-product-chip:hover { border-color:rgba(255,255,255,0.35); background:rgba(255,255,255,0.18); }
  .lv-prod-img { width:36px; height:36px; background:#1a1a1a; overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:16px; flex-shrink:0; }
  .lv-prod-img img { width:100%; height:100%; object-fit:cover; }
  .lv-prod-name { font-size:11px; color:rgba(255,255,255,0.75); white-space:nowrap; max-width:90px; overflow:hidden; text-overflow:ellipsis; }
  .lv-prod-price { font-size:11px; color:rgba(255,255,255,0.45); margin-top:2px; }

  @media(max-width:768px){
    .lv-action-btns { bottom:140px; right:12px; }
    .lv-call-btn, .lv-ar-btn { padding:10px 14px; font-size:10px; }
  }
`;

const client = AgoraRTC.createClient({ mode:'live', codec:'vp8' });

export default function LiveViewer() {
  const { sessionId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState(state?.session||null);
  const [shop, setShop] = useState(state?.shop||null);
  const [products, setProducts] = useState([]);
  const [streamActive, setStreamActive] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);
  const [joined, setJoined] = useState(false);
  const [calling, setCalling] = useState(false);
  const [callingToast, setCallingToast] = useState(false);

  const user = JSON.parse(localStorage.getItem('user')||'{}');

  // Fetch session if not in state
  useEffect(() => {
    if (!session) {
      api.get(`/live/${sessionId}`)
        .then(r=>{ setSession(r.data.session); setShop(r.data.session?.shop||null); })
        .catch(()=>navigate('/'));
    }
  },[sessionId]);

  // Fetch products
  useEffect(() => {
    const shopId = shop?.id||session?.shop_id;
    if (shopId) api.get(`/products?shopId=${shopId}`).then(r=>setProducts(r.data.products||[]));
  },[shop,session]);

  // Join Agora as audience
  const joinAgora = useCallback(async () => {
    if (!session?.agora_channel||joined) return;
    try {
      const tr = await api.post('/agora/token',{ channelName:session.agora_channel, uid:0, role:'audience' });
      await client.setClientRole('audience');
      await client.join(import.meta.env.VITE_AGORA_APP_ID||'YOUR_AGORA_APP_ID', session.agora_channel, tr.data.token, null);
      setJoined(true);
      client.on('user-published', async (u,t)=>{
        await client.subscribe(u,t);
        if (t==='video') { setStreamActive(true); u.videoTrack?.play('remote-video-container'); }
        if (t==='audio') u.audioTrack?.play();
      });
      client.on('user-unpublished',()=>setStreamActive(false));
      await api.patch(`/live/${sessionId}/viewers`,{action:'join'});
    } catch(err) { console.error('[Agora]',err); }
  },[session,joined,sessionId]);

  useEffect(() => {
    joinAgora();
    return () => {
      if (joined) {
        client.leave();
        api.patch(`/live/${sessionId}/viewers`,{action:'leave'}).catch(()=>{});
      }
    };
  },[joinAgora]);

  // Socket: live ended + call accepted
  useEffect(() => {
    if (!session?.id&&!sessionId) return;
    const liveId = session?.id||sessionId;

    socket.on('live_ended',({liveSessionId})=>{
      if (liveSessionId===liveId) setStreamEnded(true);
    });

    // If seller accepts call, navigate to CallScreen
    socket.on('call_accepted',({ callSessionId, agoraChannel })=>{
      setCalling(false);
      navigate(`/call/${callSessionId}`,{ state:{ callSessionId, shop, agoraChannel } });
    });

    socket.on('call_rejected',()=>{
      setCalling(false);
      setCallingToast(false);
      alert('Seller is busy right now. Try again later.');
    });

    return ()=>{
      socket.off('live_ended');
      socket.off('call_accepted');
      socket.off('call_rejected');
    };
  },[session,sessionId,shop]);

  // Call seller handler
  const handleCall = async () => {
    if (calling) return;
    setCalling(true);
    setCallingToast(true);
    try {
      const r = await api.post('/calls',{
        seller_id: session?.seller_id||shop?.seller_id,
        shop_id: shop?.id||session?.shop_id,
      });
      socket.emit('call_request',{
        callSessionId: r.data.callSessionId,
        buyerId: user.id,
        buyerName: user.name,
        sellerId: session?.seller_id||shop?.seller_id,
        shopId: shop?.id||session?.shop_id,
      });
      // Auto hide toast after 30s if no response
      setTimeout(()=>{ setCalling(false); setCallingToast(false); }, 30000);
    } catch {
      setCalling(false);
      setCallingToast(false);
      alert('Could not initiate call. Please try again.');
    }
  };

  // AR button — starts call first, AR available inside call
  const handleAR = () => {
    if (calling) return;
    handleCall();
  };

  return (
    <>
      <style>{css}</style>
      <div className="lv-root">

        {/* Top bar */}
        <div className="lv-topbar">
          <button className="lv-back" onClick={()=>navigate('/')}>← Back</button>
          <div className="lv-shop-info">
            <span className="live-pill"><span className="live-dot"/>Live</span>
            {shop?.name||session?.shop_name||'Live Stream'}
          </div>
          <span className="lv-viewers">👁 {session?.viewer_count||0}</span>
        </div>

        {/* Full width video */}
        <div className="lv-body">
          <div id="remote-video-container"/>

          {!streamActive&&!streamEnded&&(
            <div className="lv-no-stream">
              <div className="lv-no-stream-icon">📡</div>
              <h3>Connecting…</h3>
              <p style={{fontSize:13,color:'rgba(255,255,255,0.2)'}}>Waiting for stream</p>
            </div>
          )}

          {streamActive&&(
            <>
              <div className="lv-video-gradient"/>
              <div className="lv-seller-info">
                <div className="lv-seller-name">{session?.seller_name||shop?.seller_name||'Seller'}</div>
              </div>
            </>
          )}

          {streamEnded&&(
            <div className="lv-ended-overlay">
              <h2>Stream ended</h2>
              <button className="lv-back-btn" onClick={()=>navigate('/')}>Back to Home</button>
            </div>
          )}

          {/* Calling toast */}
          <div className={`lv-calling-toast ${callingToast?'show':''}`}>
            📞 Calling seller…
          </div>

          {/* Action buttons — bottom right */}
          {!streamEnded && (
            <div className="lv-action-btns">
              <button className="lv-call-btn" onClick={handleCall} disabled={calling}>
                {calling ? '📞 Calling…' : '📹 Call Seller'}
              </button>
              <button className="lv-ar-btn" onClick={handleAR} disabled={calling}>
                ✨ Try AR
              </button>
            </div>
          )}

          {/* Products strip overlaid at bottom */}
          {products.length>0&&(
            <div className="lv-products-strip">
              <div className="lv-products-label">Featured Products</div>
              <div className="lv-products-scroll">
                {products.map(p=>(
                  <div
                    key={p.id}
                    className="lv-product-chip"
                    onClick={()=>navigate(`/product/${p.id}`,{state:{product:p}})}
                  >
                    <div className="lv-prod-img">
                      {p.image_urls?.[0]?<img src={p.image_urls[0]} alt={p.name}/>:'👗'}
                    </div>
                    <div>
                      <div className="lv-prod-name">{p.name}</div>
                      <div className="lv-prod-price">₹{p.price}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>
    </>
  );
}
