'use client';

import React, { useEffect, useState } from 'react';
import { X, Shield } from 'lucide-react';

interface ScanningStateProps {
  repoUrl: string;
  onCancel: () => void;
}

const SCAN_STEPS = [
  { id: 'step-clone', label: 'Cloning repository', duration: 1200 },
  { id: 'step-deps', label: 'Parsing dependency manifests', duration: 900 },
  { id: 'step-cve', label: 'Querying CVE database', duration: 1100 },
  { id: 'step-ai', label: 'Generating AI fix suggestions', duration: 1300 },
];

export default function ScanningState({ repoUrl, onCancel }: ScanningStateProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  useEffect(() => {
    let stepIndex = 0;
    let totalDelay = 0;

    SCAN_STEPS.forEach((step, index) => {
      const startTimer = setTimeout(() => {
        setCurrentStep(index);
      }, totalDelay);

      totalDelay += step.duration;

      const endTimer = setTimeout(() => {
        setCompletedSteps((prev) => [...prev, index]);
      }, totalDelay - 100);

      return () => {
        clearTimeout(startTimer);
        clearTimeout(endTimer);
      };
    });
  }, []);

  const repoName = repoUrl.replace('https://github.com/', '').split('/').slice(0, 2).join('/');

  return (
    <div className="w-full max-w-2xl card-elevated p-6 flex flex-col gap-5 glow-primary slide-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/30 flex items-center justify-center">
            <Shield size={18} className="text-primary animate-scan-pulse" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">Scanning repository…</p>
            <p className="text-xs text-muted-foreground font-mono-data truncate max-w-[240px]">
              {repoName || repoUrl}
            </p>
          </div>
        </div>
        <button
          onClick={onCancel}
          className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors duration-150"
          aria-label="Cancel scan"
        >
          <X size={16} />
        </button>
      </div>

      {/* Progress bar */}
      <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
        <div
          className="h-full bg-primary rounded-full transition-all duration-700"
          style={{ width: `${((completedSteps.length) / SCAN_STEPS.length) * 100}%` }}
        />
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-2.5">
        {SCAN_STEPS.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isActive = currentStep === index && !isCompleted;

          return (
            <div key={step.id} className="flex items-center gap-3">
              {/* Step indicator */}
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 border transition-all duration-300 ${
                  isCompleted
                    ? 'bg-primary/20 border-primary'
                    : isActive
                    ? 'border-primary animate-scan-pulse' :'border-border'
                }`}
              >
                {isCompleted ? (
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M2 5l2.5 2.5L8 3" stroke="var(--primary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                ) : isActive ? (
                  <div className="w-2 h-2 rounded-full bg-primary" />
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-border" />
                )}
              </div>

              {/* Step label */}
              <span
                className={`text-sm transition-colors duration-300 ${
                  isCompleted
                    ? 'text-primary'
                    : isActive
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                }`}
              >
                {step.label}
                {isActive && (
                  <span className="ml-1 text-primary blink-cursor">_</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-xs text-muted-foreground text-center">
        This typically takes 30–90 seconds depending on repository size
      </p>
    </div>
  );
}