"""Gemini API client wrapper using the official Google Gen AI SDK.

Manages connection lifecycle, model selection, prompt execution,
timeout enforcement, and graceful error classification.
"""
import logging
from typing import Optional

from google import genai
from google.genai import types
from google.genai.errors import APIError

from ..config.settings import settings
from .review_prompts import SYSTEM_INSTRUCTION, build_review_prompt

logger = logging.getLogger("reviewai.ai.gemini_client")


class GeminiError(Exception):
    """Base exception for Gemini client errors."""
    pass


class GeminiConfigurationError(GeminiError):
    """Raised when the API key or environment is improperly configured."""
    pass


class GeminiAuthError(GeminiError):
    """Raised when authentication with Google Gemini API fails (invalid key)."""
    pass


class GeminiQuotaError(GeminiError):
    """Raised when rate limits or quota are exhausted."""
    pass


class GeminiModelNotFoundError(GeminiError):
    """Raised when the requested model identifier is unavailable."""
    pass


class GeminiTimeoutError(GeminiError):
    """Raised when the API call exceeds the configured timeout."""
    pass


class GeminiClient:
    """Wrapper around Google GenAI SDK for performing code reviews."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        model: Optional[str] = None,
        timeout_seconds: Optional[int] = None
    ):
        self.api_key = (api_key or settings.GEMINI_API_KEY).strip()
        self.model = (model or settings.GEMINI_MODEL).strip()
        self.timeout_seconds = timeout_seconds or settings.REVIEW_TIMEOUT_SECONDS
        self._client: Optional[genai.Client] = None

    def _get_client(self) -> genai.Client:
        """Lazily instantiates the Google GenAI client."""
        if not self.api_key or self.api_key == "your_gemini_api_key_here":
            raise GeminiConfigurationError(
                "Gemini API key is not configured. Please set a valid GEMINI_API_KEY in backend/.env "
                "to enable live AI code reviews. Obtain an API key from Google AI Studio: https://aistudio.google.com/"
            )
        
        if self._client is None:
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def generate_review(
        self,
        code: str,
        language: str,
        filename: Optional[str] = None
    ) -> str:
        """Invokes Gemini model to review code and returns the raw JSON string."""
        client = self._get_client()
        prompt = build_review_prompt(code=code, language=language, filename=filename)

        logger.info(
            "Sending review request to Gemini: model=%s, lang=%s, file=%s, chars=%d, timeout=%ds",
            self.model,
            language,
            filename or "untitled",
            len(code),
            self.timeout_seconds,
        )

        config = types.GenerateContentConfig(
            system_instruction=SYSTEM_INSTRUCTION,
            temperature=0.2,
            response_mime_type="application/json",
            http_options=types.HttpOptions(
                timeout=int(self.timeout_seconds * 1000)
            )
        )

        try:
            response = client.models.generate_content(
                model=self.model,
                contents=prompt,
                config=config,
            )
            raw_text = response.text
            if not raw_text or not raw_text.strip():
                raise GeminiError("Gemini API returned an empty response.")
            return raw_text

        except APIError as api_err:
            status_code = getattr(api_err, "code", None)
            err_message = str(api_err)

            if status_code in (401, 403) or "API_KEY_INVALID" in err_message or "PERMISSION_DENIED" in err_message:
                logger.error("Gemini authentication failure: invalid or unauthorized API key")
                raise GeminiAuthError(
                    "Gemini API authentication failed. Please verify that your GEMINI_API_KEY in backend/.env is valid."
                ) from api_err

            if status_code == 429 or "RESOURCE_EXHAUSTED" in err_message:
                logger.warning("Gemini API quota or rate limit exceeded: %s", err_message)
                raise GeminiQuotaError(
                    "Gemini API rate limit or quota exceeded. Please wait a few moments and try again."
                ) from api_err

            if status_code == 404 or "NOT_FOUND" in err_message:
                logger.error("Gemini model '%s' not found: %s", self.model, err_message)
                raise GeminiModelNotFoundError(
                    f"Gemini model '{self.model}' is not available for your API key. "
                    "You can specify a different model such as 'gemini-1.5-flash' in backend/.env."
                ) from api_err

            logger.error("Gemini API error (%s): %s", status_code, err_message)
            raise GeminiError(f"Gemini API error ({status_code or 'UNKNOWN'}): {err_message}") from api_err

        except TimeoutError as timeout_err:
            logger.error("Gemini API request timed out after %ds", self.timeout_seconds)
            raise GeminiTimeoutError(
                f"Gemini API request timed out after {self.timeout_seconds} seconds. Try reviewing a smaller code snippet."
            ) from timeout_err

        except Exception as exc:
            if isinstance(exc, GeminiError):
                raise
            logger.error("Unexpected error contacting Gemini API: %s", str(exc))
            raise GeminiError(f"Failed to communicate with Gemini AI: {str(exc)}") from exc
