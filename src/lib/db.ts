/**
 * PostgreSQL connection pool and all database query functions.
 * Schema: scans + vulnerabilities tables as defined in PROJECT_CONTEXT.md
 */
import pkg from 'pg';
const { Pool } = pkg;
import type { PoolClient } from 'pg';

// Singleton pool — reused across serverless invocations
let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not set');
    }
    pool = new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

// ─── Types matching the DB schema ────────────────────────────────────────────

export interface ScanRow {
  id: number;
  repo_url: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_vulns: number;
  scan_date: string;
  duration_ms: number | null;
}

export interface VulnerabilityRow {
  id: number;
  scan_id: number;
  cve_id: string;
  dependency: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  suggested_fix: string;
  fix_confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  created_at: string;
}

// ─── Schema initialisation ────────────────────────────────────────────────────

/**
 * Creates the scans and vulnerabilities tables if they do not already exist.
 * Safe to call on every cold start.
 */
export async function initDb(): Promise<void> {
  const client: PoolClient = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS scans (
        id          SERIAL PRIMARY KEY,
        repo_url    VARCHAR(500) NOT NULL,
        status      VARCHAR(50)  DEFAULT 'pending',
        total_vulns INTEGER      DEFAULT 0,
        scan_date   TIMESTAMP    DEFAULT NOW(),
        duration_ms INTEGER
      );
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS vulnerabilities (
        id              SERIAL PRIMARY KEY,
        scan_id         INTEGER REFERENCES scans(id) ON DELETE CASCADE,
        cve_id          VARCHAR(50),
        dependency      VARCHAR(255),
        severity        VARCHAR(20),
        description     TEXT,
        suggested_fix   TEXT,
        fix_confidence  VARCHAR(20),
        created_at      TIMESTAMP DEFAULT NOW()
      );
    `);
  } finally {
    client.release();
  }
}

// ─── Scan CRUD ────────────────────────────────────────────────────────────────

/**
 * Inserts a new scan record with status 'pending' and returns the new scan id.
 */
export async function createScan(repoUrl: string): Promise<number> {
  const result = await getPool().query<{ id: number }>(
    `INSERT INTO scans (repo_url, status) VALUES ($1, 'pending') RETURNING id`,
    [repoUrl]
  );
  return result.rows[0].id;
}

/**
 * Updates the status, total_vulns, and duration_ms of an existing scan.
 */
export async function updateScan(
  scanId: number,
  status: ScanRow['status'],
  totalVulns: number,
  durationMs: number
): Promise<void> {
  await getPool().query(
    `UPDATE scans SET status = $1, total_vulns = $2, duration_ms = $3 WHERE id = $4`,
    [status, totalVulns, durationMs, scanId]
  );
}

/**
 * Fetches a single scan row by id. Returns null if not found.
 */
export async function getScanById(scanId: number): Promise<ScanRow | null> {
  const result = await getPool().query<ScanRow>(
    `SELECT id, repo_url, status, total_vulns, scan_date, duration_ms FROM scans WHERE id = $1`,
    [scanId]
  );
  return result.rows[0] ?? null;
}

/**
 * Returns all scans ordered by most recent first (for the history endpoint).
 */
export async function getAllScans(): Promise<ScanRow[]> {
  const result = await getPool().query<ScanRow>(
    `SELECT id, repo_url, status, total_vulns, scan_date, duration_ms
     FROM scans
     ORDER BY scan_date DESC`
  );
  return result.rows;
}

// ─── Vulnerability CRUD ───────────────────────────────────────────────────────

/**
 * Inserts a single vulnerability record linked to a scan.
 */
export async function saveVulnerability(
  scanId: number,
  vuln: Omit<VulnerabilityRow, 'id' | 'scan_id' | 'created_at'>
): Promise<void> {
  await getPool().query(
    `INSERT INTO vulnerabilities
       (scan_id, cve_id, dependency, severity, description, suggested_fix, fix_confidence)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      scanId,
      vuln.cve_id,
      vuln.dependency,
      vuln.severity,
      vuln.description,
      vuln.suggested_fix,
      vuln.fix_confidence,
    ]
  );
}

/**
 * Returns all vulnerabilities for a given scan id.
 */
export async function getVulnerabilitiesByScanId(
  scanId: number
): Promise<VulnerabilityRow[]> {
  const result = await getPool().query<VulnerabilityRow>(
    `SELECT id, scan_id, cve_id, dependency, severity, description, suggested_fix, fix_confidence, created_at
     FROM vulnerabilities
     WHERE scan_id = $1
     ORDER BY
       CASE severity
         WHEN 'CRITICAL' THEN 1 WHEN'HIGH'THEN 2 WHEN'MEDIUM'THEN 3 WHEN'LOW'      THEN 4
         ELSE 5
       END`,
    [scanId]
  );
  return result.rows;
}
