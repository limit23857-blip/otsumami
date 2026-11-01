import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/**
 * サーバー側（Server Component / Server Action / Route Handler）で使う Supabase クライアント。
 * リクエストごとに新しく作る（ユーザーごとに Cookie が違うため、使い回してはいけない）。
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Component からは Cookie を書けない。
            // セッションの更新は proxy.ts 側で行うので、ここでは無視してよい。
          }
        },
      },
    },
  );
}
