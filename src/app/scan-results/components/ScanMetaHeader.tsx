import React from 'react';
import { GitBranch, Clock, Package, Calendar } from 'lucide-react';
import { type ScanResult } from '@/api/client';

interface ScanMetaHeaderProps {
  result: ScanResult;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

function getRepoName(url: string): string {
  return url.replace('https://github.com/', '');
}

export default function ScanMetaHeader({ result }: ScanMetaHeaderProps) {
  const repoName = getRepoName(result.repo_url);

  return (
    <div className="card-elevated p-5 flex flex-col gap-4">
      {/* Title row */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center shrink-0">
            <GitBranch size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground font-mono-data">
              {repoName}
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Scan ID:{' '}
              <span className="font-mono-data text-foreground/60">{result.scan_id}</span>
            </p>
          </div>
        </div>

        <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-severity-low border border-severity-low text-severity-low">
          <span className="w-1.5 h-1.5 rounded-full bg-severity-low" />
          Scan Complete
        </span>
      </div>

      {/* Meta info row */}
      <div className="flex items-center gap-6 flex-wrap pt-1 border-t border-border">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Calendar size={13} />
          <span>{formatDate(result.scanned_at)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock size={13} />
          <span>{result.duration_seconds}s scan duration</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Package size={13} />
          <span>{result.dependencies_scanned} dependencies analyzed</span>
        </div>
        <a
          href={result.repo_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:text-primary-dim transition-colors ml-auto"
        >
          View on GitHub →
        </a>
      </div>
    </div>
  );
}