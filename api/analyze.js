import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const { video_id, action } = req.body;
    if (!video_id) return res.status(400).json({ error: 'video_id required' });

    const { data: video, error: videoError } = await supabase.from('videos').select('*').eq('id', video_id).single();
    if (videoError || !video) return res.status(404).json({ error: 'Video not found' });

    if (action === 'start') {
      const { data: job } = await supabase.from('jobs').insert({
        video_id,
        status: 'processing',
        stage: 'downloading',
        progress: 0,
        stages: [
          { name: 'downloading', label: 'Downloading Video', progress: 0, status: 'active' },
          { name: 'extracting_audio', label: 'Extracting Audio', progress: 0, status: 'pending' },
          { name: 'detecting_highlights', label: 'Detecting Highlights', progress: 0, status: 'pending' },
          { name: 'rendering_clips', label: 'Rendering Clips', progress: 0, status: 'pending' },
          { name: 'generating_captions', label: 'Generating Captions', progress: 0, status: 'pending' },
        ],
      }).select().single();
      return res.status(200).json({ job, video });
    }

    if (action === 'update') {
      const { job_id, stage, progress, status, error, result_data } = req.body;
      const updates = { stage, progress, status };
      if (error) updates.error = error;
      if (result_data) updates.result_data = result_data;

      const { data: job, error: updateErr } = await supabase.from('jobs').update(updates).eq('id', job_id).select().single();
      if (updateErr) throw updateErr;
      return res.status(200).json({ job });
    }

    if (action === 'complete') {
      const { job_id, clips_data } = req.body;

      // Delete existing clips for this video
      await supabase.from('clips').delete().eq('video_id', video_id);

      // Insert new clips
      if (clips_data && clips_data.length > 0) {
        const { data: clips, error: insertErr } = await supabase.from('clips').insert(clips_data).select();
        if (insertErr) throw insertErr;

        await supabase.from('jobs').update({
          status: 'completed',
          stage: 'done',
          progress: 100,
          result_data: { clips_count: clips.length },
        }).eq('id', job_id);

        await supabase.from('videos').update({ status: 'analyzed' }).eq('id', video_id);

        return res.status(200).json({ clips, video });
      }
    }

    return res.status(200).json({ video });
  } catch (err) {
    console.error('Analyze error:', err);
    res.status(500).json({ error: err.message });
  }
}
