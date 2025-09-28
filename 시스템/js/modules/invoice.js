// js/invoice.js

import { supabase } from '../supabase.js';
import { $, $$ } from '../utils.js';
import { DocUtils } from './documentUtils.js';

export const InvoiceApp = {
    docType: 'invoice',
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
    
    if (!this.pageEl.dataset.initialized) {
        this.pageEl.addEventListener('click', this.handlePageClick.bind(this));
        $(`#${this.docType}-search-input`)?.addEventListener('input', () => this.fetchOrders());
        $(`#${this.docType}-view-all-btn`)?.addEventListener('click', () => this.handleViewAll());
        
        this.pageEl.dataset.initialized = 'true';
    }

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

                const currentData = {};
                row.querySelectorAll('td[data-key]').forEach(cell => {
                    const key = cell.dataset.key;
                    currentData[key] = cell.textContent.trim();
                });
                
                const baseItem = originalItem ? { ...originalItem } : { products: {}, is_custom_row: true };

                const newItem = {
                    ...baseItem,
                    ...currentData 
                };

                newItem.quantity = parseFloat(String(currentData.qty || '').replace(/,/g, '')) || baseItem.quantity || 0;
                newItem.unit_price = parseFloat(String(currentData.price_krw || '').replace(/,/g, '')) || baseItem.unit_price || 0;
                newItem.additional_cost = parseFloat(String(currentData.custom_additional_cost || '').replace(/,/g, '')) || baseItem.additional_cost || 0;
                newItem.unit_price_usd = parseFloat(String(currentData.price_usd || '').replace(/,/g, '')) || baseItem.unit_price_usd || 0;
                
                newItem.product_name = currentData.desc || baseItem.product_name;
                if (!newItem.products) newItem.products = {};
                newItem.products.name_en = currentData.desc || baseItem.products?.name_en;
                newItem.products.hs_code = currentData.hs_code || baseItem.products?.hs_code;
                newItem.products.barcode = currentData.barcode || baseItem.products?.barcode;

                newItems.push(newItem);
            });
        }
        this.documentData.items = newItems;

        // 2. 테이블 외 다른 모든 수정 가능 콘텐츠 캡처
        docView.querySelectorAll('[data-content-key]').forEach(el => {
            const key = el.dataset.contentKey;
            this.documentData.customContent[key] = el.innerHTML;
        });

        // 3. '필드 추가'로 생성된 커스텀 필드 캡처
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
    // ▲▲▲▲▲ [코드 추가] 여기까지 ▲▲▲▲▲

    async handlePageClick(e) {
        const button = e.target.closest('button');
        if (!button) return;

        const action = button.dataset.action;
        const id = button.dataset.id;
        if (action) { e.preventDefault(); e.stopPropagation(); }

        switch(action) {
            case 'create-document':
                await this.loadDocumentOrOptions(id);
                break;
            case 'generate-document': 
                this.renderDocumentView(); 
                break;
            case 'save-document': 
                await DocUtils.saveDocument(this);
                break;
            case 'back-to-list':
                this.documentData = {};
                this.currentColumnConfig = null;
                DocUtils.switchToView(this.views, 'list');
                break;
            
            // ▼▼▼▼▼ [핵심 수정] 이 부분을 아래와 같이 변경합니다. ▼▼▼▼▼
            case 'regenerate':
            case 'back-to-options':
                 // 1. 옵션 화면으로 돌아가기 전, 현재 문서 화면의 모든 데이터를 캡처합니다.
                 this.updateDocumentDataFromView();
                 
                 // 2. 옵션 화면을 다시 그립니다.
                 this.views.options.innerHTML = this.getOptionsHtml();
                 
                 // 3. 캡처된 데이터를 바탕으로 열 구성을 복원합니다.
                 this.populateDefaultColumns();
                 
                 // 4. 옵션 화면으로 전환합니다.
                 DocUtils.switchToView(this.views, 'options');
                 break;
            // ▲▲▲▲▲ [핵심 수정] 여기까지 ▲▲▲▲▲

            case 'print': DocUtils.printDocument(); break;
            case 'export-excel':
                DocUtils.exportToExcel(this);
                break;
            case 'add-column':
                this.addColumn();
                break;
            case 'remove-column':
                button.closest('li').remove();
                break;
            case 'add-item-row':
                this.addItemRow();
                break;
            case 'remove-item-row':
                button.closest('tr').remove();
                this.recalculateDocumentTotals();
                break;
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
    },

    getDefaultColumns() {
        const costLabel = this.documentData?.order?.additional_cost_label || '추가 비용';
        return [
            { key: 'no', name: 'No.' }, { key: 'desc', name: 'Description' }, 
            { key: 'hs_code', name: 'HS CODE' }, { key: 'barcode', name: 'Barcode' }, 
            { key: 'qty', name: 'Quantity' }, { key: 'price_krw', name: 'Unit Price (KRW)' }, 
            { key: 'custom_additional_cost', name: costLabel }, { key: 'amount_krw', name: 'Amount (KRW)' }, 
            { key: 'price_usd', name: 'Unit Price (USD)' }, { key: 'amount_usd', name: 'Amount (USD)' }
        ];
    },

    getBankInfoHtml(bankChoice, settings) {
        if (bankChoice === 'none') return '';
        const prefix = bankChoice;
        return `<div class="border p-4 rounded-lg bg-slate-50 print-bg" style="background-color: #F9FAFB !important;"><h3 class="font-bold mb-2 text-slate-600">BANK INFORMATION:</h3><div contenteditable="true"><p><strong>BENEFICIARY:</strong> ${settings.company_name || ''}</p><p><strong>BANK NAME:</strong> ${settings[prefix + '_name'] || ''}</p><p><strong>BANK ADDRESS:</strong> ${settings[prefix + '_address'] || ''}</p><p><strong>ACCOUNT NO.:</strong> ${settings[prefix + '_account'] || ''}</p><p><strong>SWIFT CODE:</strong> ${settings[prefix + '_swift'] || ''}</p></div></div>`;
    },

    async loadDocumentOrOptions(orderId) {
        // 상태 초기화
        this.documentData = {};
        this.currentColumnConfig = null;
        
        try {
            const [settingsRes, orderRes, itemsRes] = await Promise.all([
                supabase.from('company_settings').select('*').eq('id', 1).single(),
                supabase.from('orders').select('*, customers(*), saved_invoice_html').eq('id', orderId).single(),
                supabase.from('order_items').select('*, products(*), unit_price_usd').eq('order_id', orderId)
            ]);
            if (orderRes.error || itemsRes.error) throw orderRes.error || itemsRes.error;
            
            this.documentData = { settings: settingsRes.data, order: orderRes.data, items: itemsRes.data };
            const savedHtml = this.documentData.order.saved_invoice_html;

            if (savedHtml) {
                // ▼▼▼ [수정 코드] 이 라인을 추가하세요. ▼▼▼
                this.reconstructStateFromSavedHtml(savedHtml);
                // ▲▲▲ [수정 코드] 여기까지 ▲▲▲
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
    // 아래부터는 인보이스에만 해당하는 고유한 함수들입니다.
    // ======================================================

    getOptionsHtml() {
        const { order, settings } = this.documentData;
        const stampChecked = 'checked'; // 인보이스는 기본 체크
                
        return `
            <div class="bg-white p-8 rounded-xl shadow-md">               
                <header class="mb-8">
                    <h3 class="text-2xl font-bold text-gray-800">인보이스 옵션 설정</h3>
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

        // 저장된 열 구성(currentColumnConfig)이 있으면 그것을 사용합니다.
        if (this.currentColumnConfig && this.currentColumnConfig.length > 0) {
            columnsToRender = this.currentColumnConfig;
        } else {
            // 없으면(최초 생성 시) 기본값을 사용합니다.
            const costLabel = this.documentData.order.additional_cost_label || '추가 비용';
            columnsToRender = [
                { key: 'no', name: 'No.', checked: true }, { key: 'desc', name: 'Description', checked: true }, 
                { key: 'hs_code', name: 'HS CODE', checked: false }, { key: 'barcode', name: 'Barcode', checked: true }, 
                { key: 'qty', name: 'Quantity', checked: true }, { key: 'price_krw', name: 'Unit Price (KRW)', checked: true }, 
                { key: 'custom_additional_cost', name: costLabel, checked: true }, { key: 'amount_krw', name: 'Amount (KRW)', checked: true }, 
                { key: 'price_usd', name: 'Unit Price (USD)', checked: true }, { key: 'amount_usd', name: 'Amount (USD)', checked: true }
            ];
        }
        
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
                    align: ['no', 'qty'].includes(c.key) ? 'text-center' : (c.key.includes('price') || c.key.includes('amount') ? 'text-right' : 'text-left') 
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

        const docHtml = this.getDocumentHtml();
        const fullHtml = DocUtils.getControlWrappedHtml(docHtml, false, this.docType);
        this.views.doc.innerHTML = fullHtml;
        DocUtils.switchToView(this.views, 'doc');

        this.addDocumentEventListeners(); 
        this.recalculateDocumentTotals();
    },

    getDocumentHtml() {
        const { settings, order, items, customContent = {} } = this.documentData;
        const { columns, currency, exchangeRate, bank, showStamp, showExchangeRate } = this.renderOptions;
        const localeOptions = { minimumFractionDigits: 3, maximumFractionDigits: 3 };
        
        const docTitle = 'COMMERCIAL INVOICE'; 
        const titleClass = 'text-red-600 print-text-invoice';
        const titleStyle = `color: #DC2626 !important;`;

        const tableHeadHtml = `<tr>${columns.map(c => `<th class="p-2 border bg-gray-50 font-semibold text-gray-700 ${c.align}">${c.name}</th>`).join('')}</tr>`;

        const itemsHtml = items.map((item, index) => {
            let rowHtml = `<tr class="item-row" data-index="${index}">`;
            columns.forEach(col => {
                let cellContent = '';
                const finalUnitPriceKrw = (item.unit_price || 0) + (item.additional_cost || 0);
                const amountKRW = finalUnitPriceKrw * (item.quantity || 0);

                switch(col.key) {
                    case 'no': cellContent = index + 1; break;
                    case 'desc': cellContent = item.product_name || item.products?.name_en; break;
                    case 'qty': cellContent = (item.quantity || '').toLocaleString(); break;
                    case 'price_krw': cellContent = (item.unit_price || 0).toLocaleString(); break;
                    case 'amount_krw': cellContent = Math.round(amountKRW).toLocaleString(); break;
                    case 'custom_additional_cost': cellContent = (item.additional_cost || 0).toLocaleString(); break;
                    case 'hs_code': cellContent = item.products?.hs_code || ''; break;
                    case 'barcode': cellContent = item.products?.barcode || ''; break;
                    case 'price_usd': {
                        let priceUsd = item.unit_price_usd > 0 ? item.unit_price_usd : (exchangeRate > 0 ? (item.unit_price || 0) / exchangeRate : 0);
                        cellContent = priceUsd.toLocaleString(undefined, localeOptions); 
                        break;
                    }
                    case 'amount_usd': {
                        let unitPriceForAmountUsd = item.unit_price_usd > 0 ? item.unit_price_usd : (exchangeRate > 0 ? (item.unit_price || 0) / exchangeRate : 0);
                        const additionalCostUsd = (item.additional_cost && exchangeRate > 0) ? item.additional_cost / exchangeRate : 0;
                        const amountUsd = (item.quantity || 0) * (unitPriceForAmountUsd + additionalCostUsd);
                        cellContent = amountUsd.toLocaleString(undefined, localeOptions);
                        break;
                    }
                    default:
                        cellContent = item[col.key] || '';
                }

                rowHtml += `<td class="p-2 border ${col.align}" data-key="${col.key}" contenteditable="true">${cellContent}</td>`;
            });
            rowHtml += `<td class="p-2 border text-center no-print"><button data-action="remove-item-row" class="text-red-500">&times;</button></td>`;
            return rowHtml + '</tr>';
        }).join('');
        
        const bankInfoHtml = this.getBankInfoHtml(bank, settings);
        const stampHtml = showStamp && settings.company_stamp_url ? `<div><img src="${settings.company_stamp_url}" alt="Company Stamp" class="object-contain" style="width: 6.9cm; height: 3.1cm;"></div>` : '';
        const exchangeRateHtml = showExchangeRate && exchangeRate > 0 ? `<div class="flex"><strong class="w-32 flex-shrink-0">Exchange rate:</strong><div data-content-key="exchange_rate_info" contenteditable="true">${customContent?.exchange_rate_info || `1 USD = ${exchangeRate.toLocaleString()} KRW`}</div></div>` : '';

        return `
            <header class="flex justify-between items-start pb-4 mb-8 border-b-4 border-gray-200">
                <div>
                    <h2 class="text-2xl font-bold text-gray-800" contenteditable="true">${settings.company_name}</h2>
                    <p class="text-secondary" contenteditable="true">${settings.address}</p>
                    <p class="text-secondary" contenteditable="true">Tel: ${settings.phone_number} / Email: ${settings.company_email}</p>
                </div>
                <div class="text-right">
                    <h1 class="text-4xl font-bold ${titleClass}" style="${titleStyle}">${docTitle}</h1>
                </div>
            </header>
            <div class="grid grid-cols-2 gap-8 mb-8">
                <div class="border p-4 rounded-lg bg-light print-bg">
                    <h3 class="font-bold mb-2 text-gray-600">TO:</h3>
                    <div contenteditable="true" class="space-y-1 text-secondary">
                        <p><strong>${order.customers.name}</strong></p><p>${order.customers.address}</p>
                    </div>
                </div>
                ${bankInfoHtml}
            </div>
            <div class="overflow-x-auto">
                <table class="w-full text-left mb-8 border-collapse doc-table min-w-[800px]">
                    <thead class="bg-gray-50">${tableHeadHtml}</thead>
                    <tbody class="items-table-body">${itemsHtml}</tbody>
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
                <button data-action="add-item-row" class="btn-secondary text-xs py-1 px-2">+ 빈 행 추가</button>
            </div>
            <div class="mt-24 flex justify-end items-end h-32">
                <div class="text-right mr-4">
                    <p class="font-bold text-lg" contenteditable="true">${settings.company_name}</p>
                    <p class="text-sm text-secondary">(Signature)</p>
                </div>
                ${stampHtml}
            </div>
        `;
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

    recalculateDocumentTotals() {
        const { currency } = this.renderOptions;
        const itemsTableBody = this.views.doc.querySelector('.items-table-body');
        const totalsEl = this.views.doc.querySelector('#doc-totals');
        if (!itemsTableBody || !totalsEl) return;
        
        let totalAmountKRW = 0, totalAmountUSD = 0;
        let totalQty = 0;
        const localeOptions = { minimumFractionDigits: 3, maximumFractionDigits: 3 };

        itemsTableBody.querySelectorAll('.item-row').forEach(row => {
            const getVal = (key) => {
                const cell = row.querySelector(`[data-key="${key}"]`);
                return cell ? cell.textContent.trim().replace(/,/g, '') : '0';
            };
            
            const qty = parseFloat(getVal('qty')) || 0;
            totalQty += qty;

            const priceKrw = parseFloat(getVal('price_krw')) || 0;
            const additionalCostKrw = parseFloat(getVal('custom_additional_cost')) || 0;
            const amountKrw = qty * (priceKrw + additionalCostKrw);
            totalAmountKRW += amountKrw;
            
            const priceUsd = parseFloat(getVal('price_usd')) || 0;
            const amountUsd = qty * priceUsd;
            totalAmountUSD += amountUsd;
            
            const amountKrwCell = row.querySelector(`[data-key="amount_krw"]`);
            if(amountKrwCell) amountKrwCell.textContent = Math.round(amountKrw).toLocaleString();
            
            const amountUsdCell = row.querySelector(`[data-key="amount_usd"]`);
            if(amountUsdCell) amountUsdCell.textContent = amountUsd.toLocaleString(undefined, localeOptions);
        });

        let totalsHtml = `<div class="flex justify-between p-2 bg-slate-50"><span class="font-bold">TOTAL Q'TY</span><span>${totalQty.toLocaleString()}</span></div>`;
        if (currency !== 'usd_only') {
            totalsHtml += `<div class="flex justify-between p-2"><span class="font-bold">TOTAL (KRW)</span><span>₩${Math.round(totalAmountKRW).toLocaleString()}</span></div>`;
        }
        if (currency !== 'krw_only') {
            totalsHtml += `<div class="flex justify-between p-2"><span class="font-bold">TOTAL (USD)</span><span>$${totalAmountUSD.toLocaleString(undefined, localeOptions)}</span></div>`;
        }
        totalsEl.innerHTML = totalsHtml;
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
    }
};