// src/components/ChatBox.jsx
import React, { useState, useEffect, useRef } from 'react';

const styles = `
  .chatbox-wrap { display:flex; flex-direction:column; height:100%; background:#0a0a0a; font-family:'Jost',sans-serif; }
  .chat-header { padding:14px 16px 12px; border-bottom:1px solid rgba(255,255,255,0.06); display:flex; align-items:center; justify-content:space-between; flex-shrink:0; }
  .chat-header-title { font-size:9px; letter-spacing:3px; text-transform:uppercase; color:rgba(255,255,255,0.25); font-weight:500; }
  .chat-count { font-size:11px; color:rgba(255,255,255,0.15); }
  .chat-messages { flex:1; overflow-y:auto; padding:12px 14px; display:flex; flex-direction:column; gap:10px; scroll-behavior:smooth; }
  .chat-messages::-webkit-scrollbar { width:2px; }
  .chat-messages::-webkit-scrollbar-thumb { background:rgba(255,255,255,0.08); }
  .chat-msg { display:flex; flex-direction:column; gap:3px; animation:msg-in 0.2s ease; }
  @keyframes msg-in{from{opacity:0;transform:translateY(5px)}to{opacity:1;transform:translateY(0)}}
  .chat-msg.own .msg-bubble { background:rgba(255,255,255,0.12); border-color:rgba(255,255,255,0.18); align-self:flex-end; }
  .msg-sender { font-size:10px; color:rgba(255,255,255,0.25); font-weight:500; letter-spacing:0.5px; }
  .msg-bubble { display:inline-block; max-width:85%; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.08); padding:8px 12px; font-size:13px; color:rgba(255,255,255,0.75); line-height:1.5; word-break:break-word; font-weight:300; }
  .msg-system { text-align:center; font-size:10px; color:rgba(255,255,255,0.15); padding:4px 0; font-style:italic; }
  .chat-empty { flex:1; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,0.12); font-size:12px; text-align:center; padding:20px; }
  .chat-input-row { display:flex; padding:12px 14px; border-top:1px solid rgba(255,255,255,0.06); flex-shrink:0; }
  .chat-input { flex:1; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-right:none; padding:10px 14px; color:#fff; font-size:13px; font-weight:300; outline:none; transition:border-color 0.2s; font-family:inherit; }
  .chat-input:focus { border-color:rgba(255,255,255,0.2); }
  .chat-input::placeholder { color:rgba(255,255,255,0.12); }
  .chat-send { width:44px; background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.08); color:rgba(255,255,255,0.5); cursor:pointer; font-size:14px; transition:all 0.18s; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
  .chat-send:hover:not(:disabled) { background:rgba(255,255,255,0.15); color:#fff; }
  .chat-send:disabled { opacity:0.3; cursor:not-allowed; }
`;

export default function ChatBox({ messages=[], onSend, currentUserId, placeholder='Say something…' }) {
  const [text, setText] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({behavior:'smooth'}); }, [messages]);

  const handleSend = () => {
    const t = text.trim();
    if (!t) return;
    onSend(t);
    setText('');
  };

  return (
    <>
      <style>{styles}</style>
      <div className="chatbox-wrap">
        <div className="chat-header">
          <span className="chat-header-title">Live Chat</span>
          <span className="chat-count">{messages.length}</span>
        </div>
        <div className="chat-messages">
          {messages.length===0
            ? <div className="chat-empty">No messages yet</div>
            : messages.map((msg,i)=>{
                if (msg.type==='system') return <div key={i} className="msg-system">{msg.content}</div>;
                const own = msg.senderId===currentUserId;
                return (
                  <div key={i} className={`chat-msg ${own?'own':''}`}>
                    {!own&&<div className="msg-sender">{msg.senderName}</div>}
                    <div className="msg-bubble">{msg.content}</div>
                  </div>
                );
              })
          }
          <div ref={bottomRef}/>
        </div>
        <div className="chat-input-row">
          <input className="chat-input" value={text} onChange={e=>setText(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();}}} placeholder={placeholder} maxLength={300}/>
          <button className="chat-send" onClick={handleSend} disabled={!text.trim()}>➤</button>
        </div>
      </div>
    </>
  );
}