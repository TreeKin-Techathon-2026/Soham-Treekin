from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from .config import settings
from .database import init_db
from .routers import (
    auth_router,
    users_router,
    trees_router,
    posts_router,
    carbon_router,
    chat_router,
    reports_router,
    leaderboard_router
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events."""
    # Startup: Initialize database tables
    print("[TreeKin] Starting API...")
    init_db()
    print("[TreeKin] Database tables created/verified")
    yield
    # Shutdown
    print("[TreeKin] Shutting down API...")


# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="""
    🌳 **TreeKin API** - Social platform for environmental action tracking
    
    ## Features
    - 🌱 Tree adoption lifecycle (Plant / Adopt / Sponsor)
    - 🎉 Event-based trees (Couple, Newborn, Memorial, Achievement)
    - 📱 Social feed with posts, likes, comments
    - 🔍 AI-powered image verification
    - 💚 Carbon credit system (TREDITS)
    - 🗺️ Geo-tagged civic reporting
    - 💬 Chat between TreeKin members
    - 🏆 Leaderboards & rewards
    """,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",  # Vite dev server
        "http://localhost:3000",  # Alternative dev
        "http://127.0.0.1:5173",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(trees_router, prefix="/api")
app.include_router(posts_router, prefix="/api")
app.include_router(carbon_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(reports_router, prefix="/api")
app.include_router(leaderboard_router, prefix="/api")


@app.get("/")
def root():
    """Root endpoint - API status."""
    return {
        "name": "TreeKin API",
        "version": "1.0.0",
        "status": "🌳 Growing strong!",
        "docs": "/docs"
    }


@app.get("/health")
def health_check():
    """Health check endpoint."""
    return {"status": "healthy", "service": "treekin-api"}
