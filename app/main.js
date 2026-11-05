import { calculate, dailyCost, dateKey, defaults, validate } from "./pay.js";

const storageKey = "work-cheer-v1";
const byId = (id) => document.getElementById(id);
const number = new Intl.NumberFormat("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dateLabel = new Intl.DateTimeFormat("zh-CN", { month: "long", day: "numeric", weekday: "long" });
const payrollStory = {
  before: ["待开工", "打工小队整装待发，金币副本即将开启！"],
  working: ["金币掉落中", "叮！又捡到一枚金币，仓鼠瓜子基金 +1！"],
  break: ["能量补给中", "暂停打怪，仓鼠先去补充瓜子能量！"],
  done: ["关卡通关", "打卡下班！今天的金币已经装进背包啦。"],
  rest: ["今日休刊", "仓鼠翻了个身：今天是躺平奖励关。"],
};
const debtStories = {
  before: ["怪兽登场", "账单怪兽出现啦！上班赚金币，把今天的负数打回正数！"],
  break: ["补充能量", "仓鼠去吃瓜子啦，账单怪兽暂停挨打！"],
  done: ["今日通关", "本局结算完成！明天再来把余额喂得更胖。"],
  rest: ["今日休刊", "今天先休息，账单怪兽也被关进了待机笼。"],
};
const ui = Object.fromEntries([
  "today", "earnings", "earnings-title", "status", "sign", "earned", "estimate", "quote", "art-enemy",
  "progress", "progress-label", "percent", "worked", "daily", "daily-label", "hourly",
  "hourly-label", "override", "schedule-note", "debt-detail", "storage-error", "settings",
  "settings-form", "form-error", "break-fields", "debt-fields",
].map((id) => [id, byId(id)]));
const form = ui["settings-form"];
const inputs = form.elements;
const workDays = [...form.querySelectorAll('input[name="workDays"]')];
const modeButtons = [...document.querySelectorAll("[data-mode]")];
let state = load();
let previous;
let celebrationTimer;

function celebrate() {
  ui.earnings.classList.add("celebrate");
  window.clearTimeout(celebrationTimer);
  celebrationTimer = window.setTimeout(() => ui.earnings.classList.remove("celebrate"), 1100);
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    const savedSettings = saved?.settings && typeof saved.settings === "object" ? saved.settings : {};
    const settings = { ...defaults, ...savedSettings };
    return {
      settings: !validate(settings) ? settings : defaults,
      mode: ["payroll", "debt"].includes(saved?.mode) ? saved.mode : "payroll",
      override: ["work", "rest"].includes(saved?.override?.value) ? saved.override : null,
    };
  } catch {
    return { settings: defaults, mode: "payroll", override: null };
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

function debtStory(pay) {
  if (pay.status !== "working") return debtStories[pay.status];
  if (pay.dailyCosts <= 0) return ["金币直通背包", "今天没有账单怪兽，所有金币直接装进你的背包！"];
  if (pay.debtProgress >= 1) return ["KO！怪兽倒下", "KO！生活成本被打败，接下来的金币全都归你啦！✨"];
  if (pay.debtProgress >= 0.75) return ["蓄力最后一击", "怪兽只剩一丝血啦，仓鼠举起小爪爪准备 KO！"];
  if (pay.debtProgress >= 0.5) return ["怪兽半血啦", "账单怪兽开始慌了！已经打掉一半血量！"];
  if (pay.debtProgress >= 0.25) return ["金币连击中", "工资金币连击！账单怪兽的血条正在缩水！"];
  return ["开始打怪啦", "第一枚金币命中！负数余额开始往正数走啦！"];
}

function render(animate = false) {
  const now = new Date();
  const day = dateKey(now);
  const settings = state.settings;
  const debtMode = state.mode === "debt";
  const override = state.override?.day === day ? state.override.value : "auto";
  const pay = calculate(settings, now, override);
  const [status, quote] = debtMode ? debtStory(pay) : payrollStory[pay.status];
  const amount = debtMode ? pay.net : pay.earned;
  const shownAmount = debtMode ? Math.abs(amount) : amount;
  const displayAmount = number.format(shownAmount);
  const minutes = Math.floor(pay.elapsedMs / 60_000);
  const displayProgress = debtMode ? pay.debtProgress : pay.progress;

  ui.today.dateTime = day;
  setText(ui.today, dateLabel.format(now));
  ui.earnings.dataset.status = pay.status;
  ui.earnings.dataset.mode = state.mode;
  ui.earnings.dataset.balance = amount < 0 ? "negative" : amount > 0 ? "positive" : "zero";
  ui.earned.parentElement.classList.toggle("compact", displayAmount.length > 10);
  setText(ui.status, status);
  setText(ui.quote, quote);
  setText(ui.earned, displayAmount);
  ui.sign.hidden = !debtMode || amount === 0;
  setText(ui.sign, amount < 0 ? "−" : "+");

  if (debtMode) {
    setText(ui["earnings-title"], amount < 0 ? "账单怪兽还剩" : amount > 0 ? "今日已转正" : "KO！刚好清零");
    setText(ui.estimate, pay.dailyCosts > 0
      ? `今天账单 ¥${number.format(pay.dailyCosts)}，工作收入变成金币攻击怪兽`
      : "今天没有账单怪兽，工作收入直接装进背包");
    setText(ui["progress-label"], pay.debtProgress >= 1 ? "怪兽已 KO" : "账单怪兽掉血进度");
    setText(ui["daily-label"], "今日账单血量");
    setText(ui["hourly-label"], "参考时薪");
    const paid = Math.min(pay.earned, pay.dailyCosts);
    const detail = amount < 0
      ? `怪兽血量 ¥${number.format(pay.dailyCosts)} · 已打掉 ¥${number.format(paid)} · 再赚 ¥${number.format(Math.abs(amount))} 就能 KO！`
      : pay.dailyCosts > 0
        ? `KO！怪兽已倒下 · 今天净赚 ¥${number.format(amount)}，金币全部归你！`
        : "本关没有账单怪兽，所有金币都进你的背包啦！";
    setText(ui["debt-detail"], detail);
    ui["debt-detail"].hidden = false;
    setText(ui["art-enemy"], "账单怪兽");
  } else {
    setText(ui["earnings-title"], "今天已赚");
    setText(ui.estimate, "按当前工资和作息估算");
    setText(ui["progress-label"], "今日工作进度");
    setText(ui["daily-label"], "计划日薪");
    setText(ui["hourly-label"], "参考时薪");
    ui["debt-detail"].hidden = true;
    setText(ui["art-enemy"], "打工仓鼠");
  }
  setText(ui.percent, `${Math.floor(displayProgress * 100)}%`);
  ui.progress.value = displayProgress;
  setText(ui.worked, `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`);
  setText(ui.daily, `¥${number.format(debtMode ? pay.dailyCosts : pay.dailyPay)}`);
  setText(ui.hourly, `¥${number.format(pay.hourlyPay)}`);
  ui.override.value = override;
  modeButtons.forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.mode === state.mode));
  });
  const pause = settings.hasBreak ? ` · 午休 ${settings.breakStart}–${settings.breakEnd}` : "";
  setText(ui["schedule-note"], `作息 ${settings.start}–${settings.end}${pause}`);

  const crossedDebtMilestone = previous?.mode === "debt" && previous.day === day && (
    [0.25, 0.5, 0.75, 1].some((threshold) => previous.debtProgress < threshold && pay.debtProgress >= threshold) ||
    (previous.net <= 0 && pay.net > 0)
  );
  const payrollMilestone = previous?.mode === "payroll" && previous.day === day && (
    (previous.status === "before" && pay.status === "working") ||
    (previous.progress < 0.5 && pay.progress >= 0.5 && pay.status === "working") ||
    (previous.status !== "done" && pay.status === "done")
  );
  if (animate && (crossedDebtMilestone || payrollMilestone)) celebrate();
  previous = { day, mode: state.mode, status: pay.status, progress: pay.progress, debtProgress: pay.debtProgress, net: pay.net };
}

function syncBreakFields() {
  const enabled = inputs.hasBreak.checked;
  ui["break-fields"].hidden = !enabled;
  inputs.breakStart.disabled = !enabled;
  inputs.breakEnd.disabled = !enabled;
}

function costPreview(item) {
  const date = new Date();
  const settings = {
    [item]: Number.isFinite(inputs[item].valueAsNumber) ? inputs[item].valueAsNumber : 0,
    [`${item}Period`]: inputs[`${item}Period`].value,
  };
  const amount = dailyCost(settings, item, date);
  const days = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  const suffix = settings[`${item}Period`] === "monthly" ? `（按当月 ${days} 天折算）` : "";
  setText(byId(`${item}-daily`), `折合 ¥${number.format(amount)} / 天${suffix}`);
}

function updateCostPreviews() {
  ["rent", "food", "misc"].forEach(costPreview);
}

function openSettings() {
  const { settings } = state;
  for (const name of ["salary", "payDays", "start", "end", "breakStart", "breakEnd", "rent", "food", "misc"]) {
    inputs[name].value = settings[name];
  }
  for (const name of ["rentPeriod", "foodPeriod", "miscPeriod"]) inputs[name].value = settings[name];
  inputs.hasBreak.checked = settings.hasBreak;
  for (const day of workDays) day.checked = settings.workDays.includes(Number(day.value));
  ui["debt-fields"].hidden = state.mode !== "debt";
  message(ui["form-error"], "");
  syncBreakFields();
  updateCostPreviews();
  ui.settings.showModal();
}

byId("open-settings").addEventListener("click", openSettings);
byId("close-settings").addEventListener("click", () => ui.settings.close());
inputs.hasBreak.addEventListener("change", syncBreakFields);
form.addEventListener("input", updateCostPreviews);
form.addEventListener("change", updateCostPreviews);
modeButtons.forEach((button) => button.addEventListener("click", () => {
  const mode = button.dataset.mode;
  if (mode !== state.mode && save({ ...state, mode }, ui["storage-error"])) render();
}));

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
    rent: inputs.rent.valueAsNumber,
    rentPeriod: inputs.rentPeriod.value,
    food: inputs.food.valueAsNumber,
    foodPeriod: inputs.foodPeriod.value,
    misc: inputs.misc.valueAsNumber,
    miscPeriod: inputs.miscPeriod.value,
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
