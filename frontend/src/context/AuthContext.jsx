import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(localStorage.getItem('role') || null);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const sseControllerRef = useRef(null);
  const retryTimeoutRef = useRef(null);

  // ─── Load user profile when token changes ───────────────────────────────────
  useEffect(() => {
    const loadProfile = async () => {
      if (!token || !role) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        if (role === 'PATIENT') {
          const res = await api.get('/patients/me');
          setUser(res.data);
        } else if (role === 'DOCTOR') {
          const res = await api.get('/doctors');
          const email = localStorage.getItem('email');
          const doctorProfile = res.data.find(d => d.email === email);
          setUser(doctorProfile || { email, role: 'DOCTOR' });
        } else if (role === 'ADMIN') {
          setUser({ email: localStorage.getItem('email'), role: 'ADMIN' });
        }
      } catch (err) {
        console.error('Failed to load user profile:', err);
        // Token is invalid/expired - clear auth state
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        localStorage.removeItem('email');
        setToken(null);
        setRole(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, role]);

  // ─── Add a notification de-duplicating by id ─────────────────────────────────
  const addNotification = useCallback((notif) => {
    setNotifications(prev => {
      // Avoid duplicates on SSE reconnect
      if (prev.some(n => n.id === notif.id)) return prev;
      return [notif, ...prev];
    });
    if (!notif.is_read) {
      setUnreadCount(prev => prev + 1);
    }
  }, []);

  // ─── SSE Notification Stream ─────────────────────────────────────────────────
  useEffect(() => {
    if (!token) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    // 1. Load persisted notifications from DB on mount
    const fetchNotifications = async () => {
      try {
        const res = await api.get('/notifications');
        setNotifications(res.data);
        setUnreadCount(res.data.filter(n => !n.is_read).length);
      } catch (err) {
        console.error('Failed to fetch notifications:', err);
      }
    };
    fetchNotifications();

    // 2. Open SSE live stream
    let retryDelay = 10000; // start at 10s, max 30s

    const startSSE = () => {
      // Always read fresh token in case it rotated
      const currentToken = localStorage.getItem('token');
      if (!currentToken) return;

      const controller = new AbortController();
      sseControllerRef.current = controller;

      fetch('/api/v1/notifications/stream', {
        signal: controller.signal,
        headers: {
          Authorization: `Bearer ${currentToken}`,
          Accept: 'text/event-stream',
        },
      })
        .then(async (response) => {
          if (!response.ok) {
            throw new Error(`SSE error: HTTP ${response.status}`);
          }

          // Reset backoff on successful connection
          retryDelay = 10000;

          const reader = response.body.getReader();
          const decoder = new TextDecoder();
          let buffer = '';

          // eslint-disable-next-line no-constant-condition
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            // SSE events are separated by double newline
            const events = buffer.split('\n\n');
            // Keep the last partial event in the buffer
            buffer = events.pop() ?? '';

            for (const event of events) {
              // Each event may have multiple lines; find the "data:" line
              for (const line of event.split('\n')) {
                if (line.startsWith('data: ')) {
                  const dataStr = line.slice(6).trim();
                  try {
                    const parsed = JSON.parse(dataStr);
                    // Skip the initial connect handshake
                    if (parsed.connected === true) continue;
                    addNotification(parsed);
                  } catch (e) {
                    console.warn('SSE parse error:', dataStr, e);
                  }
                }
              }
            }
          }
        })
        .catch((err) => {
          if (err.name === 'AbortError') return; // intentional close
          console.warn(`SSE disconnected. Retrying in ${retryDelay / 1000}s…`, err.message);
          retryTimeoutRef.current = setTimeout(() => {
            if (localStorage.getItem('token')) {
              retryDelay = Math.min(retryDelay * 1.5, 30000);
              startSSE();
            }
          }, retryDelay);
        });
    };

    startSSE();

    return () => {
      // Cleanup: abort stream and cancel any pending retry
      if (sseControllerRef.current) {
        sseControllerRef.current.abort();
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // ─── Auth Actions ─────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      const { access_token, role: userRole } = res.data;

      localStorage.setItem('token', access_token);
      localStorage.setItem('role', userRole);
      localStorage.setItem('email', email);

      setToken(access_token);
      setRole(userRole);

      return { success: true, role: userRole };
    } catch (err) {
      const detail = err.response?.data?.detail || 'Invalid credentials';
      throw new Error(detail);
    } finally {
      setLoading(false);
    }
  };

  const register = async (patientData) => {
    try {
      await api.post('/auth/register', patientData);
      return { success: true };
    } catch (err) {
      const detail = err.response?.data?.detail || 'Registration failed';
      throw new Error(detail);
    }
  };

  const logout = () => {
    if (sseControllerRef.current) sseControllerRef.current.abort();
    if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);

    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('email');

    setToken(null);
    setRole(null);
    setUser(null);
    setNotifications([]);
    setUnreadCount(0);
  };

  const markAsRead = async (notificationId) => {
    try {
      await api.put(`/notifications/${notificationId}/read`);
      setNotifications(prev =>
        prev.map(n => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter(n => !n.is_read);
    await Promise.allSettled(
      unread.map(n => api.put(`/notifications/${n.id}/read`))
    );
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    setUnreadCount(0);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        token,
        loading,
        login,
        register,
        logout,
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
