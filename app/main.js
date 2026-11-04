import { calculate, dateKey, defaults, validate } from "./pay.js";

const storageKey = "work-cheer-v1";
const byId = (id) => document.getElementById(id);
const number = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateLabel = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" });
const story = {
  before: ["待开工", "打工番剧即将开播。"],
  working: ["计薪中", "叮，又攒到一分钱！"],
  break: ["午休中", "暂停营业，先吃饭！"],
  done: ["已下班", "本集完，打工人撤退！"],
  rest: ["休息日", "今天休刊，仓鼠躺平。"],
};
const ui = Object.fromEntries([
  "today", "earnings", "status", "earned", "quote", "progress", "percent", "worked",
  "daily", "hourly", "override", "schedule-note", "storage-error", "settings",
  "settings-form", "form-error", "break-fields",
].map((id) => [id, byId(id)]));
const form = ui["settings-form"];
const inputs = form.elements;
const workDays = [...form.querySelectorAll('input[name="workDays"]')];
let state = load();
let previous;

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return {
      settings: saved?.settings && !validate(saved.settings) ? saved.settings : defaults,
      override: ["work", "rest"].includes(saved?.override?.value) ? saved.override : null,
    };
  } catch {
    return { settings: defaults, override: null };
  }
}

function message(element, value) {
  element.textContent = value;
  element.hidden = !value;
}

function save(next, errorElement) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(next));
    state = next;
    message(errorElement, "");
    return true;
  } catch {
    message(errorElement, "本机保存失败，请检查应用的存储权限后再试。");
    return false;
  }
}

function setText(element, value) {
  if (element.textContent !== value) element.textContent = value;
}

function render(animate = false) {
  const now = new Date();
  const day = dateKey(now);
  const settings = state.settings;
  const override = state.override?.day === day ? state.override.value : "auto";
  const pay = calculate(settings, now, override);
  const [status, quote] = story[pay.status];
  const earned = number.format(pay.earned);
  const minutes = Math.floor(pay.elapsedMs / 60_000);

  ui.today.dateTime = day;
  setText(ui.today, dateLabel.format(now));
  ui.earnings.dataset.status = pay.status;
  ui.earned.parentElement.classList.toggle("compact", earned.length > 10);
  setText(ui.status, status);
  setText(ui.quote, quote);
  setText(ui.earned, earned);
  setText(ui.percent, `${Math.floor(pay.progress * 100)}%`);
  ui.progress.value = pay.progress;
  setText(ui.worked, `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`);
  setText(ui.daily, `¥${number.format(pay.dailyPay)}`);
  setText(ui.hourly, `¥${number.format(pay.hourlyPay)}`);
  ui.override.value = override;
  const pause = settings.hasBreak ? ` · 午休 ${settings.breakStart}–${settings.breakEnd}` : "";
  setText(ui["schedule-note"], `作息 ${settings.start}–${settings.end}${pause}`);

  const milestone = animate && previous?.day === day && (
    (previous.status === "before" && pay.status === "working") ||
    (previous.progress < 0.5 && pay.progress >= 0.5 && pay.status === "working") ||
    (previous.status !== "done" && pay.status === "done")
  );
  if (milestone) ui.earnings.classList.add("celebrate");
  previous = { day, status: pay.status, progress: pay.progress };
}

function syncBreakFields() {
  const enabled = inputs.hasBreak.checked;
  ui["break-fields"].hidden = !enabled;
  inputs.breakStart.disabled = !enabled;
  inputs.breakEnd.disabled = !enabled;
}

function openSettings() {
  const { settings } = state;
  for (const name of ["salary", "payDays", "start", "end", "breakStart", "breakEnd"]) {
    inputs[name].value = settings[name];
  }
  inputs.hasBreak.checked = settings.hasBreak;
  for (const day of workDays) day.checked = settings.workDays.includes(Number(day.value));
  message(ui["form-error"], "");
  syncBreakFields();
  ui.settings.showModal();
}

byId("open-settings").addEventListener("click", openSettings);
byId("close-settings").addEventListener("click", () => ui.settings.close());
inputs.hasBreak.addEventListener("change", syncBreakFields);
ui.earnings.addEventListener("animationend", () => ui.earnings.classList.remove("celebrate"));
form.addEventListener("submit", (event) => {
  event.preventDefault();
  const settings = {
    salary: inputs.salary.valueAsNumber,
    payDays: inputs.payDays.valueAsNumber,
    workDays: workDays.filter((day) => day.checked).map((day) => Number(day.value)),
    start: inputs.start.value,
    end: inputs.end.value,
    hasBreak: inputs.hasBreak.checked,
    breakStart: inputs.breakStart.value || defaults.breakStart,
    breakEnd: inputs.breakEnd.value || defaults.breakEnd,
  };
  const error = validate(settings);
  if (error) {
    message(ui["form-error"], error);
    return;
  }
  if (save({ ...state, settings }, ui["form-error"])) {
    ui.settings.close();
    render();
  }
});

ui.override.addEventListener("change", () => {
  const value = ui.override.value;
  const override = value === "auto" ? null : { day: dateKey(new Date()), value };
  save({ ...state, override }, ui["storage-error"]);
  render();
});

window.addEventListener("storage", (event) => {
  if (event.key === storageKey || event.key === null) {
    state = load();
    render();
  }
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) render();
});
window.addEventListener("focus", () => render());
render();
setInterval(() => render(true), 1000);
