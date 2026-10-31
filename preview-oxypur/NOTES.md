# preview-oxypur: notes

Unofficial preview for **Oxypur coiffure**, 357 rue de Vaugirard, 75015 Paris (01 40 43 92 57). Built 30/10/2026. Brief: `_brief/preview-oxypur.md`. Facts: `research/brand-oxypur.md`.

## STOP check
- No website of its own found. Google shows none, and the directory's "site web" link points nowhere. `oxypur.fr` and `oxypur.com` both refused the connection on 30/10/2026, and searches found no own site, Instagram or Facebook.
- Not closed: SIRENE shows CANCUN SARL, enseigne OXYPUR, as active (updated 30/10/2026).
- To check by hand before sending: the "Site web" button on Pages Jaunes / Mappy, and a pap.fr "fonds de commerce Paris 15e" ad (06/08/2026, HTTP 403). Nothing links that ad to the salon.

## Direction: "La carte de rendez-vous"
The salon books by phone and at the desk today, so its booking system is the small appointment card every salon hands out. The site turns that card into the identity:
- **Hero**: the front of the card. Card stock, letterpress wordmark "Oxypur" (the h1) with *coiffure* in italic, "femmes · hommes · enfants", n° 357, the address and the phone. The back of the card peeks out from behind, with "Votre prochain rendez-vous · le ___ à ___".
- **Booking summary**: the back of the card. Values are written in Literata italic and ink in (clip-path wipe, 300 ms) as you choose.
- **Confirmation**: the salon's date stamp (SVG text on a circle, ink grain from `feTurbulence`) lands on the card with the booked day and month.
- **La rue**: "357/407" plus a tick ruler of the street's house numbers, with the red tick at 357 (876.8 / 1000 = 356 / 406).

## Type and colour
- **Literata** (opsz 7–72, wght 300–650, italic 400–500): wordmark, headings, body, prices and times (tabular lining figures; oldstyle figures in the street prose).
- **Red Hat Text** (400–700): UI, labels, buttons, form.
- Palette: ground "air" `#E8EDEF`, card stock `#FBFAF7` / `#F2F0EB`, ink `#13252D`, secondary `#44555D`, stamp red `#B42A20` (the only spot colour), rule blue `#9FB6C1` (graphics only). On ink: `#EEF2F3`, `#A9B9BF`, `#F2958A`.
- Contrast (from `_tools/contrast.py`):
  - ink on air 13.4, ink on card 15.1
  - ink-2 on air 6.6, ink-2 on card 7.4, ink-2 on card-2 6.8
  - red on card 6.1, red on air 5.4, red on card-2 5.6
  - on-ink 14.0, on-ink-2 7.8, red-on-ink 7.1
  - placeholder 5.4

## Facts used (all from the research file)
- Name, address, phone, mixed salon (femmes / hommes / enfants), "avec ou sans rendez-vous", service list and payment methods: Pages Jaunes via Mappy.
- Self-description (soin, beauté des cheveux, détente, conseil): paraphrased once, attributed to "sa fiche".
- Rating 4,8 / 308: institut-beaute-pres-de-moi.fr, footnoted (source not named, seen 30/10/2026).
- Rue de Vaugirard (4 360 m, 407 numbers, val Gérard, ligne 12, Aviatic Bar at 354 bis): Wikipedia.
- Métro Convention ≈ 120 m in a straight line: computed from Wikipedia's station coordinates and the SIRENE geocode.

## À confirmer (shown as such on the page)
- **Hours.** Only Thursday and Friday (8h30–19h) and Saturday (9h–18h) are published. Tuesday and Wednesday at 8h30–19h, and Monday and Sunday closed, are our assumptions. They are styled differently in the hours table and the booking flow. Public holidays are blocked in booking as "férié".
- **Prices and durations.** All indicative, not from the salon, labelled « Tarifs indicatifs, à confirmer avec Oxypur ». The short descriptions under each service are our guidelines too.
- **Other details.** Walk-in policy, payment methods, the rating source, the coupe énergétique (listed, never described), the team, the meaning of the name, and since when the shop has been called Oxypur. None of these is used in the copy.
- **Map.** Rue de Vaugirard × rue de la Convention at the métro is verified. Placing the pin on the south-east side (odd numbers) is an inference; the map is labelled "plan schématique".

## Critic passes
See `_reviews/preview-oxypur-pass*.md`.
- Pass 1: **8.2**. Fixed: invented service details (coupe énergétique wording, "coupe + barbe" removed), "plus longue rue de Paris intra-muros", the FAQ distance, back-card geometry at 390 px, the hidden mobile bar taking focus, and the sections that echoed preview-hair-style (note band flipped and rewritten, hero side rebuilt around a single CTA plus an hours glance, À compléter copy rewritten). Also: section openings varied, the card back kept in view on mobile, public holidays handled, map labels enlarged, pin motion reduced to a fade, the salon's own self-description used.
- Pass 2: **8.8**. Fixed: two missing spaces before "·", the last lines that echoed sibling previews (À compléter heading, small print, the success title, now « Votre carte est remplie »), italic 300 loaded, the third giant numeral removed (8h30), the walk-in callout restyled, map and table labels enlarged, « via Mappy », and the status now checks whether tomorrow is a public holiday.
- Pass 3: **9.1**, no must-fix. Should-fixes applied: walk-in marked à confirmer, consistent « vous » in À compléter, the sticky menu head only on screens ≥ 800 px tall, and the Convention label moved. Not done: turning the hours table into a 7-column strip.
