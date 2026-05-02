// Bio-Nutrient Manager -- Frontend App (i18n: zh/en)
const API = '/api';
let token = localStorage.getItem('bnm_token');
let currentUser = null;
let pageHistory = [];
let undoTimers = {};

document.addEventListener('DOMContentLoaded', () => {
  applyI18n();
  if (token) { verifyAndBootstrap(); } else { showPage('register'); }
  setupOcrUpload();
  setupInlineValidation();
});

// ============================================================
// I18N
// ============================================================
function toggleLang() {
  const next = I18N.getLang() === 'zh' ? 'en' : 'zh';
  I18N.setLang(next);
  document.getElementById('langToggle').textContent = I18N.t('langLabel');
  document.getElementById('langToggleAuth').textContent = I18N.t('langLabel');
  applyI18n();
  if (currentUser) refreshDashboard();
}

function applyI18n() {
  const L = I18N.getLang();
  document.documentElement.lang = L;
  document.getElementById('langToggle').textContent = I18N.t('langLabel');
  document.getElementById('langToggleAuth').textContent = I18N.t('langLabel');
  document.getElementById('navSignIn').textContent = I18N.t('nav.signIn');
  document.getElementById('navGetStarted').textContent = I18N.t('nav.getStarted');
  document.getElementById('navRefresh').textContent = I18N.t('nav.refresh');
  document.getElementById('navSignOut').textContent = I18N.t('nav.signOut');
}

// ============================================================
// AUTH
// ============================================================
function authHeader() {
  return { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
}

async function verifyAndBootstrap() {
  try {
    const res = await fetch(`${API}/auth/me`, { headers: authHeader() });
    if (!res.ok) throw new Error('Token invalid');
    currentUser = await res.json();
    updateNav(true);
    showPage(currentUser.profile_complete ? 'dashboard' : 'onboard-intro');
  } catch { logout(); showPage('register'); }
}

async function doRegister() {
  clearErrors();
  const username = document.getElementById('regUser').value.trim();
  const password = document.getElementById('regPass').value;
  let valid = true;
  if (!username) { showError('regUser', I18N.t('auth.username') + ' required'); valid = false; }
  if (!password || password.length < 6) { showError('regPass', I18N.t('auth.passwordHint')); valid = false; }
  if (!valid) return;

  try {
    const res = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    token = data.token;
    localStorage.setItem('bnm_token', token);
    currentUser = { id: data.user_id, username: data.username, profile_complete: data.profile_complete };
    updateNav(true);
    showPage(data.profile_complete ? 'dashboard' : 'onboard-intro');
  } catch (err) { alert('Registration failed: ' + err.message); }
}

async function doLogin() {
  const username = document.getElementById('loginUser').value.trim();
  const password = document.getElementById('loginPass').value;
  if (!username || !password) return alert('Please fill in all fields');
  try {
    const res = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error);
    token = data.token;
    localStorage.setItem('bnm_token', token);
    currentUser = { id: data.user_id, username: data.username, profile_complete: data.profile_complete, ...data.user };
    updateNav(true);
    showPage(data.profile_complete ? 'dashboard' : 'onboard-intro');
  } catch (err) { alert('Login failed: ' + err.message); }
}

function logout() {
  token = null; currentUser = null; localStorage.removeItem('bnm_token');
  updateNav(false); showPage('register');
}

function updateNav(authenticated) {
  document.getElementById('navRight').style.display = authenticated ? 'none' : 'flex';
  document.getElementById('navAuth').style.display = authenticated ? 'flex' : 'none';
  document.getElementById('navBack').classList.remove('visible');
  if (authenticated && currentUser) document.getElementById('navUsername').textContent = currentUser.username;
}

// ============================================================
// PAGE ROUTING
// ============================================================
function showPage(name) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  const page = document.getElementById(`page-${name}`);
  if (page) page.classList.add('active');
  hideAiProcessing();
  pageHistory.push(name);

  const backBtn = document.getElementById('navBack');
  backBtn.classList.toggle('visible', ['ocr-import', 'onboard-intro'].includes(name));
  backBtn.textContent = I18N.t('nav.back');

  if (name === 'dashboard') refreshDashboard();
  if (name === 'ocr-import') resetOcrForm();
}

function goBack() {
  pageHistory.pop();
  const prev = pageHistory.pop() || 'dashboard';
  showPage(prev);
}

// ============================================================
// VALIDATION
// ============================================================
function setupInlineValidation() {
  document.querySelectorAll('.input[required], input[minlength], input[type="date"]').forEach(el => {
    el.addEventListener('blur', () => validateField(el));
  });
}

function validateField(el) {
  const errEl = document.getElementById(el.id + 'Err');
  if (!errEl) return;
  if (el.hasAttribute('required') && !el.value.trim()) {
    showError(el.id, 'Required'); return false;
  }
  if (el.minLength && el.value.length < el.minLength) {
    showError(el.id, `Min ${el.minLength} chars`); return false;
  }
  errEl.classList.remove('visible'); el.classList.remove('error');
  return true;
}

function showError(fieldId, msg) {
  const el = document.getElementById(fieldId);
  const errEl = document.getElementById(fieldId + 'Err');
  if (el) el.classList.add('error');
  if (errEl) { errEl.textContent = msg; errEl.classList.add('visible'); }
}

function clearErrors() {
  document.querySelectorAll('.field-error').forEach(e => e.classList.remove('visible'));
  document.querySelectorAll('.input.error').forEach(e => e.classList.remove('error'));
}

// ============================================================
// AI PROCESSING
// ============================================================
function showAiProcessing(text) {
  const el = document.getElementById('aiProcessing');
  document.getElementById('aiText').textContent = text || 'AI processing';
  el.classList.add('active');
}
function hideAiProcessing() { document.getElementById('aiProcessing').classList.remove('active'); }

// ============================================================
// ONBOARDING
// ============================================================
async function doOnboard() {
  clearErrors();
  const birth = document.getElementById('onbBirth').value;
  const gender = document.getElementById('onbGender').value;
  const height = document.getElementById('onbHeight').value;
  const weight = document.getElementById('onbWeight').value;
  const rawText = document.getElementById('onbRawText').value.trim();

  let valid = true;
  if (!birth) { showError('onbBirth', 'Required'); valid = false; }
  if (!gender) { showError('onbGender', 'Required'); valid = false; }
  if (!rawText) { showError('onbRawText', 'Required'); valid = false; }
  if (!valid) return;

  showAiProcessing('DeepSeek v4 Pro: ' + (I18N.getLang() === 'zh' ? '正在分析您的健康档案（约5-10秒）...' : 'analyzing your health profile (5-10 seconds)...'));

  try {
    const res = await fetch(`${API}/onboard`, {
      method: 'POST', headers: authHeader(),
      body: JSON.stringify({ birth_date: birth, gender, height: parseFloat(height) || null, weight: parseFloat(weight) || null, raw_text: rawText }),
    });
    const data = await res.json();
    hideAiProcessing();
    if (!res.ok) throw new Error(data.error?.message || data.error);
    currentUser.profile_complete = true;
    showPage('dashboard');
  } catch (err) {
    hideAiProcessing();
    const fallbackMsg = I18N.getLang() === 'zh' ? 'AI 分析暂时不可用，使用离线备用方案...' : 'AI unavailable. Using offline fallback...';
    showAiProcessing(fallbackMsg);
    setTimeout(() => { hideAiProcessing(); showPage('dashboard'); }, 1500);
  }
}

// ============================================================
// DASHBOARD
// ============================================================
async function refreshDashboard() {
  if (!token) return;
  try {
    const res = await fetch(`${API}/dashboard`, { headers: authHeader() });
    if (res.status === 401) { logout(); return; }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const user = data.user;
    const t = I18N.t.bind(I18N);

    document.getElementById('dashGreeting').textContent = t('dashboard.greeting') + ', ' + user.username;

    const age = calculateAge(user.birth_date);
    const atcInfo = (user.atc_conditions || []).map(c => {
      return I18N.getLang() === 'zh' ? (c.name_cn || c.name) + ' (' + c.atc_code + ')' : c.name + ' (' + c.atc_code + ')';
    }).join(', ');
    document.getElementById('dashAgeInfo').textContent = t('dashboard.ageInfo', { gender: user.gender || '?', age, atc: atcInfo || t('dashboard.noConditions') });

    renderAlerts(data.alerts, data.stock_alerts);
    renderProgress(data.element_progress);
    renderSchedule(data.schedule);
    renderInventory(data.stock_alerts);
    renderRecommendations(data.user, data.element_progress);
  } catch (err) { console.error('Dashboard error:', err); }
}

function calculateAge(birthDate) {
  if (!birthDate) return '?';
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

function renderRecommendations(user, progress) {
  const container = document.getElementById('emptyRecommendations');
  const goals = user.goals || [];
  if (goals.length === 0 || (progress && progress.length > 0)) { container.style.display = 'none'; return; }
  container.style.display = 'block';
  const t = I18N.t.bind(I18N);
  const isZH = I18N.getLang() === 'zh';

  const atcConds = user.atc_conditions || user.conditions || [];
  const atcChips = atcConds.map(c => {
    const name = isZH ? (c.name_cn || c.name) : c.name;
    return `<span class="chip atc">${name} (${c.atc_code || 'N/A'})</span>`;
  }).join(' ');
  const goalChips = goals.map(g => `<span class="chip goal">${g}</span>`).join(' ');

  container.innerHTML = `
    <h3 class="mb-sm">${t('dashboard.recommendations')}</h3>
    <p class="body-sm mb-sm">${t('dashboard.recBased')}</p>
    <div class="chip-container mb-sm">${goalChips}</div>
    ${atcChips ? `<p class="caption mb-sm">${t('emptyRec')} ${atcChips}</p>` : ''}
    <p class="caption">${t('dashboard.recImport')}</p>
  `;
}

function renderProgress(elements) {
  const container = document.getElementById('progressContainer');
  const t = I18N.t.bind(I18N);
  if (!elements || elements.length === 0) { container.innerHTML = `<p class="caption">${t('dashboard.noSupplements')}</p>`; return; }

  const sorted = [...elements].sort((a, b) => {
    if (a.tier !== b.tier) return a.tier - b.tier;
    return (a.category || '').localeCompare(b.category || '');
  });

  container.innerHTML = sorted.map(e => {
    const rdaPct = e.rda_percent || 0;
    const ulPct = e.ul_percent || 0;
    let barClass = 'ok', pctLabel = '';
    if (e.tier > 1) { barClass = 'tier23'; pctLabel = e.current_intake > 0 ? `${e.current_intake.toFixed(1)} ${e.unit}` : t('progress.noData'); }
    else if (ulPct >= 100) { barClass = 'over'; pctLabel = `${ulPct}% UL -- ${t('progress.aboveUL')}`; }
    else if (rdaPct >= 100) { barClass = 'warn'; pctLabel = `${rdaPct}% RDA -- ${t('progress.adequate')}`; }
    else if (rdaPct >= 70) { barClass = 'ok'; pctLabel = `${rdaPct}% RDA -- ${t('progress.onTrack')}`; }
    else { barClass = 'warn'; pctLabel = `${rdaPct}% RDA -- ${t('progress.low')}`; }

    const barWidth = Math.min(e.tier === 1 ? (rdaPct > 0 ? Math.min(rdaPct, 150) : 5) : 15, 100);
    const ulMarker = e.ul && e.rda && e.rda > 0 ? (e.ul / e.rda) * 70 : null;

    const tierLabel = e.tier === 1 ? t('progress.rdaAvailable') : e.tier === 2 ? t('progress.noRDA') : t('progress.unverified');
    const rdaInfo = e.rda ? `RDA: ${e.rda} ${e.unit}` : t('progress.noRDA');
    const ulInfo = e.ul ? `UL: ${e.ul} ${e.unit}` : '';

    return `
      <div class="progress-item">
        <div class="progress-header">
          <span class="el-name">${e.element}</span>
          <span class="el-pct" style="color:${barClass === 'over' ? 'var(--semantic-down)' : barClass === 'warn' ? 'var(--accent-yellow)' : 'var(--semantic-up)'}">${pctLabel || `${e.current_intake.toFixed(1)} ${e.unit}`}</span>
        </div>
        <div class="bar-wrap" role="progressbar" aria-valuenow="${Math.round(rdaPct)}" aria-valuemin="0" aria-valuemax="150" aria-label="${e.element}: ${rdaPct}% RDA, ${rdaInfo}, ${ulInfo}, ${tierLabel}">
          ${e.tier === 1 ? '<div class="bar-zone green"></div><div class="bar-zone yellow"></div>' : ''}
          <div class="bar-fill ${barClass}" style="width:${barWidth}%"></div>
          ${ulMarker !== null && e.tier === 1 ? `<div class="bar-ul-line" style="left:${Math.min(ulMarker, 98)}%" title="UL: ${e.ul} ${e.unit}"></div>` : ''}
        </div>
      </div>`;
  }).join('');
}

function renderSchedule(schedule) {
  const container = document.getElementById('scheduleContainer');
  const t = I18N.t.bind(I18N);
  if (!schedule || schedule.length === 0) { container.innerHTML = `<p class="caption">${t('dashboard.noSchedule')}</p>`; return; }

  const groups = { 'morning-empty': [], 'with-meal': [], 'after-lunch': [], 'before-bed': [] };
  schedule.forEach(s => { if (groups[s.time_of_day]) groups[s.time_of_day].push(s); });

  let html = '';
  for (const [tod, items] of Object.entries(groups)) {
    if (items.length === 0) continue;
    html += `<div class="time-group ${tod}"><h3>${t('schedule.' + tod.replace(/-/g, '') === 'morningempty' ? 'schedule.morningEmpty' : 'schedule.' + tod)}</h3>`;
    items.forEach(item => {
      const done = item.consumed ? ' done' : '';
      const pillLabel = item.dosage > 1 ? t('schedule.pills') : t('schedule.pill');
      html += `
        <div class="sched-item${done}" id="sched-${item.id}">
          <input type="checkbox" ${item.consumed ? 'checked disabled' : ''} onclick="event.stopPropagation(); checkDose(${item.id})" aria-label="Mark ${item.product_name} taken">
          <span class="sched-name">${item.product_name}</span>
          <span class="sched-dose">${item.dosage} ${pillLabel}</span>
          ${!item.consumed ? `<button class="sched-skip" onclick="event.stopPropagation(); skipDose(${item.id})" aria-label="Skip ${item.product_name}" title="Skip">&times;</button>` : ''}
        </div>`;
    });
    html += '</div>';
  }
  container.innerHTML = html;

  // Fix schedule time group labels
  const labels = {
    'morning-empty': t('schedule.morningEmpty'),
    'with-meal': t('schedule.withMeal'),
    'after-lunch': t('schedule.afterLunch'),
    'before-bed': t('schedule.beforeBed'),
  };
  for (const [tod, label] of Object.entries(labels)) {
    const el = container.querySelector(`.time-group.${tod} h3`);
    if (el) el.textContent = label;
  }
}

async function checkDose(scheduleId) {
  try {
    const res = await fetch(`${API}/dashboard/check`, { method: 'POST', headers: authHeader(), body: JSON.stringify({ schedule_id: scheduleId }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message || data.error);
    const row = document.getElementById(`sched-${scheduleId}`);
    if (row) { row.classList.add('done'); row.querySelector('input[type=checkbox]').checked = true; row.querySelector('input[type=checkbox]').disabled = true; }
    showToast(I18N.t('toast.doseTaken'), () => undoCheckDose(scheduleId));
    undoTimers[scheduleId] = setTimeout(() => { delete undoTimers[scheduleId]; refreshDashboard(); }, 30000);
  } catch (err) { alert('Failed: ' + err.message); }
}

async function undoCheckDose(scheduleId) {
  clearTimeout(undoTimers[scheduleId]); delete undoTimers[scheduleId];
  try { await fetch(`${API}/dashboard/undo`, { method: 'POST', headers: authHeader(), body: JSON.stringify({ schedule_id: scheduleId }) }); } catch {}
  refreshDashboard();
}

async function skipDose(scheduleId) {
  const row = document.getElementById(`sched-${scheduleId}`);
  if (row) row.style.opacity = '0.3';
  try { await fetch(`${API}/dashboard/skip`, { method: 'POST', headers: authHeader(), body: JSON.stringify({ schedule_id: scheduleId }) }); } catch {}
  setTimeout(refreshDashboard, 500);
}

function showToast(msg, onUndo) {
  const container = document.getElementById('toastContainer');
  container.innerHTML = `<div class="toast"><span>${msg}</span>${onUndo ? `<button class="toast-undo" onclick="this.closest('.toast').remove();(${onUndo.toString()})()">${I18N.t('toast.undo')}</button>` : ''}</div>`;
  if (!onUndo) setTimeout(() => { container.innerHTML = ''; }, 4000);
}

function renderInventory(stockAlerts) {
  const container = document.getElementById('inventoryContainer');
  const t = I18N.t.bind(I18N);
  if (!stockAlerts || stockAlerts.length === 0) { container.innerHTML = `<p class="caption">${t('dashboard.noInventory')}</p>`; return; }

  container.innerHTML = stockAlerts.map(sa => {
    const color = sa.status === 'critical' ? 'var(--semantic-down)' : sa.status === 'low' ? 'var(--accent-yellow)' : 'var(--semantic-up)';
    const label = sa.status === 'critical' ? t('inventory.critical') : sa.status === 'low' ? t('inventory.low') : t('inventory.ok');
    const icon = sa.status === 'critical' ? '!' : sa.status === 'low' ? '~' : '';
    return `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 0;border-bottom:1px solid var(--hairline-soft);">
      <div><span style="font-weight:500;">${sa.product_name}</span><span class="body-sm" style="margin-left:8px;">${t('dashboard.unitsLeft', {count: sa.current_count})}</span></div>
      <div class="status-icon" style="gap:8px;"><span class="num" style="color:${color};">${icon} ${t('dashboard.days', {days: sa.remaining_days})}</span><span style="font-size:11px;font-weight:600;padding:2px 8px;border-radius:var(--radius-pill);background:${color}22;color:${color};">${label}</span></div></div>`;
  }).join('');
}

function renderAlerts(alerts, stockAlerts) {
  const container = document.getElementById('alertsContainer');
  const t = I18N.t.bind(I18N);
  const seen = new Set(); const unique = [];
  for (const a of (alerts || [])) {
    const key = `${a.alert_type}-${a.inventory_id || 'system'}-${new Date().toISOString().slice(0, 10)}`;
    if (!seen.has(key)) { seen.add(key); unique.push(a); }
  }
  (stockAlerts || []).forEach(sa => {
    const key = `stock-${sa.inventory_id}-${new Date().toISOString().slice(0, 10)}`;
    if (sa.status === 'critical' && !seen.has(key)) {
      seen.add(key);
      unique.push({ alert_type: 'critical_stock', message: t('alerts.criticalStock', { name: sa.product_name, count: sa.current_count, days: sa.remaining_days }) });
    } else if (sa.status === 'low' && !seen.has(key)) {
      seen.add(key);
      unique.push({ alert_type: 'low_stock', message: t('alerts.lowStock', { name: sa.product_name, count: sa.current_count, days: sa.remaining_days }) });
    }
  });
  if (unique.length === 0) { container.style.display = 'none'; return; }
  container.style.display = 'block';
  container.innerHTML = unique.map(a => {
    let cls = a.alert_type === 'critical_stock' || a.alert_type === 'ul_warning' ? 'critical' : a.alert_type === 'low_stock' ? 'warning' : 'info';
    return `<div class="alert ${cls}"><span>${a.message}</span><button class="alert-dismiss" onclick="this.parentElement.remove()" aria-label="${t('alerts.dismiss')}">&times;</button></div>`;
  }).join('');
}

// ============================================================
// OCR IMPORT
// ============================================================
function resetOcrForm() {
  document.getElementById('ocrPreview').style.display = 'none';
  document.getElementById('ocrFileInput').value = '';
  document.getElementById('ocrImportBtn').disabled = true;
  document.getElementById('ocrStatus').textContent = '';
  document.getElementById('ocrReviewPanel').style.display = 'none';
  document.getElementById('uploadZone').classList.remove('has-file');
}

function setupOcrUpload() {
  const zone = document.getElementById('uploadZone');
  const input = document.getElementById('ocrFileInput');
  const preview = document.getElementById('ocrPreview');
  const btn = document.getElementById('ocrImportBtn');
  const status = document.getElementById('ocrStatus');

  zone.addEventListener('click', () => input.click());
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.style.borderColor = 'var(--primary)'; });
  zone.addEventListener('dragleave', () => { zone.style.borderColor = ''; });
  zone.addEventListener('drop', e => { e.preventDefault(); zone.style.borderColor = ''; if (e.dataTransfer.files.length) { input.files = e.dataTransfer.files; handleFile(); } });
  input.addEventListener('change', handleFile);

  function handleFile() {
    const file = input.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => { preview.src = e.target.result; preview.style.display = 'block'; zone.classList.add('has-file'); };
    reader.readAsDataURL(file);
    btn.disabled = false; status.textContent = '';
    document.getElementById('ocrReviewPanel').style.display = 'none';
  }

  btn.addEventListener('click', async () => {
    const file = input.files[0];
    if (!file || !currentUser) return;
    btn.disabled = true;
    showAiProcessing(I18N.t('ocr.processing'));

    const form = new FormData();
    form.append('image', file);
    form.append('user_id', currentUser.id);
    form.append('dosage_per_day', document.getElementById('ocrDosage').value || '1');

    try {
      const res = await fetch(`${API}/ocr`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
      const data = await res.json();
      hideAiProcessing();
      if (!res.ok) throw new Error(data.error?.message || data.error);

      if (data.review_required) {
        document.getElementById('ocrReviewPanel').style.display = 'block';
        document.getElementById('ocrReviewPanel').innerHTML = `
          <div style="background:#fef2f2;border:1px solid #fecaca;border-radius:12px;padding:16px;margin-bottom:12px;">
            <h3 style="color:var(--semantic-down);margin-bottom:8px;">${I18N.t('ocr.reviewRequired')}</h3>
            <p class="body-sm">${I18N.t('ocr.reviewMsg')}</p>
          </div>
          ${(data.critical_issues || []).map(c => `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:8px;padding:8px 12px;margin-bottom:4px;font-size:14px;">${c}</div>`).join('')}
          <p class="caption mt-sm">${I18N.t('ocr.notSaved')}</p>`;
        status.textContent = I18N.t('ocr.blocked');
        btn.disabled = true; return;
      }

      status.textContent = I18N.t('ocr.imported', { name: data.product_name, count: data.nutrients?.length || 0, catalogId: data.catalog_id });
      preview.style.display = 'none'; zone.classList.remove('has-file'); input.value = ''; btn.disabled = true;
      setTimeout(refreshDashboard, 1000);
    } catch (err) {
      hideAiProcessing();
      status.textContent = I18N.t('ocr.failed', { error: err.message });
      btn.disabled = false;
    }
  });
}
