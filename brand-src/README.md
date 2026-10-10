# Privlee brand kit

**The idea:** a refined serif **P** with a small gold **keyhole** in its bowl - the secret inside.
The wordmark uses the same P as its first letter: **P**riv + *lee* (roman ink, then gold italic).

Everything is drawn as vector outlines from Cormorant Garamond (open licence), so nothing depends on a
font loading. The files live in `public/brand/` (and `public/favicon.svg` plus a few PNGs at the top
of `public/`). Open `brand-src/preview.html` to see them all.

## Colours

| | Hex | Use |
|---|---|---|
| Ink | `#1d1a16` | text, the dark app-icon tile |
| Cream | `#faf6ef` | backgrounds, text on dark |
| Gold | gradient `#8f5f26` > `#d4a762` > `#9a6a2d` | the keyhole, the "lee", the symbol |
| Gold (flat) | `#a8763a` | where a gradient is not possible |

## Files

| File | For |
|---|---|
| `privlee-wordmark.svg` | the main logo, on light backgrounds |
| `privlee-wordmark-on-dark.svg` | on dark backgrounds |
| `privlee-wordmark-ink.svg` / `-white.svg` | one colour: print, stamps, anything that cannot carry gold |
| `privlee-symbol.svg` (+ `-ink`, `-white`) | the P alone, transparent: avatars, small marks |
| `privlee-icon.svg` | app icon: the symbol on an ink tile with rounded corners |
| `privlee-icon-square.svg` | the same without rounded corners, for stores that round it themselves |
| `og-image.png` | the 1200x630 picture shown when a link is shared |
| `*-1600.png`, `*-1024.png` | PNG copies for places that cannot use SVG |
| `public/favicon.svg`, `favicon-32.png`, `apple-touch-icon.png`, `icon-192.png`, `icon-512.png` | browser tab and device icons |

## Using it

- **Clear space:** keep at least the height of the keyhole's circle free on every side.
- **Minimum size:** wordmark 90 px wide (the keyhole is a speck below about 130 px, which is fine); symbol and icon 16 px.
- **On photos or busy backgrounds**, use the white or ink one-colour versions on a calm area.
- **Don't:** stretch or rotate it, recolour the gold, put the full-colour wordmark on a gold or red
  background, add shadows or outlines, or set "Privlee" in another typeface and call it the logo.
- **The in-app component** is `src/components/Logo.tsx` (`variant="dark"` for dark backgrounds).

## Discretion

The home-screen icon and name of an installed web app would announce what it is. Nothing here makes the
site installable (no web manifest) on purpose. If that is ever added, offer a neutral name and icon as
the default, in the same spirit as the panic screen.

## Regenerating the files

`brand-src/build.py` and `raster.py` produce every SVG and PNG. They need Python 3 with `fonttools` and
`Pillow`, and two font files next to them: `CG.ttf` and `CGI.ttf` (Cormorant Garamond roman and italic,
variable, from github.com/google/fonts, `ofl/cormorantgaramond`). Run `python3 build.py`, then render
PNGs with `python3 raster.py <in.svg> <out.png> <width>`. The fonts are not committed.
