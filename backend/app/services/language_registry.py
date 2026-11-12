"""Centralized Language Registry for ReviewAI.

Defines all supported programming languages, their file extensions,
Monaco editor modes, and display metadata.
"""
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set


@dataclass(frozen=True)
class LanguageDefinition:
    id: str
    name: str
    extensions: List[str]
    monaco_id: str
    category: str
    sample_snippet: str
    aliases: List[str] = field(default_factory=list)


# Centralized definitions for all 21 supported languages
LANGUAGE_DEFINITIONS: List[LanguageDefinition] = [
    LanguageDefinition(
        id="python",
        name="Python",
        extensions=[".py", ".pyw"],
        monaco_id="python",
        category="General Purpose / Data Science",
        aliases=["py", "python3"],
        sample_snippet="""def calculate_average_latency(latencies: list[float]) -> float:
    \"\"\"Calculates mean latency in milliseconds.\"\"\"
    if not latencies:
        return 0.0
    return sum(latencies) / len(latencies)
""",
    ),
    LanguageDefinition(
        id="java",
        name="Java",
        extensions=[".java"],
        monaco_id="java",
        category="Enterprise / Backend",
        aliases=["jvm"],
        sample_snippet="""public class SecurityContext {
    private final String userId;

    public SecurityContext(String userId) {
        this.userId = userId;
    }

    public boolean isAuthenticated() {
        return this.userId != null && !this.userId.isBlank();
    }
}
""",
    ),
    LanguageDefinition(
        id="c",
        name="C",
        extensions=[".c", ".h"],
        monaco_id="c",
        category="Systems",
        aliases=["c99", "c11"],
        sample_snippet="""#include <stdio.h>
#include <stdlib.h>

int safe_divide(int numerator, int denominator, int* result) {
    if (denominator == 0) return -1;
    *result = numerator / denominator;
    return 0;
}
""",
    ),
    LanguageDefinition(
        id="cpp",
        name="C++",
        extensions=[".cpp", ".cc", ".cxx", ".hpp", ".hxx"],
        monaco_id="cpp",
        category="Systems / High Performance",
        aliases=["c++", "cplusplus"],
        sample_snippet="""#include <iostream>
#include <vector>
#include <memory>

class ResourcePool {
public:
    void acquire() {
        std::cout << "Resource acquired\\n";
    }
};
""",
    ),
    LanguageDefinition(
        id="javascript",
        name="JavaScript",
        extensions=[".js", ".jsx", ".mjs", ".cjs"],
        monaco_id="javascript",
        category="Web / Full Stack",
        aliases=["js", "node"],
        sample_snippet="""async function fetchUserData(userId) {
    const response = await fetch(`/api/users/${userId}`);
    if (!response.ok) {
        throw new Error('User not found');
    }
    return await response.json();
}
""",
    ),
    LanguageDefinition(
        id="typescript",
        name="TypeScript",
        extensions=[".ts", ".tsx", ".mts", ".cts"],
        monaco_id="typescript",
        category="Web / Full Stack",
        aliases=["ts"],
        sample_snippet="""interface ReviewConfig {
    maxIssues: number;
    strictMode: boolean;
}

export function validatePayload(data: unknown): boolean {
    if (typeof data !== 'object' || data === null) {
        return false;
    }
    return true;
}
""",
    ),
    LanguageDefinition(
        id="go",
        name="Go",
        extensions=[".go"],
        monaco_id="go",
        category="Cloud / Systems",
        aliases=["golang"],
        sample_snippet="""package main

import (
    "errors"
    "fmt"
)

func ProcessItem(id string) error {
    if id == "" {
        return errors.New("id cannot be empty")
    }
    fmt.Printf("Processing item: %s\\n", id)
    return nil
}
""",
    ),
    LanguageDefinition(
        id="rust",
        name="Rust",
        extensions=[".rs"],
        monaco_id="rust",
        category="Systems / High Performance",
        aliases=["rs"],
        sample_snippet="""pub struct SessionToken {
    pub token: String,
    pub expires_at: u64,
}

impl SessionToken {
    pub fn is_valid(&self, current_time: u64) -> bool {
        self.expires_at > current_time
    }
}
""",
    ),
    LanguageDefinition(
        id="php",
        name="PHP",
        extensions=[".php", ".phtml"],
        monaco_id="php",
        category="Web Backend",
        aliases=[],
        sample_snippet="""<?php

namespace App\\Services;

class HashService {
    public function generateToken(string $payload): string {
        return hash_hmac('sha256', $payload, getenv('SECRET_KEY') ?: 'secret');
    }
}
""",
    ),
    LanguageDefinition(
        id="csharp",
        name="C#",
        extensions=[".cs"],
        monaco_id="csharp",
        category="Enterprise / Cross-Platform",
        aliases=["c#", "dotnet"],
        sample_snippet="""using System;

namespace EnterpriseApp
{
    public record UserProfile(string Id, string Email, DateTime CreatedAt);
}
""",
    ),
    LanguageDefinition(
        id="ruby",
        name="Ruby",
        extensions=[".rb"],
        monaco_id="ruby",
        category="Web Backend / Scripting",
        aliases=["rb", "rails"],
        sample_snippet="""class TaskWorker
  attr_reader :job_id

  def initialize(job_id)
    @job_id = job_id
  end

  def execute
    puts "Running job #{@job_id}"
  end
end
""",
    ),
    LanguageDefinition(
        id="kotlin",
        name="Kotlin",
        extensions=[".kt", ".kts"],
        monaco_id="kotlin",
        category="Android / Enterprise",
        aliases=["kt"],
        sample_snippet="""package com.reviewai.core

data class ReviewResult(val id: String, val score: Double)

fun analyzeCode(input: String): ReviewResult {
    return ReviewResult("rev-1", 95.0)
}
""",
    ),
    LanguageDefinition(
        id="swift",
        name="Swift",
        extensions=[".swift"],
        monaco_id="swift",
        category="Apple Ecosystem",
        aliases=[],
        sample_snippet="""import Foundation

struct UserSession {
    let sessionId: UUID
    let username: String
    
    func isActive() -> Bool {
        return true
    }
}
""",
    ),
    LanguageDefinition(
        id="dart",
        name="Dart",
        extensions=[".dart"],
        monaco_id="dart",
        category="Mobile / Flutter",
        aliases=["flutter"],
        sample_snippet="""void main() {
  final greeting = 'Hello, ReviewAI!';
  print(greeting);
}

class ItemService {
  final List<String> _items = [];
  void addItem(String item) => _items.add(item);
}
""",
    ),
    LanguageDefinition(
        id="r",
        name="R",
        extensions=[".r", ".R"],
        monaco_id="r",
        category="Data Science / Statistics",
        aliases=[],
        sample_snippet="""calculate_summary <- function(data_vector) {
  mean_val <- mean(data_vector, na.rm = TRUE)
  sd_val <- sd(data_vector, na.rm = TRUE)
  return(list(mean = mean_val, sd = sd_val))
}
""",
    ),
    LanguageDefinition(
        id="scala",
        name="Scala",
        extensions=[".scala", ".sc"],
        monaco_id="scala",
        category="Distributed Systems / Functional",
        aliases=[],
        sample_snippet="""package com.reviewai.analytics

case class LogEntry(timestamp: Long, message: String)

object LogProcessor {
  def filterErrors(entries: List[LogEntry]): List[LogEntry] = {
    entries.filter(_.message.contains("ERROR"))
  }
}
""",
    ),
    LanguageDefinition(
        id="perl",
        name="Perl",
        extensions=[".pl", ".pm"],
        monaco_id="perl",
        category="Scripting / Automation",
        aliases=[],
        sample_snippet="""#!/usr/bin/perl
use strict;
use warnings;

sub process_record {
    my ($record_id) = @_;
    print "Processing record: $record_id\\n";
    return 1;
}
""",
    ),
    LanguageDefinition(
        id="lua",
        name="Lua",
        extensions=[".lua"],
        monaco_id="lua",
        category="Embedded / Scripting",
        aliases=[],
        sample_snippet="""local function calculate_discount(price, rate)
    if rate > 1.0 or rate < 0.0 then
        return price
    end
    return price * (1.0 - rate)
end

print(calculate_discount(100, 0.15))
""",
    ),
    LanguageDefinition(
        id="html",
        name="HTML",
        extensions=[".html", ".htm"],
        monaco_id="html",
        category="Markup / Web",
        aliases=["htm"],
        sample_snippet="""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>ReviewAI</title>
</head>
<body>
    <main class="container">
        <h1>Code Review Platform</h1>
    </main>
</body>
</html>
""",
    ),
    LanguageDefinition(
        id="css",
        name="CSS",
        extensions=[".css"],
        monaco_id="css",
        category="Styling / Web",
        aliases=[],
        sample_snippet=""".code-card {
    background: #0f172a;
    border: 1px solid #1e293b;
    border-radius: 0.75rem;
    padding: 1.5rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}
""",
    ),
    LanguageDefinition(
        id="sql",
        name="SQL",
        extensions=[".sql"],
        monaco_id="sql",
        category="Database Querying",
        aliases=["rdbms", "postgres", "mysql"],
        sample_snippet="""SELECT 
    user_id,
    COUNT(review_id) AS total_reviews,
    AVG(execution_time_ms) AS avg_duration
FROM code_reviews
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id
HAVING COUNT(review_id) > 5
ORDER BY total_reviews DESC;
""",
    ),
]

# Lookup caches
_BY_ID: Dict[str, LanguageDefinition] = {lang.id: lang for lang in LANGUAGE_DEFINITIONS}
_BY_ALIAS: Dict[str, LanguageDefinition] = {}
for lang in LANGUAGE_DEFINITIONS:
    for alias in lang.aliases:
        _BY_ALIAS[alias.lower()] = lang

_BY_EXTENSION: Dict[str, List[LanguageDefinition]] = {}
for lang in LANGUAGE_DEFINITIONS:
    for ext in lang.extensions:
        ext_lower = ext.lower()
        if ext_lower not in _BY_EXTENSION:
            _BY_EXTENSION[ext_lower] = []
        if lang not in _BY_EXTENSION[ext_lower]:
            _BY_EXTENSION[ext_lower].append(lang)


def get_language(identifier: Optional[str]) -> Optional[LanguageDefinition]:
    """Retrieve language definition by id or alias (case-insensitive)."""
    if not identifier:
        return None
    cleaned = identifier.strip().lower()
    if cleaned in _BY_ID:
        return _BY_ID[cleaned]
    if cleaned in _BY_ALIAS:
        return _BY_ALIAS[cleaned]
    return None


def get_languages_by_extension(extension: Optional[str]) -> List[LanguageDefinition]:
    """Retrieve matching language definitions for a file extension."""
    if not extension:
        return []
    ext_clean = extension.strip().lower()
    if not ext_clean.startswith("."):
        ext_clean = f".{ext_clean}"
    return _BY_EXTENSION.get(ext_clean, [])


def is_supported_language(identifier: Optional[str]) -> bool:
    """Return True if language is supported."""
    return get_language(identifier) is not None


def is_supported_extension(extension: Optional[str]) -> bool:
    """Return True if extension matches any supported language."""
    return len(get_languages_by_extension(extension)) > 0


def all_supported_extensions() -> Set[str]:
    """Return all valid extensions."""
    return set(_BY_EXTENSION.keys())


def all_languages() -> List[LanguageDefinition]:
    """Return all registered languages."""
    return list(LANGUAGE_DEFINITIONS)
