/**
 * GET /api/results/[scan_id]
 *
 * Returns the full scan record plus all associated vulnerabilities for the
 * given scan_id. Response shape matches PROJECT_CONTEXT.md Section 7.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getScanById, getVulnerabilitiesByScanId } from '@/lib/db';

interface RouteParams {
  params: Promise<{ scan_id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams): Promise<NextResponse> {
  const { scan_id } = await params;

  // Validate scan_id is a positive integer
  const id = parseInt(scan_id, 10);
  if (isNaN(id) || id <= 0) {
    return NextResponse.json(
      { error: 'scan_id must be a positive integer' },
      { status: 400 }
    );
  }

  // Fetch scan record
  let scan;
  try {
    scan = await getScanById(id);
  } catch (dbErr) {
    console.error(`[GET /api/results/${id}] getScanById failed:`, dbErr);
    return NextResponse.json(
      { error: 'Database error while fetching scan' },
      { status: 503 }
    );
  }

  if (!scan) {
    return NextResponse.json(
      { error: `Scan with id ${id} not found` },
      { status: 404 }
    );
  }

  // Fetch vulnerabilities
  let vulnerabilities;
  try {
    vulnerabilities = await getVulnerabilitiesByScanId(id);
  } catch (dbErr) {
    console.error(`[GET /api/results/${id}] getVulnerabilitiesByScanId failed:`, dbErr);
    return NextResponse.json(
      { error: 'Database error while fetching vulnerabilities' },
      { status: 503 }
    );
  }

  // Build response matching the API contract
  return NextResponse.json(
    {
      scan_id: scan.id,
      repo_url: scan.repo_url,
      scan_date: scan.scan_date,
      status: scan.status,
      total_vulnerabilities: scan.total_vulns,
      duration_ms: scan.duration_ms,
      vulnerabilities: vulnerabilities.map((v) => ({
        cve_id: v.cve_id,
        dependency: v.dependency,
        severity: v.severity,
        description: v.description,
        suggested_fix: v.suggested_fix,
        fix_confidence: v.fix_confidence,
      })),
    },
    { status: 200 }
  );
}
