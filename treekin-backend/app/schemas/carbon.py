from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class CarbonCreditResponse(BaseModel):
    id: int
    user_id: int
    tree_id: int
    amount: float
    tredits_value: float
    calculation_method: Optional[str] = None
    verified_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TreditTransactionResponse(BaseModel):
    id: int
    user_id: int
    transaction_type: str
    amount: float
    balance_after: float
    description: Optional[str] = None
    reference_id: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class WalletResponse(BaseModel):
    balance: float
    total_earned: float
    total_spent: float
    recent_transactions: list = []


class CarbonEstimateRequest(BaseModel):
    tree_id: int
    species: Optional[str] = None
    age_months: Optional[int] = None
    height_cm: Optional[float] = None


class CarbonEstimateResponse(BaseModel):
    tree_id: int
    estimated_co2_kg: float
    tredits_value: float
    calculation_method: str
