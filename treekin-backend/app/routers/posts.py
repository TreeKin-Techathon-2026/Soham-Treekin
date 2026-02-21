from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..models.user import User
from ..models.tree import Tree
from ..models.post import Post, Comment, Like
from ..schemas.post import (
    PostCreate, PostUpdate, PostResponse, TreeSummary,
    CommentCreate, CommentResponse, VerifyVoteRequest
)
from ..schemas.user import UserSummary
from ..services.auth_utils import get_current_user

router = APIRouter(prefix="/posts", tags=["Social Feed"])


@router.post("/", response_model=PostResponse, status_code=status.HTTP_201_CREATED)
def create_post(
    post_data: PostCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new post for a tree."""
    # Verify tree exists
    tree = db.query(Tree).filter(Tree.id == post_data.tree_id).first()
    if not tree:
        raise HTTPException(status_code=404, detail="Tree not found")
    
    post = Post(
        tree_id=post_data.tree_id,
        user_id=current_user.id,
        content=post_data.content,
        media_urls=post_data.media_urls or []
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    
    # Add user info
    post_dict = PostResponse.model_validate(post)
    post_dict.user = UserSummary.model_validate(current_user)
    return post_dict


@router.get("/", response_model=List[PostResponse])
def list_posts(
    skip: int = 0,
    limit: int = 20,
    tree_id: Optional[int] = None,
    user_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List posts (social feed)."""
    query = db.query(Post)
    
    if tree_id:
        query = query.filter(Post.tree_id == tree_id)
    if user_id:
        query = query.filter(Post.user_id == user_id)
    
    posts = query.order_by(Post.created_at.desc()).offset(skip).limit(limit).all()
    
    # Add user info and like status
    result = []
    for post in posts:
        post_response = PostResponse.model_validate(post)
        user = db.query(User).filter(User.id == post.user_id).first()
        if user:
            post_response.user = UserSummary.model_validate(user)
        
        # Add tree info
        tree = db.query(Tree).filter(Tree.id == post.tree_id).first()
        if tree:
            post_response.tree = TreeSummary.model_validate(tree)
        
        # Check if current user liked this post
        liked = db.query(Like).filter(
            Like.post_id == post.id,
            Like.user_id == current_user.id
        ).first()
        post_response.is_liked = liked is not None
        
        result.append(post_response)
    
    return result


@router.get("/{post_id}", response_model=PostResponse)
def get_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get a single post."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    post_response = PostResponse.model_validate(post)
    user = db.query(User).filter(User.id == post.user_id).first()
    if user:
        post_response.user = UserSummary.model_validate(user)
    
    # Add tree info
    tree = db.query(Tree).filter(Tree.id == post.tree_id).first()
    if tree:
        post_response.tree = TreeSummary.model_validate(tree)
    
    liked = db.query(Like).filter(
        Like.post_id == post.id,
        Like.user_id == current_user.id
    ).first()
    post_response.is_liked = liked is not None
    
    return post_response


@router.post("/{post_id}/like")
def like_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Like or unlike a post."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    existing_like = db.query(Like).filter(
        Like.post_id == post_id,
        Like.user_id == current_user.id
    ).first()
    
    if existing_like:
        # Unlike
        db.delete(existing_like)
        post.likes_count = max(0, post.likes_count - 1)
        action = "unliked"
    else:
        # Like
        like = Like(post_id=post_id, user_id=current_user.id)
        db.add(like)
        post.likes_count += 1
        action = "liked"
    
    db.commit()
    return {"action": action, "likes_count": post.likes_count}


@router.post("/{post_id}/comments", response_model=CommentResponse)
def add_comment(
    post_id: int,
    comment_data: CommentCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add a comment to a post."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    comment = Comment(
        post_id=post_id,
        user_id=current_user.id,
        content=comment_data.content
    )
    db.add(comment)
    post.comments_count += 1
    db.commit()
    db.refresh(comment)
    
    comment_response = CommentResponse.model_validate(comment)
    comment_response.user = UserSummary.model_validate(current_user)
    return comment_response


@router.get("/{post_id}/comments", response_model=List[CommentResponse])
def get_comments(post_id: int, db: Session = Depends(get_db)):
    """Get all comments for a post."""
    comments = db.query(Comment).filter(Comment.post_id == post_id).order_by(Comment.created_at.asc()).all()
    
    result = []
    for comment in comments:
        comment_response = CommentResponse.model_validate(comment)
        user = db.query(User).filter(User.id == comment.user_id).first()
        if user:
            comment_response.user = UserSummary.model_validate(user)
        result.append(comment_response)
    
    return result


@router.post("/{post_id}/verify")
def verify_post(
    post_id: int,
    vote: VerifyVoteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Vote to verify a post."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    
    if vote.is_verified:
        post.verification_votes += 1
    else:
        post.verification_votes = max(0, post.verification_votes - 1)
    
    # Auto-verify if enough votes (threshold: 5)
    if post.verification_votes >= 5:
        post.is_verified = True
    
    db.commit()
    return {
        "verification_votes": post.verification_votes,
        "is_verified": post.is_verified
    }
