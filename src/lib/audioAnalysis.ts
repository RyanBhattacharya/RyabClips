export interface AudioFeature {
  time: number;
  energy: number;
  isSilence: boolean;
  peak: boolean;
}

export interface AudioSegment {
  start: number;
  end: number;
  avgEnergy: number;
  hasPeak: boolean;
}

function getRMS(dataArray: Uint8Array): number {
  let sum = 0;
  for (let i = 0; i < dataArray.length; i++) {
    const val = (dataArray[i] - 128) / 128;
    sum += val * val;
  }
  return Math.sqrt(sum / dataArray.length);
}

function getDb(rms: number): number {
  return 20 * Math.log10(rms + 1e-10);
}

export async function extractAudioFeatures(
  videoElement: HTMLVideoElement,
  onProgress?: (progress: number) => void
): Promise<AudioFeature[]> {
  const audioContext = new AudioContext();
  const source = audioContext.createMediaElementSource(videoElement);
  const analyser = audioContext.createAnalyser();
  analyser.fftSize = 2048;
  analyser.smoothingTimeConstant = 0.3;
  source.connect(analyser);

  // Mute audio output by connecting to a gain node with 0 gain
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0;
  analyser.connect(gainNode);
  gainNode.connect(audioContext.destination);

  const features: AudioFeature[] = [];
  const bufferLength = analyser.frequencyBinCount;
  const timeData = new Uint8Array(bufferLength);
  const freqData = new Uint8Array(bufferLength);

  videoElement.currentTime = 0;
  videoElement.playbackRate = 4;
  videoElement.muted = true;

  // Resume audio context if suspended (browser policy)
  if (audioContext.state === 'suspended') {
    await audioContext.resume();
  }

  videoElement.play();

  return new Promise((resolve) => {
    const interval = setInterval(() => {
      if (videoElement.paused || videoElement.ended) {
        clearInterval(interval);
        videoElement.playbackRate = 1;
        audioContext.close().catch(() => {});
        resolve(features);
        return;
      }

      analyser.getByteTimeDomainData(timeData);
      const rms = getRMS(timeData);
      const db = getDb(rms);
      const time = videoElement.currentTime;

      analyser.getByteFrequencyData(freqData);
      const freqAvg = freqData.reduce((a, b) => a + b, 0) / bufferLength;
      const peak = freqAvg > 80;
      const isSilence = db < -50;

      features.push({ time, energy: db, isSilence, peak });

      if (onProgress && videoElement.duration) {
        onProgress(Math.min(100, (time / videoElement.duration) * 100));
      }
    }, 50);

    // Safety timeout
    setTimeout(() => {
      if (!videoElement.paused && !videoElement.ended) {
        videoElement.pause();
      }
    }, (videoElement.duration || 300) * 1000 / 4 + 10000);
  });
}

export function findAudioSegments(features: AudioFeature[]): AudioSegment[] {
  const segments: AudioSegment[] = [];
  let currentStart = 0;
  let inSegment = false;
  let segmentEnergy: number[] = [];
  let segmentPeaks = 0;

  for (let i = 0; i < features.length; i++) {
    const f = features[i];
    const prev = i > 0 ? features[i - 1] : null;

    if (!inSegment && !f.isSilence) {
      currentStart = f.time;
      inSegment = true;
      segmentEnergy = [f.energy];
      segmentPeaks = f.peak ? 1 : 0;
    } else if (inSegment) {
      if (f.isSilence && prev && !prev.isSilence) {
        segments.push({
          start: currentStart,
          end: prev.time,
          avgEnergy: segmentEnergy.reduce((a, b) => a + b, 0) / segmentEnergy.length,
          hasPeak: segmentPeaks > 0,
        });
        inSegment = false;
      } else {
        segmentEnergy.push(f.energy);
        if (f.peak) segmentPeaks++;
      }
    }
  }

  if (inSegment && features.length > 0) {
    const last = features[features.length - 1];
    segments.push({
      start: currentStart,
      end: last.time,
      avgEnergy: segmentEnergy.reduce((a, b) => a + b, 0) / segmentEnergy.length,
      hasPeak: segmentPeaks > 0,
    });
  }

  return segments;
}

export function detectHighlightsFromAudio(
  features: AudioFeature[],
  duration: number,
  targetClipCount: number = 6
): { start: number; end: number; score: number }[] {
  const segments = findAudioSegments(features);

  const scored = segments.map((seg) => ({
    ...seg,
    score: seg.avgEnergy + (seg.hasPeak ? 15 : 0) + (seg.end - seg.start > 15 ? 5 : 0),
  }));

  scored.sort((a, b) => b.score - a.score);

  const clips: { start: number; end: number; score: number }[] = [];

  for (const seg of scored) {
    if (clips.length >= targetClipCount) break;
    const segDuration = seg.end - seg.start;
    if (segDuration < 8) continue;

    let start = seg.start;
    let end = seg.end;

    if (segDuration > 60) {
      const bestWindow = findBestWindow(features, seg.start, seg.end, 45);
      start = bestWindow.start;
      end = bestWindow.end;
    } else if (segDuration < 15) {
      end = Math.min(seg.start + 15, duration);
      start = Math.max(0, end - 15);
    }

    let overlaps = false;
    for (const c of clips) {
      if (start < c.end && end > c.start) {
        overlaps = true;
        break;
      }
    }
    if (overlaps) continue;

    clips.push({ start: Math.max(0, start), end: Math.min(duration, end), score: seg.score });
  }

  clips.sort((a, b) => a.start - b.start);
  return clips;
}

function findBestWindow(
  features: AudioFeature[],
  segStart: number,
  segEnd: number,
  windowDuration: number
): { start: number; end: number } {
  let bestStart = segStart;
  let bestEnergy = -Infinity;

  const step = 0.5;
  for (let start = segStart; start + windowDuration <= segEnd; start += step) {
    const end = start + windowDuration;
    const energy = features
      .filter((f) => f.time >= start && f.time < end)
      .reduce((sum, f) => sum + f.energy, 0);
    if (energy > bestEnergy) {
      bestEnergy = energy;
      bestStart = start;
    }
  }

  return { start: bestStart, end: bestStart + windowDuration };
}
