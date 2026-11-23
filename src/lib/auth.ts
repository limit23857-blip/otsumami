import { redirect } from "next/navigation";
import { connection } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
};

/** ログイン中のユーザーを返す。ログインしていなければ null。 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // ログイン状態の確認ではトークンの有効期限を「今の時刻（Date.now()）」と比べるため、
  // 先読み（プリレンダリング）では実行せず、実際のアクセスが来てから実行するよう Next.js に伝える
  await connection();

  const supabase = await createSupabaseServerClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (!claims?.sub || !claims.email) return null;

  const meta = (claims.user_metadata ?? {}) as Record<string, unknown>;
  const name = typeof meta.full_name === "string" ? meta.full_name : null;

  return { id: claims.sub, email: claims.email, name };
}

/** ログイン必須の処理で使う。ログインしていなければ /login へ飛ばす。 */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
