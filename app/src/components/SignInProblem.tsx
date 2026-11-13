import { clampDetail, explainSignInError } from "@/lib/core/signin-errors";

/** Shown after a failed sign-in: what probably went wrong, plus the technical detail for setup. */
export function SignInProblem({ reason, detail }: { reason?: string | null; detail?: string | null }) {
  const d = clampDetail(detail);
  return (
    <div className="banner error" role="alert">
      <p style={{ margin: 0 }}>{explainSignInError(reason, d)}</p>
      {(reason || d) && (
        <p className="small" style={{ margin: ".4rem 0 0", opacity: 0.85 }}>
          Technical detail: <code>{[reason, d].filter(Boolean).join(" — ")}</code>
        </p>
      )}
    </div>
  );
}
