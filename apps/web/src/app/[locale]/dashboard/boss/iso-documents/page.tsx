"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";

/**
 * Legacy route: redirect to Boss home with ISO Overview tab.
 * Keeps old links /dashboard/boss/iso-documents working.
 */
export default function BossIsoDocumentsRedirectPage() {
  const router = useRouter();
  const locale = useLocale();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tab = searchParams?.get("tab");
    const query = tab ? `?tab=${encodeURIComponent(tab)}` : "?tab=isoOverview";
    router.replace(`/${locale}/dashboard/boss${query}`);
  }, [router, locale, searchParams]);

  return null;
}
