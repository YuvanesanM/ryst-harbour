// Demo / Play Store reviewer mode for the staff app.
// Signing in on login.html with the reviewer credentials sets
// localStorage.ryst_demo = '1'; from then on every staff page answers its
// data.ryst.in requests from the SAMPLE data below instead of the network —
// no real guest, booking or cash record is ever loaded — and refuses every
// write with a clear "demo mode" message. Nothing here runs otherwise.
(function(){
  var on = false;
  try { on = localStorage.getItem('ryst_demo') === '1'; } catch (e) {}
  if (!on) return;

  var PROXY = 'https://data.ryst.in';
  function iso(n){ var d = new Date(Date.now() + 5.5*3600e3); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0,10); }
  var now = Date.now(), T = iso(0);
  function villa(rate, nights){ return [{ desc:'Villa Rental Charges', qty:String(nights), rate:String(rate), _villaRow:true }]; }
  var stays = [
    { no:'DEMO/INV/001', type:'invoice', guest:'Sample Guest A', phone:'+919000000001', email:'guest.a@example.com', guests:8, channel:'WhatsApp / Phone', checkin:iso(-2), checkout:iso(0), date:iso(-10), advance:20000, items:villa(30000,2), mode:'UPI', checkinInfo:{ name:'Sample Guest A', idType:'Aadhaar', idNumber:'XXXX-XXXX-0001', arrivalTime:'14:00', guestsCount:8, submittedAt:now-86400000 } },
    { no:'DEMO/INV/006', type:'invoice', guest:'Sample Guest E', phone:'+919000000006', email:'guest.e@example.com', guests:10, channel:'Website', checkin:iso(0), checkout:iso(2), date:iso(-9), advance:39600, items:villa(39600,2), mode:'Razorpay', checkinInfo:{ name:'Sample Guest E', idType:'Passport', idNumber:'XXXXXX06', arrivalTime:'15:30', guestsCount:10, submittedAt:now-3600e3 } },
    { no:'DEMO/INV/002', type:'invoice', guest:'Sample Guest B', phone:'+919000000002', email:'guest.b@example.com', guests:6, channel:'Airbnb', checkin:iso(3), checkout:iso(5), date:iso(-6), advance:15000, items:villa(30000,2), otaSettlement:51600, mode:'Bank transfer', reminderSentAt:new Date(now-3600e3).toISOString(), waDelivery:{ reminderSentAt:{ id:'demo1', status:'read', at:new Date(now-3600e3).toISOString() } } },
    { no:'DEMO/QT/003', type:'quote', guest:'Sample Guest C', phone:'+919000000003', email:'guest.c@example.com', guests:12, checkin:iso(6), checkout:iso(7), date:iso(-1), advance:10000, items:villa(36000,1) },
    { no:'DEMO/INV/004', type:'invoice', guest:'Sample Guest D', phone:'+919000000004', email:'guest.d@example.com', guests:4, checkin:iso(-5), checkout:iso(-3), date:iso(-20), advance:60000, items:villa(30000,2), mode:'Razorpay' },
    { no:'DEMO/BLK/005', type:'block', guest:'Airbnb', source:'airbnb', checkin:iso(10), checkout:iso(12) },
    { no:'BLOCK-demo-maint', type:'block', guest:'Maintenance', checkin:iso(18), checkout:iso(19) },
    // Earlier stays, so the dashboard and reports have a few months of history.
    { no:'DEMO/INV/101', type:'invoice', guest:'Sample Guest F', guests:8, channel:'Website', mode:'Razorpay', checkin:iso(-33), checkout:iso(-31), date:iso(-45), advance:72000, items:villa(36000,2) },
    { no:'DEMO/INV/102', type:'invoice', guest:'Sample Guest G', guests:12, channel:'Airbnb', mode:'Bank transfer', checkin:iso(-47), checkout:iso(-44), date:iso(-60), advance:108000, items:villa(36000,3) },
    { no:'DEMO/INV/103', type:'invoice', guest:'Sample Guest H', guests:6, channel:'Booking.com', mode:'UPI', checkin:iso(-68), checkout:iso(-66), date:iso(-80), advance:79200, items:villa(39600,2) },
    { no:'DEMO/INV/104', type:'invoice', guest:'Sample Guest I', guests:10, channel:'WhatsApp / Phone', mode:'UPI', checkin:iso(-96), checkout:iso(-94), date:iso(-110), advance:72000, items:villa(36000,2) },
    { no:'DEMO/INV/105', type:'invoice', guest:'Sample Guest J', guests:8, channel:'Website', mode:'Razorpay', checkin:iso(-124), checkout:iso(-121), date:iso(-140), advance:118800, items:villa(39600,3) },
    { no:'DEMO/INV/106', type:'invoice', guest:'Sample Guest K', guests:4, channel:'Agoda', mode:'Bank transfer', checkin:iso(-152), checkout:iso(-150), date:iso(-165), advance:72000, items:villa(36000,2) }
  ];
  function total(s){ return (s.items||[]).reduce(function(a,it){ return a + (+it.rate||0)*(+it.qty||0); }, 0); }
  var reg = stays.filter(function(s){ return s.type !== 'block'; }).map(function(s){
    var t = total(s), paid = +s.advance||0, due = Math.max(0, t-paid);
    return { no:s.no, type:s.type, guest:s.guest, phone:s.phone, guests:s.guests, checkin:s.checkin, checkout:s.checkout,
      nights:Math.round((new Date(s.checkout)-new Date(s.checkin))/864e5), channel:'Direct', mode:s.mode||'',
      stayTotal:t, stayPaid:paid, stayDue:due, stayStatus: due<=0?'paid':paid>0?'partial':'unpaid',
      foodTotal:0, foodPaid:0, foodDue:0, foodOrderCount:0, foodStatus:'none', checkedIn:!!s.checkinInfo,
      arrivalTime:s.checkinInfo?s.checkinInfo.arrivalTime:'', vehicleNumber:'', checkinGuestsCount:s.checkinInfo?s.checkinInfo.guestsCount:null, checkinNote:'' };
  });
  var exp = function(id, n, amt, cat, note, status){ return { id:id, type:'expense', date:iso(n), amount:amt, category:cat, note:note, status:status, createdBy:'caretaker@example.com', createdAt:now-(-n)*864e5 }; };
  var FIX = {
    '/property': { name:'Demo Villa', fullName:'Demo Beach Villa', restaurantName:'Demo Kitchen', address:'1 Sample Road, Coastal Town - 600000',
      mapLink:'', website:'', whatsapp:'', instagram:'', signatory:'Villa Manager', typeLabel:'Beach Villa', tagline:'Sample property',
      receiptNote:'Thank you for dining with us.', logoUrl:'https://harbour.ryst.in/assets/staff-icon-512.png', coverUrl:'', latitude:null, longitude:null, googlePlaceQuery:'' },
    '/stays': { version:1, stays:stays },
    '/guest-register': { ok:true, entries:reg, today:T },
    '/active-stay': { active:true, no:'DEMO/INV/001', guest:'Sample Guest A', checkin:iso(-2), checkout:iso(0) },
    '/petty-cash': { version:1, float:5000, categories:['Groceries & Guest Supplies','Housekeeping','Utilities','Repairs & Maintenance','Transport','Miscellaneous'], entries:[
      { id:'d1', type:'topup', subtype:'cash', date:iso(-14), amount:5000, note:'Opening float', createdBy:'owner@example.com', createdAt:now-14*864e5 },
      exp('d2',-6,640,'Groceries & Guest Supplies','Milk, bread, eggs','reimbursed'),
      exp('d3',-4,350,'Housekeeping','Detergent & mops','pending'),
      exp('d4',-2,1200,'Repairs & Maintenance','Pool pump fuse','pending'),
      exp('d5',-1,180,'Transport','Auto to market','pending') ] },
    '/inventory': { version:1, categories:['Linen & Bedding','Toiletries & Guest Supplies','Kitchen & Pantry','Cleaning Supplies','Gas & Fuel','Pool & Maintenance','Miscellaneous'], items:[
      { id:'i1', name:'Bath towels', category:'Linen & Bedding', unit:'pcs', quantity:24, threshold:12 },
      { id:'i2', name:'Shampoo sachets', category:'Toiletries & Guest Supplies', unit:'pcs', quantity:8, threshold:20 },
      { id:'i3', name:'Drinking water cans', category:'Kitchen & Pantry', unit:'cans', quantity:6, threshold:4 },
      { id:'i4', name:'Floor cleaner', category:'Cleaning Supplies', unit:'L', quantity:2, threshold:3 },
      { id:'i5', name:'LPG cylinder', category:'Gas & Fuel', unit:'nos', quantity:1, threshold:1 },
      { id:'i6', name:'Chlorine tablets', category:'Pool & Maintenance', unit:'kg', quantity:5, threshold:2 } ] },
    '/checklist': { version:1, templates:{"checkin": ["Bedroom 1 — beds made, pillows arranged, fresh linens", "Bedroom 1 — washed cups, kettle tray filled, towels folded, water bottles stocked", "Bedroom 1 toilet — bathroom clean, toiletries & tissue stocked", "Bedroom 2 — beds made, pillows arranged, fresh linens", "Bedroom 2 — washed cups, kettle tray filled, towels folded, water bottles stocked", "Bedroom 2 toilet — bathroom clean, toiletries & tissue stocked", "Bedroom 3 — beds made, pillows arranged, fresh linens", "Bedroom 3 — washed cups, kettle tray filled, towels folded, water bottles stocked", "Bedroom 3 toilet — bathroom clean, toiletries & tissue stocked", "Bedroom 4 — beds made, pillows arranged, fresh linens", "Bedroom 4 — washed cups, kettle tray filled, towels folded, water bottles stocked", "Bedroom 4 toilet — bathroom clean, toiletries & tissue stocked", "Living room set, tissues stocked", "Dining table set, cutlery & tissues laid, water stocked", "Fridge stocked with ice cubes & water", "Kitchen clean, appliances working", "AC / fans working in all rooms", "Pool & jacuzzi clean and safe", "Wi-Fi working", "Recreation hall — all equipment arranged in place", "Pool deck — pool towels, ashtray cleaned, seating arranged", "Chess Balcony — cleaned and arranged", "Lift working", "Powder room — liquid soap & diffuser stocked"], "checkout": ["Checked for damage to furniture, walls or fixtures", "Checked for missing items (towels, remotes, etc.)", "Linens & towels collected for laundry", "Kitchen cleaned, appliances switched off", "Trash removed", "AC / lights / fans switched off", "Doors & windows locked", "Pool cleaned if used", "Lost & found items collected"], "daily": ["Pool — skimmed, chlorine and water level checked", "Garden watered, leaves swept", "Common areas swept and mopped", "Trash taken out", "Water tank and motor checked", "Power backup (inverter / generator) checked", "Gates and doors locked at night"]}, runs:[ { id:'r1', type:'daily', stayNo:'', guest:'', date:iso(-1), items:[{ text:'All rooms checked', checked:true, note:'', photo:null }], overallNote:'', status:'completed', startedBy:'caretaker@example.com', startedAt:now+(-1)*864e5, completedBy:'caretaker@example.com', completedAt:now+(-1)*864e5+3600e3 }, { id:'r2', type:'daily', stayNo:'', guest:'', date:iso(-2), items:[{ text:'All rooms checked', checked:true, note:'', photo:null }], overallNote:'', status:'completed', startedBy:'caretaker@example.com', startedAt:now+(-2)*864e5, completedBy:'caretaker@example.com', completedAt:now+(-2)*864e5+3600e3 }, { id:'r3', type:'checkout', stayNo:'DEMO/INV/004', guest:'Sample Guest D', date:iso(-3), items:[{ text:'All rooms checked', checked:true, note:'', photo:null }], overallNote:'', status:'completed', startedBy:'caretaker@example.com', startedAt:now+(-3)*864e5, completedBy:'caretaker@example.com', completedAt:now+(-3)*864e5+3600e3 }, { id:'r4', type:'checkin', stayNo:'DEMO/INV/004', guest:'Sample Guest D', date:iso(-5), items:[{ text:'All rooms checked', checked:true, note:'', photo:null }], overallNote:'', status:'completed', startedBy:'caretaker@example.com', startedAt:now+(-5)*864e5, completedBy:'caretaker@example.com', completedAt:now+(-5)*864e5+3600e3 } ] },
    '/issues': { version:1, issues:[
      { id:'is1', title:'Bathroom tap leaking', area:'Bedroom 2', urgency:'normal', note:'Drips all night', photo:null, status:'open', reportedBy:'caretaker@example.com', reportedAt:now-5*3600e3, fixedBy:null, fixedAt:null, fixNote:'', fixPhoto:null },
      { id:'is2', title:'Pool motor making noise', area:'Pool', urgency:'urgent', note:'', photo:null, status:'open', reportedBy:'caretaker@example.com', reportedAt:now-2*3600e3, fixedBy:null, fixedAt:null, fixNote:'', fixPhoto:null },
      { id:'is3', title:'Tube light not working', area:'Kitchen', urgency:'low', note:'', photo:null, status:'fixed', reportedBy:'caretaker@example.com', reportedAt:now-3*864e5, fixedBy:'caretaker@example.com', fixedAt:now-2*864e5, fixNote:'Replaced the tube', fixPhoto:null } ] },
    '/restaurant': { version:1, settings:{"gstPercent": 0, "serviceChargePercent": 0, "invoicePrefix": "CDR", "nextOrderSeq": 19, "expiryAlertDays": 5, "partnerKitchenPhone": "", "showPartnerRate": false}, categories:["Breakfast", "Meals", "Dinner", "Beverages"], menu:[{"id": "rsm_ms682mxa_61d295", "name": "Idli Set (3 idli + sambar + chutneys)", "category": "Breakfast", "veg": true, "price": 150, "description": "", "chefSpecial": false, "sourcing": "Partner Kitchen", "moq": 1, "active": true, "cost": 75, "notes": "", "createdBy": "demo", "createdAt": 0}, {"id": "rsm_ms682mxa_752634", "name": "Poori Set (3 poori + potato masala)", "category": "Breakfast", "veg": true, "price": 150, "description": "", "chefSpecial": false, "sourcing": "Partner Kitchen", "moq": 1, "active": true, "cost": 75, "notes": "", "createdBy": "demo", "createdAt": 0}, {"id": "rsm_ms682mxa_36ab17", "name": "Pongal ( sambar + chutneys)", "category": "Breakfast", "veg": true, "price": 140, "description": "", "chefSpecial": false, "sourcing": "Partner Kitchen", "moq": 1, "active": true, "cost": 70, "notes": "", "createdBy": "demo", "createdAt": 0}, {"id": "rsm_ms682mxa_19af3c", "name": "Kal Dosa  (2 thick dosa + sambar + chutneys)", "category": "Breakfast", "veg": true, "price": 150, "description": "", "chefSpecial": false, "sourcing": "Partner Kitchen", "moq": 1, "active": true, "cost": 75, "notes": "", "createdBy": "demo", "createdAt": 0}, {"id": "rsm_ms682mxa_9e0d86", "name": "Grand Vegetarian Virundhu (Veg Meals thali)", "category": "Meals", "veg": true, "price": 450, "description": "", "chefSpecial": false, "sourcing": "Partner Kitchen", "moq": 1, "active": true, "cost": 225, "notes": "", "createdBy": "demo", "createdAt": 0}, {"id": "rsm_ms682mxa_1a7b84", "name": "Grand Non-Vegetarian Virundhu (Non-Veg Meals thali)", "category": "Meals", "veg": false, "price": 850, "description": null, "chefSpecial": false, "sourcing": "Partner Kitchen", "moq": 1, "active": true, "cost": 425, "notes": "", "createdBy": "demo", "createdAt": 0}, {"id": "rsm_ms682mxa_12d15e", "name": "Chappathi Combo (includes veg gravy, 2 pcs)", "category": "Dinner", "veg": true, "price": 150, "description": null, "chefSpecial": false, "sourcing": "Partner Kitchen", "moq": 1, "active": true, "cost": 75, "notes": "", "createdBy": "demo", "createdAt": 0}, {"id": "rsm_ms682mxa_d9f7b2", "name": "Parota Combo (includes veg gravy, 2 pcs)", "category": "Dinner", "veg": true, "price": 190, "description": null, "chefSpecial": false, "sourcing": "Partner Kitchen", "moq": 1, "active": true, "cost": 95, "notes": "", "createdBy": "demo", "createdAt": 0}, {"id": "rsm_ms682mxa_461b12", "name": "Curd Rice (Thayir Sadam)", "category": "Dinner", "veg": true, "price": 150, "description": "", "chefSpecial": false, "sourcing": "Partner Kitchen", "moq": 1, "active": true, "cost": 75, "notes": "", "createdBy": "demo", "createdAt": 0}, {"id": "rsm_ms682mxa_49016a", "name": "Seeraga Samba Chicken Biryani ( Serves 6)", "category": "Dinner", "veg": false, "price": 1900, "description": "", "chefSpecial": true, "sourcing": "Partner Kitchen", "moq": 8, "active": true, "cost": 950, "notes": "", "createdBy": "demo", "createdAt": 0}, {"id": "rsm_ms682mxa_8ccbd2", "name": "Seeraga Samba Mutton Biryani ( Serves 6)", "category": "Dinner", "veg": false, "price": 2700, "description": "", "chefSpecial": true, "sourcing": "Partner Kitchen", "moq": 1, "active": true, "cost": 1350, "notes": "", "createdBy": "demo", "createdAt": 0}, {"id": "rsm_ms682mxa_c284d2", "name": "Paneer 65 (of Paneer/Gobi/Chicken 65 row)", "category": "Dinner", "veg": true, "price": 360, "description": "", "chefSpecial": false, "sourcing": "Partner Kitchen", "moq": 1, "active": true, "cost": 180, "notes": "", "createdBy": "demo", "createdAt": 0}, {"id": "rsm_ms682mxa_84155a", "name": "Gobi 65 (of Paneer/Gobi/Chicken 65 row)", "category": "Dinner", "veg": true, "price": 340, "description": "", "chefSpecial": false, "sourcing": "Partner Kitchen", "moq": 1, "active": true, "cost": 170, "notes": "", "createdBy": "demo", "createdAt": 0}, {"id": "rsm_ms682mxa_5e320a", "name": "Chicken 65 (of Paneer/Gobi/Chicken 65 row)", "category": "Dinner", "veg": false, "price": 380, "description": "", "chefSpecial": true, "sourcing": "Partner Kitchen", "moq": 1, "active": true, "cost": 190, "notes": "", "createdBy": "demo", "createdAt": 0}, {"id": "rsm_ms682mxa_335310", "name": "Pepper Mushroom (of Pepper Mushroom/Chicken row)", "category": "Dinner", "veg": true, "price": 320, "description": "", "chefSpecial": false, "sourcing": "Partner Kitchen", "moq": 1, "active": true, "cost": 160, "notes": "", "createdBy": "demo", "createdAt": 0}, {"id": "rsm_ms682mxa_000277", "name": "Pepper Chicken (of Pepper Mushroom/Chicken row)", "category": "Dinner", "veg": false, "price": 400, "description": "", "chefSpecial": false, "sourcing": "Partner Kitchen", "moq": 8, "active": true, "cost": 200, "notes": "", "createdBy": "demo", "createdAt": 0}], inventory:[], purchases:[], orders:[
      { no:'DEMO-F-001', date:iso(-1), time:'20:15', guest:'Sample Guest A', stayNo:'DEMO/INV/001', items:[], subtotal:1450, discount:0, gstPercent:5, gstAmount:73, serviceChargePercent:0, serviceChargeAmount:0, total:1523, paymentMode:'', status:'open' } ] },
    '/feedback': { version:1, entries:[
      { id:'f1', guest:'Sample Guest D', bookingNo:'DEMO/INV/004', rating:5, comment:'Lovely pool and a very helpful caretaker.', allowFeature:true, createdAt:now-2*864e5, source:'form', approved:true } ] },
    '/stay-settings': { version:1, company:'Demo Beach Villa\n1 Sample Road, Coastal Town - 600000', pan:'DEMO00000X', invPrefix:'DEMO/INV', qtPrefix:'DEMO/QT', bank:'Sample bank details', wifiNetwork:'DemoVilla-Guest', wifiVoucher:'demo', walletAppleEnabled:false, walletGoogleEnabled:false, declaration:'Sample declaration.', terms:['Check-in 3 pm, check-out 11 am.'], rates:[{ desc:'Villa Rental Charges', rate:30000 }], maxGuests:10, guestCapacity:16, advancePercent:30 },
    '/ota-status': { now:new Date(now).toISOString(), lastRunAt:new Date(now-1.5*3600e3).toISOString(), everyHours:3, channels:[
      { id:'airbnb', label:'Airbnb', kind:'ok', error:'', lastRunAt:new Date(now-1.5*3600e3).toISOString(), lastOkAt:new Date(now-1.5*3600e3).toISOString(), failingSince:null, feedCount:3, upcoming:2, needsGuest:1, captured:1, gone:0, theyReadOursAt:new Date(now-2*3600e3).toISOString() },
      { id:'booking', label:'Booking.com', kind:'ok', error:'', lastRunAt:new Date(now-1.5*3600e3).toISOString(), lastOkAt:new Date(now-1.5*3600e3).toISOString(), failingSince:null, feedCount:0, upcoming:0, needsGuest:0, captured:0, gone:0, theyReadOursAt:new Date(now-5*3600e3).toISOString() },
      { id:'agoda', label:'Agoda', kind:'held', error:'The calendar came back empty — held back in case the feed glitched. If it is still empty in 20 hours those holds are cleared as cancelled.', lastRunAt:new Date(now-1.5*3600e3).toISOString(), lastOkAt:new Date(now-30*3600e3).toISOString(), failingSince:new Date(now-4*3600e3).toISOString(), feedCount:2, upcoming:1, needsGuest:1, captured:0, gone:0, theyReadOursAt:null } ], fullLinkReadAt:null },
    '/team': { canManageAccess:true, members:[
      { email:'caretaker@example.com', role:'caretaker', modules:['petty-cash','inventory','checklist','guestRegister'], telegram:true, name:'Murugan S', phone:'+91 90000 00011', joined:'2024-11-01', note:'Lives next door. Off on Tuesdays.' },
      { email:'helper@example.com', role:'caretaker', modules:['checklist','inventory'], telegram:false, name:'', phone:'', joined:'', note:'' },
      { email:'manager@example.com', role:'coordinator', modules:['bookings','guestRegister','reports'], telegram:true, name:'Priya R', phone:'+91 90000 00022', joined:'2025-03-15', note:'Handles guest calls and bookings.' } ] },
    '/users': { version:1, users:[{ email:'reviewer@example.com', role:'owner', admin:true, modules:[], telegramChatId:'' }] },
    '/whatsapp-templates': { templates:{}, interaktTemplates:{}, automation:{} },
    '/whatsapp/status': { configured:true, connected:true, botUsername:'demo_bot', recipientCount:1, alertTypes:[] },
    '/whatsapp/webhook-info': { url:'(hidden in demo mode)', recent:[] },
    '/telegram/chat-id': { chats:[] }
  };
  var MSG = 'Demo mode — sample data only, changes are not saved. Sign in with your staff account to make changes.';
  function reply(status, body){ return Promise.resolve(new Response(JSON.stringify(body), { status:status, headers:{ 'Content-Type':'application/json' } })); }
  var realFetch = window.fetch.bind(window);
  window.fetch = function(input, init){
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf(PROXY) !== 0) return realFetch(input, init);
    var path = url.slice(PROXY.length).split('?')[0];
    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    if (method === 'GET' && FIX.hasOwnProperty(path)) return reply(200, JSON.parse(JSON.stringify(FIX[path])));
    if (method === 'GET') return reply(200, {});
    if (path === '/ical-import') return reply(200, { results:[] }); // bookings.html's silent auto-sync
    return reply(403, { ok:false, error:MSG });
  };

  // Always-visible banner so nobody mistakes this for live data.
  function banner(){
    if (document.getElementById('rystDemoBar')) return;
    var b = document.createElement('div');
    b.id = 'rystDemoBar';
    b.setAttribute('role', 'status');
    b.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483000;background:#0e2420;color:#f6f1e6;font:600 13px/1.3 system-ui,-apple-system,Roboto,sans-serif;padding:9px 14px;display:flex;align-items:center;justify-content:center;gap:12px;box-shadow:0 -4px 16px rgba(0,0,0,.2)';
    b.innerHTML = '<span>Demo mode · sample data, changes are not saved</span>';
    var x = document.createElement('button');
    x.type = 'button'; x.textContent = 'Exit demo';
    x.style.cssText = 'background:#e3c486;color:#1a2c33;border:0;border-radius:8px;padding:6px 12px;font:600 12px system-ui,sans-serif;cursor:pointer';
    x.onclick = function(){ window.rystExitDemo(); };
    b.appendChild(x);
    document.body.appendChild(b);
    document.body.style.paddingBottom = '48px';
  }
  window.rystExitDemo = function(){
    ['ryst_demo','ryst_proxy_token','ryst_user_email','ryst_user_role','ryst_user_admin','ryst_user_modules'].forEach(function(k){ try { localStorage.removeItem(k); } catch (e) {} });
    var fromHome = false; try { fromHome = sessionStorage.getItem('ryst_demo_from') === 'home'; sessionStorage.removeItem('ryst_demo_from'); } catch (e) {}
    location.href = fromHome ? '/' : '/login.html'; // "Try the demo" visitors go back to the home page
  };
  if (document.body) banner(); else document.addEventListener('DOMContentLoaded', banner);
})();
