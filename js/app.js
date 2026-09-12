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
    activeTab: 'dashboard',
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
      category: 'all'
    },
    theme: localStorage.getItem('CTP_THEME') || 'light'
  };

  // INITIALIZATION
  document.addEventListener('DOMContentLoaded', initApp);

  async function initApp() {
    initTheme();
    setupDate();
    setupEventListeners();
    await loadAppData();
    renderAllViews();
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
    updatePicklistBadges();
  }

  // RENDER ALL VIEWS
  function renderAllViews() {
    renderDashboard();
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
    state.search.collectionFilter = collectionName;
    state.search.quickFilter = 'all';
    state.search.fileFilter = 'all';
    state.search.query = '';
    state.search.page = 1;

    const searchInput = document.getElementById('search-input');
    if (searchInput) searchInput.value = '';
    const clearBtn = document.getElementById('btn-clear-search');
    if (clearBtn) clearBtn.style.display = 'none';

    document.querySelectorAll('.quick-filter-btn[data-filter]').forEach(b => {
      if (b.getAttribute('data-filter') === 'all') b.classList.add('active');
      else b.classList.remove('active');
    });

    renderModalCollections();

    switchTab('search');
    applySearchFilters();
  };

  // ===================================================
  // VIEW 2: COLLECTIONS LOGIC
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
        <div class="collection-card" onclick="filterByCollection('${col.collection}')">
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
    const prod = state.products.find(p => p.id === id);
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
    const p = state.products.find(x => x.id === id);
    if (!p) return;

    const modal = document.getElementById('product-modal');
    const body = document.getElementById('product-modal-body');
    if (!modal || !body) return;

    const isPicked = state.picklist.some(x => x.id === p.id);

    let sizesGridHtml = '';
    const standardSizes = ['XS', 'S', 'M', 'L', 'XL', '2XL'];
    const pSizes = p.sizes || {};
    sizesGridHtml = standardSizes.map(sz => {
      const qty = pSizes[sz] || 0;
      return `
        <div class="size-cell ${qty > 0 ? 'active-stock' : ''}">
          <div class="size-name-text">${sz}</div>
          <div class="size-qty-text">${qty > 0 ? qty : '-'}</div>
        </div>
      `;
    }).join('');

    body.innerHTML = `
      ${p.image
        ? `<div class="modal-prod-img-wrap" onclick="openLightbox('${p.image}', '${p.name.replace(/'/g, "\\'")}')">
            <img class="modal-prod-img" src="${p.image}" alt="${p.name}">
            <div style="position:absolute;bottom:8px;right:8px;background:rgba(0,0,0,0.6);color:#fff;padding:4px 8px;border-radius:6px;font-size:0.7rem;display:flex;align-items:center;gap:4px;">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
              Bấm để phóng to
            </div>
          </div>`
        : ''
      }

      <div class="modal-prod-badges">
        <span class="prod-stock-badge ${p.stock > 0 ? 'in-stock' : 'out-stock'}" style="position:static;">
          ${p.stock > 0 ? `Còn hàng (Tồn: ${p.stock})` : 'Tạm hết hàng'}
        </span>
        <span class="section-badge">${p.category}</span>
      </div>

      <h3 class="modal-prod-title">${p.name}</h3>

      <div class="modal-sku-row">
        <div>
          <span style="font-size:0.7rem;color:var(--text-muted);display:block;">MÃ HÀNG / SKU:</span>
          <span class="sku-code-text" id="modal-sku-text">${p.code}</span>
        </div>
        <button class="btn-copy-sku" onclick="copySku('${p.code}')">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          Sao chép mã
        </button>
      </div>

      <div class="modal-price-box">
        <div style="font-size:0.75rem;color:var(--text-secondary);text-transform:uppercase;letter-spacing:0.5px;">Giá Niêm Yết:</div>
        <div class="modal-price-main">${p.price_formatted}</div>
        ${p.rent_price > 0 ? `<div class="modal-rent-price">🏷️ Giá áp dụng thuê: <strong>${p.rent_price_formatted}</strong></div>` : ''}
      </div>

      <div class="modal-section-heading">Chi Tiết Tồn Kho Theo Size</div>
      <div class="size-matrix-grid">
        ${sizesGridHtml}
      </div>

      <div class="modal-section-heading">Thông Tin Kho & Lưu Trữ</div>
      <table class="info-list-table">
        <tr>
          <td>Bộ Sưu Tập</td>
          <td>${p.collection}</td>
        </tr>
        <tr>
          <td>File Kho Nguồn</td>
          <td>${p.file_name}</td>
        </tr>
        ${p.barcode ? `<tr><td>Mã Barcode</td><td style="font-family:monospace;">${p.barcode}</td></tr>` : ''}
        ${p.note ? `<tr><td>Vị Trí / Ghi Chú</td><td style="color:var(--gold-primary);">${p.note}</td></tr>` : ''}
        ${p.total_value > 0 ? `<tr><td>Tổng Giá Trị Tồn</td><td>${p.total_value_formatted}</td></tr>` : ''}
      </table>

      <button class="btn-modal-add-pick" onclick="togglePicklist('${p.id}'); openProductModal('${p.id}');">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="${isPicked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
        ${isPicked ? 'Đã có trong danh sách chọn (Bấm để hủy)' : 'Thêm vào danh sách chọn đồ / Soạn kho'}
      </button>
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
  // LIGHTBOX
  // ===================================================
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

  // ===================================================
  // TOAST UTILITY
  // ===================================================
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

})();
