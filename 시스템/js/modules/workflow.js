// js/modules/workflow.js

import { supabase } from "../supabase.js";
import { $, $$ } from "../utils.js";

export const WorkflowApp = {
  boardEl: null,
  statuses: [
    "주문접수",
    "재고확인",
    "주문서확정",
    "패킹중",
    "서류준비중",
    "출고준비중",
    "배송중",
    "항구배송",
    "배송완료",
  ],
  draggedItem: null,

  setup() {
    this.boardEl = $("#workflow-board");
  },

  async init() {
    if (!this.boardEl) this.setup();

    this.boardEl.innerHTML = '<p class="text-slate-500">Loading orders...</p>';
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          "*, co_prepared, is_symphony_registered, payment_status, customers(name, country)",
        )
        .eq("is_archived", false)
        .order("created_at", { ascending: false });

      if (error) {
        if (error.code === "42703") {
          this.boardEl.innerHTML = `<div class="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><p class="font-bold">데이터베이스 오류</p><p>워크플로우 기능에 필요한 컬럼이 'orders' 테이블에 없습니다. ('is_archived' 등) 데이터베이스 스키마를 확인하고 업데이트해주세요.</p></div>`;
        } else {
          throw error;
        }
      } else {
        this.renderBoard(orders);
      }
    } catch (e) {
      this.boardEl.innerHTML = `<p class="text-red-500">Failed to load workflow: ${e.message}</p>`;
    }
  },

  renderBoard(orders) {
    this.boardEl.innerHTML = "";
    const ordersByStatus = this.statuses.reduce((acc, status) => {
      acc[status] = [];
      return acc;
    }, {});

    orders.forEach((order) => {
      if (ordersByStatus[order.status]) {
        ordersByStatus[order.status].push(order);
      }
    });

    this.statuses.forEach((status) => {
      const isDoneColumn = status === "배송완료";
      const columnEl = document.createElement("div");
      // [디자인 수정] 컬럼 배경색 및 전체적인 스타일 변경
      columnEl.className = "workflow-column bg-light rounded-lg flex flex-col flex-shrink-0 w-80";
      columnEl.dataset.status = status;

      const headerEl = document.createElement("div");
      // [디자인 수정] 헤더 스타일 변경 (패딩, 텍스트 색상 등)
      headerEl.className = "flex justify-between items-center p-4 border-b border-border";
      headerEl.innerHTML = `<h3 class="font-bold text-gray-800">${status}</h3><span class="bg-gray-200 text-secondary font-bold text-xs rounded-full px-2 py-1">${ordersByStatus[status].length}</span>`;
      
      const cardsContainer = document.createElement("div");
      // [디자인 수정] 카드 컨테이너에 패딩 추가
      cardsContainer.className = "p-4 space-y-3 overflow-y-auto flex-grow";
      
      if (ordersByStatus[status].length > 0) {
        cardsContainer.innerHTML = ordersByStatus[status]
          .map((order) => this.createCardHtml(order, isDoneColumn))
          .join("");
      } else {
        cardsContainer.innerHTML = '<div class="text-center text-sm text-secondary pt-4">No orders in this stage.</div>';
      }
      
      columnEl.appendChild(headerEl);
      columnEl.appendChild(cardsContainer);
      this.boardEl.appendChild(columnEl);
    });
    this.addEventListeners();
  },

  createCardHtml(order, isDone) {
    const customerName = order.customers ? order.customers.name : "Unknown Customer";
    const customerCountry = order.customers ? order.customers.country : "N/A";
    // [디자인 수정] 카드 스타일 변경 (그림자, 테두리 등)
    const cardClasses = isDone
      ? "bg-white/70 text-secondary border-l-4 border-gray-400"
      : "bg-white shadow-sm hover:shadow-md transition-shadow border-l-4 border-primary";
    const textDecoration = isDone ? "line-through" : "";
    
    // [디자인 수정] 입금 상태 버튼 스타일 변경
    const paymentStatuses = ["미입금", "계약금", "완불"];
    const currentPaymentStatus = order.payment_status || "미입금";
    const paymentButtonsHtml = paymentStatuses
      .map((status) => {
        const isActive = status === currentPaymentStatus;
        const activeClass = isActive ? "bg-primary text-white" : "bg-gray-200 text-secondary hover:bg-gray-300";
        return `<button data-action="set-payment-status" data-order-id="${order.id}" data-status="${status}" class="text-xs font-bold py-1 px-2 rounded-md transition-colors ${activeClass}">${status}</button>`;
      })
      .join("");
      
    // [디자인 수정] 보관하기 버튼 스타일 변경
    const archiveButtonHtml = isDone
      ? `<div class="mt-3 pt-3 border-t border-border"><button data-action="archive-order" data-order-id="${order.id}" class="w-full bg-white border border-border text-secondary font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm">보관하기</button></div>`
      : "";

    return `
        <div id="order-card-${order.id}" class="workflow-card p-4 rounded-lg ${cardClasses}" draggable="true" data-order-id="${order.id}">
            <p class="font-bold text-base text-gray-800 ${textDecoration}">${customerName}</p>
            <p class="text-sm text-secondary mb-2 ${textDecoration}">${customerCountry}</p>
            <div class="flex justify-between items-center text-xs text-gray-400 mb-3">
                <span class="${textDecoration}">#${order.order_number || order.id}</span>
                <span class="${textDecoration}">${new Date(order.created_at).toLocaleDateString()}</span>
            </div>
            <div class="border-t border-border pt-3 mt-3 space-y-3">
                <label class="flex items-center text-sm cursor-pointer"><input type="checkbox" class="status-checkbox h-4 w-4 rounded border-border text-primary focus:ring-primary" data-action="toggle-co" data-order-id="${order.id}" ${order.co_prepared ? "checked" : ""}><span class="ml-2 ${order.co_prepared ? "font-semibold text-primary" : "text-secondary"}">C/O Prepared</span></label>
                <label class="flex items-center text-sm cursor-pointer"><input type="checkbox" class="status-checkbox h-4 w-4 rounded border-border text-primary focus:ring-primary" data-action="toggle-symphony" data-order-id="${order.id}" ${order.is_symphony_registered ? "checked" : ""}><span class="ml-2 ${order.is_symphony_registered ? "font-semibold text-primary" : "text-secondary"}">심포니 등록</span></label>
                <div class="flex items-center text-sm"><span class="mr-3 font-medium text-gray-700">입금:</span><div class="flex items-center space-x-1">${paymentButtonsHtml}</div></div>
            </div>
            ${archiveButtonHtml}
        </div>`;
  },

  addEventListeners() {
    const cards = $$(".workflow-card");
    const columns = $$(".workflow-column");
    cards.forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        if (e.target.classList.contains("workflow-card")) {
          this.draggedItem = e.target;
          setTimeout(() => e.target.classList.add("dragging"), 0);
        }
      });
      card.addEventListener("dragend", () => {
        if (this.draggedItem) this.draggedItem.classList.remove("dragging");
        this.draggedItem = null;
      });
    });
    columns.forEach((column) => {
      column.addEventListener("dragover", (e) => {
        e.preventDefault();
        column.classList.add("drag-over");
      });
      column.addEventListener("dragleave", () => {
        column.classList.remove("drag-over");
      });
      column.addEventListener("drop", (e) => {
        e.preventDefault();
        column.classList.remove("drag-over");
        if (
          this.draggedItem &&
          this.draggedItem.parentElement !== column.querySelector(".space-y-3")
        ) {
          const newStatus = column.dataset.status;
          const orderId = this.draggedItem.dataset.orderId;
          column.querySelector(".space-y-3").appendChild(this.draggedItem);
          this.updateOrderStatus(orderId, newStatus);
        }
      });
    });
    this.boardEl.addEventListener("click", async (e) => {
      const target = e.target.closest("button, input");
      if (!target) return;
      const action = target.dataset.action;
      const orderId = target.dataset.orderId;
      if (!action) return;

      if (target.matches(".status-checkbox")) {
        const isChecked = target.checked;
        const label = target.nextElementSibling;
        label.classList.toggle("font-semibold", isChecked);
        label.classList.toggle("text-indigo-700", isChecked);
        if (action === "toggle-co")
          await this.updateCoStatus(orderId, isChecked);
        else if (action === "toggle-symphony")
          await this.updateSymphonyStatus(orderId, isChecked);
      } else if (action === "set-payment-status") {
        const newStatus = target.dataset.status;
        await this.updatePaymentStatus(orderId, newStatus, target);
      } else if (action === "archive-order") {
        await this.archiveOrder(orderId);
      }
    });
  },

  async archiveOrder(orderId) {
    if (
      !confirm(
        `이 주문을 보관하시겠습니까?\n보관된 주문은 워크플로우 화면에서 사라집니다.`,
      )
    )
      return;
    try {
      const { error } = await supabase
        .from("orders")
        .update({ is_archived: true })
        .eq("id", orderId);
      if (error) throw error;
      const cardToRemove = $(`#order-card-${orderId}`);
      if (cardToRemove) {
        cardToRemove.style.transition = "opacity 0.5s ease";
        cardToRemove.style.opacity = "0";
        setTimeout(() => cardToRemove.remove(), 500);
      }
    } catch (e) {
      console.error("Failed to archive order:", e);
      alert(`주문 보관에 실패했습니다: ${e.message}`);
    }
  },

  async updateOrderStatus(orderId, newStatus) {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", orderId);
      if (error) throw error;
      await this.init();
    } catch (e) {
      console.error("Failed to update order status:", e);
      alert("주문 상태 업데이트에 실패했습니다.");
      await this.init();
    }
  },
  async updateCoStatus(orderId, isChecked) {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ co_prepared: isChecked })
        .eq("id", orderId);
      if (error) throw error;
    } catch (e) {
      console.error("Failed to update C/O status:", e);
      alert("C/O 준비 상태 업데이트에 실패했습니다.");
    }
  },
  async updateSymphonyStatus(orderId, isChecked) {
    try {
      const { error } = await supabase
        .from("orders")
        .update({ is_symphony_registered: isChecked })
        .eq("id", orderId);
      if (error) throw error;
    } catch (e) {
      console.error("Failed to update Symphony status:", e);
      alert("심포니 등록 상태 업데이트에 실패했습니다.");
    }
  },
  async updatePaymentStatus(orderId, newStatus, clickedButton) {
    const buttonGroup = clickedButton.parentElement;
    buttonGroup.querySelectorAll("button").forEach((btn) => {
      btn.classList.remove("bg-indigo-600", "text-white");
      btn.classList.add("bg-slate-300", "text-slate-700", "hover:bg-slate-400");
    });
    clickedButton.classList.add("bg-indigo-600", "text-white");
    clickedButton.classList.remove(
      "bg-slate-300",
      "text-slate-700",
      "hover:bg-slate-400",
    );
    try {
      const { error } = await supabase
        .from("orders")
        .update({ payment_status: newStatus })
        .eq("id", orderId);
      if (error) throw error;
    } catch (e) {
      console.error("Failed to update payment status:", e);
      alert("입금 상태 업데이트에 실패했습니다.");
      await this.init();
    }
  },
};
