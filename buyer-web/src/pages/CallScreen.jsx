// src/pages/CallScreen.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import AgoraRTC from 'agora-rtc-sdk-ng';
import api from '../api/axios';
import socket from '../socket';
import ChatBox from '../components/ChatBox';
import ARTryOn from '../components/ARTryOn';
import '../theme.css';

const css = `
  .cs-root { height:100vh; background:var(--black); display:flex; flex-direction:column; color:var(--white); font-family:var(--font-body); }
  .cs-topbar { height:56px; background:rgba(0,0,0,0.9); border-bottom:1px solid rgba(255,255,255,0.08); display:flex; align-items:center; justify-content:space-between; padding:0 24px; flex-shrink:0; }
  .cs-status { display:flex; align-items:center; gap:10px; font-size:14px; font-weight:400; }
  .cs-status-dot { width:8px; height:8px; border-radius:50%; background:#22c55e; box-shadow:0 0 8px rgba(34,197,94,0.5); animation:pulse-g 2s infinite; }
  @keyframes pulse-g{0%,100%{box-shadow:0 0 8px rgba(34,197,94,0.5)}50%{box-shadow:0 0 16px rgba(34,197,94,0.8)}}
  .cs-status-dot.connecting { background:#f59e0b; box-shadow:none; animation:none; }
  .cs-status-dot.ended { background:#ef4444; box-shadow:none; animation:none; }
  .cs-timer { font-size:13px; color:rgba(255,255,255,0.3); letter-spacing:2px; font-variant-numeric:tabular-nums; }
  .cs-body { display:flex; flex:1; overflow:hidden; }
  .cs-video-col { flex:1; position:relative; background:#000; overflow:hidden; }
  .cs-remote-video { width:100%; height:100%; }
  #cs-remote-container { width:100%; height:100%; }
  #cs-remote-container video { width:100%!important; height:100%!important; object-fit:cover!important; }
  .cs-local-pip { position:absolute; bottom:100px; right:20px; width:140px; height:190px; border:1px solid rgba(255,255,255,0.15); overflow:hidden; z-index:10; background:#111; }
  #cs-local-container { width:100%; height:100%; }
  #cs-local-container video { width:100%!important; height:100%!important; object-fit:cover!important; }
  .pip-label { position:absolute; bottom:0; left:0; right:0; text-align:center; font-size:10px; color:rgba(255,255,255,0.4); background:rgba(0,0,0,0.5); padding:4px; letter-spacing:1px; text-transform:uppercase; }
  .cs-waiting { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; background:#080808; }
  .cs-waiting-icon { font-size:48px; animation:float 3s ease-in-out infinite; }
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
  .cs-waiting h3 { font-family:var(--font-display); font-size:24px; font-weight:300; color:rgba(255,255,255,0.4); }
  .cs-waiting p { font-size:13px; color:rgba(255,255,255,0.2); }
  .cs-ended { position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:16px; background:rgba(0,0,0,0.9); }
  .cs-controls { position:absolute; bottom:24px; left:50%; transform:translateX(-50%); display:flex; align-items:center; gap:12px; background:rgba(0,0,0,0.75); backdrop-filter:blur(12px); border:1px solid rgba(255,255,255,0.08); padding:10px 20px; z-index:20; }
  .ctrl-btn { width:44px; height:44px; border:1px solid rgba(255,255,255,0.12); background:rgba(255,255,255,0.06); color:var(--white); font-size:18px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:all var(--transition); }
  .ctrl-btn:hover { background:rgba(255,255,255,0.12); }
  .ctrl-btn.active { background:rgba(255,255,255,0.15); border-color:rgba(255,255,255,0.3); }
  .ctrl-btn-end { background:#dc2626; border-color:#dc2626; font-size:20px; width:52px; height:52px; }
  .ctrl-btn-end:hover { background:#b91c1c; }

  .ar-toggle {
    padding:0 18px; height:44px;
    border:1px solid rgba(255,255,255,0.12);
    background:rgba(255,255,255,0.05);
    color:rgba(255,255,255,0.6);
    font-family:var(--font-body); font-size:11px; letter-spacing:1.5px; text-transform:uppercase;
    cursor:pointer; transition:all var(--transition);
  }
  .ar-toggle:hover { border-color:rgba(255,255,255,0.3); color:var(--white); }
  .ar-toggle.ready {
    background:rgba(255,255,255,0.12);
    border-color:rgba(255,255,255,0.4);
    color:var(--white);
    animation:ar-pulse 2s ease-in-out infinite;
  }
  @keyframes ar-pulse {
    0%,100%{ box-shadow:0 0 0 0 rgba(255,255,255,0.2); }
    50%{ box-shadow:0 0 0 6px rgba(255,255,255,0); }
  }
  .ar-toggle.disabled { opacity:0.3; cursor:not-allowed; }

  .ar-notif {
    position:absolute; top:70px; left:50%; transform:translateX(-50%) translateY(-20px);
    background:rgba(255,255,255,0.1); backdrop-filter:blur(12px);
    border:1px solid rgba(255,255,255,0.2);
    padding:12px 20px; font-size:12px; letter-spacing:1px; text-transform:uppercase;
    color:var(--white); opacity:0; transition:all 0.3s; z-index:30; white-space:nowrap;
  }
  .ar-notif.show { opacity:1; transform:translateX(-50%) translateY(0); }

  .cs-sidebar { width:300px; border-left:1px solid rgba(255,255,255,0.06); display:flex; flex-direction:column; overflow:hidden; background:#0a0a0a; flex-shrink:0; }
  .cs-products-panel { padding:16px; border-bottom:1px solid rgba(255,255,255,0.06); flex-shrink:0; }
  .cs-products-label { font-size:9px; letter-spacing:2px; text-transform:uppercase; color:rgba(255,255,255,0.2); margin-bottom:10px; }
  .cs-product-row { display:flex; align-items:center; gap:10px; padding:8px 10px; border:1px solid rgba(255,255,255,0.06); cursor:pointer; margin-bottom:6px; transition:border-color var(--transition); }
  .cs-product-row:hover { border-color:rgba(255,255,255,0.18); }
  .cs-prod-thumb { width:36px; height:36px; background:#1a1a1a; overflow:hidden; display:flex; align-items:center; justify-content:center; font-size:14px; flex-shrink:0; }
  .cs-prod-thumb img { width:100%; height:100%; object-fit:cover; }
  .cs-prod-name { font-size:12px; color:rgba(255,255,255,0.6); flex:1; }
  .cs-prod-price { font-size:11px; color:rgba(255,255,255,0.35); }
  .cs-ended-note { padding:20px; text-align:center; color:rgba(255,255,255,0.25); font-size:13px; }

  @media(max-width:768px){ .cs-sidebar{display:none} .cs-local-pip{width:100px;height:140px} }
`;

const client = AgoraRTC.createClient({ mode:'rtc', codec:'vp8' });
let localTracks = { audio:null, video:null };

export default function CallScreen() {
  const { callId } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();

  const [callStatus, setCallStatus] = useState('connecting');
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [messages, setMessages] = useState([]);
  const [products, setProducts] = useState([]);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);

  // AR state
  const [arGarment, setArGarment] = useState(null);
  const [arVisible, setArVisible] = useState(false);
  const [arNotif, setArNotif] = useState(false);

  const shop = state?.shop || null;
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const callSessionId = state?.callSessionId || callId;

  useEffect(() => {
    if (shop?.id) api.get(`/products?shopId=${shop.id}`).then(r => setProducts(r.data.products || []));
  }, [shop]);

  useEffect(() => {
    // Call accepted → join Agora
    socket.on('call_accepted', async ({ callSessionId: cid, agoraChannel }) => {
      if (cid !== callSessionId) return;
      setCallStatus('active');
      timerRef.current = setInterval(() => setElapsed(e => e + 1), 1000);
      await joinAgora(agoraChannel);
    });

    socket.on('call_rejected', ({ callSessionId: cid }) => {
      if (cid === callSessionId) setCallStatus('rejected');
    });

    socket.on('call_message', msg => setMessages(p => [...p, msg]));

    socket.on('call_ended', ({ callSessionId: cid }) => {
      if (cid === callSessionId) endCall(false);
    });

    // ★ Backend forwards garment_ready when seller captures garment
    // Backend socketHandlers.js line: socket.on('garment_captured') → emits garment_ready
    socket.on('garment_ready', ({ imageUrl }) => {
      if (!imageUrl) return;
      setArGarment({
        imageUrl,
        name: null,
        price: null,
        dimensions: null,
      });
      // Show toast notification
      setArNotif(true);
      setTimeout(() => setArNotif(false), 3000);
    });

    // ar_stopped — seller dismissed AR
    socket.on('ar_stopped', ({ callSessionId: cid }) => {
      if (cid === callSessionId) {
        setArVisible(false);
        setArGarment(null);
      }
    });

    return () => {
      socket.off('call_accepted');
      socket.off('call_rejected');
      socket.off('call_message');
      socket.off('call_ended');
      socket.off('garment_ready');
      socket.off('ar_stopped');
    };
  }, [callSessionId]);

  const joinAgora = useCallback(async (ch) => {
    try {
      const tr = await api.post('/agora/call-channel', { callSessionId });
      await client.join(
        import.meta.env.VITE_AGORA_APP_ID || 'YOUR_AGORA_APP_ID',
        ch || tr.data.channelName,
        tr.data.token,
        null
      );
      localTracks.audio = await AgoraRTC.createMicrophoneAudioTrack();
      localTracks.video = await AgoraRTC.createCameraVideoTrack();
      localTracks.video.play('cs-local-container');
      await client.publish([localTracks.audio, localTracks.video]);
      client.on('user-published', async (u, t) => {
        await client.subscribe(u, t);
        if (t === 'video') u.videoTrack?.play('cs-remote-container');
        if (t === 'audio') u.audioTrack?.play();
      });
    } catch (err) { console.error('[Agora call]', err); }
  }, [callSessionId]);

  const endCall = useCallback((emit = true) => {
    clearInterval(timerRef.current);
    setCallStatus('ended');
    setArVisible(false);
    if (emit) {
      socket.emit('call_ended', { callSessionId });
      api.patch(`/calls/${callId}/end`).catch(() => {});
    }
    localTracks.audio?.close();
    localTracks.video?.close();
    client.leave().catch(() => {});
  }, [callId, callSessionId]);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const toggleMute = () => { localTracks.audio?.setEnabled(muted); setMuted(m => !m); };
  const toggleVideo = () => { localTracks.video?.setEnabled(videoOff); setVideoOff(v => !v); };

  const handleSend = t => {
    const msg = { callSessionId, senderId: user.id, senderName: user.name, content: t };
    socket.emit('call_message', msg);
    setMessages(p => [...p, msg]);
  };

  const handleAddToCart = async (recommendedSize) => {
    if (!arGarment) return;
    const product = products.find(p =>
      p.image_urls?.includes(arGarment.imageUrl)
    ) || products[0];
    if (!product) return;
    await api.post('/cart', {
      product_id: product.id,
      quantity: 1,
      size: recommendedSize || null,
    });
  };

  return (
    <>
      <style>{css}</style>

      {/* AR overlay — shown fullscreen on top of everything */}
      {arVisible && arGarment && (
        <ARTryOn
          garmentImageUrl={arGarment.imageUrl}
          garmentName={arGarment.name}
          garmentPrice={arGarment.price}
          garmentDimensions={arGarment.dimensions}
          onClose={() => setArVisible(false)}
          onAddToCart={handleAddToCart}
        />
      )}

      <div className="cs-root">
        {/* Topbar */}
        <div className="cs-topbar">
          <div className="cs-status">
            <div className={`cs-status-dot ${callStatus === 'active' ? '' : callStatus === 'connecting' ? 'connecting' : 'ended'}`}/>
            {callStatus === 'connecting' && 'Waiting for seller…'}
            {callStatus === 'active' && `Call with ${shop?.seller_name || shop?.name || 'Seller'}`}
            {callStatus === 'rejected' && 'Call rejected'}
            {callStatus === 'ended' && 'Call ended'}
          </div>
          {callStatus === 'active' && <div className="cs-timer">{fmt(elapsed)}</div>}
        </div>

        <div className="cs-body">
          {/* Video column */}
          <div className="cs-video-col">
            <div className="cs-remote-video"><div id="cs-remote-container"/></div>

            {/* AR notification toast */}
            <div className={`ar-notif ${arNotif ? 'show' : ''}`}>
              👗 Seller sent a garment — Try AR
            </div>

            {callStatus === 'connecting' && (
              <div className="cs-waiting">
                <div className="cs-waiting-icon">📞</div>
                <h3>Calling seller…</h3>
                <p>Waiting for them to pick up</p>
              </div>
            )}

            {callStatus === 'rejected' && (
              <div className="cs-ended">
                <div style={{fontSize:40}}>📵</div>
                <h3 style={{fontFamily:'var(--font-display)',fontSize:24,fontWeight:300,color:'rgba(255,255,255,0.4)'}}>Call rejected</h3>
                <button style={{background:'none',border:'1px solid rgba(255,255,255,0.2)',color:'rgba(255,255,255,0.5)',padding:'10px 24px',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:11,letterSpacing:2,textTransform:'uppercase'}} onClick={()=>navigate('/')}>Go Back</button>
              </div>
            )}

            {callStatus === 'ended' && (
              <div className="cs-ended">
                <div style={{fontSize:40}}>👋</div>
                <h3 style={{fontFamily:'var(--font-display)',fontSize:24,fontWeight:300,color:'rgba(255,255,255,0.4)'}}>Call ended · {fmt(elapsed)}</h3>
                <button style={{background:'var(--white)',border:'none',color:'var(--black)',padding:'12px 28px',cursor:'pointer',fontFamily:'var(--font-body)',fontSize:11,letterSpacing:2,textTransform:'uppercase'}} onClick={()=>navigate('/')}>Back to Home</button>
              </div>
            )}

            {/* Local PiP */}
            {(callStatus === 'active' || callStatus === 'connecting') && (
              <div className="cs-local-pip">
                <div id="cs-local-container"/>
                <div className="pip-label">You</div>
              </div>
            )}

            {/* Controls */}
            {callStatus === 'active' && (
              <div className="cs-controls">
                <button className={`ctrl-btn ${muted ? 'active' : ''}`} onClick={toggleMute}>
                  {muted ? '🔇' : '🎙'}
                </button>
                <button className={`ctrl-btn ${videoOff ? 'active' : ''}`} onClick={toggleVideo}>
                  {videoOff ? '📷' : '📹'}
                </button>

                {/* AR button — glows white when garment received from seller */}
                <button
                  className={`ar-toggle ${arGarment ? 'ready' : 'disabled'}`}
                  onClick={() => arGarment && setArVisible(true)}
                  title={arGarment ? 'Open AR Try-On' : 'Waiting for seller to send garment'}
                >
                  {arGarment ? '✨ Try AR' : '👗 AR'}
                </button>

                <button className="ctrl-btn ctrl-btn-end" onClick={() => endCall(true)}>📵</button>
              </div>
            )}
          </div>

          {/* Sidebar — products + chat */}
          <div className="cs-sidebar">
            {products.length > 0 && (
              <div className="cs-products-panel">
                <div className="cs-products-label">Products</div>
                {products.slice(0, 5).map(p => (
                  <div key={p.id} className="cs-product-row" onClick={() => navigate(`/product/${p.id}`, { state: { product: p } })}>
                    <div className="cs-prod-thumb">
                      {p.image_urls?.[0] ? <img src={p.image_urls[0]} alt={p.name}/> : '👗'}
                    </div>
                    <span className="cs-prod-name">{p.name}</span>
                    <span className="cs-prod-price">₹{p.price}</span>
                  </div>
                ))}
              </div>
            )}

            <div style={{flex:1, overflow:'hidden', display:'flex', flexDirection:'column'}}>
              {callStatus === 'active'
                ? <ChatBox messages={messages} onSend={handleSend} currentUserId={user.id} placeholder="Message seller…"/>
                : <div className="cs-ended-note">{callStatus === 'connecting' ? 'Chat will appear once connected.' : 'Call has ended.'}</div>
              }
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
