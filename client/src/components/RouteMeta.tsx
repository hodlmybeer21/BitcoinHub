// Sets per-route <title>, description, OG/Twitter tags and a canonical link (audit I3).
// Pages that render their own <Helmet> (e.g. /laws) override these since they mount later.
// index.html keeps static defaults for crawlers that don't run JS; once React mounts we drop
// those static copies so each tag exists once (Helmet's copies carry data-rh).
const MANAGED = [
  'meta[name="description"]', 'link[rel="canonical"]', 'meta[property="og:title"]',
  'meta[property="og:description"]', 'meta[property="og:url"]',
  'meta[name="twitter:title"]', 'meta[name="twitter:description"]',
].map((s) => `${s}:not([data-rh])`).join(",");
import { useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useLocation } from "wouter";
import { metaForPath } from "@/lib/routeMeta";

export default function RouteMeta() {
  const [location] = useLocation();
  const m = metaForPath(location);
  useEffect(() => {
    document.head.querySelectorAll(MANAGED).forEach((el) => el.remove());
  }, []);
  return (
    <Helmet>
      <title>{m.title}</title>
      <meta name="description" content={m.description} />
      <link rel="canonical" href={m.canonical} />
      <meta property="og:title" content={m.title} />
      <meta property="og:description" content={m.description} />
      <meta property="og:url" content={m.canonical} />
      <meta name="twitter:title" content={m.title} />
      <meta name="twitter:description" content={m.description} />
      {m.noindex && <meta name="robots" content="noindex" />}
    </Helmet>
  );
}
