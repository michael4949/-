import { GoogleGenAI, Type, type Schema } from '@google/genai';
import type { Story, ThemeId, EraId } from '../types';
import { COUNTRY_BY_ISO } from '../data/countries';
import { THEMES, ERAS, eraForYear } from '../data/themes';

const SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    stories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          titleZh: { type: Type.STRING },
          titleEn: { type: Type.STRING },
          cultureZh: { type: Type.STRING },
          cultureEn: { type: Type.STRING },
          year: { type: Type.INTEGER, description: 'Approximate year. Negative = BCE.' },
          themes: {
            type: Type.ARRAY,
            items: { type: Type.STRING, description: 'Theme id from the allowed set.' },
          },
          emoji: { type: Type.STRING, description: 'A single emoji that visually evokes the myth.' },
          lng: { type: Type.NUMBER, description: 'Longitude (decimal degrees).' },
          lat: { type: Type.NUMBER, description: 'Latitude (decimal degrees).' },
          descZh: { type: Type.STRING, description: '简体中文 60-90 字描述。' },
          descEn: { type: Type.STRING, description: 'English description, 100-160 chars.' },
        },
        required: ['titleZh', 'titleEn', 'cultureZh', 'cultureEn', 'year', 'themes', 'emoji', 'lng', 'lat', 'descZh', 'descEn'],
      },
    },
  },
  required: ['stories'],
};

const apiKey = (typeof process !== 'undefined' && (process.env?.API_KEY || process.env?.GEMINI_API_KEY)) || '';

export function canUseGemini(): boolean {
  return Boolean(apiKey);
}

interface GeminiStory {
  titleZh: string; titleEn: string;
  cultureZh: string; cultureEn: string;
  year: number;
  themes: string[];
  emoji: string;
  lng: number; lat: number;
  descZh: string; descEn: string;
}

const allowedThemes = THEMES.map(t => t.id) as ThemeId[];

function sanitizeStory(raw: GeminiStory, country: string, idx: number): Story | null {
  if (!raw?.titleEn || !raw.descEn) return null;
  const themes = (raw.themes ?? [])
    .map(t => t.toLowerCase().trim())
    .filter((t): t is ThemeId => allowedThemes.includes(t as ThemeId));
  if (themes.length === 0) themes.push('hero');
  const emoji = (raw.emoji ?? '✨').slice(0, 4);
  const id = `gen-${country}-${Date.now().toString(36)}-${idx}`;
  return {
    id,
    title: { zh: raw.titleZh ?? raw.titleEn, en: raw.titleEn },
    country,
    culture: { zh: raw.cultureZh ?? '', en: raw.cultureEn ?? '' },
    era: eraForYear(raw.year),
    themes,
    year: typeof raw.year === 'number' ? raw.year : undefined,
    emoji,
    lnglat: [Number(raw.lng), Number(raw.lat)],
    description: { zh: raw.descZh ?? '', en: raw.descEn },
    generated: true,
  };
}

export async function generateMyths(countryIso: string, n: number = 5): Promise<Story[]> {
  if (!apiKey) throw new Error('GEMINI_API_KEY missing. Set it in your .env to summon new myths.');
  const country = COUNTRY_BY_ISO[countryIso];
  if (!country) throw new Error(`Unknown country ${countryIso}`);

  const ai = new GoogleGenAI({ apiKey });

  const themeList = THEMES.map(t => `${t.id} (${t.zh}/${t.en})`).join(', ');
  const prompt = `You are a folklorist. Produce ${n} additional authentic myths, legends, or fairy tales from the mythology of ${country.en} / ${country.zh}.

Rules:
- Each story MUST be a real, attested myth or legend from this culture's traditional canon. No invented stories.
- Avoid the most globally-famous tier (e.g. Prometheus, Snow White). Pick less-commonly-known but genuinely traditional ones.
- "themes" must use ONLY ids from this allowed set: [${themeList}]. Pick 1-3.
- "emoji" should be a single, evocative emoji.
- "lng"/"lat" should be the geographic point in ${country.en} most associated with the myth (region, city, mountain, river).
- "year" is approximate; use negative integers for BCE (e.g. -1500). For undated folk tales, pick a plausible century.
- "descZh" must be in Simplified Chinese, 60-90 characters, vivid, single sentence.
- "descEn" must be in English, 100-160 characters, vivid, single sentence.
- "cultureZh"/"cultureEn" name the pantheon or canon (e.g. "Norse mythology" / "北欧神话").

Output strict JSON matching the schema. No commentary.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: SCHEMA,
      temperature: 0.85,
    },
  });

  const text = response.text;
  if (!text) throw new Error('Empty Gemini response');
  const parsed = JSON.parse(text) as { stories: GeminiStory[] };
  const stories = (parsed.stories ?? [])
    .map((r, i) => sanitizeStory(r, countryIso, i))
    .filter((s): s is Story => s !== null);
  if (stories.length === 0) throw new Error('No usable stories returned');
  return stories;
}
