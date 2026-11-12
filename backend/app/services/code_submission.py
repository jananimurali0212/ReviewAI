"""Code submission service.

Handles validation, metadata logging, safe normalization, and preparation
for subsequent review pipeline phases.
Architecture is extensible for future GitHub repository and pull-request submissions.
"""
from datetime import datetime, timezone
import logging
from typing import Optional
import uuid

from fastapi import HTTPException, status

from ..models.code_models import CodeSubmitRequest, CodeSubmitResponse
from ..services.language_registry import get_language, is_supported_language
from ..utils.file_validator import (
    normalize_filename,
    validate_file_content,
    validate_file_size,
    validate_filename_extension,
)

logger = logging.getLogger("reviewai.submission")


def process_code_submission(request: CodeSubmitRequest) -> CodeSubmitResponse:
    """Validates and processes a code submission.
    
    Adheres to strict security constraints:
    - Sanitizes and normalizes filename (prevents directory traversal)
    - Rejects empty, whitespace-only, or binary submissions
    - Rejects submissions exceeding 1 MB limit
    - Validates language against central registry
    - Never executes or compiles uploaded code
    - Never logs complete code content
    """
    raw_code = request.code
    
    # 1. Content validation (empty check, null-byte / binary check)
    is_valid_content, content_err = validate_file_content(raw_code)
    if not is_valid_content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=content_err or "Invalid code content submitted."
        )

    # 2. Size limit validation
    code_bytes_len = len(raw_code.encode("utf-8"))
    is_valid_size, size_err = validate_file_size(code_bytes_len)
    if not is_valid_size:
        raise HTTPException(
            status_code=status.HTTP_413_CONTENT_TOO_LARGE,
            detail=size_err or "Code content exceeds the maximum size limit."
        )

    # 3. Filename normalization & extension verification
    normalized_fname: Optional[str] = None
    if request.filename:
        normalized_fname = normalize_filename(request.filename)
        is_valid_ext, ext_err = validate_filename_extension(normalized_fname)
        if not is_valid_ext:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=ext_err or f"Unsupported file extension in '{normalized_fname}'."
            )

    # 4. Language validation
    lang_info = get_language(request.language)
    if not lang_info:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Unsupported or unrecognized programming language '{request.language}'. Supported languages: 21 standard languages."
        )

    # If no filename was given, generate a safe default filename using the language extension
    if not normalized_fname:
        default_ext = lang_info.extensions[0] if lang_info.extensions else ".txt"
        normalized_fname = f"submission_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}{default_ext}"

    # 5. Metrics calculation
    lines_count = len(raw_code.splitlines())
    submission_id = f"sub-{uuid.uuid4().hex[:12]}"
    created_at = datetime.now(timezone.utc).isoformat()

    # 6. Safe logging (metadata ONLY, NEVER log the raw source code)
    logger.info(
        "Code submitted successfully: id=%s, file=%s, language=%s, chars=%d, lines=%d, type=%s",
        submission_id,
        normalized_fname,
        lang_info.id,
        len(raw_code),
        lines_count,
        request.submission_type or "paste",
    )

    return CodeSubmitResponse(
        success=True,
        filename=normalized_fname,
        language=lang_info.id,
        language_detected=bool(request.language_detected),
        message="Code submitted successfully",
        code_length=len(raw_code),
        lines_count=lines_count,
        submission_id=submission_id,
        created_at=created_at,
    )
