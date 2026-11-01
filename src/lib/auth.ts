import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CurrentUser = {
  id: string;
  email: string;
  name: string | null;
};

/** ログイン中のユーザーを返す。ログインしていなければ null。 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
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
