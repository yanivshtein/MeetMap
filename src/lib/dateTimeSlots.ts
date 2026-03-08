export const TIME_OPTIONS: string[] = Array.from({ length: 96 }, (_, index) => {
  const totalMinutes = index * 15;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

export function combineDateAndTimeToISO(
  datePart: string,
  timePart: string,
): string | undefined {
  if (!datePart && !timePart) {
    return undefined;
  }
  if (!datePart || !timePart) {
    return undefined;
  }

  const parsed = new Date(`${datePart}T${timePart}`);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

function nearestQuarter(timePart: string): string {
  const [hoursRaw, minutesRaw] = timePart.split(":");
  const hours = Number(hoursRaw);
  const minutes = Number(minutesRaw);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) {
    return "12:00";
  }

  const total = hours * 60 + minutes;
  const rounded = Math.round(total / 15) * 15;
  const clamped = Math.max(0, Math.min(23 * 60 + 45, rounded));
  const h = Math.floor(clamped / 60);
  const m = clamped % 60;

  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function splitISOToDateAndTime(
  dateISO?: string | null,
): { datePart: string; timePart: string } {
  if (!dateISO) {
    return { datePart: "", timePart: "" };
  }

  const parsed = new Date(dateISO);
  if (Number.isNaN(parsed.getTime())) {
    return { datePart: "", timePart: "" };
  }

  const year = parsed.getFullYear();
  const month = String(parsed.getMonth() + 1).padStart(2, "0");
  const day = String(parsed.getDate()).padStart(2, "0");
  const hour = String(parsed.getHours()).padStart(2, "0");
  const minute = String(parsed.getMinutes()).padStart(2, "0");

  return {
    datePart: `${year}-${month}-${day}`,
    timePart: nearestQuarter(`${hour}:${minute}`),
  };
}
