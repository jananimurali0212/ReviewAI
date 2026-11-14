"""Intelligent code fix suggestion engine using Gemini AI and heuristic fallbacks."""
import json
import logging
import os
from typing import Optional
from app.ai.gemini_client import GeminiClient, get_gemini_client
from app.ai.response_parser import strip_markdown_fences
from app.config import get_settings
from app.models.review_models import ReviewFinding, SuggestedFix
from app.services.patch_validator import generate_diff_preview

logger = logging.getLogger(__name__)

FIX_GENERATION_PROMPT = """You are an expert software engineer generating an intelligent, minimal code fix for an identified issue.

PROGRAMMING LANGUAGE: {language}
TARGET FILE: {filename}
ISSUE TITLE: {title}
CATEGORY: {category}
SEVERITY: {severity}
EXPLANATION: {explanation}
RECOMMENDATION: {recommendation}

TARGET LINES ({start_line} to {end_line}):
{evidence}

FULL SOURCE CODE:
{code}

INSTRUCTIONS:
1. Provide a precise, minimal replacement code block for lines {start_line} to {end_line}.
2. Preserve existing indentation, code style, and variable naming conventions.
3. Do NOT rewrite unrelated code or functions.
4. Explain clearly why this fix solves the problem.
5. Return ONLY a single JSON object with the following schema:
{{
  "start_line": {start_line},
  "end_line": {end_line},
  "original_code": "exact code currently at lines {start_line}-{end_line}",
  "replacement_code": "proposed fixed code replacement",
  "explanation": "concise explanation of why this fix is necessary and how it works"
}}
"""


def _generate_heuristic_fix(
    finding: ReviewFinding,
    code: str,
    language: str,
    filename: str,
) -> SuggestedFix:
    """Provides a deterministic heuristic fix if Gemini AI is not reachable."""
    code_lines = code.replace("\r\n", "\n").splitlines()
    total_lines = len(code_lines)
    start_line = max(1, min(finding.start_line, total_lines))
    end_line = max(start_line, min(finding.end_line, total_lines))

    orig_slice = code_lines[start_line - 1 : end_line]
    original_code = "\n".join(orig_slice) if orig_slice else finding.evidence

    title_lower = finding.title.lower()
    rec_lower = finding.recommendation.lower()

    indent = ""
    if orig_slice and orig_slice[0]:
        indent = orig_slice[0][: len(orig_slice[0]) - len(orig_slice[0].lstrip())]

    # Pattern: Division by zero
    if "zero" in title_lower or "division" in title_lower:
        if language == "python":
            replacement = (
                f"{indent}if b == 0:\n"
                f"{indent}    raise ZeroDivisionError('Denominator cannot be zero')\n"
                f"{indent}{original_code.strip()}"
            )
        elif language in ["javascript", "typescript"]:
            replacement = (
                f"{indent}if (b === 0) {{\n"
                f"{indent}    throw new Error('Denominator cannot be zero');\n"
                f"{indent}}}\n"
                f"{indent}{original_code.strip()}"
            )
        else:
            replacement = f"{indent}// Fix: Validate denominator before division\n{indent}{original_code.strip()}"
        explanation = "Added defensive guard against division by zero before executing calculation."

    # Pattern: SQL Injection
    elif "sql" in title_lower or "injection" in title_lower:
        if language == "python":
            replacement = f"{indent}# Use parameterized query to prevent SQL injection\n{indent}cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))"
        else:
            replacement = f"{indent}// Use parameterized query with bind variables\n{original_code}"
        explanation = "Converted raw string concatenation query into safe parameterized query."

    # Pattern: Unused import / variable
    elif "unused" in title_lower:
        if "import" in title_lower:
            replacement = f"{indent}# Removed unused import\n"
            explanation = "Removed unused import statement to keep dependencies clean."
        else:
            replacement = f"{indent}_{original_code.strip()}"
            explanation = "Prefixed unused variable with underscore to signal intentional unused variable."

    else:
        # Default fallback: Apply recommendation as code comment or clean replacement
        replacement = f"{indent}# Fix: {finding.recommendation}\n{indent}{original_code.strip()}"
        explanation = finding.explanation or "Applied recommended remediation."

    diff = generate_diff_preview(original_code, replacement, filename, start_line)
    return SuggestedFix(
        finding_id=finding.id,
        file=filename,
        start_line=start_line,
        end_line=end_line,
        original_code=original_code,
        replacement_code=replacement,
        explanation=explanation,
        diff=diff,
        applied=False,
    )


def generate_fix_suggestion(
    finding: ReviewFinding,
    code: str,
    language: str,
    filename: Optional[str] = None,
) -> SuggestedFix:
    """Generates an intelligent code fix suggestion for a given finding."""
    safe_filename = os.path.basename(filename) if filename else finding.file
    settings = get_settings()

    # Extract exact original code snippet from source
    code_lines = code.replace("\r\n", "\n").splitlines()
    total_lines = len(code_lines)
    start_line = max(1, min(finding.start_line, total_lines))
    end_line = max(start_line, min(finding.end_line, total_lines))
    orig_slice = code_lines[start_line - 1 : end_line]
    original_code = "\n".join(orig_slice) if orig_slice else finding.evidence

    if settings.is_gemini_configured:
        try:
            client = get_gemini_client()
            prompt = FIX_GENERATION_PROMPT.format(
                language=language,
                filename=safe_filename,
                title=finding.title,
                category=finding.category,
                severity=finding.severity,
                explanation=finding.explanation,
                recommendation=finding.recommendation,
                start_line=start_line,
                end_line=end_line,
                evidence=original_code,
                code=code[:8000],  # Bound context for prompt
            )
            raw_response = client.generate_content(
                prompt=prompt,
                system_instruction="You are a precise code refactoring assistant. Output ONLY valid JSON with keys start_line, end_line, original_code, replacement_code, explanation.",
                response_mime_type="application/json",
            )
            cleaned = strip_markdown_fences(raw_response)
            data = json.loads(cleaned)

            replacement = data.get("replacement_code") or finding.recommendation
            expl = data.get("explanation") or finding.explanation

            diff = generate_diff_preview(original_code, replacement, safe_filename, start_line)
            return SuggestedFix(
                finding_id=finding.id,
                file=safe_filename,
                start_line=start_line,
                end_line=end_line,
                original_code=original_code,
                replacement_code=replacement,
                explanation=expl,
                diff=diff,
                applied=False,
            )
        except Exception as exc:
            logger.warning("Gemini AI fix generation encountered error (%s); falling back to heuristic fix.", exc)

    return _generate_heuristic_fix(finding, code, language, safe_filename)
