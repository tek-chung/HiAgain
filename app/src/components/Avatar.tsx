export function Avatar({ name, src, size }: { name: string; src: string | null; size?: "lg" }) {
  const initials = name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]?.toUpperCase() ?? "").join("") || "?";
  return (
    <div className={"avatar" + (size ? ` ${size}` : "")} aria-hidden="true">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {src ? <img src={src} alt="" referrerPolicy="no-referrer" /> : initials}
    </div>
  );
}

export function LinkedInLink({ url, name }: { url: string | null; name: string }) {
  if (!url) return null;
  return (
    <a className="li" href={url} target="_blank" rel="noopener noreferrer" aria-label={`${name || "This person"} on LinkedIn (opens LinkedIn)`}>
      in
    </a>
  );
}
