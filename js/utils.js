// ============================================================
// js/utils.js – Core Utilities
// ============================================================

import { db, storage } from '../firebase/config.js';
import {
  collection, addDoc, getDocs, updateDoc, deleteDoc,
  doc, query, orderBy, onSnapshot, serverTimestamp, where
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref, uploadBytes, getDownloadURL, deleteObject
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ── Exports for Firestore ──────────────────────────────────
export { db, storage, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, orderBy, onSnapshot, serverTimestamp, where, ref, uploadBytes, getDownloadURL, deleteObject };

// ── Toast Notification ────────────────────────────────────
export function showToast(msg, type = 'info', duration = 3500) {
  let toast = document.getElementById('siteToast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'siteToast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `toast ${type} show`;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => toast.classList.remove('show'), duration);
}

// ── Scroll Reveal ─────────────────────────────────────────
export function initReveal() {
  const els = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        const el = e.target;
        const delay = el.dataset.delay || 0;
        setTimeout(() => el.classList.add('revealed'), delay);
      }
    });
  }, { threshold: 0.12 });
  els.forEach(el => io.observe(el));
}

// ── Animated Counters ─────────────────────────────────────
export function initCounters() {
  const counters = document.querySelectorAll('.counter');
  const io = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting && !e.target.dataset.done) {
        e.target.dataset.done = '1';
        const target = +e.target.dataset.target;
        const duration = 2000;
        const step = target / (duration / 16);
        let cur = 0;
        const t = setInterval(() => {
          cur = Math.min(cur + step, target);
          e.target.textContent = Math.floor(cur);
          if (cur >= target) clearInterval(t);
        }, 16);
      }
    });
  }, { threshold: 0.5 });
  counters.forEach(c => io.observe(c));
}

// ── Scroll Progress ───────────────────────────────────────
export function initScrollProgress() {
  const bar = document.getElementById('scrollProgress');
  if (!bar) return;
  window.addEventListener('scroll', () => {
    const h = document.body.scrollHeight - innerHeight;
    bar.style.width = (scrollY / h * 100) + '%';
    const nav = document.getElementById('mainNav');
    if (nav) nav.classList.toggle('scrolled', scrollY > 60);
  }, { passive: true });
}

// ── Smooth Scroll Nav ─────────────────────────────────────
export function initSmoothNav() {
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const target = document.querySelector(a.getAttribute('href'));
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
}

// ── Mobile Menu ───────────────────────────────────────────
export function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  if (!hamburger || !mobileMenu) return;

  hamburger.addEventListener('click', () => {
    hamburger.classList.toggle('open');
    mobileMenu.classList.toggle('open');
    document.body.style.overflow = mobileMenu.classList.contains('open') ? 'hidden' : '';
  });

  mobileMenu.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      hamburger.classList.remove('open');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    });
  });
}

// ── FAQ Accordion ─────────────────────────────────────────
export function initFaq() {
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.parentElement;
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('open'));
      if (!isOpen) item.classList.add('open');
    });
  });
}

// ── Modal Helper ──────────────────────────────────────────
export function openModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.add('open'); document.body.style.overflow = 'hidden'; }
}
export function closeModal(id) {
  const m = document.getElementById(id);
  if (m) { m.classList.remove('open'); document.body.style.overflow = ''; }
}
export function initModals() {
  document.querySelectorAll('[data-modal]').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.modal));
  });
  document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
    el.addEventListener('click', (e) => {
      if (e.target === el) closeModal(el.closest('.modal-overlay')?.id || el.dataset.close);
    });
  });
}

// ── Format Date ───────────────────────────────────────────
export function formatDate(ts) {
  if (!ts) return '—';
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ── Format Currency ───────────────────────────────────────
export function formatNaira(amount) {
  return '₦' + Number(amount).toLocaleString('en-NG');
}

// ── Upload File to Storage ────────────────────────────────
export async function uploadFile(file, folder) {
  const storageRef = ref(storage, `${folder}/${Date.now()}_${file.name}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

// ── Build WhatsApp URL ────────────────────────────────────
export function buildWaURL(phone, message) {
  return `https://wa.me/${phone.replace(/\D/g,'')}?text=${encodeURIComponent(message)}`;
}

// ── Star Rating Picker ────────────────────────────────────
export function initStarPicker(container, callback) {
  const stars = container.querySelectorAll('.star-btn');
  let selected = 5;
  stars.forEach((btn, i) => {
    btn.addEventListener('mouseover', () => highlight(i));
    btn.addEventListener('mouseout',  () => highlight(selected - 1));
    btn.addEventListener('click', () => {
      selected = i + 1;
      highlight(selected - 1);
      if (callback) callback(selected);
    });
  });
  function highlight(idx) {
    stars.forEach((s, i) => s.classList.toggle('active', i <= idx));
  }
  highlight(4); // default 5 stars
  return () => selected;
}

// ── WhatsApp Template Sender ──────────────────────────────
export function sendWaTemplate(template, data) {
  let msg = template;
  Object.entries(data).forEach(([k, v]) => {
    msg = msg.replaceAll(`{{${k}}}`, v);
  });
  window.open(buildWaURL('2348123456789', msg), '_blank');
}
