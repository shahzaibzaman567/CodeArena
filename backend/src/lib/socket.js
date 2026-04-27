import { Server } from 'socket.io';

function getSocketAllowedOrigins() {
  const base = ['http://localhost:5173', 'http://localhost:3000'];
  const clientUrl = process.env.CLIENT_URL;
  if (!clientUrl) return base;
  const extra = clientUrl.split(',').map(o => o.trim()).filter(Boolean);
  return [...new Set([...base, ...extra])];
}

// 🛡️ Senior Dev: Initialize Socket.io for persistent WebSocket connections
// Used for real-time control transfer and session state management
export function initializeSocket(httpServer) {
  const allowedOrigins = getSocketAllowedOrigins();

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) {
          return callback(null, origin);
        }
        console.warn(`⚠️ Socket.io CORS blocked: ${origin}`);
        return callback(new Error(`CORS: origin ${origin} not allowed`));
      },
      credentials: true
    },
    transports: ['websocket', 'polling'],
  });

  // 🔌 Middleware: Authenticate socket connections
  io.use((socket, next) => {
    const sessionId = socket.handshake.auth.sessionId;
    const userId = socket.handshake.auth.userId;
    
    if (!sessionId || !userId) {
      return next(new Error("Authentication error: missing sessionId or userId"));
    }
    
    socket.data.sessionId = sessionId;
    socket.data.userId = userId;
    next();
  });

  // 🔌 Connection handler
  io.on('connection', (socket) => {
    console.log(`✅ Socket connected: ${socket.id} (User: ${socket.data.userId}, Session: ${socket.data.sessionId})`);
    
    // 🎯 Join session room (all users in same session join same room)
    const roomName = `session:${socket.data.sessionId}`;
    socket.join(roomName);
    console.log(`📍 Socket ${socket.id} joined room: ${roomName}`);

    // ==========================================
    // 🎮 CONTROL TRANSFER EVENTS
    // ==========================================
    
    // When user hands over control
    socket.on('control:handoff', (data) => {
      const { toUserId, fromUserId, fromUserName, toUserName } = data;
      
      console.log(`🎮 Control handoff: ${fromUserName} → ${toUserName}`);
      
      // Broadcast to all users in session
      io.to(roomName).emit('control:updated', {
        currentControlUserId: toUserId,
        previousControlUserId: fromUserId,
        fromUserName,
        toUserName,
        timestamp: Date.now()
      });
    });

    // When user takes back control
    socket.on('control:revoke', (data) => {
      const { userId, userName } = data;
      
      console.log(`🎮 Control revoked by: ${userName}`);
      
      io.to(roomName).emit('control:released', {
        currentControlUserId: null,
        releasedByUserId: userId,
        releasedByUserName: userName,
        timestamp: Date.now()
      });
    });

    // ==========================================
    // 📝 REAL-TIME CODE UPDATES (OPTIONAL)
    // Keep Stream for full persistence, use Socket for immediate broadcast
    // ==========================================
    
    socket.on('code:typing', (data) => {
      const { language, isTyping, userId } = data;
      socket.broadcast.to(roomName).emit('code:user-typing', {
        userId,
        language,
        isTyping,
        timestamp: Date.now()
      });
    });

    // ==========================================
    // 🔌 DISCONNECT HANDLER
    // ==========================================
    
    socket.on('disconnect', () => {
      console.log(`❌ Socket disconnected: ${socket.id}`);
      
      // Notify others in session that user left
      io.to(roomName).emit('user:disconnected', {
        userId: socket.data.userId,
        timestamp: Date.now()
      });
    });

    socket.on('error', (error) => {
      console.error(`⚠️ Socket error [${socket.id}]:`, error);
    });
  });

  return io;
}

// 🛡️ Utility: Get socket instance (for use in routes/controllers)
let ioInstance = null;

export function setIOInstance(io) {
  ioInstance = io;
}

export function getIOInstance() {
  return ioInstance;
}

export function emitToSession(sessionId, event, data) {
  if (!ioInstance) {
    console.warn('⚠️ Socket.io not initialized');
    return;
  }
  const roomName = `session:${sessionId}`;
  ioInstance.to(roomName).emit(event, data);
}
