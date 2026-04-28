interface Props {
  provider: "claude" | "gemini";
  className?: string;
}

export function ProviderBadge({ provider, className = "" }: Props) {
  const label = provider === "claude" ? "Claude" : "Gemini";
  const dot = provider === "claude" ? "bg-[#d97706]" : "bg-[#3b82f6]";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-elevated px-2 py-0.5 text-xs font-medium text-text-primary ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
