// js/modules/products.js

import { supabase } from "../supabase.js";
import { $, $$, createPagination } from "../utils.js";
import { getAppState } from "../router.js";

export const ProductApp = {
  listEl: null,
  form: null,
  title: null,
  idInput: null,
  errorMsg: null,
  saveBtn: null,
  currentPage: 1,
  rowsPerPage: 15,
  totalRows: 0,
  
  setupListView() {
    this.listEl = $("#product-list");
  },

  setupFormView() {
    this.form = $("#product-form");
    this.title = $("#product-form-title");
    this.idInput = $("#product-id");
    this.errorMsg = $("#product-error-message");
    this.saveBtn = $("#product-save-btn");
  },

  init() {
    console.log("ProductApp: Initializing...");
    this.setupListView(); // this.setup() -> this.setupListView()로 변경
    const page = $("#products-page");
    if (page && !page.dataset.initialized) {
      page.addEventListener("click", this.handlePageClick.bind(this));
      const searchInput = $("#product-search-input");
      if (searchInput) {
        searchInput.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            this.fetch(1, e.target.value);
          }
        });
      }
      const selectAllCheckbox = $("#select-all-products-checkbox");
      if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener("change", (e) => {
          $$("#product-list .product-checkbox").forEach((checkbox) => {
            checkbox.checked = e.target.checked;
          });
          this.updateDeleteButtonVisibility();
        });
      }
      if (this.listEl) {
        this.listEl.addEventListener("change", (e) => {
          if (e.target.classList.contains("product-checkbox")) {
            this.updateDeleteButtonVisibility();
          }
        });
      }
      $("#product-excel-input").addEventListener("change", (e) =>
        this.handleExcelImport(e),
      );
      page.dataset.initialized = "true";
    }
    this.fetch(1);
  },

  handlePageClick(e) {
    const target = e.target.closest("button");
    if (!target) return;
    
    // 패널 내부 버튼들의 동작을 먼저 처리
    switch (target.id) {
        case "close-detail-panel-btn":
            this.hideDetailPanel();
            return;
        case "panel-edit-btn":
            this.edit(this.currentDetailProductId);
            return;
        case "panel-delete-btn":
            // ▼▼▼ 이 부분을 수정합니다. ▼▼▼
            const detailPanelEl = $("#product-detail-panel");
            const productName = detailPanelEl ? detailPanelEl.querySelector('#panel-name_kr').textContent : '해당 상품';
            // ▲▲▲ 여기까지 수정 ▲▲▲
            this.delete(this.currentDetailProductId, productName);
            this.hideDetailPanel();
            return;
    }

    // 기존 페이지 버튼들의 동작 처리
    switch (target.id) {
      case "add-product-btn":
        getAppState().formContext = { isEdit: false };
        window.location.hash = "product-form";
        break;
      case "delete-selected-products-btn":
        this.deleteSelectedProducts();
        break;
      case "product-search-btn":
        this.fetch(1, $("#product-search-input").value);
        break;
      case "product-view-all-btn":
        $("#product-search-input").value = "";
        this.fetch(1);
        break;
      case "import-product-excel-btn":
        $("#product-excel-input").click();
        break;
      case "download-product-template-btn":
        this.downloadExcelTemplate();
        break;
      case "export-all-products-btn":
        this.exportAllProductsToExcel();
        break;
    }
  },

  downloadExcelTemplate() {
    const columnMap = {
      "Product Name (KR)": "name_kr",
      Manufacturer: "manufacturer",
      "Product Name (EN)": "name_en",
      "HS CODE": "hs_code",
      Barcode: "barcode",
      Volume: "volume",
      "Retail Price": "retail_price",
      "Vendor 1": "supply_price",
      "Vendor 2": "export_price",
      "Box Price": "vendor_price_1",
      "Sample Price": "sample_price",
      "Inbox Qty": "inbox_quantity",
      "Outbox Qty": "outbox_quantity",
      "Outbox Size (W/D/H)": "outbox_size",
      "CBM (m³)": "cbm",
      "Unit Weight (g)": "unit_weight",
      "Gross Weight (Kg)": "gross_weight",
      "Net Weight (Kg)": "net_weight",
      "Image URL": "image_url",
      Description: "description",
      "CPNP": "cpnp_number",
      "SCPN": "scpn_number",
      "MoCRA": "mocra_number",
    };
    const headers = Object.keys(columnMap);
    const sampleData = [
      {
        "Product Name (KR)": "예시 상품 A",
        Manufacturer: "예시 제조사",
        "Product Name (EN)": "Sample Product A",
        "HS CODE": "1234.56.7890",
        Barcode: "8801234567890",
        Volume: "100ml",
        "Retail Price": 30000,
        "Vendor 1": 15000,
        "Vendor 2": 16000,
        "Box Price": 14000,
        "Sample Price": 5000,
        "Inbox Qty": 10,
        "Outbox Qty": 100,
        "Outbox Size (W/D/H)": "50x40x30",
        "CBM (m³)": 0.06,
        "Unit Weight (g)": 120,
        "Gross Weight (Kg)": 13.5,
        "Net Weight (Kg)": 12,
        "Image URL": "http://example.com/image.jpg",
        Description: "이것은 샘플 상품 설명입니다.",
      },
    ];
    const worksheet = XLSX.utils.json_to_sheet(sampleData, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Products");
    XLSX.writeFile(workbook, "product_import_template.xlsx");
  },

  async exportAllProductsToExcel() {
    try {
        const { data: products, error } = await supabase
            .from("products")
            .select('*')
            .order('id', { ascending: true });

        if (error) throw error;
        if (products.length === 0) {
            alert("내보낼 제품 데이터가 없습니다.");
            return;
        }

        // 엑셀 헤더 순서 정의 (id 포함)
        const headers = [
            'id', 'name_kr', 'manufacturer', 'name_en', 'hs_code', 'barcode', 
            'volume', 'retail_price', 'supply_price', 'export_price', 
            'vendor_price_1', 'sample_price', 'inbox_quantity', 'outbox_quantity',
            'outbox_size', 'cbm', 'unit_weight', 'gross_weight', 'net_weight',
            'image_url', 'description'
        ];

        const worksheet = XLSX.utils.json_to_sheet(products, { header: headers });
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

        const today = new Date().toISOString().split('T')[0];
        XLSX.writeFile(workbook, `products_export_${today}.xlsx`);

    } catch (e) {
        alert(`데이터 내보내기 중 오류 발생: ${e.message}`);
    }
},

  async handleExcelImport(event) {
    const file = event.target.files[0];
    if (!file) return;
    alert(
      "엑셀 파일을 처리 중입니다. 데이터 양에 따라 시간이 걸릴 수 있습니다.",
    );
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
          'id': 'id',
          'product name (kr)': 'name_kr',
          'manufacturer': 'manufacturer',
          'product name (en)': 'name_en',
          'hs code': 'hs_code',
          'barcode': 'barcode',
          'volume': 'volume',
          'retail price': 'retail_price',
          'vendor 1': 'supply_price',
          'vendor 2': 'export_price',
          'box price': 'vendor_price_1',
          'sample price': 'sample_price',
          'inbox qty': 'inbox_quantity',
          'outbox qty': 'outbox_quantity',
          'outbox size (w/d/h)': 'outbox_size',
          'cbm (m³)': 'cbm',
          'unit weight (g)': 'unit_weight',
          'gross weight (kg)': 'gross_weight',
          'net weight (kg)': 'net_weight',
          'image url': 'image_url',
          'description': 'description',
           'cpnp': 'cpnp_number',
          'scpn': 'scpn_number',
          'mocra': 'mocra_number',
        };

        const productsToInsert = [];
        const productsToUpdate = [];

        json.forEach((row) => {
            const newProduct = {};
            for (const excelCol in row) {
                const normalizedHeader = String(excelCol).toLowerCase().trim();
                const dbColumn = columnMap[normalizedHeader];
                if (dbColumn) {
                    newProduct[dbColumn] = row[excelCol];
                }
            }

            // ID가 있으면 업데이트용, 없으면 삽입용으로 분리
            if (newProduct.id && newProduct.id !== "" && newProduct.id !== null) {
                // 업데이트용: ID는 where 조건에 사용하고 데이터에서는 제거
                const updateData = { ...newProduct };
                const id = updateData.id;
                delete updateData.id;
                productsToUpdate.push({ id, data: updateData });
            } else {
                // 삽입용: ID는 제거
                delete newProduct.id;
                productsToInsert.push(newProduct);
            }
        });

        console.log("삽입할 데이터:", productsToInsert);
        console.log("업데이트할 데이터:", productsToUpdate);

        let insertCount = 0, updateCount = 0;

        // 1. 새 제품 삽입
        if (productsToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from("products")
                .insert(productsToInsert);
            
            if (insertError) throw insertError;
            insertCount = productsToInsert.length;
        }

        // 2. 기존 제품 업데이트
        for (const { id, data } of productsToUpdate) {
            const { error: updateError } = await supabase
                .from("products")
                .update(data)
                .eq("id", id);
            
            if (updateError) {
                console.warn(`ID ${id} 업데이트 실패:`, updateError.message);
            } else {
                updateCount++;
            }
        }

        alert(`처리 완료: ${insertCount}개 신규 추가, ${updateCount}개 업데이트`);
        this.fetch(1);

      } catch (err) {
        alert(`가져오기 실패: ${err.message}`);
      } finally {
        event.target.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
},

  async fetch(page = 1, searchTerm = "") {
    this.currentPage = page;
    if (!this.listEl) this.setupListView();
    this.listEl.innerHTML = `<tr><td colspan="13" class="p-4 text-center text-slate-500">상품 목록을 불러오는 중...</td></tr>`;
    try {
      let query = supabase.from("products").select("*", { count: "exact" });
      const searchStr = searchTerm.trim();
      if (searchStr) query = query.ilike("name_kr", `%${searchStr}%`);
      const from = (page - 1) * this.rowsPerPage;
      const to = from + this.rowsPerPage - 1;
      query = query.order("id", { ascending: true }).range(from, to);
      const { data, count, error } = await query;
      if (error) throw error;
      this.totalRows = count;
      this.render(data);
      this.renderPagination();
    } catch (e) {
      console.error("ProductApp: Data fetching failed.", e);
      this.listEl.innerHTML = `<tr><td colspan="13" class="p-4 text-center text-red-500">데이터 로딩 실패: ${e.message}</td></tr>`;
    }
  },

  renderPagination() {
    const paginationEl = $("#product-pagination");
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
    
    paginationEl.querySelectorAll("button[data-page]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const pageToGo = parseInt(e.currentTarget.dataset.page);
        this.fetch(pageToGo, $("#product-search-input").value);
      });
    });
  },

  render(data) {
    if (!this.listEl) return;
    if (data.length === 0) {
      // ▼▼▼ [수정] colspan을 9로 변경합니다. ▼▼▼
      this.listEl.innerHTML = `<tr><td colspan="9" class="p-4 text-center text-secondary">일치하는 상품이 없습니다.</td></tr>`;
      return;
    }
    
    // ▼▼▼ 표시 항목을 가격 정보 5가지로 변경합니다. ▼▼▼
    this.listEl.innerHTML = data.map(p => `
        <tr data-id="${p.id}" class="hover:bg-gray-50 cursor-pointer">
            <td class="p-4 text-center"><input type="checkbox" class="product-checkbox h-4 w-4" data-id="${p.id}"></td>
            <td class="p-4"><img src="${p.image_url || "https://placehold.co/60x60/e2e8f0/e2e8f0?text=."}" alt="${p.name_kr}" class="w-12 h-12 object-cover rounded"></td>
            <td class="p-4 font-medium text-gray-900 break-words">${p.name_kr}</td>
            <td class="p-4 text-secondary text-right">₩${Number(p.retail_price || 0).toLocaleString()}</td>
            <td class="p-4 text-secondary text-right">₩${Number(p.supply_price || 0).toLocaleString()}</td>
            <td class="p-4 text-secondary text-right">₩${Number(p.export_price || 0).toLocaleString()}</td>
            <td class="p-4 text-secondary text-right">₩${Number(p.vendor_price_1 || 0).toLocaleString()}</td>
            <td class="p-4 text-secondary text-right">₩${Number(p.sample_price || 0).toLocaleString()}</td>
            <td class="p-4 whitespace-nowrap text-center">
                <button data-action="edit" class="text-primary hover:text-primary-dark font-semibold mr-2">수정</button>
                <button data-action="delete" data-name="${p.name_kr}" class="text-danger hover:text-red-700 font-semibold">삭제</button>
            </td>
        </tr>`
      ).join("");
    // ▲▲▲ 렌더링 코드 수정 완료 ▲▲▲

    this.listEl.querySelectorAll("tr[data-id]").forEach(row => {
        row.addEventListener('click', (e) => {
            if (e.target.closest('button') || e.target.matches('input[type="checkbox"]')) {
                return;
            }
            this.showDetailPanel(row.dataset.id);
        });
    });

    this.listEl.querySelectorAll("button[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        this.handleListClick(e)
      });
    });

    this.updateDeleteButtonVisibility();
    if ($("#select-all-products-checkbox")) {
      $("#select-all-products-checkbox").checked = false;
    }
  },

  updateDeleteButtonVisibility() {
    const deleteBtn = $("#delete-selected-products-btn");
    if (!deleteBtn) return;
    const selectedCheckboxes = $$("#product-list .product-checkbox:checked");
    deleteBtn.classList.toggle("hidden", selectedCheckboxes.length === 0);
  },

  async deleteSelectedProducts() {
    const selectedIds = Array.from(
      $$("#product-list .product-checkbox:checked"),
    ).map((cb) => cb.dataset.id);
    if (selectedIds.length === 0) return;
    if (!confirm(`${selectedIds.length}개의 제품을 삭제하시겠습니까?`)) return;
    try {
      const { error } = await supabase
        .from("products")
        .delete()
        .in("id", selectedIds);
      if (error) throw error;
      alert(`${selectedIds.length}개의 제품이 삭제되었습니다.`);
      await this.fetch(this.currentPage);
    } catch (error) {
      alert(`삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  },

  openEditor(isEdit = false, data = {}) {
    this.setupFormView(); // 1. 폼 전용 setup 함수를 호출합니다.

  // 2. 폼이 존재하는지 다시 한번 확인하여 안정성을 높입니다.
  if (!this.form) {
    console.error("Product form not found in the DOM.");
    return;
  }
    this.form.reset();
    this.idInput.value = "";
    this.errorMsg.classList.add("hidden");
    this.title.textContent = isEdit ? "상품 정보 수정" : "신규 상품 등록";
    if (isEdit) {
      this.idInput.value = data.id;
      for (const key in data) {
        const input = this.form.querySelector(`[name="${key}"]`);
        if (input) input.value = data[key];
      }
    }
    if (!this.form.dataset.initialized) {
      this.form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.save();
      });
      $("#product-cancel-btn").addEventListener(
        "click",
        () => (window.location.hash = "products"),
      );
      this.form.dataset.initialized = "true";
    }
  },

  async save() {
    this.saveBtn.disabled = true;
    this.saveBtn.textContent = "저장 중...";
    this.errorMsg.classList.add("hidden");
    const formData = new FormData(this.form);
    const productData = Object.fromEntries(formData.entries());
    
    // [수정] 'cbm'을 숫자 처리 목록에 추가합니다.
    [
      "retail_price", "supply_price", "export_price", "vendor_price_1", 
      "sample_price", "inbox_quantity", "outbox_quantity", "cbm", 
      "unit_weight", "gross_weight", "net_weight",
    ].forEach((field) => {
      if (productData[field])
        productData[field] = parseFloat(String(productData[field]).replace(/,/g, ""));
      else delete productData[field];
    });

    try {
      const id = this.idInput.value;

      if (id) {
        delete productData.id; 
        const { error } = await supabase.from("products").update(productData).eq("id", id);
        if (error) throw error;
      } else {
        delete productData.id;
        const { error } = await supabase.from("products").insert([productData]);
        if (error) throw error;
      }
      
      window.location.hash = "products";

    } catch (e) {
      this.errorMsg.textContent = `저장 실패: ${e.message}`;
      this.errorMsg.classList.remove("hidden");
    } finally {
      this.saveBtn.disabled = false;
      this.saveBtn.textContent = "저장";
    }
  },

  async delete(id, name) {
    if (!confirm(`정말로 상품 '${name}'을(를) 삭제하시겠습니까?`)) return;
    try {
      const { error } = await supabase.from("products").delete().eq("id", id);
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
  },

  async edit(id) {
    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      getAppState().formContext = { isEdit: true, data };
      window.location.hash = "product-form";
    } catch (e) {
      alert("상품 정보 로딩 실패.");
    }
  },

  async showDetailPanel(productId) {
    // ▼▼▼ 함수가 호출되는 시점에 직접 패널과 오버레이를 찾습니다. ▼▼▼
    const detailPanelEl = $("#product-detail-panel");
    const detailPanelOverlay = $("#product-detail-overlay");

    // 만약 이 시점에도 찾지 못한다면, templates.js에 문제가 있다는 명확한 경고를 띄웁니다.
    if (!detailPanelEl || !detailPanelOverlay) {
        alert("치명적 오류: 상세 정보 패널의 HTML 요소를 찾을 수 없습니다. templates.js 파일을 확인해주세요.");
        return;
    }

    this.currentDetailProductId = productId; // 상품 ID는 여전히 저장해 둡니다.

    try {
        const { data: product, error } = await supabase
            .from('products')
            .select('*')
            .eq('id', productId)
            .single();

        if (error) throw error;
        
        // 패널에 데이터 채우기
        for (const key in product) {
            const el = detailPanelEl.querySelector(`#panel-${key}`);
            if (el) {
                if (['retail_price', 'supply_price', 'export_price'].includes(key)) {
                    el.textContent = `₩${Number(product[key] || 0).toLocaleString()}`;
                } else {
                    el.textContent = product[key] || 'N/A';
                }
            }
        }
        detailPanelEl.querySelector('#panel-image').src = product.image_url || "https://placehold.co/300x300/e2e8f0/e2e8f0?text=.";
        
        // 패널 보이기
        document.body.classList.add('panel-open');
        detailPanelOverlay.classList.remove('hidden');
        detailPanelEl.classList.remove('hidden');
        setTimeout(() => detailPanelEl.classList.add('is-open'), 10);

    } catch(e) {
        alert(`상품 상세 정보를 불러오는 데 실패했습니다: ${e.message}`);
    }
  },

  hideDetailPanel() {
    const detailPanelEl = $("#product-detail-panel");
    const detailPanelOverlay = $("#product-detail-overlay");
    if (!detailPanelEl || !detailPanelOverlay) return;

    document.body.classList.remove('panel-open');
    detailPanelEl.classList.remove('is-open');
    setTimeout(() => {
        detailPanelEl.classList.add('hidden');
        detailPanelOverlay.classList.add('hidden');
    }, 300);
  },

};
