'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { isNavItemActive, type NavItem } from './navigation';

export function SideNav({ items, label }: { items: NavItem[]; label: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label={label} className="w-full shrink-0 overflow-x-auto border-b border-sidebar-border bg-sidebar py-2 md:w-56 md:border-r md:border-b-0 md:py-4">
      <ul className="flex md:block">
        {items.map((item) => (
          <li key={item.href}>
            <NavLink item={item} active={isNavItemActive(pathname, item)} />
            {item.children && item.children.length > 0 && (
              // Below md the nav is a single scrolling row, so the nested links stay on the page itself.
              <ul aria-label={item.label} className="mb-2 hidden md:block">
                {item.children.map((child) => (
                  <li key={child.href}>
                    <NavLink item={child} active={isNavItemActive(pathname, child)} nested />
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

function NavLink({ item, active, nested = false }: { item: NavItem; active: boolean; nested?: boolean }) {
  return (
    <Link href={item.href} aria-current={active ? 'page' : undefined}
      className={cn(
        'block border-l-[3px] hover:bg-sidebar-accent',
        nested ? 'truncate py-1.5 pl-8 pr-4' : 'whitespace-nowrap px-4 py-2',
        active ? 'border-primary font-semibold' : 'border-transparent',
        nested && !active && 'text-muted-foreground hover:text-foreground',
      )}
      title={nested ? item.label : undefined}>
      {item.label}
    </Link>
  );
}
