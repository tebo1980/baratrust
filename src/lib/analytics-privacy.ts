// Only fixed public-page labels and recognized referral origins enter this payload.
// Never pass form fields, account IDs, client files, arbitrary titles, or raw URLs.
export const GA_ID = "G-YWB4NTYLR8";

const pages: Record<string, string> = {
  "/": "BaraTrust",
  "/service-terms": "BaraTrust Service Terms",
  "/privacy": "BaraTrust Privacy Policy",
  "/thank-you": "BaraTrust Inquiry Confirmation",
};
const referralOrigins: Record<string, string> = {
  "www.google.com": "https://www.google.com/",
  "google.com": "https://www.google.com/",
  "www.bing.com": "https://www.bing.com/",
  "bing.com": "https://www.bing.com/",
  "duckduckgo.com": "https://duckduckgo.com/",
  "www.facebook.com": "https://www.facebook.com/",
  "m.facebook.com": "https://www.facebook.com/",
  "l.facebook.com": "https://www.facebook.com/",
  "www.instagram.com": "https://www.instagram.com/",
  "l.instagram.com": "https://www.instagram.com/",
  "www.linkedin.com": "https://www.linkedin.com/",
  "t.co": "https://t.co/",
};

export function analyticsPage(pathname: string, referrer: string) {
  const route = Object.prototype.hasOwnProperty.call(pages, pathname) ? pathname : "/other";
  let source = "";
  try {
    const url = new URL(referrer);
    if (url.protocol === "https:" || url.protocol === "http:") {
      source = Object.prototype.hasOwnProperty.call(referralOrigins, url.hostname) ? referralOrigins[url.hostname] : "";
    }
  } catch { /* Empty or invalid referrers are omitted. */ }
  return {
    page_location: "https://www.baratrust.com" + route,
    page_title: pages[route] || "BaraTrust Other Page",
    page_referrer: source,
  };
}

export const analyticsRestrictions = {
  send_page_view: false,
  allow_google_signals: false,
  allow_ad_personalization_signals: false,
  user_id: null,
  user_properties: {},
};
