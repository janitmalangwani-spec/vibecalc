# 🧮 Vibe Calc

The vibiest little calculator on the web — crafted with love, one key at a time ✨

A playful, theme-able calculator with:

- **10 themes** (Black, Midnight, Paper, Rainbow, Sunset, Ocean, Neon, Candy, Retro, Forest) — pick from the swatches or hit the 🎲
- **Sound effects** synthesized with the Web Audio API — no audio files, no internet
- **Memory keys** (MC / MR / M+ / M−), **Ans**, **%**, **√x**, **±**
- **Keyboard support** — digits, `+ - * /`, `Enter`/`=`, `Escape` (AC), `Backspace`, `%`, `.`, `r` (MR)
- **Confetti** on every correct answer 🎉
- A **single-file offline build** visitors can download and run with no internet

## Run locally

Open `index.html` in any browser — no server, no build step, no internet needed.

## Offline single-file build

`vibe-calc.html` is a self-contained copy of the site (CSS + JS inlined). The
"⬇ download & run offline" button on the site hands this file to visitors —
they can double-click it anywhere and the whole calculator works.

It's generated, not hand-edited. After changing `index.html` / `styles.css` /
`app.js`, rebuild it with:

```sh
python3 build-offline.py
```

## Deploy

Any static host works (GitHub Pages, Netlify, Vercel, Cloudflare Pages…).
Upload `index.html`, `styles.css`, `app.js`, and `vibe-calc.html` **together**
— the download link is relative, so the single-file build must sit next to
`index.html`.

### GitHub Pages

1. Create a **public** repo on GitHub named `vibecalc` (free Pages requires a public repo).
2. Push this project:

   ```sh
   git remote add origin https://github.com/janitmalangwani-spec/vibecalc.git
   git push -u origin main
   ```

3. In the repo: **Settings → Pages → Build and deployment** → Source: *Deploy from a branch* → branch `main`, folder `/ (root)` → **Save**.
4. Wait ~1 minute, then visit `https://janitmalangwani-spec.github.io/vibecalc/`

---

Made by janit · want a website like this, or have feedback? ✉️ janitmalangwani@gmail.com
