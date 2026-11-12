"""Services package."""
from .language_registry import (
    LANGUAGE_DEFINITIONS,
    get_language,
    get_languages_by_extension,
    is_supported_language,
    is_supported_extension,
    all_supported_extensions,
    all_languages,
)
from .language_detector import detect_language
from .code_submission import process_code_submission

__all__ = [
    "LANGUAGE_DEFINITIONS",
    "get_language",
    "get_languages_by_extension",
    "is_supported_language",
    "is_supported_extension",
    "all_supported_extensions",
    "all_languages",
    "detect_language",
    "process_code_submission",
]
