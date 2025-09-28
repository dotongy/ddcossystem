// js/modules/consultations.js

import { supabase } from "../supabase.js";
import { $, $$ } from "../utils.js";
import { ALL_COUNTRIES } from "../config.js";
import { getAppState } from "../router.js";
import { getCurrentUser } from "../auth.js";

const PRODUCTION_URL = 'https://astonishing-florentine-b40517.netlify.app/';

export const ConsultationApp = {
  page: null,
  views: {},
  modal: null,
  form: null,
  modalTitle: null,
  idInput: null,
  qrModal: null, // qrModal 속성 추가
  currentExhibition: {},

  setup() {
    this.page = $("#consultations-page");
    this.views = {
      list: $("#exhibitions-list-view"),
      logs: $("#consultation-log-list-view"),
    };
    this.modal = $("#exhibition-modal");
    this.form = $("#exhibition-form");
    this.modalTitle = $("#exhibition-modal-title");
    this.idInput = $("#exhibition-id");
    this.qrModal = $("#qr-code-modal"); // qrModal 요소 선택 추가
  },

  init(context = {}) {
    // 템플릿이 HTML을 그린 후 DOM 요소를 선택해야 하므로 setup을 init 안으로 이동합니다.
    this.setup(); 
    
    // 이벤트 리스너는 페이지별로 한 번만 설정하여 중복을 방지합니다.
    if (!this.page.dataset.initialized) {
      this.page.addEventListener("click", this.handlePageClick.bind(this));
      
      if (this.form) {
        this.form.addEventListener("submit", (e) => this.saveExhibition(e));
      }

      // QR 코드 모달 닫기 버튼은 전역적으로 존재하므로 index.html에서 찾아 연결합니다.
      $("#close-qr-modal-btn")?.addEventListener("click", () => this.closeQrModal());
      // ▼▼▼ 이 부분을 추가합니다 ▼▼▼
      $("#print-qr-btn")?.addEventListener("click", () => {
  // 인보이스 인쇄와 동일한 방식으로 is-printing 클래스를 사용합니다.
  document.body.classList.add('is-printing');
  window.print();
  setTimeout(() => {
    document.body.classList.remove('is-printing');
  }, 500);
});
      $("#download-qr-btn")?.addEventListener("click", () => this.downloadQrCode());
      // ▲▲▲ 추가 끝 ▲▲▲
      
      this.page.dataset.initialized = "true";
    }

    // URL 파라미터에 따라 적절한 뷰를 표시합니다.
    if (context.exhibition_id) {
      this.currentExhibition = { id: context.exhibition_id, name: context.exhibition_name };
      this.showLogListView(context.exhibition_id, context.exhibition_name);
    } else {
      this.currentExhibition = {};
      this.showExhibitionListView();
    }
  },

  handlePageClick(e) {
    const target = e.target.closest("button, a");
    if (!target || target.type === "submit") return;

    const action = target.dataset.action;
    const id = target.dataset.id;
    const name = target.dataset.name;

    // data-action이 있는 경우에만 preventDefault와 stopPropagation을 실행합니다.
    if (action) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // [핵심 수정] switch 문 밖에서 id를 기준으로 하는 버튼들을 먼저 확인하고 처리합니다.
    if (target.id === 'add-exhibition-btn') {
        this.openModal();
        return;
    }
    if (target.id === 'cancel-exhibition-btn') {
        this.closeModal();
        return;
    }

    // data-action 속성을 기준으로 기능을 분기합니다.
    switch (action) {
      case "delete-exhibition": this.deleteExhibition(id, name); break;
      case "quick-register": this.goToQuickForm(id, name); break;
      case "view-logs": window.location.hash = `#consultations?exhibition_id=${id}&exhibition_name=${encodeURIComponent(name)}`; break;
      case "delete-log": this.deleteLog(id); break;
      case "edit-log": this.editLog(id); break;
      case "generate-qr": this.showQrCodeModal(id, name); break;
      case "back-to-list": window.location.hash = `#consultations`; break;
    }
  },

  async editLog(logId) {
    try {
      // 수정할 상담 기록의 전체 데이터를 데이터베이스에서 가져옵니다.
      const { data: log, error } = await supabase
        .from("consultation_logs")
        .select(`*`) // 이 기록에 대한 모든 정보를 가져옵니다.
        .eq("id", logId)
        .single();
      if (error) throw error;
      
      // 앱의 상태(Context)에 수정 모드임을 알리고, 불러온 데이터를 담습니다.
      getAppState().formContext = {
        isEdit: true, // 수정 모드임을 표시
        logData: log, // 불러온 데이터
        exhibitionId: this.currentExhibition.id,
        exhibitionName: this.currentExhibition.name
      };

      // 상담 등록 폼 페이지로 이동합니다.
      window.location.hash = "consultation-form";

    } catch (e) {
      alert(`상담 기록을 불러오는 데 실패했습니다: ${e.message}`);
    }
  },

  renderExhibitions(data) {
    const gridEl = $("#exhibitions-grid");
    if (!data || data.length === 0) {
      gridEl.innerHTML = '<p class="text-center text-slate-500 col-span-full">등록된 박람회가 없습니다.</p>';
      return;
    }
    gridEl.innerHTML = data.map(ex => `
        <div class="bg-white rounded-xl shadow-md p-6 flex flex-col hover:shadow-lg transition-shadow">
            <div class="flex-grow">
                <div class="flex justify-between items-start">
                    <h3 class="font-bold text-lg text-primary">${ex.name}</h3>
                    <button type="button" data-action="delete-exhibition" data-id="${ex.id}" data-name="${ex.name}" class="text-gray-400 hover:text-danger">&times;</button>
                </div>
                <p class="text-sm text-secondary mt-1">${ex.start_date} ~ ${ex.end_date}</p>
                <p class="text-sm text-secondary mb-4">${ex.location || ""}</p>
                <div class="bg-light rounded-lg p-3 text-center">
                    <p class="text-sm text-secondary">등록된 상담</p>
                    <p class="text-2xl font-bold text-gray-800">${ex.log_count}건</p>
                </div>
            </div>
            <div class="mt-6 pt-4 border-t border-border grid grid-cols-2 gap-2 text-sm">
                <a href="#" data-action="view-logs" data-id="${ex.id}" data-name="${ex.name}" class="bg-white border border-border text-secondary font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 text-center">기록 보기</a>
                <button type="button" data-action="quick-register" data-id="${ex.id}" data-name="${ex.name}" class="bg-primary text-white font-semibold py-2 px-4 rounded-lg hover:bg-primary-dark">빠른 등록</button>
                <button type="button" data-action="generate-qr" data-id="${ex.id}" data-name="${ex.name}" class="col-span-2 bg-gray-700 text-white font-semibold py-2 px-4 rounded-lg hover:bg-gray-800">QR 코드 생성</button>
            </div>
        </div>`
      ).join("");

    // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 이 부분이 수정된 핵심입니다 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼
    // 새로 생성된 모든 버튼(a태그 포함)을 찾아 이벤트를 직접 다시 연결합니다.
    gridEl.querySelectorAll("button[data-action], a[data-action]").forEach(btn => {
        btn.addEventListener("click", (e) => this.handlePageClick(e));
    });
    // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 여기까지가 수정된 부분입니다 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲
  },

  // QR 코드 모달을 보여주는 함수 추가
  showQrCodeModal(id, name) {
    if (typeof QRCode === "undefined") {
      alert("QR Code library is not loaded.");
      return;
    }

    // ▼▼▼ 이 줄을 추가합니다 ▼▼▼
    this.currentQrExhibitionName = name; // 다운로드 파일명을 위해 현재 박람회 이름 저장

    $("#qr-modal-title").textContent = `${name}`;
    $("#qrcode").innerHTML = ""; // 이전 QR 코드 삭제

    const url = `${PRODUCTION_URL}#buyer-form?exhibitionId=${id}`;
    
    new QRCode($("#qrcode"), {
        text: url,
        width: 256,
        height: 256
    });

    this.qrModal.classList.remove("hidden");
  },

  downloadQrCode() {
    try {
        const canvas = $("#qrcode canvas");
        if (!canvas) {
            throw new Error("QR 코드 캔버스를 찾을 수 없습니다.");
        }
        
        // 캔버스 데이터를 이미지 URL(PNG)로 변환합니다.
        const dataUrl = canvas.toDataURL("image/png");
        
        // 임시 링크(a 태그)를 만듭니다.
        const link = document.createElement('a');
        link.href = dataUrl;
        
        // 파일명을 설정합니다 (예: QR_Code_Seoul_Food_Expo_2025.png)
        const fileName = `QR_Code_${this.currentQrExhibitionName.replace(/\s+/g, '_')}.png`;
        link.download = fileName;
        
        // 링크를 클릭하여 다운로드를 실행합니다.
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

    } catch(e) {
        alert(`이미지 저장에 실패했습니다: ${e.message}`);
    }
  },

  // QR 코드 모달을 닫는 함수 추가
  closeQrModal() {
    this.qrModal.classList.add("hidden");
  },

  // 나머지 함수들은 그대로 유지됩니다.
  switchToView(viewName) {
    Object.values(this.views).forEach((view) => view.classList.add("hidden"));
    this.views[viewName].classList.remove("hidden");
  },
  showExhibitionListView() {
    this.switchToView("list");
    this.fetchExhibitions();
  },
  async showLogListView(id, name) {
    this.switchToView("logs");
    $("#log-list-title").textContent = `${decodeURIComponent(name)} - 상담 기록`;
    await this.fetchAndRenderLogs(id);
  },
  async fetchExhibitions() {
    const gridEl = $("#exhibitions-grid");
    gridEl.innerHTML = '<p class="text-center text-slate-500 col-span-full">박람회 목록을 불러오는 중...</p>';
    try {
      const { data: exhibitions, error: exError } = await supabase.from("exhibitions").select("*").order("start_date", { ascending: false });
      if (exError) throw exError;
      const { data: logs, error: logError } = await supabase.from("consultation_logs").select("exhibition_id");
      if (logError) throw logError;
      const logCounts = logs.reduce((acc, log) => {
        acc[log.exhibition_id] = (acc[log.exhibition_id] || 0) + 1;
        return acc;
      }, {});
      const dataWithCounts = exhibitions.map((ex) => ({ ...ex, log_count: logCounts[ex.id] || 0 }));
      this.renderExhibitions(dataWithCounts);
    } catch (err) {
      gridEl.innerHTML = `<p class="text-center text-red-500 col-span-full">목록 로딩 실패: ${err.message}</p>`;
    }
  },
  async fetchAndRenderLogs(exhibitionId) {
    const tbody = $("#log-list-tbody");
    tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">상담 기록을 불러오는 중...</td></tr>`;
    try {
      const { data, error } = await supabase.from("consultation_logs").select("*, customers(name)").eq("exhibition_id", exhibitionId).order("consultation_date", { ascending: false });
      if (error) throw error;
      if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-slate-500">이 박람회에 등록된 상담 기록이 없습니다.</td></tr>`;
        return;
      }
      tbody.innerHTML = data.map(log => `
            <tr class="border-b hover:bg-slate-50">
                <td class="p-3 font-medium">${log.customers?.name || "N/A"}</td>
                <td class="p-3">${log.consultation_date}</td>
                <td class="p-3 text-sm text-slate-600">${(log.interested_products || []).length}개 품목</td>
                <td class="p-3 text-center">${log.has_business_card ? "✔️" : "➖"}</td>
                <td class="p-3 text-center space-x-2">
                    <button type="button" data-action="edit-log" data-id="${log.id}" class="text-indigo-600 hover:text-indigo-900">수정</button>
                    <button type="button" data-action="delete-log" data-id="${log.id}" class="text-red-600 hover:text-red-900">삭제</button>
                </td>
            </tr>`).join("");
    } catch (e) {
      tbody.innerHTML = `<tr><td colspan="5" class="p-4 text-center text-red-500">상담 기록 로딩 실패: ${e.message}</td></tr>`;
    }
  },
  async deleteLog(logId) {
    if (!confirm("이 상담 기록을 정말로 삭제하시겠습니까?")) return;
    try {
      const { error } = await supabase.from("consultation_logs").delete().eq("id", logId);
      if (error) throw error;
      alert("상담 기록이 삭제되었습니다.");
      this.fetchAndRenderLogs(this.currentExhibition.id);
    } catch (e) {
      alert(`삭제 실패: ${e.message}`);
    }
  },
  openModal() {
    this.form.reset();
    this.idInput.value = "";
    this.modalTitle.textContent = "신규 박람회 등록";
    this.modal.classList.remove("hidden");
  },
  closeModal() {
    this.modal.classList.add("hidden");
  },
  async saveExhibition(e) {
    e.preventDefault();
    const saveButton = this.form.querySelector('button[type="submit"]');
    saveButton.disabled = true;
    saveButton.textContent = "저장 중...";
    const exhibitionData = { name: $("#exhibition-name").value, start_date: $("#exhibition-start-date").value, end_date: $("#exhibition-end-date").value, location: $("#exhibition-location").value };
    try {
      const { error } = await supabase.from("exhibitions").insert([exhibitionData]);
      if (error) throw error;
      alert("박람회가 성공적으로 등록되었습니다.");
      this.closeModal();
      this.fetchExhibitions();
    } catch (err) {
      alert(`저장 실패: ${err.message}`);
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "저장";
    }
  },
  async deleteExhibition(id, name) {
    if (!confirm(`'${name}' 박람회를 정말로 삭제하시겠습니까?\n\n⚠️ 경고: 이 박람회와 관련된 모든 상담 기록이 함께 영구적으로 삭제되며, 이 작업은 되돌릴 수 없습니다.`)) return;
    try {
      await supabase.from("consultation_logs").delete().eq("exhibition_id", id);
      await supabase.from("exhibitions").delete().eq("id", id);
      alert(`'${name}' 박람회 정보가 성공적으로 삭제되었습니다.`);
      this.fetchExhibitions();
    } catch (error) {
      alert(`삭제 중 오류가 발생했습니다: ${error.message}`);
    }
  },
  goToQuickForm(id, name) {
    getAppState().formContext = { exhibitionId: id, exhibitionName: name };
    window.location.hash = "consultation-form";
  },
};


export const ConsultationFormApp = {
  formPage: null,
  form: null,
  newCustomerFields: null,
  newCountrySelect: null,
  checkbox: null,

  setup() {
    this.formPage = $("#consultation-form-page");
    if (this.formPage) {
      this.form = this.formPage.querySelector("#consultation-form");
      this.newCustomerFields = this.formPage.querySelector(
        "#new-customer-fields",
      );
      this.newCountrySelect = this.formPage.querySelector("#new-country");
      this.checkbox = this.formPage.querySelector("#has_business_card");
    }
  },

  async init(context) {
    this.setup();
    if (!this.form) {
      console.error("Consultation form not found. Aborting init.");
      return;
    }

    this.form.reset();

    // ▼▼▼ 이 아래 init 함수의 모든 내용을 교체합니다 ▼▼▼

    const isEditMode = context.isEdit === true;

    // 모드에 따라 제목과 버튼 텍스트를 변경합니다.
    this.formPage.querySelector("#consultation-form-title").textContent = 
        isEditMode ? `상담 기록 수정 (${context.exhibitionName})` : `빠른 상담 등록 (${context.exhibitionName})`;
    
    const saveButton = this.form.querySelector('button[type="submit"]');
    saveButton.textContent = isEditMode ? "수정 완료" : "상담 기록 저장";
    
    // 수정 모드인 경우, 나중에 저장할 때 사용할 log의 id를 form에 저장해 둡니다.
    this.form.dataset.isEdit = isEditMode;
    if (isEditMode) {
        this.form.dataset.logId = context.logData.id;
    } else {
        delete this.form.dataset.logId;
    }

    const backBtn = $("#back-to-logs-btn");
    if (backBtn) {
      backBtn.href = `#consultations?exhibition_id=${context.exhibitionId}&exhibition_name=${encodeURIComponent(context.exhibitionName)}`;
    }

    await this.populateCustomerDropdown();
    await this.populateProductChecklist();
    this.populateNewCustomerCountries();
    this.newCustomerFields.classList.add("hidden");

    // 수정 모드일 때만 기존 데이터를 폼에 채웁니다.
    if (isEditMode && context.logData) {
        const log = context.logData;
        
        this.form.consultation_date.value = log.consultation_date;
        this.form.customer_id.value = log.customer_id;
        this.form.notes.value = log.notes;
        
        // 관심 품목 체크박스들을 채웁니다. (시간이 조금 걸릴 수 있어 await 이후에 실행)
        // populateProductChecklist가 완료될 때까지 잠시 기다립니다.
        setTimeout(() => {
            if (log.interested_products && log.interested_products.length > 0) {
                log.interested_products.forEach(productId => {
                    const checkbox = this.form.querySelector(`input[name="interested_products"][value="${productId}"]`);
                    if (checkbox) checkbox.checked = true;
                });
            }
        }, 100); // 0.1초 지연
        
        // 수정 모드에서는 '신규 고객' 관련 기능을 비활성화합니다.
        this.checkbox.checked = false;
        this.checkbox.disabled = true;

    } else {
        // '신규 등록' 모드일 때의 기본값 설정
        this.form.consultation_date.value = new Date().toISOString().split("T")[0];
        this.checkbox.checked = false;
        this.checkbox.disabled = false;
    }

    if (!this.formPage.dataset.initialized) {
      this.form.addEventListener("submit", (e) => this.saveLog(e, context));
      this.checkbox.addEventListener("change", () => {
        this.newCustomerFields.classList.toggle("hidden", !this.checkbox.checked);
      });
      this.formPage.dataset.initialized = "true";
    }
  },

  async populateCustomerDropdown() {
    const selectEl = $("#consultation-customer-select");
    selectEl.innerHTML = '<option value="">고객 선택 중...</option>';
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("id, name")
        .order("name");
      if (error) throw error;
      let options = '<option value="">기존 고객 선택</option>';
      options += data
        .map((c) => `<option value="${c.id}">${c.name}</option>`)
        .join("");
      selectEl.innerHTML = options;
    } catch (e) {
      console.error("Failed to populate customers:", e);
      selectEl.innerHTML = '<option value="">고객 목록 로딩 실패</option>';
    }
  },

  async populateProductChecklist() {
    const container = $("#interested-products-list");
    container.innerHTML = "<span>관심 품목 로딩 중...</span>";
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name_kr")
        .order("name_kr");
      if (error) throw error;
      container.className =
        "mt-2 border rounded-md p-2 h-48 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2";
      container.innerHTML = data
        .map(
          (p) => `
                <label class="flex items-center space-x-2 p-1 rounded hover:bg-slate-100 cursor-pointer">
                    <input type="checkbox" name="interested_products" value="${p.id}" class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500">
                    <span class="text-sm">${p.name_kr}</span>
                </label>
            `,
        )
        .join("");
    } catch (e) {
      console.error("Failed to populate products:", e);
      container.innerHTML =
        '<span class="text-red-500">제품 목록 로딩 실패</span>';
    }
  },

  populateNewCustomerCountries() {
    if (!this.newCountrySelect) return;
    this.newCountrySelect.innerHTML =
      '<option value="">국가 선택</option>' +
      ALL_COUNTRIES.map((c) => `<option value="${c}">${c}</option>`).join("");
  },

  async saveLog(e, context) {
    e.preventDefault();
    const saveButton = this.form.querySelector('button[type="submit"]');
    const isEditMode = this.form.dataset.isEdit === 'true';
    
    saveButton.disabled = true;
    saveButton.textContent = isEditMode ? "수정 중..." : "저장 중...";

    // 수정 모드에서는 신규 고객 생성이 불가능하므로, hasBusinessCard는 항상 false입니다.
    const hasBusinessCard = !isEditMode && this.form.has_business_card.checked;
    let customerId = this.form.customer_id.value;

    try {
      if (hasBusinessCard && this.form.new_customer_name.value) {
        const user = getCurrentUser();
        if (!user) throw new Error("로그인 정보가 없습니다. 다시 로그인해주세요.");
        const newCustomer = {
          name: this.form.new_customer_name.value,
          contact_person: this.form.new_contact_person.value,
          email: this.form.new_email.value,
          phone: this.form.new_phone.value,
          country: this.form.new_country.value,
          has_business_card: true,
          user_id: user.id,
          acquisition_source: `EXHIBITION_QUICK_ENTRY_${context.exhibitionId}`
        };
        const { data: createdCustomer, error } = await supabase.from("customers").insert(newCustomer).select().single();
        if (error) throw new Error(`신규 고객 저장 실패: ${error.message}`);
        customerId = createdCustomer.id;
      }

      if (!customerId) {
        throw new Error("고객을 선택해주세요.");
      }

      const interestedProducts = Array.from(this.form.querySelectorAll('input[name="interested_products"]:checked')).map((el) => parseInt(el.value));
      
      const logData = {
        exhibition_id: context.exhibitionId,
        customer_id: customerId,
        consultation_date: this.form.consultation_date.value,
        notes: this.form.notes.value,
        interested_products: interestedProducts,
      };

      // 수정 모드일 때는 has_business_card 값을 업데이트하지 않습니다.
      if (!isEditMode) {
        logData.has_business_card = hasBusinessCard;
      }

      if (isEditMode) {
        // 수정 모드: update 실행
        const logId = this.form.dataset.logId;
        const { error } = await supabase.from("consultation_logs").update(logData).eq("id", logId);
        if (error) throw error;
        alert("상담 기록이 성공적으로 수정되었습니다.");
      } else {
        // 생성 모드: insert 실행
        const { error } = await supabase.from("consultation_logs").insert([logData]);
        if (error) throw error;
        alert("상담 기록이 성공적으로 저장되었습니다.");
      }
      
      window.location.hash = `#consultations?exhibition_id=${context.exhibitionId}&exhibition_name=${encodeURIComponent(context.exhibitionName)}`;
    } catch (err) {
      alert(`저장/수정 실패: ${err.message}`);
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = isEditMode ? "수정 완료" : "상담 기록 저장";
    }
  },
  
};

// js/modules/consultations.js 파일 맨 아래에 추가할 코드

// QR 코드를 통해 접속하는 바이어 폼을 제어하는 객체
export const BuyerFormApp = {
  container: null,
  form: null,
  submitBtn: null,
  messageEl: null,
  exhibitionId: null,

  setup(container) {
    if (!container) return false;
    this.container = container;
    this.form = container.querySelector("#buyer-submission-form");
    this.submitBtn = container.querySelector("#buyer-submit-btn");
    this.messageEl = container.querySelector("#buyer-form-message");
    return this.form && this.submitBtn && this.messageEl;
  },

  async init(exhibitionId) {
    console.log('🚀 BuyerFormApp.init called');
  console.log('📋 Exhibition ID:', exhibitionId);
  console.log('🔍 Container check:', !!$("#buyer-form-page"));

    if (!exhibitionId) {
      console.error('❌ Exhibition ID is missing!');
      alert('Exhibition ID가 없습니다. QR 코드를 다시 확인해주세요.');
      return;
    }

    const buyerPageContainer = $("#buyer-form-page");
    if (!buyerPageContainer) {
      console.error('❌ Critical Error: #buyer-form-page container not found!');
      return;
    }

    if (!this.setup(buyerPageContainer)) {
      console.error('❌ Buyer form essential elements not found inside container!');
      return;
    }

    this.exhibitionId = exhibitionId;
    
    const exhibitionIdInput = this.container.querySelector("#buyer-form-exhibition-id");
    if (exhibitionIdInput) {
      exhibitionIdInput.value = exhibitionId;
    } else {
      console.error('❌ Hidden input for exhibition ID not found!');
    }

    this.populateCountries();
    await this.populateProductChecklist();

    try {
      const { data } = await supabase
        .from("exhibitions")
        .select("name")
        .eq("id", exhibitionId)
        .single();
      if (data) {
        const headerEl = this.container.querySelector("#buyer-form-header");
        if (headerEl) {
          headerEl.textContent = `${data.name} Visitor Inquiry`;
        }
      }
    } catch (e) {
      console.error("Failed to load exhibition name", e);
    }

    if (!this.form.dataset.initialized) {
      this.form.addEventListener("submit", this.save.bind(this));
      this.form.dataset.initialized = "true";
    }
    
    console.log('✅ BuyerFormApp initialized successfully');
  },

  populateCountries() {
    const selectEl = this.container.querySelector("#buyer-country");
    if (!selectEl) return;
    selectEl.innerHTML =
      '<option value="">Select your country</option>' +
      ALL_COUNTRIES.map((c) => `<option value="${c}">${c}</option>`).join("");
  },

  async populateProductChecklist() {
    const container = this.container.querySelector("#buyer-interested-products");
    if (!container) return;
    container.innerHTML = '<p class="text-slate-400">Loading products...</p>';
    try {
      const { data, error } = await supabase
        .from("products")
        .select("id, name_kr, name_en")
        .order("name_kr");
      if (error) throw error;
      container.innerHTML = data
        .map(
          (p) => `
            <label class="flex items-center space-x-3 p-1 cursor-pointer">
                <input type="checkbox" name="interested_products" value="${p.id}" class="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 flex-shrink-0">
                <span>${p.name_en || p.name_kr}</span>
            </label>
          `,
        )
        .join("");
    } catch (e) {
      container.innerHTML = '<p class="text-red-500">Could not load product list.</p>';
    }
  },

  async save(e) {
    e.preventDefault();
    this.submitBtn.disabled = true;
    this.submitBtn.textContent = "Submitting...";
    this.messageEl.classList.add("hidden");
    const formData = new FormData(this.form);
    const formProps = Object.fromEntries(formData.entries());

    try {
      let customerId;
      const { data: existingCustomer } = await supabase.from("customers").select("id").eq("email", formProps.email).single();
      
      if (existingCustomer) {
        customerId = existingCustomer.id;
      } else {
        const customerData = {
          name: formProps.name,
          contact_person: formProps.contact_person,
          email: formProps.email,
          phone: formProps.phone,
          country: formProps.country,
          has_business_card: false,
          acquisition_source: `QR_EXHIBITION_${this.exhibitionId}` // <-- 이 줄을 추가합니다.
        };
        const { data: newCustomer, error } = await supabase.from("customers").insert(customerData).select().single();
        if (error) throw error;
        customerId = newCustomer.id;
      }

      const interestedProducts = formData.getAll("interested_products").map(Number);
      const logData = { exhibition_id: this.exhibitionId, customer_id: customerId, consultation_date: new Date().toISOString().split("T")[0], notes: formProps.notes, has_business_card: false, interested_products: interestedProducts };
      const { error: logError } = await supabase.from("consultation_logs").insert(logData);
      if (logError) throw logError;
      
      // ======================= ▼▼▼ 수정된 부분 시작 ▼▼▼ =======================
      if (this.container) {
        // 1. 모든 문구를 영문으로 변경합니다.
        this.container.innerHTML = `
            <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div class="w-full max-w-2xl text-center">
                    <svg class="mx-auto h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <h1 class="text-3xl font-bold mt-4 text-slate-800">Submission Complete!</h1>
                    <p class="text-slate-600 mt-2 text-lg">Your information has been submitted successfully. Thank you.</p>
                    <p class="text-slate-500 mt-4 text-sm">You can now close this window.</p>                
                    <button id="manual-close-btn" class="mt-6 btn-primary">Close Window</button>
                </div>
            </div>`;
        
        // 3. 새로 추가된 버튼에 '창 닫기' 이벤트를 연결 (setTimeout 제거)
        const closeBtn = this.container.querySelector('#manual-close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                window.close();
            });
        }
      }
      // ======================= ▲▲▲ 수정된 부분 끝 ▲▲▲ =======================
    } catch (err) {
      console.error("Submission failed:", err);
      this.messageEl.textContent = `An error occurred: ${err.message}. Please try again.`;
      this.messageEl.classList.remove("hidden");
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = "Submit Information";
    }
  },
};