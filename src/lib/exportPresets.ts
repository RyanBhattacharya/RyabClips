export interface ExportPreset {
  name: string;
  platform: string;
  aspectRatio: string;
  resolution: string;
  fps: number;
  bitrate: string;
  maxDuration: number;
}

export const EXPORT_PRESETS: ExportPreset[] = [
  {
    name: 'TikTok / Reels',
    platform: 'tiktok',
    aspectRatio: '9:16',
    resolution: '1080x1920',
    fps: 30,
    bitrate: '5000k',
    maxDuration: 180,
  },
  {
    name: 'YouTube Shorts',
    platform: 'youtube_shorts',
    aspectRatio: '9:16',
    resolution: '1080x1920',
    fps: 30,
    bitrate: '5000k',
    maxDuration: 60,
  },
  {
    name: 'Instagram Feed',
    platform: 'instagram',
    aspectRatio: '1:1',
    resolution: '1080x1080',
    fps: 30,
    bitrate: '4000k',
    maxDuration: 60,
  },
  {
    name: 'Twitter / X',
    platform: 'twitter',
    aspectRatio: '16:9',
    resolution: '1280x720',
    fps: 30,
    bitrate: '3500k',
    maxDuration: 140,
  },
];

export function getPresetForPlatform(platform: string): ExportPreset | undefined {
  return EXPORT_PRESETS.find((p) => p.platform === platform);
}
