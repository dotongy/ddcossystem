// js/modules/orders.js

import { supabase } from "../supabase.js";
import { $, $$ } from "../utils.js";
import { getAppState } from "../router.js";
import { ALL_COUNTRIES } from "../config.js";
import { getCurrentUser } from "../auth.js";

export const OrderApp = {
  listEl: null,
  form: null,
  title: null,
  currentOrderItems: [],
  stagedOrderItems: [], // 모달에서 선택된 상품들을 임시 저장하는 배열
  customers: [],
  products: [],
  currentPage: 1,
  rowsPerPage: 15,
  totalRows: 0,
  currentFilter: "active",
  additionalCostCurrency: "krw",
  isSaving: false, // 저장 중복 방지 플래그
  isDataInitialized: false,
  _boundHandlePageClick: null, // [핵심] 생성된 클릭 핸들러(감시자)를 저장할 변수

  setup() {
    this.listEl = $("#order-list");
    this.form = $("#order-form");
    this.title = $("#order-form-title");
  },

  async init() {
    this.setup();
    
    // 페이지가 아직 초기화되지 않았다면, 단 한번만 초기화 함수를 실행합니다.
    if (!this.isPageInitialized) {
      await this.initializePage();
    }
    
    // 페이지에 방문할 때마다 항상 최신 데이터를 불러옵니다.
    await this.fetchAndRenderOrders(1);
  },

  async initializePage() {
    const page = $("#orders-page");
    if (!page) return;

    // 데이터 로딩은 한 번만 수행
    if (!this.isDataInitialized) {
      await this.initializeData();
      this.isDataInitialized = true;
    }
    
    // --- 클릭 이벤트 핸들러 (가장 중요한 부분) ---
    // 1. 기존에 등록된 '유령 감시자'가 있다면 먼저 깨끗하게 제거합니다.
    if (this._boundHandlePageClick) {
      page.removeEventListener('click', this._boundHandlePageClick);
    }
    
    // 2. 새로운 감시자 함수를 생성하여 변수에 저장합니다.
    this._boundHandlePageClick = this.handlePageClick.bind(this);
    
    // 3. 새로 만든 깨끗한 감시자를 페이지에 등록합니다.
    page.addEventListener('click', this._boundHandlePageClick);


    // --- 기타 체크박스 이벤트 핸들러 (이 부분은 일회성 등록으로 충분) ---
    if (!page.dataset.checkboxListenersAttached) {
      $("#select-all-orders-checkbox")?.addEventListener("change", (e) => {
        $$("#order-list .order-checkbox").forEach((checkbox) => {
          checkbox.checked = e.target.checked;
        });
        this.updateDeleteButtonVisibility();
      });

      this.listEl?.addEventListener("change", (e) => {
        if (e.target.classList.contains("order-checkbox")) {
          this.updateDeleteButtonVisibility();
        }
      });
      page.dataset.checkboxListenersAttached = 'true';
    }
  },

  handleFilterClick(clickedButton) {
    const newFilter = clickedButton.dataset.filter;
    if (this.currentFilter === newFilter) return;
    this.currentFilter = newFilter;
    
    // 모든 필터 버튼의 '활성' 스타일(primary)을 제거하고 '비활성' 스타일(secondary)로 변경
    $$("#order-archive-filter button").forEach((btn) => {
      btn.classList.remove("bg-primary", "text-white");
      btn.classList.add("bg-white", "border", "border-border", "text-secondary", "hover:bg-gray-50");
    });

    // 클릭된 버튼에만 '활성' 스타일을 적용
    clickedButton.classList.remove("bg-white", "border", "border-border", "text-secondary", "hover:bg-gray-50");
    clickedButton.classList.add("bg-primary", "text-white");

    this.fetchAndRenderOrders(1);
  },

  async fetchAndRenderOrders(page = 1) {
    this.currentPage = page;
    if (!this.listEl) this.setup();
    this.listEl.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-slate-500">주문 목록을 불러오는 중...</td></tr>`;
    try {
      // 기본 쿼리를 먼저 만듭니다.
let dataQuery = supabase.from("orders").select("*, customers(name)");
let countQuery = supabase.from("orders").select("*", { count: "exact", head: true });

// 필터 조건에 따라 쿼리를 수정합니다.
if (this.currentFilter === "active") {
  const activeFilter = "is_archived.is.null,is_archived.eq.false";
  dataQuery = dataQuery.or(activeFilter);
  countQuery = countQuery.or(activeFilter);
} else { // "archived"
  dataQuery = dataQuery.eq("is_archived", true);
  countQuery = countQuery.eq("is_archived", true);
}
      const { count, error: countError } = await countQuery;
      if (countError) throw countError;
      this.totalRows = count;
      const from = (page - 1) * this.rowsPerPage;
      const to = from + this.rowsPerPage - 1;
      const { data, error } = await dataQuery
        .order("order_date", { ascending: false })
        .range(from, to);
      if (error) throw error;
      this.renderOrderList(data);
      this.renderPagination();
    } catch (e) {
      console.error("OrderApp: Fetching orders failed.", e);
      this.listEl.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-red-500">주문 목록 로딩 실패: ${e.message}</td></tr>`;
    }
  },

  renderPagination() {
    const paginationEl = $("#order-pagination");
    if (!paginationEl) return;
    const totalPages = Math.ceil(this.totalRows / this.rowsPerPage);

    if (totalPages <= 1) {
      paginationEl.innerHTML = "";
      return;
    }
    
    let html = "";
    html += `<button class="bg-white border border-border text-secondary font-bold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm ${this.currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""}" ${this.currentPage === 1 ? "disabled" : ""} data-page="1">&laquo; First</button>`;
    html += `<button class="bg-white border border-border text-secondary font-bold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm ${this.currentPage === 1 ? "opacity-50 cursor-not-allowed" : ""}" ${this.currentPage === 1 ? "disabled" : ""} data-page="${this.currentPage - 1}">Prev</button>`;
    
    let pageLinks = '';
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

    html += `<button class="bg-white border border-border text-secondary font-bold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm ${this.currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""}" ${this.currentPage === totalPages ? "disabled" : ""} data-page="${this.currentPage + 1}">Next</button>`;
    html += `<button class="bg-white border border-border text-secondary font-bold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm ${this.currentPage === totalPages ? "opacity-50 cursor-not-allowed" : ""}" ${this.currentPage === totalPages ? "disabled" : ""} data-page="${totalPages}">Last &raquo;</button>`;

    paginationEl.innerHTML = `<div class="flex justify-center items-center w-full flex-wrap gap-x-2 gap-y-4">${html}</div>`;
    
    // 이 함수에 있던 forEach 루프가 완전히 삭제되었습니다.
    // 페이지네이션 버튼 클릭은 이제 handlePageClick 함수가 모두 처리합니다.
  },

  renderOrderList(orders) {
    const message = this.currentFilter === "active" ? "활성 주문이 없습니다." : "보관된 주문이 없습니다.";
    if (orders.length === 0) {
      this.listEl.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-secondary">${message}</td></tr>`;
      return;
    }
    this.listEl.innerHTML = orders.map(o => `
        <tr data-id="${o.id}" class="hover:bg-gray-50">
            <td class="p-4 text-center"><input type="checkbox" class="order-checkbox h-4 w-4" data-id="${o.id}"></td>
            <td class="p-4 font-medium text-gray-900">${o.order_number || "-"}</td>
            <td class="p-4 text-secondary break-words">${o.customers?.name || "알 수 없음"}</td>
            <td class="p-4 text-secondary text-center">${o.order_date}</td>
            <td class="p-4 text-secondary text-right">₩${Number(o.total_amount || 0).toLocaleString()}</td>
            <td class="p-4 text-secondary text-center">${o.status}</td>
            <td class="p-4 whitespace-nowrap text-center">
                <button data-action="edit" class="text-primary hover:text-primary-dark font-semibold mr-2">수정</button>
                <button data-action="delete" data-name="${o.order_number}" class="text-danger hover:text-red-700 font-semibold">삭제</button>
            </td>
        </tr>`
      ).join("");

    this.updateDeleteButtonVisibility();
    const selectAllCheckbox = $("#select-all-orders-checkbox");
    if (selectAllCheckbox) selectAllCheckbox.checked = false;
  },

  updateDeleteButtonVisibility() {
    const deleteBtn = $("#delete-selected-orders-btn");
    if (!deleteBtn) return;
    const selectedCheckboxes = $$("#order-list .order-checkbox:checked");
    deleteBtn.classList.toggle("hidden", selectedCheckboxes.length === 0);
  },

  async deleteSelectedOrders() {
    const selectedIds = Array.from(
      $$("#order-list .order-checkbox:checked"),
    ).map((cb) => cb.dataset.id);
    if (selectedIds.length === 0) return;
    if (!confirm(`${selectedIds.length}개의 주문을 삭제하시겠습니까?`)) return;
    try {
      await supabase.from("order_items").delete().in("order_id", selectedIds);
      await supabase.from("orders").delete().in("id", selectedIds);
      alert(`${selectedIds.length}개의 주문이 삭제되었습니다.`);
      await this.fetchAndRenderOrders(this.currentPage);
    } catch (error) {
      alert(`삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  },

async openEditor(isEdit = false, data = {}) {
    if (!this.form) this.setup();

    this.form.reset();
    $("#order-id").value = "";
    this.currentOrderItems = [];
    this.additionalCostCurrency = "krw";
    this.isSaving = false;

    this.title.textContent = isEdit
      ? `주문 수정 ( #${data.order_number || data.id} )`
      : "신규 주문 작성";    

    if (isEdit) {
      $("#order-id").value = data.id;
      for (const key in data) {
        const input = this.form.querySelector(`[name="${key}"]`);
        if (input) input.value = data[key];
      }
      
      // ▼▼▼ 바로 이 한 줄을 추가하면 됩니다 ▼▼▼
      $("#customer-search-input").value = data.customers?.name || '';
      // ▲▲▲ 여기까지 추가 ▲▲▲

      const { data: items, error } = await supabase
        .from("order_items")
        .select("*, products(*)")
        .eq("order_id", data.id);
      if (error) throw error;
      this.currentOrderItems = items.map((item) => ({
        ...item.products,
        ...item,
        additional_cost_input: item.additional_cost,
        manual_unit_price_usd: item.unit_price_usd || 0,
        usd_manually_edited: !!item.unit_price_usd,
      }));
      const label = data.additional_cost_label || "추가 비용";
      $("#additional-cost-label-input").value = label;
      $("#additional-cost-header").textContent = label;
    } else {
      this.form.order_date.value = new Date().toISOString().split("T")[0];
      $("#additional-cost-label-input").value = "추가 비용";
      $("#additional-cost-header").textContent = "추가 비용";
    }

    this.renderOrderItems(); 
    this.addFormEventListeners();
},

  async initializeData() {
    // 데이터가 이미 초기화되었다면 다시 실행하지 않음
    if (this.isDataInitialized) return;

    try {
      const [{ data: customers }, { data: products }] = await Promise.all([
        supabase.from("customers").select("id, name, contact_person, country").order("name"),
        supabase.from("products").select("*").order("name_kr"),
      ]);
      this.customers = customers || [];
      this.products = products || [];
      this.isDataInitialized = true; // 성공적으로 로드되면 플래그를 true로 설정
    } catch (e) {
      alert("고객 또는 상품 정보 로딩에 실패했습니다. 페이지를 새로고침 해주세요.");
      console.error("Failed to initialize data:", e);
    }
  },

  populateCustomerDropdown() {
    const searchInput = $("#customer-search-input");
    const dropdown = $("#customer-dropdown");
    const hiddenInput = $("#order-customer-id");

    // 필요한 HTML 요소가 없으면 함수를 중단합니다.
    if (!searchInput || !dropdown || !hiddenInput) return;

    // 검색창에 글자를 입력할 때마다 실행되는 이벤트
    searchInput.addEventListener('input', () => {
      const searchTerm = searchInput.value.toLowerCase();
      
      // 검색어가 없으면 드롭다운을 숨깁니다.
      if (searchTerm.length === 0) {
        dropdown.classList.add('hidden');
        return;
      }

      // 미리 불러온 고객 목록(this.customers)에서 검색어와 일치하는 고객을 찾습니다.
      const filteredCustomers = this.customers.filter(c => 
        c.name.toLowerCase().includes(searchTerm)
      );

      if (filteredCustomers.length > 0) {
        // 검색 결과가 있으면, 목록을 만들어 드롭다운에 표시합니다.
        dropdown.innerHTML = filteredCustomers.map(c => 
          `<div class="p-3 hover:bg-light cursor-pointer" data-id="${c.id}" data-name="${c.name}">
            <p class="font-semibold text-gray-800">${c.name}</p>
            <p class="text-sm text-gray-500 mt-1">
              ${c.contact_person || '담당자 미지정'} / ${c.country || '국가 미지정'}
            </p>
          </div>`
        ).join('');
        dropdown.classList.remove('hidden');
      } else {
        // 검색 결과가 없으면, 메시지를 표시합니다.
        dropdown.innerHTML = `<div class="p-2 text-secondary">검색된 고객이 없습니다.</div>`;
        dropdown.classList.remove('hidden');
      }
    });

    // 검색 결과(드롭다운)에서 특정 고객을 클릭했을 때 실행되는 이벤트
    dropdown.addEventListener('click', (e) => {
      const target = e.target.closest('[data-id]');
      if (target) {
        searchInput.value = target.dataset.name; // 검색창에 고객 이름 표시
        hiddenInput.value = target.dataset.id; // 숨겨진 input에 고객 ID 저장
        dropdown.classList.add('hidden'); // 드롭다운 숨기기
      }
    });

    // 검색창에서 포커스가 벗어났을 때 드롭다운을 숨기는 이벤트
    searchInput.addEventListener('blur', () => {
      // 약간의 지연을 주어 클릭 이벤트가 먼저 처리될 시간을 줍니다.
      setTimeout(() => {
        dropdown.classList.add('hidden');
      }, 150);
    });
  },

  openProductModal() {
    this.stagedOrderItems = []; // 모달을 열 때마다 선택 목록을 초기화
    $('#product-select-modal').classList.remove('hidden');
    this.renderProductsInModal();
    this.renderStagedProducts(); // 새로 추가된 함수 호출
    $("#modal-product-search").focus();
  },

  closeProductModal() {
    $('#product-select-modal').classList.add('hidden');
  },

  renderProductsInModal(searchTerm = '') {
    const modalListEl = $('#modal-product-list');
    const query = searchTerm.toLowerCase();
    
    const filteredProducts = this.products.filter(p => p.name_kr.toLowerCase().includes(query));

    if (filteredProducts.length === 0) {
        modalListEl.innerHTML = `<tr><td colspan="3" class="p-4 text-center text-secondary">검색된 상품이 없습니다.</td></tr>`;
        return;
    }
    
    modalListEl.innerHTML = filteredProducts.map(p => {
        // 이미 선택된 상품인지 확인하여 체크박스 상태를 결정
        const isChecked = this.stagedOrderItems.some(item => item.id === p.id);
        
        return `
        <tr class="hover:bg-gray-50">
            <td class="p-3 text-center"><input type="checkbox" class="modal-product-checkbox h-4 w-4" data-id="${p.id}" ${isChecked ? 'checked' : ''}></td>
            <td class="p-3 w-16"><img src="${p.image_url || 'https://placehold.co/60x60/e2e8f0/e2e8f0?text=.'}" class="w-14 h-14 object-cover rounded"></td>
            <td class="p-3">
                <p class="font-semibold text-gray-800">${p.name_kr}</p>
                <p class="text-sm text-gray-500">재고: ${p.stock_quantity || 0}</p>
            </td>
        </tr>
    `}).join('');
  },

  // [신규 함수] 선택된 상품 목록을 화면에 그립니다.
  renderStagedProducts() {
    const selectedListEl = $('#modal-selected-product-list');
    $('#staged-item-counter').textContent = `총 ${this.stagedOrderItems.length}개`;

    if (this.stagedOrderItems.length === 0) {
        selectedListEl.innerHTML = `<tr><td class="p-4 text-center text-secondary">선택된 상품이 없습니다.</td></tr>`;
        return;
    }

    selectedListEl.innerHTML = this.stagedOrderItems.map(p => `
        <tr class="bg-white">
            <td class="p-3 w-16"><img src="${p.image_url || 'https://placehold.co/60x60/e2e8f0/e2e8f0?text=.'}" class="w-14 h-14 object-cover rounded"></td>
            <td class="p-3">
                <p class="font-semibold text-gray-800">${p.name_kr}</p>
            </td>
            <td class="p-3 text-right">
                <button type="button" class="remove-staged-item-btn text-gray-400 hover:text-danger" data-id="${p.id}">&times;</button>
            </td>
        </tr>
    `).join('');
  },

  // [신규 함수] 상품 선택/해제 시 상태를 처리합니다.
  handleProductSelection(productId, isChecked) {
    if (isChecked) {
        // 중복 선택 방지
        if (this.stagedOrderItems.some(item => item.id == productId)) return;
        
        const product = this.products.find(p => p.id == productId);
        if (product) {
            this.stagedOrderItems.push(product);
        }
    } else {
        this.stagedOrderItems = this.stagedOrderItems.filter(item => item.id != productId);
    }
    this.renderStagedProducts();
  },

  // [신규 함수] 선택된 목록에서 상품을 제거합니다.
  removeStagedProduct(productId) {
      this.stagedOrderItems = this.stagedOrderItems.filter(item => item.id != productId);
      this.renderStagedProducts();
      // 사용 가능한 상품 목록의 체크박스도 해제
      const checkbox = $(`#modal-product-list .modal-product-checkbox[data-id="${productId}"]`);
      if (checkbox) {
          checkbox.checked = false;
      }
  },

  // [수정된 함수] 최종적으로 선택된 상품들을 주문서에 추가합니다.
  addSelectedProductsFromModal() {
    this.stagedOrderItems.forEach(product => {
        this.addProductToOrder(product.id);
    });
    this.closeProductModal();
  },

  initDragAndDrop() {
    const tbody = $("#order-items-list");
    if (!tbody) return;

    let draggedItem = null;

    tbody.addEventListener('dragstart', (e) => {
        if (e.target.classList.contains('order-item-row')) {
            draggedItem = e.target;
            setTimeout(() => {
                e.target.classList.add('opacity-50');
            }, 0);
        }
    });

    tbody.addEventListener('dragend', (e) => {
        if(draggedItem) {
            draggedItem.classList.remove('opacity-50');
            draggedItem = null;
        }
    });

    tbody.addEventListener('dragover', (e) => {
        e.preventDefault();
        const afterElement = this.getDragAfterElement(tbody, e.clientY);
        if (afterElement == null) {
            tbody.appendChild(draggedItem);
        } else {
            tbody.insertBefore(draggedItem, afterElement);
        }
    });

    tbody.addEventListener('drop', (e) => {
        e.preventDefault();
        if(!draggedItem) return;

        // 데이터 순서 동기화
        const newOrderIds = Array.from(tbody.querySelectorAll('.order-item-row')).map(row => row.dataset.id);
        const reorderedItems = [];
        newOrderIds.forEach(id => {
            const item = this.currentOrderItems.find(i => i.id == id);
            if(item) reorderedItems.push(item);
        });
        this.currentOrderItems = reorderedItems;
    });
  },

  getDragAfterElement(container, y) {
    const draggableElements = [...container.querySelectorAll('.order-item-row:not(.opacity-50)')];
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
  },

  addFormEventListeners() {
    // 폼이 새로 그려질 때마다 이전 리스너를 확실히 제거하기 위해 cloneNode 트릭을 사용합니다.
    const newForm = this.form.cloneNode(true);
    this.form.parentNode.replaceChild(newForm, this.form);
    this.form = newForm;

    const modalForm = $("#new-customer-modal-form");
    if (modalForm) {
      const newModalForm = modalForm.cloneNode(true);
      modalForm.parentNode.replaceChild(newModalForm, modalForm);
    }

    this.populateCustomerDropdown();
    
    // --- 폼 저장 및 취소 ---
    this.form.addEventListener("submit", (e) => this.save(e));
    $("#order-cancel-btn")?.addEventListener("click", () => window.location.hash = "orders");

    // --- 상품 추가 모달 열기 버튼 ---
    $("#add-product-modal-btn")?.addEventListener("click", () => this.openProductModal());
    
    // --- 신규 고객 모달 관련 이벤트 리스너 ---
    $("#show-add-customer-modal-btn")?.addEventListener("click", () => this.openCustomerModal());
    $("#close-customer-modal-btn")?.addEventListener("click", () => this.closeCustomerModal());
    $("#cancel-customer-modal-btn")?.addEventListener("click", () => this.closeCustomerModal());
    $("#new-customer-modal-form")?.addEventListener("submit", (e) => this.saveNewCustomerFromModal(e));

    // --- 상품 추가 모달 내부 이벤트 리스너 (수정됨) ---
    $("#close-product-modal-btn")?.addEventListener("click", () => this.closeProductModal());
    $("#cancel-add-product-btn")?.addEventListener("click", () => this.closeProductModal());
    $("#add-selected-products-btn")?.addEventListener("click", () => this.addSelectedProductsFromModal());
    
    $("#modal-product-search")?.addEventListener("input", (e) => this.renderProductsInModal(e.target.value));

    // '전체 선택' 체크박스 이벤트
    $('#modal-select-all-products')?.addEventListener('change', (e) => {
        $$('#modal-product-list .modal-product-checkbox').forEach(checkbox => {
            checkbox.checked = e.target.checked;
            this.handleProductSelection(checkbox.dataset.id, e.target.checked);
        });
    });

    // 사용 가능한 상품 목록 클릭 이벤트
    const modalProductList = $("#modal-product-list");
    if (modalProductList) {
      modalProductList.addEventListener('click', (e) => {
        const checkbox = e.target.closest('tr')?.querySelector('.modal-product-checkbox');
        if (checkbox && !e.target.matches('.modal-product-checkbox')) {
            checkbox.checked = !checkbox.checked;
        }
        if(checkbox) {
            this.handleProductSelection(checkbox.dataset.id, checkbox.checked);
        }
      });
    }

    // [신규] 선택된 상품 목록에서 '제거' 버튼 클릭 이벤트
    const selectedListEl = $('#modal-selected-product-list');
    if (selectedListEl) {
        selectedListEl.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('.remove-staged-item-btn');
            if (removeBtn) {
                this.removeStagedProduct(removeBtn.dataset.id);
            }
        });
    }

    // --- 주문 아이템 테이블 관련 이벤트 리스너 ---
    const orderItemsList = $("#order-items-list");
    if (orderItemsList) {
        orderItemsList.addEventListener("input", (e) => {
          if (e.target.classList.contains("item-unit-price-usd-input")) {
            const itemId = e.target.closest("tr").dataset.id;
            const item = this.currentOrderItems.find((i) => i.id == itemId);
            if (item) item.usd_manually_edited = true;
          }
          this.updateTotals();
        });

        orderItemsList.addEventListener("click", (e) => {
          if (e.target.closest(".remove-item-btn")) {            
            e.stopPropagation();
            const itemId = e.target.closest("tr").dataset.id;
            this.removeOrderItem(itemId);
          }
        });
    }

    $("#add-oem-item-btn")?.addEventListener("click", () => this.addOemItemToOrder());
    
    // --- 기타 비용 및 환율 관련 이벤트 리스너 ---
    $("#additional-cost-currency-toggle")?.addEventListener("click", (e) => {
      const button = e.target.closest(".currency-toggle-btn");
      if (!button) return;
      this.additionalCostCurrency = button.dataset.currency;
      $$(".currency-toggle-btn").forEach((btn) => btn.classList.remove("active-currency-toggle"));
      button.classList.add("active-currency-toggle");
      this.updateTotals();
    });

    $("#additional-cost-label-input")?.addEventListener("input", (e) => {
      $("#additional-cost-header").textContent = e.target.value || "추가 비용";
    });

    $("#exchange-rate")?.addEventListener("input", () => this.updateTotals());

    this.initDragAndDrop();
  },

/** 신규 고객 추가 모달을 엽니다. */
  openCustomerModal() {
    $("#new-customer-modal-form")?.reset();
    $("#modal-customer-error").classList.add("hidden");

const countrySelect = $("#modal-country");
    if (countrySelect) {
      // config.js 에서 가져온 국가 목록으로 option 태그를 생성합니다.
      countrySelect.innerHTML = ALL_COUNTRIES.map(
        (country) => `<option value="${country}">${country}</option>`,
      ).join("");
      
      // 기본 선택값을 'South Korea'로 설정합니다.
      countrySelect.value = "Korea, South"; 
    }

    $('#add-customer-modal').classList.remove('hidden');
    $("#modal-customer-name").focus();
  },

  /** 신규 고객 추가 모달을 닫습니다. */
  closeCustomerModal() {
    $('#add-customer-modal').classList.add('hidden');
  },

  /** 모달에서 입력받은 정보로 신규 고객을 저장합니다. */
  async saveNewCustomerFromModal(e) {
    e.preventDefault();
    const saveBtn = $("#save-customer-from-modal-btn");
    const errorEl = $("#modal-customer-error");
    saveBtn.disabled = true;
    errorEl.classList.add("hidden");

    const name = $("#modal-customer-name").value.trim();
    if (!name) {
      errorEl.textContent = "회사명은 필수 항목입니다.";
      errorEl.classList.remove("hidden");
      saveBtn.disabled = false;
      return;
    }

    const newCustomerData = {
      name: name,
      contact_person: $("#modal-contact-person").value.trim(),
      email: $("#modal-email").value.trim(),
      country: $("#modal-country").value.trim(),
    };

    // ▼▼▼ 이 부분을 추가합니다. ▼▼▼
    const user = getCurrentUser();
    if (!user) {
      errorEl.textContent = "사용자 인증 정보가 없습니다. 다시 로그인해주세요.";
      errorEl.classList.remove("hidden");
      saveBtn.disabled = false;
      return;
    }
    // 데이터에 user_id를 포함시킵니다.
    newCustomerData.user_id = user.id;

    try {
      // Supabase에 새 고객 정보를 삽입하고, 생성된 데이터를 반환받습니다.
      const { data, error } = await supabase
        .from("customers")
        .insert(newCustomerData)
        .select()
        .single();
      
      if (error) throw error;

      // 1. 현재 페이지의 고객 목록(this.customers)에 새 고객 추가
      this.customers.push(data);
      // 2. 이름 순으로 다시 정렬
      this.customers.sort((a, b) => a.name.localeCompare(b.name));
      // 3. 주문서의 고객사 입력란에 방금 만든 고객 정보로 자동 선택
      $("#customer-search-input").value = data.name;
      $("#order-customer-id").value = data.id;

      alert("신규 고객이 성공적으로 등록되었습니다.");
      this.closeCustomerModal();

    } catch (error) {
      console.error("Failed to save new customer:", error);

      // ▼▼▼ 이 부분을 수정합니다. ▼▼▼
      // 에러 코드 '23505'는 데이터베이스의 'unique constraint' 위반을 의미합니다.
      if (error.code === '23505') {
        errorEl.textContent = '이미 등록된 이메일 주소입니다. 다른 이메일을 사용해주세요.';
      } else {
      errorEl.textContent = `저장 실패: ${error.message}`;
      }
      // ▲▲▲ 여기까지 수정 ▲▲▲
      errorEl.classList.remove("hidden");
    } finally {
      saveBtn.disabled = false;
    }
  },

  addProductToOrder(productId) {
    const product = this.products.find((p) => p.id == productId);
    if (
      !product ||
      this.currentOrderItems.some((item) => item.product_id == productId)
    )
      return;
    const priceType = $("#price-type-select").value;
    const newItem = {
      ...product,
      id: `item_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      product_id: product.id,
      quantity: 1,
      unit_price: product[priceType] || 0,
      additional_cost_input: 0,
      manual_unit_price_usd: 0,
      usd_manually_edited: false,
    };
    this.currentOrderItems.push(newItem);
    this.renderOrderItems();
  },

  addOemItemToOrder() {
    const newItem = {
      id: `oem_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      is_oem: true,
      name_kr: "OEM Product",
      name_en: "OEM Product",
      quantity: 1,
      unit_price: 0,
      product_id: null,
      additional_cost_input: 0,
      manual_unit_price_usd: 0,
      usd_manually_edited: false,
    };
    this.currentOrderItems.push(newItem);
    this.renderOrderItems();
  },

  removeOrderItem(itemId) {
    this.currentOrderItems = this.currentOrderItems.filter(
      (item) => item.id != itemId,
    );
    this.renderOrderItems();
  },

  renderOrderItems() {
    const tbody = $("#order-items-list");
    if (!tbody) return;
    tbody.innerHTML = this.currentOrderItems
      .map((item) => {
        const displayName = item.name_en || item.name_kr;
        const nameCell = item.is_oem
          ? `<input type="text" class="input item-name w-full" value="${displayName}">`
          : displayName;
        return `
                <tr data-id="${item.id}" draggable="true" class="order-item-row cursor-grab">
                    <td class="p-2 text-center text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 inline-block" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                    </td>
                    <td class="p-2">${nameCell}</td>
                    <td class="p-2"><input type="number" class="input item-quantity w-20 text-center" value="${item.quantity}"></td>
                    <td class="p-2"><input type="text" class="input item-unit-price w-32 text-right" value="${Number(item.unit_price || 0).toLocaleString()}"></td>
                    <td class="p-2"><input type="text" class="input item-additional-cost w-32 text-right" value="${Number(item.additional_cost_input || 0).toLocaleString()}"></td>
                    <td class="p-2"><input type="text" inputmode="decimal" class="input item-unit-price-usd-input w-32 text-right" value="${(item.manual_unit_price_usd || 0).toFixed(3)}"></td>
                    <td class="p-2 text-right item-subtotal-krw">-</td>
                    <td class="p-2 text-right item-subtotal-usd">-</td>
                    <td class="p-2 text-center"><button type="button" class="remove-item-btn text-red-500 hover:text-red-700">✖</button></td>
                </tr>`;
      })
      .join("");
    this.updateTotals();
  },

   updateTotals() {
    let totalKrw = 0;
    let totalUsd = 0;
    const exchangeRate = parseFloat($("#exchange-rate").value) || 0;

    $$("#order-items-list tr").forEach((tr) => {
      const itemId = tr.dataset.id;
      const item = this.currentOrderItems.find((i) => i.id == itemId);
      if (!item) return;

      const quantity = parseInt(tr.querySelector(".item-quantity").value) || 0;
      const unitPriceKrw = parseFloat(tr.querySelector(".item-unit-price").value.replace(/,/g, "")) || 0;
      const additionalCostInput = parseFloat(tr.querySelector(".item-additional-cost").value.replace(/,/g, "")) || 0;
      const unitPriceUsdInput = tr.querySelector(".item-unit-price-usd-input");

      item.quantity = quantity;
      item.unit_price = unitPriceKrw;
      item.additional_cost_input = additionalCostInput;

      let additionalCostKrw = additionalCostInput;
      if (this.additionalCostCurrency === "usd" && exchangeRate > 0) {
        additionalCostKrw = additionalCostInput * exchangeRate;
      }

      const finalUnitPriceKrw = unitPriceKrw + additionalCostKrw;
      const subtotalKrw = quantity * finalUnitPriceKrw;
      totalKrw += subtotalKrw;
      tr.querySelector(".item-subtotal-krw").textContent = `₩${Math.round(subtotalKrw).toLocaleString()}`;

      // [핵심 수정] USD 단가 자동 계산 로직
      let unitPriceUsd = 0;
      if (item.usd_manually_edited) {
        // 사용자가 USD 단가를 직접 수정한 경우, 그 값을 사용합니다.
        unitPriceUsd = parseFloat(unitPriceUsdInput.value) || 0;
        item.manual_unit_price_usd = unitPriceUsd;
      } else {
        // 아닌 경우, KRW 단가와 환율에 따라 자동으로 계산합니다.
        if (exchangeRate > 0) {
          unitPriceUsd = finalUnitPriceKrw / exchangeRate;
          unitPriceUsdInput.value = unitPriceUsd.toFixed(3); // 계산된 값을 USD 입력란에 표시
          item.manual_unit_price_usd = 0; // 자동 계산되었으므로 수동 입력값은 0으로 초기화
        } else {
            unitPriceUsdInput.value = (0).toFixed(3);
        }
      }

      const subtotalUsd = quantity * unitPriceUsd;
      totalUsd += subtotalUsd;
      tr.querySelector(".item-subtotal-usd").textContent =
        `$${subtotalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`;
    });

    // [핵심 수정] 새로운 주문 요약 카드에 값을 업데이트합니다.
    $("#subtotal-amount-krw").textContent = `₩${Math.round(totalKrw).toLocaleString()}`;
    $("#total-amount-krw").textContent = `₩${Math.round(totalKrw).toLocaleString()}`;
    $("#total-amount-usd").textContent =
      `$${totalUsd.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })}`;
  },

  async save(e) {
    e.preventDefault();

    // 중복 저장 방지
    if (this.isSaving) {
      console.log("이미 저장 중입니다.");
      return;
    }

    this.isSaving = true;
    const saveBtn = $("#order-save-btn");
    saveBtn.disabled = true;
    saveBtn.textContent = "저장 중...";

    try {
      const formData = new FormData(this.form);
      const orderData = {
        customer_id: formData.get("customer_id"),
        order_date: formData.get("order_date"),
        order_number: formData.get("order_number"),
        status: formData.get("status"),
        total_amount: parseFloat(
          $("#total-amount-krw").textContent.replace(/[₩,]/g, ""),
        ),
        exchange_rate: parseFloat($("#exchange-rate").value) || null,
        additional_cost_label: $("#additional-cost-label-input").value.trim(),
      };

      let orderId = $("#order-id").value;
      if (orderId) {
        const { error } = await supabase
          .from("orders")
          .update(orderData)
          .eq("id", orderId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("orders")
          .insert(orderData)
          .select()
          .single();
        if (error) throw error;
        orderId = data.id;
      }

      // 기존 주문 항목 삭제
      await supabase.from("order_items").delete().eq("order_id", orderId);

      const processedItems = [];
      for (const item of this.currentOrderItems) {
        let productId = item.product_id;
        if (item.is_oem) {
          const { data: newProduct, error } = await supabase
            .from("products")
            .insert({
              name_kr: item.name_kr,
              name_en: item.name_en || item.name_kr,
              retail_price: item.unit_price,
              is_oem: true,
            })
            .select()
            .single();
          if (error) throw new Error(`OEM 항목 저장 실패: ${error.message}`);
          productId = newProduct.id;
        }
        const productName = item.name_en || item.name_kr;
        processedItems.push({
          order_id: orderId,
          product_id: productId,
          quantity: item.quantity,
          unit_price: item.unit_price,
          additional_cost: item.additional_cost_input || 0,
          unit_price_usd: item.usd_manually_edited
            ? item.manual_unit_price_usd
            : null, // 수동 편집된 경우만 USD 단가 저장
          product_name: productName,
        });
      }

      if (processedItems.length > 0) {
        const { error: itemError } = await supabase
          .from("order_items")
          .insert(processedItems);
        if (itemError) throw itemError;
      }

      alert("주문이 성공적으로 저장되었습니다.");
      window.location.hash = "orders";
    } catch (error) {
      console.error("Save error:", error);
      alert(`저장 실패: ${error.message}`);
    } finally {
      this.isSaving = false;
      saveBtn.disabled = false;
      saveBtn.textContent = "저장";
    }
  },

  handlePageClick(e) {
    // 1. 먼저 클릭된 지점에서 가장 가까운 'button' 태그를 찾습니다.
    const target = e.target.closest("button");
    if (!target) return;

    // 2. 버튼에 data-action 속성이 있는지 확인합니다.
    const action = target.dataset.action;

    // 이벤트 전파를 막아 다른 클릭 이벤트와의 충돌을 방지합니다.
    e.preventDefault();
    e.stopPropagation();
    
    // 3. data-action 속성이 있는 경우의 로직을 먼저 처리합니다.
    if (action) {
        if (action === 'go-to-page') {
            this.fetchAndRenderOrders(parseInt(target.dataset.page));
            return; 
        }

        const id = target.closest("tr")?.dataset.id;
        switch (action) {
            case "filter":
                this.handleFilterClick(target);
                break;
            case "edit":
                this.editOrder(id);
                break;
            case "delete":
                this.deleteOrder(id, target.dataset.name);
                break;
        }
        return; // 액션 처리가 끝났으므로 함수를 종료합니다.
    }

    // 4. data-action이 없는 경우, id를 기준으로 버튼을 확인합니다.
    if (target.id === 'add-order-btn') {
        getAppState().formContext = { isEdit: false };
        window.location.hash = "order-form";
        return;
    }
    
    if (target.id === 'delete-selected-orders-btn') {
        this.deleteSelectedOrders();
        return;
    }
  },

  // editOrder, deleteOrder 와 같은 헬퍼 함수들을 만듭니다.
  async editOrder(id) {
    const { data, error } = await supabase
        .from("orders")
        // ▼▼▼ 바로 이 부분을 수정합니다 ▼▼▼
        .select("*, customers(*), additional_cost_label") // customers(*)를 추가하여 고객 정보를 함께 불러옵니다.
        // ▲▲▲ 여기까지 수정 ▲▲▲
        .eq("id", id)
        .single();
    if (error) return alert("주문 정보 로딩 실패");
    getAppState().formContext = { isEdit: true, data };
    window.location.hash = "order-form";
  },

  async deleteOrder(id, name) {
    if (confirm(`'${name}' 주문을 삭제하시겠습니까?`)) {
        await supabase.from("order_items").delete().eq("order_id", id);
        await supabase.from("orders").delete().eq("id", id);
        this.fetchAndRenderOrders(this.currentPage);
    }
  },

};
