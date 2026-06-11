// ============================================================
// js/whatsapp.js – WhatsApp Template System
// ============================================================

const WA_NUMBER = '2348123456789';

export const templates = {
  bookingConfirmation: {
    title: 'Booking Confirmation',
    icon: '📅',
    category: 'Booking',
    body: `Hi {{clientName}}! 🌸

Your appointment with Lycia's Touch has been *confirmed*!

📅 Date: {{date}}
⏰ Time: {{time}}
💄 Service: {{service}}
📍 Location: {{location}}

Please arrive 10 minutes early. Kindly note that a 50% deposit of {{deposit}} is required to secure your slot.

Looking forward to making you look amazing! ✨

— Lycia 💋`
  },
  bookingReminder: {
    title: 'Appointment Reminder',
    icon: '⏰',
    category: 'Reminder',
    body: `Hi {{clientName}}! 💕

Just a friendly reminder that your appointment is *tomorrow*!

📅 Date: {{date}}
⏰ Time: {{time}}
💄 Service: {{service}}

Please come with a clean face (no makeup). Feel free to bring inspo photos if you have any 📸

See you soon! ✨ — Lycia`
  },
  followUp: {
    title: 'Post-Appointment Follow-Up',
    icon: '💖',
    category: 'Follow-Up',
    body: `Hi {{clientName}}! 🌸

It was such a pleasure having you at Lycia's Touch! I hope you're still getting compliments 😄✨

I'd love to hear your feedback — could you spare 2 minutes to leave a review?

👉 {{reviewLink}}

Also, don't forget to tag me in your photos! 📸
Instagram: @lyciastouch

Thank you so much! — Lycia 💋`
  },
  groupBookingQuote: {
    title: 'Group Booking Quote',
    icon: '👥',
    category: 'Booking',
    body: `Hi {{clientName}}! 💕

Thank you for your group booking inquiry with Lycia's Touch!

Here's your custom quote:

👥 Number of People: {{people}}
💄 Service: {{service}}
📅 Date: {{date}}
📍 Location: {{location}}

💰 Total Estimate: {{totalPrice}}
(Deposit of 50% required to confirm)

Please reply to confirm or ask any questions. I'm excited to glam your squad! ✨

— Lycia 💋`
  },
  cancellation: {
    title: 'Cancellation Notice',
    icon: '❌',
    category: 'Admin',
    body: `Hi {{clientName}},

Unfortunately, I need to cancel your appointment scheduled for *{{date}} at {{time}}* due to {{reason}}.

I sincerely apologize for any inconvenience. 🙏

Please reply so we can reschedule at a time that works for you. Your deposit will be fully refunded within 24 hours.

Again, so sorry! — Lycia 💋`
  },
  trainingEnquiry: {
    title: 'Training Programme Info',
    icon: '🎓',
    category: 'Training',
    body: `Hi {{clientName}}! 🌸

Thank you for your interest in Lycia's Touch Makeup Training!

Here's what's included in the *{{programLevel}} Programme*:

✅ Hands-on practical sessions
✅ Professional kit guidance
✅ Skin prep & care techniques
✅ Business setup basics
✅ Certificate upon completion

💰 Investment: {{price}}
📅 Next Class: {{nextClassDate}}
📍 Venue: {{venue}}

Limited spots available — reply NOW to secure yours! 🎓✨

— Lycia 💋`
  }
};

// ── Render WhatsApp Templates Section ────────────────────
export function initWaTemplates() {
  const grid = document.getElementById('waTemplateGrid');
  if (!grid) return;

  grid.innerHTML = Object.entries(templates).map(([key, tpl]) => `
    <div class="wa-card reveal">
      <div class="wa-card-icon">${tpl.icon}</div>
      <div class="wa-card-title">${tpl.title}</div>
      <div class="wa-card-preview">${tpl.body.substring(0, 100)}...</div>
      <button class="btn btn-wa btn-sm" onclick="window.openWaTemplate('${key}')">
        💬 Use Template
      </button>
    </div>
  `).join('');
}

// ── Open Template Modal ───────────────────────────────────
export function openWaTemplate(key) {
  const tpl = templates[key];
  if (!tpl) return;

  let modal = document.getElementById('waTemplateModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'waTemplateModal';
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-box" style="max-width:600px;">
        <button class="modal-close" id="waModalClose">✕</button>
        <div style="padding:40px;">
          <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:var(--rose-gold);font-weight:700;margin-bottom:8px;">WhatsApp Template</div>
          <h3 id="waTplTitle" style="font-family:var(--font-display);font-size:28px;font-weight:600;margin-bottom:24px;"></h3>
          <div class="form-group">
            <label>Client Name</label>
            <input type="text" id="waTplClientName" placeholder="e.g. Amara" value="">
          </div>
          <div class="wa-dynamic-fields" id="waDynamicFields"></div>
          <div style="background:#f8f8f8;border-radius:12px;padding:20px;margin:20px 0;max-height:220px;overflow-y:auto;">
            <div style="font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#888;margin-bottom:10px;">Preview</div>
            <pre id="waTplPreview" style="font-family:'Poppins',sans-serif;font-size:12.5px;white-space:pre-wrap;line-height:1.8;color:#333;"></pre>
          </div>
          <button id="waTplSendBtn" class="btn btn-primary btn-lg" style="width:100%;justify-content:center;">
            💬 Send on WhatsApp
          </button>
        </div>
      </div>`;
    document.body.appendChild(modal);
    document.getElementById('waModalClose').addEventListener('click', () => {
      modal.classList.remove('open'); document.body.style.overflow = '';
    });
    modal.addEventListener('click', e => {
      if (e.target === modal) { modal.classList.remove('open'); document.body.style.overflow = ''; }
    });
  }

  document.getElementById('waTplTitle').textContent = tpl.title;

  // Extract variables
  const vars = [...new Set([...tpl.body.matchAll(/\{\{(\w+)\}\}/g)].map(m => m[1]))].filter(v => v !== 'clientName');

  // Render dynamic fields
  const fieldsWrap = document.getElementById('waDynamicFields');
  fieldsWrap.innerHTML = vars.map(v => `
    <div class="form-group">
      <label>${camelToLabel(v)}</label>
      <input type="text" id="waField_${v}" placeholder="${getPlaceholder(v)}">
    </div>
  `).join('');

  // Live preview update
  function updatePreview() {
    let preview = tpl.body;
    const clientName = document.getElementById('waTplClientName')?.value || '{{clientName}}';
    preview = preview.replaceAll('{{clientName}}', clientName);
    vars.forEach(v => {
      const val = document.getElementById(`waField_${v}`)?.value || `{{${v}}}`;
      preview = preview.replaceAll(`{{${v}}}`, val);
    });
    document.getElementById('waTplPreview').textContent = preview;
  }

  modal.querySelectorAll('input').forEach(inp => inp.addEventListener('input', updatePreview));
  updatePreview();

  // Send button
  document.getElementById('waTplSendBtn').onclick = () => {
    const preview = document.getElementById('waTplPreview').textContent;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(preview)}`, '_blank');
  };

  modal.classList.add('open');
  document.body.style.overflow = 'hidden';
}

window.openWaTemplate = openWaTemplate;

function camelToLabel(str) {
  return str.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
}

function getPlaceholder(field) {
  const map = {
    date: 'e.g. 15 July 2025',
    time: 'e.g. 10:00 AM',
    service: 'e.g. Bridal Makeup',
    location: 'e.g. Victoria Island, Lagos',
    deposit: 'e.g. ₦30,000',
    totalPrice: 'e.g. ₦120,000',
    reason: 'e.g. a family emergency',
    reviewLink: 'e.g. https://...',
    people: 'e.g. 6',
    price: 'e.g. ₦50,000',
    nextClassDate: 'e.g. 20 July 2025',
    venue: 'e.g. Lekki Studio',
    programLevel: 'e.g. Beginner',
  };
  return map[field] || `Enter ${camelToLabel(field)}`;
}
