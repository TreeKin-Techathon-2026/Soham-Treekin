# API Routers package
from .auth import router as auth_router
from .users import router as users_router
from .trees import router as trees_router
from .posts import router as posts_router
from .carbon import router as carbon_router
from .chat import router as chat_router
from .reports import router as reports_router
from .leaderboard import router as leaderboard_router

__all__ = [
    "auth_router",
    "users_router", 
    "trees_router",
    "posts_router",
    "carbon_router",
    "chat_router",
    "reports_router",
    "leaderboard_router"
]
