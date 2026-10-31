# demo-salon: « Nuancier » (DÉMO, fictional salon)

## Direction
Refined and editorial, with the precision of a colourist. The look is quiet luxury, deliberately not pink. Onde is a salon in the Chartrons quarter of Bordeaux. It is fictional and labelled DÉMO:
- in a fixed pill at the bottom left on desktop;
- in a top strip and a pill in the sticky bar on mobile;
- in the booking flow;
- in the footer.

## Fonts
- Noto Serif Display at width 62.5–100 and weight 200–500, roman and italic. It is set condensed and light at huge sizes, the way a fashion magazine would set it.
- Hanken Grotesk for text and UI, with labels in capitals tracked at +0.16em.

## Palette and contrast
Checked with `_tools/contrast.py`.

| Colour | Hex | Contrast | Use |
|---|---|---|---|
| Stone | `#EEE9E1` | — | Page background |
| Warm ink | `#1F1B18` | 14.2:1 | Body text |
| Taupe | `#625850` | 5.3–6.5:1 | Secondary text |
| Caramel 7.3 | `#A8693C` | 3.7:1 | Fills and very large type only |
| Caramel text | `#83502A` | 5.5–6.3:1 | Text in the accent colour |
| On-ink accent | `#E2B58E` | 9.2:1 | Accent text on ink |

Real hair shades appear only inside the nuancier.

## Signature elements
1. **The nuancier.** Nine strands use real French shade numbers: 3.0, 4.0, 5.3, 6.4, 7.1, 7.3, 8.34, 9.1 and 10.21. Each one has:
   - darker roots and lighter ends;
   - a fine strand texture;
   - a steel clip.

   On desktop, every strand pivots on a single ring like a real swatch book (5.5° apart, opening to 8° on hover or keyboard focus, transform only). On mobile they form a scroll-snap strip. Picking a strand fills a panel with:
   - the shade and what it suits;
   - the recommended service;
   - a "Réserver cette nuance" link that pre-selects that service.
2. **The hairline waves.** Seven parallel paths draw once on load (`stroke-dashoffset`, 1.5 s, 20 ms stagger, as the brief asks). A second set of four draws as the divider before the booking section. They are static under reduced motion.
3. **The editorial menu.** Each category is set as a huge light condensed italic heading, with the items in two columns beside it. A filter row (Tout, Coupes, Couleur, Soins) uses a clip-path tab indicator: an inverted duplicate row clipped to the active button, transitioning over 280 ms. A status line gives the count.

## Other sections
- The hero headline lines rise through a mask.
- The salon section opens on a pull-quote, which is a statement from the fictional founders, not a review.
- The team is set as a masthead, with names in large italic.
- Booking runs in five steps, with an optional "Avec qui ?" step filtered by each person's days and services:
  - days on which nobody can do the service show "indispo.";
  - a skin-test note appears for colour services.
- Hours highlight today and mark Thursday as late opening ("nocturne").
- Venir shows a schematic quays map.
- The FAQ has 5 questions.

## No reviews or testimonials
There are none anywhere on the page.
