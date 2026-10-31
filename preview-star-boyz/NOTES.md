# preview-star-boyz: « Face A / Face B »

**Direction.** The shop's only real "voice" is its rap soundtrack on Instagram reels, so the preview is art-directed as a rap record sleeve. It uses night black, a heavy, wide wordmark, a single gold star and liner-note typography. The style is proud and street-level, with no vintage gentleman barber and no varsity (the varsity look was the baseline).

**Fonts.**
- Unbounded 600–900 for the wordmark, headings and prices.
- Host Grotesk 400–700 for text and UI.

Numbers are tabular.

**Palette and contrast** (checked with `_tools/contrast.py`):

| Role | Colour | Contrast |
|---|---|---|
| Night | `#0E0E10` | — |
| Off-white | `#F4F1EA` | 17.1:1 |
| Star gold | `#F2B705` | 10.6:1 on night; night text on gold is 10.6:1 |
| Secondary text | `#B9B5AD` | 9.4:1 |
| Tertiary text | `#8F8C86` | 5.75:1 on night |
| Sticker | `#FF4A1C` | used on the sleeve only; night text on it is 5.7:1 |
| Liner notes | `#4B4944` on paper | 8.0:1 |

Gold is never used as text on off-white.

**Signature elements.**
1. **The sleeve hero.** A square off-white sleeve with ring wear and a shrink-wrap sheen. It carries:
   - the STARBOYZ wordmark, fitted with container units;
   - a gold SVG star;
   - sleeve credits;
   - a round "Réservation en ligne · nouveau" sticker.

   A CSS vinyl record has grooves, a static reflection and a gold "Face A · 33⅓ tours" label. It slides out once on load: to the right on desktop, and downward on mobile, kept inside the hero. On desktop hover it slides a little further and rotates. Under reduced motion it is static and half out.
2. **The tracklist.** Face A (Coupes) and Face B (Barbe & extras) list A1–A3 and B1–B2. Each track shows its duration where the track time would be and an indicative price. The playing bars run only while a track is hovered or focused. A sleeve-style warning label reads "Indicatif". Each "Réserver" link preselects its service.
3. **Liner notes.** The paper "inside sleeve" holds the credits: address, team (à confirmer), métro, phone, and the rue Blondel story. The hours table marks today with a star.

**Other sections.**
- La note: 4,5 on a gold sticker, with a footnote.
- Réserver: the shared booking engine, with Sunday closed and Monday–Saturday 9:00–19:30.
- Venir: a schematic SVG map. Rue Blondel runs between Saint-Denis and Saint-Martin, with the pin at the Saint-Martin end, a Porte Saint-Denis arch marker and the "M 4 · 8 · 9" sign.
- "Bonus tracks", the "à compléter avec vous" section.
- FAQ.
- Footer with an outlined wordmark.
- Mobile gold bar.

**Facts used** (all from `research/brand-star-boyz.md` and the brief):
- The STARBOYZ styling, from the shop's own Instagram.
- The address and phone 07 53 09 26 21.
- Strasbourg–Saint-Denis, which the shop itself cites.
- Rue Blondel: 215 m long, named after François Blondel, Porte Saint-Denis 1672, and following the Charles V wall.
- 4,5 / 48 avis, from annuaire-barber.com on 30/10/2026.
- Hours Monday–Saturday 9:00–19:30, Sunday closed.
- Coiffure homme and enfant.
- Sheriff and James, named on Instagram (marked à confirmer).
- Card and contactless, from directories (marked à confirmer).

**À confirmer.**
- All prices and durations. Face B and "Coupe + barbe" are marked "si proposée(s)".
- Which phone number to publish.
- The hours, since Pages Jaunes differs.
- The walk-in policy and payment methods.
- The team.
- The kids' cut age and price.

The page never makes a quality or hygiene claim, and it lists no women's or afro services.
