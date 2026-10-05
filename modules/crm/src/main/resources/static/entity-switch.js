/**
 * Thanh tìm nhanh dùng chung (pattern Thống kê khảo sát):
 * Ghim / gần đây · Đổi … · Ctrl/⌘K palette.
 *
 * createEntitySwitch({
 *   root, pinKey, recentKey,
 *   labels: { switchLabel, switchPlaceholder, searchLabel, paletteTitle, palettePlaceholder, emptyTitle, emptyHint, noun },
 *   getItems: () => [{ id, title, subtitle?, badge?: {label,tone}, searchText?, email?, phone?, sortAt? }],
 *   getSelectedId: () => string,
 *   onSelect: (id) => void,
 *   isEnabled?: () => boolean,
 *   groupItems?: (items) => [{ label, items }],
 *   dateOf?: (item) => string|Date|null,
 *   showDateFilter?: boolean,
 *   quickLimit?: number,
 *   denseThreshold?: number
 * })
 */
(function (global) {
  const PIN_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 17v5"/><path d="M9 4h6v2H9z"/><path d="M8 6h8l-1 5.2a2 2 0 0 0 .4 1.6L17 15H7l1.6-2.2a2 2 0 0 0 .4-1.6z"/></svg>';
  const SEARCH_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>';
  const CHEVRON_SVG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

  function fold(value) {
    return String(value ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function foldPhone(value) {
    return fold(value).replace(/[\s().+\-]/g, "");
  }

  /** Tách họ / tên kiểu Việt: từ cuối = tên, từ đầu = họ. */
  function nameParts(fullName) {
    const parts = fold(fullName).trim().split(/\s+/).filter(Boolean);
    if (!parts.length) {
      return { family: "", given: "", tokens: [] };
    }
    return {
      family: parts[0],
      given: parts[parts.length - 1],
      tokens: parts
    };
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  }

  function localDay(value) {
    if (!value) return "";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
  }

  function formatDate(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function highlight(text, query) {
    const source = String(text ?? "");
    const needle = query.trim().toLowerCase();
    if (!needle) return escapeHtml(source);
    const lower = source.toLowerCase();
    let html = "";
    let from = 0;
    let at = lower.indexOf(needle, from);
    if (at < 0) return escapeHtml(source);
    while (at >= 0) {
      html += escapeHtml(source.slice(from, at));
      html += `<mark>${escapeHtml(source.slice(at, at + needle.length))}</mark>`;
      from = at + needle.length;
      at = lower.indexOf(needle, from);
    }
    return html + escapeHtml(source.slice(from));
  }

  function readIds(key) {
    try {
      const parsed = JSON.parse(localStorage.getItem(key) || "[]");
      return Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
    } catch {
      return [];
    }
  }

  function writeIds(key, ids) {
    localStorage.setItem(key, JSON.stringify(ids));
  }

  function createEntitySwitch(options) {
    const root = typeof options.root === "string"
      ? document.querySelector(options.root)
      : options.root;
    if (!root) {
      throw new Error("entity-switch: thiếu root");
    }

    const pinKey = options.pinKey;
    const recentKey = options.recentKey;
    const quickLimit = options.quickLimit || 5;
    const denseThreshold = options.denseThreshold || 80;
    const showDateFilter = options.showDateFilter !== false;
    const labels = {
      quickLabel: "Ghim và xem gần đây",
      switchLabel: "Đổi mục",
      switchPlaceholder: "Gõ để tìm…",
      searchLabel: "Tìm",
      paletteTitle: "Tìm kiếm",
      palettePlaceholder: "Gõ để tìm…",
      emptyTitle: "Không có kết quả khớp.",
      emptyHint: "Thử một phần tên khác.",
      noun: "mục",
      ...(options.labels || {})
    };

    const uid = `es-${Math.random().toString(36).slice(2, 9)}`;
    const state = {
      filter: "",
      comboOpen: false,
      active: 0,
      comboFlat: [],
      paletteOpen: false,
      paletteFrom: "",
      paletteTo: "",
      paletteActive: 0,
      paletteFlat: []
    };
    let paletteReturn = null;

    root.classList.add("survey-switch");
    root.innerHTML = `
      <div class="survey-quick" data-es-quick hidden></div>
      <div class="survey-switch-row">
        <div class="combo" data-es-combo>
          <label for="${uid}-combo">Đổi ${escapeHtml(labels.noun)}</label>
          <div class="combo-control" data-es-combo-control>
            <input id="${uid}-combo" type="text" role="combobox" aria-expanded="false" aria-controls="${uid}-combo-list" aria-autocomplete="list" placeholder="${escapeHtml(labels.switchPlaceholder)}" autocomplete="off" spellcheck="false" data-es-combo-input>
            <button class="icon-btn combo-toggle" type="button" data-es-combo-toggle aria-label="Mở danh sách" aria-expanded="false" aria-controls="${uid}-combo-list">
              ${CHEVRON_SVG}
            </button>
          </div>
          <div id="${uid}-combo-list" class="combo-list" role="listbox" aria-label="${escapeHtml(labels.switchLabel)}" hidden data-es-combo-list></div>
        </div>
        <button class="icon-btn pin-current" type="button" data-es-pin aria-pressed="false" aria-label="Ghim đang chọn" disabled>
          ${PIN_SVG}
        </button>
        <button class="palette-trigger" type="button" data-es-palette-trigger>
          ${SEARCH_SVG}
          <span data-es-palette-label>${escapeHtml(labels.searchLabel)}</span>
          <kbd data-es-palette-kbd>Ctrl K</kbd>
        </button>
      </div>`;

    const paletteEl = document.createElement("div");
    paletteEl.className = "palette";
    paletteEl.hidden = true;
    paletteEl.innerHTML = `
      <div class="palette-scrim" data-es-close-palette></div>
      <div class="palette-card" role="dialog" aria-modal="true" aria-labelledby="${uid}-palette-title">
        <h2 id="${uid}-palette-title" class="sr-only">${escapeHtml(labels.paletteTitle)}</h2>
        <label class="palette-search">
          ${SEARCH_SVG}
          <input type="search" role="combobox" aria-expanded="false" aria-controls="${uid}-palette-results" aria-autocomplete="list" placeholder="${escapeHtml(labels.palettePlaceholder)}" autocomplete="off" spellcheck="false" data-es-palette-query>
        </label>
        ${showDateFilter ? `
        <div class="palette-range">
          <label class="palette-date">Từ ngày
            <input type="date" data-es-palette-from>
          </label>
          <label class="palette-date">Đến ngày
            <input type="date" data-es-palette-to>
          </label>
          <button type="button" class="btn-ghost palette-clear" data-es-palette-clear hidden>Xóa ngày</button>
        </div>` : ""}
        <div id="${uid}-palette-results" class="palette-results" role="listbox" aria-label="${escapeHtml(labels.paletteTitle)}" data-es-palette-results></div>
        <p class="palette-hint">Mũi tên chọn · Enter mở · Esc đóng</p>
      </div>`;
    document.body.appendChild(paletteEl);

    const quickEl = root.querySelector("[data-es-quick]");
    const comboWrap = root.querySelector("[data-es-combo]");
    const comboControl = root.querySelector("[data-es-combo-control]");
    const comboInput = root.querySelector("[data-es-combo-input]");
    const comboToggle = root.querySelector("[data-es-combo-toggle]");
    const comboList = root.querySelector("[data-es-combo-list]");
    const pinCurrent = root.querySelector("[data-es-pin]");
    const paletteTrigger = root.querySelector("[data-es-palette-trigger]");
    const paletteLabel = root.querySelector("[data-es-palette-label]");
    const paletteKbd = root.querySelector("[data-es-palette-kbd]");
    const paletteQuery = paletteEl.querySelector("[data-es-palette-query]");
    const paletteFrom = paletteEl.querySelector("[data-es-palette-from]");
    const paletteTo = paletteEl.querySelector("[data-es-palette-to]");
    const paletteClear = paletteEl.querySelector("[data-es-palette-clear]");
    const paletteResults = paletteEl.querySelector("[data-es-palette-results]");

    paletteKbd.textContent = /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘K" : "Ctrl K";

    function items() {
      return (options.getItems() || []).filter((item) => item && item.id);
    }

    function selectedId() {
      return options.getSelectedId() || "";
    }

    function selectedItem() {
      const id = selectedId();
      return items().find((item) => item.id === id) || null;
    }

    function enabled() {
      return options.isEnabled ? Boolean(options.isEnabled()) : true;
    }

    function dateOf(item) {
      if (options.dateOf) return options.dateOf(item);
      return item.sortAt || item.createdAt || null;
    }

    function existing(ids) {
      const known = new Map(items().map((item) => [item.id, item]));
      return ids.map((id) => known.get(id)).filter(Boolean);
    }

    function isPinned(id) {
      return readIds(pinKey).includes(id);
    }

    function byNewest(list) {
      return [...list].sort((left, right) => {
        const delta = new Date(dateOf(right) || 0) - new Date(dateOf(left) || 0);
        if (delta !== 0) return delta;
        return String(left.title || "").localeCompare(String(right.title || ""), "vi");
      });
    }

    /**
     * Điểm khớp thấp hơn = ưu tiên cao hơn khi gợi ý.
     * Tên (từ cuối) trước họ (từ đầu), rồi email / SĐT / trường khác.
     */
    function matchRank(item, query) {
      const raw = String(query ?? "").trim();
      const needle = fold(raw);
      if (!needle) return 0;
      const parts = nameParts(item.title);
      const title = fold(item.title);
      const email = fold(item.email || "");
      const phone = foldPhone(item.phone || "");
      const phoneNeedle = foldPhone(raw);
      const badge = fold(item.badge?.label || "");
      const subtitle = fold(item.subtitle || "");
      const searchText = fold(item.searchText || "");
      const day = fold(formatDate(dateOf(item)));

      if (parts.given.startsWith(needle)) return 0;
      if (parts.given.includes(needle)) return 1;
      if (parts.family.startsWith(needle)) return 2;
      if (parts.family.includes(needle)) return 3;
      if (parts.tokens.some((token) => token.startsWith(needle) || token.includes(needle))) return 4;
      if (title.includes(needle)) return 5;
      if (email.includes(needle)) return 6;
      if (phoneNeedle && phone.includes(phoneNeedle)) return 7;
      if (badge.includes(needle) || subtitle.includes(needle) || searchText.includes(needle) || day.includes(needle)) {
        return 8;
      }
      return 99;
    }

    function matchesQuery(item, query) {
      return matchRank(item, query) < 99;
    }

    function bySearchRank(list, query) {
      const needle = String(query ?? "").trim();
      if (!needle) return byNewest(list);
      return [...list].sort((left, right) => {
        const rankDelta = matchRank(left, needle) - matchRank(right, needle);
        if (rankDelta !== 0) return rankDelta;
        const givenDelta = nameParts(left.title).given.localeCompare(nameParts(right.title).given, "vi");
        if (givenDelta !== 0) return givenDelta;
        return String(left.title || "").localeCompare(String(right.title || ""), "vi");
      });
    }

    function sortPool(list, query) {
      return String(query ?? "").trim() ? bySearchRank(list, query) : byNewest(list);
    }

    function quickItems() {
      const pins = existing(readIds(pinKey)).map((item) => ({ item, pinned: true }));
      const pinIds = new Set(pins.map((row) => row.item.id));
      const recent = existing(readIds(recentKey))
        .filter((item) => !pinIds.has(item.id))
        .map((item) => ({ item, pinned: false }));
      return [...pins, ...recent].slice(0, quickLimit);
    }

    function defaultGroups(pool, query) {
      if (options.groupItems) {
        return options.groupItems(pool).filter((group) => group.items?.length).map((group) => ({
          ...group,
          items: sortPool(group.items, query)
        }));
      }
      const buckets = new Map();
      pool.forEach((item) => {
        const label = item.badge?.label || "Khác";
        if (!buckets.has(label)) buckets.set(label, []);
        buckets.get(label).push(item);
      });
      if (buckets.size <= 1) {
        return [{ label: "Tất cả", items: sortPool(pool, query) }];
      }
      return [...buckets.entries()].map(([label, groupItems]) => ({
        label,
        items: sortPool(groupItems, query)
      }));
    }

    function labeledGroups(pool, query) {
      const poolIds = new Set(pool.map((item) => item.id));
      const pinned = sortPool(existing(readIds(pinKey)).filter((item) => poolIds.has(item.id)), query);
      const pinnedIds = new Set(pinned.map((item) => item.id));
      const recent = sortPool(
        existing(readIds(recentKey)).filter((item) => poolIds.has(item.id) && !pinnedIds.has(item.id)),
        query
      );
      const used = new Set([...pinned, ...recent].map((item) => item.id));
      const groups = [];
      if (pinned.length) groups.push({ label: "Đã ghim", items: pinned });
      if (recent.length) groups.push({ label: "Gần đây", items: recent });
      defaultGroups(pool.filter((item) => !used.has(item.id)), query).forEach((group) => groups.push(group));
      return groups;
    }

    function inDateRange(item) {
      if (!showDateFilter || (!state.paletteFrom && !state.paletteTo)) return true;
      const day = localDay(dateOf(item));
      if (!day) return false;
      if (state.paletteFrom && day < state.paletteFrom) return false;
      if (state.paletteTo && day > state.paletteTo) return false;
      return true;
    }

    function matchesPalette(item, query) {
      return matchesQuery(item, query) && inDateRange(item);
    }

    function comboGroups() {
      const query = state.filter;
      const pool = items().filter((item) => matchesQuery(item, query));
      if (!query.trim()) {
        const quickIds = new Set(quickItems().map((row) => row.item.id));
        const rest = pool.filter((item) => !quickIds.has(item.id));
        return defaultGroups(rest.length ? rest : pool, query);
      }
      return labeledGroups(pool, query);
    }

    function renderOptions(container, groups, prefix, highlightQuery, showSubtitle) {
      const flat = [];
      const activeIndex = prefix === "combo" ? state.active : state.paletteActive;
      if (!groups.length) {
        const hint = showDateFilter && showSubtitle
          ? `${labels.emptyHint} Hoặc nới khoảng ngày.`
          : labels.emptyHint;
        container.innerHTML = `<div class="pick-empty" role="status"><strong>${escapeHtml(labels.emptyTitle)}</strong> ${escapeHtml(hint)}</div>`;
        return flat;
      }
      container.innerHTML = groups.map((group) => {
        const options = group.items.map((item) => {
          const index = flat.length;
          flat.push(item);
          const pinned = isPinned(item.id);
          const active = index === activeIndex;
          const current = item.id === selectedId();
          const subtitle = showSubtitle
            ? [item.subtitle, dateOf(item) ? `· ${formatDate(dateOf(item))}` : ""].filter(Boolean).join(" ")
            : (item.subtitle || "");
          const badge = item.badge
            ? `<span class="badge ${escapeHtml(item.badge.tone || "")}">${escapeHtml(item.badge.label)}</span>`
            : "";
          return `
            <div class="pick-option${active ? " is-active" : ""}${current ? " is-current" : ""}" role="option" id="${uid}-${prefix}-${item.id}" data-id="${escapeHtml(item.id)}" data-index="${index}" aria-selected="${active ? "true" : "false"}">
              <button type="button" class="pin-btn${pinned ? " is-on" : ""}" data-pin="${escapeHtml(item.id)}" aria-pressed="${pinned ? "true" : "false"}" aria-label="${pinned ? "Bỏ ghim" : "Ghim"} ${escapeHtml(item.title || labels.noun)}">${PIN_SVG}</button>
              <span class="pick-copy">
                <strong>${highlight(item.title || "Chưa đặt tên", highlightQuery)}</strong>
                ${subtitle ? `<small>${highlight(subtitle, highlightQuery)}</small>` : ""}
              </span>
              ${badge}
            </div>`;
        }).join("");
        return `<div class="pick-group" role="presentation" aria-hidden="true">${escapeHtml(group.label)}</div>${options}`;
      }).join("");
      return flat;
    }

    function paintActive(container, prefix, flat, activeIndex, scroll) {
      container.querySelectorAll(".pick-option").forEach((option) => {
        const on = Number(option.dataset.index) === activeIndex;
        option.classList.toggle("is-active", on);
        option.setAttribute("aria-selected", on ? "true" : "false");
      });
      const input = prefix === "combo" ? comboInput : paletteQuery;
      const item = flat[activeIndex];
      if (!item) {
        input.removeAttribute("aria-activedescendant");
        return;
      }
      input.setAttribute("aria-activedescendant", `${uid}-${prefix}-${item.id}`);
      if (scroll) {
        container.querySelector(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
      }
    }

    function placeComboList() {
      const rect = comboControl.getBoundingClientRect();
      const width = Math.min(440, Math.max(rect.width, 320));
      const left = Math.min(rect.left, window.innerWidth - width - 12);
      const below = window.innerHeight - rect.bottom - 12;
      comboList.style.width = `${width}px`;
      comboList.style.left = `${Math.max(12, left)}px`;
      if (below < 180 && rect.top > below) {
        const height = Math.max(160, Math.min(320, rect.top - 12));
        comboList.style.maxHeight = `${height}px`;
        comboList.style.top = `${Math.max(12, rect.top - height - 4)}px`;
        return;
      }
      comboList.style.maxHeight = `${Math.max(160, Math.min(320, below))}px`;
      comboList.style.top = `${rect.bottom + 4}px`;
    }

    function renderComboList() {
      comboList.hidden = false;
      const showSubtitle = Boolean(state.filter.trim());
      state.comboFlat = renderOptions(comboList, comboGroups(), "combo", state.filter, showSubtitle);
      if (!state.comboFlat.length) {
        comboInput.removeAttribute("aria-activedescendant");
        placeComboList();
        return;
      }
      state.active = Math.min(state.active, state.comboFlat.length - 1);
      paintActive(comboList, "combo", state.comboFlat, state.active, false);
      placeComboList();
    }

    function openCombo() {
      if (comboInput.disabled || root.classList.contains("is-dense")) return;
      state.comboOpen = true;
      state.active = 0;
      comboInput.setAttribute("aria-expanded", "true");
      comboToggle.setAttribute("aria-expanded", "true");
      renderComboList();
    }

    function closeCombo() {
      state.comboOpen = false;
      state.filter = "";
      comboList.hidden = true;
      comboInput.setAttribute("aria-expanded", "false");
      comboToggle.setAttribute("aria-expanded", "false");
      comboInput.removeAttribute("aria-activedescendant");
      const current = selectedItem();
      comboInput.value = current ? current.title : "";
      comboInput.placeholder = labels.switchPlaceholder;
    }

    function moveCombo(step) {
      if (!state.comboFlat.length) return;
      const last = state.comboFlat.length - 1;
      state.active = Math.min(last, Math.max(0, state.active + step));
      paintActive(comboList, "combo", state.comboFlat, state.active, true);
    }

    function renderQuick() {
      const rows = quickItems();
      if (!rows.length) {
        quickEl.hidden = true;
        quickEl.innerHTML = "";
        return;
      }
      quickEl.hidden = false;
      quickEl.innerHTML = `<p class="survey-quick-label">${escapeHtml(labels.quickLabel)}</p>` + rows.map(({ item, pinned }) => {
        const current = item.id === selectedId() ? " is-current" : "";
        const pin = pinned ? `<span class="quick-pin" aria-hidden="true">${PIN_SVG}</span>` : "";
        const kind = pinned ? "Đã ghim" : "Xem gần đây";
        return `<button type="button" class="quick-chip${current}" data-quick="${escapeHtml(item.id)}" aria-label="${kind}: ${escapeHtml(item.title || labels.noun)}">${pin}<span>${escapeHtml(item.title || "Chưa đặt tên")}</span></button>`;
      }).join("");
    }

    function syncPinButton() {
      const current = selectedItem();
      const pinned = current ? isPinned(current.id) : false;
      pinCurrent.disabled = !current;
      pinCurrent.classList.toggle("is-on", pinned);
      pinCurrent.setAttribute("aria-pressed", pinned ? "true" : "false");
      pinCurrent.setAttribute("aria-label", pinned ? `Bỏ ghim ${labels.noun} đang chọn` : `Ghim ${labels.noun} đang chọn`);
    }

    function dateRangeError() {
      if (state.paletteFrom && state.paletteTo && state.paletteFrom > state.paletteTo) {
        return "Ngày bắt đầu đang sau ngày kết thúc.";
      }
      return "";
    }

    function renderPalette() {
      if (showDateFilter && paletteClear) {
        paletteClear.hidden = !state.paletteFrom && !state.paletteTo;
      }
      const error = dateRangeError();
      if (error) {
        state.paletteFlat = [];
        paletteResults.innerHTML = `<div class="pick-empty" role="status"><strong>${escapeHtml(error)}</strong>Đổi lại khoảng ngày.</div>`;
        paletteQuery.removeAttribute("aria-activedescendant");
        return;
      }
      const query = paletteQuery.value;
      const matched = items().filter((item) => matchesPalette(item, query));
      state.paletteFlat = renderOptions(paletteResults, labeledGroups(matched, query), "palette", query, true);
      if (!state.paletteFlat.length) {
        paletteQuery.removeAttribute("aria-activedescendant");
        return;
      }
      state.paletteActive = Math.min(state.paletteActive, state.paletteFlat.length - 1);
      paintActive(paletteResults, "palette", state.paletteFlat, state.paletteActive, false);
    }

    function openPalette() {
      if (paletteTrigger.disabled) return;
      closeCombo();
      paletteReturn = document.activeElement;
      state.paletteOpen = true;
      state.paletteActive = 0;
      paletteEl.hidden = false;
      paletteQuery.setAttribute("aria-expanded", "true");
      renderPalette();
      paletteQuery.focus();
    }

    function closePalette(restore = true) {
      if (!state.paletteOpen) return;
      state.paletteOpen = false;
      paletteEl.hidden = true;
      paletteQuery.setAttribute("aria-expanded", "false");
      paletteQuery.removeAttribute("aria-activedescendant");
      const back = paletteReturn;
      paletteReturn = null;
      if (restore && back && back !== document.body) back.focus();
    }

    function movePalette(step) {
      if (!state.paletteFlat.length) return;
      const last = state.paletteFlat.length - 1;
      state.paletteActive = Math.min(last, Math.max(0, state.paletteActive + step));
      paintActive(paletteResults, "palette", state.paletteFlat, state.paletteActive, true);
    }

    function pushRecent(id) {
      if (!id) return;
      writeIds(recentKey, [id, ...readIds(recentKey).filter((item) => item !== id)].slice(0, quickLimit));
    }

    function togglePin(id) {
      if (!id) return;
      const pins = readIds(pinKey);
      writeIds(pinKey, pins.includes(id) ? pins.filter((item) => item !== id) : [id, ...pins]);
      sync();
    }

    function select(id) {
      if (!id) return;
      const fromPalette = state.paletteOpen;
      pushRecent(id);
      closeCombo();
      closePalette(false);
      if (fromPalette) paletteTrigger.focus();
      else if (document.activeElement === comboInput) comboInput.blur();
      options.onSelect(id);
      sync();
    }

    function sync() {
      const list = items();
      const dense = list.length >= denseThreshold;
      root.classList.toggle("is-dense", dense);
      const current = selectedItem();
      paletteLabel.textContent = dense && current ? current.title : labels.searchLabel;
      const canPick = enabled() && list.length > 0;
      comboInput.disabled = !canPick;
      comboToggle.disabled = !canPick;
      paletteTrigger.disabled = !enabled();
      syncPinButton();
      if (state.comboOpen && canPick && !dense) renderComboList();
      else if (dense) closeCombo();
      else if (!state.comboOpen) comboInput.value = current ? current.title : "";
      renderQuick();
      if (state.paletteOpen) renderPalette();
    }

    function bindPickList(container, mode) {
      container.addEventListener("mousedown", (event) => event.preventDefault());
      container.addEventListener("click", (event) => {
        const pin = event.target.closest("[data-pin]");
        if (pin) {
          togglePin(pin.dataset.pin);
          return;
        }
        const option = event.target.closest("[data-id]");
        if (option) select(option.dataset.id);
      });
      container.addEventListener("mouseover", (event) => {
        const option = event.target.closest("[data-index]");
        if (!option) return;
        const index = Number(option.dataset.index);
        if (mode === "combo") {
          if (!state.comboOpen || index === state.active) return;
          state.active = index;
          paintActive(container, "combo", state.comboFlat, state.active, false);
          return;
        }
        if (!state.paletteOpen || index === state.paletteActive) return;
        state.paletteActive = index;
        paintActive(container, "palette", state.paletteFlat, state.paletteActive, false);
      });
    }

    comboInput.addEventListener("focus", () => {
      if (!root.classList.contains("is-dense")) openCombo();
    });
    comboInput.addEventListener("input", () => {
      if (comboInput.disabled) return;
      state.filter = comboInput.value;
      state.active = 0;
      if (!state.comboOpen) {
        state.comboOpen = true;
        comboInput.setAttribute("aria-expanded", "true");
        comboToggle.setAttribute("aria-expanded", "true");
      }
      renderComboList();
    });
    comboInput.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        if (!state.comboOpen) openCombo();
        else moveCombo(1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        if (!state.comboOpen) openCombo();
        else moveCombo(-1);
        return;
      }
      if (event.key === "Home" && state.comboOpen) {
        event.preventDefault();
        state.active = 0;
        paintActive(comboList, "combo", state.comboFlat, state.active, true);
        return;
      }
      if (event.key === "End" && state.comboOpen) {
        event.preventDefault();
        state.active = Math.max(0, state.comboFlat.length - 1);
        paintActive(comboList, "combo", state.comboFlat, state.active, true);
        return;
      }
      if (event.key === "Enter" && state.comboOpen) {
        event.preventDefault();
        const item = state.comboFlat[state.active];
        if (item) select(item.id);
        return;
      }
      if (event.key === "Escape" && state.comboOpen) {
        event.preventDefault();
        closeCombo();
        comboInput.blur();
      }
    });
    comboInput.addEventListener("blur", () => {
      setTimeout(() => {
        if (!comboWrap.contains(document.activeElement) && !comboList.contains(document.activeElement)) {
          closeCombo();
        }
      }, 0);
    });
    comboToggle.addEventListener("mousedown", (event) => event.preventDefault());
    comboToggle.addEventListener("click", () => {
      if (comboInput.disabled) return;
      if (state.comboOpen) {
        closeCombo();
        comboInput.blur();
        return;
      }
      comboInput.focus();
    });
    pinCurrent.addEventListener("click", () => {
      const id = selectedId();
      if (id) togglePin(id);
    });
    quickEl.addEventListener("click", (event) => {
      const chip = event.target.closest("[data-quick]");
      if (chip) select(chip.dataset.quick);
    });
    paletteTrigger.addEventListener("click", openPalette);
    paletteEl.querySelectorAll("[data-es-close-palette]").forEach((el) => {
      el.addEventListener("click", () => closePalette());
    });
    paletteQuery.addEventListener("input", () => {
      state.paletteActive = 0;
      renderPalette();
    });
    function syncPaletteDates() {
      state.paletteFrom = paletteFrom?.value || "";
      state.paletteTo = paletteTo?.value || "";
      state.paletteActive = 0;
      renderPalette();
    }
    if (paletteFrom) {
      paletteFrom.addEventListener("input", syncPaletteDates);
      paletteFrom.addEventListener("change", syncPaletteDates);
    }
    if (paletteTo) {
      paletteTo.addEventListener("input", syncPaletteDates);
      paletteTo.addEventListener("change", syncPaletteDates);
    }
    if (paletteClear) {
      paletteClear.addEventListener("click", () => {
        if (paletteFrom) paletteFrom.value = "";
        if (paletteTo) paletteTo.value = "";
        syncPaletteDates();
        paletteQuery.focus();
      });
    }
    paletteQuery.addEventListener("keydown", (event) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        movePalette(1);
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        movePalette(-1);
        return;
      }
      if (event.key === "Home") {
        event.preventDefault();
        state.paletteActive = 0;
        paintActive(paletteResults, "palette", state.paletteFlat, state.paletteActive, true);
        return;
      }
      if (event.key === "End") {
        event.preventDefault();
        state.paletteActive = Math.max(0, state.paletteFlat.length - 1);
        paintActive(paletteResults, "palette", state.paletteFlat, state.paletteActive, true);
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const item = state.paletteFlat[state.paletteActive];
        if (item) select(item.id);
      }
    });

    function onGlobalKey(event) {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        if (state.paletteOpen) closePalette();
        else openPalette();
        return;
      }
      if (event.key === "Escape" && state.paletteOpen && !event.defaultPrevented) {
        event.preventDefault();
        closePalette();
      }
    }
    function onPointerDown(event) {
      if (!state.comboOpen) return;
      if (comboWrap.contains(event.target) || comboList.contains(event.target)) return;
      closeCombo();
    }
    function onResize() {
      if (state.comboOpen) placeComboList();
    }

    document.addEventListener("keydown", onGlobalKey);
    document.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    bindPickList(comboList, "combo");
    bindPickList(paletteResults, "palette");
    sync();

    return {
      sync,
      openPalette,
      pushRecent,
      destroy() {
        document.removeEventListener("keydown", onGlobalKey);
        document.removeEventListener("pointerdown", onPointerDown);
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", onResize, true);
        paletteEl.remove();
        root.innerHTML = "";
      }
    };
  }

  global.createEntitySwitch = createEntitySwitch;
})(window);
