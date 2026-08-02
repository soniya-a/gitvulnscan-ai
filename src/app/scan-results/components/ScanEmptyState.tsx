import React from 'react';
import Link from 'next/link';
import { ShieldCheck, ArrowLeft, RotateCcw } from 'lucide-react';

interface ScanEmptyStateProps {
  repoUrl: string;
}

function getRepoName(url: string): string {
  return url.replace('https://github.com/', '');
}

export default function ScanEmptyState({ repoUrl }: ScanEmptyStateProps) {
  const repoName = getRepoName(repoUrl);

  return (
    <div className="card-elevated p-12 flex flex-col items-center text-center gap-6">
      <div className="w-16 h-16 rounded-2xl bg-severity-low border border-severity-low flex items-center justify-center glow-primary">
        <ShieldCheck size={28} className="text-severity-low" />
      </div>

      <div className="flex flex-col gap-2 max-w-md">
        <h2 className="text-xl font-bold text-foreground">No vulnerabilities found</h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          <span className="font-mono-data text-foreground/70">{repoName}</span> passed the full CVE scan
          with zero known vulnerabilities across all analyzed dependencies. Keep your dependencies
          up-to-date to maintain this status.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <Link href="/" className="btn-secondary flex items-center gap-2">
          <ArrowLeft size={14} />
          Scan Another Repo
        </Link>
        <button className="btn-primary flex items-center gap-2">
          <RotateCcw size={14} />
          Re-scan Repository
        </button>
      </div>

      <p className="text-xs text-muted-foreground">
        Scanned against NVD CVE database · Last updated 2026-07-25
      </p>
    </div>
  );
}