interface Props {
  passed: boolean;
  message?: string;
}

export function PassFailBanner({ passed, message }: Props) {
  if (passed) {
    return (
      <div className="flex items-center gap-3 rounded-md border border-[#166534] bg-[rgba(34,197,94,0.08)] px-4 py-3">
        <span className="font-mono text-pass">PASS</span>
        <span className="text-sm text-text-secondary">
          {message ?? "Review meets all quality thresholds."}
        </span>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 rounded-md border border-[#7f1d1d] bg-[rgba(239,68,68,0.08)] px-4 py-3">
      <span className="font-mono text-fail">FAIL</span>
      <span className="text-sm text-text-secondary">
        {message ?? "Review fell short on one or more dimensions."}
      </span>
    </div>
  );
}
