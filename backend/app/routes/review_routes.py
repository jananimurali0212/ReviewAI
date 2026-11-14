"""FastAPI route handlers for static analysis, AI code reviews, and developer-approved fix suggestions."""
from typing import Any, Dict
from fastapi import APIRouter, HTTPException, status

from ..analyzers import get_analyzer_registry
from ..config import get_settings
from ..models.review_models import (
    ApplyFixRequest,
    ApplyFixResponse,
    RejectFixRequest,
    ReviewAnalyzeRequest,
    ReviewFinding,
    ReviewReport,
    SuggestedFix,
    SuggestFixRequest,
)
from ..services.analysis_orchestrator import run_combined_analysis, run_static_analysis_only
from ..services.fix_generator import generate_fix_suggestion
from ..services.patch_validator import apply_patch_to_code, validate_patch

router = APIRouter(tags=["AI Code Review & Static Analysis Engine"])


@router.post(
    "/analyze",
    response_model=ReviewReport,
    status_code=status.HTTP_200_OK,
    summary="Analyze source code with AI and static analyzers",
    description="Submits source code to Gemini AI and available static analyzers, deduplicates findings, and returns a unified report.",
)
def analyze_code_review(payload: ReviewAnalyzeRequest) -> ReviewReport:
    """Executes code review (combined AI and static analysis by default)."""
    return run_combined_analysis(payload)


@router.post(
    "/static-analysis",
    response_model=ReviewReport,
    status_code=status.HTTP_200_OK,
    summary="Run static analysis only",
    description="Executes language-specific linters and security scanners (Ruff, Bandit, ESLint) without AI invocation.",
)
def analyze_static_only(payload: ReviewAnalyzeRequest) -> ReviewReport:
    """Executes static code analysis only."""
    return run_static_analysis_only(
        code=payload.code,
        language=payload.language,
        filename=payload.filename,
    )


@router.post(
    "/combined-analysis",
    response_model=ReviewReport,
    status_code=status.HTTP_200_OK,
    summary="Run combined AI and static analysis",
    description="Executes Gemini AI review alongside static analyzers and intelligently merges duplicates.",
)
def analyze_combined(payload: ReviewAnalyzeRequest) -> ReviewReport:
    """Executes combined AI and static analysis."""
    return run_combined_analysis(payload)


@router.post(
    "/suggest-fix",
    response_model=SuggestedFix,
    status_code=status.HTTP_200_OK,
    summary="Generate an intelligent fix suggestion for a finding",
    description="Generates a minimal, developer-approvable code replacement patch and unified diff.",
)
def suggest_fix(payload: SuggestFixRequest) -> SuggestedFix:
    """Generates an intelligent contextual fix suggestion."""
    finding = payload.finding
    if not finding:
        # Construct fallback finding object from minimal metadata
        finding = ReviewFinding(
            id=payload.finding_id,
            title="Code improvement finding",
            category="maintainability",
            severity="medium",
            file=payload.filename or "submitted_code",
            start_line=1,
            end_line=1,
            evidence="",
            explanation="Contextual fix requested.",
            recommendation="Apply clean code fix.",
            confidence="medium",
            source="ai",
        )

    return generate_fix_suggestion(
        finding=finding,
        code=payload.code,
        language=payload.language,
        filename=payload.filename,
    )


@router.post(
    "/{review_id}/findings/{finding_id}/suggest-fix",
    response_model=SuggestedFix,
    status_code=status.HTTP_200_OK,
    summary="Generate a fix suggestion (RESTful alias)",
)
def suggest_fix_restful(
    review_id: str,
    finding_id: str,
    payload: SuggestFixRequest,
) -> SuggestedFix:
    """RESTful alias for fix suggestion generation."""
    payload.finding_id = finding_id
    return suggest_fix(payload)


@router.post(
    "/apply-fix",
    response_model=ApplyFixResponse,
    status_code=status.HTTP_200_OK,
    summary="Apply an approved code fix to source code",
    description="Validates patch freshness against current code and splices replacement code safely.",
)
def apply_fix(payload: ApplyFixRequest) -> ApplyFixResponse:
    """Validates and applies a proposed patch to source code."""
    is_valid, error_reason = validate_patch(
        current_code=payload.code,
        fix=payload.fix,
        expected_filename=payload.filename,
    )
    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_reason or "Patch validation failed.",
        )

    try:
        updated_code = apply_patch_to_code(
            current_code=payload.code,
            fix=payload.fix,
            expected_filename=payload.filename,
        )
        lines_affected = max(1, payload.fix.end_line - payload.fix.start_line + 1)
        return ApplyFixResponse(
            success=True,
            updated_code=updated_code,
            message=f"Successfully applied fix for '{payload.fix.finding_id}' (lines {payload.fix.start_line}-{payload.fix.end_line}).",
            lines_affected=lines_affected,
            undo_available=True,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to apply patch: {str(exc)}",
        ) from exc


@router.post(
    "/{review_id}/findings/{finding_id}/apply-fix",
    response_model=ApplyFixResponse,
    status_code=status.HTTP_200_OK,
    summary="Apply fix (RESTful alias)",
)
def apply_fix_restful(
    review_id: str,
    finding_id: str,
    payload: ApplyFixRequest,
) -> ApplyFixResponse:
    """RESTful alias for patch application."""
    return apply_fix(payload)


@router.post(
    "/reject-fix",
    status_code=status.HTTP_200_OK,
    summary="Reject a proposed code fix",
)
def reject_fix(payload: RejectFixRequest) -> Dict[str, Any]:
    """Records user rejection of a proposed fix."""
    return {
        "finding_id": payload.finding_id,
        "status": "rejected",
        "reason": payload.reason or "Rejected by developer",
    }


@router.post(
    "/{review_id}/findings/{finding_id}/reject-fix",
    status_code=status.HTTP_200_OK,
    summary="Reject fix (RESTful alias)",
)
def reject_fix_restful(
    review_id: str,
    finding_id: str,
    payload: RejectFixRequest,
) -> Dict[str, Any]:
    """RESTful alias for fix rejection."""
    return reject_fix(payload)


@router.get(
    "/analyzers",
    status_code=status.HTTP_200_OK,
    summary="List static analyzer availability status",
)
def get_analyzer_status() -> Dict[str, Any]:
    """Returns availability status for all known static analysis tools."""
    registry = get_analyzer_registry()
    return {
        "status": "ok",
        "tools": registry.get_available_tools_status(),
    }


@router.get(
    "/status",
    status_code=status.HTTP_200_OK,
    summary="Check AI review configuration status",
)
def get_review_status() -> Dict[str, Any]:
    """Returns AI model and environment readiness."""
    settings = get_settings()
    return {
        "status": "ok",
        "gemini_configured": settings.is_gemini_configured,
        "model": settings.GEMINI_MODEL,
        "timeout_seconds": settings.REVIEW_TIMEOUT_SECONDS,
        "max_upload_size_bytes": settings.MAX_UPLOAD_SIZE_BYTES,
    }
