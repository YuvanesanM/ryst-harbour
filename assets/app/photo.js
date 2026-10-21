// RYST Harbour — photos from the phone (receipts, checklist and issue photos).
//
// rystPhoto.pick()            → Promise<File|null>: a small sheet with "Take photo" and
//                               "Choose from gallery". Two separate pickers because the
//                               Android app (a Chrome Trusted Web Activity) and in-app
//                               browsers handle a camera-only input unreliably, and a
//                               camera-only input never offers the gallery at all.
// rystPhoto.compress(file, o) → Promise<dataURL JPEG>, at most o.max px (1400) on the long
//                               side. Decodes with createImageBitmap where available, which
//                               needs far less memory than reading a 50–108 MP photo into a
//                               data URL first (that is what made big camera photos fail).
(function () {
  if (window.rystPhoto) return;
  const T = s => (window.rystT ? window.rystT(s) : s);

  function chooseFile(camera) {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = 'image/*'; input.hidden = true;
      if (camera) input.setAttribute('capture', 'environment');
      let done = false;
      const finish = f => { if (done) return; done = true; input.remove(); resolve(f || null); };
      input.addEventListener('change', () => finish(input.files && input.files[0]));
      input.addEventListener('cancel', () => finish(null));
      document.body.appendChild(input);
      input.click();
    });
  }

  let sheet = null;
  function ensureSheet() {
    if (sheet) return sheet;
    const css = document.createElement('style');
    css.textContent = `.rp-ov{position:fixed;inset:0;z-index:2147482000;background:rgba(15,20,18,.45);display:flex;align-items:flex-end;justify-content:center}
.rp-ov[hidden]{display:none}
.rp-sh{width:100%;max-width:440px;background:var(--panel,#fff);color:var(--ink,#1d211c);border-radius:18px 18px 0 0;padding:10px 14px calc(14px + env(safe-area-inset-bottom));display:grid;gap:8px;font-family:inherit;box-shadow:0 -8px 30px rgba(0,0,0,.18)}
.rp-sh b{font-size:14px;text-align:center;padding:6px 0 2px;color:var(--muted,#5f655d);font-weight:600}
.rp-sh button{display:flex;align-items:center;gap:12px;width:100%;border:1px solid var(--line,#e3e5e0);background:var(--panel2,#f7f8f5);color:inherit;border-radius:12px;padding:14px 16px;font-size:15px;font-weight:600;font-family:inherit;cursor:pointer;text-align:left}
.rp-sh button span{font-size:22px;line-height:1}
.rp-sh button.rp-x{justify-content:center;background:none;border-color:transparent;color:var(--muted,#5f655d)}
@media (min-width:700px){.rp-ov{align-items:center}.rp-sh{border-radius:18px}}`;
    document.head.appendChild(css);
    sheet = document.createElement('div');
    sheet.className = 'rp-ov'; sheet.hidden = true;
    sheet.innerHTML = `<div class="rp-sh" role="dialog" aria-modal="true" aria-label="${T('Add a photo')}">
      <b>${T('Add a photo')}</b>
      <button type="button" data-rp="camera"><span aria-hidden="true">📷</span>${T('Take photo')}</button>
      <button type="button" data-rp="gallery"><span aria-hidden="true">🖼️</span>${T('Choose from gallery')}</button>
      <button type="button" class="rp-x" data-rp="cancel">${T('Cancel')}</button></div>`;
    document.body.appendChild(sheet);
    return sheet;
  }

  function pick() {
    const s = ensureSheet();
    return new Promise(resolve => {
      const close = () => { s.hidden = true; s.removeEventListener('click', onClick); document.removeEventListener('keydown', onKey); };
      const onKey = e => { if (e.key === 'Escape') { close(); resolve(null); } };
      const onClick = e => {
        const b = e.target.closest('[data-rp]');
        if (!b && e.target !== s) return;
        const kind = b ? b.dataset.rp : 'cancel';
        close();
        if (kind === 'cancel') return resolve(null);
        chooseFile(kind === 'camera').then(resolve);
      };
      s.addEventListener('click', onClick); document.addEventListener('keydown', onKey);
      s.hidden = false;
      const first = s.querySelector('[data-rp="camera"]'); if (first) first.focus();
    });
  }

  const isImage = f => f && ((f.type && f.type.startsWith('image/')) || /\.(jpe?g|png|webp|gif|heic|heif|bmp)$/i.test(f.name || ''));
  const heicMsg = () => T('This photo is in HEIC format, which can\'t be opened here. Set the camera to "Most compatible" (JPEG), or take a screenshot of the photo and choose that.');

  function draw(src, w, h, max, quality) {
    const k = Math.min(1, max / Math.max(w, h));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round(w * k)); cv.height = Math.max(1, Math.round(h * k));
    const ctx = cv.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height); // transparent PNGs → white, not black, in a JPEG
    ctx.drawImage(src, 0, 0, cv.width, cv.height);
    return cv.toDataURL('image/jpeg', quality);
  }
  function viaImage(file, max, quality) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file), img = new Image();
      img.onload = () => { try { resolve(draw(img, img.naturalWidth, img.naturalHeight, max, quality)); } catch (e) { reject(e); } finally { URL.revokeObjectURL(url); } };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error(/hei[cf]/i.test(file.type + file.name) ? heicMsg() : T('Could not read this photo. Try again, or choose it from the gallery.'))); };
      img.src = url;
    });
  }
  function compress(file, o) {
    o = o || {};
    const max = o.max || 1400, quality = o.quality || 0.7;
    if (!file) return Promise.resolve(null);
    if (!isImage(file)) return Promise.reject(new Error(T('Please choose a photo (an image file).')));
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' })
        .then(bm => { try { return draw(bm, bm.width, bm.height, max, quality); } finally { if (bm.close) bm.close(); } })
        .catch(() => viaImage(file, max, quality));
    }
    return viaImage(file, max, quality);
  }

  window.rystPhoto = { pick, compress, chooseFile };
})();
