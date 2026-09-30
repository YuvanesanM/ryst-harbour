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
Caretakers get a day view instead: check-in, check-out, checklists, issues
and inventory. It only reads the endpoints the module pages already use,
under the same role/module access, and its revenue and occupancy follow
the owner report (`owner-report.js` in the proxy repo) and Reports.

"+ New" and the dashboard's buttons open module pages through small deep
links: `stay.html?new=invoice|quote`, `checklist.html?start=<type>&stay=&guest=`,
`petty-cash.html#add`, `inventory.html#add`, `issues.html#report` and
`guest-register.html?f=<filter>`.

## Guest pages are published on two addresses

`checkin.html`, `guest.html`, `feedback.html`, `wa.html`, `villa.js` and `property.js`
are **edited here only**. RYST 109A's guests use them on its own site, stay.ryst.in:
a workflow in the `RYST-109A` repository copies these files from this repository
every hour (and on demand). Don't edit those copies in `RYST-109A`.

Other villas' guests use them here, with `?v=<villa>` in their links.
