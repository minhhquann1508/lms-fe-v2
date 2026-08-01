import type { Lecture } from '@/types';

function normalizeBunnyVideoUrl(videoUrl: string): string | null {
  const url = new URL(videoUrl, window.location.origin);
  if (!url.hostname.endsWith('mediadelivery.net')) return null;

  const match = url.pathname.match(/^\/(?:embed|play)\/([^/]+)\/([^/]+)/);
  if (!match) return null;

  return `https://iframe.mediadelivery.net/embed/${match[1]}/${match[2]}`;
}

export function buildBunnyEmbedUrl(lecture: Lecture | null | undefined): string | null {
  if (!lecture) return null;

  const baseUrl =
    lecture.attributes?.libraryId && lecture.attributes?.videoGuid
      ? `https://iframe.mediadelivery.net/embed/${lecture.attributes.libraryId}/${lecture.attributes.videoGuid}`
      : lecture.videoUrl?.trim()
        ? normalizeBunnyVideoUrl(lecture.videoUrl.trim())
        : null;

  if (!baseUrl) return null;

  const url = new URL(baseUrl, window.location.origin);
  url.searchParams.set('autoplay', 'false');
  url.searchParams.set('preload', 'true');
  url.searchParams.set('playsinline', 'true');
  url.searchParams.set('responsive', 'true');
  url.searchParams.set('v', lecture.id);
  return url.toString();
}
