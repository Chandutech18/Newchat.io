import { useContext } from 'react';
import { SocketContext } from '../context/socketContextValue';

export const useSocket = () => useContext(SocketContext);
