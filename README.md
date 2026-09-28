# RYST Harbour — harbour.ryst.in

The villa management app: staff app (login, bookings, quotes, settings, petty cash,
checklists, inventory, reports, restaurant, reviews), villa signup (`start.html`) and
the guest pages. Data and sign-in come from the server at `data.ryst.in`
(repo `ryst-109a-proxy`).

## Guest pages are published on two addresses

`checkin.html`, `guest.html`, `feedback.html`, `wa.html`, `villa.js` and `property.js`
are **edited here only**. RYST 109A's guests use them on its own site, stay.ryst.in:
a workflow in the `RYST-109A` repository copies these files from this repository
every hour (and on demand). Don't edit those copies in `RYST-109A`.

Other villas' guests use them here, with `?v=<villa>` in their links.
