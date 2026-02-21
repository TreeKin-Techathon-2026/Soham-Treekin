from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..models.user import User
from ..models.tree import Tree
from ..models.carbon import CarbonCredit, TreditTransaction, TreeSponsorship
from ..schemas.carbon import (
    CarbonCreditResponse, TreditTransactionResponse,
    WalletResponse, CarbonEstimateRequest, CarbonEstimateResponse
)
from ..schemas.sponsorship import SponsorshipCreate, SponsorshipResponse
from ..services.auth_utils import get_current_user

router = APIRouter(prefix="/carbon", tags=["Carbon Credits"])


# Carbon estimation formulas (simplified)
CARBON_RATES = {
    "default": 21.77,  # kg CO2 per year for average tree
    "oak": 25.0,
    "pine": 18.5,
    "maple": 22.0,
    "banyan": 35.0,
    "neem": 28.0,
    "eucalyptus": 20.0
}

TREDIT_RATE = 0.1  # 1 TREDIT per 10 kg CO2


def calculate_carbon(species: str = None, age_months: int = None, height_cm: float = None) -> dict:
    """Calculate carbon credits for a tree."""
    base_rate = CARBON_RATES.get(species.lower() if species else "default", CARBON_RATES["default"])
    
    # Adjust for age (older trees absorb more)
    age_factor = 1.0
    if age_months:
        if age_months < 12:
            age_factor = 0.5
        elif age_months < 36:
            age_factor = 0.8
        elif age_months > 60:
            age_factor = 1.2
    
    # Adjust for height
    height_factor = 1.0
    if height_cm:
        if height_cm > 300:
            height_factor = 1.3
        elif height_cm > 150:
            height_factor = 1.1
    
    annual_co2 = base_rate * age_factor * height_factor
    tredits = annual_co2 * TREDIT_RATE
    
    return {
        "annual_co2_kg": round(annual_co2, 2),
        "tredits_value": round(tredits, 2),
        "method": "formula_v1"
    }


@router.get("/estimate", response_model=CarbonEstimateResponse)
def estimate_carbon(
    tree_id: int,
    species: str = None,
    age_months: int = None,
    height_cm: float = None,
    db: Session = Depends(get_db)
):
    """Estimate carbon credits for a tree."""
    tree = db.query(Tree).filter(Tree.id == tree_id).first()
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    # Use tree data if not provided
    species = species or tree.species
    age_months = age_months or tree.age_months
    height_cm = height_cm or tree.height_cm
    
    result = calculate_carbon(species, age_months, height_cm)
    
    return CarbonEstimateResponse(
        tree_id=tree_id,
        estimated_co2_kg=result["annual_co2_kg"],
        tredits_value=result["tredits_value"],
        calculation_method=result["method"]
    )


@router.post("/claim/{tree_id}")
def claim_carbon_credits(
    tree_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Claim carbon credits for a tree (once per period)."""
    tree = db.query(Tree).filter(Tree.id == tree_id).first()
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    if tree.owner_id != current_user.id and tree.adopter_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Calculate credits
    result = calculate_carbon(tree.species, tree.age_months, tree.height_cm)
    
    # Create carbon credit record
    credit = CarbonCredit(
        user_id=current_user.id,
        tree_id=tree_id,
        amount=result["annual_co2_kg"],
        tredits_value=result["tredits_value"],
        calculation_method=result["method"]
    )
    db.add(credit)
    
    # Update tree's total
    tree.carbon_credits += result["annual_co2_kg"]
    tree.total_tredits_earned += result["tredits_value"]
    
    # Update user wallet
    old_balance = current_user.tredits_balance
    current_user.tredits_balance += result["tredits_value"]
    current_user.total_carbon_saved += result["annual_co2_kg"]
    
    # Create transaction record
    transaction = TreditTransaction(
        user_id=current_user.id,
        transaction_type="earned",
        amount=result["tredits_value"],
        balance_after=current_user.tredits_balance,
        description=f"Carbon credits from tree #{tree_id}",
        reference_id=str(tree_id)
    )
    db.add(transaction)
    
    db.commit()
    
    return {
        "message": "Carbon credits claimed successfully",
        "co2_claimed": result["annual_co2_kg"],
        "tredits_earned": result["tredits_value"],
        "new_balance": current_user.tredits_balance
    }


@router.get("/wallet", response_model=WalletResponse)
def get_wallet(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's TREDIT wallet."""
    # Calculate totals
    transactions = db.query(TreditTransaction).filter(
        TreditTransaction.user_id == current_user.id
    ).order_by(TreditTransaction.created_at.desc()).limit(10).all()
    
    earned = sum(t.amount for t in transactions if t.transaction_type == "earned")
    spent = sum(abs(t.amount) for t in transactions if t.transaction_type == "spent")
    
    return WalletResponse(
        balance=current_user.tredits_balance,
        total_earned=earned,
        total_spent=spent,
        recent_transactions=[TreditTransactionResponse.model_validate(t) for t in transactions]
    )


@router.get("/history", response_model=List[CarbonCreditResponse])
def get_carbon_history(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's carbon credit history."""
    credits = db.query(CarbonCredit).filter(
        CarbonCredit.user_id == current_user.id
    ).order_by(CarbonCredit.created_at.desc()).all()
    
    return credits


@router.post("/sponsor", response_model=SponsorshipResponse)
def create_sponsorship(
    sponsorship: SponsorshipCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new tree sponsorship contract."""
    # Check if NGO exists
    ngo = db.query(User).filter(User.id == sponsorship.ngo_id, User.is_ngo == True).first()
    if not ngo:
        raise HTTPException(status_code=404, detail="NGO not found")
    
    new_contract = TreeSponsorship(
        user_id=current_user.id,
        ngo_id=sponsorship.ngo_id,
        tree_species=sponsorship.tree_species,
        amount_paid=sponsorship.amount_paid,
        status="pending"
    )
    db.add(new_contract)
    db.commit()
    db.refresh(new_contract)
    return new_contract


@router.get("/sponsored-trees", response_model=List[SponsorshipResponse])
def get_sponsored_trees(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get all sponsorship contracts for the current user."""
    return db.query(TreeSponsorship).filter(TreeSponsorship.user_id == current_user.id).all()
