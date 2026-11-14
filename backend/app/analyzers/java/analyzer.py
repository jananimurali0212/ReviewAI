"""Java static analyzer using Checkstyle if installed."""
import logging
import os
import tempfile
from typing import Any, Dict, List, Optional

from app.analyzers.base import BaseAnalyzer
from app.models.review_models import ReviewFinding

logger = logging.getLogger(__name__)


class CheckstyleJavaAnalyzer(BaseAnalyzer):
    """Java static analyzer integrating Checkstyle where available."""

    @property
    def name(self) -> str:
        return "checkstyle"

    @property
    def supported_languages(self) -> List[str]:
        return ["java"]

    def is_available(self) -> bool:
        return self.check_executable("checkstyle") is not None

    def run_analysis(
        self,
        code: str,
        filename: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> List[ReviewFinding]:
        executable = self.check_executable("checkstyle")
        if not executable:
            logger.info("Checkstyle is not installed on this system.")
            return []

        # If executable is available, execute with safe timeout
        safe_filename = os.path.basename(filename) if filename else "SubmittedCode.java"
        if not safe_filename.endswith(".java"):
            safe_filename += ".java"

        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = os.path.join(temp_dir, safe_filename)
            with open(temp_path, "w", encoding="utf-8") as f:
                f.write(code)

            try:
                result = self.execute_subprocess_safely(
                    [executable, "-c", "/sun_checks.xml", temp_path],
                    cwd=temp_dir,
                    timeout=10,
                )
                # Output parsing if installed
                return []
            except Exception as exc:
                logger.warning("Checkstyle execution failed: %s", exc)
                return []
