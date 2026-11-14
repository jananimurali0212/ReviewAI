"""Finding normalizer for standardizing categories, severities, lines, and sources."""
import logging
from typing import List, Optional
from app.models.review_models import (
    ConfidenceLevel,
    FindingCategory,
    FindingSource,
    ReviewFinding,
    SeverityLevel,
)

logger = logging.getLogger(__name__)

VALID_CATEGORIES = {"correctness", "security", "performance", "maintainability", "style"}
VALID_SEVERITIES = {"critical", "high", "medium", "low", "info"}
VALID_CONFIDENCES = {"high", "medium", "low"}

CATEGORY_SYNONYMS = {
    "bug": "correctness",
    "defect": "correctness",
    "error": "correctness",
    "logic": "correctness",
    "vuln": "security",
    "vulnerability": "security",
    "sec": "security",
    "perf": "performance",
    "efficiency": "performance",
    "speed": "performance",
    "clean": "maintainability",
    "refactor": "maintainability",
    "design": "maintainability",
    "quality": "maintainability",
    "lint": "style",
    "formatting": "style",
    "convention": "style",
}

SEVERITY_SYNONYMS = {
    "blocker": "critical",
    "fatal": "critical",
    "severe": "critical",
    "major": "high",
    "warn": "medium",
    "warning": "medium",
    "minor": "low",
    "note": "info",
    "suggestion": "info",
    "informational": "info",
}


def normalize_category(category_raw: str) -> FindingCategory:
    """Normalizes any category variant to standard FindingCategory."""
    cat = (category_raw or "").strip().lower()
    if cat in VALID_CATEGORIES:
        return cat  # type: ignore[return-value]
    for syn, target in CATEGORY_SYNONYMS.items():
        if syn in cat:
            return target  # type: ignore[return-value]
    return "maintainability"


def normalize_severity(severity_raw: str) -> SeverityLevel:
    """Normalizes any severity variant to standard SeverityLevel."""
    sev = (severity_raw or "").strip().lower()
    if sev in VALID_SEVERITIES:
        return sev  # type: ignore[return-value]
    for syn, target in SEVERITY_SYNONYMS.items():
        if syn in sev:
            return target  # type: ignore[return-value]
    return "medium"


def normalize_confidence(confidence_raw: str) -> ConfidenceLevel:
    """Normalizes confidence to low, medium, or high."""
    conf = (confidence_raw or "").strip().lower()
    if conf in VALID_CONFIDENCES:
        return conf  # type: ignore[return-value]
    return "medium"


def normalize_source(source_raw: Optional[str]) -> FindingSource:
    """Normalizes source identifier to ai, static, or ai_and_static."""
    src = (source_raw or "").strip().lower()
    if src in ["ai", "gemini_ai", "gemini", "model", "llm"]:
        return "ai"
    if src in ["static", "linter", "bandit", "ruff", "eslint", "analyzer"]:
        return "static"
    if src in ["ai_and_static", "both", "combined", "ai+static"]:
        return "ai_and_static"
    return "ai"


def normalize_finding(finding: ReviewFinding, total_lines: int) -> ReviewFinding:
    """Normalizes a single finding's ranges, category, severity, and source."""
    clamped_total = max(1, total_lines)
    
    # Clamp start and end lines
    start_line = max(1, min(finding.start_line, clamped_total))
    end_line = max(start_line, min(finding.end_line, clamped_total))
    
    # Normalize category, severity, confidence, source
    category = normalize_category(finding.category)
    severity = normalize_severity(finding.severity)
    confidence = normalize_confidence(finding.confidence)
    source = normalize_source(finding.source)

    return ReviewFinding(
        id=finding.id,
        title=finding.title.strip() or "Identified Code Quality Issue",
        category=category,
        severity=severity,
        file=finding.file.strip() or "submitted_code",
        start_line=start_line,
        end_line=end_line,
        evidence=finding.evidence.strip(),
        explanation=finding.explanation.strip() or "Potential issue detected in source code.",
        recommendation=finding.recommendation.strip() or "Review and refine the affected code.",
        confidence=confidence,
        source=source,
        analyzer_name=finding.analyzer_name,
        rule_id=finding.rule_id,
        fix_available=finding.fix_available if finding.fix_available is not None else True,
        merged_sources=finding.merged_sources,
    )


def normalize_findings_list(findings: List[ReviewFinding], total_lines: int) -> List[ReviewFinding]:
    """Normalizes an entire list of findings."""
    return [normalize_finding(f, total_lines) for f in findings]
