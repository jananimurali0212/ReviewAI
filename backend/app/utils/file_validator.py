"""File validation and filename normalization utility.

Enforces security rules for code uploads and submissions:
- Rejects binary, non-text files (e.g. executable binaries, images, null-byte payloads)
- Enforces strict size limits (1 MB default)
- Sanitizes and normalizes filenames to prevent path traversal
- Validates file extensions against supported languages
"""
import os
import re
from typing import Optional, Tuple
from ..config.settings import settings
from ..services.language_registry import is_supported_extension


# Characters to strip/replace in filenames for safety
DANGEROUS_FILENAME_CHARS = re.compile(r'[<>:"/\\|?*\x00-\x1f]')


def normalize_filename(raw_filename: Optional[str]) -> Optional[str]:
    """Sanitizes and normalizes a filename to prevent path traversal.
    
    Removes directory paths, null bytes, and dangerous characters.
    Truncates overly long filenames.
    """
    if not raw_filename or not raw_filename.strip():
        return None
    
    # Extract only the base name (handles both Unix and Windows path separators)
    clean_name = raw_filename.replace("\\", "/").split("/")[-1].strip()
    
    # Strip dangerous filesystem and control characters
    clean_name = DANGEROUS_FILENAME_CHARS.sub("_", clean_name)
    
    # Remove leading dots or dashes that might hide files or confuse shells
    clean_name = clean_name.lstrip(".-")
    
    if not clean_name:
        return "untitled_submission.txt"
    
    # Cap maximum filename length to 255 chars
    if len(clean_name) > 255:
        base, ext = os.path.splitext(clean_name)
        clean_name = base[: 255 - len(ext)] + ext
        
    return clean_name


def validate_file_size(code_bytes_len: int, max_bytes: Optional[int] = None) -> Tuple[bool, Optional[str]]:
    """Validates that file content does not exceed the allowed size limit."""
    limit = max_bytes or settings.MAX_UPLOAD_SIZE_BYTES
    if code_bytes_len > limit:
        mb_limit = limit / (1024 * 1024)
        received_kb = code_bytes_len / 1024
        return False, f"File size ({received_kb:.1f} KB) exceeds the maximum allowed limit of {mb_limit:.1f} MB ({limit} bytes)."
    return True, None


def validate_file_content(code: Optional[str]) -> Tuple[bool, Optional[str]]:
    """Validates source code content:
    - Must not be empty or solely whitespace
    - Must not contain null bytes (\x00) which signal binary / executable payloads
    - Must be valid text
    """
    if code is None or not code.strip():
        return False, "Code submission cannot be empty. Please provide valid source code."
    
    # Check for null bytes indicating binary data (ELF, PE, Mach-O, images, compiled objects)
    if "\x00" in code:
        return False, "Uploaded file appears to be a compiled binary or non-text file. Only plain text source code is supported."
    
    # Check ratio of printable text characters to prevent binary junk
    control_chars = sum(1 for c in code[:2048] if ord(c) < 32 and c not in ('\t', '\n', '\r'))
    if control_chars > 20:
        return False, "File contains excessive non-printable control characters. Please submit a valid text source file."
        
    return True, None


def validate_filename_extension(filename: Optional[str]) -> Tuple[bool, Optional[str]]:
    """Validates whether a filename has a supported extension if provided."""
    if not filename:
        return True, None  # Filename is optional for direct pasted code
        
    normalized = normalize_filename(filename)
    if not normalized or "." not in normalized:
        return True, None
        
    _, ext = os.path.splitext(normalized)
    if not ext:
        return True, None
        
    if not is_supported_extension(ext):
        return False, f"Unsupported file extension '{ext}'. Please upload a file matching one of the 21 supported languages."
        
    return True, None

