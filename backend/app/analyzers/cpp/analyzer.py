"""C / C++ static analyzer using Cppcheck if installed."""
import logging
import os
import tempfile
import xml.etree.ElementTree as ET
from typing import Any, Dict, List, Optional

from app.analyzers.base import BaseAnalyzer
from app.models.review_models import FindingCategory, ReviewFinding, SeverityLevel

logger = logging.getLogger(__name__)


class CppcheckAnalyzer(BaseAnalyzer):
    """C and C++ static analyzer integrating Cppcheck where available."""

    @property
    def name(self) -> str:
        return "cppcheck"

    @property
    def supported_languages(self) -> List[str]:
        return ["c", "cpp"]

    def is_available(self) -> bool:
        return self.check_executable("cppcheck") is not None

    def run_analysis(
        self,
        code: str,
        filename: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> List[ReviewFinding]:
        executable = self.check_executable("cppcheck")
        if not executable:
            logger.info("Cppcheck is not installed on this system.")
            return []

        safe_filename = os.path.basename(filename) if filename else "submitted_code.cpp"
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = os.path.join(temp_dir, safe_filename)
            with open(temp_path, "w", encoding="utf-8") as f:
                f.write(code)

            try:
                result = self.execute_subprocess_safely(
                    [executable, "--xml", "--enable=all", "--inconclusive", temp_path],
                    cwd=temp_dir,
                    timeout=10,
                )
                stderr = result.stderr.strip()
                if not stderr:
                    return []

                findings: List[ReviewFinding] = []
                root = ET.fromstring(stderr)
                errors = root.findall(".//error")
                for idx, err in enumerate(errors, start=1):
                    msg = err.attrib.get("msg", "Cppcheck warning")
                    sev_str = err.attrib.get("severity", "style")
                    err_id = err.attrib.get("id", "cppcheck")
                    location = err.find("location")
                    line = int(location.attrib.get("line", 1)) if location is not None else 1

                    category: FindingCategory = "security" if sev_str == "error" else "correctness"
                    severity: SeverityLevel = "high" if sev_str == "error" else "medium"

                    findings.append(
                        ReviewFinding(
                            id=f"cppcheck_{idx:03d}",
                            title=f"[{err_id}] {msg}",
                            category=category,
                            severity=severity,
                            file=safe_filename,
                            start_line=line,
                            end_line=line,
                            evidence="",
                            explanation=f"Cppcheck diagnostic ({err_id}): {msg}",
                            recommendation="Check memory safety and syntax constraints.",
                            confidence="high",
                            source="static",
                            analyzer_name="cppcheck",
                            rule_id=err_id,
                            fix_available=True,
                        )
                    )
                return findings
            except Exception as exc:
                logger.warning("Cppcheck execution failed: %s", exc)
                return []
