/**
 * CHUNG THANH PHONG - HỆ THỐNG KHO & TRA CỨU SẢN PHẨM
 * Interactive Application Core
 */

(function () {
  'use strict';

  // APPLICATION STATE
  const state = {
    products: [],
    collections: [],
    overview: {},
    metadata: {},
    picklist: JSON.parse(localStorage.getItem('CTP_PICKLIST') || '[]'),
    activeTab: 'sale2010',
    search: {
      query: '',
      quickFilter: 'all',
      fileFilter: 'all',
      collectionFilter: 'all',
      stockFilter: 'all',
      sizeFilter: 'all',
      priceFilter: 'all',
      sort: 'default',
      page: 1,
      pageSize: 24,
      filteredProducts: []
    },
    inventory: {
      viewMode: 'grid', // 'grid' or 'table'
      fileFilter: 'all',
      collectionFilter: 'all',
      page: 1,
      pageSize: 24,
      filteredProducts: []
    },
    collectionsFilter: {
      file: 'all',
      category: 'all',
      activeCollection: null,
      priceFilter: 'all',
      sizeFilter: 'all',
      stockFilter: 'all',
      sort: 'default'
    },
    sale2010: {
      products: [],
      filteredProducts: [],
      query: '',
      groupFilter: 'all',
      priceFilter: 'all',
      locationFilter: 'all',
      sizeFilter: 'all',
      sort: 'default',
      page: 1,
      pageSize: 24
    },
    visualSearch: {
      workerUrl: localStorage.getItem('CTP_WORKER_URL') || '',
      currentEngine: localStorage.getItem('CTP_WORKER_URL') ? 'worker' : 'client',
      activeTab: 'upload',
      imageSrc: null,
      cropBox: { x: 0.1, y: 0.05, width: 0.8, height: 0.9 },
      stream: null,
      facingMode: 'environment',
      queryVector: null,
      results: [],
      filteredResults: [],
      resultFilter: 'all',
      samples: [
        { name: 'Váy Cưới Kim Tuyến Bridal', cat: 'Váy Cưới Bridal', image: 'images/kho_bridal/spring_2025_r5.jpg' },
        { name: 'Đầm Draping Lệch Vai Nude', cat: 'RTW', image: 'images/kho_moi/rtw25_r31.jpg' },
        { name: 'Đầm Body Đen Draping Cut Out', cat: 'RTW', image: 'images/kho_moi/rtw25_r25.jpg' },
        { name: 'Áo Dài Tết Truyền Thống Đỏ', cat: 'BST Áo Dài', image: 'images/kho_bridal/bst__o_d_i_r5.jpg' },
        { name: 'Đầm Dạ Hội BST PreFall 26', cat: 'Kho Trưng Bày Rin', image: 'images/kho_rin/prefall_26_r3.jpg' },
        { name: 'Vest Cưới Phụ Kiện Nam', cat: 'Phụ Kiện', image: 'images/kho_bridal/kho_vest_ph__ki_n_r5.jpg' }
      ]
    },
    theme: localStorage.getItem('CTP_THEME') || 'light'
  };

  window.appState = state;

  // INITIALIZATION
  document.addEventListener('DOMContentLoaded', initApp);

  async function initApp() {
    initTheme();
    setupDate();
    setupEventListeners();
    initVisualSearch();
    await loadAppData();
    renderAllViews();

    // Support URL Hash Deep-linking (e.g. #sale2010)
    const hash = window.location.hash.replace('#', '');
    if (hash && ['sale2010', 'collections', 'search', 'inventory', 'picklist'].includes(hash)) {
      switchTab(hash);
    } else {
      switchTab('sale2010');
    }
  }

  // THEME MANAGEMENT
  function initTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    const themeBtn = document.getElementById('btn-theme-toggle');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        state.theme = state.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', state.theme);
        localStorage.setItem('CTP_THEME', state.theme);
      });
    }
  }

  function setupDate() {
    const el = document.getElementById('current-date');
    if (el) {
      const now = new Date();
      const options = { weekday: 'long', year: 'numeric', month: 'numeric', day: 'numeric' };
      el.textContent = now.toLocaleDateString('vi-VN', options);
    }
  }

  // DATA LOADING
  async function loadAppData() {
    if (window.APP_DATA) {
      state.products = window.APP_DATA.products || [];
      state.collections = window.APP_DATA.collections || [];
      state.overview = window.APP_DATA.overview || {};
      state.metadata = window.APP_DATA.metadata || {};
    } else {
      try {
        const [prodRes, colRes, metaRes, ovRes] = await Promise.all([
          fetch('data/products.json'),
          fetch('data/collections.json'),
          fetch('data/metadata.json'),
          fetch('data/overview.json')
        ]);
        state.products = await prodRes.json();
        state.collections = await colRes.json();
        state.metadata = await metaRes.json();
        state.overview = await ovRes.json();
      } catch (err) {
        console.error('Error fetching data files:', err);
      }
    }

    // Load Sale 20/10 data
    if (window.SALE_20_10_DATA) {
      state.sale2010.products = window.SALE_20_10_DATA;
    } else {
      try {
        const saleRes = await fetch('data/sale_20_10.json');
        state.sale2010.products = await saleRes.json();
      } catch (err) {
        console.warn('Could not load sale_20_10.json:', err);
      }
    }

    updatePicklistBadges();
  }

  // RENDER ALL VIEWS
  function renderAllViews() {
    initSale2010();
    renderCollections();
    initSearchFilters();
    applySearchFilters();
    initInventoryFilters();
    applyInventoryFilters();
    renderPicklist();
  }

  // ===================================================
  // TAB NAVIGATION (BOTTOM MENU & SHORTCUTS)
  // ===================================================
  function setupEventListeners() {
    // Bottom Nav Items
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const target = btn.getAttribute('data-target');
        switchTab(target);
      });
    });

    // Top Header Quick Search
    const btnQuickSearch = document.getElementById('btn-quick-search');
    if (btnQuickSearch) {
      btnQuickSearch.addEventListener('click', () => {
        switchTab('search');
        setTimeout(() => {
          const input = document.getElementById('search-input');
          if (input) input.focus();
        }, 150);
      });
    }

    // Top Header Picklist button
    const btnTopPicklist = document.getElementById('btn-top-picklist');
    if (btnTopPicklist) {
      btnTopPicklist.addEventListener('click', () => switchTab('picklist'));
    }

    // Search input
    const searchInput = document.getElementById('search-input');
    const clearBtn = document.getElementById('btn-clear-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        state.search.query = e.target.value.trim();
        if (clearBtn) clearBtn.style.display = state.search.query ? 'block' : 'none';
        state.search.page = 1;
        applySearchFilters();
      });
    }
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (searchInput) {
          searchInput.value = '';
          searchInput.focus();
        }
        state.search.query = '';
        clearBtn.style.display = 'none';
        state.search.page = 1;
        applySearchFilters();
      });
    }

    // Quick filter buttons in search
    document.querySelectorAll('.quick-filter-btn[data-filter]').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.quick-filter-btn[data-filter]').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.search.quickFilter = btn.getAttribute('data-filter');

        // CLEAR SEARCH INPUT WHEN CLICKING QUICK FILTER (AS REQUESTED BY USER)
        const searchInput = document.getElementById('search-input');
        const clearBtn = document.getElementById('btn-clear-search');
        if (searchInput) searchInput.value = '';
        if (clearBtn) clearBtn.style.display = 'none';
        state.search.query = '';
        state.search.collectionFilter = 'all';
        renderModalCollections();

        state.search.page = 1;
        applySearchFilters();
      });
    });

    // Sort select
    const sortSelect = document.getElementById('sort-select');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        state.search.sort = e.target.value;
        applySearchFilters();
      });
    }

    // Load more search
    const btnLoadMore = document.getElementById('btn-load-more');
    if (btnLoadMore) {
      btnLoadMore.addEventListener('click', () => {
        state.search.page++;
        renderSearchResults(false);
      });
    }

    // Advanced Filter Modal
    const btnToggleFilter = document.getElementById('btn-toggle-filter-modal');
    const filterModal = document.getElementById('filter-modal');
    const btnCloseFilter = document.getElementById('btn-close-filter');
    const btnApplyFilter = document.getElementById('btn-apply-modal-filter');
    const btnResetFilter = document.getElementById('btn-reset-modal-filter');

    if (btnToggleFilter && filterModal) {
      btnToggleFilter.addEventListener('click', () => {
        renderModalCollections(document.getElementById('modal-col-search-input')?.value.trim() || '');
        filterModal.classList.add('open');
      });
    }
    if (btnCloseFilter && filterModal) {
      btnCloseFilter.addEventListener('click', () => filterModal.classList.remove('open'));
    }
    if (btnApplyFilter && filterModal) {
      btnApplyFilter.addEventListener('click', () => {
        filterModal.classList.remove('open');
        state.search.page = 1;
        applySearchFilters();
      });
    }
    if (btnResetFilter) {
      btnResetFilter.addEventListener('click', () => {
        resetModalPills();
        state.search.fileFilter = 'all';
        state.search.collectionFilter = 'all';
        state.search.stockFilter = 'all';
        state.search.sizeFilter = 'all';
        state.search.priceFilter = 'all';
      });
    }

    // Modal Pill Selectors
    setupPillSelector('modal-filter-file', (val) => {
      state.search.fileFilter = val;
      renderModalCollections(document.getElementById('modal-col-search-input')?.value.trim() || '');
    });
    setupPillSelector('modal-filter-stock', (val) => state.search.stockFilter = val);
    setupPillSelector('modal-filter-size', (val) => state.search.sizeFilter = val);
    setupPillSelector('modal-filter-price', (val) => state.search.priceFilter = val);

    // Modal Collection Search Input
    const colSearchInput = document.getElementById('modal-col-search-input');
    if (colSearchInput) {
      colSearchInput.addEventListener('input', (e) => {
        renderModalCollections(e.target.value.trim());
      });
    }

    // Inventory Controls
    const btnViewGrid = document.getElementById('btn-view-grid');
    const btnViewTable = document.getElementById('btn-view-table');
    if (btnViewGrid && btnViewTable) {
      btnViewGrid.addEventListener('click', () => {
        btnViewGrid.classList.add('active');
        btnViewTable.classList.remove('active');
        state.inventory.viewMode = 'grid';
        document.getElementById('inventory-grid-container').style.display = 'grid';
        document.getElementById('inventory-table-container').style.display = 'none';
        applyInventoryFilters();
      });
      btnViewTable.addEventListener('click', () => {
        btnViewTable.classList.add('active');
        btnViewGrid.classList.remove('active');
        state.inventory.viewMode = 'table';
        document.getElementById('inventory-grid-container').style.display = 'none';
        document.getElementById('inventory-table-container').style.display = 'block';
        applyInventoryFilters();
      });
    }

    const invFileSelect = document.getElementById('inv-file-select');
    if (invFileSelect) {
      invFileSelect.addEventListener('change', (e) => {
        state.inventory.fileFilter = e.target.value;
        updateInventoryCollectionDropdown();
        state.inventory.page = 1;
        applyInventoryFilters();
      });
    }

    const invColSelect = document.getElementById('inv-collection-select');
    if (invColSelect) {
      invColSelect.addEventListener('change', (e) => {
        state.inventory.collectionFilter = e.target.value;
        state.inventory.page = 1;
        applyInventoryFilters();
      });
    }

    const btnInvLoadMore = document.getElementById('btn-inv-load-more');
    if (btnInvLoadMore) {
      btnInvLoadMore.addEventListener('click', () => {
        state.inventory.page++;
        renderInventoryResults(false);
      });
    }

    // Picklist Actions
    const btnClearPicklist = document.getElementById('btn-clear-picklist');
    if (btnClearPicklist) {
      btnClearPicklist.addEventListener('click', () => {
        if (state.picklist.length === 0) return;
        if (confirm('Bạn có chắc muốn xóa toàn bộ danh sách đã chọn?')) {
          state.picklist = [];
          savePicklist();
          renderPicklist();
          showToast('Đã làm trống danh sách chọn đồ');
        }
      });
    }

    const btnCopyPicklist = document.getElementById('btn-copy-picklist');
    if (btnCopyPicklist) {
      btnCopyPicklist.addEventListener('click', copyPicklistToClipboard);
    }

    const btnPrintPicklist = document.getElementById('btn-print-picklist');
    if (btnPrintPicklist) {
      btnPrintPicklist.addEventListener('click', () => window.print());
    }

    // Close Modals on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.remove('open');
        }
      });
    });

    const btnCloseProdModal = document.getElementById('btn-close-product-modal');
    if (btnCloseProdModal) {
      btnCloseProdModal.addEventListener('click', () => {
        document.getElementById('product-modal').classList.remove('open');
      });
    }

    const btnCloseOvModal = document.getElementById('btn-close-overview-modal');
    if (btnCloseOvModal) {
      btnCloseOvModal.addEventListener('click', () => {
        document.getElementById('overview-modal').classList.remove('open');
      });
    }

    // ==========================================
    // SALE 20/10 EVENT LISTENERS
    // ==========================================
    const saleSearchInput = document.getElementById('sale-search-input');
    const clearSaleSearchBtn = document.getElementById('btn-clear-sale-search');
    if (saleSearchInput) {
      saleSearchInput.addEventListener('input', (e) => {
        state.sale2010.query = e.target.value.trim();
        if (clearSaleSearchBtn) clearSaleSearchBtn.style.display = state.sale2010.query ? 'block' : 'none';
        state.sale2010.page = 1;
        applySaleFilters();
      });
    }
    if (clearSaleSearchBtn) {
      clearSaleSearchBtn.addEventListener('click', () => {
        if (saleSearchInput) saleSearchInput.value = '';
        state.sale2010.query = '';
        clearSaleSearchBtn.style.display = 'none';
        state.sale2010.page = 1;
        applySaleFilters();
      });
    }

    // Group tabs
    document.querySelectorAll('#sale-group-tabs .sale-grp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#sale-group-tabs .sale-grp-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.sale2010.groupFilter = btn.getAttribute('data-group');
        state.sale2010.page = 1;
        applySaleFilters();
      });
    });

    // Price chips
    document.querySelectorAll('#sale-price-chips .sale-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#sale-price-chips .sale-chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.sale2010.priceFilter = btn.getAttribute('data-price');
        state.sale2010.page = 1;
        applySaleFilters();
      });
    });

    // Size chips
    document.querySelectorAll('#sale-size-chips .sale-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#sale-size-chips .sale-chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.sale2010.sizeFilter = btn.getAttribute('data-size');
        state.sale2010.page = 1;
        applySaleFilters();
      });
    });

    // Location select
    const saleLocSelect = document.getElementById('sale-location-select');
    if (saleLocSelect) {
      saleLocSelect.addEventListener('change', (e) => {
        state.sale2010.locationFilter = e.target.value;
        state.sale2010.page = 1;
        applySaleFilters();
      });
    }

    // Sort select
    const saleSortSelect = document.getElementById('sale-sort-select');
    if (saleSortSelect) {
      saleSortSelect.addEventListener('change', (e) => {
        state.sale2010.sort = e.target.value;
        applySaleFilters();
      });
    }

    // Load more
    const btnSaleLoadMore = document.getElementById('btn-sale-load-more');
    if (btnSaleLoadMore) {
      btnSaleLoadMore.addEventListener('click', () => {
        state.sale2010.page++;
        renderSaleResults(false);
      });
    }

    // ==========================================
    // COLLECTION DETAIL QUICK FILTERS (KHOẢNG GIÁ, SIZE, TỒN KHO, SORT)
    // ==========================================
    document.querySelectorAll('#col-price-chips .sale-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#col-price-chips .sale-chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.collectionsFilter.priceFilter = btn.getAttribute('data-colprice');
        applyColProductFilters();
      });
    });

    document.querySelectorAll('#col-size-chips .sale-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#col-size-chips .sale-chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.collectionsFilter.sizeFilter = btn.getAttribute('data-colsize');
        applyColProductFilters();
      });
    });

    document.querySelectorAll('#col-stock-chips .sale-chip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#col-stock-chips .sale-chip-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.collectionsFilter.stockFilter = btn.getAttribute('data-colstock');
        applyColProductFilters();
      });
    });

    const colSortSelect = document.getElementById('col-sort-select');
    if (colSortSelect) {
      colSortSelect.addEventListener('change', (e) => {
        state.collectionsFilter.sort = e.target.value;
        applyColProductFilters();
      });
    }
  }

  function setupPillSelector(containerId, onChange) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.querySelectorAll('.pill-select').forEach(pill => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('.pill-select').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        onChange(pill.getAttribute('data-val'));
      });
    });
  }

  function renderModalCollections(searchQuery = '') {
    const container = document.getElementById('modal-filter-collection');
    const countEl = document.getElementById('modal-col-count');
    if (!container) return;

    let cols = state.collections || [];
    if (state.search.fileFilter && state.search.fileFilter !== 'all') {
      cols = cols.filter(c => c.file_id === state.search.fileFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      cols = cols.filter(c => c.collection.toLowerCase().includes(q));
    }

    if (countEl) {
      countEl.textContent = state.search.collectionFilter === 'all'
        ? `Tất cả (${cols.length} BST)`
        : `${state.search.collectionFilter}`;
    }

    let html = `
      <button class="pill-select ${state.search.collectionFilter === 'all' ? 'active' : ''}" data-val="all">
        Tất cả BST (${cols.length})
      </button>
    `;

    cols.forEach(col => {
      const isAct = state.search.collectionFilter === col.collection ? 'active' : '';
      html += `
        <button class="pill-select ${isAct}" data-val="${col.collection}">
          ${col.collection} (${col.product_count})
        </button>
      `;
    });

    container.innerHTML = html;

    container.querySelectorAll('.pill-select').forEach(pill => {
      pill.addEventListener('click', () => {
        container.querySelectorAll('.pill-select').forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.search.collectionFilter = pill.getAttribute('data-val');
        if (countEl) {
          countEl.textContent = state.search.collectionFilter === 'all'
            ? `Tất cả (${cols.length} BST)`
            : `${state.search.collectionFilter}`;
        }
      });
    });
  }

  function resetModalPills() {
    ['modal-filter-file', 'modal-filter-stock', 'modal-filter-size', 'modal-filter-price'].forEach(id => {
      const container = document.getElementById(id);
      if (container) {
        container.querySelectorAll('.pill-select').forEach((p, idx) => {
          if (idx === 0) p.classList.add('active');
          else p.classList.remove('active');
        });
      }
    });
    state.search.collectionFilter = 'all';
    const colSearchInput = document.getElementById('modal-col-search-input');
    if (colSearchInput) colSearchInput.value = '';
    renderModalCollections();
  }

  // GLOBAL TAB SWITCHER
  window.switchTab = function (tabName) {
    state.activeTab = tabName;
    document.querySelectorAll('.app-view').forEach(v => v.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

    const view = document.getElementById(`view-${tabName}`);
    const nav = document.querySelector(`.nav-item[data-target="${tabName}"]`);
    if (view) view.classList.add('active');
    if (nav) nav.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ===================================================
  // VIEW 1: DASHBOARD LOGIC
  // ===================================================
  function renderDashboard() {
    // Render Warehouse cards
    const whContainer = document.getElementById('warehouse-cards-container');
    if (whContainer && state.metadata.files) {
      whContainer.innerHTML = state.metadata.files.map(f => {
        const fileProds = state.products.filter(p => p.file_id === f.id);
        const fileStock = fileProds.reduce((sum, p) => sum + p.stock, 0);
        const fileCollections = state.collections.filter(c => c.file_id === f.id).length;
        return `
          <div class="wh-card" onclick="filterByWarehouse('${f.id}')">
            <div class="wh-header">
              <span class="wh-title">${f.name}</span>
              <span class="wh-tag">${fileCollections} BST</span>
            </div>
            <div class="wh-meta">
              <span>Sản phẩm: <strong>${fileProds.length} mã</strong></span>
              <span>Tồn kho: <strong>${fileStock} cái</strong></span>
            </div>
          </div>
        `;
      }).join('');
    }

    // Render Overview tables shortcut chips
    const ovContainer = document.getElementById('overview-sheets-container');
    if (ovContainer && state.overview) {
      let chipsHtml = '';
      for (const fileKey in state.overview) {
        const fObj = state.overview[fileKey];
        if (fObj.sheets_summary) {
          fObj.sheets_summary.forEach(sh => {
            chipsHtml += `
              <button class="ov-chip" onclick="openOverviewModal('${fileKey}', '${sh.sheet_name}')">
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
                ${sh.sheet_name} (${fObj.file_name.split(' ')[1] || 'Báo Cáo'})
              </button>
            `;
          });
        }
      }
      ovContainer.innerHTML = chipsHtml;
    }

    // Render Featured Collections (First 8 with images)
    const featColContainer = document.getElementById('featured-collections-container');
    if (featColContainer && state.collections) {
      const featuredCols = state.collections.filter(c => c.cover_image && c.product_count > 0).slice(0, 10);
      featColContainer.innerHTML = featuredCols.map(col => `
        <div class="col-mini-card" onclick="filterByCollection('${col.collection}')">
          <img class="col-mini-thumb" src="${col.cover_image}" alt="${col.collection}" loading="lazy">
          <div class="col-mini-info">
            <div class="col-mini-name">${col.collection}</div>
            <div class="col-mini-count">${col.product_count} mẫu</div>
          </div>
        </div>
      `).join('');
    }

    // Render Featured Products (first 8 with images and in stock)
    const featProdContainer = document.getElementById('dashboard-featured-products');
    if (featProdContainer && state.products) {
      const featured = state.products.filter(p => p.image && p.stock > 0).slice(0, 8);
      featProdContainer.innerHTML = featured.map(renderProductCard).join('');
    }
  }

  window.filterByWarehouse = function (fileId) {
    state.search.fileFilter = fileId;
    state.search.quickFilter = 'all';
    state.search.query = '';
    state.search.page = 1;
    switchTab('search');
    applySearchFilters();
  };

  window.filterByCollection = function (collectionName) {
    openCollectionDetail(collectionName);
  };

  // ===================================================
  // VIEW 2: COLLECTIONS LOGIC (KÈM BỘ LỌC KHOẢNG GIÁ CHỌN NHANH)
  // ===================================================
  function renderCollections() {
    // Categories bar
    const catContainer = document.getElementById('collections-cat-filter');
    if (catContainer && state.metadata.categories) {
      let cats = ['all', ...state.metadata.categories];
      catContainer.innerHTML = cats.map(cat => `
        <button class="cat-chip ${state.collectionsFilter.category === cat ? 'active' : ''}" onclick="filterColCategory('${cat}')">
          ${cat === 'all' ? 'Tất cả danh mục' : cat}
        </button>
      `).join('');
    }

    // File buttons
    document.querySelectorAll('#collections-file-filter .filter-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('#collections-file-filter .filter-pill').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.collectionsFilter.file = btn.getAttribute('data-file');
        renderCollectionsGrid();
      });
    });

    renderCollectionsGrid();
  }

  window.filterColCategory = function (cat) {
    state.collectionsFilter.category = cat;
    document.querySelectorAll('.cat-chip').forEach(c => c.classList.remove('active'));
    renderCollections();
  };

  function renderCollectionsGrid() {
    const grid = document.getElementById('collections-grid');
    if (!grid) return;

    let list = state.collections;
    if (state.collectionsFilter.file !== 'all') {
      list = list.filter(c => c.file_id === state.collectionsFilter.file);
    }
    if (state.collectionsFilter.category !== 'all') {
      list = list.filter(c => c.category === state.collectionsFilter.category);
    }

    if (list.length === 0) {
      grid.innerHTML = `<div class="empty-state"><h3>Không có bộ sưu tập phù hợp</h3></div>`;
      return;
    }

    grid.innerHTML = list.map(col => {
      const imgs = col.images && col.images.length > 0 ? col.images : (col.cover_image ? [col.cover_image] : []);
      let mediaHtml = '';
      if (imgs.length >= 3) {
        mediaHtml = `
          <div class="col-card-triptych triptych-3">
            <div class="triptych-slot"><img class="triptych-img" src="${imgs[0]}" alt="${col.collection} 1" loading="lazy"></div>
            <div class="triptych-slot"><img class="triptych-img" src="${imgs[1]}" alt="${col.collection} 2" loading="lazy"></div>
            <div class="triptych-slot"><img class="triptych-img" src="${imgs[2]}" alt="${col.collection} 3" loading="lazy"></div>
          </div>
        `;
      } else if (imgs.length === 2) {
        mediaHtml = `
          <div class="col-card-triptych triptych-2">
            <div class="triptych-slot"><img class="triptych-img" src="${imgs[0]}" alt="${col.collection} 1" loading="lazy"></div>
            <div class="triptych-slot"><img class="triptych-img" src="${imgs[1]}" alt="${col.collection} 2" loading="lazy"></div>
          </div>
        `;
      } else if (imgs.length === 1) {
        mediaHtml = `
          <div class="col-card-triptych triptych-1">
            <div class="triptych-slot"><img class="triptych-img" src="${imgs[0]}" alt="${col.collection}" loading="lazy"></div>
          </div>
        `;
      } else {
        mediaHtml = `<div class="col-card-cover placeholder"><span>Chưa có ảnh bìa</span></div>`;
      }

      return `
        <div class="collection-card" onclick="openCollectionDetail('${col.collection}')">
          ${mediaHtml}
          <div class="col-card-body">
            <div>
              <span class="col-card-file">${col.file_name}</span>
              <h4 class="col-card-title">${col.collection}</h4>
            </div>
            <div class="col-card-footer">
              <span>${col.product_count} sản phẩm</span>
              <span class="col-card-btn">Xem BST &rarr;</span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  // CHI TIẾT BỘ SƯU TẬP & BỘ LỌC KHOẢNG GIÁ CHỌN NHANH
  window.openCollectionDetail = function (collectionName) {
    state.collectionsFilter.activeCollection = collectionName;
    state.collectionsFilter.priceFilter = 'all';
    state.collectionsFilter.sizeFilter = 'all';
    state.collectionsFilter.stockFilter = 'all';
    state.collectionsFilter.sort = 'default';

    const colObj = state.collections.find(c => c.collection === collectionName);
    const colProducts = state.products.filter(p => p.collection === collectionName);

    const titleEl = document.getElementById('col-detail-title');
    const fileEl = document.getElementById('col-detail-file');
    const countEl = document.getElementById('col-detail-count');
    const sortSelect = document.getElementById('col-sort-select');

    if (titleEl) titleEl.textContent = collectionName;
    if (fileEl) fileEl.textContent = colObj ? colObj.file_name : 'Bộ Sưu Tập CTP';
    if (countEl) countEl.textContent = `${colProducts.length} sản phẩm`;
    if (sortSelect) sortSelect.value = 'default';

    // Reset active chips UI
    document.querySelectorAll('#col-price-chips .sale-chip-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-colprice') === 'all');
    });
    document.querySelectorAll('#col-size-chips .sale-chip-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-colsize') === 'all');
    });
    document.querySelectorAll('#col-stock-chips .sale-chip-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-colstock') === 'all');
    });

    // Chuyển view
    const listView = document.getElementById('col-list-view');
    const detailView = document.getElementById('col-detail-view');
    if (listView) listView.style.display = 'none';
    if (detailView) detailView.style.display = 'block';

    if (state.activeTab !== 'collections') {
      switchTab('collections');
    }

    applyColProductFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.backToCollectionsList = function () {
    state.collectionsFilter.activeCollection = null;
    const listView = document.getElementById('col-list-view');
    const detailView = document.getElementById('col-detail-view');
    if (detailView) detailView.style.display = 'none';
    if (listView) listView.style.display = 'block';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  window.resetColFilters = function () {
    state.collectionsFilter.priceFilter = 'all';
    state.collectionsFilter.sizeFilter = 'all';
    state.collectionsFilter.stockFilter = 'all';
    state.collectionsFilter.sort = 'default';

    const sortSelect = document.getElementById('col-sort-select');
    if (sortSelect) sortSelect.value = 'default';

    document.querySelectorAll('#col-price-chips .sale-chip-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-colprice') === 'all');
    });
    document.querySelectorAll('#col-size-chips .sale-chip-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-colsize') === 'all');
    });
    document.querySelectorAll('#col-stock-chips .sale-chip-btn').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-colstock') === 'all');
    });

    applyColProductFilters();
  };

  function applyColProductFilters() {
    const colName = state.collectionsFilter.activeCollection;
    if (!colName) return;

    let list = state.products.filter(p => p.collection === colName);

    // 1. Lọc khoảng giá nhanh
    const pf = state.collectionsFilter.priceFilter;
    if (pf === 'under_2m') {
      list = list.filter(p => (p.price || 0) > 0 && (p.price || 0) < 2000000);
    } else if (pf === '2m_5m') {
      list = list.filter(p => (p.price || 0) >= 2000000 && (p.price || 0) <= 5000000);
    } else if (pf === '5m_10m') {
      list = list.filter(p => (p.price || 0) > 5000000 && (p.price || 0) <= 10000000);
    } else if (pf === '10m_20m') {
      list = list.filter(p => (p.price || 0) > 10000000 && (p.price || 0) <= 20000000);
    } else if (pf === 'above_20m') {
      list = list.filter(p => (p.price || 0) > 20000000);
    }

    // 2. Lọc Kích cỡ
    const sf = state.collectionsFilter.sizeFilter;
    if (sf && sf !== 'all') {
      list = list.filter(p => p.sizes && p.sizes[sf] > 0);
    }

    // 3. Lọc Tồn kho
    const stockF = state.collectionsFilter.stockFilter;
    if (stockF === 'in_stock') {
      list = list.filter(p => (p.stock || 0) > 0);
    }

    // 4. Sắp xếp
    const sort = state.collectionsFilter.sort;
    if (sort === 'price-asc') {
      list.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (sort === 'price-desc') {
      list.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (sort === 'stock-desc') {
      list.sort((a, b) => (b.stock || 0) - (a.stock || 0));
    } else if (sort === 'name-asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }

    // 5. Render vào giao diện
    const grid = document.getElementById('col-products-grid');
    const emptyState = document.getElementById('col-empty-state');
    const countText = document.getElementById('col-products-count-text');

    if (countText) {
      countText.textContent = `Đang hiển thị ${list.length} sản phẩm`;
    }

    if (list.length === 0) {
      if (grid) grid.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
    } else {
      if (emptyState) emptyState.style.display = 'none';
      if (grid) {
        grid.innerHTML = list.map(p => renderProductCard(p)).join('');
      }
    }
  }

  // ===================================================
  // VIEW 3: SEARCH & FILTER LOGIC
  // ===================================================
  function initSearchFilters() {
    state.search.filteredProducts = [...state.products];
    renderModalCollections();
  }

  function applySearchFilters() {
    let result = state.products;

    // 1. Text Query (SKU, Barcode, Name, Collection, Note, Category)
    if (state.search.query) {
      const q = state.search.query.toLowerCase();
      result = result.filter(p =>
        (p.code && p.code.toLowerCase().includes(q)) ||
        (p.barcode && p.barcode.toLowerCase().includes(q)) ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        (p.collection && p.collection.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.note && p.note.toLowerCase().includes(q))
      );
    }

    // 2. Quick Filters
    if (state.search.quickFilter === 'in_stock') {
      result = result.filter(p => p.stock > 0);
    } else if (state.search.quickFilter === 'has_img') {
      result = result.filter(p => Boolean(p.image));
    } else if (state.search.quickFilter === 'bridal') {
      result = result.filter(p => p.category.includes('Bridal') || p.collection.toUpperCase().includes('BRIDAL'));
    } else if (state.search.quickFilter === 'rtw') {
      result = result.filter(p => p.category.includes('RTW') || p.collection.toUpperCase().includes('RTW'));
    } else if (state.search.quickFilter === 'aodai') {
      result = result.filter(p => p.category.includes('Áo Dài') || p.collection.toUpperCase().includes('ÁO DÀI'));
    }

    // 3. Collection Filter (from Advanced Filter Modal or Collection Click)
    if (state.search.collectionFilter && state.search.collectionFilter !== 'all') {
      result = result.filter(p => p.collection === state.search.collectionFilter);
    }

    // 4. File Filter
    if (state.search.fileFilter !== 'all') {
      result = result.filter(p => p.file_id === state.search.fileFilter);
    }

    // 4. Stock Filter
    if (state.search.stockFilter === 'in_stock') {
      result = result.filter(p => p.stock > 0);
    } else if (state.search.stockFilter === 'out_of_stock') {
      result = result.filter(p => p.stock === 0);
    }

    // 5. Size Filter
    if (state.search.sizeFilter !== 'all') {
      result = result.filter(p => p.sizes && p.sizes[state.search.sizeFilter] > 0);
    }

    // 6. Price Filter
    if (state.search.priceFilter === 'under_2m') {
      result = result.filter(p => p.price > 0 && p.price < 2000000);
    } else if (state.search.priceFilter === '2m_10m') {
      result = result.filter(p => p.price >= 2000000 && p.price <= 10000000);
    } else if (state.search.priceFilter === '10m_50m') {
      result = result.filter(p => p.price > 10000000 && p.price <= 50000000);
    } else if (state.search.priceFilter === 'above_50m') {
      result = result.filter(p => p.price > 50000000);
    }

    // 7. Sort
    if (state.search.sort === 'price-asc') {
      result.sort((a, b) => (a.price || 0) - (b.price || 0));
    } else if (state.search.sort === 'price-desc') {
      result.sort((a, b) => (b.price || 0) - (a.price || 0));
    } else if (state.search.sort === 'stock-desc') {
      result.sort((a, b) => (b.stock || 0) - (a.stock || 0));
    } else if (state.search.sort === 'name-asc') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
    }

    state.search.filteredProducts = result;
    renderSearchResults(true);
  }

  function renderSearchResults(reset) {
    const grid = document.getElementById('search-results-grid');
    const empty = document.getElementById('search-empty-state');
    const countEl = document.getElementById('search-result-count');
    const pag = document.getElementById('search-pagination');

    if (!grid) return;

    const total = state.search.filteredProducts.length;
    if (countEl) countEl.textContent = `Tìm thấy ${total.toLocaleString('vi-VN')} sản phẩm`;

    if (total === 0) {
      grid.innerHTML = '';
      if (empty) empty.style.display = 'flex';
      if (pag) pag.style.display = 'none';
      return;
    }

    if (empty) empty.style.display = 'none';

    const visibleCount = state.search.page * state.search.pageSize;
    const visibleProducts = state.search.filteredProducts.slice(0, visibleCount);

    grid.innerHTML = visibleProducts.map(renderProductCard).join('');

    if (pag) {
      pag.style.display = visibleCount < total ? 'flex' : 'none';
    }
  }

  window.resetSearchFilters = function () {
    state.search.query = '';
    state.search.quickFilter = 'all';
    state.search.fileFilter = 'all';
    state.search.collectionFilter = 'all';
    state.search.stockFilter = 'all';
    state.search.sizeFilter = 'all';
    state.search.priceFilter = 'all';
    state.search.sort = 'default';
    state.search.page = 1;

    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    const clearBtn = document.getElementById('btn-clear-search');
    if (clearBtn) clearBtn.style.display = 'none';

    document.querySelectorAll('.quick-filter-btn').forEach(b => b.classList.remove('active'));
    const allBtn = document.querySelector('.quick-filter-btn[data-filter="all"]');
    if (allBtn) allBtn.classList.add('active');

    resetModalPills();
    applySearchFilters();
  };

  // ===================================================
  // VIEW 4: INVENTORY LOGIC
  // ===================================================
  function initInventoryFilters() {
    updateInventoryCollectionDropdown();
  }

  function updateInventoryCollectionDropdown() {
    const colSelect = document.getElementById('inv-collection-select');
    if (!colSelect) return;

    let cols = state.collections;
    if (state.inventory.fileFilter !== 'all') {
      cols = cols.filter(c => c.file_id === state.inventory.fileFilter);
    }

    let options = '<option value="all">Tất cả Bộ Sưu Tập</option>';
    cols.forEach(c => {
      options += `<option value="${c.collection}">${c.collection} (${c.product_count})</option>`;
    });
    colSelect.innerHTML = options;
  }

  function applyInventoryFilters() {
    let result = state.products;
    if (state.inventory.fileFilter !== 'all') {
      result = result.filter(p => p.file_id === state.inventory.fileFilter);
    }
    if (state.inventory.collectionFilter !== 'all') {
      result = result.filter(p => p.collection === state.inventory.collectionFilter);
    }
    state.inventory.filteredProducts = result;
    renderInventoryResults(true);
  }

  function renderInventoryResults(reset) {
    const total = state.inventory.filteredProducts.length;
    const visibleCount = state.inventory.page * state.inventory.pageSize;
    const visible = state.inventory.filteredProducts.slice(0, visibleCount);

    if (state.inventory.viewMode === 'grid') {
      const grid = document.getElementById('inventory-grid-container');
      if (grid) grid.innerHTML = visible.map(renderProductCard).join('');
    } else {
      const tbody = document.getElementById('inventory-table-body');
      if (tbody) {
        tbody.innerHTML = visible.map(p => {
          const isPicked = state.picklist.some(x => x.id === p.id);
          const sizeStr = Object.entries(p.sizes || {})
            .filter(([_, q]) => q > 0)
            .map(([s, q]) => `<strong>${s}</strong>:${q}`)
            .join(', ') || '-';
          return `
            <tr>
              <td>
                ${p.image
                  ? `<img class="table-thumb" src="${p.image}" alt="${p.code}" onclick="openProductModal('${p.id}')">`
                  : `<div class="table-thumb" style="background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;font-size:0.6rem;">No img</div>`}
              </td>
              <td style="font-family:monospace;font-weight:700;color:var(--gold-primary);cursor:pointer;" onclick="openProductModal('${p.id}')">
                ${p.code}
              </td>
              <td style="font-weight:600;max-width:200px;cursor:pointer;" onclick="openProductModal('${p.id}')">
                ${p.name}
              </td>
              <td style="color:var(--text-muted);">${p.collection}</td>
              <td style="font-weight:700;color:var(--gold-primary);">${p.price_formatted}</td>
              <td style="font-size:0.75rem;">${sizeStr}</td>
              <td style="text-align:center;font-weight:700;">
                <span class="prod-stock-badge ${p.stock > 0 ? 'in-stock' : 'out-stock'}" style="position:static;display:inline-block;">
                  ${p.stock}
                </span>
              </td>
              <td style="text-align:center;">
                <button class="icon-btn" onclick="togglePicklist('${p.id}', event)" title="Chọn sản phẩm" style="width:30px;height:30px;margin:auto;">
                  <svg viewBox="0 0 24 24" width="16" height="16" fill="${isPicked ? 'var(--gold-primary)' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                </button>
              </td>
            </tr>
          `;
        }).join('');
      }
    }

    const pag = document.getElementById('inventory-pagination');
    if (pag) {
      pag.style.display = visibleCount < total ? 'flex' : 'none';
    }
  }

  // ===================================================
  // CARD RENDERER COMPONENT
  // ===================================================
  function renderProductCard(p) {
    const isPicked = state.picklist.some(x => x.id === p.id);
    const inStock = p.stock > 0;

    let sizesHtml = '';
    if (p.sizes && Object.keys(p.sizes).length > 0) {
      sizesHtml = '<div class="prod-sizes-row">' +
        Object.entries(p.sizes).slice(0, 4).map(([sz, qty]) => `
          <span class="size-tag ${qty > 0 ? 'has-qty' : ''}">${sz}${qty > 1 ? `:${qty}` : ''}</span>
        `).join('') +
        '</div>';
    }

    return `
      <div class="prod-card" onclick="openProductModal('${p.id}')">
        <div class="prod-img-wrap">
          ${p.image
            ? `<img class="prod-img" src="${p.image}" alt="${p.name}" loading="lazy">`
            : `<div class="prod-img-placeholder">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>Chưa có ảnh</span>
              </div>`
          }
          <span class="prod-stock-badge ${inStock ? 'in-stock' : 'out-stock'}">
            ${inStock ? `Tồn: ${p.stock}` : 'Hết hàng'}
          </span>
          ${p.similarity_percent !== undefined
            ? `<span class="prod-sim-badge ${p.similarity_percent >= 90 ? 'high-match' : (p.similarity_percent >= 80 ? 'good-match' : 'fair-match')}">
                <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                ${p.similarity_percent}% Khớp
               </span>`
            : ''
          }
          <button class="prod-fav-btn ${isPicked ? 'active' : ''}" onclick="togglePicklist('${p.id}', event)" title="Chọn mẫu này">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="${isPicked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
        </div>
        <div class="prod-body">
          <div>
            <div class="prod-meta-top">
              <span class="prod-sku">${p.code}</span>
              <span class="prod-col-tag">${p.collection}</span>
            </div>
            <h4 class="prod-name" title="${p.name}">${p.name}</h4>
          </div>
          <div>
            <div class="prod-price-box">
              <div class="prod-price">${p.price_formatted}</div>
              ${p.rent_price > 0 ? `<div class="prod-rent-price">Giá thuê: ${p.rent_price_formatted}</div>` : ''}
            </div>
            ${sizesHtml}
          </div>
        </div>
      </div>
    `;
  }

  // ===================================================
  // VIEW 5: PICKLIST / CHỌN ĐỒ LOGIC
  // ===================================================
  window.togglePicklist = function (id, event) {
    if (event) event.stopPropagation();
    const prod = state.products.find(p => p.id === id) || (state.sale2010 && state.sale2010.products.find(p => p.id === id));
    if (!prod) return;

    const idx = state.picklist.findIndex(p => p.id === id);
    if (idx >= 0) {
      state.picklist.splice(idx, 1);
      showToast(`Đã bỏ chọn: ${prod.code}`);
    } else {
      state.picklist.push(prod);
      showToast(`Đã thêm vào danh sách: ${prod.code}`);
    }

    savePicklist();
    updatePicklistBadges();
    updateCardFavStates(id);
    renderPicklist();
  };

  function savePicklist() {
    localStorage.setItem('CTP_PICKLIST', JSON.stringify(state.picklist));
  }

  function updatePicklistBadges() {
    const count = state.picklist.length;
    document.querySelectorAll('.picklist-badge').forEach(badge => {
      badge.textContent = count;
      badge.style.display = count > 0 ? 'flex' : 'none';
    });

    // Update Floating Selection Bar (Bridal Archive lookbook style)
    const floatBar = document.getElementById('floating-bar');
    const floatCount = document.getElementById('floating-bar-count');
    const floatVal = document.getElementById('floating-bar-val');
    if (floatBar) {
      if (count > 0) {
        floatBar.hidden = false;
        if (floatCount) floatCount.textContent = `${count} THIẾT KẾ ĐÃ CHỌN`;
        const totalVal = state.picklist.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 1), 0);
        if (floatVal) floatVal.textContent = formatVnd(totalVal);
      } else {
        floatBar.hidden = true;
      }
    }
  }

  function updateCardFavStates(id) {
    const isPicked = state.picklist.some(p => p.id === id);
    document.querySelectorAll(`.prod-card[onclick*="${id}"] .prod-fav-btn`).forEach(btn => {
      if (isPicked) btn.classList.add('active');
      else btn.classList.remove('active');
      const svg = btn.querySelector('svg');
      if (svg) svg.setAttribute('fill', isPicked ? 'currentColor' : 'none');
    });
  }

  function renderPicklist() {
    const container = document.getElementById('picklist-container');
    const empty = document.getElementById('picklist-empty-state');
    const pickCountEl = document.getElementById('pick-count');
    const pickStockEl = document.getElementById('pick-stock');
    const pickValEl = document.getElementById('pick-val');

    if (!container) return;

    const totalItems = state.picklist.length;
    const totalStock = state.picklist.reduce((sum, p) => sum + (p.stock || 1), 0);
    const totalVal = state.picklist.reduce((sum, p) => sum + (p.price || 0) * (p.stock || 1), 0);

    if (pickCountEl) pickCountEl.textContent = `${totalItems} mẫu`;
    if (pickStockEl) pickStockEl.textContent = `${totalStock} cái`;
    if (pickValEl) pickValEl.textContent = formatVnd(totalVal);

    if (totalItems === 0) {
      container.innerHTML = '';
      if (empty) empty.style.display = 'flex';
      return;
    }

    if (empty) empty.style.display = 'none';

    container.innerHTML = state.picklist.map(p => `
      <div class="pick-item-card">
        ${p.image
          ? `<img class="pick-item-thumb" src="${p.image}" alt="${p.code}" onclick="openProductModal('${p.id}')">`
          : `<div class="pick-item-thumb" style="background:var(--bg-secondary);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:var(--text-muted);">No img</div>`
        }
        <div class="pick-item-info">
          <span class="pick-item-code">${p.code} &bull; ${p.collection}</span>
          <h4 class="pick-item-name" onclick="openProductModal('${p.id}')">${p.name}</h4>
          <div class="pick-item-meta">
            <span class="pick-item-price">${p.price_formatted}</span>
            <span style="color:var(--text-muted);font-size:0.75rem;">Tồn: <strong>${p.stock}</strong></span>
          </div>
        </div>
        <button class="pick-item-remove" onclick="togglePicklist('${p.id}')" title="Xóa khỏi danh sách">&times;</button>
      </div>
    `).join('');
  }

  function copyPicklistToClipboard() {
    if (state.picklist.length === 0) {
      showToast('Danh sách soạn đồ đang trống!');
      return;
    }

    let text = `👗 DANH SÁCH SOẠN ĐỒ / THỬ VÁY - CHUNG THANH PHONG\n`;
    text += `📅 Ngày tạo: ${new Date().toLocaleDateString('vi-VN')}\n`;
    text += `📊 Tổng số: ${state.picklist.length} mẫu\n`;
    text += `-----------------------------------------\n`;

    let totalVal = 0;
    state.picklist.forEach((p, idx) => {
      const sizesStr = Object.entries(p.sizes || {})
        .filter(([_, q]) => q > 0)
        .map(([s, q]) => `${s}:${q}`)
        .join(', ') || 'N/A';
      text += `${idx + 1}. [${p.code}] ${p.name}\n`;
      text += `   BST: ${p.collection} | Giá: ${p.price_formatted}\n`;
      text += `   Size: ${sizesStr} | Tồn kho: ${p.stock}\n`;
      if (p.note) text += `   Ghi chú: ${p.note}\n`;
      text += `\n`;
      totalVal += (p.price || 0) * (p.stock || 1);
    });

    text += `-----------------------------------------\n`;
    text += `💰 TỔNG GIÁ TRỊ: ${formatVnd(totalVal)}\n`;

    navigator.clipboard.writeText(text).then(() => {
      showToast('Đã sao chép danh sách vào bộ nhớ tạm! (Dán vào Zalo ngay)');
    }).catch(() => {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast('Đã sao chép danh sách vào bộ nhớ tạm!');
    });
  }

  // ===================================================
  // PRODUCT DETAIL MODAL (BOTTOM SHEET)
  // ===================================================
  window.openProductModal = function (id) {
    const p = state.products.find(x => x.id === id) || (state.sale2010 && state.sale2010.products.find(x => x.id === id));
    if (!p) return;

    const modal = document.getElementById('product-modal');
    const body = document.getElementById('product-modal-body');
    if (!modal || !body) return;

    const isPicked = state.picklist.some(x => x.id === p.id);
    const isSale = p.sale_price !== undefined;

    let sizesGridHtml = '';
    const standardSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL'];
    const pSizes = p.sizes || {};
    const allSizeKeys = Object.keys(pSizes);
    const hasOnlyFreesize = allSizeKeys.length === 1 && allSizeKeys[0].toLowerCase().includes('free');

    if (hasOnlyFreesize) {
      sizesGridHtml = `
        <div class="size-cell active-stock" style="grid-column:span 2;">
          <div class="size-name-text">FREESIZE</div>
          <div class="size-qty-text">${pSizes[allSizeKeys[0]] || 1} cái</div>
        </div>
      `;
    } else {
      sizesGridHtml = standardSizes.map(sz => {
        const qty = pSizes[sz] || 0;
        return `
          <div class="size-cell ${qty > 0 ? 'active-stock' : ''}">
            <div class="size-name-text">${sz}</div>
            <div class="size-qty-text">${qty > 0 ? qty : '-'}</div>
          </div>
        `;
      }).join('');
    }

    const priceDisplay = isSale
      ? `
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          ${p.original_price > 0 ? `<span style="font-size:14px;color:var(--muted);text-decoration:line-through;">${p.original_price_formatted}</span>` : ''}
          <div class="modal-price-highlight" style="color:var(--sale);">${p.sale_price_formatted || formatVnd(p.sale_price)}</div>
          ${p.discount_percent > 0 ? `<span class="prod-discount-badge" style="position:static;">-${p.discount_percent}%</span>` : ''}
        </div>
      `
      : `
        <div class="modal-price-highlight">${p.price_formatted}</div>
        ${p.rent_price > 0 ? `<div style="font-size:12.5px;color:var(--muted);">Thuê: <strong>${p.rent_price_formatted}</strong></div>` : ''}
      `;

    body.innerHTML = `
      ${p.image
        ? `<div class="modal-prod-img-wrap" onclick="openLightbox('${p.image}', '${p.name.replace(/'/g, "\\'")}')">
            <img class="modal-prod-img" src="${p.image}" alt="${p.name}">
            <div style="position:absolute;bottom:12px;right:12px;background:rgba(20,18,18,0.75);color:#fff;padding:6px 10px;font-size:0.7rem;letter-spacing:.14em;text-transform:uppercase;display:flex;align-items:center;gap:6px;backdrop-filter:blur(6px);">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              Phóng to
            </div>
          </div>`
        : `<div class="modal-prod-img-wrap" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted);letter-spacing:.18em;text-transform:uppercase;font-size:12px;">Chưa có ảnh</div>`
      }

      <div class="modal-prod-details">
        <div style="display:flex;justify-content:space-between;align-items:baseline;flex-wrap:wrap;gap:8px;">
          <span class="modal-look-no">${p.code || 'LOOK ATELIER'}</span>
          <span class="prod-stock-badge ${p.stock > 0 ? 'in-stock' : 'out-stock'}" style="position:static;">
            ${p.stock > 0 ? `Tồn kho: ${p.stock}` : 'Tạm hết hàng'}
          </span>
        </div>

        <h3 class="modal-prod-title">${p.name}</h3>
        ${p.can_custom_order ? `<div style="margin-bottom:8px;"><span class="prod-tag-custom-order" style="font-size:11px;padding:4px 10px;">✨ Đặt may mới vẫn hưởng giá sale</span></div>` : ''}

        <div style="display:flex;align-items:baseline;gap:12px;flex-wrap:wrap;border-top:1px solid var(--line);padding-top:14px;">
          ${priceDisplay}
        </div>

        <dl class="modal-specs-dl">
          <dt>${isSale ? 'Nhóm / BST' : 'Bộ sưu tập'}</dt>
          <dd>${p.group_name || p.collection}</dd>

          <dt>Phân loại</dt>
          <dd>${p.category || 'Thời trang cao cấp'}</dd>

          ${p.location ? `<dt>Vị trí thùng</dt><dd style="color:var(--gold);font-weight:600;">📦 ${p.location}</dd>` : (p.file_name ? `<dt>Kho nguồn</dt><dd>${p.file_name}</dd>` : '')}

          ${p.barcode ? `<dt>Mã Barcode</dt><dd style="font-variant-numeric:tabular-nums;">${p.barcode}</dd>` : ''}
          ${p.note ? `<dt>Ghi chú</dt><dd style="color:var(--gold);">${p.note}</dd>` : ''}
          ${p.total_value > 0 ? `<dt>Định giá tồn</dt><dd>${p.total_value_formatted}</dd>` : ''}
        </dl>

        <div style="border-top:1px solid var(--line);padding-top:14px;">
          <div style="font-size:10.5px;letter-spacing:.22em;text-transform:uppercase;color:var(--gold);margin-bottom:8px;">Kích cỡ &amp; Tồn kho</div>
          <div class="size-matrix-grid">
            ${sizesGridHtml}
          </div>
        </div>

        <div class="modal-actions" style="flex-wrap:wrap; gap:8px;">
          <button class="btn-modal-pick ${isPicked ? 'active' : ''}" onclick="togglePicklist('${p.id}'); openProductModal('${p.id}');">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="${isPicked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            ${isPicked ? 'ĐÃ CHỌN (BẤM ĐỂ HỦY)' : 'CHỌN MẪU NÀY (PICK)'}
          </button>
          ${isSale ? `<button class="btn-modal-secondary btn-copy-zalo" onclick="copyZaloLead('${p.id}', event)">📋 Tư vấn Zalo</button>` : ''}
          <button class="btn-modal-secondary" onclick="copySku('${p.code}')" style="display:inline-flex;align-items:center;gap:6px;">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
            Mã SKU
          </button>
        </div>
      </div>
    `;

    modal.classList.add('open');
  };

  window.copySku = function (code) {
    navigator.clipboard.writeText(code).then(() => {
      showToast(`Đã sao chép mã: ${code}`);
    });
  };

  // ===================================================
  // OVERVIEW EXCEL TABLE MODAL
  // ===================================================
  window.openOverviewModal = function (fileKey, sheetName) {
    const fileObj = state.overview[fileKey];
    if (!fileObj) return;

    const sheetObj = fileObj.sheets_summary.find(s => s.sheet_name === sheetName);
    if (!sheetObj) return;

    const modal = document.getElementById('overview-modal');
    const title = document.getElementById('overview-modal-title');
    const body = document.getElementById('overview-modal-body');

    title.textContent = `${sheetName} - ${fileObj.file_name}`;

    let tableHtml = '<table class="overview-data-table"><tbody>';
    sheetObj.rows.forEach((row, rIdx) => {
      tableHtml += '<tr>';
      row.forEach(cell => {
        if (rIdx === 0 || rIdx === 1) {
          tableHtml += `<th>${cell || ''}</th>`;
        } else {
          tableHtml += `<td>${cell || ''}</td>`;
        }
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table>';

    body.innerHTML = tableHtml;
    modal.classList.add('open');
  };

  // ===================================================
  // VISUAL SEARCH CORE (SHOPEE STYLE LENS)
  // ===================================================
  function initVisualSearch() {
    // 1. Triggers
    const btnTop = document.getElementById('btn-top-visual-search');
    if (btnTop) btnTop.addEventListener('click', openVisualSearchModal);

    const btnDash = document.getElementById('btn-dash-visual-search');
    if (btnDash) btnDash.addEventListener('click', openVisualSearchModal);

    const btnSearch = document.getElementById('btn-camera-search');
    if (btnSearch) btnSearch.addEventListener('click', openVisualSearchModal);

    const btnClose = document.getElementById('btn-close-vs-modal');
    if (btnClose) btnClose.addEventListener('click', closeVisualSearchModal);

    const vsModal = document.getElementById('visual-search-modal');
    if (vsModal) {
      vsModal.addEventListener('click', (e) => {
        if (e.target === vsModal) closeVisualSearchModal();
      });
    }

    // 2. Source Tabs (Upload / Camera / Samples)
    document.querySelectorAll('.vs-nav-tab[data-vstab]').forEach(btn => {
      btn.addEventListener('click', () => {
        const tab = btn.getAttribute('data-vstab');
        switchVisualSearchTab(tab);
      });
    });

    // 3. Dropzone & File Input
    const dropzone = document.getElementById('vs-dropzone');
    const fileInput = document.getElementById('vs-file-input');
    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          handleSelectedFile(e.dataTransfer.files[0]);
        }
      });
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          handleSelectedFile(e.target.files[0]);
        }
      });
    }

    // 4. Clipboard Paste (Ctrl + V)
    window.addEventListener('paste', (e) => {
      const items = (e.clipboardData || e.originalEvent.clipboardData).items;
      for (const item of items) {
        if (item.type.indexOf('image') !== -1) {
          const blob = item.getAsFile();
          openVisualSearchModal();
          handleSelectedFile(blob);
          showToast('Đã nhận diện ảnh từ bộ nhớ tạm (Clipboard)!');
          break;
        }
      }
    });

    // 5. Camera controls
    const btnCapture = document.getElementById('btn-vs-capture-photo');
    if (btnCapture) btnCapture.addEventListener('click', captureLivePhoto);

    const btnSwitchCam = document.getElementById('btn-vs-switch-camera');
    if (btnSwitchCam) {
      btnSwitchCam.addEventListener('click', () => {
        state.visualSearch.facingMode = state.visualSearch.facingMode === 'user' ? 'environment' : 'user';
        startCameraStream();
      });
    }

    // 6. Cropper actions
    const btnExecute = document.getElementById('btn-vs-execute-search');
    if (btnExecute) btnExecute.addEventListener('click', executeVisualSearch);

    const btnChangeImg = document.getElementById('btn-vs-change-img');
    if (btnChangeImg) btnChangeImg.addEventListener('click', () => showVisualSearchStep('select'));

    const btnResetCrop = document.getElementById('btn-vs-reset-crop');
    if (btnResetCrop) btnResetCrop.addEventListener('click', resetCropBox);

    const btnNewSearch = document.getElementById('btn-vs-new-search');
    if (btnNewSearch) btnNewSearch.addEventListener('click', () => showVisualSearchStep('select'));

    const btnRetryCrop = document.getElementById('btn-vs-retry-crop');
    if (btnRetryCrop) btnRetryCrop.addEventListener('click', () => showVisualSearchStep('crop'));

    // 7. Results filter chips
    document.querySelectorAll('.vs-filter-chip[data-vsfilter]').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.vs-filter-chip[data-vsfilter]').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        state.visualSearch.resultFilter = chip.getAttribute('data-vsfilter');
        applyVisualSearchFilters();
      });
    });

    // 8. Settings panel
    const btnToggleSettings = document.getElementById('btn-vs-settings-toggle');
    const settingsPanel = document.getElementById('vs-settings-panel');
    const workerInput = document.getElementById('vs-worker-url-input');
    const btnTestWorker = document.getElementById('btn-vs-test-worker');
    const btnSaveWorker = document.getElementById('btn-vs-save-worker');
    const btnResetWorker = document.getElementById('btn-vs-reset-worker');

    if (btnToggleSettings && settingsPanel) {
      btnToggleSettings.addEventListener('click', () => {
        const isHidden = settingsPanel.style.display === 'none';
        settingsPanel.style.display = isHidden ? 'flex' : 'none';
        if (isHidden && workerInput) {
          workerInput.value = state.visualSearch.workerUrl;
        }
      });
    }

    if (btnTestWorker) {
      btnTestWorker.addEventListener('click', async () => {
        const url = workerInput.value.trim().replace(/\/$/, '');
        if (!url) {
          showToast('Vui lòng nhập URL Cloudflare Worker');
          return;
        }
        btnTestWorker.textContent = 'Đang thử...';
        btnTestWorker.disabled = true;
        try {
          const res = await fetch(`${url}/api/status`);
          if (res.ok) {
            const data = await res.json();
            showToast(`Kết nối Worker thành công! Đã index: ${data.indexed_products} mẫu`);
            updateEngineBadge('worker');
          } else {
            showToast(`Worker phản hồi lỗi HTTP ${res.status}`);
          }
        } catch (err) {
          showToast(`Không thể kết nối đến Worker: ${err.message}`);
        } finally {
          btnTestWorker.textContent = 'Kiểm tra';
          btnTestWorker.disabled = false;
        }
      });
    }

    if (btnSaveWorker) {
      btnSaveWorker.addEventListener('click', () => {
        const val = workerInput.value.trim().replace(/\/$/, '');
        state.visualSearch.workerUrl = val;
        localStorage.setItem('CTP_WORKER_URL', val);
        updateEngineBadge(val ? 'worker' : 'client');
        settingsPanel.style.display = 'none';
        showToast(val ? 'Đã lưu cấu hình Cloudflare Worker!' : 'Đã chuyển về engine cục bộ!');
      });
    }

    if (btnResetWorker) {
      btnResetWorker.addEventListener('click', () => {
        workerInput.value = '';
        state.visualSearch.workerUrl = '';
        localStorage.removeItem('CTP_WORKER_URL');
        updateEngineBadge('client');
        showToast('Đã khôi phục chế độ mặc định (Client Engine)');
      });
    }

    // 9. Initialize Interactive Cropper Touch/Mouse Dragging
    initCropperInteractions();

    // 10. Update initial engine badge
    updateEngineBadge(state.visualSearch.workerUrl ? 'worker' : 'client');
  }

  function updateEngineBadge(engine) {
    state.visualSearch.currentEngine = engine;
    const badge = document.getElementById('vs-current-engine-badge');
    const pill = document.getElementById('vs-results-engine-pill');
    if (engine === 'worker') {
      if (badge) {
        badge.textContent = '⚡ Cloudflare Worker Online';
        badge.classList.add('worker-active');
      }
      if (pill) pill.textContent = 'Cloudflare Worker';
    } else {
      if (badge) {
        badge.textContent = '⚡ Client-Side Engine (Local)';
        badge.classList.remove('worker-active');
      }
      if (pill) pill.textContent = 'Client-Side Engine';
    }
  }

  window.openVisualSearchModal = function () {
    const modal = document.getElementById('visual-search-modal');
    if (!modal) return;
    modal.classList.add('open');
    renderSampleGallery();

    // Default to select view if no image is loaded
    if (!state.visualSearch.imageSrc) {
      showVisualSearchStep('select');
      switchVisualSearchTab('upload');
    }
  };

  window.closeVisualSearchModal = function () {
    const modal = document.getElementById('visual-search-modal');
    if (modal) modal.classList.remove('open');
    stopCameraStream();
    const scanOverlay = document.getElementById('vs-scanline-overlay');
    if (scanOverlay) scanOverlay.style.display = 'none';
  };

  function showVisualSearchStep(step) {
    document.querySelectorAll('.vs-step-view').forEach(v => v.classList.remove('active'));
    const target = document.getElementById(`vs-step-${step}`);
    if (target) target.classList.add('active');

    if (step !== 'select') {
      stopCameraStream();
    }
  }

  function switchVisualSearchTab(tab) {
    state.visualSearch.activeTab = tab;
    document.querySelectorAll('.vs-nav-tab[data-vstab]').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-vstab') === tab);
    });
    document.querySelectorAll('.vs-tab-content').forEach(tc => tc.classList.remove('active'));
    const target = document.getElementById(`vs-tab-${tab}`);
    if (target) target.classList.add('active');

    if (tab === 'camera') {
      startCameraStream();
    } else {
      stopCameraStream();
    }
  }

  // Camera Management
  async function startCameraStream() {
    stopCameraStream();
    const video = document.getElementById('vs-video-feed');
    if (!video || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      showToast('Thiết bị của bạn không hỗ trợ camera web');
      return;
    }

    try {
      const constraints = {
        video: {
          facingMode: state.visualSearch.facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      state.visualSearch.stream = stream;
      video.srcObject = stream;
    } catch (err) {
      console.warn('Camera access denied or error:', err);
      showToast('Không thể mở camera. Vui lòng cho phép quyền truy cập.');
    }
  }

  function stopCameraStream() {
    if (state.visualSearch.stream) {
      state.visualSearch.stream.getTracks().forEach(t => t.stop());
      state.visualSearch.stream = null;
    }
  }

  function captureLivePhoto() {
    const video = document.getElementById('vs-video-feed');
    if (!video || !video.videoWidth) {
      showToast('Vui lòng đợi camera sẵn sàng');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
    stopCameraStream();
    loadImageForSearch(dataUrl);
  }

  // Sample Gallery
  function renderSampleGallery() {
    const container = document.getElementById('vs-samples-container');
    if (!container) return;

    container.innerHTML = state.visualSearch.samples.map((s, idx) => `
      <div class="vs-sample-card" onclick="selectSampleItem(${idx})">
        <img class="vs-sample-thumb" src="${s.image}" alt="${s.name}" loading="lazy">
        <div class="vs-sample-info">
          <div class="vs-sample-cat">${s.cat}</div>
          <div class="vs-sample-name">${s.name}</div>
        </div>
      </div>
    `).join('');
  }

  window.selectSampleItem = function (index) {
    const item = state.visualSearch.samples[index];
    if (!item) return;
    loadImageForSearch(item.image);
  };

  function handleSelectedFile(file) {
    if (!file || !file.type.startsWith('image/')) {
      showToast('Vui lòng chọn file hình ảnh hợp lệ (JPG, PNG, WebP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      loadImageForSearch(e.target.result);
    };
    reader.readAsDataURL(file);
  }

  function loadImageForSearch(imgSrc) {
    state.visualSearch.imageSrc = imgSrc;
    const cropImg = document.getElementById('vs-crop-img');
    if (cropImg) {
      cropImg.onload = () => {
        showVisualSearchStep('crop');
        resetCropBox();
      };
      cropImg.src = imgSrc;
    }
  }

  // Interactive Bounding Box Cropper
  function resetCropBox() {
    state.visualSearch.cropBox = { x: 0.1, y: 0.08, width: 0.8, height: 0.84 };
    updateCropBoxUI();
  }

  function updateCropBoxUI() {
    const container = document.getElementById('vs-crop-container');
    const img = document.getElementById('vs-crop-img');
    const box = document.getElementById('vs-crop-box');
    if (!container || !img || !box) return;

    // Get rendered bounds of the image inside container
    const cRect = container.getBoundingClientRect();
    const iRect = img.getBoundingClientRect();

    const imgLeft = iRect.left - cRect.left;
    const imgTop = iRect.top - cRect.top;
    const imgW = iRect.width;
    const imgH = iRect.height;

    const cb = state.visualSearch.cropBox;
    const left = imgLeft + cb.x * imgW;
    const top = imgTop + cb.y * imgH;
    const width = cb.width * imgW;
    const height = cb.height * imgH;

    box.style.left = `${left}px`;
    box.style.top = `${top}px`;
    box.style.width = `${width}px`;
    box.style.height = `${height}px`;
  }

  function initCropperInteractions() {
    const box = document.getElementById('vs-crop-box');
    const container = document.getElementById('vs-crop-container');
    const img = document.getElementById('vs-crop-img');
    if (!box || !container || !img) return;

    let isDragging = false;
    let dragMode = 'move'; // 'move', 'tl', 'tr', 'bl', 'br'
    let startX = 0, startY = 0;
    let startBox = null;

    function onPointerDown(e) {
      const handle = e.target.getAttribute('data-handle');
      if (handle) {
        dragMode = handle;
      } else if (e.target === box || box.contains(e.target)) {
        dragMode = 'move';
      } else {
        return;
      }

      isDragging = true;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      startX = clientX;
      startY = clientY;
      startBox = { ...state.visualSearch.cropBox };
      e.preventDefault();
    }

    function onPointerMove(e) {
      if (!isDragging) return;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      const dx = clientX - startX;
      const dy = clientY - startY;

      const iRect = img.getBoundingClientRect();
      const normDx = dx / (iRect.width || 1);
      const normDy = dy / (iRect.height || 1);

      let { x, y, width, height } = startBox;

      if (dragMode === 'move') {
        x = Math.max(0, Math.min(1 - width, x + normDx));
        y = Math.max(0, Math.min(1 - height, y + normDy));
      } else if (dragMode === 'tl') {
        const newX = Math.max(0, Math.min(x + width - 0.15, x + normDx));
        const newY = Math.max(0, Math.min(y + height - 0.15, y + normDy));
        width += (x - newX);
        height += (y - newY);
        x = newX;
        y = newY;
      } else if (dragMode === 'tr') {
        const newY = Math.max(0, Math.min(y + height - 0.15, y + normDy));
        width = Math.max(0.15, Math.min(1 - x, width + normDx));
        height += (y - newY);
        y = newY;
      } else if (dragMode === 'bl') {
        const newX = Math.max(0, Math.min(x + width - 0.15, x + normDx));
        width += (x - newX);
        height = Math.max(0.15, Math.min(1 - y, height + normDy));
        x = newX;
      } else if (dragMode === 'br') {
        width = Math.max(0.15, Math.min(1 - x, width + normDx));
        height = Math.max(0.15, Math.min(1 - y, height + normDy));
      }

      state.visualSearch.cropBox = { x, y, width, height };
      updateCropBoxUI();
    }

    function onPointerUp() {
      isDragging = false;
    }

    box.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    box.addEventListener('touchstart', onPointerDown, { passive: false });
    window.addEventListener('touchmove', onPointerMove, { passive: false });
    window.addEventListener('touchend', onPointerUp);

    window.addEventListener('resize', () => {
      if (document.getElementById('vs-step-crop').classList.contains('active')) {
        updateCropBoxUI();
      }
    });
  }

  // Feature Extractor via Canvas (Exact mirror of Python extractor)
  function extractVectorFromCroppedImage(img, cropBox) {
    const targetW = 120;
    const targetH = 160;

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');

    // Natural image coordinates
    const natW = img.naturalWidth || img.width;
    const natH = img.naturalHeight || img.height;

    const sx = Math.floor(cropBox.x * natW);
    const sy = Math.floor(cropBox.y * natH);
    const sw = Math.floor(cropBox.width * natW);
    const sh = Math.floor(cropBox.height * natH);

    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);
    const imgData = ctx.getImageData(0, 0, targetW, targetH);
    const data = imgData.data;

    const totalPixels = targetW * targetH;
    const hArr = new Float32Array(totalPixels);
    const sArr = new Float32Array(totalPixels);
    const vArr = new Float32Array(totalPixels);
    const gray = new Float32Array(totalPixels);

    for (let i = 0; i < totalPixels; i++) {
      const idx = i * 4;
      const r = data[idx] / 255.0;
      const g = data[idx + 1] / 255.0;
      const b = data[idx + 2] / 255.0;

      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      const delta = max - min;
      vArr[i] = max;
      sArr[i] = max === 0 ? 0 : delta / (max + 1e-7);

      if (delta < 1e-5) {
        hArr[i] = 0;
      } else if (max === r) {
        hArr[i] = ((60 * ((g - b) / delta)) + 360) % 360;
      } else if (max === g) {
        hArr[i] = ((60 * ((b - r) / delta)) + 120) % 360;
      } else {
        hArr[i] = ((60 * ((r - g) / delta)) + 240) % 360;
      }

      gray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    }

    const gradMag = new Float32Array(totalPixels);
    const gradAng = new Float32Array(totalPixels);
    for (let y = 1; y < targetH - 1; y++) {
      for (let x = 1; x < targetW - 1; x++) {
        const idx = y * targetW + x;
        const gx = gray[idx + 1] - gray[idx - 1];
        const gy = gray[idx + targetW] - gray[idx - targetW];
        gradMag[idx] = Math.sqrt(gx * gx + gy * gy);
        gradAng[idx] = ((Math.atan2(gy, gx) * 180 / Math.PI) + 180) % 360;
      }
    }

    const vectorParts = [];

    // 3 Vùng dọc: 0-30%, 30-65%, 65-100%
    const zones = [
      [0, Math.floor(targetH * 0.30)],
      [Math.floor(targetH * 0.30), Math.floor(targetH * 0.65)],
      [Math.floor(targetH * 0.65), targetH]
    ];

    for (const [yStart, yEnd] of zones) {
      const hHist = new Float32Array(12);
      const sHist = new Float32Array(6);
      const vHist = new Float32Array(6);
      const edgeHist = new Float32Array(8);

      let hSum = 0, sSum = 0, vSum = 0, eSum = 0;

      for (let y = yStart; y < yEnd; y++) {
        for (let x = 0; x < targetW; x++) {
          const idx = y * targetW + x;
          const h = hArr[idx], s = sArr[idx], v = vArr[idx];
          const mag = gradMag[idx], ang = gradAng[idx];

          const hBin = Math.min(11, Math.floor((h / 360) * 12));
          const w = s * v;
          hHist[hBin] += w;
          hSum += w;

          const sBin = Math.min(5, Math.floor(s * 6));
          sHist[sBin] += 1;
          sSum += 1;

          const vBin = Math.min(5, Math.floor(v * 6));
          vHist[vBin] += 1;
          vSum += 1;

          const eBin = Math.min(7, Math.floor((ang / 360) * 8));
          edgeHist[eBin] += mag;
          eSum += mag;
        }
      }

      for (let i = 0; i < 12; i++) vectorParts.push(hHist[i] / (hSum + 1e-7));
      for (let i = 0; i < 6; i++) vectorParts.push(sHist[i] / (sSum + 1e-7));
      for (let i = 0; i < 6; i++) vectorParts.push(vHist[i] / (vSum + 1e-7));
      for (let i = 0; i < 8; i++) vectorParts.push(edgeHist[i] / (eSum + 1e-7));
    }

    // Global
    const ghHist = new Float32Array(16);
    const gsHist = new Float32Array(8);
    const gvHist = new Float32Array(8);
    let ghSum = 0, gsSum = 0, gvSum = 0;

    for (let i = 0; i < totalPixels; i++) {
      const h = hArr[i], s = sArr[i], v = vArr[i];
      const w = s * v;
      const hBin = Math.min(15, Math.floor((h / 360) * 16));
      ghHist[hBin] += w;
      ghSum += w;

      const sBin = Math.min(7, Math.floor(s * 8));
      gsHist[sBin] += 1;
      gsSum += 1;

      const vBin = Math.min(7, Math.floor(v * 8));
      gvHist[vBin] += 1;
      gvSum += 1;
    }

    for (let i = 0; i < 16; i++) vectorParts.push(ghHist[i] / (ghSum + 1e-7));
    for (let i = 0; i < 8; i++) vectorParts.push(gsHist[i] / (gsSum + 1e-7));
    for (let i = 0; i < 8; i++) vectorParts.push(gvHist[i] / (gvSum + 1e-7));

    let sumSq = 0;
    for (let i = 0; i < vectorParts.length; i++) {
      sumSq += vectorParts[i] * vectorParts[i];
    }
    const norm = Math.sqrt(sumSq) + 1e-7;
    for (let i = 0; i < vectorParts.length; i++) {
      vectorParts[i] = vectorParts[i] / norm;
    }

    return { vector: vectorParts, thumbnail: canvas.toDataURL('image/jpeg', 0.85) };
  }

  // Execute Visual Search
  async function executeVisualSearch() {
    const img = document.getElementById('vs-crop-img');
    const scanOverlay = document.getElementById('vs-scanline-overlay');
    if (!img) return;

    if (scanOverlay) scanOverlay.style.display = 'flex';

    // Allow scanning animation to run for at least 700ms for futuristic Shopee visual experience
    const scanPromise = new Promise(resolve => setTimeout(resolve, 700));

    try {
      const { vector, thumbnail } = extractVectorFromCroppedImage(img, state.visualSearch.cropBox);
      state.visualSearch.queryVector = vector;

      // Update query thumbnail in results
      const thumbEl = document.getElementById('vs-query-thumb');
      if (thumbEl) thumbEl.src = thumbnail;

      let results = [];
      let engineUsed = 'client';

      // Attempt Cloudflare Worker if URL configured
      if (state.visualSearch.workerUrl) {
        try {
          const res = await fetch(`${state.visualSearch.workerUrl}/api/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vector: vector, topK: 40 })
          });
          if (res.ok) {
            const data = await res.json();
            results = data.results || [];
            engineUsed = 'worker';
          } else {
            console.warn('Worker returned non-200, fallback to client');
          }
        } catch (workerErr) {
          console.warn('Worker fetch failed, fallback to client:', workerErr);
        }
      }

      // Fallback to local vector search (GitHub Pages Native)
      if (results.length === 0) {
        results = searchCatalogLocally(vector, 40);
        engineUsed = 'client';
      }

      await scanPromise;

      state.visualSearch.results = results;
      state.visualSearch.filteredResults = results;
      state.visualSearch.resultFilter = 'all';

      updateEngineBadge(engineUsed);
      if (scanOverlay) scanOverlay.style.display = 'none';

      showVisualSearchStep('results');
      applyVisualSearchFilters();

    } catch (err) {
      console.error('Visual Search Error:', err);
      if (scanOverlay) scanOverlay.style.display = 'none';
      showToast(`Lỗi tìm kiếm: ${err.message}`);
    }
  }

  function searchCatalogLocally(queryVector, topK = 40) {
    const catalog = window.VISUAL_INDEX || [];
    if (catalog.length === 0) {
      console.warn('window.VISUAL_INDEX is empty or not loaded');
      return [];
    }

    const matches = [];
    const len = queryVector.length;

    for (let i = 0; i < catalog.length; i++) {
      const item = catalog[i];
      const v = item.vector;
      let dot = 0;
      for (let j = 0; j < len; j++) {
        dot += queryVector[j] * v[j];
      }
      const percent = Math.max(0, Math.min(100, Math.round(dot * 100)));
      matches.push({
        ...item,
        similarity: dot,
        similarity_percent: percent
      });
    }

    matches.sort((a, b) => b.similarity - a.similarity);
    return matches.slice(0, topK);
  }

  function applyVisualSearchFilters() {
    const filter = state.visualSearch.resultFilter;
    let list = state.visualSearch.results;

    if (filter !== 'all') {
      list = list.filter(p => p.file_id === filter);
    }

    state.visualSearch.filteredResults = list;
    renderVisualSearchResults();
  }

  function renderVisualSearchResults() {
    const grid = document.getElementById('vs-results-grid');
    const empty = document.getElementById('vs-empty-state');
    const matchCount = document.getElementById('vs-match-count');
    if (!grid) return;

    const list = state.visualSearch.filteredResults;
    if (matchCount) matchCount.textContent = `${list.length} mẫu khớp`;

    if (list.length === 0) {
      grid.innerHTML = '';
      if (empty) empty.style.display = 'flex';
      return;
    }

    if (empty) empty.style.display = 'none';
    grid.innerHTML = list.map(renderProductCard).join('');
  }

  // Lightbox and toast utilities
  window.openLightbox = function (imgSrc, caption) {
    const modal = document.getElementById('lightbox-modal');
    const img = document.getElementById('lightbox-img');
    const cap = document.getElementById('lightbox-caption');
    if (modal && img) {
      img.src = imgSrc;
      if (cap) cap.textContent = caption || '';
      modal.classList.add('open');
    }
  };

  window.closeLightbox = function () {
    const modal = document.getElementById('lightbox-modal');
    if (modal) modal.classList.remove('open');
  };

  function showToast(msg) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toast._timeout);
    toast._timeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 2800);
  }

  function formatVnd(amount) {
    if (!amount || amount <= 0) return '0 ₫';
    return `${amount.toLocaleString('vi-VN')} ₫`;
  }

  // ===================================================
  // VIEW: KICK-OFF SALE 20/10 LOGIC
  // ===================================================
  function initSale2010() {
    if (!state.sale2010 || !state.sale2010.products || state.sale2010.products.length === 0) return;

    // Populate Location Dropdown
    const locSelect = document.getElementById('sale-location-select');
    if (locSelect) {
      const locations = new Set();
      state.sale2010.products.forEach(p => {
        if (p.location && p.location.trim()) locations.add(p.location.trim());
      });
      const sortedLocs = Array.from(locations).sort();
      locSelect.innerHTML = '<option value="all">Tất cả vị trí thùng</option>' +
        sortedLocs.map(loc => `<option value="${loc}">${loc}</option>`).join('');
    }

    // Update Hero Metrics Banner
    const totalCount = state.sale2010.products.length;
    const mayCount = state.sale2010.products.filter(p => p.can_custom_order).length;
    const totalStock = state.sale2010.products.reduce((sum, p) => sum + (p.stock || 1), 0);
    const minPrice = Math.min(...state.sale2010.products.filter(p => p.sale_price > 0).map(p => p.sale_price));

    const totalEl = document.getElementById('sale-metric-total');
    const mayEl = document.getElementById('sale-metric-may');
    const stockEl = document.getElementById('sale-metric-stock');
    const priceEl = document.getElementById('sale-metric-price');

    if (totalEl) totalEl.textContent = totalCount.toLocaleString('vi-VN');
    if (mayEl) mayEl.textContent = mayCount.toLocaleString('vi-VN');
    if (stockEl) stockEl.textContent = totalStock.toLocaleString('vi-VN');
    if (priceEl && isFinite(minPrice)) priceEl.textContent = `Từ ${Math.round(minPrice / 1000)}K`;

    applySaleFilters();
  }

  function applySaleFilters() {
    if (!state.sale2010 || !state.sale2010.products) return;

    const { query, groupFilter, priceFilter, locationFilter, sizeFilter, sort } = state.sale2010;
    const qLower = (query || '').toLowerCase().trim();

    let list = state.sale2010.products.filter(p => {
      // Query filter
      if (qLower) {
        const matchCode = (p.code || '').toLowerCase().includes(qLower);
        const matchName = (p.name || '').toLowerCase().includes(qLower);
        const matchLoc = (p.location || '').toLowerCase().includes(qLower);
        const matchNote = (p.note || '').toLowerCase().includes(qLower);
        const matchCol = (p.collection || '').toLowerCase().includes(qLower);
        const matchGrp = (p.group_name || '').toLowerCase().includes(qLower);
        if (!matchCode && !matchName && !matchLoc && !matchNote && !matchCol && !matchGrp) {
          return false;
        }
      }

      // Group tab filter
      if (groupFilter === 'thung_dg' && p.group !== 'thung_dg') return false;
      if (groupFilter === 'cac_bst' && p.group !== 'cac_bst') return false;
      if (groupFilter === 'prefall_2026' && p.group !== 'prefall_2026') return false;
      if (groupFilter === 'holiday_2025' && p.group !== 'holiday_2025') return false;
      if (groupFilter === 'dat_may' && !p.can_custom_order) return false;

      // Price filter
      if (priceFilter === '860k' && p.sale_price !== 860000) return false;
      if (priceFilter === '2680k' && p.sale_price !== 2680000) return false;
      if (priceFilter === '4680k' && p.sale_price !== 4680000) return false;
      if (priceFilter === 'under_3m' && (p.sale_price <= 0 || p.sale_price >= 3000000)) return false;
      if (priceFilter === '3m_10m' && (p.sale_price < 3000000 || p.sale_price > 10000000)) return false;
      if (priceFilter === 'above_10m' && p.sale_price <= 10000000) return false;

      // Location filter
      if (locationFilter !== 'all' && p.location !== locationFilter) return false;

      // Size filter
      if (sizeFilter !== 'all') {
        const pSizes = p.sizes || {};
        if (!pSizes[sizeFilter] || pSizes[sizeFilter] <= 0) return false;
      }

      return true;
    });

    // Sorting
    if (sort === 'price-asc') {
      list.sort((a, b) => (a.sale_price || 0) - (b.sale_price || 0));
    } else if (sort === 'price-desc') {
      list.sort((a, b) => (b.sale_price || 0) - (a.sale_price || 0));
    } else if (sort === 'discount-desc') {
      list.sort((a, b) => (b.discount_percent || 0) - (a.discount_percent || 0));
    } else if (sort === 'stock-desc') {
      list.sort((a, b) => (b.stock || 0) - (a.stock || 0));
    } else if (sort === 'name-asc') {
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', 'vi'));
    }

    state.sale2010.filteredProducts = list;
    state.sale2010.page = 1;
    renderSaleResults(true);
  }

  function renderSaleResults(reset = true) {
    const grid = document.getElementById('sale-products-grid');
    const empty = document.getElementById('sale-empty-state');
    const countEl = document.getElementById('sale-result-count');
    const pagin = document.getElementById('sale-pagination');
    if (!grid) return;

    const list = state.sale2010.filteredProducts;
    const totalCount = list.length;
    const totalAll = state.sale2010.products.length;

    if (countEl) {
      countEl.textContent = `Đang hiển thị ${Math.min(state.sale2010.page * state.sale2010.pageSize, totalCount)} / ${totalCount} sản phẩm Sale (Tổng kho Sale: ${totalAll})`;
    }

    if (totalCount === 0) {
      grid.innerHTML = '';
      if (empty) empty.style.display = 'flex';
      if (pagin) pagin.style.display = 'none';
      return;
    }

    if (empty) empty.style.display = 'none';

    const visibleCount = state.sale2010.page * state.sale2010.pageSize;
    const visible = list.slice(0, visibleCount);

    grid.innerHTML = visible.map(renderSaleProductCard).join('');

    if (pagin) {
      pagin.style.display = visibleCount < totalCount ? 'flex' : 'none';
    }
  }

  function renderSaleProductCard(p) {
    const isPicked = state.picklist.some(x => x.id === p.id);
    const inStock = (p.stock || 0) > 0;

    let sizesHtml = '';
    if (p.sizes && Object.keys(p.sizes).length > 0) {
      sizesHtml = '<div class="prod-sizes-row">' +
        Object.entries(p.sizes).slice(0, 4).map(([sz, qty]) => `
          <span class="size-tag ${qty > 0 ? 'has-qty' : ''}">${sz}${qty > 1 ? `:${qty}` : ''}</span>
        `).join('') +
        '</div>';
    }

    return `
      <div class="prod-card" onclick="openProductModal('${p.id}')">
        <div class="prod-img-wrap">
          ${p.image
            ? `<img class="prod-img" src="${p.image}" alt="${p.name}" loading="lazy" onerror="this.src='data:image/svg+xml;utf8,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'100\\' height=\\'150\\'><rect fill=\\'%23eee\\' width=\\'100\\' height=\\'150\\'/></svg>'">`
            : `<div class="prod-img-placeholder">
                <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
                <span>Chưa có ảnh</span>
              </div>`
          }
          <span class="prod-stock-badge ${inStock ? 'in-stock' : 'out-stock'}">
            ${inStock ? `Tồn: ${p.stock}` : 'Hết hàng'}
          </span>
          ${p.discount_percent > 0 ? `<span class="prod-discount-badge">-${p.discount_percent}%</span>` : ''}
          <button class="prod-fav-btn ${isPicked ? 'active' : ''}" onclick="togglePicklist('${p.id}', event)" title="Chọn mẫu này">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="${isPicked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
        </div>
        <div class="prod-body">
          <div>
            <div class="prod-meta-top">
              <span class="prod-sku">${p.code}</span>
              <span class="prod-col-tag">${p.group_name || p.collection}</span>
            </div>
            <h4 class="prod-name" title="${p.name}">${p.name}</h4>
            ${p.can_custom_order ? `<span class="prod-tag-custom-order">✨ May Mới Được Giá Sale</span>` : ''}
          </div>
          <div>
            ${p.location ? `<div class="prod-tag-location" style="margin-bottom:6px;">📦 ${p.location}</div>` : ''}
            <div class="prod-price-box">
              ${p.original_price > 0 ? `<div class="prod-orig-price">${p.original_price_formatted}</div>` : ''}
              <div class="prod-price sale-price" style="color:var(--sale);">${p.sale_price_formatted || formatVnd(p.sale_price)}</div>
            </div>
            ${sizesHtml}
            <div style="margin-top:10px; display:flex; gap:6px;">
              <button class="btn-copy-zalo" onclick="copyZaloLead('${p.id}', event)" title="Sao chép thông tin báo giá Zalo">
                📋 Zalo
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  window.copyZaloLead = function (id, event) {
    if (event) event.stopPropagation();
    const p = (state.sale2010 && state.sale2010.products.find(x => x.id === id)) || state.products.find(x => x.id === id);
    if (!p) return;

    const sizesStr = Object.entries(p.sizes || {})
      .filter(([_, q]) => q > 0)
      .map(([s, q]) => `${s}:${q}`)
      .join(', ') || 'Freesize';

    let text = `✨ CHUNG THANH PHONG - PRIVATE SALE 20/10 ✨\n`;
    text += `👗 Mẫu: ${p.name}\n`;
    text += `🏷️ Mã: ${p.code}\n`;
    text += `💰 Giá ưu đãi: ${p.sale_price_formatted || formatVnd(p.sale_price || p.price)}\n`;
    if (p.original_price > 0) {
      text += `💵 Giá gốc: ${p.original_price_formatted} (Giảm ${p.discount_percent}%)\n`;
    }
    text += `📏 Size sẵn kho: ${sizesStr} (Tồn: ${p.stock || 1})\n`;
    if (p.location) {
      text += `📦 Vị trí kho/thùng: ${p.location}\n`;
    }
    if (p.can_custom_order) {
      text += `✨ ĐẶC BIỆT: Nhận đặt may mới size riêng VẪN ÁP DỤNG GIÁ SALE!\n`;
    }
    if (p.note) {
      text += `📝 Ghi chú: ${p.note}\n`;
    }
    text += `\nQuý khách ưng ý mẫu này báo em chốt giữ đồ ngay nhé ạ! ❤️`;

    navigator.clipboard.writeText(text).then(() => {
      showToast(`Đã sao chép tin nhắn tư vấn Zalo cho mẫu ${p.code}!`);
    }).catch(() => {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast(`Đã sao chép tin nhắn Zalo: ${p.code}!`);
    });
  };

  window.resetSaleFilters = function () {
    state.sale2010.query = '';
    state.sale2010.groupFilter = 'all';
    state.sale2010.priceFilter = 'all';
    state.sale2010.locationFilter = 'all';
    state.sale2010.sizeFilter = 'all';
    state.sale2010.sort = 'default';
    state.sale2010.page = 1;

    const searchInput = document.getElementById('sale-search-input');
    const clearBtn = document.getElementById('btn-clear-sale-search');
    const locSelect = document.getElementById('sale-location-select');
    const sortSelect = document.getElementById('sale-sort-select');

    if (searchInput) searchInput.value = '';
    if (clearBtn) clearBtn.style.display = 'none';
    if (locSelect) locSelect.value = 'all';
    if (sortSelect) sortSelect.value = 'default';

    document.querySelectorAll('#sale-group-tabs .sale-grp-btn').forEach((b, idx) => {
      if (idx === 0) b.classList.add('active');
      else b.classList.remove('active');
    });

    document.querySelectorAll('#sale-price-chips .sale-chip-btn').forEach((b, idx) => {
      if (idx === 0) b.classList.add('active');
      else b.classList.remove('active');
    });

    document.querySelectorAll('#sale-size-chips .sale-chip-btn').forEach((b, idx) => {
      if (idx === 0) b.classList.add('active');
      else b.classList.remove('active');
    });

    applySaleFilters();
    showToast('Đã đặt lại bộ lọc Sale 20/10');
  };

})();

