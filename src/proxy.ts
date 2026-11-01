import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

// Next.js 16 で Middleware から名前が変わった「Proxy」。
// 全リクエストの前に動く、Java でいう Servlet Filter のようなもの。
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  // 画像・CSS などの静的ファイルにはログインチェックをかけない
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
