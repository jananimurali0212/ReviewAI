"""FastAPI route handlers for AI code reviews."""
from fastapi import APIRouter, status

from ..models.review_models import ReviewAnalyzeRequest, ReviewReport
from ..services.review_engine import execute_code_review

router = APIRouter(tags=["AI Code Review Engine"])


@router.post(
    "/analyze",
    response_model=ReviewReport,
    status_code=status.HTTP_200_OK,
    summary="Analyze source code with Gemini AI",
    description="Submits source code to Gemini AI for multi-language bug, security, performance, and maintainability analysis."
)
def analyze_code_review(payload: ReviewAnalyzeRequest) -> ReviewReport:
    """Executes full code review and returns a structured findings report."""
    return execute_code_review(payload)
