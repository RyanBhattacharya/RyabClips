import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import EditorTimeline from '../components/EditorTimeline';
import {
  ArrowLeft, Save, Download, Type, Layout, ZoomIn, Subtitles,
  Film, Loader2, Check, Play, Pause
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { renderClip, uploadClipToStorage, downloadBlob } from '../lib/videoProcessor';

interface Clip {
  id: number;
  video_id: number;
  start_time: number;
  end_time: number;
  caption: string;
  hook: string;
  title: string;
  layout: string;
  aspect_ratio: string;
  zoom_level: string;
  emoji: string;
  overlay: string;
  transition: string;
  subtitle_style: string;
  pacing: string;
  thumbnail: string;
}

interface Video {
  id: number;
  file_path: string;
  source_url: string;
  duration: number;
}

const LAYOUTS = ['split-screen', 'full-screen', 'face-cam', 'b-roll', 'reaction', 'talking-head', 'screen-share', 'picture-in-picture'];
const ASPECT_RATIOS = ['9:16', '1:1', '16:9'];
const ZOOM_LEVELS = ['1.0x', '1.2x', '1.5x', '2.0x'];
const EMOJIS = ['🔥', '💯', '⚡', '👀', '🤯', '💡', '🎯', '🚀', '❤️', '👍', '🎉', '💪', '✨', '📌'];
const OVERLAYS = ['none', 'gradient', 'blur', 'vignette', 'spotlight', 'text-bg'];
const TRANSITIONS = ['cut', 'fade', 'zoom-in', 'zoom-out', 'slide', 'spin', 'bounce'];
const SUBTITLE_STYLES = ['highlight-words', 'karaoke', 'plain', 'bouncy', 'typewriter', 'gradient-text'];
const PACINGS = ['fast', 'medium', 'slow'];

export default function EditorPage() {
  const { clipId } = useParams();
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewRef = useRef<HTMLVideoElement>(null);

  const [clip, setClip] = useState<Clip | null>(null);
  const [video, setVideo] = useState<Video | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [reRendering, setReRendering] = useState(false);

  const [caption, setCaption] = useState('');
  const [title, setTitle] = useState('');
  const [hook, setHook] = useState('');
  const [layout, setLayout] = useState('');
  const [aspectRatio, setAspectRatio] = useState('');
  const [zoomLevel, setZoomLevel] = useState('');
  const [emoji, setEmoji] = useState('');
  const [overlay, setOverlay] = useState('');
  const [transition, setTransition] = useState('');
  const [subtitleStyle, setSubtitleStyle] = useState('');
  const [pacing, setPacing] = useState('');
  const [startTime, setStartTime] = useState(0);
  const [endTime, setEndTime] = useState(0);

  const videoUrl = video?.file_path || video?.source_url || '';

  const fetchData = useCallback(async () => {
    if (!clipId) return;
    try {
      const clipRes = await fetch(`/api/clips?id=${clipId}`);
      const clipData = await clipRes.json();
      setClip(clipData);

      setCaption(clipData.caption || '');
      setTitle(clipData.title || '');
      setHook(clipData.hook || '');
      setLayout(clipData.layout || 'full-screen');
      setAspectRatio(clipData.aspect_ratio || '9:16');
      setZoomLevel(clipData.zoom_level || '1.0x');
      setEmoji(clipData.emoji || '');
      setOverlay(clipData.overlay || 'none');
      setTransition(clipData.transition || 'cut');
      setSubtitleStyle(clipData.subtitle_style || 'highlight-words');
      setPacing(clipData.pacing || 'medium');
      setStartTime(clipData.start_time || 0);
      setEndTime(clipData.end_time || 30);

      const videoRes = await fetch(`/api/videos?id=${clipData.video_id}`);
      const videoData = await videoRes.json();
      setVideo(videoData);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [clipId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !clip) return;
    vid.currentTime = startTime;
  }, [clip, startTime]);

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || !clip) return;

    const interval = setInterval(() => {
      if (vid.currentTime >= endTime) {
        vid.pause();
        setIsPlaying(false);
      }
      setCurrentTime(vid.currentTime);
    }, 100);
    return () => clearInterval(interval);
  }, [clip, endTime]);

  const handlePlayPause = () => {
    const vid = videoRef.current;
    if (!vid) return;
    if (vid.paused) {
      if (vid.currentTime >= endTime) vid.currentTime = startTime;
      vid.play();
      setIsPlaying(true);
    } else {
      vid.pause();
      setIsPlaying(false);
    }
  };

  const handleSave = async () => {
    if (!clipId) return;
    setSaving(true);
    try {
      const res = await fetch('/api/clips', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: parseInt(clipId),
          caption,
          title,
          hook,
          layout,
          aspect_ratio: aspectRatio,
          zoom_level: zoomLevel,
          emoji,
          overlay,
          transition,
          subtitle_style: subtitleStyle,
          pacing,
          start_time: startTime,
          end_time: endTime,
        }),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } catch (err) {
      console.error('Save error:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleReRender = async () => {
    if (!videoRef.current || !clip || !video) return;
    setReRendering(true);
    try {
      const blob = await renderClip(
        videoRef.current,
        startTime,
        endTime,
        {
          aspectRatio: aspectRatio as any,
          applyOverlay: overlay,
          emoji,
          hook,
          title,
          caption,
          subtitleStyle,
        }
      );

      const clipUrl = await uploadClipToStorage(blob, video.id, clip.id);

      await fetch('/api/clips', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: clip.id,
          thumbnail: clipUrl,
        }),
      });

      await fetchData();
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Re-render error:', err);
      alert('Re-render failed. See console for details.');
    } finally {
      setReRendering(false);
    }
  };

  const handleExport = async () => {
    if (!clip) return;
    setExporting(true);

    try {
      if (clip.thumbnail) {
        const res = await fetch(clip.thumbnail);
        const blob = await res.blob();
        const ext = clip.thumbnail.includes('.webm') ? 'webm' : 'mp4';
        downloadBlob(blob, `ryabclip-${clip.id}.${ext}`);
      } else {
        await handleReRender();
        const updatedClip = await fetch(`/api/clips?id=${clip.id}`).then(r => r.json());
        if (updatedClip.thumbnail) {
          const res = await fetch(updatedClip.thumbnail);
          const blob = await res.blob();
          const ext = updatedClip.thumbnail.includes('.webm') ? 'webm' : 'mp4';
          downloadBlob(blob, `ryabclip-${clip.id}.${ext}`);
        }
      }

      await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip_id: clip.id,
          video_id: clip.video_id,
          format: 'webm',
          status: 'completed',
        }),
      });
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const aspectRatioClass =
    aspectRatio === '9:16' ? 'aspect-[9/16]' :
    aspectRatio === '1:1' ? 'aspect-square' :
    'aspect-video';

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 size={32} className="text-yellow animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Link to={`/results/${clip?.video_id}`} className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white">Clip Editor</h1>
              <p className="text-gray-400 text-sm">Edit and re-render your AI-generated clip</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleReRender}
              disabled={reRendering}
              className="inline-flex items-center gap-2 bg-gray-700 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {reRendering ? <Loader2 size={16} className="animate-spin" /> : <Film size={16} />}
              Re-Render
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className={`inline-flex items-center gap-2 font-semibold px-5 py-2.5 rounded-xl transition-all ${
                saved ? 'bg-green-500 text-white' : 'bg-gray-800 text-white hover:bg-gray-700'
              }`}
            >
              {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <Check size={16} /> : <Save size={16} />}
              {saved ? 'Saved!' : saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleExport}
              disabled={exporting}
              className="inline-flex items-center gap-2 bg-yellow text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-yellow-dark transition-colors disabled:opacity-50"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <div className={`relative ${aspectRatioClass} bg-black rounded-2xl border border-gray-800 overflow-hidden`}>
              {videoUrl ? (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className="w-full h-full object-cover"
                  preload="metadata"
                  muted
                  playsInline
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film size={48} className="text-gray-600" />
                </div>
              )}
              <button
                onClick={handlePlayPause}
                className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity"
              >
                <div className="w-16 h-16 bg-yellow/80 rounded-full flex items-center justify-center text-black">
                  {isPlaying ? <Pause size={28} /> : <Play size={28} />}
                </div>
              </button>
            </div>

            <EditorTimeline
              duration={video?.duration || 180}
              startTime={startTime}
              endTime={endTime}
              onStartChange={setStartTime}
              onEndChange={setEndTime}
              currentTime={currentTime}
              onSeek={(time) => {
                if (videoRef.current) {
                  videoRef.current.currentTime = time;
                  setCurrentTime(time);
                }
              }}
            />
          </div>

          <div className="space-y-4 max-h-[80vh] overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-5"
            >
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Type size={18} className="text-yellow" />
                Text & Captions
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-400 uppercase font-medium mb-1 block">Caption</label>
                  <textarea
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    rows={2}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow transition-colors resize-none"
                    placeholder="Enter caption text..."
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-medium mb-1 block">Title</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow transition-colors"
                    placeholder="Clip title..."
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-medium mb-1 block">Hook</label>
                  <input
                    type="text"
                    value={hook}
                    onChange={(e) => setHook(e.target.value)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-yellow transition-colors"
                    placeholder="Hook text..."
                  />
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-5"
            >
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Layout size={18} className="text-yellow" />
                Layout & Format
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase font-medium mb-2 block">Layout</label>
                  <div className="grid grid-cols-2 gap-2">
                    {LAYOUTS.map((l) => (
                      <button
                        key={l}
                        onClick={() => setLayout(l)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                          layout === l ? 'bg-yellow text-black' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        {l.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-medium mb-2 block">Aspect Ratio</label>
                  <div className="flex gap-2">
                    {ASPECT_RATIOS.map((ar) => (
                      <button
                        key={ar}
                        onClick={() => setAspectRatio(ar)}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          aspectRatio === ar ? 'bg-yellow text-black' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        {ar}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-5"
            >
              <h2 className="font-semibold text-white flex items-center gap-2">
                <ZoomIn size={18} className="text-yellow" />
                Effects & Style
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase font-medium mb-2 block">Zoom Level</label>
                  <div className="flex gap-2">
                    {ZOOM_LEVELS.map((z) => (
                      <button
                        key={z}
                        onClick={() => setZoomLevel(z)}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          zoomLevel === z ? 'bg-yellow text-black' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        {z}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-medium mb-2 block">Emoji</label>
                  <div className="flex flex-wrap gap-2">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        onClick={() => setEmoji(e === emoji ? '' : e)}
                        className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                          emoji === e ? 'bg-yellow text-black' : 'bg-gray-800 hover:bg-gray-700'
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-medium mb-2 block">Overlay</label>
                  <div className="grid grid-cols-2 gap-2">
                    {OVERLAYS.map((o) => (
                      <button
                        key={o}
                        onClick={() => setOverlay(o)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                          overlay === o ? 'bg-yellow text-black' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gray-900 rounded-2xl border border-gray-800 p-5 space-y-5"
            >
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Subtitles size={18} className="text-yellow" />
                Subtitles & Transitions
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-gray-400 uppercase font-medium mb-2 block">Subtitle Style</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SUBTITLE_STYLES.map((s) => (
                      <button
                        key={s}
                        onClick={() => setSubtitleStyle(s)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                          subtitleStyle === s ? 'bg-yellow text-black' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        {s.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-medium mb-2 block">Transition</label>
                  <div className="grid grid-cols-2 gap-2">
                    {TRANSITIONS.map((t) => (
                      <button
                        key={t}
                        onClick={() => setTransition(t)}
                        className={`px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                          transition === t ? 'bg-yellow text-black' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        {t.replace('-', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-400 uppercase font-medium mb-2 block">Pacing</label>
                  <div className="flex gap-2">
                    {PACINGS.map((p) => (
                      <button
                        key={p}
                        onClick={() => setPacing(p)}
                        className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                          pacing === p ? 'bg-yellow text-black' : 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
