# preview-az-barber: « Plaque émaillée »

**Direction.** AZ Barber has no known branding (no logo, sign description, colours or social accounts found), so the identity comes from its address. It uses the Paris enamel street plaque, the blue house-number plate, zinc roofs, and the cabaret sign that gave rue des Trois-Couronnes its name. The tone is proud, local and street-level, with no "gentleman's club" clichés.

**Fonts.** Sofia Sans Extra Condensed 600–900 for signage and display, Sofia Sans 400–700 for text and UI. That is one superfamily from two Google families. Prices and times use tabular lining numerals.

**Palette and contrast** (checked with `_tools/contrast.py`):

| Colour | Hex | Role |
|---|---|---|
| plaster | `#F2EFE9` | ground |
| ink | `#16171A` | text, 15.6:1 |
| ink-2 | `#44484E` | 8.0:1 |
| zinc-text | `#565C62` | 5.9:1 |
| zinc | `#7A8187` | rules and large elements only |
| enamel blue | `#1E3A6E` | 9.7:1 on plaster. White on enamel is 10.2:1, `#C9D3E6` on enamel is 7.4:1 |
| Guimard green | `#2F5D50` | plaque frames only |

On the ink sections, `#B4B8BD` gives 9.0:1. Error red `#9B2C2C` gives 6.6:1.

**Signature elements.**
1. A CSS street plaque, "11e Arrt / Rue des / Trois Couronnes", sized with container units. It has a 2:1 ratio from the 1938 decree, a green frame, an inner white filet, screws and a domed sheen.
2. A blue "2" house-number plate.
3. A huge AZ BARBER wordmark whose letters rise from a mask.
4. An enamel price board.
5. A rating number plate reading "5,0".
6. An SVG hanging sign on a wrought bracket. It swings once into rest when it enters the viewport (a damped pendulum) and sways on hover.
7. A schematic SVG map, wiped in with clip-path.

**Sections.** The page runs in this order: aperçu band, sticky header with mobile menu, hero (plaque, live open/closed status, CTAs, facts row), 01 Prestations (indicative), 02 La note, 03 La rue, 04 Réserver, 05 Horaires (today highlighted), 06 Venir, 07 À compléter avec vous, 08 Questions, footer, and a mobile sticky bar.

**Booking flow.** The four steps are service, day, time and contact details, followed by a success screen with an .ics file. The service list is built from the price board. Monday is disabled as "fermé", fully booked days as "complet", and today as "terminé" once the day is over. Slots are 30-minute steps from 10:30 and must fit the service duration before 20:00. "Déjà pris" slots come from a deterministic hash and block any service that overlaps them. Past slots today are disabled. Validation is inline, and mobile phone numbers must start with 06/07 or +33 6/7. The page keeps a summary of the choices (a sidebar on desktop, a "pick" line on mobile), sends focus to each step heading and announces changes through aria-live. Pressing "Réserver" on a board row preselects that service and jumps to the day step.

**Facts used** (all from `research/brand-az-barber.md`):
- name and address;
- 98 m street from rue Saint-Maur to rue Morand, named after a cabaret sign;
- phone;
- 5,0 / 250 avis (annuaire-barber.com, seen 30/10/2026), with a footnote;
- hours: Monday closed, Tuesday–Sunday 10:30–20:00;
- Parmentier (3) and Couronnes (2) stations;
- Folie-Méricourt, Oberkampf and Belleville;
- Maison des Métallos (1881, 1937, 2001);
- the Guimard entrance at Couronnes.

**À confirmer.**
- All prices and durations, labelled "indicatif" in three places.
- Hours.
- Walk-in policy.
- Payment methods.
- Kids' cuts.
- The sign's exact text ("AZ Barber" or "AZ Barber Shop").
- The review source.

The page names no barbers and tells no founding story.
