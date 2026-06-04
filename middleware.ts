import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Sessie vernieuwen voor alle requests
  const { data: { user } } = await supabase.auth.getUser();

  // Beschermde routes — doorsturen naar login als niet ingelogd
  // Rapport-pagina's zijn publiek toegankelijk via gedeelde link
  const isPubliekRapport =
    request.nextUrl.pathname.match(/^\/dashboard\/rapporten\/[^/]+$/) ||
    request.nextUrl.pathname.match(/^\/dashboard\/listing-rapporten\/[^/]+$/);

  if (!user && request.nextUrl.pathname.startsWith("/dashboard") && !isPubliekRapport) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
