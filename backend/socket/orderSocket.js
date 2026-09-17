// Socket.io - real-time order updates between app and dashboard
// When a new order comes in, the dashboard lights up instantly (no page refresh needed)

const setupOrderSocket = (io) => {

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Shop owner joins their own "room" so they only see their orders
    socket.on('join_shop', (shopId) => {
      socket.join(`shop_${shopId}`);
      console.log(`🏪 Shop ${shopId} joined their room`);
    });

    // Rider joins their room
    socket.on('join_rider', (riderId) => {
      socket.join(`rider_${riderId}`);
      console.log(`🛵 Rider ${riderId} connected`);
    });

    // Customer tracks their order
    socket.on('track_order', (orderId) => {
      socket.join(`order_${orderId}`);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
    });
  });

  // These functions are called from routes to push updates
  return {
    // Notify shop owner of new order
    newOrder: (shopId, order) => {
      io.to(`shop_${shopId}`).emit('new_order', order);
    },

    // Notify customer their order status changed
    orderStatusUpdate: (orderId, status) => {
      io.to(`order_${orderId}`).emit('order_status_update', { orderId, status });
    },

    // Notify rider they have a new delivery
    newDelivery: (riderId, order) => {
      io.to(`rider_${riderId}`).emit('new_delivery', order);
    }
  };
};

module.exports = setupOrderSocket;
