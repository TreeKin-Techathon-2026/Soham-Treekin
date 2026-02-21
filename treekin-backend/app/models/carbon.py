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
    tree_id = Column(Integer, ForeignKey("trees.id", ondelete="CASCADE"), nullable=False)
    
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


class TreeSponsorship(Base):
    """Contracts for funding trees to be planted by NGOs."""
    
    __tablename__ = "tree_sponsorships"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    ngo_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    tree_species = Column(String(100), nullable=False)
    amount_paid = Column(Float, nullable=False)
    
    # Status: pending, planted, verified
    status = Column(String(20), default="pending")
    
    # Once the NGO plants the tree, they link it here
    tree_id = Column(Integer, ForeignKey("trees.id"))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    # Relationships
    sponsor = relationship("User", foreign_keys=[user_id])
    ngo = relationship("User", foreign_keys=[ngo_id])
    tree = relationship("Tree")
    
    def __repr__(self):
        return f"<TreeSponsorship {self.id}: {self.status}>"
