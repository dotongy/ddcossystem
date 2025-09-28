// js/modules/documents.js

import { supabase } from '../supabase.js';
import { $, $$ } from '../utils.js';

export const DocumentApp = {
    docType: '',
    pageEl: null,
    views: {}, 
    
    documentData: {},
    renderOptions: {},
    currentColumnConfig: null, // 현재 문서의 열 구성을 저장할 변수

   init(type) {
    // [핵심 수정] 새로운 타입의 문서 작업을 시작하기 전에,
    // 이전에 작업하던 문서의 상태 정보를 깨끗하게 초기화합니다.
    this.documentData = {};
    this.currentColumnConfig = null;
    this.renderOptions = {};

    this.docType = type;
    this.pageEl = $(`#${type}-page`);
    this.views = {
        list: $(`#${type}-order-list-view`),
        options: $(`#${type}-options-view`),
        doc: $(`#${type}-document-view`)
    };

    if (!this.pageEl.dataset.initialized) {
        this.pageEl.addEventListener('click', this.handlePageClick.bind(this));
        
        const searchInput = $(`#${this.docType}-search-input`);
        if (searchInput) {
            searchInput.addEventListener('input', () => this.fetchOrders());
        }
        const viewAllBtn = $(`#${this.docType}-view-all-btn`);
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', () => this.handleViewAll());
        }
        
        this.pageEl.dataset.initialized = 'true';
    }

    this.switchToView('list');
    this.fetchOrders();
},

    _createActionButton(action, text, className = 'btn-secondary') {
        return `<button type="button" data-action="${action}" class="${className}">${text}</button>`;
    },
    
    handleViewAll() {
        const searchInput = $(`#${this.docType}-search-input`);
        if (searchInput) searchInput.value = '';
        this.fetchOrders();
    },

    switchToView(viewName) {
        Object.values(this.views).forEach(view => view.classList.add('hidden'));
        this.views[viewName].classList.remove('hidden');
    },

    updateDocumentDataFromView() {
    const docView = this.views.doc;
    if (!docView) return;

    if (!this.documentData.customContent) {
        this.documentData.customContent = {};
    }

    // 1. 아이템 테이블 캡처
    const itemsTableBody = docView.querySelector('.items-table-body');
    const newItems = [];
    if (itemsTableBody) {
        const onScreenRows = itemsTableBody.querySelectorAll('.item-row');
        onScreenRows.forEach(row => {
            const originalIndex = row.dataset.index;
            const originalItem = originalIndex ? this.documentData.items[originalIndex] : null;

            // [핵심 수정] 화면에 있는 모든 셀의 데이터를 data-key 기준으로 일단 모두 읽어옵니다.
            const currentData = {};
            row.querySelectorAll('td[data-key]').forEach(cell => {
                const key = cell.dataset.key;
                currentData[key] = cell.textContent.trim();
            });
            
            const baseItem = originalItem ? { ...originalItem } : { products: {}, is_custom_row: true };

            // 먼저 화면에서 읽은 모든 데이터(커스텀 열 포함)를 병합합니다.
            const newItem = {
                ...baseItem,
                ...currentData 
            };

            // 그 다음, 숫자여야 하는 기본 필드들의 타입을 변환해줍니다.
            newItem.quantity = parseFloat(String(currentData.qty || '').replace(/,/g, '')) || baseItem.quantity || 0;
            newItem.unit_price = parseFloat(String(currentData.price_krw || '').replace(/,/g, '')) || baseItem.unit_price || 0;
            newItem.additional_cost = parseFloat(String(currentData.custom_additional_cost || '').replace(/,/g, '')) || baseItem.additional_cost || 0;
            newItem.unit_price_usd = parseFloat(String(currentData.price_usd || '').replace(/,/g, '')) || baseItem.unit_price_usd || 0;
            
            // 상품명과 같이 특별히 처리해야 하는 필드를 업데이트합니다.
            newItem.product_name = currentData.desc || baseItem.product_name;
            if (!newItem.products) newItem.products = {};
            newItem.products.name_en = currentData.desc || baseItem.products?.name_en;
            newItem.products.hs_code = currentData.hs_code || baseItem.products?.hs_code;
            newItem.products.barcode = currentData.barcode || baseItem.products?.barcode;

            newItems.push(newItem);
        });
    }
    this.documentData.items = newItems;

    // 2. 테이블 외 다른 모든 수정 가능 콘텐츠 캡처 (기존과 동일)
    docView.querySelectorAll('[data-content-key]').forEach(el => {
        const key = el.dataset.contentKey;
        this.documentData.customContent[key] = el.innerHTML;
    });

    // 3. '필드 추가'로 생성된 커스텀 필드 캡처 (기존과 동일)
    const customFields = [];
    docView.querySelectorAll('.custom-field-row').forEach(row => {
        customFields.push({
            title: row.querySelector('strong')?.innerHTML,
            value: row.querySelector('div')?.innerHTML
        });
    });
    this.documentData.customContent.custom_fields = customFields;

    console.log('DocumentData Updated with Custom Column Values:', this.documentData);
},

     async handlePageClick(e) {
    const button = e.target.closest('button');
    if (!button) return;

    const action = button.dataset.action;
    const id = button.dataset.id;

    if (action) { e.preventDefault(); e.stopPropagation(); }

    switch(action) {
        case 'create-document':
            this.currentColumnConfig = null; 
            await this.loadDocumentOrOptions(id); 
            break;
        case 'generate-document': 
            this.renderDocumentView(); 
            break;
        case 'save-document': 
            // 저장 직전에 현재 화면의 모든 내용을 다시 한번 캡처합니다.
            this.updateDocumentDataFromView();
            await this.saveDocument(); 
            break;            
        
        // [최종 수정] '옵션 재설정' 로직
        case 'regenerate':

        case 'back-to-list': 
            // [핵심 수정] 목록으로 돌아갈 때, 현재 작업중인 문서의 모든 상태를 깨끗하게 초기화합니다.
            // 이렇게 해야 다음 문서 작업 시 이전 데이터의 영향을 받는 것을 완벽하게 방지할 수 있습니다.
            this.documentData = {};
            this.currentColumnConfig = null;
            this.renderOptions = {};
            
            this.switchToView('list'); 
            break;
            
        case 'back-to-options':
            const isRegenerate = action === 'regenerate';
            const confirmMsg = '현재 문서 내용을 유지한 채, 표시 옵션만 재설정하시겠습니까?';
            
            if (!isRegenerate || confirm(confirmMsg)) {
                // 1. 문서 보기 화면의 모든 수정 내용(필드, 테이블 등)을 캡처하여 documentData에 저장
                this.updateDocumentDataFromView(); 
                
                if (isRegenerate) {
                    this.currentColumnConfig = null;
                }

                // 2. 옵션 화면의 HTML 구조를 다시 그림
                this.views.options.innerHTML = this.getOptionsHtml();
                
                // 3. 저장해둔 열 구성(currentColumnConfig)을 사용해 "열 추가" 항목까지 완벽히 복원
                this.populateDefaultColumns();
                this.initDragAndDrop();
                
                // 4. 완성된 옵션 화면으로 전환
                this.switchToView('options');
            }
            break;
        
        case 'back-to-list': 
            this.switchToView('list'); 
            break;
        
        // ... 이하 나머지 case 들은 기존 코드와 동일 ...
        case 'print': {
            const printArea = document.getElementById('print-area');
            if (!printArea) {
                alert('인쇄할 영역을 찾을 수 없습니다.');
                return;
            }
            document.body.classList.add('is-printing');
            const table = printArea.querySelector('table');
            const styleTagId = 'landscape-print-style';
            let styleTag = document.getElementById(styleTagId);
            const portraitWidthThreshold = 750;

            if (table && table.scrollWidth > portraitWidthThreshold) {
                if (!styleTag) {
                    styleTag = document.createElement('style');
                    styleTag.id = styleTagId;
                    styleTag.innerHTML = '@page { size: A4 landscape; }';
                    document.head.appendChild(styleTag);
                }
            }
            window.print();
            setTimeout(() => {
                document.body.classList.remove('is-printing');
                const tagToRemove = document.getElementById(styleTagId);
                if (tagToRemove) tagToRemove.remove();
            }, 500);
            break;
        }
        case 'export-excel': this.exportToExcel(); break;
        case 'add-column': this.addColumn(); break;
        case 'remove-column': button.closest('li').remove(); break;
        case 'add-item-row': this.addItemRow(); break;
        case 'remove-item-row': button.closest('tr').remove(); this.recalculateDocumentTotals(); break;
        case 'add-custom-field': this.addCustomField(); break;
        case 'remove-custom-field': button.closest('.custom-field-row').remove(); break;
        case 'delete-selected': await this.deleteSelectedOrders(); break;
    }
},

    async fetchOrders() {
        const listEl = this.views.list.querySelector('.order-list-tbody');
        listEl.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-slate-500">주문 목록을 불러오는 중...</td></tr>`;

        const searchInput = $(`#${this.docType}-search-input`);
        const searchTerm = searchInput ? searchInput.value.trim() : '';

        try {
            let selectStatement = 'id, order_number, order_date, status, customers(name)';
            if (searchTerm) selectStatement = 'id, order_number, order_date, status, customers!inner(name)';
            
            let query = supabase.from('orders').select(selectStatement);
            if (searchTerm) query = query.ilike('customers.name', `%${searchTerm}%`);
            
            const { data, error } = await query.order('order_date', { ascending: false });
            if (error) throw error;
            this.renderOrderList(data);
        } catch (e) {
            listEl.innerHTML = `<tr><td colspan="6" class="p-4 text-center text-red-500">목록 로딩 실패: ${e.message}</td></tr>`;
        }
    },
    
    renderOrderList(orders) {
        const listEl = this.views.list.querySelector('.order-list-tbody');
        if (orders.length === 0) {
            listEl.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-secondary">일치하는 주문이 없습니다.</td></tr>`;
            return;
        }
        listEl.innerHTML = orders.map(o => `
            <tr class="hover:bg-gray-50">
                <td class="p-4 font-medium text-gray-900">${o.order_number || '-'}</td>
                <td class="p-4 text-secondary">${o.customers?.name || 'N/A'}</td>
                <td class="p-4 text-secondary">${o.order_date}</td>
                <td class="p-4 text-center">
                    <button data-action="create-document" data-id="${o.id}" class="bg-primary text-white font-semibold text-sm py-2 px-4 rounded-lg hover:bg-primary-dark">문서 생성/보기</button>
                </td>
            </tr>`).join('');
    },

    updateDeleteButtonVisibility() {
        const deleteBtn = this.views.list.querySelector('.delete-selected-btn');
        if (!deleteBtn) return;
        const selectedCount = this.views.list.querySelectorAll('.order-checkbox:checked').length;
        deleteBtn.classList.toggle('hidden', selectedCount === 0);
    },

    async deleteSelectedOrders() {
        const selectedIds = Array.from(this.views.list.querySelectorAll('.order-checkbox:checked'))
            .map(cb => cb.dataset.id);

        if (selectedIds.length === 0) {
            alert('삭제할 주문을 선택해주세요.');
            return;
        }
        if (!confirm(`${selectedIds.length}개의 주문을 정말로 삭제하시겠습니까?\n연관된 주문 아이템들도 함께 삭제됩니다.`)) {
            return;
        }

        try {
            await supabase.from('order_items').delete().in('order_id', selectedIds);
            await supabase.from('orders').delete().in('order_id', selectedIds);
            alert(`${selectedIds.length}개의 주문이 성공적으로 삭제되었습니다.`);
            this.fetchOrders();

        } catch (error) {
            alert(`삭제 중 오류가 발생했습니다: ${error.message}`);
        }
    },

    async loadDocumentOrOptions(orderId) {
    try {
        const [settingsRes, orderRes, itemsRes] = await Promise.all([
            supabase.from('company_settings').select('*').eq('id', 1).single(),
            supabase.from('orders').select('*, customers(*), saved_invoice_html, saved_packinglist_html').eq('id', orderId).single(),
            supabase.from('order_items').select('*, products(*), unit_price_usd').eq('order_id', orderId)
        ]);

        if (orderRes.error || itemsRes.error) throw orderRes.error || itemsRes.error;
        
        this.documentData = { 
            settings: settingsRes.data || {}, 
            order: orderRes.data, 
            items: itemsRes.data 
        };

        const savedHtmlColumn = `saved_${this.docType}_html`;
        const savedHtml = this.documentData.order[savedHtmlColumn];

        if (savedHtml) {
            // 1. 상태 복원은 그대로 유지합니다. 
            // 이는 사용자가 '옵션 재설정'을 눌렀을 때 현재 화면의 데이터를 캡처하기 위해 필요합니다.
            this.reconstructStateFromSavedHtml(savedHtml);

            // 2. [핵심 변경] 문서를 재 렌더링하는 대신, 저장된 HTML을 컨트롤 버튼으로 감싸서 바로 보여줍니다.
            // getDocumentHtml() 호출을 제거하여 잘못된 상태에 기반한 재 렌더링을 방지합니다.
            const fullHtml = this.getControlWrappedHtml(savedHtml, true); // isSaved = true
            this.views.doc.innerHTML = fullHtml;
            this.switchToView('doc');

            // 3. [핵심 변경] 저장된 문서를 보여줄 때는 이벤트 리스너나 합계 재계산이 필요 없습니다.
            // 사용자가 편집을 시작하면 (예: '옵션 재설정' 후) 그때 다시 계산됩니다.
            // this.addDocumentEventListeners();
            // this.recalculateDocumentTotals();
        } else {
            // 신규 생성 시에는 기존 로직과 동일합니다.
            this.currentColumnConfig = null;
            this.switchToView('options');
            this.views.options.innerHTML = this.getOptionsHtml();
            this.populateDefaultColumns();
            this.initDragAndDrop();
        }
    } catch (e) {
        console.error("데이터 로딩 중 심각한 오류 발생:", e);
        alert(`데이터 로딩 실패: ${e.message}`);
    }
},

reconstructStateFromSavedHtml(savedHtml) {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = savedHtml;

    // 1. 열 구성(currentColumnConfig) 복원
    const headers = Array.from(tempDiv.querySelectorAll('.doc-table thead th'));
    const defaultColumns = this.getDefaultColumns();
    this.currentColumnConfig = headers.map(th => {
        const name = th.textContent.trim();
        const defaultConfig = defaultColumns.find(col => col.name === name);
        return {
            key: defaultConfig ? defaultConfig.key : `custom_${name.toLowerCase().replace(/\s+/g, '_')}`,
            name: name,
            checked: true,
            isCustom: !defaultConfig
        };
    });

    // 2. documentData.items 복원 (테이블 내용)
    const newItems = [];
    const itemRows = tempDiv.querySelectorAll('.items-table-body .item-row');
    
    itemRows.forEach((row, rowIndex) => {
        const originalItem = this.documentData.items[rowIndex] || { products: {} };
        const newItemData = { ...originalItem, products: { ...(originalItem.products || {}) } }; // 깊은 복사
        
        const cells = row.querySelectorAll('td');
        this.currentColumnConfig.forEach((columnConfig, cellIndex) => {
            const cell = cells[cellIndex];
            if (!cell) return;

            const value = cell.textContent.trim();
            const key = columnConfig.key;

            // 열(key)에 따라 데이터를 정확한 속성에 할당합니다.
            switch(key) {
                case 'desc':
                    newItemData.product_name = value;
                    if(newItemData.products) newItemData.products.name_en = value;
                    break;
                case 'qty':
                    newItemData.quantity = parseFloat(value.replace(/,/g, '')) || 0;
                    break;
                case 'price_krw':
                    newItemData.unit_price = parseFloat(value.replace(/,/g, '')) || 0;
                    break;
                case 'price_usd':
                    newItemData.unit_price_usd = parseFloat(value.replace(/,/g, '')) || 0;
                    break;
                case 'custom_additional_cost':
                    newItemData.additional_cost = parseFloat(value.replace(/,/g, '')) || 0;
                    break;
                case 'hs_code':
                    if(newItemData.products) newItemData.products.hs_code = value;
                    break;
                case 'barcode':
                    if(newItemData.products) newItemData.products.barcode = value;
                    break;
                // packinglist 또는 기타 다른 키들도 여기에 추가할 수 있습니다.
            }
        });
        newItems.push(newItemData);
    });
    this.documentData.items = newItems;

    // 3. documentData.customContent 복원 (필드 추가 및 기타 내용)
    this.documentData.customContent = {};
    tempDiv.querySelectorAll('[data-content-key]').forEach(el => {
        const key = el.dataset.contentKey;
        this.documentData.customContent[key] = el.innerHTML;
    });

    const customFields = [];
    tempDiv.querySelectorAll('.custom-field-row').forEach(row => {
        customFields.push({
            title: row.querySelector('strong')?.innerHTML,
            value: row.querySelector('div')?.innerHTML
        });
    });
    this.documentData.customContent.custom_fields = customFields;

    console.log("State reconstructed from saved HTML (v2):", {
        config: this.currentColumnConfig,
        items: this.documentData.items
    });
},

/**
 * 기본 열 목록을 반환하는 헬퍼 함수입니다. (reconstructStateFromSavedHtml에서 사용)
 */
getDefaultColumns() {
    if (this.docType === 'packinglist') {
        return [
            { key: 'no', name: 'No.' }, { key: 'desc', name: 'Description' }, 
            { key: 'outbox_qty', name: 'Outbox Qty' }, { key: 'qty', name: 'Order Qty' }, 
            { key: 'box_qty', name: 'Box Qty' }, { key: 'gross_weight', name: 'Gross Weight' }, 
            { key: 'total_gross_weight', name: 'Total G.W.' }, { key: 'cbm', name: 'CBM' }, 
            { key: 'total_cbm', name: 'Total CBM' }
        ];
    }
    const costLabel = this.documentData?.order?.additional_cost_label || '추가 비용';
    return [
        { key: 'no', name: 'No.' }, { key: 'desc', name: 'Description' }, 
        { key: 'hs_code', name: 'HS CODE' }, { key: 'barcode', name: 'Barcode' }, 
        { key: 'qty', name: 'Quantity' }, { key: 'price_krw', name: 'Unit Price (KRW)' }, 
        { key: 'custom_additional_cost', name: costLabel }, { key: 'amount_krw', name: 'Amount (KRW)' }, 
        { key: 'price_usd', name: 'Unit Price (USD)' }, { key: 'amount_usd', name: 'Amount (USD)' }
    ];
},

    getOptionsHtml() {
        const { order, settings } = this.documentData;
        const stampChecked = this.docType === 'invoice' ? 'checked' : '';
                
        // 메인 옵션 UI
        return `
            <div class="bg-white p-8 rounded-xl shadow-md">               
                <header class="mb-8">
                    <h3 class="text-2xl font-bold text-gray-800">문서 옵션 설정</h3>
                    <p class="text-secondary mt-1">주문 #${order.order_number || order.id}에 대한 문서를 생성합니다.</p>
                </header>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    
                    <div>
                        <div class="flex justify-between items-center mb-2">
                            <h4 class="font-bold text-gray-800">표시할 항목 (드래그하여 순서 변경)</h4>
                            <button data-action="add-column" class="bg-white border border-border text-secondary font-semibold text-xs py-1 px-3 rounded-md hover:bg-light">+ 열 추가</button>
                        </div>
                        <ul id="column-list-${this.docType}" class="space-y-2 border border-border p-3 rounded-md bg-light min-h-[300px]"></ul>
                    </div>
                    
                    <div class="space-y-6">
                        <div>
                            <h4 class="font-bold mb-3 text-gray-800">은행 정보 선택</h4>
                            <div class="space-y-2">
                                <label class="flex items-center"><input type="radio" name="bank" value="bank1" class="h-4 w-4 text-primary focus:ring-primary border-gray-300" checked> <span class="ml-2 text-secondary">${settings.bank1_name || 'Bank 1'}</span></label>
                                <label class="flex items-center"><input type="radio" name="bank" value="bank2" class="h-4 w-4 text-primary focus:ring-primary border-gray-300"> <span class="ml-2 text-secondary">${settings.bank2_name || 'Bank 2'}</span></label>
                                <label class="flex items-center"><input type="radio" name="bank" value="none" class="h-4 w-4 text-primary focus:ring-primary border-gray-300"> <span class="ml-2 text-secondary">표시 안함</span></label>
                            </div>
                        </div>
                        <div class="border-t border-border"></div>
                        <div>
                            <h4 class="font-bold mb-3 text-gray-800">통화 및 환율</h4>
                            <div class="space-y-2">
                                <label class="flex items-center"><input type="radio" name="currency" value="krw_only" class="h-4 w-4 text-primary focus:ring-primary border-gray-300"> <span class="ml-2 text-secondary">KRW Only</span></label>
                                <label class="flex items-center"><input type="radio" name="currency" value="usd_only" class="h-4 w-4 text-primary focus:ring-primary border-gray-300"> <span class="ml-2 text-secondary">USD Only</span></label>
                                <label class="flex items-center"><input type="radio" name="currency" value="both" class="h-4 w-4 text-primary focus:ring-primary border-gray-300" checked> <span class="ml-2 text-secondary">KRW & USD</span></label>
                            </div>
                            <div class="mt-4">
                                <label for="doc-exchange-rate" class="label">환율 (KRW/USD)</label>
                                <input type="text" id="doc-exchange-rate" class="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary mt-1" value="${order.exchange_rate || ''}" placeholder="예: 1350.50">
                            </div>
                        </div>
                        <div class="border-t border-border"></div>
                         <div>
                            <h4 class="font-bold mb-3 text-gray-800">기타 옵션</h4>
                            <div class="space-y-2">
                                <label class="flex items-center"><input type="checkbox" id="show-stamp" class="h-4 w-4 text-primary focus:ring-primary rounded border-gray-300" ${stampChecked}> <span class="ml-2 text-secondary">회사 직인 표시</span></label>
                                <label class="flex items-center"><input type="checkbox" id="show-exchange-rate" class="h-4 w-4 text-primary focus:ring-primary rounded border-gray-300" checked> <span class="ml-2 text-secondary">환율 정보 표시</span></label>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="mt-8 pt-6 border-t border-border flex justify-between items-center">
                    <button data-action="back-to-list" class="bg-white border border-border text-secondary font-semibold py-2 px-4 rounded-lg hover:bg-gray-50">주문 목록으로</button>
                    <button data-action="generate-document" class="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark">문서 생성하기</button>
                </div>
            </div>`;
    },    

    populateDefaultColumns() {
    const columnList = this.views.options.querySelector(`#column-list-${this.docType}`);
    let columnsToRender = [];

    // 저장된 열 구성(currentColumnConfig)이 있으면 무조건 그것을 사용합니다.
    if (this.currentColumnConfig && this.currentColumnConfig.length > 0) {
        columnsToRender = this.currentColumnConfig;
    } 
    // 저장된 구성이 없으면 (문서 최초 생성 시) 기본값을 사용합니다.
    else {
        if (this.docType === 'packinglist') {
            columnsToRender = [
                { key: 'no', name: 'No.', checked: true }, { key: 'desc', name: 'Description', checked: true }, 
                { key: 'outbox_qty', name: 'Outbox Qty', checked: true }, { key: 'qty', name: 'Order Qty', checked: true }, 
                { key: 'box_qty', name: 'Box Qty', checked: true }, { key: 'gross_weight', name: 'Gross Weight', checked: true }, 
                { key: 'total_gross_weight', name: 'Total G.W.', checked: true }, { key: 'cbm', name: 'CBM', checked: true }, 
                { key: 'total_cbm', name: 'Total CBM', checked: true }
            ];
        } else {
            const costLabel = this.documentData.order.additional_cost_label || '추가 비용';
            columnsToRender = [
                { key: 'no', name: 'No.', checked: true }, { key: 'desc', name: 'Description', checked: true }, 
                { key: 'hs_code', name: 'HS CODE', checked: false }, { key: 'barcode', name: 'Barcode', checked: true }, 
                { key: 'qty', name: 'Quantity', checked: true }, { key: 'price_krw', name: 'Unit Price (KRW)', checked: true }, 
                { key: 'custom_additional_cost', name: costLabel, checked: true }, { key: 'amount_krw', name: 'Amount (KRW)', checked: true }, 
                { key: 'price_usd', name: 'Unit Price (USD)', checked: true }, { key: 'amount_usd', name: 'Amount (USD)', checked: true }
            ];
        }
    }
    // isCustom 플래그를 정확히 전달하여 렌더링합니다.
    columnList.innerHTML = columnsToRender.map(col => this.createColumnLi(col.key, col.name, col.checked, col.isCustom)).join('');
},

    createColumnLi(key, name, checked, isCustom = false) {
        const nameInput = isCustom ? `<input type="text" class="input custom-col-name p-1 h-7 flex-grow" value="${name}">` : `<span class="ml-2 flex-grow">${name}</span>`;
        return `<li draggable="true" data-key="${key}" class="flex items-center p-2 bg-white rounded cursor-move border"><svg class="h-5 w-5 mr-2 text-slate-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" /></svg><input type="checkbox" name="col" value="${key}" class="h-4 w-4 rounded flex-shrink-0" ${checked ? 'checked' : ''}>${nameInput}<button data-action="remove-column" class="text-red-500 ml-2 font-bold text-lg no-print flex-shrink-0">&times;</button></li>`;
    },

    addColumn() {
        const newColName = prompt("새로운 열의 이름을 입력하세요:");
        if (newColName && newColName.trim() !== '') {
            const columnList = this.views.options.querySelector(`#column-list-${this.docType}`);
            const newColKey = `custom_${newColName.trim().toLowerCase().replace(/\s+/g, '_')}`;
            columnList.insertAdjacentHTML('beforeend', this.createColumnLi(newColKey, newColName.trim(), true, true));
        }
    },

    initDragAndDrop() {
        const columnList = this.views.options.querySelector(`#column-list-${this.docType}`);
        let draggingElement = null;
        columnList.addEventListener('dragstart', e => { if (e.target.tagName === 'LI') { draggingElement = e.target; setTimeout(() => e.target.classList.add('dragging'), 0); } });
        columnList.addEventListener('dragend', () => { if (draggingElement) draggingElement.classList.remove('dragging'); draggingElement = null; });
        columnList.addEventListener('dragover', e => {
            e.preventDefault(); if (!draggingElement) return;
            const afterElement = [...columnList.querySelectorAll('li:not(.dragging)')].reduce((closest, child) => {
                const box = child.getBoundingClientRect(); const offset = e.clientY - box.top - box.height / 2;
                return (offset < 0 && offset > closest.offset) ? { offset, element: child } : closest;
            }, { offset: Number.NEGATIVE_INFINITY }).element;
            if (afterElement == null) columnList.appendChild(draggingElement);
            else columnList.insertBefore(draggingElement, afterElement);
        });
    },

    renderDocumentView() {
    const optionsView = this.views.options;

    // 1. 현재 옵션 화면의 "열 구성"을 완벽하게 캡처하여 저장합니다. (가장 중요한 부분)
    this.currentColumnConfig = Array.from(optionsView.querySelectorAll('#column-list-' + this.docType + ' li'))
        .map(li => ({
            key: li.dataset.key,
            name: li.querySelector('.custom-col-name')?.value || li.querySelector('span').textContent,
            checked: li.querySelector('input[name="col"]').checked,
            isCustom: !!li.querySelector('.custom-col-name')
        }));
    
    // 2. 캡처된 열 구성과 기타 옵션을 바탕으로 렌더링 옵션을 설정합니다.
    this.renderOptions = {
        columns: this.currentColumnConfig.filter(c => c.checked)
            .map(c => ({ 
                ...c, 
                align: ['no', 'qty', 'box_qty'].includes(c.key) ? 'text-center' : (c.key.includes('price') || c.key.includes('amount') || c.key.includes('weight') || c.key.includes('cbm') ? 'text-right' : 'text-left') 
            })),
        currency: optionsView.querySelector('input[name="currency"]:checked').value,
        exchangeRate: parseFloat(optionsView.querySelector('#doc-exchange-rate').value) || 0,
        bank: optionsView.querySelector('input[name="bank"]:checked').value,
        showStamp: optionsView.querySelector('#show-stamp').checked,
        showExchangeRate: optionsView.querySelector('#show-exchange-rate').checked
    };

    if ((this.renderOptions.currency !== 'krw_only' || this.renderOptions.columns.some(c => c.key.includes('usd'))) && this.renderOptions.exchangeRate <= 0) {
        alert('USD 표시를 위해 유효한 환율을 입력해주세요.');
        return;
    }

    // 3. 문서 HTML을 생성하고 화면에 표시합니다.
    const docHtml = this.getDocumentHtml();
    const fullHtml = this.getControlWrappedHtml(docHtml, false);
    this.views.doc.innerHTML = fullHtml;
    this.switchToView('doc');

    this.addDocumentEventListeners(); 
    this.recalculateDocumentTotals();
},

    getDocumentHtml() {
    const { settings, order, items, customContent = {} } = this.documentData;
    const { columns, currency, exchangeRate, bank, showStamp, showExchangeRate } = this.renderOptions;
    const localeOptions = { minimumFractionDigits: 3, maximumFractionDigits: 3 };
    
    let docTitle, titleStyle, titleClass;
    switch(this.docType) {        
        case 'invoice': 
            docTitle = 'COMMERCIAL INVOICE'; 
            titleClass = 'text-red-600 print-text-invoice';
            titleStyle = `color: #DC2626 !important;`;
            break;
        case 'packinglist': 
            docTitle = 'PACKING LIST'; 
            titleClass = 'text-green-600 print-text-packinglist';
            titleStyle = `color: #16A34A !important;`;
            break;
    }

    const tableHeadHtml = `<tr>${columns.map(c => `<th class="p-2 border bg-gray-50 font-semibold text-gray-700 ${c.align}">${c.name}</th>`).join('')}</tr>`;

    const itemsHtml = items.map((item, index) => {
        let rowHtml = `<tr class="item-row" data-index="${index}">`;
        columns.forEach(col => {
            let cellContent = '';
            const finalUnitPriceKrw = (item.unit_price || 0) + (item.additional_cost || 0);
            const amountKRW = finalUnitPriceKrw * (item.quantity || 0);

            switch(col.key) {
                case 'no': cellContent = index + 1; break;
                case 'desc': cellContent = item.product_name || item.products?.name_en || item.products?.name_kr; break;
                case 'qty': cellContent = (item.quantity || '').toLocaleString(); break;
                case 'price_krw': cellContent = (item.unit_price || 0).toLocaleString(); break;
                case 'amount_krw': cellContent = Math.round(amountKRW).toLocaleString(); break;
                case 'custom_additional_cost': cellContent = (item.additional_cost || 0).toLocaleString(); break;
                case 'hs_code': cellContent = item.products?.hs_code || ''; break;
                case 'barcode': cellContent = item.products?.barcode || ''; break;
                case 'price_usd': {
                    let priceUsd = (item.unit_price_usd && item.unit_price_usd > 0) ? item.unit_price_usd : (exchangeRate > 0 ? (item.unit_price || 0) / exchangeRate : 0);
                    cellContent = priceUsd.toLocaleString(undefined, localeOptions); 
                    break;
                }
                case 'amount_usd': {
                    let unitPriceForAmountUsd = (item.unit_price_usd && item.unit_price_usd > 0) ? item.unit_price_usd : (exchangeRate > 0 ? (item.unit_price || 0) / exchangeRate : 0);
                    const additionalCostUsd = (item.additional_cost && exchangeRate > 0) ? item.additional_cost / exchangeRate : 0;
                    const amountUsd = (item.quantity || 0) * (unitPriceForAmountUsd + additionalCostUsd);
                    cellContent = amountUsd.toLocaleString(undefined, localeOptions);
                    break;
                }
                case 'outbox_qty': cellContent = (item.products?.outbox_quantity || '').toLocaleString(); break;
                case 'box_qty': {
                    const boxQty = item.products?.outbox_quantity > 0 ? Math.ceil((item.quantity || 0) / item.products.outbox_quantity) : 0;
                    cellContent = boxQty.toLocaleString(); 
                    break;
                }
                case 'gross_weight': cellContent = (item.products?.gross_weight || 0).toFixed(2); break;
                case 'total_gross_weight': {
                    const gw_boxQty = item.products?.outbox_quantity > 0 ? Math.ceil((item.quantity || 0) / item.products.outbox_quantity) : 0;
                    cellContent = (gw_boxQty * (item.products?.gross_weight || 0)).toFixed(2); 
                    break;
                }
                case 'cbm': cellContent = (item.products?.cbm || 0).toFixed(3); break;
                case 'total_cbm': {
                    const cbm_boxQty = item.products?.outbox_quantity > 0 ? Math.ceil((item.quantity || 0) / item.products.outbox_quantity) : 0;
                    cellContent = (cbm_boxQty * (item.products?.cbm || 0)).toFixed(3); 
                    break;
                }
                // [핵심 수정] default 케이스
                default:
                    // 1순위: item 객체에 'custom_warehouse'와 같이 전체 키로 저장된 값이 있는지 확인합니다.
                    // 2순위: 없다면 하위 호환성을 위해 다른 곳에서 값을 찾아봅니다.
                    cellContent = item[col.key] ?? 
                                  (item.products?.[col.key.replace('custom_', '')] ?? 
                                  (item[col.key.replace('custom_', '')] || ''));
            }

            rowHtml += `<td class="p-2 border ${col.align}" data-key="${col.key}" contenteditable="true">${cellContent}</td>`;
        });
        rowHtml += `<td class="p-2 border text-center no-print"><button data-action="remove-item-row" class="text-red-500">&times;</button></td>`;
        return rowHtml + '</tr>';
    }).join('');
    
    // ... 이하 나머지 코드는 기존과 동일합니다 ...
    const bankInfoHtml = this.getBankInfoHtml(bank, settings);
    const stampHtml = showStamp && settings.company_stamp_url ? `<div><img src="${settings.company_stamp_url}" alt="Company Stamp" class="object-contain" style="width: 6.9cm; height: 3.1cm;"></div>` : '';
    const exchangeRateHtml = showExchangeRate && exchangeRate > 0 ? `<div class="flex"><strong class="w-32 flex-shrink-0">Exchange rate:</strong><div data-content-key="exchange_rate_info" contenteditable="true">${customContent?.exchange_rate_info || `1 USD = ${exchangeRate.toLocaleString()} KRW`}</div></div>` : '';

    const customFieldsHtml = (customContent?.custom_fields || []).map(field => 
        `<div class="flex mb-2 items-center custom-field-row">
            <strong class="w-32 flex-shrink-0" contenteditable="true">${field.title}</strong>
            <div class="p-1 flex-grow" contenteditable="true">${field.value}</div>
            <button data-action="remove-custom-field" class="no-print text-red-500 ml-2">&times;</button>
        </div>`
    ).join('');

    return `
        <header class="flex justify-between items-start pb-4 mb-8 border-b-4 border-gray-200">
            <div>
                <h2 class="text-2xl font-bold text-gray-800" data-content-key="company_name" contenteditable="true">${customContent?.company_name || settings.company_name || 'Your Company Name'}</h2>
                <p class="text-secondary" data-content-key="company_address" contenteditable="true">${customContent?.company_address || settings.address || 'Your Address'}</p>
                <p class="text-secondary" data-content-key="company_contact" contenteditable="true">${customContent?.company_contact || `Tel: ${settings.phone_number || ''} / Email: ${settings.company_email || ''}`}</p>
            </div>
            <div class="text-right">
                <h1 class="text-4xl font-bold ${titleClass}" style="${titleStyle}">${docTitle}</h1>
                <div class="mt-2 text-gray-600">
                    <p><span class="font-bold">No.:</span> <span data-content-key="doc_no" contenteditable="true">${customContent?.doc_no || order.order_number || `DOC-${order.id}`}</span></p>
                    <p><span class="font-bold">Date:</span> <span data-content-key="doc_date" contenteditable="true">${customContent?.doc_date || order.order_date}</span></p>
                </div>
            </div>
        </header>

        <div class="grid grid-cols-2 gap-8 mb-8">
            <div class="border p-4 rounded-lg bg-light print-bg" style="background-color: #F9FAFB !important;">
                <h3 class="font-bold mb-2 text-gray-600">TO:</h3>
                <div data-content-key="to_block" contenteditable="true" class="space-y-1 text-secondary">
                    ${customContent?.to_block || `<p><strong>${order.customers.name || ''}</strong></p><p>${order.customers.address || ''}</p><p>ATTN: ${order.customers.contact_person || ''}</p><p>Email: ${order.customers.email || ''}</p>`}
                </div>
            </div>
            ${bankInfoHtml}
        </div>
        
        <div class="overflow-x-auto">
            <table class="w-full text-left mb-8 border-collapse doc-table min-w-[800px]">
                <thead class="bg-gray-50">${tableHeadHtml}</thead>
                <tbody class="items-table-body">${itemsHtml}</tbody>
                <tfoot class="bg-gray-50 font-bold" id="doc-table-foot"></tfoot>
            </table>
        </div>
        <div class="flex justify-end mb-8">
            <div id="doc-totals" class="w-1/2 rounded-lg overflow-hidden border"></div>
        </div>
        <div class="mt-8 mb-8 space-y-2 w-full md:w-2/3 text-gray-700">
            <div class="flex"><strong class="w-32 flex-shrink-0">Port of Loading:</strong><div data-content-key="port_of_loading" contenteditable="true" data-placeholder="선적항을 입력하세요">${customContent?.port_of_loading || ''}</div></div>
            <div class="flex"><strong class="w-32 flex-shrink-0">Final Destination:</strong><div data-content-key="final_destination" contenteditable="true">${customContent?.final_destination || order.customers.country || ''}</div></div>      
            <div class="flex"><strong class="w-32 flex-shrink-0">Carrier:</strong><div data-content-key="carrier" contenteditable="true" data-placeholder="운송사를 입력하세요">${customContent?.carrier || ''}</div></div>
            <div class="flex"><strong class="w-32 flex-shrink-0">Payment Term:</strong><div data-content-key="payment_term" contenteditable="true">${customContent?.payment_term || 'T/T in Advance'}</div></div>
            <div class="flex"><strong class="w-32 flex-shrink-0">Delivery Term:</strong><div data-content-key="delivery_term" contenteditable="true">${customContent?.delivery_term || 'FOB.'}</div></div>
            ${exchangeRateHtml}
        </div>
        <div id="additional-fields-container" class="w-2/3">${customFieldsHtml}</div>
        <div class="no-print mt-4 space-x-2">
            <button data-action="add-custom-field" class="btn-secondary text-xs py-1 px-2">+ 필드 추가</button>
            <button data-action="add-item-row" class="btn-secondary text-xs py-1 px-2">+ 빈 행 추가</button>
        </div>
        <div class="mt-24 flex justify-end items-end h-32">
            <div class="text-right mr-4">
                <p class="font-bold text-lg" data-content-key="signature_name" contenteditable="true">${customContent?.signature_name || settings.company_name || 'Your Company Name'}</p>
                <p class="text-sm text-secondary">(Signature)</p>
            </div>
            ${stampHtml}
        </div>
    `;
},

    getBankInfoHtml(bankChoice, settings) {
    if (bankChoice === 'none') return '';
    const prefix = bankChoice;
    // 최종 수정: 화면용/인쇄용 클래스와 인라인 스타일을 모두 포함합니다.
    return `<div class="border p-4 rounded-lg bg-slate-50 print-bg" style="background-color: #F9FAFB !important;"><h3 class="font-bold mb-2 text-slate-600">BANK INFORMATION:</h3><div contenteditable="true"><p><strong>BENEFICIARY:</strong> ${settings.company_name || ''}</p><p><strong>BANK NAME:</strong> ${settings[prefix + '_name'] || ''}</p><p><strong>BANK ADDRESS:</strong> ${settings[prefix + '_address'] || ''}</p><p><strong>ACCOUNT NO.:</strong> ${settings[prefix + '_account'] || ''}</p><p><strong>SWIFT CODE:</strong> ${settings[prefix + '_swift'] || ''}</p></div></div>`;
},

    getSavedDocumentViewHtml(savedHtml) {
        return this.getControlWrappedHtml(savedHtml, true);
    },

    getControlWrappedHtml(docHtml, isSaved = false) {
        const mainButtons = [
            { action: 'export-excel', text: '엑셀로 내보내기', className: 'bg-white border border-border text-secondary font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm' },
            { action: 'print', text: '인쇄 (PDF 저장)', className: 'bg-white border border-border text-secondary font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm' },
            { action: 'save-document', text: '문서 저장', className: 'bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark text-sm' }
        ];

        const backButton = isSaved 
            ? { action: 'regenerate', text: '옵션 재설정', className: 'bg-white border border-border text-secondary font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm' }
            : { action: 'back-to-options', text: '옵션 재설정', className: 'bg-white border border-border text-secondary font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm' };
        
        const allButtons = [backButton, ...mainButtons];
        const buttonsHtml = allButtons.map(btn => 
            `<button type="button" data-action="${btn.action}" class="${btn.className}">${btn.text}</button>`
        ).join('');

        return `
            <div class="no-print mb-6 flex justify-between items-center">
                <button type="button" data-action="back-to-list" class="bg-white border border-border text-secondary font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm">&larr; 주문 목록으로</button>
                <div class="space-x-2">
                    ${buttonsHtml}
                </div>
            </div>
            <div id="print-area" class="bg-white p-8 md:p-12 shadow-lg text-sm document-container">
                ${docHtml}
            </div>
        `;
    },
    
    addDocumentEventListeners() {
        // 이 함수는 이제 문서 내부의 'input' 이벤트만 담당합니다.
        // 버튼 클릭은 init에서 설정한 handlePageClick이 모두 처리합니다.
        const docView = this.views.doc;
        if (docView && !docView.dataset.listenersAttached) {
            docView.addEventListener('input', (e) => {
                if (e.target.closest('.items-table-body')) {
                    this.recalculateDocumentTotals();
                }
            });
            docView.dataset.listenersAttached = 'true';
        }
    },

    recalculateDocumentTotals() {
    const { currency } = this.renderOptions;
    const itemsTableBody = this.views.doc.querySelector('.items-table-body');
    const tfoot = this.views.doc.querySelector('#doc-table-foot');
    const totalsEl = this.views.doc.querySelector('#doc-totals');
    if (!itemsTableBody || !totalsEl) return;
    
    let totalAmountKRW = 0, totalAmountUSD = 0;
    let totalQty = 0; // 총수량을 위한 변수 추가
    const localeOptions = { minimumFractionDigits: 3, maximumFractionDigits: 3 };

    itemsTableBody.querySelectorAll('.item-row').forEach(row => {
        const getVal = (key) => {
            const cell = row.querySelector(`[data-key="${key}"]`);
            return cell ? cell.textContent.trim().replace(/,/g, '') : '0';
        };
        
        const qty = parseFloat(getVal('qty')) || 0;
        totalQty += qty; // 각 아이템의 수량을 총수량에 더합니다.

        const priceKrw = parseFloat(getVal('price_krw')) || 0;
        const additionalCostKrw = parseFloat(getVal('custom_additional_cost')) || 0;
        const amountKrw = qty * (priceKrw + additionalCostKrw);
        totalAmountKRW += amountKrw;
        
        const priceUsd = parseFloat(getVal('price_usd')) || 0;
        const additionalCostUsdText = getVal('custom_additional_cost_usd'); // USD 추가비용을 읽어올 수 있다면
        const additionalCostUsd = additionalCostUsdText ? parseFloat(additionalCostUsdText) : 0;
        const amountUsd = qty * (priceUsd + additionalCostUsd);
        totalAmountUSD += amountUsd;
        
        // 실시간으로 행의 소계 금액을 다시 계산하여 표시 (선택사항)
        const amountKrwCell = row.querySelector(`[data-key="amount_krw"]`);
        if(amountKrwCell) amountKrwCell.textContent = Math.round(amountKrw).toLocaleString();
        
        const amountUsdCell = row.querySelector(`[data-key="amount_usd"]`);
        if(amountUsdCell) amountUsdCell.textContent = amountUsd.toLocaleString(undefined, localeOptions);
    });

    if (this.docType !== 'packinglist') {
        let totalsHtml = '';
        
        // 1. 총주문 수량(Total Quantity) 행을 추가합니다.
        totalsHtml += `<div class="flex justify-between p-2 bg-slate-50"><span class="font-bold">TOTAL Q'TY</span><span>${totalQty.toLocaleString()}</span></div>`;

        // 2. KRW 및 USD 총액을 조건에 맞게 표시합니다.
        if (currency !== 'usd_only') {
            totalsHtml += `<div class="flex justify-between p-2"><span class="font-bold">TOTAL (KRW)</span><span>₩${Math.round(totalAmountKRW).toLocaleString()}</span></div>`;
        }
        if (currency !== 'krw_only') {
            totalsHtml += `<div class="flex justify-between p-2"><span class="font-bold">TOTAL (USD)</span><span>$${totalAmountUSD.toLocaleString(undefined, localeOptions)}</span></div>`;
        }
        
        totalsEl.innerHTML = totalsHtml;
        tfoot.innerHTML = ''; // 패킹리스트가 아닐 경우 tfoot은 비웁니다.
    } else {
        // ... (기존 패킹리스트 로직은 그대로 유지) ...
        const columns = this.renderOptions.columns;
        let totalBoxes = 0, totalGrossWeight = 0, totalCBM = 0;
        itemsTableBody.querySelectorAll('.item-row').forEach(row => {
            const getVal = (key) => row.querySelector(`[data-key="${key}"]`)?.textContent.trim().replace(/,/g, '') || '0';
            totalBoxes += parseFloat(getVal('box_qty')) || 0;
            totalGrossWeight += parseFloat(getVal('total_gross_weight')) || 0;
            totalCBM += parseFloat(getVal('total_cbm')) || 0;
        });

        const totalRowData = {
            qty: totalQty.toLocaleString(),
            box_qty: totalBoxes.toLocaleString(),
            total_gross_weight: `${totalGrossWeight.toFixed(2)} KG`,
            total_cbm: `${totalCBM.toFixed(3)} CBM`
        };
        let footerTds = '';
        const firstTotalColumnIndex = columns.findIndex(col => totalRowData[col.key]);

        if (firstTotalColumnIndex !== -1) {
            if (firstTotalColumnIndex > 0) {
                 footerTds += `<td class="p-2 border text-center" colspan="${firstTotalColumnIndex}"><strong>TOTAL</strong></td>`;
            }
            for (let i = firstTotalColumnIndex; i < columns.length; i++) {
                const col = columns[i];
                const totalValue = totalRowData[col.key];
                footerTds += `<td class="p-2 border ${col.align}"><strong>${totalValue || ''}</strong></td>`;
            }
        } else {
             footerTds = `<td class="p-2 border text-center" colspan="${columns.length}"><strong>TOTAL</strong></td>`;
        }
        tfoot.innerHTML = `<tr class="font-bold bg-slate-50">${footerTds}</tr>`;
        totalsEl.innerHTML = '';
    }
},
    
    addCustomField() {
        const container = this.views.doc.querySelector('#additional-fields-container');
        const newField = document.createElement('div');
        newField.className = 'flex mb-2 items-center custom-field-row';
        newField.innerHTML = `<strong class="w-32 flex-shrink-0" contenteditable="true">New Title</strong><div class="p-1 flex-grow" contenteditable="true">Value</div><button data-action="remove-custom-field" class="no-print text-red-500 ml-2">&times;</button>`;
        container.appendChild(newField);
    },

    addItemRow() {
        const tableBody = this.views.doc.querySelector('.items-table-body');
        const newRow = document.createElement('tr');
        newRow.className = 'border-b item-row';
        const colCount = this.renderOptions.columns.length;
        let rowHtml = '';
        for (let i = 0; i < colCount; i++) {
            rowHtml += `<td class="p-2 border" data-key="${this.renderOptions.columns[i].key}" contenteditable="true"></td>`;
        }
        rowHtml += `<td class="p-2 border text-center no-print"><button data-action="remove-item-row" class="text-red-500">&times;</button></td>`;
        newRow.innerHTML = rowHtml;
        tableBody.appendChild(newRow);
    },

    async saveDocument() {
    const saveBtn = this.pageEl.querySelector('button[data-action="save-document"]');
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';
    try {
        const printArea = $('#print-area');
        if (!printArea) throw new Error('저장할 문서 영역을 찾을 수 없습니다.');
        
        // ▼▼▼ 이 부분을 수정합니다 ▼▼▼
        // 기존의 cloneNode 대신, 현재 printArea의 내부 HTML을 직접 사용합니다.
        let htmlToSave = printArea.innerHTML;

        // 임시 div를 만들어 no-print 클래스를 제거하는 방식을 사용합니다.
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = htmlToSave;
        tempDiv.querySelectorAll('.no-print').forEach(el => el.remove());
        htmlToSave = tempDiv.innerHTML;
        // ▲▲▲ 수정 끝 ▲▲▲

        const orderId = this.documentData.order.id;
        const savedHtmlColumn = `saved_${this.docType}_html`;
        const { error } = await supabase.from('orders').update({ [savedHtmlColumn]: htmlToSave }).eq('id', orderId);
        if (error) throw error;
        alert('문서가 성공적으로 저장되었습니다.');
    } catch (e) {
        console.error('문서 저장 실패:', e);
        alert(`문서 저장에 실패했습니다: ${e.message}`);
    } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = '문서 저장';
    }
  },
    
    exportToExcel() {
        const { order } = this.documentData;
        const table = this.views.doc.querySelector('.doc-table');
        if (!table) { alert('엑셀로 내보낼 테이블을 찾을 수 없습니다.'); return; }
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent);
        const dataRows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
            const row = {};
            Array.from(tr.cells).slice(0, headers.length).forEach((cell, i) => { row[headers[i]] = cell.textContent; });
            return row;
        });
        const worksheet = XLSX.utils.json_to_sheet(dataRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, this.docType);
        XLSX.writeFile(workbook, `${this.docType.toUpperCase()}_${order.order_number || order.id}.xlsx`);
    }
};
