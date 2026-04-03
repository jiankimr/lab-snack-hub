/**
 * RISE Lab Snack Hub - Google Apps Script Backend
 *
 * 이 파일을 Google Apps Script 에디터에 붙여넣기 하세요.
 * SETUP.md의 상세 설정 가이드를 참고하세요.
 */

// ─── 설정 ───
const SPREADSHEET_ID = '1t3mCumWFhCbQBYZqpon4eUtvxd0EtFkN29QpfToun5A';
const SLACK_WEBHOOK_URL = 'YOUR_SLACK_WEBHOOK_URL'; // 슬랙 Incoming Webhook URL
const MONTHLY_BUDGET = 200000;

// 시트 이름
const SHEET = {
  SUGGESTIONS: '추천목록',
  PURCHASE_LOG: '구매기록',
  CONFIG: '설정',
  FIXED_ITEMS: '고정품목',
};

// ─── 헬퍼 ───
function getSheet(name) {
  return SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(name);
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function getCurrentMonthKST() {
  const now = new Date();
  // KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

function parseDate(dateStr) {
  if (!dateStr) return new Date(0);
  return new Date(dateStr);
}

function normalizeMonth(val) {
  if (val instanceof Date) {
    return Utilities.formatDate(val, 'Asia/Seoul', 'yyyy-MM');
  }
  if (typeof val === 'string' && val.length >= 7) {
    return val.substring(0, 7);
  }
  return String(val);
}

function formatDateSafe(val) {
  if (!val) return '';
  try {
    const d = val instanceof Date ? val : new Date(val);
    if (isNaN(d.getTime())) return '';
    return Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd');
  } catch (e) {
    return '';
  }
}

// ─── GET 핸들러 ───
function doGet(e) {
  const action = e.parameter.action;

  try {
    switch (action) {
      case 'getSuggestions':
        return getSuggestions(e.parameter.month);
      case 'getDashboard':
        return getDashboard(e.parameter.month);
      case 'getPurchaseHistory':
        return getPurchaseHistory();
      case 'getFixedItems':
        return getFixedItems();
      default:
        return jsonResponse({ error: 'Unknown action' });
    }
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ─── POST 핸들러 ───
function doPost(e) {
  try {
    if (!e.postData || !e.postData.contents) {
      return jsonResponse({ error: 'Empty request body' });
    }
    const body = JSON.parse(e.postData.contents);
    const action = body.action;

    switch (action) {
      case 'addSuggestion':
        return addSuggestion(body);
      case 'vote':
        return vote(body);
      case 'confirmItems':
        return confirmItems(body);
      case 'updatePrice':
        return updatePrice(body);
      case 'markPurchased':
        return markPurchased(body);
      case 'notifySlack':
        return notifySlack(body);
      case 'carryOver':
        return carryOver(body);
      case 'addFixedItem':
        return addFixedItem(body);
      case 'removeFixedItem':
        return removeFixedItem(body);
      case 'toggleFixedItem':
        return toggleFixedItem(body);
      case 'insertFixedItems':
        return insertFixedItemsForMonth(body.month);
      default:
        return jsonResponse({ error: 'Unknown action' });
    }
  } catch (err) {
    return jsonResponse({ error: err.message });
  }
}

// ─── 추천 목록 조회 ───
// 시트 컬럼: A:월 | B:추천인 | C:간식이름 | D:링크 | E:예상가격 | F:이유 | G:좋아요수 | H:등록일 | I:상태 | J:확정가격 | K:이월여부 | L:수량
function getSuggestions(month) {
  const sheet = getSheet(SHEET.SUGGESTIONS);
  const data = sheet.getDataRange().getValues();

  const suggestions = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const rowMonth = normalizeMonth(row[0]);

    if (month && rowMonth !== month) continue;

    suggestions.push({
      rowIndex: i + 1,
      month: rowMonth,
      name: row[1],
      snackName: row[2],
      link: row[3],
      price: row[4],
      reason: row[5],
      votes: row[6] || 0,
      date: formatDateSafe(row[7]),
      status: row[8] || 'pending',
      confirmedPrice: row[9] || '',
      carriedOver: row[10] === true || row[10] === 'Y',
      quantity: row[11] || 1,
    });
  }

  // 좋아요 수 내림차순 > 등록일 오름차순 정렬
  suggestions.sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return parseDate(a.date) - parseDate(b.date);
  });

  return jsonResponse({ suggestions });
}

// ─── 추천 등록 ───
function addSuggestion(body) {
  if (!body.snackName || !String(body.snackName).trim()) {
    return jsonResponse({ error: '간식 이름을 입력해주세요.' });
  }

  const sheet = getSheet(SHEET.SUGGESTIONS);
  const month = getCurrentMonthKST();
  const now = new Date();

  sheet.appendRow([
    month,
    body.name || '',
    body.snackName,
    body.link || '',
    body.price ? Number(body.price) : '',
    body.reason || '',
    0,
    now,
    'pending',
    '',
    '',
    body.quantity ? Number(body.quantity) : 1,
  ]);

  return jsonResponse({ success: true });
}

// ─── 좋아요 ───
function vote(body) {
  const rowIndex = Number(body.rowIndex);
  if (!rowIndex || rowIndex < 2) {
    return jsonResponse({ error: '유효하지 않은 항목입니다.' });
  }

  const sheet = getSheet(SHEET.SUGGESTIONS);
  const lastRow = sheet.getLastRow();
  if (rowIndex > lastRow) {
    return jsonResponse({ error: '존재하지 않는 항목입니다.' });
  }

  const currentVotes = sheet.getRange(rowIndex, 7).getValue() || 0;
  sheet.getRange(rowIndex, 7).setValue(currentVotes + 1);

  return jsonResponse({ success: true, votes: currentVotes + 1 });
}

// ─── 대시보드 ───
function getDashboard(month) {
  const m = month || getCurrentMonthKST();

  // 구매기록에서 이번 달 사용 금액 합산
  const logSheet = getSheet(SHEET.PURCHASE_LOG);
  const logData = logSheet.getDataRange().getValues();
  let spent = 0;
  for (let i = 1; i < logData.length; i++) {
    if (normalizeMonth(logData[i][0]) === m) {
      spent += Number(logData[i][4]) || 0; // E열: 금액
    }
  }

  // 추천목록에서 상태 확인
  const sugSheet = getSheet(SHEET.SUGGESTIONS);
  const sugData = sugSheet.getDataRange().getValues();
  let status = 'preparing';
  for (let i = 1; i < sugData.length; i++) {
    if (normalizeMonth(sugData[i][0]) === m) {
      if (sugData[i][8] === 'purchased') {
        status = 'purchased';
        break;
      }
      if (sugData[i][8] === 'confirmed') {
        status = 'confirmed';
      }
    }
  }

  return jsonResponse({
    month: m,
    budget: MONTHLY_BUDGET,
    spent: spent,
    remaining: MONTHLY_BUDGET - spent,
    status: status,
  });
}

// ─── 항목 확정 (관리자) ───
function confirmItems(body) {
  const sheet = getSheet(SHEET.SUGGESTIONS);
  const items = body.items || [];

  items.forEach(function (item) {
    const row = Number(item.rowIndex);
    sheet.getRange(row, 9).setValue('confirmed'); // I열: 상태
    sheet.getRange(row, 10).setValue(Number(item.confirmedPrice) || 0); // J열: 확정가격
  });

  return jsonResponse({ success: true, confirmed: items.length });
}

// ─── 가격 업데이트 (관리자) ───
function updatePrice(body) {
  const sheet = getSheet(SHEET.SUGGESTIONS);
  const row = Number(body.rowIndex);
  sheet.getRange(row, 10).setValue(Number(body.price) || 0);

  return jsonResponse({ success: true });
}

// ─── 구매 완료 처리 ───
function markPurchased(body) {
  const month = body.month || getCurrentMonthKST();
  const sugSheet = getSheet(SHEET.SUGGESTIONS);
  const sugData = sugSheet.getDataRange().getValues();
  const logSheet = getSheet(SHEET.PURCHASE_LOG);

  for (let i = 1; i < sugData.length; i++) {
    if (normalizeMonth(sugData[i][0]) === month && sugData[i][8] === 'confirmed') {
      sugSheet.getRange(i + 1, 9).setValue('purchased');

      // 구매기록 시트에 추가
      // 구매기록 컬럼: A:월 | B:품목 | C:수량 | D:구매처 | E:금액 | F:링크 | G:결제수단 | H:영수증링크 | I:비고 | J:구매일
      logSheet.appendRow([
        month,
        sugData[i][2],
        sugData[i][11] || 1,
        '',
        sugData[i][9] || sugData[i][4] || 0,
        sugData[i][3] || '',
        '',
        '',
        '',
        new Date(),
      ]);
    }
  }

  return jsonResponse({ success: true });
}

// ─── 이월 처리 ───
function carryOver(body) {
  const currentMonth = body.month || getCurrentMonthKST();
  const sugSheet = getSheet(SHEET.SUGGESTIONS);
  const sugData = sugSheet.getDataRange().getValues();

  // 다음 달 계산
  const parts = currentMonth.split('-');
  let y = Number(parts[0]);
  let m = Number(parts[1]) + 1;
  if (m > 12) {
    m = 1;
    y++;
  }
  const nextMonth = `${y}-${String(m).padStart(2, '0')}`;

  let carried = 0;
  for (let i = 1; i < sugData.length; i++) {
    const row = sugData[i];
    // pending 상태인 항목만 이월
    if (normalizeMonth(row[0]) === currentMonth && row[8] === 'pending') {
      sugSheet.appendRow([
        nextMonth,
        row[1],
        row[2],
        row[3],
        row[4],
        row[5],
        row[6],
        row[7],
        'pending',
        '',
        'Y',
        row[11] || 1,
      ]);
      carried++;
    }
  }

  return jsonResponse({ success: true, carried: carried, nextMonth: nextMonth });
}

// ─── 슬랙 공지 ───
function notifySlack(body) {
  const month = body.month || getCurrentMonthKST();
  const sugSheet = getSheet(SHEET.SUGGESTIONS);
  const sugData = sugSheet.getDataRange().getValues();

  const confirmed = [];
  let total = 0;
  for (let i = 1; i < sugData.length; i++) {
    if (normalizeMonth(sugData[i][0]) === month && sugData[i][8] === 'confirmed') {
      const price = Number(sugData[i][9]) || Number(sugData[i][4]) || 0;
      confirmed.push({
        name: sugData[i][2],
        price: price,
        link: sugData[i][3] || '',
      });
      total += price;
    }
  }

  if (confirmed.length === 0) {
    return jsonResponse({ error: '확정된 품목이 없습니다.' });
  }

  // 슬랙 메시지 구성
  const itemLines = confirmed
    .map(function (item, idx) {
      const linkPart = item.link ? ` (<${item.link}|링크>)` : '';
      return `${idx + 1}. ${item.name} - ₩${Number(item.price).toLocaleString()}${linkPart}`;
    })
    .join('\n');

  const message = {
    text: `🍿 *[RISE Lab 간식] ${month} 구매 확정 안내*\n\n${itemLines}\n\n💰 *합계: ₩${total.toLocaleString()}* (예산: ₩${MONTHLY_BUDGET.toLocaleString()})\n\n문의사항이 있으면 말씀해주세요!`,
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(message),
  };

  UrlFetchApp.fetch(SLACK_WEBHOOK_URL, options);

  return jsonResponse({ success: true, itemCount: confirmed.length });
}

// ─── 월말 이메일 알림 ───
const ADMIN_EMAIL = 'jiankimr@gmail.com';

function sendMonthlyReminder() {
  const kst = new Date(new Date().getTime() + 9 * 60 * 60 * 1000);
  const y = kst.getUTCFullYear();
  const m = kst.getUTCMonth() + 1;
  const today = kst.getUTCDate();
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();

  if (today !== lastDay) return;

  const monthKey = `${y}-${String(m).padStart(2, '0')}`;
  const nextM = m === 12 ? 1 : m + 1;

  const sheet = getSheet(SHEET.SUGGESTIONS);
  const data = sheet.getDataRange().getValues();

  const pending = [];
  for (let i = 1; i < data.length; i++) {
    if (normalizeMonth(data[i][0]) === monthKey && data[i][8] === 'pending') {
      pending.push({
        name: data[i][2],
        votes: data[i][6] || 0,
        price: data[i][4] || '미정',
      });
    }
  }
  pending.sort((a, b) => b.votes - a.votes);

  const listText = pending.length > 0
    ? pending.map((p, i) => `${i + 1}. ${p.name} (좋아요 ${p.votes}, 예상가 ${p.price})`).join('\n')
    : '(추천된 간식이 없습니다)';

  const subject = `[Snack Hub] ${nextM}월 간식 구매 리스트 확정 요청`;
  const body = `안녕하세요,\n\n${nextM}월 간식 구매 리스트를 확정해주세요.\n\n` +
    `현재 추천 목록 (${pending.length}건):\n${listText}\n\n` +
    `관리자 페이지에서 확정해주세요.\n\n` +
    `— RISE Lab Snack Hub`;

  MailApp.sendEmail(ADMIN_EMAIL, subject, body);
}

function setupMonthlyTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  triggers.forEach(t => {
    if (t.getHandlerFunction() === 'sendMonthlyReminder') {
      ScriptApp.deleteTrigger(t);
    }
  });
  ScriptApp.newTrigger('sendMonthlyReminder')
    .timeBased()
    .everyDays(1)
    .atHour(15) // UTC 15시 = KST 자정 (0시)
    .create();
}

// ─── 구매 기록 조회 ───
function getPurchaseHistory() {
  const sheet = getSheet(SHEET.PURCHASE_LOG);
  const data = sheet.getDataRange().getValues();

  const records = [];
  for (let i = 1; i < data.length; i++) {
    records.push({
      month: normalizeMonth(data[i][0]),
      item: data[i][1],
      quantity: data[i][2],
      store: data[i][3],
      amount: data[i][4],
      link: data[i][5],
      paymentMethod: data[i][6],
      receiptLink: data[i][7],
      notes: data[i][8],
      purchaseDate: formatDateSafe(data[i][9]),
    });
  }

  // 최신 순
  records.reverse();

  return jsonResponse({ records });
}

// ─── 고정 품목 ───
// 시트 컬럼: A:간식이름 | B:링크 | C:예상가격 | D:수량 | E:활성여부

function getFixedItems() {
  const sheet = getSheet(SHEET.FIXED_ITEMS);
  if (!sheet) return jsonResponse({ items: [] });

  const data = sheet.getDataRange().getValues();
  const items = [];
  for (let i = 1; i < data.length; i++) {
    items.push({
      rowIndex: i + 1,
      snackName: data[i][0] || '',
      link: data[i][1] || '',
      price: data[i][2] || '',
      quantity: data[i][3] || 1,
      active: data[i][4] === 'Y' || data[i][4] === true,
    });
  }
  return jsonResponse({ items });
}

function addFixedItem(body) {
  if (!body.snackName || !String(body.snackName).trim()) {
    return jsonResponse({ error: '간식 이름을 입력해주세요.' });
  }

  const sheet = getSheet(SHEET.FIXED_ITEMS);
  sheet.appendRow([
    String(body.snackName).trim(),
    body.link || '',
    body.price ? Number(body.price) : '',
    body.quantity ? Number(body.quantity) : 1,
    'Y',
  ]);

  return jsonResponse({ success: true });
}

function removeFixedItem(body) {
  const row = Number(body.rowIndex);
  if (!row || row < 2) return jsonResponse({ error: '유효하지 않은 항목입니다.' });

  const sheet = getSheet(SHEET.FIXED_ITEMS);
  sheet.deleteRow(row);
  return jsonResponse({ success: true });
}

function toggleFixedItem(body) {
  const row = Number(body.rowIndex);
  if (!row || row < 2) return jsonResponse({ error: '유효하지 않은 항목입니다.' });

  const sheet = getSheet(SHEET.FIXED_ITEMS);
  const current = sheet.getRange(row, 5).getValue();
  const newVal = (current === 'Y' || current === true) ? 'N' : 'Y';
  sheet.getRange(row, 5).setValue(newVal);
  return jsonResponse({ success: true, active: newVal === 'Y' });
}

// 매월 1일에 고정 품목을 해당 월 추천목록에 삽입
function insertFixedItemsForMonth(monthOverride) {
  const month = monthOverride || getCurrentMonthKST();
  const fixedSheet = getSheet(SHEET.FIXED_ITEMS);
  if (!fixedSheet) return jsonResponse({ success: false, error: '고정품목 시트가 없습니다.' });

  const fixedData = fixedSheet.getDataRange().getValues();
  const sugSheet = getSheet(SHEET.SUGGESTIONS);
  const sugData = sugSheet.getDataRange().getValues();

  // 해당 월에 이미 존재하는 간식 이름 수집
  const existing = new Set();
  for (let i = 1; i < sugData.length; i++) {
    if (normalizeMonth(sugData[i][0]) === month) {
      existing.add(String(sugData[i][2]).trim());
    }
  }

  let inserted = 0;
  const now = new Date();
  for (let i = 1; i < fixedData.length; i++) {
    const row = fixedData[i];
    const name = String(row[0]).trim();
    const active = row[4] === 'Y' || row[4] === true;

    if (!active || !name) continue;
    if (existing.has(name)) continue;

    sugSheet.appendRow([
      month,
      '',
      name,
      row[1] || '',
      row[2] || '',
      '',
      0,
      now,
      'pending',
      '',
      '',
      row[3] || 1,
    ]);
    inserted++;
  }

  return jsonResponse({ success: true, inserted: inserted });
}
