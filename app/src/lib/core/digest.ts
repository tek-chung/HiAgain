// The next-day digest email. Counts only: it never names the people someone met and never hints at
// a one-sided Again. Pure, so it can be unit-tested.

export interface DigestInput {
  firstName: string | null;
  peopleCount: number;
  eventName: string | null;
  newMatches: number;
  siteUrl: string;
}

export interface DigestEmail {
  subject: string;
  text: string;
  html: string;
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function buildDigestEmail(d: DigestInput): DigestEmail {
  const site = d.siteUrl.replace(/\/+$/, "");
  const review = `${site}/review`;
  const settings = `${site}/me#notifications`;
  const hi = d.firstName ? `Hi ${d.firstName},` : "Hi,";
  const where = d.eventName ? ` at ${d.eventName}` : "";

  const lines: string[] = [];
  let subject: string;
  if (d.peopleCount > 0) {
    subject = d.eventName ? `Who from ${d.eventName} would you like to meet again?` : "Who would you like to meet again?";
    lines.push(`You met ${plural(d.peopleCount, "person", "people")}${where} yesterday. Who would you like to meet again? It's only revealed when it's mutual.`);
  } else {
    subject = "It's mutual: someone wants to meet again";
  }
  if (d.newMatches > 0) {
    lines.push(`${d.newMatches === 1 ? "You have a new mutual Again" : `You have ${d.newMatches} new mutual Agains`}. Make the next step while it's fresh.`);
  }
  const cta = d.peopleCount > 0 ? "Review the people you met" : "See your matches";
  const link = d.peopleCount > 0 ? review : `${site}/activity`;

  const text = [hi, "", ...lines, "", `${cta}: ${link}`, "", "Don't just meet. Meet again.", "",
    `You get this the morning after you meet people on Hi Again. Turn it off under My QR → Privacy and account: ${settings}`].join("\n");

  const html = `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1d1d1b;line-height:1.5;max-width:520px;margin:0 auto;padding:24px">
<p>${escapeHtml(hi)}</p>
${lines.map((l) => `<p>${escapeHtml(l)}</p>`).join("\n")}
<p><a href="${escapeHtml(link)}" style="display:inline-block;background:#28533e;color:#fff;text-decoration:none;padding:12px 18px;border-radius:10px;font-weight:600">${escapeHtml(cta)}</a></p>
<p style="color:#555">Don't just meet. Meet again.</p>
<p style="color:#777;font-size:13px">You get this the morning after you meet people on Hi Again. <a href="${escapeHtml(settings)}" style="color:#777">Turn it off</a> under My QR → Privacy and account.</p>
</body></html>`;

  return { subject, text, html };
}
