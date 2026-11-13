"""JSON response parser for Gemini AI code review outputs."""
import json
import logging
import re
from typing import Any, Dict

logger = logging.getLogger("reviewai.ai.parser")


class ResponseParsingError(Exception):
    """Raised when the Gemini model response cannot be parsed into valid JSON."""
    pass


def extract_json_payload(raw_text: str) -> str:
    """Strips markdown code fences (```json ... ```) or extracts JSON substring."""
    cleaned = raw_text.strip()
    
    # Remove leading ```json or ```
    cleaned = re.sub(r"^```(?:json)?\s*", "", cleaned, flags=re.IGNORECASE)
    # Remove trailing ```
    cleaned = re.sub(r"\s*```$", "", cleaned)
    
    # If there are still surrounding characters, find first '{' and last '}'
    start_idx = cleaned.find("{")
    end_idx = cleaned.rfind("}")
    if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
        return cleaned[start_idx : end_idx + 1]
    
    return cleaned


def parse_review_response(raw_text: str) -> Dict[str, Any]:
    """Parses raw Gemini text into a sanitized review data dictionary.
    
    Raises:
        ResponseParsingError: If text is unparseable or does not form a JSON dictionary.
    """
    if not raw_text or not raw_text.strip():
        raise ResponseParsingError("Gemini returned an empty response.")

    json_str = extract_json_payload(raw_text)

    try:
        data = json.loads(json_str)
    except json.JSONDecodeError as decode_err:
        logger.error("Failed to parse JSON response from Gemini: %s. Raw text snippet: %s", str(decode_err), raw_text[:200])
        raise ResponseParsingError(
            f"Model output was not valid JSON: {str(decode_err)}. The response could not be structured."
        ) from decode_err

    if not isinstance(data, dict):
        raise ResponseParsingError(
            f"Expected a top-level JSON dictionary from model, got {type(data).__name__}."
        )

    # Sanitize and ensure standard keys exist
    summary = str(data.get("summary") or "").strip()
    if not summary:
        summary = "Code review completed. No summary description was provided by the model."

    raw_findings = data.get("findings")
    if not isinstance(raw_findings, list):
        raw_findings = []

    positive_obs = data.get("positive_observations")
    if not isinstance(positive_obs, list):
        positive_obs = []
    positive_obs = [str(item).strip() for item in positive_obs if item]

    general_recs = data.get("general_recommendations")
    if not isinstance(general_recs, list):
        general_recs = []
    general_recs = [str(item).strip() for item in general_recs if item]

    return {
        "summary": summary,
        "findings": raw_findings,
        "positive_observations": positive_obs,
        "general_recommendations": general_recs,
    }

