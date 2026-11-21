# Harbour for hotels — gap analysis and phased plan

Goal: one Harbour, two property types. A **villa** subscriber keeps today's product unchanged; a
**hotel** subscriber gets room categories, many rooms per category, category tariffs, per-room
front desk, housekeeping status, a fill-rate dashboard and channel management per category.
Benchmark: WINCLOUD PMS (Winsar Group, Chennai; "The Operating System for hotels").

## 1. What WINCLOUD offers (confirmed sources only)
Sources read: hoteltechreport.com WINCLOUD profile, techjockey.com brand page. Not readable from
the build environment: the vendor's own site, Capterra, SlideShare deck, Software Advice.
- Modules: Front Office, Point of Sale, Material Management (stores, sub-stores, procurement),
  Financial Accounting (ledgers, vouchers, audit trail), Banquet Management, Spa & Wellness.
- Reservations: drag-and-drop tapechart, calendar view, rate management (deals, restrictions),
  rules-based room assignment (floor, spread, preference), automated space optimisation,
  group functionality, integrated CRS, booking engine, channel manager (integrations listed:
  SiteMinder, eRevMax, RateGain, Hotelogix, IDeaS, OutPerform RMS, Revinate, Duve, Bookboost,
  ChargeAutomation).
- Front office: check-in/out, automated night audit, task management, payment requests,
  automated reminders, tablet/kiosk check-in, ID/passport scanning, digital registration.
- Housekeeping: module + mobile app, real-time room status, automated assignments, shift planning.
- Finance: direct billing (company accounts), multi-currency, folios by email, tax configuration.
- Reports: RevPAR & ADR, forecasting, business on books, pick-up; reviewers ask for pace and
  nationality reports and more graphical charts.
- Dashboard: vendor slides say it "greets you with occupancy information, occupancy forecast as
  well as the performance"; no screenshot or KPI list was readable. **Owner to supply screenshots.**
- Reviews: praised for easy front office, banquet module, responsive support; criticised for
  report customisation, speed at peak times, thin onboarding material.

### 1b. From the official site (wincloudpms.com, read Nov 2026)
- Owner: Winsar Infosoft (est. 2001, Chennai), acquired by Romeo Bravo Software (RBS) in Feb 2025; WINCLOUD is
  the cloud edition of WINHMS. Positioning: "THE Operating System for Hotels"; hotel groups and chains, plus
  resorts, apartments, guest houses, motels. Claims 2000+ clients, 35+ countries, 100000+ rooms (stat block is
  inconsistent across copies). No pricing published ("pay for what you use", "Try for free", demo).
- Modules: Front Office (check-in/out, room chart, reservation management incl. alternatives when full and
  blacklisted guests, online check-in, tariff patterns, packages, night audit highlighting pending bills, KOTs,
  room charges and departures); POS (split bills, KOT per product group and printer, per-item tax, auto-post to
  FO and accounts, table reservations, KOT amendment audit, mobile order taking); Kitchen Display System;
  Material Management (POs with approvals, multi-store, indents, quotations and rate comparison, physical stock,
  contracts); Financial Accounting (GL, P&L, balance sheet, cash flow, divisions, income vs expense and ledger
  graphs, voucher drill-down); Banqueting (venues, wait-list, plans and covers, function prospectus, sales by
  segment/source/venue); Multi-Property (one guest profile, HO login to every property, consolidated FO/F&B/
  material/finance, budget vs actual, MIS dashboard on mobile, central reservations).
- Channel management by integration, not its own: STAAH, AxisRooms, SiteMinder, Aiosell, RateGain, Rate Tiger,
  D-Edge, Hotel Spider, Hotellink, Maximojo, eZee/others; also IDeaS and Duetto (RMS), Vingcard/Onity/Dorma
  (locks), PBX and Wi-Fi vendors. Claims 250+ interfaces, 200+ booking channels.
- Not on their site: housekeeping module, GST/Form C specifics, a named dashboard KPI set (only "room chart",
  night audit highlights, MIS slice-and-dice). Harbour's edge: WhatsApp-first guest flow, online check-in with ID,
  direct booking site with UPI, AI agents, simple pricing published openly.
- Harbour gaps vs WINCLOUD beyond phases 2–5: POS→room folio posting and KOT (restaurant.html is a base),
  material management (inventory.html is a shopping list today), accounting exports, banqueting (later).

## 1c. Suggested hotel pricing (published on harbour.ryst.in as early access)
Hotel Essential up to 20 rooms ₹4,999/mo (₹49,990/yr, setup ₹14,999); Hotel Plus 21–50 rooms ₹8,999/mo
(₹89,990/yr, setup ₹24,999); Hotel Pro 51–100 rooms ₹14,999/mo (₹1,49,990/yr, setup ₹39,999); 100+ rooms or
groups by quote; channel-manager partner fee at cost. Leads can pick these plans; billing for hotels is manual
until hotel tiers are added to Razorpay subscriptions.

## 2. Harbour today (villa-shaped)
- One tenant = one villa = one sellable unit. `stays.json`: bookings with check-in/out, no room.
- Availability: "is the whole property free" (`/availability` date ranges).
- Tariff: headcount slabs + weekend/holiday hike % (`stay-settings.json`, suites/tariff.js).
- OTAs: iCal import/export of whole-property blocks (suites/ota.js); Channels card on dashboard.
- Already strong: direct booking engine + payments, GST invoices (5%/18% slab per unit per day,
  gst.js already says "a unit a day"), guest check-in with ID, WhatsApp AI agents, reports,
  restaurant/menu, inventory (shopping list), caretaker checklists, petty cash, reviews.

## 3. Gaps for hotels → phases
Villas must not change. Everything below branches on `property.type === 'hotel'`.

### Phase 1 — Room inventory and tariffs (foundation)
- Signup/settings: property type Villa | Hotel; hotel subscription tier priced by room count.
- Room categories: name, base/max occupancy, extra bed, child policy, amenities, photos, display order.
- Rooms: number, floor, category, status (active / out of order with reason and dates).
- Tariff per category: rack rate, meal plans (EP/CP/MAP/AP), extra adult/child, weekend, season
  and holiday overrides, per-date overrides; min stay / closed-to-arrival restrictions.
- Bookings: `rooms: [{category, roomNo|null, adults, children, plan, rate}]`; multi-room bookings;
  availability per category per night = active rooms − overlapping assignments − holds.
- GST computed per room per night (existing 7,500 slab rule applied per room).
- Booking engine: guests pick dates → see categories with live counts and prices → book N rooms.

### Phase 1 status (Nov 2026)
Done: categories, rooms, tariffs (incl. day-use slots per category, check-in/out and day-use window), per-category
availability, quotes, GST per room-night; online booking engine on the hotel's website (overnight and day use,
rooms by category, meal plans, Razorpay; rooms held while paying, numbers assigned on confirmation); staff booking
editor with rooms, Auto room numbers, suggestions, clash warnings and charges filled from the tariff; OTA iCal
export closes only fully sold nights. Day-use bookings are stored with checkout = next day plus dayUse; villa-era
reports still count them as a night (to fix with Phase 3 reports). Invoices use one GST rate per booking; per-line
slabs for mixed 5%/18% rooms come with folios in Phase 2.

### Phase 2/3 status (Nov 2026)
Done: frontdesk.html (KPIs: occupancy tonight + MTD, arrivals/departures with progress, in-house, day use, rooms
ready/dirty, room revenue, ADR, RevPAR, revenue MTD; room-status counts; 30-day occupancy forecast; room board by
floor with check-in/out and housekeeping actions; arrivals/departures/in-house/day-use lists with balance due;
tape chart with room moves), housekeeping.html (phone, no guest names), proxy routes /hotel/frontdesk,
/hotel/housekeeping, /hotel/room-status, /hotel/checkin, /hotel/checkout (rooms → dirty), /hotel/move (refuses
clashes and moves that would overbook a category); sidebar entries shown only for hotels (property.propertyType).
Remaining in Phase 2: folios (per-room bills, split payments, GST slab per room line), night audit, Form C.

### Folios, night audit, Channex (Nov 2026)
Done: folios (proxy folio.js; /hotel/folio, /hotel/charge, /hotel/charge-void, /hotel/pay). Extras are booking item
lines tagged {id, kind, room, gst, date, by, at}; room lines map to rooms in order. Payments use holdManualPayments, so
staff payments wait for owner approval. Charges close once a tax invoice is issued or the guest checks out. Voids are kept
in folioVoids; staff can void only their own charge within 15 minutes. Hotel invoices are taxed per line (gst.js
hotelSlabs): room lines at the slab for amount ÷ nights, extras at their posted rate, `slabs` on the invoice when rates
mix (rate null). Villas are unchanged. Night audit: /hotel/audit preview, /hotel/audit-close (night-audit.json, one close a
day, figures and booking numbers only). No-shows get `noShow`, which stayBlocksDates treats as releasing the rooms.
UI is on frontdesk.html (Folio, Night audit, print).
Channex (channex.js; /channex/status|setup|settings|preview|sync|pull|webhook, /ops/channex-tick): one room type per
category and one rate plan per meal plan (per_room); delta ARI from a stored snapshot; a full sync at most once in 24 h;
the booking-revisions feed is saved to stays first, then acked. A cancelled revision sets `cancelled` and releases the
rooms. Key: villa secret channexApiKey, else env CHANNEX_API_KEY; CHANNEX_ENV is staging or production. Nothing is sent
unless an owner presses Set up / Sync now or turns Live sync on. Before going live: staging account and credentials,
run the 14 certification tests and submit the task IDs, then production keys. MAP/AP meal_type names are unconfirmed
(sent without meal_type). Webhook HMAC signing is not verified yet (the webhook only triggers a feed read).

### Rest of Phase 2 (Nov 2026)
Done: Form C (proxy formc.js; /formc, /formc/save, /formc/filed). The guest's online check-in asks passport holders
whether they are Indian citizens; foreign nationals fill in passport, visa or OCI, arrival and purpose. The desk can
enter details for walk-ins. Form C is due 24 h after arrival (check-in time, or the check-in date at the hotel's
check-in time). The FRRO acknowledgement is recorded by hand: there is no FRRO API and Harbour never files. Night audit
lists Form C that is due or overdue. Company billing (city ledger): /hotel/bill-to (name, GSTIN, address; prefilled on the
tax invoice); a "Company account" payment (staff → pending approval) with the company on the entry; /hotel/companies
ledger; /hotel/company-settle (owner) marks entries paid by the company with method and reference. Night-audit
"collected" leaves out company-account moves. Per-room folio print. Housekeeping: take/release a room
(/hotel/room-assign; "My rooms"; the desk can release anyone's; check-out clears it). Channex webhook HMAC (villa
secret channexWebhookSecret): when set, unsigned or older than 5-minute webhooks are refused. Reports and the owner report no
longer count day-use as a night; Channex-cancelled bookings are left out of reports.
Still open: the guest register for hotels shows villa-style rows; ID per guest (only the lead guest's ID is collected);
occupancy by category in reports (Phase 3/5).

### Phase 3 status (Nov 2026)
Done: the front desk dashboard now has every tile in the Phase 3 list. On top of the earlier KPIs (occupancy, arrivals,
departures, in-house, rooms ready, revenue, ADR, RevPAR, room-status counts, 30-day forecast) it adds: booking pick-up for
the last 24 h and 7 days (bookings, room-nights, revenue, from each booking's creation stamp `_c`); source mix (room-nights
per channel, next 30 days); a heat table of rooms free per room type for the next 7 nights (OTA holds included);
"Needs attention" (payments awaiting approval, Form C due, rooms without numbers this week, notes and arrival times on
today's arrivals); a wall-screen mode, frontdesk.html?wall=1, for a front-desk monitor (no sidebar, buttons or lists, a clock,
refreshes every minute). The normal view refreshes every 2 minutes. Proxy: Hotel.insights; /hotel/frontdesk also returns
insights, pendingPayments and formC.

### Phase 5 progress (Nov 2026)
Done: hotel-reports.html (proxy hotel-reports.js, GET /hotel/reports, reports module). It covers occupancy/ADR/RevPAR by day
(by month past 92 days) and by room type (revenue shared by room lines), sources and nationality of arrivals, average stay
and lead time, business on the books for 90 nights, and pace (on the books now vs 7 and 30 days ago, using `_c`). It also shows night
audits and a CSV of the day table. No guest names appear. Restaurant → room: orders carry roomNo; restaurant.html lists in-house guests
by room (GET /hotel/in-house, restaurant or bookings module); the folio shows the booking's orders (open = on the bill,
settled = paid at the restaurant). Groups: a booking-level `group` and a per-room `guestName` (rooming list) in the booking
editor; the board and folio show the room's guest. Check-in: other adult guests (name, ID type, last 4 characters only).
The guest register shows room numbers for hotel bookings.
Then: rate plans (settings hotel.ratePlans: name, adjustPct, nonRefundable, minNights, cats, web, ota, note; none by
default). Quotes apply them to the room price (not meals or extras); the website quote only sees `web` rates, staff see all;
holds and stays keep `rate`/`nonRefundable`; Channex gets one rate plan per category × meal plan × OTA rate and pushes it
priced off the standard rate (mapping ratePlans[].rate). Travel agents (hotel.agents: name, commissionPct, GSTIN, phone);
stay.agent plus an optional agentCommission override; GET /hotel/agents ledger (due once the stay is over, upcoming, paid);
POST /hotel/agent-paid (owner) sets agentPaid, which a page save can't change. Group allotments: stay.releaseDate; the front
desk is prompted once the date passes; POST /hotel/release-unnamed removes rooms without a guest name (and their room lines
when they match one per room), logged in `released`. Banquets (banquets.js, banquets.json, banquets.html): venues (owner),
events with set-up, menu, charges, discount, tentative/confirmed/cancelled, clash check per venue (can be overridden),
over-capacity flag, payments by the owner only, printable function sheet. Portfolio (portfolio.html, POST /portfolio): the
browser keeps an owner sign-in per property (ryst_portfolio); each is verified and only that property's figures come back
(tonight, arrivals, revenue MTD, ADR, next 30 days, pending approvals, Form C due).
Then: banquet tax invoices (each charge line carries its GST rate; POST /banquets/invoice issue/cancel with buyer and SAC;
numbered in the same series as room invoices; room invoices now count event invoices too, and /gst/register lists both).
Kitchen display (kitchen.html): restaurant orders move new → preparing → ready → served (`kot`, `kotAt`; command
kot-status), separate from payment; printable ticket; optional chime. Settings rate plans and agents moved below Rooms.
Still open: Channex go-live (staging account, certification).

### Phase 2 — Front desk and housekeeping
- Tape chart: rooms × dates grid, drag to assign / move / extend, unassigned queue.
- Check-in (assign rooms, ID per guest, advance), room move, early/late, check-out with folio per
  room or combined, split bill, company/travel-agent billing (direct billing), city ledger.
- Housekeeping status per room: Vacant Clean, Vacant Dirty, Inspected, Occupied, Out of Order;
  housekeeper phone view (reuse caretaker pages), auto-dirty on check-out, task assignment.
- Night audit: roll date, post room charges, no-show handling, day-end report.
- Form C (foreign nationals) export for FRRO; guest register.

### Phase 3 — Front-desk dashboard
Tiles: Occupancy today (rooms sold / available, %), 7- and 30-day occupancy forecast strip,
Arrivals (expected / checked in), Departures (expected / checked out), In-house and stayovers,
Room status ring (vacant clean / dirty / inspected / occupied / out of order) with "rooms ready"
count, Revenue today and month-to-date, ADR, RevPAR, booking pick-up (last 24 h / 7 d), source mix,
pending payments, unassigned rooms, VIP/notes. One screen, live, readable on a front-desk monitor.

### Phase 4 — Channel management for hotels
Category-level availability, rates and restrictions to OTAs (MakeMyTrip/Goibibo, Booking.com,
Agoda, Expedia, Airbnb), bookings pulled in with category mapping. Approach is an owner decision
(see section 4). iCal per room stays as the free fallback.

### Phase 5 — Revenue, groups and add-ons
Rate plans and derived rates, group blocks and rooming lists, corporate/TA accounts and
commissions, reports (occupancy by category, ADR, RevPAR, pick-up, pace, nationality, night audit,
business on books), POS posting to room folio (restaurant.html), banquets later, multi-property view.

## 4. Decisions for the owner
1. Channel manager: (a) integrate a channel-manager API partner for real two-way rates and
   inventory (fastest route to hotel-grade OTA sync; per-property fee), (b) direct OTA APIs
   (each OTA's connectivity certification; slow), or (c) iCal per room only (free, availability only,
   no rates).
2. Dashboard reference: screenshots of the WINCLOUD dashboard the owner wants matched.
3. Hotel pricing tiers (by room count) for the subscription page.
