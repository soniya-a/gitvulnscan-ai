'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Clock, ChevronRight, AlertCircle, AlertTriangle, Info, CheckCircle, RotateCcw, ExternalLink } from 'lucide-react';


// Mock history data — replace with: GET /api/history
const MOCK_HISTORY = [
  {
    scan_id: 'scan-20240724-001',
    repo_url: 'https://github.com/vercel/next.js',
    scanned_at: '2026-07-24T22:41:00Z',
    total_vulnerabilities: 7,
    status: 'completed' as const,
    summary: { critical: 1, high: 2, medium: 3, low: 1 },
  },
  {
    scan_id: 'scan-20240724-002',
    repo_url: 'https://github.com/facebook/react',
    scanned_at: '2026-07-24T19:15:00Z',
    total_vulnerabilities: 3,
    status: 'completed' as const,
    summary: { critical: 0, high: 1, medium: 2, low: 0 },
  },
  {
    scan_id: 'scan-20240723-003',
    repo_url: 'https://github.com/expressjs/express',
    scanned_at: '2026-07-23T14:30:00Z',
    total_vulnerabilities: 12,
    status: 'completed' as const,
    summary: { critical: 3, high: 4, medium: 3, low: 2 },
  },
  {
    scan_id: 'scan-20240723-004',
    repo_url: 'https://github.com/django/django',
    scanned_at: '2026-07-23T09:05:00Z',
    total_vulnerabilities: 0,
    status: 'completed' as const,
    summary: { critical: 0, high: 0, medium: 0, low: 0 },
  },
  {
    scan_id: 'scan-20240722-005',
    repo_url: 'https://github.com/rails/rails',
    scanned_at: '2026-07-22T16:48:00Z',
    total_vulnerabilities: 5,
    status: 'completed' as const,
    summary: { critical: 2, high: 1, medium: 1, low: 1 },
  },
  {
    scan_id: 'scan-20240722-006',
    repo_url: 'https://github.com/laravel/laravel',
    scanned_at: '2026-07-22T11:20:00Z',
    total_vulnerabilities: 0,
    status: 'failed' as const,
    summary: { critical: 0, high: 0, medium: 0, low: 0 },
  },
  {
    scan_id: 'scan-20240721-007',
    repo_url: 'https://github.com/spring-projects/spring-boot',
    scanned_at: '2026-07-21T08:10:00Z',
    total_vulnerabilities: 9,
    status: 'completed' as const,
    summary: { critical: 1, high: 3, medium: 4, low: 1 },
  },
];

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffHours < 1) return 'Just now';
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

function getRepoName(url: string): string {
  return url.replace('https://github.com/', '');
}

export default function ScanHistorySection() {
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [relativeTimestamps, setRelativeTimestamps] = useState<Record<string, string>>({});

  useEffect(() => {
    const timestamps: Record<string, string> = {};
    MOCK_HISTORY.forEach((item) => {
      timestamps[item.scan_id] = formatRelativeTime(item.scanned_at);
    });
    setRelativeTimestamps(timestamps);
  }, []);

  return (
    <section className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock size={16} className="text-muted-foreground" />
          <h2 className="text-base font-semibold text-foreground">Recent Scans</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full border border-border">
            {MOCK_HISTORY.length}
          </span>
        </div>
        <button
          suppressHydrationWarning
          className="text-xs text-muted-foreground hover:text-primary transition-colors duration-150 flex items-center gap-1"
        >
          <RotateCcw size={12} />
          Refresh
        </button>
      </div>

      {/* History table */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase">Repository</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase">Scanned</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase">Vulnerabilities</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase">Severity Breakdown</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {MOCK_HISTORY.map((item) => (
                <tr
                  key={item.scan_id}
                  onMouseEnter={() => setHoveredRow(item.scan_id)}
                  onMouseLeave={() => setHoveredRow(null)}
                  className={`border-b border-border last:border-b-0 transition-colors duration-100 ${
                    hoveredRow === item.scan_id ? 'bg-muted/30' : ''
                  }`}
                >
                  {/* Repository */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-muted border border-border flex items-center justify-center shrink-0">
                        <ExternalLink size={10} className="text-muted-foreground" />
                      </div>
                      <span className="font-mono-data text-xs text-foreground truncate max-w-[180px]">
                        {getRepoName(item.repo_url)}
                      </span>
                    </div>
                  </td>

                  {/* Scanned */}
                  <td className="px-4 py-3 text-xs text-muted-foreground font-mono-data whitespace-nowrap">
                    {relativeTimestamps[item.scan_id] ?? '—'}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium border ${
                        item.status === 'completed'
                          ? 'text-severity-low bg-severity-low border-severity-low' :'text-severity-critical bg-severity-critical border-severity-critical'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${item.status === 'completed' ? 'bg-severity-low' : 'bg-severity-critical'}`} />
                      {item.status === 'completed' ? 'Completed' : 'Failed'}
                    </span>
                  </td>

                  {/* Total vulns */}
                  <td className="px-4 py-3">
                    <span
                      className={`font-bold font-mono-data text-sm ${
                        item.total_vulnerabilities === 0
                          ? 'text-severity-low'
                          : item.summary.critical > 0
                          ? 'text-severity-critical'
                          : item.summary.high > 0
                          ? 'text-severity-high' :'text-severity-medium'
                      }`}
                    >
                      {item.total_vulnerabilities}
                    </span>
                    {item.total_vulnerabilities === 0 && (
                      <span className="ml-1.5 text-xs text-muted-foreground">Clean</span>
                    )}
                  </td>

                  {/* Severity breakdown */}
                  <td className="px-4 py-3">
                    {item.total_vulnerabilities === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {item.summary.critical > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-severity-critical font-mono-data">
                            <AlertCircle size={10} />
                            {item.summary.critical}C
                          </span>
                        )}
                        {item.summary.high > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-severity-high font-mono-data">
                            <AlertTriangle size={10} />
                            {item.summary.high}H
                          </span>
                        )}
                        {item.summary.medium > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-severity-medium font-mono-data">
                            <Info size={10} />
                            {item.summary.medium}M
                          </span>
                        )}
                        {item.summary.low > 0 && (
                          <span className="flex items-center gap-0.5 text-xs text-severity-low font-mono-data">
                            <CheckCircle size={10} />
                            {item.summary.low}L
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Action */}
                  <td className="px-4 py-3">
                    {item.status === 'completed' && (
                      <Link
                        href={`/scan-results?scan_id=${item.scan_id}&repo=${encodeURIComponent(item.repo_url)}`}
                        className={`flex items-center gap-1 text-xs font-medium transition-all duration-150 ${
                          hoveredRow === item.scan_id
                            ? 'text-primary' :'text-muted-foreground'
                        }`}
                      >
                        View
                        <ChevronRight size={12} />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}