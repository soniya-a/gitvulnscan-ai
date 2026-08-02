'use client';

import React, { useCallback, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Lightbulb,
  Filter,
} from 'lucide-react';
import { toast } from 'sonner';

import SeverityBadge, {
  type Severity,
} from '@/components/ui/SeverityBadge';

import { type Vulnerability } from '@/api/client';

interface ResultsTableProps {
  vulnerabilities: Vulnerability[];
}

type SeverityFilter = 'ALL' | Severity;

type SortBy = 'severity' | 'cvss' | 'package';
type SortDirection = 'asc' | 'desc';

const SEVERITY_FILTERS: {
  id: SeverityFilter;
  label: string;
}[] = [
  { id: 'ALL', label: 'All' },
  { id: 'CRITICAL', label: 'Critical' },
  { id: 'HIGH', label: 'High' },
  { id: 'MEDIUM', label: 'Medium' },
  { id: 'LOW', label: 'Low' },
  { id: 'UNKNOWN', label: 'Unknown' },
];

const SEVERITY_ORDER: Record<string, number> = {
  CRITICAL: 5,
  HIGH: 4,
  MEDIUM: 3,
  LOW: 2,
  UNKNOWN: 1,
};

function normalizeSeverity(severity?: string | null): Severity {
  const value = severity?.toUpperCase().trim();

  if (value === 'CRITICAL') return 'CRITICAL';
  if (value === 'HIGH') return 'HIGH';
  if (value === 'MEDIUM') return 'MEDIUM';
  if (value === 'LOW') return 'LOW';

  return 'UNKNOWN';
}

function cleanDescription(description?: string | null): string {
  if (!description) {
    return 'No vulnerability description available.';
  }

  const cleaned = description
    .replace(/#{1,6}\s*/g, '')
    .replace(/\[(.*?)\]\((.*?)\)/g, '$1')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) {
    return 'No vulnerability description available.';
  }

  return cleaned.length > 500
    ? `${cleaned.slice(0, 500).trim()}...`
    : cleaned;
}

function CvssScore({
  score,
}: {
  score?: number | null;
}) {
  if (
    score === null ||
    score === undefined ||
    Number.isNaN(Number(score))
  ) {
    return (
      <span className="text-xs text-muted-foreground">
        —
      </span>
    );
  }

  const numericScore = Number(score);

  const color =
    numericScore >= 9
      ? 'text-severity-critical'
      : numericScore >= 7
      ? 'text-severity-high'
      : numericScore >= 4
      ? 'text-severity-medium'
      : 'text-severity-low';

  return (
    <span
      className={`font-mono-data text-sm font-semibold ${color}`}
    >
      {numericScore.toFixed(1)}
    </span>
  );
}

export default function ResultsTable({
  vulnerabilities = [],
}: ResultsTableProps) {
  const [expandedRow, setExpandedRow] =
    useState<string | null>(null);

  const [severityFilter, setSeverityFilter] =
    useState<SeverityFilter>('ALL');

  const [sortBy, setSortBy] =
    useState<SortBy>('severity');

  const [sortDir, setSortDir] =
    useState<SortDirection>('desc');

  const [hoveredRow, setHoveredRow] =
    useState<string | null>(null);

  const getRowId = useCallback(
    (vulnerability: Vulnerability, index: number) => {
      return [
        vulnerability.cve_id || 'unknown-cve',
        vulnerability.package_name || 'unknown-package',
        vulnerability.installed_version || 'unknown-version',
        index,
      ].join('-');
    },
    []
  );

  const filtered = useMemo(() => {
    const result = [...vulnerabilities];

    const filteredResult = result.filter((vulnerability) => {
      if (severityFilter === 'ALL') {
        return true;
      }

      return (
        normalizeSeverity(vulnerability.severity) ===
        severityFilter
      );
    });

    filteredResult.sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'severity') {
        const severityA =
          SEVERITY_ORDER[
            normalizeSeverity(a.severity)
          ] ?? 0;

        const severityB =
          SEVERITY_ORDER[
            normalizeSeverity(b.severity)
          ] ?? 0;

        comparison = severityA - severityB;
      }

      if (sortBy === 'cvss') {
        const scoreA = Number(a.cvss_score ?? 0);
        const scoreB = Number(b.cvss_score ?? 0);

        comparison = scoreA - scoreB;
      }

      if (sortBy === 'package') {
        comparison = String(
          a.package_name ?? ''
        ).localeCompare(
          String(b.package_name ?? '')
        );
      }

      return sortDir === 'desc'
        ? -comparison
        : comparison;
    });

    return filteredResult;
  }, [
    vulnerabilities,
    severityFilter,
    sortBy,
    sortDir,
  ]);

  const handleSort = useCallback(
    (column: SortBy) => {
      if (sortBy === column) {
        setSortDir((current) =>
          current === 'asc'
            ? 'desc'
            : 'asc'
        );
      } else {
        setSortBy(column);
        setSortDir('desc');
      }
    },
    [sortBy]
  );

  const handleCopyCve = useCallback(
    async (cveId: string) => {
      try {
        await navigator.clipboard.writeText(cveId);
        toast.success(`Copied ${cveId} to clipboard`);
      } catch {
        toast.error('Unable to copy CVE ID');
      }
    },
    []
  );

  const toggleRow = useCallback(
    (rowId: string) => {
      setExpandedRow((previous) =>
        previous === rowId ? null : rowId
      );
    },
    []
  );

  function SortIcon({
    col,
  }: {
    col: SortBy;
  }) {
    if (sortBy !== col) {
      return (
        <span className="opacity-30">
          ↕
        </span>
      );
    }

    return (
      <span className="text-primary">
        {sortDir === 'desc' ? '↓' : '↑'}
      </span>
    );
  }

  if (!vulnerabilities.length) {
    return (
      <div className="card-elevated p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No vulnerabilities found.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {/* FILTER BAR */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1 flex-wrap">
          <Filter
            size={13}
            className="text-muted-foreground mr-1"
          />

          {SEVERITY_FILTERS.map((filter) => {
            const count =
              filter.id === 'ALL'
                ? vulnerabilities.length
                : vulnerabilities.filter(
                    (vulnerability) =>
                      normalizeSeverity(
                        vulnerability.severity
                      ) === filter.id
                  ).length;

            return (
              <button
                key={`filter-${filter.id}`}
                type="button"
                onClick={() =>
                  setSeverityFilter(filter.id)
                }
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-150 ${
                  severityFilter === filter.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {filter.label}

                {filter.id !== 'ALL' && (
                  <span className="ml-1 opacity-60">
                    ({count})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <span className="text-xs text-muted-foreground font-mono-data">
          Showing {filtered.length} of {vulnerabilities.length} findings
        </span>
      </div>

      {/* TABLE */}
      <div className="card-elevated overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-cyan-500/20 bg-slate-900/80">
                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase whitespace-nowrap">
                  CVE / Advisory
                </th>

                <th
                  onClick={() => handleSort('package')}
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase whitespace-nowrap cursor-pointer hover:text-foreground"
                >
                  Package <SortIcon col="package" />
                </th>

                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase whitespace-nowrap">
                  Installed
                </th>

                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase whitespace-nowrap">
                  Fixed In
                </th>

                <th
                  onClick={() => handleSort('severity')}
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase whitespace-nowrap cursor-pointer hover:text-foreground"
                >
                  Severity <SortIcon col="severity" />
                </th>

                <th
                  onClick={() => handleSort('cvss')}
                  className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase whitespace-nowrap cursor-pointer hover:text-foreground"
                >
                  CVSS <SortIcon col="cvss" />
                </th>

                <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground tracking-wide uppercase">
                  Description
                </th>

                <th className="px-4 py-3" />
              </tr>
            </thead>

            <tbody>
              {filtered.map((vulnerability, index) => {
                const rowId = getRowId(
                  vulnerability,
                  index
                );

                const isExpanded =
                  expandedRow === rowId;

                const isHovered =
                  hoveredRow === rowId;

                const severity =
                  normalizeSeverity(
                    vulnerability.severity
                  );

                const cveId =
                  vulnerability.cve_id ||
                  'UNKNOWN';

                const packageName =
                  vulnerability.package_name ||
                  'Unknown package';

                const description = cleanDescription(
                  vulnerability.description
                );

                const fixSuggestion =
                  vulnerability.fix_suggestion ||
                  'AI remediation suggestion is not available yet.';
                
                const fixConfidence = vulnerability.fix_confidence || 'LOW';

                return (
                  <React.Fragment
                    key={rowId}
                  >
                  <tr
  onMouseEnter={() => setHoveredRow(rowId)}
  onMouseLeave={() => setHoveredRow(null)}
  onClick={() => toggleRow(rowId)}
  className={`border-b border-cyan-500/20 bg-slate-950/80 transition-all duration-300 cursor-pointer hover:bg-slate-800/40 ${
    isExpanded
      ? 'bg-muted/40'
      : isHovered
      ? 'bg-muted/20'
      : ''
  }`}
>  
                      {/* CVE */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono-data text-xs text-primary font-medium">
                            {cveId}
                          </span>

                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCopyCve(cveId);
                            }}
                            className={`p-0.5 rounded transition-all ${
                              isHovered
                                ? 'opacity-100'
                                : 'opacity-0'
                            }`}
                            aria-label={`Copy ${cveId}`}
                          >
                            <Copy size={11} />
                          </button>
                        </div>
                      </td>

                      {/* PACKAGE */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono-data text-sm font-medium text-foreground">
                          {packageName}
                        </span>
                      </td>

                      {/* INSTALLED */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono-data text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
                          {vulnerability.installed_version ||
                            'Unknown'}
                        </span>
                      </td>

                      {/* FIXED VERSION */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {vulnerability.fixed_version ? (
                          <span className="font-mono-data text-xs text-severity-low bg-severity-low/10 px-1.5 py-0.5 rounded border border-severity-low">
                            {vulnerability.fixed_version}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No fix listed
                          </span>
                        )}
                      </td>

                      {/* SEVERITY */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <SeverityBadge
                          severity={severity}
                        />
                      </td>

                      {/* CVSS */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <CvssScore
                          score={
                            vulnerability.cvss_score
                          }
                        />
                      </td>

                      {/* DESCRIPTION */}
                      <td className="px-4 py-3 max-w-xs">
                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                          {description}
                        </p>
                      </td>

                      {/* FIX BUTTON */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            toggleRow(rowId);
                          }}
                          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2 py-1 rounded hover:bg-muted"
                        >
                          <Lightbulb
                            size={12}
                            className={
                              isExpanded
                                ? 'text-primary'
                                : ''
                            }
                          />

                          <span className="hidden md:inline">
                            Fix
                          </span>

                          {isExpanded ? (
                            <ChevronUp size={12} />
                          ) : (
                            <ChevronDown size={12} />
                          )}
                        </button>
                      </td>
                    </tr>

                    {/* EXPANDED DETAILS */}
                    {isExpanded && (
                      <tr className="border-b border-cyan-500/20 bg-slate-950/80">
                        <td
                          colSpan={8}
                          className="px-4 py-4"
                        >
                          <div className="flex flex-col gap-4 pl-4 border-l-2 border-primary/40">
                            {/* DESCRIPTION */}
                            <div>
                              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                                Vulnerability Details
                              </p>

                              <p className="text-slate-200 leading-7">
                                {description}
                              </p>
                            </div>

                            {/* FIX */}
                            <div className="rounded-xl border border-cyan-500/30 bg-slate-900/80 backdrop-blur-md p-5">
                              <div className="flex items-center gap-2 mb-2">
                                <Lightbulb
                                  size={14}
                                  className="text-primary"
                                />

                                <span className="text-sm font-bold text-cyan-300">
                                  Fix Suggestion
                                </span>
                                <span
                                  className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                    fixConfidence === 'HIGH' ? 'bg-green-500/20 text-green-400' :
                                    fixConfidence === 'MEDIUM' ? 'bg-yellow-500/20 text-yellow-400' :
                                    'bg-red-500/20 text-red-400'
                                  }`}
                                >
                                  {fixConfidence} Confidence
                                </span>
                              </div>

                              <p className="text-base text-slate-100 leading-7 whitespace-pre-wrap">
                                {fixSuggestion}
                              </p>
                            </div>

                            {/* META */}
                            <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
                              {vulnerability.published_date && (
                                <span>
                                  Published:{' '}
                                  {
                                    vulnerability.published_date
                                  }
                                </span>
                              )}

                              {cveId.startsWith('CVE-') && (
                                <a
                                  href={`https://nvd.nist.gov/vuln/detail/${cveId}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(event) =>
                                    event.stopPropagation()
                                  }
                                  className="flex items-center gap-1 hover:text-primary transition-colors"
                                >
                                  View on NVD
                                  <ExternalLink size={11} />
                                </a>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}