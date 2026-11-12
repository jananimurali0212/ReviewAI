"""Pydantic data models for code submission, validation, and language detection."""
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class CodeSubmitRequest(BaseModel):
    """Payload for submitting source code to ReviewAI."""
    code: str = Field(
        ..., 
        description="Source code content to be submitted",
        min_length=1
    )
    language: str = Field(
        ..., 
        description="Selected or detected programming language id",
        min_length=1
    )
    filename: Optional[str] = Field(
        default=None, 
        description="Optional original or sanitized filename"
    )
    language_detected: Optional[bool] = Field(
        default=False,
        description="Whether the language was automatically detected"
    )
    submission_type: Optional[str] = Field(
        default="paste",
        description="Submission mechanism: 'paste', 'file_upload', or 'github'"
    )
    metadata: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Extensible metadata for future integrations (e.g. GitHub repo, PR, commit)"
    )

    @field_validator("code")
    @classmethod
    def validate_code_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Source code cannot be empty.")
        return v

    @field_validator("language")
    @classmethod
    def validate_language_not_blank(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError("Programming language must be specified.")
        return v.strip().lower()


class CodeSubmitResponse(BaseModel):
    """Structured response for a code submission."""
    success: bool = Field(..., description="Whether submission was accepted")
    filename: Optional[str] = Field(None, description="Normalized filename of the submitted code")
    language: str = Field(..., description="Canonical language identifier")
    language_detected: bool = Field(..., description="Whether language was detected automatically")
    message: str = Field(..., description="Human-readable result message")
    code_length: int = Field(..., description="Total character count of submitted code")
    lines_count: Optional[int] = Field(None, description="Number of lines in the submitted code")
    submission_id: Optional[str] = Field(None, description="Unique identifier for tracking the submission")
    created_at: Optional[str] = Field(None, description="ISO timestamp of submission")


class LanguageDetectRequest(BaseModel):
    """Payload for requesting automatic language detection."""
    code: Optional[str] = Field(
        default="", 
        description="Source code snippet or content to analyze"
    )
    filename: Optional[str] = Field(
        default=None, 
        description="Optional filename whose extension can guide detection"
    )


class LanguageCandidate(BaseModel):
    """Alternative candidate language with confidence score."""
    language: str = Field(..., description="Language id")
    name: str = Field(..., description="Display name")
    confidence: float = Field(..., description="Confidence score between 0.0 and 1.0")


class LanguageDetectResponse(BaseModel):
    """Result of language detection."""
    detected_language: Optional[str] = Field(
        None, 
        description="Detected canonical language ID, or null if uncertain"
    )
    language_name: Optional[str] = Field(
        None, 
        description="Human-friendly language name"
    )
    confidence: float = Field(
        ..., 
        description="Detection confidence score from 0.0 to 1.0"
    )
    is_reliable: bool = Field(
        ..., 
        description="True if confidence exceeds reliability threshold and can be auto-selected"
    )
    requires_manual_selection: bool = Field(
        ..., 
        description="True if the detection is ambiguous and user should manually confirm"
    )
    detection_source: str = Field(
        ..., 
        description="'extension', 'content', 'shebang', or 'none'"
    )
    alternatives: List[LanguageCandidate] = Field(
        default_factory=list, 
        description="Alternative candidate languages with relative scores"
    )
    message: str = Field(
        ..., 
        description="Explanation or recommendation for the user"
    )


class SupportedLanguageItem(BaseModel):
    """Metadata for a supported language returned by the registry."""
    id: str
    name: str
    extensions: List[str]
    monaco_id: str
    category: str
    sample_snippet: str

