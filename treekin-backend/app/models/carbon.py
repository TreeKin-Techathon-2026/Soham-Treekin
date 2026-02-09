from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey, Enum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..database import Base
import enum


class TransactionType(str, enum.Enum):
    EARNED = "earned"          # From tree growth
    SPENT = "spent"            # Redeemed voucher
    BONUS = "bonus"            # Achievement bonus
    TRANSFERRED = "transferred" # Sent to another user


class CarbonCredit(Base):
    """Carbon credit records for trees."""
    
    __tablename__ = "carbon_credits"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    tree_id = Column(Integer, ForeignKey("trees.id"), nullable=False)
    
    amount = Column(Float, nullable=False)  # In kg CO2
    tredits_value = Column(Float, nullable=False)  # TREDITS earned
    
    calculation_method = Column(String(100))  # Algorithm used
    calculation_params = Column(Text)  # JSON of parameters
    
    # Verification
    verified_by_id = Column(Integer, ForeignKey("users.id"))
    verified_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    user = relationship("User", foreign_keys=[user_id])  # No back_populates
    tree = relationship("Tree", back_populates="carbon_records")
    
    def __repr__(self):
        return f"<CarbonCredit {self.amount}kg for Tree {self.tree_id}>"


class TreditTransaction(Base):
    """Wallet transactions for TREDITS."""
    
    __tablename__ = "tredit_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    transaction_type = Column(String(20), nullable=False)
    amount = Column(Float, nullable=False)
    balance_after = Column(Float, nullable=False)
    
    description = Column(String(500))
    reference_id = Column(String(100))  # Related tree/voucher/etc.
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    def __repr__(self):
        return f"<TreditTransaction {self.transaction_type}: {self.amount}>"
