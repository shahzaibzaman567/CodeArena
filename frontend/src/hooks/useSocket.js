import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';
import toast from 'react-hot-toast';

function getSocketServerUrl() {
  const configuredUrl = import.meta.env.VITE_API_URL?.replace(/\/$/, "");
  if (!configuredUrl || configuredUrl === window.location.origin) {
    return window.location.origin;
  }
  return configuredUrl;
}

export function useSocket(sessionId, userId, enabled = true) {
  const socketRef = useRef(null);
  const errorToastShownRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!enabled || !sessionId || !userId) return;
    if (socketRef.current?.connected) return;

    const serverUrl = getSocketServerUrl();
    const socket = io(serverUrl, {
      auth: { sessionId, userId },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 5,
      timeout: 10000,
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => {
      setIsConnected(true);
      errorToastShownRef.current = false; // reset on successful connect
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('connect_error', () => {
      // silently ignore — socket retries automatically
    });

    socket.on('reconnect', () => {
      setIsConnected(true);
      errorToastShownRef.current = false;
    });

    socket.on('reconnect_failed', () => {
      // silently ignore — video/chat still works without socket
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
      setIsConnected(false);
    };
  }, [sessionId, userId, enabled]);

  const handoffControl = useCallback((toUserId, fromUserId, fromUserName, toUserName) => {
    if (!socketRef.current?.connected) {
      toast.error('Connection lost. Cannot hand off control.');
      return false;
    }
    socketRef.current.emit('control:handoff', { toUserId, fromUserId, fromUserName, toUserName });
    return true;
  }, []);

  const revokeControl = useCallback((userId, userName) => {
    if (!socketRef.current?.connected) return false;
    socketRef.current.emit('control:revoke', { userId, userName });
    return true;
  }, []);

  const notifyTyping = useCallback((language, isTyping, userId) => {
    if (!socketRef.current?.connected) return;
    socketRef.current.emit('code:typing', { language, isTyping, userId });
  }, []);

  const on = useCallback((event, callback) => {
    socketRef.current?.on(event, callback);
  }, []);

  const off = useCallback((event, callback) => {
    socketRef.current?.off(event, callback);
  }, []);

  return { socket: socketRef.current, isConnected, handoffControl, revokeControl, notifyTyping, on, off };
}

export default useSocket;
