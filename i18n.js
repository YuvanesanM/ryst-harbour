// Tamil for the caretaker's screens (home, checklists, issues, petty cash,
// inventory). Pages are written in English; when the language is Tamil this
// swaps every piece of on-screen text it knows — including text a page adds
// later (lists, toasts, pop-ups) — and leaves anything it doesn't know, such
// as guest names and amounts, exactly as it is. Values the pages save are
// never touched: only visible text, placeholders and tooltips change.
//
// Language: localStorage.ryst_lang ('ta' | 'en'). Everyone starts in
// English — staff, caretakers and guests alike; Tamil only once someone picks
// it with the switch (remembered on that device). Any element with
// data-lang-toggle becomes the switch; data-no-i18n keeps an element as written.
(function(){
  var store = {};
  try { store.lang = localStorage.getItem('ryst_lang'); } catch (e) {}
  // <script src="/i18n.js" data-audience="guest"> — a guest page keeps its
  // own fonts (phones already carry a Tamil fallback font).
  var guest = !!(document.currentScript && document.currentScript.getAttribute('data-audience') === 'guest');
  var lang = store.lang === 'ta' ? 'ta' : 'en';
  window.RYST_LANG = lang;
  window.rystSetLang = function(l){ try { localStorage.setItem('ryst_lang', l); } catch (e) {} location.reload(); };

  function wireToggles(root){
    (root.querySelectorAll ? root.querySelectorAll('[data-lang-toggle]') : []).forEach(function(b){
      if (b._langWired) return; b._langWired = true;
      b.setAttribute('data-no-i18n', '');
      b.textContent = lang === 'ta' ? 'English' : 'தமிழ்';
      b.setAttribute('aria-label', lang === 'ta' ? 'Switch to English' : 'தமிழுக்கு மாற்று');
      b.addEventListener('click', function(){ window.rystSetLang(lang === 'ta' ? 'en' : 'ta'); });
    });
  }

  var TA = {
    // ── shared ──
    '⌂ Home': '⌂ முகப்பு', 'Home': 'முகப்பு', 'Caretaker': 'பராமரிப்பாளர்', 'Owner': 'உரிமையாளர்', 'Coordinator': 'ஒருங்கிணைப்பாளர்',
    'Retry': 'மீண்டும் முயற்சி', 'Cancel': 'ரத்து', 'Close': 'மூடு', 'Save': 'சேமி', 'Saving…': 'சேமிக்கிறது…', 'Saved ✓': 'சேமிக்கப்பட்டது ✓',
    'Edit': 'திருத்து', 'Delete': 'நீக்கு', 'Remove': 'அகற்று', 'Clear': 'அழி', 'Search': 'தேடு', 'All': 'அனைத்தும்', 'Status': 'நிலை',
    'Date': 'தேதி', 'Note': 'குறிப்பு', 'Amount': 'தொகை', 'Category': 'வகை', 'Month': 'மாதம்', 'Type': 'வகை', 'Start': 'தொடங்கு',
    'Starting…': 'தொடங்குகிறது…', 'OK': 'சரி', 'Low': 'குறைவு', 'Open': 'திறந்தவை', 'Continue': 'தொடர்', 'View': 'பார்', 'Sending…': 'அனுப்புகிறது…',
    'Still loading… the first open of the day can take up to a minute.': 'இன்னும் ஏற்றுகிறது… அன்றைய முதல் திறப்பில் ஒரு நிமிடம் வரை ஆகலாம்.',
    'Server timed out — please retry.': 'சர்வர் பதிலளிக்கவில்லை — மீண்டும் முயற்சிக்கவும்.',
    'Demo mode · sample data, changes are not saved': 'டெமோ பயன்முறை · மாதிரித் தரவு, மாற்றங்கள் சேமிக்கப்படாது',
    'Exit demo': 'டெமோவிலிருந்து வெளியேறு',
    'Demo mode — sample data only, changes are not saved. Sign in with your staff account to make changes.': 'டெமோ பயன்முறை — மாதிரித் தரவு மட்டும், மாற்றங்கள் சேமிக்கப்படாது. மாற்றம் செய்ய உங்கள் பணியாளர் கணக்கில் உள்நுழையவும்.',

    // ── home ──
    'Booking Calendar': 'முன்பதிவு நாட்காட்டி', 'Occupancy, revenue & upcoming stays': 'நிரம்பல், வருவாய் & வரவிருக்கும் தங்கல்கள்',
    'Stay Quote & Invoice': 'விலைப்புள்ளி & இன்வாய்ஸ்', 'Villa invoices & quotations': 'வில்லா இன்வாய்ஸ்கள் & விலைப்புள்ளிகள்',
    'Checklists': 'சரிபார்ப்புப் பட்டியல்கள்', 'Check-in, check-out & daily rounds': 'செக்-இன், செக்-அவுட் & தினசரிச் சுற்று',
    'Issues': 'பிரச்சனைகள்', 'Report a problem & track repairs': 'பிரச்சனையைத் தெரிவி & பழுது நிலையைப் பார்',
    'Guest Register': 'விருந்தினர் பதிவேடு', 'Upcoming stays, notes & payment status': 'வரவிருக்கும் தங்கல்கள், குறிப்புகள் & கட்டண நிலை',
    'Guest Feedback': 'விருந்தினர் கருத்து', 'Post-stay reviews & ratings': 'தங்கலுக்குப் பிந்தைய மதிப்புரைகள் & மதிப்பீடுகள்',
    'Restaurant billing, menu & inventory': 'உணவக பில், மெனு & இருப்பு',
    'Caretakers': 'பராமரிப்பாளர்கள்', 'Your team at the villa': 'வில்லாவில் உங்கள் குழு',
    // Owner dashboard
    'Add guest details': 'விருந்தினர் விவரங்களைச் சேர்', 'From calendar sync — add guest details': 'நாட்காட்டி ஒத்திசைவிலிருந்து — விருந்தினர் விவரங்களைச் சேர்க்கவும்',
    'Restaurant': 'உணவகம்', 'Finish setting up your villa': 'உங்கள் வில்லா அமைப்பை முடிக்கவும்', 'Add your address, WhatsApp number, rates and team': 'முகவரி, WhatsApp எண், கட்டணங்கள் மற்றும் குழுவைச் சேர்க்கவும்',
    'Revenue': 'வருவாய்', 'Occupancy': 'நிரம்பல்', "Today's arrivals": 'இன்றைய வருகைகள்', 'Today': 'இன்று',
    'All clear': 'எல்லாம் சரி', 'None urgent': 'அவசரம் எதுவும் இல்லை', 'None coming up': 'வரவிருப்பது எதுவும் இல்லை',
    'Attention required': 'கவனிக்க வேண்டியவை', 'Upcoming stays': 'வரவிருக்கும் தங்கல்கள்', 'All bookings': 'அனைத்து முன்பதிவுகள்',
    'Dates': 'தேதிகள்', 'Channel': 'வழி', 'Payment': 'கட்டணம்', 'Direct': 'நேரடி', 'Paid': 'செலுத்தப்பட்டது', 'Unpaid': 'செலுத்தவில்லை', 'incl. food': 'உணவு உட்பட', 'Stay': 'தங்கல்', 'food': 'உணவு',
    'Collect': 'வசூலி', 'Checklist ✓': 'சரிபார்ப்பு ✓', 'Checking in': 'செக்-இன்', 'Checking out': 'செக்-அவுட்',
    'No check-ins or check-outs today.': 'இன்று செக்-இன் அல்லது செக்-அவுட் இல்லை.', 'Next arrival': 'அடுத்த வருகை',
    'Nothing booked after today yet.': 'இன்றைக்குப் பிறகு இன்னும் முன்பதிவு இல்லை.', 'Blocked today': 'இன்று மூடப்பட்டுள்ளது',
    'In house': 'தங்கியிருப்பவர்', 'leaves': 'புறப்படுவது', 'until': 'வரை', 'From calendar sync': 'நாட்காட்டி ஒத்திசைவிலிருந்து',
    'New booking': 'புதிய முன்பதிவு', 'New quote': 'புதிய விலைப்புள்ளி', 'Record payment': 'கட்டணத்தைப் பதிவு செய்',
    'Open a booking to add the payment received': 'பெற்ற கட்டணத்தைச் சேர்க்க ஒரு முன்பதிவைத் திறக்கவும்',
    'Daily rounds not done yet': 'தினசரிச் சுற்று இன்னும் செய்யவில்லை', 'Daily rounds in progress': 'தினசரிச் சுற்று நடந்துகொண்டிருக்கிறது',
    'Notifications': 'அறிவிப்புகள்', 'Your account': 'உங்கள் கணக்கு', 'Key numbers': 'முக்கிய எண்கள்', 'Quick navigation': 'விரைவு வழிசெலுத்தல்',
    'Petty Cash': 'சில்லறைச் செலவு', 'Caretaker expenses & reimbursements': 'பராமரிப்பாளர் செலவுகள் & திருப்பிச் செலுத்துதல்',
    'Inventory & Restock': 'இருப்பு & மறு நிரப்பல்', 'Consumables & shopping list': 'பயன்பாட்டுப் பொருட்கள் & வாங்க வேண்டிய பட்டியல்',
    'Profit & Loss': 'லாபம் & நஷ்டம்', 'Revenue vs. petty-cash spend': 'வருவாய் vs சில்லறைச் செலவு',
    'Settings': 'அமைப்புகள்', 'Business, tariffs, invoices, team & more': 'வணிகம், கட்டணங்கள், இன்வாய்ஸ்கள், குழு & மேலும்',
    '⎋ Log out': '⎋ வெளியேறு', '📲 Install RYST Harbour app': '📲 RYST Harbour செயலியை நிறுவு',

    // ── checklists ──
    'Villa Checklists': 'வில்லா சரிபார்ப்புப் பட்டியல்கள்', '· Walkthroughs & daily rounds': '· சுற்றுப் பார்வை & தினசரிச் சுற்று',
    '＋ Start checklist': '＋ சரிபார்ப்பைத் தொடங்கு', 'Start checklist': 'சரிபார்ப்பைத் தொடங்கு', '✎ Edit checklists': '✎ பட்டியல்களைத் திருத்து',
    '🛠 Issues': '🛠 பிரச்சனைகள்', 'Due today': 'இன்று செய்ய வேண்டியவை', 'check-ins, check-outs & rounds': 'செக்-இன், செக்-அவுட் & சுற்று',
    'In progress': 'நடந்துகொண்டிருக்கிறது', 'unfinished runs': 'முடிக்கப்படாதவை', 'Completed': 'முடிந்தது', 'this month': 'இந்த மாதம்',
    'All types': 'அனைத்து வகைகளும்', 'Check-in': 'செக்-இன்', 'Check-out': 'செக்-அவுட்', 'Daily': 'தினசரி', 'Daily rounds': 'தினசரிச் சுற்று',
    'All statuses': 'அனைத்து நிலைகளும்',
    'No checklists match — try clearing filters, or start one above.': 'பொருந்தும் பட்டியல் இல்லை — வடிகட்டிகளை அழிக்கவும் அல்லது மேலே புதியதைத் தொடங்கவும்.',
    'Booking no. (optional)': 'முன்பதிவு எண் (விருப்பம்)', 'Guest name': 'விருந்தினர் பெயர்', 'Checklist': 'சரிபார்ப்புப் பட்டியல்',
    'Overall note': 'பொதுக் குறிப்பு', 'Save & continue later': 'சேமித்து பிறகு தொடர்', 'Mark complete': 'முடிந்ததாகக் குறி',
    'Loading checklists…': 'பட்டியல்கள் ஏற்றப்படுகின்றன…', 'Guest name or booking no…': 'விருந்தினர் பெயர் அல்லது முன்பதிவு எண்…',
    'Anything else worth recording…': 'பதிவு செய்ய வேண்டிய வேறு ஏதேனும்…', 'e.g. Priya Sharma': 'எ.கா. பிரியா',
    '📝 Add note': '📝 குறிப்பு சேர்', '📝 Edit note': '📝 குறிப்பைத் திருத்து', '📷 Add photo': '📷 புகைப்படம் சேர்', '📷 Change photo': '📷 புகைப்படத்தை மாற்று',
    'Remove photo': 'புகைப்படத்தை அகற்று', 'Note…': 'குறிப்பு…', 'Unsaved changes…': 'சேமிக்கப்படாத மாற்றங்கள்…',
    'Checklist marked complete': 'பட்டியல் முடிந்ததாகக் குறிக்கப்பட்டது', 'Progress saved': 'முன்னேற்றம் சேமிக்கப்பட்டது', 'Checklist deleted': 'பட்டியல் நீக்கப்பட்டது',
    'Delete this checklist run? This cannot be undone.': 'இந்தச் சரிபார்ப்பை நீக்கவா? இதைத் திரும்பப் பெற முடியாது.',
    'No booking reference': 'முன்பதிவு எண் இல்லை', 'Common Areas & Facilities': 'பொது இடங்கள் & வசதிகள்',
    'Not done yet today': 'இன்று இன்னும் செய்யவில்லை',

    // default checklist items
    'Living room set, tissues stocked': 'வரவேற்பறை சீரமைக்கப்பட்டது, டிஷ்யூ வைக்கப்பட்டது',
    'Dining table set, cutlery & tissues laid, water stocked': 'உணவு மேசை தயார், கரண்டிகள் & டிஷ்யூ வைக்கப்பட்டன, தண்ணீர் வைக்கப்பட்டது',
    'Fridge stocked with ice cubes & water': 'ஃப்ரிட்ஜில் ஐஸ் கட்டிகள் & தண்ணீர் வைக்கப்பட்டன',
    'Kitchen clean, appliances working': 'சமையலறை சுத்தம், சாதனங்கள் இயங்குகின்றன',
    'AC / fans working in all rooms': 'அனைத்து அறைகளிலும் AC / மின்விசிறிகள் இயங்குகின்றன',
    'Pool & jacuzzi clean and safe': 'நீச்சல் குளம் & ஜக்குஸி சுத்தமாகவும் பாதுகாப்பாகவும் உள்ளன',
    'Wi-Fi working': 'Wi-Fi இயங்குகிறது',
    'Recreation hall — all equipment arranged in place': 'பொழுதுபோக்கு அறை — அனைத்து உபகரணங்களும் இடத்தில் அடுக்கப்பட்டன',
    'Pool deck — pool towels, ashtray cleaned, seating arranged': 'குளக்கரை — குளத் துண்டுகள், சாம்பல் தட்டு சுத்தம், இருக்கைகள் சீரமைப்பு',
    'Chess Balcony — cleaned and arranged': 'செஸ் பால்கனி — சுத்தம் செய்து சீரமைக்கப்பட்டது',
    'Lift working': 'லிஃப்ட் இயங்குகிறது',
    'Powder room — liquid soap & diffuser stocked': 'பவுடர் அறை — திரவ சோப் & டிஃப்யூசர் வைக்கப்பட்டன',
    'beds made, pillows arranged, fresh linens': 'படுக்கைகள் சீரமைப்பு, தலையணைகள் அடுக்கப்பட்டன, புதிய விரிப்புகள்',
    'washed cups, kettle tray filled, towels folded, water bottles stocked': 'கோப்பைகள் கழுவப்பட்டன, கெட்டில் தட்டு நிரப்பப்பட்டது, துண்டுகள் மடிக்கப்பட்டன, தண்ணீர் பாட்டில்கள் வைக்கப்பட்டன',
    'bathroom clean, toiletries & tissue stocked': 'குளியலறை சுத்தம், கழிப்பறைப் பொருட்கள் & டிஷ்யூ வைக்கப்பட்டன',
    'Checked for damage to furniture, walls or fixtures': 'மரச்சாமான்கள், சுவர்கள், பொருத்துதல்களில் சேதம் உள்ளதா எனப் பார்க்கப்பட்டது',
    'Checked for missing items (towels, remotes, etc.)': 'காணாமல் போன பொருட்கள் (துண்டுகள், ரிமோட்டுகள் போன்றவை) சரிபார்க்கப்பட்டன',
    'Linens & towels collected for laundry': 'சலவைக்கு விரிப்புகள் & துண்டுகள் சேகரிக்கப்பட்டன',
    'Kitchen cleaned, appliances switched off': 'சமையலறை சுத்தம், சாதனங்கள் அணைக்கப்பட்டன',
    'Trash removed': 'குப்பை அகற்றப்பட்டது',
    'AC / lights / fans switched off': 'AC / விளக்குகள் / மின்விசிறிகள் அணைக்கப்பட்டன',
    'Doors & windows locked': 'கதவுகள் & ஜன்னல்கள் பூட்டப்பட்டன',
    'Pool cleaned if used': 'பயன்படுத்தியிருந்தால் நீச்சல் குளம் சுத்தம் செய்யப்பட்டது',
    'Lost & found items collected': 'விட்டுச் சென்ற பொருட்கள் சேகரிக்கப்பட்டன',
    'Pool — skimmed, chlorine and water level checked': 'நீச்சல் குளம் — மேற்பரப்பு சுத்தம், குளோரின் & நீர் மட்டம் சரிபார்ப்பு',
    'Jacuzzi — clean, water checked': 'ஜக்குஸி — சுத்தம், நீர் சரிபார்ப்பு',
    'Garden watered, leaves swept': 'தோட்டத்திற்கு நீர் பாய்ச்சப்பட்டது, இலைகள் பெருக்கப்பட்டன',
    'Common areas swept and mopped': 'பொது இடங்கள் பெருக்கித் துடைக்கப்பட்டன',
    'Trash taken out': 'குப்பை வெளியே கொண்டு செல்லப்பட்டது',
    'Water tank and motor checked': 'தண்ணீர்த் தொட்டி & மோட்டார் சரிபார்க்கப்பட்டன',
    'Power backup (inverter / generator) checked': 'மின் காப்பு (இன்வெர்ட்டர் / ஜெனரேட்டர்) சரிபார்க்கப்பட்டது',
    'Gates and doors locked at night': 'இரவில் கேட் & கதவுகள் பூட்டப்பட்டன',
    'Bedrooms — beds made, fresh linens, pillows arranged': 'படுக்கையறைகள் — படுக்கைகள் சீரமைப்பு, புதிய விரிப்புகள், தலையணைகள் அடுக்கப்பட்டன',
    'Bathrooms — clean, towels, toiletries & tissue stocked': 'குளியலறைகள் — சுத்தம், துண்டுகள், கழிப்பறைப் பொருட்கள் & டிஷ்யூ வைக்கப்பட்டன',
    'Living and dining areas clean and arranged': 'வரவேற்பறை & உணவருந்தும் இடம் சுத்தமாகவும் சீராகவும் உள்ளன',
    'Kitchen clean, appliances working, drinking water stocked': 'சமையலறை சுத்தம், சாதனங்கள் இயங்குகின்றன, குடிநீர் வைக்கப்பட்டது',
    'Fridge clean, ice & water stocked': 'ஃப்ரிட்ஜ் சுத்தம், ஐஸ் & தண்ணீர் வைக்கப்பட்டன',
    'AC / fans / lights working in all rooms': 'அனைத்து அறைகளிலும் AC / மின்விசிறிகள் / விளக்குகள் இயங்குகின்றன',
    'Pool clean and safe': 'நீச்சல் குளம் சுத்தமாகவும் பாதுகாப்பாகவும் உள்ளது',
    'Garden and outdoor seating clean': 'தோட்டம் & வெளிப்புற இருக்கைகள் சுத்தம்',
    'Welcome kit ready — keys, house rules, Wi-Fi card': 'வரவேற்புப் பொருட்கள் தயார் — சாவிகள், வீட்டு விதிகள், Wi-Fi அட்டை',

    // ── issues ──
    '· Problems & repairs': '· பிரச்சனைகள் & பழுதுகள்', '＋ Report a problem': '＋ பிரச்சனையைத் தெரிவி', 'Report a problem': 'பிரச்சனையைத் தெரிவி',
    'waiting to be fixed': 'சரிசெய்யக் காத்திருக்கிறது', 'Urgent': 'அவசரம்', 'need attention now': 'உடனே கவனிக்க வேண்டும்',
    'Fixed': 'சரிசெய்யப்பட்டது', 'fixed this month': 'இந்த மாதம் சரிசெய்யப்பட்டவை',
    'What is the problem?': 'என்ன பிரச்சனை?', 'e.g. Bathroom tap leaking': 'எ.கா. குளியலறைக் குழாய் ஒழுகுகிறது',
    'Where?': 'எங்கே?', 'e.g. Bedroom 2': 'எ.கா. படுக்கையறை 2', 'How urgent?': 'எவ்வளவு அவசரம்?',
    'Can wait': 'காத்திருக்கலாம்', 'Soon': 'விரைவில்', 'More details (optional)': 'கூடுதல் விவரம் (விருப்பம்)',
    '📷 Add a photo': '📷 புகைப்படம் சேர்', '📷 Change the photo': '📷 புகைப்படத்தை மாற்று', 'Send report': 'அனுப்பு',
    'Report sent — the owner has been told': 'அனுப்பப்பட்டது — உரிமையாளருக்குத் தெரிவிக்கப்பட்டது',
    'Mark fixed': 'சரிசெய்யப்பட்டதாகக் குறி', 'Reopen': 'மீண்டும் திற', 'What was done? (optional)': 'என்ன செய்யப்பட்டது? (விருப்பம்)',
    'e.g. Replaced the washer': 'எ.கா. வாஷர் மாற்றப்பட்டது',
    'No open problems. 👍': 'திறந்த பிரச்சனைகள் இல்லை. 👍', 'No fixed problems yet.': 'இதுவரை சரிசெய்யப்பட்டவை இல்லை.',
    'Please say what the problem is.': 'பிரச்சனை என்ன என்று எழுதவும்.', 'Loading issues…': 'பிரச்சனைகள் ஏற்றப்படுகின்றன…',
    'Delete this issue? This cannot be undone.': 'இந்தப் பிரச்சனையை நீக்கவா? இதைத் திரும்பப் பெற முடியாது.',
    'Marked fixed': 'சரிசெய்யப்பட்டதாகக் குறிக்கப்பட்டது', 'Reopened': 'மீண்டும் திறக்கப்பட்டது', 'Issue deleted': 'பிரச்சனை நீக்கப்பட்டது',
    'Reported': 'தெரிவிக்கப்பட்டது', 'by': 'தெரிவித்தவர்', 'Fixed on': 'சரிசெய்த நாள்', 'Open issues': 'திறந்த பிரச்சனைகள்', 'Fixed issues': 'சரிசெய்யப்பட்டவை',
    'Photo of the fix (optional)': 'சரிசெய்ததன் புகைப்படம் (விருப்பம்)', 'Save as fixed': 'சரிசெய்யப்பட்டதாகச் சேமி',

    // ── petty cash ──
    '· Caretaker ledger': '· பராமரிப்பாளர் கணக்கேடு', 'Cash in hand': 'கையிருப்பு பணம்', 'Float target': 'முன்பண இலக்கு',
    'authorised advance': 'அனுமதிக்கப்பட்ட முன்பணம்', 'Pending reimbursement': 'திருப்பித் தர வேண்டியது', 'owed back to caretaker': 'பராமரிப்பாளருக்குத் திருப்பித் தர வேண்டியது',
    'Spent this month': 'இந்த மாதச் செலவு', '＋ Add expense': '＋ செலவைச் சேர்', '↺ Reimburse pending': '↺ நிலுவையைத் திருப்பித் தா',
    '＋ Add cash / top-up': '＋ பணம் சேர் / டாப்-அப்', '− Collect cash back': '− பணத்தைத் திரும்பப் பெறு', '⚑ Set float': '⚑ முன்பணம் அமை',
    '⤓ Export CSV': '⤓ CSV பதிவிறக்கு', '⎙ Print report': '⎙ அறிக்கையை அச்சிடு', 'All months': 'அனைத்து மாதங்களும்', 'All categories': 'அனைத்து வகைகளும்',
    'Groceries & Guest Supplies': 'மளிகை & விருந்தினர் பொருட்கள்', 'Housekeeping': 'வீட்டுப் பராமரிப்பு', 'Utilities': 'மின்சாரம், நீர் கட்டணங்கள்',
    'Repairs & Maintenance': 'பழுது & பராமரிப்பு', 'Transport': 'போக்குவரத்து', 'Miscellaneous': 'இதர செலவுகள்',
    'Pending': 'நிலுவை', 'pending': 'நிலுவை', 'Reimbursed': 'திருப்பித் தரப்பட்டது', 'reimbursed': 'திருப்பித் தரப்பட்டது',
    'No reimbursement': 'திருப்பித் தர தேவையில்லை', 'No reimbursement needed': 'திருப்பித் தர தேவையில்லை',
    'Reimburse selected': 'தேர்ந்தவற்றைத் திருப்பித் தா', 'Receipt': 'ரசீது', 'Cash top-up': 'பணம் டாப்-அப்', 'Opening float': 'தொடக்க முன்பணம்',
    'No entries for this filter.': 'இந்த வடிகட்டலுக்கு பதிவுகள் இல்லை.', 'Spend by category': 'வகை வாரியான செலவு', 'Period summary': 'காலச் சுருக்கம்',
    'Period': 'காலம்', 'Expenses': 'செலவுகள்', 'Total spent': 'மொத்தச் செலவு', 'Add expense': 'செலவைச் சேர்', 'Amount (₹)': 'தொகை (₹)',
    'Already paid directly — no reimbursement needed': 'நேரடியாகச் செலுத்தப்பட்டது — திருப்பித் தர தேவையில்லை',
    '📷 Tap to add a photo of the bill': '📷 பில்லின் புகைப்படம் சேர்க்கத் தட்டவும்', 'Save expense': 'செலவைச் சேமி', '⤓ Download': '⤓ பதிவிறக்கு',
    'Loading ledger…': 'கணக்கேடு ஏற்றப்படுகிறது…', 'note or category…': 'குறிப்பு அல்லது வகை…', 'What was this for?': 'இது எதற்காக?',
    'No pending expenses to reimburse': 'திருப்பித் தர நிலுவைச் செலவுகள் இல்லை', 'Amount must be greater than 0.': 'தொகை 0-ஐ விட அதிகமாக இருக்க வேண்டும்.',
    'Compressing…': 'சுருக்குகிறது…', 'Enter a valid amount.': 'சரியான தொகையை உள்ளிடவும்.', 'Please add a photo of the receipt.': 'ரசீதின் புகைப்படத்தைச் சேர்க்கவும்.',
    'Please choose a category.': 'ஒரு வகையைத் தேர்ந்தெடுக்கவும்.', 'Please pick a date.': 'ஒரு தேதியைத் தேர்ந்தெடுக்கவும்.', 'at / above float': 'முன்பண அளவில் / அதற்கு மேல்',
    'Expense saved': 'செலவு சேமிக்கப்பட்டது', 'Expense': 'செலவு',

    // ── inventory ──
    '· Consumables tracker': '· பயன்பாட்டுப் பொருட்கள் கண்காணிப்பு', '＋ Add item': '＋ பொருளைச் சேர்', 'Total items': 'மொத்தப் பொருட்கள்', 'tracked': 'கண்காணிக்கப்படுகின்றன',
    'Low stock': 'குறைந்த இருப்பு', 'at or below threshold': 'வரம்பு அளவில் அல்லது கீழே', 'Out of stock': 'இருப்பு இல்லை', 'zero on hand': 'கையில் இல்லை',
    'Shopping list': 'வாங்க வேண்டிய பட்டியல்', 'Copy list': 'பட்டியலை நகலெடு', 'Linen & Bedding': 'படுக்கை விரிப்புகள் & துணிகள்',
    'Toiletries & Guest Supplies': 'கழிப்பறைப் பொருட்கள் & விருந்தினர் பொருட்கள்', 'Kitchen & Pantry': 'சமையலறை & சரக்கறை', 'Cleaning Supplies': 'சுத்தம் செய்யும் பொருட்கள்',
    'Gas & Fuel': 'எரிவாயு & எரிபொருள்', 'Pool & Maintenance': 'நீச்சல் குளம் & பராமரிப்பு', 'Low stock only': 'குறைந்த இருப்பு மட்டும்',
    'Add item': 'பொருளைச் சேர்', 'Edit item': 'பொருளைத் திருத்து', 'Item name': 'பொருளின் பெயர்', 'Unit': 'அலகு', 'Quantity on hand': 'கையிருப்பு அளவு',
    'Low-stock threshold': 'குறைந்த இருப்பு வரம்பு', 'Loading inventory…': 'இருப்பு ஏற்றப்படுகிறது…', 'Search items…': 'பொருட்களைத் தேடு…',
    'e.g. Bath towels': 'எ.கா. குளியல் துண்டுகள்', 'pcs, kg, bottles…': 'எண்ணிக்கை, கிலோ, பாட்டில்…',
    'Could not copy — select and copy manually': 'நகலெடுக்க முடியவில்லை — கைமுறையாகத் தேர்ந்து நகலெடுக்கவும்',
    'Delete this item from inventory? This cannot be undone.': 'இந்தப் பொருளை இருப்பிலிருந்து நீக்கவா? இதைத் திரும்பப் பெற முடியாது.',
    'Item deleted': 'பொருள் நீக்கப்பட்டது', 'Shopping list copied': 'பட்டியல் நகலெடுக்கப்பட்டது', 'Item name is required.': 'பொருளின் பெயர் தேவை.',
    'Quantity must be 0 or more.': 'அளவு 0 அல்லது அதற்கு மேல் இருக்க வேண்டும்.', 'Threshold must be 0 or more.': 'வரம்பு 0 அல்லது அதற்கு மேல் இருக்க வேண்டும்.',
    'Item saved': 'பொருள் சேமிக்கப்பட்டது',
    'Checklists saved': 'பட்டியல்கள் சேமிக்கப்பட்டன', 'Check-in and check-out each need at least one item.': 'செக்-இன், செக்-அவுட் ஒவ்வொன்றிலும் குறைந்தது ஒரு பொருள் தேவை.',
    'At most 60 items per checklist.': 'ஒரு பட்டியலில் அதிகபட்சம் 60 பொருட்கள்.', 'Daily rounds checklist': 'தினசரிச் சுற்றுப் பட்டியல்',

    // ── guest check-in (checkin.html) ──
    'Your stay begins here.': 'உங்கள் தங்குதல் இங்கே தொடங்குகிறது.',
    'Complete your secure check-in in under 2 minutes.': '2 நிமிடங்களுக்குள் பாதுகாப்பான செக்-இன் செய்யுங்கள்.',
    '🔒 Secure Check-in': '🔒 பாதுகாப்பான செக்-இன்', '⏱ Takes about 2 minutes': '⏱ சுமார் 2 நிமிடங்கள்',
    'Sign in with Google to find your booking and auto-fill your details.': 'உங்கள் முன்பதிவைக் கண்டறிந்து விவரங்களைத் தானாக நிரப்ப Google மூலம் உள்நுழையவும்.',
    'Personal Details': 'தனிப்பட்ட விவரங்கள்', 'Full Name': 'முழுப் பெயர்', 'As on your government ID': 'அரசு அடையாள அட்டையில் உள்ளபடி',
    'Verify Your Identity': 'உங்கள் அடையாளத்தைச் சரிபார்க்கவும்', 'Government ID Type': 'அரசு அடையாள அட்டை வகை',
    'Aadhaar Card': 'ஆதார் அட்டை', 'Passport': 'பாஸ்போர்ட்', 'Driving Licence': 'ஓட்டுநர் உரிமம்', 'Voter ID': 'வாக்காளர் அடையாள அட்டை',
    'ID Photo': 'அடையாள அட்டைப் புகைப்படம்',
    "🔒 Your information is encrypted and securely stored, and used only for verification during your stay — it's never shared with third parties.": '🔒 உங்கள் தகவல்கள் மறையாக்கம் செய்யப்பட்டுப் பாதுகாப்பாகச் சேமிக்கப்படுகின்றன; தங்குதலின்போது சரிபார்ப்புக்கு மட்டுமே பயன்படுத்தப்படும் — மூன்றாம் தரப்பினருடன் ஒருபோதும் பகிரப்படாது.',
    'Travel Details': 'பயண விவரங்கள்', 'Vehicle Number': 'வாகன எண்', 'If driving': 'காரில் வந்தால்', 'Expected Arrival': 'எதிர்பார்க்கும் வருகை நேரம்',
    'Additional Information': 'கூடுதல் தகவல்', 'Notes (if any)': 'குறிப்புகள் (இருந்தால்)',
    "Anything you'd like us to know - special occasion, requests...": 'நாங்கள் தெரிந்துகொள்ள வேண்டியவை — சிறப்பு நிகழ்வு, கோரிக்கைகள்…',
    'Signature': 'கையொப்பம்', 'Sign using your finger or mouse': 'விரல் அல்லது மவுஸால் கையொப்பமிடுங்கள்',
    'Signature pad — sign using your finger or mouse': 'கையொப்பப் பலகை — விரல் அல்லது மவுஸால் கையொப்பமிடுங்கள்', 'Clear Signature': 'கையொப்பத்தை அழி',
    '✓ Government ID required': '✓ அரசு அடையாள அட்டை அவசியம்', '✓ No loud music after 10 PM': '✓ இரவு 10 மணிக்குப் பிறகு உரத்த இசை வேண்டாம்',
    '✓ Pool usage at your own risk': '✓ நீச்சல் குளத்தை உங்கள் சொந்தப் பொறுப்பில் பயன்படுத்தவும்', '✓ Read Full House Rules': '✓ முழு வீட்டு விதிகளைப் படிக்கவும்',
    'I confirm the details above are accurate and I have read and agree to the': 'மேலே உள்ள விவரங்கள் சரியானவை என உறுதிசெய்கிறேன்; பின்வருவனவற்றைப் படித்து ஏற்றுக்கொள்கிறேன்:',
    'House rules': 'வீட்டு விதிகள்', 'Cancellation policy': 'ரத்து செய்யும் கொள்கை', "This villa hasn't put its house rules online. Please follow the rules your host shares with you.": 'இந்த வில்லா தனது வீட்டு விதிகளை ஆன்லைனில் வெளியிடவில்லை. உங்கள் ஹோஸ்ட் பகிரும் விதிகளைப் பின்பற்றவும்.',
    'Privacy & terms': 'தனியுரிமை & நிபந்தனைகள்', '🔒 Privacy & terms': '🔒 தனியுரிமை & நிபந்தனைகள்', 'Delete account': 'கணக்கை நீக்கு', '🗑 Delete account': '🗑 கணக்கை நீக்கு', 'Request deletion': 'நீக்கக் கோருங்கள்', 'We complete it within 30 days.': '30 நாட்களுக்குள் முடித்துவிடுவோம்.', 'How account deletion works': 'கணக்கு நீக்கம் எப்படி நடக்கிறது', 'Anything you’d like us to know? (optional)': 'நாங்கள் தெரிந்துகொள்ள வேண்டியது ஏதேனும்? (விருப்பம்)', 'Your access to this villa is removed, along with your profile, notification settings and widgets. Records you made for the villa, such as checklists or expenses, stay with the villa.': 'இந்த வில்லாவில் உங்கள் அணுகல், சுயவிவரம், அறிவிப்பு அமைப்புகள் மற்றும் விட்ஜெட்டுகள் நீக்கப்படும். நீங்கள் வில்லாவுக்காகப் பதிவு செய்தவை (சரிபார்ப்புப் பட்டியல்கள், செலவுகள் போன்றவை) வில்லாவிடமே இருக்கும்.', 'Requested. We’ll complete it by': 'கோரிக்கை பெறப்பட்டது. இந்தத் தேதிக்குள் முடிப்போம்:', 'To cancel the request, email info@dreamour.in.': 'கோரிக்கையை ரத்து செய்ய info@dreamour.in க்கு மின்னஞ்சல் அனுப்புங்கள்.', 'Delete your RYST Harbour account for this villa?': 'இந்த வில்லாவுக்கான உங்கள் RYST Harbour கணக்கை நீக்கவா?', 
    'Appearance': 'தோற்றம்', 'Light': 'வெளிச்சம்', 'Auto': 'தானியங்கி', 'Dark': 'இருள்', 'Edit profile': 'சுயவிவரத்தைத் திருத்து', 'Language': 'மொழி', 'Change photo': 'புகைப்படத்தை மாற்று', 'Name': 'பெயர்', 'Phone': 'தொலைபேசி', 'Your team sees your name and photo.': 'உங்கள் பெயரும் புகைப்படமும் உங்கள் குழுவுக்குத் தெரியும்.', 'Add your name': 'உங்கள் பெயரைச் சேர்க்கவும்', 'Log out': 'வெளியேறு', 'Install RYST Harbour app': 'RYST Harbour செயலியை நிறுவு', 
    'House Rules & Terms': 'வீட்டு விதிகள் & நிபந்தனைகள்', 'Submitting…': 'சமர்ப்பிக்கிறது…',
    "You're all checked in!": 'உங்கள் செக்-இன் முடிந்தது!',
    "We'll have everything ready for your stay. See you soon at": 'உங்கள் தங்குதலுக்கு எல்லாவற்றையும் தயார் செய்து வைப்போம். விரைவில் சந்திப்போம் —',
    '🗺️ Explore Nearby': '🗺️ அருகிலுள்ள இடங்கள்', '📍 Get Directions': '📍 வழிகாட்டுதல்', 'Follow': 'பின்தொடர்',
    'Guest': 'விருந்தினர்', 'Guests': 'விருந்தினர்கள்', 'Loading': 'ஏற்றுகிறது', 'Fetching your booking…': 'உங்கள் முன்பதிவைப் பெறுகிறது…',
    'Add to Google Wallet': 'Google Wallet-இல் சேர்', 'Balance due:': 'செலுத்த வேண்டிய மீதி:', 'Pay Balance Now': 'மீதியை இப்போது செலுத்துங்கள்',
    'Preparing payment…': 'கட்டணத்தைத் தயார் செய்கிறது…', 'No balance is currently due.': 'தற்போது செலுத்த வேண்டிய மீதி இல்லை.',
    'Could not start payment.': 'கட்டணத்தைத் தொடங்க முடியவில்லை.',
    'Could not start payment — please try again or WhatsApp us.': 'கட்டணத்தைத் தொடங்க முடியவில்லை — மீண்டும் முயற்சிக்கவும் அல்லது WhatsApp-இல் தொடர்புகொள்ளவும்.',
    'Add a photo of your ID': 'உங்கள் அடையாள அட்டையின் புகைப்படத்தைச் சேர்க்கவும்', '📷 Take Photo': '📷 புகைப்படம் எடு',
    '🖼 Choose from Gallery': '🖼 கேலரியிலிருந்து தேர்வுசெய்', 'Retake / re-upload': 'மீண்டும் எடு / பதிவேற்று',
    'Processing your photo…': 'புகைப்படத்தைச் செயலாக்குகிறது…', 'Please choose an image file': 'ஒரு படக் கோப்பைத் தேர்வுசெய்யவும்',
    'Could not read image': 'படத்தைப் படிக்க முடியவில்லை', 'Could not read file': 'கோப்பைப் படிக்க முடியவில்லை',
    'Please enter your name.': 'உங்கள் பெயரை உள்ளிடவும்.', 'Please select your ID type.': 'அடையாள அட்டை வகையைத் தேர்வுசெய்யவும்.',
    'Please add a photo of your ID.': 'அடையாள அட்டையின் புகைப்படத்தைச் சேர்க்கவும்.', 'Please sign above.': 'மேலே கையொப்பமிடவும்.',
    'Please agree to the House Rules & Terms.': 'வீட்டு விதிகள் & நிபந்தனைகளை ஏற்றுக்கொள்ளவும்.',
    'The server is taking a while to respond — please try again in a moment.': 'சர்வர் பதிலளிக்கத் தாமதமாகிறது — சிறிது நேரத்தில் மீண்டும் முயற்சிக்கவும்.',
    'Could not submit — please try again.': 'சமர்ப்பிக்க முடியவில்லை — மீண்டும் முயற்சிக்கவும்.', 'Something went wrong': 'ஏதோ தவறு நடந்தது',
    'This check-in link has expired or is invalid — please sign in with Google to find your booking.': 'இந்தச் செக்-இன் இணைப்பு காலாவதியானது அல்லது தவறானது — உங்கள் முன்பதிவைக் கண்டறிய Google மூலம் உள்நுழையவும்.',
    'Verifying…': 'சரிபார்க்கிறது…', 'Could not reach the server — check your connection.': 'சர்வரை அணுக முடியவில்லை — இணைய இணைப்பைச் சரிபார்க்கவும்.',
    "We couldn't match this Google account to an upcoming booking or staff account. If you have a check-in link from WhatsApp, please use that instead.": 'இந்த Google கணக்கை வரவிருக்கும் முன்பதிவுடன் பொருத்த முடியவில்லை. WhatsApp-இல் வந்த செக்-இன் இணைப்பு இருந்தால் அதைப் பயன்படுத்தவும்.',
    'Could not load Google Sign-In — check your connection or disable ad blockers.': 'Google உள்நுழைவை ஏற்ற முடியவில்லை — இணைப்பைச் சரிபார்க்கவும் அல்லது விளம்பரத் தடுப்பானை நிறுத்தவும்.',

    // ── Connect Telegram (home) ──
    '🔔 Get alerts on Telegram': '🔔 Telegram-இல் அறிவிப்புகளைப் பெறுங்கள்', '🔔 Reconnect Telegram': '🔔 Telegram-ஐ மீண்டும் இணைக்கவும்',
    'Open Telegram': 'Telegram-ஐத் திற',
    'Tap the button, then press Start in Telegram. Come back here when done.': 'பொத்தானைத் தட்டி, Telegram-இல் Start அழுத்தவும். முடிந்ததும் இங்கே திரும்பி வாருங்கள்.',
    'The link expired — tap the button again.': 'இணைப்பு காலாவதியானது — பொத்தானை மீண்டும் தட்டவும்.',
    'Telegram connected — your alerts will come there.': 'Telegram இணைக்கப்பட்டது — உங்கள் அறிவிப்புகள் அங்கே வரும்.',
    'Could not start —': 'தொடங்க முடியவில்லை —',

    // ── dashboard (home) ──
    'Good morning': 'காலை வணக்கம்', 'Good afternoon': 'மதிய வணக்கம்', 'Good evening': 'மாலை வணக்கம்',
    "Here's what's happening at": 'இன்று', 'today.': '-இல் நடப்பவை.',
    'Dashboard': 'டாஷ்போர்டு', 'Calendar': 'நாட்காட்டி', 'Bookings': 'முன்பதிவுகள்', 'Guests': 'விருந்தினர்கள்',
    'Operations': 'செயல்பாடுகள்', 'Finance': 'நிதி', 'Property': 'சொத்து', 'System': 'அமைப்பு',
    'Issues & Maintenance': 'பிரச்சனைகள் & பராமரிப்பு', 'Inventory': 'இருப்பு', 'Quotes & Invoices': 'விலைப்புள்ளிகள் & இன்வாய்ஸ்கள்',
    'Payments': 'கட்டணங்கள்', 'Tasks': 'பணிகள்', 'More': 'மேலும்', 'New': 'புதியது', 'Needs attention': 'கவனிக்க வேண்டியவை',
    "Today's check-in": 'இன்றைய செக்-இன்', "Today's check-out": 'இன்றைய செக்-அவுட்',
    'No check-in today': 'இன்று செக்-இன் இல்லை', 'No check-out today': 'இன்று செக்-அவுட் இல்லை',
    'Start check-in checklist': 'செக்-இன் சரிபார்ப்பைத் தொடங்கு', 'Start check-out checklist': 'செக்-அவுட் சரிபார்ப்பைத் தொடங்கு',
    'Done ✓': 'முடிந்தது ✓', 'Arriving': 'வருகை', 'Checked in online': 'ஆன்லைனில் செக்-இன் செய்தார்', 'Check-in form pending': 'செக்-இன் படிவம் நிலுவையில்',
    'guests': 'விருந்தினர்கள்', 'guest': 'விருந்தினர்', 'bedroom': 'படுக்கையறை', 'bedrooms': 'படுக்கையறைகள்', 'Done today': 'இன்று முடிந்தது', 'In progress': 'நடந்துகொண்டிருக்கிறது',
    'Nothing in progress': 'எதுவும் நடந்துகொண்டில்லை', 'No open issues': 'திறந்த பிரச்சனைகள் இல்லை', 'Everything is stocked': 'எல்லாம் இருப்பில் உள்ளது',
    'restock at': 'மறு நிரப்பல் அளவு', 'Report issue': 'பிரச்சனையைத் தெரிவி', 'Add expense': 'செலவைச் சேர்', 'Add inventory': 'இருப்பைச் சேர்',
    'Ask the owner for Guest Register access to see arrivals here.': 'வருகைகளை இங்கே பார்க்க, விருந்தினர் பதிவேடு அனுமதியை உரிமையாளரிடம் கேளுங்கள்.',
    'All clear — nothing needs you right now.': 'எல்லாம் சரி — இப்போது கவனிக்க வேண்டியது எதுவும் இல்லை.',
    // ── guest register ──
    'This month': 'இந்த மாதம்', 'Upcoming': 'வரவிருப்பவை', 'Fill rate': 'நிரம்பல் விகிதம்', 'In-house': 'தங்கியிருப்பவர்கள்',
    'Balance due': 'நிலுவை உள்ளவை', 'Food due': 'உணவு நிலுவை', 'Not checked in': 'செக்-இன் செய்யாதவர்', 'Not checked in yet': 'இன்னும் செக்-இன் செய்யவில்லை',
    'Invoice': 'விலைப்பட்டியல்', 'Quote': 'மதிப்பீடு', 'Arriving today': 'இன்று வருகை', 'Arrives tomorrow': 'நாளை வருகை',
    'Departs today': 'இன்று புறப்பாடு', 'Departs tomorrow': 'நாளை புறப்பாடு', 'Stay paid in full': 'தங்கல் கட்டணம் முழுமையாகச் செலுத்தப்பட்டது',
    'Unconfirmed quote': 'உறுதிசெய்யப்படாத மதிப்பீடு', 'No food orders': 'உணவு ஆர்டர் இல்லை', 'Loading guest register…': 'விருந்தினர் பதிவேடு ஏற்றப்படுகிறது…',
    'Bank transfer': 'வங்கிப் பரிமாற்றம்', 'Cash': 'ரொக்கம்', 'Website': 'இணையதளம்', 'WhatsApp / Phone': 'WhatsApp / தொலைபேசி',
    'Walk-in': 'நேரடி வருகை', 'Referral': 'பரிந்துரை', 'Other': 'மற்றவை', 'OTA payout': 'OTA செலுத்தல்',
    "· Who's coming, who's here": '· யார் வருகிறார்கள், யார் இங்கே',
    'Show unconfirmed quotes (drafts with no advance paid)': 'உறுதிசெய்யப்படாத மதிப்பீடுகளைக் காட்டு (முன்பணம் செலுத்தாத வரைவுகள்)',
    'Nothing matches — try a different search or filter.': 'எதுவும் பொருந்தவில்லை — வேறு தேடல் அல்லது வடிகட்டியை முயற்சிக்கவும்.',
    'Search name, phone or booking no…': 'பெயர், தொலைபேசி அல்லது முன்பதிவு எண்ணைத் தேடு…', 'Needs attention — Dashboard': 'கவனிக்க வேண்டியவை — முகப்பு', 'e.g. INV-2026/012': 'எ.கா. INV-2026/012',
    // ── notifications ──
    '🔔 Notifications': '🔔 அறிவிப்புகள்', 'Alerts on this phone or computer': 'இந்த போன் அல்லது கணினியில் எச்சரிக்கைகள்',
    'You get the same alerts as on Telegram — new bookings, payments, issues, check-ins and more. Each person chooses which in Settings → WhatsApp & Alerts.': 'Telegram-இல் வரும் அதே எச்சரிக்கைகள் — புதிய முன்பதிவுகள், கட்டணங்கள், பிரச்சனைகள், செக்-இன் மற்றும் பல. எவை வேண்டும் என்பதை Settings → WhatsApp & Alerts-இல் தேர்வு செய்யலாம்.',
    'Turn on notifications': 'அறிவிப்புகளை இயக்கு', 'Send a test notification': 'சோதனை அறிவிப்பை அனுப்பு', 'Turn off on this device': 'இந்த சாதனத்தில் நிறுத்து',
    'On for this device.': 'இந்த சாதனத்தில் இயக்கத்தில் உள்ளது.', 'Off for this device.': 'இந்த சாதனத்தில் நிறுத்தப்பட்டுள்ளது.',
    'Test sent — it should arrive in a few seconds.': 'சோதனை அனுப்பப்பட்டது — சில விநாடிகளில் வரும்.',
    'Notifications are blocked for RYST Harbour on this device. Allow them in the phone or browser settings, then try again.': 'இந்த சாதனத்தில் RYST Harbour அறிவிப்புகள் தடுக்கப்பட்டுள்ளன. போன் அல்லது உலாவி அமைப்புகளில் அனுமதித்து மீண்டும் முயற்சிக்கவும்.',
    'Notifications weren’t allowed. Allow them in the phone or browser settings, then try again.': 'அறிவிப்புகள் அனுமதிக்கப்படவில்லை. போன் அல்லது உலாவி அமைப்புகளில் அனுமதித்து மீண்டும் முயற்சிக்கவும்.',
    // ── phone widgets ──
    '▦ Phone widgets': '▦ போன் விட்ஜெட்கள்', 'Phone widgets': 'போன் விட்ஜெட்கள்', 'See today and this month on your home screen': 'இன்றையதும் இந்த மாதமும் உங்கள் முகப்புத் திரையில்',
    'Tap “Connect this phone” — the RYST Harbour app keeps the link.': '“இந்த போனை இணை” என்பதைத் தட்டவும் — RYST Harbour ஆப் இணைப்பை வைத்துக்கொள்ளும்.',
    'Long-press your home screen → Widgets → RYST Harbour, and drag “Today at the villa” or “This month” onto it.': 'முகப்புத் திரையை நீண்ட நேரம் அழுத்தவும் → Widgets → RYST Harbour, பிறகு “Today at the villa” அல்லது “This month”-ஐ இழுத்து வைக்கவும்.',
    'Needs the RYST Harbour app from the Play Store, version 1.3.3 or later. The widget can only read today\'s summary; disconnect any time.': 'Play Store-இல் உள்ள RYST Harbour ஆப் (பதிப்பு 1.3.3 அல்லது அதற்கு மேல்) தேவை. விட்ஜெட் இன்றைய சுருக்கத்தை மட்டுமே படிக்கும்; எப்போது வேண்டுமானாலும் துண்டிக்கலாம்.',
    'Connect this phone': 'இந்த போனை இணை', 'Disconnect widgets': 'விட்ஜெட்களைத் துண்டி', 'Opening the RYST Harbour app…': 'RYST Harbour ஆப் திறக்கிறது…',
    'Widgets disconnected on all your phones.': 'உங்கள் எல்லா போன்களிலும் விட்ஜெட்கள் துண்டிக்கப்பட்டன.',
    'Channels': 'சேனல்கள்', 'Check now': 'இப்போது சரிபார்', 'Checking…': 'சரிபார்க்கிறது…', 'Manage calendars': 'நாட்காட்டிகளை நிர்வகி',
    'Set up calendars': 'நாட்காட்டிகளை அமை', 'In sync': 'ஒத்திசைந்தது', 'Failing': 'தோல்வி', 'Can’t read': 'படிக்க முடியவில்லை',
    'Empty — rechecking': 'காலி — மீண்டும் சரிபார்க்கிறது', 'Waiting for first check': 'முதல் சரிபார்ப்புக்குக் காத்திருக்கிறது', 'Not checked': 'சரிபார்க்கப்படவில்லை',
    'Checked': 'சரிபார்த்தது', 'upcoming': 'வரவிருப்பவை', 'No upcoming bookings': 'வரவிருக்கும் முன்பதிவுகள் இல்லை', 'need guest details': 'விருந்தினர் விவரம் தேவை',
    'no longer on the OTA': 'இனி OTA-வில் இல்லை', 'Reads our calendar': 'நமது நாட்காட்டியைப் படித்தது', 'check the link in the OTA': 'OTA-வில் இணைப்பைச் சரிபார்க்கவும்',
    'Not yet read — paste our calendar link into the OTA': 'இன்னும் படிக்கவில்லை — நமது நாட்காட்டி இணைப்பை OTA-வில் ஒட்டவும்', 'Calendars are checked every 3 hours.': 'நாட்காட்டிகள் ஒவ்வொரு 3 மணி நேரத்துக்கும் சரிபார்க்கப்படும்.', 'Calendars are checked every 10 minutes.': 'நாட்காட்டிகள் ஒவ்வொரு 10 நிமிடத்துக்கும் சரிபார்க்கப்படும்.',
    'Connect your OTA calendars so Airbnb, Booking.com, Agoda and MakeMyTrip bookings block your dates automatically.': 'உங்கள் OTA நாட்காட்டிகளை இணைத்தால் Airbnb, Booking.com, Agoda, MakeMyTrip முன்பதிவுகள் தேதிகளைத் தானாகத் தடுக்கும்.'
  };
  var VILLA_TYPES = { 'beach villa': 'கடற்கரை வில்லா', 'pool villa': 'நீச்சல் குள வில்லா', 'villa': 'வில்லா', 'farm stay': 'பண்ணை வீடு', 'farmhouse': 'பண்ணை வீடு', 'cottage': 'குடில்', 'homestay': 'ஹோம்ஸ்டே' };

  var MONTHS = { Jan:'ஜனவரி', Feb:'பிப்ரவரி', Mar:'மார்ச்', Apr:'ஏப்ரல்', May:'மே', Jun:'ஜூன்', Jul:'ஜூலை', Aug:'ஆகஸ்ட்', Sep:'செப்டம்பர்', Oct:'அக்டோபர்', Nov:'நவம்பர்', Dec:'டிசம்பர்' };
  var TYPE = { 'Check-in': 'செக்-இன்', 'Check-out': 'செக்-அவுட்', 'Daily': 'தினசரி' };
  function bedroom(n, toilet){ return 'படுக்கையறை ' + n + (toilet ? ' கழிவறை' : ''); }
  var PATTERNS = [
    [/^(\d+) nights?( · (\d+) guests?)?$/, function(m){ return m[1] + ' இரவு' + (m[3] ? ' · ' + m[3] + ' விருந்தினர்' : ''); }],
    [/^(Stay|Food): (₹[\d,]+) due$/, function(m){ return (m[1] === 'Stay' ? 'தங்கல்' : 'உணவு') + ': ' + m[2] + ' நிலுவை'; }],
    [/^Food paid \((₹[\d,]+)\)$/, function(m){ return 'உணவுக் கட்டணம் செலுத்தப்பட்டது (' + m[1] + ')'; }],
    [/^In (\d+) days$/, function(m){ return m[1] + ' நாட்களில்'; }],
    [/^Departs in (\d+)d$/, function(m){ return m[1] + ' நாட்களில் புறப்பாடு'; }],
    [/^✓ Checked in((?: · .+)?)$/, function(m){ return '✓ செக்-இன் ஆனது' + m[1].split(' · ').slice(1).map(function(p){
      var a = /^arrived (.+)$/.exec(p), g = /^(\d+) guests? on arrival$/.exec(p);
      return ' · ' + (a ? a[1] + '-க்கு வந்தார்' : g ? 'வருகையில் ' + g[1] + ' விருந்தினர்' : p); }).join(''); }],
    [/^(\d{1,2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)$/, function(m){ return m[1] + ' ' + MONTHS[m[2].slice(0,3)]; }],
    [/^Could not load the register — (.+)$/, function(m){ return 'பதிவேட்டை ஏற்ற முடியவில்லை — ' + m[1]; }],
    [/^(.+) calendar: (failing|can’t read|empty — rechecking|not checked for \d+h)$/, function(m){ return m[1] + ' நாட்காட்டி: ' + (TA[m[2].charAt(0).toUpperCase() + m[2].slice(1)] || m[2]); }],
    [/^Bedroom (\d+)( toilet)? — (.+)$/, function(m){ return bedroom(m[1], m[2]) + ' — ' + (TA[m[3]] || m[3]); }],
    [/^Bedroom (\d+)$/, function(m){ return bedroom(m[1]); }],
    [/^(\d+) \/ (\d+) items checked$/, function(m){ return m[2] + '-இல் ' + m[1] + ' சரிபார்க்கப்பட்டது'; }],
    [/^(\d+)\/(\d+) done$/, function(m){ return m[1] + '/' + m[2] + ' முடிந்தது'; }],
    [/^⚠ (\d+) notes?$/, function(m){ return '⚠ ' + m[1] + ' குறிப்பு'; }],
    [/^(Check-in|Check-out|Daily) checklist( — (.+))?$/, function(m){ return TYPE[m[1]] + ' சரிபார்ப்பு' + (m[3] ? ' — ' + (TA[m[3]] || m[3]) : ''); }],
    [/^(.+) left · needs (.+) more$/, function(m){ return m[1] + ' மீதம் · இன்னும் ' + m[2] + ' தேவை'; }],
    [/^Threshold: (.+)$/, function(m){ return 'வரம்பு: ' + m[1]; }],
    [/^(\d+) selected · (.+)$/, function(m){ return m[1] + ' தேர்வு · ' + m[2]; }],
    [/^(₹[\d,.]+) below float — nothing pending, just net cash withdrawn$/, function(m){ return 'முன்பணத்தை விட ' + m[1] + ' குறைவு — நிலுவை இல்லை, நிகரமாக எடுக்கப்பட்ட பணம்'; }],
    [/^(₹[\d,.]+) below float — all of it pending reimbursement$/, function(m){ return 'முன்பணத்தை விட ' + m[1] + ' குறைவு — முழுவதும் திருப்பித் தர வேண்டியது'; }],
    [/^(₹[\d,.]+) below float \((₹[\d,.]+) pending \+ (₹[\d,.]+) net withdrawn\)$/, function(m){ return 'முன்பணத்தை விட ' + m[1] + ' குறைவு (' + m[2] + ' நிலுவை + ' + m[3] + ' நிகர எடுப்பு)'; }],
    [/^(₹[\d,.]+) below float \((₹[\d,.]+) pending, offset by (₹[\d,.]+) topped up above float\)$/, function(m){ return 'முன்பணத்தை விட ' + m[1] + ' குறைவு (' + m[2] + ' நிலுவை, ' + m[3] + ' கூடுதல் டாப்-அப் ஈடு)'; }],
    [/^Could not load (.+?) — (.+)$/, function(m){ return 'ஏற்ற முடியவில்லை — ' + m[2]; }],
    [/^Could not load — (.+)$/, function(m){ return 'ஏற்ற முடியவில்லை — ' + m[1]; }],
    [/^(\d+) open$/, function(m){ return m[1] + ' திறந்தவை'; }],
    [/^Welcome to (.+)$/, function(m){ return m[1] + '-க்கு வரவேற்கிறோம்'; }],
    [/^🏠 Private (.+)$/, function(m){ return '🏠 தனியார் ' + (VILLA_TYPES[m[1].toLowerCase()] || m[1]); }],
    [/^(\d+) guests?$/, function(m){ return m[1] + ' விருந்தினர்' + (m[1] === '1' ? '' : 'கள்'); }],
    [/^✓ Signed in — matched your booking (.+)\.$/, function(m){ return '✓ உள்நுழைந்தீர்கள் — உங்கள் முன்பதிவு ' + m[1] + ' கண்டறியப்பட்டது.'; }],
    [/^We'll have everything ready for your stay from (.+) to (.+)\. See you soon!$/, function(m){ return m[1] + ' முதல் ' + m[2] + ' வரையிலான உங்கள் தங்குதலுக்கு எல்லாவற்றையும் தயார் செய்து வைப்போம். விரைவில் சந்திப்போம்!'; }],
    [/^You're already checked in for your stay from (.+) to (.+)\. See you soon!$/, function(m){ return m[1] + ' முதல் ' + m[2] + ' வரையிலான தங்குதலுக்கு ஏற்கெனவே செக்-இன் செய்துவிட்டீர்கள். விரைவில் சந்திப்போம்!'; }],
    [/^You're already checked in\. See you soon at (.+)\.$/, function(m){ return 'ஏற்கெனவே செக்-இன் செய்துவிட்டீர்கள். விரைவில் ' + m[1] + '-இல் சந்திப்போம்.'; }],
    // Owner dashboard — figures, dates and names pass through untouched.
    [/^(.+) booking needs guest details$/, function(m){ return m[1] + ' முன்பதிவுக்கு விருந்தினர் விவரங்கள் தேவை'; }],
    [/^(.+) · (\d+) nights? — add the guest's name, phone and amount$/, function(m){ return m[1] + ' · ' + m[2] + ' இரவு — விருந்தினர் பெயர், தொலைபேசி, தொகையைச் சேர்க்கவும்'; }],
    [/^\+(\d+) more OTA bookings need guest details$/, function(m){ return 'இன்னும் ' + m[1] + ' OTA முன்பதிவுகளுக்கு விவரங்கள் தேவை'; }],
    [/^(.+) is no longer on (.+)'s calendar$/, function(m){ return m[1] + ' இனி ' + m[2] + ' நாட்காட்டியில் இல்லை'; }],
    [/^Cancelled\? Check it there · (.+)$/, function(m){ return 'ரத்தா? அங்கே சரிபாருங்கள் · ' + m[1]; }],
    [/^(.+) moved on (.+)'s calendar$/, function(m){ return m[1] + ' — ' + m[2] + ' நாட்காட்டியில் மாறியுள்ளது'; }],
    [/^Now (.+) → (.+) · update the dates$/, function(m){ return 'இப்போது ' + m[1] + ' → ' + m[2] + ' · தேதிகளைப் புதுப்பிக்கவும்'; }],
    [/^(\d+) of (\d+) nights?( · (\d+) via OTAs)?$/, function(m){ return m[2] + ' இரவுகளில் ' + m[1] + (m[4] ? ' · ' + m[4] + ' OTA வழியாக' : ''); }],
    [/^(\d+) nights? · to (.+)$/, function(m){ return m[1] + ' இரவு · ' + m[2] + ' வரை'; }],
    [/^Booked for (\w+) · (\w+) (₹[\d,]+)$/, function(m){ return MONTHS[m[1].slice(0,3)] + ' முன்பதிவு · ' + MONTHS[m[2].slice(0,3)] + ' ' + m[3]; }],
    [/^Next: (.+)$/, function(m){ return 'அடுத்து: ' + m[1]; }],
    [/^(\d+) urgent$/, function(m){ return m[1] + ' அவசரம்'; }],
    [/^(₹[\d,]+) due$/, function(m){ return m[1] + ' நிலுவை'; }],
    [/^(₹[\d,]+) still due$/, function(m){ return m[1] + ' இன்னும் நிலுவை'; }],
    [/^(₹[\d,]+) due before arrival$/, function(m){ return 'வருகைக்கு முன் ' + m[1] + ' நிலுவை'; }],
    [/^(.+) · checked out (.+)$/, function(m){ return m[1] + ' · ' + m[2] + ' அன்று புறப்பட்டார்'; }],
    [/^(.+) · arrives (.+)$/, function(m){ return m[1] + ' · ' + m[2] + ' அன்று வருகை'; }],
    [/^\+(\d+) more balances to collect$/, function(m){ return 'வசூலிக்க இன்னும் ' + m[1] + ' நிலுவைகள்'; }],
    [/^(.+) is held twice$/, function(m){ return m[1] + ' இரண்டு முறை பிடிக்கப்பட்டுள்ளது'; }],
    [/^(.+) — check it isn’t a double booking$/, function(m){ return m[1] + ' — இரட்டை முன்பதிவா எனச் சரிபாருங்கள்'; }],
    [/^(\d+) items low on stock$/, function(m){ return m[1] + ' பொருட்கள் இருப்பு குறைவு'; }],
    [/^(.+) running low$/, function(m){ return m[1] + ' குறைவாக உள்ளது'; }],
    [/^(₹[\d,]+) petty cash to reimburse$/, function(m){ return 'திருப்பிச் செலுத்த வேண்டிய சில்லறைச் செலவு ' + m[1]; }],
    [/^(\d+) expenses? waiting$/, function(m){ return m[1] + ' செலவுகள் காத்திருக்கின்றன'; }],
    [/^(₹[\d,]+) in food bills not settled$/, function(m){ return 'செலுத்தப்படாத உணவுக் கட்டணம் ' + m[1]; }],
    [/^(\d+) orders? since (.+)$/, function(m){ return m[2] + ' முதல் ' + m[1] + ' ஆர்டர்கள்'; }],
    [/^(Check-in|Check-out) checklist (not started|in progress)$/, function(m){ return TYPE[m[1]] + ' சரிபார்ப்பு ' + (m[2] === 'not started' ? 'தொடங்கவில்லை' : 'நடந்துகொண்டிருக்கிறது'); }],
    [/^\+(\d+) more open issues?$/, function(m){ return 'இன்னும் ' + m[1] + ' திறந்த பிரச்சனைகள்'; }],
    [/^(Airbnb|Booking\.com|Agoda|MakeMyTrip|VRBO|OTA) booking$/, function(m){ return m[1] + ' முன்பதிவு'; }],
    [/^Paid via (.+)$/, function(m){ return m[1] + ' மூலம் செலுத்தப்பட்டது'; }],
    [/^(\d+) (to do|low|open)$/, function(m){ return m[1] + ' ' + { 'to do': 'செய்ய வேண்டியவை', low: 'குறைவு', open: 'திறந்தவை' }[m[2]]; }],
    [/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sept?|Oct|Nov|Dec)\w* (\d{4})$/, function(m){ return MONTHS[m[1].slice(0,3)] + ' ' + m[2]; }]
  ];
  function T(s){
    if (!s) return null;
    if (Object.prototype.hasOwnProperty.call(TA, s)) return TA[s];
    for (var i = 0; i < PATTERNS.length; i++) { var m = PATTERNS[i][0].exec(s); if (m) return PATTERNS[i][1](m); }
    return null;
  }
  window.rystT = function(s){ return lang === 'ta' ? (T(s) || s) : s; };

  if (lang !== 'ta') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function(){ wireToggles(document); }); else wireToggles(document);
    return;
  }

  document.documentElement.lang = 'ta';
  if (!guest) try {
    var l = document.createElement('link'); l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Noto+Sans+Tamil:wght@400;500;600;700&display=swap';
    document.head.appendChild(l);
    var st = document.createElement('style');
    st.textContent = 'html[lang="ta"] body,html[lang="ta"] button,html[lang="ta"] input,html[lang="ta"] select,html[lang="ta"] textarea{font-family:"Outfit","Noto Sans Tamil",system-ui,sans-serif}';
    document.head.appendChild(st);
  } catch (e) {}

  var SKIP = { SCRIPT: 1, STYLE: 1, TEXTAREA: 1, NOSCRIPT: 1 };
  function skip(el){ return !el || SKIP[el.tagName] || (el.closest && el.closest('[data-no-i18n]')); }
  function textNode(n){
    var pe = n.parentElement; if (skip(pe)) return;
    var v = n.nodeValue; if (!v || !/[A-Za-z]/.test(v)) return;
    var m = /^(\s*)([\s\S]*?)(\s*)$/.exec(v), r = T(m[2]);
    if (r == null || r === m[2]) return;
    // An <option> with no value attribute submits its text — pin the
    // English value before its label changes.
    if (pe.tagName === 'OPTION' && !pe.hasAttribute('value')) pe.setAttribute('value', m[2]);
    n.nodeValue = m[1] + r + m[3];
  }
  var ATTRS = ['placeholder', 'title', 'aria-label'];
  function attrs(el){
    // Attributes are translated even on a <textarea> (its placeholder) — only
    // its typed value, never a text node, must stay as written.
    if (!el || (el.closest && el.closest('[data-no-i18n]'))) return;
    ATTRS.forEach(function(a){ var v = el.getAttribute(a); if (v && /[A-Za-z]/.test(v)) { var r = T(v.trim()); if (r != null && r !== v) el.setAttribute(a, r); } });
  }
  function walk(root){
    if (root.nodeType === 3) return textNode(root);
    if (root.nodeType !== 1 || skip(root)) return;
    attrs(root);
    var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT), n;
    while ((n = w.nextNode())) { if (n.nodeType === 3) textNode(n); else attrs(n); }
    wireToggles(root);
  }
  ['alert', 'confirm', 'prompt'].forEach(function(k){
    var orig = window[k]; if (!orig) return;
    window[k] = function(msg){ var a = Array.prototype.slice.call(arguments); a[0] = window.rystT(String(msg == null ? '' : msg)); return orig.apply(window, a); };
  });
  function start(){
    walk(document.body);
    if (document.title) { var t = T(document.title.split(' · ')[0]); if (t) document.title = t + document.title.slice(document.title.split(' · ')[0].length); }
    new MutationObserver(function(muts){
      muts.forEach(function(m){
        if (m.type === 'childList') m.addedNodes.forEach(walk);
        else if (m.type === 'characterData') textNode(m.target);
        else if (m.type === 'attributes') attrs(m.target);
      });
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
