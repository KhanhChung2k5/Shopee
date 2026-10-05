const ROLES = [
  { login: "admin", label: "Quản trị viên", note: "Xem báo cáo được", initials: "QT" },
  { login: "crm", label: "CRM Manager", note: "Xem báo cáo được", initials: "CM" },
  { login: "cs", label: "CSKH", note: "Story 5 — xem được", initials: "CS" },
  { login: "sales", label: "NV Kinh doanh", note: "Ngoài CRM — 403", initials: "KD" }
];

const AVATARS = [
  { bg: "#dbeafe", fg: "#1d4ed8" },
  { bg: "#e0e7ff", fg: "#3730a3" },
  { bg: "#eff6ff", fg: "#2563eb" },
  { bg: "#e0f2fe", fg: "#0369a1" },
  { bg: "#dbeafe", fg: "#1e40af" },
  { bg: "#f1f5f9", fg: "#334155" }
];

const RFM_SEGMENTS = [
  { bucket: "champions", label: "Champions", color: "var(--chart-1)" },
  { bucket: "loyal", label: "Loyal", color: "var(--chart-3)" },
  { bucket: "potential", label: "Potential", color: "var(--color-ok)" },
  { bucket: "at_risk", label: "At Risk", color: "var(--color-warn)" },
  { bucket: "lost", label: "Lost", color: "var(--color-destructive)" },
  { bucket: "other", label: "Other", color: "var(--text-soft)" }
];

const LTV_BINS = [
  { bucket: "lt500", label: "Dưới 500 nghìn", shortLabel: "< 500K" },
  { bucket: "500to1500", label: "500 nghìn – 1,5 triệu", shortLabel: "500K–1,5tr" },
  { bucket: "1500to4000", label: "1,5 – 4 triệu", shortLabel: "1,5–4tr" },
  { bucket: "4000to8000", label: "4 – 8 triệu", shortLabel: "4–8tr" },
  { bucket: "gte8000", label: "Từ 8 triệu", shortLabel: "≥ 8tr" }
];

const state = {
  login: sessionStorage.getItem("crmLogin") || "",
  report: null,
  customerById: new Map(),
  ltvSort: "desc",
  filters: { age: null, gender: null, interest: null, genre: null, rfm: null, ltv: null }
};

const rowsEl = document.getElementById("rows");
const kpisEl = document.getElementById("kpis");
const bannerEl = document.getElementById("banner");
const whoEl = document.getElementById("who");
const metaEl = document.getElementById("meta");
const rolesEl = document.getElementById("roles");

function authHeader() {
  if (!state.login) {
    return {};
  }
  return { Authorization: "Basic " + btoa(`${state.login}:${state.login}`) };
}

function showBanner(type, message) {
  bannerEl.hidden = !message;
  bannerEl.className = `attention ${type}`;
  bannerEl.textContent = message || "";
}

async function request(path) {
  const response = await fetch(path, {
    headers: {
      "Content-Type": "application/json",
      ...authHeader()
    }
  });
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;
  if (!response.ok) {
    const message = body?.error?.message || `Lỗi HTTP ${response.status}`;
    throw new Error(message);
  }
  return body;
}

function currentRole() {
  return ROLES.find((role) => role.login === state.login);
}

function avatarFor(name) {
  let hash = 0;
  for (const char of String(name)) {
    hash = (hash + char.charCodeAt(0)) % AVATARS.length;
  }
  return AVATARS[hash];
}

function syncWho() {
  const role = currentRole();
  const avatar = document.querySelector(".who-avatar");
  if (role) {
    whoEl.textContent = `Đang thử với ${role.label} (${role.login})`;
    avatar.textContent = role.initials;
  } else {
    whoEl.textContent = "Chưa chọn tài khoản";
    avatar.textContent = "?";
  }
}

function renderRoles() {
  rolesEl.innerHTML = "";
  ROLES.forEach((role) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = role.login === state.login ? "active" : "";
    button.innerHTML = `<span class="actor-dot" style="background:${avatarFor(role.login).fg}">${role.initials}</span><span><strong>${role.label}</strong><small>${role.login} / ${role.login}</small></span>`;
    button.addEventListener("click", () => {
      state.login = role.login;
      sessionStorage.setItem("crmLogin", role.login);
      syncWho();
      renderRoles();
      loadReport();
    });
    rolesEl.appendChild(button);
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function present(items) {
  return (items || []).filter((item) => Number(item.count) > 0);
}

function interestKey(fact) {
  if (!fact.categoryName && !fact.categoryId) {
    return "";
  }
  return fact.categoryId || fact.categoryName;
}

function ltvBin(value) {
  const amount = Number(value) || 0;
  if (amount < 500000) {
    return "lt500";
  }
  if (amount < 1500000) {
    return "500to1500";
  }
  if (amount < 4000000) {
    return "1500to4000";
  }
  if (amount < 8000000) {
    return "4000to8000";
  }
  return "gte8000";
}

function rfmLabel(code) {
  return RFM_SEGMENTS.find((item) => item.bucket === code)?.label || "Other";
}

function knownRfm(code) {
  return RFM_SEGMENTS.some((item) => item.bucket === code) ? code : "other";
}

function matches(fact, ignore) {
  const filters = state.filters;
  if (ignore !== "age" && filters.age && fact.age !== filters.age) {
    return false;
  }
  if (ignore !== "gender" && filters.gender && fact.gender !== filters.gender) {
    return false;
  }
  if (ignore !== "interest" && filters.interest && interestKey(fact) !== filters.interest) {
    return false;
  }
  if (ignore !== "genre" && filters.genre && fact.genre !== filters.genre) {
    return false;
  }
  const row = state.customerById.get(String(fact.customerId));
  if (ignore !== "rfm" && filters.rfm && knownRfm(row?.rfmSegment) !== filters.rfm) {
    return false;
  }
  if (ignore !== "ltv" && filters.ltv && ltvBin(row?.ltv) !== filters.ltv) {
    return false;
  }
  return true;
}

function customerPasses(row, ignore) {
  const filters = state.filters;
  if (ignore !== "age" && filters.age && row.age !== filters.age) {
    return false;
  }
  if (ignore !== "gender" && filters.gender && row.gender !== filters.gender) {
    return false;
  }
  if (ignore !== "rfm" && filters.rfm && knownRfm(row.rfmSegment) !== filters.rfm) {
    return false;
  }
  if (ignore !== "ltv" && filters.ltv && ltvBin(row.ltv) !== filters.ltv) {
    return false;
  }
  if (ignore !== "interest" && filters.interest) {
    const hit = (state.report?.facts || []).some((fact) =>
      String(fact.customerId) === String(row.customerId) && interestKey(fact) === filters.interest);
    if (!hit) {
      return false;
    }
  }
  if (ignore !== "genre" && filters.genre) {
    const hit = (state.report?.facts || []).some((fact) =>
      String(fact.customerId) === String(row.customerId) && fact.genre === filters.genre);
    if (!hit) {
      return false;
    }
  }
  return true;
}

function segmentBars(rows) {
  const counts = new Map();
  rows.forEach((row) => {
    const code = knownRfm(row.rfmSegment);
    counts.set(code, (counts.get(code) || 0) + 1);
  });
  return RFM_SEGMENTS.map((item) => ({
    bucket: item.bucket,
    label: item.label,
    color: item.color,
    count: counts.get(item.bucket) || 0,
    percent: percentOf(counts.get(item.bucket) || 0, rows.length)
  }));
}

function ltvHistogram(rows) {
  const counts = new Map(LTV_BINS.map((bin) => [bin.bucket, 0]));
  rows.forEach((row) => {
    const bin = ltvBin(row.ltv);
    counts.set(bin, (counts.get(bin) || 0) + 1);
  });
  const max = Math.max(1, ...counts.values());
  return LTV_BINS.map((bin) => {
    const count = counts.get(bin.bucket) || 0;
    return {
      ...bin,
      count,
      percent: percentOf(count, rows.length),
      height: rows.length ? Math.max(count ? 8 : 0, Math.round((count * 100) / max)) : 0
    };
  });
}

function percentOf(count, total) {
  if (!total) {
    return 0;
  }
  return Math.round((count * 10000) / total) / 100;
}

function demographicBars(facts, codeField, labelField, template) {
  const seen = new Set();
  const counts = new Map();
  facts.forEach((fact) => {
    if (seen.has(fact.customerId)) {
      return;
    }
    seen.add(fact.customerId);
    const code = fact[codeField];
    counts.set(code, (counts.get(code) || 0) + 1);
  });
  const total = seen.size;
  return (template || []).map((item) => ({
    bucket: item.bucket,
    label: item.label,
    count: counts.get(item.bucket) || 0,
    percent: percentOf(counts.get(item.bucket) || 0, total)
  }));
}

function lineBars(facts, keyOf, labelOf) {
  const counts = new Map();
  facts.forEach((fact) => {
    const key = keyOf(fact);
    if (!key) {
      return;
    }
    const current = counts.get(key) || { key, label: labelOf(fact), count: 0 };
    current.count += 1;
    counts.set(key, current);
  });
  const total = [...counts.values()].reduce((sum, item) => sum + item.count, 0);
  return [...counts.values()]
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label, "vi"))
    .map((item) => ({
      bucket: item.key,
      label: item.label,
      count: item.count,
      percent: percentOf(item.count, total)
    }));
}

function sumCount(items) {
  return (items || []).reduce((total, item) => total + Number(item.count || 0), 0);
}

function barKey(dimension, value) {
  return `${dimension}\u0000${value}`;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function snapshotBarWidths() {
  const widths = {};
  rowsEl.querySelectorAll(".hbar[data-dim]").forEach((bar) => {
    if (bar.classList.contains("is-leaving")) {
      return;
    }
    const fill = bar.querySelector(".hbar-fill");
    const width = fill ? Number.parseFloat(fill.style.width) : 0;
    const name = bar.querySelector(".hbar-name");
    widths[barKey(bar.dataset.dim, bar.dataset.value)] = {
      width: Number.isFinite(width) ? width : 0,
      label: name ? name.textContent : bar.dataset.value
    };
  });
  return widths;
}

function horizontalBars(items, dimension, previous, keepEmpty) {
  const rows = keepEmpty ? (items || []) : present(items);
  const selected = state.filters[dimension];
  const animate = !prefersReducedMotion();
  const seen = new Set();
  const buttons = rows.map((item) => {
    const target = Math.max(0, Math.min(Number(item.percent || 0), 100));
    const value = String(item.bucket);
    const key = barKey(dimension, value);
    seen.add(key);
    const from = animate && previous[key] ? previous[key].width : target;
    const label = item.label || item.categoryName || item.bucket;
    const tone = item.color ? ` style="--bar:${item.color}"` : "";
    return `
      <button class="hbar${selected === value ? " is-selected" : ""}"${tone} type="button" data-dim="${dimension}" data-value="${escapeHtml(value)}" aria-pressed="${selected === value ? "true" : "false"}">
        <span class="hbar-name" title="${escapeHtml(label)}">${escapeHtml(label)}</span>
        <span class="hbar-track"><span class="hbar-fill${animate && from !== target ? (from > target ? " is-shrinking" : " is-growing") : ""}" data-target="${target}" style="width:${from}%"></span></span>
        <span class="hbar-value">${item.count} · ${Number(item.percent || 0).toFixed(1)}%</span>
      </button>
    `;
  });
  if (animate) {
    Object.entries(previous).forEach(([key, width]) => {
      if (!key.startsWith(`${dimension}\u0000`) || seen.has(key) || width.width <= 0) {
        return;
      }
      const value = key.slice(dimension.length + 1);
      buttons.push(`
        <button class="hbar" type="button" data-dim="${dimension}" data-value="${escapeHtml(value)}" tabindex="-1" aria-hidden="true">
          <span class="hbar-name">${escapeHtml(width.label)}</span>
          <span class="hbar-track"><span class="hbar-fill" style="width:${width.width}%"></span></span>
          <span class="hbar-value"></span>
        </button>
      `);
    });
  }
  if (!buttons.length) {
    return `<p class="hint">Chưa có dữ liệu trong bộ lọc này.</p>`;
  }
  return `<div class="hbar-chart">${buttons.join("")}</div>`;
}

function chartCard(title, hint, items, color, dimension, previous, keepEmpty) {
  const selected = state.filters[dimension];
  return `
    <article class="dash-card${selected ? " has-filter" : ""}" style="--bar:${color}">
      <h2>${title}</h2>
      <p class="hint">${hint}</p>
      ${horizontalBars(items, dimension, previous, keepEmpty)}
    </article>
  `;
}

function histogramCard(bins) {
  const selected = state.filters.ltv;
  const animate = !prefersReducedMotion();
  const columns = bins.map((bin) => {
    const value = bin.bucket;
    const target = bin.height;
    const from = animate ? 0 : target;
    return `
      <button class="vbar${selected === value ? " is-selected" : ""}" type="button" data-dim="ltv" data-value="${escapeHtml(value)}" aria-pressed="${selected === value ? "true" : "false"}" title="${escapeHtml(bin.label)}: ${bin.count} khách, ${Number(bin.percent || 0).toFixed(1)}%">
        <span class="vbar-value">${bin.count}</span>
        <span class="vbar-plot" aria-hidden="true"><span class="vbar-fill${animate ? " is-growing" : ""}" data-target="${target}" style="height:${from}%"></span></span>
        <span class="vbar-name">${escapeHtml(bin.shortLabel)}</span>
      </button>
    `;
  }).join("");
  return `
    <article class="dash-card${selected ? " has-filter" : ""}" style="--bar:var(--chart-1)">
      <h2>Histogram LTV</h2>
      <p class="hint">Năm khoảng tiền cùng ngưỡng monetary của RFM. Bấm một cột để lọc các biểu đồ còn lại.</p>
      <div class="vbar-chart">${columns}</div>
    </article>
  `;
}

function formatVnd(value) {
  const amount = Number(value);
  const safe = Number.isFinite(amount) ? amount : 0;
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0
  }).format(safe);
}

function customerTable(rows) {
  const direction = state.ltvSort === "asc" ? 1 : -1;
  const sorted = [...rows].sort((left, right) => {
    const delta = Number(left.ltv || 0) - Number(right.ltv || 0);
    if (delta !== 0) {
      return delta * direction;
    }
    return String(left.fullName || "").localeCompare(String(right.fullName || ""), "vi");
  });
  const ascending = state.ltvSort === "asc";
  const orderText = ascending ? "thấp đến cao" : "cao đến thấp";
  const body = sorted.length
    ? sorted.map((row) => `
        <tr>
          <th scope="row">${escapeHtml(row.fullName || "—")}</th>
          <td>${escapeHtml(row.ageLabel || row.age || "—")}</td>
          <td>${escapeHtml(row.genderLabel || row.gender || "—")}</td>
          <td><span class="rfm-pill rfm-${escapeHtml(knownRfm(row.rfmSegment))}">${escapeHtml(rfmLabel(row.rfmSegment))}</span></td>
          <td class="num">${escapeHtml(row.totalOrders ?? 0)}</td>
          <td class="num">${escapeHtml(formatVnd(row.ltv))}</td>
        </tr>
      `).join("")
    : `<tr><td class="table-empty" colspan="6">Không có khách trong bộ lọc này.</td></tr>`;
  const chevron = ascending ? "M12 6l6 7H6z" : "M6 10h12L12 17z";
  return `
    <section class="dash-card span-2" aria-labelledby="ltv-table-title">
      <h2 id="ltv-table-title">Khách hàng theo LTV</h2>
      <p class="hint">Đang sắp ${orderText}. Bấm tiêu đề LTV để đảo chiều.</p>
      <div class="table-scroll">
        <table class="data-table">
          <caption class="sr-only">Danh sách khách hàng sắp theo giá trị vòng đời, ${orderText}</caption>
          <thead>
            <tr>
              <th scope="col">Khách hàng</th>
              <th scope="col">Tuổi</th>
              <th scope="col">Giới tính</th>
              <th scope="col">Phân khúc RFM</th>
              <th scope="col" class="num">Đơn đã giao</th>
              <th scope="col" class="num" aria-sort="${ascending ? "ascending" : "descending"}">
                <button class="sort-btn" type="button" data-sort="ltv">
                  LTV
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="${chevron}"/></svg>
                </button>
              </th>
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
    </section>
  `;
}

function playBarMotion() {
  const leaving = rowsEl.querySelectorAll(".hbar[aria-hidden='true']");
  const fills = rowsEl.querySelectorAll(".hbar-fill[data-target]");
  requestAnimationFrame(() => {
    leaving.forEach((bar) => bar.classList.add("is-leaving"));
    fills.forEach((fill) => {
      fill.style.width = `${fill.dataset.target}%`;
    });
    rowsEl.querySelectorAll(".vbar-fill[data-target]").forEach((bar) => {
      bar.style.height = `${bar.dataset.target}%`;
    });
  });
  if (leaving.length) {
    window.setTimeout(() => {
      leaving.forEach((bar) => bar.remove());
    }, 150);
  }
}

function filteredFacts(ignore) {
  return (state.report?.facts || []).filter((fact) => matches(fact, ignore));
}

function activeFilterLabel() {
  const report = state.report;
  if (!report) {
    return "";
  }
  const parts = [];
  if (state.filters.age) {
    const bucket = (report.age || []).find((item) => item.bucket === state.filters.age);
    parts.push(bucket?.label || state.filters.age);
  }
  if (state.filters.gender) {
    const bucket = (report.gender || []).find((item) => item.bucket === state.filters.gender);
    parts.push(bucket?.label || state.filters.gender);
  }
  if (state.filters.interest) {
    const fact = (report.facts || []).find((item) => interestKey(item) === state.filters.interest);
    parts.push(fact?.categoryName || state.filters.interest);
  }
  if (state.filters.genre) {
    parts.push(state.filters.genre);
  }
  if (state.filters.rfm) {
    parts.push(rfmLabel(state.filters.rfm));
  }
  if (state.filters.ltv) {
    const bin = LTV_BINS.find((item) => item.bucket === state.filters.ltv);
    parts.push(bin?.label || state.filters.ltv);
  }
  return parts.join(" · ");
}

function renderReport(report) {
  state.report = report;
  state.customerById = new Map((report.customers || []).map((row) => [String(row.customerId), row]));
  const facts = report.facts || [];
  const age = demographicBars(filteredFacts("age"), "age", "ageLabel", report.age);
  const gender = demographicBars(filteredFacts("gender"), "gender", "genderLabel", report.gender);
  const interests = lineBars(filteredFacts("interest"), interestKey, (fact) => fact.categoryName);
  const genres = lineBars(
    filteredFacts("genre"),
    (fact) => fact.genre || "",
    (fact) => fact.genre
  );
  const rfmRows = (report.customers || []).filter((row) => customerPasses(row, "rfm"));
  const ltvRows = (report.customers || []).filter((row) => customerPasses(row, "ltv"));
  const tableRows = (report.customers || []).filter((row) => customerPasses(row, null));
  const scoped = facts.filter((fact) => matches(fact, null));
  const customers = new Set(scoped.map((fact) => fact.customerId)).size;
  const previous = snapshotBarWidths();
  const filterLabel = activeFilterLabel();
  kpisEl.innerHTML = `
    <article class="kpi-card"><span>${filterLabel ? "Khách sau lọc" : "Khách trong báo cáo"}</span><strong>${customers}</strong></article>
    <article class="kpi-card"><span>Dòng danh mục đã giao</span><strong>${sumCount(lineBars(scoped, interestKey, (fact) => fact.categoryName))}</strong></article>
    <article class="kpi-card"><span>Đĩa game theo thể loại</span><strong>${sumCount(lineBars(scoped, (fact) => fact.genre || "", (fact) => fact.genre))}</strong></article>
  `;
  metaEl.textContent = filterLabel
    ? `Đang lọc: ${filterLabel}. Bấm lại cột đang chọn để bỏ lọc đó.`
    : `${report.totalCustomers} khách (ẩn đã xóa). Bấm một cột để đồng bộ các biểu đồ còn lại.`;
  rowsEl.innerHTML = [
    chartCard("Phân khúc RFM", "Sáu nhãn cố định. Bấm một nhãn để lọc các biểu đồ còn lại.", segmentBars(rfmRows), "var(--chart-1)", "rfm", previous, true),
    histogramCard(ltvHistogram(ltvRows)),
    chartCard("Độ tuổi", "Bấm một nhóm tuổi để lọc các biểu đồ còn lại.", age, "var(--chart-1)", "age", previous),
    chartCard("Giới tính", "Bấm một nhóm giới tính để lọc các biểu đồ còn lại.", gender, "var(--chart-3)", "gender", previous),
    chartCard("Sở thích", "Bấm một danh mục để lọc các biểu đồ còn lại.", interests, "var(--chart-2)", "interest", previous),
    chartCard("Thể loại game", "Bấm một thể loại để lọc các biểu đồ còn lại.", genres, "var(--chart-4)", "genre", previous),
    customerTable(tableRows)
  ].join("");
  playBarMotion();
}

async function loadReport() {
  if (!state.login) {
    kpisEl.innerHTML = "";
    rowsEl.innerHTML = `<div class="empty"><strong>Chọn tài khoản để tải báo cáo.</strong>Dùng khung đăng nhập giả lập bên trái.</div>`;
    metaEl.textContent = "Chọn tài khoản để xem tỷ lệ tuổi, giới tính, sở thích và thể loại game.";
    return;
  }
  try {
    const report = await request("/api/crm/reports/customers");
    state.filters = { age: null, gender: null, interest: null, genre: null, rfm: null, ltv: null };
    renderReport(report);
    const role = currentRole();
    if (role?.login === "cs") {
      showBanner("ok", "CSKH xem được báo cáo  |  Story 5");
    } else if (role?.login === "sales") {
      showBanner("err", "NV Kinh doanh không thuộc CRM");
    } else {
      showBanner("ok", `Sẵn sàng  |  ${report.totalCustomers} khách trong báo cáo`);
    }
  } catch (error) {
    kpisEl.innerHTML = "";
    rowsEl.innerHTML = `<div class="empty"><strong>${escapeHtml(error.message)}</strong></div>`;
    showBanner("err", error.message);
    metaEl.textContent = "";
  }
}

rowsEl.addEventListener("click", (event) => {
  if (event.target.closest("[data-sort='ltv']") && state.report) {
    state.ltvSort = state.ltvSort === "desc" ? "asc" : "desc";
    renderReport(state.report);
    return;
  }
  const bar = event.target.closest("[data-dim]");
  if (!bar || !state.report) {
    return;
  }
  const dimension = bar.dataset.dim;
  const value = bar.dataset.value;
  state.filters[dimension] = state.filters[dimension] === value ? null : value;
  renderReport(state.report);
});

document.getElementById("reload").addEventListener("click", loadReport);
document.getElementById("menu-toggle").addEventListener("click", () => {
  document.querySelector(".app").classList.toggle("nav-open");
});

renderRoles();
syncWho();
if (state.login) {
  loadReport();
} else {
  kpisEl.innerHTML = "";
  rowsEl.innerHTML = `<div class="empty"><strong>Chọn tài khoản để tải báo cáo.</strong>Dùng khung đăng nhập giả lập bên trái.</div>`;
}
