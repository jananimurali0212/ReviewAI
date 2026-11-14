"""Python static analyzers: Ruff (linting/quality) and Bandit (security)."""
import json
import logging
import os
import tempfile
from typing import Any, Dict, List, Optional

from app.analyzers.base import BaseAnalyzer
from app.models.review_models import FindingCategory, ReviewFinding, SeverityLevel

logger = logging.getLogger(__name__)


class RuffAnalyzer(BaseAnalyzer):
    """Ruff linter for Python code quality, correctness, and style."""

    @property
    def name(self) -> str:
        return "ruff"

    @property
    def supported_languages(self) -> List[str]:
        return ["python"]

    def is_available(self) -> bool:
        return self.check_executable("ruff") is not None

    def _map_category_and_severity(self, rule_code: str) -> tuple[FindingCategory, SeverityLevel]:
        prefix = rule_code[:1].upper() if rule_code else ""
        two_prefix = rule_code[:2].upper() if len(rule_code) >= 2 else ""

        # Security rules (flake8-bandit in ruff)
        if prefix == "S":
            return "security", "high"
        # Pyflakes logic / runtime errors
        if prefix == "F":
            if rule_code in ["F821", "F822", "F823"]:  # undefined name / local variable
                return "correctness", "high"
            if rule_code in ["F632", "F633", "F634"]:
                return "correctness", "high"
            if rule_code in ["F401"]:  # unused import
                return "maintainability", "low"
            if rule_code in ["F841"]:  # unused variable
                return "maintainability", "low"
            return "correctness", "medium"
        # Bugbear complexity and logic
        if prefix == "B":
            return "correctness", "medium"
        # Complexity
        if prefix == "C":
            return "maintainability", "medium"
        # Style / whitespace
        if prefix in ["E", "W"]:
            return "style", "low"
        # Performance
        if two_prefix in ["PI"]:
            return "performance", "medium"

        return "maintainability", "low"

    def run_analysis(
        self,
        code: str,
        filename: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> List[ReviewFinding]:
        executable = self.check_executable("ruff")
        if not executable:
            logger.info("Ruff is not available on this system.")
            return []

        findings: List[ReviewFinding] = []
        safe_filename = os.path.basename(filename) if filename else "submitted_code.py"
        if not safe_filename.endswith(".py"):
            safe_filename += ".py"

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = os.path.join(temp_dir, safe_filename)
            with open(temp_path, "w", encoding="utf-8") as f:
                f.write(code)

            args = [
                executable,
                "check",
                "--output-format=json",
                "--no-cache",
                "--select=E,F,W,B,C,S",
                temp_path,
            ]

            try:
                result = self.execute_subprocess_safely(args, cwd=temp_dir, timeout=10)
                stdout = result.stdout.strip()
                if not stdout:
                    return []

                raw_data = json.loads(stdout)
                for index, item in enumerate(raw_data, start=1):
                    code_rule = item.get("code") or "RUFF"
                    category, severity = self._map_category_and_severity(code_rule)
                    location = item.get("location", {})
                    start_line = max(1, int(location.get("row", 1)))
                    end_location = item.get("end_location", {})
                    end_line = max(start_line, int(end_location.get("row", start_line)))
                    message = item.get("message", "Lint warning")

                    # Extract line evidence from code
                    code_lines = code.splitlines()
                    evidence_slice = code_lines[start_line - 1 : end_line] if start_line - 1 < len(code_lines) else []
                    evidence_text = "\n".join(evidence_slice).strip()

                    fix_info = item.get("fix")
                    rec = "Refactor this code to follow standard conventions."
                    if fix_info and fix_info.get("applicability"):
                        rec = f"Apply recommended {code_rule} adjustment."

                    findings.append(
                        ReviewFinding(
                            id=f"ruff_{index:03d}",
                            title=f"[{code_rule}] {message}",
                            category=category,
                            severity=severity,
                            file=safe_filename,
                            start_line=start_line,
                            end_line=end_line,
                            evidence=evidence_text,
                            explanation=f"Ruff detected rule violation {code_rule}: {message}",
                            recommendation=rec,
                            confidence="high",
                            source="static",
                            analyzer_name="ruff",
                            rule_id=code_rule,
                            fix_available=True,
                        )
                    )
            except json.JSONDecodeError as exc:
                logger.warning("Ruff output was not valid JSON: %s", exc)
            except Exception as exc:
                logger.warning("Ruff analyzer execution failed: %s", exc)

        return findings


class BanditAnalyzer(BaseAnalyzer):
    """Bandit security analyzer for Python code."""

    @property
    def name(self) -> str:
        return "bandit"

    @property
    def supported_languages(self) -> List[str]:
        return ["python"]

    def is_available(self) -> bool:
        return self.check_executable("bandit") is not None

    def _map_severity(self, bandit_sev: str) -> SeverityLevel:
        sev = (bandit_sev or "").upper()
        if sev == "HIGH":
            return "high"
        if sev == "MEDIUM":
            return "medium"
        if sev == "LOW":
            return "low"
        return "medium"

    def _map_confidence(self, bandit_conf: str) -> str:
        conf = (bandit_conf or "").upper()
        if conf == "HIGH":
            return "high"
        if conf == "MEDIUM":
            return "medium"
        return "low"

    def run_analysis(
        self,
        code: str,
        filename: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> List[ReviewFinding]:
        executable = self.check_executable("bandit")
        if not executable:
            logger.info("Bandit is not available on this system.")
            return []

        findings: List[ReviewFinding] = []
        safe_filename = os.path.basename(filename) if filename else "submitted_code.py"
        if not safe_filename.endswith(".py"):
            safe_filename += ".py"

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = os.path.join(temp_dir, safe_filename)
            with open(temp_path, "w", encoding="utf-8") as f:
                f.write(code)

            args = [
                executable,
                "-f",
                "json",
                "-q",
                temp_path,
            ]

            try:
                result = self.execute_subprocess_safely(args, cwd=temp_dir, timeout=12)
                stdout = result.stdout.strip()
                if not stdout:
                    return []

                raw_data = json.loads(stdout)
                results = raw_data.get("results", [])
                for index, item in enumerate(results, start=1):
                    test_id = item.get("test_id", "B000")
                    test_name = item.get("test_name", "Security issue")
                    issue_text = item.get("issue_text", "Potential security vulnerability detected")
                    line_num = max(1, int(item.get("line_number", 1)))
                    line_range = item.get("line_range", [line_num])
                    start_line = max(1, min(line_range) if line_range else line_num)
                    end_line = max(start_line, max(line_range) if line_range else line_num)
                    evidence = item.get("code", "").strip()

                    severity = self._map_severity(item.get("issue_severity", "MEDIUM"))
                    confidence = self._map_confidence(item.get("issue_confidence", "MEDIUM"))
                    cwe = item.get("issue_cwe", {})
                    cwe_link = item.get("more_info", "")

                    rec = "Review and remediate this security risk using secure language APIs or parameterized queries."
                    if cwe_link:
                        rec += f" Reference: {cwe_link}"

                    findings.append(
                        ReviewFinding(
                            id=f"bandit_{index:03d}",
                            title=f"[{test_id}] {issue_text}",
                            category="security",
                            severity=severity,
                            file=safe_filename,
                            start_line=start_line,
                            end_line=end_line,
                            evidence=evidence,
                            explanation=f"Bandit security check {test_id} ({test_name}): {issue_text}",
                            recommendation=rec,
                            confidence=confidence,  # type: ignore[arg-type]
                            source="static",
                            analyzer_name="bandit",
                            rule_id=test_id,
                            fix_available=True,
                        )
                    )
            except json.JSONDecodeError as exc:
                logger.warning("Bandit output was not valid JSON: %s", exc)
            except Exception as exc:
                logger.warning("Bandit analyzer execution failed: %s", exc)

        return findings


class PythonCompositeAnalyzer(BaseAnalyzer):
    """Combines Ruff and Bandit analyzers for comprehensive Python analysis."""

    def __init__(self) -> None:
        self.ruff = RuffAnalyzer()
        self.bandit = BanditAnalyzer()

    @property
    def name(self) -> str:
        return "python_static"

    @property
    def supported_languages(self) -> List[str]:
        return ["python"]

    def is_available(self) -> bool:
        return self.ruff.is_available() or self.bandit.is_available()

    def run_analysis(
        self,
        code: str,
        filename: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> List[ReviewFinding]:
        all_findings: List[ReviewFinding] = []

        if self.ruff.is_available():
            all_findings.extend(self.ruff.run_analysis(code, filename, options))

        if self.bandit.is_available():
            all_findings.extend(self.bandit.run_analysis(code, filename, options))

        return all_findings
