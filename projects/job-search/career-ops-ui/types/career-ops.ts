/**
 * types/career-ops.ts
 *
 * Shared TypeScript types for career-ops-ui.
 */

export interface Application {
  id: string;
  company: string;
  role: string;
  /** Numeric score out of 5 (e.g. 4.1) */
  score: number;
  status: string;
  date: string;
  /** True if the role is fully remote */
  remote: boolean;
  /** Link to the evaluation report, if available */
  url: string;
}

export type ScoreRange = '<3.5' | '3.5–3.9' | '4.0–4.4' | '4.5+';

export interface ScoreDistributionEntry {
  range: ScoreRange;
  count: number;
  color: string;
}

export interface PipelineStatusEntry {
  status: string;
  count: number;
  color: string;
}
