import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const ADMIN_PREFIX = "/admin";
const ERP_PREFIX = "/erp";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdmin = pathname.startsWith(ADMIN_PREFIX);
  const isErp = pathname.startsWith(ERP_PREFIX);

  if (!isAdmin && !isErp) {
    return NextResponse.next();
  }

  const token = request.cookies.get("cm_access_token")?.value;

  if (!token) {
    const loginPath = isAdmin ? "/plataforma/entrar" : "/area-da-empresa/entrar";
    const loginUrl = new URL(loginPath, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/erp/:path*"],
};
