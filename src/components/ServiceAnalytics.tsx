"use client";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { GA_ID, analyticsPage, analyticsRestrictions } from "@/lib/analytics-privacy";

type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  baratrustAnalyticsStarted?: boolean;
};

export default function ServiceAnalytics() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);
  useEffect(() => {
    if (!pathname) return;
    const target = window as AnalyticsWindow;
    // Preserve Google's browser opt-out behavior. Do not read form or account state.
    if ((window as unknown as Record<string, unknown>)["ga-disable-" + GA_ID] === true) return;
    target.dataLayer = target.dataLayer || [];
    target.gtag = target.gtag || function () { target.dataLayer!.push(arguments); };
    const gtag = target.gtag;
    const page = analyticsPage(pathname, document.referrer);

    if (!target.baratrustAnalyticsStarted) {
      target.baratrustAnalyticsStarted = true;
      gtag("js", new Date());
      gtag("set", { ...analyticsRestrictions, ...page });
      gtag("config", GA_ID, { ...analyticsRestrictions, ...page });
      const script = document.createElement("script");
      script.id = "baratrust-google-analytics";
      script.async = true;
      script.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_ID;
      document.head.appendChild(script);
    } else {
      gtag("set", page);
      gtag("config", GA_ID, { ...analyticsRestrictions, ...page, update: true });
    }

    if (lastPath.current !== pathname) {
      gtag("event", "page_view", { ...page, send_to: GA_ID });
      lastPath.current = pathname;
    }
  }, [pathname]);
  return null;
}
