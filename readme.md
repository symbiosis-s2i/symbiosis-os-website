# Symbiosis landing page

Static site. No build step, no framework, no runtime dependency. Serve the
directory and it works.

```
npx http-server site -p 8901
# or
python3 -m http.server 8901 -d site
```

## Where the design came from

The visual design was authored in Claude Design. That tool's component
runtime forbids stylesheets, so the artifact it produced carried every rule
in an inline `style` attribute, kept hover states in a `style-hover`
attribute its runtime read, drove all responsive behaviour from a single JS
resize listener, and shipped React plus a component runtime to render static
markup.

This directory is that design ported to a real page. The layout is
unchanged - the inline styles the design shipped with are still there, on
purpose, because rewriting 1,376 of them into classes would be a redesign in
everything but name. What changed is everything the design needed in order
to be correct rather than merely to look correct. `DESIGN.md` in the repo
root records that pass in full.

## Layout

| Path | What it is |
|---|---|
| `index.html` | The page. 22 sections, Bulgarian in the markup so it reads and indexes without JavaScript |
| `styles.css` | Webfaces, reset, keyframes, the 20 hover/focus states, the breakpoints |
| `app.js` | Reveal, scroll chrome, score dial, ratio bars, Cinema slate, FAQ accordion, menu, language |
| `i18n.js` | BG and EN, 550 keys each, covering every `data-i` and `data-ia` in the markup |
| `assets/fonts/` | 7 subset woff2: Inter and JetBrains Mono (variable, Latin + Cyrillic), Playfair Display italic, and a 21-glyph symbol face |
| `assets/img/` | 3 persona portraits, 2 marks, 1 favicon - WebP |

Full-resolution originals live in `brand-assets/` at the repo root, out of
the deploy path.

## Language

Bulgarian is the markup default; `app.js` swaps to English on request.
`?lang=en` in the URL wins over whatever the browser last stored, so the
`hreflang` alternates actually resolve. Both languages carry translated
`alt` text and `aria-label`s via `data-ia`.

## Things worth knowing before editing

- **Inline styles beat class selectors.** Every hover rule in `styles.css`
  carries `!important` for that reason. If you add a hover state, follow the
  same pattern or it will silently do nothing.
- **`data-mob="hide"` / `data-mob="only"`** are driven by media queries now,
  not JavaScript. Do not reintroduce a resize listener for them.
- **The symbol face matters.** `▶ ✓ ✕ ◆ ◉ ✦ →` and the rest of the geometric
  marks exist in neither Inter nor JetBrains Mono. Without `SymIcons` in the
  font stack, iOS and Android resolve several of them as colour emoji.
- **`Instrument Serif` has no Cyrillic.** That is why the hero's third line
  is set in Playfair Display. Do not swap it back.
