/**
 * @file templates.js
 * @description 각 페이지의 HTML 구조를 정의하는 템플릿 함수 모음
 */
export function getPageTemplates() {
  return {
    login: `
            <div class="min-h-screen flex items-center justify-center bg-gray-50">
                <div class="max-w-md w-full space-y-8 p-8">
                    <div class="text-center">
                        <div class="flex justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-indigo-600" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
                            </svg>
                        </div>
                        <h2 class="text-3xl font-bold text-gray-900">My System</h2>
                        <p class="mt-2 text-gray-600">계정에 로그인하세요</p>
                    </div>
                    <div class="bg-white p-8 rounded-xl shadow-lg">
                        <form id="login-form" class="space-y-6">
                            <div>
                                <label for="email" class="block text-sm font-medium text-gray-700">이메일</label>
                                <input type="email" name="email" id="email" required 
                                       class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                                       placeholder="이메일을 입력하세요">
                            </div>
                            <div>
                                <label for="password" class="block text-sm font-medium text-gray-700">비밀번호</label>
                                <input type="password" name="password" id="password" required 
                                       class="mt-1 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" 
                                       placeholder="비밀번호를 입력하세요">
                            </div>
                            <div id="auth-error" class="text-red-600 text-sm text-center hidden"></div>
                            <div>
                                <button type="submit" class="w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 focus:ring-2 focus:ring-indigo-500 font-medium">
                                    로그인
                                </button>
                            </div>
                            <div class="text-center">
                                <a href="#" id="show-signup" class="text-indigo-600 hover:text-indigo-500 text-sm">회원가입</a>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        `,
    dashboard: `
            <header class="flex justify-between items-center mb-6">
                <h2 class="text-2xl font-bold text-gray-800">대시보드</h2>
                <div class="flex items-center space-x-2">
                    <button id="dashboard-new-customer-btn" class="bg-white border border-border text-secondary font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm">새 고객 등록</button>
                    <button id="dashboard-new-order-btn" class="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark text-sm">+ 새 주문 등록</button>
                </div>
            </header>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h3 class="text-sm font-medium text-secondary">총 고객 수</h3>
                    <p id="db-kpi-customers" class="text-3xl font-bold text-gray-800 mt-2">0</p>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h3 class="text-sm font-medium text-secondary">총 상품 수</h3>
                    <p id="db-kpi-products" class="text-3xl font-bold text-gray-800 mt-2">0</p>
                </div>
                <div class="bg-white p-6 rounded-lg shadow-md">
                    <h3 class="text-sm font-medium text-secondary">처리 중인 주문</h3>
                    <p id="db-kpi-pending-orders" class="text-3xl font-bold text-gray-800 mt-2">0</p>
                </div>
            </div>
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div class="lg:col-span-2 bg-white p-6 rounded-xl shadow-md">
                    <h3 class="text-lg font-semibold mb-4">Recent Orders (Last 5)</h3>
                    <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead class="bg-slate-50"><tr><th class="p-2">Order #</th><th class="p-2">Customer</th><th class="p-2">Date</th><th class="p-2">Amount</th><th class="p-2">Status</th></tr></thead><tbody id="dashboard-recent-orders"></tbody></table></div>
                </div>
                <div class="bg-white p-6 rounded-xl shadow-md flex flex-col">
                    <h3 class="text-lg font-semibold mb-4 flex-shrink-0">Order Status Overview</h3>
                    <div class="relative flex-grow min-h-[250px]"><canvas id="dashboard-order-status-chart"></canvas></div>
                </div>
            </div>`,
    customers: `
            <header class="flex justify-between items-center mb-8">
        <div>
            <h2 class="text-3xl font-bold">Customers</h2>
            <div class="flex items-center space-x-4 mt-2">
                <select id="country-filter" class="input w-48"></select>
                <input type="text" id="customer-search-input" placeholder="Search by name or email..." class="input w-64">
            </div>
        </div>
        <div class="flex items-center space-x-2">
            <button id="export-all-customers-btn" class="btn-secondary">전체 내보내기</button>
            <button id="download-customer-template-btn" class="btn-secondary">템플릿 다운로드</button>
            <button id="import-customer-excel-btn" class="btn-secondary">엑셀로 가져오기</button>
            <button id="send-email-btn" class="btn-primary bg-green-600 hover:bg-green-700 hidden">Send Email</button>
            
            <button id="delete-selected-customers-btn" class="btn-secondary bg-red-500 text-white hover:bg-red-600 hidden">선택 항목 삭제</button>
            <button id="add-customer-btn" class="btn-primary">New Customer</button>
        </div>
    </header>
            <div class="bg-white p-4 rounded-xl shadow-md">
                <div class="overflow-x-auto">
                    <table class="w-full text-left">
                        <thead class="bg-slate-50"><tr>
    <th class="p-3 w-4"><input type="checkbox" id="select-all-customers-checkbox"></th>
    <th class="p-3">Company Name</th><th class="p-3">Contact</th><th class="p-3">Email</th><th class="p-3">Country</th>
    <th class="p-3">Source</th> <th class="p-3 text-center">EU</th><th class="p-3">Address</th><th class="p-3">Date Added</th><th class="p-3 text-center">Card</th><th class="p-3 text-center"></th>
</tr></thead>
                        <tbody id="customer-list"></tbody>
                    </table>
                </div>
                <div id="customer-pagination" class="mt-4 flex justify-center items-center space-x-2 p-2"></div>
            </div>`,
    "customer-form": `
            <header class="flex justify-between items-center mb-8"><h2 id="customer-form-title" class="text-3xl font-bold">New Customer</h2></header>
            <form id="customer-form" class="bg-white p-8 rounded-xl shadow-md">
                <input type="hidden" id="customer-id" name="id">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div><label for="name" class="label">Company Name</label><input type="text" id="name" name="name" required class="input mt-1"></div>
                    <div><label for="contact_person" class="label">Contact Person</label><input type="text" id="contact_person" name="contact_person" class="input mt-1"></div>
                    <div><label for="email" class="label">Email</label><input type="email" id="email" name="email" required class="input mt-1"></div>
                    <div><label for="phone" class="label">Phone</label><input type="tel" id="phone" name="phone" class="input mt-1"></div>
                    <div><label for="country" class="label">Country</label><select id="country" name="country" class="input mt-1"></select></div>
                    <div class="md:col-span-2"><label for="address" class="label">Address</label><textarea id="address" name="address" rows="3" class="input mt-1"></textarea></div>
                    <div class="md:col-span-2 flex items-center"><input type="checkbox" id="has_business_card" name="has_business_card" class="h-4 w-4 rounded"><label for="has_business_card" class="ml-2 text-sm font-medium">Business Card Received</label></div>
                </div>
                <div id="customer-error-message" class="mt-6 p-3 text-sm text-red-700 bg-red-100 rounded-lg hidden"></div>
                <div class="mt-8 flex justify-end space-x-2"><button type="button" id="customer-cancel-btn" class="btn-secondary">Cancel</button><button type="submit" id="customer-save-btn" class="btn-primary w-20">Save</button></div>
            </form>`,
    products: `
      <header class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold text-gray-800">상품 관리</h2>
        <div class="flex items-center space-x-2">
            <button id="download-product-template-btn" class="bg-white border border-border text-secondary font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm">템플릿 다운로드</button>
            <button id="import-product-excel-btn" class="bg-white border border-border text-secondary font-semibold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm">Excel 가져오기</button>
            <button id="add-product-btn" class="bg-primary text-white font-bold py-2 px-4 rounded-lg hover:bg-primary-dark text-sm">+ 새 상품 등록</button>
        </div>
      </header>
      
      <div class="mb-4 bg-white p-4 rounded-lg shadow-md">
        <div class="flex justify-between items-center">
            <div class="flex items-center space-x-4">
                <div class="relative">
                    <input type="text" id="product-search-input" placeholder="상품명(국문) 검색..." class="w-64 pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                    <span class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd" /></svg>
                    </span>
                </div>
                 <button id="product-view-all-btn" class="text-sm text-secondary hover:text-primary font-semibold">전체 보기</button>
            </div>
            <div id="bulk-action-container" class="flex items-center space-x-2">
                <button id="export-all-products-btn" class="bg-white border border-border text-secondary font-bold py-2 px-4 rounded-lg hover:bg-gray-50 text-sm">전체 내보내기</button>
                <button id="delete-selected-products-btn" class="hidden bg-danger text-white font-bold py-2 px-4 rounded-lg hover:bg-red-700 text-sm">선택 삭제</button>
            </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow-md overflow-hidden">
        <table class="min-w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="p-4 w-12 text-center"><input type="checkbox" id="select-all-products-checkbox" class="h-4 w-4"></th>
              <th class="p-4 w-16">Image</th>
              <th class="p-4 text-left">PRODUCT NAME (KR)</th>
              <th class="p-4 w-32 text-right">RETAIL PRICE</th>
              <th class="p-4 w-32 text-right">SUPPLY PRICE</th>
              <th class="p-4 w-32 text-right">EXPORT PRICE</th>
              <th class="p-4 w-32 text-right">BOX PRICE</th>
              <th class="p-4 w-32 text-right">SAMPLE PRICE</th>
              <th class="p-4 w-32 text-center">관리</th>
            </tr>
          </thead>
          <tbody id="product-list" class="divide-y divide-border">
          </tbody>
        </table>
      </div>
      <div id="product-pagination" class="mt-4 flex justify-center"></div>

      <div id="product-detail-panel" class="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-xl transform translate-x-full transition-transform duration-300 ease-in-out z-50 hidden">
        <div class="flex flex-col h-full">
            <header class="p-6 bg-light border-b border-border flex justify-between items-center">
                <h2 id="panel-product-name" class="text-xl font-bold text-gray-800">상품 상세 정보</h2>
                <button id="close-detail-panel-btn" class="text-gray-500 hover:text-gray-800 text-2xl">&times;</button>
            </header>
            <div class="p-6 flex-grow overflow-y-auto">
                <div class="grid grid-cols-3 gap-8">
                    <div class="col-span-1">
                        <img id="panel-image" src="https://placehold.co/300x300/e2e8f0/e2e8f0?text=." alt="Product Image" class="w-full h-auto rounded-lg border">
                    </div>
                    <div class="col-span-2 space-y-4">
                        <div><label class="block text-sm font-medium text-gray-500">상품명 (한글)</label><p id="panel-name_kr" class="mt-1 text-lg text-gray-900"></p></div>
                        <div><label class="block text-sm font-medium text-gray-500">상품명 (영문)</label><p id="panel-name_en" class="mt-1 text-lg text-gray-900"></p></div>
                        <div><label class="block text-sm font-medium text-gray-500">바코드</label><p id="panel-barcode" class="mt-1 text-lg text-gray-900"></p></div>
                    </div>
                </div>
                <div class="mt-8 border-t border-border pt-6 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4">
                    <div class="info-group"><h3 class="font-semibold text-gray-800 mb-2 border-b pb-1">가격 정보</h3>
                        <p><strong class="w-24 inline-block">판매가:</strong> <span id="panel-retail_price"></span></p>
                        <p><strong class="w-24 inline-block">공급가:</strong> <span id="panel-supply_price"></span></p>
                        <p><strong class="w-24 inline-block">수출가:</strong> <span id="panel-export_price"></span></p>
                    </div>
                    <div class="info-group"><h3 class="font-semibold text-gray-800 mb-2 border-b pb-1">물류 정보</h3>
                        <p><strong class="w-24 inline-block">HS Code:</strong> <span id="panel-hs_code"></span></p>
                        <p><strong class="w-24 inline-block">박스 입수량:</strong> <span id="panel-inbox_quantity"></span> / <span id="panel-outbox_quantity"></span></p>
                        <p><strong class="w-24 inline-block">총 중량(Kg):</strong> <span id="panel-gross_weight"></span></p>
                        <p><strong class="w-24 inline-block">CBM:</strong> <span id="panel-cbm"></span></p>
                    </div>
                    <div class="info-group col-span-2"><h3 class="font-semibold text-gray-800 mb-2 border-b pb-1">기타 정보</h3>
                        <p><strong class="w-24 inline-block">제조사:</strong> <span id="panel-manufacturer"></span></p>
                        <p><strong class="w-24 inline-block">용량:</strong> <span id="panel-volume"></span></p>
                        <p><strong class="w-24 inline-block">설명:</strong> <span id="panel-description" class="whitespace-pre-wrap"></span></p>
                    </div>
                </div>
            </div>
            <footer class="p-6 bg-light border-t border-border flex justify-end space-x-2">
                <button id="panel-delete-btn" class="btn-danger">삭제</button>
                <button id="panel-edit-btn" class="btn-primary">수정하기</button>
            </footer>
        </div>
      </div>
      <div id="product-detail-overlay" class="fixed inset-0 bg-black bg-opacity-50 z-40 hidden"></div>
    `,

    "product-form": `
            <header class="flex justify-between items-center mb-8"><h2 id="product-form-title" class="text-3xl font-bold">New Product</h2></header>
            <form id="product-form" class="bg-white p-8 rounded-xl shadow-md space-y-8">
                <input type="hidden" id="product-id" name="id">
                
                <div>
                    <h3 class="font-bold text-lg border-b pb-2 mb-4">기본 정보</h3>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div><label for="name_kr" class="label">제품명 (국문)</label><input type="text" name="name_kr" id="name_kr" class="input mt-1" required></div>
                        <div><label for="name_en" class="label">제품명 (영문)</label><input type="text" name="name_en" id="name_en" class="input mt-1"></div>
                        <div><label for="manufacturer" class="label">제조사</label><input type="text" name="manufacturer" id="manufacturer" class="input mt-1"></div>
                        <div><label for="hs_code" class="label">HS CODE</label><input type="text" name="hs_code" id="hs_code" class="input mt-1"></div>
                        <div><label for="barcode" class="label">Barcode</label><input type="text" name="barcode" id="barcode" class="input mt-1"></div>
                        <div><label for="volume" class="label">용량 (Volume)</label><input type="text" name="volume" id="volume" class="input mt-1"></div>
                        <div class="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-6 border-t pt-6 mt-6">
                            <div><label for="cpnp_number" class="label">CPNP</label><input type="text" name="cpnp_number" id="cpnp_number" class="input mt-1"></div>
                            <div><label for="scpn_number" class="label">SCPN</label><input type="text" name="scpn_number" id="scpn_number" class="input mt-1"></div>
                            <div><label for="mocra_number" class="label">MoCRA</label><input type="text" name="mocra_number" id="mocra_number" class="input mt-1"></div>
                        </div>               
                    </div>
                </div>

                <div>
                    <h3 class="font-bold text-lg border-b pb-2 mb-4">가격 정보</h3>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div><label for="retail_price" class="label">소비자가 (Retail)</label><input type="text" name="retail_price" id="retail_price" class="input mt-1"></div>
                        <div><label for="supply_price" class="label">공급가 (Vendor 1)</label><input type="text" name="supply_price" id="supply_price" class="input mt-1"></div>
                        <div><label for="export_price" class="label">수출가 (Vendor 2)</label><input type="text" name="export_price" id="export_price" class="input mt-1"></div>
                        <div><label for="vendor_price_1" class="label">박스 단가 (Box Price)</label><input type="text" name="vendor_price_1" id="vendor_price_1" class="input mt-1"></div>
                        <div><label for="sample_price" class="label">샘플 단가 (Sample Price)</label><input type="text" name="sample_price" id="sample_price" class="input mt-1"></div>
                    </div>
                </div>

                <div>
                    <h3 class="font-bold text-lg border-b pb-2 mb-4">포장 및 중량 정보</h3>
                    <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div><label for="inbox_quantity" class="label">인박스 수량</label><input type="number" name="inbox_quantity" id="inbox_quantity" class="input mt-1"></div>
                        <div><label for="outbox_quantity" class="label">아웃박스 수량</label><input type="number" name="outbox_quantity" id="outbox_quantity" class="input mt-1"></div>
                        <div><label for="outbox_size" class="label">아웃박스 사이즈 (W/D/H)</label><input type="text" name="outbox_size" id="outbox_size" class="input mt-1"></div>
                        <div><label for="cbm" class="label">CBM (m³)</label><input type="number" step="0.001" name="cbm" id="cbm" class="input mt-1"></div>
                        <div><label for="unit_weight" class="label">단위 중량 (g)</label><input type="number" step="0.1" name="unit_weight" id="unit_weight" class="input mt-1"></div>
                        <div><label for="gross_weight" class="label">총 중량 (Kg)</label><input type="number" step="0.1" name="gross_weight" id="gross_weight" class="input mt-1"></div>
                        <div><label for="net_weight" class="label">순 중량 (Kg)</label><input type="number" step="0.1" name="net_weight" id="net_weight" class="input mt-1"></div>
                    </div>
                </div>
                
                <div>
                    <h3 class="font-bold text-lg border-b pb-2 mb-4">추가 정보</h3>
                    <div class="space-y-4">
                        <div><label for="image_url" class="label">이미지 URL</label><input type="text" name="image_url" id="image_url" class="input mt-1"></div>
                        <div><label for="description" class="label">상세 설명</label><textarea name="description" id="description" rows="4" class="input mt-1"></textarea></div>
                    </div>
                </div>

                <div id="product-error-message" class="p-3 text-sm text-red-700 bg-red-100 rounded-lg hidden"></div>
                <div class="mt-8 flex justify-end space-x-2"><button type="button" id="product-cancel-btn" class="btn-secondary">Cancel</button><button type="submit" id="product-save-btn" class="btn-primary">Save</button></div>
            </form>`,
   "order-form": `
      <form id="order-form" class="max-w-7xl mx-auto space-y-6">
        <input type="hidden" id="order-id" name="id">
        
        <header>
            <h1 id="order-form-title" class="text-3xl font-bold text-gray-800">신규 주문 작성</h1>
            <p class="text-secondary mt-1">신규 주문서를 작성하거나 기존 주문을 수정합니다.</p>
        </header>

        <div class="bg-white p-6 rounded-xl shadow-md">
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div class="sm:col-span-2">
                    <label for="customer-search-input" class="label">고객사</label>
                    <div class="relative mt-1">
                        <input type="text" id="customer-search-input" class="input" placeholder="고객명으로 검색..." autocomplete="off">
                        <input type="hidden" id="order-customer-id" name="customer_id">
                        <div id="customer-dropdown" class="absolute z-10 w-full bg-white border border-border rounded-lg mt-1 shadow-lg top-full hidden"></div>
                    </div>
                    <button type="button" id="show-add-customer-modal-btn" class="text-sm text-primary hover:underline mt-1.5">+ 신규 고객 등록</button>
                </div>
                <div>
                    <label for="order-date" class="label">주문일</label>
                    <input type="date" id="order-date" name="order_date" class="input mt-1">
                </div>
                <div>
                    <label for="order-number" class="label">주문번호</label>
                    <input type="text" id="order-number" name="order_number" class="input mt-1">
                </div>
                <div class="sm:col-span-2 lg:col-span-4">
                    <label for="status" class="label">주문상태</label>
                    <select id="status" name="status" class="input mt-1">
                        <option value="주문접수">주문접수</option>
                        <option value="결제대기">결제대기</option>
                        <option value="결제완료">결제완료</option>
                        <option value="배송준비중">배송준비중</option>
                        <option value="배송중">배송중</option>
                        <option value="배송완료">배송완료</option>
                        <option value="주문취소">주문취소</option>
                    </select>
                </div>
            </div>
        </div>
        <div class="bg-white rounded-xl shadow-md">
            <header class="p-4 border-b border-border flex justify-between items-center">
                <h2 class="text-xl font-bold">주문 상품</h2>
                <div class="flex items-center space-x-2">
                    <select id="price-type-select" class="input input-sm w-32">
                        <option value="retail_price">판매가</option>
                        <option value="supply_price">공급가</option>
                        <option value="export_price">수출가</option>
                    </select>
                    <button type="button" id="add-product-modal-btn" class="btn-primary text-sm">목록에서 상품 추가</button>
                    <button type="button" id="add-oem-item-btn" class="btn-secondary text-sm">OEM 상품 추가</button>
                </div>
            </header>
            <div class="p-2">
                <div class="overflow-x-auto">
                    <table class="w-full text-left min-w-[1000px]">
                        <thead class="bg-light">
                            <tr>
                                <th class="p-3 w-10"></th>
                                <th class="p-3">상품명</th>
                                <th class="p-3 w-24">수량</th>
                                <th class="p-3 w-36 text-right">단가(KRW)</th>
                                <th id="additional-cost-header" class="p-3 w-36 text-right">추가 비용</th>
                                <th class="p-3 w-36 text-right">단가(USD)</th>
                                <th class="p-3 w-36 text-right">소계(KRW)</th>
                                <th class="p-3 w-36 text-right">소계(USD)</th>
                                <th class="p-3 w-16 text-center"></th>
                            </tr>
                        </thead>
                        <tbody id="order-items-list"></tbody>
                    </table>
                </div>
            </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            <div class="bg-white p-6 rounded-xl shadow-md space-y-4">
                <div>
                    <label for="additional-cost-label-input" class="label">추가 비용 이름</label>
                    <input type="text" id="additional-cost-label-input" class="input mt-1" placeholder="예: 할인, 배송비" value="추가 비용">
                </div>
                <div>
                    <label class="label">추가 비용 입력 통화</label>
                    <div id="additional-cost-currency-toggle" class="flex items-center p-1 bg-gray-200 rounded-lg w-min mt-1">
                        <button type="button" data-currency="krw" class="currency-toggle-btn active-currency-toggle">KRW</button>
                        <button type="button" data-currency="usd" class="currency-toggle-btn">USD</button>
                    </div>
                </div>
                 <div>
                    <label for="exchange-rate" class="label">환율 (KRW/USD)</label>
                    <input type="number" step="0.01" id="exchange-rate" name="exchange_rate" class="input mt-1">
                </div>
            </div>
            <div class="bg-white p-6 rounded-xl shadow-md space-y-3">
                <div class="flex justify-between items-center text-gray-600">
                    <span>상품 소계 (Subtotal)</span>
                    <span id="subtotal-amount-krw">₩0</span>
                </div>
                 <div class="flex justify-between items-center text-2xl font-bold text-gray-800 pt-3 border-t">
                    <span>최종 합계 (Total)</span>
                    <span id="total-amount-krw">₩0</span>
                </div>
                <div class="flex justify-between items-center text-gray-500 text-right">
                    <span></span>
                    <span id="total-amount-usd">$0.00</span>
                </div>
            </div>
        </div>

        <div class="flex justify-end space-x-2 pt-4">
            <button type="button" id="order-cancel-btn" class="btn-secondary">취소</button>
            <button type="submit" id="order-save-btn" class="btn-primary">저장</button>
        </div>
      </form>

    <div id="product-select-modal" class="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div class="bg-white rounded-xl shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
          <header class="p-6 border-b border-border flex justify-between items-center flex-shrink-0">
              <h2 class="text-2xl font-bold text-gray-800">주문 상품 추가</h2>
              <button type="button" id="close-product-modal-btn" class="text-gray-400 hover:text-gray-700 text-2xl">&times;</button>
          </header>
          <div class="p-6 flex-grow flex flex-col md:flex-row gap-6 min-h-0"> 
              <div class="flex flex-col flex-1 h-full"> 
                  <div class="relative mb-4 flex-shrink-0">
                      <div class="flex items-center w-full border border-border rounded-lg bg-white focus-within:ring-2 focus-within:ring-primary">
                          <i class="fa-solid fa-search text-gray-400 px-3"></i>
                          <input type="text" id="modal-product-search" placeholder="상품명으로 검색..." class="w-full py-2 bg-transparent focus:outline-none">
                      </div>
                  </div>
                  <div class="overflow-y-auto border border-border rounded-lg flex-grow">
                      <table class="w-full text-left">
                          <thead class="bg-light sticky top-0">
                              <tr>
                                  <th class="p-3 text-center w-12"><input type="checkbox" id="modal-select-all-products"></th>
                                  <th class="p-3" colspan="2">상품 정보</th>
                              </tr>
                          </thead>
                          <tbody id="modal-product-list"></tbody>
                      </table>
                  </div>
              </div>
              <div class="flex flex-col flex-1 h-full bg-light rounded-lg p-4 border border-border"> 
                  <div class="flex justify-between items-center mb-4 flex-shrink-0">
                      <h3 class="font-bold text-gray-800">선택된 상품 목록</h3>
                      <p id="staged-item-counter" class="text-sm text-secondary">총 0개</p>
                  </div>
                  <div class="overflow-y-auto flex-grow space-y-2"> 
                      <table class="w-full text-left">
                          <tbody id="modal-selected-product-list">
                              </tbody>
                      </table>
                  </div>
              </div>
          </div>
          <footer class="p-6 border-t border-border flex justify-end space-x-2 flex-shrink-0">
              <button type="button" id="cancel-add-product-btn" class="btn-secondary">취소</button>
              <button type="button" id="add-selected-products-btn" class="btn-primary">선택 상품 추가</button>
          </footer>
      </div>
    </div>
    `,

    orders: `
      <header class="flex justify-between items-center mb-6">
          <div>
              <h2 class="text-3xl font-bold text-gray-800">주문 관리</h2>
              <p class="text-secondary mt-1">모든 주문 내역을 확인하고 관리합니다.</p>
          </div>
          <button id="add-order-btn" class="btn-primary">+ 새 주문 등록</button>
      </header>

      <div class="mb-4 flex justify-between items-center">
        <div id="order-archive-filter" class="flex items-center space-x-1 p-1 bg-gray-200 rounded-lg">
            <button data-action="filter" data-filter="active" class="px-4 py-1.5 text-sm font-semibold rounded-md bg-primary text-white">활성 주문</button>
            <button data-action="filter" data-filter="archived" class="px-4 py-1.5 text-sm font-semibold rounded-md text-secondary hover:bg-gray-300">보관된 주문</button>
        </div>
        <button id="delete-selected-orders-btn" class="btn-danger hidden">선택 삭제</button>
      </div>

      <div class="bg-white rounded-xl shadow-md overflow-hidden">
          <div class="overflow-x-auto">
              <table class="w-full text-left">
                  <thead class="bg-light">
                      <tr>
                          <th class="p-4 w-12 text-center"><input type="checkbox" id="select-all-orders-checkbox" class="h-4 w-4"></th>
                          <th class="p-4">주문번호</th>
                          <th class="p-4">고객사</th>
                          <th class="p-4 text-center">주문일</th>
                          <th class="p-4 text-right">총액 (KRW)</th>
                          <th class="p-4 text-center">상태</th>
                          <th class="p-4 text-center">관리</th>
                      </tr>
                  </thead>
                  <tbody id="order-list">
                      </tbody>
              </table>
          </div>
      </div>
      <div id="order-pagination" class="mt-6"></div>
    `,
    consultations: `
            <div id="exhibitions-list-view">
                <header class="flex justify-between items-center mb-8"><h2 class="text-3xl font-bold">상담 일지</h2><button type="button" id="add-exhibition-btn" class="btn-primary">신규 박람회 등록</button></header>
                <div id="exhibitions-grid" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"></div>
            </div>
            <div id="consultation-log-list-view" class="hidden">
                 <header class="flex justify-between items-center mb-8">
                     <h2 id="log-list-title" class="text-3xl font-bold"></h2>
                     <a href="#consultations" class="btn-secondary">박람회 목록으로</a>
                 </header>
                 <div class="bg-white p-4 rounded-xl shadow-md">
                     <div class="overflow-x-auto"><table class="w-full text-left">
                         <thead class="bg-slate-50"><tr>
                            <th class="p-3">고객명</th><th class="p-3">상담일</th><th class="p-3">관심 품목 수</th><th class="p-3 text-center">명함</th><th class="p-3 text-center"></th>
                         </tr></thead>
                         <tbody id="log-list-tbody"></tbody>
                     </table></div>
                 </div>
            </div>
            <div id="exhibition-modal" class="fixed inset-0 bg-black bg-opacity-50 hidden items-center justify-center z-20">
                <form id="exhibition-form" class="bg-white rounded-lg p-8 w-full max-w-lg">
                    <h3 id="exhibition-modal-title" class="text-2xl font-bold mb-6"></h3><input type="hidden" id="exhibition-id">
                    <div class="space-y-4">
                        <div><label class="label">박람회 이름</label><input id="exhibition-name" type="text" class="input mt-1" required></div>
                        <div><label class="label">시작일</label><input id="exhibition-start-date" type="date" class="input mt-1" required></div>
                        <div><label class="label">종료일</label><input id="exhibition-end-date" type="date" class="input mt-1" required></div>
                        <div><label class="label">장소</label><input id="exhibition-location" type="text" class="input mt-1"></div>
                    </div>
                    <div class="mt-8 flex justify-end space-x-2"><button type="button" id="cancel-exhibition-btn" class="btn-secondary">취소</button><button type="submit" class="btn-primary">저장</button></div>
                </form>
            </div>`,
    "consultation-form": `
            <header class="flex justify-between items-center mb-8">
                <h2 id="consultation-form-title" class="text-3xl font-bold"></h2>
                <a id="back-to-logs-btn" href="#consultations" class="btn-secondary">상담 목록으로</a>
            </header>
            <form id="consultation-form" class="bg-white p-8 rounded-xl shadow-md">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div class="space-y-6">
                        <h3 class="font-bold text-lg border-b pb-2">상담 정보</h3>
                        <div><label class="label">상담일</label><input type="date" name="consultation_date" class="input mt-1"></div>
                        <div>
                            <label class="label">고객</label>
                            <div class="flex items-center space-x-2 mt-1">
                                <input type="checkbox" id="has_business_card" name="has_business_card" class="h-5 w-5 rounded"><label for="has_business_card">명함 받은 신규 고객</label>
                            </div>
                            <select id="consultation-customer-select" name="customer_id" class="input mt-2"></select>
                        </div>
                        <div id="new-customer-fields" class="space-y-4 border-t pt-4 mt-4">
                            <div><label class="label">회사명</label><input type="text" name="new_customer_name" class="input mt-1"></div>
                            <div><label class="label">담당자명</label><input type="text" name="new_contact_person" class="input mt-1"></div>
                            <div><label class="label">이메일</label><input type="email" name="new_email" class="input mt-1"></div>
                            <div><label class="label">연락처</label><input type="text" name="new_phone" class="input mt-1"></div>
                            <div><label class="label">국가</label><select id="new-country" name="new_country" class="input mt-1"></select></div>
                        </div>
                    </div>
                    <div class="space-y-6">
                         <h3 class="font-bold text-lg border-b pb-2">상담 내용</h3>
                         <div><label class="label">관심 품목 (다중 선택 가능)</label><div id="interested-products-list"></div></div>
                         <div><label class="label">상담 메모</label><textarea name="notes" rows="8" class="input mt-1"></textarea></div>
                    </div>
                </div>
                <div class="mt-8 flex justify-end"><button type="submit" class="btn-primary">상담 기록 저장</button></div>
            </form>`,
    analytics: `
      <header class="flex flex-col md:flex-row justify-between md:items-center mb-6 gap-4">
        <h2 class="text-2xl font-bold text-gray-800">분석 대시보드</h2>
        <div class="flex items-center space-x-2 bg-white p-2 rounded-lg shadow-sm border border-border">
            <select id="analytics-customer-filter" class="bg-white text-sm font-semibold text-secondary py-2 px-3 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
                <option value="all">전체 고객</option>
            </select>
            <input type="date" id="analytics-start-date" class="w-40 bg-white text-sm font-semibold text-secondary py-2 px-3 border-l border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
            <span class="text-gray-400">~</span>
            <input type="date" id="analytics-end-date" class="w-40 bg-white text-sm font-semibold text-secondary py-2 px-3 border-none rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
        </div>
      </header>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div class="bg-white p-6 rounded-lg shadow-md">
              <h3 class="text-sm font-medium text-secondary">총 매출</h3>
              <p id="kpi-total-revenue" class="text-3xl font-bold text-gray-800 mt-2">₩0</p>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-md">
              <h3 class="text-sm font-medium text-secondary">총 주문 수</h3>
              <p id="kpi-total-orders" class="text-3xl font-bold text-gray-800 mt-2">0</p>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-md">
              <h3 class="text-sm font-medium text-secondary">평균 주문 금액</h3>
              <p id="kpi-avg-order-value" class="text-3xl font-bold text-gray-800 mt-2">₩0</p>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-md">
              <h3 class="text-sm font-medium text-secondary">신규 고객 (최근 7일)</h3>
              <p id="kpi-new-customers" class="text-3xl font-bold text-gray-800 mt-2">0</p>
          </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div class="bg-white p-6 rounded-lg shadow-md h-96 flex flex-col">
              <h3 class="font-semibold mb-4 flex-shrink-0 text-gray-800">매출 추이</h3>
              <div class="relative flex-grow"><canvas id="sales-trend-chart"></canvas></div>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-md h-96 flex flex-col">
              <h3 class="font-semibold mb-4 flex-shrink-0 text-gray-800">국가별 매출</h3>
              <div class="relative flex-grow"><canvas id="sales-by-country-chart"></canvas></div>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-md h-96 flex flex-col">
              <h3 class="font-semibold mb-4 flex-shrink-0 text-gray-800">상위 5개 상품 (판매량)</h3>
              <div class="relative flex-grow"><canvas id="top-products-chart"></canvas></div>
          </div>
          <div class="bg-white p-6 rounded-lg shadow-md h-96 flex flex-col">
              <h3 class="font-semibold mb-4 flex-shrink-0 text-gray-800">상위 5개 고객 (매출)</h3>
              <div id="top-customers-chart-container" class="relative flex-grow">
                  <canvas id="top-customers-chart"></canvas>
              </div>
          </div>
      </div>`,
    workflow: `
            <header class="mb-8"><h2 class="text-3xl font-bold">Workflow</h2></header>
            <div id="workflow-board" class="flex space-x-4 overflow-x-auto pb-4"></div>`,
    
    invoice: `
      <div id="invoice-order-list-view">
          <header class="flex justify-between items-center mb-8">
              <div>
                  <h2 class="text-3xl font-bold">인보이스 생성</h2>
                  <p class="text-slate-600 mt-1">인보이스를 생성할 주문을 선택하세요.</p>
              </div>
              <div class="flex items-center space-x-2">
                  <button type="button" data-action="delete-selected" class="btn-secondary bg-red-500 text-white hover:bg-red-600 hidden delete-selected-btn">선택 항목 삭제</button>
                  <div class="relative w-64">
                      <input type="text" id="invoice-search-input" placeholder="업체명으로 검색..." class="input w-full pr-10">
                      <button type="button" id="invoice-search-btn" class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-indigo-600">
                          <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" /></svg>
                      </button>
                  </div>
                  <button type="button" id="invoice-view-all-btn" class="btn-secondary">전체 보기</button>
              </div>
          </header>
          <div class="bg-white p-4 rounded-xl shadow-md">
               <div class="overflow-x-auto"><table class="w-full text-left"><thead class="bg-gray-50"><tr>
                   <th class="p-3 w-4"><input type="checkbox" class="select-all-orders-checkbox"></th>
                   <th class="p-3">Order #</th><th class="p-3">Customer</th><th class="p-3">Order Date</th><th class="p-3">Status</th><th class="p-3"></th>
               </tr></thead><tbody class="order-list-tbody"></tbody></table></div>
          </div>
      </div>
      <div id="invoice-options-view" class="hidden"></div>
      <div id="invoice-document-view" class="hidden"></div>
    `,
    packinglist: `
      <div id="packinglist-order-list-view">
          <header class="flex justify-between items-center mb-8">
              <div>
                  <h2 class="text-3xl font-bold">패킹 리스트 생성</h2>
                  <p class="text-slate-600 mt-1">패킹 리스트를 생성할 주문을 선택하세요.</p>
              </div>
              <div class="flex items-center space-x-2">
                  <button type="button" data-action="delete-selected" class="btn-secondary bg-red-500 text-white hover:bg-red-600 hidden delete-selected-btn">선택 항목 삭제</button>
                  <div class="relative w-64">
                      <input type="text" id="packinglist-search-input" placeholder="업체명으로 검색..." class="input w-full pr-10">
                      <button type="button" id="packinglist-search-btn" class="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-500 hover:text-indigo-600">
                          <svg class="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clip-rule="evenodd" /></svg>
                      </button>
                  </div>
                  <button type="button" id="packinglist-view-all-btn" class="btn-secondary">전체 보기</button>
              </div>
          </header>
          <div class="bg-white p-4 rounded-xl shadow-md">
               <div class="overflow-x-auto"><table class="w-full text-left"><thead class="bg-gray-50"><tr>
                   <th class="p-3 w-4"><input type="checkbox" class="select-all-orders-checkbox"></th>
                   <th class="p-3">Order #</th><th class="p-3">Customer</th><th class="p-3">Order Date</th><th class="p-3">Status</th><th class="p-3"></th>
               </tr></thead><tbody class="order-list-tbody"></tbody></table></div>
          </div>
      </div>
      <div id="packinglist-options-view" class="hidden"></div>
      <div id="packinglist-document-view" class="hidden"></div>
    `,

    'buyer-form': `
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans">
    <div class="w-full max-w-2xl bg-white rounded-xl shadow-lg p-6 md:p-10">
      <header class="text-center mb-8">
        <h1 id="buyer-form-header" class="text-3xl font-bold text-slate-800">Visitor Inquiry</h1>
        <p class="text-slate-500 mt-2">Please fill out your information below.</p>
      </header>

      <form id="buyer-submission-form" class="space-y-6">
        <input type="hidden" id="buyer-form-exhibition-id" name="exhibition_id" />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label for="buyer-name" class="label">Company Name</label>
            <input type="text" id="buyer-name" name="name" required class="input mt-1">
          </div>
          <div>
            <label for="buyer-contact-person" class="label">Your Name</label>
            <input type="text" id="buyer-contact-person" name="contact_person" required class="input mt-1">
          </div>
          <div>
            <label for="buyer-email" class="label">Email Address</label>
            <input type="email" id="buyer-email" name="email" required class="input mt-1">
          </div>
          <div>
            <label for="buyer-phone" class="label">Phone Number</label>
            <input type="tel" id="buyer-phone" name="phone" class="input mt-1">
          </div>
          <div class="md:col-span-2">
            <label for="buyer-country" class="label">Country</label>
            <select id="buyer-country" name="country" required class="input mt-1"></select>
          </div>
        </div>

        <div>
          <label class="label">Interested Products</label>
          <div id="buyer-interested-products" class="mt-2 border rounded-md p-4 h-48 overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
          </div>
        </div>

        <div>
          <label for="buyer-notes" class="label">Notes</label>
          <textarea id="buyer-notes" name="notes" rows="5" class="input mt-1"></textarea>
        </div>

        <div id="buyer-form-message" class="hidden mt-6 p-3 text-sm rounded-lg"></div>

        <button type="submit" id="buyer-submit-btn" class="w-full btn-primary text-base py-3">
          Submit Information
        </button>
      </form>
      <div id="submission-success-message" class="text-center hidden">
        <svg class="mx-auto h-16 w-16 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h1 class="text-3xl font-bold mt-4 text-slate-800">Submission Complete!</h1>
        <p class="text-slate-600 mt-2 text-lg">Your information has been submitted successfully. Thank you.</p>
        <p class="text-slate-500 mt-4 text-sm">You can now close this window.</p>
        <button id="manual-close-btn" class="mt-6 btn-primary">Close Window</button>
      </div>
    </div>
  </div>
`,

    settings: `
            <header class="mb-8"><h2 class="text-3xl font-bold">Settings</h2></header>
            <form id="settings-form" class="bg-white p-8 rounded-xl shadow-md space-y-8">
                <div><h3 class="font-bold text-lg border-b pb-2 mb-4">회사 정보</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label class="label">회사명</label><input type="text" name="company_name" class="input mt-1"></div>
                        <div><label class="label">회사 이메일</label><input type="email" name="company_email" class="input mt-1"></div>
                        <div class="md:col-span-2"><label class="label">주소</label><input type="text" name="address" class="input mt-1"></div>
                        <div><label class="label">연락처</label><input type="text" name="phone_number" class="input mt-1"></div>
                        <div><label class="label">회사 직인 이미지 URL</label><input type="text" name="company_stamp_url" class="input mt-1"></div>
                    </div>
                </div>
                <div><h3 class="font-bold text-lg border-b pb-2 mb-4">은행 정보 1</h3>
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label class="label">은행명</label><input type="text" name="bank1_name" class="input mt-1"></div>
                        <div><label class="label">계좌번호</label><input type="text" name="bank1_account" class="input mt-1"></div>
                        <div class="md:col-span-2"><label class="label">은행 주소</label><input type="text" name="bank1_address" class="input mt-1"></div>
                        <div><label class="label">SWIFT 코드</label><input type="text" name="bank1_swift" class="input mt-1"></div>
                    </div>
                </div>
                <div><h3 class="font-bold text-lg border-b pb-2 mb-4">은행 정보 2</h3>
                     <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><label class="label">은행명</label><input type="text" name="bank2_name" class="input mt-1"></div>
                        <div><label class="label">계좌번호</label><input type="text" name="bank2_account" class="input mt-1"></div>
                        <div class="md:col-span-2"><label class="label">은행 주소</label><input type="text" name="bank2_address" class="input mt-1"></div>
                        <div><label class="label">SWIFT 코드</label><input type="text" name="bank2_swift" class="input mt-1"></div>
                    </div>
                </div>
                <div id="settings-message" class="p-3 text-sm rounded-lg hidden"></div>
                <div class="flex justify-end"><button id="settings-save-btn" type="submit" class="btn-primary">Save Settings</button></div>
            </form>`,
  };
}
