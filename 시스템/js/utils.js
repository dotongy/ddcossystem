// js/utils.js

/**
 * DOM 요소 선택 유틸리티
 */
export function $(selector) {
  return document.querySelector(selector);
}

export function $$(selector) {
  return document.querySelectorAll(selector);
}

/**
 * Tailwind CSS 스타일을 동적으로 적용
 */
export function applyStyles() {
  // 이미 스타일이 적용된 경우 중복 실행 방지
  if (document.querySelector("[data-styles-applied]")) return;

  const style = document.createElement("style");
  style.setAttribute("data-styles-applied", "true");
  style.textContent = `
    div[contenteditable="true"]:empty::before {
            content: attr(data-placeholder);
            color: #a1a1aa; /* Tailwind's zinc-400 - 연한 회색 */
            pointer-events: none; /* placeholder 텍스트가 클릭을 방해하지 않도록 설정 */
        }
            
        .btn-primary {
            background-color: #4f46e5;
            color: white;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            font-weight: 500;
            border: none;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .btn-primary:hover {
            background-color: #4338ca;
        }
        .btn-primary:focus {
            outline: 2px solid #6366f1;
            outline-offset: 2px;
        }
        
        .btn-secondary {
            background-color: #e5e7eb;
            color: #374151;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            font-weight: 500;
            border: none;
            cursor: pointer;
            transition: background-color 0.2s;
        }
        .btn-secondary:hover {
            background-color: #d1d5db;
        }
        .btn-secondary:focus {
            outline: 2px solid #9ca3af;
            outline-offset: 2px;
        }
        
        .input {
            width: 100%;
            padding: 0.5rem 0.75rem;
            border: 1px solid #d1d5db;
            border-radius: 0.5rem;
            font-size: 0.875rem;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .input:focus {
            outline: none;
            border-color: #6366f1;
            box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }
        
        .label {
            display: block;
            font-size: 0.875rem;
            font-weight: 500;
            color: #374151;
            margin-bottom: 0.25rem;
        }
        
        .page {
            display: none;
        }
        .page.active {
            display: block;
        }
        
        .currency-toggle-btn {
            padding: 0.25rem 0.75rem;
            border-radius: 0.375rem;
            transition: all 0.2s;
            cursor: pointer;
            border: none;
            background: transparent;
        }
        .active-currency-toggle {
            background-color: white;
            color: #4f46e5;
            box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
        }
        
        .dropdown-item {
            padding: 0.5rem 0.75rem;
            cursor: pointer;
            font-size: 0.875rem;
        }
        .dropdown-item:hover {
            background-color: #f3f4f6;
        }
        
        .nav-link {
            transition: background-color 0.2s;
        }
        .overflow-x-auto {
            overflow-x: visible !important;
        }
        
        @page {
        size: A4 portrait;
        margin: 2cm;
    }    
    `;
  document.head.appendChild(style);
}

/**
 * 날짜 포맷팅 함수
 */
export function formatDate(dateString) {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR");
}

/**
 * 통화 포맷팅 함수
 */
export function formatCurrency(amount, currency = "KRW") {
  if (!amount && amount !== 0) return "";
  const num = parseFloat(amount);
  if (isNaN(num)) return "";

  if (currency === "KRW") {
    return `₩${num.toLocaleString("ko-KR")}`;
  } else if (currency === "USD") {
    return `$${num.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  return num.toLocaleString();
}

/**
 * 숫자 포맷팅 함수
 */
export function formatNumber(number) {
  if (!number && number !== 0) return "";
  return parseFloat(number).toLocaleString("ko-KR");
}

/**
 * 문자열이 비어있는지 확인
 */
export function isEmpty(str) {
  return !str || str.trim().length === 0;
}

/**
 * 오브젝트에서 빈 값들을 제거
 */
export function removeEmptyValues(obj) {
  const result = {};
  Object.keys(obj).forEach((key) => {
    if (obj[key] !== "" && obj[key] !== null && obj[key] !== undefined) {
      result[key] = obj[key];
    }
  });
  return result;
}

/**
 * 폼 데이터를 객체로 변환
 */
export function formDataToObject(formData) {
  const obj = {};
  for (let [key, value] of formData.entries()) {
    obj[key] = value;
  }
  return obj;
}

/**
 * 객체를 폼에 로드
 */
export function loadFormData(formId, data) {
  const form = $(formId);
  if (!form || !data) return;

  Object.keys(data).forEach((key) => {
    const field = form.querySelector(`[name="${key}"]`);
    if (field) {
      if (field.type === "checkbox") {
        field.checked = !!data[key];
      } else {
        field.value = data[key] || "";
      }
    }
  });
}

/**
 * 에러 메시지 표시
 */
export function showError(elementId, message) {
  const element = $(elementId);
  if (element) {
    element.textContent = message;
    element.classList.remove("hidden");
    setTimeout(() => {
      element.classList.add("hidden");
    }, 5000);
  }
}

/**
 * 성공 메시지 표시
 */
export function showSuccess(elementId, message) {
  const element = $(elementId);
  if (element) {
    element.textContent = message;
    element.classList.remove("hidden");
    element.classList.add("text-green-600", "bg-green-100");
    setTimeout(() => {
      element.classList.add("hidden");
      element.classList.remove("text-green-600", "bg-green-100");
    }, 3000);
  }
}

/**
 * 로딩 상태 표시
 */
export function setLoading(buttonId, isLoading) {
  const button = $(buttonId);
  if (!button) return;

  if (isLoading) {
    button.disabled = true;
    button.innerHTML = '<span class="spinner"></span> Loading...';
  } else {
    button.disabled = false;
    // 원래 텍스트로 복원 (버튼의 data-original-text 속성 사용)
    const originalText = button.getAttribute("data-original-text");
    if (originalText) {
      button.innerHTML = originalText;
    }
  }
}

/**
 * 페이지네이션 생성
 */
export function createPagination(containerId, currentPage, totalPages, onPageChange) {
    const container = $(containerId);
    if (!container) return;
    
    container.innerHTML = ''; // 컨테이너 비우기
    if (totalPages <= 1) return; // 페이지가 1개 이하면 표시 안함

    // 한 번에 표시할 최대 페이지 버튼 수
    const maxPagesToShow = 10;

    // 표시할 페이지 번호의 시작과 끝을 계산 (현재 페이지를 중앙에 두려고 시도)
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    // 끝 페이지 기준으로 시작 페이지를 재조정 (예: 마지막 페이지 근처에 있을 때 10개를 채워서 보여주기 위함)
    if (endPage - startPage + 1 < maxPagesToShow) {
        startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    const createButton = (text, page, isDisabled = false, isCurrent = false) => {
        const btn = document.createElement('button');
        btn.textContent = text;
        
        let baseClasses = 'px-3 py-1 text-sm';
        if (isCurrent) {
            btn.className = `btn-primary ${baseClasses}`;
            btn.disabled = true;
        } else {
            btn.className = `btn-secondary ${baseClasses}`;
            btn.disabled = isDisabled;
        }
        
        if (isDisabled) {
            btn.classList.add('opacity-50', 'cursor-not-allowed');
        }
        
        btn.addEventListener('click', () => onPageChange(page));
        return btn;
    };

    // '처음'과 '이전' 버튼 추가
    container.appendChild(createButton('« 처음', 1, currentPage === 1));
    container.appendChild(createButton('‹ 이전', currentPage - 1, currentPage === 1));

    // 시작 페이지가 1보다 크면 생략 (...) 표시
    if (startPage > 1) {
        const dots = document.createElement('span');
        dots.textContent = '...';
        dots.className = 'px-2 text-slate-500 self-center';
        container.appendChild(dots);
    }

    // 계산된 페이지 번호 버튼들 추가
    for (let i = startPage; i <= endPage; i++) {
        container.appendChild(createButton(i, i, false, i === currentPage));
    }

    // 끝 페이지가 전체 페이지 수보다 작으면 생략 (...) 표시
    if (endPage < totalPages) {
        const dots = document.createElement('span');
        dots.textContent = '...';
        dots.className = 'px-2 text-slate-500 self-center';
        container.appendChild(dots);
    }

    // '다음'과 '마지막' 버튼 추가
    container.appendChild(createButton('다음 ›', currentPage + 1, currentPage === totalPages));
    container.appendChild(createButton('마지막 »', totalPages, currentPage === totalPages));
}

/**
 * 디바운스 함수
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * UUID 생성
 */
export function generateUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c == "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * 깊은 복사
 */
export function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  if (typeof obj === "object") {
    const clonedObj = {};
    Object.keys(obj).forEach((key) => {
      clonedObj[key] = deepClone(obj[key]);
    });
    return clonedObj;
  }
}

/**
 * 배열을 청크 단위로 나누기
 */
export function chunkArray(array, chunkSize) {
  const chunks = [];
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize));
  }
  return chunks;
}

/**
 * 문자열을 안전한 HTML로 이스케이프
 */
export function escapeHtml(text) {
  const map = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

/**
 * URL에서 쿼리 파라미터 추출
 */
export function getQueryParams(url = window.location.href) {
  const urlObj = new URL(url);
  const params = {};
  urlObj.searchParams.forEach((value, key) => {
    params[key] = value;
  });
  return params;
}

/**
 * 현재 날짜를 YYYY-MM-DD 형식으로 반환
 */
export function getCurrentDate() {
  return new Date().toISOString().split("T")[0];
}

/**
 * 날짜 문자열을 Date 객체로 변환
 */
export function parseDate(dateString) {
  if (!dateString) return null;
  return new Date(dateString);
}

/**
 * 두 날짜 사이의 차이를 일 단위로 계산
 */
export function daysBetween(date1, date2) {
  const oneDay = 24 * 60 * 60 * 1000;
  const firstDate = new Date(date1);
  const secondDate = new Date(date2);
  return Math.round(Math.abs((firstDate - secondDate) / oneDay));
}

/**
 * 배열에서 중복 제거
 */
export function removeDuplicates(array, key = null) {
  if (!key) {
    return [...new Set(array)];
  }
  const seen = new Set();
  return array.filter((item) => {
    const value = item[key];
    if (seen.has(value)) {
      return false;
    }
    seen.add(value);
    return true;
  });
}

/**
 * 객체 배열을 특정 키로 그룹화
 */
export function groupBy(array, key) {
  return array.reduce((groups, item) => {
    const group = item[key];
    if (!groups[group]) {
      groups[group] = [];
    }
    groups[group].push(item);
    return groups;
  }, {});
}

/**
 * 배열을 특정 키로 정렬
 */
export function sortBy(array, key, direction = "asc") {
  return array.sort((a, b) => {
    const aVal = a[key];
    const bVal = b[key];

    if (direction === "asc") {
      return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
    } else {
      return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
    }
  });
}

/**
 * 파일 다운로드
 */
export function downloadFile(content, filename, contentType = "text/plain") {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * CSV 데이터를 배열로 파싱
 */
export function parseCSV(csvText) {
  const lines = csvText.split("\n");
  const result = [];
  const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(",").map((v) => v.trim().replace(/"/g, ""));
    const obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || "";
    });
    result.push(obj);
  }

  return result;
}

/**
 * 배열을 CSV 형식으로 변환
 */
export function arrayToCSV(array) {
  if (!array.length) return "";

  const headers = Object.keys(array[0]);
  const csvContent = [
    headers.join(","),
    ...array.map((row) =>
      headers
        .map((header) => {
          const value = row[header] || "";
          // CSV에서 쉼표나 따옴표가 포함된 값은 따옴표로 감싸기
          if (
            value.includes(",") ||
            value.includes('"') ||
            value.includes("\n")
          ) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
        })
        .join(","),
    ),
  ].join("\n");

  return csvContent;
}

/**
 * 이메일 유효성 검사
 */
export function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * 전화번호 포맷팅
 */
export function formatPhoneNumber(phoneNumber) {
  if (!phoneNumber) return "";
  // 숫자만 추출
  const cleaned = phoneNumber.replace(/\D/g, "");

  // 한국 전화번호 형식으로 변환
  if (cleaned.startsWith("82")) {
    // +82로 시작하는 경우
    return "+" + cleaned;
  } else if (cleaned.length === 11 && cleaned.startsWith("010")) {
    // 010으로 시작하는 11자리
    return cleaned.replace(/(\d{3})(\d{4})(\d{4})/, "$1-$2-$3");
  } else if (cleaned.length === 10) {
    // 10자리 (지역번호 포함)
    return cleaned.replace(/(\d{2,3})(\d{3,4})(\d{4})/, "$1-$2-$3");
  }

  return phoneNumber; // 변환 실패시 원본 반환
}

/**
 * 로컬 스토리지 래퍼 (에러 처리 포함)
 */
export const storage = {
  get: (key) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error("Storage get error:", error);
      return null;
    }
  },
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error("Storage set error:", error);
      return false;
    }
  },
  remove: (key) => {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error("Storage remove error:", error);
      return false;
    }
  },
};

/**
 * 테이블 행 생성 헬퍼
 */
export function createTableRow(data, columns, actions = []) {
  const tr = document.createElement("tr");
  tr.className = "hover:bg-slate-50";

  columns.forEach((col) => {
    const td = document.createElement("td");
    td.className = "p-3";

    if (typeof col === "string") {
      td.textContent = data[col] || "";
    } else if (typeof col === "function") {
      const result = col(data);
      if (typeof result === "string") {
        td.textContent = result;
      } else {
        td.appendChild(result);
      }
    } else if (col.key) {
      if (col.format) {
        td.textContent = col.format(data[col.key]);
      } else {
        td.textContent = data[col.key] || "";
      }
      if (col.className) {
        td.className += " " + col.className;
      }
    }

    tr.appendChild(td);
  });

  // 액션 버튼들
  if (actions.length > 0) {
    const actionTd = document.createElement("td");
    actionTd.className = "p-3 text-center";

    const actionContainer = document.createElement("div");
    actionContainer.className = "flex items-center justify-center space-x-2";

    actions.forEach((action) => {
      const btn = document.createElement("button");
      btn.textContent = action.text;
      btn.className = action.className || "btn-secondary btn-sm";
      btn.addEventListener("click", () => action.onClick(data));
      actionContainer.appendChild(btn);
    });

    actionTd.appendChild(actionContainer);
    tr.appendChild(actionTd);
  }

  return tr;
}

/**
 * 확인 다이얼로그
 */
export function confirm(message) {
  return window.confirm(message);
}

/**
 * 알림 다이얼로그
 */
export function alert(message) {
  return window.alert(message);
}

/**
 * 프롬프트 다이얼로그
 */
export function prompt(message, defaultValue = "") {
  return window.prompt(message, defaultValue);
}
