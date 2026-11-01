import { Suspense } from "react";
import { signOut } from "@/app/auth/actions";
import { requireUser } from "@/lib/auth";

// 画面の枠（ヘッダーなど）は事前に作っておいてすぐ表示し、
// ログイン情報が必要な部分だけを <Suspense> の中で後から流し込む（Next.js 16 の Cache Components）
export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-10">
      <header className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-bold">🍺 今夜のおつまみ</h1>
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg border border-zinc-300 px-3 py-1.5 text-sm hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
          >
            ログアウト
          </button>
        </form>
      </header>

      <Suspense fallback={<p className="mt-10 h-7 w-48 animate-pulse rounded bg-zinc-200 dark:bg-zinc-800" />}>
        <Greeting />
      </Suspense>

      <p className="mt-2 text-zinc-600 dark:text-zinc-400">
        ここにおつまみ提案の画面を作っていきます。
      </p>
    </main>
  );
}

async function Greeting() {
  const user = await requireUser();
  return <p className="mt-10 text-lg">ようこそ、{user.name ?? user.email} さん</p>;
}
