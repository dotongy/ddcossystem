// js/supabase.js

import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// index.html이 불러온 전역(window) supabase 객체의 createClient 함수를 명시적으로 호출합니다.
// 이렇게 하면 이름 충돌이 발생하지 않습니다.
export const supabase = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
);
