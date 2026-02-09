# cronexplain

[![npm version](https://img.shields.io/npm/v/@lxgicstudios/cronexplain.svg)](https://www.npmjs.com/package/@lxgicstudios/cronexplain)
[![license](https://img.shields.io/npm/l/@lxgicstudios/cronexplain.svg)](https://github.com/lxgicstudios/cronexplain/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/@lxgicstudios/cronexplain.svg)](https://nodejs.org)

Parse, validate, and explain cron expressions in plain English. You can also generate cron expressions from natural language and see upcoming run times. Zero dependencies.

## Install

```bash
npm install -g @lxgicstudios/cronexplain
```

Or run it directly:

```bash
npx @lxgicstudios/cronexplain "*/5 * * * *"
```

## Features

- Explain any 5-field cron expression in readable English
- Generate cron expressions from natural language ("every weekday at 9am")
- Show the next N scheduled run times
- Validate expressions with helpful error messages
- JSON output for scripting and CI pipelines
- Colorful terminal output
- Zero external dependencies

## Usage

### Explain a cron expression

```bash
cronexplain "*/5 * * * *"
# => every 5 minutes of every hour
```

### Generate from natural language

```bash
cronexplain --generate "every weekday at 9am"
# => Generated cron: 0 9 * * 1-5
```

### Show next run times

```bash
cronexplain --next 10 "0 9 * * 1-5"
```

### Validate

```bash
cronexplain --validate "0 25 * * *"
# => INVALID - Value 25 out of range [0-23]
```

### JSON output

```bash
cronexplain --json "30 2 * * 0"
```

## Options

| Option | Alias | Description |
|--------|-------|-------------|
| `--help` | `-h` | Show help message |
| `--json` | | Output as JSON |
| `--next <N>` | `-n` | Number of next runs to display (default: 5) |
| `--generate <text>` | `-g` | Generate cron from natural language |
| `--validate` | `-v` | Validate without full explanation |

## Natural Language Examples

| Input | Output |
|-------|--------|
| "every 5 minutes" | `*/5 * * * *` |
| "every weekday at 9am" | `0 9 * * 1-5` |
| "daily at 2:30pm" | `30 14 * * *` |
| "every monday at 8am" | `0 8 * * 1` |
| "at midnight" | `0 0 * * *` |
| "monthly" | `0 0 1 * *` |
| "every weekend at 10am" | `0 10 * * 0,6` |

## License

MIT - [LXGIC Studios](https://lxgicstudios.com)
