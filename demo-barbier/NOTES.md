# demo-barbier: « Le Poteau » (DÉMO, fictional shop)

**Direction.** A bold, contemporary barbershop in bone, ink and one barber red, with steel as the third stripe colour. It deliberately avoids gold, brass and dark green, which belonged to the baseline. The shop, Ferrand, barbier, Croix-Rousse, is fictional, and the page says so in the DÉMO tab, the booking flow and the footer.

**Fonts.**
- League Gothic for display: the FERRAND wordmark, the tariff categories, the chair numerals and the step headings.
- Instrument Sans, using its `wdth` axis for the hero claim and the mobile step labels.

**Palette and contrast** (checked with `_tools/contrast.py`):

| Use | Colour | Contrast |
|---|---|---|
| Bone ground | `#EFEBE3` | |
| Ink on bone | `#111111` | 15.9:1 |
| Secondary ink on bone | `#47443F` | 8.2:1 |
| Red on bone | `#C8102E` | 4.95:1, both ways |
| Small red text | `#A50D26` | 6.6:1 |
| Steel | `#3B4A5A` | 7.6:1 |
| Secondary on ink | `#B9B4AA` | 9.2:1 |
| Accent on ink | `#FF8A99` | 8.4:1 |

**Signature elements.**
1. **Barber pole.** A scroll-linked pole sits fixed at the right edge on desktop, with chrome caps and cylinder shading. On mobile it becomes a 5 px band across the top.
   - It uses `animation-timeline: scroll()`, with a passive, rAF-throttled JS fallback that only writes `transform`.
   - It moves only when the page scrolls.
   - It is static under reduced motion.
2. **Tariff board.** A full-bleed ink section. The category words (COUPES, BARBE, FORMULES, EXTRAS) are set huge and cropped at their base by the board's top rule.
   - Rows use dotted leaders, tabular prices and the duration in small caps.
   - Each row has a "Réserver" link that pre-selects the service.
3. **Fade charts.** Six cuts are drawn as data graphics, with the nape at the bottom and the crown at the top.
   - The bar length is the sqrt-scaled guard length in mm.
   - The steps run from light at the skin to ink at the top.
   - A red rule marks where the fade ends.
   - The bars grow from the nape when scrolled into view.

**Other parts of the page.**
- The hero is a giant FERRAND, fitted to the width by JS (with a fallback in container units). Its base is cropped by a rule, and the letters rise from a mask.
- La maison has a red "1987" pull number.
- Les fauteuils shows the chairs as outlined numerals 1, 2 and 3, with each barber's days as chips (absent days are struck through).
- The booking flow has five steps: prestation, fauteuil (optional, "Peu importe"), jour, heure and nom. Slots fit the service duration against each barber's days and availability. Past slots use Paris time. It ends with a .ics file.
- Horaires highlights today. Venir has a schematic slope map.
- FAQ with 7 questions.
- Footer with the fictional mentions and a link to the offer.

**No reviews or testimonials.** The footer says why.
