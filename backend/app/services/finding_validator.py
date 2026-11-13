"""Validation and sanitization service for AI-generated code review findings.

Enforces:
- Category and severity whitelisting
- Line-number range boundary clamping (1 to total_lines)
- Filename alignment with submitted file
- Deduplication of identical or overlapping findings
- Qualitative confidence normalization
- Clear tagging as AI-generated findings (source='gemini_ai')
"""
import logging
from typing import Any, Dict, List, Set, Tuple
from ..models.review_models import FindingCategory, ReviewFinding, SeverityLevel, ConfidenceLevel

logger = logging.getLogger("reviewai.services.finding_validator")

VALID_CATEGORIES: Set[str] = {
    "correctness",
    "security",
    "performance",
    "maintainability",
    "style",
}

VALID_SEVERITIES: Set[str] = {
    "critical",
    "high",
    "medium",
    "low",
    "info",
}

VALID_CONFIDENCE: Set[str] = {
    "low",
    "medium",
    "high",
}

# Synonyms/aliases mapping for flexible AI outputs
CATEGORY_ALIASES = {
    "bug": "correctness",
    "error": "correctness",
    "logic": "correctness",
    "vulnerability": "security",
    "sec": "security",
    "perf": "performance",
    "optimization": "performance",
    "quality": "maintainability",
    "complexity": "maintainability",
    "refactor": "maintainability",
    "formatting": "style",
}


def normalize_category(raw_cat: Any) -> FindingCategory:
    """Normalizes raw category string to one of the 5 allowed categories."""
    if not isinstance(raw_cat, str):
        return "correctness"
    cleaned = raw_cat.strip().lower()
    if cleaned in VALID_CATEGORIES:
        return cleaned  # type: ignore
    return CATEGORY_ALIASES.get(cleaned, "correctness")  # type: ignore


def normalize_severity(raw_sev: Any) -> SeverityLevel:
    """Normalizes raw severity string to one of the 5 allowed severity levels."""
    if not isinstance(raw_sev, str):
        return "medium"
    cleaned = raw_sev.strip().lower()
    if cleaned in VALID_SEVERITIES:
        return cleaned  # type: ignore
    if cleaned in ("major", "blocker"):
        return "critical"
    if cleaned in ("warn", "warning"):
        return "medium"
    return "medium"


def normalize_confidence(raw_conf: Any) -> ConfidenceLevel:
    """Normalizes confidence level string to 'low', 'medium', or 'high'."""
    if not isinstance(raw_conf, str):
        return "medium"
    cleaned = raw_conf.strip().lower()
    if cleaned in VALID_CONFIDENCE:
        return cleaned  # type: ignore
    return "medium"


def validate_and_sanitize_findings(
    raw_findings: List[Dict[str, Any]],
    source_code: str,
    submitted_filename: str
) -> List[ReviewFinding]:
    """Validates, clamps, sanitizes, and deduplicates raw AI findings.
    
    Args:
        raw_findings: Raw dictionary items from parser
        source_code: Original code submitted
        submitted_filename: Normalized filename
        
    Returns:
        List of validated ReviewFinding models
    """
    lines = source_code.splitlines()
    total_lines = max(len(lines), 1)

    validated_findings: List[ReviewFinding] = []
    seen_keys: Set[Tuple[int, str, str]] = set()

    for idx, raw in enumerate(raw_findings, start=1):
        if not isinstance(raw, dict):
            continue

        title = str(raw.get("title") or "").strip()
        explanation = str(raw.get("explanation") or "").strip()
        if not title and not explanation:
            # Skip empty or meaningless findings
            continue
        if not title:
            title = explanation[:80] + ("..." if len(explanation) > 80 else "")

        category = normalize_category(raw.get("category"))
        severity = normalize_severity(raw.get("severity"))
        confidence = normalize_confidence(raw.get("confidence"))

        # Line number bounds validation and clamping
        try:
            start_line = int(raw.get("start_line") or 1)
        except (ValueError, TypeError):
            start_line = 1
        
        try:
            end_line = int(raw.get("end_line") or start_line)
        except (ValueError, TypeError):
            end_line = start_line

        # Clamp line numbers within actual source file boundaries
        start_line = max(1, min(start_line, total_lines))
        end_line = max(1, min(end_line, total_lines))
        if end_line < start_line:
            end_line = start_line

        # Extract code evidence if none was provided by model
        evidence = str(raw.get("evidence") or "").strip()
        if not evidence and 1 <= start_line <= len(lines):
            # Extract line directly from source
            evidence = lines[start_line - 1].strip()

        recommendation = str(raw.get("recommendation") or "").strip()
        if not recommendation:
            recommendation = "Review and address the identified pattern according to language best practices."

        finding_id = str(raw.get("id") or f"finding_{idx:03d}").strip()

        # Deduplication check: (start_line, category, simplified title)
        title_key = "".join(ch for ch in title.lower() if ch.isalnum())[:30]
        dedup_key = (start_line, category, title_key)
        if dedup_key in seen_keys:
            logger.debug("Filtered out duplicate finding: %s at line %d", title, start_line)
            continue
        seen_keys.add(dedup_key)

        finding = ReviewFinding(
            id=finding_id,
            title=title,
            category=category,
            severity=severity,
            file=submitted_filename,
            start_line=start_line,
            end_line=end_line,
            evidence=evidence,
            explanation=explanation,
            recommendation=recommendation,
            confidence=confidence,
            source="gemini_ai",
        )
        validated_findings.append(finding)

    return validated_findings
