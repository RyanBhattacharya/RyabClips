import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Download, Sparkles, Film, Loader2, Play, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import { downloadBlob } from '../lib/videoProcessor';

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
  created_at: string;
}

interface Video {
  id: number;
  title: string;
  source_url: string;
  file_path: string;
  status: string;
  duration: number;
}

export default function ResultsPage() {
  const { videoId } = useParams();
  const navigate = useNavigate();
  const [video, setVideo] = useState<Video | null>(null);
  const [clips, setClips] = useState<Clip[]>([]);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [playingClip, setPlayingClip] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    if (!videoId) return;
    try {
      const videoRes = await fetch(`/api/videos?id=${videoId}`);
      const videoData = await videoRes.json();
      setVideo(videoData);

      const clipsRes = await fetch(`/api/clips?video_id=${videoId}`);
      const clipsData = await clipsRes.json();
      setClips(clipsData || []);
    } catch (err) {
      console.error('Fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [videoId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRegenerateAll = async () => {
    if (!videoId) return;
    setRegenerating(true);
    try {
      await fetch('/api/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ video_id: parseInt(videoId) }),
      });
      navigate(`/processing/${videoId}`);
    } catch (err) {
      console.error('Regenerate error:', err);
      setRegenerating(false);
    }
  };

  const handleDownloadClip = async (clip: Clip) => {
    const clipUrl = clip.thumbnail;
    if (!clipUrl) {
      // Fallback: download metadata
      const data = JSON.stringify({ ...clip, exportedAt: new Date().toISOString() }, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      downloadBlob(blob, `clip-${clip.id}-metadata.json`);
      return;
    }

    try {
      const res = await fetch(clipUrl);
      const blob = await res.blob();
      const ext = clipUrl.includes('.webm') ? 'webm' : clipUrl.includes('.mp4') ? 'mp4' : 'mp4';
      downloadBlob(blob, `ryabclip-${clip.id}.${ext}`);

      // Record export
      await fetch('/api/exports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clip_id: clip.id,
          video_id: clip.video_id,
          format: ext,
          status: 'completed',
        }),
      });
    } catch (err) {
      console.error('Download error:', err);
    }
  };

  const handleExportAll = async () => {
    if (!videoId || clips.length === 0) return;
    setExporting(true);

    try {
      for (const clip of clips) {
        if (clip.thumbnail) {
          const res = await fetch(clip.thumbnail);
          const blob = await res.blob();
          const ext = clip.thumbnail.includes('.webm') ? 'webm' : 'mp4';
          downloadBlob(blob, `ryabclip-${clip.id}.${ext}`);
        }

        await fetch('/api/exports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clip_id: clip.id,
            video_id: parseInt(videoId),
            format: 'webm',
            status: 'completed',
          }),
        });
      }
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleDownloadSRT = (clip: Clip) => {
    if (!clip.caption) return;
    // Generate simple SRT from caption
    const words = clip.caption.split(' ');
    const duration = clip.end_time - clip.start_time;
    const wordDuration = duration / words.length;
    let srt = '';
    for (let i = 0; i < words.length; i++) {
      const s = Math.floor((i * wordDuration) * 1000);
      const e = Math.floor(((i + 1) * wordDuration) * 1000);
      const formatTime = (ms: number) => {
        const m = Math.floor(ms / 60000);
        const sec = Math.floor((ms % 60000) / 1000);
        const mms = ms % 1000;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')},${String(mms).padStart(3, '0')}`;
      };
      srt += `${i + 1}\n${formatTime(s)} --> ${formatTime(e)}\n${words[i]}\n\n`;
    }
    const blob = new Blob([srt], { type: 'text/plain' });
    downloadBlob(blob, `clip-${clip.id}.srt`);
  };

  const videoUrl = video?.file_path || video?.source_url || '';

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="text-yellow animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading clips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black py-8 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
              <ArrowLeft size={18} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-white">AI-Generated Clips</h1>
              <p className="text-gray-400 text-sm">
                {video?.title} · {clips.length} clips generated
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRegenerateAll}
              disabled={regenerating}
              className="inline-flex items-center gap-2 bg-gray-800 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-50"
            >
              {regenerating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Regenerate All
            </button>
            <button
              onClick={handleExportAll}
              disabled={exporting || clips.length === 0}
              className="inline-flex items-center gap-2 bg-yellow text-black font-semibold px-6 py-2.5 rounded-xl hover:bg-yellow-dark transition-colors disabled:opacity-50"
            >
              {exporting ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
              Export All
            </button>
          </div>
        </div>

        {clips.length === 0 ? (
          <div className="text-center py-20">
            <Film size={48} className="text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No clips found. Try regenerating.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {clips.map((clip, index) => {
              const duration = clip.end_time - clip.start_time;
              const minutes = Math.floor(duration / 60);
              const seconds = Math.floor(duration % 60);
              const aspectRatioClass =
                clip.aspect_ratio === '9:16' ? 'aspect-[9/16]' :
                clip.aspect_ratio === '1:1' ? 'aspect-square' :
                'aspect-video';

              return (
                <motion.div
                  key={clip.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden hover:border-yellow/30 transition-all duration-300 group"
                >
                  <div className={`relative ${aspectRatioClass} bg-black`}>
                    {clip.thumbnail ? (
                      <video
                        src={clip.thumbnail}
                        className="w-full h-full object-cover"
                        preload="metadata"
                        muted={playingClip !== clip.id}
                        playsInline
                        onClick={() => {
                          const el = document.getElementById(`video-${clip.id}`) as HTMLVideoElement;
                          if (el) {
                            if (el.paused) { el.play(); setPlayingClip(clip.id); }
                            else { el.pause(); setPlayingClip(null); }
                          }
                        }}
                        id={`video-${clip.id}`}
                      />
                    ) : (
                      <video
                        src={videoUrl}
                        className="w-full h-full object-cover"
                        preload="metadata"
                        muted
                        playsInline
                        onClick={(e) => {
                          const el = e.currentTarget;
                          if (el.paused) el.play(); else el.pause();
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <span className="bg-yellow text-black text-xs font-bold px-2 py-1 rounded-md">
                        {clip.aspect_ratio}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 pointer-events-none">
                      <span className="bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1">
                        <Play size={12} />
                        {minutes}:{seconds.toString().padStart(2, '0')}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
                      <div className="bg-yellow text-black text-xs font-bold px-2 py-1 rounded-md inline-block mb-1">
                        {clip.hook}
                      </div>
                      <h3 className="text-white font-semibold text-sm leading-tight">{clip.title}</h3>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                      <span className="bg-gray-800 px-2 py-1 rounded">{clip.layout}</span>
                      <span className="bg-gray-800 px-2 py-1 rounded">{clip.zoom_level}</span>
                      <span className="bg-gray-800 px-2 py-1 rounded">{clip.pacing}</span>
                      <span className="text-lg leading-none">{clip.emoji}</span>
                    </div>
                    <p className="text-gray-400 text-sm line-clamp-2">{clip.caption}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownloadClip(clip)}
                        className="flex-1 flex items-center justify-center gap-2 bg-yellow text-black font-semibold text-sm py-2.5 rounded-lg hover:bg-yellow-dark transition-colors"
                      >
                        <Download size={16} />
                        Download
                      </button>
                      <button
                        onClick={() => navigate(`/editor/${clip.id}`)}
                        className="flex items-center justify-center gap-2 bg-gray-800 text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-gray-700 transition-colors"
                      >
                        Edit
                      </button>
                      {clip.caption && (
                        <button
                          onClick={() => handleDownloadSRT(clip)}
                          className="flex items-center justify-center gap-2 bg-gray-800 text-white font-semibold text-sm px-3 py-2.5 rounded-lg hover:bg-gray-700 transition-colors"
                          title="Download SRT"
                        >
                          <ExternalLink size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
