/*
 * Bộ chọn sản phẩm mục tiêu — dùng chung cho Soạn khảo sát và Soạn chiến dịch.
 * Hai cách chọn gộp lại (hợp): sản phẩm cụ thể + bộ lọc nâng cao.
 * Chỉ gọi các API đọc catalog của CRM; không ghi gì vào sản phẩm.
 */
(function () {
  "use strict";

  const TYPE_LABELS = {
    controller: "Tay cầm",
    game_disc: "Đĩa game",
    accessory: "Phụ kiện",
    console: "Máy console"
  };
  const FILTER_FIELDS = ["keyword", "productType", "categoryId", "genre", "platform", "priceMin", "priceMax"];
  const money = new Intl.NumberFormat("vi-VN");

  function esc(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function typeLabel(type) {
    return TYPE_LABELS[type] || type || "Khác";
  }

  function priceLabel(price) {
    return price == null ? "—" : `${money.format(Number(price))} ₫`;
  }

  function debounce(fn, wait) {
    let timer = 0;
    const wrapped = (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), wait);
    };
    wrapped.cancel = () => clearTimeout(timer);
    return wrapped;
  }

  function queryOf(filter) {
    const params = new URLSearchParams();
    Object.entries(filter).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== "") {
        params.set(key, String(value));
      }
    });
    return params.toString();
  }

  const CLOSE_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';

  function create(root, options) {
    const request = options.request;
    const onChange = options.onChange || function () {};
    const onPreview = options.onPreview || function () {};
    const uid = `pt${Math.random().toString(36).slice(2, 7)}`;

    const state = {
      tab: "pick",
      disabled: false,
      selected: new Map(),
      catalog: new Map(),
      results: [],
      total: 0,
      keyword: "",
      listLoading: true,
      listError: "",
      preview: null,
      sample: null,
      sampleStale: true,
      sampleLoading: false,
      previewError: "",
      previewSeq: 0,
      listSeq: 0
    };

    root.classList.add("pt");
    root.innerHTML = `
      <div class="chips pt-tabs" role="tablist" aria-label="Cách chọn sản phẩm">
        <button type="button" class="chip is-active" role="tab" id="${uid}-tab-pick" aria-selected="true"
          aria-controls="${uid}-pick" data-tab="pick">Sản phẩm cụ thể<span class="chip-count" data-count="pick">0</span></button>
        <button type="button" class="chip" role="tab" id="${uid}-tab-filter" aria-selected="false" tabindex="-1"
          aria-controls="${uid}-filter" data-tab="filter">Bộ lọc nâng cao<span class="chip-count" data-count="filter">0</span></button>
      </div>

      <div class="pt-panel" role="tabpanel" id="${uid}-pick" aria-labelledby="${uid}-tab-pick" data-panel="pick">
        <label class="pt-field">
          Tìm sản phẩm
          <input type="search" data-search placeholder="Tên sản phẩm hoặc thương hiệu" autocomplete="off">
        </label>
        <div class="pt-list">
          <div class="pt-listhead">
            <label class="pt-check"><input type="checkbox" data-selectall="pick"><span>Chọn tất cả</span></label>
            <span class="pt-listcount" data-listcount="pick"></span>
          </div>
          <ul class="pt-results" data-results aria-label="Danh sách sản phẩm đang bán"></ul>
        </div>
      </div>

      <div class="pt-panel" role="tabpanel" id="${uid}-filter" aria-labelledby="${uid}-tab-filter" data-panel="filter" hidden>
        <p class="hint">Mọi sản phẩm khớp đủ các tiêu chí dưới đây đều thuộc mục tiêu, kể cả sản phẩm thêm mới sau này. Tick trong danh sách để ghim riêng, hoặc « Chọn tất cả » để chuyển kết quả hiện tại thành danh sách cụ thể.</p>
        <div class="pt-grid">
          <label class="pt-field">Từ khóa<input data-f="keyword" maxlength="100" placeholder="Tên hoặc thương hiệu" autocomplete="off"></label>
          <label class="pt-field">Loại sản phẩm<select data-f="productType"><option value="">Tất cả</option></select></label>
          <label class="pt-field">Danh mục<select data-f="categoryId"><option value="">Tất cả</option></select></label>
          <label class="pt-field">Thể loại game<select data-f="genre"><option value="">Tất cả</option></select></label>
          <label class="pt-field">Nền tảng<select data-f="platform"><option value="">Tất cả</option></select></label>
          <label class="pt-field">Giá từ (₫)<input type="number" min="0" step="1000" inputmode="numeric" data-f="priceMin" placeholder="0"></label>
          <label class="pt-field">Giá đến (₫)<input type="number" min="0" step="1000" inputmode="numeric" data-f="priceMax" placeholder="Không giới hạn"></label>
        </div>
        <div class="pt-actions">
          <label class="pt-check"><input type="checkbox" data-f="publishedOnly" checked>Chỉ sản phẩm đang bán</label>
          <button type="button" class="btn-ghost" data-reset-filter>Xóa bộ lọc</button>
        </div>
        <div class="pt-list">
          <div class="pt-listhead">
            <label class="pt-check"><input type="checkbox" data-selectall="filter"><span>Chọn tất cả</span></label>
            <span class="pt-listcount" data-listcount="filter"></span>
          </div>
          <ul class="pt-results" data-filter-results aria-label="Sản phẩm khớp bộ lọc"></ul>
        </div>
      </div>

      <div class="pt-selected" data-selected></div>
      <p class="pt-summary" data-summary role="status" aria-live="polite"></p>
    `;

    const $ = (selector) => root.querySelector(selector);
    const resultsEl = $("[data-results]");
    const filterResultsEl = $("[data-filter-results]");
    const selectedEl = $("[data-selected]");
    const summaryEl = $("[data-summary]");
    const searchEl = $("[data-search]");
    const fieldEl = (name) => $(`[data-f="${name}"]`);

    /* ---------- giá trị ---------- */

    function filterCriteria() {
      const filter = {};
      let count = 0;
      FILTER_FIELDS.forEach((name) => {
        const raw = fieldEl(name).value.trim();
        if (raw) {
          filter[name] = raw;
          count += 1;
        } else {
          filter[name] = null;
        }
      });
      filter.publishedOnly = fieldEl("publishedOnly").checked;
      return { filter, count };
    }

    function filterValue() {
      const { filter, count } = filterCriteria();
      return count ? filter : null;
    }

    function value() {
      return { productIds: [...state.selected.keys()], filter: filterValue() };
    }

    function priceRangeInvalid() {
      const min = fieldEl("priceMin").value;
      const max = fieldEl("priceMax").value;
      return min !== "" && max !== "" && Number(min) > Number(max);
    }

    /* ---------- hiển thị ---------- */

    function syncCounts() {
      $('[data-count="pick"]').textContent = String(state.selected.size);
      $('[data-count="filter"]').textContent = String(filterCriteria().count);
    }

    function productName(id) {
      const product = state.catalog.get(id);
      return product ? product.name : `Sản phẩm ${String(id).slice(0, 8)}`;
    }

    function renderSelected() {
      if (!state.selected.size) {
        selectedEl.innerHTML = "";
        selectedEl.hidden = true;
        return;
      }
      selectedEl.hidden = false;
      selectedEl.innerHTML = [...state.selected.keys()].map((id) => {
        const name = productName(id);
        return `<span class="pt-tag"><span>${esc(name)}</span>
          <button type="button" data-remove="${esc(id)}" aria-label="Bỏ chọn ${esc(name)}" ${state.disabled ? "disabled" : ""}>${CLOSE_ICON}</button></span>`;
      }).join("");
    }

    function rowsHtml(items, total, capHint) {
      const rows = items.map((product) => {
        const checked = state.selected.has(product.id);
        const meta = [product.brandName, typeLabel(product.productType), product.genre, (product.platforms || []).join(", ")]
          .filter(Boolean)
          .map(esc)
          .join(" · ");
        return `<li><label class="pt-row${checked ? " is-selected" : ""}">
          <input type="checkbox" data-id="${esc(product.id)}" ${checked ? "checked" : ""} ${state.disabled ? "disabled" : ""}>
          <span class="pt-info"><span class="pt-name">${esc(product.name)}</span><span class="pt-meta">${meta}</span></span>
          <span class="pt-price">${priceLabel(product.price)}</span>
        </label></li>`;
      });
      if (total > items.length) {
        rows.push(`<li class="pt-state">Hiển thị ${items.length}/${total} sản phẩm. ${capHint}</li>`);
      }
      return rows.join("");
    }

    /** Sản phẩm đang hiển thị trong danh sách của tab, dùng cho « Chọn tất cả ». */
    function listItems(kind) {
      if (kind === "pick") {
        return state.listLoading || state.listError ? [] : state.results;
      }
      return filterValue() && !priceRangeInvalid() && !state.sampleLoading && state.sample
        ? state.sample.products
        : [];
    }

    function listTotal(kind) {
      return kind === "pick" ? state.total : (state.sample ? state.sample.total : 0);
    }

    function syncSelectAll() {
      ["pick", "filter"].forEach((kind) => {
        const box = $(`[data-selectall="${kind}"]`);
        const countEl = $(`[data-listcount="${kind}"]`);
        const items = listItems(kind);
        const picked = items.filter((product) => state.selected.has(product.id)).length;
        box.disabled = state.disabled || items.length === 0;
        box.checked = items.length > 0 && picked === items.length;
        box.indeterminate = picked > 0 && picked < items.length;
        countEl.textContent = items.length
          ? `${picked}/${items.length} đã chọn${listTotal(kind) > items.length ? ` (còn ${listTotal(kind) - items.length} chưa hiển thị)` : ""}`
          : "";
      });
    }

    /** Đồng bộ tick ở mọi danh sách theo state.selected mà không dựng lại (giữ vị trí cuộn). */
    function syncChecks() {
      root.querySelectorAll("[data-id]").forEach((box) => {
        const on = state.selected.has(box.dataset.id);
        box.checked = on;
        box.closest(".pt-row").classList.toggle("is-selected", on);
      });
      syncSelectAll();
    }

    function renderResults() {
      if (state.listLoading) {
        resultsEl.innerHTML = '<li class="pt-state">Đang tải sản phẩm…</li>';
      } else if (state.listError) {
        resultsEl.innerHTML = `<li class="pt-state is-error">${esc(state.listError)}
          <button type="button" class="btn-ghost" data-retry>Thử lại</button></li>`;
      } else if (!state.results.length) {
        const forKeyword = state.keyword ? ` cho « ${esc(state.keyword)} »` : "";
        resultsEl.innerHTML = `<li class="pt-state">Không tìm thấy sản phẩm đang bán${forKeyword}.
          Thử từ khóa ngắn hơn, hoặc dùng tab Bộ lọc nâng cao.</li>`;
      } else {
        resultsEl.innerHTML = rowsHtml(state.results, state.total, "Thu hẹp từ khóa để xem thêm.");
      }
      syncSelectAll();
    }

    function renderFilterResults() {
      if (!filterValue()) {
        filterResultsEl.innerHTML = '<li class="pt-state">Nhập ít nhất một tiêu chí ở trên để xem sản phẩm khớp.</li>';
      } else if (priceRangeInvalid()) {
        filterResultsEl.innerHTML = '<li class="pt-state is-error">Giá từ đang lớn hơn giá đến. Hãy sửa lại khoảng giá.</li>';
      } else if (state.previewError) {
        filterResultsEl.innerHTML = `<li class="pt-state is-error">${esc(state.previewError)}</li>`;
      } else if (state.sampleLoading || !state.sample) {
        filterResultsEl.innerHTML = '<li class="pt-state">Đang tải sản phẩm khớp…</li>';
      } else if (!state.sample.products.length) {
        filterResultsEl.innerHTML = `<li class="pt-state">Không có sản phẩm nào khớp bộ lọc.
          Thử nới bớt tiêu chí, bỏ giới hạn giá hoặc bỏ « Chỉ sản phẩm đang bán ».</li>`;
      } else {
        filterResultsEl.innerHTML = rowsHtml(state.sample.products, state.sample.total, "Thêm tiêu chí để thu hẹp kết quả.");
      }
      syncSelectAll();
    }

    function renderSummary() {
      const val = value();
      const hasFilter = Boolean(val.filter);
      summaryEl.classList.remove("is-warn");
      if (!val.productIds.length && !hasFilter) {
        summaryEl.textContent = "Chưa chọn sản phẩm nào. Bỏ trống nếu không gắn theo sản phẩm.";
        return;
      }
      if (priceRangeInvalid()) {
        summaryEl.classList.add("is-warn");
        summaryEl.textContent = "Giá từ đang lớn hơn giá đến. Hãy sửa lại khoảng giá.";
        return;
      }
      if (state.previewError) {
        summaryEl.classList.add("is-warn");
        summaryEl.textContent = `Không ước tính được: ${state.previewError}`;
        return;
      }
      if (!state.preview) {
        summaryEl.textContent = "Đang ước tính…";
        return;
      }
      const { productCount, activeBuyerCount } = state.preview;
      if (!productCount) {
        summaryEl.classList.add("is-warn");
        summaryEl.textContent = "Bộ lọc chưa khớp sản phẩm nào. Thử nới bớt tiêu chí hoặc bỏ giới hạn giá.";
        return;
      }
      let text = `${productCount} sản phẩm khớp · ${activeBuyerCount} khách đang hoạt động đã mua.`;
      if (hasFilter && state.sample && state.sample.total === 0) {
        summaryEl.classList.add("is-warn");
        text += " Bộ lọc hiện chưa khớp sản phẩm nào, thử nới bớt tiêu chí.";
      }
      summaryEl.textContent = text;
    }

    function setTab(tab, focus) {
      state.tab = tab;
      root.querySelectorAll("[data-tab]").forEach((button) => {
        const active = button.dataset.tab === tab;
        button.classList.toggle("is-active", active);
        button.setAttribute("aria-selected", String(active));
        button.tabIndex = active ? 0 : -1;
        if (active && focus) {
          button.focus();
        }
      });
      root.querySelectorAll("[data-panel]").forEach((panel) => {
        panel.hidden = panel.dataset.panel !== tab;
      });
    }

    /* ---------- dữ liệu ---------- */

    function remember(products) {
      (products || []).forEach((product) => state.catalog.set(product.id, product));
    }

    async function loadList() {
      const token = ++state.listSeq;
      state.listLoading = true;
      state.listError = "";
      renderResults();
      try {
        const query = queryOf({ keyword: state.keyword, publishedOnly: true });
        const body = await request(`/api/crm/products?${query}`);
        if (token !== state.listSeq) {
          return;
        }
        state.results = body.products || [];
        state.total = body.total || state.results.length;
        remember(state.results);
        state.listLoading = false;
        renderResults();
        renderSelected();
      } catch (error) {
        if (token !== state.listSeq) {
          return;
        }
        state.listLoading = false;
        state.listError = /HTTP 40[13]/.test(error.message) || error.message === "Unexpected end of JSON input"
          ? "Chọn tài khoản CRM ở cột trái để tải danh sách sản phẩm."
          : error.message;
        renderResults();
      }
    }

    function fillSelect(name, items) {
      const select = fieldEl(name);
      const current = select.value;
      const known = items.some((item) => String(item.value) === current);
      const extra = current && !known ? [{ value: current, label: current }] : [];
      select.innerHTML = '<option value="">Tất cả</option>' + items.concat(extra)
        .map((item) => `<option value="${esc(item.value)}">${esc(item.label)}</option>`)
        .join("");
      select.value = current;
    }

    async function loadFacets() {
      try {
        const facets = await request("/api/crm/products/facets");
        fillSelect("productType", (facets.productTypes || []).map((item) => ({ value: item, label: typeLabel(item) })));
        fillSelect("categoryId", (facets.categories || []).map((item) => ({ value: item.id, label: item.name || "Không tên" })));
        fillSelect("genre", (facets.genres || []).map((item) => ({ value: item, label: item })));
        fillSelect("platform", (facets.platforms || []).map((item) => ({ value: item, label: item })));
      } catch (error) {
        // Bộ lọc vẫn dùng được với từ khóa và khoảng giá; chỉ các ô chọn trống.
      }
    }

    async function resolveNames() {
      const missing = [...state.selected.keys()].filter((id) => !state.catalog.has(id));
      if (!missing.length) {
        return;
      }
      try {
        const body = await request(`/api/crm/products/lookup?ids=${missing.map(encodeURIComponent).join(",")}`);
        remember(body.products);
        renderSelected();
      } catch (error) {
        // Giữ nhãn rút gọn theo mã nếu không tra được tên.
      }
    }

    const refreshPreview = debounce(async () => {
      const val = value();
      const hasFilter = Boolean(val.filter);
      state.previewError = "";
      if ((!val.productIds.length && !hasFilter) || priceRangeInvalid()) {
        state.previewSeq += 1;
        state.preview = null;
        state.sample = null;
        state.sampleStale = false;
        state.sampleLoading = false;
        renderSummary();
        renderFilterResults();
        onPreview(null);
        return;
      }
      const token = ++state.previewSeq;
      // Chỉ tải lại danh sách khớp bộ lọc khi tiêu chí đổi; đổi tick không cần tải lại.
      const needSample = hasFilter && state.sampleStale;
      try {
        const [preview, sample] = await Promise.all([
          request("/api/crm/products/audience-preview", { method: "POST", body: JSON.stringify(val) }),
          needSample ? request(`/api/crm/products?${queryOf(val.filter)}`) : Promise.resolve(state.sample)
        ]);
        if (token !== state.previewSeq) {
          return;
        }
        remember(sample && sample.products);
        state.preview = preview;
        state.sample = hasFilter ? sample : null;
        state.sampleStale = false;
        state.sampleLoading = false;
        renderSummary();
        renderFilterResults();
        onPreview(preview);
      } catch (error) {
        if (token !== state.previewSeq) {
          return;
        }
        state.preview = null;
        state.sample = null;
        state.sampleLoading = false;
        state.previewError = error.message;
        renderSummary();
        renderFilterResults();
        onPreview(null);
      }
    }, 300);

    /** @param selectionOnly true khi chỉ đổi tick sản phẩm, không đổi tiêu chí lọc. */
    function changed(selectionOnly) {
      state.preview = null;
      state.previewError = "";
      if (!selectionOnly) {
        state.sample = null;
        state.sampleStale = true;
        state.sampleLoading = Boolean(filterValue()) && !priceRangeInvalid();
        renderFilterResults();
      }
      syncCounts();
      renderSummary();
      refreshPreview();
      onChange(value());
    }

    /* ---------- sự kiện ---------- */

    root.addEventListener("click", (event) => {
      const tab = event.target.closest("[data-tab]");
      if (tab) {
        setTab(tab.dataset.tab, false);
        return;
      }
      const remove = event.target.closest("[data-remove]");
      if (remove && !state.disabled) {
        state.selected.delete(remove.dataset.remove);
        renderSelected();
        syncChecks();
        changed(true);
        return;
      }
      if (event.target.closest("[data-retry]")) {
        loadList();
        return;
      }
      if (event.target.closest("[data-reset-filter]") && !state.disabled) {
        clearFilterFields();
        changed();
      }
    });

    root.addEventListener("keydown", (event) => {
      const tab = event.target.closest("[data-tab]");
      if (!tab || !["ArrowLeft", "ArrowRight"].includes(event.key)) {
        return;
      }
      event.preventDefault();
      setTab(tab.dataset.tab === "pick" ? "filter" : "pick", true);
    });

    const searchDebounced = debounce(() => {
      state.keyword = searchEl.value.trim();
      loadList();
    }, 250);
    searchEl.addEventListener("input", searchDebounced);

    // Tick từng sản phẩm hoặc « Chọn tất cả » — dùng chung cho cả hai tab.
    root.addEventListener("change", (event) => {
      if (state.disabled) {
        return;
      }
      const box = event.target.closest("[data-id]");
      if (box) {
        if (box.checked) {
          state.selected.set(box.dataset.id, true);
        } else {
          state.selected.delete(box.dataset.id);
        }
        syncChecks();
        renderSelected();
        changed(true);
        return;
      }
      const all = event.target.closest("[data-selectall]");
      if (all) {
        listItems(all.dataset.selectall).forEach((product) => {
          if (all.checked) {
            state.selected.set(product.id, true);
          } else {
            state.selected.delete(product.id);
          }
        });
        syncChecks();
        renderSelected();
        changed(true);
      }
    });

    // Chỉ các ô tiêu chí lọc mới làm đổi bộ lọc.
    const filterPanel = root.querySelector('[data-panel="filter"]');
    ["input", "change"].forEach((type) => {
      filterPanel.addEventListener(type, (event) => {
        if (!state.disabled && event.target.closest("[data-f]")) {
          changed(false);
        }
      });
    });

    /* ---------- API công khai ---------- */

    function clearFilterFields() {
      FILTER_FIELDS.forEach((name) => {
        fieldEl(name).value = "";
      });
      fieldEl("publishedOnly").checked = true;
    }

    function setSelectValue(name, raw) {
      const select = fieldEl(name);
      const wanted = raw == null ? "" : String(raw);
      if (wanted && ![...select.options].some((option) => option.value === wanted)) {
        select.insertAdjacentHTML("beforeend", `<option value="${esc(wanted)}">${esc(wanted)}</option>`);
      }
      select.value = wanted;
    }

    function setValue(next) {
      const target = next || {};
      state.selected = new Map((target.productIds || []).map((id) => [id, true]));
      clearFilterFields();
      const filter = target.filter;
      if (filter) {
        fieldEl("keyword").value = filter.keyword || "";
        setSelectValue("productType", filter.productType);
        setSelectValue("categoryId", filter.categoryId);
        setSelectValue("genre", filter.genre);
        setSelectValue("platform", filter.platform);
        fieldEl("priceMin").value = filter.priceMin ?? "";
        fieldEl("priceMax").value = filter.priceMax ?? "";
        fieldEl("publishedOnly").checked = filter.publishedOnly !== false;
      }
      setTab(state.selected.size || !filter ? "pick" : "filter", false);
      renderSelected();
      renderResults();
      syncCounts();
      state.preview = null;
      state.sample = null;
      state.sampleStale = true;
      state.sampleLoading = Boolean(filterValue()) && !priceRangeInvalid();
      state.previewError = "";
      renderFilterResults();
      renderSummary();
      refreshPreview();
      resolveNames();
    }

    function setDisabled(flag) {
      state.disabled = Boolean(flag);
      root.classList.toggle("is-disabled", state.disabled);
      root.querySelectorAll("input, select, [data-reset-filter]").forEach((element) => {
        element.disabled = state.disabled;
      });
      renderSelected();
      renderResults();
      renderFilterResults();
    }

    syncCounts();
    renderSelected();
    renderFilterResults();
    renderSummary();
    const ready = Promise.all([loadFacets(), loadList()]);

    return {
      ready,
      value,
      hasTarget: () => {
        const val = value();
        return val.productIds.length > 0 || Boolean(val.filter);
      },
      setValue,
      reset: () => {
        searchEl.value = "";
        state.keyword = "";
        setValue(null);
        loadList();
      },
      setDisabled,
      reload: () => Promise.all([loadFacets(), loadList()])
    };
  }

  window.ProductTargetPicker = { create, typeLabel, priceLabel };
})();
