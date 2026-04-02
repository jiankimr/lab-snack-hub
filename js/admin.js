/**
 * RISE Lab Snack Hub — Admin Page
 */
(function () {
  'use strict';

  let suggestions = [];

  const $ = (sel) => document.querySelector(sel);
  const $$ = (sel) => document.querySelectorAll(sel);

  function pad(n) { return String(n).padStart(2, '0'); }

  function kstNow() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  }

  function currentMonthKey() {
    const d = kstNow();
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
  }

  function formatKRW(num) {
    return '\u20A9' + Number(num || 0).toLocaleString('ko-KR');
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function showToast(message, isError) {
    const el = $('#toast');
    const icon = $('#toast-icon');
    $('#toast-body').textContent = message;
    el.classList.toggle('error', !!isError);
    icon.innerHTML = isError
      ? '<i class="bi bi-exclamation-circle-fill"></i>'
      : '<i class="bi bi-check-circle-fill"></i>';
    el.classList.add('show');
    clearTimeout(el._timer);
    el._timer = setTimeout(() => el.classList.remove('show'), 3000);
  }

  function getMonth() {
    return $('#admin-month').value;
  }

  // ─── Load Suggestions ───
  async function loadSuggestions() {
    const container = $('#admin-suggestions');
    const month = getMonth();

    try {
      const data = await API.getSuggestions(month);
      suggestions = data.suggestions || [];

      if (suggestions.length === 0) {
        container.innerHTML = '<p style="color:var(--text-tertiary); text-align:center; padding:var(--space-2xl) 0;">이번 달 추천 항목이 없습니다.</p>';
        loadPreview();
        return;
      }

      container.innerHTML = `
        <table class="admin-table">
          <thead>
            <tr>
              <th style="width:40px"><input type="checkbox" id="check-all"></th>
              <th>간식</th>
              <th>추천인</th>
              <th>좋아요</th>
              <th>예상가</th>
              <th>확정 가격</th>
              <th>상태</th>
              <th>링크</th>
            </tr>
          </thead>
          <tbody>
            ${suggestions.map((item, i) => `
              <tr data-index="${i}" class="${item.status === 'confirmed' ? 'row-confirmed' : ''}">
                <td><input type="checkbox" class="item-check" data-index="${i}" ${item.status === 'confirmed' ? 'checked' : ''}></td>
                <td style="font-weight:600">${escapeHtml(item.snackName)}${item.carriedOver ? ' <span class="badge-carryover" style="font-size:0.65rem">이월</span>' : ''}</td>
                <td style="color:var(--text-secondary)">${escapeHtml(item.name)}</td>
                <td><span style="background:var(--red-soft);color:var(--red);padding:2px 8px;border-radius:var(--radius-full);font-size:0.8rem;font-weight:700">${item.votes || 0}</span></td>
                <td style="color:var(--text-tertiary)">${item.price ? formatKRW(item.price) : '-'}</td>
                <td><input type="number" class="price-input" data-index="${i}" value="${item.confirmedPrice || item.price || ''}" min="0" placeholder="가격"></td>
                <td>${item.status === 'confirmed'
                  ? '<span style="background:var(--green-soft);color:var(--green);padding:2px 8px;border-radius:var(--radius-full);font-size:0.75rem;font-weight:700">확정</span>'
                  : '<span style="color:var(--text-tertiary);font-size:0.8rem">대기</span>'}</td>
                <td>${item.link ? `<a href="${escapeHtml(item.link)}" target="_blank" style="color:var(--accent);font-weight:500;font-size:0.85rem"><i class="bi bi-link-45deg"></i></a>` : '-'}</td>
              </tr>`).join('')}
          </tbody>
        </table>`;

      // Events
      $('#check-all').addEventListener('change', (e) => {
        $$('.item-check').forEach((cb) => { cb.checked = e.target.checked; });
        updateTotals();
      });
      $$('.item-check').forEach((cb) => cb.addEventListener('change', updateTotals));
      $$('.price-input').forEach((inp) => inp.addEventListener('input', updateTotals));

      updateTotals();
      loadPreview();
    } catch {
      container.innerHTML = '<p style="color:var(--red); text-align:center;">목록을 불러올 수 없습니다.</p>';
    }
  }

  function updateTotals() {
    let total = 0;
    $$('.item-check').forEach((cb) => {
      if (cb.checked) {
        const idx = cb.dataset.index;
        const price = $(`.price-input[data-index="${idx}"]`);
        total += Number(price.value) || 0;
      }
    });

    $('#admin-selected-total').textContent = formatKRW(total);
    const remaining = CONFIG.MONTHLY_BUDGET - total;
    const el = $('#admin-remaining');
    el.textContent = formatKRW(remaining);
    el.className = `budget-item-value ${remaining >= 0 ? 'ok' : 'over'}`;
  }

  function getSelectedItems() {
    const items = [];
    $$('.item-check').forEach((cb) => {
      if (cb.checked) {
        const idx = cb.dataset.index;
        const price = $(`.price-input[data-index="${idx}"]`);
        items.push({
          rowIndex: suggestions[idx].rowIndex,
          snackName: suggestions[idx].snackName,
          confirmedPrice: Number(price.value) || 0,
        });
      }
    });
    return items;
  }

  function loadPreview() {
    const container = $('#admin-confirmed-preview');
    const confirmed = suggestions.filter((s) => s.status === 'confirmed');

    if (confirmed.length === 0) {
      container.innerHTML = '<p style="color:var(--text-tertiary)">확정된 품목이 없습니다.</p>';
      return;
    }

    const total = confirmed.reduce((s, c) => s + (Number(c.confirmedPrice) || Number(c.price) || 0), 0);
    container.innerHTML = `
      <div class="preview-list">
        ${confirmed.map((c) => `
          <div class="preview-item">
            <span>${escapeHtml(c.snackName)}</span>
            <span style="font-weight:700">${formatKRW(c.confirmedPrice || c.price)}</span>
          </div>`).join('')}
        <div class="preview-total">
          <span>합계</span>
          <span>${formatKRW(total)}</span>
        </div>
      </div>`;
  }

  // ─── Actions ───
  async function handleConfirm() {
    const items = getSelectedItems();
    if (!items.length) return showToast('확정할 항목을 선택하세요.', true);

    const total = items.reduce((s, i) => s + i.confirmedPrice, 0);
    if (total > CONFIG.MONTHLY_BUDGET) {
      if (!confirm(`선택 합계(${formatKRW(total)})가 예산을 초과합니다. 계속?`)) return;
    }

    try {
      await API.confirmItems(getMonth(), items);
      showToast(`${items.length}개 항목 확정 완료`);
      loadSuggestions();
    } catch { showToast('확정 실패', true); }
  }

  async function handleCarryOver() {
    if (!confirm('미선택 항목을 다음 달로 이월?')) return;
    try {
      await API.carryOver(getMonth());
      showToast('이월 완료');
      loadSuggestions();
    } catch { showToast('이월 실패', true); }
  }

  async function handleSlack() {
    if (!confirm('확정 목록을 슬랙에 공지?')) return;
    try {
      await API.notifySlack(getMonth());
      showToast('슬랙 공지 전송 완료');
    } catch { showToast('슬랙 공지 실패', true); }
  }

  async function handlePurchased() {
    if (!confirm('구매 완료 처리?')) return;
    try {
      await API.markPurchased(getMonth());
      showToast('구매 완료 처리됨');
      loadSuggestions();
    } catch { showToast('처리 실패', true); }
  }

  // ─── Password Lock ───
  const ADMIN_PASS = (typeof ENV !== 'undefined' && ENV.ADMIN_PASS) || '';

  function initLock() {
    const overlay = $('#admin-lock');
    const content = $('#admin-content');

    if (sessionStorage.getItem('snackhub_admin') === 'ok') {
      overlay.style.display = 'none';
      content.style.display = '';
      return true;
    }

    overlay.style.display = '';
    content.style.display = 'none';

    $('#lock-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const pw = $('#lock-password').value;
      if (pw === ADMIN_PASS) {
        sessionStorage.setItem('snackhub_admin', 'ok');
        overlay.style.display = 'none';
        content.style.display = '';
        initAdmin();
      } else {
        $('#lock-error').style.display = '';
        $('#lock-password').value = '';
        $('#lock-password').focus();
      }
    });

    return false;
  }

  function initLinks() {
    const spreadsheet = $('#link-spreadsheet');
    const receipt = $('#link-receipt');
    if (spreadsheet) spreadsheet.href = CONFIG.LINKS.SPREADSHEET;
    if (receipt) receipt.href = CONFIG.LINKS.RECEIPT_FOLDER;
  }

  function initAdmin() {
    const monthInput = $('#admin-month');
    monthInput.value = currentMonthKey();
    $('#admin-budget').textContent = formatKRW(CONFIG.MONTHLY_BUDGET);

    monthInput.addEventListener('change', loadSuggestions);
    $('#btn-confirm').addEventListener('click', handleConfirm);
    $('#btn-carryover').addEventListener('click', handleCarryOver);
    $('#btn-slack').addEventListener('click', handleSlack);
    $('#btn-purchased').addEventListener('click', handlePurchased);

    initLinks();
    loadSuggestions();
  }

  // ─── Init ───
  document.addEventListener('DOMContentLoaded', () => {
    if (initLock()) {
      initAdmin();
    }
  });
})();
