import { useRef, useEffect } from 'react';

interface EditorTimelineProps {
  duration: number;
  startTime: number;
  endTime: number;
  onStartChange: (time: number) => void;
  onEndChange: (time: number) => void;
  currentTime: number;
  onSeek: (time: number) => void;
}

export default function EditorTimeline({
  duration,
  startTime,
  endTime,
  onStartChange,
  onEndChange,
  currentTime,
  onSeek,
}: EditorTimelineProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const startPct = (startTime / duration) * 100;
  const endPct = (endTime / duration) * 100;
  const currentPct = (currentTime / duration) * 100;

  const handleTrackClick = (e: React.MouseEvent) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(pct * duration);
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-900 rounded-xl p-4 border border-gray-800">
      <div className="flex items-center justify-between mb-3 text-sm text-gray-400">
        <span>{formatTime(startTime)}</span>
        <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
        <span>{formatTime(endTime)}</span>
      </div>
      <div
        ref={trackRef}
        onClick={handleTrackClick}
        className="relative h-12 bg-gray-800 rounded-lg cursor-pointer overflow-hidden"
      >
        {/* Inactive segments */}
        <div className="absolute left-0 top-0 h-full bg-gray-800" style={{ width: `${startPct}%` }} />
        <div className="absolute top-0 h-full bg-gray-800" style={{ left: `${endPct}%`, width: `${100 - endPct}%` }} />
        {/* Active segment */}
        <div
          className="absolute top-0 h-full bg-yellow/20"
          style={{ left: `${startPct}%`, width: `${endPct - startPct}%` }}
        />
        {/* Start handle */}
        <div
          className="absolute top-0 h-full w-1 bg-yellow cursor-ew-resize z-10"
          style={{ left: `${startPct}%` }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            const startX = e.clientX;
            const startPctVal = startPct;
            const handleMove = (moveEvent: MouseEvent) => {
              if (!trackRef.current) return;
              const rect = trackRef.current.getBoundingClientRect();
              const deltaPct = ((moveEvent.clientX - startX) / rect.width) * 100;
              const newPct = Math.max(0, Math.min(endPct - 5, startPctVal + deltaPct));
              onStartChange((newPct / 100) * duration);
            };
            const handleUp = () => {
              window.removeEventListener('mousemove', handleMove);
              window.removeEventListener('mouseup', handleUp);
            };
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
          }}
        />
        {/* End handle */}
        <div
          className="absolute top-0 h-full w-1 bg-yellow cursor-ew-resize z-10"
          style={{ left: `${endPct}%` }}
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => {
            const startX = e.clientX;
            const endPctVal = endPct;
            const handleMove = (moveEvent: MouseEvent) => {
              if (!trackRef.current) return;
              const rect = trackRef.current.getBoundingClientRect();
              const deltaPct = ((moveEvent.clientX - startX) / rect.width) * 100;
              const newPct = Math.min(100, Math.max(startPct + 5, endPctVal + deltaPct));
              onEndChange((newPct / 100) * duration);
            };
            const handleUp = () => {
              window.removeEventListener('mousemove', handleMove);
              window.removeEventListener('mouseup', handleUp);
            };
            window.addEventListener('mousemove', handleMove);
            window.addEventListener('mouseup', handleUp);
          }}
        />
        {/* Current time indicator */}
        <div
          className="absolute top-0 h-full w-0.5 bg-white z-20"
          style={{ left: `${currentPct}%` }}
        />
      </div>
    </div>
  );
}
