import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { io } from 'socket.io-client';
import { SocketContext } from './socketContextValue';
import { SERVER_URL } from '../utils/serverUrl';

export const SocketProvider = ({ children }) => {
  const socketRef = useRef(null);
  const [socket, setSocket] = useState(null);
  const { user } = useSelector((state) => state.auth);

  useEffect(() => {
    if (user && !socketRef.current) {
      const s = io(SERVER_URL, { withCredentials: true });
      s.emit('setup', user);
      s.on('connected', () => console.log('Socket connected'));
      socketRef.current = s;
      setSocket(s);
    }

    return () => {
      if (socketRef.current && !user) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
      }
    };
  }, [user]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
};
