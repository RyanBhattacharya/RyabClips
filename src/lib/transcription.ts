export interface WordTimestamp {
  word: string;
  start: number;
  end: number;
}

export interface TranscriptSegment {
  text: string;
  start: number;
  end: number;
  words: WordTimestamp[];
}

const CAPTION_TEMPLATES = [
  'When you finally realize the truth about this topic...',
  'This one tip completely changed my entire approach to everything.',
  'The biggest plot twist in the story that nobody expected.',
  'I never expected this to happen when I started.',
  'Here is the moment of clarity that changed everything.',
  'This is what separates winners from losers in this field.',
  'The technique nobody teaches you in school.',
  'Watch until the end for the reveal you need to see.',
  'This simple hack saved me hours of frustration every day.',
  'The reaction says it all about what happened next.',
  'When everything finally makes sense in this moment.',
  'Proof that consistency pays off over time.',
  'The secret that most people never figure out.',
  'What happened next completely blew my mind.',
  'This is the advice I wish I had heard sooner.',
  'The moment you realize you were doing it wrong all along.',
  'How I discovered the shortcut everyone is looking for.',
  'This technique will save you years of trial and error.',
  'The number one mistake I see beginners make every day.',
  'What the experts do not want you to know about this.',
];

const HOOK_TEMPLATES = [
  'You will not believe what happened next...',
  'This changed everything for me.',
  'The secret nobody talks about.',
  'Wait for it...',
  'I was shocked when I found this out.',
  'This is the number one mistake everyone makes.',
  'The truth about this topic will surprise you.',
  'I tried this for thirty days and...',
  'What if I told you...',
  'This is why most people fail.',
  'The moment everything clicked.',
  'Stop doing this immediately.',
  'Nobody is talking about this.',
  'This is the game changer you need.',
  'The one thing they do not teach you.',
];

const TITLE_TEMPLATES = [
  'The Ultimate Guide',
  'Top Five Secrets Revealed',
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
  'The Complete Breakdown',
  'Must Watch',
  'Mind Blown',
];

export function generateTranscriptForSegment(
  start: number,
  end: number,
  segmentIndex: number
): { caption: string; hook: string; title: string; words: WordTimestamp[]; srt: string } {
  const caption = CAPTION_TEMPLATES[segmentIndex % CAPTION_TEMPLATES.length];
  const hook = HOOK_TEMPLATES[segmentIndex % HOOK_TEMPLATES.length];
  const title = TITLE_TEMPLATES[segmentIndex % TITLE_TEMPLATES.length];

  const words: WordTimestamp[] = [];
  const wordList = caption.split(' ');
  const duration = end - start;
  const wordDuration = duration / wordList.length;

  for (let i = 0; i < wordList.length; i++) {
    words.push({
      word: wordList[i],
      start: start + i * wordDuration,
      end: start + (i + 1) * wordDuration,
    });
  }

  const srt = generateSRT([{ text: caption, start, end, words }], start);

  return { caption, hook, title, words, srt };
}

export function generateSRT(segments: TranscriptSegment[], clipOffset: number = 0): string {
  let srt = '';
  let index = 1;

  for (const seg of segments) {
    for (const word of seg.words) {
      const s = formatSRTTime(word.start - clipOffset);
      const e = formatSRTTime(word.end - clipOffset);
      srt += `${index}\n${s} --> ${e}\n${word.word}\n\n`;
      index++;
    }
  }

  return srt;
}

export function generateVTT(segments: TranscriptSegment[], clipOffset: number = 0): string {
  let vtt = 'WEBVTT\n\n';

  for (const seg of segments) {
    for (const word of seg.words) {
      const s = formatVTTTime(word.start - clipOffset);
      const e = formatVTTTime(word.end - clipOffset);
      vtt += `${s} --> ${e}\n${word.word}\n\n`;
    }
  }

  return vtt;
}

function formatSRTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)},${pad3(ms)}`;
}

function formatVTTTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${pad(h)}:${pad(m)}:${pad(s)}.${pad3(ms)}`;
}

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function pad3(n: number): string {
  return n.toString().padStart(3, '0');
}
