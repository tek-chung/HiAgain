import { Scanner } from "@/components/Scanner";

export const metadata = { title: "Scan" };

export default function ScanPage() {
  return (
    <section>
      <h1>Scan</h1>
      <p className="muted small">Point your camera at a Hi Again QR code.</p>
      <Scanner />
    </section>
  );
}
