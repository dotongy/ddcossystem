// js/documentUtils.js

import { supabase } from '../supabase.js';
import { $, $$ } from '../utils.js';

// 공통 유틸리티 함수들을 DocUtils 객체에 담아 export 합니다.
export const DocUtils = {
    // 뷰 전환
    switchToView(views, viewName) {
        Object.values(views).forEach(view => view.classList.add('hidden'));
        views[viewName].classList.remove('hidden');
    },

    // 주문 목록 가져오기
    async fetchOrders(docType, listEl) {
        listEl.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-500">주문 목록을 불러오는 중...</td></tr>`;
        const searchTerm = $(`#${docType}-search-input`)?.value.trim() || '';
        try {
            let query = supabase.from('orders').select('id, order_number, order_date, customers(name)');
            if (searchTerm) {
                query = supabase.from('orders').select('id, order_number, order_date, customers!inner(name)').ilike('customers.name', `%${searchTerm}%`);
            }
            const { data, error } = await query.order('order_date', { ascending: false });
            if (error) throw error;
            this.renderOrderList(data, listEl);
        } catch (e) {
            listEl.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-red-500">목록 로딩 실패: ${e.message}</td></tr>`;
        }
    },

    printDocument() {
        // 1. body에 'is-printing' 클래스를 추가하여 print.css 스타일을 활성화합니다.
        document.body.classList.add('is-printing');

        // 2. 브라우저의 인쇄 대화 상자를 호출합니다.
        window.print();

        // 3. 인쇄 대화 상자가 닫힌 후 (성공/취소 무관) 클래스를 제거하여 화면 스타일을 복원합니다.
        //    setTimeout을 사용하여 print() 호출 후 약간의 지연을 줍니다.
        setTimeout(() => {
            document.body.classList.remove('is-printing');
        }, 500); // 0.5초 지연
    },

    // 주문 목록 렌더링
    renderOrderList(orders, listEl) {
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

    // 문서 저장
    async saveDocument(app) { // app 객체를 인자로 받음
        const saveBtn = app.pageEl.querySelector('button[data-action="save-document"]');
        saveBtn.disabled = true;
        saveBtn.textContent = '저장 중...';
        try {
            const printArea = $('#print-area');
            if (!printArea) throw new Error('저장할 문서 영역을 찾을 수 없습니다.');

            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = printArea.innerHTML;
            tempDiv.querySelectorAll('.no-print').forEach(el => el.remove());
            const htmlToSave = tempDiv.innerHTML;

            const orderId = app.documentData.order.id;
            const savedHtmlColumn = `saved_${app.docType}_html`;
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
    
    // 엑셀 내보내기
    exportToExcel(app) {
        const { order } = app.documentData;
        const table = app.views.doc.querySelector('.doc-table');
        if (!table) { alert('엑셀로 내보낼 테이블을 찾을 수 없습니다.'); return; }
        const headers = Array.from(table.querySelectorAll('thead th')).map(th => th.textContent);
        const dataRows = Array.from(table.querySelectorAll('tbody tr')).map(tr => {
            const row = {};
            Array.from(tr.cells).slice(0, headers.length).forEach((cell, i) => { row[headers[i]] = cell.textContent; });
            return row;
        });
        const worksheet = XLSX.utils.json_to_sheet(dataRows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, app.docType);
        XLSX.writeFile(workbook, `${app.docType.toUpperCase()}_${order.order_number || order.id}.xlsx`);
    },

    // 컨트롤 버튼이 포함된 HTML 래퍼
    getControlWrappedHtml(docHtml, isSaved, docType) {
        const backButtonAction = isSaved ? 'regenerate' : 'back-to-options';
        const buttonsHtml = `
            <button type="button" data-action="${backButtonAction}" class="btn-secondary text-sm">옵션 재설정</button>
            <button type="button" data-action="export-excel" class="btn-secondary text-sm">엑셀로 내보내기</button>
            <button type="button" data-action="print" class="btn-secondary text-sm">인쇄 (PDF 저장)</button>
            <button type="button" data-action="save-document" class="btn-primary text-sm">문서 저장</button>
        `;

        return `
            <div class="no-print mb-6 flex justify-between items-center">
                <button type="button" data-action="back-to-list" class="btn-secondary text-sm">&larr; 주문 목록으로</button>
                <div class="space-x-2">${buttonsHtml}</div>
            </div>
            <div id="print-area" class="bg-white p-8 md:p-12 shadow-lg text-sm document-container">${docHtml}</div>
        `;
    },
    
    // 드래그 앤 드롭 초기화
    initDragAndDrop(columnList) {
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
    }
};