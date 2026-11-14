"""Centralized static analyzer registry and execution router."""
import logging
from typing import Any, Dict, List, Optional, Tuple

from app.analyzers.base import BaseAnalyzer
from app.analyzers.cpp.analyzer import CppcheckAnalyzer
from app.analyzers.java.analyzer import CheckstyleJavaAnalyzer
from app.analyzers.javascript.analyzer import ESLintJavaScriptAnalyzer
from app.analyzers.python.analyzer import BanditAnalyzer, PythonCompositeAnalyzer, RuffAnalyzer
from app.analyzers.typescript.analyzer import ESLintTypeScriptAnalyzer
from app.models.review_models import ReviewFinding

logger = logging.getLogger(__name__)


class AnalyzerRegistry:
    """Registry managing available static code analyzers across programming languages."""

    def __init__(self) -> None:
        self._analyzers: Dict[str, List[BaseAnalyzer]] = {}
        self._all_analyzers: List[BaseAnalyzer] = []
        self._register_default_analyzers()

    def _register_default_analyzers(self) -> None:
        # Python analyzers
        self.register_analyzer(RuffAnalyzer())
        self.register_analyzer(BanditAnalyzer())

        # JavaScript & TypeScript
        self.register_analyzer(ESLintJavaScriptAnalyzer())
        self.register_analyzer(ESLintTypeScriptAnalyzer())

        # Java & C/C++
        self.register_analyzer(CheckstyleJavaAnalyzer())
        self.register_analyzer(CppcheckAnalyzer())

    def register_analyzer(self, analyzer: BaseAnalyzer) -> None:
        """Registers a static analyzer for its supported languages."""
        self._all_analyzers.append(analyzer)
        for lang in analyzer.supported_languages:
            canonical_lang = lang.lower().strip()
            if canonical_lang not in self._analyzers:
                self._analyzers[canonical_lang] = []
            self._analyzers[canonical_lang].append(analyzer)

    def get_analyzers_for_language(self, language: str) -> List[BaseAnalyzer]:
        """Returns all registered analyzers matching the canonical language."""
        return self._analyzers.get(language.lower().strip(), [])

    def get_available_tools_status(self) -> Dict[str, Dict[str, Any]]:
        """Returns availability status for all known analyzers."""
        status = {}
        for analyzer in self._all_analyzers:
            status[analyzer.name] = {
                "name": analyzer.name,
                "supported_languages": analyzer.supported_languages,
                "available": analyzer.is_available(),
                "version": analyzer.version,
            }
        return status

    def run_analysis_for_language(
        self,
        code: str,
        language: str,
        filename: str,
        options: Optional[Dict[str, Any]] = None,
    ) -> Tuple[List[ReviewFinding], List[str], Dict[str, str]]:
        """Executes all available static analyzers for the given language.
        
        Returns:
            Tuple of (findings_list, executed_analyzers_list, analyzer_errors_dict)
        """
        analyzers = self.get_analyzers_for_language(language)
        findings: List[ReviewFinding] = []
        executed: List[str] = []
        errors: Dict[str, str] = {}

        if not analyzers:
            logger.info("No static analyzers registered for language '%s'.", language)
            return findings, executed, errors

        for analyzer in analyzers:
            if not analyzer.is_available():
                logger.debug("Analyzer '%s' is not available on this system.", analyzer.name)
                continue

            try:
                analyzer_findings = analyzer.run_analysis(code, filename, options)
                findings.extend(analyzer_findings)
                executed.append(analyzer.name)
                logger.info(
                    "Analyzer '%s' executed successfully: %d findings.",
                    analyzer.name,
                    len(analyzer_findings),
                )
            except TimeoutError as exc:
                logger.warning("Analyzer '%s' timed out: %s", analyzer.name, exc)
                errors[analyzer.name] = "Execution timed out."
            except Exception as exc:
                logger.warning("Analyzer '%s' reported error: %s", analyzer.name, exc)
                errors[analyzer.name] = f"Execution error: {str(exc)}"

        return findings, executed, errors


# Global singleton instance
_registry_instance: Optional[AnalyzerRegistry] = None


def get_analyzer_registry() -> AnalyzerRegistry:
    """Returns the singleton AnalyzerRegistry instance."""
    global _registry_instance
    if _registry_instance is None:
        _registry_instance = AnalyzerRegistry()
    return _registry_instance
