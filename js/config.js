/**
 * RISE Lab Snack Hub - Configuration
 *
 * Google Apps Script 배포 후 아래 URL을 실제 웹앱 URL로 교체하세요.
 * SETUP.md 참고
 */
const CONFIG = {
  // Google Apps Script Web App URL (배포 후 교체)
  API_BASE: 'https://script.google.com/macros/s/AKfycbyZLBYABLyBswngVz0I3DDZZgYB4jd0YIznGy9Pd54HBy4UOoNqIRRfKXxDjDim3Bi3aA/exec',

  // 월 예산 (원)
  MONTHLY_BUDGET: 200000,

  // 빠른 링크 (실제 URL로 교체)
  LINKS: {
    SPREADSHEET: 'https://docs.google.com/spreadsheets/d/1t3mCumWFhCbQBYZqpon4eUtvxd0EtFkN29QpfToun5A/edit?usp=sharing',
    RECEIPT_FOLDER: 'https://drive.google.com/drive/folders/1Av6UfW3jEOZhY1tT6ZEUDvE1Pv9MzBtS?usp=sharing',
  },

  // 로컬스토리지 키 (투표 중복 방지)
  VOTE_STORAGE_KEY: 'snackhub_votes',
};
