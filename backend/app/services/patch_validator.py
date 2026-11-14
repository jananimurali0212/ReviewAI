"""Patch validation, diff generation, and safe patch application."""
import difflib
import logging
import os
from typing import Optional, Tuple
from app.models.review_models import SuggestedFix

logger = logging.getLogger(__name__)


def generate_diff_preview(
    original_code: str,
    replacement_code: str,
    filename: str = "submitted_code",
    start_line: int = 1,
) -> str:
    """Generates a standard unified diff string between original and proposed code."""
    orig_lines = original_code.splitlines(keepends=True)
    repl_lines = replacement_code.splitlines(keepends=True)

    diff = difflib.unified_diff(
        orig_lines,
        repl_lines,
        fromfile=f"a/{filename} (line {start_line})",
        tofile=f"b/{filename} (proposed fix)",
        n=3,
    )
    return "".join(diff)


def _normalize_code_block(code_str: str) -> str:
    """Normalizes whitespace and line endings for robust comparison."""
    lines = [line.strip() for line in code_str.replace("\r\n", "\n").splitlines()]
    return "\n".join(lines).strip()


def validate_patch(
    current_code: str,
    fix: SuggestedFix,
    expected_filename: Optional[str] = None,
) -> Tuple[bool, Optional[str]]:
    """Validates whether a proposed fix can be safely applied to current source code.
    
    Checks:
    1. Path traversal protection on file name.
    2. File name matches target file.
    3. Line ranges are within current source bounds.
    4. Current source at specified lines matches original code (stale patch detection).
    5. Malformed patch checks.
    """
    if not current_code or not current_code.strip():
        return False, "Cannot apply patch to empty source code."

    # Prevent path traversal
    if ".." in fix.file or "/" in fix.file or "\\" in fix.file:
        clean_file = os.path.basename(fix.file)
        if clean_file != fix.file:
            return False, "Invalid patch: path traversal detected in patch filename."

    # File match check
    if expected_filename:
        safe_expected = os.path.basename(expected_filename)
        safe_patch_file = os.path.basename(fix.file)
        if safe_expected.lower() != safe_patch_file.lower():
            return False, f"Patch target '{fix.file}' does not match active file '{expected_filename}'."

    code_lines = current_code.replace("\r\n", "\n").splitlines()
    total_lines = len(code_lines)

    # Line range bounds check
    if fix.start_line < 1 or fix.start_line > total_lines:
        return False, f"Invalid start line {fix.start_line}: file has {total_lines} lines."

    if fix.end_line < fix.start_line or fix.end_line > total_lines:
        return False, f"Invalid end line {fix.end_line}: must be between {fix.start_line} and {total_lines}."

    # Extract actual code snippet currently at those lines
    target_slice = code_lines[fix.start_line - 1 : fix.end_line]
    actual_code_snippet = "\n".join(target_slice)

    # Stale patch check: does current code at target lines match patch's expected original code?
    norm_actual = _normalize_code_block(actual_code_snippet)
    norm_expected = _normalize_code_block(fix.original_code)

    if norm_actual != norm_expected:
        # Check if expected code is a substring or close match (e.g. single line in block)
        if norm_expected not in norm_actual and norm_actual not in norm_expected:
            return (
                False,
                f"Stale patch detected: The source code at lines {fix.start_line}-{fix.end_line} has been modified "
                "since this fix was generated. Please run a new review.",
            )

    return True, None


def apply_patch_to_code(
    current_code: str,
    fix: SuggestedFix,
    expected_filename: Optional[str] = None,
) -> str:
    """Applies a validated patch to the given source code and returns the updated code.
    
    Raises ValueError if patch validation fails.
    """
    is_valid, error_reason = validate_patch(current_code, fix, expected_filename)
    if not is_valid:
        raise ValueError(error_reason or "Patch validation failed.")

    # Detect original newline style
    is_crlf = "\r\n" in current_code
    code_lines = current_code.replace("\r\n", "\n").splitlines()

    # Determine indentation of replaced block to preserve formatting if needed
    start_idx = fix.start_line - 1
    end_idx = fix.end_line

    replacement_lines = fix.replacement_code.replace("\r\n", "\n").splitlines()

    # Splice lines
    new_lines = code_lines[:start_idx] + replacement_lines + code_lines[end_idx:]

    join_char = "\r\n" if is_crlf else "\n"
    updated_code = join_char.join(new_lines)

    # Ensure trailing newline if original had one
    if current_code.endswith("\n") and not updated_code.endswith("\n"):
        updated_code += join_char

    return updated_code
