import Link from "next/link";
import { signOut } from "@/app/auth/actions";

/** ログイン後の全ページ共通のヘッダー */
export function AppHeader() {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <Link href="/" className="text-xl font-bold">
        🍺 今夜のおつまみ
      </Link>
      <nav className="flex items-center gap-2 text-sm">
        <Link href="/" className="rounded-lg px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          提案
        </Link>
        <Link href="/recipes" className="rounded-lg px-3 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800">
          履歴
        </Link>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            ログアウト
          </button>
        </form>
      </nav>
    </header>
  );
}
