// Shared constants for agent modes — browser-safe (no Node.js imports).
// agentRunner.ts and page.tsx both import from here.

export const ALLOWED_MODES = [
  "scan",
  "oferta",
  "ofertas",
  "pipeline",
  "tracker",
  "auto-pipeline",
  "deep",
  "apply",
  "project",
  "patterns",
  "contacto",
  "interview-prep",
  "pdf",
  "batch",
  "training",
] as const;

export type AllowedMode = (typeof ALLOWED_MODES)[number];

export const MODE_LABELS: Record<AllowedMode, string> = {
  scan: "Scan Portals",
  oferta: "Evaluate Offer",
  ofertas: "Compare Offers",
  pipeline: "Process Pipeline",
  tracker: "Tracker Overview",
  "auto-pipeline": "Auto Pipeline",
  deep: "Deep Research",
  apply: "Apply Assistant",
  project: "Evaluate Project",
  patterns: "Rejection Patterns",
  contacto: "LinkedIn Outreach",
  "interview-prep": "Interview Prep",
  pdf: "Generate CV PDF",
  batch: "Batch Process",
  training: "Evaluate Training",
};
