"use client";
import { getBrowserClient } from "@/lib/supabase/client";

export type FunnelStep =
  | "guest_nudge_shown" | "guest_nudge_click" | "linkedin_prompt_saved" | "review_opened"
  | "match_copy_message" | "match_open_linkedin" | "event_qr_shown" | "install_click";

/**
 * Adds one to today's count for a step. No user, device or page identifiers are sent or stored.
 * Best effort: never throws and never blocks what the person is doing.
 */
export function logFunnel(step: FunnelStep, onceKey?: string): void {
  try {
    if (onceKey) {
      const k = `hiagain:funnel:${step}:${onceKey}`;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    }
  } catch { /* storage unavailable: count anyway */ }
  void Promise.resolve(getBrowserClient()?.rpc("log_funnel", { p_kind: step })).catch(() => {});
}
