import Link from 'next/link';
import { GraduationCap, ShieldCheck, BookOpenCheck, Bus, ClipboardCheck } from 'lucide-react';

const HIGHLIGHTS = [
  { icon: ClipboardCheck, text: 'Attendance and grades live after every class' },
  { icon: BookOpenCheck, text: 'Half-yearly gradebook with printable report cards' },
  { icon: ShieldCheck, text: 'Fees, receipts and dues — all in one ledger' },
  { icon: Bus, text: 'Route, stop and driver details at your fingertips' },
];

/** Split-screen auth backdrop used by the login page. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-brand-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-aurora-deep" aria-hidden />
        <div className="absolute inset-0 bg-grid-fine bg-grid opacity-50" aria-hidden />

        <Link href="/" className="relative flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-brand-800 text-signal-300">
            <GraduationCap className="h-6 w-6" aria-hidden />
          </span>
          <span className="leading-tight">
            <span className="block font-display text-lg font-semibold">Aurora School</span>
            <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-brand-300">
              Est. 1998 · Dhaka
            </span>
          </span>
        </Link>

        <div className="relative">
          <h1 className="font-display text-4xl leading-[1.05] xl:text-5xl">
            Every child,
            <br />
            <span className="text-signal-300">known by name.</span>
          </h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-brand-100/90">
            One sign-in for the whole school — staff mark attendance and enter marks, parents follow
            results and fees from home.
          </p>
          <ul className="mt-8 space-y-3">
            {HIGHLIGHTS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.text} className="flex items-center gap-3 text-sm text-brand-100">
                  <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/5 text-brand-300">
                    <Icon className="h-4 w-4" aria-hidden />
                  </span>
                  {item.text}
                </li>
              );
            })}
          </ul>
        </div>

        <p className="relative text-[10px] uppercase tracking-[0.25em] text-brand-400">
          Learn · Lead · Shine
        </p>
      </div>

      {/* Form panel */}
      <div className="relative flex items-center justify-center bg-frost px-4 py-12 sm:px-8">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
