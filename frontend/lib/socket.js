// Socket.io client - connects to backend for real-time order updates
import { io } from 'socket.io-client';

let socket;

export const getSocket = () => {
  if (!socket) {
    socket = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      autoConnect: false // don't connect until we call connect()
    });
  }
  return socket;
};

// Connect socket and join shop's room (so only this shop's orders come through)
export const connectSocket = (shopId) => {
  const s = getSocket();
  s.connect();
  s.emit('join_shop', shopId);
  return s;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
  }
};
