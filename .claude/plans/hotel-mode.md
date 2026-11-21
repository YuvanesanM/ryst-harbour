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
