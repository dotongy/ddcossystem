import { supabase } from "../supabase.js";
import { $ } from "../utils.js";
import { getAppState } from "../router.js"; // getAppState를 import합니다.

export const DashboardApp = {
  orderStatusChart: null,

  init() {
    this.loadStats();
    this.loadRecentOrders();
    this.loadOrderStatus();

    // [수정] 페이지가 로드될 때 버튼에 이벤트 리스너를 연결합니다.
    const page = $("#dashboard-page");
    if (page && !page.dataset.initialized) {
      page.addEventListener("click", this.handlePageClick.bind(this));
      page.dataset.initialized = "true";
    }
  },

  // [수정] 버튼 클릭을 처리하는 handlePageClick 함수를 추가합니다.
  handlePageClick(e) {
    const target = e.target.closest("button");
    if (!target) return;

    if (target.id === "dashboard-new-order-btn") {
      getAppState().formContext = { isEdit: false };
      window.location.hash = "order-form";
    } else if (target.id === "dashboard-new-customer-btn") {
      getAppState().formContext = { isEdit: false };
      window.location.hash = "customer-form";
    }
  },

  async loadStats() {
    const { count: custCount } = await supabase
      .from("customers")
      .select("*", { count: "exact", head: true });
    const { count: prodCount } = await supabase
      .from("products")
      .select("*", { count: "exact", head: true });
    const { count: ordCount } = await supabase
      .from("orders")
      .select("*", { count: "exact" })
      .neq("status", "배송완료");

    // [수정] ID를 새로운 템플릿에 맞게 변경합니다.
    $("#db-kpi-customers").textContent = custCount || 0;
    $("#db-kpi-products").textContent = prodCount || 0;
    $("#db-kpi-pending-orders").textContent = ordCount || 0;
  },

  async loadRecentOrders() {
    const listEl = $("#dashboard-recent-orders");
    listEl.innerHTML =
      '<tr><td colspan="5" class="p-4 text-center text-secondary">Loading...</td></tr>';
    const { data, error } = await supabase
      .from("orders")
      .select("*, customers(name)")
      .order("created_at", { ascending: false })
      .limit(5);

    if (error || !data || data.length === 0) {
      listEl.innerHTML =
        '<tr><td colspan="5" class="p-4 text-center text-secondary">No recent orders found.</td></tr>';
      return;
    }

    listEl.innerHTML = data
      .map(
        (o) => `
            <tr class="hover:bg-light">
                <td class="p-3 font-medium text-gray-900">${o.order_number || `#${o.id}`}</td>
                <td class="p-3 text-secondary">${o.customers ? o.customers.name : "N/A"}</td>
                <td class="p-3 text-secondary">${new Date(o.order_date).toLocaleDateString()}</td>
                <td class="p-3 text-secondary">₩${Number(o.total_amount || 0).toLocaleString()}</td>
                <td class="p-3 text-secondary">${o.status}</td>
            </tr>
        `,
      )
      .join("");
  },

  async loadOrderStatus() {
    const { data, error } = await supabase.from("orders").select("status");
    if (error || !data) return;

    const statusCounts = data.reduce((acc, { status }) => {
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const ctx = $("#dashboard-order-status-chart")?.getContext("2d");
    if (!ctx) return; // [수정] ctx가 없을 경우를 대비한 방어 코드

    if (this.orderStatusChart) this.orderStatusChart.destroy();
    
    this.orderStatusChart = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels: Object.keys(statusCounts),
        datasets: [
          {
            data: Object.values(statusCounts),
            backgroundColor: [
              '#3B82F6', '#10B981', '#F59E0B', '#6366F1', '#8B5CF6',
              '#EC4899', '#6B7280', '#D1D5DB', '#9CA3AF',
            ],
          },
        ],
      },
      options: { responsive: true, maintainAspectRatio: false },
    });
  },
};