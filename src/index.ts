#!/usr/bin/env node

// ============================================================
// cronexplain - Parse, validate, explain cron expressions
// ZERO external dependencies
// ============================================================

const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const BLUE = "\x1b[34m";
const MAGENTA = "\x1b[35m";
const CYAN = "\x1b[36m";

const MONTH_NAMES = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const DAY_NAMES = [
  "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const MONTH_MAP: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};
const DAY_MAP: Record<string, number> = {
  sun: 0, mon: 1, tue: 2, wed: 3, thu: 4, fri: 5, sat: 6,
};

interface CronParts {
  minute: string;
  hour: string;
  dayOfMonth: string;
  month: string;
  dayOfWeek: string;
}

interface ParsedField {
  values: number[];
  raw: string;
}

function printHelp(): void {
  console.log(`
${BOLD}${CYAN}cronexplain${RESET} - Explain cron expressions in plain English

${BOLD}USAGE${RESET}
  cronexplain ${DIM}<expression>${RESET}          Explain a cron expression
  cronexplain ${DIM}--generate <text>${RESET}     Generate cron from natural language
  cronexplain ${DIM}--next <N> <expr>${RESET}     Show next N run times (default: 5)
  cronexplain ${DIM}--validate <expr>${RESET}     Validate a cron expression

${BOLD}OPTIONS${RESET}
  --help, -h           Show this help message
  --json               Output as JSON
  --next, -n <N>       Number of next run times to show (default: 5)
  --generate, -g       Generate cron from natural language
  --validate, -v       Validate without explaining

${BOLD}EXAMPLES${RESET}
  ${DIM}# Explain a cron expression${RESET}
  cronexplain "*/5 * * * *"

  ${DIM}# Show next 10 run times${RESET}
  cronexplain --next 10 "0 9 * * 1-5"

  ${DIM}# Generate from natural language${RESET}
  cronexplain --generate "every weekday at 9am"

  ${DIM}# Validate a cron expression${RESET}
  cronexplain --validate "0 0 1 * *"

  ${DIM}# JSON output for scripting${RESET}
  cronexplain --json "30 2 * * 0"
`);
}

function replaceNames(field: string, map: Record<string, number>): string {
  let result = field.toLowerCase();
  for (const [name, num] of Object.entries(map)) {
    result = result.replace(new RegExp(name, "gi"), String(num));
  }
  return result;
}

function parseField(raw: string, min: number, max: number): ParsedField {
  const values = new Set<number>();
  const parts = raw.split(",");

  for (const part of parts) {
    if (part === "*") {
      for (let i = min; i <= max; i++) values.add(i);
    } else if (part.includes("/")) {
      const [range, stepStr] = part.split("/");
      const step = parseInt(stepStr, 10);
      if (isNaN(step) || step <= 0) throw new Error(`Invalid step: ${part}`);
      let start = min;
      let end = max;
      if (range !== "*") {
        if (range.includes("-")) {
          const [a, b] = range.split("-").map(Number);
          start = a;
          end = b;
        } else {
          start = parseInt(range, 10);
        }
      }
      for (let i = start; i <= end; i += step) values.add(i);
    } else if (part.includes("-")) {
      const [a, b] = part.split("-").map(Number);
      if (isNaN(a) || isNaN(b)) throw new Error(`Invalid range: ${part}`);
      for (let i = a; i <= b; i++) values.add(i);
    } else {
      const num = parseInt(part, 10);
      if (isNaN(num)) throw new Error(`Invalid value: ${part}`);
      values.add(num);
    }
  }

  const sorted = Array.from(values).sort((a, b) => a - b);
  for (const v of sorted) {
    if (v < min || v > max) {
      throw new Error(`Value ${v} out of range [${min}-${max}]`);
    }
  }

  return { values: sorted, raw };
}

function parseCron(expr: string): CronParts {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) {
    throw new Error(
      `Expected 5 fields (minute hour day month weekday), got ${parts.length}`
    );
  }
  return {
    minute: parts[0],
    hour: parts[1],
    dayOfMonth: parts[2],
    month: replaceNames(parts[3], MONTH_MAP),
    dayOfWeek: replaceNames(parts[4], DAY_MAP),
  };
}

function validateCron(expr: string): { valid: boolean; error?: string } {
  try {
    const parts = parseCron(expr);
    parseField(parts.minute, 0, 59);
    parseField(parts.hour, 0, 23);
    parseField(parts.dayOfMonth, 1, 31);
    parseField(parts.month, 1, 12);
    parseField(parts.dayOfWeek, 0, 7);
    return { valid: true };
  } catch (e: any) {
    return { valid: false, error: e.message };
  }
}

function explainField(
  raw: string,
  min: number,
  max: number,
  names?: string[]
): string {
  if (raw === "*") return "every";

  const parts = raw.split(",");
  const descriptions: string[] = [];

  for (const part of parts) {
    if (part.includes("/")) {
      const [range, step] = part.split("/");
      if (range === "*") {
        descriptions.push(`every ${step}`);
      } else if (range.includes("-")) {
        const [a, b] = range.split("-");
        const aName = names ? names[parseInt(a)] : a;
        const bName = names ? names[parseInt(b)] : b;
        descriptions.push(`every ${step} from ${aName} through ${bName}`);
      } else {
        descriptions.push(`every ${step} starting at ${names ? names[parseInt(range)] : range}`);
      }
    } else if (part.includes("-")) {
      const [a, b] = part.split("-");
      const aName = names ? names[parseInt(a)] : a;
      const bName = names ? names[parseInt(b)] : b;
      descriptions.push(`${aName} through ${bName}`);
    } else {
      const val = parseInt(part, 10);
      descriptions.push(names ? names[val] || part : part);
    }
  }

  return descriptions.join(", ");
}

function explainCron(expr: string): string {
  const parts = parseCron(expr);

  // Validate all fields first
  parseField(parts.minute, 0, 59);
  parseField(parts.hour, 0, 23);
  parseField(parts.dayOfMonth, 1, 31);
  parseField(parts.month, 1, 12);
  parseField(parts.dayOfWeek, 0, 7);

  const pieces: string[] = [];

  // Minute
  if (parts.minute === "*") {
    pieces.push("every minute");
  } else if (parts.minute.startsWith("*/")) {
    pieces.push(`every ${parts.minute.slice(2)} minutes`);
  } else {
    pieces.push(`at minute ${explainField(parts.minute, 0, 59)}`);
  }

  // Hour
  if (parts.hour === "*") {
    pieces.push("of every hour");
  } else if (parts.hour.startsWith("*/")) {
    pieces.push(`every ${parts.hour.slice(2)} hours`);
  } else {
    const hourVals = parts.hour.split(",").map((h) => {
      if (h.includes("-")) return h;
      const n = parseInt(h, 10);
      const ampm = n >= 12 ? "PM" : "AM";
      const h12 = n === 0 ? 12 : n > 12 ? n - 12 : n;
      return `${h12}:00 ${ampm}`;
    });
    pieces.push(`at ${hourVals.join(", ")}`);
  }

  // Day of month
  if (parts.dayOfMonth !== "*") {
    pieces.push(`on day ${explainField(parts.dayOfMonth, 1, 31)}`);
  }

  // Month
  if (parts.month !== "*") {
    pieces.push(`in ${explainField(parts.month, 1, 12, MONTH_NAMES)}`);
  }

  // Day of week
  if (parts.dayOfWeek !== "*") {
    pieces.push(`on ${explainField(parts.dayOfWeek, 0, 7, DAY_NAMES)}`);
  }

  return pieces.join(" ");
}

function getNextRuns(expr: string, count: number): Date[] {
  const parts = parseCron(expr);
  const minutes = parseField(parts.minute, 0, 59).values;
  const hours = parseField(parts.hour, 0, 23).values;
  const daysOfMonth = parseField(parts.dayOfMonth, 1, 31).values;
  const months = parseField(parts.month, 1, 12).values;
  const daysOfWeek = parseField(parts.dayOfWeek, 0, 7).values;

  // Normalize day of week (7 = 0 = Sunday)
  const dowSet = new Set(daysOfWeek.map((d) => (d === 7 ? 0 : d)));
  const domWild = parts.dayOfMonth === "*";
  const dowWild = parts.dayOfWeek === "*";

  const results: Date[] = [];
  const now = new Date();
  const current = new Date(now);
  current.setSeconds(0, 0);
  current.setMinutes(current.getMinutes() + 1);

  const maxIterations = 525960; // ~1 year of minutes
  let iterations = 0;

  while (results.length < count && iterations < maxIterations) {
    iterations++;
    const m = current.getMinutes();
    const h = current.getHours();
    const dom = current.getDate();
    const mon = current.getMonth() + 1;
    const dow = current.getDay();

    if (!months.includes(mon)) {
      current.setMonth(current.getMonth() + 1, 1);
      current.setHours(0, 0, 0, 0);
      continue;
    }

    if (!hours.includes(h)) {
      current.setHours(current.getHours() + 1, 0, 0, 0);
      // Reset minutes back to start
      current.setMinutes(0);
      continue;
    }

    // DOM/DOW logic: if both are restricted, match either (OR). If only one restricted, match that one.
    let dayMatch = false;
    if (domWild && dowWild) {
      dayMatch = true;
    } else if (domWild) {
      dayMatch = dowSet.has(dow);
    } else if (dowWild) {
      dayMatch = daysOfMonth.includes(dom);
    } else {
      // Both restricted: OR
      dayMatch = daysOfMonth.includes(dom) || dowSet.has(dow);
    }

    if (!dayMatch) {
      current.setDate(current.getDate() + 1);
      current.setHours(0, 0, 0, 0);
      continue;
    }

    if (minutes.includes(m)) {
      results.push(new Date(current));
    }

    current.setMinutes(current.getMinutes() + 1);
  }

  return results;
}

function generateFromNaturalLanguage(text: string): string | null {
  const t = text.toLowerCase().trim();

  // "every X minutes"
  let match = t.match(/every\s+(\d+)\s+minutes?/);
  if (match) return `*/${match[1]} * * * *`;

  // "every X hours"
  match = t.match(/every\s+(\d+)\s+hours?/);
  if (match) return `0 */${match[1]} * * *`;

  // "every minute"
  if (/every\s+minute/.test(t)) return "* * * * *";

  // "every hour"
  if (/every\s+hour/.test(t)) return "0 * * * *";

  // "every day at HH:MM" or "daily at HH:MM"
  match = t.match(/(?:every\s+day|daily)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;
    if (match[3] === "pm" && h < 12) h += 12;
    if (match[3] === "am" && h === 12) h = 0;
    return `${m} ${h} * * *`;
  }

  // "every weekday at HH:MM" or "weekdays at HH"
  match = t.match(/(?:every\s+)?weekday(?:s)?\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;
    if (match[3] === "pm" && h < 12) h += 12;
    if (match[3] === "am" && h === 12) h = 0;
    return `${m} ${h} * * 1-5`;
  }

  // "every weekend at HH"
  match = t.match(/(?:every\s+)?weekend(?:s)?\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = match[2] ? parseInt(match[2], 10) : 0;
    if (match[3] === "pm" && h < 12) h += 12;
    if (match[3] === "am" && h === 12) h = 0;
    return `${m} ${h} * * 0,6`;
  }

  // "every monday at HH" etc
  const dayPattern = /(?:every\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/;
  match = t.match(dayPattern);
  if (match) {
    const dayNum = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"].indexOf(match[1]);
    let h = parseInt(match[2], 10);
    const m = match[3] ? parseInt(match[3], 10) : 0;
    if (match[4] === "pm" && h < 12) h += 12;
    if (match[4] === "am" && h === 12) h = 0;
    return `${m} ${h} * * ${dayNum}`;
  }

  // "at midnight"
  if (/at\s+midnight/.test(t)) return "0 0 * * *";

  // "at noon"
  if (/at\s+noon/.test(t)) return "0 12 * * *";

  // "every month" or "monthly"
  if (/(?:every\s+month|monthly)/.test(t)) return "0 0 1 * *";

  // "every week" or "weekly"
  if (/(?:every\s+week|weekly)/.test(t)) return "0 0 * * 0";

  // "every year" or "yearly" or "annually"
  if (/(?:every\s+year|yearly|annually)/.test(t)) return "0 0 1 1 *";

  // "at HH:MM" (simple time, daily)
  match = t.match(/at\s+(\d{1,2}):(\d{2})\s*(am|pm)?/);
  if (match) {
    let h = parseInt(match[1], 10);
    const m = parseInt(match[2], 10);
    if (match[3] === "pm" && h < 12) h += 12;
    if (match[3] === "am" && h === 12) h = 0;
    return `${m} ${h} * * *`;
  }

  return null;
}

function formatDate(d: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const day = days[d.getDay()];
  const month = months[d.getMonth()];
  const date = d.getDate();
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day}, ${month} ${date} ${year} ${hours}:${mins}`;
}

// ---- MAIN ----

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  const jsonOutput = args.includes("--json");
  const validateOnly = args.includes("--validate") || args.includes("-v");
  const generateMode = args.includes("--generate") || args.includes("-g");

  let nextCount = 5;
  let showNext = false;
  const nextIdx = args.indexOf("--next") !== -1 ? args.indexOf("--next") : args.indexOf("-n");
  if (nextIdx !== -1) {
    showNext = true;
    const maybeNum = args[nextIdx + 1];
    if (maybeNum && !maybeNum.startsWith("-") && !isNaN(parseInt(maybeNum, 10))) {
      nextCount = parseInt(maybeNum, 10);
    }
  }

  // Get the expression (last arg that isn't a flag or flag value)
  const flagsWithValues = new Set(["--next", "-n", "--generate", "-g"]);
  const flags = new Set([
    "--json", "--validate", "-v", "--help", "-h",
    "--next", "-n", "--generate", "-g",
  ]);
  const positional: string[] = [];
  for (let i = 0; i < args.length; i++) {
    if (flags.has(args[i])) {
      if (flagsWithValues.has(args[i]) && i + 1 < args.length) {
        // Check if next arg is the value for this flag
        if (args[i] === "--next" || args[i] === "-n") {
          const next = args[i + 1];
          if (!next.startsWith("-") && !isNaN(parseInt(next, 10))) {
            i++;
            continue;
          }
        } else {
          // For generate, the rest is the text
          positional.push(args.slice(i + 1).join(" "));
          break;
        }
      }
      continue;
    }
    positional.push(args[i]);
  }

  const input = positional.join(" ").trim();

  if (!input) {
    console.error(`${RED}Error: No expression or text provided.${RESET}`);
    process.exit(1);
  }

  if (generateMode) {
    const cron = generateFromNaturalLanguage(input);
    if (!cron) {
      if (jsonOutput) {
        console.log(JSON.stringify({ error: "Could not parse natural language input", input }, null, 2));
      } else {
        console.error(`${RED}Error:${RESET} Couldn't understand "${input}".`);
        console.error(`${DIM}Try something like "every weekday at 9am" or "every 5 minutes"${RESET}`);
      }
      process.exit(1);
    }
    if (jsonOutput) {
      console.log(JSON.stringify({
        input,
        cron,
        explanation: explainCron(cron),
      }, null, 2));
    } else {
      console.log(`\n${BOLD}${GREEN}Generated cron:${RESET} ${CYAN}${cron}${RESET}`);
      console.log(`${BOLD}Meaning:${RESET}     ${explainCron(cron)}\n`);
    }
    return;
  }

  if (validateOnly) {
    const result = validateCron(input);
    if (jsonOutput) {
      console.log(JSON.stringify({ expression: input, ...result }, null, 2));
    } else {
      if (result.valid) {
        console.log(`\n${GREEN}${BOLD}  VALID${RESET} ${CYAN}${input}${RESET}\n`);
      } else {
        console.log(`\n${RED}${BOLD}  INVALID${RESET} ${CYAN}${input}${RESET}`);
        console.log(`  ${DIM}${result.error}${RESET}\n`);
      }
    }
    process.exit(result.valid ? 0 : 1);
  }

  // Default: explain
  try {
    const explanation = explainCron(input);
    const validation = validateCron(input);

    if (jsonOutput) {
      const data: any = {
        expression: input,
        valid: validation.valid,
        explanation,
      };
      if (showNext) {
        data.nextRuns = getNextRuns(input, nextCount).map((d) => d.toISOString());
      }
      console.log(JSON.stringify(data, null, 2));
    } else {
      console.log(`\n${BOLD}${MAGENTA}  Cron Expression:${RESET} ${CYAN}${input}${RESET}`);

      // Show field breakdown
      const p = input.trim().split(/\s+/);
      console.log(`${DIM}  ` +
        `[${p[0]}] minute  ` +
        `[${p[1]}] hour  ` +
        `[${p[2]}] day(month)  ` +
        `[${p[3]}] month  ` +
        `[${p[4]}] day(week)${RESET}`);

      console.log(`\n${BOLD}${GREEN}  Meaning:${RESET} ${explanation}`);

      if (showNext || true) {
        const runs = getNextRuns(input, nextCount);
        console.log(`\n${BOLD}${YELLOW}  Next ${runs.length} runs:${RESET}`);
        for (let i = 0; i < runs.length; i++) {
          console.log(`  ${DIM}${i + 1}.${RESET} ${formatDate(runs[i])}`);
        }
      }
      console.log();
    }
  } catch (e: any) {
    if (jsonOutput) {
      console.log(JSON.stringify({ expression: input, valid: false, error: e.message }, null, 2));
    } else {
      console.error(`\n${RED}${BOLD}  Error:${RESET} ${e.message}\n`);
    }
    process.exit(1);
  }
}

main();
