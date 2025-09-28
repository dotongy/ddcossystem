// js/auth.js

import { supabase } from "./supabase.js";
import { $ } from "./utils.js";

let currentUser = null;

export function initAuth(callback) {
  console.log("Initializing auth...");

  // 1. 로그인/로그아웃 등 상태 변경을 실시간으로 감지
  supabase.auth.onAuthStateChange((event, session) => {
    currentUser = session?.user || null;
    console.log("Auth state changed:", event, currentUser?.email);
    callback(currentUser);
  });

  // 2. 페이지 로딩 시 현재 세션 정보를 즉시 확인하여 초기 상태를 설정
  (async () => {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
      }
      currentUser = session?.user || null;
      console.log("Initial auth state:", currentUser?.email);
      callback(currentUser);
    } catch (error) {
      console.error("Auth initialization error:", error);
      callback(null);
    }
  })();
}

export async function signUp(email, password) {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      console.error("Sign up error:", error.message);
      return { success: false, error: error.message };
    }

    alert(
      "회원가입이 완료되었습니다. 이메일을 확인하여 계정을 활성화해주세요.",
    );
    return { success: true, user: data.user };
  } catch (error) {
    console.error("Sign up exception:", error);
    return { success: false, error: "회원가입 중 오류가 발생했습니다." };
  }
}

export async function signIn(email, password) {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Sign in error:", error.message);
      return { success: false, error: error.message };
    }

    console.log("Sign in successful:", data.user.email);
    return { success: true, user: data.user };
  } catch (error) {
    console.error("Sign in exception:", error);
    return { success: false, error: "로그인 중 오류가 발생했습니다." };
  }
}

export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out error:", error.message);
      return { success: false, error: error.message };
    }

    console.log("Sign out successful");
    window.location.hash = "#login";
    return { success: true };
  } catch (error) {
    console.error("Sign out exception:", error);
    return { success: false, error: "로그아웃 중 오류가 발생했습니다." };
  }
}

export function getCurrentUser() {
  return currentUser;
}

export function setupLoginForm() {
  console.log("Setting up login form...");

  const loginForm = $("#login-form");
  const authErrorEl = $("#auth-error");

  if (!loginForm) {
    console.error("Login form not found");
    return;
  }

  // 기존 이벤트 리스너 제거 (중복 방지)
  if (loginForm.hasAttribute("data-listener-attached")) {
    return;
  }
  loginForm.setAttribute("data-listener-attached", "true");

  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;

    if (!email || !password) {
      if (authErrorEl) {
        authErrorEl.textContent = "이메일과 비밀번호를 모두 입력해주세요.";
        authErrorEl.classList.remove("hidden");
      }
      return;
    }

    // 에러 메시지 초기화
    if (authErrorEl) {
      authErrorEl.textContent = "";
      authErrorEl.classList.add("hidden");
    }

    // 로딩 상태 표시
    const submitBtn = loginForm.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "로그인 중...";
    submitBtn.disabled = true;

    try {
      const { success, error } = await signIn(email, password);

      if (!success) {
        if (authErrorEl) {
          authErrorEl.textContent = error || "로그인에 실패했습니다.";
          authErrorEl.classList.remove("hidden");
        }
      }
    } finally {
      // 로딩 상태 해제
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  });

  const signupLink = $("#show-signup");
  if (signupLink && !signupLink.hasAttribute("data-listener-attached")) {
    signupLink.setAttribute("data-listener-attached", "true");
    signupLink.addEventListener("click", async (e) => {
      e.preventDefault();

      const email = prompt("회원가입할 이메일을 입력하세요:");
      if (!email || !email.trim()) return;

      const password = prompt("사용할 비밀번호를 입력하세요 (6자 이상):");
      if (!password || password.length < 6) {
        alert("비밀번호는 6자 이상이어야 합니다.");
        return;
      }

      // 에러 메시지 초기화
      if (authErrorEl) {
        authErrorEl.textContent = "";
        authErrorEl.classList.add("hidden");
      }

      const { success, error } = await signUp(email.trim(), password);
      if (!success && authErrorEl) {
        authErrorEl.textContent = error || "회원가입에 실패했습니다.";
        authErrorEl.classList.remove("hidden");
      }
    });
  }

  console.log("Login form setup complete");
}
