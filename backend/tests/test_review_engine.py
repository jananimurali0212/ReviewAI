"""Tests for Day 3: Gemini AI Code Review Engine, Finding Validator, and Review API."""
import json
import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.models.review_models import ReviewAnalyzeRequest
from app.routes.review_routes import analyze_code_review
from app.services.review_engine import execute_code_review
from app.services.finding_validator import (
    validate_and_sanitize_findings,
    normalize_category,
    normalize_severity,
    normalize_confidence,
)
from app.ai.response_parser import parse_review_response, ResponseParsingError
from app.ai.gemini_client import (
    GeminiClient,
    GeminiAuthError,
    GeminiQuotaError,
    GeminiTimeoutError,
    GeminiError,
)


class MockGeminiClient(GeminiClient):
    """Mock Gemini client for deterministic unit testing of review engine."""

    def __init__(self, mock_response_text: str = "", raises_exception=None):
        super().__init__(api_key="mock_key", model="gemini-2.5-flash")
        self.mock_response_text = mock_response_text
        self.raises_exception = raises_exception
        self.recorded_calls = []

    def generate_review(self, code: str, language: str, filename=None) -> str:
        self.recorded_calls.append({"code": code, "language": language, "filename": filename})
        if self.raises_exception:
            raise self.raises_exception
        return self.mock_response_text


# ==============================================================================
# SECTION 1: REAL-WORLD TEST CASES REQUIRED BY SPEC
# ==============================================================================

def test_case_1_python_division_by_zero():
    """Test Case 1: Python function dividing two numbers without checking if denominator is zero."""
    code = """def compute_ratio(total, count):
    # Potential division by zero when count is 0
    return total / count
"""
    mock_payload = {
        "summary": "The function contains a critical correctness flaw where count is not checked before division.",
        "findings": [
            {
                "id": "finding_001",
                "title": "Potential ZeroDivisionError",
                "category": "correctness",
                "severity": "high",
                "file": "calc.py",
                "start_line": 3,
                "end_line": 3,
                "evidence": "return total / count",
                "explanation": "If count evaluates to 0, Python raises ZeroDivisionError.",
                "recommendation": "Add a guard check: if count == 0: return 0.0",
                "confidence": "high"
            }
        ],
        "positive_observations": ["Concise function signature"],
        "general_recommendations": ["Consider adding type hints and docstrings."]
    }
    client = MockGeminiClient(mock_response_text=json.dumps(mock_payload))
    req = ReviewAnalyzeRequest(code=code, language="python", filename="calc.py")
    report = execute_code_review(req, gemini_client=client)

    assert report.total_findings == 1
    assert report.severity_breakdown.high == 1
    finding = report.findings[0]
    assert finding.category == "correctness"
    assert "division" in finding.title.lower() or "zero" in finding.title.lower()
    assert finding.start_line == 3
    assert finding.confidence == "high"


def test_case_2_javascript_undefined_property_access():
    """Test Case 2: JavaScript accessing property of potentially undefined object."""
    code = """function getUserCity(user) {
    // Unchecked property access on undefined address
    return user.profile.address.city;
}
"""
    mock_payload = {
        "summary": "Identified potential runtime TypeError due to unvalidated nested object traversal.",
        "findings": [
            {
                "id": "finding_001",
                "title": "Unsafe nested property access",
                "category": "correctness",
                "severity": "high",
                "file": "user.js",
                "start_line": 3,
                "end_line": 3,
                "evidence": "return user.profile.address.city;",
                "explanation": "If user, profile, or address is undefined/null, this will throw a TypeError at runtime.",
                "recommendation": "Use optional chaining: user?.profile?.address?.city",
                "confidence": "high"
            }
        ],
        "positive_observations": ["Direct pure function approach"],
        "general_recommendations": ["Use TypeScript or optional chaining for deep access."]
    }
    client = MockGeminiClient(mock_response_text=json.dumps(mock_payload))
    req = ReviewAnalyzeRequest(code=code, language="javascript", filename="user.js")
    report = execute_code_review(req, gemini_client=client)

    assert report.total_findings == 1
    assert report.findings[0].category == "correctness"
    assert "property" in report.findings[0].title.lower()
    assert report.findings[0].start_line == 3


def test_case_3_python_sql_injection():
    """Test Case 3: Python SQL injection via string concatenation."""
    code = """def fetch_user_record(cursor, user_id):
    # Dangerous SQL query formatting
    query = "SELECT * FROM users WHERE id = '" + user_id + "'"
    cursor.execute(query)
    return cursor.fetchone()
"""
    mock_payload = {
        "summary": "Severe SQL injection vulnerability discovered via raw query concatenation.",
        "findings": [
            {
                "id": "finding_001",
                "title": "SQL Injection vulnerability",
                "category": "security",
                "severity": "critical",
                "file": "db.py",
                "start_line": 3,
                "end_line": 3,
                "evidence": "query = \"SELECT * FROM users WHERE id = '\" + user_id + \"'\"",
                "explanation": "Constructing SQL queries by concatenating unescaped user input allows arbitrary query manipulation.",
                "recommendation": "Use parameterized queries: cursor.execute('SELECT * FROM users WHERE id = %s', (user_id,))",
                "confidence": "high"
            }
        ],
        "positive_observations": ["Clear cursor lifecycle usage"],
        "general_recommendations": ["Adopt an ORM or strict parameterized database interface."]
    }
    client = MockGeminiClient(mock_response_text=json.dumps(mock_payload))
    req = ReviewAnalyzeRequest(code=code, language="python", filename="db.py")
    report = execute_code_review(req, gemini_client=client)

    assert report.total_findings == 1
    assert report.severity_breakdown.critical == 1
    assert report.findings[0].category == "security"
    assert "sql injection" in report.findings[0].title.lower()


def test_case_4_java_incorrect_logical_condition():
    """Test Case 4: Java method with a logical condition producing incorrect results."""
    code = """public class DiscountCalculator {
    public double applyDiscount(double price, boolean isVip, boolean isFirstOrder) {
        // Logic error: using OR instead of AND or inverted condition
        if (isVip || isFirstOrder && price < 0) {
            return price * 0.8;
        }
        return price;
    }
}
"""
    mock_payload = {
        "summary": "Identified flawed conditional logic and precedence confusion.",
        "findings": [
            {
                "id": "finding_001",
                "title": "Flawed conditional expression precedence",
                "category": "correctness",
                "severity": "medium",
                "file": "DiscountCalculator.java",
                "start_line": 4,
                "end_line": 4,
                "evidence": "if (isVip || isFirstOrder && price < 0)",
                "explanation": "Operator precedence causes price < 0 check to bind only to isFirstOrder.",
                "recommendation": "Add explicit parentheses and validate that price is positive.",
                "confidence": "high"
            }
        ],
        "positive_observations": ["Clean method signature and readable parameter names"],
        "general_recommendations": ["Clarify business rules with explicit boolean helper variables."]
    }
    client = MockGeminiClient(mock_response_text=json.dumps(mock_payload))
    req = ReviewAnalyzeRequest(code=code, language="java", filename="DiscountCalculator.java")
    report = execute_code_review(req, gemini_client=client)

    assert report.total_findings == 1
    assert report.findings[0].category == "correctness"
    assert report.findings[0].severity == "medium"


def test_case_5_clean_code_no_hallucinated_defects():
    """Test Case 5: Clean, correctly written code produces zero critical/high findings."""
    code = """def add_positive_numbers(a: float, b: float) -> float:
    \"\"\"Adds two positive numbers safely.\"\"\"
    if a < 0 or b < 0:
        raise ValueError("Both numbers must be non-negative.")
    return a + b
"""
    clean_payload = {
        "summary": "Code is clean, well-typed, and correctly handles boundary conditions.",
        "findings": [],
        "positive_observations": [
            "Comprehensive input validation for negative numbers",
            "Clear type hints and docstring",
            "Idiomatic Python implementation"
        ],
        "general_recommendations": ["Ready for production deployment."]
    }
    client = MockGeminiClient(mock_response_text=json.dumps(clean_payload))
    req = ReviewAnalyzeRequest(code=code, language="python", filename="math_utils.py")
    report = execute_code_review(req, gemini_client=client)

    assert report.total_findings == 0
    assert len(report.findings) == 0
    assert report.severity_breakdown.critical == 0
    assert report.severity_breakdown.high == 0
    assert len(report.positive_observations) >= 2


# ==============================================================================
# SECTION 2: ERROR SCENARIOS, VALIDATION & BOUNDARY CONDITIONS
# ==============================================================================

def test_error_empty_source_code():
    """Empty or whitespace-only code submission rejected with HTTP 400 or ValidationError."""
    with pytest.raises(ValidationError):
        ReviewAnalyzeRequest(code="", language="python")

    with pytest.raises(ValidationError):
        ReviewAnalyzeRequest(code="   \n\t  ", language="python")


def test_error_unsupported_language():
    """Unsupported language rejected with HTTP 400."""
    with pytest.raises(HTTPException) as exc:
        req = ReviewAnalyzeRequest(code="x = 1", language="brainfuck")
        execute_code_review(req)
    assert exc.value.status_code == 400
    assert "Unsupported or unrecognized" in exc.value.detail


def test_error_oversized_code_submission():
    """Code exceeding 1 MB rejected with HTTP 413."""
    big_code = "# filler\n" + ("x = 1000\n" * 200_000)
    with pytest.raises(HTTPException) as exc:
        req = ReviewAnalyzeRequest(code=big_code, language="python")
        execute_code_review(req)
    assert exc.value.status_code == 413
    assert "maximum" in exc.value.detail.lower() or "limit" in exc.value.detail.lower()


def test_gemini_api_auth_error_handling():
    """Gemini API authentication error translates to HTTP 401 without crashing."""
    client = MockGeminiClient(raises_exception=GeminiAuthError("Authentication failed: invalid key"))
    with pytest.raises(HTTPException) as exc:
        req = ReviewAnalyzeRequest(code="def run(): pass", language="python")
        execute_code_review(req, gemini_client=client)
    assert exc.value.status_code == 401
    assert "authentication failed" in exc.value.detail.lower()


def test_gemini_api_quota_error_handling():
    """Gemini quota/rate limit error translates to HTTP 429 without crashing."""
    client = MockGeminiClient(raises_exception=GeminiQuotaError("Quota exceeded: rate limit reached"))
    with pytest.raises(HTTPException) as exc:
        req = ReviewAnalyzeRequest(code="def run(): pass", language="python")
        execute_code_review(req, gemini_client=client)
    assert exc.value.status_code == 429
    assert "quota" in exc.value.detail.lower()


def test_gemini_api_timeout_handling():
    """Gemini timeout error translates to HTTP 504 without crashing."""
    client = MockGeminiClient(raises_exception=GeminiTimeoutError("Request timed out"))
    with pytest.raises(HTTPException) as exc:
        req = ReviewAnalyzeRequest(code="def run(): pass", language="python")
        execute_code_review(req, gemini_client=client)
    assert exc.value.status_code == 504
    assert "timed out" in exc.value.detail.lower()


def test_invalid_json_response_handling():
    """Malformed non-JSON output from Gemini translates to HTTP 502 without crashing."""
    client = MockGeminiClient(mock_response_text="This is plain text not JSON at all.")
    with pytest.raises(HTTPException) as exc:
        req = ReviewAnalyzeRequest(code="def run(): pass", language="python")
        execute_code_review(req, gemini_client=client)
    assert exc.value.status_code == 502
    assert "Failed to parse structured review" in exc.value.detail


def test_line_reference_bounds_clamping():
    """Out-of-bounds line numbers from AI model are clamped to valid code range."""
    short_code = "line1\nline2\nline3"  # Only 3 lines!
    raw_findings = [
        {
            "id": "f1",
            "title": "Bug in future line",
            "category": "correctness",
            "severity": "high",
            "start_line": 999,  # Out of bounds!
            "end_line": 1500,   # Out of bounds!
            "explanation": "Something wrong",
            "recommendation": "Fix it",
            "confidence": "high"
        },
        {
            "id": "f2",
            "title": "Negative line bug",
            "category": "security",
            "severity": "critical",
            "start_line": -10,  # Negative!
            "end_line": 0,      # Zero!
            "explanation": "Bad indexing",
            "recommendation": "Fix index",
            "confidence": "high"
        }
    ]
    validated = validate_and_sanitize_findings(
        raw_findings=raw_findings,
        source_code=short_code,
        submitted_filename="test.py"
    )
    assert len(validated) == 2
    # Clamped to line 3 (last line)
    assert validated[0].start_line == 3
    assert validated[0].end_line == 3
    # Clamped to line 1 (first line)
    assert validated[1].start_line == 1
    assert validated[1].end_line == 1


def test_duplicate_findings_deduplication():
    """Identical duplicate findings on the same line are safely collapsed."""
    code = "x = 1\ny = 2\n"
    raw_findings = [
        {
            "id": "f1",
            "title": "Unused variable x",
            "category": "maintainability",
            "severity": "low",
            "start_line": 1,
            "end_line": 1,
            "explanation": "Variable x is never read.",
            "recommendation": "Remove it",
            "confidence": "high"
        },
        {
            "id": "f2",
            "title": "Unused variable x",  # Duplicate!
            "category": "maintainability",
            "severity": "low",
            "start_line": 1,
            "end_line": 1,
            "explanation": "Variable x is never read.",
            "recommendation": "Remove it",
            "confidence": "high"
        }
    ]
    validated = validate_and_sanitize_findings(
        raw_findings=raw_findings,
        source_code=code,
        submitted_filename="script.py"
    )
    assert len(validated) == 1
    assert validated[0].id == "f1"


def test_markdown_json_wrapping_parser():
    """Parser cleanly extracts JSON wrapped in ```json markdown fences."""
    fenced_output = """```json
{
  "summary": "Fenced json test",
  "findings": [],
  "positive_observations": ["Great code"],
  "general_recommendations": []
}
```"""
    parsed = parse_review_response(fenced_output)
    assert parsed["summary"] == "Fenced json test"
    assert len(parsed["findings"]) == 0
    assert len(parsed["positive_observations"]) == 1
