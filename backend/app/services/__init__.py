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
from .review_engine import execute_code_review
from .finding_validator import validate_and_sanitize_findings
from .finding_normalizer import normalize_finding, normalize_findings_list
from .finding_deduplicator import are_findings_duplicate, deduplicate_and_merge_findings
from .patch_validator import validate_patch, apply_patch_to_code, generate_diff_preview
from .fix_generator import generate_fix_suggestion
from .analysis_orchestrator import run_static_analysis_only, run_combined_analysis

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
    "execute_code_review",
    "validate_and_sanitize_findings",
    "normalize_finding",
    "normalize_findings_list",
    "are_findings_duplicate",
    "deduplicate_and_merge_findings",
    "validate_patch",
    "apply_patch_to_code",
    "generate_diff_preview",
    "generate_fix_suggestion",
    "run_static_analysis_only",
    "run_combined_analysis",
]
