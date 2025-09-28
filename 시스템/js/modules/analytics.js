import { supabase } from "../supabase.js";
import { $, $$ } from "../utils.js";

const toLocalISOString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * @file analytics.js
 * @description 매출 분석 및 데이터 시각화 기능을 담당하는 모듈
 */
export const AnalyticsApp = {
  charts: {},
  startDateInput: null,
  endDateInput: null,

  setup() {
    this.startDateInput = $("#analytics-start-date");
    this.endDateInput = $("#analytics-end-date");
  },

  async populateCustomerFilter() {
    const selectEl = $('#analytics-customer-filter');
    if (!selectEl) return;

    // 함수가 실행될 때마다 기존 고객 목록을 초기화 (중복 방지)
    selectEl.innerHTML = '<option value="all">전체 고객</option>';

    try {
      const { data: customers, error } = await supabase
        .from('customers')
        .select('id, name')
        .order('name', { ascending: true });
      
      if (error) throw error;

      customers.forEach(customer => {
        const option = document.createElement('option');
        option.value = customer.id;
        option.textContent = customer.name;
        selectEl.appendChild(option);
      });
    } catch (e) {
      console.error('Failed to load customers for filter:', e);
    }
  },

  init() {
    console.log("AnalyticsApp: Initializing...");
    this.setup(); // startDateInput, endDateInput을 여기서 설정합니다.

    const page = $("#analytics-page");
    if (page && !page.dataset.initialized) {

      // [핵심 수정 1] 존재하지 않는 filter-btn에 대한 리스너를 삭제합니다.
      // $("#analytics-filter-btn").addEventListener("click", () => this.loadData());

      // [핵심 수정 2] 날짜나 고객 필터가 '변경'될 때마다 자동으로 loadData를 호출합니다.
      this.startDateInput.addEventListener("change", () => this.loadData());
      this.endDateInput.addEventListener("change", () => this.loadData());
      $("#analytics-customer-filter").addEventListener("change", () => this.loadData());

      // 고객 필터 목록은 한 번만 채웁니다.
      this.populateCustomerFilter(); 

      page.dataset.initialized = "true";
    }

    // 페이지가 처음 로드될 때 기본 날짜를 설정합니다.
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - 30);

    // input의 value가 비어있을 때만 기본값을 설정하여, 사용자의 선택을 유지합니다.
    if (!this.endDateInput.value) {
        this.endDateInput.value = toLocalISOString(endDate);
    }
    if (!this.startDateInput.value) {
        this.startDateInput.value = toLocalISOString(startDate);
    }

    // 페이지 초기 로드 시 데이터를 불러옵니다.
    this.loadData();
  },

  async loadData() {
    const startDate = this.startDateInput.value;
    const endDate = this.endDateInput.value;
    const selectedCustomerId = $('#analytics-customer-filter').value; // 선택된 고객 ID 가져오기

    if (!startDate || !endDate) {
      alert("시작일과 종료일을 모두 선택해주세요.");
      return;
    }

    console.log(`AnalyticsApp: Loading data from ${startDate} to ${endDate}`);

    try {
      let query = supabase // query를 let으로 변경
        .from("orders")
        .select("*, customers(name, country, created_at)")
        .gte("order_date", startDate)
        .lte("order_date", endDate);

      // '전체 고객'이 아닌 특정 고객이 선택된 경우, 쿼리에 필터 추가
      if (selectedCustomerId && selectedCustomerId !== 'all') {
        query = query.eq('customer_id', selectedCustomerId);
      }

      const { data: orders, error: ordersError } = await query;

      if (ordersError) throw ordersError;

      if (orders.length === 0) {
        // 주문이 없으면 빈 차트를 그립니다.
        this.renderKPIs([], startDate, endDate);
        this.renderSalesTrendChart([]);
        this.renderTopProductsChart([]);
        this.renderTopCustomersChart([]);
        this.renderSalesByCountryChart([]);
        return;
      }

      // [수정] 2. 가져온 주문들의 ID 목록을 만듭니다.
      const orderIds = orders.map((o) => o.id);

      // [수정] 3. 주문 ID들을 이용해 관련된 order_items와 products 정보를 가져옵니다.
      const { data: orderItems, error: itemsError } = await supabase
        .from("order_items")
        .select("*, products(name_kr)")
        .in("order_id", orderIds);

      if (itemsError) throw itemsError;

      // [수정] 4. 주문 데이터에 주문 아이템 데이터를 합칩니다.
      const itemsByOrderId = orderItems.reduce((acc, item) => {
        if (!acc[item.order_id]) {
          acc[item.order_id] = [];
        }
        acc[item.order_id].push(item);
        return acc;
      }, {});

      orders.forEach((order) => {
        order.order_items = itemsByOrderId[order.id] || [];
      });

      // 2. '오늘'과 '7일 전' 날짜를 현지 시간 기준으로 계산
      const today = new Date();
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(today.getDate() - 7);

      // 3. '내일' 날짜를 계산하여 '오늘'의 마지막 시간까지 모두 포함하도록 함
      const tomorrow = new Date();
      tomorrow.setDate(today.getDate() + 1);

      // 4. Supabase 조회에 사용할 날짜 문자열 생성
      const oneWeekAgoStr = toLocalISOString(oneWeekAgo);
      const tomorrowStr = toLocalISOString(tomorrow);

      const { data: newCustomers, error: customersError } = await supabase
        .from("customers")
        .select("id")
        .gte("created_at", oneWeekAgoStr) // 7일 전 00:00:00 부터
        .lt("created_at", tomorrowStr);  // 내일 00:00:00 이전까지 (오늘 하루 전체 포함)

      if (customersError) throw customersError;

      // 이제 합쳐진 데이터를 사용하여 차트를 그립니다.
      this.renderKPIs(orders, startDate, endDate, newCustomers);
      this.renderSalesTrendChart(orders);
      this.renderTopProductsChart(orders);
      this.renderTopCustomersChart(orders);
      this.renderSalesByCountryChart(orders);
    } catch (e) {
      console.error("Error loading analytics data:", e);
      alert(`데이터 분석 중 오류가 발생했습니다: ${e.message}`);
    }
  },

  renderKPIs(orders, startDate, endDate, newCustomers = []) {
    // 다른 KPI들은 기존처럼 주문(orders) 데이터를 기반으로 계산합니다.
    const totalRevenue = orders.reduce(
        (sum, order) => sum + (order.total_amount || 0),
        0,
    );
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // --- 신규 고객 계산 로직 변경 ---
    // loadData에서 직접 전달받은 newCustomers 배열의 길이를 사용합니다.
    const newCustomersCount = newCustomers.length;
    // --- 변경 끝 ---

    $("#kpi-total-revenue").textContent =
        `₩${Math.round(totalRevenue).toLocaleString()}`;
    $("#kpi-total-orders").textContent = totalOrders.toLocaleString();
    $("#kpi-avg-order-value").textContent =
        `₩${Math.round(avgOrderValue).toLocaleString()}`;
    // 수정된 값으로 화면에 표시합니다.
    $("#kpi-new-customers").textContent = newCustomersCount.toLocaleString();
  },

  renderSalesTrendChart(orders) {
    const salesByDate = orders.reduce((acc, order) => {
      const date = order.order_date;
      acc[date] = (acc[date] || 0) + order.total_amount;
      return acc;
    }, {});

    const sortedDates = Object.keys(salesByDate).sort();
    const chartData = {
      labels: sortedDates,
      datasets: [
        {
          label: "일일 매출",
          data: sortedDates.map((date) => salesByDate[date]),
          borderColor: "#4f46e5",
          backgroundColor: "rgba(79, 70, 229, 0.1)",
          fill: true,
          tension: 0.1,
        },
      ],
    };
    this.createOrUpdateChart("sales-trend-chart", "line", chartData);
  },

  renderTopProductsChart(orders) {
    const productSales = orders
      .flatMap((o) => o.order_items)
      .reduce((acc, item) => {
        const name = item.products?.name_kr || "알 수 없는 상품";
        acc[name] = (acc[name] || 0) + item.quantity;
        return acc;
      }, {});

    const top5 = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const chartData = {
      labels: top5.map((p) => p[0]),
      datasets: [
        {
          label: "총 판매 수량",
          data: top5.map((p) => p[1]),
          backgroundColor: "#10b981",
        },
      ],
    };
    this.createOrUpdateChart("top-products-chart", "bar", chartData, {
      indexAxis: "y",
    });
  },

  renderTopCustomersChart(orders) {
    const selectedCustomerId = $('#analytics-customer-filter').value;
    const chartContainer = $('#top-customers-chart-container');
    if (!chartContainer) return;

    if (selectedCustomerId && selectedCustomerId !== 'all') {
        if (this.charts['top-customers-chart']) {
            this.charts['top-customers-chart'].destroy();
            delete this.charts['top-customers-chart'];
        }
        // [수정] 안내 메시지의 CSS 클래스를 text-secondary로 변경합니다.
        chartContainer.innerHTML = `<div class="flex items-center justify-center h-full text-secondary">특정 고객이 선택되어 이 차트는 표시되지 않습니다.</div>`;
        return;
    }

    if (!chartContainer.querySelector('canvas')) {
        chartContainer.innerHTML = `<canvas id="top-customers-chart"></canvas>`;
    }
    
    const customerSales = orders.reduce((acc, order) => {
        const name = order.customers?.name || "알 수 없는 고객";
        acc[name] = (acc[name] || 0) + order.total_amount;
        return acc;
    }, {});

    const top5 = Object.entries(customerSales)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
        
    const chartData = {
        labels: top5.map((c) => c[0]),
        datasets: [{
            label: "총 주문 금액",
            data: top5.map((c) => c[1]),
            backgroundColor: "#3b82f6", // primary color
        }, ],
    };

    this.createOrUpdateChart("top-customers-chart", "bar", chartData, {
        indexAxis: "y",
    });
  },

  renderSalesByCountryChart(orders) {
    const countrySales = orders.reduce((acc, order) => {
      const country = order.customers?.country || "기타";
      acc[country] = (acc[country] || 0) + order.total_amount;
      return acc;
    }, {});

    const sorted = Object.entries(countrySales).sort((a, b) => b[1] - a[1]);
    const chartData = {
      labels: sorted.map((c) => c[0]),
      datasets: [
        {
          data: sorted.map((c) => c[1]),
          backgroundColor: [
            "#ef4444",
            "#f97316",
            "#eab308",
            "#84cc16",
            "#22c55e",
            "#14b8a6",
            "#06b6d4",
            "#6366f1",
            "#8b5cf6",
            "#d946ef",
          ],
        },
      ],
    };
    this.createOrUpdateChart("sales-by-country-chart", "doughnut", chartData);
  },

  createOrUpdateChart(canvasId, type, data, options = {}) {
    const ctx = $(`#${canvasId}`)?.getContext("2d");
    if (!ctx) return;

    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    this.charts[canvasId] = new Chart(ctx, {
      type,
      data,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        ...options,
      },
    });
  },
};
