# Lab Snack Hub

연구실 간식 추천 & 투표 플랫폼. 매월 예산(20만원) 내에서 간식을 추천하고, 좋아요 순으로 구매 품목을 확정합니다.

## 주요 기능

- **간식 추천**: 간식 이름, 가격, 수량, 링크 입력 (익명)
- **좋아요 투표**: 추천된 간식에 좋아요 투표
- **구매 기록**: 월별 구매 내역 및 영수증 폴더 확인
- **관리자 패널**: 품목 확정, 이월, 구매 완료 처리, 슬랙 공지
- **월말 이메일 알림**: 매월 말일 KST 자정에 관리자에게 확정 요청 이메일 자동 발송

## 기술 스택

| 영역 | 기술 |
|------|------|
| 프론트엔드 | HTML, CSS, Vanilla JS |
| 백엔드 API | Google Apps Script |
| 데이터베이스 | Google Spreadsheet |
| 호스팅 | Netlify |
| 공지 | Slack Incoming Webhook |

## 프로젝트 구조

```
rise_lab_snack_hub/
├── index.html          # 메인 (추천 & 투표)
├── history.html        # 구매 기록
├── guide.html          # 이용 가이드
├── admin.html          # 관리자 패널
├── css/style.css       # 스타일
├── js/
│   ├── config.js       # API URL, 링크 설정
│   ├── env.js          # 관리자 비밀번호 (gitignored)
│   ├── env.example.js  # env.js 템플릿
│   ├── api.js          # API 통신 레이어
│   ├── app.js          # 메인 페이지 로직
│   ├── admin.js        # 관리자 페이지 로직
│   └── history.js      # 구매 기록 로직
├── assets/
│   └── rise-logo.png   # 로고 이미지
├── apps-script/
│   └── Code.gs         # Apps Script 백엔드 코드
├── netlify.toml        # Netlify 배포 설정
├── SETUP.md            # 상세 설정 가이드
└── .gitignore
```

## 빠른 시작

상세 설정은 [SETUP.md](SETUP.md)를 참고하세요.

### 1. 환경 설정

```bash
# env.js 생성 (관리자 비밀번호)
cp js/env.example.js js/env.js
# env.js 내 ADMIN_PASS 값을 실제 비밀번호로 수정
```

### 2. Netlify 환경 변수

Netlify 대시보드 > Site settings > Environment variables에서:

| 변수명 | 설명 |
|--------|------|
| `ADMIN_PASS` | 관리자 페이지 비밀번호 |

### 3. Apps Script 배포

`apps-script/Code.gs`를 Google Apps Script 에디터에 붙여넣고 웹앱으로 배포합니다.
배포된 URL을 `js/config.js`의 `API_BASE`에 입력합니다.

## 클린 URL

| 경로 | 페이지 |
|------|--------|
| `/home` | 간식 추천 & 투표 |
| `/history` | 구매 기록 |
| `/guide` | 이용 가이드 |
| `/admin` | 관리자 패널 |

## 라이선스

RISE Lab 내부 사용 목적
