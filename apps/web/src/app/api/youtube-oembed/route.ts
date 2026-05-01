import { NextRequest, NextResponse } from "next/server";

function isYoutubeUrl(raw: string): boolean {
  try {
    const h = new URL(raw.trim()).hostname.toLowerCase().replace(/^www\./, "");
    return h === "youtu.be" || h.endsWith("youtube.com");
  } catch {
    return false;
  }
}

/**
 * Proxy server-side para oEmbed do YouTube (evita CORS no browser).
 * GET ?url=https://www.youtube.com/watch?v=...
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");
  if (!url?.trim()) {
    return NextResponse.json({ message: "Informe o link do YouTube." }, { status: 400 });
  }
  if (!isYoutubeUrl(url)) {
    return NextResponse.json({ message: "Apenas URLs do YouTube são aceitas" }, { status: 400 });
  }
  const oembed = `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(url.trim())}`;
  let res: Response;
  try {
    res = await fetch(oembed, { next: { revalidate: 3600 } });
  } catch {
    return NextResponse.json(
      { message: "Não foi possível contactar o YouTube. Tente de novo." },
      { status: 502 },
    );
  }
  if (!res.ok) {
    return NextResponse.json(
      { message: "Vídeo não encontrado ou URL inválida" },
      { status: res.status === 404 ? 404 : 502 },
    );
  }
  const data = (await res.json()) as Record<string, unknown>;
  return NextResponse.json({
    title: typeof data.title === "string" ? data.title : "",
    authorName: typeof data.author_name === "string" ? data.author_name : "",
    thumbnailUrl: typeof data.thumbnail_url === "string" ? data.thumbnail_url : "",
    providerName: typeof data.provider_name === "string" ? data.provider_name : "YouTube",
  });
}
