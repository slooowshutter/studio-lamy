# preview-cabeleira: « L'étiquette »

**Shop.** Cabeleira Barbershop & Concept Store, 167 avenue de Flandre, 75019 Paris. Tel. 01 44 53 93 86.

**Direction.**
- The shop calls itself a **concept store**, so its identity comes from retail labelling: the hang tag, price tags on a clothing rail, a woven composition label and a till receipt.
- No logo, colours, sign description or social account was found. The spot colour is therefore the **pink of métro line 7**, which has run under the avenue since 1910. The page says this openly, and the « À compléter » block says the shop's own colours will replace it.

**Fonts.** Mona Sans (variable wdth 75–125, wght 400–900) for the wordmark, display and text, and Fragment Mono for everything printed on a label (refs, prices, hours, barcode, receipt). That makes two Google families.

**Palette** (checked with `_tools/contrast.py`):

| Name | Hex | Role / contrast |
|---|---|---|
| paper | `#F1EFEA` | ground |
| stock | `#FBFAF7` | tags |
| ink | `#141311` | 16.2:1 |
| ink-2 | `#4A4740` | 8.1:1 |
| ink-3 | `#5C5850` | 6.2:1 |
| rose ligne 7 | `#F59BBB` | fills only; ink on it is 9.1:1, and it is 9.1:1 as text on ink |
| on-rose secondary | `#3B2730` | 6.8:1 |
| rose-ink | `#A3264F` | 6.2:1 |
| error | `#9B1C1C` | 7.1:1 |
| on-dark secondary | `#B9B4AA` | 9.0:1 |

**Signature element: the hang tag** (hero). It is pink card stock with chamfered corners and a real eyelet hole (CSS mask) on a cotton string. On desktop the string runs up behind the wordmark; on mobile it hangs from a nail.

It carries the name, the address ref, « Ouvert 7 j/7 », a live Paris-time status, and « 4,7 / 5 · 504 avis ». It also has an **ITF barcode that really encodes 0144539386**; its digits are a `tel:` link. At the bottom is a perforated stub, « Détacher pour réserver ».

**Supporting devices:**
- **Le portant:** six white price tags hang from a continuous steel rail, each on a plastic loop through its hole. They are hung one by one on reveal and tilt on hover.
- **La composition:** a black woven label holds the history of the avenue de Flandre.
- **Le ticket:** the booking success state is a receipt with a zigzag edge and the barcode. It prints with a clip-path wipe.
- **La pastille:** the rating as a round pink sticker.
- **The hours chart:** a 09→21 bar per day, with today in pink.
- **Two schematic SVG maps:** a landscape one for desktop and a portrait one for phones. Line 7 is wiped in under the avenue.

**Sections.**
1. Aperçu band.
2. Header (with a Réserver CTA on mobile too).
3. Hero.
4. 01 Le portant (indicative prices).
5. 02 La note.
6. 03 La route.
7. 04 Réserver (4 steps, then the ticket and .ics).
8. 05 Horaires.
9. 06 Venir.
10. 07 À compléter (« le rayon à remplir »).
11. 08 Questions.
12. Footer.
13. Mobile sticky bar.

**Facts used** (all from `research/brand-cabeleira.md`):
- name, address, phone;
- 4,7 / 504 avis (annuaire-barber.com, seen 30/10/2026), with a footnote;
- hours (annuaire-barber; the conflict with other directories is footnoted);
- Corentin Cariou (line 7), about 120 m in a straight line; the station was named "Pont de Flandre" until 1946; its exit no. 2 points to the Cité des sciences;
- avenue de Flandre: 1 485 × 50 m, Roman road, Compostela route, route impériale n° 2 (1811), grand-rue of La Villette (annexed 1859, a Paris street from 1863), line 7 since 1910, "avenue" since 1994;
- the Petite Ceinture bridge and avenue Corentin-Cariou;
- three cut types from a co-founder's public offer (no prices used);
- the dictionary meaning of « cabeleira ».

**Never stated on the site:** the founders' names or origin, Afro-hair specialisation, the Airbnb listing, the 2025 legal-entity change, team names, or concept-store contents.

**À confirmer.**
- All prices and durations (labelled « indicatif » in four places).
- Hours, especially Friday/Saturday closing at 21:00 vs 20:00, and public holidays.
- Walk-in policy, payment methods, kids' cuts.
- What the concept store sells.
- Sign, logo and colours.
- Rating source.

**Important for Marc before any pitch:** `cabeleira-barbershop.fr` is registered (OVH, last changed 10/09/2025) and wired to **Framer**, but it returned **HTTP 404** on 30/10/2026. The owner may have a site in progress.

**Critic scores.** Pass 1: 8.1. Pass 2: 8.5. Pass 3: 8.7. All must-fixes and should-fixes from pass 3 were applied afterwards: the mobile CTA in the header, the footer bar-space, landmarks, the 500 ms font fallback, no duplicate « Concept Store » line, and the dashed tags.
