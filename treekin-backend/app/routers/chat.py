from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List
from datetime import datetime
from ..database import get_db
from ..models.user import User
from ..models.chat import ChatRoom, ChatMessage
from ..schemas.chat import (
    ChatMessageCreate, ChatMessageResponse,
    ChatRoomResponse, ChatRoomWithMessages
)
from ..schemas.user import UserSummary
from ..services.auth_utils import get_current_user

router = APIRouter(prefix="/chat", tags=["Chat"])


def get_or_create_room(db: Session, user1_id: int, user2_id: int) -> ChatRoom:
    """Get existing chat room or create new one."""
    room = db.query(ChatRoom).filter(
        or_(
            (ChatRoom.user1_id == user1_id) & (ChatRoom.user2_id == user2_id),
            (ChatRoom.user1_id == user2_id) & (ChatRoom.user2_id == user1_id)
        )
    ).first()
    
    if not room:
        room = ChatRoom(user1_id=user1_id, user2_id=user2_id)
        db.add(room)
        db.commit()
        db.refresh(room)
    
    return room


@router.get("/rooms", response_model=List[ChatRoomResponse])
def get_chat_rooms(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all chat rooms for current user."""
    rooms = db.query(ChatRoom).filter(
        or_(
            ChatRoom.user1_id == current_user.id,
            ChatRoom.user2_id == current_user.id
        )
    ).order_by(ChatRoom.last_message_at.desc().nullslast()).all()
    
    result = []
    for room in rooms:
        other_user_id = room.user2_id if room.user1_id == current_user.id else room.user1_id
        other_user = db.query(User).filter(User.id == other_user_id).first()
        
        unread_count = db.query(ChatMessage).filter(
            ChatMessage.room_id == room.id,
            ChatMessage.sender_id != current_user.id,
            ChatMessage.is_read == False
        ).count()
        
        room_response = ChatRoomResponse.model_validate(room)
        if other_user:
            room_response.other_user = UserSummary.model_validate(other_user)
        room_response.unread_count = unread_count
        result.append(room_response)
    
    return result


@router.post("/send", response_model=ChatMessageResponse)
def send_message(
    message_data: ChatMessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Send a message to another user."""
    # Verify receiver exists
    receiver = db.query(User).filter(User.id == message_data.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="User not found")
    
    if message_data.receiver_id == current_user.id:
        raise HTTPException(status_code=400, detail="Cannot message yourself")
    
    # Get or create chat room
    room = get_or_create_room(db, current_user.id, message_data.receiver_id)
    
    # Create message
    message = ChatMessage(
        room_id=room.id,
        sender_id=current_user.id,
        content=message_data.content
    )
    db.add(message)
    
    # Update room
    room.last_message = message_data.content[:100]  # Truncate for preview
    room.last_message_at = datetime.utcnow()
    
    db.commit()
    db.refresh(message)
    
    return message


@router.get("/room/{user_id}", response_model=ChatRoomWithMessages)
def get_chat_with_user(
    user_id: int,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get chat room and messages with a specific user."""
    other_user = db.query(User).filter(User.id == user_id).first()
    if not other_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    room = get_or_create_room(db, current_user.id, user_id)
    
    # Get messages
    messages = db.query(ChatMessage).filter(
        ChatMessage.room_id == room.id
    ).order_by(ChatMessage.created_at.desc()).limit(limit).all()
    
    # Mark as read
    db.query(ChatMessage).filter(
        ChatMessage.room_id == room.id,
        ChatMessage.sender_id != current_user.id,
        ChatMessage.is_read == False
    ).update({"is_read": True, "read_at": datetime.utcnow()})
    db.commit()
    
    room_response = ChatRoomWithMessages.model_validate(room)
    room_response.other_user = UserSummary.model_validate(other_user)
    room_response.messages = [ChatMessageResponse.model_validate(m) for m in reversed(messages)]
    
    return room_response


@router.post("/read/{room_id}")
def mark_as_read(
    room_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Mark all messages in a room as read."""
    updated = db.query(ChatMessage).filter(
        ChatMessage.room_id == room_id,
        ChatMessage.sender_id != current_user.id,
        ChatMessage.is_read == False
    ).update({"is_read": True, "read_at": datetime.utcnow()})
    
    db.commit()
    return {"marked_read": updated}
