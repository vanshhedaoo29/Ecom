// ============================================================
// sockets/socketHandlers.js
// Handles: live session chat, call signaling, AR events
// ============================================================

module.exports = function registerSocketHandlers(io) {

  // Map: userId → socket.id  (for targeted push to seller)
  const userSocketMap = new Map();

  io.on('connection', (socket) => {
    console.log(`[Socket] connected: ${socket.id}`);

    // ── 1. Register user so we can target them ──────────────
    socket.on('register', ({ userId }) => {
      if (userId) {
        userSocketMap.set(String(userId), socket.id);
        console.log(`[Socket] user ${userId} registered → ${socket.id}`);
      }
    });

    // ── 2. Join live session room (buyers watching) ─────────
    socket.on('join_live', ({ liveSessionId }) => {
      const room = `live_${liveSessionId}`;
      socket.join(room);
      console.log(`[Socket] ${socket.id} joined ${room}`);
    });

    socket.on('leave_live', ({ liveSessionId }) => {
      socket.leave(`live_${liveSessionId}`);
    });

    // ── 3. Live session chat ────────────────────────────────
    socket.on('live_message', ({ liveSessionId, senderId, senderName, content }) => {
      const room = `live_${liveSessionId}`;
      io.to(room).emit('live_message', {
        liveSessionId,
        senderId,
        senderName,
        content,
        sentAt: new Date().toISOString(),
      });
    });

    // ── 4. Buyer requests a call (Talk to Salesperson) ──────
    socket.on('call_request', ({ callSessionId, buyerId, buyerName, sellerId, shopId }) => {
      const sellerSocketId = userSocketMap.get(String(sellerId));
      if (sellerSocketId) {
        io.to(sellerSocketId).emit('incoming_call', {
          callSessionId,
          buyerId,
          buyerName,
          shopId,
        });
        console.log(`[Socket] call_request from buyer ${buyerId} → seller ${sellerId}`);
      } else {
        socket.emit('call_error', { message: 'Seller is not connected right now' });
      }
    });

    // ── 5. Seller accepts the call ──────────────────────────
    socket.on('call_accepted', ({ callSessionId, sellerId, buyerId, agoraChannel }) => {
      const buyerSocketId = userSocketMap.get(String(buyerId));
      if (buyerSocketId) {
        io.to(buyerSocketId).emit('call_accepted', { callSessionId, agoraChannel });
      }
      // Both join a private call room
      socket.join(`call_${callSessionId}`);
      if (buyerSocketId) io.sockets.sockets.get(buyerSocketId)?.join(`call_${callSessionId}`);
    });

    // ── 6. Seller rejects the call ──────────────────────────
    socket.on('call_rejected', ({ callSessionId, buyerId }) => {
      const buyerSocketId = userSocketMap.get(String(buyerId));
      if (buyerSocketId) {
        io.to(buyerSocketId).emit('call_rejected', { callSessionId });
      }
    });

    // ── 7. Call ended by either party ───────────────────────
    socket.on('call_ended', ({ callSessionId }) => {
      io.to(`call_${callSessionId}`).emit('call_ended', { callSessionId });
      io.socketsLeave(`call_${callSessionId}`);
    });

    // ── 8. Chat during a call ───────────────────────────────
    socket.on('call_message', ({ callSessionId, senderId, senderName, content }) => {
      io.to(`call_${callSessionId}`).emit('call_message', {
        callSessionId,
        senderId,
        senderName,
        content,
        sentAt: new Date().toISOString(),
      });
    });

    // ── 9. AR try-on toggle notification ───────────────────
    socket.on('ar_started', ({ callSessionId }) => {
      socket.to(`call_${callSessionId}`).emit('ar_started', { callSessionId });
    });

    socket.on('ar_stopped', ({ callSessionId }) => {
      socket.to(`call_${callSessionId}`).emit('ar_stopped', { callSessionId });
    });

    // ── 10. Seller captures garment → forward to buyer ──────
    // Seller emits: garment_captured { imageUrl, callId }
    // Buyer receives: garment_ready { imageUrl }
    socket.on('garment_captured', ({ imageUrl, callId }) => {
      if (!imageUrl || !callId) return;
      socket.to(`call_${callId}`).emit('garment_ready', { imageUrl });
      console.log(`[Socket] garment_captured → forwarded to call_${callId}`);
    });

    // ── 11. Disconnect cleanup ──────────────────────────────
    socket.on('disconnect', () => {
      for (const [userId, sid] of userSocketMap.entries()) {
        if (sid === socket.id) {
          userSocketMap.delete(userId);
          console.log(`[Socket] user ${userId} disconnected`);
          break;
        }
      }
    });
  });
};