'use client';
import { CircleAlert } from 'lucide-react';
import { PageHeader } from '@/components/shell/page-header';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ retry }: { retry: () => void }) {
  return <><PageHeader title="Agent templates" /><Alert variant="destructive"><CircleAlert aria-hidden="true" /><div><AlertTitle>Could not load templates</AlertTitle><AlertDescription>Check your connection and try again. If the problem continues, contact a USG administrator.</AlertDescription><Button type="button" className="mt-3" variant="secondary" onClick={retry}>Try again</Button></div></Alert></>;
}
