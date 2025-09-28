import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// 결과를 화면에 기록하는 헬퍼 함수
function log(message, status) {
  const logEl = document.getElementById("debug-log");
  if (!logEl) return;

  const p = document.createElement("p");
  p.textContent = message;
  if (status === "success") {
    p.style.color = "green";
    p.textContent = `[성공] ${message}`;
  } else if (status === "failure") {
    p.style.color = "red";
    p.textContent = `[실패] ${message}`;
  } else {
    p.style.color = "black";
    p.textContent = `[정보] ${message}`;
  }
  logEl.appendChild(p);
}

// 디버깅 절차 시작
log("디버그 스크립트가 시작되었습니다.", "info");

// 1. 필수 HTML 요소 확인
try {
  const app = document.getElementById("app-container");
  const login = document.getElementById("login-container");
  if (!app || !login) {
    throw new Error("app-container 또는 login-container를 찾을 수 없습니다.");
  }
  log(
    "필수 HTML 요소(#app-container, #login-container)가 존재합니다.",
    "success",
  );
} catch (e) {
  log(e.message, "failure");
}

// 2. 외부 라이브러리(CDN) 로드 확인
setTimeout(() => {
  log("외부 라이브러리 로드 상태를 확인합니다...", "info");
  const libraries = {
    "Chart.js": window.Chart,
    "SheetJS (XLSX)": window.XLSX,
    "QRCode.js": window.QRCode,
    TailwindCSS: window.tailwind,
  };

  for (const name in libraries) {
    if (libraries[name]) {
      log(`${name} 라이브러리가 로드되었습니다.`, "success");
    } else {
      log(
        `${name} 라이브러리를 로드하지 못했습니다. CDN 링크나 인터넷 연결을 확인하세요.`,
        "failure",
      );
    }
  }
}, 1000); // 1초 후 확인

// 3. Supabase 클라이언트 초기화 및 연결 테스트
setTimeout(async () => {
  log("Supabase 클라이언트 초기화를 시도합니다...", "info");
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      throw new Error(
        "config.js에 SUPABASE_URL 또는 SUPABASE_ANON_KEY가 없습니다.",
      );
    }
    log("Supabase 설정 값(URL, Key)을 성공적으로 가져왔습니다.", "success");

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    if (!supabase) {
      throw new Error("Supabase 클라이언트 생성에 실패했습니다.");
    }
    log("Supabase 클라이언트를 성공적으로 생성했습니다.", "success");

    log("Supabase 인증 상태 확인을 시도합니다... (5초 제한)", "info");

    const authPromise = new Promise((resolve, reject) => {
      supabase.auth.onAuthStateChanged((event, session) => {
        // 한 번만 실행되도록 리스너를 즉시 해제할 수 있지만, 여기서는 성공 여부만 확인
        resolve(event);
      });
      setTimeout(
        () =>
          reject(
            new Error(
              "인증 상태 확인 시간 초과. Supabase Key 또는 네트워크 정책(CORS)을 확인하세요.",
            ),
          ),
        5000,
      );
    });

    await authPromise;
    log("Supabase 인증 서비스에 성공적으로 연결되었습니다.", "success");
  } catch (e) {
    log(e.message, "failure");
  }
}, 2000); // 2초 후 확인
