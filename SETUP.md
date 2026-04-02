# RISE Lab Snack Hub - 설정 가이드

## 전체 아키텍처

```
[Netlify (프론트엔드)]  ←→  [Google Apps Script (API)]  ←→  [Google Spreadsheet (DB)]
                                      ↓
                              [Slack Webhook (공지)]
                              [Gmail 월말 알림]
```

## 페이지 구조

| 경로 | 파일 | 설명 |
|------|------|------|
| `/home` | `index.html` | 간식 추천 & 투표 (메인) |
| `/history` | `history.html` | 구매 기록 |
| `/guide` | `guide.html` | 이용 가이드 |
| `/admin` | `admin.html` | 관리자 패널 (비밀번호 보호) |

---

## 1단계: Google 스프레드시트 생성

### 1-1. 새 스프레드시트 생성
1. [Google Sheets](https://sheets.google.com)에서 새 스프레드시트 생성
2. 이름: `RISE Lab Snack Hub`

### 1-2. 시트 생성 (총 3개)

#### 시트 1: `추천목록`
| 열 | A | B | C | D | E | F | G | H | I | J | K | L |
|----|---|---|---|---|---|---|---|---|---|---|---|---|
| 헤더 | 월 | 추천인 | 간식이름 | 링크 | 예상가격 | 이유 | 좋아요수 | 등록일 | 상태 | 확정가격 | 이월여부 | 수량 |
| 예시 | 2026-04 | | 허니버터칩 | https://... | 3000 | | 5 | 2026-04-01 | pending | | | 2 |

- **상태 값**: `pending` (대기) → `confirmed` (확정) → `purchased` (구매완료)
- **이월여부**: 이월된 항목은 `Y`
- **추천인**: 익명 운영으로 비워둠

#### 시트 2: `구매기록`
| 열 | A | B | C | D | E | F | G | H | I | J |
|----|---|---|---|---|---|---|---|---|---|---|
| 헤더 | 월 | 품목 | 수량 | 구매처 | 금액 | 링크 | 결제수단 | 영수증링크 | 비고 | 구매일 |
| 예시 | 2026-04 | 허니버터칩 | 2 | 쿠팡 | 6000 | https://... | 법인카드 | https://drive... | | 2026-04-25 |

#### 시트 3: `설정`
| 열 | A | B |
|----|---|---|
| 헤더 | 키 | 값 |
| 데이터 | monthly_budget | 200000 |
| 데이터 | slack_channel | #lab-snacks |

### 1-3. 스프레드시트 ID 확인
URL에서 ID를 복사합니다:
```
https://docs.google.com/spreadsheets/d/{이 부분이 ID}/edit
```

---

## 2단계: Google Apps Script 설정

### 2-1. Apps Script 프로젝트 생성
1. 스프레드시트에서 **확장 프로그램 > Apps Script** 클릭
2. 또는 [script.google.com](https://script.google.com)에서 새 프로젝트 생성

### 2-2. 코드 붙여넣기
1. 기본 `Code.gs` 파일의 내용을 모두 삭제
2. 이 프로젝트의 `apps-script/Code.gs` 파일 내용을 붙여넣기

### 2-3. 설정값 수정
코드 상단의 설정값을 실제 값으로 교체:
```javascript
const SPREADSHEET_ID = '실제_스프레드시트_ID';
const SLACK_WEBHOOK_URL = '실제_슬랙_웹훅_URL';
```

### 2-4. 웹앱으로 배포
1. **배포 > 새 배포** 클릭
2. 유형: **웹 앱** 선택
3. 설정:
   - 설명: `RISE Lab Snack Hub API`
   - 실행 주체: **나(본인 계정)**
   - 액세스 권한: **모든 사용자**
4. **배포** 클릭
5. 표시되는 **웹 앱 URL**을 복사

> ⚠️ 코드를 수정할 때마다 **새 배포**를 해야 변경사항이 반영됩니다.

---

## 3단계: 프론트엔드 설정

### 3-1. config.js 수정
`js/config.js` 파일에서 실제 URL로 교체:
```javascript
const CONFIG = {
  API_BASE: '여기에_Apps_Script_웹앱_URL_붙여넣기',
  MONTHLY_BUDGET: 200000,
  LINKS: {
    SPREADSHEET: '여기에_스프레드시트_URL',
    RECEIPT_FOLDER: '여기에_구글드라이브_영수증_폴더_URL',
  },
  VOTE_STORAGE_KEY: 'snackhub_votes',
};
```

---

## 4단계: Netlify 배포

### 4-1. GitHub 저장소 생성 & 푸시
```bash
cd rise_lab_snack_hub
git init
git add .
git commit -m "Initial commit: RISE Lab Snack Hub"
git remote add origin https://github.com/YOUR_USERNAME/rise-lab-snack-hub.git
git push -u origin main
```

### 4-2. Netlify 배포
1. [Netlify](https://app.netlify.com) 로그인
2. **Add new site > Import an existing project**
3. GitHub 연결 후 `rise-lab-snack-hub` 레포 선택
4. 설정:
   - Branch: `main`
   - Build command: (비워둠)
   - Publish directory: `.`
5. **Deploy site** 클릭

> 이후 GitHub에 push하면 자동 배포됩니다.

### 4-3. 클린 URL
`netlify.toml`에 리다이렉트가 설정되어 있어 아래 경로로 접속 가능합니다:
- `/home` → 메인 페이지
- `/history` → 구매 기록
- `/guide` → 이용 가이드
- `/admin` → 관리자 패널

---

## 5단계: Slack Webhook 설정 (선택)

### 5-1. Slack App 생성
1. [Slack API](https://api.slack.com/apps)에서 **Create New App** 클릭
2. **From scratch** 선택
3. App 이름: `RISE Lab Snack Bot`

### 5-2. Incoming Webhook 활성화
1. 왼쪽 메뉴 **Incoming Webhooks** 클릭
2. **Activate Incoming Webhooks** 토글 ON
3. **Add New Webhook to Workspace** 클릭
4. 공지를 보낼 채널 선택 (예: `#lab-snacks`)
5. 표시되는 **Webhook URL**을 복사

### 5-3. Webhook URL 설정
복사한 URL을 `apps-script/Code.gs`의 `SLACK_WEBHOOK_URL`에 붙여넣기

---

## 6단계: Google Drive 영수증 폴더 (선택)

1. Google Drive에 `RISE Lab 간식 영수증` 폴더 생성
2. 폴더 URL을 `js/config.js`의 `RECEIPT_FOLDER`에 입력
3. 영수증 폴더 링크는 **구매 기록(`/history`)** 페이지와 **관리자(`/admin`)** 페이지에서 접근 가능
4. 스프레드시트 원본 링크는 관리자 페이지에서만 접근 가능

---

## 7단계: 월말 이메일 알림 설정

Apps Script에 매월 말일 KST 자정에 관리자에게 확정 요청 이메일을 보내는 트리거가 포함되어 있습니다.

### 7-1. 트리거 설정 (1회)
1. Apps Script 에디터 상단 함수 선택 드롭다운에서 `setupMonthlyTrigger` 선택
2. **실행** 클릭
3. Gmail 발송 권한 승인

> 트리거는 매일 UTC 15시(KST 자정)에 실행되며, 해당 날이 월말인 경우에만 이메일이 발송됩니다.
> 수신 주소는 `Code.gs`의 `ADMIN_EMAIL` 상수에서 변경할 수 있습니다.

---

## 운영 가이드

### 월간 프로세스
1. **월초**: 연구실원들이 `/home`에서 간식 추천 & 좋아요
2. **월말 자정**: 관리자에게 확정 요청 이메일 자동 발송
3. **월말**: 관리자가 `/admin`에서 (비밀번호: 관리자에게 문의):
   - 좋아요 순으로 정렬된 목록 확인
   - 예산(20만원) 내에서 품목 선택 & 가격 확정
   - 미선택 품목은 "이월" 버튼으로 다음 달로 이동
   - "슬랙 공지" 버튼으로 확정 목록 공지
   - 구매 후 "구매 완료" 버튼 클릭

### CORS 관련
Apps Script 웹앱은 기본적으로 CORS를 허용합니다. 단, `POST` 요청 시 `Content-Type`을 `text/plain`으로 보내야 합니다 (api.js에서 이미 처리됨).

### 문제 해결
- **API 호출 실패**: Apps Script 웹앱 URL이 올바른지 확인
- **데이터 안 보임**: 스프레드시트 시트 이름이 정확히 `추천목록`, `구매기록`, `설정`인지 확인
- **슬랙 공지 실패**: Webhook URL이 올바른지 확인, Apps Script에서 직접 `notifySlack` 함수 테스트
