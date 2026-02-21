from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from .user import UserSummary


class SponsorshipBase(BaseModel):
    ngo_id: int
    tree_species: str
    amount_paid: float


class SponsorshipCreate(SponsorshipBase):
    pass


class SponsorshipResponse(SponsorshipBase):
    id: int
    user_id: int
    status: str
    tree_id: Optional[int] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    # Optional embedded info
    sponsor: Optional[UserSummary] = None
    ngo: Optional[UserSummary] = None

    class Config:
        from_attributes = True
