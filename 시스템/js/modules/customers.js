// js/modules/customers.js

import { supabase } from "../supabase.js";
import { $, $$ } from "../utils.js";
import { ALL_COUNTRIES, EU_COUNTRIES, DEPARTMENT_EMAIL_CC } from "../config.js";
import { getAppState } from "../router.js";
import { getCurrentUser } from "../auth.js";

export const CustomerApp = {
  listEl: null,
  form: null,
  title: null,
  idInput: null,
  errorMsg: null,
  saveBtn: null,
  countrySearch: null,
  countryDropdown: null,
  allCustomersForFilter: [],
  exhibitionMap: new Map(),

  currentPage: 1,
  rowsPerPage: 15,
  totalRows: 0,

  async loadExhibitions() {
    try {
      const { data, error } = await supabase
        .from("exhibitions")
        .select("id, name");
      if (error) throw error;
      
      this.exhibitionMap.clear();
      data.forEach(ex => this.exhibitionMap.set(String(ex.id), ex.name));

    } catch (e) {
      console.error("Failed to load exhibitions:", e);
    }
  },

  openNaverWorksCompose(emails = []) {
    if (emails.length === 0) {
      alert("메일을 보낼 고객을 선택해주세요.");
      return;
    }
    const baseUrl = 'https://mail.worksmobile.com/write/popup';
    const params = new URLSearchParams({
        srvid: 'mail',
        orderType: 'new',
        memo: 'false'
    });
    const recipientField = emails.length > 1 ? 'bcc' : 'to';
    params.set(recipientField, emails.join(','));
    const composeUrl = `${baseUrl}?${params.toString()}`;
    window.open(composeUrl, '_blank');
  },

  async exportAllCustomersToExcel() {
    try {
        const { data: customers, error } = await supabase
            .from("customers")
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        if (customers.length === 0) {
            alert("내보낼 고객 데이터가 없습니다.");
            return;
        }

        const headers = [
            'id', 'name', 'contact_person', 'email', 'phone', 
            'country', 'address', 'has_business_card', 'created_at'
        ];
        const worksheet = XLSX.utils.json_to_sheet(customers, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
        const today = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `customers_export_${today}.xlsx`);
    } catch (e) {
        alert(`데이터 내보내기 중 오류 발생: ${e.message}`);
    }
  },

  setup() {
    this.listEl = $("#customer-list");
    this.form = $("#customer-form");
    this.title = $("#customer-form-title");
    this.idInput = $("#customer-id");
    this.errorMsg = $("#customer-error-message");
    this.saveBtn = $("#customer-save-btn");
    this.countrySearch = $("#country-search");
    this.countryDropdown = $("#country"); // [수정] 폼에 있는 select 태그의 ID 'country'로 변경
  },

  async init() {
    // [변경 없음] 초기 설정은 그대로 유지됩니다.
    this.setup();
    const page = $("#customers-page");
    if (page && !page.dataset.initialized) {
      // 페이지 최상단 요소들에 대한 이벤트 리스너는 여기서 한 번만 설정합니다.
      page.addEventListener("click", this.handlePageClick.bind(this));
      $("#customer-excel-input").addEventListener("change", (e) =>
        this.handleExcelImport(e),
      );
      page.dataset.initialized = "true";
    }

    await this.loadExhibitions();
    await this.populateCountryFilter(); // 초기 필터 목록 채우기
    await this.fetch(1);
  },

  async fetch(page = 1) {
    // [변경] 순서 문제를 해결한 fetch 로직
    this.currentPage = page;

    const countryFilterInput = $("#country-filter");
    const searchInput = $("#customer-search-input");
    const countryFilter = countryFilterInput ? countryFilterInput.value : 'all';
    const searchTerm = searchInput ? searchInput.value.trim().toLowerCase() : '';

    const pageEl = $("#customers-page");
    if (pageEl) {
        pageEl.innerHTML = `<div class="p-4 text-center text-secondary">고객 목록을 불러오는 중...</div>`;
    }

    try {
      let query = supabase.from("customers").select("*", { count: "exact" });

      if (countryFilter && countryFilter !== "all" && countryFilter !== "eu") {
        query = query.eq("country", countryFilter);
      }
      if (countryFilter === "eu") {
        query = query.in("country", EU_COUNTRIES);
      }
      if (searchTerm) {
        query = query.ilike("name", `%${searchTerm}%`);
      }

      const from = (page - 1) * this.rowsPerPage;
      const to = from + this.rowsPerPage - 1;

      query = query.order("created_at", { ascending: false }).range(from, to);

      const { data, count, error } = await query;
      if (error) throw error;

      this.totalRows = count;
      this.renderCustomerPage(data, searchTerm, countryFilter); // [변경] 새 렌더링 함수 호출
      this.renderPagination();
    } catch (e) {
      console.error("CustomerApp: Data fetching failed.", e);
      if (pageEl) {
        pageEl.innerHTML = `<div class="p-4 text-center text-danger">데이터 로딩 실패: ${e.message}</div>`;
      }
    }
  },

  async deleteSelectedCustomers() {
    const selectedIds = Array.from($$("#customer-list-body .customer-checkbox:checked"))
        .map(cb => cb.dataset.id);

    if (selectedIds.length === 0) {
        alert("삭제할 고객을 선택해주세요.");
        return;
    }
    if (!confirm(`${selectedIds.length}명의 고객을 정말로 삭제하시겠습니까?`)) {
        return;
    }

    try {
        const { error } = await supabase.from("customers").delete().in("id", selectedIds);
        if (error) throw error;
        alert(`${selectedIds.length}명의 고객 정보가 삭제되었습니다.`);
        await this.fetch(this.currentPage);
    } catch (error) {
        alert(`삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  },

  handlePageClick(e) {
    const target = e.target.closest("button");
    if (!target) return;

    if (target.id === "add-customer-btn") {
        getAppState().formContext = { isEdit: false };
        window.location.hash = "customer-form";
    } else if (target.id === "send-email-btn") {
        this.handleSendEmail();
    } else if (target.id === "delete-selected-customers-btn") {
        this.deleteSelectedCustomers();
    } else if (target.id === "import-customer-excel-btn") {
        $("#customer-excel-input").click();
    } else if (target.id === "download-customer-template-btn") {
        this.downloadExcelTemplate();
    } else if (target.id === "export-all-customers-btn") {
        this.exportAllCustomersToExcel();        
    }
  },

  formatSource(source) {
    if (!source) return "N/A";
    const match = source.match(/_(\d+)$/);
    if (match) {
      const exhibitionId = match[1];
      if (this.exhibitionMap.has(exhibitionId)) {
        return this.exhibitionMap.get(exhibitionId);
      }
    }
    return source; 
  },

  downloadExcelTemplate() {
    const columnMap = {
      "Company Name": "name", "Contact Person": "contact_person", Email: "email",
      Phone: "phone", Country: "country", Address: "address",
      "Business Card Received": "has_business_card",
    };
    const headers = Object.keys(columnMap);
    const sampleData = [{
        "Company Name": "Example Corp", "Contact Person": "John Doe",
        Email: "john.doe@example.com", Phone: "123-456-7890",
        Country: "Korea, South", Address: "123 Example St, Seoul",
        "Business Card Received": "TRUE",
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Customers");
    XLSX.writeFile(workbook, "customer_import_template.xlsx");
  },

  async handleExcelImport(event) {
    // [변경 없음] 기존 로직 그대로 유지
    const file = event.target.files[0];
    if (!file) return;
    alert("엑셀 파일을 처리 중입니다. 데이터 양에 따라 시간이 걸릴 수 있습니다.");

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: "array" });
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            const json = XLSX.utils.sheet_to_json(worksheet);

            if (json.length === 0) throw new Error("엑셀 파일에 데이터가 없습니다.");

            const columnMap = {
                'id': 'id', 'name': 'name', 'contact_person': 'contact_person',
                'email': 'email', 'phone': 'phone', 'country': 'country',
                'address': 'address', 'has_business_card': 'has_business_card'
            };

            const user = getCurrentUser();
            if (!user) throw new Error("로그인이 필요합니다.");

            const dataToUpsert = json.map(row => {
                const newRow = {};
                for (const excelHeader in row) {
                    const normalizedHeader = String(excelHeader).toLowerCase().trim().replace(/\s+/g, ' ');
                    const dbColumn = Object.keys(columnMap).find(key => columnMap[key] === normalizedHeader);
                    if (dbColumn) {
                        if (dbColumn === "has_business_card") {
                            newRow[dbColumn] = String(row[excelHeader]).toUpperCase() === "TRUE";
                        } else {
                            newRow[dbColumn] = row[excelHeader];
                        }
                    }
                }
                if (!newRow.id) {
                    newRow.user_id = user.id;
                }
                return newRow;
            });
            
            const { error } = await supabase.from("customers").upsert(dataToUpsert, { onConflict: 'id' });
            if (error) throw error;
            
            alert(`${dataToUpsert.length}개의 고객 정보가 성공적으로 반영되었습니다.`);
            await this.populateCountryFilter();
            await this.fetch(1);

        } catch (err) {
            alert(`가져오기 실패: ${err.message}`);
        } finally {
            event.target.value = "";
        }
    };
    reader.readAsArrayBuffer(file);
  },

  async populateCountryFilter() {
    // [변경 없음] 기존 로직 그대로 유지
    const { data, error } = await supabase.from("customers").select("country");
    if (error) {
      console.error("Failed to load countries for filter", error);
      return;
    }
    const filter = $("#country-filter");
    // 필터 요소가 렌더링 되기 전일 수 있으므로 null 체크 추가
    if (!filter) return;

    const existingCountries = new Set(data.map((c) => c.country).filter(Boolean));

    filter.innerHTML = `
      <option value="all">All Countries</option>
      <option value="eu">EU Countries</option>
      <option disabled>---</option>
      ${[...existingCountries].sort().map((c) => `<option value="${c}">${c}</option>`).join("")}
    `;
  },

  renderPagination() {
    const paginationEl = $("#customer-pagination");
    if (!paginationEl) return;
    const totalPages = Math.ceil(this.totalRows / this.rowsPerPage);

    if (totalPages <= 1) {
      paginationEl.innerHTML = "";
      return;
    }
    
    let html = "";
    
    // [수정] 'First'와 'Prev' 버튼 추가 및 영문화
    html += `<button class="bg-white border border-border text-secondary font-bold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm ${this.currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""}" ${this.currentPage === 1 ? "disabled" : ""} data-page="1">&laquo; First</button>`;
    html += `<button class="bg-white border border-border text-secondary font-bold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm ${this.currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""}" ${this.currentPage === 1 ? "disabled" : ""} data-page="${this.currentPage - 1}">Prev</button>`;
    
    // 페이지 번호 버튼 목록
    let pageLinks = '';
    // 페이지가 너무 많을 경우 ...으로 생략하는 로직 추가
    let startPage = Math.max(1, this.currentPage - 2);
    let endPage = Math.min(totalPages, this.currentPage + 2);

    if (this.currentPage < 4) {
        endPage = Math.min(5, totalPages);
    }
    if (this.currentPage > totalPages - 3) {
        startPage = Math.max(1, totalPages - 4);
    }
    
    if (startPage > 1) {
        pageLinks += `<span class="px-4 py-2 text-sm">...</span>`;
    }

    for (let i = startPage; i <= endPage; i++) {
        pageLinks += (i === this.currentPage)
            ? `<button class="bg-primary text-white font-bold py-2 px-4 rounded-lg text-sm" disabled>${i}</button>`
            : `<button class="bg-white border border-border text-secondary font-bold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm" data-page="${i}">${i}</button>`;
    }

    if (endPage < totalPages) {
        pageLinks += `<span class="px-4 py-2 text-sm">...</span>`;
    }

    html += `<div class="flex items-center space-x-2 flex-wrap justify-center gap-y-2">${pageLinks}</div>`;

    // [수정] 'Next'와 'Last' 버튼 추가 및 영문화
    html += `<button class="bg-white border border-border text-secondary font-bold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm ${this.currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""}" ${this.currentPage === totalPages ? "disabled" : ""} data-page="${this.currentPage + 1}">Next</button>`;
    html += `<button class="bg-white border border-border text-secondary font-bold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm ${this.currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""}" ${this.currentPage === totalPages ? "disabled" : ""} data-page="${totalPages}">Last &raquo;</button>`;

    // 가장 바깥쪽 컨테이너
    paginationEl.innerHTML = `<div class="flex justify-center items-center w-full flex-wrap gap-x-2 gap-y-4">${html}</div>`;
    
    // 페이지네이션 버튼 이벤트 리스너 연결
    paginationEl.querySelectorAll("button[data-page]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const pageToGo = parseInt(e.currentTarget.dataset.page);
        this.fetch(pageToGo);
      });
    });
  },

  // ===============================================================================================
  // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
  // 기존의 render() 함수는 아래의 새로운 renderCustomerPage() 함수로 대체됩니다.
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
  // ===============================================================================================
  
  /**
   * [신규] 고객 관리 페이지 전체를 새로운 디자인으로 렌더링하는 함수.
   * 기존 render() 함수를 대체하며 모든 UI 렌더링과 이벤트 연결을 담당합니다.
   */
  renderCustomerPage(customers, currentSearchTerm = '', currentCountryFilter = 'all') {
    const pageEl = $("#customers-page");
    if (!pageEl) return;

    // 페이지 전체 HTML 구조
    const pageHTML = `
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">고객 관리</h2>
        <div class="flex items-center space-x-2">
            <button id="download-customer-template-btn" class="bg-white border border-border text-secondary font-bold py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors">템플릿 다운로드</button>
            <button id="import-customer-excel-btn" class="bg-white border border-border text-secondary font-bold py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors">Excel 가져오기</button>
            <button id="export-all-customers-btn" class="bg-white border border-border text-secondary font-bold py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors">전체 내보내기</button>
            <button id="add-customer-btn" class="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark transition-colors">+ 새 고객 등록</button>
        </div>
      </div>
      <div class="mb-4 bg-white p-4 rounded-lg shadow-md">
        <div class="flex justify-between items-center">
            <div class="flex items-center space-x-4">
                <div class="relative">
                    <input type="text" id="customer-search-input" placeholder="고객명 검색..." class="w-64 pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary" value="${currentSearchTerm}">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" /></svg>
                    </span>
                </div>
                <select id="country-filter" class="w-48 py-2 px-3 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white"></select>
            </div>
            <div id="bulk-action-container" class="flex items-center space-x-2">
                <button id="send-email-btn" class="hidden bg-green-500 text-white font-bold py-2 px-4 rounded-lg hover:bg-green-600">이메일 발송</button>
                <button id="delete-selected-customers-btn" class="hidden bg-danger text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700">선택 삭제</button>
            </div>
        </div>
      </div>
      <div class="bg-white rounded-lg shadow-md overflow-hidden">        
        <table class="min-w-full table-fixed">
          <thead class="bg-gray-50">
            <tr>              
              <th class="p-4 w-[5%] text-center"><input type="checkbox" id="select-all-customers-checkbox" class="h-4 w-4"></th>
              <th class="p-4 w-[15%] text-left text-sm font-semibold text-gray-600 uppercase">고객명</th>
              <th class="p-4 w-[12%] text-left text-sm font-semibold text-gray-600 uppercase">담당자</th>
              <th class="p-4 w-[23%] text-left text-sm font-semibold text-gray-600 uppercase">연락처/이메일</th>
              <th class="p-4 w-[15%] text-left text-sm font-semibold text-gray-600 uppercase">국가</th>
              <th class="p-4 w-[8%] text-center text-sm font-semibold text-gray-600 uppercase">명함</th>
              <th class="p-4 w-[10%] text-center text-sm font-semibold text-gray-600 uppercase">등록일</th>
              <th class="p-4 w-[12%] text-center text-sm font-semibold text-gray-600 uppercase">관리</th>
            </tr>
          </thead>
          <tbody id="customer-list-body" class="divide-y divide-border">
          </tbody>
        </table>
      </div>
      <div id="customer-pagination" class="mt-4 flex justify-center"></div>
    `;
    pageEl.innerHTML = pageHTML;

    // 테이블 본문(tbody) 채우기
    const tableBody = $("#customer-list-body");
    if (customers.length === 0) {
      tableBody.innerHTML = `<tr><td class="p-4 text-center text-secondary" colspan="8">표시할 고객이 없습니다.</td></tr>`;
    } else {
      tableBody.innerHTML = customers.map(c => {
        const isEU = EU_COUNTRIES.includes(c.country);
        // [수정 3] 긴 텍스트가 줄바꿈되거나 잘리도록 클래스를 추가합니다.
        return `
            <tr data-id="${c.id}" class="hover:bg-gray-50">
              <td class="p-4 text-center"><input type="checkbox" class="customer-checkbox h-4 w-4" data-id="${c.id}" data-email="${c.email}"></td>
              <td class="p-4 font-medium text-gray-900 break-words">${c.name || ''}</td>
              <td class="p-4 text-secondary break-words">${c.contact_person || ''}</td>
              <td class="p-4 text-secondary text-sm break-words">
                <div>${c.phone || ''}</div>
                <div>${c.email || ''}</div>
              </td>
              <td class="p-4 text-secondary break-words">${c.country || ''} ${isEU ? "🇪🇺" : ""}</td>
              <td class="p-4 text-secondary text-center">${c.has_business_card ? "✔️" : "➖"}</td>
              <td class="p-4 text-secondary text-sm text-center">${new Date(c.created_at).toLocaleDateString()}</td>
              <td class="p-4 whitespace-nowrap text-center">
                <button data-action="edit" class="text-primary hover:text-primary-dark font-semibold mr-2">수정</button>
                <button data-action="delete" data-name="${c.name}" class="text-danger hover:text-red-700 font-semibold mr-2">삭제</button>
                <button data-action="send-email" data-email="${c.email}" class="text-green-600 hover:text-green-700 font-semibold">메일</button>
              </td>
            </tr>
        `;
      }).join('');
    }

    // ... 이하 함수 내용은 그대로 유지 ...
    this.populateCountryFilter().then(() => {
        if ($("#country-filter")) {
            $("#country-filter").value = currentCountryFilter;
        }
    });

    this.reconnectEventListeners();
    
    $$("#customer-list-body .customer-checkbox").forEach((checkbox) => {
        checkbox.addEventListener("change", () => this.updateBulkActionButtonsVisibility());
    });
    this.updateBulkActionButtonsVisibility();

    const searchInput = $("#customer-search-input");
    if (searchInput && document.activeElement !== searchInput) {
        searchInput.focus();
        searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
    }
  },

  /**
   * [신규] 렌더링 후 모든 동적 요소에 이벤트 리스너를 다시 연결하는 함수
   */
  reconnectEventListeners() {
    // --- 페이지 상단 버튼들 ---
    $("#add-customer-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        getAppState().formContext = { isEdit: false };
        window.location.hash = "customer-form";
    });
    $("#import-customer-excel-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        $("#customer-excel-input").click();
    });
    $("#export-all-customers-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.exportAllCustomersToExcel();
    });
    $("#download-customer-template-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.downloadExcelTemplate();
    });
    $("#send-email-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.handleSendEmail();
    });
    $("#delete-selected-customers-btn")?.addEventListener("click", (e) => {
        e.stopPropagation();
        this.deleteSelectedCustomers();
    });

    // --- 검색 및 필터 ---
    $("#customer-search-input")?.addEventListener("input", () => this.fetch(1));
    $("#country-filter")?.addEventListener("change", () => this.fetch(1));
    
    // --- 테이블 기능 ---
    $("#select-all-customers-checkbox")?.addEventListener("change", (e) => {
        $$("#customer-list-body .customer-checkbox").forEach((checkbox) => {
            checkbox.checked = e.target.checked;
        });
        this.updateBulkActionButtonsVisibility();
    });
    
    // [수정 완료] 테이블 각 행의 '수정', '삭제', '메일' 버튼 기능 연결
    $$("#customer-list-body button[data-action]").forEach(btn => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation(); // 다른 클릭 이벤트와의 충돌 방지
            this.handleListClick(e);
        });
    });
    
    // --- 페이지네이션 ---
    $("#customer-pagination")?.querySelectorAll("button[data-page]").forEach((btn) => {
        btn.addEventListener("click", (e) => {
            e.stopPropagation();
            const pageToGo = parseInt(e.currentTarget.dataset.page);
            this.fetch(pageToGo);
        });
    });
    
    this.updateBulkActionButtonsVisibility();
  },

  updateBulkActionButtonsVisibility() {
    const sendEmailBtn = $("#send-email-btn");
    const deleteBtn = $("#delete-selected-customers-btn");
    const selected = $$("#customer-list-body .customer-checkbox:checked");
    
    if (!sendEmailBtn || !deleteBtn) return; // 요소가 없으면 종료

    const show = selected.length > 0;
    
    sendEmailBtn.classList.toggle("hidden", !show);
    deleteBtn.classList.toggle("hidden", !show);

    if (show) {
      sendEmailBtn.textContent = `${selected.length}명에게 메일 발송`;
    }
  },

  handleSendEmail() {
    const selectedEmails = Array.from($$("#customer-list-body .customer-checkbox:checked"))
      .map((cb) => cb.dataset.email)
      .filter(Boolean);
    this.openNaverWorksCompose(selectedEmails);
  },

  async save() {
    if (!this.form) this.setup();

    this.saveBtn.disabled = true;
    this.saveBtn.textContent = "Saving...";
    this.errorMsg.classList.add("hidden");

    // [핵심 수정] FormData 대신 각 input의 ID에서 직접 값을 가져옵니다.
    const customerData = {
      name: $("#name")?.value,
      contact_person: $("#contact_person")?.value,
      email: $("#email")?.value,
      phone: $("#phone")?.value,
      country: $("#country")?.value,
      address: $("#address")?.value,
      has_business_card: $("#has_business_card")?.checked,
    };

    try {
      const id = this.idInput.value;
      if (id) {
        // 수정 (UPDATE)
        const { error } = await supabase.from("customers").update(customerData).eq("id", id);
        if (error) throw error;
      } else {
        // 신규 등록 (INSERT)
        const user = getCurrentUser();
        if (!user) throw new Error("User not logged in.");
        customerData.user_id = user.id;
        customerData.acquisition_source = 'ADMIN_MANUAL_ENTRY';
        const { error } = await supabase.from("customers").insert([customerData]);
        if (error) throw error;
      }
      window.location.hash = "customers";
    } catch (e) {
      this.errorMsg.textContent = e.code === "23505" ? "이미 사용 중인 이메일입니다." : `저장 실패: ${e.message}`;
      this.errorMsg.classList.remove("hidden");
    } finally {
      this.saveBtn.disabled = false;
      this.saveBtn.textContent = "Save";
    }
  },

  async edit(id) {
    try {
      const { data: customer, error } = await supabase.from("customers").select("*").eq("id", id).single();
      if (error) throw error;
      if (!customer) throw new Error("Customer not found.");
      getAppState().formContext = { isEdit: true, data: customer };
      window.location.hash = "customer-form";
    } catch (e) {
      alert(`고객 정보를 불러오는 데 실패했습니다: ${e.message}`);
    }
  },

  async delete(id, name) {
    if (!confirm(`정말로 고객 '${name}'을(를) 삭제하시겠습니까?`)) return;
    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);
      if (error) throw error;
      await this.fetch(this.currentPage);
    } catch (error) {
      alert(`삭제 실패: ${error.message}`);
    }
  },

  handleListClick(e) {
    const target = e.target.closest("button");
    if (!target) return;
    const action = target.dataset.action;
    const id = target.closest("tr").dataset.id;

    if (action === "edit") this.edit(id);
    else if (action === "delete") this.delete(id, target.dataset.name);
    else if (action === "send-email") {
        const email = target.dataset.email;
        if (email) {
            this.openNaverWorksCompose([email]);
        } else {
            alert('고객의 이메일 주소가 없습니다.');
        }
    }
  },

  updateBulkActionButtonsVisibility() {
    const sendEmailBtn = $("#send-email-btn");
    const deleteBtn = $("#delete-selected-customers-btn");
    if (!sendEmailBtn || !deleteBtn) return;
    
    const selected = $$("#customer-list-body .customer-checkbox:checked");
    const show = selected.length > 0;
    
    sendEmailBtn.classList.toggle("hidden", !show);
    deleteBtn.classList.toggle("hidden", !show);

    if (show) {
      sendEmailBtn.textContent = `${selected.length}명에게 메일 발송`;
    }
  },
openEditor(isEdit = false, data = {}) {
    // setTimeout을 사용하여 DOM이 렌더링될 시간을 확보합니다.
    setTimeout(() => {
      this.setup(); // this.form 등 form 관련 DOM 요소를 다시 선택합니다.
      
      if (!this.form) {
        console.error("Customer form (id='customer-form') not found in the DOM.");
        return;
      }
      this.form.reset();
      
      if(this.errorMsg) this.errorMsg.classList.add("hidden");
      if(this.title) this.title.textContent = isEdit ? "고객 정보 수정" : "새 고객 등록";
      
      if (isEdit && data) {
        // 수정 모드일 경우, 폼에 기존 데이터를 채웁니다.
        // templates.js에 있는 실제 폼의 input ID와 일치해야 합니다.
        if ($("#customer-id")) $("#customer-id").value = data.id;
        if ($("#name")) $("#name").value = data.name || ''; // ID 예시: customer-name -> name
        if ($("#contact_person")) $("#contact_person").value = data.contact_person || '';
        if ($("#email")) $("#email").value = data.email || '';
        if ($("#phone")) $("#phone").value = data.phone || '';
        if ($("#country")) $("#country").value = data.country || '';
        if ($("#address")) $("#address").value = data.address || '';
        if ($("#has_business_card")) $("#has_business_card").checked = data.has_business_card;
      }

      this.initCountryDropdown(); // 국가 선택 드롭다운을 초기화합니다.

      // 버튼 기능이 중복으로 연결되지 않도록 data-initialized 속성으로 확인합니다.
      if (!this.form.dataset.initialized) {
        this.form.addEventListener("submit", (e) => {
          e.preventDefault();
          this.save();
        });

        const cancelBtn = $("#customer-cancel-btn");
        if (cancelBtn) {
          cancelBtn.addEventListener("click", (e) => {
            e.preventDefault(); // 기본 동작 방지
            e.stopPropagation(); // 이벤트 전파 방지
            window.location.hash = "customers";
          });
        }
        this.form.dataset.initialized = "true";
      }
    }, 0); // 0밀리초 지연으로 DOM 렌더링 후 실행을 보장합니다.
  },
  
    /**
     * [복원] openEditor가 사용하는 국가 선택 드롭다운 초기화 함수
     */
    initCountryDropdown() {
      if (!this.countryDropdown) return;
      this.countryDropdown.innerHTML = ALL_COUNTRIES.map(
        (country) => `<option value="${country}">${country}</option>`,
      ).join("");
    }
};