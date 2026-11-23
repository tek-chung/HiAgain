"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { EVENT_NAME_MAX, eventTimesFromForm } from "@/lib/core/events";
import { countChars } from "@/lib/core/limits";

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function EventCreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [date, setDate] = useState(today);
  const [start, setStart] = useState("18:00");
  const [end, setEnd] = useState("21:00");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const create = async () => {
    setError(null);
    if (!name.trim()) return setError("Give the event a name people will recognise.");
    if (countChars(name.trim()) > EVENT_NAME_MAX) return setError(`Keep the name to ${EVENT_NAME_MAX} characters.`);
    const t = eventTimesFromForm(date, start, end);
    if (!t.ok) return setError(t.message);
    const supabase = getBrowserClient();
    if (!supabase) return setError("Creating events needs Supabase to be configured.");
    setBusy(true);
    const { data, error: e } = await supabase.rpc("create_event", {
      p_name: name, p_starts_at: t.startsAt.toISOString(), p_ends_at: t.endsAt.toISOString(),
    });
    setBusy(false);
    const row = Array.isArray(data) ? data[0] : null;
    if (e || !row) return setError("Couldn't create the event. Check your connection and try again.");
    if (row.status === "limit") return setError("You've created a lot of events today. Try again tomorrow.");
    if (row.status !== "created") return setError("Check the name, date and times.");
    router.push(`/e/${row.code}`);
  };

  return (
    <form className="card event-form" noValidate onSubmit={(e) => { e.preventDefault(); void create(); }}>
      <h2 style={{ fontSize: "1rem" }}>Create an event QR</h2>
      <label className="field">
        <span>Event name</span>
        <input type="text" value={name} maxLength={EVENT_NAME_MAX} onChange={(e) => setName(e.target.value)} placeholder="e.g. London Product Meetup" />
      </label>
      <label className="field">
        <span>Date</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <div className="row">
        <label className="field" style={{ flex: 1 }}>
          <span>Starts</span>
          <input type="time" value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span>Ends</span>
          <input type="time" value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      {error && <p className="field-error" role="alert">{error}</p>}
      <button type="submit" className="btn primary full" disabled={busy}>{busy ? "Creating…" : "Create event QR"}</button>
    </form>
  );
}
