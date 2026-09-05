import supabase from './supabase';

export interface RenderOptions {
  aspectRatio: '9:16' | '1:1' | '16:9';
  width?: number;
  applyOverlay?: string;
  emoji?: string;
  hook?: string;
  title?: string;
  caption?: string;
  subtitleStyle?: string;
}

export function getAspectRatioDimensions(ratio: string): [number, number] {
  switch (ratio) {
    case '9:16': return [720, 1280];
    case '1:1': return [720, 720];
    case '16:9': return [1280, 720];
    default: return [720, 1280];
  }
}

export async function extractThumbnail(video: HTMLVideoElement, time: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d')!;

    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      }
    };

    video.addEventListener('seeked', onSeeked);
    video.currentTime = time;

    // Fallback timeout
    setTimeout(() => {
      video.removeEventListener('seeked', onSeeked);
      try {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      } catch (e) {
        reject(e);
      }
    }, 5000);
  });
}

export async function renderClip(
  video: HTMLVideoElement,
  startTime: number,
  endTime: number,
  options: RenderOptions,
  onFrame?: () => void
): Promise<Blob> {
  const [w, h] = getAspectRatioDimensions(options.aspectRatio);
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;

  // Setup MediaRecorder
  const stream = canvas.captureStream(30);
  const mimeTypes = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4;codecs=avc1',
    'video/mp4',
  ];
  let mimeType = mimeTypes.find((mt) => MediaRecorder.isTypeSupported(mt)) || 'video/webm';

  const recorder = new MediaRecorder(stream, {
    mimeType,
    videoBitsPerSecond: 5000000,
  });

  const chunks: Blob[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };

  return new Promise((resolve) => {
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType.split(';')[0] });
      resolve(blob);
    };

    video.playbackRate = 1;
    video.muted = true;

    const startRecording = () => {
      video.play();

      recorder.onstart = () => {
        const drawFrame = () => {
          if (video.paused || video.ended || video.currentTime >= endTime) {
            video.pause();
            recorder.stop();
            return;
          }

          const vW = video.videoWidth || 1;
          const vH = video.videoHeight || 1;
          const vAspect = vW / vH;
          const cAspect = w / h;
          let sx: number, sy: number, sw: number, sh: number;

          if (vAspect > cAspect) {
            sh = vH;
            sw = sh * cAspect;
            sx = (vW - sw) / 2;
            sy = 0;
          } else {
            sw = vW;
            sh = sw / cAspect;
            sx = 0;
            sy = (vH - sh) / 2;
          }

          ctx.drawImage(video, sx, sy, sw, sh, 0, 0, w, h);

          // Apply overlay
          if (options.applyOverlay && options.applyOverlay !== 'none') {
            applyOverlayToCanvas(ctx, w, h, options.applyOverlay);
          }

          // Draw hook text
          if (options.hook) {
            ctx.fillStyle = '#FFE500';
            ctx.font = 'bold 28px sans-serif';
            const hookPad = 12;
            const hookWidth = ctx.measureText(options.hook).width + hookPad * 2;
            ctx.fillRect(20, 20, hookWidth, 48);
            ctx.fillStyle = '#000000';
            ctx.fillText(options.hook, 20 + hookPad, 54);
          }

          // Draw emoji
          if (options.emoji) {
            ctx.font = '48px sans-serif';
            ctx.fillText(options.emoji, w - 70, 70);
          }

          // Draw title
          if (options.title) {
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 36px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(options.title, w / 2, h - 120);
            ctx.textAlign = 'left';
          }

          // Draw caption
          if (options.caption) {
            const captionStyle = options.subtitleStyle || 'plain';
            drawCaption(ctx, w, h, options.caption, captionStyle);
          }

          if (onFrame) onFrame();
          requestAnimationFrame(drawFrame);
        };

        drawFrame();
      };

      recorder.start(100);
    };

    // Handle seeked event or start immediately if already at the right time
    if (video.readyState >= 2 && Math.abs(video.currentTime - startTime) < 0.1) {
      startRecording();
    } else {
      const onSeeked = () => {
        video.removeEventListener('seeked', onSeeked);
        startRecording();
      };
      video.addEventListener('seeked', onSeeked);
      video.currentTime = startTime;

      // Fallback: if seeked doesn't fire within 5s, start anyway
      setTimeout(() => {
        video.removeEventListener('seeked', onSeeked);
        startRecording();
      }, 5000);
    }
  });
}

function applyOverlayToCanvas(ctx: CanvasRenderingContext2D, w: number, h: number, overlay: string) {
  switch (overlay) {
    case 'gradient': {
      const grd = ctx.createLinearGradient(0, h * 0.6, 0, h);
      grd.addColorStop(0, 'transparent');
      grd.addColorStop(1, 'rgba(0,0,0,0.6)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, h * 0.6, w, h * 0.4);
      break;
    }
    case 'blur': {
      ctx.filter = 'blur(2px)';
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(0, 0, w, h);
      ctx.filter = 'none';
      break;
    }
    case 'vignette': {
      const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.8);
      grd.addColorStop(0, 'transparent');
      grd.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case 'spotlight': {
      const grd = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.6);
      grd.addColorStop(0, 'transparent');
      grd.addColorStop(1, 'rgba(0,0,0,0.5)');
      ctx.fillStyle = grd;
      ctx.fillRect(0, 0, w, h);
      break;
    }
    case 'text-bg': {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.fillRect(0, 0, w, h);
      break;
    }
  }
}

function drawCaption(ctx: CanvasRenderingContext2D, w: number, h: number, caption: string, style: string) {
  const words = caption.split(' ');
  const maxWidth = w - 80;
  const lineHeight = 44;
  const x = w / 2;
  const baseY = h - 60;

  const lines: string[] = [];
  let currentLine = '';
  for (const word of words) {
    const test = currentLine ? currentLine + ' ' + word : word;
    ctx.font = 'bold 28px sans-serif';
    if (ctx.measureText(test).width > maxWidth) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = test;
    }
  }
  if (currentLine) lines.push(currentLine);

  const startY = baseY - (lines.length - 1) * lineHeight;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const y = startY + i * lineHeight;

    switch (style) {
      case 'highlight-words': {
        const lineWords = line.split(' ');
        let curX = x - ctx.measureText(line).width / 2;
        for (let j = 0; j < lineWords.length; j++) {
          const word = lineWords[j];
          const wordWidth = ctx.measureText(word).width;
          const isHighlighted = (i + j) % 3 === 0;
          ctx.fillStyle = isHighlighted ? '#FFE500' : '#ffffff';
          ctx.fillText(word, curX, y);
          curX += wordWidth + ctx.measureText(' ').width;
        }
        break;
      }
      case 'karaoke': {
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(line, x, y);
        ctx.fillStyle = '#FFE500';
        const progress = (Date.now() % 3000) / 3000;
        ctx.save();
        ctx.beginPath();
        ctx.rect(x - ctx.measureText(line).width / 2, y - 24, ctx.measureText(line).width * progress, 28);
        ctx.clip();
        ctx.fillText(line, x, y);
        ctx.restore();
        break;
      }
      case 'bouncy': {
        ctx.fillStyle = '#FFE500';
        ctx.textAlign = 'center';
        const offset = Math.sin((Date.now() / 200) + i) * 3;
        ctx.fillText(line, x, y + offset);
        break;
      }
      case 'typewriter': {
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        const visible = Math.floor((Date.now() % 4000) / 100);
        ctx.fillText(line.slice(0, visible), x, y);
        break;
      }
      case 'gradient-text': {
        const grd = ctx.createLinearGradient(x - 100, 0, x + 100, 0);
        grd.addColorStop(0, '#FFE500');
        grd.addColorStop(1, '#FF9500');
        ctx.fillStyle = grd;
        ctx.textAlign = 'center';
        ctx.fillText(line, x, y);
        break;
      }
      default: {
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.fillText(line, x, y);
        break;
      }
    }
    ctx.textAlign = 'left';
  }
}

export async function uploadClipToStorage(blob: Blob, videoId: number, clipId: number): Promise<string> {
  const fileName = `clip-${videoId}-${clipId}-${Date.now()}.webm`;
  const { error } = await supabase.storage.from('clips').upload(fileName, blob, {
    contentType: blob.type || 'video/webm',
    upsert: true,
  });
  if (error) throw error;

  const { data: urlData } = supabase.storage.from('clips').getPublicUrl(fileName);
  return urlData.publicUrl;
}

export async function uploadThumbnail(base64: string, videoId: number, clipId: number): Promise<string> {
  const base64Data = base64.split(',')[1];
  const byteCharacters = atob(base64Data);
  const byteNumbers = new Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }
  const byteArray = new Uint8Array(byteNumbers);
  const blob = new Blob([byteArray], { type: 'image/jpeg' });

  const fileName = `thumb-${videoId}-${clipId}-${Date.now()}.jpg`;
  const { error } = await supabase.storage.from('clips').upload(fileName, blob, {
    contentType: 'image/jpeg',
    upsert: true,
  });
  if (error) throw error;

  const { data: urlData } = supabase.storage.from('clips').getPublicUrl(fileName);
  return urlData.publicUrl;
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
