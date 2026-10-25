import Link from "next/link";
import { ButtonLink } from "@/components/ui/Button";
import { getSession } from "@/lib/auth";

export async function Nav() {
  let user: ReturnType<typeof Object.create> = null;
  try {
    const session = await getSession();
    user = session.user ?? null;
  } catch {
  }

  return (
    <header className="sticky top-0 z-50 border-b-[1.5px] border-ink bg-paper/90 backdrop-blur-sm">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 min-h-14 py-2 sm:py-0 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <Link
          href="/"
          className="no-underline flex items-center"
        >
          <img src="/tagless-full.png" alt="tagless" className="h-7 sm:h-9 w-auto" />
        </Link>
        <nav className="flex items-center gap-3 sm:gap-6 text-[13px] sm:text-sm font-medium">
          <Link href="/docs" className="text-ink-soft hover:text-magenta no-underline transition-colors duration-150">
            docs
          </Link>
          <Link href="/shop" className="text-ink-soft hover:text-magenta no-underline transition-colors duration-150">
            shop
          </Link>
          <Link href="/gallery" className="text-ink-soft hover:text-magenta no-underline transition-colors duration-150">
            gallery
          </Link>
          {user ? (
            <>
              <Link href="/submit" className="text-ink-soft hover:text-magenta no-underline transition-colors duration-150">
                dashboard
              </Link>
              <a
                href="/api/auth/logout"
                className="text-ink-soft hover:text-magenta no-underline text-[13px] transition-colors duration-150"
              >
                sign out
              </a>
            </>
          ) : (
            <ButtonLink href="/submit" variant="primary" className="text-[13px] py-2 px-4">
              ship it →
            </ButtonLink>
          )}
        </nav>
      </div>
    </header>
  );
}
