import supabase from './db-client.js';

const LAYOUTS = ['split-screen', 'full-screen', 'face-cam', 'b-roll', 'reaction', 'talking-head', 'screen-share', 'picture-in-picture'];
const ASPECT_RATIOS = ['9:16', '1:1', '16:9'];
const ZOOM_LEVELS = ['1.0x', '1.2x', '1.5x', '2.0x'];
const EMOJIS = ['🔥', '💯', '⚡', '👀', '🤯', '💡', '🎯', '🚀', '❤️', '👍', '🎉', '💪'];
const OVERLAYS = ['none', 'gradient', 'blur', 'vignette', 'spotlight', 'text-bg'];
const TRANSITIONS = ['cut', 'fade', 'zoom-in', 'zoom-out', 'slide', 'spin', 'bounce'];
const SUBTITLE_STYLES = ['highlight-words', 'karaoke', 'plain', 'bouncy', 'typewriter', 'gradient-text'];
const PACINGS = ['fast', 'medium', 'slow'];

const HOOKS = [
  'You won\'t believe what happened next...',
  'This changed everything for me.',
  'The secret nobody talks about.',
  'Wait for it...',
  'I was shocked when I found this out.',
  'This is the #1 mistake everyone makes.',
  'The truth about [topic] will surprise you.',
  'I tried this for 30 days and...',
  'What if I told you...',
  'This is why most people fail.',
  'The moment everything clicked.',
  'Stop doing this immediately.',
];

const TITLES = [
  'The Ultimate Guide',
  'Top 5 Secrets Revealed',
  'Day in the Life',
  'Before vs After',
  'How I Did It',
  'The Real Story',
  'Myth Busted',
  'Beginner to Pro',
  'What I Learned',
  'Game Changer',
  'Hidden Truth',
  'Step by Step',
];

const CAPTIONS = [
  'When you finally realize the truth...',
  'This one tip changed my entire approach.',
  'The biggest plot twist in the story.',
  'I never expected this to happen.',
  'Here is the moment of clarity.',
  'This is what separates winners from losers.',
  'The technique nobody teaches you.',
  'Watch until the end for the reveal.',
  'This simple hack saved me hours.',
  'The reaction says it all.',
  'When everything finally makes sense.',
  'Proof that consistency pays off.',
];

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { video_id } = req.body;
    if (!video_id) return res.status(400).json({ error: 'video_id required' });

    await supabase.from('clips').delete().eq('video_id', video_id);

    const { data: video } = await supabase.from('videos').select('*').eq('id', video_id).single();
    const duration = video?.duration || 180;

    const clips = [];
    const count = Math.min(Math.max(Math.floor(duration / 30), 2), 8);
    const segmentSize = duration / count;

    for (let i = 0; i < count; i++) {
      const start = Math.round(i * segmentSize + Math.random() * segmentSize * 0.3);
      const end = Math.round(start + 15 + Math.random() * 45);
      const clipDuration = Math.min(end - start, duration - start);
      if (clipDuration < 10) continue;

      clips.push({
        video_id,
        start_time: start,
        end_time: start + clipDuration,
        caption: CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)],
        hook: HOOKS[Math.floor(Math.random() * HOOKS.length)],
        title: TITLES[Math.floor(Math.random() * TITLES.length)],
        layout: LAYOUTS[Math.floor(Math.random() * LAYOUTS.length)],
        aspect_ratio: ASPECT_RATIOS[Math.floor(Math.random() * ASPECT_RATIOS.length)],
        zoom_level: ZOOM_LEVELS[Math.floor(Math.random() * ZOOM_LEVELS.length)],
        emoji: EMOJIS[Math.floor(Math.random() * EMOJIS.length)],
        overlay: OVERLAYS[Math.floor(Math.random() * OVERLAYS.length)],
        transition: TRANSITIONS[Math.floor(Math.random() * TRANSITIONS.length)],
        subtitle_style: SUBTITLE_STYLES[Math.floor(Math.random() * SUBTITLE_STYLES.length)],
        pacing: PACINGS[Math.floor(Math.random() * PACINGS.length)],
      });
    }

    const { data, error } = await supabase.from('clips').insert(clips).select();
    if (error) throw error;

    return res.status(200).json({ clips: data });
  } catch (err) {
    console.error('Regenerate error:', err);
    res.status(500).json({ error: err.message });
  }
}
