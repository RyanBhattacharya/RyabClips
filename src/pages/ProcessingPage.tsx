import { useEffect, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, Film, Mic2, Sparkles, Scissors, Type, CheckCircle } from 'lucide-react';
import { detectHighlights } from '../lib/highlightDetection';
import { renderClip, extractThumbnail, uploadClipToStorage, uploadThumbnail } from '../lib/videoProcessor';
import { generateTranscriptForSegment } from '../lib/transcription';

interface Video {
  id: number;
  title: string;
  source_url: string;
  file_path: string;
  duration: number;
  status: string;
}

interface JobStage {
  name: string;
  label: string;
  progress: number;
  status: string;
}

interface Job {
  id: number;
  video_id: number;
  status: string;
  stage: string;
  progress: number;
  stages: JobStage[];
  error: string;
}

const STAGE_ICONS: Record<string, React.ReactNode> = {
  downloading: <Film size={18} />,
  extracting_audio: <Mic2 size={18} />,
  detecting_highlights: <Sparkles size={18} />,
  rendering_clips: <Scissors size={18} />,
  generating_captions: <Type size={18} />,
  done: <CheckCircle size={18} />,
};

export default function ProcessingPage() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [overallProgress, setOverallProgress] = useState(0);
  const [error, setError] = useState('');
  const [statusMsg, setStatusMsg] = useState('Preparing video...');
  const [clipsGenerated, setClipsGenerated] = useState(0);
  const [totalClips, setTotalClips] = useState(0);
  const cancelled = useRef(false);

  const fetchVideo = useCallback(async () => {
    if (!videoId) return;
    const res = await fetch(`/api/videos?id=${videoId}`);
    const data = await res.json();
    setVideo(data);
    return data;
  }, [videoId]);

  const startJob = useCallback(async (video: Video) => {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ video_id: parseInt(videoId!), action: 'start' }),
    });
    const { job: j } = await res.json();
    setJob(j);
    return j;
  }, [videoId]);

  const updateJob = useCallback(async (jobId: number, stage: string, progress: number, status: string, errorMsg?: string) => {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_id: parseInt(videoId!),
        action: 'update',
        job_id: jobId,
        stage,
        progress,
        status,
        error: errorMsg || '',
      }),
    });
    const { job: j } = await res.json();
    setJob(j);
    return j;
  }, [videoId]);

  const completeJob = useCallback(async (jobId: number, clipsData: any[]) => {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_id: parseInt(videoId!),
        action: 'complete',
        job_id: jobId,
        clips_data: clipsData,
      }),
    });
    return res.json();
  }, [videoId]);

  useEffect(() => {
    if (!videoId) return;
    cancelled.current = false;

    const run = async () => {
      try {
        // 1. Fetch video
        setStatusMsg('Loading video...');
        const v = await fetchVideo();
        if (!v) {
          setError('Video not found');
          return;
        }

        // 2. Start job
        setStatusMsg('Initializing processing pipeline...');
        const j = await startJob(v);
        setOverallProgress(5);

        // 3. Create video element and load video
        setStatusMsg('Loading video for analysis...');
        const videoUrl = v.file_path || v.source_url;
        if (!videoUrl) {
          setError('No video source available');
          await updateJob(j.id, 'downloading', 0, 'failed', 'No video source');
          return;
        }

        const videoEl = document.createElement('video');
        videoEl.crossOrigin = 'anonymous';
        videoEl.src = videoUrl;
        videoEl.muted = true;
        videoEl.preload = 'auto';
        videoRef.current = videoEl;

        await new Promise<void>((resolve, reject) => {
          videoEl.onloadedmetadata = () => resolve();
          videoEl.onerror = () => reject(new Error('Failed to load video'));
          // Safety timeout
          setTimeout(() => reject(new Error('Video load timeout')), 30000);
        });

        if (cancelled.current) return;

        const duration = videoEl.duration || v.duration || 180;
        await updateJob(j.id, 'downloading', 100, 'processing');
        setOverallProgress(15);

        // 4. Extract audio and detect highlights
        setStatusMsg('Analyzing audio for highlight detection...');
        await updateJob(j.id, 'extracting_audio', 0, 'processing');

        const highlights = await detectHighlights(videoEl, 6, (stage, progress) => {
          if (cancelled.current) return;
          setStatusMsg(stage === 'extracting_audio' ? 'Extracting audio features...' : 'Detecting highlights from audio...');
          if (stage === 'extracting_audio') {
            setOverallProgress(15 + (progress * 0.15));
          } else if (stage === 'detecting_highlights') {
            setOverallProgress(30 + (progress * 0.15));
          }
        });

        if (cancelled.current) return;

        await updateJob(j.id, 'detecting_highlights', 100, 'processing');
        setOverallProgress(45);
        setTotalClips(highlights.length);
        setStatusMsg(`Found ${highlights.length} highlight segments. Rendering clips...`);

        if (highlights.length === 0) {
          setError('No highlight segments detected. Try with a different video.');
          await updateJob(j.id, 'detecting_highlights', 100, 'failed', 'No highlights detected');
          return;
        }

        // 5. Render clips
        await updateJob(j.id, 'rendering_clips', 0, 'processing');
        const LAYOUTS = ['split-screen', 'full-screen', 'face-cam', 'b-roll', 'reaction', 'talking-head'];
        const ASPECTS = ['9:16', '1:1', '16:9'];
        const ZOOMS = ['1.0x', '1.2x', '1.5x', '2.0x'];
        const EMOJIS = ['🔥', '💯', '⚡', '👀', '🤯', '💡', '🎯', '🚀', '❤️', '👍', '🎉', '💪'];
        const OVERLAYS = ['none', 'gradient', 'blur', 'vignette', 'spotlight', 'text-bg'];
        const TRANSITIONS = ['cut', 'fade', 'zoom-in', 'zoom-out', 'slide', 'spin', 'bounce'];
        const SUBTITLE_STYLES = ['highlight-words', 'karaoke', 'plain', 'bouncy', 'typewriter', 'gradient-text'];
        const PACINGS = ['fast', 'medium', 'slow'];

        const clipsData: any[] = [];

        for (let i = 0; i < highlights.length; i++) {
          if (cancelled.current) return;
          const h = highlights[i];
          const aspectRatio = ASPECTS[i % ASPECTS.length];

          setStatusMsg(`Rendering clip ${i + 1} of ${highlights.length}...`);
          const clipProgress = (i / highlights.length) * 100;
          await updateJob(j.id, 'rendering_clips', clipProgress, 'processing');
          setOverallProgress(45 + (i / highlights.length) * 35);

          // Generate transcript for this segment
          const transcript = generateTranscriptForSegment(h.start, h.end, i);

          // Render clip with canvas + MediaRecorder
          const blob = await renderClip(
            videoEl,
            h.start,
            h.end,
            {
              aspectRatio: aspectRatio as any,
              applyOverlay: OVERLAYS[i % OVERLAYS.length],
              emoji: EMOJIS[i % EMOJIS.length],
              hook: transcript.hook,
              title: transcript.title,
              caption: transcript.caption,
              subtitleStyle: SUBTITLE_STYLES[i % SUBTITLE_STYLES.length],
            }
          );

          if (cancelled.current) return;

          // Extract thumbnail from the middle of the clip
          const thumbTime = h.start + (h.end - h.start) / 2;
          const thumbDataUrl = await extractThumbnail(videoEl, thumbTime);

          // Upload clip to storage (store URL in thumbnail field since file_path doesn't exist in DB)
          const clipUrl = await uploadClipToStorage(blob, v.id, i + 1);

          clipsData.push({
            video_id: v.id,
            start_time: h.start,
            end_time: h.end,
            caption: transcript.caption,
            hook: transcript.hook,
            title: transcript.title,
            layout: LAYOUTS[i % LAYOUTS.length],
            aspect_ratio: aspectRatio,
            zoom_level: ZOOMS[i % ZOOMS.length],
            emoji: EMOJIS[i % EMOJIS.length],
            overlay: OVERLAYS[i % OVERLAYS.length],
            transition: TRANSITIONS[i % TRANSITIONS.length],
            subtitle_style: SUBTITLE_STYLES[i % SUBTITLE_STYLES.length],
            pacing: PACINGS[i % PACINGS.length],
            thumbnail: clipUrl,
          });

          setClipsGenerated(i + 1);
        }

        if (cancelled.current) return;

        // 6. Generate captions (already done per clip)
        setStatusMsg('Finalizing captions and metadata...');
        await updateJob(j.id, 'generating_captions', 100, 'processing');
        setOverallProgress(95);

        // 7. Complete job
        await completeJob(j.id, clipsData);
        setOverallProgress(100);
        setStatusMsg('All clips generated! Redirecting to results...');

        setTimeout(() => {
          navigate(`/results/${videoId}`);
        }, 1500);
      } catch (err: any) {
        if (!cancelled.current) {
          console.error('Processing error:', err);
          setError(err.message || 'Processing failed');
          setStatusMsg('Processing failed');
          if (job) {
            updateJob(job.id, job.stage, 0, 'failed', err.message || 'Unknown error');
          }
        }
      }
    };

    run();

    return () => {
      cancelled.current = true;
    };
  }, [videoId]);

  const activeStage = job?.stages?.find((s) => s.status === 'active' || s.status === 'processing') || job?.stages?.find((s) => s.progress > 0 && s.progress < 100);
  const completedStages = job?.stages?.filter((s) => s.status === 'completed' || s.progress === 100).length || 0;
  const totalStages = job?.stages?.length || 5;

  return (
    <div className="min-h-screen bg-black flex items-center justify-center px-4">
      <div className="w-full max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center mb-10"
        >
          <div className="w-16 h-16 bg-yellow/10 rounded-2xl flex items-center justify-center text-yellow mx-auto mb-6">
            <Loader2 size={32} className="animate-spin" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Analyzing your video...</h1>
          <p className="text-gray-400">{statusMsg}</p>
        </motion.div>

        <div className="mb-8">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-400">Overall progress</span>
            <span className="text-yellow font-semibold">{Math.round(overallProgress)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-yellow rounded-full"
              animate={{ width: `${overallProgress}%` }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            />
          </div>
          {totalClips > 0 && (
            <div className="text-xs text-gray-500 mt-2 text-center">
              Clips generated: {clipsGenerated} / {totalClips}
            </div>
          )}
        </div>

        <div className="w-full space-y-3">
          {job?.stages?.map((stage, index) => {
            const isActive = stage.name === job.stage;
            const isDone = stage.progress === 100 || stage.status === 'completed';
            const isPending = !isActive && !isDone;

            return (
              <motion.div
                key={stage.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className={`flex items-center gap-4 p-4 rounded-xl border transition-all duration-300 ${
                  isActive ? 'border-yellow bg-yellow/5' : isDone ? 'border-green-500/30 bg-green-500/5' : 'border-gray-800 bg-gray-900/30'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                  isActive ? 'bg-yellow text-black' : isDone ? 'bg-green-500/20 text-green-400' : 'bg-gray-800 text-gray-500'
                }`}>
                  {isDone ? (
                    <CheckCircle size={18} />
                  ) : STAGE_ICONS[stage.name] || <Sparkles size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-semibold text-sm ${isActive ? 'text-yellow' : isDone ? 'text-green-400' : 'text-gray-500'}`}>
                    {stage.label}
                  </div>
                  <div className={`text-xs mt-0.5 ${isActive ? 'text-gray-300' : isDone ? 'text-gray-500' : 'text-gray-600'}`}>
                    {isActive ? 'Processing...' : isDone ? 'Completed' : 'Waiting...'}
                  </div>
                </div>
                {isActive && (
                  <div className="w-24 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-yellow rounded-full"
                      animate={{ width: `${stage.progress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                )}
              </motion.div>
            );
          }) || (
            <div className="space-y-3">
              {['Loading video...', 'Analyzing audio...', 'Detecting highlights...', 'Rendering clips...', 'Generating captions...'].map((label, i) => (
                <div key={label} className="flex items-center gap-4 p-4 rounded-xl border border-gray-800 bg-gray-900/30 opacity-50">
                  <div className="w-10 h-10 rounded-lg bg-gray-800 flex items-center justify-center text-gray-500">
                    <Sparkles size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-sm text-gray-500">{label}</div>
                    <div className="text-xs text-gray-600">Waiting...</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center"
          >
            {error}
          </motion.div>
        )}
      </div>
    </div>
  );
}
