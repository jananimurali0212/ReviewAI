"""Programming Language Detection Service.

Implements multi-strategy language detection:
1. File extension mapping (primary when filename is available)
2. Shebang line identification (#!/usr/bin/env python, etc.)
3. Weighted heuristic pattern and keyword analysis for 21 supported languages
4. Ambiguity analysis and confidence thresholding:
   - Does NOT guess when confidence is low or syntax is ambiguous
   - Explicitly flags uncertain code for manual selection
"""
import os
import re
from typing import Dict, List, Optional, Tuple

try:
    from pygments.lexers import guess_lexer
    PYGMENTS_AVAILABLE = True
except ImportError:
    PYGMENTS_AVAILABLE = False

from ..config.settings import settings
from ..models.code_models import LanguageCandidate, LanguageDetectResponse
from .language_registry import (
    get_language,
    get_languages_by_extension,
    all_languages,
    LanguageDefinition
)


# Shebang patterns mapped to language id
SHEBANG_PATTERNS = [
    (re.compile(r"^#!\s*/usr/bin/env\s+python(3)?\b"), "python"),
    (re.compile(r"^#!\s*/usr/bin/python(3)?\b"), "python"),
    (re.compile(r"^#!\s*/usr/bin/env\s+node\b"), "javascript"),
    (re.compile(r"^#!\s*/usr/bin/node\b"), "javascript"),
    (re.compile(r"^#!\s*/usr/bin/env\s+ruby\b"), "ruby"),
    (re.compile(r"^#!\s*/usr/bin/ruby\b"), "ruby"),
    (re.compile(r"^#!\s*/usr/bin/env\s+perl\b"), "perl"),
    (re.compile(r"^#!\s*/usr/bin/perl\b"), "perl"),
    (re.compile(r"^#!\s*/usr/bin/env\s+php\b"), "php"),
    (re.compile(r"^#!\s*/usr/bin/php\b"), "php"),
    (re.compile(r"^#!\s*/usr/bin/env\s+lua\b"), "lua"),
]


# Weighted regex signatures per language
LANGUAGE_PATTERNS: Dict[str, List[Tuple[re.Pattern, float]]] = {
    "python": [
        (re.compile(r"^\s*def\s+[a-zA-Z_]\w*\s*\(.*?\)(\s*->\s*[^:]+)?\s*:", re.MULTILINE), 4.5),
        (re.compile(r"^\s*class\s+[a-zA-Z_]\w*(\s*\(.*\))?\s*:", re.MULTILINE), 4.0),
        (re.compile(r"^\s*(from\s+[a-zA-Z_]\w*\s+import|import\s+[a-zA-Z_]\w*)", re.MULTILINE), 3.5),
        (re.compile(r"if\s+__name__\s*==\s*['\"]__main__['\"]:", re.MULTILINE), 5.0),
        (re.compile(r"^\s*(if|elif|for|while|with|try|except|finally)\s+[^:({]+:", re.MULTILINE), 3.0),
        (re.compile(r"^\s*elif\s+.*:", re.MULTILINE), 3.5),
        (re.compile(r"\b(self\.[a-zA-Z_]\w*|__init__)\b"), 3.0),
        (re.compile(r"\b(None|True|False)\b"), 1.5),
        (re.compile(r"\bprint\s*\(.*?\)", re.MULTILINE), 2.0),
        (re.compile(r"^\s*#[^!].*$", re.MULTILINE), 0.5),
    ],
    "html": [
        (re.compile(r"<!DOCTYPE\s+html", re.IGNORECASE), 6.0),
        (re.compile(r"<html[\s>]|<head[\s>]|<body[\s>]", re.IGNORECASE), 5.0),
        (re.compile(r"</(html|head|body|div|p|span|a|ul|li|table|h[1-6])>", re.IGNORECASE), 4.0),
        (re.compile(r"<(div|span|p|a|input|button|form|header|footer|nav|section)\b", re.IGNORECASE), 3.0),
        (re.compile(r"<meta\s+|<link\s+rel=|<script\b", re.IGNORECASE), 2.5),
    ],
    "css": [
        (re.compile(r"@media\s+[^{]+\{"), 4.5),
        (re.compile(r"@keyframes\s+[^{]+\{"), 4.0),
        (re.compile(r"(margin|padding|background|color|display|font-size|border|border-radius)\s*:\s*[^;{}]+;"), 4.0),
        (re.compile(r"[.#][a-zA-Z0-9_-]+\s*\{[\s\S]*?\}"), 3.5),
        (re.compile(r"\b(px|rem|em|vh|vw|calc)\b"), 1.5),
    ],
    "sql": [
        (re.compile(r"\bSELECT\s+[\s\S]+?\bFROM\b", re.IGNORECASE), 5.5),
        (re.compile(r"\b(INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM)\b", re.IGNORECASE), 5.0),
        (re.compile(r"\bCREATE\s+(TABLE|VIEW|INDEX|DATABASE|TRIGGER)\b", re.IGNORECASE), 5.0),
        (re.compile(r"\b(GROUP\s+BY|ORDER\s+BY|HAVING|INNER\s+JOIN|LEFT\s+JOIN|RIGHT\s+JOIN)\b", re.IGNORECASE), 4.0),
        (re.compile(r"\b(WHERE|LIMIT|OFFSET|UNION\s+ALL|DISTINCT)\b", re.IGNORECASE), 2.5),
        (re.compile(r"\b(VARCHAR|INTEGER|PRIMARY\s+KEY|FOREIGN\s+KEY|NOT\s+NULL)\b", re.IGNORECASE), 3.0),
    ],
    "rust": [
        (re.compile(r"\bfn\s+[a-zA-Z_]\w*\s*\(.*?\)(\s*->\s*[^{]+)?\s*\{"), 5.0),
        (re.compile(r"\b(pub\s+struct|pub\s+enum|pub\s+fn|pub\s+trait)\b"), 5.0),
        (re.compile(r"\bimpl(\s+<.*?>)?\s+[a-zA-Z_]\w*"), 4.5),
        (re.compile(r"\b(let\s+mut\s+|println!\s*\(|eprintln!\s*\()"), 4.5),
        (re.compile(r"\buse\s+std::"), 4.0),
        (re.compile(r"\bmatch\s+[a-zA-Z_]\w*\s*\{"), 3.5),
        (re.compile(r"\b(Some\(|None|Ok\(|Err\()\b"), 2.0),
    ],
    "go": [
        (re.compile(r"^package\s+[a-zA-Z_]\w*", re.MULTILINE), 5.5),
        (re.compile(r"\bfunc\s+(\([a-zA-Z_]\w*\s+\*?[a-zA-Z_]\w*\)\s+)?[a-zA-Z_]\w*\s*\(.*?\)\s*(\([^\)]+\)|[a-zA-Z0-9_*]+)?\s*\{"), 5.0),
        (re.compile(r"^\s*import\s*\(\s*\"[a-zA-Z0-9_/.]+\"", re.MULTILINE), 4.5),
        (re.compile(r"\bfmt\.(Println|Printf|Sprintf)\b"), 4.0),
        (re.compile(r":="), 2.5),
        (re.compile(r"\b(go\s+func|chan\s+[a-zA-Z_]\w*|make\(chan\b)"), 4.0),
        (re.compile(r"\bif\s+err\s*!=\s*nil\s*\{"), 4.5),
    ],
    "php": [
        (re.compile(r"<\?php\b"), 6.5),
        (re.compile(r"\$(this|GLOBALS|_GET|_POST|_SERVER|request)\b"), 4.0),
        (re.compile(r"\$[a-zA-Z_]\w*\s*="), 3.0),
        (re.compile(r"\becho\s+['\"$]"), 3.5),
        (re.compile(r"\bfunction\s+[a-zA-Z_]\w*\s*\(.*?\)\s*\{"), 2.5),
        (re.compile(r"\bnamespace\s+[a-zA-Z0-9_\\]+;"), 3.0),
    ],
    "ruby": [
        (re.compile(r"^\s*def\s+[a-zA-Z_]\w*(\s*\(.*?\))?\s*$", re.MULTILINE), 4.0),
        (re.compile(r"\b(attr_reader|attr_accessor|attr_writer)\b"), 5.0),
        (re.compile(r"^\s*puts\s+[\"']", re.MULTILINE), 3.5),
        (re.compile(r"^\s*class\s+[A-Z]\w*(\s*<\s*[A-Z]\w*)?\s*$", re.MULTILINE), 3.5),
        (re.compile(r"^\s*end\s*$", re.MULTILINE), 2.5),
        (re.compile(r"^\s*require\s+['\"][a-zA-Z0-9_/-]+['\"]", re.MULTILINE), 3.0),
    ],
    "csharp": [
        (re.compile(r"\busing\s+System(\.[a-zA-Z0-9_]+)*;"), 5.5),
        (re.compile(r"\bnamespace\s+[a-zA-Z0-9_.]+[\s\n]*\{"), 4.5),
        (re.compile(r"\bConsole\.(WriteLine|Write)\b"), 4.5),
        (re.compile(r"\b(public\s+record|get;\s*set;|async\s+Task<)"), 4.5),
        (re.compile(r"\bstring\[\]\s+args\b"), 3.0),
        (re.compile(r"\b(var\s+[a-zA-Z_]\w*\s*=\s*new\s+[A-Z]|\[ApiController\])"), 3.5),
    ],
    "java": [
        (re.compile(r"\bpublic\s+static\s+void\s+main\s*\(\s*String\s*(\[\s*\]|\.\.\.)"), 6.0),
        (re.compile(r"\bSystem\.(out|err)\.(println|print|printf)\b"), 5.0),
        (re.compile(r"^\s*import\s+java\.[a-zA-Z0-9_.*]+;", re.MULTILINE), 5.0),
        (re.compile(r"\bpublic\s+class\s+[A-Z]\w*"), 4.0),
        (re.compile(r"^\s*package\s+[a-zA-Z0-9_.]+;", re.MULTILINE), 3.0),
        (re.compile(r"@Override\b"), 2.5),
    ],
    "cpp": [
        (re.compile(r"#include\s*<(iostream|vector|string|memory|algorithm|map|set|thread)>"), 5.5),
        (re.compile(r"\bstd::(cout|cin|endl|vector|string|make_shared|unique_ptr)\b"), 5.0),
        (re.compile(r"\btemplate\s*<\s*(typename|class)\s+[a-zA-Z_]\w*>"), 4.5),
        (re.compile(r"\bclass\s+[a-zA-Z_]\w*[\s\S]*?public:\b"), 4.0),
        (re.compile(r"\bnamespace\s+[a-zA-Z_]\w*\s*\{"), 3.5),
    ],
    "c": [
        (re.compile(r"#include\s*<(stdio\.h|stdlib\.h|string\.h|unistd\.h|fcntl\.h)>"), 5.5),
        (re.compile(r"\b(printf|scanf|malloc|free|memcpy|memset)\s*\("), 4.5),
        (re.compile(r"\bint\s+main\s*\(\s*(void|int\s+argc\s*,\s*char\s*\*(\*|\s*)argv\[?\]?)\s*\)"), 4.5),
        (re.compile(r"\bstruct\s+[a-zA-Z_]\w*\s*\{"), 2.5),
    ],
    "typescript": [
        (re.compile(r"\b(interface\s+[A-Z]\w*\s*\{|type\s+[A-Z]\w*\s*=|export\s+type\b)"), 5.0),
        (re.compile(r":\s*(string|number|boolean|any|unknown|void|never|Record<|Promise<)"), 4.5),
        (re.compile(r"\bas\s+const\b"), 3.5),
        (re.compile(r"\bimport\s+type\b"), 4.0),
        (re.compile(r"\benum\s+[A-Z]\w*\s*\{"), 3.5),
    ],
    "javascript": [
        (re.compile(r"\bconsole\.(log|error|warn|info)\b"), 3.0),
        (re.compile(r"\b(const|let|var)\s+[a-zA-Z_$]\w*\s*="), 2.5),
        (re.compile(r"\b(export\s+default|export\s+const|module\.exports\s*=)"), 3.5),
        (re.compile(r"\brequire\s*\(['\"][a-zA-Z0-9_@/.-]+['\"]\)", re.MULTILINE), 3.5),
        (re.compile(r"\bdocument\.(getElementById|querySelector|addEventListener)\b"), 4.0),
    ],
    "kotlin": [
        (re.compile(r"\bfun\s+[a-zA-Z_]\w*\s*\(.*?\)(\s*:\s*[a-zA-Z0-9_<>]+)?\s*\{"), 5.0),
        (re.compile(r"\b(val|var)\s+[a-zA-Z_]\w*\s*:\s*[A-Z]"), 4.0),
        (re.compile(r"\bdata\s+class\s+[A-Z]\w*"), 5.0),
        (re.compile(r"\bprintln\s*\(.*?\)"), 2.0),
        (re.compile(r"^\s*package\s+[a-zA-Z0-9_.]+\s*$", re.MULTILINE), 2.5),
    ],
    "swift": [
        (re.compile(r"\bimport\s+(UIKit|Foundation|SwiftUI)\b"), 5.5),
        (re.compile(r"\b(guard\s+let|if\s+let)\b"), 4.5),
        (re.compile(r"\bfunc\s+[a-zA-Z_]\w*\s*\(.*?\)(\s*->\s*[A-Z][a-zA-Z0-9_<>?]*)?\s*\{"), 4.0),
        (re.compile(r"\b(var|let)\s+[a-zA-Z_]\w*\s*:\s*[A-Z]"), 3.5),
        (re.compile(r"\bextension\s+[A-Z]\w*"), 3.5),
    ],
    "dart": [
        (re.compile(r"\bvoid\s+main\s*\(\s*\)\s*\{"), 4.5),
        (re.compile(r"\bimport\s+['\"]package:(flutter|http)/"), 5.5),
        (re.compile(r"\bWidget\s+build\s*\(\s*BuildContext\b"), 5.5),
        (re.compile(r"\bclass\s+[A-Z]\w*\s+extends\s+(StatelessWidget|StatefulWidget|State<)"), 5.0),
    ],
    "r": [
        (re.compile(r"<-"), 4.0),
        (re.compile(r"\blibrary\s*\([a-zA-Z0-9_.]+\)"), 4.5),
        (re.compile(r"\b(data\.frame|ggplot|read\.csv|summary|head)\s*\("), 3.5),
        (re.compile(r"\bfunction\s*\(.*?\)\s*\{"), 3.0),
    ],
    "scala": [
        (re.compile(r"\bobject\s+[A-Z]\w*(\s+extends\s+App)?"), 5.0),
        (re.compile(r"\bcase\s+class\s+[A-Z]\w*"), 4.5),
        (re.compile(r"\bdef\s+[a-zA-Z_]\w*\s*\(.*?\)\s*:\s*[A-Z]"), 4.5),
        (re.compile(r"\bval\s+[a-zA-Z_]\w*\s*:\s*[A-Z]"), 3.0),
    ],
    "perl": [
        (re.compile(r"\buse\s+(strict|warnings);"), 5.5),
        (re.compile(r"\bmy\s+\$[a-zA-Z_]\w*\s*="), 4.5),
        (re.compile(r"\bsub\s+[a-zA-Z_]\w*\s*\{"), 4.0),
        (re.compile(r"print\s+\"[^\"]*\\n\";"), 2.5),
    ],
    "lua": [
        (re.compile(r"\blocal\s+function\s+[a-zA-Z_]\w*"), 5.0),
        (re.compile(r"\blocal\s+[a-zA-Z_]\w*\s*="), 4.0),
        (re.compile(r"\bfunction\s+[a-zA-Z_]\w*\s*\(.*?\)\s*$"), 3.0),
        (re.compile(r"\bthen\b[\s\S]*?\bend\b"), 3.5),
        (re.compile(r"\bnil\b"), 2.0),
    ],
}


# Mapping pygments lexer names to our 21 canonical language IDs
PYGMENTS_MAPPING = {
    "python": "python",
    "python 3": "python",
    "java": "java",
    "c": "c",
    "c++": "cpp",
    "javascript": "javascript",
    "typescript": "typescript",
    "go": "go",
    "rust": "rust",
    "php": "php",
    "c#": "csharp",
    "ruby": "ruby",
    "kotlin": "kotlin",
    "swift": "swift",
    "dart": "dart",
    "r": "r",
    "scala": "scala",
    "perl": "perl",
    "lua": "lua",
    "html": "html",
    "css": "css",
    "sql": "sql",
}


def _check_shebang(first_line: str) -> Optional[Tuple[str, float]]:
    """Detect language from shebang line (#!) if present."""
    for pattern, lang_id in SHEBANG_PATTERNS:
        if pattern.search(first_line):
            return lang_id, 0.95
    return None


def _disambiguate_c_cpp(code: str) -> Tuple[str, float]:
    """Disambiguates between C and C++ using specific C++ construct markers."""
    cpp_specific = re.search(
        r"(std::|cout|cin|template\s*<|class\s+\w+\s*[{:]|#include\s*<(iostream|vector|string|memory)>|public:|private:|protected:|namespace\s+\w+)",
        code
    )
    if cpp_specific:
        return "cpp", 0.90
    return "c", 0.75


def _disambiguate_js_ts(code: str) -> Tuple[str, float]:
    """Disambiguates between JavaScript and TypeScript using type annotations."""
    ts_specific = re.search(
        r"(interface\s+[A-Z]\w*\s*\{|type\s+[A-Z]\w*\s*=|:\s*(string|number|boolean|any|unknown|void|never|Record<|Promise<)|as\s+const\b|import\s+type\b)",
        code
    )
    if ts_specific:
        return "typescript", 0.90
    return "javascript", 0.80


def detect_language(code: Optional[str] = "", filename: Optional[str] = None) -> LanguageDetectResponse:
    """Core language detection logic.
    
    Returns structured result indicating detected language, confidence,
    reliability, and recommendations.
    """
    clean_code = (code or "").strip()
    
    # -------------------------------------------------------------
    # 1. Extension-based detection (Primary when filename is given)
    # -------------------------------------------------------------
    if filename:
        clean_name = filename.strip()
        _, ext = os.path.splitext(clean_name)
        if ext:
            matching_langs = get_languages_by_extension(ext)
            if len(matching_langs) == 1:
                lang = matching_langs[0]
                return LanguageDetectResponse(
                    detected_language=lang.id,
                    language_name=lang.name,
                    confidence=0.98,
                    is_reliable=True,
                    requires_manual_selection=False,
                    detection_source="extension",
                    alternatives=[],
                    message=f"Language '{lang.name}' detected with high confidence from file extension '{ext}'."
                )
            elif len(matching_langs) > 1:
                # Extension shared by multiple languages (e.g. .h shared by C and C++)
                if ext.lower() == ".h":
                    chosen_id, conf = _disambiguate_c_cpp(clean_code) if clean_code else ("c", 0.60)
                    chosen_lang = get_language(chosen_id)
                    alt_id = "cpp" if chosen_id == "c" else "c"
                    alt_lang = get_language(alt_id)
                    is_rel = conf >= settings.DETECTION_CONFIDENCE_THRESHOLD
                    return LanguageDetectResponse(
                        detected_language=chosen_id if is_rel else None,
                        language_name=chosen_lang.name if is_rel and chosen_lang else None,
                        confidence=conf,
                        is_reliable=is_rel,
                        requires_manual_selection=not is_rel,
                        detection_source="extension_content_hybrid",
                        alternatives=[
                            LanguageCandidate(language=chosen_id, name=chosen_lang.name, confidence=conf) if chosen_lang else None,
                            LanguageCandidate(language=alt_id, name=alt_lang.name, confidence=1.0 - conf) if alt_lang else None,
                        ],
                        message=f"Header extension '{ext}' could be C or C++. {'Classified as ' + chosen_lang.name if is_rel else 'Please select manually.'}"
                    )

    # -------------------------------------------------------------
    # If code is empty, return uncertain
    # -------------------------------------------------------------
    if not clean_code:
        return LanguageDetectResponse(
            detected_language=None,
            language_name=None,
            confidence=0.0,
            is_reliable=False,
            requires_manual_selection=True,
            detection_source="none",
            alternatives=[],
            message="No code content provided. Please enter or paste code, or select a language."
        )

    # -------------------------------------------------------------
    # 2. Shebang line check (High confidence)
    # -------------------------------------------------------------
    first_line = clean_code.split("\n", 1)[0].strip()
    shebang_match = _check_shebang(first_line)
    if shebang_match:
        lang_id, conf = shebang_match
        lang = get_language(lang_id)
        if lang:
            return LanguageDetectResponse(
                detected_language=lang.id,
                language_name=lang.name,
                confidence=conf,
                is_reliable=True,
                requires_manual_selection=False,
                detection_source="shebang",
                alternatives=[],
                message=f"Detected '{lang.name}' from shebang line."
            )

    # -------------------------------------------------------------
    # 3. Heuristic pattern & keyword analysis
    # -------------------------------------------------------------
    scores: Dict[str, float] = {lang.id: 0.0 for lang in all_languages()}
    
    for lang_id, patterns in LANGUAGE_PATTERNS.items():
        for pattern, weight in patterns:
            matches = pattern.findall(clean_code)
            if matches:
                # Diminishing returns for repeated matches to avoid runaway weights
                count = min(len(matches), 4)
                scores[lang_id] += weight * (1.0 + 0.25 * (count - 1))

    # -------------------------------------------------------------
    # 4. Pygments lexer as an advisory signal
    # -------------------------------------------------------------
    if PYGMENTS_AVAILABLE and len(clean_code) > 20:
        try:
            lexer = guess_lexer(clean_code)
            lexer_name = lexer.name.lower()
            mapped_id = PYGMENTS_MAPPING.get(lexer_name)
            if mapped_id and mapped_id in scores:
                scores[mapped_id] += 2.0
        except Exception:
            pass

    # Sort candidates by score
    sorted_candidates = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    top_id, top_score = sorted_candidates[0]
    second_id, second_score = sorted_candidates[1] if len(sorted_candidates) > 1 else ("", 0.0)

    # Build alternatives list of top 3 candidates that scored > 0
    alternatives: List[LanguageCandidate] = []
    for cid, cscore in sorted_candidates[:4]:
        if cscore > 0:
            clang = get_language(cid)
            if clang:
                # normalize score relative to top score
                rel_conf = round(min(cscore / (top_score + 1e-5), 1.0), 2)
                alternatives.append(LanguageCandidate(language=cid, name=clang.name, confidence=rel_conf))

    # -------------------------------------------------------------
    # 5. Ambiguity and Confidence Evaluation
    # -------------------------------------------------------------
    # If the top score is very low (e.g. < 2.5) or code is trivial/ambiguous (e.g. "x = 1" or "a + b")
    if top_score < 2.5:
        return LanguageDetectResponse(
            detected_language=None,
            language_name=None,
            confidence=0.20,
            is_reliable=False,
            requires_manual_selection=True,
            detection_source="content",
            alternatives=alternatives[:3],
            message="Code syntax is too short or ambiguous for confident detection. Please select your language manually."
        )

    # Handle very close ambiguous pairings (e.g. JS vs TS, C vs C++, Java vs C#)
    if top_id in ("javascript", "typescript") and second_id in ("javascript", "typescript"):
        chosen_id, conf = _disambiguate_js_ts(clean_code)
        chosen_lang = get_language(chosen_id)
        is_rel = conf >= settings.DETECTION_CONFIDENCE_THRESHOLD
        return LanguageDetectResponse(
            detected_language=chosen_id if is_rel else None,
            language_name=chosen_lang.name if is_rel and chosen_lang else None,
            confidence=conf,
            is_reliable=is_rel,
            requires_manual_selection=not is_rel,
            detection_source="content",
            alternatives=alternatives[:3],
            message=f"Pasted code resembles {chosen_lang.name}."
        )

    if top_id in ("c", "cpp") and second_id in ("c", "cpp"):
        chosen_id, conf = _disambiguate_c_cpp(clean_code)
        chosen_lang = get_language(chosen_id)
        is_rel = conf >= settings.DETECTION_CONFIDENCE_THRESHOLD
        return LanguageDetectResponse(
            detected_language=chosen_id if is_rel else None,
            language_name=chosen_lang.name if is_rel and chosen_lang else None,
            confidence=conf,
            is_reliable=is_rel,
            requires_manual_selection=not is_rel,
            detection_source="content",
            alternatives=alternatives[:3],
            message=f"Pasted code resembles {chosen_lang.name}."
        )

    # Check margin between top 2 candidates
    margin = (top_score - second_score) / (top_score + 1e-5)
    
    # Calculate confidence: require strong distinct markers (score >= 4.0) to achieve reliability
    if top_score >= 4.0:
        base_confidence = min(0.60 + (top_score / 12.0) * 0.35, 0.95)
    else:
        base_confidence = min(0.35 + (top_score / 8.0) * 0.25, 0.55)

    if margin < 0.25 and second_score > 3.0:
        # Ambiguous between two unrelated languages
        confidence = round(base_confidence * 0.60, 2)
        top_lang = get_language(top_id)
        second_lang = get_language(second_id)
        return LanguageDetectResponse(
            detected_language=None,
            language_name=None,
            confidence=confidence,
            is_reliable=False,
            requires_manual_selection=True,
            detection_source="content",
            alternatives=alternatives[:3],
            message=f"Syntax appears ambiguous between {top_lang.name if top_lang else top_id} and {second_lang.name if second_lang else second_id}. Please confirm manually."
        )

    confidence = round(base_confidence, 2)
    is_reliable = confidence >= settings.DETECTION_CONFIDENCE_THRESHOLD
    top_lang = get_language(top_id)

    return LanguageDetectResponse(
        detected_language=top_id if is_reliable else None,
        language_name=top_lang.name if is_reliable and top_lang else None,
        confidence=confidence,
        is_reliable=is_reliable,
        requires_manual_selection=not is_reliable,
        detection_source="content",
        alternatives=alternatives[:3],
        message=f"Detected '{top_lang.name if top_lang else top_id}' with {int(confidence*100)}% confidence." if is_reliable
                else f"Possible match '{top_lang.name if top_lang else top_id}', but confidence is low. Please select manually."
    )
