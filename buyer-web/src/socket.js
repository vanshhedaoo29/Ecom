// src/socket.js
import { io } from 'socket.io-client';

const socket = io('http://10.227.108.8:5000', { // ← Replace with Member 1's IP
  autoConnect: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('[Socket] Connected:', socket.id);
  // Re-register user on reconnect if logged in
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user?.id) {
    socket.emit('register', { userId: user.id });
  }
});

socket.on('disconnect', () => {
  console.log('[Socket] Disconnected');
});

socket.on('connect_error', (err) => {
  console.error('[Socket] Connection error:', err.message);
});

export default socket;
