// Owner: D (WP-2). Chooses the frame around a page: the sign-in page at `/` stands alone, every other
// page gets the skip link, masthead and scope side nav. The footer is added by AppShell on both.
'use client';

import { usePathname } from 'next/navigation';

interface ShellFrameProps {
  readonly masthead: React.ReactNode;
  readonly sideNav: React.ReactNode;
  readonly children: React.ReactNode;
}

export function ShellFrame({ masthead, sideNav, children }: ShellFrameProps) {
  if (usePathname() === '/') {
    return <main id="main-content" tabIndex={-1} className="flex flex-1 flex-col">{children}</main>;
  }
  return (
    <>
      <a href="#main-content" className="sr-only z-10 rounded-md bg-background px-4 py-2 text-primary focus:not-sr-only focus:absolute focus:left-4 focus:top-2">
        Skip to content
      </a>
      {masthead}
      <div className="flex flex-1 flex-col md:flex-row">
        {sideNav}
        <main id="main-content" tabIndex={-1} className="mx-auto w-full min-w-0 max-w-[1280px] flex-1 p-6">{children}</main>
      </div>
    </>
  );
}
