/**
 * ScoreBadge — displays a numeric fit score (0–5 scale) with colour-coded styling:
 *   ≥ 4.5  →  green  (strong fit)
 *   4.0–4.4 → blue   (good fit)
 *   3.5–3.9 → yellow (moderate fit)
 *   < 3.5   → red    (weak fit)
 */

function getStyle(score: number): {
  bg: string;
  text: string;
  border: string;
} {
  if (score >= 4.5)
    return {
      bg: "bg-green-500/20",
      text: "text-green-400",
      border: "border-green-500/40",
    };
  if (score >= 4.0)
    return {
      bg: "bg-blue-500/20",
      text: "text-blue-400",
      border: "border-blue-500/40",
    };
  if (score >= 3.5)
    return {
      bg: "bg-yellow-500/20",
      text: "text-yellow-400",
      border: "border-yellow-500/40",
    };
  return {
    bg: "bg-red-500/20",
    text: "text-red-400",
    border: "border-red-500/40",
  };
}

export function ScoreBadge({ score }: { score: number }) {
  const { bg, text, border } = getStyle(score);

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tabular-nums",
        bg,
        text,
        border,
      ].join(" ")}
      title={`Fit score: ${score}/5`}
    >
      {score.toFixed(1)}
    </span>
  );
}

/** Default export for backward compatibility with existing imports. */
export default ScoreBadge;
