import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { parseIso8601DurationToSeconds } from '../common/youtube-duration';
import { youtubeVideoIdFromUrl } from '../common/youtube-thumb';

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

  /**
   * Duração em minutos: vídeo único ou soma da playlist (requer YOUTUBE_API_KEY).
   */
  async getDurationPreviewForUrl(url: string): Promise<{
    durationMinutes: number | null;
    playlistTotalMinutes: number | null;
    playlistVideoCount: number | null;
    hint: string | null;
  }> {
    const key = this.config.get<string>('YOUTUBE_API_KEY')?.trim();
    if (!key) {
      return {
        durationMinutes: null,
        playlistTotalMinutes: null,
        playlistVideoCount: null,
        hint: 'Não foi possível calcular a duração automaticamente agora.',
      };
    }
    const trimmed = url.trim();
    const plId = extractYoutubePlaylistId(trimmed);
    if (plId) {
      const items = await this.listPlaylistVideos(plId);
      const ids = items
        .map((i) => youtubeVideoIdFromUrl(i.videoUrl))
        .filter((x): x is string => !!x);
      const totalSec = await this.sumVideoDurationsSeconds(ids, key);
      return {
        durationMinutes: null,
        playlistTotalMinutes:
          totalSec > 0 ? Math.max(1, Math.round(totalSec / 60)) : null,
        playlistVideoCount: items.length,
        hint:
          totalSec <= 0 ?
            'Não foi possível somar as durações (verifique a chave e a playlist).'
          : null,
      };
    }
    const vid = youtubeVideoIdFromUrl(trimmed);
    if (!vid) {
      throw new BadRequestException(
        'Cole um link de vídeo ou playlist válido do YouTube.',
      );
    }
    const sec = await this.fetchVideoDurationSeconds(vid, key);
    return {
      durationMinutes:
        sec != null && sec > 0 ? Math.max(1, Math.round(sec / 60)) : null,
      playlistTotalMinutes: null,
      playlistVideoCount: null,
      hint:
        sec == null || sec <= 0 ?
          'Não foi possível ler a duração deste vídeo.'
        : null,
    };
  }

  async previewPlaylistUrl(url: string): Promise<{
    playlistId: string;
    items: YoutubePlaylistItem[];
  }> {
    const playlistId = extractYoutubePlaylistId(url);
    if (!playlistId) {
      throw new BadRequestException(
        'Use um link de playlist do YouTube para importar uma trilha completa.',
      );
    }
    const items = await this.listPlaylistVideos(playlistId);
    if (!items.length) {
      throw new BadRequestException(
        'Não foi possível obter vídeos desta playlist. Verifique o link ou tente novamente mais tarde.',
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
          `Não foi possível ler a playlist no YouTube: ${msg}.`,
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

  private async fetchVideoDurationSeconds(
    videoId: string,
    apiKey: string,
  ): Promise<number | null> {
    const u = new URL('https://www.googleapis.com/youtube/v3/videos');
    u.searchParams.set('part', 'contentDetails');
    u.searchParams.set('id', videoId);
    u.searchParams.set('key', apiKey);
    let res: Response;
    try {
      res = await fetch(u);
    } catch (e) {
      this.logger.warn(e);
      return null;
    }
    const json = (await res.json()) as {
      items?: Array<{ contentDetails?: { duration?: string } }>;
    };
    if (!res.ok || !json.items?.[0]?.contentDetails?.duration) {
      return null;
    }
    return parseIso8601DurationToSeconds(json.items[0].contentDetails.duration);
  }

  private async sumVideoDurationsSeconds(
    videoIds: string[],
    apiKey: string,
  ): Promise<number> {
    if (!videoIds.length) {
      return 0;
    }
    let total = 0;
    for (let i = 0; i < videoIds.length; i += 50) {
      const batch = videoIds.slice(i, i + 50);
      const u = new URL('https://www.googleapis.com/youtube/v3/videos');
      u.searchParams.set('part', 'contentDetails');
      u.searchParams.set('id', batch.join(','));
      u.searchParams.set('key', apiKey);
      let res: Response;
      try {
        res = await fetch(u);
      } catch (e) {
        this.logger.warn(e);
        continue;
      }
      const json = (await res.json()) as {
        items?: Array<{ contentDetails?: { duration?: string } }>;
      };
      if (!res.ok) {
        continue;
      }
      for (const item of json.items ?? []) {
        const dur = item?.contentDetails?.duration;
        if (dur) {
          total += parseIso8601DurationToSeconds(dur);
        }
      }
    }
    return total;
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
        'Não foi possível acessar esta playlist. Verifique se ela está pública e tente novamente.',
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
