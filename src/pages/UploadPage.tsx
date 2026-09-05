import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Link2, X, Film, FileVideo, ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function UploadPage() {
  const navigate = useNavigate();
  const [dragActive, setDragActive] = useState(false);
  const [url, setUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<{ duration: number; width: number; height: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') setDragActive(true);
    else if (e.type === 'dragleave') setDragActive(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files?.[0]) handleFile(e.dataTransfer.files[0]);
  }, []);

  const handleFile = (file: File) => {
    if (!file.type.startsWith('video/')) return;
    setSelectedFile(file);
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    // Extract metadata
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = objectUrl;
    video.onloadedmetadata = () => {
      setVideoMetadata({
        duration: Math.round(video.duration),
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) handleFile(e.target.files[0]);
  };

  const simulateUpload = async () => {
    setUploading(true);
    for (let i = 0; i <= 100; i += 5) {
      setUploadProgress(i);
      await new Promise(r => setTimeout(r, 80));
    }
  };

  const uploadToStorage = async (file: File): Promise<string> => {
    const reader = new FileReader();
    return new Promise((resolve, reject) => {
      reader.onload = async () => {
        try {
          const base64 = (reader.result as string).split(',')[1];
          const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileName: file.name,
              fileBase64: base64,
              contentType: file.type,
            }),
          });
          const { url: fileUrl } = await res.json();
          resolve(fileUrl);
        } catch (e) {
          reject(e);
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUploadFile = async () => {
    if (!selectedFile) return;
    await simulateUpload();

    try {
      const fileUrl = await uploadToStorage(selectedFile);

      const videoRes = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: selectedFile.name,
          source_url: '',
          file_path: fileUrl,
          status: 'uploaded',
          duration: videoMetadata?.duration || 180,
          thumbnail: '',
          width: videoMetadata?.width || 0,
          height: videoMetadata?.height || 0,
        }),
      });
      const video = await videoRes.json();
      navigate(`/processing/${video.id}`);
    } catch (err) {
      console.error('Upload error:', err);
      alert('Upload failed. Please try again.');
      setUploading(false);
    }
  };

  const handlePasteUrl = async () => {
    if (!url.trim()) return;

    const isMp4Url = url.trim().match(/\.mp4|\.webm|\.mov|\.avi/i) || url.trim().includes('commondatastorage.googleapis.com');

    await simulateUpload();

    try {
      let fileUrl = url.trim();

      // For direct MP4 URLs, try to download to storage
      if (isMp4Url) {
        try {
          const downloadRes = await fetch('/api/download', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url: url.trim() }),
          });
          if (downloadRes.ok) {
            const { url: storedUrl } = await downloadRes.json();
            fileUrl = storedUrl;
          }
        } catch (e) {
          console.warn('Download to storage failed, using URL directly:', e);
        }
      }

      // Extract metadata from URL
      let duration = 180;
      let width = 0;
      let height = 0;

      try {
        const video = document.createElement('video');
        video.crossOrigin = 'anonymous';
        video.src = fileUrl;
        await new Promise<void>((resolve, reject) => {
          video.onloadedmetadata = () => {
            duration = Math.round(video.duration) || 180;
            width = video.videoWidth || 0;
            height = video.videoHeight || 0;
            resolve();
          };
          video.onerror = () => resolve();
          setTimeout(() => resolve(), 5000);
        });
      } catch (e) {
        console.warn('Metadata extraction failed:', e);
      }

      const videoRes = await fetch('/api/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Video from URL',
          source_url: url.trim(),
          file_path: fileUrl,
          status: 'uploaded',
          duration,
          thumbnail: '',
          width,
          height,
        }),
      });
      const video = await videoRes.json();
      navigate(`/processing/${video.id}`);
    } catch (err) {
      console.error('URL processing error:', err);
      alert('Failed to process URL. Please try again.');
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-gray-400 hover:text-white mb-8 transition-colors">
          <ArrowLeft size={18} />
          Back to home
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-white mb-2">Create Clips</h1>
          <p className="text-gray-400 mb-8">Upload a video or paste a link to get started.</p>

          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-1 mb-8">
            <div className="flex gap-1">
              <button
                onClick={() => { setSelectedFile(null); setPreviewUrl(null); setUrl(''); }}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${!selectedFile && !previewUrl ? 'bg-yellow text-black' : 'text-gray-400 hover:text-white'}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Upload size={16} />
                  Upload File
                </div>
              </button>
              <button
                onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${!selectedFile && !previewUrl ? 'text-gray-400 hover:text-white' : 'bg-yellow text-black'}`}
              >
                <div className="flex items-center justify-center gap-2">
                  <Link2 size={16} />
                  Paste Link
                </div>
              </button>
            </div>
          </div>

          {!selectedFile && !previewUrl ? (
            <div className="space-y-6">
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => inputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-300 ${
                  dragActive ? 'border-yellow bg-yellow/5' : 'border-gray-700 hover:border-gray-500 bg-gray-900/50'
                }`}
              >
                <input ref={inputRef} type="file" accept="video/*" className="hidden" onChange={handleFileInput} />
                <div className="w-16 h-16 bg-yellow/10 rounded-2xl flex items-center justify-center text-yellow mx-auto mb-4">
                  <FileVideo size={32} />
                </div>
                <p className="text-white font-semibold mb-1">Drop your video here</p>
                <p className="text-gray-500 text-sm">or click to browse. MP4, MOV, AVI up to 500MB</p>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-800" />
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-black px-4 text-gray-500 text-sm">or paste a link</span>
                </div>
              </div>

              <div className="flex gap-3">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Paste YouTube, TikTok, or any video URL..."
                  className="flex-1 bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-yellow transition-colors"
                />
                <button
                  onClick={handlePasteUrl}
                  disabled={!url.trim() || uploading}
                  className="bg-yellow text-black font-semibold px-6 py-3 rounded-xl hover:bg-yellow-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Processing...' : 'Clip It'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
                {previewUrl ? (
                  <video src={previewUrl} className="w-full aspect-video object-cover" controls muted />
                ) : (
                  <div className="w-full aspect-video bg-gray-800 flex items-center justify-center">
                    <Film size={48} className="text-gray-600" />
                  </div>
                )}
                <div className="p-4 flex items-center justify-between">
                  <div>
                    <p className="text-white font-medium">{selectedFile?.name || 'Video from URL'}</p>
                    <p className="text-gray-500 text-sm">
                      {selectedFile ? `${(selectedFile.size / 1024 / 1024).toFixed(1)} MB` : url}
                    </p>
                    {videoMetadata && (
                      <p className="text-gray-500 text-xs mt-1">
                        {videoMetadata.width}×{videoMetadata.height} · {Math.floor(videoMetadata.duration / 60)}:{(videoMetadata.duration % 60).toString().padStart(2, '0')}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => { setSelectedFile(null); setPreviewUrl(null); setUrl(''); setVideoMetadata(null); }}
                    className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Uploading...</span>
                    <span className="text-yellow font-semibold">{uploadProgress}%</span>
                  </div>
                  <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full bg-yellow rounded-full"
                      animate={{ width: `${uploadProgress}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>
              )}

              {!uploading && (
                <button
                  onClick={selectedFile ? handleUploadFile : handlePasteUrl}
                  className="w-full bg-yellow text-black font-bold text-lg py-4 rounded-xl hover:bg-yellow-dark transition-all hover:scale-[1.02]"
                >
                  {selectedFile ? 'Upload & Analyze' : 'Analyze Video'}
                </button>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
