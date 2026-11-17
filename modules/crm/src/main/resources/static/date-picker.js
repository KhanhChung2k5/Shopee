(function () {
  const MIN_YEAR = 1920;
  const MAX_YEAR = 2100;
  // Tuần bắt đầu từ Thứ 2 (ISO / vi-VN), Chủ nhật ở cuối.
  const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  // Index theo Date#getDay(): 0 = Chủ nhật … 6 = Thứ bảy.
  const WEEKDAYS_LONG = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
  const MONTHS = ["Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12"];
  const WEEK_START = 1; // Monday

  const ICON_CAL = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
  const ICON_DOWN = '<svg class="dp-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';
  const ICON_LEFT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14 6-6 6 6 6"/></svg>';
  const ICON_RIGHT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m10 6 6 6-6 6"/></svg>';
  const ICON_STEP_UP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 15 6-6 6 6"/></svg>';
  const ICON_STEP_DOWN = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>';

  let openPicker = null;

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function parseValue(raw) {
    const match = /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(raw || "");
    if (!match) {
      return null;
    }
    const y = Number(match[1]);
    const m = Number(match[2]) - 1;
    const d = Number(match[3]);
    if (m < 0 || m > 11 || d < 1 || d > 31 || y < MIN_YEAR || y > MAX_YEAR) {
      return null;
    }
    return {
      y,
      m,
      d,
      hour: match[4] == null ? 9 : Number(match[4]),
      minute: match[5] == null ? 0 : Number(match[5])
    };
  }

  function sameDay(a, b) {
    return !!a && !!b && a.y === b.y && a.m === b.m && a.d === b.d;
  }

  function isToday(y, m, d) {
    const now = new Date();
    return now.getFullYear() === y && now.getMonth() === m && now.getDate() === d;
  }

  function hourParts(hour24) {
    const period = hour24 < 12 ? "AM" : "PM";
    const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
    return { hour12, period };
  }

  function fromHourParts(hour12, period) {
    if (period === "AM") {
      return hour12 === 12 ? 0 : hour12;
    }
    return hour12 === 12 ? 12 : hour12 + 12;
  }

  function formatLong(y, m, d) {
    return `${d} tháng ${m + 1}, ${y}`;
  }

  function fieldName(input, mode) {
    const label = input.closest("label");
    if (!label) {
      return mode === "datetime" ? "Ngày giờ" : "Ngày";
    }
    const clone = label.cloneNode(true);
    clone.querySelectorAll("button, input, select, textarea, span").forEach((node) => node.remove());
    return clone.textContent.replace(/\s+/g, " ").trim() || (mode === "datetime" ? "Ngày giờ" : "Ngày");
  }

  function decadeStart(year) {
    return Math.floor(year / 10) * 10;
  }

  function ensureGlobalListeners() {
    if (ensureGlobalListeners.ready) {
      return;
    }
    ensureGlobalListeners.ready = true;
    document.addEventListener("pointerdown", (event) => {
      if (!openPicker) {
        return;
      }
      const target = event.target;
      if (openPicker.pop.contains(target) || openPicker.trigger.contains(target)) {
        return;
      }
      openPicker.close(false);
    }, true);
    document.addEventListener("keydown", (event) => {
      if (!openPicker || event.key !== "Escape") {
        return;
      }
      event.preventDefault();
      event.stopImmediatePropagation();
      openPicker.close(true);
    }, true);
    window.addEventListener("resize", () => openPicker && openPicker.place());
    window.addEventListener("scroll", () => openPicker && openPicker.place(), true);
  }

  function enhance(input) {
    if (input.dataset.dpReady === "true") {
      return;
    }
    const mode = input.type === "datetime-local" ? "datetime" : "date";
    input.dataset.dpReady = "true";
    input.dataset.dpMode = mode;
    input.type = "text";
    input.autocomplete = "off";
    input.spellcheck = false;
    input.tabIndex = -1;
    input.setAttribute("aria-hidden", "true");
    input.classList.add("dp-native");

    const name = fieldName(input, mode);
    const state = {
      view: "day",
      cursorY: new Date().getFullYear(),
      cursorM: new Date().getMonth(),
      decade: decadeStart(new Date().getFullYear()),
      selected: null,
      hour: 9,
      minute: 0
    };

    const field = document.createElement("span");
    field.className = "dp-field";
    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "dp-trigger";
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.setAttribute("aria-expanded", "false");
    trigger.innerHTML = `${ICON_CAL}<span class="dp-trigger-label"></span>${ICON_DOWN}`;
    const triggerLabel = trigger.querySelector(".dp-trigger-label");

    input.parentNode.insertBefore(field, input);
    field.append(trigger, input);

    const pop = document.createElement("div");
    pop.className = mode === "datetime" ? "dp-pop is-schedule" : "dp-pop";
    pop.hidden = true;
    pop.setAttribute("role", "dialog");
    pop.setAttribute("aria-modal", "false");
    pop.innerHTML = `
      <div class="dp-head">
        <button type="button" class="dp-nav" data-nav="-1">${ICON_LEFT}</button>
        <div class="dp-head-center">
          <button type="button" class="dp-title" data-drill></button>
          <span class="dp-range" data-range hidden></span>
        </div>
        <button type="button" class="dp-nav" data-nav="1">${ICON_RIGHT}</button>
      </div>
      <div class="dp-body"></div>
    `;
    document.body.append(pop);

    const prevBtn = pop.querySelector("[data-nav='-1']");
    const nextBtn = pop.querySelector("[data-nav='1']");
    const titleBtn = pop.querySelector("[data-drill]");
    const rangeEl = pop.querySelector("[data-range]");
    const body = pop.querySelector(".dp-body");

    const valueDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value");
    const disabledDesc = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "disabled");

    function triggerText() {
      if (!state.selected) {
        return mode === "datetime" ? "Chọn ngày giờ" : "Chọn ngày";
      }
      const date = formatLong(state.selected.y, state.selected.m, state.selected.d);
      if (mode !== "datetime") {
        return date;
      }
      const parts = hourParts(state.hour);
      return `${date} · ${pad(parts.hour12)}:${pad(state.minute)} ${parts.period}`;
    }

    function paintTrigger() {
      const parsed = parseValue(input.value);
      if (parsed) {
        state.selected = { y: parsed.y, m: parsed.m, d: parsed.d };
        state.hour = clamp(parsed.hour, 0, 23);
        state.minute = clamp(parsed.minute, 0, 59);
      } else if (!input.value) {
        state.selected = null;
      }
      const text = triggerText();
      triggerLabel.textContent = text;
      trigger.setAttribute("aria-label", `${name}, ${text}`);
      trigger.disabled = input.disabled;
    }

    Object.defineProperty(input, "value", {
      configurable: true,
      get() {
        return valueDesc.get.call(this);
      },
      set(next) {
        valueDesc.set.call(this, next);
        paintTrigger();
      }
    });
    Object.defineProperty(input, "disabled", {
      configurable: true,
      get() {
        return disabledDesc.get.call(this);
      },
      set(next) {
        disabledDesc.set.call(this, next);
        if (next) {
          api.close(false);
        }
        paintTrigger();
      }
    });

    function atStart() {
      if (state.view === "day") {
        return state.cursorY === MIN_YEAR && state.cursorM === 0;
      }
      if (state.view === "month") {
        return state.cursorY <= MIN_YEAR;
      }
      return state.decade <= decadeStart(MIN_YEAR);
    }

    function atEnd() {
      if (state.view === "day") {
        return state.cursorY === MAX_YEAR && state.cursorM === 11;
      }
      if (state.view === "month") {
        return state.cursorY >= MAX_YEAR;
      }
      return state.decade >= decadeStart(MAX_YEAR);
    }

    function shift(delta) {
      if (state.view === "day") {
        const next = new Date(state.cursorY, state.cursorM + delta, 1);
        if (next.getFullYear() < MIN_YEAR) {
          state.cursorY = MIN_YEAR;
          state.cursorM = 0;
          return;
        }
        if (next.getFullYear() > MAX_YEAR) {
          state.cursorY = MAX_YEAR;
          state.cursorM = 11;
          return;
        }
        state.cursorY = next.getFullYear();
        state.cursorM = next.getMonth();
        return;
      }
      if (state.view === "month") {
        state.cursorY = clamp(state.cursorY + delta, MIN_YEAR, MAX_YEAR);
        return;
      }
      state.decade = clamp(state.decade + delta * 10, decadeStart(MIN_YEAR), decadeStart(MAX_YEAR));
    }

    function ensureSelectedDay() {
      if (state.selected) {
        return;
      }
      const now = new Date();
      state.selected = {
        y: clamp(now.getFullYear(), MIN_YEAR, MAX_YEAR),
        m: now.getMonth(),
        d: now.getDate()
      };
      state.cursorY = state.selected.y;
      state.cursorM = state.selected.m;
    }

    function paintTimePanel(options) {
      const force = !!(options && options.force);
      const panel = body.querySelector(".dp-time");
      if (!panel) {
        return;
      }
      const parts = hourParts(state.hour);
      const hourEl = panel.querySelector("[data-time-value='hour']");
      const minuteEl = panel.querySelector("[data-time-value='minute']");
      const periodEl = panel.querySelector("[data-time-value='period']");
      if (hourEl && (force || document.activeElement !== hourEl)) {
        hourEl.value = pad(parts.hour12);
      }
      if (minuteEl && (force || document.activeElement !== minuteEl)) {
        minuteEl.value = pad(state.minute);
      }
      if (periodEl) {
        periodEl.textContent = parts.period;
      }
      panel.querySelector("[data-time='hour']")?.setAttribute("aria-valuenow", String(parts.hour12));
      panel.querySelector("[data-time='minute']")?.setAttribute("aria-valuenow", String(state.minute));
      panel.querySelector("[data-time='period']")?.setAttribute("aria-valuenow", parts.period);
    }

    function commitTimeField(kind, el) {
      const raw = String(el.value || "").replace(/\D/g, "");
      if (kind === "hour") {
        const parts = hourParts(state.hour);
        const hour12 = clamp(raw === "" ? parts.hour12 : Number(raw), 1, 12);
        state.hour = fromHourParts(hour12, parts.period);
      } else if (kind === "minute") {
        state.minute = clamp(raw === "" ? state.minute : Number(raw), 0, 59);
      } else {
        return;
      }
      ensureSelectedDay();
      paintTimePanel({ force: true });
      commit();
    }

    function applyTimeStep(kind, delta) {
      const prevHour = state.hour;
      const prevMinute = state.minute;
      if (kind === "hour") {
        const parts = hourParts(state.hour);
        let next = parts.hour12 + delta;
        if (next > 12) {
          next = 1;
        }
        if (next < 1) {
          next = 12;
        }
        state.hour = fromHourParts(next, parts.period);
      } else if (kind === "minute") {
        state.minute = (state.minute + delta + 60) % 60;
      } else {
        const parts = hourParts(state.hour);
        state.hour = fromHourParts(parts.hour12, parts.period === "AM" ? "PM" : "AM");
      }
      if (prevHour === state.hour && prevMinute === state.minute) {
        return;
      }
      ensureSelectedDay();
      paintTimePanel({ force: true });
      commit();
    }

    function setToday() {
      const now = new Date();
      state.selected = {
        y: clamp(now.getFullYear(), MIN_YEAR, MAX_YEAR),
        m: now.getMonth(),
        d: now.getDate()
      };
      state.cursorY = state.selected.y;
      state.cursorM = state.selected.m;
      state.view = "day";
      commit();
      render("cell");
    }

    function setNow() {
      const now = new Date();
      state.hour = now.getHours();
      state.minute = now.getMinutes();
      setToday();
    }

    function createStepper(kind, label, ariaLabel) {
      const col = document.createElement("div");
      col.className = "dp-stepper";
      const caption = document.createElement("span");
      caption.className = "dp-time-label";
      caption.id = `${input.id || "dp"}-${kind}-label`;
      caption.textContent = label;
      const up = document.createElement("button");
      up.type = "button";
      up.className = "dp-step";
      up.dataset.step = kind;
      up.dataset.delta = "1";
      up.setAttribute("aria-label", "Tăng " + ariaLabel);
      up.innerHTML = ICON_STEP_UP;
      const editable = kind === "hour" || kind === "minute";
      const value = document.createElement(editable ? "input" : "div");
      value.className = "dp-step-value";
      value.dataset.time = kind;
      value.dataset.timeValue = kind;
      value.setAttribute("aria-labelledby", caption.id);
      if (editable) {
        value.type = "text";
        value.inputMode = "numeric";
        value.autocomplete = "off";
        value.spellcheck = false;
        value.maxLength = 2;
        value.setAttribute("role", "spinbutton");
        value.setAttribute("aria-label", "Nhập " + ariaLabel);
        if (kind === "hour") {
          value.setAttribute("aria-valuemin", "1");
          value.setAttribute("aria-valuemax", "12");
        } else {
          value.setAttribute("aria-valuemin", "0");
          value.setAttribute("aria-valuemax", "59");
        }
        value.addEventListener("focus", () => {
          requestAnimationFrame(() => value.select());
        });
        value.addEventListener("click", (event) => {
          event.stopPropagation();
          value.select();
        });
        value.addEventListener("input", () => {
          value.value = value.value.replace(/\D/g, "").slice(0, 2);
        });
        value.addEventListener("blur", () => {
          commitTimeField(kind, value);
        });
      } else {
        value.tabIndex = 0;
        value.setAttribute("role", "spinbutton");
        value.setAttribute("aria-valuemin", "AM");
        value.setAttribute("aria-valuemax", "PM");
      }
      const down = document.createElement("button");
      down.type = "button";
      down.className = "dp-step";
      down.dataset.step = kind;
      down.dataset.delta = "-1";
      down.setAttribute("aria-label", "Giảm " + ariaLabel);
      down.innerHTML = ICON_STEP_DOWN;
      col.append(caption, up, value, down);
      return col;
    }

    function appendTime(row) {
      const time = document.createElement("div");
      time.className = "dp-time";
      const title = document.createElement("p");
      title.className = "dp-time-title";
      title.textContent = "Time";
      const cols = document.createElement("div");
      cols.className = "dp-time-cols";
      cols.append(
        createStepper("hour", "Hour", "giờ"),
        createStepper("minute", "Minute", "phút"),
        createStepper("period", "AM / PM", "AM hoặc PM")
      );
      const actions = document.createElement("div");
      actions.className = "dp-time-actions";
      const today = document.createElement("button");
      today.type = "button";
      today.className = "dp-time-chip";
      today.dataset.today = "true";
      today.textContent = "Today";
      const nowBtn = document.createElement("button");
      nowBtn.type = "button";
      nowBtn.className = "dp-time-chip";
      nowBtn.dataset.now = "true";
      nowBtn.textContent = "Now";
      actions.append(today, nowBtn);
      time.append(title, cols, actions);
      row.append(time);
      paintTimePanel();
    }

    function withSchedule(...nodes) {
      const calendar = document.createElement("div");
      calendar.className = "dp-calendar";
      calendar.append(...nodes);
      if (mode !== "datetime") {
        body.append(calendar);
        return;
      }
      const row = document.createElement("div");
      row.className = "dp-day-layout";
      row.append(calendar);
      body.append(row);
      appendTime(row);
    }

    function commit() {
      if (!state.selected) {
        return;
      }
      const { y, m, d } = state.selected;
      const next = mode === "datetime"
        ? `${y}-${pad(m + 1)}-${pad(d)}T${pad(state.hour)}:${pad(state.minute)}`
        : `${y}-${pad(m + 1)}-${pad(d)}`;
      if (input.value !== next) {
        input.value = next;
      } else {
        paintTrigger();
      }
      input.dispatchEvent(new Event("input", { bubbles: true }));
      input.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function dayCells() {
      // getDay(): 0=CN … 6=T7 → offset cột khi tuần bắt đầu từ WEEK_START (Thứ 2).
      const firstDow = (new Date(state.cursorY, state.cursorM, 1).getDay() - WEEK_START + 7) % 7;
      const count = new Date(state.cursorY, state.cursorM + 1, 0).getDate();
      const total = Math.ceil((firstDow + count) / 7) * 7;
      const start = new Date(state.cursorY, state.cursorM, 1 - firstDow);
      const cells = [];
      for (let i = 0; i < total; i += 1) {
        const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        cells.push({
          y: date.getFullYear(),
          m: date.getMonth(),
          d: date.getDate(),
          muted: date.getMonth() !== state.cursorM || date.getFullYear() !== state.cursorY
        });
      }
      return cells;
    }

    function render(focus) {
      prevBtn.disabled = atStart();
      nextBtn.disabled = atEnd();
      const drilling = state.view !== "year";
      titleBtn.hidden = !drilling;
      rangeEl.hidden = drilling;
      body.innerHTML = "";
      if (state.view === "day") {
        pop.setAttribute("aria-label", "Chọn ngày");
        prevBtn.setAttribute("aria-label", "Tháng trước");
        nextBtn.setAttribute("aria-label", "Tháng sau");
        titleBtn.classList.remove("is-pill");
        titleBtn.textContent = `Tháng ${state.cursorM + 1}, ${state.cursorY}`;
        titleBtn.setAttribute("aria-label", `Chọn tháng, đang xem tháng ${state.cursorM + 1} năm ${state.cursorY}`);
        const week = document.createElement("div");
        week.className = "dp-week";
        week.setAttribute("aria-hidden", "true");
        WEEKDAYS.forEach((day) => {
          const span = document.createElement("span");
          span.textContent = day;
          week.append(span);
        });
        const grid = document.createElement("div");
        grid.className = "dp-days";
        grid.setAttribute("role", "grid");
        grid.setAttribute("aria-label", `Tháng ${state.cursorM + 1} năm ${state.cursorY}`);
        const cells = dayCells();
        for (let i = 0; i < cells.length; i += 7) {
          const row = document.createElement("div");
          row.setAttribute("role", "row");
          cells.slice(i, i + 7).forEach((cell) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "dp-cell";
            button.setAttribute("role", "gridcell");
            button.dataset.year = String(cell.y);
            button.dataset.month = String(cell.m);
            button.dataset.day = String(cell.d);
            button.textContent = String(cell.d);
            const outside = cell.y < MIN_YEAR || cell.y > MAX_YEAR;
            button.disabled = outside;
            button.setAttribute("aria-selected", sameDay(state.selected, cell) ? "true" : "false");
            button.setAttribute("aria-label", `${WEEKDAYS_LONG[new Date(cell.y, cell.m, cell.d).getDay()]}, ${formatLong(cell.y, cell.m, cell.d)}`);
            if (cell.muted) {
              button.classList.add("is-muted");
            }
            if (sameDay(state.selected, cell)) {
              button.classList.add("is-selected");
            }
            if (isToday(cell.y, cell.m, cell.d)) {
              button.classList.add("is-today");
              button.setAttribute("aria-current", "date");
            }
            row.append(button);
          });
          grid.append(row);
        }
        withSchedule(week, grid);
      } else if (state.view === "month") {
        pop.setAttribute("aria-label", "Chọn tháng");
        prevBtn.setAttribute("aria-label", "Năm trước");
        nextBtn.setAttribute("aria-label", "Năm sau");
        titleBtn.classList.add("is-pill");
        titleBtn.textContent = String(state.cursorY);
        titleBtn.setAttribute("aria-label", `Chọn năm, đang xem ${state.cursorY}`);
        const grid = document.createElement("div");
        grid.className = "dp-months";
        grid.setAttribute("role", "grid");
        grid.setAttribute("aria-label", `Các tháng năm ${state.cursorY}`);
        for (let rowIndex = 0; rowIndex < 4; rowIndex += 1) {
          const row = document.createElement("div");
          row.setAttribute("role", "row");
          for (let col = 0; col < 3; col += 1) {
            const month = rowIndex * 3 + col;
            const button = document.createElement("button");
            button.type = "button";
            button.className = "dp-cell";
            button.setAttribute("role", "gridcell");
            button.dataset.month = String(month);
            button.textContent = MONTHS[month];
            const selected = month === state.cursorM;
            button.setAttribute("aria-selected", selected ? "true" : "false");
            button.setAttribute("aria-label", `${MONTHS[month]} năm ${state.cursorY}`);
            if (selected) {
              button.classList.add("is-selected");
            }
            row.append(button);
          }
          grid.append(row);
        }
        withSchedule(grid);
      } else {
        pop.setAttribute("aria-label", "Chọn năm");
        prevBtn.setAttribute("aria-label", "Thập kỷ trước");
        nextBtn.setAttribute("aria-label", "Thập kỷ sau");
        rangeEl.textContent = `${state.decade} - ${state.decade + 9}`;
        const grid = document.createElement("div");
        grid.className = "dp-years";
        grid.setAttribute("role", "grid");
        grid.setAttribute("aria-label", `Các năm ${state.decade} đến ${state.decade + 9}`);
        const years = [];
        for (let offset = -1; offset <= 10; offset += 1) {
          years.push(state.decade + offset);
        }
        for (let rowIndex = 0; rowIndex < 4; rowIndex += 1) {
          const row = document.createElement("div");
          row.setAttribute("role", "row");
          years.slice(rowIndex * 3, rowIndex * 3 + 3).forEach((year) => {
            const button = document.createElement("button");
            button.type = "button";
            button.className = "dp-cell";
            button.setAttribute("role", "gridcell");
            button.dataset.year = String(year);
            button.textContent = String(year);
            const outside = year < state.decade || year > state.decade + 9;
            const outOfRange = year < MIN_YEAR || year > MAX_YEAR;
            button.disabled = outOfRange;
            button.setAttribute("aria-selected", year === state.cursorY ? "true" : "false");
            button.setAttribute("aria-label", `Năm ${year}`);
            if (outside) {
              button.classList.add("is-muted");
            }
            if (year === state.cursorY) {
              button.classList.add("is-selected");
            }
            row.append(button);
          });
          grid.append(row);
        }
        withSchedule(grid);
      }

      if (!pop.hidden) {
        api.place();
      }
      if (focus === "cell") {
        const target = body.querySelector(".dp-cell.is-selected:not(:disabled)")
          || body.querySelector(".dp-cell.is-today:not(:disabled)")
          || body.querySelector(".dp-cell:not(:disabled)");
        target?.focus();
      }
    }

    const api = {
      pop,
      trigger,
      place() {
        if (pop.hidden) {
          return;
        }
        const rect = trigger.getBoundingClientRect();
        if (rect.width === 0 && rect.height === 0) {
          api.close(false);
          return;
        }
        const margin = 8;
        const gap = 10;
        pop.classList.remove("is-above");
        pop.style.left = "0px";
        pop.style.top = "0px";
        const width = pop.offsetWidth;
        const height = pop.offsetHeight;
        let left = rect.left;
        let top = rect.bottom + gap;
        if (left + width > window.innerWidth - margin) {
          left = window.innerWidth - width - margin;
        }
        if (left < margin) {
          left = margin;
        }
        if (top + height > window.innerHeight - margin && rect.top - height - gap > margin) {
          top = rect.top - height - gap;
          pop.classList.add("is-above");
        }
        pop.style.left = `${left}px`;
        pop.style.top = `${top}px`;
        const caret = clamp(rect.left + 36 - left, 22, width - 22);
        pop.style.setProperty("--caret", `${caret}px`);
      },
      open() {
        if (input.disabled) {
          return;
        }
        if (openPicker && openPicker !== api) {
          openPicker.close(false);
        }
        const parsed = parseValue(input.value);
        const now = new Date();
        if (parsed) {
          state.selected = { y: parsed.y, m: parsed.m, d: parsed.d };
          state.hour = clamp(parsed.hour, 0, 23);
          state.minute = clamp(parsed.minute, 0, 59);
          state.cursorY = parsed.y;
          state.cursorM = parsed.m;
        } else {
          state.selected = null;
          state.hour = 9;
          state.minute = 0;
          state.cursorY = clamp(now.getFullYear(), MIN_YEAR, MAX_YEAR);
          state.cursorM = now.getMonth();
        }
        state.view = "day";
        state.decade = decadeStart(state.cursorY);
        openPicker = api;
        trigger.setAttribute("aria-expanded", "true");
        pop.hidden = false;
        render("cell");
      },
      close(focusTrigger) {
        if (openPicker === api) {
          openPicker = null;
        }
        trigger.setAttribute("aria-expanded", "false");
        pop.hidden = true;
        if (focusTrigger) {
          trigger.focus();
        }
      }
    };

    trigger.addEventListener("click", () => {
      if (trigger.disabled) {
        return;
      }
      if (openPicker === api) {
        api.close(false);
      } else {
        api.open();
      }
    });

    prevBtn.addEventListener("click", () => {
      shift(-1);
      render("cell");
    });
    nextBtn.addEventListener("click", () => {
      shift(1);
      render("cell");
    });
    titleBtn.addEventListener("click", () => {
      if (state.view === "day") {
        state.view = "month";
      } else if (state.view === "month") {
        state.view = "year";
        state.decade = decadeStart(state.cursorY);
      }
      render("cell");
    });

    body.addEventListener("click", (event) => {
      const stepper = event.target.closest("[data-step]");
      if (stepper) {
        applyTimeStep(stepper.dataset.step, Number(stepper.dataset.delta));
        return;
      }
      if (event.target.closest("[data-today]")) {
        setToday();
        return;
      }
      if (event.target.closest("[data-now]")) {
        setNow();
        return;
      }
      const cell = event.target.closest(".dp-cell");
      if (!cell || cell.disabled) {
        return;
      }
      if (state.view === "year") {
        state.cursorY = clamp(Number(cell.dataset.year), MIN_YEAR, MAX_YEAR);
        state.view = "month";
        render("cell");
        return;
      }
      if (state.view === "month") {
        state.cursorM = Number(cell.dataset.month);
        state.view = "day";
        render("cell");
        return;
      }
      state.selected = {
        y: Number(cell.dataset.year),
        m: Number(cell.dataset.month),
        d: Number(cell.dataset.day)
      };
      state.cursorY = state.selected.y;
      state.cursorM = state.selected.m;
      commit();
      if (mode === "date") {
        api.close(true);
      } else {
        render("cell");
      }
    });

    pop.addEventListener("keydown", (event) => {
      if (event.target.matches("[data-time]")) {
        const kind = event.target.dataset.time;
        const isField = event.target.tagName === "INPUT";
        const keyStep = isField
          ? { ArrowDown: 1, ArrowUp: -1 }[event.key]
          : { ArrowDown: 1, ArrowUp: -1, ArrowRight: 1, ArrowLeft: -1 }[event.key];
        if (keyStep) {
          event.preventDefault();
          applyTimeStep(kind, keyStep);
          if (isField) {
            requestAnimationFrame(() => event.target.select());
          }
          return;
        }
        if (event.key === "Enter") {
          event.preventDefault();
          if (isField) {
            commitTimeField(kind, event.target);
            event.target.blur();
            return;
          }
          if (state.selected) {
            commit();
          }
        }
        return;
      }
      if (event.key === "Tab") {
        const items = [...pop.querySelectorAll("button:not(:disabled), input.dp-step-value, [data-time]:not(input)")].filter((el) => !el.hidden && (el.tagName === "INPUT" || el.tabIndex >= 0));
        if (!items.length) {
          return;
        }
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      if (event.key === "PageUp" || event.key === "PageDown") {
        event.preventDefault();
        shift(event.key === "PageUp" ? -1 : 1);
        render("cell");
        return;
      }
      const cols = state.view === "day" ? 7 : 3;
      const delta = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -cols, ArrowDown: cols }[event.key];
      if (delta == null) {
        return;
      }
      const cells = [...body.querySelectorAll(".dp-cell:not(:disabled)")];
      const index = cells.indexOf(document.activeElement);
      if (index < 0) {
        return;
      }
      const next = cells[index + delta];
      if (!next) {
        return;
      }
      event.preventDefault();
      next.focus();
    });

    input.addEventListener("focus", () => {
      if (openPicker !== api) {
        trigger.focus();
      }
    });
    input.form?.addEventListener("reset", () => {
      setTimeout(paintTrigger, 0);
    });

    paintTrigger();
    ensureGlobalListeners();
  }

  function mount(root) {
    (root || document).querySelectorAll("input[type='date'], input[type='datetime-local']").forEach(enhance);
  }

  mount();
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => mount());
  }

  window.CrmDatePicker = { mount };
})();
