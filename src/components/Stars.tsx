/** ★の数で評価を表示する（1〜5、小数は四捨五入） */
export function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  const rounded = Math.min(5, Math.max(0, Math.round(rating)));
  return (
    <span className={`text-amber-500 ${className}`} aria-label={`評価 ${rating.toFixed(1)} / 5`}>
      {"★".repeat(rounded)}
      <span className="text-zinc-300 dark:text-zinc-700">{"★".repeat(5 - rounded)}</span>
    </span>
  );
}
