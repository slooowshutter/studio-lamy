# preview-nada-coiffure: « La carte de rendez-vous »

## Direction
Nada Coiffure has no known logo, colours or sign description (see `research/brand-nada-coiffure.md`), so the identity comes from the object every salon hands across the counter: **the appointment card** ("Votre rendez-vous : le … à … pour …"), printed with the shop's name, address and phone, with the hours on the back. The typography borrows the *pleins et déliés* of a Didone (hairline strokes, like hair) for the name and the numbers, and a sturdy Franklin Gothic for everything practical. The tone is a friendly neighbourhood salon at the bottom of rue de Clignancourt: "petits prix" are shown through the real numbers, not adjectives.

## Signature element: the card, three times
1. **Hero, front of the card (blank).** Plum card stock, a printed hairline frame, "Nada Coiffure" in Bodoni italic, and a line-drawn vignette of the Sacré-Cœur domes (430 m away). The whole card links to the booking ("Remplir la carte →").
2. **Booking: the card fills itself in.** It is the persistent "Votre sélection" summary (sticky on desktop). Each choice writes into its blank in Bodoni italic with a 320 ms left-to-right wipe (WAAPI, so it can be interrupted). On mobile, a sticky plum mini-card strip follows you through the steps, and on confirmation the filled card moves into the success panel with a "Noté" mark.
3. **Hours: the back of the card.** The week on plum stock, with today circled in pen (a clip-path wipe).

## Fonts
- **Bodoni Moda** (opsz, 400–600, roman and italic): wordmark, headings, prices, the "handwritten" fill-ins.
- **Libre Franklin** (400–700): text, labels, UI, tables.
- Tabular lining figures for prices, hours and slots. French times are written « 9 h 30 ».

## Palette (our proposal, not the shop's colours)
Checked with `_tools/contrast.py`:

| Role | Hex | Contrast |
|---|---|---|
| paper | `#F6F0E8` | ground |
| stone | `#EDE5D9` | alternate ground; ink on it 13.9:1 |
| card white | `#FBF7F1` | fields, chips |
| ink | `#241620` | 15.3:1 on paper |
| muted | `#6B5A64` | 5.7:1 on paper, 5.1:1 on stone, 6.0:1 on card white |
| **plum (spot)** | `#5B1E46` | 10.8:1 with paper, either way round |
| on plum | `#E9D7DF` / `#C9AEBD` | 8.9:1 / 6.0:1 |
| on ink | `#B9A8B2` | 7.7:1 |
| rose (accent on dark, focus ring) | `#D9A3BF` | 8.2:1 on ink, 5.8:1 on plum |
| error | `#8A2335` | 7.8:1 on paper |

## Sections
1. aperçu band
2. header (accessible menu below 960 px)
3. hero: "Nada" written in, plus the card
4. facts strip
5. 01 la carte des prix: Femme / Homme
6. brushing band
7. 02 la note: two public readings
8. 03 rendez-vous
9. 04 au dos de la carte: hours
10. 05 la rue: a frieze of house numbers going up rue de Clignancourt
11. 06 venir: schematic map
12. 07 à compléter avec vous
13. 08 questions
14. footer
15. mobile sticky bar

## Map
The SVG plan is computed from the coordinates in the research file:
- the SIRENE geocode of n° 5;
- Wikipedia coordinates for Anvers, Barbès–Rochechouart, Halle Saint-Pierre, Sacré-Cœur and Château Rouge.

Equirectangular projection at 0.72 px/m. The pin is nudged towards the boulevard, because n° 5 is at the start of the street. Sacré-Cœur and Château Rouge sit off the frame, shown as arrows. It's labelled "plan schématique, positions approximatives".

## Facts used (all from `research/brand-nada-coiffure.md`)
- **Identity:** name, address, phone. The salon serves women and men.
- **Planity (relevés le 30/10/2026):**
  - hours: lun–sam 9 h 30 – 19 h 30, dim 10 h 30 – 19 h 30;
  - the 5 services, with durations and prices, labelled « Tarifs indicatifs, à confirmer avec Nada Coiffure »;
  - L'Oréal products;
  - « paiement sur place »;
  - online booking.
- **Ratings, each with a footnote and the date seen:**
  - 4,0 / 350 avis (institut-beaute-pres-de-moi.fr; source not stated there);
  - Planity 4,8 / 33 avis, with its 4 sub-scores.
- **Rue de Clignancourt (Wikipedia):**
  - length and endpoints;
  - the former village of Clignancourt;
  - named on 2 avril 1868;
  - n° 26 Dufayel, n° 42–54 château Rouge, n° 43 plaque, n° 48 Pierre Dac, n° 63 Paul Doumer / collège Roland-Dorgelès.
- **Straight-line distances:** Anvers ≈ 190 m, Barbès–Rochechouart ≈ 260 m, Château Rouge ≈ 360 m, Halle Saint-Pierre ≈ 200 m, Sacré-Cœur ≈ 430 m.
- **Line numbers:** Anvers (2) and Barbès (4) are in Planity's access note. Barbès on line 2 and Château Rouge on line 4 are general knowledge, flagged as not re-sourced in the research file.

## Not used on purpose
- staff first names, dirigeants, BLN / SIREN / 1994;
- the shop email, the Groupon offer, Treatwell figures;
- review themes (they were second-hand);
- the fabric district, the Goutte-d'Or, the elevated métro;
- any interpretation of the name "Nada".

## À confirmer
- Saturday opening: 9 h 30 (Planity) or 9 h 00 (one directory). The booking uses 9 h 30.
- Holiday hours. The booking flags public holidays as « férié, à confirmer ».
- Walk-in policy and payment methods.
- Services that aren't published: enfants, barbe, balayage, soins.
- Sign spelling ("Nada" or "NADA"), logo and colours.
- Whether to keep Planity or switch to the built-in module.
- Whether the 4,0 / 350 rating is Google's.

## Critic scores
- **Pass 1: 8.5 / 10** (`_reviews/preview-nada-coiffure-pass1.md`). All five must-fixes were fixed:
  - card time wrapping;
  - signature visible on mobile;
  - recycled copy;
  - booking header unstuck, card sticky on its own;
  - NOTES.md.

  Should-fixes applied too.
- **Pass 2: 8.8 / 10** (`…-pass2.md`). Fixed:
  - the false « Dix heures par jour » headline, now « …neuf le dimanche »;
  - the last shared copy;
  - the holiday-aware reopening line;
  - the mobile strip, now shown from step 1;
  - the stamp `@starting-style`;
  - the 280 ms fill;
  - the smaller h2 in La note and Horaires;
  - fact wording (Doumer, « vers 1780 », Saturday in the footer);
  - the map label halo;
  - the facts tap target.
- **Pass 3: 8.9 / 10** (`…-pass3.md`). Its one must-fix was fixed after the pass: the live card collapsed to 0 px wide below 960 px. It now has an explicit width. Also done:
  - `scroll-margin-top` under the sticky strip;
  - Planity linked in the booking intro and the success panel;
  - the last shared booking microcopy rewritten;
  - `NB` before « : » in the JS strings;
  - stamp at 260 ms.

  No further re-critique: the limit of 2 re-critiques was reached. The fresh v1 critic pass, run once the site moves to `nada-coiffure/v1/`, will verify these fixes.
