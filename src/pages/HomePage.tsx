import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Link2, Scissors, Zap, Type, Layout, Film, ArrowRight } from 'lucide-react';

const features = [
  { icon: <Scissors size={24} />, title: 'AI Highlight Detection', desc: 'Automatically finds the best moments' },
  { icon: <Type size={24} />, title: 'Auto-Captions', desc: 'Perfect subtitles for every clip' },
  { icon: <Layout size={24} />, title: 'Smart Layouts', desc: 'Optimized for TikTok, Reels, Shorts' },
  { icon: <Zap size={24} />, title: 'Dynamic Zooms', desc: 'Punch-ins that keep viewers engaged' },
  { icon: <Film size={24} />, title: 'Auto-Transitions', desc: 'Smooth cuts between highlights' },
  { icon: <Upload size={24} />, title: 'One-Click Export', desc: 'Download ready-to-post clips' },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black">
      <section className="relative overflow-hidden pt-20 pb-32 px-4">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-yellow/10 via-transparent to-transparent" />
        <div className="relative max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-yellow/10 border border-yellow/20 text-yellow px-4 py-2 rounded-full text-sm font-medium mb-8">
              <Zap size={16} />
              AI-Powered Video Clipping
            </div>
            <h1 className="text-5xl sm:text-7xl font-bold text-white tracking-tight mb-6">
              Turn long videos into
              <span className="text-yellow"> viral clips</span>
            </h1>
            <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-12">
              Upload any video or paste a link. Our AI identifies the best moments, 
              adds captions, and generates clips optimized for TikTok, Reels, and Shorts.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/upload"
                className="inline-flex items-center justify-center gap-3 bg-yellow text-black font-bold text-lg px-8 py-4 rounded-xl hover:bg-yellow-dark transition-all duration-200 hover:scale-105"
              >
                <Upload size={20} />
                Upload Video
                <ArrowRight size={18} />
              </Link>
              <Link
                to="/upload"
                className="inline-flex items-center justify-center gap-3 bg-gray-900 text-white font-bold text-lg px-8 py-4 rounded-xl border border-gray-700 hover:border-gray-500 transition-all duration-200"
              >
                <Link2 size={20} />
                Paste Link
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="py-20 px-4 border-t border-gray-900">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">Everything You Need</h2>
            <p className="text-gray-400">All the features of professional video clipping, zero complexity.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-900/50 border border-gray-800 rounded-2xl p-6 hover:border-yellow/20 transition-all duration-300"
              >
                <div className="w-12 h-12 bg-yellow/10 rounded-xl flex items-center justify-center text-yellow mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-gray-400 text-sm">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 px-4 border-t border-gray-900">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to clip?</h2>
          <p className="text-gray-400 mb-8">Start creating viral short-form content in seconds.</p>
          <Link
            to="/upload"
            className="inline-flex items-center justify-center gap-3 bg-yellow text-black font-bold text-lg px-8 py-4 rounded-xl hover:bg-yellow-dark transition-all duration-200 hover:scale-105"
          >
            <Upload size={20} />
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}
