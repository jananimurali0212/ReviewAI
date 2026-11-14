"""JavaScript static analyzer using ESLint."""
import json
import logging
import os
import tempfile
from typing import Any, Dict, List, Optional

from app.analyzers.base import BaseAnalyzer
from app.models.review_models import FindingCategory, ReviewFinding, SeverityLevel

logger = logging.getLogger(__name__)


class ESLintJavaScriptAnalyzer(BaseAnalyzer):
    """ESLint static analyzer for JavaScript code."""

    @property
    def name(self) -> str:
        return "eslint_js"

    @property
    def supported_languages(self) -> List[str]:
        return ["javascript"]

    def is_available(self) -> bool:
        return self.check_executable("eslint") is not None

    def _map_rule_category(self, rule_id: Optional[str]) -> tuple[FindingCategory, SeverityLevel]:
        if not rule_id:
            return "maintainability", "medium"

        rule = rule_id.lower()
        if "security" in rule or "xss" in rule or "injection" in rule or rule in ["no-eval", "no-implied-eval"]:
            return "security", "high"
        if rule in ["no-undef", "no-unreachable", "valid-typeof", "use-isnan", "for-direction"]:
            return "correctness", "high"
        if rule in ["eqeqeq", "no-constant-condition", "no-dupe-keys", "no-duplicate-case"]:
            return "correctness", "medium"
        if rule in ["no-unused-vars", "no-empty", "no-redeclare", "prefer-const", "no-var"]:
            return "maintainability", "low"
        if rule in ["semi", "quotes", "indent", "comma-dangle", "no-trailing-spaces"]:
            return "style", "low"

        return "maintainability", "medium"

    def run_analysis(
        self,
        code: str,
        filename: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> List[ReviewFinding]:
        executable = self.check_executable("eslint")
        if not executable:
            logger.info("ESLint is not available on this system.")
            return []

        findings: List[ReviewFinding] = []
        safe_filename = os.path.basename(filename) if filename else "submitted_code.js"
        if not any(safe_filename.endswith(ext) for ext in [".js", ".jsx", ".mjs"]):
            safe_filename += ".js"

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = os.path.join(temp_dir, safe_filename)
            with open(temp_path, "w", encoding="utf-8") as f:
                f.write(code)

            # Minimal ESLint flat config or command args
            args = [
                executable,
                "--format",
                "json",
                "--no-ignore",
                temp_path,
            ]

            try:
                result = self.execute_subprocess_safely(args, cwd=temp_dir, timeout=12)
                stdout = result.stdout.strip()
                if not stdout:
                    return []

                raw_data = json.loads(stdout)
                if not isinstance(raw_data, list):
                    return []

                for file_entry in raw_data:
                    messages = file_entry.get("messages", [])
                    for idx, msg in enumerate(messages, start=1):
                        rule_id = msg.get("ruleId") or "eslint-diagnostic"
                        category, default_sev = self._map_rule_category(rule_id)
                        severity_int = msg.get("severity", 1)
                        severity: SeverityLevel = "high" if severity_int == 2 else default_sev

                        start_line = max(1, int(msg.get("line", 1)))
                        end_line = max(start_line, int(msg.get("endLine", start_line)))
                        message_text = msg.get("message", "Lint diagnostic")

                        # Extract evidence
                        code_lines = code.splitlines()
                        evidence_slice = code_lines[start_line - 1 : end_line] if start_line - 1 < len(code_lines) else []
                        evidence_text = "\n".join(evidence_slice).strip()

                        findings.append(
                            ReviewFinding(
                                id=f"eslint_js_{idx:03d}",
                                title=f"[{rule_id}] {message_text}",
                                category=category,
                                severity=severity,
                                file=safe_filename,
                                start_line=start_line,
                                end_line=end_line,
                                evidence=evidence_text,
                                explanation=f"ESLint diagnostic ({rule_id}): {message_text}",
                                recommendation="Review JavaScript language conventions or apply recommended syntax.",
                                confidence="high",
                                source="static",
                                analyzer_name="eslint",
                                rule_id=rule_id,
                                fix_available=True,
                            )
                        )
            except json.JSONDecodeError as exc:
                logger.warning("ESLint output was not valid JSON: %s", exc)
            except Exception as exc:
                logger.warning("ESLint JavaScript analyzer failed: %s", exc)

        return findings
