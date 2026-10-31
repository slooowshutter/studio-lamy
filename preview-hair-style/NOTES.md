# preview-hair-style: « La porte vitrée »

## Direction
The identity is the shop door. The site is built on a few real facts: everyday prices, opening every day of the week, and the street name, rue du *Chemin-Vert*. The door is a deep green glass panel in a brushed aluminium frame, with cream vinyl lettering ("hair style" in lowercase), the hours lettered on the glass, a brass push plate that doubles as the "Réserver" link, and a cardboard OUVERT / FERMÉ sign that shows the live state. The green nods to the street name. It is our suggestion, not a colour the shop is known to use.

## Font
Jost, 300–800 plus italic. Only one family is used: a Futura-like geometric, close to the vinyl-cut lettering on Paris shop doors. Hierarchy comes from weight (300 for the "4,9", 700 for the vinyl) and size. All numbers use tabular figures.

## Palette and contrast
Checked with `_tools/contrast.py`:

| Colour | Hex | Contrast |
|---|---|---|
| bottle green | `#1E3B2C` | 10.6:1 against cream, either way round |
| cream | `#F3EEE4` | (ground) |
| ink | `#1A1A1A` | 15.1:1 |
| muted | `#5E5E57` | 5.2–6.1:1 |
| brass | `#C8962E` | fills only; ink on brass is 6.5:1 |
| brass text | `#85601A` | 4.9:1 on cream |
| secondary on green | `#C9D4CB` | 8.0:1 |
| focus ring on dark | `#E2BE6A` | 6.9:1 on green |

## Signature elements
1. **The door hero.** The OUVERT/FERMÉ sign waits edge-on, then turns to the correct side with a `rotateY` (500 ms, `--ease-in-out`). It re-checks the state every minute. The wordmark wipes in like vinyl being applied (clip-path), once the font has loaded.
2. **"7 jours sur 7".** A strip of 7 tiles, with today highlighted and a brass "même le dimanche" tag on Sunday.
3. **Price stickers.** The four real Treatwell prices are set as huge green numerals and revealed with a clip wipe; the numbers are never animated.

## Also on the page
- A schematic street strip: "rue du Chemin-Vert, 1 511 m", with rows of crops for the market gardens and markers for n°53 and n°68 (Parmentier).
- A "rings" map: two circles give the distance to Saint-Ambroise and Richard-Lenoir. It deliberately shows no direction, because the exact positions weren't verified.

## Sections
1. aperçu band
2. header (no burger; a scrolling link row on mobile)
3. door hero, with a side column (claim, call/book, rating, address)
4. les prix
5. 7 jours sur 7
6. la note
7. réserver
8. la rue
9. venir
10. à compléter avec vous
11. questions
12. footer
13. mobile sticky bar

## Booking
The booking engine is shared with the AZ Barber preview, configured for these hours:
- Monday–Saturday: 9:30–19:30
- Sunday: 10:00–19:00

The 4 Treatwell services carry their real durations and prices. "Taille de barbe" and "rasage de tête" show "durée à confirmer · prix à confirmer"; the engine reserves an internal 30-minute block for them.

## Facts used
All from `research/brand-hair-style.md` and the brief:
- name, address, phone
- hours from every directory
- 4,9 / 175 avis (annuaire-barber.com, 30/10/2026), shown with a footnote
- the 4 Treatwell prices (30/10/2026)
- the street facts from Wikipedia
- the Popincourt market (paris.fr)
- metro distances, as straight lines

## À confirmer
- the full menu, payment methods, walk-in policy, holiday hours
- the team (Maher is mentioned only in "À compléter", marked à confirmer)
- the Treatwell link (described, not linked)
- the sign and logo
