'use client';
// Owner: D. Scope switcher in the masthead; the active scope gets a 2px Gold underline.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export interface Scope { href: string; label: string; match: string }

export function ScopeLinks({ scopes }: { scopes: Scope[] }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Scope" className="flex h-full items-stretch">
      {scopes.map((s) => {
        const active = pathname.startsWith(s.match);
        return (
          <Link
            key={s.href}
            href={s.href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center border-b-2 px-3 text-primary-foreground hover:bg-primary-hover',
              active ? 'border-gold font-semibold' : 'border-transparent',
            )}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
