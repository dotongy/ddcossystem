import { handleNavigation, initializeGlobalEventListeners } from "./router.js";
import { initAuth, signOut } from "./auth.js";
import { applyStyles, $ } from "./utils.js";
// ▼▼▼ 1. orders.js에서 OrderApp을 import 합니다. ▼▼▼
import { OrderApp } from "./modules/orders.js";

/**
 * 인증 상태에 따른 UI 업데이트
 */
function updateUIForAuthState(user) {
  // [핵심 수정] 이 함수는 더 이상 로그인/앱 컨테이너를 직접 숨기거나 보여주지 않습니다.
  // 이 역할은 전적으로 router.js의 handleNavigation이 담당합니다.

  if (user) {
    // 로그인된 경우, 앱 내의 사용자 정보만 업데이트합니다.
    const userEmail = $("#user-email");
    if (userEmail) userEmail.textContent = user.email;

    const logoutBtn = $("#logout-btn");
    if (logoutBtn && !logoutBtn.hasAttribute("data-listener-attached")) {
      logoutBtn.setAttribute("data-listener-attached", "true");
      logoutBtn.addEventListener("click", async () => {
        await signOut();
      });
    }
  }
  // 로그아웃된 경우, 이 함수는 아무 작업도 하지 않습니다.
  // 어떤 화면을 보여줄지는 handleNavigation이 결정합니다.
}



/**
 * Initializes the entire application.
 */
async function initializeApp() {
  console.log("App initializing...");
  applyStyles();  

  // ▼▼▼ 3. 인증보다 먼저 필수 데이터를 미리 불러옵니다. ▼▼▼
  // OrderApp이 로드되었는지 확인 후 데이터 초기화
  if (OrderApp && OrderApp.initializeData) {
      console.log("Pre-loading essential data (customers, products)...");
      await OrderApp.initializeData();
      console.log("Essential data loaded.");
  }

  // 인증 상태 변화 감지 및 UI 업데이트
  initAuth((user) => {
    console.log("Auth state updated:", user);
    updateUIForAuthState(user);
    handleNavigation();
  });

  // 전역 이벤트 리스너 및 네비게이션 설정
  initializeGlobalEventListeners();
  window.addEventListener("hashchange", handleNavigation);
}

// DOM이 완전히 로드되면 애플리케이션을 시작합니다.
document.addEventListener("DOMContentLoaded", initializeApp);
