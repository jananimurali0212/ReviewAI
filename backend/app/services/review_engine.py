"""Review Engine Service.

Coordinates input validation, Gemini AI invocation, response parsing,
finding validation, metrics calculation, and standardized reporting.
"""
from datetime import datetime, timezone
import logging
import time
import uuid
from typing import Optional

from fastapi import HTTPException, status

from ..ai.gemini_client import (
    GeminiClient,
    GeminiConfigurationError,
    GeminiAuthError,
    GeminiQuotaError,
    GeminiModelNotFoundError,
    GeminiTimeoutError,
    GeminiError,
)
from ..ai.response_parser import parse_review_response, ResponseParsingError
from ..config.settings import settings
from ..models.review_models import (
    ReviewAnalyzeRequest,
    ReviewReport,
    ReviewSeverityBreakdown,
)
from ..services.finding_validator import validate_and_sanitize_findings
from ..services.language_registry import get_language
from ..utils.file_validator import (
    normalize_filename,
    validate_file_content,
    validate_file_size,
    validate_filename_extension,
)

logger = logging.getLogger("reviewai.services.review_engine")


def execute_code_review(
    request: ReviewAnalyzeRequest,
    gemini_client: Optional[GeminiClient] = None
) -> ReviewReport:
    """Executes the full AI code review workflow.
    
    1. Validates code content, size limit, and language support.
    2. Invokes Gemini AI with security-hardened prompts.
    3. Parses and validates the returned structured findings.
    4. Computes severity metrics and aggregates the final report.
    """
    start_time = time.perf_counter()
    raw_code = request.code

    # 1. Content validation (empty check, null byte check)
    is_valid_content, content_err = validate_file_content(raw_code)
    if not is_valid_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=content_err or "Invalid source code content."
        )

    # 2. File size validation
    code_bytes_len = len(raw_code.encode("utf-8"))
    is_valid_size, size_err = validate_file_size(code_bytes_len)
    if not is_valid_size:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=size_err or "Code content exceeds the maximum size limit of 1 MB."
        )

    # 3. Language validation
    lang_info = get_language(request.language)
    if not lang_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported or unrecognized programming language '{request.language}'."
        )

    # 4. Filename normalization & extension checking
    normalized_fname: Optional[str] = None
    if request.filename:
        normalized_fname = normalize_filename(request.filename)
        is_valid_ext, ext_err = validate_filename_extension(normalized_fname)
        if not is_valid_ext:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ext_err or f"Unsupported file extension in '{normalized_fname}'."
            )

    if not normalized_fname:
        default_ext = lang_info.extensions[0] if lang_info.extensions else f".{lang_info.id}"
        normalized_fname = f"snippet_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}{default_ext}"

    # 5. Invoke Gemini AI Review Engine
    client = gemini_client or GeminiClient()

    try:
        raw_ai_response = client.generate_review(
            code=raw_code,
            language=lang_info.name,
            filename=normalized_fname
        )
    except GeminiConfigurationError as config_err:
        logger.error("Gemini configuration error: %s", str(config_err))
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(config_err)
        ) from config_err
    except GeminiAuthError as auth_err:
        logger.error("Gemini auth error: %s", str(auth_err))
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(auth_err)
        ) from auth_err
    except GeminiQuotaError as quota_err:
        logger.warning("Gemini quota error: %s", str(quota_err))
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=str(quota_err)
        ) from quota_err
    except GeminiModelNotFoundError as model_err:
        logger.error("Gemini model error: %s", str(model_err))
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(model_err)
        ) from model_err
    except GeminiTimeoutError as timeout_err:
        logger.error("Gemini timeout: %s", str(timeout_err))
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail=str(timeout_err)
        ) from timeout_err
    except GeminiError as gen_err:
        logger.error("Gemini invocation error: %s", str(gen_err))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Gemini AI review service encountered an error: {str(gen_err)}"
        ) from gen_err
    except Exception as exc:
        logger.error("Unexpected error in Gemini AI client: %s", str(exc))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An unexpected error occurred while analyzing code: {str(exc)}"
        ) from exc

    # 6. Parse structured response
    try:
        parsed_data = parse_review_response(raw_ai_response)
    except ResponseParsingError as parse_err:
        logger.error("Failed to parse Gemini response: %s", str(parse_err))
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to parse structured review findings from AI: {str(parse_err)}"
        ) from parse_err

    # 7. Validate and sanitize findings
    validated_findings = validate_and_sanitize_findings(
        raw_findings=parsed_data["findings"],
        source_code=raw_code,
        submitted_filename=normalized_fname
    )

    # 8. Compute severity breakdown
    breakdown = ReviewSeverityBreakdown()
    for finding in validated_findings:
        sev = finding.severity
        if sev == "critical":
            breakdown.critical += 1
        elif sev == "high":
            breakdown.high += 1
        elif sev == "medium":
            breakdown.medium += 1
        elif sev == "low":
            breakdown.low += 1
        elif sev == "info":
            breakdown.info += 1

    duration_ms = int((time.perf_counter() - start_time) * 1000)
    report_id = f"rev-{uuid.uuid4().hex[:12]}"
    analyzed_at = datetime.now(timezone.utc).isoformat()

    logger.info(
        "Review completed: id=%s, file=%s, lang=%s, findings=%d, duration=%dms",
        report_id,
        normalized_fname,
        lang_info.id,
        len(validated_findings),
        duration_ms,
    )

    return ReviewReport(
        id=report_id,
        file=normalized_fname,
        language=lang_info.id,
        model=client.model,
        summary=parsed_data["summary"],
        total_findings=len(validated_findings),
        severity_breakdown=breakdown,
        findings=validated_findings,
        positive_observations=parsed_data["positive_observations"],
        general_recommendations=parsed_data["general_recommendations"],
        analyzed_at=analyzed_at,
        duration_ms=duration_ms,
        status="completed",
    )

