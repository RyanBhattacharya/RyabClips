import { extractAudioFeatures, detectHighlightsFromAudio, AudioFeature } from './audioAnalysis';

export interface DetectedHighlight {
  start: number;
  end: number;
  score: number;
  confidence: number;
}

export async function detectHighlights(
  videoElement: HTMLVideoElement,
  targetCount: number = 6,
  onProgress?: (stage: string, progress: number) => void
): Promise<DetectedHighlight[]> {
  // Stage 1: Extract audio features
  if (onProgress) onProgress('extracting_audio', 0);
  const features = await extractAudioFeatures(videoElement, (p) => {
    if (onProgress) onProgress('extracting_audio', p);
  });
  if (onProgress) onProgress('extracting_audio', 100);

  // Stage 2: Detect highlights from audio analysis
  if (onProgress) onProgress('detecting_highlights', 0);
  const duration = videoElement.duration || 0;
  const clips = detectHighlightsFromAudio(features, duration, targetCount);
  if (onProgress) onProgress('detecting_highlights', 100);

  // Calculate confidence based on audio quality and feature density
  const avgFeatureDensity = features.length / (duration || 1);
  const confidence = Math.min(1, avgFeatureDensity / 10);

  return clips.map((c) => ({ ...c, confidence }));
}

export function getSceneBoundaries(
  features: AudioFeature[],
  duration: number
): number[] {
  const boundaries: number[] = [0];
  const silenceThreshold = -50;
  const minGap = 0.5;

  let lastBoundary = 0;
  for (const f of features) {
    if (f.isSilence && f.time - lastBoundary > minGap) {
      boundaries.push(f.time);
      lastBoundary = f.time;
    }
  }

  if (duration > 0 && lastBoundary < duration - 1) {
    boundaries.push(duration);
  }

  return boundaries;
}
