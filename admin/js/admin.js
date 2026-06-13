// ============================================================
// admin/js/admin.js – Full Admin Dashboard (self-contained)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  where,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
// Storage: replaced by Cloudinary

// ── Firebase Init ────────────────────────────────────────
const app = initializeApp(window.__FIREBASE_CONFIG__);
const db = getFirestore(app);
// No Firebase Storage — using Cloudinary

// ── Cloudinary Config (replaces Firebase Storage) ────────
const CLOUDINARY_CLOUD = "dhp6yr5qe";
const CLOUDINARY_PRESET = "lycia's-touch";

async function uploadToCloudinary(file, folder = "lycias-touch") {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_PRESET);
  formData.append("folder", folder);

  const resourceType = file.type.startsWith("video/") ? "video" : "image";
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD}/${resourceType}/upload`,
    { method: "POST", body: formData }
  );
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Cloudinary upload failed");
  }
  const data = await res.json();
  return { url: data.secure_url, publicId: data.public_id };
}


// ── Admin Password ────────────────────────────────────────
const ADMIN_PASSWORD = "lycia"; // ← CHANGE THIS BEFORE GOING LIVE

// ════════════════════════════════════════════════════════
// LOGIN
// ════════════════════════════════════════════════════════
function initLogin() {
  const loginScreen = document.getElementById("adminLogin");
  const dashboard = document.getElementById("adminDashboard");

  if (sessionStorage.getItem("adminAuth") === "true") {
    loginScreen.style.display = "none";
    dashboard.style.display = "flex";
    initDashboard();
    return;
  }

  document.getElementById("loginForm")?.addEventListener("submit", (e) => {
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
      err.textContent = "❌ Incorrect password. Please try again.";
      document.getElementById("adminPassword").value = "";
    }
  });
}

// ════════════════════════════════════════════════════════
// DASHBOARD INIT
// ════════════════════════════════════════════════════════
function initDashboard() {
  initSidebarNav();
  loadStats();
  loadBookingsTable();
  loadIntakeForms();
  initPortfolioAdmin();
  initReelsAdmin();
  initTestimonialsAdmin();
  initCalendarAdmin();
  initNewsletterAdmin();
}

// ════════════════════════════════════════════════════════
// SIDEBAR
// ════════════════════════════════════════════════════════
function initSidebarNav() {
  document.querySelectorAll(".sidebar-link[data-page]").forEach((link) => {
    link.addEventListener("click", () => {
      document
        .querySelectorAll(".sidebar-link")
        .forEach((l) => l.classList.remove("active"));
      link.classList.add("active");
      document
        .querySelectorAll(".admin-page")
        .forEach((p) => p.classList.remove("active"));
      document
        .getElementById(`page-${link.dataset.page}`)
        ?.classList.add("active");
      document.querySelector(".topbar-title").textContent =
        link.querySelector("span:last-child")?.textContent || "Dashboard";
      document.getElementById("adminSidebar")?.classList.remove("open");
    });
  });

  document.getElementById("sidebarToggle")?.addEventListener("click", () => {
    document.getElementById("adminSidebar")?.classList.toggle("open");
  });

  document.getElementById("logoutBtn")?.addEventListener("click", () => {
    sessionStorage.removeItem("adminAuth");
    location.reload();
  });
}

// ════════════════════════════════════════════════════════
// STATS
// ════════════════════════════════════════════════════════
async function loadStats() {
  try {
    const [bookSnap, testiSnap, newsSnap, portSnap, reelSnap] =
      await Promise.all([
        getDocs(collection(db, "bookings")),
        getDocs(collection(db, "testimonials")),
        getDocs(collection(db, "newsletter")),
        getDocs(collection(db, "portfolio")),
        getDocs(collection(db, "reels")),
      ]);

    const bookings = [];
    bookSnap.forEach((d) => bookings.push(d.data()));
    const pending = bookings.filter((b) => b.status === "pending").length;
    const confirmed = bookings.filter((b) => b.status === "confirmed").length;

    setText("statTotalBookings", bookings.length);
    setText("statPending", pending);
    setText("statConfirmed", confirmed);
    setText("statTestimonials", testiSnap.size);
    setText("statNewsletter", newsSnap.size);
    setText("statNewsletter2", newsSnap.size);
    setText("statPortfolio", portSnap.size);

    // Pending badge in sidebar
    const badge = document.getElementById("pendingCount");
    if (badge) badge.textContent = pending;

    // Recent bookings on overview
    const recent = [];
    bookSnap.forEach((d) => recent.push({ id: d.id, ...d.data() }));
    recent.sort(
      (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
    );
    renderRecentBookings(recent.slice(0, 6));
  } catch (e) {
    console.error("Stats error:", e);
  }
}

function renderRecentBookings(bookings) {
  const tbody = document.getElementById("recentBookingsTbody");
  if (!tbody) return;
  if (!bookings.length) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:32px;color:var(--admin-muted);">No bookings yet. Submit a test booking from the website!</td></tr>`;
    return;
  }
  tbody.innerHTML = bookings
    .map(
      (b) => `
    <tr>
      <td><strong>${b.name || "—"}</strong></td>
      <td>${b.service || "—"}</td>
      <td>${b.date || "—"}</td>
      <td><span class="status-badge status-${b.status || "pending"}">${cap(b.status || "pending")}</span></td>
      <td>
        <a href="https://wa.me/${(b.phone || "").replace(/\D/g, "")}?text=Hi ${encodeURIComponent(b.name || "")}!"
           target="_blank" class="action-btn" title="WhatsApp">💬</a>
      </td>
    </tr>`,
    )
    .join("");
}

// ════════════════════════════════════════════════════════
// BOOKINGS TABLE (live)
// ════════════════════════════════════════════════════════
function loadBookingsTable() {
  const tbody = document.getElementById("bookingsTbody");
  if (!tbody) return;

  tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--admin-muted);">
    <div style="width:32px;height:32px;border:3px solid rgba(217,140,154,0.3);border-top-color:var(--rose);border-radius:50%;animation:spin 0.7s linear infinite;margin:0 auto 12px;"></div>Loading bookings...
  </td></tr>`;

  try {
    onSnapshot(
      query(collection(db, "bookings"), orderBy("createdAt", "desc")),
      (snap) => {
        if (snap.empty) {
          tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--admin-muted);">No bookings yet.</td></tr>`;
          return;
        }
        const rows = [];
        snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
        tbody.innerHTML = rows
          .map(
            (b) => `
        <tr>
          <td><strong>${b.name || "—"}</strong></td>
          <td>${b.phone || "—"}</td>
          <td>${b.service || "—"}</td>
          <td>${b.date || "—"}${b.time ? ` @ ${b.time}` : ""}</td>
          <td>${b.location || "—"}</td>
          <td>${b.type === "group" ? `👥 ${b.people || ""}` : "👤 Solo"}</td>
          <td>
            <select class="status-select" data-id="${b.id}"
              style="background:var(--admin-bg);color:var(--admin-text);border:1px solid var(--admin-border);
                     border-radius:6px;padding:5px 8px;font-size:12px;cursor:pointer;">
              ${["pending", "confirmed", "completed", "cancelled"]
                .map(
                  (s) =>
                    `<option value="${s}" ${b.status === s ? "selected" : ""}>${cap(s)}</option>`,
                )
                .join("")}
            </select>
          </td>
          <td>
            <div class="action-btns">
              <a href="https://wa.me/${(b.phone || "").replace(/\D/g, "")}?text=Hi ${encodeURIComponent(b.name || "")}!"
                 target="_blank" class="action-btn" title="WhatsApp">💬</a>
              <button class="action-btn delete" onclick="adminDeleteDoc('bookings','${b.id}')" title="Delete">🗑</button>
            </div>
          </td>
        </tr>`,
          )
          .join("");

        // Status change
        tbody.querySelectorAll(".status-select").forEach((sel) => {
          sel.addEventListener("change", async () => {
            await updateDoc(doc(db, "bookings", sel.dataset.id), {
              status: sel.value,
            });
            toast(`Booking updated to "${sel.value}"`, "success");
            loadStats();
          });
        });
      },
    );
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:32px;color:var(--admin-muted);">Error loading bookings: ${e.message}</td></tr>`;
  }
}

// ════════════════════════════════════════════════════════
// INTAKE FORMS (live)
// ════════════════════════════════════════════════════════
function loadIntakeForms() {
  const tbody = document.getElementById("intakeTbody");
  if (!tbody) return;

  tbody.innerHTML = loadingRow(8);

  try {
    onSnapshot(
      query(collection(db, "intakeForms"), orderBy("createdAt", "desc")),
      (snap) => {
        if (snap.empty) {
          tbody.innerHTML = emptyRow(8, "No intake forms yet.");
          return;
        }
        const rows = [];
        snap.forEach((d) => rows.push({ id: d.id, ...d.data() }));
        tbody.innerHTML = rows
          .map(
            (f) => `
        <tr>
          <td><strong>${f.name || "—"}</strong></td>
          <td>${f.phone || "—"}</td>
          <td>${f.occasion || "—"}</td>
          <td>${f.lookType || "—"}</td>
          <td>${
            f.skinTone
              ? `<span style="display:inline-block;width:22px;height:22px;border-radius:50%;
                background:${f.skinTone};border:2px solid rgba(255,255,255,0.3);
                box-shadow:0 0 0 1px rgba(0,0,0,0.2);" title="${f.skinTone}"></span>`
              : "—"
          }</td>
          <td>${f.allergies || "None"}</td>
          <td>${f.hasInspoPhotos ? "✅ Yes" : "—"}</td>
          <td>
            <div class="action-btns">
              <a href="https://wa.me/${(f.phone || "").replace(/\D/g, "")}?text=Hi ${encodeURIComponent(f.name || "")}! I've reviewed your intake form."
                 target="_blank" class="action-btn" title="WhatsApp">💬</a>
              <button class="action-btn delete" onclick="adminDeleteDoc('intakeForms','${f.id}')" title="Delete">🗑</button>
            </div>
          </td>
        </tr>`,
          )
          .join("");
      },
    );
  } catch (e) {
    tbody.innerHTML = errorRow(8, e.message);
  }
}

// ════════════════════════════════════════════════════════
// PORTFOLIO ADMIN
// ════════════════════════════════════════════════════════
function initPortfolioAdmin() {
  const grid = document.getElementById("portfolioAdminGrid");
  const form = document.getElementById("addPortfolioForm");
  const fileInput = document.getElementById("portfolioFileInput");
  const zone = document.getElementById("portfolioUploadZone");
  if (!form) return;

  // Live list
  if (grid) {
    grid.innerHTML = loadingGrid();
    onSnapshot(
      query(collection(db, "portfolio"), orderBy("order", "asc")),
      (snap) => {
        if (snap.empty) {
          grid.innerHTML = `<p style="color:var(--admin-muted);text-align:center;padding:32px;grid-column:1/-1;">No portfolio images yet. Upload your first one!</p>`;
          return;
        }
        const items = [];
        snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
        grid.innerHTML = items
          .map(
            (item) => `
        <div class="media-card">
          <img class="media-thumb" src="${item.imageUrl || ""}" alt="${item.title || ""}"
               onerror="this.style.background='#333';this.style.height='120px'">
          <div class="media-body">
            <div class="media-title">${item.title || "Untitled"}</div>
            <div class="media-meta">${cap(item.category || "—")} · Order: ${item.order ?? 0}</div>
            <div class="media-actions">
              <button class="admin-btn admin-btn-red"
                onclick="adminDeletePortfolio('${item.id}','${item.imagePath || ""}')">🗑 Delete</button>
            </div>
          </div>
        </div>`,
          )
          .join("");
      },
    );
  }

  // Upload zone click & drag
  zone?.addEventListener("click", () => fileInput?.click());
  zone?.addEventListener("dragover", (e) => {
    e.preventDefault();
    zone.classList.add("dragging");
  });
  zone?.addEventListener("dragleave", () => zone.classList.remove("dragging"));
  zone?.addEventListener("drop", (e) => {
    e.preventDefault();
    zone.classList.remove("dragging");
    if (e.dataTransfer.files[0]) handlePortfolioUpload(e.dataTransfer.files[0]);
  });
  fileInput?.addEventListener("change", (e) => {
    if (e.target.files[0]) handlePortfolioUpload(e.target.files[0]);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (fileInput?.files[0]) handlePortfolioUpload(fileInput.files[0]);
  });

  async function handlePortfolioUpload(file) {
    const btn = document.getElementById("addPortfolioBtn");
    const title =
      document.getElementById("portfolioTitle")?.value ||
      file.name.replace(/\.[^/.]+$/, "");
    const category =
      document.getElementById("portfolioCategory")?.value || "all";
    const order =
      parseInt(document.getElementById("portfolioOrder")?.value) || 0;

    btn.disabled = true;
    btn.textContent = "⏳ Uploading...";
    try {
      const { url: imageUrl, publicId } = await uploadToCloudinary(file, "lycias-touch/portfolio");
      await addDoc(collection(db, "portfolio"), {
        title,
        category,
        imageUrl,
        order,
        imagePath: publicId,
        createdAt: serverTimestamp(),
      });
      toast("✅ Portfolio image uploaded!", "success");
      form.reset();
      const zone = document.getElementById("portfolioUploadZone");
      if (zone) zone.innerHTML = `<div style="font-size:32px;margin-bottom:8px;">🖼</div><div>Upload Image</div><div style="font-size:11px;opacity:0.6;">Click or drag to upload · JPG, PNG, WebP</div>`;
    } catch (e) {
      toast("❌ Upload failed: " + e.message, "error");
      console.error(e);
    }
    btn.disabled = false;
    btn.textContent = "➕ Add Image";
  }
}

window.adminDeletePortfolio = async (id, path) => {
  if (!confirm("Delete this portfolio image? This cannot be undone.")) return;
  try {
    await deleteDoc(doc(db, "portfolio", id));
    // Note: Cloudinary assets can be managed at cloudinary.com/console
    toast("Image removed from site", "info");
  } catch (e) {
    toast("Delete failed: " + e.message, "error");
  }
};

// ════════════════════════════════════════════════════════
// REELS ADMIN
// ════════════════════════════════════════════════════════
function initReelsAdmin() {
  const grid = document.getElementById("reelsAdminGrid");
  const form = document.getElementById("addReelForm");
  const videoInput = document.getElementById("reelVideoInput");
  const thumbInput = document.getElementById("reelThumbInput");
  if (!form) return;

  // Live list
  if (grid) {
    grid.innerHTML = loadingGrid();
    onSnapshot(
      query(collection(db, "reels"), orderBy("order", "asc")),
      (snap) => {
        if (snap.empty) {
          grid.innerHTML = `<p style="color:var(--admin-muted);text-align:center;padding:32px;grid-column:1/-1;">No reels yet. Add your first reel!</p>`;
          return;
        }
        const reels = [];
        snap.forEach((d) => reels.push({ id: d.id, ...d.data() }));
        grid.innerHTML = reels
          .map(
            (r) => `
        <div class="media-card">
          <div class="media-thumb media-thumb-portrait"
               style="background:#111;display:flex;align-items:center;justify-content:center;font-size:36px;position:relative;overflow:hidden;">
            ${
              r.thumbnailUrl
                ? `<img src="${r.thumbnailUrl}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;">`
                : "🎬"
            }
            <div style="position:absolute;inset:0;display:flex;align-items:center;justify-content:center;">
              <div style="width:40px;height:40px;background:rgba(255,255,255,0.15);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;">▶</div>
            </div>
          </div>
          <div class="media-body">
            <div class="media-title">${r.title || "Untitled"}</div>
            <div class="media-meta">${r.category || "—"} · Order: ${r.order ?? "—"}</div>
            <div class="media-meta" style="font-size:10.5px;word-break:break-all;opacity:0.6;">
              ${r.videoUrl ? r.videoUrl.substring(0, 45) + "..." : "No video URL"}
            </div>
            <div class="media-actions" style="margin-top:12px;">
              <button class="admin-btn admin-btn-red"
                onclick="adminDeleteReel('${r.id}','${r.videoPath || ""}','${r.thumbPath || ""}')">🗑 Delete</button>
            </div>
          </div>
        </div>`,
          )
          .join("");
      },
    );
  }

  // Upload zone clicks
  document
    .getElementById("reelVideoZone")
    ?.addEventListener("click", () => videoInput?.click());
  document
    .getElementById("reelThumbZone")
    ?.addEventListener("click", () => thumbInput?.click());

  videoInput?.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (f) {
      const el = document.getElementById("reelVideoName");
      if (el) el.textContent = "📎 " + f.name;
    }
  });
  thumbInput?.addEventListener("change", (e) => {
    const f = e.target.files[0];
    if (!f) return;
    const el = document.getElementById("reelThumbName");
    if (el) el.textContent = "📎 " + f.name;
    const prev = document.getElementById("reelThumbPreview");
    if (prev) {
      const r = new FileReader();
      r.onload = (ev) => {
        prev.src = ev.target.result;
        prev.style.display = "block";
      };
      r.readAsDataURL(f);
    }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btn = document.getElementById("addReelBtn");
    const title = document.getElementById("reelTitle")?.value || "";
    const category = document.getElementById("reelCategory")?.value || "Beauty";
    const order = parseInt(document.getElementById("reelOrder")?.value) || 1;
    const ytUrl = document.getElementById("reelYoutubeUrl")?.value || "";

    btn.disabled = true;
    btn.textContent = "⏳ Uploading...";

    try {
      let videoUrl = ytUrl,
        videoPath = "",
        thumbnailUrl = "",
        thumbPath = "";

      if (!ytUrl && videoInput?.files[0]) {
        const vf = videoInput.files[0];
        toast("⏳ Uploading video (this may take a moment)...", "info");
        const { url: vUrl, publicId: vId } = await uploadToCloudinary(vf, "lycias-touch/reels");
        videoUrl = vUrl;
        videoPath = vId;
      }
      if (thumbInput?.files[0]) {
        const tf = thumbInput.files[0];
        const { url: tUrl, publicId: tId } = await uploadToCloudinary(tf, "lycias-touch/thumbs");
        thumbnailUrl = tUrl;
        thumbPath = tId;
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

      toast("✅ Reel added successfully!", "success");
      form.reset();
      ["reelVideoName", "reelThumbName"].forEach((id) => {
        const el = document.getElementById(id);
        if (el) el.textContent = "";
      });
      const prev = document.getElementById("reelThumbPreview");
      if (prev) prev.style.display = "none";
    } catch (err) {
      toast("❌ Upload failed: " + err.message, "error");
      console.error(err);
    }
    btn.disabled = false;
    btn.textContent = "➕ Add Reel";
  });
}

window.adminDeleteReel = async (id, vPath, tPath) => {
  if (!confirm("Delete this reel? This cannot be undone.")) return;
  try {
    await deleteDoc(doc(db, "reels", id));
    // Cloudinary assets manageable at cloudinary.com/console
    toast("Reel removed from site", "info");
  } catch (e) {
    toast("Delete failed: " + e.message, "error");
  }
};

// ════════════════════════════════════════════════════════
// TESTIMONIALS ADMIN (live)
// ════════════════════════════════════════════════════════
function initTestimonialsAdmin() {
  const tbody = document.getElementById("testimonialsTbody");
  if (!tbody) return;

  tbody.innerHTML = loadingRow(7);

  onSnapshot(
    query(collection(db, "testimonials"), orderBy("createdAt", "desc")),
    (snap) => {
      if (snap.empty) {
        tbody.innerHTML = emptyRow(7, "No testimonials yet.");
        return;
      }
      const items = [];
      snap.forEach((d) => items.push({ id: d.id, ...d.data() }));
      tbody.innerHTML = items
        .map(
          (t) => `
      <tr>
        <td><strong>${t.name || "—"}</strong></td>
        <td>${t.role || "—"}</td>
        <td>${t.service || "—"}</td>
        <td style="color:var(--gold);">${"★".repeat(t.rating || 5)}</td>
        <td style="max-width:220px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;"
            title="${(t.review || "").replace(/"/g, "'")}">
          ${t.review ? t.review.substring(0, 60) + "..." : "—"}
        </td>
        <td><span class="status-badge ${t.approved ? "status-confirmed" : "status-pending"}">
          ${t.approved ? "✅ Live" : "⏳ Pending"}
        </span></td>
        <td>
          <div class="action-btns">
            ${
              !t.approved
                ? `<button class="action-btn approve"
                   onclick="adminApproveTestimonial('${t.id}')" title="Approve & publish">✅</button>`
                : ""
            }
            <button class="action-btn delete"
              onclick="adminDeleteDoc('testimonials','${t.id}')" title="Delete">🗑</button>
          </div>
        </td>
      </tr>`,
        )
        .join("");
    },
  );
}

window.adminApproveTestimonial = async (id) => {
  await updateDoc(doc(db, "testimonials", id), { approved: true });
  toast("✅ Testimonial approved and now live on the site!", "success");
};

// ════════════════════════════════════════════════════════
// CALENDAR ADMIN
// ════════════════════════════════════════════════════════
function initCalendarAdmin() {
  let year = new Date().getFullYear(),
    month = new Date().getMonth();

  async function renderAdminCal() {
    const grid = document.getElementById("adminCalGrid");
    const title = document.getElementById("adminCalTitle");
    if (!grid || !title) return;

    const months = [
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
    title.textContent = `${months[month]} ${year}`;

    let bookedMap = {};
    try {
      const snap = await getDocs(collection(db, "bookings"));
      snap.forEach((d) => {
        const b = d.data();
        if (b.date && b.status !== "cancelled")
          bookedMap[b.date] = (bookedMap[b.date] || 0) + 1;
      });
    } catch (e) {}

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    grid.innerHTML = "";
    for (let i = 0; i < firstDay; i++) {
      const e = document.createElement("div");
      e.className = "admin-cal-day empty";
      grid.appendChild(e);
    }
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const cellDate = new Date(year, month, d);
      const count = bookedMap[dateStr] || 0;
      const isPast = cellDate < today;
      const cell = document.createElement("div");
      cell.className = `admin-cal-day ${isPast ? "past" : count > 0 ? "booked" : "available"}`;
      cell.title = count > 0 ? `${count} booking(s)` : "Available";
      cell.innerHTML = `${d}${count > 0 ? `<div style="font-size:8px;color:var(--rose);font-weight:700;line-height:1;">${count}</div>` : ""}`;
      if (!isPast)
        cell.addEventListener("click", () => loadDayBookings(dateStr));
      grid.appendChild(cell);
    }
  }

  async function loadDayBookings(dateStr) {
    const wrap = document.getElementById("dayBookingsWrap");
    const dateLabel = document.getElementById("adminCalSelectedDate");
    if (!wrap) return;
    if (dateLabel) dateLabel.textContent = dateStr;
    wrap.innerHTML = `<div style="color:var(--admin-muted);font-size:13px;text-align:center;padding:16px;">
      <div style="width:24px;height:24px;border:2px solid rgba(217,140,154,0.3);border-top-color:var(--rose);
        border-radius:50%;animation:spin 0.7s linear infinite;margin:0 auto 8px;"></div>Loading...
    </div>`;

    try {
      const snap = await getDocs(collection(db, "bookings"));
      const dayItems = [];
      snap.forEach((d) => {
        const b = d.data();
        if (b.date === dateStr) dayItems.push({ id: d.id, ...b });
      });

      if (!dayItems.length) {
        wrap.innerHTML = `<div style="color:var(--admin-muted);font-size:13px;text-align:center;padding:24px;">No bookings on this date ✅</div>`;
        return;
      }
      wrap.innerHTML = dayItems
        .map(
          (b) => `
        <div style="background:var(--admin-bg);border:1px solid var(--admin-border);
                    border-radius:10px;padding:14px 16px;margin-bottom:10px;">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
            <strong style="font-size:14px;">${b.name || "—"}</strong>
            <span class="status-badge status-${b.status || "pending"}">${cap(b.status || "pending")}</span>
          </div>
          <div style="font-size:12.5px;color:var(--admin-muted);margin-bottom:4px;">
            💄 ${b.service || "—"} &nbsp;·&nbsp; ⏰ ${b.time || "No time set"}
          </div>
          <div style="font-size:12.5px;color:var(--admin-muted);margin-bottom:12px;">
            📞 ${b.phone || "—"} &nbsp;·&nbsp; 📍 ${b.location || "—"}
          </div>
          <a href="https://wa.me/${(b.phone || "").replace(/\D/g, "")}?text=Hi ${encodeURIComponent(b.name || "")}!"
             target="_blank" class="admin-btn admin-btn-green" style="font-size:11px;">💬 WhatsApp</a>
        </div>`,
        )
        .join("");
    } catch (e) {
      wrap.innerHTML = `<div style="color:var(--red);font-size:13px;padding:16px;">Error: ${e.message}</div>`;
    }
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

// ════════════════════════════════════════════════════════
// NEWSLETTER ADMIN (live)
// ════════════════════════════════════════════════════════
function initNewsletterAdmin() {
  const tbody = document.getElementById("newsletterTbody");
  if (!tbody) return;

  tbody.innerHTML = loadingRow(4);

  onSnapshot(collection(db, "newsletter"), (snap) => {
    setText("statNewsletter", snap.size);
    setText("statNewsletter2", snap.size);
    if (snap.empty) {
      tbody.innerHTML = emptyRow(4, "No subscribers yet.");
      return;
    }
    const emails = [];
    snap.forEach((d) => emails.push({ id: d.id, ...d.data() }));
    emails.sort(
      (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0),
    );
    tbody.innerHTML = emails
      .map(
        (e, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${e.email}</td>
        <td>${e.createdAt?.toDate ? e.createdAt.toDate().toLocaleDateString("en-NG") : "—"}</td>
        <td>
          <button class="action-btn delete"
            onclick="adminDeleteDoc('newsletter','${e.id}')" title="Remove">🗑</button>
        </td>
      </tr>`,
      )
      .join("");
  });

  // Export CSV
  document
    .getElementById("exportNewsletterBtn")
    ?.addEventListener("click", async () => {
      try {
        const snap = await getDocs(collection(db, "newsletter"));
        const rows = ["Email,Date Subscribed"];
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
        toast("✅ CSV exported!", "success");
      } catch (e) {
        toast("Export failed: " + e.message, "error");
      }
    });
}

// ════════════════════════════════════════════════════════
// SHARED HELPERS
// ════════════════════════════════════════════════════════
window.adminDeleteDoc = async (colName, id) => {
  if (!confirm(`Delete this item from "${colName}"? This cannot be undone.`))
    return;
  try {
    await deleteDoc(doc(db, colName, id));
    toast("Item deleted", "info");
  } catch (e) {
    toast("Delete failed: " + e.message, "error");
  }
};

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}
function cap(str) {
  return str ? str.charAt(0).toUpperCase() + str.slice(1) : "";
}

function loadingRow(cols) {
  return `<tr><td colspan="${cols}" style="text-align:center;padding:40px;color:var(--admin-muted);">
    <div style="width:32px;height:32px;border:3px solid rgba(217,140,154,0.2);border-top-color:var(--rose);
      border-radius:50%;animation:spin 0.7s linear infinite;margin:0 auto 12px;"></div>Loading data...
  </td></tr>`;
}
function emptyRow(cols, msg) {
  return `<tr><td colspan="${cols}" style="text-align:center;padding:40px;color:var(--admin-muted);">${msg}</td></tr>`;
}
function errorRow(cols, msg) {
  return `<tr><td colspan="${cols}" style="text-align:center;padding:40px;color:var(--red);">Error: ${msg}</td></tr>`;
}
function loadingGrid() {
  return `<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--admin-muted);">
    <div style="width:32px;height:32px;border:3px solid rgba(217,140,154,0.2);border-top-color:var(--rose);
      border-radius:50%;animation:spin 0.7s linear infinite;margin:0 auto 12px;"></div>Loading...
  </div>`;
}

function toast(msg, type = "info") {
  let t = document.getElementById("adminToast");
  if (!t) {
    t = document.createElement("div");
    t.id = "adminToast";
    t.style.cssText = `position:fixed;bottom:24px;right:24px;background:#1f1f28;color:#e8e8f0;
      padding:14px 22px;border-radius:12px;font-size:13px;font-weight:500;z-index:9999;
      box-shadow:0 8px 32px rgba(0,0,0,0.4);opacity:0;transform:translateY(8px);
      transition:all 0.3s;max-width:320px;font-family:'Inter',sans-serif;`;
    document.body.appendChild(t);
  }
  const colors = { success: "#22c55e", error: "#ef4444", info: "#D98C9A" };
  t.style.borderLeft = `4px solid ${colors[type] || colors.info}`;
  t.textContent = msg;
  t.style.opacity = "1";
  t.style.transform = "translateY(0)";
  clearTimeout(t._timer);
  t._timer = setTimeout(() => {
    t.style.opacity = "0";
    t.style.transform = "translateY(8px)";
  }, 4000);
}

// Add spin keyframe
const s = document.createElement("style");
s.textContent = "@keyframes spin { to { transform: rotate(360deg); } }";
document.head.appendChild(s);

// ── Boot ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", initLogin);
