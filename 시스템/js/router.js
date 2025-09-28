// router.js (기존 안정 버전 + QR 코드 기능만 추가된 최종 버전)

import { $, $$ } from "./utils.js";
import { getPageTemplates } from "./templates.js";
import { applyStyles } from "./utils.js";
import { getCurrentUser, setupLoginForm } from "./auth.js";

// Import all modules
import { DashboardApp } from "./modules/dashboard.js";
import { CustomerApp } from "./modules/customers.js";
// ▼▼▼ 1. BuyerFormApp을 import 목록에 추가합니다. ▼▼▼
import {
  ConsultationApp,
  ConsultationFormApp,
  BuyerFormApp,
} from "./modules/consultations.js";
import { WorkflowApp } from "./modules/workflow.js";
import { ProductApp } from "./modules/products.js";
import { OrderApp } from "./modules/orders.js";
import { InvoiceApp } from "./modules/invoice.js";
import { PackinglistApp } from "./modules/packinglist.js";
import { SettingsApp } from "./modules/settings.js";
import { AnalyticsApp } from "./modules/analytics.js";

const AppState = {
  formContext: {},
};

export const getAppState = () => AppState;

export function initializeGlobalEventListeners() {
  const sidebarNav = $("#sidebar-nav");
  if (sidebarNav) {
    sidebarNav.addEventListener("click", (e) => {
      const navLink = e.target.closest(".nav-link");
      if (navLink && navLink.hash) {
        e.preventDefault();
        if (window.location.hash !== navLink.hash) {
          window.location.hash = navLink.hash;
        }
      }
    });
  }
}

export function handleNavigation() {
  const user = getCurrentUser();
  let hash = window.location.hash.substring(1);

  // ▼▼▼ 이 부분을 수정/추가합니다 ▼▼▼
  // 만약 URL에 해시(#)가 없다면, 경로(pathname)를 확인하여 공개 경로인지 판단합니다.
  if (!hash) {
    const path = window.location.pathname;
    const search = window.location.search; // URL의 ?id=123 같은 부분을 가져옵니다.

    // 경로가 '/buyer-form' 이거나 'buyer-form'이면,
    if (path === '/buyer-form' || path === 'buyer-form') {
      // 경로와 쿼리를 조합하여 해시처럼 만들어줍니다.
      // 예: /buyer-form?id=123  ->  "buyer-form?id=123"
      hash = `buyer-form${search}`;
    }
  }
  // ▲▲▲ 수정 끝 ▲▲▲

  // 위 로직을 거친 후에도 hash가 비어있다면, 그때 로그인/대시보드로 보냅니다.
  if (!hash) {
    hash = user ? "dashboard" : "login";
    window.location.hash = hash;
    return;
  }

  // URL 파라미터 파싱
  let [pageId, query] = hash.split("?");
  
  // pageId 맨 앞에 '/' 문자가 있을 경우 제거 (이전 수정사항 유지)
  if (pageId.startsWith('/')) {
    pageId = pageId.substring(1);
  }

  const params = new URLSearchParams(query);
  const context = Object.fromEntries(params.entries());

  // 현재 페이지가 공개 경로인지 확인
  const isPublicRoute = pageId === "buyer-form";
  const isLoginRoute = pageId === "login";

  console.log('🔍 Navigation Debug:', { hash, pageId, isPublicRoute, isLoginRoute });

  // 인증 가드(Authentication Guard)
  if (!user && !isPublicRoute && !isLoginRoute) {
    window.location.hash = "login";
    return;
  }
  if (user && isLoginRoute) {
    window.location.hash = "dashboard";
    return;
  }

  // 컨테이너 보여주기 로직 (기존과 동일)
  const appContainer = $("#app-container");
  const publicFormContainer = $("#public-form-container");
  const loginContainer = $("#login-container");

  if (isPublicRoute) {
    if (appContainer) appContainer.classList.add("hidden");
    if (loginContainer) loginContainer.classList.add("hidden");
    if (publicFormContainer) publicFormContainer.classList.remove("hidden");
  } else {
    if (publicFormContainer) publicFormContainer.classList.add("hidden");
    if (user) {
        if (appContainer) appContainer.classList.remove("hidden");
        if (loginContainer) loginContainer.classList.add("hidden");
    } else {
        if (appContainer) appContainer.classList.add("hidden");
        if (loginContainer) loginContainer.classList.remove("hidden");
    }
  }

  // 페이지 컨텐츠 로드 (기존과 동일)
  if (!isLoginRoute && !isPublicRoute) {
    updateActiveNavLink(pageId);
  }
  loadPageContent(pageId, context);
}

function updateActiveNavLink(pageId) {
  $$(".nav-link").forEach((l) =>
    l.classList.remove("bg-slate-700", "text-white"),
  );
  let mainPageId = pageId.split("-")[0];
  if (["customer", "product", "order", "consultation", "analytic"].includes(mainPageId)) {
    mainPageId += "s";
  }
  if (pageId.startsWith("consultation")) mainPageId = "consultations";
  const activeLink = $(`.nav-link[href="#${mainPageId}"]`);
  if (activeLink) {
    activeLink.classList.add("bg-slate-700", "text-white");
  }
}

function loadPageContent(pageId, context = {}) {
  const templates = getPageTemplates();
  
  if (pageId === "login") {
    const container = $("#login-container");
    if (container && templates[pageId]) {
      container.innerHTML = templates[pageId];
      applyStyles();
    }
    runPageLogic(pageId, context);
    return;
  }
  
  // exhibitionId 파라미터 확인 로그 추가
  if (pageId === "buyer-form") {
    console.log("🔍 QR Code Navigation:", { 
      pageId, 
      queryString: window.location.hash.split('?')[1] || '', 
      exhibitionId: context.exhibitionId 
    });
  }

  // 일반 페이지들 처리
  $$(".page").forEach((p) => p.classList.remove("active"));
  const container = $(`#${pageId}-page`);

  if (!container) {
    console.warn(`Container not found for page: ${pageId}. Redirecting to dashboard.`);
    window.location.hash = 'dashboard';
    return;
  }
  
  if (container.innerHTML.trim() === "") {
    if (templates[pageId]) {
      if (pageId === 'products') {
        console.log('--- 현재 브라우저가 사용하는 Products 템플릿 내용 ---');
        console.log(templates[pageId]);
      }
      container.innerHTML = templates[pageId];
      applyStyles();
    }
  }

  container.classList.add("active");
  runPageLogic(pageId, context);
}

function runPageLogic(pageId, context = {}) {
  try {
    switch (pageId) {
      case "login":
        setupLoginForm();
        break;
      case "dashboard":
        if (typeof DashboardApp !== "undefined") DashboardApp.init();
        break;
      case "customers":
        if (typeof CustomerApp !== "undefined") CustomerApp.init();
        break;
      case "customer-form":
        if (typeof CustomerApp !== "undefined")
          CustomerApp.openEditor(AppState.formContext.isEdit, AppState.formContext.data);
        break;
      case "consultations":
        if (typeof ConsultationApp !== "undefined")
          ConsultationApp.init(context);
        break;
      case "consultation-form":
        if (typeof ConsultationFormApp !== "undefined")
          ConsultationFormApp.init(AppState.formContext);
        break;
        
      // ▼▼▼ 5. buyer-form에 대한 로직을 추가합니다. ▼▼▼
      case "buyer-form":
        if (typeof BuyerFormApp !== "undefined") {
            BuyerFormApp.init(context.exhibitionId);
        }
        break;

      case "workflow":
        if (typeof WorkflowApp !== "undefined") WorkflowApp.init();
        break;
      case "products":
        if (typeof ProductApp !== "undefined") ProductApp.init();
        break;
      case "product-form":
        if (typeof ProductApp !== "undefined")
          ProductApp.openEditor(AppState.formContext.isEdit, AppState.formContext.data);
        break;
      case "orders":
        if (typeof OrderApp !== "undefined") OrderApp.init();
        break;
      case "order-form":
        if (typeof OrderApp !== "undefined")
          OrderApp.openEditor(AppState.formContext.isEdit, AppState.formContext.data);
        break;      
      case "invoice":
        if (typeof InvoiceApp !== "undefined") InvoiceApp.init();
        break;
      case "packinglist":
        if (typeof PackinglistApp !== "undefined") PackinglistApp.init();
        break;
      case "settings":
        if (typeof SettingsApp !== "undefined") SettingsApp.init();
        break;
      case "analytics":
        if (typeof AnalyticsApp !== "undefined") AnalyticsApp.init();
        break;
      default:
        console.warn(`Router: No logic defined for page '${pageId}'`);
    }
  } catch (error) {
    console.error(`Error running page logic for ${pageId}:`, error);
  }
}