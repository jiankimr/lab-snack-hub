/**
 * RISE Lab Snack Hub — Main (추천 + 투표)
 */
(function () {
  'use strict';

  const $ = (sel) => document.querySelector(sel);

  function kstNow() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
  }

  function todayMonthKey() {
    const d = kstNow();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }

  function formatKRW(n) {
    return '\u20A9' + Number(n || 0).toLocaleString('ko-KR');
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  function getVotedSet() {
    try { return new Set(JSON.parse(localStorage.getItem(CONFIG.VOTE_STORAGE_KEY) || '[]')); }
    catch { return new Set(); }
  }

  function saveVote(rowIndex) {
    const s = getVotedSet();
    s.add(String(rowIndex));
    localStorage.setItem(CONFIG.VOTE_STORAGE_KEY, JSON.stringify([...s]));
  }

  const EMOJIS = ['🧃','🥐','🍰','🥨','🍫'];
  function emoji(name) {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = ((h << 5) - h + name.charCodeAt(i)) | 0;
    return EMOJIS[Math.abs(h) % EMOJIS.length];
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
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('.nav-link').forEach((a) =>
      a.addEventListener('click', () => links.classList.remove('open'))
    );
  }

  function updateMonthTitle() {
    const now = kstNow();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();

    if (y === 2026 && m === 4 && d <= 3) {
      $('#month-title').textContent = '4월 간식 보드';
      $('#month-deadline').textContent = '(4월 3일 구매 확정 예정)';
      return;
    }

    const nextM = m === 12 ? 1 : m + 1;
    const lastDay = new Date(y, m, 0).getDate();
    $('#month-title').textContent = `${nextM}월 간식 보드`;
    $('#month-deadline').textContent = `(${m}월 ${lastDay}일 구매 확정 예정)`;
  }

  // ─── State ───
  let allItems = [];
  let currentSort = 'votes'; // 'votes' | 'date'

  function sortItems(items, mode) {
    return [...items].sort((a, b) => {
      if (mode === 'votes') {
        if ((b.votes || 0) !== (a.votes || 0)) return (b.votes || 0) - (a.votes || 0);
        return new Date(a.date || 0) - new Date(b.date || 0);
      }
      return new Date(b.date || 0) - new Date(a.date || 0);
    });
  }

  function formatPrice(val) {
    const n = Number(val);
    if (!val && val !== 0) return '—';
    if (isNaN(n)) return String(val);
    return '\u20A9' + n.toLocaleString('ko-KR');
  }

  function renderItems() {
    const container = $('#suggestions-list');
    const voted = getVotedSet();

    const confirmed = allItems.filter(i => i.status === 'confirmed' || i.status === 'purchased');
    const pending = allItems.filter(i => i.status !== 'confirmed' && i.status !== 'purchased');
    const sorted = [...sortItems(pending, currentSort), ...confirmed];

    if (sorted.length === 0) {
      container.innerHTML = `
        <div class="board-empty">
          <div class="empty-icon">📦</div>
          <p>아직 추천된 간식이 없습니다.<br>위에서 첫 번째로 추천해보세요!</p>
        </div>`;
      return;
    }

    const rows = sorted.map((item) => {
      const v = voted.has(String(item.rowIndex));
      const votes = Number(item.votes) || 0;
      const rowCls = item.status === 'confirmed' ? 'row-confirmed'
        : item.status === 'purchased' ? 'row-purchased' : '';
      return `
        <tr class="${rowCls}">
          <td class="td-name">${escapeHtml(item.snackName)}${item.carriedOver ? ' <span class="badge-carryover" style="font-size:0.65rem">이월</span>' : ''}</td>
          <td class="td-center">${item.link ? `<a href="${escapeHtml(item.link)}" target="_blank" style="color:var(--accent)"><i class="bi bi-link-45deg"></i></a>` : ''}</td>
          <td class="td-price">${formatPrice(item.price)}</td>
          <td class="td-date">${item.date || '—'}</td>
          <td class="td-center">
            <button class="btn-vote-inline ${v ? 'voted' : votes === 0 ? 'zero' : ''}" data-row="${item.rowIndex}" ${v ? 'disabled' : ''}>
              <i class="bi bi-heart${v ? '-fill' : ''}"></i> ${votes}
            </button>
          </td>
        </tr>`;
    }).join('');

    container.innerHTML = `
      <div class="board-table-wrap">
        <table class="board-table">
          <thead>
            <tr>
              <th>간식</th>
              <th style="width:40px">링크</th>
              <th style="width:100px">예상가</th>
              <th style="width:100px" class="th-date">등록일</th>
              <th style="width:80px">좋아요</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    container.querySelectorAll('.btn-vote-inline:not([disabled])').forEach((btn) =>
      btn.addEventListener('click', handleVote)
    );
  }

  // ─── Load Suggestions ───
  async function loadSuggestions() {
    const container = $('#suggestions-list');
    const confirmedSection = $('#confirmed-section');
    const confirmedList = $('#confirmed-list');

    container.innerHTML = `
      <div class="board-empty">
        <div class="empty-icon"><i class="bi bi-arrow-repeat spin"></i></div>
        <p>불러오는 중...</p>
      </div>`;

    try {
      const data = await API.getSuggestions(todayMonthKey());
      allItems = data.suggestions || [];

      const confirmed = allItems.filter(i => i.status === 'confirmed' || i.status === 'purchased');

      $('#suggestion-count').textContent = `${allItems.length}개 추천`;

      if (confirmed.length > 0) {
        confirmedSection.style.display = '';
        confirmedList.innerHTML = confirmed.map(item => `
          <div class="confirmed-chip">
            <span>${emoji(item.snackName)} ${escapeHtml(item.snackName)}</span>
            ${item.confirmedPrice || item.price
              ? `<span class="chip-price">${formatKRW(item.confirmedPrice || item.price)}</span>`
              : ''}
          </div>`).join('');
      } else {
        confirmedSection.style.display = 'none';
      }

      renderItems();
    } catch {
      container.innerHTML = `
        <div class="board-empty">
          <div class="empty-icon">🔌</div>
          <p>목록을 불러올 수 없습니다.<br>API 설정을 확인하세요.</p>
        </div>`;
    }
  }

  async function handleVote(e) {
    const btn = e.currentTarget;
    const row = btn.dataset.row;
    btn.disabled = true;

    try {
      await API.vote(row);
      saveVote(row);
      btn.classList.add('voted');
      const num = parseInt(btn.textContent.replace(/\D/g, '')) || 0;
      btn.innerHTML = `<i class="bi bi-heart-fill"></i> ${num + 1}`;
      showToast('좋아요! 투표 반영됨');
    } catch {
      btn.disabled = false;
      showToast('투표 실패', true);
    }
  }

  // ─── Sort toggle ───
  function initSort() {
    const btnVotes = $('#sort-votes');
    const btnDate = $('#sort-date');
    if (!btnVotes || !btnDate) return;

    function updateActive() {
      btnVotes.classList.toggle('active', currentSort === 'votes');
      btnDate.classList.toggle('active', currentSort === 'date');
    }

    btnVotes.addEventListener('click', () => {
      currentSort = 'votes';
      updateActive();
      renderItems();
    });
    btnDate.addEventListener('click', () => {
      currentSort = 'date';
      updateActive();
      renderItems();
    });
    updateActive();
  }

  // ─── Suggest form ───
  function initForm() {
    const form = $('#suggest-form');
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = $('#btn-suggest');
      btn.disabled = true;

      try {
        const qty = $('#input-qty').value;
        await API.addSuggestion({
          name: '',
          snackName: $('#input-snack').value.trim(),
          link: $('#input-link').value.trim(),
          price: $('#input-price').value,
          quantity: qty || '1',
          reason: '',
        });
        form.reset();
        showToast('간식이 추천되었습니다!');
        loadSuggestions();
      } catch {
        showToast('추천 등록 실패', true);
      } finally {
        btn.disabled = false;
      }
    });
  }

  // ─── Init ───
  document.addEventListener('DOMContentLoaded', () => {
    initNav();
    updateMonthTitle();
    initSort();
    initForm();
    loadSuggestions();
  });
})();
