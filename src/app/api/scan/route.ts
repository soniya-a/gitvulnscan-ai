/**
 * POST /api/scan
 *
 * Accepts { repo_url } in the request body, validates it is a GitHub URL,
 * creates a scan record in PostgreSQL, runs a simulated scan pipeline
 * (OWASP + AI fix generation), persists vulnerabilities, and returns the
 * scan result matching the API contract in PROJECT_CONTEXT.md Section 7.
 *
 * In production, replace the mock scan logic with:
 *   1. utils.cloneRepo(repo_url)  → local path
 *   2. scanner.runOwaspScan(path) → raw CVE list
 *   3. llmFixGenerator.generateFix(cve) per vulnerability
 *   4. utils.cleanupRepo(path)
 */

import { NextRequest, NextResponse } from 'next/server';
import { initDb, createScan, updateScan, saveVulnerability,  } from '@/lib/db';

// ─── Validation ───────────────────────────────────────────────────────────────

const GITHUB_URL_PATTERN = /^https:\/\/github\.com\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(\/.*)?$/;

function validateRepoUrl(url: unknown): { valid: boolean; error?: string } {
  if (typeof url !== 'string' || url.trim() === '') {
    return { valid: false, error: 'repo_url is required and must be a non-empty string' };
  }
  const trimmed = url.trim();
  if (trimmed.length > 500) {
    return { valid: false, error: 'repo_url must not exceed 500 characters' };
  }
  if (!GITHUB_URL_PATTERN.test(trimmed)) {
    return {
      valid: false,
      error: 'repo_url must be a valid GitHub repository URL (https://github.com/owner/repo)',
    };
  }
  // Basic path-traversal guard
  if (trimmed.includes('..') || trimmed.includes('%2e%2e') || trimmed.includes('%2E%2E')) {
    return { valid: false, error: 'repo_url contains invalid characters' };
  }
  return { valid: true };
}

// ─── Mock scan pipeline ───────────────────────────────────────────────────────
// Replace this section with real OWASP + Claude integration in production.

interface RawVuln {
  cve_id: string;
  dependency: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  suggested_fix: string;
  fix_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
}

function mockScanRepo(_repoUrl: string): RawVuln[] {
  // Deterministic mock data so the UI is always populated during development.
  return [
    {
      cve_id: 'CVE-2021-23337',
      dependency: 'lodash@4.17.15',
      severity: 'HIGH',
      description:
        'Prototype pollution vulnerability in lodash allows attackers to modify Object.prototype.',
      suggested_fix: 'Upgrade lodash to version 4.17.21 or later.',
      fix_confidence: 'HIGH',
    },
    {
      cve_id: 'CVE-2022-24999',
      dependency: 'qs@6.5.2',
      severity: 'HIGH',
      description:
        'Prototype poisoning in qs when parsing deeply nested objects with special characters.',
      suggested_fix: 'Upgrade qs to version 6.11.0 or later.',
      fix_confidence: 'HIGH',
    },
    {
      cve_id: 'CVE-2023-26115',
      dependency: 'word-wrap@1.2.3',
      severity: 'MEDIUM',
      description: 'Regular expression denial of service (ReDoS) in word-wrap package.',
      suggested_fix: 'Upgrade word-wrap to version 1.2.4 or later.',
      fix_confidence: 'HIGH',
    },
    {
      cve_id: 'CVE-2022-46175',
      dependency: 'json5@1.0.1',
      severity: 'HIGH',
      description:
        'Prototype pollution in json5 via the parse method when parsing malicious input.',
      suggested_fix: 'Upgrade json5 to version 1.0.2 or 2.2.2 or later.',
      fix_confidence: 'HIGH',
    },
    {
      cve_id: 'CVE-2021-3807',
      dependency: 'ansi-regex@5.0.0',
      severity: 'HIGH',
      description:
        'Inefficient regular expression complexity in ansi-regex allows ReDoS attacks.',
      suggested_fix: 'Upgrade ansi-regex to version 5.0.1 or later.',
      fix_confidence: 'HIGH',
    },
  ];
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  const startTime = Date.now();

  // 1. Parse body
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  // 2. Validate repo_url
  const validation = validateRepoUrl(body?.repo_url);
  if (!validation.valid) {
    return NextResponse.json(
      { error: validation.error },
      { status: 422 }
    );
  }

  const repoUrl = (body.repo_url as string).trim();

  // 3. Initialise DB schema (idempotent)
  try {
    await initDb();
  } catch (dbErr) {
    console.error('[POST /api/scan] DB init failed:', dbErr);
    return NextResponse.json(
      { error: 'Database connection failed. Please check DATABASE_URL.' },
      { status: 503 }
    );
  }

  // 4. Create scan record
  let scanId: number;
  try {
    scanId = await createScan(repoUrl);
  } catch (dbErr) {
    console.error('[POST /api/scan] createScan failed:', dbErr);
    return NextResponse.json({ error: 'Failed to create scan record' }, { status: 500 });
  }

  // 5. Run scan pipeline (mock — replace with real OWASP + Claude in production)
  let vulns: RawVuln[] = [];
  let finalStatus: 'completed' | 'failed' = 'completed';

  try {
    vulns = mockScanRepo(repoUrl);

    // Persist each vulnerability
    for (const vuln of vulns) {
      await saveVulnerability(scanId, vuln);
    }
  } catch (scanErr) {
    console.error('[POST /api/scan] scan pipeline failed:', scanErr);
    finalStatus = 'failed';
  }

  // 6. Update scan record with final status
  const durationMs = Date.now() - startTime;
  try {
    await updateScan(scanId, finalStatus, vulns.length, durationMs);
  } catch (dbErr) {
    console.error('[POST /api/scan] updateScan failed:', dbErr);
    // Non-fatal — scan data is already saved
  }

  // 7. Return response matching API contract
  return NextResponse.json(
    {
      scan_id: scanId,
      status: finalStatus,
      total_vulnerabilities: vulns.length,
      message: finalStatus === 'completed' ? 'Scan complete' : 'Scan failed',
    },
    { status: 200 }
  );
}
