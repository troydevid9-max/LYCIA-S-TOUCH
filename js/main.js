// ============================================================
// js/main.js – App Entry Point
// ============================================================

import {
  initReveal,
  initCounters,
  initScrollProgress,
  initSmoothNav,
  initMobileMenu,
  initFaq,
  initModals,
} from "./utils.js";
import {
  initCalendar,
  initCalendarBookingForm,
  initIntakeForm,
  initGroupBooking,
  initTestimonialSubmit,
  initContactForm,
  initNewsletter,
} from "./booking.js";
import {
  initPortfolio,
  initReels,
  initLookbook,
  initBeforeAfter,
  initTestimonialsCarousel,
} from "./gallery.js";
import { initWaTemplates } from "./whatsapp.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Core
  initScrollProgress();
  initSmoothNav();
  initMobileMenu();
  initReveal();
  initCounters();
  initModals();
  initFaq();

  // Gallery & Media
  initPortfolio();
  initReels();
  initLookbook();
  initBeforeAfter();

  // Testimonials
  await initTestimonialsCarousel();

  // Booking
  await initCalendar();
  initCalendarBookingForm();
  initIntakeForm();
  initGroupBooking();
  initTestimonialSubmit();
  initContactForm();
  initNewsletter();

  // WhatsApp Templates
  initWaTemplates();

  // Active nav on scroll
  initScrollSpy();
});

function initScrollSpy() {
  const sections = document.querySelectorAll("section[id], div[id]");
  const navLinks = document.querySelectorAll(".nav-links a");
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          navLinks.forEach((a) => {
            a.classList.toggle(
              "active",
              a.getAttribute("href") === `#${entry.target.id}`,
            );
          });
        }
      });
    },
    { threshold: 0.4 },
  );
  sections.forEach((s) => io.observe(s));
}
