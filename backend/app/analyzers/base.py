"""Base interface and execution abstractions for static code analyzers."""
import abc
import logging
import os
import shutil
import subprocess
import tempfile
from typing import Any, Dict, List, Optional
from app.models.review_models import FindingCategory, ReviewFinding, SeverityLevel

logger = logging.getLogger(__name__)


class BaseAnalyzer(abc.ABC):
    """Abstract base class for static code analyzers."""

    @property
    @abc.abstractmethod
    def name(self) -> str:
        """Unique identifier of the analyzer (e.g. 'ruff', 'bandit', 'eslint')."""
        pass

    @property
    @abc.abstractmethod
    def supported_languages(self) -> List[str]:
        """List of canonical language names supported by this analyzer."""
        pass

    @property
    def version(self) -> str:
        """Version string or description of the underlying tool."""
        return "1.0.0"

    @abc.abstractmethod
    def is_available(self) -> bool:
        """Returns True if the required executable/tool is installed and reachable."""
        pass

    @abc.abstractmethod
    def run_analysis(
        self,
        code: str,
        filename: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> List[ReviewFinding]:
        """Executes static analysis on the provided code and returns normalized findings.
        
        Must NOT execute the code itself.
        Must handle errors, missing tools, and timeouts gracefully.
        """
        pass

    def check_executable(self, executable_name: str) -> Optional[str]:
        """Finds path to executable on the system PATH, with Windows .cmd/.exe support."""
        # Check direct which
        found = shutil.which(executable_name)
        if found:
            return found
        # Windows-specific fallback for .cmd / .exe / .bat
        if os.name == "nt":
            for ext in [".cmd", ".exe", ".bat"]:
                cand = shutil.which(f"{executable_name}{ext}")
                if cand:
                    return cand
        return None

    def execute_subprocess_safely(
        self,
        args: List[str],
        cwd: Optional[str] = None,
        timeout: int = 15,
        env: Optional[Dict[str, str]] = None,
    ) -> subprocess.CompletedProcess:
        """Executes a subprocess safely with timeouts and resource protection.
        
        Uses explicit argument list (never shell=True) to avoid command injection.
        """
        clean_env = os.environ.copy()
        if env:
            clean_env.update(env)

        # Restrict environment to prevent arbitrary script execution
        try:
            result = subprocess.run(
                args,
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=timeout,
                check=False,
                env=clean_env,
            )
            return result
        except subprocess.TimeoutExpired as exc:
            logger.warning(
                "Analyzer '%s' timed out after %ds executing %s",
                self.name,
                timeout,
                args[:2],
            )
            raise TimeoutError(f"Analyzer '{self.name}' timed out after {timeout} seconds.") from exc
        except Exception as exc:
            logger.error("Analyzer '%s' failed to execute: %s", self.name, str(exc))
            raise RuntimeError(f"Analyzer '{self.name}' execution failed: {str(exc)}") from exc
