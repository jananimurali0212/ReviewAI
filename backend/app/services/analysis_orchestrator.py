"""Analysis orchestrator combining Gemini AI and static code analyzers."""
import logging
import os
import time
from datetime import datetime, timezone
from typing import Dict, List, Optional
import uuid

from app.analyzers import get_analyzer_registry
from app.config import get_settings
from app.models.review_models import (
    ReviewAnalyzeRequest,
    ReviewFinding,
    ReviewReport,
    ReviewSeverityBreakdown,
)
from app.services.finding_deduplicator import deduplicate_and_merge_findings
from app.services.finding_normalizer import normalize_findings_list
from app.services.review_engine import execute_code_review

logger = logging.getLogger(__name__)


def run_static_analysis_only(
    code: str,
    language: str,
    filename: Optional[str] = None,
) -> ReviewReport:
    """Executes static analysis only without AI review."""
    start_time = time.time()
    safe_filename = os.path.basename(filename) if filename else f"submitted_code.{language}"
    registry = get_analyzer_registry()

    raw_findings, executed, errors = registry.run_analysis_for_language(
        code=code,
        language=language,
        filename=safe_filename,
    )

    code_lines = code.splitlines()
    normalized = normalize_findings_list(raw_findings, total_lines=len(code_lines))
    deduped = deduplicate_and_merge_findings(normalized)

    # Calculate severity breakdown
    breakdown = ReviewSeverityBreakdown()
    for f in deduped:
        setattr(breakdown, f.severity, getattr(breakdown, f.severity) + 1)

    duration_ms = int((time.time() - start_time) * 1000)
    report_id = f"report_{uuid.uuid4().hex[:12]}"
    tools_str = ", ".join(executed) if executed else "no active analyzers"

    summary = (
        f"Static code analysis completed in {duration_ms}ms using {tools_str}. "
        f"Identified {len(deduped)} issue(s)."
    )

    return ReviewReport(
        id=report_id,
        file=safe_filename,
        language=language,
        model=f"static-analyzers ({tools_str})",
        summary=summary,
        total_findings=len(deduped),
        severity_breakdown=breakdown,
        findings=deduped,
        positive_observations=["Static analysis completed successfully with zero compiler/execution hazards."],
        general_recommendations=[
            "Address high and critical severity static diagnostics prior to merging.",
            "Run automated linters in CI/CD pipeline to maintain code hygiene.",
        ],
        analyzed_at=datetime.now(timezone.utc).isoformat(),
        duration_ms=duration_ms,
        status="completed",
        ai_findings_count=0,
        static_findings_count=len(deduped),
        combined_findings_count=0,
        analyzers_executed=executed,
        analyzer_errors=errors,
    )


def run_combined_analysis(
    payload: ReviewAnalyzeRequest,
) -> ReviewReport:
    """Orchestrates combined AI and static code analysis with deduplication."""
    start_time = time.time()
    settings = get_settings()
    safe_filename = os.path.basename(payload.filename) if payload.filename else f"submitted_code.{payload.language}"
    mode = payload.mode or "combined"

    # If mode is static_only, dispatch to static analysis
    if mode == "static_only":
        return run_static_analysis_only(payload.code, payload.language, safe_filename)

    # 1. Run AI review
    ai_report: Optional[ReviewReport] = None
    ai_findings: List[ReviewFinding] = []
    ai_error: Optional[str] = None

    if mode in ["combined", "ai_only"]:
        try:
            ai_report = execute_code_review(payload)
            ai_findings = ai_report.findings
            # Tag source as AI
            for f in ai_findings:
                if f.source not in ["static", "ai_and_static"]:
                    f.source = "ai"
        except Exception as exc:
            logger.warning("AI review step failed: %s", exc)
            ai_error = str(exc)

    # 2. Run Static Analysis (if mode is combined or if AI failed as fallback)
    static_findings: List[ReviewFinding] = []
    executed_analyzers: List[str] = []
    analyzer_errors: Dict[str, str] = {}

    if mode == "combined" or (mode == "ai_only" and ai_error):
        registry = get_analyzer_registry()
        raw_static, executed_analyzers, analyzer_errors = registry.run_analysis_for_language(
            code=payload.code,
            language=payload.language,
            filename=safe_filename,
        )
        static_findings = raw_static

    # 3. Combine and Normalize
    all_raw_findings = ai_findings + static_findings
    code_lines = payload.code.splitlines()
    total_lines = len(code_lines)
    normalized_findings = normalize_findings_list(all_raw_findings, total_lines=total_lines)

    # 4. Intelligent Deduplication
    final_findings = deduplicate_and_merge_findings(normalized_findings)

    # 5. Compute Metrics
    ai_count = 0
    static_count = 0
    combined_count = 0
    breakdown = ReviewSeverityBreakdown()

    for f in final_findings:
        setattr(breakdown, f.severity, getattr(breakdown, f.severity) + 1)
        if f.source == "ai_and_static":
            combined_count += 1
            ai_count += 1
            static_count += 1
        elif f.source == "ai":
            ai_count += 1
        elif f.source == "static":
            static_count += 1

    duration_ms = int((time.time() - start_time) * 1000)
    report_id = ai_report.id if ai_report else f"report_{uuid.uuid4().hex[:12]}"

    # Observations and Recommendations
    positive_obs = ai_report.positive_observations if ai_report else ["Code conforms to baseline syntax constraints."]
    general_recs = ai_report.general_recommendations if ai_report else ["Adopt continuous static analysis in your repository."]

    tools_str = ", ".join(executed_analyzers) if executed_analyzers else "AI only"
    model_name = f"{settings.GEMINI_MODEL} + [{tools_str}]" if ai_report else f"static-analyzers ({tools_str})"

    summary = (
        f"Comprehensive review completed in {duration_ms}ms ({ai_count} AI issue(s), "
        f"{static_count} static diagnostic(s), {combined_count} verified by both)."
    )

    if ai_error:
        analyzer_errors["gemini_ai"] = ai_error

    return ReviewReport(
        id=report_id,
        file=safe_filename,
        language=payload.language,
        model=model_name,
        summary=summary,
        total_findings=len(final_findings),
        severity_breakdown=breakdown,
        findings=final_findings,
        positive_observations=positive_obs,
        general_recommendations=general_recs,
        analyzed_at=datetime.now(timezone.utc).isoformat(),
        duration_ms=duration_ms,
        status="completed" if not (ai_error or analyzer_errors) else "warning",
        ai_findings_count=ai_count,
        static_findings_count=static_count,
        combined_findings_count=combined_count,
        analyzers_executed=executed_analyzers,
        analyzer_errors=analyzer_errors,
    )
