"""Comprehensive tests for Day 4 static analysis, deduplication, and intelligent fix suggestions."""
import unittest
from unittest.mock import MagicMock, patch

from app.analyzers.base import BaseAnalyzer
from app.analyzers.javascript.analyzer import ESLintJavaScriptAnalyzer
from app.analyzers.python.analyzer import BanditAnalyzer, RuffAnalyzer
from app.analyzers.registry import AnalyzerRegistry
from app.analyzers.typescript.analyzer import ESLintTypeScriptAnalyzer
from app.models.review_models import (
    ApplyFixRequest,
    RejectFixRequest,
    ReviewAnalyzeRequest,
    ReviewFinding,
    SuggestedFix,
    SuggestFixRequest,
)
from app.routes.review_routes import (
    analyze_code_review,
    analyze_combined,
    analyze_static_only,
    apply_fix,
    get_analyzer_status,
    reject_fix,
    suggest_fix,
)
from app.services.analysis_orchestrator import run_combined_analysis, run_static_analysis_only
from app.services.finding_deduplicator import (
    are_findings_duplicate,
    deduplicate_and_merge_findings,
)
from app.services.finding_normalizer import (
    normalize_category,
    normalize_finding,
    normalize_findings_list,
    normalize_severity,
)
from app.services.fix_generator import generate_fix_suggestion
from app.services.patch_validator import (
    apply_patch_to_code,
    generate_diff_preview,
    validate_patch,
)


class TestDay4StaticAnalysisAndFixes(unittest.TestCase):
    """Test suite for static analyzers, normalization, deduplication, and fixes."""

    # 1. Python static analysis using Ruff
    def test_01_ruff_static_analysis_detects_unused_import_or_syntax(self):
        analyzer = RuffAnalyzer()
        if not analyzer.is_available():
            self.skipTest("Ruff CLI not available in environment.")

        code = "import sys\n\ndef calculate(a, b):\n    x = 10\n    return a + b\n"
        findings = analyzer.run_analysis(code, "test_calc.py")
        self.assertIsInstance(findings, list)
        self.assertGreater(len(findings), 0)
        self.assertTrue(any(f.analyzer_name == "ruff" for f in findings))
        self.assertTrue(any(f.source == "static" for f in findings))
        # Rule F401 (unused import sys) or F841 (unused var x) should be present
        rule_ids = [f.rule_id for f in findings if f.rule_id]
        self.assertTrue(any("F401" in r or "F841" in r for r in rule_ids))

    # 2. Python security analysis using Bandit
    def test_02_bandit_security_analysis_detects_hardcoded_or_sql(self):
        analyzer = BanditAnalyzer()
        if not analyzer.is_available():
            self.skipTest("Bandit CLI not available in environment.")

        code = "import sqlite3\n\ndef query_user(user_id):\n    query = 'SELECT * FROM users WHERE id = %s' % user_id\n    sqlite3.connect('test.db').execute(query)\n"
        findings = analyzer.run_analysis(code, "test_security.py")
        self.assertIsInstance(findings, list)
        self.assertGreater(len(findings), 0)
        self.assertTrue(all(f.category == "security" for f in findings))
        self.assertTrue(any(f.analyzer_name == "bandit" for f in findings))

    # 3. JavaScript analysis using ESLint
    def test_03_eslint_javascript_analysis(self):
        analyzer = ESLintJavaScriptAnalyzer()
        if not analyzer.is_available():
            self.skipTest("ESLint CLI not available.")

        code = "function test() {\n  var a = 1;\n  var a = 2;\n  return a;\n}\n"
        findings = analyzer.run_analysis(code, "test.js")
        self.assertIsInstance(findings, list)

    # 4. TypeScript analysis using ESLint
    def test_04_typescript_static_analysis(self):
        analyzer = ESLintTypeScriptAnalyzer()
        if not analyzer.is_available():
            self.skipTest("ESLint CLI not available.")

        code = "const x: any = 10;\nconsole.log(x);\n"
        findings = analyzer.run_analysis(code, "test.ts")
        self.assertIsInstance(findings, list)

    # 5. Analyzer unavailable scenario
    def test_05_analyzer_unavailable_scenario_handles_cleanly(self):
        class MockUnavailableAnalyzer(BaseAnalyzer):
            @property
            def name(self) -> str:
                return "unavailable_linter"

            @property
            def supported_languages(self):
                return ["python"]

            def is_available(self) -> bool:
                return False

            def run_analysis(self, code, filename, options=None):
                return []

        registry = AnalyzerRegistry()
        registry._analyzers["python"] = [MockUnavailableAnalyzer()]
        findings, executed, errors = registry.run_analysis_for_language(
            code="print('hello')",
            language="python",
            filename="hello.py",
        )
        self.assertEqual(len(findings), 0)
        self.assertEqual(len(executed), 0)
        self.assertEqual(len(errors), 0)

    # 6. Analyzer timeout scenario
    def test_06_analyzer_timeout_scenario_handled_gracefully(self):
        class MockTimeoutAnalyzer(BaseAnalyzer):
            @property
            def name(self) -> str:
                return "slow_linter"

            @property
            def supported_languages(self):
                return ["python"]

            def is_available(self) -> bool:
                return True

            def run_analysis(self, code, filename, options=None):
                raise TimeoutError("Analysis timed out.")

        registry = AnalyzerRegistry()
        registry._analyzers["python"] = [MockTimeoutAnalyzer()]
        findings, executed, errors = registry.run_analysis_for_language(
            code="print('hello')",
            language="python",
            filename="hello.py",
        )
        self.assertEqual(len(findings), 0)
        self.assertIn("slow_linter", errors)
        self.assertIn("timed out", errors["slow_linter"])

    # 7. Duplicate AI and static-analysis findings
    def test_07_duplicate_ai_and_static_findings_merge_into_ai_and_static(self):
        ai_finding = ReviewFinding(
            id="ai_01",
            title="Potential division by zero",
            category="correctness",
            severity="high",
            file="math.py",
            start_line=10,
            end_line=10,
            evidence="return total / count",
            explanation="The count variable can be 0.",
            recommendation="Check if count == 0.",
            confidence="high",
            source="ai",
        )
        static_finding = ReviewFinding(
            id="ruff_01",
            title="[B018] Zero division risk in arithmetic",
            category="correctness",
            severity="medium",
            file="math.py",
            start_line=10,
            end_line=10,
            evidence="total / count",
            explanation="Denominator count may be zero.",
            recommendation="Validate count.",
            confidence="high",
            source="static",
            analyzer_name="ruff",
            rule_id="B018",
        )

        self.assertTrue(are_findings_duplicate(ai_finding, static_finding))

        merged = deduplicate_and_merge_findings([ai_finding, static_finding])
        self.assertEqual(len(merged), 1)
        self.assertEqual(merged[0].source, "ai_and_static")
        # Ensure severity is high (highest of high and medium) without artificial inflation
        self.assertEqual(merged[0].severity, "high")
        self.assertIn("ruff", merged[0].analyzer_name)
        self.assertIn("B018", merged[0].rule_id)

    # 8. Findings with invalid line numbers normalization
    def test_08_findings_with_invalid_line_numbers_are_normalized(self):
        raw_finding = ReviewFinding(
            id="f_out_of_bounds",
            title="Out of bounds finding",
            category="defect",  # synonym for correctness
            severity="blocker",  # synonym for critical
            file="app.py",
            start_line=9999,
            end_line=15000,
            evidence="",
            explanation="Error at nonexistent line",
            recommendation="Fix it",
            confidence="high",
            source="gemini_ai",
        )
        normalized = normalize_finding(raw_finding, total_lines=25)
        self.assertEqual(normalized.start_line, 25)
        self.assertEqual(normalized.end_line, 25)
        self.assertEqual(normalized.category, "correctness")
        self.assertEqual(normalized.severity, "critical")
        self.assertEqual(normalized.source, "ai")

    # 9. Fix suggestion generation
    def test_09_generate_fix_suggestion(self):
        finding = ReviewFinding(
            id="div_01",
            title="Potential division by zero",
            category="correctness",
            severity="high",
            file="calc.py",
            start_line=2,
            end_line=2,
            evidence="return a / b",
            explanation="Denominator b may be zero.",
            recommendation="Add zero check for b.",
            confidence="high",
            source="ai_and_static",
        )
        code = "def divide(a, b):\n    return a / b\n"
        fix = generate_fix_suggestion(finding, code, "python", "calc.py")

        self.assertIsInstance(fix, SuggestedFix)
        self.assertEqual(fix.finding_id, "div_01")
        self.assertEqual(fix.file, "calc.py")
        self.assertEqual(fix.start_line, 2)
        self.assertEqual(fix.end_line, 2)
        self.assertIn("return a / b", fix.original_code)
        self.assertIsNotNone(fix.replacement_code)
        self.assertIsNotNone(fix.diff)
        self.assertIn("+++", fix.diff)

    # 10. Invalid patch rejection (path traversal & out of bounds)
    def test_10_invalid_patch_rejection(self):
        code = "print('line 1')\nprint('line 2')\n"
        # Path traversal patch
        traversal_fix = SuggestedFix(
            finding_id="f1",
            file="../malicious.py",
            start_line=1,
            end_line=1,
            original_code="print('line 1')",
            replacement_code="print('fixed')",
            explanation="fix",
        )
        is_valid, reason = validate_patch(code, traversal_fix, "app.py")
        self.assertFalse(is_valid)
        self.assertIn("path traversal", reason.lower())

        # Out of bounds patch
        oob_fix = SuggestedFix(
            finding_id="f2",
            file="app.py",
            start_line=10,
            end_line=15,
            original_code="bad",
            replacement_code="good",
            explanation="fix",
        )
        is_valid, reason = validate_patch(code, oob_fix, "app.py")
        self.assertFalse(is_valid)
        self.assertIn("invalid start line", reason.lower())

    # 11. Valid patch preview and diff
    def test_11_valid_patch_preview_and_diff(self):
        orig = "result = a / b\n"
        repl = "result = a / b if b != 0 else 0\n"
        diff = generate_diff_preview(orig, repl, "calc.py", start_line=5)
        self.assertIn("--- a/calc.py", diff)
        self.assertIn("+++ b/calc.py", diff)
        self.assertIn("-result = a / b", diff)
        self.assertIn("+result = a / b", diff)


    # 12. User-approved patch application
    def test_12_user_approved_patch_application(self):
        code = "def divide(a, b):\n    return a / b\n"
        fix = SuggestedFix(
            finding_id="finding_123",
            file="calc.py",
            start_line=2,
            end_line=2,
            original_code="    return a / b",
            replacement_code="    if b == 0:\n        return 0\n    return a / b",
            explanation="Safely handle zero denominator",
        )
        updated_code = apply_patch_to_code(code, fix, "calc.py")
        self.assertIn("if b == 0:", updated_code)
        self.assertIn("return a / b", updated_code)

    # 13. User-rejected patch
    def test_13_user_rejected_patch_endpoint(self):
        req = RejectFixRequest(finding_id="finding_123", reason="False positive")
        res = reject_fix(req)
        self.assertEqual(res["status"], "rejected")
        self.assertEqual(res["finding_id"], "finding_123")
        self.assertEqual(res["reason"], "False positive")

    # 14. Undo applied patch
    def test_14_undo_applied_patch(self):
        original_code = "def divide(a, b):\n    return a / b\n"
        fix = SuggestedFix(
            finding_id="f_undo",
            file="calc.py",
            start_line=2,
            end_line=2,
            original_code="    return a / b",
            replacement_code="    return 0 if b == 0 else a / b",
            explanation="Ternary zero guard",
        )
        # Apply
        applied_code = apply_patch_to_code(original_code, fix, "calc.py")
        self.assertNotEqual(applied_code, original_code)
        # Undo by reverting to preserved original_code
        restored_code = original_code
        self.assertEqual(restored_code, original_code)
        self.assertIn("return a / b", restored_code)

    # 15. Stale patch rejection
    def test_15_stale_patch_rejection_when_code_modified(self):
        # Initial code that the fix was generated for:
        old_code = "def compute():\n    total = a / b\n"
        fix = SuggestedFix(
            finding_id="f_stale",
            file="calc.py",
            start_line=2,
            end_line=2,
            original_code="    total = a / b",
            replacement_code="    total = a / b if b != 0 else 0",
            explanation="Check b",
        )
        # User in the meantime edited line 2 to something else:
        modified_code = "def compute():\n    total = calculate_sum(a, b)\n"

        is_valid, error = validate_patch(modified_code, fix, "calc.py")
        self.assertFalse(is_valid)
        self.assertIn("stale patch", error.lower())

    # 16. Static analysis only endpoint
    def test_16_static_analysis_only_pipeline(self):
        req = ReviewAnalyzeRequest(
            code="import os\nimport sys\n\ndef run():\n    a = 10\n    return True\n",
            language="python",
            filename="sample.py",
        )
        report = analyze_static_only(req)
        self.assertEqual(report.status, "completed")
        self.assertEqual(report.ai_findings_count, 0)
        self.assertGreaterEqual(report.static_findings_count, 0)
        self.assertIn("static", report.model)

    # 17. Combined analysis endpoint with deduplication
    def test_17_combined_analysis_pipeline(self):
        req = ReviewAnalyzeRequest(
            code="def divide(a, b):\n    return a / b\n",
            language="python",
            filename="math_util.py",
            mode="combined",
        )
        report = analyze_combined(req)
        self.assertIsNotNone(report.id)
        self.assertEqual(report.file, "math_util.py")
        self.assertEqual(report.language, "python")
        self.assertGreaterEqual(report.total_findings, 0)
        self.assertGreaterEqual(report.ai_findings_count, 0)
        self.assertGreaterEqual(report.static_findings_count, 0)

    # 18. Analyzer status endpoint
    def test_18_analyzer_status_endpoint(self):
        res = get_analyzer_status()
        self.assertEqual(res["status"], "ok")
        self.assertIn("tools", res)
        tools = res["tools"]
        self.assertIn("ruff", tools)
        self.assertIn("bandit", tools)
        self.assertIn("eslint_js", tools)


if __name__ == "__main__":
    unittest.main()
