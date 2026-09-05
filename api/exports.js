import supabase from './db-client.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();

  try {
    if (req.method === 'GET') {
      const { video_id, clip_id, id } = req.query;
      if (id) {
        const { data, error } = await supabase.from('exports').select('*').eq('id', id).single();
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (video_id) {
        const { data, error } = await supabase.from('exports').select('*').eq('video_id', video_id).order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      }
      if (clip_id) {
        const { data, error } = await supabase.from('exports').select('*').eq('clip_id', clip_id).order('created_at', { ascending: false });
        if (error) throw error;
        return res.status(200).json(data);
      }
      const { data, error } = await supabase.from('exports').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'POST') {
      const { clip_id, video_id, format, status } = req.body;
      const { data, error } = await supabase.from('exports').insert({ clip_id, video_id, format, status }).select().single();
      if (error) throw error;
      return res.status(201).json(data);
    }
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      const { data, error } = await supabase.from('exports').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return res.status(200).json(data);
    }
    if (req.method === 'DELETE') {
      const { id } = req.body;
      const { error } = await supabase.from('exports').delete().eq('id', id);
      if (error) throw error;
      return res.status(200).json({ ok: true });
    }
    res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('API error:', err);
    res.status(500).json({ error: err.message });
  }
}
