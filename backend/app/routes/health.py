"""Health check route."""
from fastapi import APIRouter
from pydantic import BaseModel
from ..config.settings import settings

router = APIRouter(tags=["Health"])

class HealthResponse(BaseModel):
    status: str
    service: str
    version: str

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """Returns application health status."""
    return HealthResponse(
        status="healthy",
        service=settings.PROJECT_NAME,
        version=settings.VERSION
    )

