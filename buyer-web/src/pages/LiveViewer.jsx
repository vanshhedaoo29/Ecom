// src/pages/LiveViewer.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import api from '../api/axios';
import socket from '../socket';
import ChatBox from '../components/ChatBox';
import '../theme.css';

const css = `
  .lv-root { height:100vh; background:var(--black); display:flex; flex-direction:column; color:var(--white); font-family:var(--font-body); }
  .lv-topbar { height:56px; background:rgba(0,0,0,0.9); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between; padding:0 24px; flex-shrink:0; z-index:50; }
  .lv-back { background:none; border:none; color:rgba(255,255,255,0.5); cursor:pointer; font-family:var(--font-body); font-size:12px; letter-spacing:1px; text-transform:uppercase; transition:color var(--transition); }
  .lv-back:hover { color:var(--white); }
  .lv-shop-info { display:flex; align-items:center; gap:10px; font-size:14px; font-weight:400; }
  .lv-viewers { font-size:12px; color:rgba(255,255,255,0.4); }
  .lv-call-btn { padding:9px 20px; background:var(--white); border:none; color:var(--black); font-family:var(--font-body); font-size:11px; letter-spacing:2px; text-transform:uppercase; font-weight:500; cursor:pointer; transition:opacity var(--transition); }
  .lv-call-btn:hover { opacity:0.85; }
  .lv-body { display:flex; flex:1; overflow:hidden; }
  .lv-video-col { flex:1; position:relative; background:#000; display:flex; align-items:center; justify-content:center; }
  #remote-video-container { width:100%; height:100%; }
  #remote-video-container video { width:100%!important; height:100%!important; object-fit:cover!important; }
  .lv-video-gradient { position:absolute; inset:0; background:linear-gradient(to top,rgba(0,0,0,0.4) 0%,transparent 35%); pointer-events:none; }
  .lv-seller-info { position:absolute; bottom:20px; left:20px; background:rgba(0,0,0,0.55); backdrop-filter:blur(8px); padding:10px 16px; }
  .lv-seller-name { font-size:13px; color:rgba(255,255,255,0.8); font-weight:300; }
  .lv-no-stream { display:flex; flex-direction:column; align-items:center; gap:12px; color:rgba(255,255,255,0.2); text-align:center; }
  .lv-no-stream-icon { font-size:48px; opacity:0.2; }
  .lv-no-stream h3 { font-family:var(--font-display); font-size:22px; color:rgba(255,255,255,0.25); font-weight:300; }
  .lv-ended-overlay { position:absolute; inset:0; background:rgba(0,0,0,0.85); display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; z-index:10; }
  .lv-ended-overlay h2 { font-family:var(--font-display); font-size:28px; font-weight:300; color:rgba(255,255,255,0.5); }
  .lv-chat-col { width:320px; border-left:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; flex-shrink:0; overflow:hidden; }
  .lv-products-strip { border-top:1px solid rgba(255,255,255,0.06); padding:14px 16px; flex-shrink:0; background:#0a0a0a; }
  .lv-products-label { font-size:9px; letter-spacing:2px; text-transform:uppercase; color:rgba(255,255,255,0.2); margin-bottom:10px; }
  .lv-products-scroll { display:flex; gap:8px; overflow-x:auto; padding-bottom:4px; }
  .lv-products-scroll::-webkit-scrollbar { height:2px; }
  .lv-products-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.1); }
  .lv-product-chip { display:flex; align-items:center; gap:8px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.08); padding:8px 12px; cursor:pointer; flex-shrink:0; transition:border-color var(--transition); }
  .lv-product-chip:hover { border-color:rgba(255,255,255,0.2); }
  .lv-prod-img { width:32px; height:32px; background:#1a1a1a; overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
  .lv-prod-img img { width:100%; height:100%; object-fit:cover; }
  .lv-prod-name { font-size:11px; color:rgba(255,255,255,0.6); white-space:nowrap; max-width:90px; overflow:hidden; text-overflow:ellipsis; }
  .lv-prod-price { font-size:10px; color:rgba(255,255,255,0.4); }
  @media(max-width:768px){ .lv-body{flex-direction:column} .lv-chat-col{width:100%;height:280px;border-left:none;border-top:1px solid rgba(255,255,255,0.06)} }
`;

const client = AgoraRTC.createClient({ mode:'live', codec:'vp8' });

export default function LiveViewer() {
  const { sessionId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const [session, setSession] = useState(state?.session||null);
  const [shop, setShop] = useState(state?.shop||null);
  const [messages, setMessages] = useState([]);
  const [products, setProducts] = useState([]);
  const [streamActive, setStreamActive] = useState(false);
  const [streamEnded, setStreamEnded] = useState(false);
  const [joined, setJoined] = useState(false);
  const user = JSON.parse(localStorage.getItem('user')||'{}');

  useEffect(() => {
    if (!session) api.get(`/live/${sessionId}`).then(r=>{setSession(r.data.session);setShop(r.data.session?.shop||null);}).catch(()=>navigate('/'));
  },[sessionId]);

  useEffect(() => {
    if (shop?.id||session?.shop_id) {
      api.get(`/products?shopId=${shop?.id||session?.shop_id}`).then(r=>setProducts(r.data.products||[]));
    }
  },[shop,session]);

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
    return () => { if (joined) { client.leave(); api.patch(`/live/${sessionId}/viewers`,{action:'leave'}).catch(()=>{}); } };
  },[joinAgora]);

  useEffect(() => {
    if (!session?.id&&!sessionId) return;
    const liveId = session?.id||sessionId;
    socket.emit('join_live',{liveSessionId:liveId});
    setMessages([{type:'system',content:'You joined the live stream'}]);
    socket.on('live_message',msg=>setMessages(p=>[...p,msg]));
    socket.on('live_ended',({liveSessionId})=>{ if (liveSessionId===liveId) setStreamEnded(true); });
    return ()=>{ socket.off('live_message'); socket.off('live_ended'); };
  },[session,sessionId]);

  const handleSend = t => {
    const liveId = session?.id||sessionId;
    const msg = {liveSessionId:liveId,senderId:user.id,senderName:user.name,content:t};
    socket.emit('live_message',msg);
    setMessages(p=>[...p,msg]);
  };

  const handleCall = async () => {
    try {
      const r = await api.post('/calls',{seller_id:session?.seller_id||shop?.seller_id,shop_id:shop?.id||session?.shop_id});
      socket.emit('call_request',{callSessionId:r.data.callSessionId,buyerId:user.id,buyerName:user.name,sellerId:session?.seller_id||shop?.seller_id,shopId:shop?.id||session?.shop_id});
      navigate(`/call/${r.data.callSessionId}`,{state:{callSessionId:r.data.callSessionId,shop}});
    } catch { alert('Could not initiate call.'); }
  };

  return (
    <>
      <style>{css}</style>
      <div className="lv-root">
        <div className="lv-topbar">
          <button className="lv-back" onClick={()=>navigate('/')}>← Back</button>
          <div className="lv-shop-info">
            <span className="live-pill"><span className="live-dot"/>Live</span>
            {shop?.name||session?.shop_name||'Live Stream'}
          </div>
          <div style={{display:'flex',alignItems:'center',gap:20}}>
            <span className="lv-viewers">👁 {session?.viewer_count||0}</span>
            <button className="lv-call-btn" onClick={handleCall}>📹 Call Seller</button>
          </div>
        </div>
        <div className="lv-body">
          <div className="lv-video-col">
            <div id="remote-video-container"/>
            {!streamActive&&!streamEnded&&<div className="lv-no-stream"><div className="lv-no-stream-icon">📡</div><h3>Connecting…</h3><p style={{fontSize:13,color:'rgba(255,255,255,0.2)'}}>Waiting for stream</p></div>}
            {streamActive&&<><div className="lv-video-gradient"/><div className="lv-seller-info"><div className="lv-seller-name">{session?.seller_name||shop?.seller_name||'Seller'}</div></div></>}
            {streamEnded&&<div className="lv-ended-overlay"><h2>Stream ended</h2><button className="lv-call-btn" onClick={()=>navigate('/')}>Back to Home</button></div>}
          </div>
          <div className="lv-chat-col">
            <div style={{flex:1,overflow:'hidden',display:'flex',flexDirection:'column'}}>
              <ChatBox messages={messages} onSend={handleSend} currentUserId={user.id} placeholder="Chat with others…"/>
            </div>
            {products.length>0&&(
              <div className="lv-products-strip">
                <div className="lv-products-label">Products</div>
                <div className="lv-products-scroll">
                  {products.map(p=>(
                    <div key={p.id} className="lv-product-chip" onClick={()=>navigate(`/product/${p.id}`,{state:{product:p}})}>
                      <div className="lv-prod-img">{p.image_urls?.[0]?<img src={p.image_urls[0]} alt={p.name}/>:'👗'}</div>
                      <div><div className="lv-prod-name">{p.name}</div><div className="lv-prod-price">₹{p.price}</div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}