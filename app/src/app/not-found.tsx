import Link from "next/link";
export default function NotFound() {
  return (
    <section className="stack">
      <h1>Page not found</h1>
      <Link className="btn" href="/">Go to Hi Again</Link>
    </section>
  );
}
