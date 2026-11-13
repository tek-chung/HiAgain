import { Suspense } from "react";
import { Scanner } from "@/components/Scanner";

export const metadata = { title: "Scan" };

export default function ScanPage() {
  return (
    <section>
      <h1>Scan</h1>
      
      <Suspense>
        <Scanner />
      </Suspense>
    </section>
  );
}
