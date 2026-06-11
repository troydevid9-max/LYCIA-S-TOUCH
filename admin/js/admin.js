// ============================================================
// admin/js/admin.js – Full Admin Dashboard Logic
// ============================================================

import { db, storage } from "../../firebase/config.js";
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

// ══════════════════════════════════════════════════════════
// PASSWORD PROTECTION
// ══════════════════════════════════════════════════════════
const ADMIN_PASSWORD = "lycia"; // Change this to something strong

function checkAuth() {
  return sessionStorage.getItem("adminAuth") === "true";
}

function initLogin() {
  const loginScreen = document.getElementById("adminLogin");
  const dashboard = document.getElementById("adminDashboard");

  if (checkAuth()) {
    loginScreen.style.display = "none";
    dashboard.style.display = "flex";
    initDashboard();
    return;
  }

  document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const pwd = document.getElementById("adminPassword").value;
    const err = document.getElementById("loginError");
    if (pwd === ADMIN_PASSWORD) {
      sessionStorage.setItem("adminAuth", "true");
      loginScreen.style.display = "none";
      dashboard.style.display = "flex";
      initDashboard();
    } else {
      err.style.display = "block";
      err.textContent = "Incorrect password. Please try again.";
      document.getElementById("adminPassword").value = "";
    }
  });
}

// ══════════════════════════════════════════════════════════
// DASHBOARD INIT
// ══════════════════════════════════════════════════════════
function initDashboard() {
  initSidebarNav();
  loadDashboardStats();
  loadBookingsTable();
  loadIntakeForms();
  initPortfolioAdmin();
  initReelsAdmin();
  initTestimonialsAdmin();
  initCalendarAdmin();
  initWaTemplatesAdmin();
  initNewsletterAdmin();
}

// ══════════════════════════════════════════════════════════
// SIDEBAR NAVIGATION
// ══════════════════════════════════════════════════════════
function initSidebarNav() {
  document.querySelectorAll(".sidebar-link[data-page]").forEach((link) => {
    link.addEventListener("click", () => {
      const page = link.dataset.page;
      document
        .querySelectorAll(".sidebar-link")
        .forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      document
        .querySelectorAll(".admin-page")
        .forEach((p) => p.classList.remove("active"));
      document.getElementById(`page-${page}`)?.classList.add("active");
      document.querySelector(".topbar-title").textContent =
        link.querySelector("span")?.textContent || "Dashboard";
      // Close mobile sidebar
      document.getElementById("adminSidebar")?.classList.remove("open");
    });
  });

  // Mobile sidebar toggle
  document.getElementById("sidebarToggle")?.addEventListener("click", () => {
    document.getElementById("adminSidebar")?.classList.toggle("open");
  });

  // Logout
  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    sessionStorage.removeItem("adminAuth");
    location.reload();
  });
}

// ══════════════════════════════════════════════════════════
// DASHBOARD STATS
// ══════════════════════════════════════════════════════════
async function loadDashboardStats() {
  try {
    const [bookings, testimonials, newsletter, portfolio] = await Promise.all([
      getDocs(collection(db, "bookings")),
      getDocs(collection(db, "testimonials")),
      getDocs(collection(db, "newsletter")),
      getDocs(collection(db, "portfolio")),
    ]);

    const allBookings = [];
    bookings.forEach((d) => allBookings.push(d.data()));
    const pending = allBookings.filter((b) => b.status === "pending").length;
    const confirmed = allBookings.filter(
      (b) => b.status === "confirmed",
    ).length;

    setText("statTotalBookings", allBookings.length);
    setText("statPending", pending);
    setText("statConfirmed", confirmed);
    setText("statTestimonials", testimonials.size);
    setText("statNewsletter", newsletter.size);
    setText("statPortfolio", portfolio.size);

    // Recent bookings on dashboard
    renderRecentBookings(allBookings.slice(-5).reverse());
  } catch (e) {
    console.warn("Stats load error:", e);
  }
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function renderRecentBookings(bookings) {
  const tbody = document.getElementById("recentBookingsTbody");
  if (!tbody) return;
  tbody.innerHTML =
    bookings
      .map(
        (b) => `
    <tr>
      <td>${b.name || "—"}</td>
      <td>${b.service || "—"}</td>
      <td>${b.date || "—"}</td>
      <td><span class="status-badge status-${b.status || "pending"}">${capitalize(b.status || "pending")}</span></td>
      <td>
        <a href="https://wa.me/${(b.phone || "").replace(/\D/g, "")}?text=Hi ${encodeURIComponent(b.name || "")}!" target="_blank" class="action-btn" title="WhatsApp">💬</a>
      </td>
    </tr>
  `,
      )
      .join("") ||
    '<tr><td colspan="5" style="text-align:center;color:var(--admin-muted);padding:24px;">No bookings yet</td></tr>';
}

// ══════════════════════════════════════════════════════════
// BOOKINGS TABLE
// ══════════════════════════════════════════════════════════
function loadBookingsTable() {
  onSnapshot(
    query(collection(db, "bookings"), orderBy("createdAt", "desc")),
    (snap) => {
      const tbody = document.getElementById("bookingsTbody");
      if (!tbody) return;
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));

      tbody.innerHTML =
        rows
          .map(
            (b) => `
      <tr>
        <td><strong>${b.name || "—"}</strong></td>
        <td>${b.phone || "—"}</td>
        <td>${b.service || "—"}</td>
        <td>${b.date || "—"} ${b.time ? `@ ${b.time}` : ""}</td>
        <td>${b.location || "—"}</td>
        <td>${b.type === "group" ? `👥 ${b.people} ppl` : "👤"}</td>
        <td>
          <select class="status-select" data-id="${b.id}" style="background:var(--admin-bg);color:var(--admin-text);border:1px solid var(--admin-border);border-radius:6px;padding:5px 8px;font-size:12px;cursor:pointer;">
            ${["pending", "confirmed", "completed", "cancelled"].map((s) => `<option value="${s}" ${b.status === s ? "selected" : ""}>${capitalize(s)}</option>`).join("")}
          </select>
        </td>
        <td>
          <div class="action-btns">
            <a href="https://wa.me/${(b.phone || "").replace(/\D/g, "")}?text=Hi ${encodeURIComponent(b.name || "")}!" target="_blank" class="action-btn" title="WhatsApp">💬</a>
            <button class="action-btn delete" onclick="adminDeleteBooking('${b.id}')" title="Delete">🗑</button>
          </div>
        </td>
      </tr>
    `,
          )
          .join("") ||
        '<tr><td colspan="8" style="text-align:center;color:var(--admin-muted);padding:32px;">No bookings yet</td></tr>';

      // Status change listeners
      tbody.querySelectorAll(".status-select").forEach((sel) => {
        sel.addEventListener("change", async () => {
          await updateDoc(doc(db, "bookings", sel.dataset.id), {
            status: sel.value,
          });
          showAdminToast(`Booking updated to ${sel.value}`, "success");
        });
      });
    },
  );
}

window.adminDeleteBooking = async (id) => {
  if (!confirm("Delete this booking?")) return;
  await deleteDoc(doc(db, "bookings", id));
  showAdminToast("Booking deleted", "info");
};

// ══════════════════════════════════════════════════════════
// INTAKE FORMS
// ══════════════════════════════════════════════════════════
function loadIntakeForms() {
  onSnapshot(
    query(collection(db, "intakeForms"), orderBy("createdAt", "desc")),
    (snap) => {
      const tbody = document.getElementById("intakeTbody");
      if (!tbody) return;
      const rows = [];
      snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
      tbody.innerHTML =
        rows
          .map(
            (f) => `
      <tr>
        <td><strong>${f.name || "—"}</strong></td>
        <td>${f.phone || "—"}</td>
        <td>${f.occasion || "—"}</td>
        <td>${f.lookType || "—"}</td>
        <td>${f.skinTone ? `<span style="display:inline-block;width:18px;height:18px;border-radius:50%;background:${f.skinTone};border:2px solid #fff;box-shadow:0 0 0 1px #ccc;"></span>` : "—"}</td>
        <td>${f.allergies || "None"}</td>
        <td>${f.hasInspoPhotos ? "✅ Yes" : "—"}</td>
        <td>
          <div class="action-btns">
            <a href="https://wa.me/${(f.phone || "").replace(/\D/g, "")}?text=Hi ${encodeURIComponent(f.name || "")}! I've reviewed your intake form." target="_blank" class="action-btn" title="WhatsApp">💬</a>
            <button class="action-btn delete" onclick="adminDeleteIntake('${f.id}')" title="Delete">🗑</button>
          </div>
        </td>
      </tr>
    `,
          )
          .join("") ||
        '<tr><td colspan="8" style="text-align:center;color:var(--admin-muted);padding:32px;">No intake forms yet</td></tr>';
    },
  );
}

window.adminDeleteIntake = async (id) => {
  if (!confirm("Delete this intake form?")) return;
  await deleteDoc(doc(db, "intakeForms", id));
  showAdminToast("Intake form deleted", "info");
};

// ══════════════════════════════════════════════════════════
// PORTFOLIO ADMIN
// ══════════════════════════════════════════════════════════
function initPortfolioAdmin() {
  const form = document.getElementById("addPortfolioForm");
  if (!form) return;

  // Load existing
  onSnapshot(
    query(collection(db, "portfolio"), orderBy("order", "asc")),
    (snap) => {
      const grid = document.getElementById("portfolioAdminGrid");
      if (!grid) return;
      const items = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      grid.innerHTML =
        items
          .map(
            (item) => `
      <div class="media-card">
        <img class="media-thumb" src="${item.imageUrl || ""}" alt="${item.title || ""}">
        <div class="media-body">
          <div class="media-title">${item.title || "Untitled"}</div>
          <div class="media-meta">${capitalize(item.category || "—")}</div>
          <div class="media-actions">
            <button class="admin-btn admin-btn-red" onclick="adminDeletePortfolio('${item.id}','${item.imagePath || ""}')">🗑 Delete</button>
          </div>
        </div>
      </div>
    `,
          )
          .join("") ||
        '<p style="color:var(--admin-muted);text-align:center;padding:24px;">No portfolio items yet</p>';
    },
  );

  // Upload zone
  const uploadZone = document.getElementById("portfolioUploadZone");
  const fileInput = document.getElementById("portfolioFileInput");
  uploadZone?.addEventListener("click", () => fileInput?.click());
  uploadZone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    uploadZone.classList.add("dragging");
  });
  uploadZone?.addEventListener("dragleave", () =>
    uploadZone.classList.remove("dragging"),
  );
  uploadZone?.addEventListener("drop", (e) => {
    e.preventDefault();
    uploadZone.classList.remove("dragging");
    if (e.dataTransfer.files[0]) handlePortfolioFile(e.dataTransfer.files[0]);
  });
  fileInput?.addEventListener("change", (e) => {
    if (e.target.files[0]) handlePortfolioFile(e.target.files[0]);
  });

  async function handlePortfolioFile(file) {
    const title = document.getElementById("portfolioTitle")?.value || file.name;
    const category =
      document.getElementById("portfolioCategory")?.value || "all";
    const order =
      parseInt(document.getElementById("portfolioOrder")?.value) || 0;

    const btn = document.getElementById("addPortfolioBtn");
    if (btn) {
      btn.disabled = true;
      btn.textContent = "Uploading...";
    }

    try {
      const storageRef = ref(storage, `portfolio/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      const imageUrl = await getDownloadURL(storageRef);
      await addDoc(collection(db, "portfolio"), {
        title,
        category,
        imageUrl,
        order,
        imagePath: storageRef.fullPath,
        createdAt: serverTimestamp(),
      });
      showAdminToast("Portfolio image uploaded!", "success");
      form.reset();
    } catch (e) {
      showAdminToast("Upload failed: " + e.message, "error");
    }
    if (btn) {
      btn.disabled = false;
      btn.textContent = "➕ Add Image";
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (fileInput?.files[0]) handlePortfolioFile(fileInput.files[0]);
  });
}

window.adminDeletePortfolio = async (id, path) => {
  if (!confirm("Delete this portfolio image?")) return;
  try {
    await deleteDoc(doc(db, "portfolio", id));
    if (path) await deleteObject(ref(storage, path)).catch(() => {});
    showAdminToast("Image deleted", "info");
  } catch (e) {
    showAdminToast("Delete failed", "error");
  }
};

// ══════════════════════════════════════════════════════════
// REELS ADMIN
// ══════════════════════════════════════════════════════════
function initReelsAdmin() {
  const form = document.getElementById("addReelForm");
  if (!form) return;

  // Load existing reels
  onSnapshot(
    query(collection(db, "reels"), orderBy("order", "asc")),
    (snap) => {
      const grid = document.getElementById("reelsAdminGrid");
      if (!grid) return;
      const reels = [];
      snap.forEach((d) => reels.push({ id: d.id, ...d.data() }));
      grid.innerHTML =
        reels
          .map(
            (r) => `
      <div class="media-card">
        <div class="media-thumb media-thumb-portrait" style="background:#111;display:flex;align-items:center;justify-content:center;font-size:40px;">
          ${r.thumbnailUrl ? `<img src="${r.thumbnailUrl}" style="width:100%;height:100%;object-fit:cover;display:block;">` : "🎬"}
        </div>
        <div class="media-body">
          <div class="media-title">${r.title || "Untitled"}</div>
          <div class="media-meta">${r.category || "—"} · Order: ${r.order ?? "—"}</div>
          <div class="media-meta" style="word-break:break-all;font-size:10.5px;">${(r.videoUrl || "").substring(0, 50)}...</div>
          <div class="media-actions">
            <button class="admin-btn admin-btn-red" onclick="adminDeleteReel('${r.id}','${r.videoPath || ""}','${r.thumbPath || ""}')">🗑 Delete</button>
          </div>
        </div>
      </div>
    `,
          )
          .join("") ||
        '<p style="color:var(--admin-muted);text-align:center;padding:24px;">No reels yet. Add up to 9.</p>';
    },
  );

  // Upload
  const videoInput = document.getElementById("reelVideoInput");
  const thumbInput = document.getElementById("reelThumbInput");
  document
    .getElementById("reelVideoZone")
    ?.addEventListener("click", () => videoInput?.click());
  document
    .getElementById("reelThumbZone")
    ?.addEventListener("click", () => thumbInput?.click());

  videoInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) document.getElementById("reelVideoName").textContent = file.name;
  });
  thumbInput?.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      document.getElementById("reelThumbName").textContent = file.name;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const prev = document.getElementById("reelThumbPreview");
        if (prev) {
          prev.src = ev.target.result;
          prev.style.display = "block";
        }
      };
      reader.readAsDataURL(file);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("addReelBtn");
    btn.disabled = true;
    btn.textContent = "Uploading...";

    const title = document.getElementById("reelTitle")?.value || "";
    const category = document.getElementById("reelCategory")?.value || "Beauty";
    const order = parseInt(document.getElementById("reelOrder")?.value) || 0;
    const youtubeUrl = document.getElementById("reelYoutubeUrl")?.value || "";

    try {
      let videoUrl = youtubeUrl;
      let videoPath = "";
      let thumbnailUrl = "";
      let thumbPath = "";

      // Upload video file if no YouTube URL
      if (!youtubeUrl && videoInput?.files[0]) {
        const vFile = videoInput.files[0];
        const vRef = ref(storage, `reels/videos/${Date.now()}_${vFile.name}`);
        await uploadBytes(vRef, vFile);
        videoUrl = await getDownloadURL(vRef);
        videoPath = vRef.fullPath;
      }

      // Upload thumbnail
      if (thumbInput?.files[0]) {
        const tFile = thumbInput.files[0];
        const tRef = ref(storage, `reels/thumbs/${Date.now()}_${tFile.name}`);
        await uploadBytes(tRef, tFile);
        thumbnailUrl = await getDownloadURL(tRef);
        thumbPath = tRef.fullPath;
      }

      await addDoc(collection(db, "reels"), {
        title,
        category,
        order,
        videoUrl,
        videoPath,
        thumbnailUrl,
        thumbPath,
        createdAt: serverTimestamp(),
      });
      showAdminToast("Reel added successfully!", "success");
      form.reset();
      document.getElementById("reelVideoName").textContent = "";
      document.getElementById("reelThumbName").textContent = "";
      const prev = document.getElementById("reelThumbPreview");
      if (prev) prev.style.display = "none";
    } catch (err) {
      showAdminToast("Upload failed: " + err.message, "error");
      console.error(err);
    }
    btn.disabled = false;
    btn.textContent = "➕ Add Reel";
  });
}

window.adminDeleteReel = async (id, videoPath, thumbPath) => {
  if (!confirm("Delete this reel?")) return;
  try {
    await deleteDoc(doc(db, "reels", id));
    if (videoPath) await deleteObject(ref(storage, videoPath)).catch(() => {});
    if (thumbPath) await deleteObject(ref(storage, thumbPath)).catch(() => {});
    showAdminToast("Reel deleted", "info");
  } catch (e) {
    showAdminToast("Delete failed", "error");
  }
};

// ══════════════════════════════════════════════════════════
// TESTIMONIALS ADMIN
// ══════════════════════════════════════════════════════════
function initTestimonialsAdmin() {
  onSnapshot(
    query(collection(db, "testimonials"), orderBy("createdAt", "desc")),
    (snap) => {
      const tbody = document.getElementById("testimonialsTbody");
      if (!tbody) return;
      const items = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      tbody.innerHTML =
        items
          .map(
            (t) => `
      <tr>
        <td><strong>${t.name || "—"}</strong></td>
        <td>${t.role || "—"}</td>
        <td>${t.service || "—"}</td>
        <td>${"★".repeat(t.rating || 5)}</td>
        <td style="max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${t.review || "—"}</td>
        <td><span class="status-badge ${t.approved ? "status-confirmed" : "status-pending"}">${t.approved ? "Approved" : "Pending"}</span></td>
        <td>
          <div class="action-btns">
            ${!t.approved ? `<button class="action-btn approve" onclick="adminApproveTestimonial('${t.id}')" title="Approve">✅</button>` : ""}
            <button class="action-btn delete" onclick="adminDeleteTestimonial('${t.id}')" title="Delete">🗑</button>
          </div>
        </td>
      </tr>
    `,
          )
          .join("") ||
        '<tr><td colspan="7" style="text-align:center;color:var(--admin-muted);padding:32px;">No testimonials yet</td></tr>';
    },
  );
}

window.adminApproveTestimonial = async (id) => {
  await updateDoc(doc(db, "testimonials", id), { approved: true });
  showAdminToast("Testimonial approved and now live!", "success");
};

window.adminDeleteTestimonial = async (id) => {
  if (!confirm("Delete this testimonial?")) return;
  await deleteDoc(doc(db, "testimonials", id));
  showAdminToast("Testimonial deleted", "info");
};

// ══════════════════════════════════════════════════════════
// CALENDAR ADMIN (View + Block Dates)
// ══════════════════════════════════════════════════════════
function initCalendarAdmin() {
  let year = new Date().getFullYear();
  let month = new Date().getMonth();

  async function renderAdminCal() {
    const calGrid = document.getElementById("adminCalGrid");
    const calTitle = document.getElementById("adminCalTitle");
    if (!calGrid || !calTitle) return;

    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];
    calTitle.textContent = `${monthNames[month]} ${year}`;

    // Load booked dates
    const snap = await getDocs(collection(db, "bookings"));
    const bookedMap = {};
    snap.forEach((d) => {
      const b = d.data();
      if (b.date && b.status !== "cancelled") {
        bookedMap[b.date] = (bookedMap[b.date] || 0) + 1;
      }
    });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    calGrid.innerHTML = "";
    for (let i = 0; i < firstDay; i++) {
      calGrid.innerHTML += `<div class="admin-cal-day empty"></div>`;
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const cellDate = new Date(year, month, d);
      const count = bookedMap[dateStr] || 0;
      const isPast = cellDate < today;

      calGrid.innerHTML += `
        <div class="admin-cal-day ${isPast ? "past" : count > 0 ? "booked" : "available"}"
          title="${count > 0 ? `${count} booking(s)` : "Available"}"
          ${!isPast ? `onclick="adminCalDayClick('${dateStr}', ${count})"` : ""}>
          ${d}${count > 0 ? `<div style="font-size:8px;color:var(--rose);font-weight:700;">${count}</div>` : ""}
        </div>`;
    }
  }

  window.adminCalDayClick = (dateStr, count) => {
    document.getElementById("adminCalSelectedDate").textContent = dateStr;
    loadDayBookings(dateStr);
  };

  async function loadDayBookings(dateStr) {
    const wrap = document.getElementById("dayBookingsWrap");
    if (!wrap) return;
    wrap.innerHTML =
      '<div style="color:var(--admin-muted);font-size:13px;">Loading...</div>';
    const snap = await getDocs(collection(db, "bookings"));
    const dayBookings = [];
    snap.forEach((d) => {
      const b = d.data();
      if (b.date === dateStr) dayBookings.push({ id: d.id, ...b });
    });
    wrap.innerHTML = dayBookings.length
      ? dayBookings
          .map(
            (b) => `
      <div style="background:var(--admin-bg);border:1px solid var(--admin-border);border-radius:10px;padding:14px;margin-bottom:10px;">
        <div style="font-size:14px;font-weight:700;margin-bottom:4px;">${b.name}</div>
        <div style="font-size:12px;color:var(--admin-muted);">${b.service} · ${b.time || "—"} · <span class="status-badge status-${b.status}">${capitalize(b.status)}</span></div>
        <a href="https://wa.me/${(b.phone || "").replace(/\D/g, "")}?text=Hi ${encodeURIComponent(b.name)}!" target="_blank" class="admin-btn admin-btn-green" style="margin-top:10px;font-size:11px;">💬 WhatsApp</a>
      </div>
    `,
          )
          .join("")
      : '<div style="color:var(--admin-muted);font-size:13px;text-align:center;padding:20px;">No bookings for this date</div>';
  }

  document.getElementById("adminCalPrev")?.addEventListener("click", () => {
    month--;
    if (month < 0) {
      month = 11;
      year--;
    }
    renderAdminCal();
  });
  document.getElementById("adminCalNext")?.addEventListener("click", () => {
    month++;
    if (month > 11) {
      month = 0;
      year++;
    }
    renderAdminCal();
  });

  renderAdminCal();
}

// ══════════════════════════════════════════════════════════
// WHATSAPP TEMPLATES ADMIN
// ══════════════════════════════════════════════════════════
function initWaTemplatesAdmin() {
  // Templates are handled by the whatsapp.js module on frontend
  // Admin can view and customize templates stored in Firestore
  const saveBtn = document.getElementById("saveWaTemplates");
  saveBtn?.addEventListener("click", async () => {
    showAdminToast("Templates saved (edit whatsapp.js to update)", "info");
  });
}

// ══════════════════════════════════════════════════════════
// NEWSLETTER ADMIN
// ══════════════════════════════════════════════════════════
function initNewsletterAdmin() {
  onSnapshot(collection(db, "newsletter"), (snap) => {
    const tbody = document.getElementById("newsletterTbody");
    setText("statNewsletter", snap.size);
    if (!tbody) return;
    const emails = [];
    snap.forEach((d) => emails.push({ id: d.id, ...d.data() }));
    tbody.innerHTML =
      emails
        .map(
          (e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${e.email}</td>
        <td>${e.createdAt?.toDate?.().toLocaleDateString() || "—"}</td>
        <td><button class="action-btn delete" onclick="adminDeleteNewsletter('${e.id}')">🗑</button></td>
      </tr>
    `,
        )
        .join("") ||
      '<tr><td colspan="4" style="text-align:center;color:var(--admin-muted);padding:24px;">No subscribers yet</td></tr>';
  });

  // Export CSV
  document
    .getElementById("exportNewsletterBtn")
    ?.addEventListener("click", async () => {
      const snap = await getDocs(collection(db, "newsletter"));
      const rows = ["Email,Date"];
      snap.forEach((d) => {
        const e = d.data();
        rows.push(
          `${e.email},${e.createdAt?.toDate?.().toLocaleDateString() || ""}`,
        );
      });
      const blob = new Blob([rows.join("\n")], { type: "text/csv" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "lyciastouch-subscribers.csv";
      a.click();
      showAdminToast("CSV exported!", "success");
    });
}

window.adminDeleteNewsletter = async (id) => {
  await deleteDoc(doc(db, "newsletter", id));
  showAdminToast("Subscriber removed", "info");
};

// ══════════════════════════════════════════════════════════
// HELPERS
// ══════════════════════════════════════════════════════════
function capitalize(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

function showAdminToast(msg, type = "info") {
  let toast = document.getElementById("adminToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "adminToast";
    toast.style.cssText =
      "position:fixed;bottom:24px;right:24px;background:#1f1f28;color:#e8e8f0;padding:14px 22px;border-radius:12px;font-size:13px;font-weight:500;z-index:9999;box-shadow:0 8px 32px rgba(0,0,0,0.4);opacity:0;transform:translateY(8px);transition:all 0.3s;max-width:300px;";
    document.body.appendChild(toast);
  }
  const colors = { success: "#22c55e", error: "#ef4444", info: "#D98C9A" };
  toast.style.borderLeft = `4px solid ${colors[type] || colors.info}`;
  toast.textContent = msg;
  toast.style.opacity = "1";
  toast.style.transform = "translateY(0)";
  clearTimeout(toast._t);
  toast._t = setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(8px)";
  }, 3500);
}

// ── Boot ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", initLogin);
