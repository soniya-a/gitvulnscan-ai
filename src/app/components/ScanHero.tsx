'use client';

import React, { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import {
  Shield,
  GitBranch,
  Zap,
  Lock,
  AlertTriangle,
} from 'lucide-react';

import ScanInput from './ScanInput';
import ScanningState from './ScanningState';

interface ScanFormData {
  repo_url: string;
}

interface ScanResult {
  status: string;
  repo_url: string;
  total_vulnerabilities: number;
  severity_counts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
    unknown: number;
  };
  vulnerabilities: unknown[];
}

const FEATURE_PILLS = [
  { icon: Zap, label: 'AI-Powered Analysis' },
  { icon: Lock, label: 'CVE Database' },
  { icon: GitBranch, label: 'GitHub Integration' },
];

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';

export default function ScanHero() {
  const router = useRouter();

  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<ScanFormData>();

  const repoUrl = watch('repo_url', '');

  // =========================================================
  // REAL BACKEND SCAN
  // =========================================================

  const onSubmit = useCallback(
    async (data: ScanFormData) => {
      setScanError(null);
      setIsScanning(true);

      try {
        const cleanRepoUrl = data.repo_url.trim();

        console.log('Starting repository scan:', cleanRepoUrl);
        console.log('Backend:', API_BASE_URL);

        // -----------------------------------------------------
        // CALL REAL FASTAPI BACKEND
        // -----------------------------------------------------

        const response = await fetch(
          `${API_BASE_URL}/api/scan`,
          {
            method: 'POST',

            headers: {
              'Content-Type': 'application/json',
              Accept: 'application/json',
            },

            body: JSON.stringify({
              repo_url: cleanRepoUrl,
            }),
          }
        );

        // -----------------------------------------------------
        // READ BACKEND RESPONSE
        // -----------------------------------------------------

        let result: ScanResult | null = null;

        try {
          result = await response.json();
        } catch {
          throw new Error(
            'Backend returned an invalid response.'
          );
        }

        // -----------------------------------------------------
        // HANDLE HTTP ERRORS
        // -----------------------------------------------------

        if (!response.ok) {
          const errorResult = result as unknown as {
            detail?: string | unknown;
          };

          let message = `Scan failed with status ${response.status}`;

          if (typeof errorResult?.detail === 'string') {
            message = errorResult.detail;
          } else if (errorResult?.detail) {
            message = JSON.stringify(errorResult.detail);
          }

          throw new Error(message);
        }

        if (!result) {
          throw new Error(
            'Backend returned an empty scan result.'
          );
        }

        // -----------------------------------------------------
        // VERIFY RESULT
        // -----------------------------------------------------

        if (result.status !== 'completed') {
          throw new Error(
            'The vulnerability scan did not complete successfully.'
          );
        }

        console.log('REAL SCAN RESULT:', result);
        console.log(
          'Vulnerabilities:',
          result.total_vulnerabilities
        );
        console.log(
          'Severity counts:',
          result.severity_counts
        );

        // -----------------------------------------------------
        // CREATE FRONTEND SCAN ID
        // -----------------------------------------------------

        const scanId = `scan-${Date.now()}`;

        // -----------------------------------------------------
        // SAVE REAL SCAN RESULT
        // -----------------------------------------------------

        sessionStorage.setItem(
          'vulnscan_result',
          JSON.stringify(result)
        );

        sessionStorage.setItem(
          'vulnscan_repo_url',
          cleanRepoUrl
        );

        sessionStorage.setItem(
          'vulnscan_scan_id',
          scanId
        );

        // -----------------------------------------------------
        // OPEN RESULTS PAGE
        // -----------------------------------------------------

        router.push(
          `/scan-results?scan_id=${encodeURIComponent(
            scanId
          )}&repo=${encodeURIComponent(cleanRepoUrl)}`
        );
      } catch (err: unknown) {
        console.error('Repository scan failed:', err);

        let message =
          'Failed to scan repository. Please try again.';

        if (err instanceof TypeError) {
          message =
            'Cannot connect to the VulnScanAI backend. Make sure FastAPI is running on port 8000.';
        } else if (err instanceof Error) {
          message = err.message;
        }

        setScanError(message);
        setIsScanning(false);
      }
    },
    [router]
  );

  // =========================================================
  // CANCEL LOADING UI
  // =========================================================

  const handleCancelScan = useCallback(() => {
    setIsScanning(false);
    setScanError(null);
  }, []);

  return (
    <section className="flex flex-col items-center text-center gap-8 pt-8 pb-4">

      {/* BADGE */}

      <div className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-xs text-primary font-medium">
        <Shield size={12} />
        AI-Powered Vulnerability Scanner
      </div>

      {/* HEADLINE */}

      <div className="flex flex-col gap-3 max-w-2xl">

        <h1 className="text-4xl lg:text-5xl font-bold text-foreground leading-tight tracking-tight">
          Scan repos for{' '}

          <span className="teal-gradient-text">
            CVE vulnerabilities
          </span>{' '}

          instantly
        </h1>

        <p className="text-base text-muted-foreground leading-relaxed max-w-lg mx-auto">
          Paste any public GitHub repository URL.
          VulnScanAI analyzes project dependencies using
          vulnerability intelligence and generates actionable
          security findings.
        </p>

      </div>

      {/* FEATURE PILLS */}

      <div className="flex items-center gap-3 flex-wrap justify-center">

        {FEATURE_PILLS.map((pill) => {
          const PillIcon = pill.icon;

          return (
            <div
              key={pill.label}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border text-xs text-muted-foreground"
            >
              <PillIcon
                size={12}
                className="text-primary"
              />

              {pill.label}
            </div>
          );
        })}

      </div>

      {/* SCANNER */}

      {isScanning ? (

        <ScanningState
          repoUrl={repoUrl}
          onCancel={handleCancelScan}
        />

      ) : (

        <div className="w-full max-w-2xl flex flex-col gap-3">

          <form
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col sm:flex-row gap-3"
          >

            <ScanInput
              register={register}
              error={errors.repo_url?.message}
              disabled={isScanning}
            />

            <button
              type="submit"
              disabled={
                isScanning ||
                !repoUrl.trim()
              }
              className="btn-primary whitespace-nowrap flex items-center gap-2 justify-center sm:w-auto w-full glow-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >

              <Shield size={16} />

              Scan Repository

            </button>

          </form>

          {/* FORM ERROR */}

          {errors.repo_url && (

            <p className="text-sm text-severity-critical flex items-center gap-1.5 text-left">

              <AlertTriangle size={14} />

              {errors.repo_url.message}

            </p>

          )}

          {/* BACKEND ERROR */}

          {scanError && (

            <div className="flex items-start gap-3 p-4 rounded-lg border border-severity-critical/30 bg-severity-critical/10 text-sm text-left">

              <AlertTriangle
                size={18}
                className="text-severity-critical mt-0.5 shrink-0"
              />

              <div className="flex flex-col gap-1">

                <span className="text-severity-critical font-semibold">
                  Scan Failed
                </span>

                <span className="text-muted-foreground break-words">
                  {scanError}
                </span>

              </div>

            </div>

          )}

          <p className="text-xs text-muted-foreground">
            Supports public GitHub repositories.
            Scan time depends on repository size and dependency count.
          </p>

        </div>

      )}

      {/* TECHNOLOGY STATS */}

      <div className="flex items-center gap-8 pt-2">

        {[
          {
            value: 'NVD',
            label: 'CVE Intelligence',
          },
          {
            value: 'OWASP',
            label: 'Dependency Analysis',
          },
          {
            value: 'AI',
            label: 'Fix Assistance',
          },
        ].map((stat) => (

          <div
            key={stat.label}
            className="flex flex-col items-center gap-0.5"
          >

            <span className="text-xl font-bold text-primary font-mono-data">
              {stat.value}
            </span>

            <span className="text-xs text-muted-foreground">
              {stat.label}
            </span>

          </div>

        ))}

      </div>

    </section>
  );
}