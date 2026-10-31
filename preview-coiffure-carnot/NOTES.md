# Coiffure Carnot: unofficial preview (Limoges)

The shop is at 90 rue François Chénieux, 87000 Limoges. It is the men's and children's salon with an "espace barbier au coupe-chou". The brief is in `_brief/preview-coiffure-carnot.md` and the research in `research/brand-coiffure-carnot.md`.

## Direction: "Planche de coutelier"
The salon names its own speciality, *la technique au coupe-chou*, so the identity is that razor. It is drawn the way an encyclopaedia plate or a cutler's catalogue draws a razor: engraved outlines, hatching, lettered callouts and an italic caption. Everything is set on porcelain white, the material of Limoges, with horn black for ink and one leather spot colour taken from the strop. The tone is courteous, plain "vous", and a little old-fashioned ("Pour les messieurs"), but not posh.

- **Fonts:** Bodoni Moda (display, italic, the blade etching) and Libre Franklin (text, UI, every price and time in tabular figures). No other site in the project uses either.
- **Palette and contrast** (`_tools/contrast.py`):

  | Role | Value | Contrast |
  |---|---|---|
  | Porcelain (paper) | `#F5F3EE` | |
  | Alternate band | `#ECE8E0` | |
  | Horn (ink) | `#17140F` | 16.56:1 on porcelain |
  | Secondary text | `#4A443C` | 8.67:1 |
  | **Cuir (spot)** | `#9A3F17` | 6.11:1 on porcelain, 5.55:1 on `#ECE8E0` |
  | Cuir on horn | `#D9885A` | 6.66:1 |
  | Secondary text on horn | `#B9B2A6` | 8.73:1 |
  | Steel | `#8F979C` | drawings only (2.68:1) |

- **Signature elements:**
  1. **Planche I, the coupe-chou.** An engraved SVG razor with the blade etched « Coiffure Carnot · Limoges · N° 90 ». The blade swings open around its pin (180° → 0, 900 ms `--ease-in-out`, the physically correct direction) when the plate scrolls into view. Callouts a–g (lame, dos, tranchant, talon, queue, clou, châsse) then draw in. A sheen crosses the blade on desktop hover. With reduced motion or no JS, it is static and open.
  2. **Planche II, the week as bars.** The bars are drawn over a real `<table>`. Friday is cut by « pause » from 12:00 to 14:00, Sunday is hatched « fermé », and today's row has a live cuir "now" marker in Paris time.
  3. **The giant « 4,6 »**, with the decimal in cuir italic, plus a dated footnote.
  - **Details:** the booking summary is a *carton de rendez-vous* on desktop; the Venir block is a *carte de visite*; the quote uses a hanging guillemet; the footer has a colophon.
- **Sections:**
  - aperçu band
  - header, which shows « Réserver » on mobile too
  - hero (h1, descriptor, the plate, address, live status, CTAs, key facts)
  - 01 La carte
  - 02 Le 90 (the shop's own words, quoted and attributed)
  - 03 La note
  - 04 Réserver
  - 05 Horaires
  - 06 Venir
  - 07 À compléter avec vous
  - 08 Questions
  - footer, with the aperçu repeat and studiolamy@proton.me
  - mobile sticky bar
- **Booking:**
  - Real hours, with Friday split into two ranges and Sunday closed.
  - Fixed and Easter-based French public holidays are disabled as « férié ».
  - Slots fit the service duration; past slots and pseudo-random taken slots are disabled.
  - Each service row pre-selects its service.
  - The persistent summary has back links, focus moves and aria-live updates.
  - The success step offers an .ics download. It is clearly a simulation.

## Facts used (research file, seen 30/10/2026)
- **Name, address and phone:** directories and the registry.
- **"Coiffure Carnot Hommes", clientele hommes/enfants:** Pages Jaunes and Mappy.
- **Hours:** Bottin, Pages Jaunes and Mappy agree. Mon–Thu 9:00–19:00, Fri 9:00–12:00 and 14:00–19:00, Sat 9:00–19:00, Sun closed.
- **Rating 4.6 from 210 reviews:** institut-beaute-pres-de-moi.fr, and bottin.fr ("+ de 210", "proviennent de Google"). It is shown with a dated footnote.
- **The shop's own words:** the Pages Jaunes description, quoted and attributed.
- **Payment and PMR access:** Bottin (à confirmer).
- **The street:** a François Chénieux, surgeon, was mayor of Limoges in 1892–95 and 1906–10 (fr.wikipedia, list of mayors). That the street is named after him is marked « à confirmer ». The barbiers-chirurgiens aside is general history.
- **Registry:** the other establishments (84 rue François Chénieux « Coiffure Carnot Femmes » and avenue Garibaldi « KB Coiffure ») appear only as a question in « À compléter ».
- **Not used:**
  - the Solocal "Femmes" subdomain (its phone, hours, prices and Lorem ipsum);
  - lauren.manus@mail.com;
  - the gérant's name.

## À confirmer
- Prices and durations (all of them are estimates).
- The sign's exact text (« Coiffure Carnot » or « … Hommes »), and whether there is a logo or colours.
- Walk-in policy, the Planity page (Pages Jaunes shows a planity.com link but no page was found), and Facebook.
- Coloration for men; the age limit for children.
- Payment and PMR access.
- Holiday hours; the origin of the street name.
- The rating, to be rechecked on Google Maps before going live.

## Critic passes
| Pass | Score | Main fixes after it |
|---|---|---|
| 1 | 8.3 | Razor redrawn as an engraving (it was clip-art gradients). It now opens via IntersectionObserver. Cropped larger on mobile. The sticky bar is inert when hidden. The day strip is a grid. Invented techniques removed. Small labels raised to 11 px or more. |
| 2 | 8.7 | Mobile hero reordered so the razor is above the fold. Timing tightened. Hover sheen added. The menu sits under the header. Hours are a real table. Section openers varied. PMR fact added. |
| 3 | 8.9 | The Safari guillemet double-hang fixed (`hanging-punctuation: none` on the quote). « Réserver » shown in the mobile header. The plate's top margin tightened. Public holidays disabled in booking. The status refreshes every 60 s. The "now" label is aria-hidden. |

Reviews: `_reviews/preview-coiffure-carnot-pass1.md` … `-pass3.md`. Every must-fix from pass 3 is applied (re-critique budget used).
