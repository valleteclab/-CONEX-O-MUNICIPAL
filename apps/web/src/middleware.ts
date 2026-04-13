import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { buildEntrarHref } from "@/lib/auth-routes";

const ADMIN_PREFIX = "/admin";
const ERP_PREFIX = "/erp";
const DASHBOARD_PREFIX = "/dashboard";
const PAINEL_PREFIX = "/painel";
const SUPPORT_PREFIX = "/suporte-tecnico";
const SUPPORT_LOGIN = "/suporte-tecnico/entrar";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdmin = pathname.startsWith(ADMIN_PREFIX);
  const isErp = pathname.startsWith(ERP_PREFIX);
  const isDashboard = pathname.startsWith(DASHBOARD_PREFIX);
  const isPainel = pathname.startsWith(PAINEL_PREFIX);
  const isSupport = pathname.startsWith(SUPPORT_PREFIX);

  if (isSupport) {
    if (pathname === SUPPORT_LOGIN) {
      return NextResponse.next();
    }
    const supportToken = request.cookies.get("cm_support_token")?.value;
    if (!supportToken) {
      const loginUrl = new URL(SUPPORT_LOGIN, request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (!isAdmin && !isErp && !isDashboard && !isPainel) {
    return NextResponse.next();
  }

  const token = request.cookies.get("cm_access_token")?.value;

  if (!token) {
    const intent = isAdmin ? "platform" : isErp ? "empresa" : "portal";
    const loginUrl = new URL(buildEntrarHref(intent, pathname), request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/erp/:path*",
    "/dashboard/:path*",
    "/painel",
    "/painel/:path*",
    "/suporte-tecnico/:path*",
  ],
};
