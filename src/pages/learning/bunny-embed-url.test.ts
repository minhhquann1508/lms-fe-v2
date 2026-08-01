import { describe, expect, it } from 'vitest';
import { buildBunnyEmbedUrl } from './bunny-embed-url';
import type { Lecture } from '@/types';

function lecture(overrides: Partial<Lecture>): Lecture {
  return {
    id: 'lecture-1',
    name: 'Lecture',
    description: '',
    order: 1,
    isPublished: true,
    slug: 'lecture',
    videoUrl: null,
    chapterId: 'chapter-1',
    duration: 0,
    deletedAt: '',
    createdAt: '',
    updatedAt: '',
    ...overrides,
  };
}

describe('buildBunnyEmbedUrl', () => {
  it('normalizes Bunny play URLs to embed URLs', () => {
    const result = buildBunnyEmbedUrl(
      lecture({
        videoUrl:
          'https://iframe.mediadelivery.net/play/463254/edd07112-7ea3-4414-a542-520101a02a4f',
      }),
    );

    expect(result).toBe(
      'https://iframe.mediadelivery.net/embed/463254/edd07112-7ea3-4414-a542-520101a02a4f?autoplay=false&preload=true&playsinline=true&responsive=true&v=lecture-1',
    );
  });
});
