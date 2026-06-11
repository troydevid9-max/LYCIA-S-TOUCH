// ============================================================
// js/gallery.js – Portfolio, Reels, Lookbook, Before/After, Testimonials
// ============================================================

import { db, collection, getDocs, query, orderBy, onSnapshot, where } from './utils.js';
import { openModal, closeModal } from './utils.js';

// ══════════════════════════════════════════════════════════
// PORTFOLIO FILTER + LIGHTBOX
// ══════════════════════════════════════════════════════════
export function initPortfolio() {
  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      document.querySelectorAll('.masonry-item').forEach(item => {
        const show = cat === 'all' || item.dataset.category === cat;
        item.style.display = show ? 'block' : 'none';
        if (show) item.style.animation = 'fadeInScale 0.35s ease forwards';
      });
    });
  });

  // Lightbox
  document.querySelectorAll('.masonry-item').forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      const label = item.querySelector('.masonry-ov span')?.textContent || '';
      openLightbox(img?.src, label);
    });
  });

  // Load from Firestore if available
  loadPortfolioFromDB();
}

async function loadPortfolioFromDB() {
  try {
    const q = query(collection(db, 'portfolio'), orderBy('order', 'asc'));
    onSnapshot(q, (snap) => {
      if (snap.empty) return; // use static items
      const grid = document.getElementById('portfolioGrid');
      if (!grid) return;
      // Only replace if we have real data
      const items = [];
      snap.forEach(d => items.push({ id: d.id, ...d.data() }));
      if (items.length > 0) renderPortfolioItems(grid, items);
    });
  } catch(e) { /* use static */ }
}

function renderPortfolioItems(grid, items) {
  grid.innerHTML = items.map(item => `
    <div class="masonry-item reveal" data-category="${item.category || 'all'}">
      <img src="${item.imageUrl}" alt="${item.title || ''}">
      <div class="masonry-ov"><span>${item.title || ''}</span></div>
    </div>
  `).join('');
  grid.querySelectorAll('.masonry-item').forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      openLightbox(img.src, item.querySelector('.masonry-ov span')?.textContent || '');
    });
  });
}

// Lightbox
let lightboxImg = null;
function openLightbox(src, caption) {
  let lb = document.getElementById('lightboxModal');
  if (!lb) {
    lb = document.createElement('div');
    lb.id = 'lightboxModal';
    lb.className = 'modal-overlay';
    lb.innerHTML = `
      <div style="position:relative;max-width:90vw;max-height:90vh;display:flex;flex-direction:column;align-items:center;gap:12px;">
        <button class="modal-close" onclick="document.getElementById('lightboxModal').classList.remove('open');document.body.style.overflow=''">✕</button>
        <img id="lightboxImg" src="" alt="" style="max-width:90vw;max-height:80vh;object-fit:contain;border-radius:12px;box-shadow:0 16px 64px rgba(0,0,0,0.5);">
        <div id="lightboxCaption" style="color:white;font-size:13px;letter-spacing:1px;text-transform:uppercase;font-weight:600;"></div>
      </div>`;
    lb.addEventListener('click', e => { if (e.target === lb) { lb.classList.remove('open'); document.body.style.overflow=''; }});
    document.body.appendChild(lb);
  }
  document.getElementById('lightboxImg').src = src;
  document.getElementById('lightboxCaption').textContent = caption;
  lb.classList.add('open');
  document.body.style.overflow = 'hidden';
}

// ══════════════════════════════════════════════════════════
// VIDEO / REELS
// ══════════════════════════════════════════════════════════
export function initReels() {
  loadReelsFromDB();
  bindReelClicks();
}

async function loadReelsFromDB() {
  try {
    const q = query(collection(db, 'reels'), orderBy('order', 'asc'));
    onSnapshot(q, (snap) => {
      if (snap.empty) return;
      const reels = [];
      snap.forEach(d => reels.push({ id: d.id, ...d.data() }));
      renderReels(reels);
    });
  } catch(e) { /* use static HTML */ }
}

function renderReels(reels) {
  const grid = document.getElementById('reelsGrid');
  if (!grid) return;
  grid.innerHTML = reels.slice(0, 9).map(r => `
    <div class="reel-card" data-video="${r.videoUrl}" data-title="${r.title}" data-thumb="${r.thumbnailUrl}">
      <img class="reel-thumb" src="${r.thumbnailUrl || ''}" alt="${r.title}">
      <div class="reel-overlay">
        <div class="reel-play">▶</div>
        <div class="reel-title">${r.title}</div>
        <div class="reel-cat">${r.category || 'Beauty'}</div>
      </div>
    </div>
  `).join('');
  bindReelClicks();
}

function bindReelClicks() {
  document.querySelectorAll('.reel-card').forEach(card => {
    card.addEventListener('click', () => {
      const videoUrl = card.dataset.video;
      const title = card.dataset.title;
      openVideoModal(videoUrl, title);
    });
  });
}

function openVideoModal(src, title) {
  let modal = document.getElementById('videoModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'videoModal';
    modal.className = 'modal-overlay video-modal';
    modal.innerHTML = `
      <div class="modal-box" style="max-width:900px;background:#000;border-radius:16px;overflow:hidden;position:relative;">
        <button class="modal-close" id="videoModalClose">✕</button>
        <div id="videoModalContent"></div>
        <div style="padding:16px 20px;background:#111;">
          <div id="videoModalTitle" style="color:white;font-size:14px;font-weight:600;"></div>
        </div>
      </div>`;
    modal.addEventListener('click', e => {
      if (e.target === modal) closeVideoModal();
    });
    document.getElementById('videoModalClose')?.addEventListener('click', closeVideoModal);
    document.body.appendChild(modal);
  }

  document.getElementById('videoModalTitle').textContent = title || '';
  const content = document.getElementById('videoModalContent');

  // Determine if it's a YouTube/embed or direct video
  if (src?.includes('youtube') || src?.includes('youtu.be') || src?.includes('vimeo')) {
    let embedSrc = src;
    if (src.includes('youtu.be/')) {
      const id = src.split('youtu.be/')[1].split('?')[0];
      embedSrc = `https://www.youtube.com/embed/${id}?autoplay=1`;
    } else if (src.includes('watch?v=')) {
      const id = src.split('watch?v=')[1].split('&')[0];
      embedSrc = `https://www.youtube.com/embed/${id}?autoplay=1`;
    }
    content.innerHTML = `<iframe src="${embedSrc}" style="width:100%;aspect-ratio:16/9;border:none;" allowfullscreen allow="autoplay"></iframe>`;
  } else if (src) {
    content.innerHTML = `<video src="${src}" controls autoplay style="width:100%;aspect-ratio:16/9;display:block;"></video>`;
  } else {
    // Demo placeholder
    content.innerHTML = `<div style="width:100%;aspect-ratio:16/9;background:#222;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.4);font-size:14px;">Video not available</div>`;
  }

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeVideoModal() {
  const modal = document.getElementById('videoModal');
  if (modal) {
    modal.classList.remove('open');
    document.getElementById('videoModalContent').innerHTML = '';
    document.body.style.overflow = '';
  }
}

// ══════════════════════════════════════════════════════════
// LOOKBOOK
// ══════════════════════════════════════════════════════════
export function initLookbook() {
  document.querySelectorAll('.lk-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.lk-cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const cat = btn.dataset.cat;
      document.querySelectorAll('.look-card').forEach(card => {
        const show = cat === 'all' || card.dataset.category === cat;
        card.style.display = show ? 'block' : 'none';
        if (show) card.style.animation = 'fadeInScale 0.35s ease forwards';
      });
    });
  });

  document.querySelectorAll('.look-card').forEach(card => {
    card.addEventListener('click', () => {
      const img = card.querySelector('img');
      const name = card.querySelector('.look-name')?.textContent || '';
      openLightbox(img?.src, name);
    });
  });
}

// ══════════════════════════════════════════════════════════
// BEFORE / AFTER SLIDER
// ══════════════════════════════════════════════════════════
export function initBeforeAfter() {
  document.querySelectorAll('.ba-card').forEach(card => {
    const inner = card.querySelector('.ba-card-inner');
    const before = card.querySelector('.ba-before');
    const divider = card.querySelector('.ba-divider');
    const handle = card.querySelector('.ba-handle');
    if (!inner || !before || !divider) return;

    let dragging = false;

    function setPosition(x) {
      const rect = inner.getBoundingClientRect();
      let pct = ((x - rect.left) / rect.width) * 100;
      pct = Math.max(5, Math.min(95, pct));
      before.style.clipPath = `inset(0 ${100 - pct}% 0 0)`;
      divider.style.left = pct + '%';
      if (handle) handle.style.left = pct + '%';
    }

    // Mouse events
    inner.addEventListener('mousedown', (e) => { dragging = true; setPosition(e.clientX); e.preventDefault(); });
    window.addEventListener('mousemove', (e) => { if (dragging) setPosition(e.clientX); });
    window.addEventListener('mouseup',   () => { dragging = false; });

    // Touch events
    inner.addEventListener('touchstart', (e) => { dragging = true; setPosition(e.touches[0].clientX); }, { passive: true });
    window.addEventListener('touchmove', (e) => { if (dragging) setPosition(e.touches[0].clientX); }, { passive: true });
    window.addEventListener('touchend',  () => { dragging = false; });
  });
}

// ══════════════════════════════════════════════════════════
// TESTIMONIALS CAROUSEL (with live data)
// ══════════════════════════════════════════════════════════
let testiCurrent = 0;
let testiItems = [];
let testiAutoplay;

export async function initTestimonialsCarousel() {
  await loadApprovedTestimonials();
  startAutoplay();
}

async function loadApprovedTestimonials() {
  try {
    const q = query(collection(db, 'testimonials'), where('approved', '==', true), orderBy('createdAt', 'desc'));
    onSnapshot(q, (snap) => {
      if (snap.empty) { useStaticTestimonials(); return; }
      testiItems = [];
      snap.forEach(d => testiItems.push({ id: d.id, ...d.data() }));
      if (testiItems.length > 0) renderTestimonials();
    });
  } catch(e) { useStaticTestimonials(); }
}

function useStaticTestimonials() {
  testiItems = [
    { name: 'Amarachi B.', role: 'Bride · Lagos', review: 'Lycia is hands down the best! She made me feel so beautiful on my wedding day. The makeup lasted all day and the compliments didn\'t stop!', rating: 5 },
    { name: 'Chidinma O.', role: 'Birthday Client · Abuja', review: 'The most talented makeup artist in Lagos! She understood exactly the look I wanted for my birthday shoot. I felt like an absolute queen!', rating: 5 },
    { name: 'Folake A.', role: 'Content Creator · Lagos', review: 'I booked Lycia for my brand photoshoot and she nailed it! Professional, punctual, and incredibly skilled. Will definitely book again!', rating: 5 },
    { name: 'Ngozi M.', role: 'Makeup Student · Lagos', review: 'Lycia\'s training program is exceptional! I went from zero knowledge to confidently doing professional makeup. Best investment ever.', rating: 5 }
  ];
  renderTestimonials();
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
          <div class="testi-avatar">${t.avatarUrl ? `<img src="${t.avatarUrl}" alt="${t.name}">` : '👩🏾'}</div>
          <div>
            <div class="testi-name">${t.name}</div>
            <div class="testi-role">${t.role || 'Happy Client'}</div>
          </div>
        </div>
      </div>
    </div>
  `).join('');

  if (dotsWrap) {
    dotsWrap.innerHTML = testiItems.map((_, i) => `
      <div class="t-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></div>
    `).join('');
    dotsWrap.querySelectorAll('.t-dot').forEach(dot => {
      dot.addEventListener('click', () => goToTesti(+dot.dataset.idx));
    });
  }
  testiCurrent = 0;
}

export function goToTesti(idx) {
  const slides = document.querySelectorAll('.testi-slide');
  const dots   = document.querySelectorAll('.t-dot');
  slides[testiCurrent]?.classList.remove('active');
  dots[testiCurrent]?.classList.remove('active');
  testiCurrent = (idx + testiItems.length) % testiItems.length;
  slides[testiCurrent]?.classList.add('active');
  dots[testiCurrent]?.classList.add('active');
}

function startAutoplay() {
  clearInterval(testiAutoplay);
  testiAutoplay = setInterval(() => goToTesti(testiCurrent + 1), 5500);
}

// CSS animation for filter
const style = document.createElement('style');
style.textContent = `
@keyframes fadeInScale {
  from { opacity:0; transform:scale(0.93); }
  to   { opacity:1; transform:scale(1); }
}`;
document.head.appendChild(style);
