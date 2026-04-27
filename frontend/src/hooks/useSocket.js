import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

// 🛡️ Senior Dev: Get server URL for Socket.io connection
function getSocketServerUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  const isSameOrigin = 
    typeof window !== "undefined" &&
    configuredUrl &&
    configuredUrl === window.location.origin;
  
  // If API is same origin or not configured, use current origin
  if (isSameOrigin || !configuredUrl) {
    return window.location.origin;
  }
  
  // Otherwise use configured API URL
  return configuredUrl;
}

// 🛡️ Senior Dev: Custom hook for Socket.io connection management
export function useSocket(sessionId, userId, enabled = true) {
  const socketRef = useRef(null);
  const [isConnected, setIsConnected] = useState(false);

  // Initialize socket connection
  useEffect(() => {
    if (!enabled || !sessionId || !userId) {
      return;
    }

    // Only create new socket if one doesn't exist
    if (socketRef.current?.connected) {
      return;
    }

    console.log(`🔌 Initializing Socket.io for session ${sessionId}, user ${userId}`);

    const serverUrl = getSocketServerUrl();
    const socket = io(serverUrl, {
      auth: {
        sessionId,
        userId
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      transports: ['websocket', 'polling']
    });

    // ==========================================
    // Connection events
    // ==========================================

    socket.on('connect', () => {
      console.log(`✅ Socket.io connected: ${socket.id}`);
      setIsConnected(true);
    });

    socket.on('disconnect', () => {
      console.log(`❌ Socket.io disconnected`);
      setIsConnected(false);
    });

    socket.on('connect_error', (error) => {
      console.error(`⚠️ Socket.io connection error:`, error);
      toast.error('Failed to connect to session server');
    });

    socketRef.current = socket;

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setIsConnected(false);
      }
    };
  }, [sessionId, userId, enabled]);

  // 🎮 Send control handoff event
  const handoffControl = useCallback((toUserId, fromUserId, fromUserName, toUserName) => {
    if (!socketRef.current?.connected) {
      console.warn('⚠️ Socket not connected, cannot handoff control');
      toast.error('Connection lost. Cannot handoff control.');
      return false;
    }

    socketRef.current.emit('control:handoff', {
      toUserId,
      fromUserId,
      fromUserName,
      toUserName
    });

    console.log(`🎮 Control handoff sent: ${fromUserName} → ${toUserName}`);
    return true;
  }, []);

  // 🎮 Send control release event
  const revokeControl = useCallback((userId, userName) => {
    if (!socketRef.current?.connected) {
      console.warn('⚠️ Socket not connected, cannot revoke control');
      return false;
    }

    socketRef.current.emit('control:revoke', {
      userId,
      userName
    });

    console.log(`🎮 Control revoked by ${userName}`);
    return true;
  }, []);

  // 📝 Notify that user is typing
  const notifyTyping = useCallback((language, isTyping, userId) => {
    if (!socketRef.current?.connected) return;

    socketRef.current.emit('code:typing', {
      language,
      isTyping,
      userId
    });
  }, []);

  // 🔌 Listen to events
  const on = useCallback((event, callback) => {
    if (!socketRef.current) {
      console.warn(`⚠️ Socket not initialized, cannot listen to ${event}`);
      return;
    }
    socketRef.current.on(event, callback);
  }, []);

  // 🔌 Stop listening to events
  const off = useCallback((event, callback) => {
    if (!socketRef.current) return;
    socketRef.current.off(event, callback);
  }, []);

  return {
    socket: socketRef.current,
    isConnected,
    handoffControl,
    revokeControl,
    notifyTyping,
    on,
    off
  };
}

export default useSocket;
