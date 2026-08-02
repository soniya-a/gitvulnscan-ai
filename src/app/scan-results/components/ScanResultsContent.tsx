'use client';

import React, {
  useState,
  useEffect,
  useCallback,
} from 'react';

import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  RefreshCw,
  Shield,
  AlertTriangle,
} from 'lucide-react';

import Link from 'next/link';

import ScanMetaHeader from './ScanMetaHeader';
import VulnMetricCards from './VulnMetricCards';
import ResultsTable from './ResultsTable';
import ScanResultsSkeleton from './ScanResultsSkeleton';
import ScanEmptyState from './ScanEmptyState';
import DashboardHeader from "./DashboardHeader";
import { type ScanResult } from '@/api/client';

// ============================================================
// BACKEND TYPES
// ============================================================

interface BackendVulnerability {
  cve_id?: string;
  dependency?: string;
  package_name?: string;

  severity?: string;

  description?: string;

  suggested_fix?: string;
  fix_suggestion?: string;
  fix_confidence?: string;

  installed_version?: string;
  fixed_version?: string;

  cvss_score?: number;
  published_date?: string;

  reference_url?: string;
}

interface BackendScanResult {
  status: string;

  repo_url: string;

  total_vulnerabilities: number;

  // REAL VALUES FROM FASTAPI
  dependencies_scanned?: number;
  duration_seconds?: number;

  severity_counts?: {
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
    unknown?: number;
  };

  vulnerabilities?: BackendVulnerability[];
}

// ============================================================
// PARSE DEPENDENCY
// Example:
// axios:1.15.2
// @babel/core:7.29.0
// ============================================================

function parseDependency(dependency?: string) {
  if (!dependency) {
    return {
      packageName: 'Unknown package',
      installedVersion: 'Unknown',
    };
  }

  const lastColon = dependency.lastIndexOf(':');

  if (lastColon === -1) {
    return {
      packageName: dependency,
      installedVersion: 'Unknown',
    };
  }

  return {
    packageName: dependency.substring(
      0,
      lastColon
    ),

    installedVersion: dependency.substring(
      lastColon + 1
    ),
  };
}

// ============================================================
// CONVERT FASTAPI RESULT -> FRONTEND RESULT
// ============================================================

function convertBackendResult(
  backend: BackendScanResult,
  scanId: string
): ScanResult {
  const backendVulnerabilities =
    backend.vulnerabilities ?? [];

  const vulnerabilities =
    backendVulnerabilities.map(
      (vulnerability) => {
        const parsed = parseDependency(
          vulnerability.dependency
        );

        return {
          cve_id:
            vulnerability.cve_id ??
            'UNKNOWN',

          package_name:
            vulnerability.package_name ??
            parsed.packageName,

          installed_version:
            vulnerability.installed_version ??
            parsed.installedVersion,

          fixed_version:
            vulnerability.fixed_version ??
            'Check advisory',

          severity: (
            vulnerability.severity ??
            'UNKNOWN'
          ).toUpperCase(),

          description:
            vulnerability.description ??
            'No vulnerability description available.',

          fix_suggestion:
            vulnerability.fix_suggestion ??
            vulnerability.suggested_fix ??
            'AI remediation pending',

          fix_confidence:
            vulnerability.fix_confidence,

          cvss_score:
            vulnerability.cvss_score ??
            0,

          published_date:
            vulnerability.published_date ??
            '',
        };
      }
    );

  const severity =
    backend.severity_counts ?? {};

  // ==========================================================
  // IMPORTANT:
  // THESE NOW USE REAL BACKEND VALUES
  // ==========================================================

  const realDuration =
    Number(backend.duration_seconds) || 0;

  const realDependencies =
    Number(backend.dependencies_scanned) || 0;

  const realTotalVulnerabilities =
    Number(
      backend.total_vulnerabilities
    ) || vulnerabilities.length;

  console.log(
    '================================'
  );

  console.log(
    'BACKEND duration:',
    backend.duration_seconds
  );

  console.log(
    'BACKEND dependencies:',
    backend.dependencies_scanned
  );

  console.log(
    'BACKEND vulnerabilities:',
    backend.total_vulnerabilities
  );

  console.log(
    '================================'
  );

  return {
    scan_id: scanId,

    repo_url: backend.repo_url,

    status: 'completed',

    scanned_at:
      new Date().toISOString(),

    // REAL BACKEND VALUE
    duration_seconds: realDuration,

    // REAL BACKEND VALUE
    dependencies_scanned:
      realDependencies,

    total_vulnerabilities:
      realTotalVulnerabilities,

    summary: {
      critical:
        severity.critical ?? 0,

      high:
        severity.high ?? 0,

      medium:
        severity.medium ?? 0,

      low:
        severity.low ?? 0,
    },

    vulnerabilities,
  } as ScanResult;
}

// ============================================================
// COMPONENT
// ============================================================

export default function ScanResultsContent() {
  const searchParams =
    useSearchParams();

  const scanId =
    searchParams.get('scan_id');

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState<string | null>(null);

  const [scanResult, setScanResult] =
    useState<ScanResult | null>(null);

  // ==========================================================
  // LOAD RESULT FROM SESSION STORAGE
  // ==========================================================

  const loadResults =
    useCallback(() => {
      setLoading(true);
      setError(null);

      try {
        if (!scanId) {
          throw new Error(
            'No scan ID was provided.'
          );
        }

        const storedResult =
          sessionStorage.getItem(
            'vulnscan_result'
          );

        if (!storedResult) {
          throw new Error(
            'No scan result was found. Please run a new repository scan.'
          );
        }

        const backendResult: BackendScanResult =
          JSON.parse(storedResult);

        console.log(
          'REAL FASTAPI RESULT:',
          backendResult
        );

        const convertedResult =
          convertBackendResult(
            backendResult,
            scanId
          );

        console.log(
          'FINAL RESULT SENT TO UI:',
          convertedResult
        );

        setScanResult(
          convertedResult
        );
      } catch (err: unknown) {
        console.error(
          'Failed to load scan result:',
          err
        );

        const message =
          err instanceof Error
            ? err.message
            : 'Failed to load scan results.';

        setError(message);
      } finally {
        setLoading(false);
      }
    }, [scanId]);

  // ==========================================================
  // LOAD WHEN PAGE OPENS
  // ==========================================================

  useEffect(() => {
    loadResults();
  }, [loadResults]);

  // ==========================================================
  // NO SCAN ID
  // ==========================================================

  if (!scanId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-6">

        <div className="w-16 h-16 rounded-2xl bg-muted border border-border flex items-center justify-center">

          <Shield
            size={28}
            className="text-muted-foreground"
          />

        </div>

        <div className="text-center flex flex-col gap-2">

          <h2 className="text-lg font-semibold text-foreground">
            No scan selected
          </h2>

          <p className="text-sm text-muted-foreground max-w-sm">
            Run a repository scan first to view vulnerability results.
          </p>

        </div>

        <Link
          href="/"
          className="btn-primary flex items-center gap-2"
        >
          <ArrowLeft size={16} />
          Back to Scanner
        </Link>

      </div>
    );
  }

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return <ScanResultsSkeleton />;
  }

  // ==========================================================
  // ERROR
  // ==========================================================

  if (error) {
    return (
      <div className="flex flex-col gap-4">

        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground w-fit"
        >
          <ArrowLeft size={14} />
          Back to Scanner
        </Link>

        <div className="card-elevated p-6 flex flex-col items-center gap-4 text-center max-w-lg mx-auto mt-8">

          <AlertTriangle
            size={28}
            className="text-severity-critical"
          />

          <div>

            <h3 className="font-semibold text-foreground">
              Failed to load results
            </h3>

            <p className="text-sm text-muted-foreground mt-1">
              {error}
            </p>

          </div>

          <button
            onClick={loadResults}
            className="btn-primary flex items-center gap-2"
          >
            <RefreshCw size={15} />
            Retry
          </button>

        </div>

      </div>
    );
  }

  if (!scanResult) {
    return null;
  }

  // ==========================================================
  // REAL RESULTS
  // ==========================================================

  return (
    <div className="flex flex-col gap-6 fade-in">

      <Link
        href="/"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
      >
        <ArrowLeft size={14} />
        Back to Scanner
      </Link>

      <DashboardHeader result={scanResult} />

      <VulnMetricCards
        result={scanResult}
      />

      {scanResult.total_vulnerabilities ===
      0 ? (

        <ScanEmptyState
          repoUrl={
            scanResult.repo_url
          }
        />

      ) : (

        <ResultsTable
          vulnerabilities={
            scanResult.vulnerabilities
          }
        />

      )}

    </div>
  );
}