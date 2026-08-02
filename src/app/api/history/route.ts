/**
 * GET /api/history
 *
 * Returns all past scans ordered by most recent first.
 * Response shape matches PROJECT_CONTEXT.md Section 7.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAllScans } from '@/lib/db';

export async function GET(_request: NextRequest): Promise<NextResponse> {
  let scans;
  try {
    scans = await getAllScans();
  } catch (dbErr) {
    console.error('[GET /api/history] getAllScans failed:', dbErr);
    return NextResponse.json(
      { error: 'Database error while fetching scan history' },
      { status: 503 }
    );
  }

  return NextResponse.json(
    scans.map((s) => ({
      scan_id: s.id,
      repo_url: s.repo_url,
      status: s.status,
      total_vulns: s.total_vulns,
      scan_date: s.scan_date,
      duration_ms: s.duration_ms,
    })),
    { status: 200 }
  );
}
