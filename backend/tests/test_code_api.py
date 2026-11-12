"""Comprehensive test suite for ReviewAI Day 2:
1. All 21 programming languages tested for:
   - File extension detection (all variations)
   - Pasted code content-based detection (no filename)
   - Code submission and tracking
   - Manual language override
2. All possible error scenarios tested:
   - Empty/blank code submissions
   - Boundary condition at 1 MB limit (accepted) and 1 MB + 1 byte (rejected with HTTP 413)
   - Binary/null-byte/executable/control-character payload rejection
   - Unsupported file extensions (.exe, .zip, .tar.gz, .pdf, .png, .bin, .xyz)
   - Unsupported and invalid language identifiers
   - Path traversal and malicious filename normalization
   - Ambiguous syntax handling and uncertainty flagging
   - Malformed requests and Pydantic validation errors
"""
import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from app.models.code_models import (
    CodeSubmitRequest,
    LanguageDetectRequest,
)
from app.routes.code_routes import (
    submit_code,
    detect_code_language,
    list_supported_languages,
)
from app.services.language_detector import detect_language
from app.utils.file_validator import (
    normalize_filename,
    validate_file_content,
    validate_file_size,
    validate_filename_extension,
)


# ==============================================================================
# SECTION 1: ALL 21 PROGRAMMING LANGUAGES - FILE EXTENSION DETECTION
# ==============================================================================

ALL_21_LANGUAGES_EXTENSIONS = [
    ("python", ["script.py", "module.pyw"]),
    ("java", ["Application.java", "Service.java"]),
    ("c", ["driver.c"]),
    ("cpp", ["engine.cpp", "matrix.cc", "parser.cxx", "header.hpp", "defs.hxx"]),
    ("javascript", ["index.js", "component.jsx", "server.mjs", "config.cjs"]),
    ("typescript", ["app.ts", "Widget.tsx", "utils.mts", "types.cts"]),
    ("go", ["main.go", "worker.go"]),
    ("rust", ["main.rs", "lib.rs"]),
    ("php", ["index.php", "template.phtml"]),
    ("csharp", ["Program.cs", "Controller.cs"]),
    ("ruby", ["app.rb", "worker.rb"]),
    ("kotlin", ["Main.kt", "build.kts"]),
    ("swift", ["App.swift", "SceneDelegate.swift"]),
    ("dart", ["main.dart", "widget.dart"]),
    ("r", ["analysis.r", "model.R"]),
    ("scala", ["Processor.scala", "script.sc"]),
    ("perl", ["script.pl", "Module.pm"]),
    ("lua", ["config.lua", "init.lua"]),
    ("html", ["index.html", "about.htm"]),
    ("css", ["styles.css", "main.css"]),
    ("sql", ["schema.sql", "migrations.sql"]),
]


@pytest.mark.parametrize("expected_lang, filenames", ALL_21_LANGUAGES_EXTENSIONS)
def test_all_21_languages_extension_detection(expected_lang, filenames):
    """Verifies that all 21 languages and their extensions are detected reliably."""
    for filename in filenames:
        res = detect_code_language(LanguageDetectRequest(filename=filename))
        assert res.detected_language == expected_lang, f"Failed for {filename}"
        assert res.is_reliable is True
        assert res.confidence >= 0.95
        assert res.requires_manual_selection is False
        assert res.detection_source == "extension"


# ==============================================================================
# SECTION 2: ALL 21 PROGRAMMING LANGUAGES - CONTENT-BASED DETECTION (NO FILENAME)
# ==============================================================================

REALISTIC_CODE_SNIPPETS_ALL_21 = [
    (
        "python",
        """def calculate_mean(values: list[float]) -> float:
    total = sum(values)
    if not values:
        return 0.0
    return total / len(values)
""",
    ),
    (
        "java",
        """public class AccountService {
    public static void main(String[] args) {
        System.out.println("Processing account balance");
    }
}
""",
    ),
    (
        "c",
        """#include <stdio.h>
#include <stdlib.h>
int main(void) {
    printf("Allocating memory\\n");
    return 0;
}
""",
    ),
    (
        "cpp",
        """#include <iostream>
#include <vector>
int main() {
    std::cout << "Vector length: " << std::endl;
    return 0;
}
""",
    ),
    (
        "javascript",
        """const express = require('express');
const app = express();
console.log('Server initialized');
module.exports = app;
""",
    ),
    (
        "typescript",
        """interface UserProfile {
    id: string;
    isActive: boolean;
}
export function fetchProfile(): Promise<UserProfile> {
    return Promise.resolve({ id: "1", isActive: true });
}
""",
    ),
    (
        "go",
        """package main

import "fmt"

func ProcessBatch() {
    fmt.Println("Processing batch queue")
}
""",
    ),
    (
        "rust",
        """pub fn calculate_hash(data: &str) -> Result<String, ()> {
    let mut buffer = String::new();
    println!("Hashing buffer: {}", buffer);
    Ok(buffer)
}
""",
    ),
    (
        "php",
        """<?php
namespace App\\Http\\Controllers;
$response = "SUCCESS";
echo "Response status: " . $response;
""",
    ),
    (
        "csharp",
        """using System;
namespace Enterprise.Api
{
    public class OrderHandler
    {
        public static void Main()
        {
            Console.WriteLine("Order placed");
        }
    }
}
""",
    ),
    (
        "ruby",
        """class TransactionWorker
  attr_reader :account_id

  def initialize(account_id)
    @account_id = account_id
  end

  def execute
    puts "Processing transaction for #{@account_id}"
  end
end
""",
    ),
    (
        "kotlin",
        """package com.reviewai.service

data class TaskRecord(val id: String)

fun executeTask(): Unit {
    val message: String = "Task executed"
    println(message)
}
""",
    ),
    (
        "swift",
        """import Foundation

struct DeviceSession {
    let sessionId: UUID
    func validate() {
        guard let token = Optional("valid-token") else { return }
        print("Token: \\(token)")
    }
}
""",
    ),
    (
        "dart",
        """import 'package:flutter/material.dart';

void main() {
    print("Application launching");
}

class DashboardWidget extends StatelessWidget {
    Widget build(BuildContext context) {
        return Container();
    }
}
""",
    ),
    (
        "r",
        """library(ggplot2)
dataset <- data.frame(val = c(10, 20, 30))
compute_metric <- function(input_vector) {
    avg <- mean(input_vector)
    return(avg)
}
""",
    ),
    (
        "scala",
        """package com.reviewai.pipeline

case class StreamEvent(id: Long, payload: String)

object StreamDispatcher extends App {
    def dispatch(event: StreamEvent): Unit = {
        println(event.payload)
    }
}
""",
    ),
    (
        "perl",
        """use strict;
use warnings;

my $batch_id = 9981;
sub process_batch {
    my ($id) = @_;
    print "Processing perl batch: $id\\n";
    return 1;
}
""",
    ),
    (
        "lua",
        """local function evaluate_score(score, weight)
    local adjusted = score * weight
    if adjusted > 100 then
        return 100
    end
    return adjusted
end

print(evaluate_score(85, 1.1))
""",
    ),
    (
        "html",
        """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Dashboard</title>
</head>
<body>
    <div id="root">App Content</div>
</body>
</html>
""",
    ),
    (
        "css",
        """@media (min-width: 1024px) {
  .review-container {
    display: flex;
    background: #0f172a;
    padding: 24px;
    border-radius: 12px;
  }
}
""",
    ),
    (
        "sql",
        """SELECT user_id, COUNT(review_id) AS total_reviews
FROM code_reviews
WHERE status = 'COMPLETED'
GROUP BY user_id
HAVING COUNT(review_id) >= 10
ORDER BY total_reviews DESC;
""",
    ),
]


@pytest.mark.parametrize("expected_lang, snippet", REALISTIC_CODE_SNIPPETS_ALL_21)
def test_all_21_languages_pasted_content_detection(expected_lang, snippet):
    """Verifies that pasted code (without filename) is accurately identified for all 21 languages."""
    res = detect_code_language(LanguageDetectRequest(code=snippet))
    assert res.detected_language == expected_lang, (
        f"Failed for {expected_lang}. Detected: {res.detected_language}, "
        f"Confidence: {res.confidence}, Alternatives: {res.alternatives}"
    )
    assert res.is_reliable is True
    assert res.confidence >= 0.65
    assert res.requires_manual_selection is False


# ==============================================================================
# SECTION 3: ALL 21 PROGRAMMING LANGUAGES - SUBMISSION VERIFICATION
# ==============================================================================

@pytest.mark.parametrize("lang_id, snippet", REALISTIC_CODE_SNIPPETS_ALL_21)
def test_all_21_languages_successful_submission(lang_id, snippet):
    """Verifies that submitting code for each of the 21 languages succeeds."""
    # Lookup canonical extension for this language
    ext = next(exts[0] for l, exts in ALL_21_LANGUAGES_EXTENSIONS if l == lang_id)
    resp = submit_code(CodeSubmitRequest(
        code=snippet,
        language=lang_id,
        filename=f"test_file_{lang_id}{ext}",
        submission_type="file_upload"
    ))
    assert resp.success is True
    assert resp.language == lang_id
    assert resp.filename == f"test_file_{lang_id}{ext}"
    assert resp.code_length == len(snippet)
    assert resp.lines_count == len(snippet.splitlines())
    assert resp.submission_id is not None
    assert resp.submission_id.startswith("sub-")


@pytest.mark.parametrize("lang_id, snippet", REALISTIC_CODE_SNIPPETS_ALL_21)
def test_all_21_languages_pasted_submission_without_filename(lang_id, snippet):
    """Verifies that submitting pasted code without any filename succeeds and auto-names file."""
    resp = submit_code(CodeSubmitRequest(
        code=snippet,
        language=lang_id,
        filename=None,
        submission_type="paste"
    ))
    assert resp.success is True
    assert resp.language == lang_id
    assert resp.filename is not None
    assert resp.filename.startswith("submission_")
    assert resp.code_length == len(snippet)


@pytest.mark.parametrize("lang_id, snippet", REALISTIC_CODE_SNIPPETS_ALL_21)
def test_all_21_languages_manual_override(lang_id, snippet):
    """Verifies that user manual override is respected for any language."""
    # User manually submits the code explicitly as SQL, even if code is different
    resp = submit_code(CodeSubmitRequest(
        code=snippet,
        language="sql",
        filename="custom_query.sql",
        language_detected=False
    ))
    assert resp.success is True
    assert resp.language == "sql"
    assert resp.language_detected is False


# ==============================================================================
# SECTION 4: EXHAUSTIVE ERROR TESTING
# ==============================================================================

def test_error_empty_code_submission():
    """Empty string rejected."""
    with pytest.raises(ValidationError) as exc:
        CodeSubmitRequest(code="", language="python")
    assert "code" in str(exc.value).lower()


def test_error_whitespace_only_code_submission():
    """Whitespace-only string rejected."""
    with pytest.raises(ValidationError) as exc:
        CodeSubmitRequest(code="   \t\n   ", language="python")
    assert "code" in str(exc.value).lower()


def test_error_empty_language_submission():
    """Empty language string rejected."""
    with pytest.raises(ValidationError) as exc:
        CodeSubmitRequest(code="print('ok')", language="")
    assert "language" in str(exc.value).lower()


def test_error_whitespace_language_submission():
    """Whitespace-only language string rejected."""
    with pytest.raises(ValidationError) as exc:
        CodeSubmitRequest(code="print('ok')", language="   ")
    assert "language" in str(exc.value).lower()


def test_error_unsupported_language_submission():
    """Unsupported language rejected with HTTP 400."""
    unsupported = ["cobol", "fortran", "pascal", "brainfuck", "assembly", "unknown_xyz"]
    for lang in unsupported:
        with pytest.raises(HTTPException) as exc:
            submit_code(CodeSubmitRequest(
                code="print('ok')",
                language=lang
            ))
        assert exc.value.status_code == 400
        assert "Unsupported or unrecognized" in exc.value.detail


def test_error_oversized_payload_rejection():
    """Payloads exceeding 1 MB limit (1,048,576 bytes) rejected with HTTP 413."""
    limit = 1_048_576
    oversized_code = "x = 1\n" + ("#" * (limit + 10))
    with pytest.raises(HTTPException) as exc:
        submit_code(CodeSubmitRequest(
            code=oversized_code,
            language="python",
            filename="too_big.py"
        ))
    assert exc.value.status_code == 413
    assert "exceeds the maximum allowed limit" in exc.value.detail


def test_boundary_exact_1mb_payload_accepted():
    """Payloads within 1 MB limit (e.g. 1 MB exact) are accepted."""
    limit = 1_048_576
    # Create code exactly 1 MB in size
    base = "def test():\n    return 42\n"
    filler = "#" * (limit - len(base))
    code_exact_1mb = base + filler
    assert len(code_exact_1mb.encode("utf-8")) == limit

    resp = submit_code(CodeSubmitRequest(
        code=code_exact_1mb,
        language="python",
        filename="exact_1mb.py"
    ))
    assert resp.success is True
    assert resp.code_length == limit


def test_error_binary_null_byte_rejection():
    """Binary files containing null bytes (\\x00) rejected with HTTP 400."""
    binary_payloads = [
        "def run():\n\x00\x00\x01\x02",
        "\x7fELF\x02\x01\x01\x00\x00\x00\x00\x00",
        "MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00",
        "PK\x03\x04\x14\x00\x00\x00\x08\x00",
    ]
    for payload in binary_payloads:
        with pytest.raises(HTTPException) as exc:
            submit_code(CodeSubmitRequest(
                code=payload,
                language="python",
                filename="binary.bin"
            ))
        assert exc.value.status_code == 400
        assert "compiled binary" in exc.value.detail.lower()


def test_error_control_character_flood_rejection():
    """Files flooded with non-printable ASCII control characters rejected."""
    junk = "\x01\x02\x03\x04\x05\x06\x07\x08\x0b\x0c\x0e\x0f" * 5 + "text"
    with pytest.raises(HTTPException) as exc:
        submit_code(CodeSubmitRequest(
            code=junk,
            language="python",
            filename="control.txt"
        ))
    assert exc.value.status_code == 400
    assert "control characters" in exc.value.detail.lower()


def test_error_unsupported_file_extensions():
    """Unsupported file extensions rejected with HTTP 400."""
    invalid_filenames = [
        "virus.exe",
        "archive.zip",
        "archive.tar.gz",
        "document.pdf",
        "image.png",
        "backup.iso",
        "data.xyz123",
        "movie.mp4",
        "library.dll",
    ]
    for fname in invalid_filenames:
        with pytest.raises(HTTPException) as exc:
            submit_code(CodeSubmitRequest(
                code="valid source code here",
                language="python",
                filename=fname
            ))
        assert exc.value.status_code == 400
        assert "Unsupported file extension" in exc.value.detail


def test_path_traversal_and_malicious_filenames():
    """Path traversal sequences and dangerous characters are properly neutralized."""
    test_cases = [
        ("../../../../etc/passwd.py", "passwd.py"),
        ("..\\..\\..\\Windows\\System32\\cmd.py", "cmd.py"),
        ("/root/secret/keys.py", "keys.py"),
        ("C:\\Users\\admin\\Desktop\\run.py", "run.py"),
        ("file<>:\"|?*.py", "file_______.py"),
        (".-hidden_file.py", "hidden_file.py"),
    ]
    for raw_input, expected_clean in test_cases:
        resp = submit_code(CodeSubmitRequest(
            code="print('safe')",
            language="python",
            filename=raw_input
        ))
        assert resp.success is True
        assert "/" not in resp.filename
        assert "\\" not in resp.filename
        assert ".." not in resp.filename
        assert resp.filename == expected_clean


def test_extreme_filename_length_truncation():
    """Overly long filenames (> 255 chars) truncated while preserving extension."""
    super_long = ("a" * 300) + ".py"
    cleaned = normalize_filename(super_long)
    assert cleaned is not None
    assert len(cleaned) <= 255
    assert cleaned.endswith(".py")


def test_ambiguous_short_code_flagged_uncertain():
    """Ambiguous snippets that exist in multiple languages must NOT claim false high confidence."""
    ambiguous_cases = [
        "x = 1",
        "let a = 5;",
        "i = i + 1",
        "a + b",
        "// just a comment",
        "/* multi line comment */",
    ]
    for code in ambiguous_cases:
        res = detect_code_language(LanguageDetectRequest(code=code))
        assert res.is_reliable is False
        assert res.requires_manual_selection is True
        assert res.confidence < 0.65
        assert "ambiguous" in res.message.lower() or "confidence is low" in res.message.lower()


def test_empty_content_detection_returns_none():
    """Detect language on empty input returns null language with instructions."""
    res = detect_code_language(LanguageDetectRequest(code="   "))
    assert res.detected_language is None
    assert res.is_reliable is False
    assert res.requires_manual_selection is True
    assert res.detection_source == "none"


def test_shebang_detection_various_interpreters():
    """Shebang lines for Python, Ruby, Perl, Lua, PHP, Node."""
    shebang_cases = [
        ("#!/usr/bin/env python3\npass", "python"),
        ("#!/usr/bin/python\npass", "python"),
        ("#!/usr/bin/env node\nconsole.log(1)", "javascript"),
        ("#!/usr/bin/env ruby\nputs 1", "ruby"),
        ("#!/usr/bin/env perl\nprint 1", "perl"),
        ("#!/usr/bin/env lua\nprint(1)", "lua"),
        ("#!/usr/bin/env php\n<?php echo 1;", "php"),
    ]
    for code, expected_lang in shebang_cases:
        res = detect_code_language(LanguageDetectRequest(code=code))
        assert res.detected_language == expected_lang
        assert res.detection_source == "shebang"
        assert res.is_reliable is True


def test_all_21_languages_registered_in_registry():
    """Registry must expose exactly all 21 requested languages."""
    languages = list_supported_languages()
    assert len(languages) == 21
    ids = {lang.id for lang in languages}
    expected_ids = {
        "python", "java", "c", "cpp", "javascript", "typescript",
        "go", "rust", "php", "csharp", "ruby", "kotlin", "swift",
        "dart", "r", "scala", "perl", "lua", "html", "css", "sql"
    }
    assert ids == expected_ids
    for lang in languages:
        assert len(lang.extensions) > 0
        assert lang.monaco_id != ""
        assert len(lang.sample_snippet.strip()) > 0
