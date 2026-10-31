# preview-sonzs-barbershop · notes

Aperçu non officiel de **SONZ’s BarberShop**, 29 rue Saint-Nicolas, 54000 Nancy. Prepared by Studio Lamy from public information only. `noindex,nofollow`, never published.

## Direction: « Le coupe-chou »
Built from the shop's own description on Planity (« couleurs sombres et bois », mobilier « à l’esprit vintage », « barbiers d’antan », rasage « à l’ancienne, au coupe-chou »): dark walnut, brass, steel, gilt lettering on black glass, Clarendon type. Inclusive (men, women, children), warm, not macho.

- **Fonts:** Besley (Clarendon revival, display, 500–900 + italic 400–600) + Libre Franklin (text/UI, 400–700). Tabular lining numerals on prices, hours, slots.
- **Palette:** ebony `#14110F`, walnut `#3B2A1F`, oak `#9A6B43` (fills only), cream `#F2EBDF`, cream-2 `#E8DFD0`, ink `#1B1714`, ink-2 `#4F463E`, brass `#C29A48` (spot colour), brass-ink `#7A5A1E` (brass text on cream), brass-hi `#D2B98A`, steel (razor only). Our reading of « couleurs sombres et bois », **not** the shop's real colours (à confirmer). Lowest text pair: brass-ink on cream-2 4.80:1; all others higher (ink/cream 15.0, brass/ebony 7.2, cream/walnut 11.5).
- **Wordmark:** « SONZ’s » Besley 900 / « BarberShop » Besley italic 500, two lines (spelling from Facebook + directories).

## Signature elements
1. **The coupe-chou hero:** inline-SVG straight razor (walnut scales with grain, brass pins, steel tang with jimps, hollow-ground blade) etched « SONZ’s BarberShop / NANCY · DEPUIS 2013 ». The blade swings open around its pivot pin on load (1000 ms, `--ease-out`, 300 ms delay); desktop hover sends a light sweep across it. On phones the handle bleeds off the left so the blade and etching stay readable.
2. **Tariff on black glass (verre églomisé):** walnut frame, gilt double filet, SVG corner fleurons, fixed reflection band; rows reveal one by one; each row's « Réserver » pre-selects the service in the booking module.
3. **The street's four names:** 1793 / 1795 / 1796 struck through by brass lines that draw once; « Rue Saint-Nicolas, 1814 » stands.

## Sections
Aperçu band → header (mobile menu) → hero → 01 La carte → 02 La maison → 03 Les notes → 04 La rue → 05 Réserver (simulated, Planity link kept prominent) → 06 Horaires (today highlighted) → 07 Venir (schematic SVG map, streets draw) → 08 À compléter avec vous → 09 Questions → footer (aperçu repeated, 290 € HT link, studiolamy@proton.me). Sticky mobile bar « Appeler / Réserver ».

## Facts and sources (all seen 30/10/2026; see research/brand-sonzs-barbershop.md)
- Name, address, phone: annuaire-barber.com, icoiffeur.fr, horairesdouverture24.fr, Facebook page title (snippet).
- « Depuis 2013 », interior description, coupe-chou, Proraso, « coiffe aussi les dames », parkings + arrêt Point Central, booking rules (12 h / 10 min): Planity page https://www.planity.com/sonzs-barber-shop-54000-nancy
- Prices (labelled « Tarifs indicatifs, à confirmer avec SONZ’s BarberShop »): Planity visible items only.
- Ratings: 5,0 / 1 356 avis (Planity) and 4,7 / 230 avis (annuaire-barber.com, source not named), both footnoted with the date.
- Street history: Wikipédia « Rue Saint-Nicolas (Nancy) ».

## À confirmer
- Hours: Planity (Tue–Fri 09:00–19:00, Sat 09:00–18:00) vs directories (10:00–19:00, Fri until 20:00 or 21:00). The booking module uses Planity's.
- Real logo, sign lettering and colours; exact spelling on the sign.
- Full price list (Planity collapses ~27 services); « Kojac » spelling.
- Instagram handle (mentioned by the shop, not found).
- Exact position at the rue des Sœurs-Macarons crossing (map is schematic).
- Wheelchair access (one directory only), walk-ins, payment methods.
- Staff first names: deliberately not shown.

## Critic scores
| Pass | Score | Must-fix |
|---|---|---|
| 1 | 8.4 | razor too small on phones; « de barbe » / « dès la naissance » beyond facts; hidden sticky bar focusable |
| 2 | 8.8 | hero fiche cramped at 1000–1279; footnote target 9×16; coupe-chou FAQ missing |
| 3 | 8.9 | hero CTA off-grid / wrapping at 1000–1190 |

All must-fix and should-fix items from pass 3 were applied after the review (CTA to cols 1–7 nowrap, kicker margin, wordmark 700 ms / 60 ms, `main:focus` outline, sheen reset delay, FAQ « rituels Classique et Kojac », « environ 473 mètres »). Max re-critiques reached for the original; v1 gets a fresh pass in its variant location.
