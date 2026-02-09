import React, { useEffect, useState } from 'react';
import { Send, ArrowLeft } from 'lucide-react';
import { Card, Input, Button } from '../../components/common';
import { chatAPI, usersAPI } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from 'date-fns';
import './Chat.css';

interface ChatRoom {
    id: number;
    other_user: { id: number; username: string; display_name?: string; avatar_url?: string };
    last_message?: string;
    last_message_at?: string;
    unread_count: number;
}

interface Message {
    id: number;
    content: string;
    sender_id: number;
    created_at: string;
    is_read: boolean;
}

export const ChatPage: React.FC = () => {
    const { user } = useAuthStore();
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [selectedRoom, setSelectedRoom] = useState<ChatRoom | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [newMessage, setNewMessage] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRooms();
    }, []);

    useEffect(() => {
        if (selectedRoom) {
            loadMessages(selectedRoom.other_user.id);
        }
    }, [selectedRoom]);

    const loadRooms = async () => {
        try {
            const res = await chatAPI.getRooms();
            setRooms(res.data);
        } catch (error) {
            console.error('Failed to load rooms:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (userId: number) => {
        try {
            const res = await chatAPI.getChat(userId);
            setMessages(res.data.messages || []);
        } catch (error) {
            console.error('Failed to load messages:', error);
        }
    };

    const handleSend = async () => {
        if (!newMessage.trim() || !selectedRoom) return;

        try {
            await chatAPI.sendMessage(selectedRoom.other_user.id, newMessage);
            setNewMessage('');
            loadMessages(selectedRoom.other_user.id);
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    // Chat List View
    if (!selectedRoom) {
        return (
            <div className="chat-page">
                <h1 className="page-title">💬 Messages</h1>

                {loading ? (
                    <div className="loading">
                        <div className="loading-spinner" />
                    </div>
                ) : rooms.length === 0 ? (
                    <Card className="empty-chat">
                        <p>No conversations yet</p>
                        <small>Connect with other TreeKin members!</small>
                    </Card>
                ) : (
                    <div className="chat-list">
                        {rooms.map((room) => (
                            <div
                                key={room.id}
                                className="chat-item"
                                onClick={() => setSelectedRoom(room)}
                            >
                                <div className="chat-avatar">
                                    {room.other_user.avatar_url ? (
                                        <img src={room.other_user.avatar_url} alt="" />
                                    ) : (
                                        <span>{(room.other_user.display_name || room.other_user.username)[0].toUpperCase()}</span>
                                    )}
                                </div>
                                <div className="chat-info">
                                    <span className="chat-name">
                                        {room.other_user.display_name || room.other_user.username}
                                    </span>
                                    <span className="chat-preview">{room.last_message || 'No messages'}</span>
                                </div>
                                {room.unread_count > 0 && (
                                    <span className="unread-badge">{room.unread_count}</span>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // Chat Detail View
    return (
        <div className="chat-page chat-detail">
            <div className="chat-header">
                <button className="back-btn" onClick={() => setSelectedRoom(null)}>
                    <ArrowLeft size={20} />
                </button>
                <div className="chat-avatar small">
                    {selectedRoom.other_user.avatar_url ? (
                        <img src={selectedRoom.other_user.avatar_url} alt="" />
                    ) : (
                        <span>{(selectedRoom.other_user.display_name || selectedRoom.other_user.username)[0].toUpperCase()}</span>
                    )}
                </div>
                <span className="chat-title">
                    {selectedRoom.other_user.display_name || selectedRoom.other_user.username}
                </span>
            </div>

            <div className="messages-area">
                {messages.length === 0 ? (
                    <p className="no-messages">Start the conversation!</p>
                ) : (
                    messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`message ${msg.sender_id === user?.id ? 'sent' : 'received'}`}
                        >
                            <p className="message-text">{msg.content}</p>
                            <span className="message-time">
                                {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                            </span>
                        </div>
                    ))
                )}
            </div>

            <div className="message-input">
                <input
                    type="text"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                />
                <button className="send-btn" onClick={handleSend}>
                    <Send size={20} />
                </button>
            </div>
        </div>
    );
};
