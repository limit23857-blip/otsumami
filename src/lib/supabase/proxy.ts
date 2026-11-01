import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** ログインしていなくても見られるパス */
const PUBLIC_PATHS = ["/login", "/auth"];

function isPublicPath(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/**
 * リクエストごとにログイン状態を確認し、必要ならトークンを更新して Cookie に書き戻す。
 * ログインしていないユーザーが保護されたページを開いたら /login へ飛ばす。
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          // 更新されたトークンを、この先の処理（リクエスト）とブラウザ（レスポンス）の両方に渡す
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // getClaims() は JWT の署名を検証するので、Cookie の改ざんでは突破できない
  const { data } = await supabase.auth.getClaims();
  const isLoggedIn = Boolean(data?.claims);

  const { pathname } = request.nextUrl;

  // 未ログインで保護ページ → /login へ
  if (!isLoggedIn && !isPublicPath(pathname)) {
    return redirectTo(request, "/login", response);
  }
  // ログイン済みで /login → トップへ
  if (isLoggedIn && pathname === "/login") {
    return redirectTo(request, "/", response);
  }

  return response;
}

function redirectTo(request: NextRequest, pathname: string, response: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = pathname;
  url.search = "";
  const redirect = NextResponse.redirect(url);
  // トークン更新で書かれた Cookie をリダイレクト先にも引き継ぐ
  response.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
