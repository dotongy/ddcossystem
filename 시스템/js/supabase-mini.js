import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

// Supabase REST API를 직접 호출하는 함수
export async function fetchCustomersDirectly(filters) {
  const { page, rowsPerPage, countryFilter, searchTerm } = filters;

  // Supabase REST API 엔드포인트 URL 생성
  const url = new URL(`${SUPABASE_URL}/rest/v1/customers`);

  // 필수 파라미터 추가 (데이터 선택 및 정렬)
  url.searchParams.append("select", "*");
  url.searchParams.append("order", "created_at.desc");

  // 페이지네이션 헤더 설정
  const from = (page - 1) * rowsPerPage;
  const to = from + rowsPerPage - 1;
  const headers = {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    Range: `${from}-${to}`,
    Accept: "application/json",
    Prefer: "count=exact", // 전체 개수를 함께 받기 위한 설정
  };

  // 필터 조건 추가
  if (countryFilter && countryFilter !== "all") {
    if (countryFilter === "eu") {
      const euCountries = `("Austria","Belgium","Bulgaria","Croatia","Cyprus","Czechia","Denmark","Estonia","Finland","France","Germany","Greece","Hungary","Ireland","Italy","Latvia","Lithuania","Luxembourg","Malta","Netherlands","Poland","Portugal","Romania","Slovakia","Slovenia","Spain","Sweden")`;
      url.searchParams.append("country", `in.${euCountries}`);
    } else {
      url.searchParams.append("country", `eq.${countryFilter}`);
    }
  }

  if (searchTerm) {
    const orQuery = `(name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%)`;
    url.searchParams.append("or", orQuery);
  }

  // API 요청 보내기
  const response = await fetch(url.toString(), { headers });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      errorData.message || `HTTP error! status: ${response.status}`,
    );
  }

  // 결과 파싱
  const data = await response.json();
  const contentRange = response.headers.get("content-range");
  const count = contentRange ? parseInt(contentRange.split("/")[1], 10) : 0;

  return { data, count, error: null };
}
