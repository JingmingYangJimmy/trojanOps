'use client';
// Owner: D. Per-scope side nav: white, 1px right border; active item has a 3px Cardinal left bar.
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export function SideNav({ items, label }: { items: Array<{ href: string; label: string }>; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="w-56 shrink-0 border-r border-sidebar-border bg-sidebar py-4">
      <ul>
        {items.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'block border-l-[3px] px-4 py-2 hover:bg-sidebar-accent',
                  active ? 'border-primary font-semibold' : 'border-transparent',
                )}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
