// ─── App configuration ──────────────────────────────────────────────────────

export const YEAR = 2026;

export const USER_NAMES = ["Albert", "David", "Pau"];

export interface GPConfig {
  number: number;
  name: string;
  /** Terms used to match against OpenF1 meeting fields (country_name, location, circuit_short_name, meeting_name) */
  matchTerms: string[];
  /** Whether this GP weekend includes Sprint Qualifying + Sprint */
  sprint: boolean;
}

export const GP_CALENDAR: GPConfig[] = [
  { number: 1,  name: "Australia",        matchTerms: ["Australia"],                       sprint: false },
  { number: 2,  name: "China",            matchTerms: ["China"],                           sprint: true  },
  { number: 3,  name: "Japan",            matchTerms: ["Japan"],                           sprint: false },
  { number: 4,  name: "Bahrain",          matchTerms: ["Bahrain"],                         sprint: false },
  { number: 5,  name: "Saudi Arabia",     matchTerms: ["Saudi Arabia"],                    sprint: false },
  { number: 6,  name: "Miami",            matchTerms: ["Miami"],                           sprint: true  },
  { number: 7,  name: "Canada",           matchTerms: ["Canada"],                          sprint: true  },
  { number: 8,  name: "Monaco",           matchTerms: ["Monaco"],                          sprint: false },
  { number: 9,  name: "Spain (Barcelona)", matchTerms: ["Barcelona", "Catalunya"],         sprint: false },
  { number: 10, name: "Austria",          matchTerms: ["Austria"],                         sprint: false },
  { number: 11, name: "Great Britain",    matchTerms: ["Great Britain", "Silverstone"],    sprint: true  },
  { number: 12, name: "Belgium",          matchTerms: ["Belgium", "Spa"],                  sprint: false },
  { number: 13, name: "Hungary",          matchTerms: ["Hungary"],                         sprint: false },
  { number: 14, name: "Netherlands",      matchTerms: ["Netherlands", "Zandvoort"],        sprint: true  },
  { number: 15, name: "Italy",            matchTerms: ["Italy", "Monza"],                  sprint: false },
  { number: 16, name: "Spain (Madrid)",   matchTerms: ["Madrid"],                          sprint: false },
  { number: 17, name: "Azerbaijan",       matchTerms: ["Azerbaijan"],                      sprint: false },
  { number: 18, name: "Singapore",        matchTerms: ["Singapore"],                       sprint: true  },
  { number: 19, name: "United States",    matchTerms: ["Austin", "United States"],         sprint: false },
  { number: 20, name: "Mexico",           matchTerms: ["Mexico"],                          sprint: false },
  { number: 21, name: "Brazil",           matchTerms: ["Brazil"],                          sprint: false },
  { number: 22, name: "Las Vegas",        matchTerms: ["Las Vegas"],                       sprint: false },
  { number: 23, name: "Qatar",            matchTerms: ["Qatar"],                           sprint: false },
  { number: 24, name: "Abu Dhabi",        matchTerms: ["Abu Dhabi"],                       sprint: false },
];

/** All 2026 driver abbreviations in your chosen order */
export const DRIVERS: string[] = [
  "VER", "NOR", "PIA", "LEC", "HAM",
  "RUS", "SAI", "ALO", "STR", "GAS",
  "DOO", "OCO", "TSU", "HAD", "ALB",
  "COL", "BOT", "BOR", "BEA", "LAW",
];
