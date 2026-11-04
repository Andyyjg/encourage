export const defaults = {
  salary: 3000,
  payDays: 21.75,
  workDays: [1, 2, 3, 4, 5],
  start: "09:00",
  end: "18:00",
  hasBreak: true,
  breakStart: "12:00",
  breakEnd: "13:00",
};

const minute = 60_000;
const timePattern = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function validate(settings) {
  if (!Number.isFinite(settings.salary) || settings.salary < 0 || settings.salary > 100_000_000) {
    return "请输入 0 到 100,000,000 元之间的月工资。";
  }
  if (!Number.isFinite(settings.payDays) || settings.payDays < 0.01 || settings.payDays > 31) {
    return "请输入 0.01 到 31 之间的月计薪天数。";
  }
  if (!Array.isArray(settings.workDays) || settings.workDays.some(
    (day) => !Number.isInteger(day) || day < 0 || day > 6,
  )) {
    return "请选择有效的工作日。";
  }
  if (!timePattern.test(settings.start) || !timePattern.test(settings.end) ||
      settings.start >= settings.end) {
    return "下班时间须晚于上班时间，且位于同一天。";
  }
  if (typeof settings.hasBreak !== "boolean" ||
      !timePattern.test(settings.breakStart) || !timePattern.test(settings.breakEnd) ||
      (settings.hasBreak && !(settings.start < settings.breakStart &&
        settings.breakStart < settings.breakEnd && settings.breakEnd < settings.end))) {
    return "午休须位于上班与下班之间，且结束时间晚于开始时间。";
  }
  return "";
}

export function dateKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

function atTime(date, time) {
  const [hours, minutes] = time.split(":").map(Number);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), hours, minutes).getTime();
}

export function calculate(settings, now, override = "auto") {
  const start = atTime(now, settings.start);
  const end = atTime(now, settings.end);
  const breakStart = atTime(now, settings.breakStart);
  const breakEnd = atTime(now, settings.breakEnd);
  // Clamp break boundaries in case the local clock skips a configured time.
  const pauseStart = Math.min(end, Math.max(start, breakStart));
  const pauseEnd = Math.min(end, Math.max(pauseStart, breakEnd));
  const periods = settings.hasBreak ? [[start, pauseStart], [pauseEnd, end]] : [[start, end]];
  const scheduledMs = periods.reduce((sum, [from, to]) => sum + Math.max(0, to - from), 0);
  const dailyPay = settings.salary / settings.payDays;
  const hourlyPay = scheduledMs > 0 ? dailyPay / (scheduledMs / (60 * minute)) : 0;
  const workingToday = override === "work" || (override === "auto" && settings.workDays.includes(now.getDay()));
  const elapsedMs = workingToday
    ? periods.reduce((sum, [from, to]) => sum + Math.max(0, Math.min(now.getTime(), to) - from), 0)
    : 0;
  const progress = scheduledMs > 0 ? elapsedMs / scheduledMs : 0;

  let status = "working";
  if (!workingToday || scheduledMs === 0) status = "rest";
  else if (now < start) status = "before";
  else if (now >= end) status = "done";
  else if (settings.hasBreak && now >= pauseStart && now < pauseEnd) status = "break";

  return { status, elapsedMs, scheduledMs, dailyPay, hourlyPay, earned: dailyPay * progress, progress };
}
