"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogoWordmark } from "./Logo";
import { ActivityIcon, PeopleIcon, QrIcon, ScanIcon } from "./Icons";

export function Shell({ children, signedIn, unread }: { children: React.ReactNode; signedIn: boolean; unread: number }) {
  const path = usePathname();
  const current = (p: string) => (path === p || path.startsWith(p + "/") ? "page" : undefined);
  return (
    <div className="shell">
      <header className="top">
        <Link href={signedIn ? "/me" : "/"} className="brand" aria-label="Hi Again home"><LogoWordmark height={28} title="" /></Link>
        <Link href="/scan" className="btn icon-btn plain" aria-label="Scan a QR code" aria-current={current("/scan")}>
          <ScanIcon />
        </Link>
      </header>
      <main>{children}</main>
      <nav className="nav" aria-label="Main">
        <Link href="/people" prefetch aria-current={current("/people")}><PeopleIcon />People</Link>
        <Link href="/activity" prefetch aria-current={current("/activity")} aria-label={unread ? `Activity, ${unread} unread` : "Activity"}>
          <span className="nav-icon">
            <ActivityIcon />
            {unread > 0 && <span className="nav-badge" aria-hidden="true">{unread > 99 ? "99+" : unread}</span>}
          </span>
          Activity
        </Link>
        <Link href="/me" prefetch aria-current={current("/me")}><QrIcon />My QR</Link>
      </nav>
    </div>
  );
}
