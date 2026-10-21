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
    { no:'DEMO/INV/106', type:'invoice', guest:'Sample Guest K', guests:4, channel:'Agoda', mode:'Bank transfer', checkin:iso(-152), checkout:iso(-150), date:iso(-165), advance:72000, items:villa(36000,2) },
    // For the Guests page: a returning guest's earlier stay, a quote waiting on the guest and one that lapsed.
    { no:'DEMO/INV/107', type:'invoice', guest:'Sample Guest A', phone:'+919000000001', email:'guest.a@example.com', guests:8, channel:'WhatsApp / Phone', mode:'UPI', checkin:iso(-212), checkout:iso(-210), date:iso(-230), advance:72000, items:villa(36000,2) },
    { no:'DEMO/QT/108', type:'quote', guest:'Sample Guest L', phone:'+919000000012', guests:6, channel:'WhatsApp / Phone', checkin:iso(24), checkout:iso(26), date:iso(-3), advance:0, quoteReadySentAt:new Date(now-3*864e5).toISOString(), items:villa(36000,2) },
    { no:'DEMO/QT/109', type:'quote', guest:'Sample Guest M', phone:'+919000000013', guests:10, channel:'Website', checkin:iso(-12), checkout:iso(-10), date:iso(-25), advance:0, items:villa(39600,2) }
  ];
  function total(s){ return (s.items||[]).reduce(function(a,it){ return a + (+it.rate||0)*(+it.qty||0); }, 0); }
  var reg = stays.filter(function(s){ return s.type !== 'block'; }).map(function(s){
    var t = total(s), paid = +s.advance||0, due = Math.max(0, t-paid);
    return { no:s.no, type:s.type, guest:s.guest, phone:s.phone, guests:s.guests, checkin:s.checkin, checkout:s.checkout,
      nights:Math.round((new Date(s.checkout)-new Date(s.checkin))/864e5), channel:'Direct', mode:s.mode||'',
      stayTotal:t, stayPaid:paid, stayDue:due, due:(s.type==='quote'&&paid<=0)?0:due, stayStatus: (s.type==='quote'&&paid<=0)?'unconfirmed':due<=0?'paid':paid>0?'partial':'unpaid',
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
    '/ota-status': { now:new Date(now).toISOString(), lastRunAt:new Date(now-1.5*3600e3).toISOString(), everyHours:1/6, everyMinutes:10, channels:[
      { id:'airbnb', label:'Airbnb', kind:'ok', error:'', lastRunAt:new Date(now-1.5*3600e3).toISOString(), lastOkAt:new Date(now-1.5*3600e3).toISOString(), failingSince:null, feedCount:3, upcoming:2, needsGuest:1, captured:1, gone:0, theyReadOursAt:new Date(now-2*3600e3).toISOString() },
      { id:'booking', label:'Booking.com', kind:'ok', error:'', lastRunAt:new Date(now-1.5*3600e3).toISOString(), lastOkAt:new Date(now-1.5*3600e3).toISOString(), failingSince:null, feedCount:0, upcoming:0, needsGuest:0, captured:0, gone:0, theyReadOursAt:new Date(now-5*3600e3).toISOString() },
      { id:'agoda', label:'Agoda', kind:'held', error:'The calendar came back empty — held back in case the feed glitched. If it is still empty in 20 hours those holds are cleared as cancelled.', lastRunAt:new Date(now-1.5*3600e3).toISOString(), lastOkAt:new Date(now-30*3600e3).toISOString(), failingSince:new Date(now-4*3600e3).toISOString(), feedCount:2, upcoming:1, needsGuest:1, captured:0, gone:0, theyReadOursAt:null } ], fullLinkReadAt:null },
    '/team': { canManageAccess:true, members:[
      { email:'caretaker@example.com', role:'caretaker', modules:['petty-cash','inventory','checklist','guestRegister'], telegram:true, name:'Murugan S', phone:'+91 90000 00011', joined:'2024-11-01', note:'Lives next door. Off on Tuesdays.', phoneAlerts:[{ device:'Android', since:'2026-10-03T17:01:48Z' }] },
      { email:'helper@example.com', role:'caretaker', modules:['checklist','inventory'], telegram:false, name:'Selvi', phone:'+91 90000 00033', joined:'', note:'', phoneAlerts:[] },
      { email:'manager@example.com', role:'coordinator', modules:['bookings','guestRegister','reports'], telegram:true, name:'Priya R', phone:'+91 90000 00022', joined:'2025-03-15', note:'Handles guest calls and bookings.' } ] },
    '/guests': { version:1, notes:{ '9000000001':{ text:'Celebrated an anniversary last time — likes the poolside dinner setup.', at:new Date(now-40*864e5).toISOString(), by:'reviewer@example.com' } }, lost:{} },
    '/users': { version:1, users:[{ email:'reviewer@example.com', role:'owner', admin:true, modules:[], telegramChatId:'' }] },
    '/whatsapp-templates': { templates:{}, interaktTemplates:{}, automation:{} },
    '/whatsapp/status': { configured:true, connected:true, botUsername:'demo_bot', recipientCount:1, alertTypes:[] },
    '/whatsapp/webhook-info': { url:'(hidden in demo mode)', recent:[] },
    '/telegram/chat-id': { chats:[] },
    '/weather': (function(){ var d = new Date(), iso = function(n){ var x = new Date(d); x.setDate(x.getDate()+n); return x.toISOString().slice(0,10); };
      return { ok:true, at: now, source:'Open-Meteo', now:{ temp:31.4, feels:36.2, humidity:71, rain:0, code:2, wind:14, day:true },
        days:[[2,33,26,20,0,9,18],[61,31,25,70,6.4,7,24],[80,30,25,55,3.1,8,21],[1,32,26,10,0,10,16],[0,33,26,5,0,10,15]].map(function(v,i){ return { date: iso(i), code:v[0], max:v[1], min:v[2], rainChance:v[3], rain:v[4], uv:v[5], wind:v[6], sunrise:'06:04', sunset:'17:51' }; }) }; })(),
    '/metrics': { ok:true, revenue:296723, received:144600, due:152123, expenses:1730, nights:11, days:31, occupancy:35 },
    '/agents': (function(){
      var A = [['reservations','Reservations Concierge','chat',4,'Answers the WhatsApp and Instagram messages the auto-reply could not, and follows up quotes that went quiet.'],
        ['revenue','Revenue Manager','trend',10,'Watches empty nights, booking pace and holidays; suggests weekday offers, weekend pushes and minimum stays.'],
        ['operations','Operations Supervisor','clipboard',3,'Keeps arrivals ready: check-in and check-out checklists, daily rounds, overdue repairs and low stock.'],
        ['guest','Guest Relations Manager','heart',4,'Catches pre-arrival and after-stay messages that did not go out, and drafts replies to Google reviews.'],
        ['accounts','Accounts & Collections Officer','rupee',6,'Chases balances before arrival and after check-out, flags waiting expenses and open food bills, writes the month-end summary.'],
        ['creators','Creator Partnerships Manager','camera',8,'Screens creator requests with a recommendation, follows up content after the stay, and watches follower-code returns.']];
      var st = { reservations:[3,14,2,1,2,40000], revenue:[2,6,1,2,2,52000], operations:[3,22,1,0,3,0], guest:[2,9,2,0,2,0], accounts:[2,11,0,0,2,152123], creators:[1,4,1,1,1,0] };
      var agents = A.map(function(a){ var s = st[a[0]], dec = s[1] + s[2] + s[3];
        return { id:a[0], name:{ reservations:'Nila', revenue:'Dev', operations:'Bala', guest:'Anbu', accounts:'Lakshmi', creators:'Zara' }[a[0]], title:a[1], icon:a[2], minutes:a[3], does:a[4], mode: a[0] === 'creators' ? 'paused' : 'shadow', run:{ at: now - 12*60e3, ms: 40, made: s[4] > 1 ? 1 : 0, resolved: a[0] === 'operations' ? 1 : 0, error:'' },
          stats:{ drafted: dec + s[0] + 3, today: s[4], pending: s[0], agree: s[1], edit: s[2], reject: s[3], resolved: 2, accuracy: s[1] / dec, ready: dec >= 20 && s[1] / dec >= 0.9, valuePending: s[5] } }; });
      var D = function(id, agent, pri, title, detail, ch, to, text, value, link, extra){ return Object.assign({ id:id, key:id, agent:agent, at: now - (pri * 47) * 60e3, status:'pending', priority:pri, title:title, detail:detail, proposal:{ channel:ch, to:to, text:text }, value:value, link:link }, extra || {}); };
      var drafts = [
        D('d1','operations',1,'Get the villa ready for Sample Guest B (Fri 23 Oct)','Check-in checklist not started.','telegram','Caretaker','🧹 Sample Guest B arrive Fri 23 Oct (6 guests). Please start the check-in checklist and send photos of the bedrooms and pool when done.',0,'checklist.html'),
        D('d2','accounts',1,'₹1,52,123 still to collect this month','Booked ₹2,96,723, received ₹1,44,600 for October stays.','report','','Three stays carry balances. Two arrive within 7 days — I\'ve drafted polite reminders with payment links for each.',152123,'guest-register.html?f=unpaid'),
        D('d3','reservations',1,'Reply to Priya','"Can we bring a small cake and decorate the living room for a birthday?" — the auto-reply could not answer','whatsapp','Priya','Hi Priya! Yes, a small birthday setup is lovely — balloons and a cake are welcome. Please avoid confetti near the pool. Shall I check dates for you?',0,'settings.html#wa-review',{ proposal:{ channel:'whatsapp', to:'Priya', text:'Hi Priya! Yes, a small birthday setup is lovely — balloons and a cake are welcome. Please avoid confetti near the pool. Shall I check dates for you?', ai:true } }),
        D('d4','revenue',2,'Weekday offer for 27–29 Oct','2 weekday nights unbooked, 6 days away. List price ₹80,000. An empty night earns nothing.','decision','','Offer 12% off these weekday nights to past guests and on Instagram stories: "Midweek escape at RYST 109A — 27–29 Oct, private pool villa, 12% off. Reply STAY to book."',70400,'calendar.html'),
        D('d5','guest',2,'Reply to Sample Reviewer\'s 5★ Google review','"Beautiful villa, the pool and the beach were perfect for our family."','google','Sample Reviewer','Thank you so much! We\'re delighted you enjoyed the pool and the beach with your family. We\'d love to host you again. 🌊',0,'login.html'),
        D('d6','reservations',2,'Follow up Sample Guest L — Sat 14 Nov → Mon 16 Nov','Quote DEMO/QT/108 sent 3 days ago, ₹72,000, not paid. The dates are still open.','whatsapp','Sample Guest L','Hi Sample, just checking in on your stay at RYST 109A for 14–16 Nov. The dates are still open (₹72,000 for 6). Reply BOOK and I\'ll send the link to confirm with an advance.',72000,'stay.html')
      ];
      var done = [
        Object.assign(D('r1','operations',2,'Daily rounds not done yet','It\'s past 10:00 and today\'s daily rounds haven\'t been started.','telegram','Caretaker','🔁 Good morning! Please do today\'s daily rounds — pool chlorine and level, garden, water tank, power backup, gates.',0,'checklist.html'), { status:'agree', decidedAt: now - 3*3600e3 }),
        Object.assign(D('r2','creators',2,'@sample.creator: offer a discounted stay','12k followers · wants free, open to a discount · 2 sample reels','whatsapp','@sample.creator','Hi! We\'d love to host you. We can offer 30% off the villa tariff for a reel and stories, and your own follower code.',0,'creators.html'), { status:'edit', better:'Hi! We\'d love to host you on a weekday. 40% off the tariff for a reel + 3 stories, and your own 10% follower code.', decidedAt: now - 26*3600e3 })
      ];
      var headOf = function(x){ return x.agent === 'reservations' ? 'crm' : x.agent === 'guest' ? (/review/i.test(x.title) ? 'social' : 'crm') : x.agent === 'revenue' ? (/weekend|still open/i.test(x.title) ? 'social' : 'cfo') : x.agent === 'accounts' ? 'cfo' : x.agent === 'creators' ? 'social' : 'coo'; };
      drafts.concat(done).forEach(function(x){ x.head = headOf(x); });
      var H = [['crm','Tara','Customer Relationship Manager','💬',['reservations','guest'],'Every guest conversation, from first enquiry to the review request — so no one waits and no booking slips.'],
        ['social','Isha','Social Media Manager','📣',['creators','revenue','guest'],'Your public face: Instagram pushes for open weekends, creator collaborations and replies to Google reviews.'],
        ['cfo','Kabir','Chief Financial Officer','💰',['accounts','revenue'],'Money in and out: balances, collections, expenses, offers and pricing, and the month-end numbers.'],
        ['coo','Selvam','Villa Operations Manager','🧹',['operations'],'The villa itself: ready for every arrival, repairs moving, stock in, daily rounds done.']];
      var heads = H.map(function(h){ var mine = drafts.filter(function(x){ return x.head === h[0]; }); var fl = {}; h[4].forEach(function(id){ fl[id] = mine.filter(function(x){ return x.agent === id; }).length + ({ reservations:3, operations:2, accounts:1 }[id] && h[0] !== 'social' ? ({ reservations:3, operations:2, accounts:1 }[id]) : 0); });
        return { id:h[0], name:h[1], title:h[2], emoji:h[3], team:h[4], does:h[5], stats:{ pending: mine.length + (h[0] === 'crm' ? 3 : h[0] === 'coo' ? 2 : 1), urgent: mine.filter(function(x){ return x.priority === 1; }).length, value: mine.reduce(function(a, x){ return a + (x.value || 0); }, 0), reviewed: 18, accuracy: { crm:0.82, social:0.67, cfo:0.9, coo:0.96 }[h[0]], flows: fl } }; });
      var brief = { at: now, pending: 13, urgent: 3, value: 244123, headline: '13 things waiting, 3 urgent · ₹2,44,123 at stake.',
        heads: heads.map(function(h){ var mine = drafts.filter(function(x){ return x.head === h.id; }).sort(function(a, b){ return a.priority - b.priority; }); return { id:h.id, pending:h.stats.pending, urgent:h.stats.urgent, value:h.stats.value, top: mine.slice(0, 3).map(function(x){ return { id:x.id, title:x.title, priority:x.priority, value:x.value }; }) }; }) };
      // command-centre fields (same shape as the server's agentOps): real-looking states, a sample event log
      drafts.concat(done).forEach(function(x, i){ x.hash = 'demo' + i; x.delivery = x.proposal.channel === 'telegram' ? 'Telegram + app notification to the caretaker' : ''; x.approvalCurrent = x.status === 'agree' || x.status === 'edit'; });
      var status = agents.map(function(a){ var mine = drafts.filter(function(x){ return x.agent === a.id; }).sort(function(p, q){ return p.priority - q.priority; });
        return { id:a.id, state: a.mode === 'paused' ? 'paused' : mine.length ? 'awaiting' : 'idle', current: mine[0] ? { id:mine[0].id, title:mine[0].title, at:mine[0].at, priority:mine[0].priority } : null, pending: mine.length, lastActivity: now - 12*60e3, runningSince:0, phase:'' }; });
      var seq = 0, E = function(min, ev){ return Object.assign({ seq: ++seq, at: now - min*60e3 }, ev); };
      var evx = function(x){ return { agent:x.agent, head:x.head, draftId:x.id, title:x.title }; };
      var events = [
        E(26*60, Object.assign({ type:'verdict.edited', source:'owner', by:'reviewer@example.com' }, evx(done[1]))),
        E(5*60, { type:'mode.changed', source:'owner', agent:'creators', mode:'paused', by:'reviewer@example.com', title:'Set to paused' }),
        E(3*60, Object.assign({ type:'verdict.approved', source:'owner', by:'reviewer@example.com' }, evx(done[0]))),
        E(3*60 - 1, Object.assign({ type:'action.blocked', source:'owner', reason:'shadow', by:'reviewer@example.com' }, evx(done[0]), { title:'Shadow mode: not sent — ' + done[0].title }))
      ].concat(drafts.map(function(x){ return E(12, Object.assign({ type:'draft.created', source:'agent', kind:'', priority:x.priority, channel:x.proposal.channel }, evx(x))); }))
       .concat([E(12, { type:'run.finished', source:'system', title:'6 agents ran: 6 new drafts, 1 cleared', made:6, cleared:1, agents:A.map(function(a){ return a[0]; }) })]);
      var kpis = { activeAgents:5, totalAgents:6, running:0, awaiting:drafts.length, failed:0, completedToday:1, sentToday:0 };
      return { ok:true, status:status, kpis:kpis, mode:'shadow', health:{ key:'ok', text:'Agents ran on schedule' }, running:null, serverTime:now, seq:seq, events:events.slice().reverse(),
        agents:agents, drafts:drafts.concat(done), readyAt:{ reviews:20, rate:0.9 }, heads:heads, chief:{ id:'chief', name:'Aadhya', title:'Chief of Staff', emoji:'🗂️' }, brief:brief, briefOff:false,
        log:[{ at: now - 12*60e3, agent:'operations', made:1, resolved:1 }, { at: now - 12*60e3, agent:'reservations', made:1, resolved:0 }, { at: now - 5*3600e3, agent:'creators', mode:'paused', by:'owner@example.com' }],
        totals:{ today: 13, pending: 13, urgent: 3, valuePending: 244123, reviewed: 72, accuracy: 0.83, minutesSaved: 361, resolvedByTeam: 12 },
        ai:{ configured:true, model:'claude-opus-5-5', cap:300, calls:41, inTok:38000, outTok:2900, errors:0 }, lastRun: now - 12*60e3,
        trend: [[4,1,1,0],[5,0,1,1],[3,2,0,0],[6,1,0,1],[4,1,2,0],[2,0,0,0],[5,2,1,1],[6,1,1,0],[4,0,0,1],[7,1,0,0],[5,2,1,1],[6,1,0,0],[3,1,1,2],[1,0,0,12]].map(function(v, i){ return { day: iso(i - 13), agree:v[0], edit:v[1], reject:v[2], open:v[3] }; }) };
    })(),
    '/collabs': { ok:true, requests:[
      { id:'crdemo1', at:now-2*3600e3, status:'new', name:'Sample Creator A', instagram:'sample.creator.a', followers:48200, phone:'+919000000101', email:'creator.a@example.com', city:'Chennai', niche:'Travel', checkin:iso(9), checkout:iso(10), guests:4, deliverables:['reel','stories'], links:['https://www.instagram.com/stay.ryst'], message:'A slow weekday by the sea with friends: one reel and a set of stories.', expectation:'complimentary', openToDiscount:true, datesFree:true },
      { id:'crdemo2', at:now-3*864e5, status:'approved', name:'Sample Creator B', instagram:'sample.creator.b', followers:126000, phone:'+919000000102', city:'Bengaluru', niche:'Family', checkin:iso(16), checkout:iso(18), guests:6, deliverables:['reel','post'], links:[], offer:'complimentary', offerPercent:100, codePercent:10, code:'SAMPLECREA10', terms:'1 reel + 3 stories within 2 weeks', expectation:'discount', openToDiscount:true, datesFree:true, codeStats:{ bookings:2, revenue:84000 } },
      { id:'crdemo3', at:now-30*864e5, status:'done', name:'Sample Creator C', instagram:'sample.creator.c', followers:9100, phone:'+919000000103', niche:'Food', checkin:iso(-20), checkout:iso(-19), guests:2, deliverables:['reel'], links:[], offer:'discount', offerPercent:50, codePercent:0, contentLinks:['https://www.instagram.com/stay.ryst'], datesFree:false }
    ] }
  };
  // weekly / monthly upkeep in the demo: one item due, the rest scheduled
  (function(){ var c = FIX['/checklist']; if (!c) return; var t = new Date(), d = function(n){ var x = new Date(t); x.setDate(x.getDate() + n); return x.toISOString().slice(0, 10); };
    c.templates.upkeep = ['Generator test-run 10–15 min under load — weekly', 'AC filters cleaned — monthly', 'Pest control done — monthly', 'Fire extinguisher pressure gauge checked — monthly', 'Lift serviced and logged (AMC) — monthly', 'Sintex water tanks (roof, next to the AC units) — backwash and clean — every 3 months'];
    c.upkeepDue = c.templates.upkeep.map(function(text, i){ return { text: text, every: [7, 30, 30, 30, 30, 90][i], last: i ? d(-9 - i) : d(-8), next: i ? d(21 - i) : d(-1), due: !i }; });
  })();
  var MSG = 'Demo mode — sample data only, changes are not saved. Sign in with your staff account to make changes.';
  function reply(status, body){ return Promise.resolve(new Response(JSON.stringify(body), { status:status, headers:{ 'Content-Type':'application/json' } })); }
  var realFetch = window.fetch.bind(window);
  window.fetch = function(input, init){
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (url.indexOf(PROXY) !== 0) return realFetch(input, init);
    var path = url.slice(PROXY.length).split('?')[0];
    var method = ((init && init.method) || (input && input.method) || 'GET').toUpperCase();
    if (method === 'GET' && path === '/agents/events') return reply(200, { seq: FIX['/agents'].seq, events: [], gap: false, running: null, serverTime: Date.now() });
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
