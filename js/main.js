// ============================================================
// js/main.js – All site logic, self-contained, CDN Firebase
// ============================================================

// ── Firebase SDK from CDN ────────────────────────────────
import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, onSnapshot,
         query, orderBy, where, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage, ref, uploadBytes, getDownloadURL }
  from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ── Init Firebase ────────────────────────────────────────
let app, db, storage;
try {
  app     = initializeApp(window.__FIREBASE_CONFIG__);
  db      = getFirestore(app);
  storage = getStorage(app);
} catch(e) {
  console.warn('Firebase init failed:', e.message);
  // Stub db/storage so the rest of the site still works
  db      = null;
  storage = null;
}

// Safe Firestore wrappers so site works even without Firebase
async function safeAddDoc(col, data) {
  if (!db) throw new Error('No database connection');
  return addDoc(collection(db, col), data);
}
async function safeGetDocs(q) {
  if (!db) return { empty: true, forEach: ()=>{} };
  return getDocs(q);
}

// ════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════
function showToast(msg, type = 'info', duration = 4000) {
  let t = document.getElementById('siteToast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'siteToast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = `toast ${type} show`;
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), duration);
}

function openModal(id)  { const m = document.getElementById(id); if (m) { m.classList.add('open');    document.body.style.overflow = 'hidden'; } }
function closeModal(id) { const m = document.getElementById(id); if (m) { m.classList.remove('open'); document.body.style.overflow = '';       } }

// ════════════════════════════════════════════════════════
// SCROLL & NAV
// ════════════════════════════════════════════════════════
function initScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const h = document.body.scrollHeight - innerHeight;
    if (h > 0) bar.style.width = (scrollY / h * 100) + '%';
    document.getElementById('mainNav')?.classList.toggle('scrolled', scrollY > 60);
  }, { passive: true });
}

function initMobileMenu() {
  const btn  = document.getElementById('hamburger');
  const menu = document.getElementById('mobileMenu');
  if (!btn || !menu) return;
  btn.addEventListener('click', () => {
    btn.classList.toggle('open');
    menu.classList.toggle('open');
    document.body.style.overflow = menu.classList.contains('open') ? 'hidden' : '';
  });
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    btn.classList.remove('open'); menu.classList.remove('open'); document.body.style.overflow = '';
  }));
}

// ════════════════════════════════════════════════════════
// SCROLL REVEAL
// ════════════════════════════════════════════════════════
function initReveal() {
  const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  const io  = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const delay = parseInt(e.target.dataset.delay || 0);
        setTimeout(() => e.target.classList.add('revealed'), delay);
      }
    });
  }, { threshold: 0.1 });
  els.forEach(el => io.observe(el));
}

// ════════════════════════════════════════════════════════
// COUNTERS
// ════════════════════════════════════════════════════════
function initCounters() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && !e.target.dataset.done) {
        e.target.dataset.done = '1';
        const target = +e.target.dataset.target;
        const step   = target / 120;
        let cur = 0;
        const t = setInterval(() => {
          cur = Math.min(cur + step, target);
          e.target.textContent = Math.floor(cur);
          if (cur >= target) clearInterval(t);
        }, 16);
      }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.counter').forEach(c => io.observe(c));
}

// ════════════════════════════════════════════════════════
// FAQ
// ════════════════════════════════════════════════════════
function initFaq() {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item   = btn.parentElement;
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

// ════════════════════════════════════════════════════════
// PORTFOLIO FILTER + LIGHTBOX
// ════════════════════════════════════════════════════════
function initPortfolio() {
  // Filters
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      document.querySelectorAll('.masonry-item').forEach(item => {
        const show = cat === 'all' || item.dataset.category === cat;
        item.style.display = show ? 'block' : 'none';
      });
    });
  });
  // Lightbox
  document.querySelectorAll('.masonry-item').forEach(item => {
    item.addEventListener('click', () => openLightbox(
      item.querySelector('img')?.src,
      item.querySelector('.masonry-ov span')?.textContent || ''
    ));
  });
  // Load from Firestore (non-blocking)
  loadPortfolioFromDB();
}

async function loadPortfolioFromDB() {
  try {
    if (!db) return;
    const snap = await getDocs(query(collection(db, 'portfolio'), orderBy('order', 'asc')));
    if (snap.empty) return;
    const grid  = document.getElementById('portfolioGrid');
    if (!grid) return;
    let html = '';
    snap.forEach(d => {
      const item = d.data();
      html += `<div class="masonry-item reveal" data-category="${item.category || 'all'}">
        <img src="${item.imageUrl}" alt="${item.title || ''}">
        <div class="masonry-ov"><span>${item.title || ''}</span></div>
      </div>`;
    });
    grid.innerHTML = html;
    initPortfolio(); // re-bind
    initReveal();
  } catch(e) { /* use static HTML */ }
}

function openLightbox(src, caption) {
  let lb = document.getElementById('lightboxModal');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightboxModal';
    lb.className = 'modal-overlay';
    lb.innerHTML = `<div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:12px;max-width:90vw;">
      <button onclick="document.getElementById('lightboxModal').classList.remove('open');document.body.style.overflow=''"
        style="position:absolute;top:-12px;right:-12px;width:36px;height:36px;border-radius:50%;background:white;border:none;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(0,0,0,0.2);">✕</button>
      <img id="lbImg" src="" style="max-width:90vw;max-height:80vh;object-fit:contain;border-radius:12px;box-shadow:0 16px 64px rgba(0,0,0,0.5);">
      <div id="lbCap" style="color:white;font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;"></div>
    </div>`;
    lb.addEventListener('click', e => { if (e.target === lb) { lb.classList.remove('open'); document.body.style.overflow = ''; } });
    document.body.appendChild(lb);
  }
  document.getElementById('lbImg').src = src || '';
  document.getElementById('lbCap').textContent = caption;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ════════════════════════════════════════════════════════
// REELS / VIDEO MODAL
// ════════════════════════════════════════════════════════
function initReels() {
  loadReelsFromDB();
  bindReelClicks();
}

async function loadReelsFromDB() {
  try {
    if (!db) return;
    const snap = await getDocs(query(collection(db, 'reels'), orderBy('order', 'asc')));
    if (snap.empty) return;
    const grid = document.getElementById('reelsGrid');
    if (!grid) return;
    let html = '';
    snap.forEach(d => {
      const r = d.data();
      html += `<div class="reel-card" data-video="${r.videoUrl || ''}" data-title="${r.title || ''}">
        <img class="reel-thumb" src="${r.thumbnailUrl || ''}" alt="${r.title || ''}">
        <div class="reel-overlay">
          <div class="reel-play">▶</div>
          <div class="reel-title">${r.title || ''}</div>
          <div class="reel-cat">${r.category || ''}</div>
        </div>
      </div>`;
    });
    grid.innerHTML = html;
    bindReelClicks();
  } catch(e) { /* use static */ }
}

function bindReelClicks() {
  document.querySelectorAll('.reel-card').forEach(card => {
    card.addEventListener('click', () => openVideoModal(card.dataset.video, card.dataset.title));
  });
}

function openVideoModal(src, title) {
  let modal = document.getElementById('videoModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'videoModal';
    modal.className = 'modal-overlay video-modal';
    modal.innerHTML = `<div class="modal-box" style="max-width:900px;background:#000;border-radius:16px;overflow:hidden;position:relative;">
      <button onclick="closeVideoModal()" style="position:absolute;top:12px;right:12px;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,0.15);border:none;color:white;font-size:18px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;">✕</button>
      <div id="videoContent"></div>
      <div style="padding:14px 20px;background:#111;"><div id="videoTitle" style="color:white;font-size:14px;font-weight:600;"></div></div>
    </div>`;
    modal.addEventListener('click', e => { if (e.target === modal) closeVideoModal(); });
    document.body.appendChild(modal);
  }
  window.closeVideoModal = () => {
    modal.classList.remove('open');
    document.getElementById('videoContent').innerHTML = '';
    document.body.style.overflow = '';
  };
  document.getElementById('videoTitle').textContent = title || '';
  const content = document.getElementById('videoContent');
  if (src && (src.includes('youtube') || src.includes('youtu.be'))) {
    let id = src.includes('youtu.be/') ? src.split('youtu.be/')[1].split('?')[0]
                                        : src.split('watch?v=')[1]?.split('&')[0];
    content.innerHTML = `<iframe src="https://www.youtube.com/embed/${id}?autoplay=1" style="width:100%;aspect-ratio:16/9;border:none;" allowfullscreen allow="autoplay"></iframe>`;
  } else if (src) {
    content.innerHTML = `<video src="${src}" controls autoplay style="width:100%;aspect-ratio:16/9;display:block;"></video>`;
  } else {
    content.innerHTML = `<div style="width:100%;aspect-ratio:16/9;background:#222;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.4);font-size:14px;">No video added yet — upload via admin panel</div>`;
  }
  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ════════════════════════════════════════════════════════
// LOOKBOOK
// ════════════════════════════════════════════════════════
function initLookbook() {
  document.querySelectorAll('.lk-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lk-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      document.querySelectorAll('.look-card').forEach(card => {
        card.style.display = (cat === 'all' || card.dataset.category === cat) ? 'block' : 'none';
      });
    });
  });
  document.querySelectorAll('.look-card').forEach(card => {
    card.addEventListener('click', () => openLightbox(card.querySelector('img')?.src, card.querySelector('.look-name')?.textContent || ''));
  });
}

// ════════════════════════════════════════════════════════
// BEFORE / AFTER SLIDER
// ════════════════════════════════════════════════════════
function initBeforeAfter() {
  document.querySelectorAll('.ba-card').forEach(card => {
    const inner   = card.querySelector('.ba-card-inner');
    const before  = card.querySelector('.ba-before');
    const divider = card.querySelector('.ba-divider');
    const handle  = card.querySelector('.ba-handle');
    if (!inner || !before || !divider) return;
    let dragging = false;
    function setPos(x) {
      const rect = inner.getBoundingClientRect();
      let pct = ((x - rect.left) / rect.width) * 100;
      pct = Math.max(5, Math.min(95, pct));
      before.style.clipPath  = `inset(0 ${100 - pct}% 0 0)`;
      divider.style.left     = pct + '%';
      if (handle) handle.style.left = pct + '%';
    }
    inner.addEventListener('mousedown',  e => { dragging = true; setPos(e.clientX); e.preventDefault(); });
    window.addEventListener('mousemove', e => { if (dragging) setPos(e.clientX); });
    window.addEventListener('mouseup',   ()  => { dragging = false; });
    inner.addEventListener('touchstart', e => { dragging = true; setPos(e.touches[0].clientX); }, { passive: true });
    window.addEventListener('touchmove', e => { if (dragging) setPos(e.touches[0].clientX); }, { passive: true });
    window.addEventListener('touchend',  () => { dragging = false; });
  });
}

// ════════════════════════════════════════════════════════
// TESTIMONIALS CAROUSEL
// ════════════════════════════════════════════════════════
const STATIC_TESTIMONIALS = [
  { name:'Amarachi B.',  role:'Bride · Lagos',           review:'Lycia is hands down the best! She made me feel so beautiful on my wedding day. The makeup lasted all day and the compliments didn\'t stop!', rating:5 },
  { name:'Chidinma O.',  role:'Birthday Client · Abuja', review:'The most talented makeup artist! She understood exactly the look I wanted for my birthday shoot. I felt like an absolute queen!', rating:5 },
  { name:'Folake A.',    role:'Content Creator · Lagos', review:'I booked Lycia for my brand photoshoot and she nailed it! Professional, punctual, and incredibly skilled. Will definitely book again!', rating:5 },
  { name:'Ngozi M.',     role:'Makeup Student · Lagos',  review:'Lycia\'s training program is exceptional! I went from zero knowledge to confidently doing professional makeup. Best investment ever.', rating:5 },
];
let testiIdx = 0, testiItems = [], testiTimer;

async function initTestimonials() {
  try {
    if (!db) { testiItems = STATIC_TESTIMONIALS; renderTestimonials(); clearInterval(testiTimer); testiTimer = setInterval(() => goToTesti(testiIdx + 1), 5500); return; }
    const q    = query(collection(db, 'testimonials'), where('approved','==',true));
    const snap = await getDocs(q);
    testiItems = [];
    snap.forEach(d => testiItems.push(d.data()));
    if (testiItems.length === 0) testiItems = STATIC_TESTIMONIALS;
  } catch(e) { testiItems = STATIC_TESTIMONIALS; }
  renderTestimonials();
  clearInterval(testiTimer);
  testiTimer = setInterval(() => goToTesti(testiIdx + 1), 5500);
}

function renderTestimonials() {
  const container = document.getElementById('testimonialContainer');
  const dotsWrap  = document.getElementById('testiDots');
  if (!container) return;
  container.innerHTML = testiItems.map((t, i) => `
    <div class="testi-slide ${i === 0 ? 'active' : ''}">
      <div class="testi-card">
        <div class="testi-quote">"</div>
        <div class="testi-stars">${'★'.repeat(t.rating || 5)}</div>
        <p class="testi-text">${t.review}</p>
        <div class="testi-author">
          <div class="testi-avatar">👩🏾</div>
          <div><div class="testi-name">${t.name}</div><div class="testi-role">${t.role || 'Happy Client'}</div></div>
        </div>
      </div>
    </div>`).join('');
  if (dotsWrap) {
    dotsWrap.innerHTML = testiItems.map((_, i) =>
      `<div class="t-dot ${i===0?'active':''}" data-idx="${i}"></div>`).join('');
    dotsWrap.querySelectorAll('.t-dot').forEach(dot =>
      dot.addEventListener('click', () => goToTesti(+dot.dataset.idx)));
  }
  testiIdx = 0;
}

function goToTesti(idx) {
  const slides = document.querySelectorAll('.testi-slide');
  const dots   = document.querySelectorAll('.t-dot');
  if (!slides.length) return;
  slides[testiIdx]?.classList.remove('active');
  dots[testiIdx]?.classList.remove('active');
  testiIdx = (idx + testiItems.length) % testiItems.length;
  slides[testiIdx]?.classList.add('active');
  dots[testiIdx]?.classList.add('active');
}

// ════════════════════════════════════════════════════════
// AVAILABILITY CALENDAR
// ════════════════════════════════════════════════════════
let calYear, calMonth, selectedDate = null, selectedTime = null, bookedDates = new Set();

async function initCalendar() {
  const now = new Date();
  calYear  = now.getFullYear();
  calMonth = now.getMonth();
  await fetchBookedDates();
  renderCalendar();
  document.getElementById('calPrev')?.addEventListener('click', () => { calMonth--; if(calMonth<0){calMonth=11;calYear--;} renderCalendar(); });
  document.getElementById('calNext')?.addEventListener('click', () => { calMonth++; if(calMonth>11){calMonth=0;calYear++;} renderCalendar(); });
  document.querySelectorAll('.time-slot:not(.unavailable)').forEach(slot => {
    slot.addEventListener('click', () => {
      document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
      slot.classList.add('selected');
      selectedTime = slot.dataset.time;
    });
  });
}

async function fetchBookedDates() {
  try {
    if (!db) return;
    const snap = await getDocs(collection(db, 'bookings'));
    bookedDates.clear();
    snap.forEach(d => { const b = d.data(); if (b.date && b.status !== 'cancelled') bookedDates.add(b.date); });
  } catch(e) {}
}

function renderCalendar() {
  const grid  = document.getElementById('calGrid');
  const title = document.getElementById('calTitle');
  if (!grid || !title) return;
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  title.textContent = `${months[calMonth]} ${calYear}`;
  const firstDay    = new Date(calYear, calMonth, 1).getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today       = new Date(); today.setHours(0,0,0,0);
  grid.innerHTML    = '';
  for (let i = 0; i < firstDay; i++) {
    const e = document.createElement('div'); e.className = 'cal-day empty'; grid.appendChild(e);
  }
  for (let d = 1; d <= daysInMonth; d++) {
    const dateStr  = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cellDate = new Date(calYear, calMonth, d);
    const cell     = document.createElement('div');
    cell.className = 'cal-day';
    cell.textContent = d;
    if (cellDate < today)           cell.classList.add('past');
    else if (bookedDates.has(dateStr)) cell.classList.add('booked');
    else {
      cell.classList.add('available');
      cell.addEventListener('click', () => {
        document.querySelectorAll('.cal-day').forEach(c => c.classList.remove('selected'));
        cell.classList.add('selected');
        selectedDate = dateStr;
        const disp = document.getElementById('selectedDateDisplay');
        if (disp) {
          const dd = new Date(dateStr + 'T12:00:00');
          disp.textContent = dd.toLocaleDateString('en-NG', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
          disp.style.display = 'block';
        }
        selectedTime = null;
        document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
      });
    }
    if (cellDate.toDateString() === today.toDateString()) cell.classList.add('today');
    if (dateStr === selectedDate) cell.classList.add('selected');
    grid.appendChild(cell);
  }
}

// ════════════════════════════════════════════════════════
// BOOKING FORMS → FIRESTORE
// ════════════════════════════════════════════════════════
function initCalendarBookingForm() {
  const form = document.getElementById('calBookingForm');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!selectedDate) { showToast('Please select a date on the calendar first', 'error'); return; }
    if (!selectedTime) { showToast('Please select a time slot', 'error'); return; }
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '⏳ Booking...';
    try {
      if (!db) { showToast('❌ Database not connected. Please contact via WhatsApp.', 'error'); return; }
      await addDoc(collection(db, 'bookings'), {
        name:      form.querySelector('[name="name"]').value,
        phone:     form.querySelector('[name="phone"]').value,
        service:   form.querySelector('[name="service"]').value,
        date:      selectedDate,
        time:      selectedTime,
        location:  form.querySelector('[name="location"]')?.value || '',
        notes:     form.querySelector('[name="notes"]')?.value || '',
        status:    'pending',
        type:      'calendar',
        createdAt: serverTimestamp()
      });
      showToast('✅ Booking sent! Lycia will confirm via WhatsApp shortly.', 'success', 6000);
      const name    = form.querySelector('[name="name"]').value;
      const service = form.querySelector('[name="service"]').value;
      const waMsg   = `Hi Lycia! I'd like to book an appointment.\n\n📅 Date: ${selectedDate}\n⏰ Time: ${selectedTime}\n💄 Service: ${service}\n👤 Name: ${name}`;
      form.reset(); selectedDate = null; selectedTime = null;
      document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
      document.getElementById('selectedDateDisplay').style.display = 'none';
      renderCalendar();
      setTimeout(() => window.open(`https://wa.me/2349134061048?text=${encodeURIComponent(waMsg)}`, '_blank'), 1500);
    } catch(err) {
      console.error(err);
      showToast('❌ Error saving booking. Please try WhatsApp directly.', 'error');
    }
    btn.disabled = false; btn.textContent = '📅 Confirm Booking';
  });
}

function initContactForm() {
  const form = document.getElementById('contactBookingForm');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '⏳ Sending...';
    try {
      if (!db) { showToast('❌ Database not connected. Please contact via WhatsApp.', 'error'); return; }
      await addDoc(collection(db, 'bookings'), {
        name:      `${form.querySelector('[name="firstName"]').value} ${form.querySelector('[name="lastName"]')?.value || ''}`.trim(),
        phone:     form.querySelector('[name="phone"]').value,
        service:   form.querySelector('[name="service"]').value,
        date:      form.querySelector('[name="date"]')?.value || '',
        location:  form.querySelector('[name="location"]')?.value || '',
        notes:     form.querySelector('[name="notes"]')?.value || '',
        status:    'pending',
        type:      'contact',
        createdAt: serverTimestamp()
      });
      showToast('✅ Booking request sent! We\'ll contact you soon.', 'success', 5000);
      form.reset();
    } catch(err) {
      console.error(err);
      showToast('❌ Submission failed. Please try WhatsApp.', 'error');
    }
    btn.disabled = false; btn.textContent = '📅 Send Booking Request';
  });
}

function initGroupBooking() {
  const form = document.getElementById('groupBookingForm');
  if (!form) return;
  let people = 2, pkg = '';
  document.getElementById('peopleCount') && (document.getElementById('peopleCount').textContent = people);
  document.getElementById('decreasePeople')?.addEventListener('click', () => { if(people>2){people--;document.getElementById('peopleCount').textContent=people;} });
  document.getElementById('increasePeople')?.addEventListener('click', () => { if(people<20){people++;document.getElementById('peopleCount').textContent=people;} });
  document.querySelectorAll('.group-pkg').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.group-pkg').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected'); pkg = card.dataset.package;
    });
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '⏳ Sending...';
    const data = {
      name:      form.querySelector('[name="name"]').value,
      phone:     form.querySelector('[name="phone"]').value,
      email:     form.querySelector('[name="email"]')?.value || '',
      event:     form.querySelector('[name="event"]').value,
      date:      form.querySelector('[name="date"]').value,
      location:  form.querySelector('[name="location"]').value,
      notes:     form.querySelector('[name="notes"]')?.value || '',
      package:   pkg, people, status:'pending', type:'group',
      createdAt: serverTimestamp()
    };
    try {
      if (!db) { showToast('❌ Database not connected. Please contact via WhatsApp.', 'error'); return; }
      await addDoc(collection(db, 'bookings'), data);
      showToast('✅ Group booking request sent!', 'success', 5000);
      form.reset(); people = 2; document.getElementById('peopleCount').textContent = '2';
      const waMsg = `Hi Lycia! Group booking inquiry:\n\n👥 People: ${data.people}\n📦 Package: ${data.package || 'TBD'}\n📅 Date: ${data.date}\n🎉 Event: ${data.event}\n📍 Location: ${data.location}\n👤 Name: ${data.name}`;
      setTimeout(() => window.open(`https://wa.me/2349134061048?text=${encodeURIComponent(waMsg)}`, '_blank'), 1500);
    } catch(err) { console.error(err); showToast('❌ Submission failed. Please try WhatsApp.', 'error'); }
    btn.disabled = false; btn.textContent = '💬 Send Group Booking Request';
  });
}

function initIntakeForm() {
  const form = document.getElementById('intakeForm');
  if (!form) return;
  document.querySelectorAll('.skin-tone').forEach(el => {
    el.addEventListener('click', () => { document.querySelectorAll('.skin-tone').forEach(s => s.classList.remove('selected')); el.classList.add('selected'); });
  });
  const inspoInput   = document.getElementById('inspoUpload');
  const inspoPreview = document.getElementById('inspoPreview');
  document.querySelector('.inspo-upload')?.addEventListener('click', () => inspoInput?.click());
  inspoInput?.addEventListener('change', e => {
    if (!inspoPreview) return;
    inspoPreview.innerHTML = '';
    [...e.target.files].slice(0, 4).forEach(file => {
      const reader = new FileReader();
      reader.onload = ev => { const img = document.createElement('img'); img.src = ev.target.result; inspoPreview.appendChild(img); };
      reader.readAsDataURL(file);
    });
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '⏳ Submitting...';
    try {
      if (!db) { showToast('❌ Database not connected. Please fill in via WhatsApp.', 'error'); return; }
      await addDoc(collection(db, 'intakeForms'), {
        name:          form.querySelector('[name="name"]').value,
        phone:         form.querySelector('[name="phone"]').value,
        email:         form.querySelector('[name="email"]')?.value || '',
        occasion:      form.querySelector('[name="occasion"]')?.value || '',
        lookType:      form.querySelector('[name="lookType"]')?.value || '',
        skinTone:      document.querySelector('.skin-tone.selected')?.dataset.tone || '',
        allergies:     form.querySelector('[name="allergies"]')?.value || '',
        concerns:      form.querySelector('[name="concerns"]')?.value || '',
        bookingId:     form.querySelector('[name="bookingId"]')?.value || '',
        hasInspoPhotos: (inspoInput?.files?.length || 0) > 0,
        createdAt:     serverTimestamp()
      });
      showToast('✅ Intake form submitted! Lycia will review your details before your session.', 'success', 6000);
      form.reset();
      if (inspoPreview) inspoPreview.innerHTML = '';
      document.querySelectorAll('.skin-tone').forEach(s => s.classList.remove('selected'));
    } catch(err) { console.error(err); showToast('❌ Submission failed. Please try again.', 'error'); }
    btn.disabled = false; btn.textContent = '💄 Submit Intake Form';
  });
}

function initTestimonialSubmit() {
  const form = document.getElementById('testimonialForm');
  if (!form) return;
  let rating = 5;
  document.querySelectorAll('.star-btn').forEach((btn, i) => {
    btn.addEventListener('mouseover', () => document.querySelectorAll('.star-btn').forEach((s,j) => s.classList.toggle('active', j<=i)));
    btn.addEventListener('mouseout',  () => document.querySelectorAll('.star-btn').forEach((s,j) => s.classList.toggle('active', j<rating)));
    btn.addEventListener('click',     () => { rating = i+1; document.querySelectorAll('.star-btn').forEach((s,j) => s.classList.toggle('active', j<rating)); });
  });
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = '⏳ Submitting...';
    try {
      if (!db) { showToast('❌ Database not connected. Please try again.', 'error'); return; }
      await addDoc(collection(db, 'testimonials'), {
        name:      form.querySelector('[name="name"]').value,
        role:      form.querySelector('[name="role"]')?.value || 'Client',
        service:   form.querySelector('[name="service"]').value,
        review:    form.querySelector('[name="review"]').value,
        rating, approved: false,
        createdAt: serverTimestamp()
      });
      showToast('✅ Thank you! Your review will appear after approval.', 'success', 5000);
      form.reset();
      document.querySelectorAll('.star-btn').forEach((s,j) => s.classList.toggle('active', j < 4));
    } catch(err) { console.error(err); showToast('❌ Submission failed. Please try again.', 'error'); }
    btn.disabled = false; btn.textContent = '⭐ Submit Review';
  });
}

function initNewsletter() {
  document.querySelectorAll('.newsletter-form').forEach(form => {
    form.addEventListener('submit', async e => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (!input?.value) return;
      try {
        if (!db) { showToast('❌ Database not connected.', 'error'); return; }
        await addDoc(collection(db, 'newsletter'), { email: input.value, createdAt: serverTimestamp() });
        showToast('✅ Subscribed! Expect beauty tips soon.', 'success');
        input.value = '';
      } catch(err) { showToast('❌ Subscription failed. Please try again.', 'error'); }
    });
  });
}

// ════════════════════════════════════════════════════════
// WHATSAPP TEMPLATES
// ════════════════════════════════════════════════════════
const WA_TEMPLATES = {
  bookingConfirmation: { title:'Booking Confirmation', icon:'📅', body:`Hi {{clientName}}! 🌸\n\nYour appointment with Lycia's Touch has been *confirmed*!\n\n📅 Date: {{date}}\n⏰ Time: {{time}}\n💄 Service: {{service}}\n📍 Location: {{location}}\n\nPlease arrive 10 mins early. A 50% deposit of {{deposit}} is required.\n\nLooking forward to making you look amazing! ✨\n\n— Lycia 💋` },
  bookingReminder:     { title:'Appointment Reminder', icon:'⏰', body:`Hi {{clientName}}! 💕\n\nJust a reminder — your appointment is *tomorrow*!\n\n📅 Date: {{date}}\n⏰ Time: {{time}}\n💄 Service: {{service}}\n\nPlease come with a clean face. Bring inspo photos! 📸\n\nSee you soon! ✨ — Lycia` },
  followUp:           { title:'Post-Appointment Follow-Up', icon:'💖', body:`Hi {{clientName}}! 🌸\n\nIt was a pleasure having you at Lycia's Touch! Hope you're still getting compliments 😄✨\n\nPlease tag me in your photos!\nInstagram: @lyciastouch\n\nThank you! — Lycia 💋` },
  groupBookingQuote:  { title:'Group Booking Quote', icon:'👥', body:`Hi {{clientName}}! 💕\n\nThank you for your group booking inquiry!\n\n👥 People: {{people}}\n💄 Service: {{service}}\n📅 Date: {{date}}\n📍 Location: {{location}}\n💰 Total: {{totalPrice}}\n\nDeposit of 50% required to confirm.\n\nI'm excited to glam your squad! ✨ — Lycia 💋` },
  cancellation:       { title:'Cancellation Notice', icon:'❌', body:`Hi {{clientName}},\n\nI need to cancel your appointment on *{{date}} at {{time}}* due to {{reason}}.\n\nI sincerely apologize. 🙏 Let's reschedule ASAP!\n\n— Lycia 💋` },
  trainingInfo:       { title:'Training Programme Info', icon:'🎓', body:`Hi {{clientName}}! 🌸\n\nThank you for your interest in Lycia's Touch Makeup Training!\n\n✅ Hands-on practical sessions\n✅ Professional kit guidance\n✅ Certificate upon completion\n\n💰 Investment: {{price}}\n📅 Next Class: {{nextClassDate}}\n📍 Venue: {{venue}}\n\nLimited spots — reply NOW to secure yours! 🎓✨\n\n— Lycia 💋` },
};

function initWaTemplates() {
  const grid = document.getElementById('waTemplateGrid');
  if (!grid) return;
  grid.innerHTML = Object.entries(WA_TEMPLATES).map(([key, tpl]) => `
    <div class="wa-card reveal">
      <div class="wa-card-icon">${tpl.icon}</div>
      <div class="wa-card-title">${tpl.title}</div>
      <div class="wa-card-preview">${tpl.body.substring(0, 90).replace(/\n/g,' ')}...</div>
      <button class="btn btn-wa btn-sm" onclick="openWaTemplate('${key}')">💬 Use Template</button>
    </div>`).join('');
}

window.openWaTemplate = function(key) {
  const tpl = WA_TEMPLATES[key];
  if (!tpl) return;
  const vars = [...new Set([...tpl.body.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))].filter(v => v !== 'clientName');
  let modal = document.getElementById('waModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'waModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) { modal.classList.remove('open'); document.body.style.overflow=''; } });
  }
  modal.innerHTML = `<div class="modal-box" style="max-width:580px;">
    <button class="modal-close" onclick="document.getElementById('waModal').classList.remove('open');document.body.style.overflow=''">✕</button>
    <div style="padding:40px;">
      <div class="eyebrow">WhatsApp Template</div>
      <h3 style="font-family:var(--font-display);font-size:26px;font-weight:600;margin-bottom:24px;">${tpl.title}</h3>
      <div class="form-group"><label>Client Name</label><input type="text" id="waN" placeholder="e.g. Amara" style="width:100%;"></div>
      ${vars.map(v => `<div class="form-group"><label>${v.replace(/([A-Z])/g,' $1').trim()}</label><input type="text" id="waV_${v}" placeholder="${v}" style="width:100%;"></div>`).join('')}
      <div style="background:#f8f8f8;border-radius:12px;padding:16px;margin:16px 0;max-height:200px;overflow-y:auto;">
        <div style="font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#888;margin-bottom:8px;">Preview</div>
        <pre id="waPrev" style="font-family:var(--font-body);font-size:12.5px;white-space:pre-wrap;line-height:1.8;color:#333;"></pre>
      </div>
      <button onclick="sendWaTpl('${key}')" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;">💬 Send on WhatsApp</button>
    </div>
  </div>`;
  function updatePreview() {
    let p = tpl.body;
    p = p.replaceAll('{{clientName}}', document.getElementById('waN')?.value || '{{clientName}}');
    vars.forEach(v => { p = p.replaceAll(`{{${v}}}`, document.getElementById(`waV_${v}`)?.value || `{{${v}}}`); });
    document.getElementById('waPrev').textContent = p;
  }
  modal.querySelectorAll('input').forEach(i => i.addEventListener('input', updatePreview));
  updatePreview();
  modal.classList.add('open'); document.body.style.overflow = 'hidden';
};

window.sendWaTpl = function(key) {
  const msg = document.getElementById('waPrev')?.textContent;
  if (msg) window.open(`https://wa.me/2349134061048?text=${encodeURIComponent(msg)}`, '_blank');
};

// ════════════════════════════════════════════════════════
// BOOT
// ════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  initScrollProgress();
  initMobileMenu();
  initReveal();
  initCounters();
  initFaq();
  initPortfolio();
  initReels();
  initLookbook();
  initBeforeAfter();
  initWaTemplates();
  await initTestimonials();
  await initCalendar();
  initCalendarBookingForm();
  initContactForm();
  initGroupBooking();
  initIntakeForm();
  initTestimonialSubmit();
  initNewsletter();
});
