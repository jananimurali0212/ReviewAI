import { ReviewHistoryItem, LanguageOption } from '../types';

/**
 * PLACEHOLDER / MOCK DATA FOR DAY 1 UI
 * Note: Real dynamic analysis and backend persistence will replace these in subsequent phases.
 */

export const MOCK_DASHBOARD_METRICS = {
  totalReviews: 128,
  totalReviewsTrend: '+14% from last week',
  issuesDetected: 342,
  issuesTrend: '-8% reduction in warnings',
  criticalIssues: 19,
  criticalTrend: '4 resolved today',
};

export const MOCK_RECENT_REVIEWS: ReviewHistoryItem[] = [
  {
    id: 'rev-001',
    projectName: 'Authentication Service',
    fileName: 'auth_jwt_validator.py',
    language: 'Python',
    reviewDate: '2026-11-06 18:42',
    issueCount: 3,
    criticalIssues: 1,
    status: 'Needs Attention',
  },
  {
    id: 'rev-002',
    projectName: 'Payment Gateway Client',
    fileName: 'stripe_connector.ts',
    language: 'TypeScript',
    reviewDate: '2026-11-06 15:15',
    issueCount: 0,
    criticalIssues: 0,
    status: 'Completed',
  },
  {
    id: 'rev-003',
    projectName: 'Distributed Cache Worker',
    fileName: 'lru_cache.go',
    language: 'Go',
    reviewDate: '2026-11-05 21:30',
    issueCount: 2,
    criticalIssues: 0,
    status: 'Completed',
  },
  {
    id: 'rev-004',
    projectName: 'Kernel Memory Allocator',
    fileName: 'mempool.c',
    language: 'C',
    reviewDate: '2026-11-05 14:02',
    issueCount: 5,
    criticalIssues: 2,
    status: 'Needs Attention',
  },
  {
    id: 'rev-005',
    projectName: 'Data Pipeline Analytics',
    fileName: 'aggregate_metrics.sql',
    language: 'SQL',
    reviewDate: '2026-11-04 10:19',
    issueCount: 1,
    criticalIssues: 0,
    status: 'Completed',
  },
];

export const MOCK_FULL_HISTORY: ReviewHistoryItem[] = [
  ...MOCK_RECENT_REVIEWS,
  {
    id: 'rev-006',
    projectName: 'Inventory Microservice',
    fileName: 'OrderService.java',
    language: 'Java',
    reviewDate: '2026-11-03 16:45',
    issueCount: 4,
    criticalIssues: 1,
    status: 'Needs Attention',
  },
  {
    id: 'rev-007',
    projectName: 'Real-time WebSocket Engine',
    fileName: 'ws_manager.rs',
    language: 'Rust',
    reviewDate: '2026-11-02 12:20',
    issueCount: 0,
    criticalIssues: 0,
    status: 'Completed',
  },
  {
    id: 'rev-008',
    projectName: 'Legacy Billing API',
    fileName: 'invoice_gen.php',
    language: 'PHP',
    reviewDate: '2026-11-01 09:12',
    issueCount: 7,
    criticalIssues: 3,
    status: 'Needs Attention',
  },
  {
    id: 'rev-009',
    projectName: 'High-Frequency Trader Engine',
    fileName: 'order_book.cpp',
    language: 'C++',
    reviewDate: '2026-10-31 17:34',
    issueCount: 1,
    criticalIssues: 0,
    status: 'Completed',
  },
  {
    id: 'rev-010',
    projectName: 'Customer Portal UI',
    fileName: 'UserProfile.tsx',
    language: 'TypeScript',
    reviewDate: '2026-10-30 11:05',
    issueCount: 2,
    criticalIssues: 0,
    status: 'Completed',
  },
];

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  {
    id: 'python',
    name: 'Python',
    extension: '.py',
    monacoLang: 'python',
    sampleSnippet: `def calculate_average_latency(latencies: list[float]) -> float:
    """Calculates mean latency in milliseconds."""
    if not latencies:
        return 0.0
    return sum(latencies) / len(latencies)
`,
  },
  {
    id: 'typescript',
    name: 'TypeScript',
    extension: '.ts',
    monacoLang: 'typescript',
    sampleSnippet: `interface ReviewConfig {
  maxIssues: number;
  strictMode: boolean;
}

export function validatePayload(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  return true;
}
`,
  },
  {
    id: 'javascript',
    name: 'JavaScript',
    extension: '.js',
    monacoLang: 'javascript',
    sampleSnippet: `async function fetchUserData(userId) {
  const response = await fetch(\`/api/users/\${userId}\`);
  if (!response.ok) {
    throw new Error('User not found');
  }
  return await response.json();
}
`,
  },
  {
    id: 'java',
    name: 'Java',
    extension: '.java',
    monacoLang: 'java',
    sampleSnippet: `public class SecurityContext {
    private final String userId;

    public SecurityContext(String userId) {
        this.userId = userId;
    }

    public boolean isAuthenticated() {
        return this.userId != null && !this.userId.isBlank();
    }
}
`,
  },
  {
    id: 'c',
    name: 'C',
    extension: '.c',
    monacoLang: 'c',
    sampleSnippet: `#include <stdio.h>
#include <stdlib.h>

int safe_divide(int numerator, int denominator, int* result) {
    if (denominator == 0) return -1;
    *result = numerator / denominator;
    return 0;
}
`,
  },
  {
    id: 'cpp',
    name: 'C++',
    extension: '.cpp',
    monacoLang: 'cpp',
    sampleSnippet: `#include <iostream>
#include <vector>
#include <memory>

class ResourcePool {
public:
    void acquire() {
        std::cout << "Resource acquired\\n";
    }
};
`,
  },
  {
    id: 'go',
    name: 'Go',
    extension: '.go',
    monacoLang: 'go',
    sampleSnippet: `package main

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
`,
  },
  {
    id: 'rust',
    name: 'Rust',
    extension: '.rs',
    monacoLang: 'rust',
    sampleSnippet: `pub struct SessionToken {
    pub token: String,
    pub expires_at: u64,
}

impl SessionToken {
    pub fn is_valid(&self, current_time: u64) -> bool {
        self.expires_at > current_time
    }
}
`,
  },
  {
    id: 'php',
    name: 'PHP',
    extension: '.php',
    monacoLang: 'php',
    sampleSnippet: `<?php

namespace App\\Services;

class HashService {
    public function generateToken(string $payload): string {
        return hash_hmac('sha256', $payload, getenv('SECRET_KEY') ?: 'secret');
    }
}
`,
  },
  {
    id: 'csharp',
    name: 'C#',
    extension: '.cs',
    monacoLang: 'csharp',
    sampleSnippet: `using System;

namespace EnterpriseApp
{
    public record UserProfile(string Id, string Email, DateTime CreatedAt);
}
`,
  },
  {
    id: 'html',
    name: 'HTML',
    extension: '.html',
    monacoLang: 'html',
    sampleSnippet: `<!DOCTYPE html>
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
`,
  },
  {
    id: 'css',
    name: 'CSS',
    extension: '.css',
    monacoLang: 'css',
    sampleSnippet: `.code-card {
  background: #0f172a;
  border: 1px solid #1e293b;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25);
}
`,
  },
  {
    id: 'sql',
    name: 'SQL',
    extension: '.sql',
    monacoLang: 'sql',
    sampleSnippet: `SELECT 
    user_id,
    COUNT(review_id) AS total_reviews,
    AVG(execution_time_ms) AS avg_duration
FROM code_reviews
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY user_id
HAVING COUNT(review_id) > 5
ORDER BY total_reviews DESC;
`,
  },
];

