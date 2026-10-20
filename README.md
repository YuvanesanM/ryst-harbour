# RYST Harbour — harbour.ryst.in

The villa management app: staff app (login, bookings, quotes, settings, petty cash,
checklists, inventory, reports, restaurant, reviews), villa signup (`start.html`) and
the guest pages. Data and sign-in come from the server at `data.ryst.in`
(repo `ryst-109a-proxy`).

## The home page (harbour.ryst.in)

`index.html` is the marketing site. Plain HTML, no build step:

- `assets/site/site.css`: the design system (tokens, type, buttons, mock
  frames) followed by one block per section.
- `assets/site/site.js`: tabs, mobile menu, ROI calculator, live pricing and
  in-view animations. It's progressive enhancement, so the page reads fine
  without it.
- `assets/site/*.avif|webp`: RYST 109A photos, exported at 480/800/1200 px
  from the originals in the `RYST-109A` repository.
- `assets/fonts/`: Instrument Serif (headings) and Inter (text), self-hosted
  and subset to Latin plus ₹.

Prices come live from `data.ryst.in/harbour/plans` (Settings → Billing
settings). The copy in `site.js` is only the fallback. The testimonials
section stays hidden until a real `<figure class="quote">` is added to it.

## The staff dashboard (login.html)

After sign-in, `login.html` shows the owner operations dashboard
(`assets/app/dashboard.css` + `dashboard.js`): KPIs, today's check-ins and
check-outs, what needs attention, upcoming stays and six months of revenue,
with the modules in a sidebar (desktop) or bottom navigation (phones).
The sidebar is shared by every staff page: `assets/app/shell.js` + `shell.css`,
loaded in each page's `<head>` right after `property.js`. It shows from
1024 px up and follows the same role/module access as the dashboard; the
nav list is defined once in `shell.js`. It collapses to an icon rail (remembered per
browser). `shell.js` also adds the dashboard's top bar
(property, date, "+ New", notifications, account menu) to every module page
and, on phones, the dashboard's bottom navigation (Home / Calendar / + / Tasks /
More), and the Harbour colour scheme (`html.hth` in `shell.css`, which overrides the
colour tokens each page defines, so pages keep their own CSS). After editing any file in `assets/app/`, run
`python3 tools/version-assets.py` so pages load the new version rather than
a cached one.
Caretakers get a day view instead: check-in, check-out, checklists, issues
and inventory. It only reads the endpoints the module pages already use,
under the same role/module access, and its revenue and occupancy follow
the owner report (`owner-report.js` in the proxy repo) and Reports.

"+ New" and the dashboard's buttons open module pages through small deep
links: `stay.html?new=invoice|quote`, `checklist.html?start=<type>&stay=&guest=`,
`petty-cash.html#add`, `inventory.html#add`, `issues.html#report` and
`guest-register.html?f=<filter>`.

## Villa 3D (villa-3d.html)

An operations view of the villa as an interactive 3D model, under Property →
Villa 3D. Files: `villa-3d.html`, `assets/app/villa3d.js`, `assets/app/villa3d.css`,
and Three.js r169 self-hosted in `assets/vendor/three/` (MIT, see its LICENSE),
loaded only on this page through an import map.

- The model follows the architect's ground and first-floor layouts (Dreamour
  design, "Cheyyur villa"), read off at their printed dimensions; the second
  floor (Bedroom 4 over the north-east bedroom, the rest terrace) and the
  35 kVA generator (south-east corner inside the gate) are from the owner.
  Rooms and outdoor areas are `LAYOUT` and `OUTDOOR` at the top of `villa3d.js`
  (metres; x east, z south towards the road). Heights and furniture are
  approximate. Each place's `match` words decide which checklist items and
  issues belong to it.
- Everything it shows comes from existing endpoints with the user's own access:
  `/guest-register` (bookings, paid/due), `/checklist` (check-in checklist items
  per room, today's daily rounds), `/issues` (placed by their area and title),
  `/inventory` (low stock) and `/metrics?from&to` (booked / received / due for
  the chosen dates — the same definitions as the dashboard and Telegram report;
  Reports module only). Nothing is edited from it: every action opens the page
  that does it (`stay.html?open=`, `checklist.html?start=`, `issues.html?id=`).
- Not in Harbour, so shown as such: which bedrooms a stay uses (the villa is
  booked whole), who an issue is assigned to, and inspections.
- Views: Overview (from the south-west, the sea to the east), Inside (cutaway, ground/first/second floor), Street (from the road, as in the night photo: the street wall slopes from the ground up to the extended second-floor rooftop),
  Plan (top-down). Evening lighting, a "Still" switch (and the system's reduced
  motion) stop the water and palms. Without WebGL, or with `?lite=1`, it shows a
  clickable 2D plan with the same data.

## Guest pages are published on two addresses

`checkin.html`, `guest.html`, `feedback.html`, `wa.html`, `villa.js` and `property.js`
are **edited here only**. RYST 109A's guests use them on its own site, stay.ryst.in:
a workflow in the `RYST-109A` repository copies these files from this repository
every hour (and on demand). Don't edit those copies in `RYST-109A`.

Other villas' guests use them here, with `?v=<villa>` in their links.
