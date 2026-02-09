from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from .user import UserSummary


class ChatMessageCreate(BaseModel):
    receiver_id: int
    content: str


class ChatMessageResponse(BaseModel):
    id: int
    room_id: int
    sender_id: int
    content: str
    is_read: bool = False
    read_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRoomResponse(BaseModel):
    id: int
    user1_id: int
    user2_id: int
    other_user: Optional[UserSummary] = None
    last_message: Optional[str] = None
    last_message_at: Optional[datetime] = None
    unread_count: int = 0
    created_at: datetime

    class Config:
        from_attributes = True


class ChatRoomWithMessages(ChatRoomResponse):
    messages: List[ChatMessageResponse] = []
