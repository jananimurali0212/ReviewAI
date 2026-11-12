"""Main FastAPI application entrypoint for ReviewAI."""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config.settings import settings
from .routes.health import router as health_router
from .routes.code_routes import router as code_router

app = FastAPI(
    title="ReviewAI Backend API",
    description="Backend services for ReviewAI - AI-Powered Multi-Language Code Review Assistant",
    version=settings.VERSION,
)

# Enable CORS for local frontend development origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root-level health check endpoint as required: GET /health
app.include_router(health_router)

# Mount Code Submission & Language Detection endpoints
app.include_router(code_router, prefix="/api/code")

# Mount API routes under /api/v1 prefix as well for clean future routing
app.include_router(health_router, prefix=settings.API_V1_STR)
app.include_router(code_router, prefix=f"{settings.API_V1_STR}/code")

@app.get("/")
async def root():
    return {
        "message": "Welcome to ReviewAI API",
        "docs_url": "/docs",
        "health": "/health",
        "code_api": "/api/code"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
