import { useEffect, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSocket } from './useSocket';
import {
  addMessage, updateMessage, removeMessage,
  addNotification, updateChatLatestMessage,
  addOnlineUser, removeOnlineUser,
} from '../store/chatSlice';

const useSocketEvents = () => {
  const socket = useSocket();
  const dispatch = useDispatch();
  const { selectedChat } = useSelector((s) => s.chat);
  const selectedChatRef = useRef(selectedChat);

  useEffect(() => { selectedChatRef.current = selectedChat; }, [selectedChat]);

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      const current = selectedChatRef.current;
      if (current && current._id === msg.chat._id) {
        dispatch(addMessage(msg));
      } else {
        dispatch(addNotification(msg));
      }
      dispatch(updateChatLatestMessage(msg));
    };

    const handleMessageEdited = (msg) => dispatch(updateMessage(msg));
    const handleMessageDeleted = ({ messageId }) => dispatch(removeMessage(messageId));
    const handleMessageReaction = (msg) => dispatch(updateMessage(msg));
    const handleUserOnline = (userId) => dispatch(addOnlineUser(userId));
    const handleUserOffline = (userId) => dispatch(removeOnlineUser(userId));


    socket.on('message received', handleNewMessage);
    socket.on('message edited', handleMessageEdited);
    socket.on('message deleted', handleMessageDeleted);
    socket.on('message reaction', handleMessageReaction);
    socket.on('user online', handleUserOnline);
    socket.on('user offline', handleUserOffline);
    

    return () => {
      socket.off('message received', handleNewMessage);
      socket.off('message edited', handleMessageEdited);
      socket.off('message deleted', handleMessageDeleted);
      socket.off('message reaction', handleMessageReaction);
      socket.off('user online', handleUserOnline);
      socket.off('user offline', handleUserOffline);
    };
  }, [socket, dispatch]);
};

export default useSocketEvents;
