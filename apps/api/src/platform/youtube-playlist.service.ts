import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export type YoutubePlaylistItem = {
  title: string;
  videoUrl: string;
};

const MAX_LESSONS = 200;

/** Extrai o parâmetro `list=` de URLs do YouTube (playlist). */
export function extractYoutubePlaylistId(rawUrl: string): string | null {
  try {
    const u = new URL(rawUrl.trim());
    const list = u.searchParams.get('list');
    if (list && list.length >= 10) {
      return list;
    }
    return null;
  } catch {
    return null;
  }
}

@Injectable()
export class YoutubePlaylistService {
  private readonly logger = new Logger(YoutubePlaylistService.name);

  constructor(private readonly config: ConfigService) {}

  /**
   * Lista vídeos da playlist na ordem do YouTube.
   * Preferência: YouTube Data API v3 (YOUTUBE_API_KEY).
   * Sem chave: tenta feed RSS (pode listar só os vídeos mais recentes — limitação do YouTube).
   */
  async listPlaylistVideos(playlistId: string): Promise<YoutubePlaylistItem[]> {
    const key = this.config.get<string>('YOUTUBE_API_KEY')?.trim();
    if (key) {
      return this.listViaDataApi(playlistId, key);
    }
    this.logger.warn(
      'YOUTUBE_API_KEY não definida — a usar feed RSS da playlist (pode ser incompleto).',
    );
    return this.listViaRss(playlistId);
  }

  async previewPlaylistUrl(url: string): Promise<{
    playlistId: string;
    items: YoutubePlaylistItem[];
  }> {
    const playlistId = extractYoutubePlaylistId(url);
    if (!playlistId) {
      throw new BadRequestException(
        'URL sem playlist. Use um link do YouTube com o parâmetro list= (ex.: watch?v=…&list=PL…).',
      );
    }
    const items = await this.listPlaylistVideos(playlistId);
    if (!items.length) {
      throw new BadRequestException(
        'Não foi possível obter vídeos desta playlist. Defina YOUTUBE_API_KEY na API para importação completa.',
      );
    }
    return { playlistId, items };
  }

  private async listViaDataApi(
    playlistId: string,
    apiKey: string,
  ): Promise<YoutubePlaylistItem[]> {
    const out: YoutubePlaylistItem[] = [];
    let pageToken: string | undefined;
    do {
      const u = new URL('https://www.googleapis.com/youtube/v3/playlistItems');
      u.searchParams.set('part', 'snippet');
      u.searchParams.set('maxResults', '50');
      u.searchParams.set('playlistId', playlistId);
      u.searchParams.set('key', apiKey);
      if (pageToken) {
        u.searchParams.set('pageToken', pageToken);
      }
      let res: Response;
      try {
        res = await fetch(u);
      } catch (e) {
        this.logger.warn(e);
        throw new ServiceUnavailableException(
          'Falha de rede ao contactar a API do YouTube.',
        );
      }
      const json = (await res.json()) as {
        error?: { message?: string };
        items?: Array<{
          snippet?: {
            title?: string;
            resourceId?: { videoId?: string };
          };
        }>;
        nextPageToken?: string;
      };
      if (!res.ok) {
        const msg = json.error?.message || res.statusText;
        throw new BadRequestException(
          `YouTube Data API: ${msg}. Verifique YOUTUBE_API_KEY e o ID da playlist.`,
        );
      }
      const items = json.items ?? [];
      for (const row of items) {
        const vid = row.snippet?.resourceId?.videoId;
        const title = row.snippet?.title?.trim();
        if (vid && title) {
          out.push({
            title: title.slice(0, 255),
            videoUrl: `https://www.youtube.com/watch?v=${vid}`,
          });
        }
        if (out.length >= MAX_LESSONS) {
          return out;
        }
      }
      pageToken = json.nextPageToken;
    } while (pageToken);
    return out;
  }

  private async listViaRss(playlistId: string): Promise<YoutubePlaylistItem[]> {
    const feedUrl = `https://www.youtube.com/feeds/videos.xml?playlist_id=${encodeURIComponent(playlistId)}`;
    let res: Response;
    try {
      res = await fetch(feedUrl);
    } catch (e) {
      this.logger.warn(e);
      throw new ServiceUnavailableException(
        'Falha de rede ao obter o feed da playlist.',
      );
    }
    if (!res.ok) {
      throw new BadRequestException(
        'Playlist inacessível via RSS. Configure YOUTUBE_API_KEY na API para importar a trilha completa.',
      );
    }
    const xml = await res.text();
    return this.parsePlaylistRss(xml).slice(0, MAX_LESSONS);
  }

  /** Parser mínimo do Atom RSS das playlists (sem dependência XML). */
  private parsePlaylistRss(xml: string): YoutubePlaylistItem[] {
    const out: YoutubePlaylistItem[] = [];
    const parts = xml.split(/<entry>/i);
    for (let i = 1; i < parts.length; i++) {
      const chunk = parts[i].split(/<\/entry>/i)[0] ?? '';
      let vid = chunk.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i)?.[1]?.trim();
      if (!vid) {
        vid = chunk
          .match(/href="https:\/\/www\.youtube\.com\/watch\?v=([^&"]+)/i)?.[1]
          ?.trim();
      }
      const titleRaw =
        chunk.match(/<media:title[^>]*>([^<]*)<\/media:title>/i)?.[1] ||
        chunk.match(/<title(?:\s[^>]*)?>([^<]*)<\/title>/i)?.[1];
      if (vid && titleRaw) {
        out.push({
          title: decodeXmlEntities(titleRaw.trim()).slice(0, 255),
          videoUrl: `https://www.youtube.com/watch?v=${vid}`,
        });
      }
    }
    return out;
  }
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}
