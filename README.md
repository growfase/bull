# BULLFUN — Put The Horns On 🤘

First-person brawler landing page. Face the Bull in the alley: click to punch,
hold to block, knock him out. A tribute to the classic Flash-era brawlers,
restyled with the BULLFUN identity (deep black + neon green glow).

## Run locally

It's a static site — just open `index.html`, or serve the folder:

```sh
npx http-server -p 4173 .
```

## Swapping in final art

All game art is currently drawn as inline SVG placeholders. When final assets
are ready, drop the files into `assets/` and point the paths in the `ASSETS`
object at the top of `js/game.js`:

```js
const ASSETS = {
  background:  'assets/bg.png',          // full stage backdrop (16:10.3, ~1600×1030)
  opponent:    'assets/bull.png',        // full-body opponent (~3:4, transparent, ~600×800)
  enemyFist:   'assets/enemy-fist.png',  // opponent's fist flying at the camera (square)
  fistLeft:    'assets/fist.png',        // player fist (right one is auto-mirrored)
  fistRight:   null,                     // optional — null mirrors the left fist
  blockArms:   'assets/block.png',       // raised blocking arms (wide, covers the stage)
  enemyAvatar: 'assets/face.png',        // opponent's face in the HUD (square)
};
```

Anything left as `null` keeps its SVG placeholder. Use PNG or WebP with
transparency (except `background`).

## Gameplay

- **Click** anywhere on the stage to punch — +250 pts per hit
- **Hold** the BLOCK bar (or **SPACE**) when the red fist comes — blocked
  attacks earn +500 pts and daze the Bull
- Empty his health bar before he empties yours
