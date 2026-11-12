"""FastAPI routes for code submission, validation, and language detection."""
from typing import List
from fastapi import APIRouter, status

from ..models.code_models import (
    CodeSubmitRequest,
    CodeSubmitResponse,
    LanguageDetectRequest,
    LanguageDetectResponse,
    SupportedLanguageItem,
)
from ..services.code_submission import process_code_submission
from ..services.language_detector import detect_language
from ..services.language_registry import all_languages

router = APIRouter(tags=["Code Submission & Detection"])


@router.post(
    "/submit",
    response_model=CodeSubmitResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit source code for review",
    description="Validates code content, file size, normalized filename, and language before queuing for review."
)
def submit_code(payload: CodeSubmitRequest) -> CodeSubmitResponse:
    """Accepts source code and queues submission."""
    return process_code_submission(payload)


@router.post(
    "/detect-language",
    response_model=LanguageDetectResponse,
    status_code=status.HTTP_200_OK,
    summary="Detect programming language",
    description="Detects likely programming language from file extension or source content heuristics."
)
def detect_code_language(payload: LanguageDetectRequest) -> LanguageDetectResponse:
    """Analyzes provided snippet or filename and returns detection result with confidence."""
    return detect_language(code=payload.code, filename=payload.filename)


@router.get(
    "/languages",
    response_model=List[SupportedLanguageItem],
    status_code=status.HTTP_200_OK,
    summary="List all supported languages",
    description="Returns metadata for all 21 supported programming languages."
)
def list_supported_languages() -> List[SupportedLanguageItem]:
    """Returns list of supported languages."""
    return [
        SupportedLanguageItem(
            id=lang.id,
            name=lang.name,
            extensions=lang.extensions,
            monaco_id=lang.monaco_id,
            category=lang.category,
            sample_snippet=lang.sample_snippet,
        )
        for lang in all_languages()
    ]
