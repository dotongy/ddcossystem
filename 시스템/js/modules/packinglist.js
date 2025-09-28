// js/packinglist.js

import { supabase } from '../supabase.js';
import { $, $$ } from '../utils.js';
import { DocUtils } from './documentUtils.js';

export const PackinglistApp = {
    docType: 'packinglist',
    pageEl: null,
    views: {},
    documentData: {},
    renderOptions: {},
    currentColumnConfig: null,

    init() {
        this.pageEl = $(`#${this.docType}-page`);
        if (!this.pageEl) return;

        this.views = {
            list: $(`#${this.docType}-order-list-view`),
            options: $(`#${this.docType}-options-view`),
            doc: $(`#${this.docType}-document-view`)
        };

        // ▼▼▼ [수정] 이벤트 리스너가 한번만 등록되도록 수정합니다. ▼▼▼
        if (!this.pageEl.dataset.initialized) {
            this.pageEl.addEventListener('click', this.handlePageClick.bind(this));
            $(`#${this.docType}-search-input`)?.addEventListener('input', () => this.fetchOrders());
            $(`#${this.docType}-view-all-btn`)?.addEventListener('click', () => this.handleViewAll());
            
            this.pageEl.dataset.initialized = 'true';
        }
        // ▲▲▲ [수정] 여기까지 ▲▲▲
        
        this.fetchOrders();
    },

    fetchOrders() {
        const listEl = this.views.list.querySelector('.order-list-tbody');
        DocUtils.fetchOrders(this.docType, listEl);
    },
    
    handleViewAll() {
        $(`#${this.docType}-search-input`).value = '';
        this.fetchOrders();
    },

    updateDocumentDataFromView() {
        // 이 함수는 invoice.js와 내용이 거의 동일합니다.
        const docView = this.views.doc;
        if (!docView) return;
        if (!this.documentData.customContent) this.documentData.customContent = {};

        const itemsTableBody = docView.querySelector('.items-table-body');
        const newItems = [];
        if (itemsTableBody) {
            itemsTableBody.querySelectorAll('.item-row').forEach(row => {
                const originalIndex = row.dataset.index;
                const originalItem = originalIndex ? this.documentData.items[originalIndex] : { products: {}, is_custom_row: true };
                
                const currentData = { ...originalItem };
                row.querySelectorAll('td[data-key]').forEach(cell => {
                    currentData[cell.dataset.key] = cell.textContent.trim();
                });
                
                // 숫자형 데이터 변환
                currentData.quantity = parseFloat(String(currentData.qty || '').replace(/,/g, '')) || 0;
                newItems.push(currentData);
            });
        }
        this.documentData.items = newItems;

        docView.querySelectorAll('[data-content-key]').forEach(el => {
            this.documentData.customContent[el.dataset.contentKey] = el.innerHTML;
        });

        const customFields = [];
        docView.querySelectorAll('.custom-field-row').forEach(row => {
            customFields.push({
                title: row.querySelector('strong')?.innerHTML,
                value: row.querySelector('div')?.innerHTML
            });
        });
        this.documentData.customContent.custom_fields = customFields;
    },

    reconstructStateFromSavedHtml(savedHtml) {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = savedHtml;
        const headers = Array.from(tempDiv.querySelectorAll('.doc-table thead th'));
        const defaultColumns = this.getDefaultColumns();
        this.currentColumnConfig = headers.map(th => {
            const name = th.textContent.trim();
            const defaultConfig = defaultColumns.find(col => col.name === name);
            return {
                key: defaultConfig ? defaultConfig.key : `custom_${name.toLowerCase().replace(/\s+/g, '_')}`,
                name: name, checked: true, isCustom: !defaultConfig
            };
        });
    },

    getDefaultColumns() {
        return [
            { key: 'no', name: 'No.' }, { key: 'desc', name: 'Description' }, 
            { key: 'outbox_qty', name: 'Outbox Qty' }, { key: 'qty', name: 'Order Qty' }, 
            { key: 'box_qty', name: 'Box Qty' }, { key: 'gross_weight', name: 'Gross Weight' }, 
            { key: 'total_gross_weight', name: 'Total G.W.' }, { key: 'cbm', name: 'CBM' }, 
            { key: 'total_cbm', name: 'Total CBM' }
        ];
    },

    async handlePageClick(e) {
        const button = e.target.closest('button');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;
        if (action) { e.preventDefault(); e.stopPropagation(); }

        switch(action) {
            case 'create-document': await this.loadDocumentOrOptions(id); break;
            case 'generate-document': this.renderDocumentView(); break;
            case 'save-document': 
                this.updateDocumentDataFromView();
                await DocUtils.saveDocument(this); 
                break;
            case 'back-to-list':
                this.documentData = {};
                this.currentColumnConfig = null;
                DocUtils.switchToView(this.views, 'list');
                break;
            
            // ▼▼▼ [수정] 'regenerate'와 'back-to-options' 로직을 분리합니다. ▼▼▼
            case 'regenerate':
                // 저장된 (잘못된) HTML을 무시하고 초기 데이터로 옵션 화면을 재생성합니다.
                this.currentColumnConfig = null; // 열 구성을 초기화하여 기본값으로 다시 그리게 합니다.
                this.views.options.innerHTML = this.getOptionsHtml();
                this.populateDefaultColumns();
                DocUtils.switchToView(this.views, 'options');
                break;

            case 'back-to-options':
                 // 새로 생성 중인 문서의 수정 내용을 유지한 채 옵션으로 돌아갑니다.
                 this.updateDocumentDataFromView();
                 this.views.options.innerHTML = this.getOptionsHtml();
                 this.populateDefaultColumns();
                 DocUtils.switchToView(this.views, 'options');
                 break;
            // ▲▲▲ [수정] 여기까지 ▲▲▲

            case 'print': DocUtils.printDocument(); break;
            case 'export-excel': DocUtils.exportToExcel(this); break;
            case 'add-column': this.addColumn(); break;
            case 'remove-column': button.closest('li').remove(); break;
            case 'add-item-row': this.addItemRow(); break;
            case 'remove-item-row': 
                button.closest('tr').remove();
                this.recalculateDocumentTotals();
                break;
            case 'add-custom-field': this.addCustomField(); break;
            case 'remove-custom-field': button.closest('.custom-field-row').remove(); break;
        }
    },

    async loadDocumentOrOptions(orderId) {
        // invoice.js의 loadDocumentOrOptions와 거의 동일한 로직
        this.documentData = {};
        this.currentColumnConfig = null;
        
        try {
            const [settingsRes, orderRes, itemsRes] = await Promise.all([
                supabase.from('company_settings').select('*').eq('id', 1).single(),
                supabase.from('orders').select('*, customers(*), saved_packinglist_html').eq('id', orderId).single(),
                supabase.from('order_items').select('*, products(*), unit_price_usd').eq('order_id', orderId)
            ]);
            if (orderRes.error || itemsRes.error) throw orderRes.error || itemsRes.error;
            
            this.documentData = { settings: settingsRes.data, order: orderRes.data, items: itemsRes.data };
            const savedHtml = this.documentData.order.saved_packinglist_html;

            if (savedHtml) {
                // ▼▼▼ [수정] 이 라인을 추가하세요. ▼▼▼
            this.reconstructStateFromSavedHtml(savedHtml);
            // ▲▲▲ [수정] 여기까지 ▲▲▲
                const fullHtml = DocUtils.getControlWrappedHtml(savedHtml, true, this.docType);
                this.views.doc.innerHTML = fullHtml;
                DocUtils.switchToView(this.views, 'doc');
            } else {
                this.views.options.innerHTML = this.getOptionsHtml();
                this.populateDefaultColumns();
                DocUtils.switchToView(this.views, 'options');
            }
        } catch (e) {
            alert(`데이터 로딩 실패: ${e.message}`);
        }
    },
    
    // ======================================================
    // 아래부터는 패킹리스트에만 해당하는 고유한 함수들입니다.
    // ======================================================

    getOptionsHtml() {
        // settings 객체를 사용하기 위해 추가합니다.
        const { order, settings } = this.documentData;
        
        return `
            <div class="bg-white p-8 rounded-xl shadow-md">               
                <header class="mb-8">
                    <h3 class="text-2xl font-bold text-gray-800">패킹리스트 옵션 설정</h3>
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
                                <label class="flex items-center"><input type="checkbox" id="show-stamp" class="h-4 w-4 text-primary focus:ring-primary rounded border-gray-300"> <span class="ml-2 text-secondary">회사 직인 표시</span></label>
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

        // ▼▼▼ [수정] 저장된 열 구성이 있으면 사용하도록 로직을 변경합니다. ▼▼▼
        if (this.currentColumnConfig && this.currentColumnConfig.length > 0) {
            columnsToRender = this.currentColumnConfig;
        } else {
            // 없으면(최초 생성 시) 기본값을 사용합니다.
            columnsToRender = [
                { key: 'no', name: 'No.', checked: true }, { key: 'desc', name: 'Description', checked: true }, 
                { key: 'outbox_qty', name: 'Outbox Qty', checked: true }, { key: 'qty', name: 'Order Qty', checked: true }, 
                { key: 'box_qty', name: 'Box Qty', checked: true }, { key: 'gross_weight', name: 'Gross Weight', checked: true }, 
                { key: 'total_gross_weight', name: 'Total G.W.', checked: true }, { key: 'cbm', name: 'CBM', checked: true }, 
                { key: 'total_cbm', name: 'Total CBM', checked: true }
            ];
        }
        // ▲▲▲ [수정] 여기까지 ▲▲▲
        
        columnList.innerHTML = columnsToRender.map(col => this.createColumnLi(col.key, col.name, col.checked, col.isCustom)).join('');
        this.initDragAndDrop();
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
        DocUtils.initDragAndDrop(columnList);
    },

    renderDocumentView() {
        const optionsView = this.views.options;
        this.currentColumnConfig = Array.from(optionsView.querySelectorAll(`#column-list-${this.docType} li`))
            .map(li => ({
                key: li.dataset.key,
                name: li.querySelector('.custom-col-name')?.value || li.querySelector('span').textContent,
                checked: li.querySelector('input[name="col"]').checked,
                isCustom: !!li.querySelector('.custom-col-name')
            }));

        this.renderOptions = {
            columns: this.currentColumnConfig.filter(c => c.checked)
                .map(c => ({ 
                    ...c, 
                    align: ['no', 'qty', 'outbox_qty', 'box_qty'].includes(c.key) ? 'text-center' : (c.key.includes('weight') || c.key.includes('cbm') ? 'text-right' : 'text-left') 
                })),
            showStamp: optionsView.querySelector('#show-stamp').checked,
        };

        const docHtml = this.getDocumentHtml();
        const fullHtml = DocUtils.getControlWrappedHtml(docHtml, false, this.docType);
        this.views.doc.innerHTML = fullHtml;
        DocUtils.switchToView(this.views, 'doc');

        this.addDocumentEventListeners();
        this.recalculateDocumentTotals();
    },

    getDocumentHtml() {
        const { settings, order, items, customContent = {} } = this.documentData;
        const { columns, showStamp } = this.renderOptions;
        
        const docTitle = 'PACKING LIST'; 
        const titleClass = 'text-green-600 print-text-packinglist';
        const titleStyle = `color: #16A34A !important;`;

        const tableHeadHtml = `<tr>${columns.map(c => `<th class="p-2 border bg-gray-50 font-semibold text-gray-700 ${c.align}">${c.name}</th>`).join('')}</tr>`;

        const itemsHtml = items.map((item, index) => {
            let rowHtml = `<tr class="item-row" data-index="${index}">`;
            columns.forEach(col => {
                let cellContent = '';
                const qty = item.quantity || 0;
                const outboxQty = item.products?.outbox_quantity || 0;
                const boxQty = outboxQty > 0 ? Math.ceil(qty / outboxQty) : 0;
                const grossWeight = item.products?.gross_weight || 0;
                const cbm = item.products?.cbm || 0;

                switch(col.key) {
                    case 'no': cellContent = index + 1; break;
                    case 'desc': cellContent = item.product_name || item.products?.name_en; break;
                    case 'qty': cellContent = qty.toLocaleString(); break;
                    case 'outbox_qty': cellContent = outboxQty.toLocaleString(); break;
                    case 'box_qty': cellContent = boxQty.toLocaleString(); break;
                    case 'gross_weight': cellContent = grossWeight.toFixed(2); break;
                    case 'total_gross_weight': cellContent = (boxQty * grossWeight).toFixed(2); break;
                    case 'cbm': cellContent = cbm.toFixed(3); break;
                    case 'total_cbm': cellContent = (boxQty * cbm).toFixed(3); break;
                    default:
                        cellContent = item[col.key] || '';
                }

                rowHtml += `<td class="p-2 border ${col.align}" data-key="${col.key}" contenteditable="true">${cellContent}</td>`;
            });
            rowHtml += `<td class="p-2 border text-center no-print"><button data-action="remove-item-row" class="text-red-500">&times;</button></td>`;
            return rowHtml + '</tr>';
        }).join('');
        
        // 인보이스와 달리 BANK INFORMATION은 기본으로 표시 (옵션 X)
        const bankInfoHtml = `<div class="border p-4 rounded-lg bg-slate-50 print-bg" style="background-color: #F9FAFB !important;"><h3 class="font-bold mb-2 text-slate-600">BANK INFORMATION:</h3><div contenteditable="true"><p><strong>BENEFICIARY:</strong> ${settings.company_name || ''}</p><p><strong>BANK NAME:</strong> ${settings.bank1_name || ''}</p><p><strong>BANK ADDRESS:</strong> ${settings.bank1_address || ''}</p><p><strong>ACCOUNT NO.:</strong> ${settings.bank1_account || ''}</p><p><strong>SWIFT CODE:</strong> ${settings.bank1_swift || ''}</p></div></div>`;
        const stampHtml = showStamp && settings.company_stamp_url ? `<div><img src="${settings.company_stamp_url}" alt="Company Stamp" class="object-contain" style="width: 6.9cm; height: 3.1cm;"></div>` : '';
        const exchangeRateHtml = `<div class="flex"><strong class="w-32 flex-shrink-0">Exchange rate:</strong><div data-content-key="exchange_rate_info" contenteditable="true">${customContent?.exchange_rate_info || `1 USD = ${order.exchange_rate?.toLocaleString() || ''} KRW`}</div></div>`;

        return `
            <header class="flex justify-between items-start pb-4 mb-8 border-b-4 border-gray-200">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800" data-content-key="company_name" contenteditable="true">${settings.company_name}</h2>
                    <p class="text-secondary" data-content-key="company_address" contenteditable="true">${settings.address}</p>
                    <p class="text-secondary" data-content-key="company_contact" contenteditable="true">Tel: ${settings.phone_number} / Email: ${settings.company_email}</p>
                </div>
                <div class="text-right">
                    <h1 class="text-4xl font-bold ${titleClass}" style="${titleStyle}">${docTitle}</h1>
                    <p><span class="font-bold">No.:</span> <span data-content-key="doc_no" contenteditable="true">${order.order_number || `DOC-${order.id}`}</span></p>
                    <p><span class="font-bold">Date:</span> <span data-content-key="doc_date" contenteditable="true">${order.order_date}</span></p>
                </div>
            </header>
            <div class="grid grid-cols-2 gap-8 mb-8">
                <div class="border p-4 rounded-lg bg-light print-bg">
                    <h3 class="font-bold mb-2 text-gray-600">TO:</h3>
                    <div data-content-key="to_block" contenteditable="true" class="space-y-1 text-secondary">
                        <p><strong>${order.customers.name}</strong></p>
                        <p>${order.customers.address}</p>
                        <p>ATTN: ${order.customers.contact_person || ''}</p>
                        <p>Email: ${order.customers.email || ''}</p>
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
            <div id="additional-fields-container" class="w-2/3"></div>
            <div class="no-print mt-4 space-x-2">
                <button data-action="add-custom-field" class="btn-secondary text-xs py-1 px-2">+ 필드 추가</button>
                <button data-action="add-item-row" class="btn-secondary text-xs py-1 px-2">+ 빈 행 추가</button>
            </div>
            <div class="mt-24 flex justify-end items-end h-32">
                <div class="text-right mr-4">
                    <p class="font-bold text-lg" data-content-key="signature_name" contenteditable="true">${settings.company_name}</p>
                    <p class="text-sm text-secondary">(Signature)</p>
                </div>
                ${stampHtml}
            </div>
        `;
    },

    recalculateDocumentTotals() {
        const itemsTableBody = this.views.doc.querySelector('.items-table-body');
        const tfoot = this.views.doc.querySelector('#doc-table-foot');
        const totalsEl = this.views.doc.querySelector('#doc-totals');
        if (!itemsTableBody || !tfoot) return;

        // 실시간으로 행의 값을 다시 계산
        itemsTableBody.querySelectorAll('.item-row').forEach(row => {
            const getVal = (key) => parseFloat(row.querySelector(`[data-key="${key}"]`)?.textContent.trim().replace(/,/g, '') || '0');
            const qty = getVal('qty');
            const outboxQty = getVal('outbox_qty');
            const boxQty = outboxQty > 0 ? Math.ceil(qty / outboxQty) : 0;
            const grossWeight = getVal('gross_weight');
            const cbm = getVal('cbm');
            
            const boxQtyCell = row.querySelector('[data-key="box_qty"]');
            if (boxQtyCell) boxQtyCell.textContent = boxQty.toLocaleString();
            
            const totalGwCell = row.querySelector('[data-key="total_gross_weight"]');
            if (totalGwCell) totalGwCell.textContent = (boxQty * grossWeight).toFixed(2);
            
            const totalCbmCell = row.querySelector('[data-key="total_cbm"]');
            if (totalCbmCell) totalCbmCell.textContent = (boxQty * cbm).toFixed(3);
        });

        // tfoot 합계 계산
        const columns = this.renderOptions.columns;
        let totalQty = 0, totalBoxes = 0, totalGrossWeight = 0, totalCBM = 0;
        
        itemsTableBody.querySelectorAll('.item-row').forEach(row => {
            const getVal = (key) => parseFloat(row.querySelector(`[data-key="${key}"]`)?.textContent.trim().replace(/,/g, '') || '0');
            totalQty += getVal('qty');
            totalBoxes += getVal('box_qty');
            totalGrossWeight += getVal('total_gross_weight');
            totalCBM += getVal('total_cbm');
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
        totalsEl.innerHTML = ''; // 패킹리스트는 하단 별도 합계란을 사용하지 않음
    },

    addDocumentEventListeners() {
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

    addCustomField() {
        const container = this.views.doc.querySelector('#additional-fields-container');
        const newField = document.createElement('div');
        newField.className = 'flex mb-2 items-center custom-field-row';
        newField.innerHTML = `<strong class="w-32 flex-shrink-0" contenteditable="true">New Title</strong><div class="p-1 flex-grow" contenteditable="true">Value</div><button data-action="remove-custom-field" class="no-print text-red-500 ml-2">&times;</button>`;
        container.appendChild(newField);
    }
};