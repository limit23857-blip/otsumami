import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * Google でログインした後に戻ってくる場所。
 * 受け取った code をセッションに交換し、アプリの users テーブルにもユーザーを登録する。
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user?.email) {
    return NextResponse.redirect(`${origin}/login?error=auth_failed`);
  }

  const { id, email, user_metadata } = data.user;
  const name = typeof user_metadata?.full_name === "string" ? user_metadata.full_name : null;

  // 初回ログインなら作成、2回目以降は名前とメールを最新にする
  await prisma.user.upsert({
    where: { id },
    create: { id, email, name },
    update: { email, name },
  });

  return NextResponse.redirect(`${origin}/`);
}
