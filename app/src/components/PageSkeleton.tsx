/** Instant placeholder while a page loads, so taps feel immediate. */
export function PageSkeleton({ title, rows = 4, qr = false }: { title?: string; rows?: number; qr?: boolean }) {
  return (
    <section data-loading aria-busy="true" aria-label={title ? `Loading ${title}` : "Loading"}>
      {title ? <h1 className="sk-title">{title}</h1> : <div className="sk sk-heading" />}
      {qr && <div className="sk sk-qr" />}
      {Array.from({ length: rows }, (_, i) => (
        <div className="sk-row" key={i}>
          <div className="sk sk-avatar" />
          <div style={{ flex: 1 }}>
            <div className="sk sk-line" style={{ width: `${70 - i * 8}%` }} />
            <div className="sk sk-line short" />
          </div>
        </div>
      ))}
    </section>
  );
}
