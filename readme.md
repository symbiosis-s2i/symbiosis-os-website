# Symbiosis OS landing page

Static site: no build step, no framework, no runtime dependency. Netlify publishes `main` as it is.

```
python3 -m http.server 8901
```

## Files

| Path | What it is |
|---|---|
| `index.html` | The page, with the Bulgarian text in the markup so it reads and indexes without JavaScript |
| `styles.css` | The platform's palette and type, layout, the breakpoints |
| `app.js` | Language switch, phone menu, header hairline, one fade-in per block |
| `i18n.js` | English for every `data-i` and `data-ia` key in the markup |
| `assets/fonts/` | Manrope, Unbounded and JetBrains Mono, Latin and Cyrillic subsets, the same files the platform uses |
| `assets/img/` | Persona portraits, the two marks, the favicon (WebP) |

## Rules the page keeps

- **The platform's look.** Ink ground `#090a12`, violet `#5b61e4` as the one accent for actions, electric cyan
  `#00d4ff` only inside data. Manrope for text, Unbounded for large headlines, JetBrains Mono for timecodes.
- **Standard Cyrillic letterforms.** The page is `lang="bg"`, which would switch on the fonts' Bulgarian forms
  (д like g); `font-feature-settings: "locl" 0` keeps the shapes the platform shows.
- **Fast on slow phones.** Nothing loops, nothing blurs, images below the first screen load lazily, and the only
  motion is a short fade when a block first appears (none with reduced motion).
- **Only true claims.** Numbers in the previews are labeled as samples; research figures link to their source.
  Do not add customer results or features the platform does not have.
- **Every text in both languages.** A new `data-i` key in `index.html` needs its English entry in `i18n.js`.
- **No em dashes, no emoji, no exclamation marks.**
