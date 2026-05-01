"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type SmartBackLinkProps = {
  /** Default destination if no `?backTo=` param is present. */
  fallbackHref: string;
  /** Default label if no `?backLabel=` param is present. */
  fallbackLabel: string;
  className?: string;
};

/**
 * Renders a "← {label}" link. If the URL has `?backTo=<path>` (and optional
 * `&backLabel=<text>`), the link points there instead — used when navigating
 * to a page from inside a course so the back-arrow returns to the course
 * rather than the page's category index.
 */
export function SmartBackLink(props: SmartBackLinkProps) {
  return (
    <Suspense fallback={<FallbackLink {...props} />}>
      <Inner {...props} />
    </Suspense>
  );
}

function FallbackLink({
  fallbackHref,
  fallbackLabel,
  className,
}: SmartBackLinkProps) {
  return (
    <Link
      href={fallbackHref}
      className={
        className ??
        "text-sm text-muted-foreground hover:text-foreground"
      }
    >
      ← {fallbackLabel}
    </Link>
  );
}

function Inner({
  fallbackHref,
  fallbackLabel,
  className,
}: SmartBackLinkProps) {
  const searchParams = useSearchParams();
  const rawBackTo = searchParams.get("backTo");
  const rawBackLabel = searchParams.get("backLabel");

  // Only allow same-origin paths to prevent open-redirect.
  const backTo =
    rawBackTo && rawBackTo.startsWith("/") && !rawBackTo.startsWith("//")
      ? rawBackTo
      : null;

  const href = backTo ?? fallbackHref;
  const label = backTo ? rawBackLabel?.trim() || "Back" : fallbackLabel;

  return (
    <Link
      href={href}
      className={
        className ??
        "text-sm text-muted-foreground hover:text-foreground"
      }
    >
      ← {label}
    </Link>
  );
}
