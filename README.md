# 世界神话地图 · World Mythology Map

An interactive star-lit map of human storytelling — 189 hand-curated
myths, legends, and fairy tales from 38 cultures, plottable on either
a flat naturalEarth1 projection or a draggable 3D orthographic globe.
Filter by theme (Sun, Flood, Fire, Dragon, Love, …) to surface
cross-cultural narrative resonances; great-circle arcs connect myths
that share a motif across continents.

## Run locally

```bash
npm install
echo "GEMINI_API_KEY=your_key_here" > .env.local   # optional, for "Summon Myths"
npm run dev
```

Open `http://localhost:3000`.

## Tech

- React 19 + TypeScript + Vite
- d3-geo + topojson-client (world-atlas@2 fetched at runtime)
- Tailwind via CDN, custom CSS for nebula / aurora effects
- Canvas-driven parallax star field with occasional meteors
- @google/genai for runtime myth expansion (`gemini-2.5-flash`)

## Controls

| Key / gesture | Action |
|---|---|
| Drag | Rotate globe / pan map |
| Wheel | Zoom |
| `G` | Toggle flat ↔ globe |
| `R` | Auto-rotate (globe only) |
| `L` | Toggle marker labels |
| `+` / `-` | Zoom in / out |
| `Esc` | Clear selection |
| Click country | Open country detail panel |
| Click marker | Open story card |
| Theme chip | Filter + draw cross-culture arcs |

## Data shape

Each seed story (see `data/seeds.ts`) carries:

```ts
{
  id, title: { zh, en }, country: 'GRC',
  culture: { zh, en }, era: 'classical',
  themes: ['fire', 'hero'],  year: -800,
  emoji: '🔥', lnglat: [22.4, 39.0],
  image: 'https://upload.wikimedia.org/...',
  description: { zh, en },
}
```

`generated: true` stories are added at runtime by the Gemini service.
