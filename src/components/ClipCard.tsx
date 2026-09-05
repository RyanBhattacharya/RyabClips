import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Clock, Download, Edit, Sparkles } from 'lucide-react';

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
  created_at: string;
}

interface ClipCardProps {
  clip: Clip;
  index: number;
  videoUrl: string;
  onDownload: (clip: Clip) => void;
  onRegenerate: (clip: Clip) => void;
}

export default function ClipCard({ clip, index, videoUrl, onDownload, onRegenerate }: ClipCardProps) {
  const navigate = useNavigate();
  const duration = clip.end_time - clip.start_time;
  const minutes = Math.floor(duration / 60);
  const seconds = Math.floor(duration % 60);

  const aspectRatioClass =
    clip.aspect_ratio === '9:16' ? 'aspect-[9/16]' :
    clip.aspect_ratio === '1:1' ? 'aspect-square' :
    'aspect-video';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden hover:border-yellow/30 transition-all duration-300 group"
    >
      <div className={`relative ${aspectRatioClass} bg-black`}>
        <video
          src={videoUrl}
          className="w-full h-full object-cover"
          preload="metadata"
          muted
          loop
          playsInline
          onMouseEnter={(e) => e.currentTarget.play()}
          onMouseLeave={(e) => { e.currentTarget.pause(); e.currentTarget.currentTime = clip.start_time; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute top-3 left-3">
          <span className="bg-yellow text-black text-xs font-bold px-2 py-1 rounded-md">
            {clip.aspect_ratio}
          </span>
        </div>
        <div className="absolute top-3 right-3">
          <span className="bg-black/70 text-white text-xs font-medium px-2 py-1 rounded-md flex items-center gap-1">
            <Clock size={12} />
            {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
        </div>
        <div className="absolute bottom-3 left-3 right-3">
          <div className="bg-yellow text-black text-xs font-bold px-2 py-1 rounded-md inline-block mb-1">
            {clip.hook}
          </div>
          <h3 className="text-white font-semibold text-sm leading-tight">{clip.title}</h3>
        </div>
      </div>
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <span className="bg-gray-800 px-2 py-1 rounded">{clip.layout}</span>
          <span className="bg-gray-800 px-2 py-1 rounded">{clip.zoom_level}</span>
          <span className="bg-gray-800 px-2 py-1 rounded">{clip.pacing}</span>
          <span className="text-lg leading-none">{clip.emoji}</span>
        </div>
        <p className="text-gray-400 text-sm line-clamp-2">{clip.caption}</p>
        <div className="flex gap-2">
          <button
            onClick={() => onDownload(clip)}
            className="flex-1 flex items-center justify-center gap-2 bg-yellow text-black font-semibold text-sm py-2.5 rounded-lg hover:bg-yellow-dark transition-colors"
          >
            <Download size={16} />
            Download
          </button>
          <button
            onClick={() => navigate(`/editor/${clip.id}`)}
            className="flex items-center justify-center gap-2 bg-gray-800 text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Edit size={16} />
          </button>
          <button
            onClick={() => onRegenerate(clip)}
            className="flex items-center justify-center gap-2 bg-gray-800 text-white font-semibold text-sm px-4 py-2.5 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <Sparkles size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}
