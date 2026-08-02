import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';

export type Severity =
  | 'CRITICAL'
  | 'HIGH'
  | 'MEDIUM'
  | 'LOW'
  | 'UNKNOWN';

interface SeverityBadgeProps {
  severity?: string | null;
  size?: 'sm' | 'md';
}

const SEVERITY_CONFIG = {
  CRITICAL: {
    label: 'CRITICAL',
    icon: AlertCircle,
    className:
      'bg-severity-critical border-severity-critical text-severity-critical',
  },

  HIGH: {
    label: 'HIGH',
    icon: AlertTriangle,
    className:
      'bg-severity-high border-severity-high text-severity-high',
  },

  MEDIUM: {
    label: 'MEDIUM',
    icon: Info,
    className:
      'bg-severity-medium border-severity-medium text-severity-medium',
  },

  LOW: {
    label: 'LOW',
    icon: CheckCircle,
    className:
      'bg-severity-low border-severity-low text-severity-low',
  },

  UNKNOWN: {
    label: 'UNKNOWN',
    icon: HelpCircle,
    className:
      'bg-muted border-border text-muted-foreground',
  },
};

export default function SeverityBadge({
  severity,
  size = 'md',
}: SeverityBadgeProps) {
  const normalizedSeverity =
    severity?.toUpperCase() || 'UNKNOWN';

  const config =
    SEVERITY_CONFIG[
      normalizedSeverity as keyof typeof SEVERITY_CONFIG
    ] || SEVERITY_CONFIG.UNKNOWN;

  const SeverityIcon = config.icon;

  return (
    <span
      className={`severity-badge ${config.className} ${
        size === 'sm'
          ? 'text-[10px] px-1.5 py-0.5'
          : 'text-xs px-2 py-0.5'
      }`}
    >
      <SeverityIcon size={size === 'sm' ? 10 : 12} />
      {config.label}
    </span>
  );
}