from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.sql import func
from ..database import Base


class ChatRoom(Base):
    """Chat room between users."""
    
    __tablename__ = "chat_rooms"
    
    id = Column(Integer, primary_key=True, index=True)
    
    # Two-user chat (can extend for group chats)
    user1_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    user2_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    last_message = Column(Text)
    last_message_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<ChatRoom {self.id}: Users {self.user1_id}-{self.user2_id}>"


class ChatMessage(Base):
    """Messages in chat rooms."""
    
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("chat_rooms.id"), nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    content = Column(Text, nullable=False)
    
    is_read = Column(Boolean, default=False)
    read_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<ChatMessage {self.id} in Room {self.room_id}>"
