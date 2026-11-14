"""Intelligent deduplication and merging of AI and static analysis findings."""
import logging
from typing import List, Set
from app.models.review_models import FindingSource, ReviewFinding, SeverityLevel

logger = logging.getLogger(__name__)

SEVERITY_RANKS = {
    "info": 1,
    "low": 2,
    "medium": 3,
    "high": 4,
    "critical": 5,
}

CONFIDENCE_RANKS = {
    "low": 1,
    "medium": 2,
    "high": 3,
}

# Semantic keywords indicating that two findings describe the same root issue
SEMANTIC_TOPIC_GROUPS = [
    {"div", "zero", "zerodivision", "division"},
    {"sql", "injection", "parameterized", "query"},
    {"unused", "import", "variable", "dead code"},
    {"undefined", "not defined", "undeclared", "nameerror"},
    {"null", "nullptr", "none", "nullpointer", "optional"},
    {"eval", "exec", "unsafe", "rce"},
    {"constant", "condition", "tautology"},
    {"security", "cwe", "vulnerability", "hardcoded", "credential", "secret"},
    {"style", "indent", "whitespace", "newline", "trailing"},
]


def _extract_tokens(text: str) -> Set[str]:
    """Extracts lowercase alphabetic tokens for similarity matching."""
    cleaned = "".join(c.lower() if c.isalnum() else " " for c in text)
    return set(cleaned.split())


def _shares_semantic_topic(f1: ReviewFinding, f2: ReviewFinding) -> bool:
    """Checks whether two findings refer to the same specific problem."""
    tokens1 = _extract_tokens(f"{f1.title} {f1.explanation} {f1.rule_id or ''}")
    tokens2 = _extract_tokens(f"{f2.title} {f2.explanation} {f2.rule_id or ''}")

    # Check for direct token overlap of significant words
    common_tokens = tokens1.intersection(tokens2)
    significant_common = [t for t in common_tokens if len(t) > 3 and t not in {"code", "line", "issue", "this", "that"}]
    if len(significant_common) >= 2:
        return True

    # Check known semantic groups
    for group in SEMANTIC_TOPIC_GROUPS:
        has_1 = any(term in tokens1 for term in group)
        has_2 = any(term in tokens2 for term in group)
        if has_1 and has_2:
            return True

    return False


def are_findings_duplicate(f1: ReviewFinding, f2: ReviewFinding) -> bool:
    """Determines whether two findings are duplicates of the same issue.
    
    Rules:
    1. Lines must overlap or be within 1 line proximity.
    2. Category must match OR they must share a specific semantic topic.
    """
    # Line overlap or adjacent construct (within 1 line)
    lines_overlap = max(f1.start_line, f2.start_line) <= min(f1.end_line, f2.end_line)
    lines_adjacent = abs(f1.start_line - f2.start_line) <= 1 and abs(f1.end_line - f2.end_line) <= 1

    if not (lines_overlap or lines_adjacent):
        return False

    # Check category similarity or semantic intent
    same_category = f1.category == f2.category
    semantic_match = _shares_semantic_topic(f1, f2)

    return same_category and semantic_match


def _merge_two_findings(primary: ReviewFinding, secondary: ReviewFinding, new_id: str) -> ReviewFinding:
    """Merges two duplicate findings into a single unified finding.
    
    Rule constraints:
    - Sets source to 'ai_and_static' if merging an AI finding and a static finding.
    - Preserves highest severity without artificial inflation.
    - Preserves highest confidence.
    - Enriches explanation and recommendation.
    """
    # Determine combined source
    sources = set()
    for f in [primary, secondary]:
        if f.merged_sources:
            sources.update(f.merged_sources)
        else:
            sources.add(f.source)

    if ("ai" in sources or "gemini_ai" in sources) and "static" in sources:
        final_source: FindingSource = "ai_and_static"
    elif "ai" in sources or "gemini_ai" in sources:
        final_source = "ai"
    else:
        final_source = "static"

    # Highest severity (no artificial inflation)
    sev_rank1 = SEVERITY_RANKS.get(primary.severity, 3)
    sev_rank2 = SEVERITY_RANKS.get(secondary.severity, 3)
    chosen_severity: SeverityLevel = primary.severity if sev_rank1 >= sev_rank2 else secondary.severity

    # Highest confidence
    conf_rank1 = CONFIDENCE_RANKS.get(primary.confidence, 2)
    conf_rank2 = CONFIDENCE_RANKS.get(secondary.confidence, 2)
    chosen_confidence = primary.confidence if conf_rank1 >= conf_rank2 else secondary.confidence

    # Title: prefer more specific title
    chosen_title = primary.title if len(primary.title) >= len(secondary.title) else secondary.title

    # Explanations: combine distinct useful context
    merged_explanation = primary.explanation
    if secondary.explanation and secondary.explanation not in primary.explanation:
        if secondary.analyzer_name:
            merged_explanation += f" (Confirmed by {secondary.analyzer_name}: {secondary.explanation})"
        else:
            merged_explanation += f" ({secondary.explanation})"

    # Rule IDs & Analyzers
    analyzers = set()
    rule_ids = set()
    for f in [primary, secondary]:
        if f.analyzer_name:
            analyzers.add(f.analyzer_name)
        if f.rule_id:
            rule_ids.add(f.rule_id)

    combined_analyzer = ", ".join(sorted(analyzers)) if analyzers else primary.analyzer_name
    combined_rules = ", ".join(sorted(rule_ids)) if rule_ids else primary.rule_id

    # Evidence: prefer non-empty
    evidence = primary.evidence if primary.evidence else secondary.evidence

    return ReviewFinding(
        id=new_id,
        title=chosen_title,
        category=primary.category,
        severity=chosen_severity,
        file=primary.file,
        start_line=min(primary.start_line, secondary.start_line),
        end_line=max(primary.end_line, secondary.end_line),
        evidence=evidence,
        explanation=merged_explanation,
        recommendation=primary.recommendation or secondary.recommendation,
        confidence=chosen_confidence,
        source=final_source,
        analyzer_name=combined_analyzer,
        rule_id=combined_rules,
        fix_available=primary.fix_available or secondary.fix_available,
        merged_sources=sorted(list(sources)),
    )


def deduplicate_and_merge_findings(findings: List[ReviewFinding]) -> List[ReviewFinding]:
    """Deduplicates a list of findings, merging overlapping AI and static findings."""
    if len(findings) <= 1:
        return findings

    merged_results: List[ReviewFinding] = []
    used_indices = set()

    for i, current in enumerate(findings):
        if i in used_indices:
            continue

        accumulated = current
        for j in range(i + 1, len(findings)):
            if j in used_indices:
                continue
            candidate = findings[j]
            if are_findings_duplicate(accumulated, candidate):
                used_indices.add(j)
                accumulated = _merge_two_findings(accumulated, candidate, new_id=f"finding_{len(merged_results)+1:03d}")

        accumulated.id = f"finding_{len(merged_results)+1:03d}"
        merged_results.append(accumulated)
        used_indices.add(i)

    return merged_results
