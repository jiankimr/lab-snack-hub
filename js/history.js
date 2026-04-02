/**
 * RISE Lab Snack Hub — Purchase History
 */
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  function formatKRW(n) {
    return '\u20A9' + Number(n || 0).toLocaleString('ko-KR');
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function showToast(msg, err) {
    const el = $('#toast');
    $('#toast-body').textContent = msg;
    el.classList.toggle('error', !!err);
    $('#toast-icon').innerHTML = err
      ? '<i class="bi bi-exclamation-circle-fill"></i>'
      : '<i class="bi bi-check-circle-fill"></i>';
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(() => el.classList.remove('show'), 3000);
  }

  function initNav() {
    const toggle = $('#nav-toggle');
    const links = $('#nav-links');
    if (toggle && links) {
      toggle.addEventListener('click', () => links.classList.toggle('open'));
      links.querySelectorAll('.nav-link').forEach((a) =>
        a.addEventListener('click', () => links.classList.remove('open'))
      );
    }
  }

  const EMOJIS = ['🧃','🥐','🍰','🍬','🍫'];
  function emoji(name) {
    let h = 0;
    for (let i = 0; i < (name || '').length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
    return EMOJIS[Math.abs(h) % EMOJIS.length];
  }

  let allRecords = [];
  let currentYear, currentMonth;
  let showAll = false;

  function kstNow() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  }

  function initMonth() {
    const now = kstNow();
    currentYear = now.getFullYear();
    currentMonth = now.getMonth() + 1;
    updateMonthDisplay();
  }

  function updateMonthDisplay() {
    $('#history-month-display').textContent = `${currentYear}년 ${currentMonth}월`;
  }

  function getMonthKey() {
    return `${currentYear}-${String(currentMonth).padStart(2, '0')}`;
  }

  function prevMonth() {
    currentMonth--;
    if (currentMonth < 1) { currentMonth = 12; currentYear--; }
    showAll = false;
    updateMonthDisplay();
    renderHistory();
  }

  function nextMonth() {
    currentMonth++;
    if (currentMonth > 12) { currentMonth = 1; currentYear++; }
    showAll = false;
    updateMonthDisplay();
    renderHistory();
  }

  function toggleAll() {
    showAll = !showAll;
    const btn = $('#btn-all-history');
    btn.textContent = showAll ? '월별 보기' : '전체 보기';
    btn.classList.toggle('active', showAll);
    renderHistory();
  }

  function renderHistory() {
    const container = $('#history-list');
    const summary = $('#history-summary');
    const monthKey = getMonthKey();
    const filtered = showAll ? allRecords : allRecords.filter(r => r.month === monthKey);

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="board-empty">
          <div class="empty-icon">📦</div>
          <p>${showAll ? '구매 기록이 없습니다.' : '이번 달 구매 기록이 없습니다.'}</p>
        </div>`;
      summary.style.display = 'none';
      return;
    }

    container.innerHTML = filtered.map(r => `
      <div class="history-card">
        <div class="history-card-icon">${emoji(r.item)}</div>
        <div class="history-card-info">
          <div class="history-card-name">${escapeHtml(r.item)}</div>
          <div class="history-card-detail">
            ${r.purchaseDate || r.month}${r.store ? ` · ${escapeHtml(r.store)}` : ''}
            ${r.link ? ` · <a href="${escapeHtml(r.link)}" target="_blank" style="color:var(--accent)">링크</a>` : ''}
          </div>
        </div>
        <div class="history-card-price">${formatKRW(r.amount)}</div>
      </div>
    `).join('');

    const totalAmount = filtered.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    summary.style.display = '';
    $('#summary-count').textContent = `${filtered.length}개`;
    $('#summary-total').textContent = formatKRW(totalAmount);
  }

  async function loadHistory() {
    const container = $('#history-list');
    try {
      const data = await API.getPurchaseHistory();
      allRecords = data.records || [];
      renderHistory();
    } catch {
      container.innerHTML = `
        <div class="board-empty">
          <div class="empty-icon">🔌</div>
          <p>기록을 불러올 수 없습니다.<br>API 설정을 확인하세요.</p>
        </div>`;
    }
  }

  function initLinks() {
    const receipt = $('#link-receipt');
    if (receipt) receipt.href = CONFIG.LINKS.RECEIPT_FOLDER;
  }

  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initMonth();
    initLinks();
    $('#btn-month-prev').addEventListener('click', prevMonth);
    $('#btn-month-next').addEventListener('click', nextMonth);
    $('#btn-all-history').addEventListener('click', toggleAll);
    loadHistory();
  });
})();
