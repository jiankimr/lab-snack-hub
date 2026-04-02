/**
 * RISE Lab Snack Hub - API Layer
 * Google Apps Script 백엔드와 통신
 */
const API = {
  /**
   * Apps Script 웹앱에 요청
   */
  async request(action, params = {}) {
    const url = new URL(CONFIG.API_BASE);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        url.searchParams.set(k, v);
      }
    });

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  /**
   * Apps Script 웹앱에 POST 요청
   */
  async post(payload) {
    const res = await fetch(CONFIG.API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
  },

  // ─── 추천 ───
  async getSuggestions(month) {
    return this.request('getSuggestions', { month });
  },

  async addSuggestion({ name, snackName, link, price, quantity, reason }) {
    return this.post({
      action: 'addSuggestion',
      name,
      snackName,
      link: link || '',
      price: price || '',
      quantity: quantity || '1',
      reason: reason || '',
    });
  },

  async vote(rowIndex) {
    return this.post({ action: 'vote', rowIndex });
  },

  // ─── 대시보드 ───
  async getDashboard(month) {
    return this.request('getDashboard', { month });
  },

  // ─── 구매 기록 ───
  async getPurchaseHistory() {
    return this.request('getPurchaseHistory');
  },

  // ─── 관리자 ───
  async confirmItems(month, items) {
    return this.post({ action: 'confirmItems', month, items });
  },

  async updatePrice(rowIndex, price) {
    return this.post({ action: 'updatePrice', rowIndex, price });
  },

  async markPurchased(month) {
    return this.post({ action: 'markPurchased', month });
  },

  async notifySlack(month) {
    return this.post({ action: 'notifySlack', month });
  },

  async carryOver(month) {
    return this.post({ action: 'carryOver', month });
  },
};
