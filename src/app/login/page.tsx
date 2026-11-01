import { Suspense } from "react";
import { signInWithGoogle } from "@/app/auth/actions";

const ERROR_MESSAGES: Record<string, string> = {
  missing_code: "ログイン情報を受け取れませんでした。もう一度お試しください。",
  auth_failed: "ログインに失敗しました。もう一度お試しください。",
  oauth_start_failed: "Google ログインを開始できませんでした。",
};

// ログイン済みのユーザーがこのページを開いた場合は、proxy.ts でトップへ戻している
export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 text-center shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <p className="text-4xl" aria-hidden>
          🍺
        </p>
        <h1 className="mt-3 text-2xl font-bold">今夜のおつまみ</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          お酒と冷蔵庫の食材から、AIがおつまみを提案します
        </p>

        <Suspense>
          <ErrorMessage searchParams={searchParams} />
        </Suspense>

        <form action={signInWithGoogle} className="mt-6">
          <button
            type="submit"
            className="w-full rounded-lg bg-amber-500 px-4 py-3 font-semibold text-white transition hover:bg-amber-600"
          >
            Google でログイン
          </button>
        </form>
      </div>
    </main>
  );
}

async function ErrorMessage({ searchParams }: Pick<PageProps<"/login">, "searchParams">) {
  const { error } = await searchParams;
  if (typeof error !== "string") return null;

  return (
    <p role="alert" className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
      {ERROR_MESSAGES[error] ?? "エラーが発生しました。"}
    </p>
  );
}
