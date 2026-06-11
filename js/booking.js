// ============================================================
// js/booking.js – Booking, Calendar, Intake, Group Booking
// ============================================================

import { db, collection, addDoc, getDocs, query, where, serverTimestamp } from './utils.js';
import { showToast, buildWaURL, formatDate, initStarPicker } from './utils.js';

// ══════════════════════════════════════════════════════════
// AVAILABILITY CALENDAR
// ══════════════════════════════════════════════════════════
let currentYear, currentMonth;
let selectedDate = null;
let selectedTime = null;
let bookedDates = new Set();

export async function initCalendar() {
  const now = new Date();
  currentYear  = now.getFullYear();
  currentMonth = now.getMonth();
  await loadBookedDates();
  renderCalendar();
  bindCalendarNav();
  bindTimeSlots();
}

async function loadBookedDates() {
  try {
    const snap = await getDocs(collection(db, 'bookings'));
    bookedDates.clear();
    snap.forEach(d => {
      const b = d.data();
      if (b.date && (b.status === 'confirmed' || b.status === 'pending')) {
        bookedDates.add(b.date);
      }
    });
  } catch(e) { /* offline or no data */ }
}

function renderCalendar() {
  const calGrid   = document.getElementById('calGrid');
  const calTitle  = document.getElementById('calTitle');
  if (!calGrid || !calTitle) return;

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  calTitle.textContent = `${monthNames[currentMonth]} ${currentYear}`;

  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();
  today.setHours(0,0,0,0);

  calGrid.innerHTML = '';

  // Empty cells
  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement('div');
    empty.className = 'cal-day empty';
    calGrid.appendChild(empty);
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const cell = document.createElement('div');
    const dateStr = `${currentYear}-${String(currentMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cellDate = new Date(currentYear, currentMonth, d);

    cell.className = 'cal-day';
    cell.textContent = d;

    if (cellDate < today) {
      cell.classList.add('past');
    } else if (bookedDates.has(dateStr)) {
      cell.classList.add('booked');
      cell.title = 'Fully Booked';
    } else {
      cell.classList.add('available');
      cell.addEventListener('click', () => selectDate(dateStr, cell));
    }

    if (dateStr === selectedDate) cell.classList.add('selected');

    // Today highlight
    if (cellDate.toDateString() === today.toDateString()) cell.classList.add('today');

    calGrid.appendChild(cell);
  }
}

function selectDate(dateStr, cell) {
  document.querySelectorAll('.cal-day').forEach(c => c.classList.remove('selected'));
  cell.classList.add('selected');
  selectedDate = dateStr;

  const display = document.getElementById('selectedDateDisplay');
  if (display) {
    const d = new Date(dateStr + 'T12:00:00');
    display.textContent = d.toLocaleDateString('en-NG', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    display.parentElement.style.display = 'block';
  }
  selectedTime = null;
  document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
}

function bindCalendarNav() {
  document.getElementById('calPrev')?.addEventListener('click', () => {
    currentMonth--;
    if (currentMonth < 0) { currentMonth = 11; currentYear--; }
    renderCalendar();
  });
  document.getElementById('calNext')?.addEventListener('click', () => {
    currentMonth++;
    if (currentMonth > 11) { currentMonth = 0; currentYear++; }
    renderCalendar();
  });
}

function bindTimeSlots() {
  document.querySelectorAll('.time-slot:not(.unavailable)').forEach(slot => {
    slot.addEventListener('click', () => {
      document.querySelectorAll('.time-slot').forEach(s => s.classList.remove('selected'));
      slot.classList.add('selected');
      selectedTime = slot.dataset.time;
    });
  });
}

// ── Submit Calendar Booking ──────────────────────────────
export function initCalendarBookingForm() {
  const form = document.getElementById('calBookingForm');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!selectedDate) { showToast('Please select a date first', 'error'); return; }
    if (!selectedTime) { showToast('Please select a time slot', 'error'); return; }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Booking...';

    const data = {
      name:     form.querySelector('[name="name"]').value,
      phone:    form.querySelector('[name="phone"]').value,
      service:  form.querySelector('[name="service"]').value,
      date:     selectedDate,
      time:     selectedTime,
      location: form.querySelector('[name="location"]')?.value || '',
      notes:    form.querySelector('[name="notes"]')?.value || '',
      status:   'pending',
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'bookings'), data);
      showToast('✅ Booking request sent! We\'ll confirm via WhatsApp shortly.', 'success', 5000);
      form.reset();
      selectedDate = null; selectedTime = null;
      renderCalendar();
      // Also send via WhatsApp
      const waMsg = `Hi Lycia! I'd like to book an appointment.\n\n📅 Date: ${selectedDate}\n⏰ Time: ${selectedTime}\n💄 Service: ${data.service}\n👤 Name: ${data.name}\n📞 Phone: ${data.phone}`;
      setTimeout(() => window.open(`https://wa.me/2348123456789?text=${encodeURIComponent(waMsg)}`, '_blank'), 1500);
    } catch(err) {
      showToast('Something went wrong. Please try WhatsApp directly.', 'error');
      console.error(err);
    }
    btn.disabled = false; btn.textContent = '📅 Confirm Booking';
  });
}

// ══════════════════════════════════════════════════════════
// CLIENT INTAKE FORM
// ══════════════════════════════════════════════════════════
export function initIntakeForm() {
  const form = document.getElementById('intakeForm');
  if (!form) return;

  // Skin tone picker
  document.querySelectorAll('.skin-tone').forEach(el => {
    el.addEventListener('click', () => {
      document.querySelectorAll('.skin-tone').forEach(s => s.classList.remove('selected'));
      el.classList.add('selected');
    });
  });

  // Inspo image preview
  const inspoInput = document.getElementById('inspoUpload');
  const inspoPreview = document.getElementById('inspoPreview');
  inspoInput?.addEventListener('change', (e) => {
    inspoPreview.innerHTML = '';
    [...e.target.files].slice(0, 4).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.createElement('img');
        img.src = ev.target.result;
        inspoPreview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  });
  // Click on upload zone
  document.querySelector('.inspo-upload')?.addEventListener('click', () => inspoInput?.click());

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Submitting...';

    const skinTone = document.querySelector('.skin-tone.selected')?.dataset.tone || '';
    const allergies = form.querySelector('[name="allergies"]')?.value || '';
    const lookType  = form.querySelector('[name="lookType"]')?.value || '';
    const occasion  = form.querySelector('[name="occasion"]')?.value || '';
    const concerns  = form.querySelector('[name="concerns"]')?.value || '';
    const bookingId = form.querySelector('[name="bookingId"]')?.value || '';

    const data = {
      name:       form.querySelector('[name="name"]').value,
      phone:      form.querySelector('[name="phone"]').value,
      email:      form.querySelector('[name="email"]')?.value || '',
      skinTone, lookType, occasion, allergies, concerns, bookingId,
      hasInspoPhotos: inspoInput?.files?.length > 0,
      createdAt:  serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'intakeForms'), data);
      showToast('✅ Intake form submitted! Lycia will review your details.', 'success', 5000);
      form.reset();
      inspoPreview.innerHTML = '';
      document.querySelectorAll('.skin-tone').forEach(s => s.classList.remove('selected'));
    } catch(err) {
      showToast('Submission failed. Please try again.', 'error');
      console.error(err);
    }
    btn.disabled = false; btn.textContent = '💄 Submit Intake Form';
  });
}

// ══════════════════════════════════════════════════════════
// GROUP BOOKING
// ══════════════════════════════════════════════════════════
export function initGroupBooking() {
  const form = document.getElementById('groupBookingForm');
  if (!form) return;

  let selectedPackage = '';
  let peopleCount = 2;

  // Package selector
  document.querySelectorAll('.group-pkg').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.group-pkg').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      selectedPackage = card.dataset.package;
    });
  });

  // People counter
  document.getElementById('decreasePeople')?.addEventListener('click', () => {
    if (peopleCount > 2) { peopleCount--; document.getElementById('peopleCount').textContent = peopleCount; }
  });
  document.getElementById('increasePeople')?.addEventListener('click', () => {
    if (peopleCount < 20) { peopleCount++; document.getElementById('peopleCount').textContent = peopleCount; }
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Sending...';

    const data = {
      name:      form.querySelector('[name="name"]').value,
      phone:     form.querySelector('[name="phone"]').value,
      email:     form.querySelector('[name="email"]')?.value || '',
      event:     form.querySelector('[name="event"]').value,
      date:      form.querySelector('[name="date"]').value,
      location:  form.querySelector('[name="location"]').value,
      package:   selectedPackage,
      people:    peopleCount,
      notes:     form.querySelector('[name="notes"]')?.value || '',
      status:    'pending',
      type:      'group',
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'bookings'), data);
      showToast('✅ Group booking request sent!', 'success', 5000);
      form.reset();
      const waMsg = `Hi Lycia! I'd like to book a group appointment.\n\n👥 People: ${peopleCount}\n📦 Package: ${selectedPackage}\n📅 Date: ${data.date}\n🎉 Event: ${data.event}\n📍 Location: ${data.location}\n👤 Name: ${data.name}`;
      setTimeout(() => window.open(`https://wa.me/2348123456789?text=${encodeURIComponent(waMsg)}`, '_blank'), 1500);
    } catch(err) {
      showToast('Submission failed. Please try again.', 'error');
    }
    btn.disabled = false; btn.textContent = '💬 Send Group Booking Request';
  });
}

// ══════════════════════════════════════════════════════════
// TESTIMONIAL SUBMISSION
// ══════════════════════════════════════════════════════════
export function initTestimonialSubmit() {
  const form = document.getElementById('testimonialForm');
  if (!form) return;

  let rating = 5;
  const starContainer = document.querySelector('.star-picker');
  if (starContainer) {
    const getRating = initStarPicker(starContainer, (r) => { rating = r; });
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Submitting...';

    const data = {
      name:     form.querySelector('[name="name"]').value,
      role:     form.querySelector('[name="role"]')?.value || 'Client',
      service:  form.querySelector('[name="service"]').value,
      review:   form.querySelector('[name="review"]').value,
      rating:   rating,
      approved: false,
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'testimonials'), data);
      showToast('✅ Thank you for your review! It will appear after approval.', 'success', 5000);
      form.reset();
      document.querySelectorAll('.star-btn').forEach((s,i) => s.classList.toggle('active', i < 4));
    } catch(err) {
      showToast('Submission failed. Please try again.', 'error');
      console.error(err);
    }
    btn.disabled = false; btn.textContent = '⭐ Submit Review';
  });
}

// ══════════════════════════════════════════════════════════
// GENERAL BOOKING FORM (Contact Section)
// ══════════════════════════════════════════════════════════
export function initContactForm() {
  const form = document.getElementById('contactBookingForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true; btn.textContent = 'Sending...';

    const data = {
      name:     `${form.querySelector('[name="firstName"]').value} ${form.querySelector('[name="lastName"]')?.value || ''}`.trim(),
      phone:    form.querySelector('[name="phone"]').value,
      service:  form.querySelector('[name="service"]').value,
      date:     form.querySelector('[name="date"]')?.value || '',
      location: form.querySelector('[name="location"]')?.value || '',
      notes:    form.querySelector('[name="notes"]')?.value || '',
      status:   'pending',
      type:     'general',
      createdAt: serverTimestamp()
    };

    try {
      await addDoc(collection(db, 'bookings'), data);
      showToast('✅ Booking request sent! We\'ll contact you soon.', 'success', 5000);
      form.reset();
    } catch(err) {
      showToast('Something went wrong. Please try WhatsApp.', 'error');
    }
    btn.disabled = false; btn.textContent = '📅 Send Booking Request';
  });
}

// ══════════════════════════════════════════════════════════
// NEWSLETTER
// ══════════════════════════════════════════════════════════
export function initNewsletter() {
  document.querySelectorAll('.newsletter-form, #newsletterForm').forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = form.querySelector('input[type="email"]');
      if (!input?.value) return;
      try {
        await addDoc(collection(db, 'newsletter'), { email: input.value, createdAt: serverTimestamp() });
        showToast('✅ You\'re subscribed! Expect beauty tips soon.', 'success');
        input.value = '';
      } catch(err) {
        showToast('Subscription failed. Please try again.', 'error');
      }
    });
  });
}
