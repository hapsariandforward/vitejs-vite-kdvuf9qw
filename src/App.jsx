import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import {
  TrendingUp, Layers, Check, RotateCcw, Dices, Zap, ShieldCheck, Target, Sliders, Download, Upload, Users, Wallet, Coins,
  Settings, Plus, Trash2, Table, FileSpreadsheet, CheckCircle2, AlertTriangle, Pencil, HelpCircle, BookOpen, History, Bookmark,
  Save, Sparkles, ArrowUpRight, ArrowDownRight, Trophy, Info, Sun, Moon, Monitor, ChevronUp, ChevronDown, Home
} from 'lucide-react';
import EditMode from './EditMode.jsx';
// ============================================================================================
// Monte-Carlo Retirement Planner v3.4 — single-file build (engine + UI).
// The engine section is framework-free and unit-tested; the UI section starts at "export default function App".
// ============================================================================================
/* =====================================================================================
   Monte-Carlo Retirement Planner — projection engine (pure, framework-free, unit-testable)
   -------------------------------------------------------------------------------------
   Everything in this section is deterministic given its inputs. No React, no DOM, no
   randomness other than the explicitly seeded generator used by the Monte Carlo runner.
   ===================================================================================== */

// ---------------------------------------------------------------- numeric helpers
const num = (v, d = 0) => {
  if (v === '' || v === null || v === undefined || typeof v === 'boolean') return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const isBlank = (v) => v === '' || v === null || v === undefined || (typeof v === 'number' && !Number.isFinite(v));
const round250 = (v) => Math.round(v / 250) * 250;
const formatGBP = (v) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(Number.isFinite(v) ? v : 0);
const isPlainObject = (o) => o !== null && typeof o === 'object' && !Array.isArray(o);

// ---------------------------------------------------------------- empirical dataset
// Real S&P 500 total return (s) and real 50/50 Govt/Corp bond return (b), % per year.
const HISTORICAL_TUPLES = [
  [1928,45.49,3.22],[1929,-8.83,3.01],[1930,-20.01,9.55],[1931,-38.07,0.22],[1932,1.82,29.49],[1933,48.85,6.6],
  [1934,-2.66,11.7],[1935,42.49,5.73],[1936,30.06,6.66],[1937,-37.13,-4.25],[1938,32.98,9.77],[1939,-1.1,6.2],
  [1940,-11.31,6.27],[1941,-20.65,-7.67],[1942,9.3,-4.86],[1943,21.47,2.24],[1944,16.36,2.22],[1945,32.84,2.99],
  [1946,-22.48,-12.96],[1947,-3.34,-7.58],[1948,2.63,-0.29],[1949,20.81,7.25],[1950,23.48,-3.4],[1951,16.68,-5.89],
  [1952,17.27,2.58],[1953,-1.94,2.12],[1954,53.71,5.51],[1955,32.1,-0.02],[1956,4.33,-5.14],[1957,-12.98,0.14],
  [1958,41.23,0.4],[1959,10.15,-2.23],[1960,-1.01,7.69],[1961,25.79,2.89],[1962,-10.01,4.7],[1963,20.63,1.9],
  [1964,15.3,3.44],[1965,10.28,0.03],[1966,-12.98,-3.6],[1967,20.15,-3.28],[1968,5.82,-0.63],[1969,-13.6,-9.15],
  [1970,-1.9,5.33],[1971,10.61,8.35],[1972,14.84,3.59],[1973,-21.17,-4.34],[1974,-34.04,-12.05],[1975,28.11,0.37],
  [1976,18.09,12.4],[1977,-12.82,-1.01],[1978,-2.3,-7.19],[1979,4.61,-12.32],[1980,17.08,-13.93],[1981,-12.51,-0.54],
  [1982,15.98,26.1],[1983,17.87,5.69],[1984,2.11,10.32],[1985,26.43,20.22],[1986,17.21,21.55],[1987,1.32,-5.52],
  [1988,11.6,6.94],[1989,25.64,11.56],[1990,-8.64,0.08],[1991,26.36,12.97],[1992,4.46,7.64],[1993,7.03,12.24],
  [1994,-1.31,-7.16],[1995,33.8,18.8],[1996,18.74,-0.21],[1997,30.88,9.03],[1998,26.3,9.67],[1999,17.72,-6.22],
  [2000,-12.01,9.29],[2001,-13.2,5.07],[2002,-23.78,11.01],[2003,25.99,4.98],[2004,7.25,3.81],[2005,1.37,0.46],
  [2006,12.75,1.92],[2007,1.35,2.5],[2008,-36.61,7.42],[2009,22.6,3.3],[2010,13.13,6.81],[2011,-0.84,11.02],
  [2012,13.91,4.72],[2013,30.19,-6.48],[2014,12.67,9.74],[2015,0.64,-0.43],[2016,9.5,3.38],[2017,19.09,4.07],
  [2018,-6.02,-3.24],[2019,28.28,9.97],[2020,16.44,9.38],[2021,19.95,-8.26],[2022,-22.96,-21.22],[2023,22.2,3.73],
  [2024,21.51,0.98],[2025,14.78,2.86]
];
const HISTORICAL_DATA = HISTORICAL_TUPLES.map(d => ({ y: d[0], s: d[1], b: d[2] }));
const HISTORICAL_MAP = new Map(HISTORICAL_DATA.map(d => [d.y, d]));
const HISTORICAL_FIRST_YEAR = HISTORICAL_DATA[0].y;
const HISTORICAL_LAST_YEAR = HISTORICAL_DATA[HISTORICAL_DATA.length - 1].y;
const getHistoricalPoint = (startYear, t) => HISTORICAL_MAP.get(num(startYear, 0) + t) || null;

// Equity weight used to blend the historical stock/bond series for each risk tier.
const RISK_EQUITY_WEIGHTS = {
  'High Risk': 0.90, 'Medium/High Risk': 0.70, 'Medium Risk': 0.50,
  'Medium/Low Risk': 0.30, 'Low Risk': 0.10, 'Cash Equivalents': 0.00
};

/*
 * `real` is the median (geometric) annual real return; `volatility` is the annual σ of the log return.
 * The lucky/unlucky bounds shown in the Config matrix are not stored here: they are derived from these
 * figures and the plan's own horizon by luckyBand, so the percentile they claim is true.
 *
 * `sigmaParam` is uncertainty about the expected return ITSELF, as distinct from the year-to-year
 * scatter around it. The two behave completely differently over a long horizon: volatility averages out
 * as σ/√T, while being wrong about the long-run average never averages out at all. Institutional capital
 * market assumptions carry both — BlackRock's own bands are 1.06x our width at five years but 1.56x at
 * thirty, and the gap is exactly this term. It is drawn once per simulated path rather than once per
 * year, giving an annualised variance of sigmaParam² + σ²/T.
 *
 * It defaults to zero in every built-in tier, so the shipped model is unchanged until a set of
 * assumptions that quantifies it is loaded. Zero is a real claim, not a placeholder: it says we are
 * certain of the long-run average and only unsure of the path, which is the assumption this model made
 * implicitly before the field existed.
 */
const DEFAULT_RISK_PROFILES = {
  'High Risk': { label: 'Highest: 80–100% Equities', real: 4.44, nominal: 7.05, volatility: 15.5, sigmaParam: 0 },
  'Medium/High Risk': { label: 'High: 60–80% Equities', real: 3.72, nominal: 6.31, volatility: 11.5, sigmaParam: 0 },
  'Medium Risk': { label: 'Medium: 40–60% Equities', real: 3.00, nominal: 5.58, volatility: 8.0, sigmaParam: 0 },
  'Medium/Low Risk': { label: 'Medium/Low: 20–40% Equities', real: 2.28, nominal: 4.84, volatility: 5.5, sigmaParam: 0 },
  'Low Risk': { label: 'Low: High interest Cash Savings, Fixed Income, Bonds', real: 1.56, nominal: 4.10, volatility: 3.0, sigmaParam: 0 },
  'Cash Equivalents': { label: 'Instant cash savings/money market', real: -0.50, nominal: 1.99, volatility: 0.5, sigmaParam: 0 }
};

/*
 * Published capital market assumptions, offered as an alternative to the built-in defaults.
 *
 * Stored in NOMINAL terms because that is how they are published, and deflated to real at the plan's
 * own inflation setting when applied. The engine is real throughout and deflates nothing by itself, so
 * putting a nominal figure straight into `real` would overstate every projection by inflation
 * compounded over the horizon — the deflation is the whole reason this is a table of source figures
 * rather than a table of tier values.
 *
 * Figures are a two-asset blend at each tier's equity weight, using the provider's own correlation, at
 * the 30-year horizon. `sigmaParam` is fitted from the provider's published percentile band, in log
 * space to match how the engine consumes it; see scratchpad/cma-import.py, which regenerates this table
 * from the source workbook. Each set carries the date it was published and the date it expires, because
 * a stale assumption that looks current is worse than an obviously old one.
 */
const CMA_PRESETS = {
  blackrock2026: {
    name: 'BlackRock CMA',
    detail: 'GBP · data as of 30 June 2026',
    published: 'August 2026',
    expires: 'August 2027',
    note: 'Global ex-UK equities blended with UK gilts at each tier\u2019s equity weight, 30-year horizon.',
    nominal: {
      'High Risk': { nominal: 7.41, volatility: 17.10, sigmaParam: 2.14 },
      'Medium/High Risk': { nominal: 6.85, volatility: 13.42, sigmaParam: 1.69 },
      'Medium Risk': { nominal: 6.28, volatility: 9.93, sigmaParam: 1.31 },
      'Medium/Low Risk': { nominal: 5.72, volatility: 6.89, sigmaParam: 1.03 },
      'Low Risk': { nominal: 5.16, volatility: 5.19, sigmaParam: 0.97 },
      'Cash Equivalents': { nominal: 3.54, volatility: 0.00, sigmaParam: 1.57 }
    }
  }
};

// Fisher, by division. The built-in defaults already satisfy this at 2.5% to the stored two decimals.
function realFromNominal(nominal, inflationPct) {
  return ((1 + num(nominal, 0) / 100) / (1 + num(inflationPct, 0) / 100) - 1) * 100;
}

/*
 * A preset resolved into the app's tier shape at a given inflation rate. Labels stay with the built-in
 * tiers so a preset cannot rename them out from under a saved plan, and any tier the preset does not
 * mention keeps its built-in figures rather than silently becoming zero.
 */
function applyCmaPreset(presetKey, inflationPct) {
  const preset = CMA_PRESETS[presetKey];
  if (!preset) return null;
  const out = {};
  Object.keys(DEFAULT_RISK_PROFILES).forEach(k => {
    const src = preset.nominal[k];
    out[k] = src
      ? { label: DEFAULT_RISK_PROFILES[k].label, nominal: src.nominal, real: Math.round(realFromNominal(src.nominal, inflationPct) * 100) / 100, volatility: src.volatility, sigmaParam: src.sigmaParam }
      : { ...DEFAULT_RISK_PROFILES[k] };
  });
  return out;
}

// 90th percentile of the standard normal. The 10th is its negative.
const Z90 = 1.2815515655446004;

/*
 * The constant annual real rate whose compounded result over `years` lands on the 90th (lucky) and 10th
 * (unlucky) percentile of wealth at the end of that horizon.
 *
 * Monte Carlo draws each year's return as exp(ln(1+real) + sp·z_path + σ·z_year) − 1, where z_path is
 * fixed for a whole path and z_year is redrawn annually. Over T years the annualised log return is
 * therefore normal with standard deviation √(sp² + σ²/T), and this band is that spread at the 90th and
 * 10th percentile. The two terms age differently and that is the point: the σ²/T half diversifies away
 * as the horizon lengthens, the sp² half does not, because no amount of time tells you the long-run
 * average you assumed was right. With sp = 0 this reduces to σ/√T, the PRIIPs convention for favourable
 * and unfavourable scenarios, which is what the model used before it could carry the first term.
 *
 * No single simulated path follows one of these lines. Each is a percentile of the outcome at the end,
 * which is a different claim from "the 90th percentile happened every year" — that would be 0.1^T.
 */
function luckyBand(real, vol, years, sigmaParam = 0) {
  const T = Math.max(1, num(years, 1));
  const m = Math.log(1 + clamp(real, -0.99, 50));
  const sp = Math.max(0, num(sigmaParam, 0));
  const spread = Z90 * Math.sqrt(sp * sp + (vol * vol) / T);
  return { lucky: Math.exp(m + spread) - 1, unlucky: Math.exp(m - spread) - 1 };
}

// ---------------------------------------------------------------- plan shape & defaults
const OWNERS = ['self', 'part'];
const OWNER_LABEL = { self: 'Myself', part: 'Partner' };
const CATEGORIES = ['pen', 'isa', 'other', 'cash'];
const CATEGORY_LABEL = { pen: 'Pensions', isa: 'S&S ISAs', other: 'Other Investments (e.g. GIA)', cash: 'Cash Savings' };
const accountId = (cat, owner) => `${cat}_${owner}`;

// Income stream types. `taxable` drives income tax; `relevantEarnings` drives the pension annual-allowance
// earnings test — under UK rules only employment/self-employment income supports pension contributions,
// so DB pensions, annuities, rent, dividends and interest are taxed but do not raise the pension limit.
const INCOME_TYPES = {
  earnings: { label: 'Earnings (employment / self-employment)', taxable: true, relevantEarnings: true },
  otherTaxable: { label: 'Other taxable income (e.g. DB pensions, annuities)', taxable: true, relevantEarnings: false },
  taxFree: { label: 'Tax-free income', taxable: false, relevantEarnings: false }
};
const incomeTypeOf = (key) => INCOME_TYPES[key] || INCOME_TYPES.otherTaxable;

/*
 * Where income tax bands are set. Wales has the power to vary its rates under the Welsh Rates of Income
 * Tax but has set them equal to rUK every year since devolution, so it is an alias rather than a second
 * table — choosing it confirms the answer rather than changing it, and the Config note says so.
 */
const TAX_REGION_LABELS = {
  ruk: 'England & Northern Ireland',
  wales: 'Wales',
  scotland: 'Scotland'
};

const DEFAULT_CONFIG = {
  valuationDate: '',                 // '' => today (resolved at run time)
  inflation: 2.5,
  // Income tax (rUK 2025/26; thresholds frozen to 2028)
  personalAllowance: 12570,
  paTaperThreshold: 100000,
  paTaperRate: 50,                   // % of income over threshold that removes allowance (£1 per £2 = 50%)
  basicBandLimit: 50270,             // income level at which higher rate starts (with full allowance)
  basicTaxRate: 20,
  higherBandLimit: 125140,           // income level at which additional rate starts
  higherTaxRate: 40,
  additionalTaxRate: 45,
  // Where you are tax resident. Income tax bands are devolved; National Insurance, capital gains tax,
  // the personal allowance and its taper are not, and do not follow this setting.
  taxRegion: 'ruk',                  // 'ruk' | 'scotland' | 'wales'
  // Scottish bands (2025/26). Six of them, and a higher rate that starts £6,608 earlier than rUK.
  // Each limit is the income at which the *next* band starts, matching basicBandLimit's convention.
  scotStarterRate: 19,
  scotStarterLimit: 15397,
  scotBasicRate: 20,
  scotBasicLimit: 27491,
  scotIntermediateRate: 21,
  scotIntermediateLimit: 43662,
  scotHigherRate: 42,
  scotHigherLimit: 75000,
  scotAdvancedRate: 45,
  scotAdvancedLimit: 125140,
  scotTopRate: 48,
  // Employee National Insurance (Class 1, 2025/26)
  nicPrimaryThreshold: 12570,
  nicUpperEarningsLimit: 50270,
  nicMainRate: 8,
  nicUpperRate: 2,
  // Self-employed National Insurance (Class 4). The lower and upper profits limits currently coincide with
  // the Class 1 primary threshold and upper earnings limit, so those fields are shared; only the rates differ.
  // Class 2 is not modelled: it stopped being a mandatory charge above the Small Profits Threshold in 2024.
  class4MainRate: 6,
  class4UpperRate: 2,
  // Salary sacrifice: employer NIC saving (15% from April 2025) and how much of it is passed into the pension
  employerNicRate: 15,
  employerNicPassThrough: 0,         // % of employer NIC saving added to the pension
  // Pension tax-free cash
  pclsProportion: 25,
  pclsMaxCap: 268275,                // Lump Sum Allowance
  // Annual wrapper allowances (per person)
  isaAnnualAllowance: 20000,
  pensionAnnualAllowance: 60000,
  pensionNoEarningsLimit: 3600,      // gross pension contribution allowed with no relevant UK earnings
  mpaaLimit: 10000,                  // money purchase annual allowance once a pension is flexibly accessed
  // Tapered annual allowance for high earners. HMRC tapers on *adjusted* income (net income plus employer
  // contributions); the model only knows earnings, so earnings stand in for it — see the documentation tab.
  pensionTaperThreshold: 260000,     // adjusted income above which the annual allowance starts to taper
  pensionTaperRate: 50,              // % of income above the threshold removed from the allowance (£1 per £2)
  pensionTaperFloor: 10000,          // the allowance cannot taper below this
  // Capital gains tax on the GIA (realisation-based; gains are wiped on death so nothing is charged at the terminal age)
  cgtEnabled: true,
  cgtAnnualExempt: 3000,
  cgtBasicRate: 18,
  cgtHigherRate: 24,
  // Behavioural / modelling assumptions
  cashBufferMonths: 6,               // months of spending kept in cash before surplus income is swept to ISA
  harvestPersonalAllowance: true,    // in retirement draw pension to fill unused 0% allowance and move it to ISA
  pensionDeathTaxRate: 0,            // % haircut applied to any pension left at the terminal age when reporting "net" pots (IHT / beneficiary income tax)
  bridgeSafetyMargin: 30,            // % uplift on the pre-access "bridge" reserve the tournament targets
  solvencyFloor: 0                   // minimum pot at terminal age (bequest floor)
};

const defaultAccounts = () => [
  { id: 'pen_self', owner: 'Myself', category: 'Pensions', balance: '', contrib: '', growth: '', risk: 'High Risk' },
  { id: 'isa_self', owner: 'Myself', category: 'S&S ISAs', balance: '', contrib: '', growth: '', risk: 'High Risk' },
  { id: 'other_self', owner: 'Myself', category: 'Other Investments (e.g. GIA)', balance: '', contrib: '', growth: '', risk: 'Low Risk', unrealisedGain: '' },
  { id: 'cash_self', owner: 'Myself', category: 'Cash Savings', balance: '', contrib: '', growth: '', risk: 'Low Risk' },
  { id: 'pen_part', owner: 'Partner', category: 'Pensions', balance: '', contrib: '', growth: '', risk: 'High Risk' },
  { id: 'isa_part', owner: 'Partner', category: 'S&S ISAs', balance: '', contrib: '', growth: '', risk: 'High Risk' },
  { id: 'other_part', owner: 'Partner', category: 'Other Investments (e.g. GIA)', balance: '', contrib: '', growth: '', risk: 'Low Risk', unrealisedGain: '' },
  { id: 'cash_part', owner: 'Partner', category: 'Cash Savings', balance: '', contrib: '', growth: '', risk: 'Low Risk' }
];

const BLANK_PLAN = Object.freeze({
  activeProfileView: 'Combined',
  demographics: {
    planningMode: 'couple',
    currentAgeSelf: '', currentAgePart: '',
    retireAgeSelf: '', retireAgePart: '',
    salarySelf: '', salaryPart: '',
    // real salary growth, i.e. on top of inflation. Blank or 0 means pay keeps pace with inflation, which
    // is flat in today's money because the whole projection runs in real terms.
    salaryGrowthSelf: '', salaryGrowthPart: '',
    // 'employed' (Class 1 NIC, salary sacrifice relief) or 'self-employed' (Class 4 NIC, income tax relief only)
    employmentSelf: 'employed', employmentPart: 'employed',
    cgtGainsUsedSelf: '', cgtGainsUsedPart: '',
    cfBroughtForwardSelf: '', cfBroughtForwardPart: '',
    // derived by resolveMpaa from the projection, not user-editable
    mpaaAgeSelf: '', mpaaAgePart: '',
    statePensionAge: 68, privatePensionAge: 58,
    statePensionSelf: '', statePensionPart: '',
    terminalAge: 100
  },
  spending: {
    targetSpend: '',
    // spendBands: [{ id, fromAge, toAge, amount }] in "Myself" ages. Any year not covered by a band falls
    // back to targetSpend, so an empty list means a flat spend for the whole retirement.
    spendBands: [],
    drawdownStrategy: 'Phased Drawdown',
    decumulationPolicy: 'Bracket Fill Basic'
  },
  accounts: defaultAccounts(),
  riskProfiles: DEFAULT_RISK_PROFILES,
  riskSource: '',
  otherIncomes: [],
  oneOffContributions: [],
  oneOffCosts: [],
  config: { ...DEFAULT_CONFIG }
});

const DECUMULATION_POLICIES = {
  'Bracket Fill Basic': {
    label: 'Tax Smoothing (fill 0% allowance, then pension to the basic-rate limit, preserve ISAs)',
    steps: ['penPA', 'penBasic', 'cash', 'other', 'isa', 'penAny'], harvest: true
  },
  'Bracket Fill': {
    label: 'UK FIRE Bracket Fill (fill 0% allowance only, then cash/GIA/ISA, pension last)',
    steps: ['penPA', 'cash', 'other', 'isa', 'penBasic', 'penAny'], harvest: true
  },
  'Sequential': {
    label: 'Sequential (Cash → GIA → ISA → Pension, no bracket management)',
    steps: ['cash', 'other', 'isa', 'penAny'], harvest: false
  }
};

const todayISO = () => new Date().toISOString().slice(0, 10);

// Fraction of the calendar year remaining after the valuation date (0.01..1).
const calculateYearFraction = (dateStr) => {
  const d = dateStr ? new Date(dateStr) : new Date();
  if (isNaN(d.getTime())) return calculateYearFraction('');
  const year = d.getFullYear();
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  return clamp((end - d.getTime()) / (end - start), 0.01, 1.0);
};

// Deep-normalise anything (old localStorage plans, imported JSON, undefined) into a valid plan object.
/*
 * Spending bands, and the migration from the two lifestyle tapers they replaced.
 *
 * Tapers could only ever step spending down by a percentage at two fixed ages. Bands say what a stretch of
 * years actually costs, so a plan can rise as well as fall: a heavy early retirement, a quieter stretch,
 * then care costs. A saved plan carrying tapers is converted to the identical set of bands here rather
 * than being silently dropped, because the two tapers compounded and reproducing that by hand is a trap.
 */
function normaliseSpendBands(s, d) {
  const clean = (arr) => arr.filter(isPlainObject).map(x => ({
    id: String(x.id || 'sb_' + Math.random().toString(36).slice(2)),
    fromAge: x.fromAge ?? '',
    toAge: x.toAge ?? '',
    amount: x.amount ?? ''
  }));
  if (Array.isArray(s.spendBands)) return clean(s.spendBands);

  // legacy: rebuild the exact schedule the two tapers produced
  const base = num(s.targetSpend, 0);
  const t1Age = num(s.taper1Age, 0), t1Rate = clamp(num(s.taper1Rate, 0), 0, 100) / 100;
  const t2Age = num(s.taper2Age, 0), t2Rate = clamp(num(s.taper2Rate, 0), 0, 100) / 100;
  const hasT1 = t1Age > 0 && t1Rate > 0;
  const hasT2 = t2Age > 0 && t2Rate > 0;
  if (!base || (!hasT1 && !hasT2)) return [];
  const terminal = num(d.terminalAge, 100);
  const bands = [];
  // taper 2 compounds on the post-taper-1 figure, which is what makes this worth migrating rather than
  // leaving to the user to redo
  const afterT1 = hasT1 ? base * (1 - t1Rate) : base;
  const afterT2 = hasT2 ? afterT1 * (1 - t2Rate) : afterT1;
  if (hasT1 && hasT2 && t2Age > t1Age) {
    bands.push({ fromAge: t1Age, toAge: t2Age - 1, amount: Math.round(afterT1) });
    bands.push({ fromAge: t2Age, toAge: terminal, amount: Math.round(afterT2) });
  } else if (hasT1 && hasT2) {
    // both set to the same age, or taper 2 earlier: they collapse to one step at the earlier age
    bands.push({ fromAge: Math.min(t1Age, t2Age), toAge: terminal, amount: Math.round(afterT2) });
  } else if (hasT1) {
    bands.push({ fromAge: t1Age, toAge: terminal, amount: Math.round(afterT1) });
  } else {
    bands.push({ fromAge: t2Age, toAge: terminal, amount: Math.round(base * (1 - t2Rate)) });
  }
  return bands.map((b, i) => ({ id: 'sb_migrated_' + i, ...b }));
}

function normalizePlan(raw) {
  const src = isPlainObject(raw) ? raw : {};
  const d = isPlainObject(src.demographics) ? src.demographics : {};
  const s = isPlainObject(src.spending) ? src.spending : {};
  const c = isPlainObject(src.config) ? src.config : {};
  const plan = {
    activeProfileView: ['Combined', 'Myself', 'Partner'].includes(src.activeProfileView) ? src.activeProfileView : 'Combined',
    demographics: { ...BLANK_PLAN.demographics, ...d },
    spending: { ...BLANK_PLAN.spending, ...s, spendBands: normaliseSpendBands(s, d) },
    accounts: [],
    riskProfiles: {},
    // which published set the matrix came from, '' once any field has been edited by hand
    riskSource: CMA_PRESETS[src.riskSource] ? src.riskSource : '',
    // legacy plans carried taxTreatment: 'Taxable' | 'Tax-free'; 'Taxable' migrates to otherTaxable so an
    // upgrade can never silently raise someone's pension headroom.
    otherIncomes: Array.isArray(src.otherIncomes) ? src.otherIncomes.filter(isPlainObject).map(i => ({ id: String(i.id || 'inc_' + Math.random().toString(36).slice(2)), name: i.name ?? '', owner: i.owner === 'Partner' ? 'Partner' : 'Myself', startAge: i.startAge ?? '', endAge: i.endAge ?? '', amount: i.amount ?? '', incomeType: INCOME_TYPES[i.incomeType] ? i.incomeType : (i.taxTreatment === 'Tax-free' ? 'taxFree' : 'otherTaxable'), notes: i.notes ?? '' })) : [],
    oneOffContributions: Array.isArray(src.oneOffContributions) ? src.oneOffContributions.filter(isPlainObject).map(x => {
      const category = Object.values(CATEGORY_LABEL).includes(x.category) ? x.category : 'Pensions';
      return {
        id: String(x.id || 'c_' + Math.random().toString(36).slice(2)),
        date: x.date || (x.year ? `${x.year}-01-01` : ''),
        year: num(x.year, x.date ? parseInt(String(x.date).slice(0, 4)) : ''),
        owner: x.owner === 'Partner' ? 'Partner' : 'Myself',
        category,
        amount: x.amount ?? '',
        desc: x.desc ?? '',
        transferredFrom: ['External', ...Object.values(CATEGORY_LABEL)].includes(x.transferredFrom) ? x.transferredFrom : 'External',
        stagedTargetWrapper: Object.values(CATEGORY_LABEL).includes(x.stagedTargetWrapper) ? x.stagedTargetWrapper : category
      };
    }) : [],
    oneOffCosts: Array.isArray(src.oneOffCosts) ? src.oneOffCosts.filter(isPlainObject).map(x => ({ id: String(x.id || 'cost_' + Math.random().toString(36).slice(2)), date: x.date || (x.year ? `${x.year}-01-01` : ''), year: num(x.year, x.date ? parseInt(String(x.date).slice(0, 4)) : ''), owner: x.owner === 'Partner' ? 'Partner' : 'Myself', amount: x.amount ?? '', desc: x.desc ?? '' })) : [],
    config: { ...DEFAULT_CONFIG, ...c }
  };
  // React inputs need strings/numbers, never null/undefined/objects. `keep` names the fields that are
  // legitimately structured (spendBands is a list, not an input) and must survive the scrub.
  const scrub = (obj, keep = []) => {
    Object.keys(obj).forEach(k => {
      if (keep.includes(k)) return;
      const v = obj[k];
      if (v === null || v === undefined || typeof v === 'object') obj[k] = '';
    });
  };
  scrub(plan.demographics); scrub(plan.spending, ['spendBands']); scrub(plan.config);
  if (typeof plan.config.harvestPersonalAllowance !== 'boolean') plan.config.harvestPersonalAllowance = plan.config.harvestPersonalAllowance === '' ? true : !!plan.config.harvestPersonalAllowance;
  if (!plan.config.valuationDate || isNaN(new Date(plan.config.valuationDate).getTime())) plan.config.valuationDate = todayISO();
  if (plan.demographics.planningMode !== 'single') plan.demographics.planningMode = 'couple';
  if (!DECUMULATION_POLICIES[plan.spending.decumulationPolicy]) plan.spending.decumulationPolicy = 'Bracket Fill Basic';
  if (!TAX_REGION_LABELS[plan.config.taxRegion]) plan.config.taxRegion = DEFAULT_CONFIG.taxRegion;
  if (!['Phased Drawdown', 'Full 25% Lump Sum'].includes(plan.spending.drawdownStrategy)) plan.spending.drawdownStrategy = 'Phased Drawdown';
  // accounts: always the eight canonical wrappers, in canonical order, keeping any user values
  const rawAccounts = Array.isArray(src.accounts) ? src.accounts.filter(isPlainObject) : [];
  plan.accounts = defaultAccounts().map(def => {
    const found = rawAccounts.find(a => a.id === def.id);
    if (!found) return def;
    const merged = { ...def, ...found, id: def.id, owner: def.owner, category: def.category };
    ['balance', 'contrib', 'growth', 'unrealisedGain'].forEach(k => { const v = merged[k]; if (v === null || v === undefined || typeof v === 'object' || typeof v === 'boolean') merged[k] = ''; });
    if (!def.id.startsWith('other_')) delete merged.unrealisedGain; // only the GIA carries a cost basis
    if (typeof merged.risk !== 'string') merged.risk = def.risk;
    if (Array.isArray(found.contribByYear)) merged.contribByYear = found.contribByYear.map(v => num(v, 0));
    else delete merged.contribByYear;
    return merged;
  });
  // risk profiles: keep the six canonical tiers (custom values preserved), ignore unknown keys
  const rp = isPlainObject(src.riskProfiles) ? src.riskProfiles : {};
  Object.keys(DEFAULT_RISK_PROFILES).forEach(k => {
    plan.riskProfiles[k] = { ...DEFAULT_RISK_PROFILES[k], ...(isPlainObject(rp[k]) ? rp[k] : {}) };
  });
  plan.accounts.forEach(a => { if (!plan.riskProfiles[a.risk]) a.risk = 'High Risk'; });
  return plan;
}

// ---------------------------------------------------------------- tax & NIC (config driven)
function taxParams(cfgIn) {
  if (cfgIn && cfgIn.__isParams) return cfgIn;
  const cfg = isPlainObject(cfgIn) ? cfgIn : DEFAULT_CONFIG;
  const pa = Math.max(0, num(cfg.personalAllowance, DEFAULT_CONFIG.personalAllowance));
  const thr = Math.max(0, num(cfg.paTaperThreshold, DEFAULT_CONFIG.paTaperThreshold));
  const taperRate = clamp(num(cfg.paTaperRate, DEFAULT_CONFIG.paTaperRate), 0, 100) / 100;
  const basicLimit = Math.max(pa, num(cfg.basicBandLimit, DEFAULT_CONFIG.basicBandLimit));
  const higherLimit = Math.max(basicLimit, num(cfg.higherBandLimit, DEFAULT_CONFIG.higherBandLimit));
  const basicRate = clamp(num(cfg.basicTaxRate, DEFAULT_CONFIG.basicTaxRate), 0, 99) / 100;
  const higherRate = clamp(num(cfg.higherTaxRate, DEFAULT_CONFIG.higherTaxRate), 0, 99) / 100;
  const addRate = clamp(num(cfg.additionalTaxRate, DEFAULT_CONFIG.additionalTaxRate), 0, 99) / 100;
  const nicPT = Math.max(0, num(cfg.nicPrimaryThreshold, DEFAULT_CONFIG.nicPrimaryThreshold));
  const nicUEL = Math.max(nicPT, num(cfg.nicUpperEarningsLimit, DEFAULT_CONFIG.nicUpperEarningsLimit));
  const nicMain = clamp(num(cfg.nicMainRate, DEFAULT_CONFIG.nicMainRate), 0, 99) / 100;
  const nicUpper = clamp(num(cfg.nicUpperRate, DEFAULT_CONFIG.nicUpperRate), 0, 99) / 100;
  const c4Main = clamp(num(cfg.class4MainRate, DEFAULT_CONFIG.class4MainRate), 0, 99) / 100;
  const c4Upper = clamp(num(cfg.class4UpperRate, DEFAULT_CONFIG.class4UpperRate), 0, 99) / 100;
  const erNic = clamp(num(cfg.employerNicRate, DEFAULT_CONFIG.employerNicRate), 0, 99) / 100;
  const erPass = clamp(num(cfg.employerNicPassThrough, DEFAULT_CONFIG.employerNicPassThrough), 0, 100) / 100;
  const pclsProp = clamp(num(cfg.pclsProportion, DEFAULT_CONFIG.pclsProportion), 0, 100) / 100;
  const lsa = Math.max(0, num(cfg.pclsMaxCap, DEFAULT_CONFIG.pclsMaxCap));
  const isaAllowance = Math.max(0, num(cfg.isaAnnualAllowance, DEFAULT_CONFIG.isaAnnualAllowance));
  const pensionAllowance = Math.max(0, num(cfg.pensionAnnualAllowance, DEFAULT_CONFIG.pensionAnnualAllowance));
  const pensionNoEarningsLimit = clamp(num(cfg.pensionNoEarningsLimit, DEFAULT_CONFIG.pensionNoEarningsLimit), 0, pensionAllowance);
  const mpaaLimit = clamp(num(cfg.mpaaLimit, DEFAULT_CONFIG.mpaaLimit), 0, pensionAllowance);
  const aaTaperThr = Math.max(0, num(cfg.pensionTaperThreshold, DEFAULT_CONFIG.pensionTaperThreshold));
  const aaTaperRate = clamp(num(cfg.pensionTaperRate, DEFAULT_CONFIG.pensionTaperRate), 0, 100) / 100;
  const aaTaperFloor = clamp(num(cfg.pensionTaperFloor, DEFAULT_CONFIG.pensionTaperFloor), 0, pensionAllowance);
  // annual allowance at a given adjusted income (earnings stand in for adjusted income in this model)
  const aaAt = (income) => (aaTaperRate > 0 && income > aaTaperThr)
    ? Math.max(aaTaperFloor, pensionAllowance - (income - aaTaperThr) * aaTaperRate)
    : pensionAllowance;
  const cgtEnabled = cfg.cgtEnabled === undefined ? DEFAULT_CONFIG.cgtEnabled : !!cfg.cgtEnabled;
  const cgtAnnualExempt = Math.max(0, num(cfg.cgtAnnualExempt, DEFAULT_CONFIG.cgtAnnualExempt));
  const cgtBasicRate = clamp(num(cfg.cgtBasicRate, DEFAULT_CONFIG.cgtBasicRate), 0, 99) / 100;
  const cgtHigherRate = clamp(num(cfg.cgtHigherRate, DEFAULT_CONFIG.cgtHigherRate), 0, 99) / 100;
  // allowance remaining at a given income
  const paAt = (income) => taperRate > 0 && income > thr ? Math.max(0, pa - (income - thr) * taperRate) : pa;
  const basicWidth = Math.max(0, basicLimit - pa);                 // basic band measured in taxable income
  const higherTop = Math.max(basicWidth, higherLimit - paAt(higherLimit)); // higher band upper limit in taxable income
  const taperEnd = taperRate > 0 ? thr + pa / taperRate : Infinity;

  /*
   * The band ladder. Income tax bands are devolved, so which set applies depends on where you live —
   * but only the bands are: National Insurance, capital gains tax, the personal allowance and its taper
   * are reserved and are read from their own fields above, untouched by the region.
   *
   * Wales sets its own rates under the Welsh Rates of Income Tax but has matched rUK every year since
   * the power was devolved, so it is an alias rather than a separate table. If that ever changes it
   * becomes a table here and nothing else moves.
   *
   * `grossLimits` are incomes at which the next band starts, the convention basicBandLimit already used.
   * `ladder` converts them to taxable income — income less whatever allowance survives the taper at that
   * income — because that is the space incomeTax slices in. The running max keeps it non-decreasing even
   * if someone types a lower threshold above a higher one in Config.
   */
  const region = ['ruk', 'scotland', 'wales'].includes(cfg.taxRegion) ? cfg.taxRegion : DEFAULT_CONFIG.taxRegion;
  const rate = (key) => clamp(num(cfg[key], DEFAULT_CONFIG[key]), 0, 99) / 100;
  const limit = (key) => Math.max(0, num(cfg[key], DEFAULT_CONFIG[key]));
  const bandSpec = region === 'scotland'
    ? [[limit('scotStarterLimit'), rate('scotStarterRate')], [limit('scotBasicLimit'), rate('scotBasicRate')],
      [limit('scotIntermediateLimit'), rate('scotIntermediateRate')], [limit('scotHigherLimit'), rate('scotHigherRate')],
      [limit('scotAdvancedLimit'), rate('scotAdvancedRate')], [Infinity, rate('scotTopRate')]]
    : [[basicLimit, basicRate], [higherLimit, higherRate], [Infinity, addRate]];
  const grossLimits = bandSpec.map(([l]) => l).filter(l => Number.isFinite(l));
  let running = 0;
  const ladder = bandSpec.map(([l, r]) => {
    const top = Number.isFinite(l) ? Math.max(running, l - paAt(l)) : Infinity;
    if (Number.isFinite(top)) running = top;
    return { top, rate: r };
  });
  // The income at which the first materially higher rate begins: where "fill the basic-rate band" should
  // stop. rUK's basic band ends where the higher rate starts, but Scotland's does not — three bands sit
  // below its 42% rate — so this is derived rather than read off a band name.
  const higherRateStartsAt = region === 'scotland' ? limit('scotIntermediateLimit') : basicLimit;
  // Capital gains tax charges the basic rate up to the *UK* basic-rate band even for a Scottish taxpayer,
  // so this is deliberately computed from the rUK figures and does not follow the region.
  const cgtBandWidth = Math.max(0, Math.max(pa, num(DEFAULT_CONFIG.basicBandLimit)) - pa);
  // Relief at source is given at the statutory 20% to everyone, including a Scottish starter-rate payer.
  const reliefAtSource = clamp(num(DEFAULT_CONFIG.basicTaxRate), 0, 99) / 100;

  return { __isParams: true, pa, thr, taperRate, basicLimit, higherLimit, basicRate, higherRate, addRate, nicPT, nicUEL, nicMain, nicUpper, c4Main, c4Upper, erNic, erPass, pclsProp, lsa, isaAllowance, pensionAllowance, pensionNoEarningsLimit, mpaaLimit, aaTaperThr, aaTaperRate, aaTaperFloor, aaAt, cgtEnabled, cgtAnnualExempt, cgtBasicRate, cgtHigherRate, paAt, basicWidth, higherTop, taperEnd, region, ladder, grossLimits, higherRateStartsAt, cgtBandWidth, reliefAtSource };
}

// The marginal rate on the next pound of income, used where a decision depends on which band someone is in.
function marginalRateAt(income, cfg) {
  const p = taxParams(cfg);
  const g = Math.max(0, num(income, 0));
  const taxable = Math.max(0, g - p.paAt(g));
  if (taxable <= 0) return 0;
  for (const b of p.ladder) if (taxable <= b.top) return b.rate;
  return p.ladder[p.ladder.length - 1].rate;
}

function incomeTax(gross, cfg) {
  const p = taxParams(cfg);
  const g = Math.max(0, num(gross, 0));
  if (g <= 0) return 0;
  const taxable = Math.max(0, g - p.paAt(g));
  // Walks whichever ladder the region gave us: three bands for rUK and Wales, six for Scotland.
  let tax = 0, prev = 0;
  for (const b of p.ladder) {
    if (taxable <= prev) break;
    tax += (Math.min(taxable, b.top) - prev) * b.rate;
    prev = b.top;
  }
  return tax;
}
function calculateUKNetIncome(gross, cfg) { const g = Math.max(0, num(gross, 0)); return g - incomeTax(g, cfg); }
/*
 * National Insurance on earned income. Employees pay Class 1; the self-employed pay Class 4, which shares
 * the same two thresholds but charges a lower main rate. Pass `selfEmployed` to price trading profit.
 */
function nicFor(gross, cfg, selfEmployed = false) {
  const p = taxParams(cfg);
  const g = Math.max(0, num(gross, 0));
  const main = selfEmployed ? p.c4Main : p.nicMain;
  const upper = selfEmployed ? p.c4Upper : p.nicUpper;
  let nic = 0;
  if (g > p.nicPT) nic += (Math.min(g, p.nicUEL) - p.nicPT) * main;
  if (g > p.nicUEL) nic += (g - p.nicUEL) * upper;
  return nic;
}
function calculateUKTaxAndNIC(income, cfg, selfEmployed = false) { return incomeTax(income, cfg) + nicFor(income, cfg, selfEmployed); }

/*
 * Income-tax breakpoints (gross income) where the marginal rate changes; used by the analytic solver in
 * grossPensionNeededForNet, which relies on its objective being linear *between* consecutive breakpoints.
 * Missing one does not raise an error, it silently bends a line the solver assumes is straight — so every
 * band the ladder has must contribute its own point, which is why this is generated rather than listed.
 * The ladder is derived from these same gross limits, so each limit is exactly where its band ends.
 */
function taxBreakpoints(p) {
  const pts = [p.pa, ...p.grossLimits, p.thr, p.taperEnd];
  return pts.filter(x => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
}

/*
 * Pension contribution economics, for both ways of getting relief.
 *
 * Employed (salary sacrifice): `sacrifice` is the gross salary given up, so relief comes at the marginal
 * rate of income tax AND employee NIC, and the pension receives the sacrifice plus any employer NIC saving
 * passed through.
 *
 * Self-employed (relief at source): a personal contribution cannot be sacrificed out of trading profit, so
 * Class 4 NIC is charged on the profit either way and the only relief is income tax — at the marginal rate,
 * plus any personal allowance restored, which is what differencing the income tax charge captures. There is
 * no employer, so the pass-through factor is forced to 1 whatever the config says.
 */
function passThroughFactor(p, selfEmployed = false) { return selfEmployed ? 1 : 1 + p.erNic * p.erPass; }

function calculateMarginalRelief(salaryInput, sacrificeInput, cfg, selfEmployed = false) {
  const p = taxParams(cfg);
  const sacrifice = Math.max(0, num(sacrificeInput, 0));
  const passFactor = passThroughFactor(p, selfEmployed);
  // used when earnings are unknown: income tax only for the self-employed, tax + NIC for an employee
  const assumedRate = selfEmployed ? p.higherRate : p.higherRate + p.nicUpper;
  if (sacrifice <= 0) return { netCost: 0, taxSaved: 0, reliefRate: assumedRate * 100, pensionCredit: 0, sacrifice: 0 };
  const salary = num(salaryInput, 0);
  if (salary <= 0) {
    const taxSaved = sacrifice * assumedRate;
    return { netCost: sacrifice - taxSaved, taxSaved, reliefRate: assumedRate * 100, pensionCredit: sacrifice * passFactor, sacrifice, assumed: true };
  }
  const g = Math.min(sacrifice, salary);
  const taxSaved = selfEmployed
    ? incomeTax(salary, p) - incomeTax(salary - g, p)
    : calculateUKTaxAndNIC(salary, p) - calculateUKTaxAndNIC(salary - g, p);
  return { netCost: g - taxSaved, taxSaved, reliefRate: g > 0 ? (taxSaved / g) * 100 : 0, pensionCredit: g * passFactor, sacrifice: g, capped: g < sacrifice };
}
// Net take-home cost of a pension contribution (the amount landing in the pension, incl. employer pass-through).
function netCostOfPensionContrib(contrib, salaryInput, cfg, selfEmployed = false) {
  const p = taxParams(cfg);
  const passFactor = passThroughFactor(p, selfEmployed);
  return calculateMarginalRelief(salaryInput, Math.max(0, num(contrib, 0)) / passFactor, cfg, selfEmployed).netCost;
}
// Pension credit obtainable for a given net take-home cost (inverse of the above), capped at maxCredit.
function grossUpNet(netAmount, salaryInput, cfg, maxCredit = Infinity, selfEmployed = false) {
  const net = Math.max(0, num(netAmount, 0));
  if (net <= 0) return 0;
  const p = taxParams(cfg);
  const passFactor = passThroughFactor(p, selfEmployed);
  const salary = num(salaryInput, 0);
  let credit;
  if (salary <= 0) {
    credit = (net / Math.max(0.01, 1 - (selfEmployed ? p.higherRate : p.higherRate + p.nicUpper))) * passFactor;
  } else {
    // netCost(sacrifice) is increasing; bisection on sacrifice in [0, salary]
    let lo = 0, hi = salary;
    if (calculateMarginalRelief(salary, hi, p, selfEmployed).netCost <= net) credit = hi * passFactor;
    else {
      for (let i = 0; i < 48; i++) {
        const mid = (lo + hi) / 2;
        if (calculateMarginalRelief(salary, mid, p, selfEmployed).netCost < net) lo = mid; else hi = mid;
      }
      credit = ((lo + hi) / 2) * passFactor;
    }
  }
  return Math.min(credit, Math.max(0, maxCredit));
}
// Additional pension credit purchasable for `netAmount` on top of an existing `baseCredit` (marginal pricing).
function grossUpNetIncremental(netAmount, salaryInput, cfg, baseCredit = 0, maxAdditional = Infinity, selfEmployed = false) {
  const net = Math.max(0, num(netAmount, 0));
  if (net <= 0 || !(maxAdditional > 0)) return 0;
  const base = Math.max(0, num(baseCredit, 0));
  if (base <= 0) return grossUpNet(net, salaryInput, cfg, maxAdditional, selfEmployed);
  const p = taxParams(cfg);
  const passFactor = passThroughFactor(p, selfEmployed);
  const salary = num(salaryInput, 0);
  const costBase = netCostOfPensionContrib(base, salaryInput, p, selfEmployed);
  const maxTotal = salary > 0 ? Math.min(base + maxAdditional, salary * passFactor) : base + maxAdditional;
  if (maxTotal <= base) return 0;
  if (netCostOfPensionContrib(maxTotal, salaryInput, p, selfEmployed) - costBase <= net) return maxTotal - base;
  let lo = base, hi = maxTotal;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (netCostOfPensionContrib(mid, salaryInput, p, selfEmployed) - costBase < net) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2 - base;
}

/*
 * Analytic "gross pension withdrawal needed for a net amount".
 * A gross withdrawal G yields taxFree = min(p*G, headroom) (unless fully crystallised) and taxable G - taxFree,
 * which is taxed on top of `otherTaxable`. The taxable part may not push income above `ceiling`.
 * Returns the smallest G that delivers `target` net, or the largest G allowed by the ceiling if the target
 * cannot be reached within it. Exact (piecewise-linear) and cheap.
 */
function grossPensionNeededForNet(netTarget, otherTaxableIncome = 0, cfg, isFullyCrystallized = false, pclsHeadroom = Infinity, maxTaxableCeiling = Infinity) {
  const target = num(netTarget, 0);
  if (target <= 0) return 0;
  const p = taxParams(cfg);
  const T0 = Math.max(0, num(otherTaxableIncome, 0));
  const headroom = isFullyCrystallized ? 0 : Math.max(0, num(pclsHeadroom, 0));
  const prop = isFullyCrystallized ? 0 : p.pclsProp;
  const room = Math.max(0, num(maxTaxableCeiling, Infinity) - T0);
  if (!(room > 0) && (prop <= 0 || headroom <= 0)) return 0;

  const Gh = prop > 0 ? headroom / prop : Infinity;             // gross at which the tax-free cap binds
  const taxFreeOf = (G) => Math.min(prop * G, headroom);
  const taxableOf = (G) => G - taxFreeOf(G);
  // largest gross whose taxable part is <= x
  const gMaxForTaxable = (x) => {
    if (prop >= 1) return Gh + x;
    const g1 = x / (1 - prop);
    return g1 <= Gh ? g1 : headroom + x;
  };
  const netBase = calculateUKNetIncome(T0, p);
  const f = (G) => taxFreeOf(G) + calculateUKNetIncome(T0 + taxableOf(G), p) - netBase;

  const Gmax = Number.isFinite(room) ? gMaxForTaxable(room) : Infinity;
  if (Number.isFinite(Gmax) && f(Gmax) <= target) return Gmax;

  // breakpoints of f in gross space
  const bps = [];
  if (Number.isFinite(Gh)) bps.push(Gh);
  taxBreakpoints(p).forEach(B => { if (B > T0) bps.push(gMaxForTaxable(B - T0)); });
  bps.push(Number.isFinite(Gmax) ? Gmax : Math.max(target * 4, 1000));
  bps.sort((a, b) => a - b);

  let ga = 0, fa = 0;
  for (const gb of bps) {
    if (gb <= ga) continue;
    const fb = f(gb);
    if (fb >= target) {
      // f is linear on [ga, gb]; interpolate, then polish with a few secant/bisection steps for safety
      let lo = ga, hi = gb, flo = fa, fhi = fb;
      let G = fhi > flo ? lo + (target - flo) * (hi - lo) / (fhi - flo) : hi;
      for (let i = 0; i < 25; i++) {
        const fg = f(G);
        if (Math.abs(fg - target) < 1e-6) break;
        if (fg < target) { lo = G; flo = fg; } else { hi = G; fhi = fg; }
        const sec = fhi > flo ? lo + (target - flo) * (hi - lo) / (fhi - flo) : (lo + hi) / 2;
        G = (sec > lo && sec < hi) ? sec : (lo + hi) / 2;
      }
      return Math.min(G, Number.isFinite(Gmax) ? Gmax : G);
    }
    ga = gb; fa = fb;
  }
  // beyond the last breakpoint the marginal net rate is constant: extend linearly
  const gProbe = ga * 2 + 1000;
  const fProbe = f(gProbe);
  const slope = (fProbe - fa) / (gProbe - ga);
  if (!(slope > 1e-9)) return Number.isFinite(Gmax) ? Gmax : ga;
  const G = ga + (target - fa) / slope;
  return Number.isFinite(Gmax) ? Math.min(G, Gmax) : G;
}

// ---------------------------------------------------------------- seeded randomness
function mulberry32(seed) {
  let a = (seed >>> 0) || 0x9E3779B9;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gaussianPath(seed, n) {
  const rng = mulberry32(seed);
  const out = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    let u1 = rng(), u2 = rng();
    while (u1 <= 1e-12) u1 = rng();
    out[i] = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  }
  return out;
}

// ---------------------------------------------------------------- simulation context
/*
 * buildContext converts a (possibly messy) plan into fully sanitised numbers once, so the per-year
 * engine never touches raw strings. It also collects validation warnings for the UI.
 */
function buildContext(rawPlan) {
  const plan = normalizePlan(rawPlan);
  const warnings = [];
  const d = plan.demographics, s = plan.spending, c = plan.config;
  const isCouple = d.planningMode !== 'single';
  const P = taxParams(c);

  const req = (label, v, fallback, lo, hi) => {
    if (isBlank(v)) { warnings.push(`${label} is blank; using ${fallback}.`); return fallback; }
    const n = clamp(num(v, fallback), lo, hi);
    if (n !== num(v, fallback)) warnings.push(`${label} clamped to ${n}.`);
    return n;
  };
  const ageSelf0 = req('Current age (Myself)', d.currentAgeSelf, 40, 0, 120);
  const agePart0 = isCouple ? req('Current age (Partner)', d.currentAgePart, ageSelf0, 0, 120) : 0;
  const retireSelf = req('Retirement age (Myself)', d.retireAgeSelf, 60, 0, 120);
  const retirePart = isCouple ? req('Retirement age (Partner)', d.retireAgePart, 60, 0, 120) : 999;
  let terminalAge = clamp(num(d.terminalAge, 100), 1, 120);
  if (terminalAge <= ageSelf0) { warnings.push(`Terminal age (${terminalAge}) must exceed current age; using ${ageSelf0 + 1}.`); terminalAge = ageSelf0 + 1; }
  const nmpa = clamp(num(d.privatePensionAge, 58), 0, 120);
  const spa = clamp(num(d.statePensionAge, 68), 0, 120);
  const targetSpend = Math.max(0, num(s.targetSpend, 0));
  if (targetSpend <= 0) warnings.push('Net living spend is blank or zero. No retirement spending is being modelled.');
  const totalYears = Math.max(1, Math.round(terminalAge - ageSelf0));
  const valuationDate = c.valuationDate || todayISO();
  const yf = calculateYearFraction(valuationDate);
  const baseYear = parseInt(String(valuationDate).slice(0, 4)) || new Date().getFullYear();

  const riskOf = (key) => plan.riskProfiles[key] || DEFAULT_RISK_PROFILES['High Risk'];
  const accounts = plan.accounts.filter(a => isCouple || a.owner === 'Myself').map(a => {
    const prof = riskOf(a.risk);
    const [cat, owner] = a.id.split('_');
    const real = clamp(num(prof.real, 0), -50, 50) / 100;
    const vol = clamp(num(prof.volatility, 12), 0, 100) / 100;
    // uncertainty about the expected return itself, drawn once per path rather than once per year
    const sigmaParam = clamp(num(prof.sigmaParam, 0), 0, 100) / 100;
    return {
      id: a.id, cat, owner, ownerLabel: a.owner,
      balance: Math.max(0, num(a.balance, 0)),
      // embedded gain in today's GIA balance; blank means the balance is treated as all cost
      unrealisedGain: clamp(num(a.unrealisedGain, 0), 0, Math.max(0, num(a.balance, 0))),
      contrib: Math.max(0, num(a.contrib, 0)),
      growth: clamp(num(a.growth, 0), -100, 100) / 100,
      contribByYear: Array.isArray(a.contribByYear) ? a.contribByYear.map(v => Math.max(0, num(v, 0))) : null,
      risk: a.risk,
      real: real,
      vol,
      sigmaParam,
      equityWeight: RISK_EQUITY_WEIGHTS[a.risk] !== undefined ? RISK_EQUITY_WEIGHTS[a.risk] : 0.9,
      isCash: a.risk === 'Cash Equivalents'
    };
  });
  const acc = {};
  accounts.forEach(a => { acc[a.id] = a; });
  const owners = (isCouple ? OWNERS : ['self']).map(o => ({
    key: o, label: OWNER_LABEL[o],
    age0: o === 'self' ? ageSelf0 : agePart0,
    retireAge: o === 'self' ? retireSelf : retirePart,
    salary: Math.max(0, num(o === 'self' ? d.salarySelf : d.salaryPart, 0)),
    // growth on top of inflation; 0 leaves pay flat in today's money
    salaryGrowth: clamp(num(o === 'self' ? d.salaryGrowthSelf : d.salaryGrowthPart, 0), -100, 100) / 100,
    // trading profit rather than salary: Class 4 NIC, and pension relief at the income tax rate only
    selfEmployed: (o === 'self' ? d.employmentSelf : d.employmentPart) === 'self-employed',
    cgtGainsUsed: Math.max(0, num(o === 'self' ? d.cgtGainsUsedSelf : d.cgtGainsUsedPart, 0)),
    // unused annual allowance from the three tax years before the projection starts
    cfBroughtForward: Math.max(0, num(o === 'self' ? d.cfBroughtForwardSelf : d.cfBroughtForwardPart, 0)),
    // age from which the MPAA applies; NaN when the owner has not flexibly accessed a pension
    mpaaAge: num(o === 'self' ? d.mpaaAgeSelf : d.mpaaAgePart, NaN),
    statePension: Math.max(0, num(o === 'self' ? d.statePensionSelf : d.statePensionPart, 0)),
    ids: { pen: accountId('pen', o), isa: accountId('isa', o), other: accountId('other', o), cash: accountId('cash', o) }
  }));
  owners.forEach(o => {
    const pen = acc[o.ids.pen]; const isa = acc[o.ids.isa];
    const ownerAA = P.aaAt(o.salary);
    if (pen && pen.contrib > ownerAA) warnings.push(`${o.label}: pension contribution £${Math.round(pen.contrib).toLocaleString()} exceeds the annual allowance £${Math.round(ownerAA).toLocaleString()}${ownerAA < P.pensionAllowance ? ` (tapered from £${P.pensionAllowance.toLocaleString()} because earnings exceed £${P.aaTaperThr.toLocaleString()})` : ''}.`);
    if (isa && isa.contrib > P.isaAllowance) warnings.push(`${o.label}: ISA contribution £${Math.round(isa.contrib).toLocaleString()} exceeds the ISA allowance £${P.isaAllowance.toLocaleString()}.`);
    if (o.salary > 0 && pen && pen.contrib > o.salary) warnings.push(`${o.label}: pension contribution exceeds ${o.selfEmployed ? 'trading profit' : 'salary'}.`);
    // the pass-through only exists because an employer saves NIC on sacrificed salary; a sole trader has neither
    if (o.selfEmployed && P.erPass > 0) warnings.push(`${o.label}: employer NIC pass-through is set to ${Math.round(P.erPass * 100)}% in Config, but the self-employed have no employer, so it is ignored for this person.`);
    const gia = acc[o.ids.other];
    if (P.cgtEnabled && gia && gia.balance > 0 && isBlank(plan.accounts.find(a => a.id === o.ids.other)?.unrealisedGain)) {
      warnings.push(`${o.label}: no unrealised gain entered for Other Investments, so the £${Math.round(gia.balance).toLocaleString()} balance is treated as all cost and only future growth is taxed. Set it under Advanced inputs if the holding has an embedded gain.`);
    }
    // the plan draws taxable pension income while still paying in, so the MPAA is triggered and the excess
    // would face an annual allowance charge (which the model does not itself levy)
    if (Number.isFinite(o.mpaaAge) && pen && pen.contrib > P.mpaaLimit && o.mpaaAge < o.retireAge) {
      warnings.push(`${o.label}: the plan draws taxable pension income from age ${o.mpaaAge} while still contributing £${Math.round(pen.contrib).toLocaleString()}/yr, which permanently cuts the annual allowance to £${P.mpaaLimit.toLocaleString()} (the money purchase annual allowance). Contributions above that would face an annual allowance charge.`);
    }
    if (o.retireAge < o.age0 && o.age0 < 120) { /* already retired: fine */ }
  });
  if (isCouple) {
    const firstRetire = Math.min(...owners.map(o => o.retireAge));
    const stillWorking = owners.filter(o => o.retireAge > firstRetire && o.salary <= 0);
    if (stillWorking.length) warnings.push(`${stillWorking.map(w => w.label).join(', ')} keeps working after the first retirement but has no salary entered, so the full joint spend will be drawn from the portfolio in those years.`);
  }

  const otherIncomes = plan.otherIncomes.filter(i => isCouple || i.owner === 'Myself').map(i => ({
    owner: i.owner === 'Partner' ? 'part' : 'self',
    startAge: Math.max(0, num(i.startAge, 0)),
    endAge: isBlank(i.endAge) ? terminalAge : num(i.endAge, terminalAge),
    amount: Math.max(0, num(i.amount, 0)),
    taxFree: !incomeTypeOf(i.incomeType).taxable,
    isEarnings: incomeTypeOf(i.incomeType).relevantEarnings
  }));
  const yearOf = (x) => x.date ? parseInt(String(x.date).slice(0, 4)) : num(x.year, NaN);
  const oneOffContribs = new Map();
  const oneOffDeductions = new Map();
  const stagedTransfers = new Map();
  const oneOffStaging = new Map();
  {
    // Shared per-owner/wrapper/year claim ledger: every deposit and staged drip tranche competes for the
    // same headroom, so two deposits for the same owner/wrapper can never double-claim one year's allowance.
    const claimed = new Map(); // `${ownerKey}|${cat}|${t}` -> £ already claimed this pass
    const headroomCtx = { P, owners, acc, otherIncomes };
    const claim = (ownerKey, cat, t, want) => {
      const key = `${ownerKey}|${cat}|${t}`;
      const already = claimed.get(key) || 0;
      const avail = Math.max(0, wrapperHeadroomAtYear(headroomCtx, ownerKey, cat, t) - already);
      const take = Math.min(want, avail);
      claimed.set(key, already + take);
      return take;
    };

    const ordered = plan.oneOffContributions
      .filter(x => isCouple || x.owner !== 'Partner')
      .map((x, i) => ({ x, i, y: yearOf(x) }))
      .filter(e => Number.isFinite(e.y))
      .sort((a, b) => (a.y - b.y) || (a.i - b.i));

    ordered.forEach(({ x, y }) => {
      const t = y - baseYear;
      const ownerKey = x.owner === 'Partner' ? 'part' : 'self';
      const targetCat = Object.keys(CATEGORY_LABEL).find(k => CATEGORY_LABEL[k] === x.category) || 'pen';
      const targetId = accountId(targetCat, ownerKey);
      const otherId = accountId('other', ownerKey);
      const amt = Math.max(0, num(x.amount, 0));
      if (amt <= 0) return;

      // source deduction (independent of staging outcome; deducts the full deposit amount D)
      if (x.transferredFrom && x.transferredFrom !== 'External') {
        const srcCat = Object.keys(CATEGORY_LABEL).find(k => CATEGORY_LABEL[k] === x.transferredFrom);
        if (srcCat) {
          const sourceId = accountId(srcCat, ownerKey);
          if (!oneOffDeductions.has(y)) oneOffDeductions.set(y, []);
          oneOffDeductions.get(y).push({ id: sourceId, amount: amt });
          if (t === 0) {
            const startBal = acc[sourceId] ? acc[sourceId].balance : 0;
            if (amt > startBal) warnings.push(
              `${OWNER_LABEL[ownerKey]}: one-off deposit of £${Math.round(amt).toLocaleString()} exceeds available ${CATEGORY_LABEL[srcCat]} balance (£${Math.round(startBal).toLocaleString()}); the deduction will be capped to the available balance.`
            );
          }
        }
      }

      // headroom resolution: direct deposit if within headroom, otherwise stage the surplus (Option A)
      // yearHeadroom is this year's raw allowance (before other deposits' claims), shown on the row
      const yearHeadroom = wrapperHeadroomAtYear(headroomCtx, ownerKey, targetCat, t);
      const H0 = claim(ownerKey, targetCat, t, amt);
      if (!oneOffContribs.has(y)) oneOffContribs.set(y, []);
      if (amt <= H0 + 1e-6) {
        oneOffContribs.get(y).push({ id: targetId, amount: amt });
        oneOffStaging.set(x.id, { direct: true, targetId, otherId, stagedId: targetId, amount: amt, H0: amt, yearHeadroom, surplus0: 0, tranches: [], unresolvedRemainder: 0 });
        return;
      }

      const surplus0 = amt - H0;
      if (H0 > 0) oneOffContribs.get(y).push({ id: targetId, amount: H0 });
      oneOffContribs.get(y).push({ id: otherId, amount: surplus0 });

      const stagedCat = Object.keys(CATEGORY_LABEL).find(k => CATEGORY_LABEL[k] === x.stagedTargetWrapper) || targetCat;
      const stagedId = accountId(stagedCat, ownerKey);
      const tranches = [];
      let remaining = surplus0;
      if (stagedCat !== 'other') {
        for (let dt = t + 1; dt <= totalYears && remaining > 0.005; dt++) {
          const tranche = claim(ownerKey, stagedCat, dt, remaining);
          if (tranche <= 0) continue;
          const dy = baseYear + dt;
          if (!stagedTransfers.has(dy)) stagedTransfers.set(dy, []);
          stagedTransfers.get(dy).push({ fromId: otherId, toId: stagedId, amount: tranche });
          tranches.push({ year: dy, amount: tranche });
          remaining -= tranche;
        }
      } else {
        remaining = 0;
      }
      if (remaining > 0.005) warnings.push(
        `${OWNER_LABEL[ownerKey]}: £${Math.round(remaining).toLocaleString()} of the ${y} one-off deposit could not be fully staged into ${CATEGORY_LABEL[stagedCat]} within the plan horizon and will remain in Other Investments.`
      );
      oneOffStaging.set(x.id, { direct: false, targetId, otherId, stagedId, amount: amt, H0, yearHeadroom, surplus0, tranches, unresolvedRemainder: Math.max(0, remaining) });
    });
  }
  const oneOffCosts = new Map();
  plan.oneOffCosts.forEach(x => {
    const y = yearOf(x); if (!Number.isFinite(y)) return;
    const amt = Math.max(0, num(x.amount, 0));
    if (amt <= 0) return;
    oneOffCosts.set(y, (oneOffCosts.get(y) || 0) + amt);
  });
  /*
   * Spending bands, resolved once so the per-year lookup stays a cheap scan. Sorted by start age, with a
   * blank end age running to the terminal age. Overlaps are reported rather than silently resolved: the
   * lookup takes the first match, so an unnoticed overlap would quietly apply the wrong figure for years.
   */
  const spendBands = (s.spendBands || [])
    .map(b => ({
      fromAge: Math.round(num(b.fromAge, NaN)),
      toAge: isBlank(b.toAge) ? terminalAge : Math.round(num(b.toAge, NaN)),
      amount: Math.max(0, num(b.amount, 0))
    }))
    .filter(b => Number.isFinite(b.fromAge) && Number.isFinite(b.toAge))
    .sort((a, b) => a.fromAge - b.fromAge);
  spendBands.forEach((b, i) => {
    if (b.toAge < b.fromAge) {
      warnings.push(`Spending band starting at age ${b.fromAge} ends at ${b.toAge}, before it begins, so it is never applied.`);
      return;
    }
    const prev = spendBands[i - 1];
    if (prev && prev.toAge >= b.fromAge && prev.toAge >= prev.fromAge) {
      warnings.push(`Spending bands overlap between ages ${b.fromAge} and ${Math.min(prev.toAge, b.toAge)}; the earlier band (£${Math.round(prev.amount).toLocaleString()}) wins for those years.`);
    }
  });

  const policy = DECUMULATION_POLICIES[s.decumulationPolicy] || DECUMULATION_POLICIES['Bracket Fill Basic'];
  const ctx = {
    plan, warnings, isCouple, P, owners, accounts, acc,
    ageSelf0, agePart0, terminalAge, totalYears, nmpa, spa, targetSpend,
    spendBands,
    fullLumpSum: s.drawdownStrategy === 'Full 25% Lump Sum',
    policyKey: s.decumulationPolicy, policySteps: policy.steps, harvestPA: policy.harvest && !!c.harvestPersonalAllowance,
    pensionDeathTaxRate: clamp(num(c.pensionDeathTaxRate, 0), 0, 100) / 100,
    cashBufferYears: clamp(num(c.cashBufferMonths, 6), 0, 120) / 12,
    solvencyFloor: Math.max(0, num(c.solvencyFloor, 0)),
    inflation: clamp(num(c.inflation, 2.5), -50, 100) / 100,
    yf, baseYear, valuationDate,
    otherIncomes, oneOffContribs, oneOffCosts, oneOffDeductions, stagedTransfers, oneOffStaging
  };
  return ctx;
}

/*
 * Living-cost target at a given age of "Myself". The first band covering the age wins, and any year no
 * band covers falls back to the headline spend, so a partial set of bands only overrides the years it
 * names. Bands are pre-sorted in buildContext, which is what makes "first match" stable and cheap here:
 * this runs for every year of every Monte Carlo trial.
 */
function spendTargetAtAge(ctx, ageSelf) {
  const bands = ctx.spendBands;
  for (let i = 0; i < bands.length; i++) {
    if (ageSelf >= bands[i].fromAge && ageSelf <= bands[i].toAge) return bands[i].amount;
  }
  return ctx.targetSpend;
}

const freshState = (ctx) => {
  const pots = {};
  ctx.accounts.forEach(a => { pots[a.id] = a.balance; });
  // GIA cost basis is path-dependent (it falls as units are sold), so it lives in per-trial state
  const giaBasis = { self: 0, part: 0 };
  ctx.accounts.forEach(a => { if (a.cat === 'other') giaBasis[a.owner] = Math.max(0, a.balance - a.unrealisedGain); });
  // gains realised while settling a CGT bill are taxed the following year, so they carry forward
  return { pots, giaBasis, cgtCarry: { self: 0, part: 0 }, cumPcls: { self: 0, part: 0 }, lumpSumTaken: { self: false, part: false } };
};

// Money paid into the GIA is added at cost, so it creates no gain.
const giaAddBasis = (state, ownerKey, amount) => { if (amount > 0) state.giaBasis[ownerKey] += amount; };

// A disposal realises gain pro-rata against the whole holding and reduces basis by the cost portion.
const giaDispose = (state, balanceBefore, ownerKey, amount) => {
  if (amount <= 0 || balanceBefore <= 0) return 0;
  const basis = state.giaBasis[ownerKey] || 0;
  const gain = amount * (Math.max(0, balanceBefore - basis) / balanceBefore);
  state.giaBasis[ownerKey] = Math.max(0, basis - (amount - gain));
  return gain;
};

/*
 * market: 'expected' | { historical: true, startYear } | { z: number, zPath?: number }
 * Advances `state` by one year (index t) and returns the audit row for that year.
 */
function stepYear(ctx, state, t, market = 'expected', spendOverride = null) {
  const { P, owners, acc } = ctx;
  const pots = state.pots;
  const isYearZero = t === 0;
  const frac = isYearZero ? ctx.yf : 1.0;
  const year = ctx.baseYear + t;
  const ageSelf = ctx.ageSelf0 + t;
  const agePart = ctx.isCouple ? ctx.agePart0 + t : 0;
  const ageOf = (o) => (o === 'self' ? ageSelf : agePart);
  const isHistorical = typeof market === 'object' && market !== null && market.historical;
  const histPoint = isHistorical ? getHistoricalPoint(market.startYear, t) : null;

  const working = {}; const access = {};
  owners.forEach(o => { working[o.key] = ageOf(o.key) < o.retireAge; access[o.key] = ageOf(o.key) >= ctx.nmpa; });
  const anyAccess = owners.some(o => access[o.key]);
  const anyRetired = owners.some(o => !working[o.key]);

  // Gains realised during this tax year, per owner (GIA disposals only), opening with anything
  // carried over from settling last year's bill. Charged at year end.
  const realisedGains = { self: state.cgtCarry.self, part: state.cgtCarry.part };
  state.cgtCarry = { self: 0, part: 0 };
  const cgtOn = P.cgtEnabled;
  const ownerOfId = (id) => (String(id).endsWith('_part') ? 'part' : 'self');
  // Sell `amount` from an owner's GIA, booking the pro-rata gain. Returns what was actually sold.
  const sellGia = (id, amount) => {
    const before = pots[id] || 0;
    const sold = Math.min(before, Math.max(0, amount));
    if (sold <= 0) return 0;
    pots[id] = before - sold;
    if (cgtOn) realisedGains[ownerOfId(id)] += giaDispose(state, before, ownerOfId(id), sold);
    return sold;
  };

  // 0. one-off deposit source-pot deductions (full D, this year only; internal-source deposits)
  let oneOffDeductionShortfall = 0;
  const deductions = ctx.oneOffDeductions.get(year);
  if (deductions) deductions.forEach(x => {
    if (pots[x.id] === undefined) return;
    let take;
    if (x.id.startsWith('other_')) {
      take = sellGia(x.id, x.amount); // funding a deposit out of the GIA is a disposal
    } else {
      take = Math.min(pots[x.id], x.amount);
      pots[x.id] -= take;
    }
    oneOffDeductionShortfall += Math.max(0, x.amount - take);
  });

  // 1. one-off deposits (dated: not pro-rated) — includes staged deposits' year-0 immediate tranche + parked surplus
  const deposits = ctx.oneOffContribs.get(year);
  if (deposits) deposits.forEach(x => {
    if (pots[x.id] === undefined) return;
    pots[x.id] += x.amount;
    if (cgtOn && x.id.startsWith('other_')) giaAddBasis(state, ownerOfId(x.id), x.amount);
  });

  // 1.5 staged multi-year drip transfers (t>=1): drain GIA into the (possibly redirected) staged target,
  // capped at whatever remains in GIA — this naturally handles a market-crash-depleted GIA.
  // Moving out of the GIA is a real disposal (Bed & ISA), so it realises gain pro-rata.
  const drips = ctx.stagedTransfers.get(year);
  if (drips) drips.forEach(x => {
    const move = sellGia(x.fromId, x.amount);
    if (move <= 0) return;
    pots[x.toId] = (pots[x.toId] || 0) + move;
    if (cgtOn && x.toId.startsWith('other_')) giaAddBasis(state, ownerOfId(x.toId), move);
  });

  // 2. regular contributions while the owner works (year 0 pro-rated)
  const contribThisYear = { self: 0, part: 0 };
  const isaContribThisYear = { self: 0, part: 0 };
  ctx.accounts.forEach(a => {
    if (!working[a.owner]) return;
    const amt = contribAtYear(a, t);
    if (amt > 0) {
      pots[a.id] += amt * frac;
      if (cgtOn && a.cat === 'other') giaAddBasis(state, a.owner, amt * frac);
      contribThisYear[a.owner] += amt * frac;
      if (a.cat === 'isa') isaContribThisYear[a.owner] += amt * frac;
    }
  });

  // 3. full tax-free lump sum on first access (if selected)
  if (ctx.fullLumpSum) {
    owners.forEach(o => {
      if (state.lumpSumTaken[o.key] || !access[o.key] || working[o.key]) return;
      const pot = pots[o.ids.pen] || 0;
      if (pot <= 0) return;
      const pcls = Math.min(pot * P.pclsProp, Math.max(0, P.lsa - state.cumPcls[o.key]));
      pots[o.ids.pen] -= pcls;
      pots[o.ids.cash] = (pots[o.ids.cash] || 0) + pcls;
      state.cumPcls[o.key] += pcls;
      state.lumpSumTaken[o.key] = true;
    });
  }

  // 4. guaranteed incomes (state pension, DB, rental...) and salary of a still-working partner
  const taxable = { self: 0, part: 0 };
  const taxFreeIncome = { self: 0, part: 0 };
  ctx.otherIncomes.forEach(inc => {
    const age = ageOf(inc.owner);
    if (age >= inc.startAge && age <= inc.endAge) {
      if (inc.taxFree) taxFreeIncome[inc.owner] += inc.amount * frac; else taxable[inc.owner] += inc.amount * frac;
    }
  });
  const statePension = { self: 0, part: 0 };
  owners.forEach(o => { if (ageOf(o.key) >= ctx.spa) { statePension[o.key] = o.statePension * frac; taxable[o.key] += statePension[o.key]; } });
  const netGuaranteed = {};
  owners.forEach(o => { netGuaranteed[o.key] = taxFreeIncome[o.key] + calculateUKNetIncome(taxable[o.key], P); });
  let totalNetGuaranteed = owners.reduce((sum, o) => sum + netGuaranteed[o.key], 0);
  // take-home of a partner who is still working after the household has started drawing (offsets living costs)
  let workingTakeHome = 0;
  if (anyRetired) {
    owners.forEach(o => {
      if (!working[o.key] || o.salary <= 0) return;
      const pen = acc[o.ids.pen];
      const penContrib = pen ? contribAtYear(pen, t) : 0;
      const pay = salaryAtYear(o, t);
      // pay less tax, NIC and the net cost of the pension contribution — which prices sacrifice for an
      // employee and relief at source for the self-employed, whose NIC is charged on the whole profit
      const takeHome = pay - calculateUKTaxAndNIC(pay, P, o.selfEmployed) - netCostOfPensionContrib(penContrib, pay, P, o.selfEmployed);
      const nonPensionContribs = (contribThisYear[o.key] / frac) - penContrib;
      workingTakeHome += Math.max(0, takeHome - nonPensionContribs) * frac;
    });
  }

  let drawdownPensions = 0;
  // taxable pension income per owner — the MPAA trigger is personal, so it cannot use the combined figure
  const taxablePensionDrawn = { self: 0, part: 0 };
  let harvested = 0;
  const pclsHeadroom = (o) => Math.max(0, P.lsa - state.cumPcls[o]);
  const ownerByKey = {}; owners.forEach(o => { ownerByKey[o.key] = o; });

  // draw `netNeeded` net from an owner's pension without taking taxable income above `ceiling`; returns net delivered
  const drawPension = (oKey, netNeeded, ceiling = Infinity) => {
    const o = ownerByKey[oKey];
    if (!o || netNeeded <= 0 || !access[oKey]) return 0;
    const pot = pots[o.ids.pen] || 0;
    if (pot <= 0) return 0;
    const fully = ctx.fullLumpSum && state.lumpSumTaken[oKey];
    const headroom = fully ? 0 : pclsHeadroom(oKey);
    if (taxable[oKey] >= ceiling) return 0;
    const grossNeeded = grossPensionNeededForNet(netNeeded, taxable[oKey], P, fully, headroom, ceiling);
    const gross = Math.min(pot, grossNeeded);
    if (gross <= 0) return 0;
    pots[o.ids.pen] = pot - gross;
    drawdownPensions += gross;
    const taxFree = fully ? 0 : Math.min(gross * P.pclsProp, headroom);
    state.cumPcls[oKey] += taxFree;
    const taxablePart = gross - taxFree;
    taxablePensionDrawn[oKey] += taxablePart;
    const before = calculateUKNetIncome(taxable[oKey], P);
    taxable[oKey] += taxablePart;
    const after = calculateUKNetIncome(taxable[oKey], P);
    return taxFree + (after - before);
  };
  const drawPot = (id, need) => {
    if (need <= 0) return 0;
    // GIA draws are disposals, so they book a gain and reduce the cost basis
    if (id.startsWith('other_')) return sellGia(id, need);
    const pull = Math.min(pots[id] || 0, need);
    if (pull <= 0) return 0;
    pots[id] -= pull;
    return pull;
  };

  // 5. one-off capital costs: cash -> GIA -> ISA -> accessible pensions
  let unmetCost = 0;
  const cost = ctx.oneOffCosts.get(year) || 0;
  if (cost > 0) {
    let rem = cost;
    for (const cat of ['cash', 'other', 'isa']) for (const o of owners) { if (rem > 0) rem -= drawPot(o.ids[cat], rem); }
    for (const o of owners) { if (rem > 0) rem -= drawPension(o.key, rem); }
    unmetCost = Math.max(0, rem);
  }

  // 6. living-cost demand
  const spendBase = spendOverride !== null ? spendOverride : null;
  let annualLivingTarget = 0;
  if (anyRetired) {
    if (spendBase !== null) {
      const ratio = ctx.targetSpend > 0 ? spendTargetAtAge(ctx, ageSelf) / ctx.targetSpend : 1;
      annualLivingTarget = Math.max(0, spendBase) * ratio;
    } else annualLivingTarget = spendTargetAtAge(ctx, ageSelf);
    annualLivingTarget *= frac;
  }
  const netDemand = Math.max(0, annualLivingTarget - totalNetGuaranteed - workingTakeHome);
  const demand = { self: 0, part: 0 };

  // 7. surplus guaranteed income is swept to cash (buffer) then ISA
  if (annualLivingTarget > 0 && totalNetGuaranteed + workingTakeHome >= annualLivingTarget) {
    const surplus = totalNetGuaranteed + workingTakeHome - annualLivingTarget;
    const bufferEach = (annualLivingTarget / frac) * ctx.cashBufferYears / owners.length;
    owners.forEach(o => {
      const share = surplus / owners.length;
      pots[o.ids.cash] = (pots[o.ids.cash] || 0) + share;
      if (pots[o.ids.cash] > bufferEach) {
        let excess = pots[o.ids.cash] - bufferEach;
        const isaRoom = Math.max(0, P.isaAllowance - isaContribThisYear[o.key]);
        const toIsa = Math.min(excess, isaRoom);
        pots[o.ids.isa] = (pots[o.ids.isa] || 0) + toIsa;
        isaContribThisYear[o.key] += toIsa;
        excess -= toIsa;
        pots[o.ids.cash] = bufferEach + excess; // remainder stays in cash once the ISA allowance is used
      }
    });
  } else if (netDemand > 0) {
    owners.forEach(o => { demand[o.key] = netDemand / owners.length; });
    const remaining = () => owners.reduce((s, o) => s + demand[o.key], 0);
    // each wrapper tier: own pot first, then cross-cover the other owner
    const tier = (cat) => {
      owners.forEach(o => { demand[o.key] -= drawPot(o.ids[cat], demand[o.key]); });
      owners.forEach(o => owners.forEach(x => { if (x.key !== o.key && demand[x.key] > 0) demand[x.key] -= drawPot(o.ids[cat], demand[x.key]); }));
    };
    const pensionTier = (ceilingOf) => {
      owners.forEach(o => { if (demand[o.key] > 0) demand[o.key] = Math.max(0, demand[o.key] - drawPension(o.key, demand[o.key], ceilingOf(o))); });
      owners.forEach(o => owners.forEach(x => { if (x.key !== o.key && demand[x.key] > 0) demand[x.key] = Math.max(0, demand[x.key] - drawPension(o.key, demand[x.key], ceilingOf(o))); }));
    };
    for (const step of ctx.policySteps) {
      if (remaining() <= 0.005) break;
      if (step === 'penPA') pensionTier(() => P.pa);
      else if (step === 'penBasic') pensionTier(() => P.higherRateStartsAt);
      else if (step === 'penAny') pensionTier(() => Infinity);
      else tier(step);
    }
  }

  // 7b. harvest unused 0% allowance from pensions (retired, accessible) into ISA / cash
  if (ctx.harvestPA && anyRetired) {
    owners.forEach(o => {
      if (working[o.key] || !access[o.key]) return;
      if ((pots[o.ids.pen] || 0) <= 0 || taxable[o.key] >= P.pa) return;
      const net = drawPension(o.key, 1e12, P.pa);
      if (net > 0) {
        const isaRoom = Math.max(0, P.isaAllowance - isaContribThisYear[o.key]);
        const toIsa = Math.min(net, isaRoom);
        pots[o.ids.isa] = (pots[o.ids.isa] || 0) + toIsa;
        isaContribThisYear[o.key] += toIsa;
        pots[o.ids.cash] = (pots[o.ids.cash] || 0) + (net - toIsa);
        harvested += net;
      }
    });
  }

  // 7c. capital gains tax on the year's GIA disposals. Gains stack on top of income for the band split.
  // The bill is settled from cash -> GIA -> ISA -> accessible pension, mirroring one-off costs. A sale made
  // to pay the bill books its own gain, which falls into next year's tally (CGT is due the following January).
  let cgtPaid = 0;
  let unmetCgt = 0;
  if (cgtOn) {
    owners.forEach(o => {
      const exempt = Math.max(0, P.cgtAnnualExempt - (t === 0 ? o.cgtGainsUsed : 0));
      const taxableGain = Math.max(0, realisedGains[o.key] - exempt);
      if (taxableGain <= 0) return;
      // Unused personal allowance cannot be set against capital gains, so the band available to gains is
      // the basic-rate width less TAXABLE income (income after PA) — never the full gross-income headroom.
      const taxableIncome = Math.max(0, taxable[o.key] - P.paAt(taxable[o.key]));
      const basicRoom = Math.max(0, P.cgtBandWidth - taxableIncome);
      const atBasic = Math.min(taxableGain, basicRoom);
      const bill = atBasic * P.cgtBasicRate + (taxableGain - atBasic) * P.cgtHigherRate;
      if (bill <= 0) return;
      cgtPaid += bill;
      const gainsBeforeSettling = realisedGains[o.key];
      let rem = bill;
      for (const cat of ['cash', 'other', 'isa']) { if (rem > 0) rem -= drawPot(o.ids[cat], rem); }
      for (const x of owners) { if (rem > 0) rem -= drawPot(x.ids.cash, rem); }
      if (rem > 0) rem -= drawPension(o.key, rem);
      unmetCgt += Math.max(0, rem);
      // selling to pay the bill realises further gain — defer it to next year rather than recursing
      state.cgtCarry[o.key] += realisedGains[o.key] - gainsBeforeSettling;
      realisedGains[o.key] = gainsBeforeSettling;
    });
  }

  const unmetDemand = owners.reduce((s, o) => s + Math.max(0, demand[o.key]), 0) + unmetCost + oneOffDeductionShortfall + unmetCgt;
  const lockedPensionWealth = owners.reduce((s, o) => s + (access[o.key] ? 0 : (pots[o.ids.pen] || 0)), 0);
  const preNmpaInsolvent = unmetDemand > 1 && (!anyAccess || lockedPensionWealth > 0);

  // 8. compounding (year 0 pro-rated)
  ctx.accounts.forEach(a => {
    let g = a.real;
    if (isHistorical) g = (histPoint && !a.isCash) ? (a.equityWeight * histPoint.s + (1 - a.equityWeight) * histPoint.b) / 100 : a.real;
    else if (typeof market === 'object' && market !== null && market.z !== undefined) {
      // Log-return with median equal to the stated expected (geometric) real return. The sigmaParam
      // term shifts that median for the whole path at once, so it compounds instead of averaging out.
      const zp = market.zPath || 0;
      g = Math.exp(Math.log(1 + a.real) + a.sigmaParam * zp + a.vol * market.z) - 1;
    }
    pots[a.id] = Math.max(0, (pots[a.id] || 0) * (1 + g * frac));
  });

  const sumOwner = (o) => CATEGORIES.reduce((s, cat) => s + (pots[o.ids[cat]] || 0), 0);
  const totalSelf = sumOwner(ownerByKey.self);
  const totalPart = ctx.isCouple ? sumOwner(ownerByKey.part) : 0;
  const totalCombined = totalSelf + totalPart;
  const taxPaid = owners.reduce((s, o) => s + incomeTax(taxable[o.key], P), 0);
  const byCat = {};
  CATEGORIES.forEach(cat => { byCat[cat] = owners.reduce((s, o) => s + (pots[o.ids[cat]] || 0), 0); });

  return {
    year, t, ageSelf, agePart,
    histYear: histPoint ? histPoint.y : null,
    histStockReturn: histPoint ? histPoint.s : null,
    histBondReturn: histPoint ? histPoint.b : null,
    workingSelf: working.self ? 1 : 0, workingPart: working.part ? 1 : 0,
    targetSpend: annualLivingTarget, spSelf: statePension.self, spPart: statePension.part,
    netGuaranteed: totalNetGuaranteed, workingTakeHome,
    netDrawdown: netDemand, totalSelf, totalPart, totalCombined,
    pots: { ...pots },
    pensions: byCat.pen, isas: byCat.isa, other: byCat.other, cash: byCat.cash,
    preNmpaLiquid: byCat.isa + byCat.other + byCat.cash,
    drawdownPensions, taxablePensionSelf: taxablePensionDrawn.self, taxablePensionPart: taxablePensionDrawn.part, harvested, taxPaid, cgtPaid,
    realisedGains: realisedGains.self + realisedGains.part,
    preNmpaInsolvent, unmetDemand
  };
}

// ---------------------------------------------------------------- simulation drivers
function simulateDeterministic(planOrCtx, regime = 'expected') {
  const ctx = planOrCtx && planOrCtx.P ? planOrCtx : buildContext(planOrCtx);
  const state = freshState(ctx);
  const rows = [];
  for (let t = 0; t <= ctx.totalYears; t++) rows.push(stepYear(ctx, state, t, regime));
  return rows;
}

/*
 * The MPAA trigger is a consequence of the plan rather than an input: it starts the first year an owner
 * takes taxable pension income (tax-free cash alone does not count). Resolved once on the expected path
 * and written back into the plan, so headroom, staging, Monte Carlo and the backtest all agree.
 * Single pass by design — staged pension deposits are sized by headroom, so iterating could oscillate,
 * and the trigger year is driven by retirement age and spending rather than by deposit staging.
 */
function resolveMpaa(plan) {
  const ctx0 = buildContext(plan);
  if (!ctx0.P.mpaaLimit) return plan;
  const rows = simulateDeterministic(ctx0, 'expected');
  const demographics = { ...ctx0.plan.demographics };
  ctx0.owners.forEach(o => {
    const hit = rows.find(r => (o.key === 'self' ? r.taxablePensionSelf : r.taxablePensionPart) > 0);
    demographics[o.key === 'self' ? 'mpaaAgeSelf' : 'mpaaAgePart'] = hit ? (o.key === 'self' ? hit.ageSelf : hit.agePart) : '';
  });
  return { ...ctx0.plan, demographics };
}

function simulateHistorical(planOrCtx, startYear) {
  const ctx = planOrCtx && planOrCtx.P ? planOrCtx : buildContext(planOrCtx);
  const state = freshState(ctx);
  const rows = [];
  for (let t = 0; t <= ctx.totalYears; t++) rows.push(stepYear(ctx, state, t, { historical: true, startYear }));
  return rows;
}

const FAIL_TOLERANCE = 1; // £ of unmet demand in a year that counts as failure

function evaluateRows(ctx, rows) {
  const failedStep = rows.find(r => r.unmetDemand > FAIL_TOLERANCE || r.preNmpaInsolvent);
  const terminal = rows[rows.length - 1];
  const belowFloor = ctx.solvencyFloor > 0 && terminal.totalCombined < ctx.solvencyFloor;
  const survived = !failedStep && !belowFloor;
  return {
    survived,
    failAge: failedStep ? failedStep.ageSelf : (belowFloor ? terminal.ageSelf : null),
    failYear: failedStep ? failedStep.year : (belowFloor ? terminal.year : null),
    failReason: failedStep ? (failedStep.preNmpaInsolvent ? 'pre-access' : 'shortfall') : (belowFloor ? 'floor' : null),
    preNmpaFailed: !!(failedStep && failedStep.preNmpaInsolvent),
    terminalPot: Math.max(0, terminal.totalCombined),
    terminalPension: Math.max(0, terminal.pensions),
    terminalPotNet: Math.max(0, terminal.totalCombined - terminal.pensions * ctx.pensionDeathTaxRate),
    minPot: Math.min(...rows.map(r => r.totalCombined)),
    lifetimeTax: rows.reduce((s, r) => s + r.taxPaid + (r.cgtPaid || 0), 0)
  };
}

// One Monte Carlo path. `zs` is the pre-drawn standard-normal shock per year (common random numbers).
function runTrial(ctx, zs, spendOverride = null, collectPath = false) {
  const state = freshState(ctx);
  let failed = false, failAge = null, preNmpaFailed = false, minPot = Infinity, lifetimeTax = 0;
  let terminalRow = null;
  /*
   * Opt-in, and the default matters: optimizeSpend calls this a few hundred times while bisecting and
   * buildTournament runs a full simulation per player plus two candidate searches. None of them wants
   * to pay for a path it will not read, so only the fan chart asks.
   */
  const path = collectPath ? new Float64Array(ctx.totalYears + 1) : null;
  /*
   * Fixed for the whole path: this is "the long-run average turned out to be better or worse than we
   * assumed", which is decided once and then lived with, unlike the annual shock which is redrawn.
   * Absent for a caller that supplied only per-year draws, in which case it is simply zero.
   */
  const zPath = zs.length > ctx.totalYears + 1 ? zs[ctx.totalYears + 1] : 0;
  for (let t = 0; t <= ctx.totalYears; t++) {
    const row = stepYear(ctx, state, t, { z: zs[t], zPath }, spendOverride);
    lifetimeTax += row.taxPaid + (row.cgtPaid || 0);
    if (row.totalCombined < minPot) minPot = row.totalCombined;
    // floored the same way terminalPot is, so the last entry of a path is exactly the terminal pot
    if (path) path[t] = Math.max(0, row.totalCombined);
    if (!failed && (row.unmetDemand > FAIL_TOLERANCE || row.preNmpaInsolvent)) {
      failed = true; failAge = row.ageSelf; preNmpaFailed = row.preNmpaInsolvent || !ctx.owners.some(o => (o.key === 'self' ? row.ageSelf : row.agePart) >= ctx.nmpa);
    }
    terminalRow = row;
  }
  const terminalPot = Math.max(0, terminalRow.totalCombined);
  if (!failed && ctx.solvencyFloor > 0 && terminalPot < ctx.solvencyFloor) { failed = true; failAge = terminalRow.ageSelf; }
  const terminalPotNet = Math.max(0, terminalPot - Math.max(0, terminalRow.pensions) * ctx.pensionDeathTaxRate);
  const out = { survived: !failed, failAge, preNmpaFailed, terminalPot, terminalPotNet, minPot, lifetimeTax };
  if (path) out.path = path;
  return out;
}

/*
 * One shock series per trial. The array is one longer than the projection: indices 0..years are the
 * per-year market shocks and the final entry is the path's expected-return shock, used when a tier
 * carries a non-zero sigmaParam.
 *
 * The extra draw is appended rather than prepended deliberately. gaussianPath fills sequentially from a
 * seeded generator, so asking it for one more normal leaves every earlier value untouched — which is
 * what lets this change be verified as a no-op at sigmaParam = 0 rather than merely argued to be one.
 */
function pathsForSeed(seed, trials, years) {
  const out = new Array(trials);
  for (let i = 0; i < trials; i++) out[i] = gaussianPath((seed + i * 7919) >>> 0, years + 2);
  return out;
}

function summarizeTrials(results) {
  const n = results.length;
  if (!n) return null;
  const pots = results.map(r => r.terminalPot).sort((a, b) => a - b);
  const potsNet = results.map(r => r.terminalPotNet).sort((a, b) => a - b);
  const fails = results.filter(r => !r.survived).map(r => r.failAge).filter(a => a !== null).sort((a, b) => a - b);
  const q = (arr, p) => arr.length ? arr[Math.min(arr.length - 1, Math.floor(arr.length * p))] : 0;
  const successCount = results.filter(r => r.survived).length;
  const successRate = (successCount / n) * 100;
  /*
   * Per-year percentile bands, when the caller asked runTrial to keep each path. Deliberately the same
   * `q` as the terminal figures below: the right-hand edge of the fan is then the same number as the
   * p10/median/p90 tiles, rather than merely close to it, and a reader can check one against the other.
   *
   * Paths that run dry sit at zero and stay there, which is the point. The p10 line reaching the axis
   * at some age is the plain statement that one plan in ten is broke by then.
   */
  let bands = null;
  if (results[0] && results[0].path) {
    const years = results[0].path.length;
    const col = new Float64Array(n);
    bands = [];
    for (let t = 0; t < years; t++) {
      for (let i = 0; i < n; i++) col[i] = results[i].path[t];
      col.sort();                       // typed-array sort is numeric, and in place costs nothing
      bands.push({ t, p10: q(col, 0.10), p50: q(col, 0.50), p90: q(col, 0.90) });
    }
  }
  return {
    trials: n,
    successRate,
    bands,
    standardError: Math.sqrt(Math.max(0, successRate * (100 - successRate) / n)),
    p10Terminal: q(pots, 0.10), medianTerminal: q(pots, 0.50), p90Terminal: q(pots, 0.90),
    p10TerminalNet: q(potsNet, 0.10), medianTerminalNet: q(potsNet, 0.50), p90TerminalNet: q(potsNet, 0.90),
    medianFailAge: fails.length ? q(fails, 0.5) : null,
    earliestFailAge: fails.length ? fails[0] : null,
    preNmpaFailRate: (results.filter(r => !r.survived && r.preNmpaFailed).length / n) * 100,
    medianLifetimeTax: q(results.map(r => r.lifetimeTax).sort((a, b) => a - b), 0.5)
  };
}

// Synchronous Monte Carlo. For UI responsiveness call runTrial in chunks instead (see App).
function monteCarlo(planOrCtx, { trials = 5000, seed = 12345, spendOverride = null, collectPaths = false } = {}) {
  const ctx = planOrCtx && planOrCtx.P ? planOrCtx : buildContext(planOrCtx);
  const paths = pathsForSeed(seed, trials, ctx.totalYears);
  const results = paths.map(zs => runTrial(ctx, zs, spendOverride, collectPaths));
  return { ...summarizeTrials(results), spend: spendOverride !== null ? spendOverride : ctx.targetSpend };
}

/*
 * Safe maximum spend: largest spend (rounded to £250) whose success rate meets targetRate.
 * Uses common random numbers across candidates so the success curve is monotone and the
 * bisection is sound; the upper bound grows adaptively instead of being capped at £150k.
 */
function optimizeSpend(planOrCtx, { targetRate = 90, seed = 12345, searchTrials = 400, finalTrials = 5000, onProgress = null } = {}) {
  const ctx = planOrCtx && planOrCtx.P ? planOrCtx : buildContext(planOrCtx);
  const paths = pathsForSeed(seed, searchTrials, ctx.totalYears);
  const rateAt = (spend) => { let s = 0; for (const zs of paths) if (runTrial(ctx, zs, spend).survived) s++; return (s / searchTrials) * 100; };
  let low = 0;
  if (rateAt(0) < targetRate) return { spend: 0, ...monteCarlo(ctx, { trials: finalTrials, seed: seed + 1, spendOverride: 0 }), note: 'Even zero spending fails the target (pre-SIPP access gap or one-off costs).' };
  let high = Math.max(20000, ctx.targetSpend * 2, 150000);
  let guard = 0;
  while (rateAt(high) >= targetRate && guard++ < 8) { low = high; high *= 2; }
  for (let iter = 0; iter < 14; iter++) {
    const mid = round250((low + high) / 2);
    if (mid <= low || mid >= high) break;
    if (rateAt(mid) >= targetRate) low = mid; else high = mid;
    if (onProgress) onProgress((iter + 1) / 14);
  }
  const optimalSpend = round250(low);
  return { spend: optimalSpend, ...monteCarlo(ctx, { trials: finalTrials, seed: seed + 1, spendOverride: optimalSpend }) };
}

// ---------------------------------------------------------------- financial helpers used by the tournament
const annuityFactor = (r, n) => (Math.abs(r) < 1e-9 ? n : (1 - Math.pow(1 + r, -n)) / r);
// FV at end of n years of contributions paid at the start of each year, escalating at g, growing at r (engine convention)
const fvContribStream = (C, r, g, n) => { let fv = 0; for (let t = 0; t < n; t++) fv = (fv + C * Math.pow(1 + g, t)) * (1 + r); return fv; };

/*
 * Real return the bridge pot can be expected to earn: the balance-weighted rate across the wrappers that
 * are actually allowed to fund it. With nothing liquid held yet there is nothing to weight, so fall back
 * to the ISA tier, which is where new bridge money would go.
 */
function liquidRealRate(ctx) {
  let w = 0, s = 0;
  ctx.accounts.forEach(a => { if (a.cat !== 'pen' && a.balance > 0) { w += a.balance; s += a.balance * a.real; } });
  if (w > 0) return s / w;
  const isa = ctx.accounts.find(a => a.cat === 'isa');
  return isa ? isa.real : 0;
}

/*
 * Pre-access bridge: years in which the household draws on the portfolio but nobody can touch a pension.
 * Spending is net of guaranteed income (and a working partner's take-home).
 *
 * Two sizes come back. `netNeeded` is the plain sum of those years' drawdowns, which assumes the money
 * sits at 0% real from the day it is set aside: deliberately conservative, and what the bridge safety
 * margin in Config is applied to. `pvNeeded` discounts each year back to the retirement date at the rate
 * the liquid pot actually earns, because only the first year's spending is needed on day one; the rest
 * keeps compounding while it waits. The gap between the two grows with the length of the bridge.
 */
function bridgeRequirement(ctx) {
  const rows = simulateDeterministic(ctx, 'expected');
  const rate = liquidRealRate(ctx);
  let years = 0, needed = 0, pv = 0;
  for (const r of rows) {
    const anyAccess = ctx.owners.some(o => (o.key === 'self' ? r.ageSelf : r.agePart) >= ctx.nmpa);
    if (anyAccess) break;
    if (r.targetSpend > 0) { pv += r.netDrawdown / Math.pow(1 + rate, years); years++; needed += r.netDrawdown; }
  }
  return { gapYears: years, netNeeded: needed, pvNeeded: pv, rate };
}

/*
 * How much has to go into the ISA each year for the bridge to be funded by the time it is needed, once
 * growth is counted on both sides: what is already held keeps compounding until retirement, and so does
 * each new contribution.
 *
 * `margin` scales the target (1 = exactly the discounted requirement). `overYears` is how many of the
 * remaining years carry the contributions: passing fewer than the full run to retirement back-loads them,
 * which raises the annual figure but leaves the pension compounding on its own for longer first.
 *
 * This is the honest version of the figure Relief-First uses. That one ignores growth entirely and then
 * divides by every year to retirement, which over a long run to retirement asks for several times more
 * ISA than the bridge will need, and starves the pension of relief to pay for it.
 */
function bridgeIsaAnnual(ctx, { emergencyFloor = 0, margin = 1, overYears = null } = {}) {
  const bridge = bridgeRequirement(ctx);
  if (!(bridge.gapYears > 0) || !(bridge.pvNeeded > 0)) {
    return { annual: 0, target: 0, shortfall: 0, spareAtRetire: 0, years: 0, bridge };
  }
  const g = bridge.rate;
  const yearsToRetire = Math.max(1, Math.min(...ctx.owners.map(o => o.retireAge - o.age0)));
  const liquidToday = ctx.accounts.reduce((t, a) => (a.cat === 'pen' ? t : t + a.balance), 0);
  const spareAtRetire = Math.max(0, liquidToday - emergencyFloor) * Math.pow(1 + g, yearsToRetire);
  const target = bridge.pvNeeded * Math.max(0, margin);
  const shortfall = Math.max(0, target - spareAtRetire);
  const years = clamp(Math.round(overYears || yearsToRetire), 1, yearsToRetire);
  const isa = ctx.accounts.find(a => a.cat === 'isa');
  const fv = fvContribStream(1, g, isa ? isa.growth : 0, years);
  return { annual: fv > 0 ? shortfall / fv : 0, target, shortfall, spareAtRetire, years, yearsToRetire, bridge };
}

// Regular-contribution amount for account `a` in projection-year index t (post-escalation, or a phased schedule).
function contribAtYear(a, t) {
  return a.contribByYear ? (a.contribByYear[t] || 0) : a.contrib * Math.pow(1 + a.growth, t);
}

/*
 * Salary, or trading profit for the self-employed, in projection-year t. The projection is in today's
 * money, so a rate of 0 is not a frozen wage: it is pay rising exactly with inflation. `salaryGrowth` is
 * whatever is expected on top of that, and can be negative for a career winding down.
 */
function salaryAtYear(o, t) {
  if (!(o.salary > 0)) return 0;
  return o.salary * Math.pow(1 + (o.salaryGrowth || 0), t);
}

// Relevant UK earnings for pension purposes in projection-year t: salary while still working, plus any
// earnings-type income streams active at that age. Pension income, annuities and rent do not count.
function relevantEarningsAtYear(ctx, o, t) {
  const age = o.age0 + t;
  const salary = age < o.retireAge ? salaryAtYear(o, t) : 0;
  return (ctx.otherIncomes || []).reduce((s, i) =>
    (i.owner === o.key && i.isEarnings && age >= i.startAge && age <= i.endAge) ? s + i.amount : s, salary);
}

// Money Purchase Annual Allowance. Flexibly accessing a pension (drawing taxable income, as opposed to
// taking only tax-free cash or buying an annuity) permanently cuts the DC allowance, with no carry-forward.
// The trigger is a real-world event, so the age is declared per owner rather than inferred.
function mpaaAppliesAtYear(P, o, t) {
  return P.mpaaLimit > 0 && Number.isFinite(o.mpaaAge) && (o.age0 + t) >= o.mpaaAge;
}

// Unused annual allowance carried forward from the previous three tax years. Years inside the projection
// are computed from the contribution schedule; years before it come from the declared opening figure,
// which decays out of the three-year window as the projection advances. Not consumed when used — see docs.
function carryForwardAtYear(ctx, o, t) {
  const { P, acc } = ctx;
  const a = acc[o.ids.pen];
  let total = 0;
  for (let k = 1; k <= 3; k++) {
    const j = t - k;
    if (j < 0) { total += o.cfBroughtForward / 3; continue; }
    const contributed = ((o.age0 + j) < o.retireAge && a) ? contribAtYear(a, j) : 0;
    // a year spent above the taper threshold only ever banked its tapered allowance, so a consistently
    // high earner must not carry forward the headline figure
    total += Math.max(0, P.aaAt(relevantEarningsAtYear(ctx, o, j)) - contributed);
  }
  return total;
}

// Remaining annual ISA/pension headroom for `ownerKey` in year index t, net of that owner's own regular
// (escalating) contribution to the same wrapper. Other Investments / Cash Savings have no HMRC cap.
function wrapperHeadroomAtYear(ctx, ownerKey, category, t) {
  const { P, acc, owners } = ctx;
  if (category === 'other' || category === 'cash') return Infinity;
  const o = owners.find(x => x.key === ownerKey);
  if (!o) return 0;
  const a = acc[o.ids[category]];
  // regular contributions stop at retirement (mirrors stepYear), so they only consume headroom while working
  const retired = (o.age0 + t) >= o.retireAge;
  const regContrib = (a && !retired) ? contribAtYear(a, t) : 0;
  if (category === 'isa') return Math.max(0, P.isaAllowance - regContrib);
  const earnings = relevantEarningsAtYear(ctx, o, t);
  // carry forward is unavailable against the MPAA, and never lifts the relevant-earnings limit
  const mpaa = mpaaAppliesAtYear(P, o, t);
  // high earners have a tapered annual allowance; carry forward still stacks on the tapered figure
  const allowance = mpaa ? P.mpaaLimit : P.aaAt(earnings) + carryForwardAtYear(ctx, o, t);
  // a blank salary while still working means "earnings unknown" — leave the allowance unconstrained
  const cap = (!retired && o.salary <= 0 && earnings <= 0)
    ? allowance
    : Math.min(allowance, Math.max(P.pensionNoEarningsLimit, earnings));
  return Math.max(0, cap - regContrib);
}

/*
 * Allocate a net take-home budget between ISA (net) and pension (grossed up per owner, capped by the annual
 * allowance and by salary where known). Overflow beyond caps cascades ISA -> pension -> GIA so that the
 * same net budget is always invested. `isaShare` is the target ISA fraction of the net budget.
 */
function allocateBudget(ctx, netBudget, isaShare, { isaMin = 0, balance = 'proportional', penFloorGross = null } = {}) {
  const { P, owners, acc } = ctx;
  const budget = Math.max(0, netBudget);
  const n = owners.length;
  const isaCapTotal = P.isaAllowance * n;
  let isaNet = clamp(Math.max(budget * clamp(isaShare, 0, 1), Math.min(isaMin, budget)), 0, Math.min(budget, isaCapTotal));
  let penNet = budget - isaNet;

  // owner split
  const curPen = owners.map(o => acc[o.ids.pen] ? acc[o.ids.pen].contrib : 0);
  const curIsa = owners.map(o => acc[o.ids.isa] ? acc[o.ids.isa].contrib : 0);
  const sumPen = curPen.reduce((a, b) => a + b, 0), sumIsa = curIsa.reduce((a, b) => a + b, 0);
  let penW = owners.map((_, i) => (sumPen > 0 ? curPen[i] / sumPen : (i === 0 ? 1 : 0)));
  let isaW = owners.map((_, i) => (sumIsa > 0 ? curIsa[i] / sumIsa : (i === 0 ? 1 : 0)));
  if (balance === 'balanced' && n > 1) {
    // steer new money to the owner with the smaller projected pension so both allowances are usable in retirement
    const fv = owners.map(o => { const a = acc[o.ids.pen]; const yrs = Math.max(0, o.retireAge - o.age0); return a ? a.balance * Math.pow(1 + a.real, yrs) : 0; });
    const tot = fv.reduce((a, b) => a + b, 0);
    penW = tot > 0 ? fv.map(v => (tot - v) / (tot * (n - 1))) : owners.map(() => 1 / n);
    isaW = owners.map(() => 1 / n);
  }
  // pension gross per owner with caps; overflow cascades to the other owner
  const penGross = owners.map(() => 0);
  const penNetUsed = owners.map(() => 0);
  // the self-employed have no employer, so no pass-through can inflate the earnings cap for them
  const capOf = (o) => Math.min(
    mpaaAppliesAtYear(P, o, 0) ? P.mpaaLimit : P.aaAt(o.salary),
    o.salary > 0 ? o.salary * passThroughFactor(P, o.selfEmployed) : P.pensionAllowance
  );
  let penNetRemaining = penNet;
  const order = owners.map((o, i) => i).sort((a, b) => penW[b] - penW[a]);
  // price every top-up at the owner's marginal rate given what is already going into that pension
  const allocate = (i, netAmt) => {
    if (netAmt <= 0) return 0;
    const o = owners[i];
    const cap = Math.max(0, capOf(o) - penGross[i]);
    if (cap <= 0) return 0;
    const credit = grossUpNetIncremental(netAmt, o.salary, P, penGross[i], cap, o.selfEmployed);
    if (credit <= 0) return 0;
    penGross[i] += credit;
    const total = netCostOfPensionContrib(penGross[i], o.salary, P, o.selfEmployed);
    const delta = total - penNetUsed[i];
    penNetUsed[i] = total;
    return delta;
  };
  owners.forEach((o, i) => { penNetRemaining -= allocate(i, penNet * penW[i]); });
  for (const i of order) { if (penNetRemaining > 0.5) penNetRemaining -= allocate(i, penNetRemaining); }
  // pension floor (used by bracket-smoothing): never exceed a specified gross per owner
  if (penFloorGross) {
    owners.forEach((o, i) => {
      if (penGross[i] > penFloorGross[i]) {
        const excessNet = penNetUsed[i] - netCostOfPensionContrib(penFloorGross[i], o.salary, P, o.selfEmployed);
        penGross[i] = penFloorGross[i]; penNetUsed[i] -= excessNet; penNetRemaining += excessNet;
      }
    });
  }
  // leftover net -> ISA (to cap) -> GIA
  let isaLeft = isaNet + Math.max(0, penNetRemaining);
  const isaNetByOwner = owners.map(() => 0);
  owners.forEach((o, i) => { const want = Math.min(isaLeft, isaNet * isaW[i], P.isaAllowance); isaNetByOwner[i] += want; isaLeft -= want; });
  for (const i of order) { if (isaLeft > 0.5) { const room = Math.max(0, P.isaAllowance - isaNetByOwner[i]); const take = Math.min(room, isaLeft); isaNetByOwner[i] += take; isaLeft -= take; } }
  const giaNet = Math.max(0, isaLeft);
  const totalPenGross = penGross.reduce((a, b) => a + b, 0);
  const totalPenNet = penNetUsed.reduce((a, b) => a + b, 0);
  return {
    isaContrib: isaNetByOwner.reduce((a, b) => a + b, 0), isaByOwner: isaNetByOwner,
    penContrib: totalPenGross, penByOwner: penGross, penNet: totalPenNet,
    giaContrib: giaNet, taxReliefSaved: Math.max(0, totalPenGross - totalPenNet)
  };
}

// Escalation (contrib growth %) entered by the user is preserved so every player is treated alike.
function applyAllocationToPlan(plan, ctx, alloc, { contribByYear = null, transfer = null } = {}) {
  const cloned = normalizePlan(JSON.parse(JSON.stringify(plan)));
  ctx.owners.forEach((o, i) => {
    cloned.accounts.forEach(a => {
      if (a.id === o.ids.pen) { a.contrib = Math.round(alloc.penByOwner[i]); delete a.contribByYear; }
      if (a.id === o.ids.isa) { a.contrib = Math.round(alloc.isaByOwner[i]); delete a.contribByYear; }
      if (a.id === o.ids.other && alloc.giaContrib > 0) { a.contrib = Math.round((num(a.contrib, 0)) + alloc.giaContrib / ctx.owners.length); }
    });
  });
  if (contribByYear) Object.entries(contribByYear).forEach(([id, arr]) => { const a = cloned.accounts.find(x => x.id === id); if (a) { a.contribByYear = arr.map(v => Math.round(v)); a.contrib = Math.round(arr[0] || 0); } });
  if (transfer && transfer.net > 0) {
    cloned.accounts.forEach(a => {
      if (a.id === transfer.fromId) a.balance = Math.max(0, num(a.balance, 0) - transfer.net);
      if (a.id === transfer.toId) a.balance = num(a.balance, 0) + transfer.gross;
      if (transfer.refund > 0 && a.id === transfer.refundId) a.balance = num(a.balance, 0) + transfer.refund;
    });
  }
  return cloned;
}

/*
 * Total net take-home cost of the regular contribution schedule across each owner's accumulation years.
 * Pension contributions are held gross, so they are priced at their net cost; ISA, GIA and cash are
 * already net. `rateOverride` re-prices the same year-0 amounts under a different escalation.
 */
function accumulationOutlay(rawPlan, rateOverride = null) {
  const ctx = rawPlan && rawPlan.P ? rawPlan : buildContext(rawPlan);
  const cfg = ctx.plan.config;
  let net = 0;
  ctx.owners.forEach(o => {
    const yrs = Math.max(0, o.retireAge - o.age0);
    CATEGORIES.forEach(cat => {
      const a = ctx.acc[o.ids[cat]];
      if (!a) return;
      for (let t = 0; t < yrs; t++) {
        let c;
        if (rateOverride === null) c = contribAtYear(a, t);
        else {
          const raw = a.contribByYear ? a.contribByYear[t] : a.contrib;
          // a pre-built schedule already carries the account's own escalation; strip it before re-applying
          const stripped = (a.contribByYear && a.growth > -0.999) ? raw / Math.pow(1 + a.growth, t) : raw;
          c = stripped * Math.pow(1 + rateOverride, t);
        }
        if (!(c > 0)) continue;
        net += cat === 'pen' ? netCostOfPensionContrib(c, salaryAtYear(o, t), cfg, o.selfEmployed) : c;
      }
    });
  });
  return net;
}

/*
 * Every strategy inherits the user's per-wrapper escalation, so shifting money into a faster-escalating
 * wrapper quietly raises total lifetime contributions — the tournament would then reward paying in more
 * rather than allocating better (measured at up to +44% of outlay). This solves for the single escalation
 * that holds a strategy's total net outlay equal to the current plan's, so "same take-home cost" is true
 * across the whole accumulation period and not just in year one.
 */
function solveEscalation(planState, targetOutlay, { tol = 1, maxIter = 60 } = {}) {
  // the bisection below prices the same plan ~120 times, so build its context once and reuse it:
  // rebuilding per evaluation cost ~90ms per tournament, paid on every keystroke through the preview memo
  const ctx = planState && planState.P ? planState : buildContext(planState);
  const before = accumulationOutlay(ctx);
  if (!(targetOutlay > 0) || !(before > 0)) return { rate: null, before, after: before };
  const at = (r) => accumulationOutlay(ctx, r);
  let lo = -0.9, hi = 1.0;
  // outlay rises monotonically with the escalation rate, so bisection is sound
  if (at(lo) > targetOutlay || at(hi) < targetOutlay) return { rate: null, before, after: before };
  for (let i = 0; i < maxIter; i++) {
    const mid = (lo + hi) / 2;
    const outlay = at(mid);
    if (outlay < targetOutlay) lo = mid; else hi = mid;
    if (Math.abs(outlay - targetOutlay) <= tol) { lo = hi = mid; break; }
  }
  // round to the precision the plan actually stores (0.01pp) and re-price there, so the figure reported
  // to the user is the one the projection runs on — at 0.1pp the rounding alone drifts ~0.5% of outlay
  const rate = Math.round(((lo + hi) / 2) * 10000) / 10000;
  return { rate, before, after: at(rate) };
}

// Rewrite a plan's contribution escalation to a single rate, rescaling any pre-built yearly schedule.
function applyEscalationToPlan(plan, rate) {
  const out = normalizePlan(JSON.parse(JSON.stringify(plan)));
  out.accounts.forEach(a => {
    const old = clamp(num(a.growth, 0), -100, 100) / 100;
    if (Array.isArray(a.contribByYear)) {
      a.contribByYear = a.contribByYear.map((v, t) => {
        const stripped = old > -0.999 ? v / Math.pow(1 + old, t) : v;
        return Math.round(stripped * Math.pow(1 + rate, t));
      });
      a.contrib = a.contribByYear[0] || 0;
    }
    a.growth = Math.round(rate * 10000) / 100;
  });
  return out;
}

/*
 * Reports what a tournament strategy actually changes versus the baseline plan, by diffing the two
 * plan states account by account. Figures keep their native units — pension contributions are gross,
 * ISA and GIA contributions net — so a shift of take-home from ISA to pension shows a larger rise
 * than fall, the difference being tax and NIC relief.
 */
function diffStrategyPlans(basePlan, strategyPlan, { threshold = 50 } = {}) {
  const byId = (p) => { const m = {}; (p?.accounts || []).forEach(a => { m[a.id] = a; }); return m; };
  const base = byId(basePlan), next = byId(strategyPlan);
  const contribDeltas = [], balanceDeltas = [], byCat = {};
  Object.keys(next).forEach(id => {
    const b = base[id], n = next[id];
    if (!b || !n) return;
    const [cat, ownerKey] = id.split('_');
    const from = num(b.contrib, 0), to = num(n.contrib, 0);
    const balFrom = num(b.balance, 0), balTo = num(n.balance, 0);
    const cd = to - from, bd = balTo - balFrom;
    byCat[cat] = byCat[cat] || { contrib: 0, balance: 0, owners: [] };
    if (Math.abs(cd) >= threshold) {
      contribDeltas.push({ id, cat, ownerKey, from, to, delta: cd });
      byCat[cat].contrib += cd;
      byCat[cat].owners.push(ownerKey);
    }
    if (Math.abs(bd) >= threshold) {
      balanceDeltas.push({ id, cat, ownerKey, from: balFrom, to: balTo, delta: bd });
      byCat[cat].balance += bd;
    }
  });
  return { contribDeltas, balanceDeltas, byCat, hasChange: contribDeltas.length > 0 || balanceDeltas.length > 0 };
}

/*
 * Run a searching player's candidates on one set of market paths and return the winner as an ordinary
 * strategy. Every candidate carries its own `label` and `describe`, so this knows nothing about what is
 * being searched: the Survival Maximizer varies the ISA share of the budget, Bridge-Sized Relief varies
 * how much cover the bridge is given. Sharing one resolver is what keeps the two rankings comparable.
 */
function resolveSearchPlayer(strategy, { trials = 400, seed = 12345, preAccessCap = Infinity, onCandidate = null } = {}) {
  const evaluated = strategy.candidates.map((c, i) => {
    const stats = monteCarlo(c.planState, { trials, seed });
    if (onCandidate) onCandidate(i, strategy.candidates.length, c.label, stats);
    return { ...c, stats };
  });
  const best = pickBest(evaluated, 0.5, preAccessCap);
  return {
    ...strategy,
    chosenShare: best.share, chosenLabel: best.label,
    searchAxis: strategy.searchAxis || 'Candidate',
    searchResults: evaluated.map(e => ({ label: e.label, successRate: e.stats.successRate, preAccess: e.stats.preNmpaFailRate, p10: e.stats.p10Terminal, median: e.stats.medianTerminal })),
    isaContrib: best.alloc.isaContrib, penContrib: best.alloc.penContrib, giaContrib: best.alloc.giaContrib,
    taxReliefSaved: best.alloc.taxReliefSaved + (best.reliefExtra || 0),
    transferNet: Math.round(best.transferNet || 0), transferGross: Math.round(best.transferGross || 0),
    planState: best.planState, phase: best.phase || null,
    description: best.describe || strategy.description
  };
}

/*
 * Strategy tournament — builds the six players. Every player invests the same net take-home budget.
 *   1 Current Plan            : as entered
 *   2 Survival Maximizer      : grid search over the ISA share (evaluated by the caller with common random numbers)
 *   3 Bridge-Sized Relief     : pension-first, bridge carved out at a growth-aware size, cover level searched
 *   4 Relief-First            : pension first (subject to the pre-access bridge minimum), + Bed & SIPP in full scope
 *   5 Bracket-Smoothed Sizing : pension sized so retirement withdrawals + state pension stay inside the basic band
 *   6 Relief-First, Bridge-Last: pension-max early, switch to ISA-max for the final years to build the bridge
 *
 * There used to be a sixth, Liquidity-First, which put the whole budget into ISAs. It was removed because
 * it was a duplicate rather than a strategy: its plan is byte-identical to the Survival Maximizer's
 * 100%-ISA grid point, so the search already covers that allocation and reports it in the split table.
 * Across a 106-scenario sweep it also finished last in 88 of them and never won.
 *
 * `entrants` adds saved scenarios as extra players. Those are NOT held to the baseline outlay: a saved
 * scenario differs in more than allocation, so normalising it would rewrite the thing being compared.
 * Each carries its own accumulation outlay instead, for the UI to show alongside the baseline's.
 */
function buildTournament(rawPlan, { emergencyFloor = 25000, scope = 'contributions', netBudgetOverride = null, balance = 'proportional', entrants = [] } = {}) {
  const ctx = buildContext(rawPlan);
  const plan = ctx.plan;
  const { P, owners, acc } = ctx;
  const cfg = plan.config;
  const margin = 1 + clamp(num(cfg.bridgeSafetyMargin, 30), 0, 500) / 100;

  const currentPen = owners.map(o => acc[o.ids.pen] ? acc[o.ids.pen].contrib : 0);
  const currentIsa = owners.map(o => acc[o.ids.isa] ? acc[o.ids.isa].contrib : 0);
  const currentPenNet = owners.reduce((s, o, i) => s + netCostOfPensionContrib(currentPen[i], o.salary, cfg, o.selfEmployed), 0);
  const currentIsaNet = currentIsa.reduce((a, b) => a + b, 0);
  const derivedBudget = currentIsaNet + currentPenNet;
  const netBudget = netBudgetOverride !== null && netBudgetOverride !== '' ? Math.max(0, num(netBudgetOverride, 0)) : derivedBudget;

  const liquidToday = owners.reduce((s, o) => s + ['isa', 'other', 'cash'].reduce((t, cat) => t + (acc[o.ids[cat]] ? acc[o.ids[cat]].balance : 0), 0), 0);
  const bridge = bridgeRequirement(ctx);
  const yearsToFirstRetire = Math.max(1, Math.min(...owners.map(o => o.retireAge - o.age0)));
  const bridgeCapital = bridge.gapYears > 0 ? bridge.netNeeded * margin : 0;
  const bridgeShortfall = Math.max(0, bridgeCapital - Math.max(0, liquidToday - emergencyFloor));
  const annualIsaNeeded = bridge.gapYears > 0 ? bridgeShortfall / yearsToFirstRetire : 0;

  const salaryKnown = owners.some(o => o.salary > 0);
  const meta = { netBudget, derivedBudget, bridge, bridgeCapital, bridgeShortfall, annualIsaNeeded, liquidToday, salaryKnown, yearsToFirstRetire };

  /*
   * Bed & SIPP: a one-off personal contribution funded from ISA capital that is genuinely spare. Relief at
   * source adds the basic rate inside the pension; any higher or additional-rate relief comes back as cash
   * (this route saves no NIC). `spare` is the caller's judgement of what can be moved without leaving the
   * household short, which is the only part the two players disagree about.
   */
  const bedAndSipp = (alloc, spare) => {
    if (scope !== 'full' || !(spare > 0)) return null;
    const o = owners[0];
    const isaSelfBal = acc[o.ids.isa] ? acc[o.ids.isa].balance : 0;
    const aaRoom = Math.max(0, Math.min(P.aaAt(o.salary), o.salary > 0 ? o.salary : P.pensionAllowance) - alloc.penByOwner[0]);
    const gross = Math.min(aaRoom, spare / (1 - P.reliefAtSource), isaSelfBal / (1 - P.reliefAtSource));
    if (!(gross > 250)) return null;
    const net = gross * (1 - P.reliefAtSource);
    const reliefTotal = o.salary > 0 ? incomeTax(o.salary, P) - incomeTax(Math.max(0, o.salary - gross), P) : gross * P.higherRate;
    const refund = Math.max(0, reliefTotal - gross * P.reliefAtSource);
    return { transfer: { net, gross, refund, fromId: o.ids.isa, toId: o.ids.pen, refundId: o.ids.cash }, reliefExtra: gross - net + refund };
  };

  const mk = (id, name, description, alloc, extra = {}) => ({
    id, name, description,
    isaContrib: alloc.isaContrib, penContrib: alloc.penContrib, giaContrib: alloc.giaContrib, taxReliefSaved: alloc.taxReliefSaved,
    transferNet: 0, transferGross: 0,
    planState: applyAllocationToPlan(plan, ctx, alloc, extra.planOpts || {}),
    ...extra
  });

  const strategies = [];
  // 1 baseline
  strategies.push({
    id: 'baseline', name: 'Current Plan', description: 'Your existing contribution mix and wrapper balances, unchanged.',
    isaContrib: currentIsaNet, penContrib: currentPen.reduce((a, b) => a + b, 0), giaContrib: 0,
    taxReliefSaved: Math.max(0, currentPen.reduce((a, b) => a + b, 0) - currentPenNet), transferNet: 0, transferGross: 0,
    planState: normalizePlan(JSON.parse(JSON.stringify(plan)))
  });
  // 2 survival maximizer: candidate grid, chosen by the caller
  const grid = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0].map(share => {
    const alloc = allocateBudget(ctx, netBudget, share, { balance });
    return {
      share, alloc, label: `${Math.round(share * 100)}% ISA`,
      describe: `Searched every ISA/pension split of the same budget; best survival at ${Math.round(share * 100)}% ISA / ${Math.round((1 - share) * 100)}% pension (net budget).`,
      planState: applyAllocationToPlan(plan, ctx, alloc)
    };
  });
  strategies.push({
    id: 'survival', name: 'Survival Maximizer', searchAxis: 'ISA share',
    description: 'Searches every ISA/pension split of the same budget (0%–100% in 10% steps) and keeps the split with the highest survival rate, tie-broken by the 10th-percentile pot.',
    candidates: grid, isaContrib: null, penContrib: null, taxReliefSaved: null, transferNet: 0, transferGross: 0, planState: null
  });
  /*
   * 3 bridge-sized relief. Relief-First's weakness is the one number it cannot get right: how much of the
   * budget the pre-access bridge really needs. It sizes that at 0% real growth and then spreads it over
   * every year to retirement, which on a twenty-year run asks for several times more ISA than the bridge
   * will ever use, and pays for it out of pension relief. Taken to the other extreme, funding no bridge at
   * all can cost seven points of survival.
   *
   * So this player does not pick a number. It works out the growth-aware requirement, then puts a handful
   * of cover levels around it through the simulation and keeps whichever actually survives best, on the
   * same paths as everyone else. The back-loaded candidates pay the bridge money in over the final years
   * only, so the pension compounds alone for longer first.
   */
  {
    // Multiples of the bridge target, which already carries the Config safety margin, so 1.0x is
    // "exactly what Config asks for" and the rest bracket it either side.
    const cover = [0, 0.75, 1.0, 1.35, 1.8, 2.4];
    const lateYears = Math.max(1, Math.ceil(yearsToFirstRetire / 2));
    const canBackLoad = bridge.gapYears > 0 && lateYears < yearsToFirstRetire;
    const candidates = [];
    /*
     * Capital that can be moved into the pension today without stranding the bridge. Relief-First only
     * attempts this when there is no gap at all; knowing the size of the bridge means this player can
     * reserve exactly what the gap needs and still move the rest. `target` is the requirement measured at
     * the retirement date, so it is discounted back before being held out of today's balances.
     */
    const spareForSipp = (sized) => {
      const g = sized.bridge.rate;
      const reserved = sized.target > 0 ? sized.target / Math.pow(1 + g, sized.yearsToRetire || yearsToFirstRetire) : 0;
      return Math.max(0, liquidToday - emergencyFloor - reserved);
    };
    const pushLevel = (m) => {
      const sized = bridgeIsaAnnual(ctx, { emergencyFloor, margin: m * margin });
      const alloc = allocateBudget(ctx, netBudget, 0, { isaMin: sized.annual, balance });
      const bs = bedAndSipp(alloc, spareForSipp(sized));
      candidates.push({
        share: null, cover: m, label: m === 0 ? 'No bridge' : `${m.toFixed(2).replace(/0$/, '')}x level`, alloc, sized,
        transferNet: bs ? bs.transfer.net : 0, transferGross: bs ? bs.transfer.gross : 0, reliefExtra: bs ? bs.reliefExtra : 0,
        describe: (m === 0
          ? 'Everything to the pension, with nothing set aside for the bridge: on these paths that survived better than funding one.'
          : `Everything to the pension except the bridge, sized at ${m.toFixed(2).replace(/0$/, '')}x the growth-adjusted target (${formatGBP(sized.annual)}/yr to the ISA) and paid in level over ${sized.years} years.`)
          + (bs ? ` Spare ISA capital above the bridge reserve is moved into the pension as well.` : ''),
        planState: applyAllocationToPlan(plan, ctx, alloc, bs ? { transfer: bs.transfer } : {})
      });
    };
    const pushLate = (m) => {
      const sized = bridgeIsaAnnual(ctx, { emergencyFloor, margin: m * margin, overYears: lateYears });
      const early = allocateBudget(ctx, netBudget, 0, { balance });
      const late = allocateBudget(ctx, netBudget, 0, { isaMin: sized.annual, balance });
      const contribByYear = {};
      const horizon = ctx.totalYears + 1;
      const switchAt = yearsToFirstRetire - lateYears;
      owners.forEach((o, i) => {
        const penArr = [], isaArr = [];
        const gPen = acc[o.ids.pen] ? acc[o.ids.pen].growth : 0, gIsa = acc[o.ids.isa] ? acc[o.ids.isa].growth : 0;
        for (let t = 0; t < horizon; t++) {
          const src = t >= switchAt ? late : early;
          penArr.push(src.penByOwner[i] * Math.pow(1 + gPen, t));
          isaArr.push(src.isaByOwner[i] * Math.pow(1 + gIsa, t));
        }
        contribByYear[o.ids.pen] = penArr; contribByYear[o.ids.isa] = isaArr;
      });
      const bs = bedAndSipp(late, spareForSipp(sized));
      candidates.push({
        share: null, cover: m, label: `${m.toFixed(2).replace(/0$/, '')}x last ${lateYears}y`, alloc: late, sized,
        phase: { switchYears: lateYears, yearsToFirstRetire, early, late },
        transferNet: bs ? bs.transfer.net : 0, transferGross: bs ? bs.transfer.gross : 0, reliefExtra: bs ? bs.reliefExtra : 0,
        describe: `Pension-max for ${switchAt} year${switchAt === 1 ? '' : 's'}, then ${formatGBP(sized.annual)}/yr to the ISA over the final ${lateYears} to build the bridge, sized at ${m.toFixed(2).replace(/0$/, '')}x the growth-adjusted target.`
          + (bs ? ' Spare ISA capital above the bridge reserve is moved into the pension as well.' : ''),
        planState: applyAllocationToPlan(plan, ctx, late, bs ? { contribByYear, transfer: bs.transfer } : { contribByYear })
      });
    };
    if (bridge.gapYears > 0) {
      cover.forEach(pushLevel);
      if (canBackLoad) [1.0, 1.35, 1.8].forEach(pushLate);
    } else {
      pushLevel(0);
      candidates[0].describe = 'No pre-SIPP access gap to bridge, so there is nothing to size and the whole budget goes to the pension.';
    }
    strategies.push({
      id: 'bridged', name: 'Bridge-Sized Relief', searchAxis: 'Bridge cover',
      description: 'Pension-first, with only the bridge carved out. The requirement is worked out with growth counted on both what you already hold and what you add, then a range of cover levels is run through the simulation and the best-surviving one kept.',
      candidates, isaContrib: null, penContrib: null, taxReliefSaved: null, transferNet: 0, transferGross: 0, planState: null
    });
  }
  // 4 relief-first (+ bed & SIPP)
  {
    const alloc = allocateBudget(ctx, netBudget, 0, { isaMin: annualIsaNeeded, balance });
    // This player only reaches for the transfer when there is no bridge to strand, so all spare liquid
    // capital is fair game. Bridge-Sized Relief reserves the bridge and moves whatever is left over.
    const bs = bridge.gapYears === 0 ? bedAndSipp(alloc, Math.max(0, liquidToday - emergencyFloor)) : null;
    const transfer = bs ? bs.transfer : null;
    const reliefExtra = bs ? bs.reliefExtra : 0;
    strategies.push(mk('relief', 'Relief-First' + (transfer ? ' + Bed & SIPP' : ''),
      `Routes the budget to pension first (subject to the pre-SIPP access bridge minimum) to capture maximum upfront ${owners.every(o => o.selfEmployed) ? 'tax relief' : 'tax and NIC relief'}` + (transfer ? '; also moves spare ISA capital into the pension.' : '.'),
      alloc, { transferNet: transfer ? Math.round(transfer.net) : 0, transferGross: transfer ? Math.round(transfer.gross) : 0, taxReliefSaved: alloc.taxReliefSaved + reliefExtra, planOpts: { transfer } }));
  }
  // 5 bracket-smoothed pension sizing
  {
    const penFloor = owners.map(o => {
      const a = acc[o.ids.pen]; if (!a) return 0;
      const accessAge = Math.max(o.retireAge, ctx.nmpa);
      const drawYears = Math.max(1, ctx.terminalAge - accessAge);
      const guaranteedTaxable = o.statePension + ctx.otherIncomes.filter(i => i.owner === o.key && !i.taxFree).reduce((s, i) => s + i.amount, 0);
      const taxableRoom = Math.max(0, P.higherRateStartsAt - guaranteedTaxable);
      const grossWithdrawal = taxableRoom / Math.max(0.01, 1 - P.pclsProp);
      const targetPot = grossWithdrawal * annuityFactor(a.real, drawYears);
      const yrs = Math.max(0, o.retireAge - o.age0);
      const fvBalance = a.balance * Math.pow(1 + a.real, yrs);
      const need = Math.max(0, targetPot - fvBalance);
      const fvPerPound = fvContribStream(1, a.real, a.growth, yrs);
      return fvPerPound > 0 ? need / fvPerPound : 0;
    });
    const alloc = allocateBudget(ctx, netBudget, 0, { isaMin: annualIsaNeeded, balance, penFloorGross: penFloor });
    strategies.push(mk('bracket', 'Bracket-Smoothed Sizing',
      'Funds each pension only up to the pot whose sustainable withdrawal, alongside state pension, fills the basic-rate band; everything else goes to ISA so later-life withdrawals never hit 40%.',
      alloc, { penTargetGross: penFloor }));
  }
  // 6 relief-first, bridge-last (time-phased)
  {
    const reliefAlloc = allocateBudget(ctx, netBudget, 0, { balance });
    const isaAlloc = allocateBudget(ctx, netBudget, 1.0, { balance });
    const switchYears = bridge.gapYears > 0 && isaAlloc.isaContrib > 0 ? Math.min(yearsToFirstRetire, Math.ceil(bridgeShortfall / isaAlloc.isaContrib)) : 0;
    const contribByYear = {};
    const horizon = ctx.totalYears + 1;
    owners.forEach((o, i) => {
      const penArr = [], isaArr = [];
      const gPen = acc[o.ids.pen] ? acc[o.ids.pen].growth : 0, gIsa = acc[o.ids.isa] ? acc[o.ids.isa].growth : 0;
      for (let t = 0; t < horizon; t++) {
        const late = t >= yearsToFirstRetire - switchYears;
        penArr.push((late ? isaAlloc.penByOwner[i] : reliefAlloc.penByOwner[i]) * Math.pow(1 + gPen, t));
        isaArr.push((late ? isaAlloc.isaByOwner[i] : reliefAlloc.isaByOwner[i]) * Math.pow(1 + gIsa, t));
      }
      contribByYear[o.ids.pen] = penArr; contribByYear[o.ids.isa] = isaArr;
    });
    const blended = {
      isaContrib: switchYears > 0 ? (reliefAlloc.isaContrib * (yearsToFirstRetire - switchYears) + isaAlloc.isaContrib * switchYears) / yearsToFirstRetire : reliefAlloc.isaContrib,
      penContrib: switchYears > 0 ? (reliefAlloc.penContrib * (yearsToFirstRetire - switchYears) + isaAlloc.penContrib * switchYears) / yearsToFirstRetire : reliefAlloc.penContrib,
      giaContrib: Math.max(reliefAlloc.giaContrib, isaAlloc.giaContrib), taxReliefSaved: switchYears > 0 ? (reliefAlloc.taxReliefSaved * (yearsToFirstRetire - switchYears) + isaAlloc.taxReliefSaved * switchYears) / yearsToFirstRetire : reliefAlloc.taxReliefSaved,
      isaByOwner: reliefAlloc.isaByOwner, penByOwner: reliefAlloc.penByOwner
    };
    strategies.push(mk('phased', 'Relief-First, Bridge-Last',
      switchYears > 0
        ? `Pension-max for ${yearsToFirstRetire - switchYears} years so the tax uplift compounds longest, then ISA-max for the final ${switchYears} years to build the pre-SIPP access bridge.`
        : bridge.gapYears > 0
          ? 'Existing liquid assets already cover the bridge reserve, so this collapses to Relief-First (shown for completeness).'
          : 'No pre-SIPP access gap, so this collapses to Relief-First (shown for completeness).',
      blended, { phase: { switchYears, yearsToFirstRetire, early: reliefAlloc, late: isaAlloc }, planOpts: { contribByYear } }));
  }

  // Hold every player to the baseline's total accumulation outlay. Without this, reallocating towards a
  // faster-escalating wrapper compounds a bigger base and the strategy wins by spending more, not by
  // allocating better — so the "same take-home budget" the tournament advertises only held in year one.
  const baselineOutlay = accumulationOutlay(ctx);
  meta.baselineOutlay = baselineOutlay;
  const normalise = (planState) => {
    const solved = solveEscalation(planState, baselineOutlay);
    if (solved.rate === null) return { planState, escalation: null };
    return {
      planState: applyEscalationToPlan(planState, solved.rate),
      escalation: { rate: solved.rate, before: solved.before, after: solved.after, target: baselineOutlay }
    };
  };
  strategies.forEach(s => {
    if (s.id === 'baseline') return;
    if (s.candidates) { s.candidates = s.candidates.map(c => ({ ...c, ...normalise(c.planState) })); return; }
    if (s.planState) Object.assign(s, normalise(s.planState));
  });

  // Saved scenarios enter after the normalisation above, deliberately: they run exactly as saved.
  entrants.forEach((ent, i) => {
    let entPlan, outlay = null;
    try { entPlan = normalizePlan(JSON.parse(JSON.stringify(ent.plan))); } catch (e) { return; }
    try { outlay = accumulationOutlay(buildContext(entPlan)); } catch (e) { outlay = null; }
    const entCouple = entPlan.demographics.planningMode === 'couple';
    const sumCat = (cat) => entPlan.accounts
      .filter(a => a.id.startsWith(cat + '_') && (entCouple || a.owner === 'Myself'))
      .reduce((t, a) => t + num(a.contrib, 0), 0);
    strategies.push({
      id: `entrant_${ent.id || i}`, name: ent.name || `Scenario ${i + 1}`, isEntrant: true,
      description: 'A saved scenario, run exactly as saved. It is not held to the same take-home budget as the other players, so read its outlay before its survival rate.',
      entrantOutlay: outlay, baselineOutlay,
      isaContrib: sumCat('isa'), penContrib: sumCat('pen'), giaContrib: sumCat('other'),
      taxReliefSaved: null, transferNet: 0, transferGross: 0, escalation: null,
      planState: entPlan
    });
  });
  return { ctx, meta, strategies };
}

/*
 * Every meaningful combination of the three decumulation methodology settings, each as a ready-to-run
 * plan. The harvest flag only takes effect on policies that declare `harvest`, so policies that ignore it
 * (Sequential) emit a single variant instead of a duplicate pair that would waste a simulation and
 * show up as a phantom tie.
 */
function buildPolicyCandidates(rawPlan) {
  const plan = normalizePlan(rawPlan);
  const out = [];
  Object.entries(DECUMULATION_POLICIES).forEach(([policyKey, policy]) => {
    ['Phased Drawdown', 'Full 25% Lump Sum'].forEach(drawdownStrategy => {
      // harvest-off first so that an exact tie leaves the simpler setting alone rather than
      // switching on a behaviour that showed no measured benefit
      (policy.harvest ? [false, true] : [false]).forEach(harvest => {
        out.push({
          id: `${policyKey}|${drawdownStrategy}|${harvest ? 'h1' : 'h0'}`,
          decumulationPolicy: policyKey,
          drawdownStrategy,
          harvestPersonalAllowance: harvest,
          harvestApplies: !!policy.harvest,
          planState: {
            ...plan,
            spending: { ...plan.spending, decumulationPolicy: policyKey, drawdownStrategy },
            config: { ...plan.config, harvestPersonalAllowance: harvest }
          }
        });
      });
    });
  });
  return out;
}

// Pick the best candidate: respect the pre-access risk cap where possible, then highest success (within noise),
// then 10th-percentile pot, then median.
function pickBest(cands, tol = 0.5, preAccessCap = Infinity) {
  const eligible = cands.filter(c => c.stats.preNmpaFailRate <= preAccessCap);
  // if nothing meets the cap, fall back to the lowest achievable bridge risk rather than ignoring the cap
  const minPre = Math.min(...cands.map(c => c.stats.preNmpaFailRate));
  const pool = eligible.length ? eligible : cands.filter(c => c.stats.preNmpaFailRate <= minPre + tol);
  const best = Math.max(...pool.map(c => c.stats.successRate));
  const top = pool.filter(c => c.stats.successRate >= best - tol);
  // Break near-ties on the pot left AFTER pension death tax. With no death tax set the net and gross
  // figures are identical, so this is inert; where one is set it is the only way choices that differ
  // solely in what they leave behind — allowance harvesting above all — are visible to the ranking.
  const p10 = (c) => (c.stats.p10TerminalNet ?? c.stats.p10Terminal);
  const median = (c) => (c.stats.medianTerminalNet ?? c.stats.medianTerminal);
  top.sort((a, b) => (p10(b) - p10(a)) || (median(b) - median(a)));
  return top[0];
}

// Namespace used by the UI (mirrors the modular engine.js exports)
const E = { num, clamp, isBlank, round250, HISTORICAL_DATA, HISTORICAL_FIRST_YEAR, HISTORICAL_LAST_YEAR, getHistoricalPoint, RISK_EQUITY_WEIGHTS, DEFAULT_RISK_PROFILES, CMA_PRESETS, applyCmaPreset, realFromNominal, luckyBand, OWNERS, OWNER_LABEL, CATEGORIES, CATEGORY_LABEL, accountId, DEFAULT_CONFIG, BLANK_PLAN, DECUMULATION_POLICIES, todayISO, calculateYearFraction, normalizePlan, taxParams, incomeTax, marginalRateAt, taxBreakpoints, TAX_REGION_LABELS, calculateUKNetIncome, nicFor, calculateUKTaxAndNIC, calculateMarginalRelief, netCostOfPensionContrib, grossUpNet, grossUpNetIncremental, grossPensionNeededForNet, mulberry32, gaussianPath, buildContext, spendTargetAtAge, freshState, stepYear, simulateDeterministic, simulateHistorical, FAIL_TOLERANCE, evaluateRows, runTrial, pathsForSeed, summarizeTrials, monteCarlo, optimizeSpend, annuityFactor, fvContribStream, bridgeRequirement, contribAtYear, salaryAtYear, relevantEarningsAtYear, mpaaAppliesAtYear, carryForwardAtYear, resolveMpaa, wrapperHeadroomAtYear, INCOME_TYPES, incomeTypeOf, allocateBudget, applyAllocationToPlan, accumulationOutlay, solveEscalation, applyEscalationToPlan, diffStrategyPlans, resolveSearchPlayer, bridgeIsaAnnual, liquidRealRate, buildTournament, buildPolicyCandidates, pickBest };
export { HISTORICAL_DATA, RISK_EQUITY_WEIGHTS, getHistoricalPoint, DEFAULT_RISK_PROFILES, CMA_PRESETS, applyCmaPreset, realFromNominal, luckyBand, calculateUKTaxAndNIC, calculateMarginalRelief, grossUpNet, normalizePlan, buildContext, simulateDeterministic, simulateHistorical, monteCarlo, optimizeSpend, buildTournament, diffStrategyPlans, buildPolicyCandidates, pickBest, accumulationOutlay, solveEscalation, applyEscalationToPlan };


const STORAGE_KEY = 'rp_plan_full_v28';          // unchanged: old saved plans are migrated by normalizePlan
const SCENARIOS_STORAGE_KEY = 'rp_saved_scenarios_v3';
const THEME_STORAGE_KEY = 'rp_theme_v1';
const APP_VERSION = 'v3.4';
const MC_TRIALS = 5000;
const TOURNAMENT_TRIALS = 1500;
const SEARCH_TRIALS = 400;

// Three themes: 'classic' (the original stock look, kept as an opt-in third option),
// 'light' (Riviera Ledger) and 'dark' (Control Room).
const SERIES_CONFIG = [
  { id: 'expected', label: 'Expected (Real)', colors: { classic: '#2563eb', light: '#2C5C8F', dark: '#3D74E8' }, strokeWidth: 3, dash: 'none', defaultActive: true },
  { id: 'nominal', label: 'Combined (Nominal)', colors: { classic: '#7c3aed', light: '#6D28D9', dark: '#8B7CF6' }, strokeWidth: 2, dash: '4,3', defaultActive: false },
  { id: 'pensions', label: 'Combined Pensions', colors: { classic: '#0284c7', light: '#0284C7', dark: '#4FC3F0' }, strokeWidth: 2, dash: 'none', defaultActive: true },
  { id: 'isas', label: 'Combined ISAs', colors: { classic: '#0d9488', light: '#0D9488', dark: '#3FDBC7' }, strokeWidth: 2, dash: 'none', defaultActive: true },
  { id: 'other', label: 'Combined Other', colors: { classic: '#d97706', light: '#B0631E', dark: '#E89A4A' }, strokeWidth: 1.5, dash: 'none', defaultActive: false },
  { id: 'cash', label: 'Combined Cash', colors: { classic: '#475569', light: '#5C6B72', dark: '#8A939B' }, strokeWidth: 1.5, dash: '3,3', defaultActive: false }
];

const CHART_PALETTE = {
  classic: { gridMajor: '#f1f5f9', gridMinor: '#f8fafc', axisText: '#64748b', hoverCrosshair: '#94a3b8', sandboxDash: '#f59e0b', historicalLine: '#6366f1', trajectoryHoverFill: '#2563eb', historicalHoverFill: '#6366f1', hoverDotStroke: '#ffffff', fanBand: 'rgba(37, 99, 235, 0.16)', fanEdge: 'rgba(37, 99, 235, 0.45)', fanMedian: '#1d4ed8' },
  light:   { gridMajor: '#DCDFD2', gridMinor: '#E6E8DE', axisText: '#5C6B72', hoverCrosshair: '#8A9098', sandboxDash: '#B0631E', historicalLine: '#A9781F', trajectoryHoverFill: '#2C5C8F', historicalHoverFill: '#A9781F', hoverDotStroke: '#FBFAF4', fanBand: 'rgba(44, 92, 143, 0.18)', fanEdge: 'rgba(44, 92, 143, 0.5)', fanMedian: '#2C5C8F' },
  dark:    { gridMajor: '#1e232b', gridMinor: '#171b21', axisText: '#8a939b', hoverCrosshair: '#5b636c', sandboxDash: '#e89a4a', historicalLine: '#8b7cf6', trajectoryHoverFill: '#3D74E8', historicalHoverFill: '#8b7cf6', hoverDotStroke: '#14171B', fanBand: 'rgba(61, 116, 232, 0.22)', fanEdge: 'rgba(61, 116, 232, 0.55)', fanMedian: '#6F9BFF' },
};

/*
 * Colours for scenarios overlaid on the Trajectory chart. Deliberately clear of the six SERIES_CONFIG
 * hues and of the amber sandbox dash, since all of them can be on screen at once: the three series that
 * default to on are blue, sky and teal, so these are pink, olive, red and purple.
 */
const COMPARE_PALETTE = {
  classic: ['#db2777', '#65a30d', '#b91c1c', '#6b21a8'],
  light: ['#A63D5E', '#5F7A28', '#99342B', '#6B4A8A'],
  dark: ['#F472B6', '#A3D65C', '#F87171', '#C084FC'],
};
const MAX_COMPARE = 4;

const MARKER_PALETTE = {
  classic: {
    retireSelf: { line: '#f59e0b', fill: '#fef3c7', stroke: '#fde68a', text: '#b45309' },
    retirePart: { line: '#d97706', fill: '#fef3c7', stroke: '#fde68a', text: '#b45309' },
    nmpa: { line: '#0284c7', fill: '#e0f2fe', stroke: '#bae6fd', text: '#0369a1' },
    statePension: { line: '#059669', fill: '#d1fae5', stroke: '#a7f3d0', text: '#065f46' },
  },
  light: {
    retireSelf: { line: '#A9781F', fill: '#F3E9CE', stroke: '#D9C48A', text: '#6B4E12' },
    retirePart: { line: '#855D18', fill: '#F3E9CE', stroke: '#D9C48A', text: '#6B4E12' },
    nmpa: { line: '#2C5C8F', fill: '#DCE6EF', stroke: '#AFC2D6', text: '#1B3A57' },
    statePension: { line: '#2F7A4F', fill: '#DCEEE1', stroke: '#A9D3B8', text: '#1F5636' },
  },
  dark: {
    retireSelf: { line: '#D4A537', fill: '#2E2209', stroke: '#47350D', text: '#F5DFA9' },
    retirePart: { line: '#E2BC5E', fill: '#2E2209', stroke: '#47350D', text: '#F5DFA9' },
    nmpa: { line: '#3D74E8', fill: '#16233A', stroke: '#223756', text: '#B9D3FF' },
    statePension: { line: '#3FD68C', fill: '#0F2E20', stroke: '#17472F', text: '#A3EBC7' },
  },
};

const HISTORICAL_PRESETS = [
  { label: '1929 Crash (Great Depression)', year: 1929 },
  { label: '1945 Post-War', year: 1945 },
  { label: '1955 Mid-Century', year: 1955 },
  { label: '1965 Stagflation', year: 1965 },
  { label: '1973 Oil Shock', year: 1973 },
  { label: '2000 Dot-Com Bust', year: 2000 },
  { label: '2008 Global Financial Crisis', year: 2008 }
];

const fmtK = (v) => `£${Math.round((Number.isFinite(v) ? v : 0) / 1000).toLocaleString()}k`;
const parseInputNumber = (val) => {
  if (val === '' || val === null || val === undefined) return '';
  return String(val).replace(/^0+(?=\d)/, '');
};
const tick = () => new Promise(r => setTimeout(r, 0));
const clone = (o) => JSON.parse(JSON.stringify(o));
const safeStorageGet = (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } };
const safeStorageSet = (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* quota / private mode */ } };
const safeStorageRemove = (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } };

// Chunked Monte Carlo so the UI can repaint a progress bar between batches.
// `shouldStop` is checked between chunks, so a cancel lands within a chunk rather than at the end of the
// run. The partial result is still summarised and returned, because the caller discards it either way.
async function runMonteCarloAsync(ctx, { trials, seed, spendOverride = null, onProgress, shouldStop = null, collectPaths = false }) {
  const paths = E.pathsForSeed(seed, trials, ctx.totalYears);
  const results = [];
  const CHUNK = 250;
  for (let i = 0; i < trials; i += CHUNK) {
    const end = Math.min(trials, i + CHUNK);
    for (let j = i; j < end; j++) results.push(E.runTrial(ctx, paths[j], spendOverride, collectPaths));
    if (onProgress) onProgress(results.length / trials);
    await tick();
    if (shouldStop && shouldStop()) break;
  }
  return { ...E.summarizeTrials(results), spend: spendOverride !== null ? spendOverride : ctx.targetSpend };
}

const inputCls = 'w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:bg-surface focus:ring-2 focus:ring-blue-500 focus:outline-none';
const smallInputCls = 'w-full p-2 bg-slate-50 border border-slate-300 rounded font-bold text-slate-900 focus:bg-surface focus:ring-2 focus:ring-blue-500 focus:outline-none';

function ProgressBar({ value, label }) {
  return (
    <div className="w-full">
      <div className="flex justify-between text-[10px] text-slate-500 mb-1"><span>{label}</span><span>{Math.round(value * 100)}%</span></div>
      <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-indigo-600 transition-all" style={{ width: `${Math.round(value * 100)}%` }} />
      </div>
    </div>
  );
}

/*
 * Pencil-sketch motifs for the landing page. Drawn as open paths rather than primitives so the strokes
 * wobble, overshoot their corners and double back the way a pencil line does — an <ellipse> would read as
 * a diagram. They inherit `currentColor` so each theme tints them, and are decorative only (aria-hidden).
 */
function SketchCards({ className = '' }) {
  // Card faces are filled with the page surface so a fanned card hides the one behind it. The fade comes
  // from the caller's text colour (currentColor carries its own alpha), not from group opacity, which
  // would make the fills translucent and lose the occlusion.
  const face = 'rgb(var(--surface))';
  return (
    <svg viewBox="0 0 150 125" className={className} fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {/* back card, fanned left */}
      <g transform="rotate(-19 55 72)">
        <path fill={face} d="M27 32 Q48 29 70 28 Q73 29 73 33 L76 97 Q76 101 72 101 Q50 104 30 104 Q26 104 26 100 L24 36 Q24 32 27 32" />
        {/* diamond */}
        <path d="M43 51 L50 40 L57 52 L49 62 Z" strokeOpacity="0.8" />
      </g>
      {/* middle card */}
      <g transform="rotate(-5 76 68)">
        <path fill={face} d="M55 24 Q77 22 99 23 Q102 23 102 27 Q103 60 103 94 Q103 98 99 98 Q77 100 56 99 Q52 99 52 95 Q51 61 51 28 Q51 24 55 24" />
        {/* club: three lobes and a flared stem */}
        <path d="M77 40 q7 0 7 6 q0 5 -6 6 q7 -2 9 4 q2 6 -3 8 q-5 2 -7 -4 q-2 6 -7 4 q-5 -2 -3 -8 q2 -6 9 -4 q-6 -1 -6 -6 q0 -6 7 -6" />
        <path d="M77 64 q-1 5 -5 8 q5 -2 10 0 q-4 -3 -5 -8" />
      </g>
      {/* front card, fanned right, with a second searching stroke down its long edge */}
      <g transform="rotate(15 101 66)">
        <path fill={face} d="M84 19 Q106 20 127 23 Q131 24 130 28 Q128 60 125 93 Q124 97 120 96 Q99 94 79 93 Q75 92 76 88 Q79 55 81 23 Q81 19 84 19" />
        <path d="M86 21 Q105 22 125 25" strokeOpacity="0.35" />
        {/* spade */}
        <path d="M104 41 Q96 50 93 55 q-4 6 1 9 q5 3 9 -3 q4 6 9 3 q5 -3 1 -9 Q110 50 104 41" />
        <path d="M104 62 q-1 6 -5 9 q5 -2 10 0 q-4 -3 -5 -9" />
      </g>
    </svg>
  );
}
// True when the browser is set to reduce motion, so the decorative animations can sit still.
function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return reduced;
}

function SketchRoulette({ className = '', spin = false }) {
  const still = usePrefersReducedMotion();
  const live = spin && !still;
  // The wheel is drawn in perspective, so the spokes are squashed about the centre (85, 56) and the
  // rotation happens inside that squash: turning first and flattening second is what a real wheel does.
  // The ball runs the other way round an ellipse of its own, the way it does before it drops.
  return (
    <svg viewBox="0 0 170 130" className={className} fill="none" stroke="currentColor" strokeWidth="1.5"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {/* outer rim: an open path that overshoots where it closes, so the line looks drawn round once */}
      <path d="M87 27 Q133 28 136 56 Q137 82 85 85 Q33 85 32 57 Q32 30 84 27 Q99 27 108 29" />
      {/* the depth of the bowl, and a lighter repeat of the near edge */}
      <path d="M32 58 Q34 74 85 76 Q136 75 136 57" opacity="0.55" />
      <path d="M35 61 Q40 74 85 77" opacity="0.3" />
      {/* inner track and hub */}
      <path d="M85 37 Q122 38 123 56 Q123 73 84 74 Q46 74 46 57 Q46 39 84 37" opacity="0.7" />
      <path d="M85 50 q13 0 13 6 q0 6 -13 6 q-13 0 -13 -6 q0 -6 13 -6" />
      {/* spokes, drawn unevenly, turning as one */}
      <g transform="translate(85 56) scale(1 0.487) translate(-85 -56)" strokeWidth="2.2">
        {live && <animateTransform attributeName="transform" type="rotate" additive="sum"
          from="0 85 56" to="360 85 56" dur="5.2s" repeatCount="indefinite" />}
        <path d="M98 56 L121 56 M85 69 L85 92 M72 56 L49 56 M85 43 L85 20" opacity="0.6" />
        <path d="M94.9 65.9 L109 80 M75.1 65.9 L61 80 M75.1 46.1 L61 32 M94.9 46.1 L109 32" opacity="0.35" />
      </g>
      {/* the ball, with a scuff of motion behind it */}
      <g transform={live ? undefined : 'translate(110 47)'}>
        {live && <animateMotion dur="2.3s" repeatCount="indefinite" rotate="auto"
          path="M130 56 A45 22 0 1 0 40 56 A45 22 0 1 0 130 56" />}
        <g>
          {live && <animateTransform attributeName="transform" type="translate" additive="sum"
            values="0 0; 0.8 -0.6; -0.5 0.9; 0.9 0.4; -0.4 -0.7; 0 0" dur="0.55s" repeatCount="indefinite" />}
          <path d="M0 -3.5 q4.6 -0.5 4.6 3.5 q0 4 -4.6 4 q-4.6 0 -4.6 -4 q0 -4 4.6 -3.5" />
          <path d="M-11 -2 q6 -2.5 11 -1.5" opacity="0.45" />
        </g>
      </g>
      {/* a corner of the betting layout, ruled by hand */}
      <g opacity="0.45" transform="translate(8 95)">
        <path d="M2 2 Q78 3 152 5" />
        <path d="M2 2 Q1 15 0 28 M40 3 L37 29 M78 4 L76 30 M115 4 L114 30 M152 5 L151 31" />
        <path d="M0 28 Q76 30 151 31" />
      </g>
    </svg>
  );
}

function WarningsBanner({ warnings }) {
  if (!warnings || !warnings.length) return null;
  return (
    <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-900 space-y-1">
      <div className="flex items-center gap-2 font-bold"><AlertTriangle className="w-4 h-4 text-amber-600" /> Inputs the engine is substituting or flagging</div>
      <ul className="list-disc pl-5 space-y-0.5">
        {warnings.map((w, i) => <li key={i}>{w}</li>)}
      </ul>
    </div>
  );
}

// ---------------------------------------------------------------- Strategy tournament
const WRAPPER_WORD = { pen: 'pension', isa: 'S&S ISA', other: 'GIA', cash: 'cash' };
const joinClauses = (parts) => parts.length <= 1 ? (parts[0] || '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`;
const sentenceCase = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;

/*
 * Plain-English description of what a tournament strategy moves relative to the current plan.
 * Every strategy spends the same net budget, so the reconciliation clause matters: pension figures
 * are gross and ISA figures net, which is why the rise and the fall do not match pound for pound.
 */
function summarizeStrategyChange(res, baselinePlayer, { isCouple = false, meta = null, threshold = 50, selfEmployedOnly = false } = {}) {
  // the self-employed get income tax relief only, so calling it NIC relief would be wrong for them
  const reliefWord = selfEmployedOnly ? 'tax relief' : 'tax and NIC relief';
  if (!res) return [];
  if (res.id === 'baseline') return ['Your plan exactly as entered: the benchmark every other strategy is measured against.'];
  // A saved scenario can differ in spend, ages and balances as well as contributions, so a contribution
  // diff would describe only part of it. Name what actually differs, and lead with the budget.
  if (res.isEntrant) {
    const lines = [];
    const a = baselinePlayer?.planState, b = res.planState;
    if (res.entrantOutlay !== null && res.entrantOutlay !== undefined && res.baselineOutlay > 0) {
      const d = res.entrantOutlay - res.baselineOutlay;
      lines.push(Math.abs(d) < 50
        ? `Costs the same to fund as your current plan, about ${formatGBP(res.entrantOutlay)}/yr, so this is a like-for-like comparison.`
        : `Costs ${formatGBP(Math.abs(d))}/yr ${d > 0 ? 'more' : 'less'} to fund than your current plan (${formatGBP(res.entrantOutlay)}/yr against ${formatGBP(res.baselineOutlay)}/yr), so the survival rate is not like-for-like.`);
    }
    if (a && b) {
      const diffs = [];
      const dA = a.demographics, dB = b.demographics;
      if (E.num(dA.retireAgeSelf, 0) !== E.num(dB.retireAgeSelf, 0)) diffs.push(`retires at ${E.num(dB.retireAgeSelf, 0)} rather than ${E.num(dA.retireAgeSelf, 0)}`);
      if (E.num(a.spending.targetSpend, 0) !== E.num(b.spending.targetSpend, 0)) diffs.push(`spends ${formatGBP(E.num(b.spending.targetSpend, 0))}/yr rather than ${formatGBP(E.num(a.spending.targetSpend, 0))}`);
      if (E.num(dA.terminalAge, 0) !== E.num(dB.terminalAge, 0)) diffs.push(`runs to age ${E.num(dB.terminalAge, 0)} rather than ${E.num(dA.terminalAge, 0)}`);
      const balA = (a.accounts || []).reduce((t, x) => t + E.num(x.balance, 0), 0);
      const balB = (b.accounts || []).reduce((t, x) => t + E.num(x.balance, 0), 0);
      if (Math.abs(balB - balA) > 500) diffs.push(`starts with ${formatGBP(balB)} rather than ${formatGBP(balA)}`);
      if (diffs.length) lines.push(`It also ${diffs.join(', ')}.`);
    }
    return lines;
  }
  if (!res.planState || !baselinePlayer?.planState) return [];
  const diff = E.diffStrategyPlans(baselinePlayer.planState, res.planState, { threshold });
  const lines = [];
  const plural = (n) => n === 1 ? '' : 's';

  // one-off capital move (Bed & SIPP): its relief is bundled into taxReliefSaved, so it has to come
  // back out before the annual figure can be quoted as a per-year number
  const src = diff.balanceDeltas.find(d => d.delta < 0);
  const dest = diff.balanceDeltas.find(d => d.delta > 0 && d.cat !== 'cash');
  const refund = diff.balanceDeltas.find(d => d.cat === 'cash' && d.delta > 0);
  const oneOffRelief = (src && dest) ? (dest.delta - Math.abs(src.delta) + (refund ? refund.delta : 0)) : 0;

  const earlyYears = res.phase ? res.phase.yearsToFirstRetire - res.phase.switchYears : 0;
  if (res.phase && res.phase.switchYears > 0 && earlyYears > 0) {
    // contrib on the plan holds year-1 (early phase) only, so describe both phases explicitly
    lines.push(`Two phases: pension-max for ${earlyYears} year${plural(earlyYears)} (pension ${formatGBP(res.phase.early.penContrib)}/yr, S&S ISA ${formatGBP(res.phase.early.isaContrib)}/yr), then ISA-max for the final ${res.phase.switchYears} year${plural(res.phase.switchYears)} before retirement (S&S ISA ${formatGBP(res.phase.late.isaContrib)}/yr, pension ${formatGBP(res.phase.late.penContrib)}/yr).`);
  } else if (!diff.contribDeltas.length) {
    lines.push('Effectively the same contribution split as your current plan. Nothing material moves.');
  } else {
    const parts = [];
    let overflowed = false;
    ['pen', 'isa', 'other', 'cash'].forEach(cat => {
      const c = diff.byCat[cat];
      if (!c || Math.abs(c.contrib) < threshold) return;
      const word = WRAPPER_WORD[cat];
      // only one owner moving needs calling out; both moving is the unremarkable case
      const only = (isCouple && c.owners.length === 1) ? ` (${E.OWNER_LABEL[c.owners[0]] || ''} only)` : '';
      const amt = formatGBP(Math.abs(c.contrib));
      // money appearing in the GIA from nothing is budget spilling past full allowances, not a choice
      const fromNothing = diff.contribDeltas.filter(d => d.cat === cat).every(d => d.from < threshold);
      if (cat === 'other' && c.contrib > 0 && fromNothing) { parts.push(`${amt}/yr now overflows into your GIA${only}`); overflowed = true; }
      else parts.push(`your ${word} contributions ${c.contrib > 0 ? 'rise' : 'fall'} by ${amt}/yr${only}`);
    });
    const reliefDelta = E.num(res.taxReliefSaved, 0) - E.num(baselinePlayer.taxReliefSaved, 0) - oneOffRelief;
    // an overridden budget means the strategies do not cost what the current plan costs, so the
    // usual "same take-home cost" reconciliation would be a lie
    const overridden = meta && Math.abs(E.num(meta.netBudget, 0) - E.num(meta.derivedBudget, 0)) >= threshold;
    let tail = overridden ? `, on the ${formatGBP(meta.netBudget)}/yr take-home budget you set, against ${formatGBP(meta.derivedBudget)}/yr in your plan today` : ', the same take-home cost';
    if (reliefDelta >= threshold) tail += `, with ${formatGBP(reliefDelta)}/yr more ${reliefWord}`;
    else if (reliefDelta <= -threshold) tail += `, giving up ${formatGBP(Math.abs(reliefDelta))}/yr of ${reliefWord}`;
    lines.push(`${sentenceCase(joinClauses(parts))}${tail}.`);
    if (overflowed) lines.push('The GIA overflow is budget that no longer fits inside the ISA and pension allowances.');
  }

  // the tournament re-prices escalation to hold every player to the same total outlay; say so, or the
  // contribution figures look inconsistent with the escalation % still shown on the plan inputs
  const esc = res.escalation;
  if (esc && Math.abs(esc.before - esc.target) >= Math.max(500, esc.target * 0.01)) {
    const pct = esc.target > 0 ? Math.abs(esc.before - esc.target) / esc.target * 100 : 0;
    const dearer = esc.before > esc.target;
    lines.push(`Contribution escalation re-set to ${(esc.rate * 100).toFixed(2)}%/yr so the total you pay in over the accumulation years still comes to ${formatGBP(esc.after)}. Left on your own escalation this split would have ${dearer ? 'cost' : 'been'} ${formatGBP(esc.before)}, ${dearer ? 'paying in' : 'paying in'} ${pct.toFixed(0)}% ${dearer ? 'more' : 'less'} than your current plan.`);
  }

  // described separately from the annual figures because it is capital, not a yearly flow
  if (src && dest) {
    lines.push(`One-off: ${formatGBP(Math.abs(src.delta))} of existing ${WRAPPER_WORD[src.cat]} capital moves into the ${WRAPPER_WORD[dest.cat]}, becoming ${formatGBP(dest.delta)} after basic-rate relief${refund ? `, with ${formatGBP(refund.delta)} of higher-rate relief refunded to cash` : ''}.`);
  }
  return lines;
}

function WrapperStrategyTournament({ plan, ctx, seed, scenarios = [], activeScenarioId, state, setState, cancelRef, onApplyStrategyToSandbox, onApplyStrategyToPlan, onNavigateDocs }) {
  const P = ctx.P;
  const isCouple = ctx.isCouple;
  // Settings, results and run progress are owned by App so they outlive this component's unmount on a tab
  // switch; these accessors keep the rest of the component reading like ordinary local state.
  const { scope, emergencyFloor, budgetOverride, balance, preAccessCap, entrantIds, results, progress, isEvaluating } = state;
  const setField = (key) => (value) => setState(prev => ({ ...prev, [key]: value }));
  const setScope = setField('scope');
  const setEmergencyFloor = setField('emergencyFloor');
  const setBudgetOverride = setField('budgetOverride');
  const setBalance = setField('balance');
  const setPreAccessCap = setField('preAccessCap');
  const setResults = setField('results');
  const setProgress = setField('progress');
  const setIsEvaluating = setField('isEvaluating');
  const [confirmApplyId, setConfirmApplyId] = useState(null);
  // A sandbox run is scored against the frozen sandbox plan rather than the saved inputs.
  const selfEmployedOnly = ctx.owners.length > 0 && ctx.owners.every(o => o.selfEmployed);
  const usingSandbox = !!state.basePlan;
  const basePlan = state.basePlan || plan;

  // Any saved scenario other than the one currently loaded can be entered as an extra player. The loaded
  // one is already the baseline, so offering it again would only produce a duplicate of Current Plan.
  const availableEntrants = useMemo(
    () => scenarios.filter(s => s.id !== activeScenarioId),
    [scenarios, activeScenarioId]);
  const selectedEntrants = useMemo(
    () => availableEntrants.filter(s => (entrantIds || []).includes(s.id)),
    [availableEntrants, entrantIds]);
  const toggleEntrant = (id) => setState(prev => {
    const cur = prev.entrantIds || [];
    return { ...prev, entrantIds: cur.includes(id) ? cur.filter(x => x !== id) : [...cur, id] };
  });

  const preview = useMemo(() => {
    const entrants = selectedEntrants.map(s => ({ id: s.id, name: s.name, plan: s.data }));
    try { return E.buildTournament(E.resolveMpaa(basePlan), { emergencyFloor: E.num(emergencyFloor, 0), scope, netBudgetOverride: budgetOverride === '' ? null : budgetOverride, balance, entrants }); }
    catch (e) { return null; }
  }, [basePlan, emergencyFloor, scope, budgetOverride, balance, selectedEntrants]);
  const meta = preview?.meta;
  const salaryMissing = ctx.owners.filter(o => o.salary <= 0).map(o => o.label);
  // balancing steers new money to the smaller pension, which throws away relief when that owner sits in
  // a lower band — measured at ~£45k of relief lost against ~£26k of retirement tax saved
  const reliefBandsDiffer = isCouple && ctx.owners.length > 1
    && E.marginalRateAt(ctx.owners[0].salary, P) !== E.marginalRateAt(ctx.owners[1].salary, P);

  const handleRun = async () => {
    if (!preview) return;
    setIsEvaluating(true); setResults(null); cancelRef.current = false;
    const total = preview.strategies.length;
    const out = [];
    try {
      for (let i = 0; i < total; i++) {
        let s = preview.strategies[i];
        // Any player that carries candidates is searched the same way, on the same paths, so the two
        // searching players are ranked against each other on equal terms.
        if (s.candidates) {
          setProgress({ label: `Player ${i + 1}/${total}: ${s.name}: searching…`, value: i / total });
          const evaluated = [];
          for (let k = 0; k < s.candidates.length; k++) {
            const c = s.candidates[k];
            const stats = E.monteCarlo(c.planState, { trials: SEARCH_TRIALS, seed });
            evaluated.push({ ...c, stats });
            setProgress({ label: `Player ${i + 1}/${total}: ${c.label} → ${stats.successRate.toFixed(1)}% safe`, value: (i + (k + 1) / s.candidates.length * 0.6) / total });
            await tick();
          }
          const best = E.pickBest(evaluated, 0.5, preAccessCap === 'any' ? Infinity : Number(preAccessCap));
          const capNote = ` Bridge-risk cap ${preAccessCap === 'any' ? 'none' : 'at ' + preAccessCap + '%'}.`;
          s = {
            ...s, chosenShare: best.share, chosenLabel: best.label,
            searchResults: evaluated.map(e => ({ label: e.label, successRate: e.stats.successRate, preAccess: e.stats.preNmpaFailRate, p10: e.stats.p10Terminal, median: e.stats.medianTerminal })),
            isaContrib: best.alloc.isaContrib, penContrib: best.alloc.penContrib, giaContrib: best.alloc.giaContrib,
            taxReliefSaved: best.alloc.taxReliefSaved + (best.reliefExtra || 0),
            transferNet: Math.round(best.transferNet || 0), transferGross: Math.round(best.transferGross || 0),
            planState: best.planState, escalation: best.escalation, phase: best.phase || null,
            description: (best.describe || s.description) + capNote
          };
        }
        setProgress({ label: `Player ${i + 1}/${total}: ${s.name}: ${TOURNAMENT_TRIALS.toLocaleString()} paths`, value: (i + 0.6) / total });
        await tick();
        const sctx = E.buildContext(s.planState);
        const stats = await runMonteCarloAsync(sctx, { trials: TOURNAMENT_TRIALS, seed, onProgress: (f) => setProgress({ label: `Player ${i + 1}/${total}: ${s.name}`, value: (i + 0.6 + 0.4 * f) / total }) });
        out.push({ ...s, stats });
        if (cancelRef.current) break;
      }
      // rank: success (within 0.5%), then p10, then median
      const best = out.length ? E.pickBest(out.map(o => ({ ...o, stats: o.stats }))) : null;
      setResults({ players: out, bestId: best ? best.id : null, meta, seed });
    } finally {
      setIsEvaluating(false); setProgress(null);
    }
  };

  // "Re-run on sandbox" arrives as a token rather than a direct call, because the click happens in the
  // sandbox panel which may be on another tab. Clearing the token first makes the run fire exactly once.
  useEffect(() => {
    if (!state.autoRun || !preview || isEvaluating) return;
    setState(prev => ({ ...prev, autoRun: 0 }));
    handleRun();
  }, [state.autoRun, preview]); // eslint-disable-line react-hooks/exhaustive-deps

  const se = results && results.players.length ? results.players[0].stats.standardError : 0;
  const baselinePlayer = results ? results.players.find(p => p.id === 'baseline') : null;

  // The updater closure runs during render, by which time React has cleared currentTarget, so the flag
  // has to be read out of the event first.
  const handleSettingsToggle = (e) => {
    const open = e.currentTarget.open;
    setState(prev => (prev.settingsOpen === open ? prev : { ...prev, settingsOpen: open }));
  };

  // What the collapsed settings header says. Defaults are named too, so the line always reads as a
  // statement of what will be run rather than a list of things you happen to have changed.
  const settingsSummary = [
    budgetOverride === '' ? null : `budget £${Math.round(E.num(budgetOverride, 0)).toLocaleString()}/yr`,
    scope === 'full' ? 'full reallocation' : 'contributions only',
    `£${Math.round(E.num(emergencyFloor, 0)).toLocaleString()} buffer`,
    preAccessCap === 'any' ? 'no bridge-risk cap' : `bridge risk ≤ ${preAccessCap}%`,
    isCouple && balance === 'balanced' ? 'pensions balanced' : null,
    selectedEntrants.length ? `${selectedEntrants.length} scenario${selectedEntrants.length === 1 ? '' : 's'} entered` : null
  ].filter(Boolean).join(' · ');

  return (
    <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-600 fill-indigo-600" /> Automated Strategy Tournament &amp; Optimizer
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Six wrapper strategies with the same take-home budget, each tested on the same {TOURNAMENT_TRIALS.toLocaleString()} market paths (common random numbers) so differences are real, not noise.{selectedEntrants.length > 0 ? ` Plus ${selectedEntrants.length} saved scenario${selectedEntrants.length === 1 ? '' : 's'} entered as saved.` : ''}
          </p>
        </div>
        <button type="button" onClick={onNavigateDocs} className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto">
          <HelpCircle className="w-3.5 h-3.5" /> Tournament methodology &amp; players &rarr;
        </button>
      </div>

      {usingSandbox && (
        <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
          <span className="text-amber-900 flex items-center gap-2"><Sparkles className="w-3.5 h-3.5 text-amber-600" /><strong className="font-bold">Scoring your sandbox figures</strong>, not your saved plan inputs. The sandbox is frozen as it was when you started this run.</span>
          <button type="button" onClick={() => setState(prev => ({ ...prev, basePlan: null, results: null }))}
            className="px-2.5 py-1 rounded-lg font-semibold bg-surface hover:bg-slate-100 text-slate-700 border border-slate-300 cursor-pointer">Back to plan inputs</button>
        </div>
      )}

      {/*
        * Five advanced controls that most plans leave alone, so they fold away. The summary line carries
        * anything set away from its default, which is what stops a collapsed panel hiding a live setting.
        */}
      <details open={!!state.settingsOpen} onToggle={handleSettingsToggle}
        className="bg-slate-50 border border-slate-200 rounded-xl">
        <summary className="px-3 py-2.5 cursor-pointer text-xs font-semibold text-slate-700 select-none flex flex-wrap items-baseline gap-x-2">
          <span>Tournament settings</span>
          <span className="text-[10px] font-normal text-slate-500 font-mono">{settingsSummary}</span>
        </summary>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-sans p-3">
        <div>
          <label className="text-slate-700 font-semibold block mb-1">Annual take-home budget (£ net)</label>
          <input type="number" min="0" step="250" value={budgetOverride} placeholder={meta ? `${Math.round(meta.derivedBudget).toLocaleString()} (from plan)` : ''} onChange={(e) => setBudgetOverride(e.target.value)}
            className="w-full p-2 bg-surface border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none" />
          <span className="text-[10px] text-slate-500 block mt-1">Derived from current ISA + net cost of pension contributions{salaryMissing.length ? ` (salary missing for ${salaryMissing.join(', ')}: ${Math.round((selfEmployedOnly ? P.higherRate : P.higherRate + P.nicUpper) * 100)}% relief assumed)` : ''}.</span>
        </div>
        <div>
          <label className="text-slate-700 font-semibold block mb-1">Optimisation scope</label>
          <select id="tourn-scope" value={scope} onChange={(e) => setScope(e.target.value)} className="w-full p-2 bg-surface border border-slate-300 rounded-lg text-slate-800 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer">
            <option value="contributions">Contributions only (rebalance future deposits)</option>
            <option value="full">Full reallocation (+ Bed &amp; SIPP transfer of spare ISA)</option>
          </select>
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-slate-700 font-semibold">Protected emergency buffer</label>
            <span className="font-mono font-bold text-indigo-700">£{Math.round(E.num(emergencyFloor, 0)).toLocaleString()}</span>
          </div>
          <input type="range" min="0" max="100000" step="2500" value={E.num(emergencyFloor, 0)} onChange={(e) => setEmergencyFloor(Number(e.target.value))} className="w-full accent-indigo-600 cursor-pointer mt-2" />
          <span className="text-[10px] text-slate-500 block mt-1">Savings ring-fenced from the bridge and from any Bed &amp; SIPP transfer; it shrinks what counts as available, rather than raising the target (that is the bridge safety margin in Config).</span>
        </div>
        <div>
          <label className="text-slate-700 font-semibold block mb-1">Bridge-risk cap (searching players)</label>
          <select value={preAccessCap} onChange={(e) => setPreAccessCap(e.target.value === 'any' ? 'any' : Number(e.target.value))} className="w-full p-2 bg-surface border border-slate-300 rounded-lg text-slate-800 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer">
            <option value={0}>0% pre-SIPP access failures</option>
            <option value={2}>≤ 2%</option>
            <option value={5}>≤ 5%</option>
            <option value={10}>≤ 10%</option>
            <option value="any">No cap (total survival only)</option>
          </select>
          <span className="text-[10px] text-slate-500 mt-1 block">Applies to the two players that search: Survival Maximizer and Bridge-Sized Relief. It rules out any candidate that buys total survival by accepting more risk of running dry before age {ctx.nmpa}.</span>
        </div>
        <div>
          <label className="text-slate-700 font-semibold block mb-1">Owner split of new money</label>
          <select value={balance} disabled={!isCouple} onChange={(e) => setBalance(e.target.value)} className="w-full p-2 bg-surface border border-slate-300 rounded-lg text-slate-800 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer disabled:opacity-50">
            <option value="proportional">Keep current Myself/Partner ratio</option>
            <option value="balanced">Balance pensions between partners</option>
          </select>
          {isCouple && (
            reliefBandsDiffer
              ? <span className="text-[10px] text-amber-700 mt-1 block">One of you gets relief at the higher rate and the other at the basic rate. Balancing steers money to the lower rate, and the relief given up each year usually outweighs the retirement tax it saves. Expect it to score worse here.</span>
              : <span className="text-[10px] text-slate-500 mt-1 block">Balancing puts both personal allowances to work in retirement. It pays when you both get relief at the same rate; it costs you when one of you is a higher-rate taxpayer and the other is not.</span>
          )}
        </div>
      </div>

      {availableEntrants.length > 0 && (
        <div className="px-3 pb-3 text-xs font-sans space-y-2">
          <div>
            <label className="text-slate-700 font-semibold block">Enter saved scenarios as extra players</label>
            <span className="text-[10px] text-slate-500 block mt-0.5">Each runs exactly as saved, on the same market paths. It is not held to the same take-home budget as the five strategies, so a scenario that simply contributes more will score better for that reason alone. The outlay is shown on its card.</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {availableEntrants.map(s => {
              const on = (entrantIds || []).includes(s.id);
              return (
                <button key={s.id} type="button" onClick={() => toggleEntrant(s.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${on ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-surface text-slate-700 border-slate-300 hover:bg-slate-100'}`}>
                  {on ? '✓ ' : '+ '}{s.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {meta && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono px-3 pb-3">
          <div className="p-2.5 bg-surface border border-slate-200 rounded-xl"><span className="text-slate-500 font-sans block">Net budget tested</span><strong>£{Math.round(meta.netBudget).toLocaleString()}/yr</strong></div>
          <div className="p-2.5 bg-surface border border-slate-200 rounded-xl"><span className="text-slate-500 font-sans block">Pre-SIPP access gap</span><strong>{meta.bridge.gapYears} yr{meta.bridge.gapYears === 1 ? '' : 's'}</strong></div>
          <div className="p-2.5 bg-surface border border-slate-200 rounded-xl"><span className="text-slate-500 font-sans block">Bridge reserve target (+{Math.round(E.num(plan?.config?.bridgeSafetyMargin, 30))}%)</span><strong>{fmtK(meta.bridgeCapital)}</strong></div>
          <div className="p-2.5 bg-surface border border-slate-200 rounded-xl"><span className="text-slate-500 font-sans block">Liquid today above buffer</span><strong>{fmtK(Math.max(0, meta.liquidToday - E.num(emergencyFloor, 0)))}</strong></div>
        </div>
      )}
      </details>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        {progress ? <div className="flex-1"><ProgressBar value={progress.value} label={progress.label} /></div> : <span className="text-[11px] text-slate-400">Seed {seed}. Change it in Config to test a different set of market paths.</span>}
        <button type="button" onClick={handleRun} disabled={isEvaluating || !preview || (meta && meta.netBudget <= 0)}
          className="px-3.5 py-1.5 rounded-xl text-xs font-bold border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          <Zap className="w-3.5 h-3.5" />
          {isEvaluating ? 'Evaluating…' : results ? 'Compare again' : 'Compare strategies now'}
        </button>
      </div>
      {meta && meta.netBudget <= 0 && <p className="text-xs text-rose-600">Enter ISA or pension contributions (or a take-home budget above) to run the tournament.</p>}

      {results && (
        <div className="space-y-3 pt-2">
          <div className="text-[11px] text-slate-500">
            Ranked by survival (ties within 0.5% broken by the 10th-percentile pot). Sampling error at these sample sizes is about ±{(1.96 * se).toFixed(1)} points per player; because every player sees the same paths, <em>differences</em> between players are more reliable than that.
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {results.players.map((res) => {
              const isBest = res.id === results.bestId;
              const st = res.stats;
              const summaryLines = summarizeStrategyChange(res, baselinePlayer, { isCouple, meta: results.meta, selfEmployedOnly });
              return (
                <div key={res.id} className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${isBest ? 'bg-emerald-50/60 border-emerald-300 shadow-sm' : res.id === 'baseline' ? 'bg-slate-50 border-slate-200' : res.isEntrant ? 'bg-surface border-amber-200 shadow-xs' : 'bg-surface border-indigo-100 shadow-xs'}`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1">{isBest && <Trophy className="w-3.5 h-3.5 text-emerald-600" />}{res.name}{res.isEntrant && <span className="ml-1 px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[9px] font-bold uppercase tracking-wider">Saved scenario</span>}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${st.successRate >= 90 ? 'bg-emerald-100 text-emerald-800' : st.successRate >= 75 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{st.successRate.toFixed(1)}% survive</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">{res.description}</p>
                    {summaryLines.length > 0 && (
                      <div className="border-l-2 border-indigo-300 pl-2.5 space-y-1">
                        {summaryLines.map((line, i) => <p key={i} className="text-[11px] leading-snug text-slate-700">{line}</p>)}
                      </div>
                    )}
                    <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] font-mono">
                      <div className="flex justify-between"><span className="text-slate-500">S&amp;S ISA:</span><strong className="text-teal-700">£{Math.round(res.isaContrib || 0).toLocaleString()}/yr{res.phase && res.phase.switchYears > 0 ? ' avg' : ''}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Pension:</span><strong className="text-blue-700">£{Math.round(res.penContrib || 0).toLocaleString()}/yr{res.phase && res.phase.switchYears > 0 ? ' avg' : ''}</strong></div>
                      {res.giaContrib > 0 && <div className="flex justify-between"><span className="text-slate-500">GIA overflow:</span><strong className="text-amber-700">£{Math.round(res.giaContrib).toLocaleString()}/yr</strong></div>}
                      {res.taxReliefSaved > 0 && <div className="flex justify-between text-emerald-700 font-bold"><span className="font-sans">{selfEmployedOnly ? 'Tax relief:' : 'Tax & NIC relief:'}</span><span>+£{Math.round(res.taxReliefSaved).toLocaleString()}/yr</span></div>}
                      {res.transferNet > 0 && <div className="flex justify-between text-indigo-700 font-bold"><span>Bed &amp; SIPP:</span><span>£{Math.round(res.transferNet).toLocaleString()} &rarr; £{Math.round(res.transferGross).toLocaleString()}</span></div>}
                      {res.phase && res.phase.switchYears > 0 && <div className="flex justify-between text-slate-600"><span className="font-sans">Phasing:</span><span>pension-max {res.phase.yearsToFirstRetire - res.phase.switchYears}y → ISA-max {res.phase.switchYears}y</span></div>}
                      {res.isEntrant && res.entrantOutlay !== null && res.entrantOutlay !== undefined && (
                        <div className="flex justify-between"><span className="text-slate-500 font-sans">Yearly outlay:</span><strong className={Math.abs(res.entrantOutlay - res.baselineOutlay) < 50 ? 'text-slate-700' : 'text-amber-700'}>£{Math.round(res.entrantOutlay).toLocaleString()}/yr vs £{Math.round(res.baselineOutlay).toLocaleString()}</strong></div>
                      )}
                      <div className="flex justify-between pt-1 border-t border-slate-100"><span className="text-slate-500 font-sans">Median pot @ {ctx.terminalAge}:</span><span className="font-bold text-slate-800">{fmtK(st.medianTerminal)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-sans">10th %ile pot:</span><span className="font-bold text-slate-800">{fmtK(st.p10Terminal)}</span></div>
                      {ctx.pensionDeathTaxRate > 0 && <div className="flex justify-between"><span className="text-slate-500 font-sans">Median pot net of pension death tax:</span><span className="font-bold text-slate-800">{fmtK(st.medianTerminalNet)}</span></div>}
                      <div className="flex justify-between"><span className="text-slate-500 font-sans">Median failure age:</span><span className={`font-bold ${st.preNmpaFailRate > 5 ? 'text-rose-600' : 'text-slate-700'}`}>{st.medianFailAge ? `Age ${st.medianFailAge}` : 'None'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-sans">Pre-SIPP access (bridge) failures:</span><span className={`font-bold ${st.preNmpaFailRate > 5 ? 'text-rose-600' : 'text-slate-700'}`}>{st.preNmpaFailRate.toFixed(1)}%</span></div>
                    </div>
                    {res.searchResults && (
                      <details className="text-[10px] text-slate-500">
                        <summary className="cursor-pointer font-semibold">Search results by {(res.searchAxis || 'candidate').toLowerCase()}</summary>
                        <div className="grid grid-cols-4 gap-x-2 mt-1 font-mono">
                          {res.searchResults.map(r => <React.Fragment key={r.label}><span className={r.label === res.chosenLabel ? 'font-bold text-slate-800' : ''}>{r.label}</span><span>{r.successRate.toFixed(1)}%</span><span>{r.preAccess.toFixed(1)}% pre</span><span>{fmtK(r.p10)}</span></React.Fragment>)}
                        </div>
                      </details>
                    )}
                  </div>
                  {res.isEntrant ? (
                    <p className="text-[10px] text-slate-500 leading-snug">A scenario differs in more than its contributions, so there is nothing here to copy across. Load it from the scenario selector at the top of the page to work on it.</p>
                  ) : res.id !== 'baseline' && (
                    <div className="space-y-1.5">
                      <button type="button" onClick={() => onApplyStrategyToSandbox(res)} className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer">Apply to Sandbox</button>
                      {/* overwriting entered inputs is destructive, so it takes a second deliberate click */}
                      <button type="button"
                        onClick={() => { if (confirmApplyId === res.id) { onApplyStrategyToPlan(res); setConfirmApplyId(null); } else setConfirmApplyId(res.id); }}
                        onBlur={() => setConfirmApplyId(null)}
                        className={`w-full py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer border ${confirmApplyId === res.id ? 'bg-amber-100 hover:bg-amber-200 text-amber-900 border-amber-300' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}>
                        {confirmApplyId === res.id ? 'Confirm: overwrite Plan Inputs?' : 'Apply to Plan Inputs'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}


export default function App() {
  // a returning visitor already knows the layout, so only a first visit (no saved plan) opens on the guide
  const [activeTab, setActiveTab] = useState(() => (safeStorageGet(STORAGE_KEY) ? 'inputs' : 'home'));
  const [isEditingRisk, setIsEditingRisk] = useState(false);
  const [selectedHistoricalYear, setSelectedHistoricalYear] = useState(1965);
  const [mcSeed, setMcSeed] = useState(12345);

  // Theme: 'classic' (original stock look, the default), 'light' (Riviera Ledger), 'dark' (Control Room).
  const [theme, setTheme] = useState(() => {
    const saved = safeStorageGet(THEME_STORAGE_KEY);
    if (saved === 'classic' || saved === 'light' || saved === 'dark') return saved;
    return 'classic';
  });
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    safeStorageSet(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const [plan, setPlan] = useState(() => E.normalizePlan(safeStorageGet(STORAGE_KEY) ? (() => { try { return JSON.parse(safeStorageGet(STORAGE_KEY)); } catch (e) { return null; } })() : null));

  const [scenarios, setScenarios] = useState(() => {
    try {
      const cached = safeStorageGet(SCENARIOS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed.filter(s => s && typeof s === 'object').map((s, i) => ({ id: String(s.id || 'scen_' + i), name: String(s.name || `Scenario ${i + 1}`), data: E.normalizePlan(s.data) }));
      }
    } catch (e) { /* fall through */ }
    return [{ id: 'scen_default', name: 'Scenario 1', data: E.normalizePlan(null) }];
  });
  const [activeScenarioId, setActiveScenarioId] = useState(() => scenarios[0]?.id || 'scen_default');
  const [scenarioNameInput, setScenarioNameInput] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const flash = (msg, ms = 3000) => { setSaveSuccessMsg(msg); setTimeout(() => setSaveSuccessMsg(''), ms); };

  // Sandbox overrides: { [accountId]: { contrib, growth, balance?, contribByYear? } }
  const sandboxFromPlan = (p) => {
    const init = {};
    (p?.accounts || []).forEach(a => { init[a.id] = { contrib: E.num(a.contrib, 0), growth: E.num(a.growth, 0) }; });
    return init;
  };
  // Retirement-age overrides mirror the engine's blank-input fallback so the sandbox starts on the modelled age.
  const sandboxRetireFromPlan = (p) => ({
    self: E.clamp(E.num(p?.demographics?.retireAgeSelf, 60), 0, 120),
    part: E.clamp(E.num(p?.demographics?.retireAgePart, 60), 0, 120)
  });
  const [sandboxCustomized, setSandboxCustomized] = useState(false);
  const [sandboxAccounts, setSandboxAccounts] = useState(() => sandboxFromPlan(plan));
  const [sandboxRetire, setSandboxRetire] = useState(() => sandboxRetireFromPlan(plan));
  useEffect(() => { if (!sandboxCustomized) setSandboxAccounts(sandboxFromPlan(plan)); }, [plan?.accounts, sandboxCustomized]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!sandboxCustomized) setSandboxRetire(sandboxRetireFromPlan(plan)); }, [plan?.demographics?.retireAgeSelf, plan?.demographics?.retireAgePart, sandboxCustomized]); // eslint-disable-line react-hooks/exhaustive-deps

  // The tournament lives inside the Monte Carlo tab, which unmounts on every tab switch. Its settings and
  // results are held here instead so a run that took a minute to produce survives a trip to another tab —
  // and so a run left in flight can still land its results when the user navigates away mid-evaluation.
  // `basePlan` holds a frozen copy of the sandbox when the user scores the tournament against it rather than
  // the saved plan inputs; `autoRun` is a token the component watches to start that run on arrival.
  const [tournament, setTournament] = useState({
    scope: 'contributions', emergencyFloor: 25000, budgetOverride: '', balance: 'proportional', preAccessCap: 5,
    entrantIds: [], results: null, progress: null, isEvaluating: false, basePlan: null, autoRun: 0
  });
  const tournamentCancelRef = useRef(false);
  // Which saved scenarios are overlaid on the Trajectory chart. Held here, like the tournament's state,
  // so a selection survives a trip to another tab.
  const [compareIds, setCompareIds] = useState([]);
  const [compareSort, setCompareSort] = useState({ key: null, dir: 'desc' });
  // Both tabs render the same sandbox, but each remembers its own expanded state: the Trajectory tab is
  // the sandbox's home so it starts open, while the Monte Carlo tab leads with the tournament.
  const [sandboxOpen, setSandboxOpen] = useState({ trajectory: true, simulation: false });

  useEffect(() => { safeStorageSet(STORAGE_KEY, JSON.stringify(plan)); }, [plan]);
  useEffect(() => { safeStorageSet(SCENARIOS_STORAGE_KEY, JSON.stringify(scenarios)); }, [scenarios]);

  const fileInputRef = useRef(null);
  const isCouple = plan?.demographics?.planningMode !== 'single';

  // ------------------------------------------------------------ engine context & projections
  // MPAA is derived from the projection, so resolve it once and let everything downstream read the result
  const resolvedPlan = useMemo(() => E.resolveMpaa(plan), [plan]);
  const ctx = useMemo(() => E.buildContext(resolvedPlan), [resolvedPlan]);
  const P = ctx.P;
  const terminalAge = ctx.terminalAge;
  const currentAge = ctx.ageSelf0;
  const nmpa = ctx.nmpa;

  const spanYears = ctx.totalYears;
  const maxHistoricalStartYear = useMemo(() => Math.max(E.HISTORICAL_FIRST_YEAR, E.HISTORICAL_LAST_YEAR - spanYears), [spanYears]);
  const activeHistoricalStartYear = useMemo(() => Math.min(Math.max(E.HISTORICAL_FIRST_YEAR, selectedHistoricalYear), maxHistoricalStartYear), [selectedHistoricalYear, maxHistoricalStartYear]);

  const [activeSeries, setActiveSeries] = useState(() => { const init = {}; SERIES_CONFIG.forEach(s => { init[s.id] = s.defaultActive; }); return init; });
  const [maxVisibleAge, setMaxVisibleAge] = useState(null);
  const effectiveMaxVisibleAge = maxVisibleAge === null ? terminalAge : Math.min(Math.max(currentAge + 1, maxVisibleAge), terminalAge);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoveredHistPoint, setHoveredHistPoint] = useState(null);

  const [targetSurvivalRate, setTargetSurvivalRate] = useState(90);
  // One run, three stages. `simResult` is always the plan exactly as entered; `safeMaxResult` is the
  // solve, which describes a different spend and so cannot share the same card. Keeping them apart is
  // what stops the metric tiles quietly changing meaning depending on which button was pressed last.
  const [simResult, setSimResult] = useState(null);
  const [safeMaxResult, setSafeMaxResult] = useState(null);
  const [mcStages, setMcStages] = useState({ safeMax: true, tournament: true });
  const [mcDetailOpen, setMcDetailOpen] = useState(true);
  const [simProgress, setSimProgress] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const mcCancelRef = useRef(false);
  const [policyResults, setPolicyResults] = useState(null);
  const [policyProgress, setPolicyProgress] = useState(null);
  const [isPolicySearching, setIsPolicySearching] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [expandedOneOff, setExpandedOneOff] = useState(() => new Set());
  const toggleOneOffExpand = (id) => setExpandedOneOff(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const handleFocus = (e) => e.target.select();
  const activeRiskMatrix = plan?.riskProfiles || E.DEFAULT_RISK_PROFILES;
  const scrollToDocSection = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: 'smooth' }); };
  const goToDoc = (id) => { setActiveTab('docs'); setTimeout(() => scrollToDocSection(id), 80); };

  const timelineData = useMemo(() => {
    const exp = E.simulateDeterministic(ctx, 'expected');
    return exp.map(r => ({ ...r, nominal: r.totalCombined * Math.pow(1 + ctx.inflation, r.t) }));
  }, [ctx]);
  const deterministicVerdict = useMemo(() => E.evaluateRows(ctx, timelineData), [ctx, timelineData]);


  // resolved separately: changing retirement ages here moves when pension income starts, and so the trigger
  const sandboxPlan = useMemo(() => E.resolveMpaa({
    ...plan,
    demographics: { ...plan?.demographics, retireAgeSelf: sandboxRetire.self, retireAgePart: sandboxRetire.part },
    accounts: (plan?.accounts || []).map(acc => {
      const sb = sandboxAccounts[acc.id];
      if (!sb) return acc;
      const out = { ...acc, contrib: sb.contrib, growth: sb.growth };
      if (sb.balance !== undefined) out.balance = sb.balance;
      if (sb.contribByYear) out.contribByYear = sb.contribByYear; else delete out.contribByYear;
      return out;
    })
  }), [plan, sandboxAccounts, sandboxRetire]);
  const sandboxCtx = useMemo(() => E.buildContext(sandboxPlan), [sandboxPlan]);
  const isRetireModified = useMemo(() => {
    const base = sandboxRetireFromPlan(plan);
    return base.self !== sandboxRetire.self || (isCouple && base.part !== sandboxRetire.part);
  }, [plan?.demographics?.retireAgeSelf, plan?.demographics?.retireAgePart, sandboxRetire, isCouple]); // eslint-disable-line react-hooks/exhaustive-deps
  const isSandboxModified = useMemo(() => isRetireModified || (plan?.accounts || []).some(acc => {
    const sb = sandboxAccounts[acc.id];
    if (!sb) return false;
    return E.num(acc.contrib, 0) !== E.num(sb.contrib, 0) || E.num(acc.growth, 0) !== E.num(sb.growth, 0) || (sb.balance !== undefined && E.num(acc.balance, 0) !== E.num(sb.balance, 0)) || !!sb.contribByYear;
  }), [plan?.accounts, sandboxAccounts, isRetireModified]);
  const sandboxTimeline = useMemo(() => E.simulateDeterministic(sandboxCtx, 'expected'), [sandboxCtx]);

  /*
   * Saved scenarios overlaid on the Trajectory chart, projected the same way the live plan is.
   *
   * The dependency list is the point: a scenario's `data` only changes when it is saved, so these runs
   * are not repeated on every keystroke the way timelineData is. buildContext throws on a plan that is
   * missing required inputs, so each is guarded individually — a half-finished saved scenario reports
   * itself in the table rather than blanking the tab.
   */
  const selectedCompare = useMemo(
    () => scenarios.filter(s => s.id !== activeScenarioId && compareIds.includes(s.id)).slice(0, MAX_COMPARE),
    [scenarios, activeScenarioId, compareIds]
  );
  const compareRuns = useMemo(() => selectedCompare.map((s, i) => {
    const tone = COMPARE_PALETTE[theme][i % COMPARE_PALETTE[theme].length];
    try {
      const sctx = E.buildContext(s.data);
      const rows = E.simulateDeterministic(sctx, 'expected');
      if (!rows.length) return { id: s.id, name: s.name, tone, error: 'produced no projection' };
      const retAge = sctx.owners[0].retireAge;
      return {
        id: s.id, name: s.name, tone, rows,
        retireAge: retAge,
        startAge: rows[0].ageSelf,
        years: sctx.totalYears,
        retirePot: (rows.find(r => r.ageSelf === retAge) || rows[0]).totalCombined,
        verdict: E.evaluateRows(sctx, rows)
      };
    } catch (err) {
      return { id: s.id, name: s.name, tone, error: err?.message || 'cannot be projected' };
    }
  }), [selectedCompare, theme]);

  /*
   * The comparison table's rows, current plan first. Both sides are measured identically — terminalPot
   * and lifetimeTax come from evaluateRows either way — so a difference in the table is a difference in
   * the plans rather than in how they were read. The retirement pot is taken at each scenario's *own*
   * retirement age, since comparing "retire at 55" against "retire at 60" at a single age would answer
   * a question nobody asked.
   */
  const compareRows = useMemo(() => {
    const baseRetAge = ctx.owners[0].retireAge;
    const baseTerminal = deterministicVerdict.terminalPot;
    const rows = [{
      id: '__current__', name: 'Current plan', isBase: true, tone: SERIES_CONFIG[0].colors[theme],
      retireAge: baseRetAge, retirePot: (timelineData.find(r => r.ageSelf === baseRetAge) || timelineData[0])?.totalCombined || 0,
      terminal: baseTerminal, delta: null, lifetimeTax: deterministicVerdict.lifetimeTax,
      survived: deterministicVerdict.survived, failAge: deterministicVerdict.failAge, failReason: deterministicVerdict.failReason,
      years: ctx.totalYears, startAge: currentAge
    }];
    compareRuns.forEach(r => rows.push(r.error
      ? { id: r.id, name: r.name, tone: r.tone, error: r.error }
      : {
        id: r.id, name: r.name, tone: r.tone, retireAge: r.retireAge, retirePot: r.retirePot,
        terminal: r.verdict.terminalPot, delta: r.verdict.terminalPot - baseTerminal, lifetimeTax: r.verdict.lifetimeTax,
        survived: r.verdict.survived, failAge: r.verdict.failAge, failReason: r.verdict.failReason,
        years: r.years, startAge: r.startAge
      }));
    return rows;
  }, [ctx, theme, timelineData, deterministicVerdict, compareRuns, currentAge]);

  // Sorted for display, with the current plan pinned to the top: it is the thing everything else is a
  // delta against, so sorting it into the middle of the table would make the deltas hard to read.
  const sortedCompareRows = useMemo(() => {
    if (!compareSort.key) return compareRows;
    const [base, ...rest] = compareRows;
    const val = (r) => (r.error ? -Infinity : (r[compareSort.key] ?? -Infinity));
    rest.sort((a, b) => (compareSort.dir === 'asc' ? val(a) - val(b) : val(b) - val(a)));
    return [base, ...rest];
  }, [compareRows, compareSort]);

  const sandboxMetrics = useMemo(() => {
    if (!timelineData.length || !sandboxTimeline.length) return null;
    const baseTerminal = timelineData[timelineData.length - 1]?.totalCombined || 0;
    const sbTerminal = sandboxTimeline[sandboxTimeline.length - 1]?.totalCombined || 0;
    // Each scenario is measured at its own retirement age: retiring later means a longer accumulation run.
    const baseRetAge = ctx.owners[0].retireAge;
    const sbRetAge = sandboxCtx.owners[0].retireAge;
    const baseRetRow = timelineData.find(r => r.ageSelf === baseRetAge) || timelineData[0];
    const sbRetRow = sandboxTimeline.find(r => r.ageSelf === sbRetAge) || sandboxTimeline[0];
    // Contributions stop at each owner's own retirement age, so total them per owner rather than off a single age.
    const totalPlannedContribs = (c) => c.accounts.reduce((sum, a) => {
      const o = c.owners.find(x => x.key === a.owner);
      if (!o) return sum;
      const yrs = Math.max(0, Math.round(o.retireAge - o.age0));
      let acct = 0;
      for (let t = 0; t < yrs; t++) acct += E.contribAtYear(a, t);
      return sum + acct;
    }, 0);
    const cumulativeExtraCapital = totalPlannedContribs(sandboxCtx) - totalPlannedContribs(ctx);
    const terminalDelta = sbTerminal - baseTerminal;
    return { baseTerminal, sbTerminal, terminalDelta, baseRetAge, sbRetAge, baseRetirement: baseRetRow?.totalCombined || 0, sbRetirement: sbRetRow?.totalCombined || 0, retirementDelta: (sbRetRow?.totalCombined || 0) - (baseRetRow?.totalCombined || 0), cumulativeExtraCapital, multiplier: cumulativeExtraCapital !== 0 ? terminalDelta / cumulativeExtraCapital : 0 };
  }, [timelineData, sandboxTimeline, ctx, sandboxCtx]);

  const historicalTimeline = useMemo(() => E.simulateHistorical(ctx, activeHistoricalStartYear), [ctx, activeHistoricalStartYear]);
  const historicalMetrics = useMemo(() => {
    if (!historicalTimeline.length) return null;
    const ev = E.evaluateRows(ctx, historicalTimeline);
    /*
     * A floor failure funds every year of the plan and only then ends below the bequest floor, and
     * evaluateRows reports its failAge as the terminal age. Counting years off that failAge would read
     * as "ran dry after 47 of 47 years", so the floor case is counted as a full span and worded apart.
     */
    const fundedYears = ev.survived || ev.failReason === 'floor'
      ? ctx.totalYears
      : Math.max(0, ev.failAge - historicalTimeline[0].ageSelf);
    return { ...ev, fundedYears, unfundedYears: Math.max(0, ctx.totalYears - fundedYears), startVal: historicalTimeline[0]?.totalCombined || 0, terminalVal: ev.terminalPot, minVal: ev.minPot, startHistoricalYear: activeHistoricalStartYear, beyondData: historicalTimeline.some(r => r.histYear === null) };
  }, [historicalTimeline, ctx, activeHistoricalStartYear]);

  const chartDisplayData = useMemo(() => timelineData.map(d => {
    let activeVal = d.totalCombined;
    if (!isCouple || plan?.activeProfileView === 'Myself') activeVal = d.totalSelf;
    if (isCouple && plan?.activeProfileView === 'Partner') activeVal = d.totalPart;
    return { ...d, expected: activeVal };
  }), [timelineData, plan?.activeProfileView, isCouple]);
  const visibleData = useMemo(() => chartDisplayData.filter(d => d.ageSelf <= effectiveMaxVisibleAge), [chartDisplayData, effectiveMaxVisibleAge]);

  // ------------------------------------------------------------ chart scales
  const chartWidth = 960, chartHeight = 420;
  const margin = { top: 25, right: 35, bottom: 45, left: 80 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;
  const xScale = useMemo(() => d3.scaleLinear().domain([currentAge, Math.max(currentAge + 1, effectiveMaxVisibleAge)]).range([0, innerWidth]), [currentAge, effectiveMaxVisibleAge, innerWidth]);
  const maxY = useMemo(() => {
    let max = 0;
    visibleData.forEach(d => { if (activeSeries.expected && d.expected > max) max = d.expected; if (activeSeries.nominal && d.nominal > max) max = d.nominal; });
    if (isSandboxModified) sandboxTimeline.forEach(d => { if (d.ageSelf <= effectiveMaxVisibleAge && d.totalCombined > max) max = d.totalCombined; });
    // an overlaid scenario that outgrows the live plan must lift the axis, not run off the top of it
    compareRuns.forEach(r => { if (r.rows) r.rows.forEach(d => { if (d.ageSelf <= effectiveMaxVisibleAge && d.totalCombined > max) max = d.totalCombined; }); });
    return Math.max(max * 1.08, 100000);
  }, [visibleData, activeSeries, isSandboxModified, sandboxTimeline, compareRuns, effectiveMaxVisibleAge]);
  const yScale = useMemo(() => d3.scaleLinear().domain([0, maxY]).range([innerHeight, 0]).nice(), [maxY, innerHeight]);
  const pathGenerators = useMemo(() => {
    const paths = {};
    SERIES_CONFIG.forEach(s => { if (activeSeries[s.id]) paths[s.id] = d3.line().x(d => xScale(d.ageSelf)).y(d => yScale(d[s.id] || 0)).curve(d3.curveMonotoneX)(visibleData); });
    return paths;
  }, [visibleData, activeSeries, xScale, yScale]);
  const sandboxLinePath = useMemo(() => {
    if (!isSandboxModified || !sandboxTimeline.length) return null;
    return d3.line().x(d => xScale(d.ageSelf)).y(d => yScale(d.totalCombined)).curve(d3.curveMonotoneX)(sandboxTimeline.filter(d => d.ageSelf <= effectiveMaxVisibleAge));
  }, [isSandboxModified, sandboxTimeline, effectiveMaxVisibleAge, xScale, yScale]);
  // Same generator as the sandbox line, one per overlaid scenario. Like the sandbox these are raw engine
  // rows, so the pot is read off totalCombined rather than the profile-aware `expected` key.
  const comparePaths = useMemo(() => compareRuns.filter(r => r.rows).map(r => ({
    id: r.id, tone: r.tone,
    d: d3.line().x(d => xScale(d.ageSelf)).y(d => yScale(d.totalCombined)).curve(d3.curveMonotoneX)(r.rows.filter(d => d.ageSelf <= effectiveMaxVisibleAge))
  })), [compareRuns, effectiveMaxVisibleAge, xScale, yScale]);
  const histXScale = useMemo(() => d3.scaleLinear().domain([currentAge, Math.max(currentAge + 1, terminalAge)]).range([0, innerWidth]), [currentAge, terminalAge, innerWidth]);
  /*
   * The Monte Carlo fan: the 10th to 90th percentile of simulated wealth at every year, not a line any
   * one path follows. Its own scales, because the spread of 5,000 outcomes reaches far above the single
   * expected curve next door and sharing a y-axis would flatten one of them.
   *
   * `bands` only exists when a run asked runTrial to keep its paths, which is stage 1 alone.
   */
  const fanBands = simResult?.bands || null;
  const fanData = useMemo(
    () => (fanBands ? fanBands.map(b => ({ ...b, ageSelf: currentAge + b.t })) : []),
    [fanBands, currentAge]);
  const fanYScale = useMemo(() => {
    const max = fanData.reduce((m, d) => Math.max(m, d.p90), 0);
    return d3.scaleLinear().domain([0, max || 1]).range([innerHeight, 0]).nice();
  }, [fanData, innerHeight]);
  const fanPaths = useMemo(() => {
    if (!fanData.length) return null;
    const x = (d) => histXScale(d.ageSelf);
    return {
      band: d3.area().x(x).y0(d => fanYScale(d.p10)).y1(d => fanYScale(d.p90)).curve(d3.curveMonotoneX)(fanData),
      median: d3.line().x(x).y(d => fanYScale(d.p50)).curve(d3.curveMonotoneX)(fanData),
      lower: d3.line().x(x).y(d => fanYScale(d.p10)).curve(d3.curveMonotoneX)(fanData),
      upper: d3.line().x(x).y(d => fanYScale(d.p90)).curve(d3.curveMonotoneX)(fanData)
    };
  }, [fanData, histXScale, fanYScale]);
  // The first age at which a tenth of the paths are broke. Worth naming: it is the most actionable thing
  // on the chart, and a smooth deterministic line could never have produced it.
  const fanRuinAge = useMemo(() => {
    const hit = fanData.find(d => d.p10 <= 0);
    return hit ? hit.ageSelf : null;
  }, [fanData]);

  /*
   * Sequence risk, priced.
   *
   * A published return band - ours, or an institutional one - is a statement about the annualised return
   * of a holding left alone. It is silent about withdrawals, because the information simply is not in a
   * marginal return distribution: once money is coming out, the outcome depends on the ORDER returns
   * arrive in. This measures that gap in pounds, which is the most useful thing the simulation knows
   * that a rate band does not.
   *
   * Take each tier's 10th-percentile annualised rate, compound it smoothly to the terminal age, and
   * compare against the 10th-percentile pot the simulation actually produced. Three things to note:
   *
   *  - The horizon is totalYears + 1. stepYear runs t = 0..totalYears inclusive, so a plan reporting
   *    thirty years compounds thirty-one times; using totalYears understates every rate by ~3% of
   *    itself, which reads as model error rather than an off-by-one.
   *  - Every tier moves to its own 10th percentile at once. That is coherent rather than doubly
   *    pessimistic: the engine draws a single market factor per year, so the wrappers are perfectly
   *    correlated and a bad market is bad for all of them simultaneously.
   *  - resolvedPlan, not plan, so the smooth run carries the same resolved MPAA state the simulation
   *    had. riskProfiles is a top-level key that resolveMpaa never touches.
   */
  const sequenceLoss = useMemo(() => {
    if (!simResult || !Number.isFinite(simResult.p10Terminal)) return null;
    const T = ctx.totalYears + 1;
    const smoothPotAt = (edge) => {
      const flat = {};
      Object.entries(activeRiskMatrix).forEach(([k, v]) => {
        const b = E.luckyBand(E.num(v.real, 0) / 100, E.num(v.volatility, 12) / 100, T, E.num(v.sigmaParam, 0) / 100);
        flat[k] = { ...v, real: b[edge] * 100, volatility: 0, sigmaParam: 0 };
      });
      const c = E.buildContext({ ...resolvedPlan, riskProfiles: flat });
      return E.evaluateRows(c, E.simulateDeterministic(c, 'expected')).terminalPot;
    };
    const smoothLow = smoothPotAt('unlucky');
    const smoothHigh = smoothPotAt('lucky');
    const actualLow = simResult.p10Terminal, actualHigh = simResult.p90Terminal;
    const gapLow = smoothLow - actualLow, gapHigh = smoothHigh - actualHigh;
    const pctLow = smoothLow > 0 ? (gapLow / smoothLow) * 100 : 0;
    const pctHigh = smoothHigh > 0 ? (gapHigh / smoothHigh) * 100 : 0;
    /*
     * Four states, because the number alone does not say which story it is telling.
     *
     * A small gap survives even with no withdrawals at all (measured: 0.8% on a 35-to-65 accumulation
     * plan) because a contribution stream weights the early years differently from the late ones, so the
     * terminal pot stops being a monotone function of the annualised return. That is contribution
     * timing, not forced selling, and calling it a loss would overclaim. The same 0.8% also appears on a
     * genuinely withdrawing plan whose pot is large relative to the draw - a different reason for the
     * same small number, so magnitude has to be read alongside whether the plan draws down at all.
     * Below MATERIAL_PCT the figure is dominated by the first effect; a real sequence loss on these
     * fixtures runs 12-26%, an order of magnitude clear of it.
     */
    const MATERIAL_PCT = 2;
    const drawdownYears = ctx.terminalAge - Math.min(...ctx.owners.map(o => o.retireAge));
    const state = actualLow <= 0 ? 'ruin'
      : pctLow >= MATERIAL_PCT ? 'loss'
        : drawdownYears <= 0 ? 'buying' : 'small';
    return { smoothLow, smoothHigh, actualLow, actualHigh, gapLow, gapHigh, pctLow, pctHigh, state, smoothSurvives: smoothLow > 0 };
  }, [simResult, ctx.totalYears, ctx.terminalAge, ctx.owners, resolvedPlan, activeRiskMatrix]);

  const [hoveredFanPoint, setHoveredFanPoint] = useState(null);

  const histMaxY = useMemo(() => Math.max(Math.max(0, ...historicalTimeline.map(d => d.totalCombined)) * 1.12, 100000), [historicalTimeline]);
  const histYScale = useMemo(() => d3.scaleLinear().domain([0, histMaxY]).range([innerHeight, 0]).nice(), [histMaxY, innerHeight]);
  const histLinePath = useMemo(() => d3.line().x(d => histXScale(d.ageSelf)).y(d => histYScale(d.totalCombined)).curve(d3.curveMonotoneX)(historicalTimeline), [historicalTimeline, histXScale, histYScale]);

  // ------------------------------------------------------------ plan mutators
  const updateAccountField = (id, field, value) => setPlan(prev => ({ ...prev, accounts: (prev.accounts || []).map(a => a.id === id ? { ...a, [field]: field === 'risk' ? value : parseInputNumber(value) } : a) }));
  /*
   * Applying a preset writes the resolved tier table AND records which preset it came from, so a later
   * change to the inflation setting can re-derive `real` from the stored nominal figures. Without that
   * the two drift apart silently: the published nominal stays put while the real rate it implies moves.
   * Editing any field by hand clears the marker, because the table is then no longer the preset.
   */
  /*
   * A preset stores published NOMINAL figures; the engine runs on real. If inflation changes while a
   * preset is active the real rates it implies change with it, so re-derive rather than leave the two
   * disagreeing. This is the one place the app maintains the Fisher relationship as an invariant rather
   * than a convention — outside a preset, `real` and `nominal` remain independent fields as before.
   */
  useEffect(() => {
    if (!plan?.riskSource || !E.CMA_PRESETS[plan.riskSource]) return;
    const infl = E.num(plan?.config?.inflation, E.DEFAULT_CONFIG.inflation);
    const want = E.applyCmaPreset(plan.riskSource, infl);
    if (!want) return;
    const stale = Object.keys(want).some(k => Math.abs(E.num(want[k].real, 0) - E.num(plan.riskProfiles?.[k]?.real, 0)) > 0.005);
    if (stale) setPlan(prev => ({ ...prev, riskProfiles: want, riskSource: prev.riskSource }));
  }, [plan?.config?.inflation, plan?.riskSource]); // eslint-disable-line react-hooks/exhaustive-deps

  const applyRiskPreset = (key) => setPlan(prev => {
    const infl = E.num(prev?.config?.inflation, E.DEFAULT_CONFIG.inflation);
    return key === 'builtin'
      ? { ...prev, riskProfiles: { ...E.DEFAULT_RISK_PROFILES }, riskSource: '' }
      : { ...prev, riskProfiles: E.applyCmaPreset(key, infl) || prev.riskProfiles, riskSource: key };
  });

  const updateRiskField = (riskKey, field, value) => setPlan(prev => ({ ...prev, riskSource: '', riskProfiles: { ...(prev.riskProfiles || E.DEFAULT_RISK_PROFILES), [riskKey]: { ...(prev.riskProfiles || E.DEFAULT_RISK_PROFILES)[riskKey], [field]: parseInputNumber(value) } } }));
  const updateDemographics = (field, value) => setPlan(prev => ({ ...prev, demographics: { ...(prev.demographics || {}), [field]: field === 'planningMode' ? value : parseInputNumber(value) } }));
  const updateSpending = (field, value) => setPlan(prev => ({ ...prev, spending: { ...(prev.spending || {}), [field]: (field === 'drawdownStrategy' || field === 'decumulationPolicy') ? value : parseInputNumber(value) } }));
  const updateConfig = (field, value) => setPlan(prev => ({ ...prev, config: { ...(prev.config || {}), [field]: (field === 'valuationDate' || field === 'taxRegion' || typeof value === 'boolean') ? value : parseInputNumber(value) } }));
  const updateListItem = (listKey, id, patch) => setPlan(p => ({ ...p, [listKey]: (p[listKey] || []).map(i => i.id === id ? { ...i, ...patch } : i) }));
  // spending bands live under plan.spending rather than at the top level, so they get their own helpers
  // instead of teaching updateListItem to walk a nested path
  const addSpendBand = () => setPlan(prev => {
    const bands = prev.spending?.spendBands || [];
    // a new band starts where the last one ended, which is what a person adding a second phase means
    const last = bands[bands.length - 1];
    const startAt = last && !E.isBlank(last.toAge) ? E.num(last.toAge, 0) + 1 : '';
    return { ...prev, spending: { ...prev.spending, spendBands: [...bands, { id: 'sb_' + Date.now(), fromAge: startAt, toAge: '', amount: '' }] } };
  });
  const deleteSpendBand = (id) => setPlan(prev => ({ ...prev, spending: { ...prev.spending, spendBands: (prev.spending?.spendBands || []).filter(b => b.id !== id) } }));
  const updateSpendBand = (id, patch) => setPlan(prev => ({ ...prev, spending: { ...prev.spending, spendBands: (prev.spending?.spendBands || []).map(b => b.id === id ? { ...b, ...patch } : b) } }));
  const addOtherIncome = () => setPlan(prev => ({ ...prev, otherIncomes: [...(prev.otherIncomes || []), { id: 'inc_' + Date.now(), name: '', owner: 'Myself', startAge: '', endAge: '', amount: '', incomeType: 'otherTaxable', notes: '' }] }));
  const deleteOtherIncome = (id) => setPlan(prev => ({ ...prev, otherIncomes: (prev.otherIncomes || []).filter(i => i.id !== id) }));
  const addOneOffContrib = () => { const y = new Date().getFullYear() + 1; setPlan(prev => ({ ...prev, oneOffContributions: [...(prev.oneOffContributions || []), { id: 'c_' + Date.now(), date: `${y}-01-01`, year: y, owner: 'Myself', category: 'Pensions', amount: '', desc: '', transferredFrom: 'External', stagedTargetWrapper: 'Pensions' }] })); };
  const deleteOneOffContrib = (id) => setPlan(prev => ({ ...prev, oneOffContributions: (prev.oneOffContributions || []).filter(c => c.id !== id) }));
  const addOneOffCost = () => { const y = new Date().getFullYear() + 1; setPlan(prev => ({ ...prev, oneOffCosts: [...(prev.oneOffCosts || []), { id: 'cost_' + Date.now(), date: `${y}-06-01`, year: y, owner: 'Myself', amount: '', desc: '' }] })); };
  const deleteOneOffCost = (id) => setPlan(prev => ({ ...prev, oneOffCosts: (prev.oneOffCosts || []).filter(c => c.id !== id) }));

  // ------------------------------------------------------------ scenarios
  const handleSaveScenario = () => {
    setScenarios(prev => prev.map(s => s.id === activeScenarioId ? { ...s, name: scenarioNameInput.trim() !== '' ? scenarioNameInput.trim() : s.name, data: clone(plan) } : s));
    setScenarioNameInput(''); flash('Scenario saved');
  };
  const handleSaveAsNewScenario = () => {
    const trimmed = scenarioNameInput.trim();
    const finalName = trimmed !== '' ? trimmed : `Scenario ${scenarios.length + 1}`;
    const newId = 'scen_' + Date.now();
    setScenarios(prev => [...prev, { id: newId, name: finalName, data: clone(plan) }]);
    setActiveScenarioId(newId); setScenarioNameInput(''); flash(`Saved as "${finalName}"`);
  };
  const handleSelectScenario = (id) => {
    const selected = scenarios.find(s => s.id === id);
    if (!selected) return;
    const data = E.normalizePlan(selected.data);
    setSandboxCustomized(false); setActiveScenarioId(id); setPlan(data); setSimResult(null); setSafeMaxResult(null); setSandboxAccounts(sandboxFromPlan(data)); setSandboxRetire(sandboxRetireFromPlan(data));
  };
  const handleDeleteScenario = (idToDelete) => {
    if (scenarios.length <= 1) { window.alert('At least one scenario must be retained.'); return; }
    const remaining = scenarios.filter(s => s.id !== idToDelete);
    setScenarios(remaining);
    if (activeScenarioId === idToDelete) { setActiveScenarioId(remaining[0].id); setPlan(E.normalizePlan(remaining[0].data)); }
    setCompareIds(prev => prev.filter(id => id !== idToDelete));
  };

  const toggleCompare = (id) => setCompareIds(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]));
  const sortCompareBy = (key) => setCompareSort(prev => (prev.key === key ? { key, dir: prev.dir === 'desc' ? 'asc' : 'desc' } : { key, dir: 'desc' }));
  // The same three outcome states the Historical backtest reports, worded the same way. A floor failure
  // funds every year and only then ends short, so it is not a "ran dry after N of N years".
  const outcomeLabel = (r) => (r.survived ? `Survived all ${r.years} years`
    : r.failReason === 'floor' ? `All ${r.years} years funded, below floor`
      : `Ran dry after ${Math.max(0, r.failAge - r.startAge)} of ${r.years} years`);

  // ------------------------------------------------------------ sandbox
  // The sandbox as a plan object: the saved plan with its contributions, escalation and retirement ages
  // replaced by the sandbox figures. Used both to write the sandbox back and to score it in the tournament.
  const planFromSandbox = (prev) => ({
    ...prev,
    demographics: { ...prev.demographics, retireAgeSelf: sandboxRetire.self, ...(isCouple ? { retireAgePart: sandboxRetire.part } : {}) },
    accounts: (prev.accounts || []).map(acc => {
      const sb = sandboxAccounts[acc.id];
      if (!sb) return acc;
      const out = { ...acc, contrib: sb.contrib, growth: sb.growth };
      if (sb.balance !== undefined) out.balance = sb.balance;
      if (sb.contribByYear) out.contribByYear = sb.contribByYear; else delete out.contribByYear;
      return out;
    })
  });
  const handleApplySandboxToPlan = () => {
    setSandboxCustomized(false);
    setPlan(prev => planFromSandbox(prev));
    flash('Sandbox applied to plan inputs');
  };
  // Scores the six strategies against the sandbox figures instead of the saved plan, so a sandbox worth
  // keeping can be tested before it is written back. The plan is frozen at the moment of the click — later
  // sandbox edits do not silently change what the displayed results were run on.
  const handleRunTournamentFromSandbox = () => {
    const base = E.normalizePlan(clone(planFromSandbox(plan)));
    setTournament(prev => ({ ...prev, basePlan: base, results: null, autoRun: prev.autoRun + 1 }));
    setActiveTab('simulation');
    flash('Running the tournament on your sandbox figures', 4000);
  };
  const handleResetSandbox = () => { setSandboxCustomized(false); setSandboxAccounts(sandboxFromPlan(plan)); setSandboxRetire(sandboxRetireFromPlan(plan)); };
  const updateSandboxRetire = (key, value) => {
    setSandboxCustomized(true);
    setSandboxRetire(prev => ({ ...prev, [key]: E.clamp(E.num(value, prev[key]), 0, 120) }));
  };
  const adjustSandboxRetire = (key, delta) => {
    setSandboxCustomized(true);
    setSandboxRetire(prev => ({ ...prev, [key]: E.clamp(E.num(prev[key], 60) + delta, 0, 120) }));
  };
  const updateSandboxField = (id, field, value) => {
    setSandboxCustomized(true);
    setSandboxAccounts(prev => { const cur = { ...(prev[id] || {}) }; delete cur.contribByYear; return { ...prev, [id]: { ...cur, [field]: parseInputNumber(value) } }; });
  };
  const adjustSandboxContrib = (id, delta) => {
    setSandboxCustomized(true);
    setSandboxAccounts(prev => { const cur = { ...(prev[id] || {}) }; delete cur.contribByYear; return { ...prev, [id]: { ...cur, contrib: Math.max(0, E.num(cur.contrib, 0) + delta) } }; });
  };
  const handleApplyStrategyToSandbox = (strategy) => {
    setSandboxCustomized(true);
    const fresh = {};
    (strategy.planState?.accounts || []).forEach(a => {
      fresh[a.id] = { contrib: E.num(a.contrib, 0), growth: E.num(a.growth, 0) };
      const base = (plan.accounts || []).find(x => x.id === a.id);
      if (base && E.num(base.balance, 0) !== E.num(a.balance, 0)) fresh[a.id].balance = E.num(a.balance, 0);
      if (Array.isArray(a.contribByYear)) fresh[a.id].contribByYear = a.contribByYear;
    });
    setSandboxAccounts(fresh);
    setActiveTab('trajectory');
    flash(`"${strategy.name}" applied to Sandbox & Trajectory chart`, 3500);
  };

  // Writes the strategy straight into the plan rather than the sandbox. Contributions and escalation are
  // replaced wholesale — the escalation is the normalised rate, not the one originally entered, so copying
  // only the amounts would leave the plan costing a different total from the strategy that was scored.
  const handleApplyStrategyToPlan = (strategy) => {
    if (!strategy?.planState) return;
    setPlan(prev => ({
      ...prev,
      accounts: (prev.accounts || []).map(a => {
        const next = (strategy.planState.accounts || []).find(x => x.id === a.id);
        if (!next) return a;
        const out = { ...a, contrib: E.num(next.contrib, 0), growth: E.num(next.growth, 0) };
        // a balance only moves when the strategy actually shifts capital (Bed & SIPP)
        if (E.num(next.balance, 0) !== E.num(a.balance, 0)) out.balance = E.num(next.balance, 0);
        if (Array.isArray(next.contribByYear)) out.contribByYear = next.contribByYear; else delete out.contribByYear;
        return out;
      })
    }));
    setActiveTab('inputs');
    flash(`"${strategy.name}" written into Plan Inputs. Save a scenario first if you want the old figures back`, 6000);
  };

  // ------------------------------------------------------------ import / export / reset
  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(plan, null, 2));
    const a = document.createElement('a'); a.setAttribute('href', dataStr); a.setAttribute('download', `retirement_plan_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(a); a.click(); a.remove();
  };
  const handleImportJSON = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
        setSandboxCustomized(false); setPlan(E.normalizePlan(parsed)); setSimResult(null); setSafeMaxResult(null); flash('Plan imported');
      } catch (err) { window.alert('Invalid JSON configuration file.'); }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };
  const handleResetDefaults = () => {
    if (window.confirm('Reset all inputs back to blank?')) { setSandboxCustomized(false); setPlan(E.normalizePlan(null)); safeStorageRemove(STORAGE_KEY); setSimResult(null); setSafeMaxResult(null); }
  };
  const handleExportCSV = () => {
    if (!timelineData.length) return;
    const headers = ['Year', 'Age (Myself)', 'Age (Partner)', 'Working (Myself)', 'Working (Partner)', 'Target Spend (£)', 'Net Guaranteed Income (£)', 'Working Partner Take-home (£)', 'State Pension (Myself £)', 'State Pension (Partner £)', 'Net Drawdown Demand (£)', 'Pension Withdrawals Gross (£)', 'PA Harvested (£)', 'Income Tax (£)', 'CGT (£)', 'Realised Gains (£)', 'Pensions (£)', 'ISAs (£)', 'Other Investments (£)', 'Cash Savings (£)', 'Total Combined Pot (£)', 'Pre-SIPP access Liquid (£)', 'Unmet (£)', 'Status'];
    const rows = timelineData.map(r => [r.year, r.ageSelf, isCouple ? r.agePart : 'N/A', r.workingSelf ? 'Yes' : 'No', isCouple ? (r.workingPart ? 'Yes' : 'No') : 'N/A', r.targetSpend.toFixed(0), r.netGuaranteed.toFixed(0), r.workingTakeHome.toFixed(0), r.spSelf.toFixed(0), isCouple ? r.spPart.toFixed(0) : '0', r.netDrawdown.toFixed(0), r.drawdownPensions.toFixed(0), r.harvested.toFixed(0), r.taxPaid.toFixed(0), (r.cgtPaid || 0).toFixed(0), (r.realisedGains || 0).toFixed(0), r.pensions.toFixed(0), r.isas.toFixed(0), r.other.toFixed(0), r.cash.toFixed(0), r.totalCombined.toFixed(0), r.preNmpaLiquid.toFixed(0), r.unmetDemand.toFixed(0), r.preNmpaInsolvent ? 'Pre-SIPP access gap' : r.unmetDemand > E.FAIL_TOLERANCE ? 'Shortfall' : 'Solvent']);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a'); link.setAttribute('href', encodeURI(csvContent)); link.setAttribute('download', `retirement_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link); link.click(); link.remove();
  };

  // ------------------------------------------------------------ Monte Carlo
  // Stage 1: the plan exactly as entered. Fast, and the only stage that always runs.
  const runStageTest = async (scale = { from: 0, to: 1 }) => {
    const label = `Testing ${MC_TRIALS.toLocaleString()} paths against your current spend…`;
    setSimProgress({ label, value: scale.from });
    await tick();
    const stats = await runMonteCarloAsync(ctx, {
      trials: MC_TRIALS, seed: mcSeed, shouldStop: () => mcCancelRef.current, collectPaths: true,
      onProgress: (f) => setSimProgress({ label, value: scale.from + (scale.to - scale.from) * f })
    });
    if (mcCancelRef.current) return null;
    const res = { ...stats, spend: ctx.targetSpend };
    setSimResult(res);
    return res;
  };

  /*
   * Stage 2: the same engine run backwards. Stage 1 fixes the spending and reports the risk; this fixes
   * the risk and reports the spending. It bisects on the spend, re-running the search at each step, then
   * confirms the answer over the full path count, which is why it costs more than stage 1.
   */
  const runStageSafeMax = async (targetRate, scale = { from: 0, to: 1 }) => {
    const span = scale.to - scale.from;
    setSimProgress({ label: `Solving for the most you could spend at ${targetRate}%…`, value: scale.from });
    await tick();
    const paths = E.pathsForSeed(mcSeed, SEARCH_TRIALS, ctx.totalYears);
    const rateAt = (spend) => { let s = 0; for (const zs of paths) if (E.runTrial(ctx, zs, spend).survived) s++; return (s / SEARCH_TRIALS) * 100; };
    let low = 0, result;
    if (rateAt(0) < targetRate) {
      result = { spend: 0, note: 'Even zero spending fails the target. Check the pre-SIPP access gap, one-off costs or the bequest floor.' };
    } else {
      let high = Math.max(20000, ctx.targetSpend * 2, 150000), guard = 0;
      while (rateAt(high) >= targetRate && guard++ < 8) { low = high; high *= 2; }
      for (let iter = 0; iter < 14; iter++) {
        const mid = E.round250((low + high) / 2);
        if (mid <= low || mid >= high) break;
        if (rateAt(mid) >= targetRate) low = mid; else high = mid;
        setSimProgress({ label: `Narrowing… £${low.toLocaleString()}–£${high.toLocaleString()}`, value: scale.from + span * (0.1 + 0.5 * (iter + 1) / 14) });
        await tick();
        if (mcCancelRef.current) break;
      }
      result = { spend: E.round250(low) };
    }
    const stats = await runMonteCarloAsync(ctx, {
      trials: MC_TRIALS, seed: mcSeed + 1, spendOverride: result.spend, shouldStop: () => mcCancelRef.current,
      onProgress: (f) => setSimProgress({ label: `Confirming £${result.spend.toLocaleString()} over ${MC_TRIALS.toLocaleString()} paths…`, value: scale.from + span * (0.6 + 0.4 * f) })
    });
    if (mcCancelRef.current) return null;
    const res = { spend: result.spend, note: result.note, targetRate, stats };
    setSafeMaxResult(res);
    return res;
  };

  /*
   * The single action on the tab. Each stage renders as it lands rather than at the end, so the fast
   * answer is on screen in about a second while the slower ones are still working. Stage 3 hands off to
   * the tournament panel, which owns its own progress and results, by bumping the token it watches.
   */
  const handleRunAll = async () => {
    if (isSimulating || isOptimizing) return;
    mcCancelRef.current = false;
    const wantSafeMax = mcStages.safeMax;
    setIsSimulating(true);
    // Every stage is cleared, including one that is about to be skipped: a verdict line left over from an
    // earlier run would otherwise sit alongside fresh figures and read as part of the same measurement.
    setSimResult(null); setSafeMaxResult(null);
    setTournament(prev => (prev.results ? { ...prev, results: null } : prev));
    try {
      await runStageTest(wantSafeMax ? { from: 0, to: 0.35 } : { from: 0, to: 1 });
      if (mcCancelRef.current) return;
      if (wantSafeMax) {
        setIsOptimizing(true);
        await runStageSafeMax(targetSurvivalRate, { from: 0.35, to: 1 });
      }
    } finally {
      setIsSimulating(false); setIsOptimizing(false); setSimProgress(null);
    }
    if (mcCancelRef.current) return;
    if (mcStages.tournament) setTournament(prev => ({ ...prev, autoRun: prev.autoRun + 1 }));
  };

  // Re-solve stage 2 alone, which is what a change of target survival rate needs: stage 1 does not depend on it.
  const handleResolveSafeMax = async () => {
    if (isSimulating || isOptimizing) return;
    mcCancelRef.current = false;
    setIsOptimizing(true);
    try { await runStageSafeMax(targetSurvivalRate); }
    finally { setIsOptimizing(false); setSimProgress(null); }
  };

  const handleCancelMC = () => { mcCancelRef.current = true; tournamentCancelRef.current = true; };

  // Derived once for the verdict strip, which reports whichever stages have landed so far.
  const mcBusy = isSimulating || isOptimizing || tournament.isEvaluating;
  const safeMaxStale = !!safeMaxResult && safeMaxResult.targetRate !== targetSurvivalRate;
  const tournamentBest = tournament.results && tournament.results.bestId
    ? tournament.results.players.find(p => p.id === tournament.results.bestId) : null;
  const tournamentBaselinePlayer = tournament.results
    ? tournament.results.players.find(p => p.id === 'baseline') : null;

  // ------------------------------------------------------------ decumulation policy auto-pick
  // Every policy combination is scored on the same seed (common random numbers), so the differences
  // between them are far more reliable than each one's absolute sampling error.
  const POLICY_SHORT = { 'Bracket Fill Basic': 'Tax Smoothing', 'Bracket Fill': 'UK FIRE Bracket Fill', 'Sequential': 'Sequential' };
  const policyRowLabel = (c) => `${POLICY_SHORT[c.decumulationPolicy] || c.decumulationPolicy} · ${c.drawdownStrategy === 'Full 25% Lump Sum' ? 'Lump Sum' : 'Phased'}${c.harvestApplies ? (c.harvestPersonalAllowance ? ' · harvest on' : ' · harvest off') : ''}`;
  // nothing to decumulate means every policy scores identically, so the sweep would be meaningless
  const policySweepReady = useMemo(() => {
    const funded = (ctx.accounts || []).reduce((s, a) => s + a.balance + a.contrib, 0);
    return funded > 0 && ctx.targetSpend > 0;
  }, [ctx]);

  const handleFindBestPolicy = async () => {
    setIsPolicySearching(true); setPolicyResults(null);
    setPolicyProgress({ label: 'Preparing policy combinations…', value: 0 });
    await tick();
    try {
      const candidates = E.buildPolicyCandidates(plan);
      const out = [];
      for (let i = 0; i < candidates.length; i++) {
        const c = candidates[i];
        const label = policyRowLabel(c);
        setPolicyProgress({ label: `Testing ${i + 1}/${candidates.length}: ${label}`, value: i / candidates.length });
        await tick();
        // resolve MPAA per candidate: the policies differ in when taxable pension income starts
        const cctx = E.buildContext(E.resolveMpaa(c.planState));
        const stats = await runMonteCarloAsync(cctx, {
          trials: TOURNAMENT_TRIALS, seed: mcSeed,
          onProgress: (f) => setPolicyProgress({ label: `Testing ${i + 1}/${candidates.length}: ${label}`, value: (i + f) / candidates.length })
        });
        out.push({ ...c, label, stats });
      }
      const best = E.pickBest(out);
      setPlan(prev => ({
        ...prev,
        spending: { ...(prev.spending || {}), decumulationPolicy: best.decumulationPolicy, drawdownStrategy: best.drawdownStrategy },
        config: { ...(prev.config || {}), harvestPersonalAllowance: best.harvestPersonalAllowance }
      }));
      const rows = [...out].sort((a, b) =>
        (a.id === best.id ? -1 : b.id === best.id ? 1 : 0) ||
        (b.stats.successRate - a.stats.successRate) ||
        (b.stats.p10Terminal - a.stats.p10Terminal) ||
        (b.stats.medianTerminal - a.stats.medianTerminal));
      setPolicyResults({ rows, bestId: best.id, seed: mcSeed, trials: TOURNAMENT_TRIALS });
      flash(`Applied "${best.label}": highest survival of ${candidates.length} policy combinations`, 4000);
    } finally { setIsPolicySearching(false); setPolicyProgress(null); }
  };

  const displayedAccounts = isCouple ? (plan?.accounts || []) : (plan?.accounts || []).filter(a => a.owner === 'Myself');
  // enough has been entered for the rest of the app to say something meaningful
  const planStarted = E.num(plan?.spending?.targetSpend, 0) > 0
    || (plan?.accounts || []).some(a => E.num(a.balance, 0) > 0 || E.num(a.contrib, 0) > 0);
  const tabBtn = (id, Icon, label, accent = 'blue') => (
    <button key={id} onClick={() => setActiveTab(id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === id ? (accent === 'indigo' ? 'bg-surface text-indigo-600 shadow-xs' : 'bg-surface text-blue-600 shadow-xs') : 'text-slate-600 hover:text-slate-900'}`}>
      <Icon className="w-3.5 h-3.5" /> {label}
    </button>
  );
  const ageMarker = (age, label, color, fill, stroke, textColor, y, scale, shownAge = age) => (age <= effectiveMaxVisibleAge && age >= currentAge) ? (
    <g transform={`translate(${scale(age)}, 0)`}>
      <line y2={innerHeight} stroke={color} strokeWidth="1.5" strokeDasharray="4,4" />
      <rect x={-46} y={y} width={92} height={20} rx={4} fill={fill} stroke={stroke} />
      <text y={y + 14} textAnchor="middle" fill={textColor} fontSize="10" fontWeight="bold">{label} ({shownAge})</text>
    </g>
  ) : null;
  const mp = MARKER_PALETTE[theme];
  const cp = CHART_PALETTE[theme];
  const themedSeries = useMemo(() => SERIES_CONFIG.map(s => ({ ...s, color: s.colors[theme] })), [theme]);
  const markers = (scale) => (
    <>
      {ageMarker(ctx.owners[0].retireAge, 'Retire M', mp.retireSelf.line, mp.retireSelf.fill, mp.retireSelf.stroke, mp.retireSelf.text, 10, scale)}
      {isCouple && ageMarker(ctx.owners[1].retireAge + (currentAge - ctx.agePart0), 'Retire P', mp.retirePart.line, mp.retirePart.fill, mp.retirePart.stroke, mp.retirePart.text, 32, scale, ctx.owners[1].retireAge)}
      {ageMarker(nmpa, 'NMPA', mp.nmpa.line, mp.nmpa.fill, mp.nmpa.stroke, mp.nmpa.text, 54, scale)}
      {ageMarker(ctx.spa, 'State Pen', mp.statePension.line, mp.statePension.fill, mp.statePension.stroke, mp.statePension.text, 76, scale)}
    </>
  );


  const themeOptions = [
    { id: 'classic', Icon: Monitor, title: 'Classic theme (original look)' },
    { id: 'light', Icon: Sun, title: 'Riviera Ledger (light)' },
    { id: 'dark', Icon: Moon, title: 'Control Room (dark)' },
  ];

  // One sandbox shared by the Trajectory and Monte Carlo tabs: both render this same markup, so it is
  // backed by a single piece of state and an edit made in one tab is already present in the other.
  // On the Monte Carlo tab it sits below the tournament and starts collapsed, since the tournament is
  // what that tab is for and the sandbox is the follow-on.
  const renderSandboxPanel = ({ tab }) => {
    const open = !!sandboxOpen[tab];
    return (
    <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-5">
      <div className={open ? 'pb-3 border-b border-slate-100' : ''}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> Sandbox</h3>
            <p className="text-xs text-slate-500 mt-0.5">Test contributions, escalation rates and tournament strategies without modifying your base plan inputs.</p>
          </div>
          <button type="button" onClick={() => setSandboxOpen(o => ({ ...o, [tab]: !o[tab] }))} className="shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 cursor-pointer">
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            {open ? 'Hide' : isSandboxModified ? 'Show (edited)' : 'Show'}
          </button>
        </div>
      </div>
      {!open ? null : <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 pb-3 border-y border-slate-100">
        <div><h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Wrapper Sandbox Controls</h4><span className="text-[11px] text-slate-500">Adjust retirement ages and individual wrappers below, or reset back to your baseline plan inputs.</span></div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handleResetSandbox} disabled={!isSandboxModified} className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${isSandboxModified ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 cursor-pointer' : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'}`}><RotateCcw className="w-3.5 h-3.5" /> Reset Sandbox</button>
          <button onClick={handleApplySandboxToPlan} disabled={!isSandboxModified} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${isSandboxModified ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 dark:from-[#C77A2E] dark:to-[#B0631E] dark:hover:from-[#B0631E] dark:hover:to-[#8A4C17] text-white cursor-pointer active:scale-95' : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'}`}><Check className="w-3.5 h-3.5" /> Apply to Plan Inputs</button>
          <button onClick={handleRunTournamentFromSandbox} title="Score the six wrapper strategies against these sandbox figures instead of your saved plan inputs"
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-95"><Zap className="w-3.5 h-3.5" /> Re-run Tournament on Sandbox</button>
        </div>
      </div>
      <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Users className="w-4 h-4 text-slate-500" />
          <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Retirement Age</h5>
          <span className="text-[11px] text-slate-500">Contributions stop and drawdown begins at this age. Test retiring earlier or later.</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ctx.owners.map(o => {
            const base = sandboxRetireFromPlan(plan)[o.key];
            const val = sandboxRetire[o.key];
            const changed = val !== base;
            const yearsToGo = Math.max(0, Math.round(val - o.age0));
            return (
              <div key={o.key} className={`p-3 rounded-xl border transition-colors ${changed ? 'bg-amber-50/60 border-amber-200' : 'bg-surface border-slate-200'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-slate-800 font-sans">{o.label}</span>
                  {changed
                    ? <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-sans text-[10px] font-bold">{base} &rarr; {val}</span>
                    : <span className="text-slate-400 font-sans text-[10px]">Base: {base}</span>}
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <input type="number" min="0" max="120" step="1" value={val} onFocus={handleFocus} onChange={(e) => updateSandboxRetire(o.key, e.target.value)} className="w-20 p-1.5 bg-surface border border-slate-300 rounded font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                  {[-5, -1, 1, 5].map(d => (
                    <button key={d} onClick={() => adjustSandboxRetire(o.key, d)} className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-sans font-semibold text-slate-700 cursor-pointer">{d > 0 ? '+' : ''}{d}</button>
                  ))}
                  <span className="text-[10px] text-slate-400 font-sans ml-auto">{yearsToGo > 0 ? `${yearsToGo} yr${yearsToGo === 1 ? '' : 's'} to go` : 'at/past current age'}</span>
                </div>
                {val < nmpa && <div className="text-[10px] text-amber-700 font-sans mt-1.5">Retires before pension access age {nmpa}: needs {Math.round(nmpa - val)} yr bridge from ISAs/GIA/cash.</div>}
              </div>
            );
          })}
        </div>
      </div>
      {sandboxMetrics && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className={`p-4 rounded-2xl border shadow-2xs ${sandboxMetrics.terminalDelta >= 0 ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
            <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Terminal Pot Impact (@ {terminalAge})</span>{sandboxMetrics.terminalDelta >= 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-600" /> : <ArrowDownRight className="w-4 h-4 text-rose-600" />}</div>
            <div className={`text-xl font-black font-mono mt-1 ${sandboxMetrics.terminalDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{sandboxMetrics.terminalDelta >= 0 ? '+' : ''}{formatGBP(sandboxMetrics.terminalDelta)}</div>
            <span className="text-[11px] text-slate-500 block mt-0.5 font-mono">{formatGBP(sandboxMetrics.baseTerminal)} &rarr; {formatGBP(sandboxMetrics.sbTerminal)}</span>
          </div>
          <div className={`p-4 rounded-2xl border shadow-2xs ${sandboxMetrics.retirementDelta >= 0 ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'}`}>
            <div className="flex items-center justify-between"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Retirement Pot Impact</span>{sandboxMetrics.retirementDelta >= 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-600" /> : <ArrowDownRight className="w-4 h-4 text-rose-600" />}</div>
            <div className={`text-xl font-black font-mono mt-1 ${sandboxMetrics.retirementDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{sandboxMetrics.retirementDelta >= 0 ? '+' : ''}{formatGBP(sandboxMetrics.retirementDelta)}</div>
            <span className="text-[11px] text-slate-500 block mt-0.5 font-mono">{sandboxMetrics.baseRetAge === sandboxMetrics.sbRetAge ? `At Age ${sandboxMetrics.baseRetAge}` : `Age ${sandboxMetrics.baseRetAge} → ${sandboxMetrics.sbRetAge} (each at own retirement)`}</span>
          </div>
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 shadow-2xs"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Cumulative Extra Invested</span><div className="text-xl font-bold font-mono text-slate-800 mt-1">{sandboxMetrics.cumulativeExtraCapital >= 0 ? '+' : ''}{formatGBP(sandboxMetrics.cumulativeExtraCapital)}</div><span className="text-[11px] text-slate-500 block mt-0.5">Total difference in deposits to retirement</span></div>
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 shadow-2xs"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Wealth Compounding Multiple</span><div className="text-xl font-bold font-mono text-indigo-700 mt-1">{sandboxMetrics.cumulativeExtraCapital !== 0 ? `${sandboxMetrics.multiplier.toFixed(2)}x` : '-'}</div><span className="text-[11px] text-slate-500 block mt-0.5">Terminal change per £1 of extra deposits</span></div>
        </div>
      )}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold font-sans"><tr><th className="p-3">Portfolio Wrapper</th>{isCouple && <th className="p-3">Owner</th>}<th className="p-3">Annual Contribution (£)</th><th className="p-3">Quick Adjust</th><th className="p-3">Escalation (% / yr)</th><th className="p-3 text-right">Status</th></tr></thead>
          <tbody className="divide-y divide-slate-100 font-mono">
            {displayedAccounts.map(acc => {
              const sb = sandboxAccounts[acc.id] || { contrib: acc.contrib, growth: acc.growth };
              const isModified = E.num(acc.contrib, 0) !== E.num(sb.contrib, 0) || E.num(acc.growth, 0) !== E.num(sb.growth, 0) || (sb.balance !== undefined && E.num(sb.balance, 0) !== E.num(acc.balance, 0)) || !!sb.contribByYear;
              return (
                <tr key={acc.id} className={`transition-colors ${isModified ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'}`}>
                  <td className="p-3 font-sans font-bold text-slate-800">{acc.category}<span className="block text-[10px] text-slate-400 font-normal">Base: {formatGBP(E.num(acc.contrib, 0))} / yr @ {acc.growth || 0}%{sb.balance !== undefined && E.num(sb.balance, 0) !== E.num(acc.balance, 0) ? ` · balance ${formatGBP(E.num(acc.balance, 0))} → ${formatGBP(sb.balance)}` : ''}</span></td>
                  {isCouple && <td className="p-3 font-sans text-slate-600">{acc.owner}</td>}
                  <td className="p-3"><div className="flex items-center gap-1.5"><input type="number" min="0" step="250" value={sb.contrib} onFocus={handleFocus} onChange={(e) => updateSandboxField(acc.id, 'contrib', e.target.value)} className="w-28 p-1.5 bg-surface border border-slate-300 rounded font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500" />{sb.contribByYear && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-sans" title="Year-by-year schedule from a phased strategy; editing replaces it">phased</span>}</div></td>
                  <td className="p-3"><div className="flex items-center gap-1">{[-1000, -500, 500, 1000].map(d => <button key={d} onClick={() => adjustSandboxContrib(acc.id, d)} className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-sans font-semibold text-slate-700 cursor-pointer">{d > 0 ? '+' : ''}{Math.abs(d) >= 1000 ? `${d / 1000}k` : d}</button>)}</div></td>
                  <td className="p-3"><div className="flex items-center gap-1.5"><input type="number" step="0.5" value={sb.growth} onFocus={handleFocus} onChange={(e) => updateSandboxField(acc.id, 'growth', e.target.value)} className="w-20 p-1.5 bg-surface border border-slate-300 rounded text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500" /><span className="text-slate-400 font-sans">%</span></div></td>
                  <td className="p-3 text-right">{isModified ? <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-sans text-[10px] font-bold">Adjusted</span> : <span className="text-slate-400 font-sans text-[10px]">Unchanged</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      </>}
    </div>
    );
  };


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Bar */}
        <div className="bg-surface border border-slate-200/90 rounded-2xl p-5 shadow-xs">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100"><TrendingUp className="w-5 h-5" /></div>
                <h1 className="text-xl font-bold tracking-tight text-slate-900 font-display italic">Monte-Carlo Retirement Planner</h1>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-100">{APP_VERSION}</span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
                UK multi-wrapper drawdown model, Monte Carlo &amp; historical backtesting. <strong className="text-slate-700 font-semibold">For educational &amp; illustrative purposes only. This is not financial advice.</strong> Please complete <span className="font-semibold text-blue-700">Plan Inputs</span> first; Config changes are optional.
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* data-tabbar keeps these clickable while the in-app editor is on, so you can still move
                  between tabs while editing; Alt-click edits a tab's own label. */}
              <div data-tabbar className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 flex-wrap">
                {tabBtn('home', Home, 'Start Here')}
                {tabBtn('inputs', Sliders, 'Plan Inputs')}
                {tabBtn('config', Settings, 'Config & Assumptions')}
                {tabBtn('trajectory', Layers, 'Portfolio Trajectory')}
                {tabBtn('simulation', Dices, 'Monte Carlo Simulation', 'indigo')}
                {tabBtn('historical', History, 'Historical Backtest', 'indigo')}
                {tabBtn('audit', Table, 'Audit Data Table')}
                {tabBtn('docs', BookOpen, 'Documentation')}
              </div>
              <div className="flex items-center gap-0.5 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                {themeOptions.map(({ id, Icon, title }) => (
                  <button key={id} type="button" onClick={() => setTheme(id)} title={title}
                    className={`p-1.5 rounded-lg transition-all cursor-pointer ${theme === id ? 'bg-surface text-indigo-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}>
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="h-px bg-indigo-600/60 mt-4" />
          <div className="h-px bg-indigo-600/25 mt-[3px]" />
        </div>

        {/* Scenario Toolbar */}
        {activeTab !== 'home' && (
        <div className="bg-surface border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700"><Bookmark className="w-4 h-4 text-blue-600" /><span>Active Scenario:</span></div>
            <div className="flex items-center gap-1.5">
              <select value={activeScenarioId} onChange={(e) => handleSelectScenario(e.target.value)} className="p-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer">
                {scenarios.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              {scenarios.length > 1 && (
                <button onClick={() => handleDeleteScenario(activeScenarioId)} title="Delete this scenario" className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer rounded-lg hover:bg-rose-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <input type="text" placeholder="Scenario name (optional)" value={scenarioNameInput} onChange={(e) => setScenarioNameInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveScenario(); }} className="p-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-surface focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-56" />
            <button onClick={handleSaveScenario} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"><Save className="w-3.5 h-3.5" /> Save</button>
            <button onClick={handleSaveAsNewScenario} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200 cursor-pointer"><Plus className="w-3.5 h-3.5 text-slate-600" /> Save as New Scenario</button>
            {saveSuccessMsg && <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200"><Check className="w-3 h-3 text-emerald-600" /> {saveSuccessMsg}</span>}
          </div>
        </div>
        )}

        {activeTab !== 'docs' && activeTab !== 'home' && <WarningsBanner warnings={ctx.warnings} />}

        {/* TAB 0: LANDING */}
        {activeTab === 'home' && (
          <div className="space-y-6">
            <div className="relative overflow-hidden bg-surface border border-slate-200/90 rounded-2xl shadow-xs">
              {/* light-touch sketches: decorative, behind the text, and out of the way on narrow screens */}
              <SketchRoulette spin className="hidden md:block absolute -right-6 -top-4 w-64 lg:w-80 text-indigo-600/[0.2] pointer-events-none" />
              <SketchCards className="hidden lg:block absolute right-64 top-16 w-40 text-amber-600/[0.16] pointer-events-none rotate-6" />
              <div className="relative p-6 sm:p-8 max-w-2xl space-y-3">
                <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-indigo-600">His Majesty's Royal Casino presents</span>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-display italic leading-tight">
                  Test your portfolio against the casino of life!
                </h2>
                <p className="text-sm text-slate-600 leading-relaxed">
                  This model runs your pensions, ISAs, GIA and cash through {MC_TRIALS.toLocaleString()} different
                  market histories, taxes every withdrawal under UK rules, and tells you how often the plan actually holds, not just how it looks
                  on a good day.
                </p>
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button type="button" onClick={() => setActiveTab('inputs')}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer active:scale-95">
                    <Sliders className="w-3.5 h-3.5" /> {planStarted ? 'Back to Plan Inputs' : 'Start with Plan Inputs'}
                  </button>
                  <button type="button" onClick={() => setActiveTab('docs')}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer">
                    <BookOpen className="w-3.5 h-3.5" /> Read the methodology
                  </button>
                </div>
                <p className="text-[11px] text-slate-500 pt-1">
                  <strong className="text-slate-700 font-semibold">Educational and illustrative only. This is not financial advice.</strong> Everything
                  is stated in today&rsquo;s money, and your plan is saved in this browser only.
                </p>
              </div>
            </div>

            {/* what each tab does */}
            <div className="bg-surface border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">What each tab is for</h3>
                <p className="text-[11px] text-slate-500 mt-0.5">Click any card to go there. Plan Inputs is the only tab you have to fill in. Everything else reads from what you entered there.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {[
                  { tab: 'inputs', Icon: Sliders, name: 'Plan Inputs', accent: 'blue', need: 'Required',
                    body: 'Who you are, when you stop working, what you spend, and what each wrapper holds. One-off costs and deposits live here too. Choose Advanced inputs if either of you is self-employed.' },
                  { tab: 'config', Icon: Settings, name: 'Config & Assumptions', accent: 'blue', need: 'Optional',
                    body: 'Tax rates, allowances, return and volatility assumptions, drawdown policy and the random seed. Defaults are current-year figures, so change them to test a different assumption, not because the tab exists.' },
                  { tab: 'trajectory', Icon: Layers, name: 'Portfolio Trajectory', accent: 'blue',
                    body: 'A single expected-return path, year by year, with a sandbox for testing a different contribution or retirement age against it.' },
                  { tab: 'simulation', Icon: Dices, name: 'Monte Carlo Simulation', accent: 'indigo',
                    body: `${MC_TRIALS.toLocaleString()} random market paths, a survival rate, and the safe-spend solver. It also runs the strategy tournament that re-splits your budget across wrappers.` },
                  { tab: 'historical', Icon: History, name: 'Historical Backtest', accent: 'indigo',
                    body: `Replays real returns from ${E.HISTORICAL_FIRST_YEAR} onwards through your plan. A reality check on the random draws: sequences like 1973 or 2000 actually happened.` },
                  { tab: 'audit', Icon: Table, name: 'Audit Data Table', accent: 'blue',
                    body: 'Every projected year as raw numbers (balances, drawdown, tax paid), so you can check the arithmetic rather than trust the charts.' },
                  { tab: 'docs', Icon: BookOpen, name: 'Documentation', accent: 'blue',
                    body: 'How each calculation works, which modelling decisions were made and why, and what is not modelled yet, plainly stated.' }
                ].map(t => (
                  <button key={t.tab} type="button" onClick={() => setActiveTab(t.tab)}
                    className="text-left p-3.5 rounded-xl border border-slate-200 bg-surface hover:border-indigo-200 hover:bg-slate-50 transition-colors cursor-pointer group flex flex-col gap-1.5">
                    <span className="flex flex-wrap items-center gap-2">
                      <t.Icon className={`w-4 h-4 shrink-0 ${t.accent === 'indigo' ? 'text-indigo-600' : 'text-blue-600'}`} />
                      <strong className="text-xs font-bold text-slate-900 group-hover:text-indigo-700">{t.name}</strong>
                      {t.need && <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${t.need === 'Required' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-600'}`}>{t.need}</span>}
                    </span>
                    <span className="text-[11px] text-slate-600 leading-relaxed">{t.body}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* honesty note */}
            <div className="relative overflow-hidden bg-slate-50 border border-slate-200 rounded-2xl p-5">
              <SketchCards className="hidden sm:block absolute -right-3 -bottom-8 w-44 text-slate-500/[0.12] pointer-events-none -rotate-6" />
              <div className="relative max-w-2xl space-y-2">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Info className="w-4 h-4 text-slate-500" /> What this model will not tell you</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  It covers UK income tax and its personal-allowance taper, including the Scottish and Welsh bands, National Insurance for
                  employees and the self-employed, the annual allowance with taper and carry-forward, the MPAA, ISA limits, realisation-based
                  CGT, the {Math.round(P.pclsProp * 100)}% tax-free element and the pre-SIPP access bridge. It does <em>not</em> cover
                  inheritance tax on the wider estate, defined benefit accrual, or care costs.
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Assumption and gap is listed below. Weigh accordingly.
                </p>
                <button type="button" onClick={() => goToDoc('doc-coverage')}
                  className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-semibold flex items-center gap-1 cursor-pointer pt-0.5">
                  <HelpCircle className="w-3.5 h-3.5" /> Modelling decisions, coverage and known gaps &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 1: PLAN INPUTS */}
        {activeTab === 'inputs' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-slate-200/90 p-4 rounded-2xl shadow-xs">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">User Inputs &amp; Wrapper Portfolios</h2>
                <p className="text-xs text-slate-500">Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">Tab</kbd> to move between fields. All amounts are in today's money (real terms).</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleExportJSON} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"><Download className="w-3.5 h-3.5" /> Export JSON</button>
                <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"><Upload className="w-3.5 h-3.5" /> Import JSON</button>
                <input type="file" ref={fileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />
                <button onClick={handleResetDefaults} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"><RotateCcw className="w-3.5 h-3.5" /> Clear All Inputs</button>
              </div>
            </div>

            {/* Demographics & Targets */}
            <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /> 1. Demographics, Salaries &amp; Retirement Targets</h3>
                  <span className="text-xs text-slate-500">Choose whether this plan is for an individual or a couple.</span>
                </div>
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button type="button" onClick={() => updateDemographics('planningMode', 'single')} className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${!isCouple ? 'bg-surface text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>Single</button>
                  <button type="button" onClick={() => updateDemographics('planningMode', 'couple')} className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${isCouple ? 'bg-surface text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>With Partner</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div><label className="text-slate-600 font-semibold block mb-1">Current Age (Myself)</label><input type="number" min="0" max="120" placeholder="e.g. 40" onFocus={handleFocus} value={plan?.demographics?.currentAgeSelf ?? ''} onChange={(e) => updateDemographics('currentAgeSelf', e.target.value)} className={inputCls} /></div>
                {isCouple && <div><label className="text-slate-600 font-semibold block mb-1">Current Age (Partner)</label><input type="number" min="0" max="120" placeholder="e.g. 40" onFocus={handleFocus} value={plan?.demographics?.currentAgePart ?? ''} onChange={(e) => updateDemographics('currentAgePart', e.target.value)} className={inputCls} /></div>}
                <div><label className="text-slate-600 font-semibold block mb-1">Retirement Age (Myself)</label><input type="number" min="0" max="120" placeholder="e.g. 60" onFocus={handleFocus} value={plan?.demographics?.retireAgeSelf ?? ''} onChange={(e) => updateDemographics('retireAgeSelf', e.target.value)} className={inputCls} /></div>
                {isCouple && <div><label className="text-slate-600 font-semibold block mb-1">Retirement Age (Partner)</label><input type="number" min="0" max="120" placeholder="e.g. 60" onFocus={handleFocus} value={plan?.demographics?.retireAgePart ?? ''} onChange={(e) => updateDemographics('retireAgePart', e.target.value)} className={inputCls} /></div>}
                <div><label className="text-slate-600 font-semibold block mb-1">{plan?.demographics?.employmentSelf === 'self-employed' ? 'Annual Profit: self-employment (Myself £/yr)' : 'Gross Salary (Myself £/yr)'}</label><input type="number" min="0" step="1000" placeholder="for tax relief & bridging" onFocus={handleFocus} value={plan?.demographics?.salarySelf ?? ''} onChange={(e) => updateDemographics('salarySelf', e.target.value)} className={inputCls} /></div>
                {isCouple && <div><label className="text-slate-600 font-semibold block mb-1">{plan?.demographics?.employmentPart === 'self-employed' ? 'Annual Profit: self-employment (Partner £/yr)' : 'Gross Salary (Partner £/yr)'}</label><input type="number" min="0" step="1000" placeholder="for tax relief & bridging" onFocus={handleFocus} value={plan?.demographics?.salaryPart ?? ''} onChange={(e) => updateDemographics('salaryPart', e.target.value)} className={inputCls} /></div>}
                <div><label className="text-slate-600 font-semibold block mb-1">Expected State Pension (Myself £/yr)</label><input type="number" min="0" step="250" placeholder="e.g. 11500" onFocus={handleFocus} value={plan?.demographics?.statePensionSelf ?? ''} onChange={(e) => updateDemographics('statePensionSelf', e.target.value)} className={inputCls} /></div>
                {isCouple && <div><label className="text-slate-600 font-semibold block mb-1">Expected State Pension (Partner £/yr)</label><input type="number" min="0" step="250" placeholder="e.g. 11500" onFocus={handleFocus} value={plan?.demographics?.statePensionPart ?? ''} onChange={(e) => updateDemographics('statePensionPart', e.target.value)} className={inputCls} /></div>}
                <div className="sm:col-span-2">
                  <label className="text-slate-600 font-semibold block mb-1">{isCouple ? 'Joint Net Living Spend (£/yr)' : 'Net Living Spend (£/yr)'}</label>
                  <input type="number" min="0" step="1000" placeholder="e.g. 30000" onFocus={handleFocus} value={plan?.spending?.targetSpend ?? ''} onChange={(e) => updateSpending('targetSpend', e.target.value)} className={inputCls} />
                  <span className="text-[10px] text-slate-400 mt-1 block">Drawn from the first retirement. A partner still working offsets it with their take-home pay when a salary is entered.</span>
                </div>
                <div><label className="text-slate-600 font-semibold block mb-1">Plan to Age</label><input type="number" min="1" max="120" placeholder="100" onFocus={handleFocus} value={plan?.demographics?.terminalAge ?? ''} onChange={(e) => updateDemographics('terminalAge', e.target.value)} className={inputCls} /></div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Minimum pot at age {terminalAge} (£)</label>
                  <input type="number" min="0" step="5000" placeholder="0" onFocus={handleFocus} value={plan?.config?.solvencyFloor ?? ''} onChange={(e) => updateConfig('solvencyFloor', e.target.value)} className={`${inputCls} text-amber-700`} />
                  <span className="text-[10px] text-slate-400 mt-1 block">Bequest floor in today's money, tested at the terminal age only. The whole projection is in real terms, so £100,000 here means £100,000 of today's purchasing power. There is no need to gross it up for inflation.</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{isCouple ? 'Joint Net Living Spend' : 'Net Living Spend'} by age (optional)</span>
                  <button onClick={addSpendBand} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"><Plus className="w-3.5 h-3.5" /> Add Band</button>
                </div>
                <p className="text-[11px] text-slate-500 mb-2 max-w-3xl">
                  Set what a stretch of years actually costs, in today's money, instead of one figure for the whole
                  retirement. Ages are &quot;Myself&quot; ages. Any year you do not cover falls back to the {isCouple ? 'joint ' : ''}living
                  spend above, so you can name only the years that differ. Spending can rise as well as fall.
                </p>
                {(plan?.spending?.spendBands || []).length === 0 ? (
                  <div className="text-xs text-slate-400 italic p-3 bg-slate-50 border border-slate-200 rounded-xl">
                    No bands set, so {formatGBP(E.num(plan?.spending?.targetSpend, 0))}/yr applies for the whole retirement.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(plan.spending.spendBands || []).map(band => {
                      const from = E.num(band.fromAge, NaN);
                      const to = E.isBlank(band.toAge) ? terminalAge : E.num(band.toAge, NaN);
                      const badRange = Number.isFinite(from) && Number.isFinite(to) && to < from;
                      const yrs = (Number.isFinite(from) && Number.isFinite(to) && !badRange) ? (to - from + 1) : null;
                      return (
                        <div key={band.id} className={`grid grid-cols-1 sm:grid-cols-4 gap-2 p-2.5 border rounded-xl text-xs items-center ${badRange ? 'bg-rose-50/60 border-rose-200' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex items-center gap-1">
                            <span className="text-slate-500">Age</span>
                            <input type="number" min="0" max="120" placeholder="From" onFocus={handleFocus} value={band.fromAge}
                              onChange={(e) => updateSpendBand(band.id, { fromAge: parseInputNumber(e.target.value) })}
                              className="w-14 p-1 bg-surface border border-slate-300 rounded font-mono text-center font-bold" />
                            <span className="text-slate-400">to</span>
                            <input type="number" min="0" max="120" placeholder={String(terminalAge)} onFocus={handleFocus} value={band.toAge}
                              onChange={(e) => updateSpendBand(band.id, { toAge: parseInputNumber(e.target.value) })}
                              className="w-14 p-1 bg-surface border border-slate-300 rounded font-mono text-center font-bold" />
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-500">Spend</span>
                            <input type="number" min="0" step="1000" placeholder="£/yr" onFocus={handleFocus} value={band.amount}
                              onChange={(e) => updateSpendBand(band.id, { amount: parseInputNumber(e.target.value) })}
                              className="w-28 p-1.5 bg-surface border border-slate-300 rounded font-mono text-blue-700 font-bold" />
                          </div>
                          <div className="text-[11px] text-slate-500 sm:col-span-1">
                            {badRange
                              ? <span className="text-rose-700 font-semibold">Ends before it starts</span>
                              : yrs !== null ? `${yrs} year${yrs === 1 ? '' : 's'}${E.isBlank(band.toAge) ? ` (to age ${terminalAge})` : ''}` : 'Set a start age'}
                          </div>
                          <div className="flex justify-end">
                            <button onClick={() => deleteSpendBand(band.id)} title="Remove this band" className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Advanced: optional figures most plans can leave blank */}
              <div className="pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowAdvanced(v => !v)} className="text-[11px] font-bold text-slate-600 hover:text-slate-900 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                  <Settings className="w-3.5 h-3.5" /> Advanced inputs {showAdvanced ? '▾' : '▸'}
                  <span className="font-normal normal-case tracking-normal text-slate-400">(optional; sensible defaults are assumed if left blank)</span>
                </button>
                {showAdvanced && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs mt-3">
                    <div>
                      <label className="text-slate-600 font-semibold block mb-1">Cash buffer kept from surplus income (months)</label>
                      <input type="number" min="0" step="1" placeholder="6" onFocus={handleFocus} value={plan?.config?.cashBufferMonths ?? ''} onChange={(e) => updateConfig('cashBufferMonths', e.target.value)} className={inputCls} />
                      <span className="text-[10px] text-slate-400 mt-1 block">Months of spending held back in cash before surplus income is swept into the ISA.</span>
                    </div>
                    {ctx.owners.map(o => {
                      const field = o.key === 'self' ? 'employmentSelf' : 'employmentPart';
                      const isSE = plan?.demographics?.[field] === 'self-employed';
                      return (
                        <div key={`emp_${o.key}`}>
                          <label className="text-slate-600 font-semibold block mb-1">Employment type ({o.label})</label>
                          <select value={isSE ? 'self-employed' : 'employed'} onChange={(e) => updateDemographics(field, e.target.value)} className={`${inputCls} cursor-pointer`}>
                            <option value="employed">Employed (Class 1 NIC, salary sacrifice)</option>
                            <option value="self-employed">Self-employed (Class 4 NIC, relief at source)</option>
                          </select>
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            {isSE
                              ? `The salary box above is read as annual trading profit. Pension contributions get income tax relief only, with no NIC saving${P.erPass > 0 ? ', and the employer NIC pass-through in Config does not apply' : ''}.`
                              : 'Pension contributions are priced as salary sacrifice: income tax and employee NIC relief.'}
                          </span>
                        </div>
                      );
                    })}
                    {ctx.owners.map(o => {
                      const field = o.key === 'self' ? 'salaryGrowthSelf' : 'salaryGrowthPart';
                      const isSE = plan?.demographics?.[o.key === 'self' ? 'employmentSelf' : 'employmentPart'] === 'self-employed';
                      const rate = E.num(plan?.demographics?.[field], 0);
                      return (
                        <div key={`sg_${o.key}`}>
                          <label className="text-slate-600 font-semibold block mb-1">{isSE ? 'Profit' : 'Salary'} growth above inflation ({o.label} %/yr)</label>
                          <input type="number" step="0.25" placeholder="0" onFocus={handleFocus}
                            value={plan?.demographics?.[field] ?? ''}
                            onChange={(e) => updateDemographics(field, e.target.value)} className={inputCls} />
                          <span className="text-[10px] text-slate-400 mt-1 block">
                            Default is 0, meaning pay rises with inflation. The projection is in today's money, so 0 holds
                            {isSE ? ' profit' : ' pay'} flat in real terms rather than freezing it in cash terms. Enter 1 for a
                            1% real rise a year; a negative figure winds earnings down.
                            {rate !== 0 && ` At ${rate}%, ${formatGBP(o.salary)} today is worth ${formatGBP(o.salary * Math.pow(1 + rate / 100, Math.max(0, o.retireAge - o.age0)))} in today's money at retirement.`}
                          </span>
                        </div>
                      );
                    })}
                    {ctx.owners.map(o => (
                      <div key={`cf_${o.key}`}>
                        <label className="text-slate-600 font-semibold block mb-1">Pension allowance carried forward ({o.label} £)</label>
                        <input type="number" min="0" step="1000" placeholder="blank = £0" onFocus={handleFocus}
                          value={plan?.demographics?.[o.key === 'self' ? 'cfBroughtForwardSelf' : 'cfBroughtForwardPart'] ?? ''}
                          onChange={(e) => updateDemographics(o.key === 'self' ? 'cfBroughtForwardSelf' : 'cfBroughtForwardPart', e.target.value)} className={inputCls} />
                        <span className="text-[10px] text-slate-400 mt-1 block">Unused annual allowance from the last three tax years. Cannot be used once a pension is flexibly accessed, and never lifts the earnings limit.</span>
                      </div>
                    ))}
                    {P.cgtEnabled && ctx.owners.map(o => (
                      <div key={`cg_${o.key}`}>
                        <label className="text-slate-600 font-semibold block mb-1">Capital gains already used ({o.label} £)</label>
                        <input type="number" min="0" step="500" placeholder="blank = full allowance" onFocus={handleFocus}
                          value={plan?.demographics?.[o.key === 'self' ? 'cgtGainsUsedSelf' : 'cgtGainsUsedPart'] ?? ''}
                          onChange={(e) => updateDemographics(o.key === 'self' ? 'cgtGainsUsedSelf' : 'cgtGainsUsedPart', e.target.value)} className={inputCls} />
                        <span className="text-[10px] text-slate-400 mt-1 block">Gains already realised this tax year: reduces the {formatGBP(P.cgtAnnualExempt)} exemption in the current year only.</span>
                      </div>
                    ))}
                    {P.cgtEnabled && ctx.owners.map(o => {
                      const acc = (plan?.accounts || []).find(a => a.id === o.ids.other);
                      return (
                        <div key={`ug_${o.key}`}>
                          <label className="text-slate-600 font-semibold block mb-1">Other Investments: unrealised gain ({o.label} £)</label>
                          <input type="number" min="0" step="500" placeholder="blank = balance is all cost" onFocus={handleFocus}
                            value={acc?.unrealisedGain ?? ''} onChange={(e) => updateAccountField(o.ids.other, 'unrealisedGain', e.target.value)} className={inputCls} />
                          <span className="text-[10px] text-slate-400 mt-1 block">How much of today's GIA balance is profit. Left blank, only future growth is taxed, which understates CGT on long-held holdings.</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Balances & Contributions */}
            <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4 overflow-x-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2"><Wallet className="w-4 h-4 text-blue-600" /> 2. Current Balances, Annual Contributions &amp; Risk Profiles</h3>
                <button type="button" onClick={() => goToDoc('doc-risk-profiles')} className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"><HelpCircle className="w-3.5 h-3.5" /> Guide to investment allocations &amp; fund types &rarr;</button>
              </div>
              <p className="text-[11px] text-slate-500">Pension contributions are gross (including tax relief and employer amounts); ISA, GIA and cash contributions are net. Contributions stop at each owner's retirement age. Allowances: ISA £{P.isaAllowance.toLocaleString()}, pension £{P.pensionAllowance.toLocaleString()} per person (Config).</p>
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="pb-2">Account Wrapper</th>{isCouple && <th className="pb-2">Owner</th>}<th className="pb-2">Balance Today (£)</th><th className="pb-2">Annual Contribution (£)</th><th className="pb-2">Contrib Growth (%/yr)</th><th className="pb-2">Asset Allocation (Risk Tier)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {displayedAccounts.map(acc => {
                    const over = (acc.id.startsWith('isa') && E.num(acc.contrib, 0) > P.isaAllowance) || (acc.id.startsWith('pen') && E.num(acc.contrib, 0) > P.pensionAllowance);
                    return (
                      <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 font-sans font-bold text-slate-800">{acc.category}{Array.isArray(acc.contribByYear) && <span className="ml-2 px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-normal">phased schedule</span>}</td>
                        {isCouple && <td className="py-2.5 font-sans text-slate-500">{acc.owner}</td>}
                        <td className="py-2.5"><input type="number" min="0" step="500" placeholder="0" onFocus={handleFocus} value={acc.balance} onChange={(e) => updateAccountField(acc.id, 'balance', e.target.value)} className="w-32 p-1.5 bg-slate-50 border border-slate-300 rounded font-bold text-slate-900 focus:bg-surface focus:ring-2 focus:ring-blue-500 focus:outline-none" /></td>
                        <td className="py-2.5"><input type="number" min="0" step="250" placeholder="0" onFocus={handleFocus} value={acc.contrib} onChange={(e) => { updateAccountField(acc.id, 'contrib', e.target.value); if (acc.contribByYear) setPlan(prev => ({ ...prev, accounts: prev.accounts.map(a => a.id === acc.id ? { ...a, contribByYear: undefined } : a) })); }} className={`w-28 p-1.5 bg-slate-50 border rounded text-slate-800 focus:bg-surface focus:ring-2 focus:ring-blue-500 focus:outline-none ${over ? 'border-rose-400 text-rose-700' : 'border-slate-300'}`} title={over ? 'Exceeds the annual allowance set in Config' : ''} /></td>
                        <td className="py-2.5"><input type="number" step="0.5" placeholder="0" onFocus={handleFocus} value={acc.growth} onChange={(e) => updateAccountField(acc.id, 'growth', e.target.value)} className="w-20 p-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 focus:bg-surface focus:ring-2 focus:ring-blue-500 focus:outline-none" /></td>
                        <td className="py-2.5">
                          <select value={acc.risk} onChange={(e) => updateAccountField(acc.id, 'risk', e.target.value)} className="p-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-blue-700 font-semibold focus:bg-surface focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer">
                            {Object.keys(activeRiskMatrix).map(rk => <option key={rk} value={rk}>{activeRiskMatrix[rk].label || rk}</option>)}
                          </select>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Other income */}
            <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2"><Coins className="w-4 h-4 text-blue-600" /> 3. Expected Other Income Streams (e.g. Defined Benefit Pensions, Part-time work, Rental income)</h3>
                  <span className="text-[11px] text-slate-500">Taxable streams count towards the personal allowance and tax bands; tax-free streams directly reduce net drawdown demand. Blank end age = plan end.</span>
                  <ul className="list-disc pl-4 text-[11px] text-slate-500 mt-1 leading-relaxed max-w-3xl space-y-0.5">
                    <li><strong>Earnings</strong> (employment / self-employment) are taxed <em>and</em> count as relevant UK earnings, so they raise how much you can pay into a pension that year.</li>
                    <li><strong>Other taxable income</strong> (DB pensions, annuities, rent, dividends, interest) is taxed at income-tax rates but does <strong>not</strong> support pension contributions.</li>
                    <li><strong>Tax-free income</strong> is neither taxed nor counted.</li>
                  </ul>
                  <span className="text-[11px] text-slate-500 mt-1 block">With no relevant earnings the pension limit is {formatGBP(P.pensionNoEarningsLimit)}/yr.</span>
                </div>
                <button onClick={addOtherIncome} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"><Plus className="w-3.5 h-3.5" /> Add Stream</button>
              </div>
              {(plan?.otherIncomes || []).length === 0 ? (
                <div className="text-xs text-slate-400 italic p-3 bg-slate-50 border border-slate-200 rounded-xl">No additional income streams registered.</div>
              ) : (
                <div className="space-y-2">
                  {plan.otherIncomes.map(inc => (
                    <div key={inc.id} className="grid grid-cols-1 sm:grid-cols-6 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs items-center">
                      <input type="text" onFocus={handleFocus} value={inc.name} onChange={(e) => updateListItem('otherIncomes', inc.id, { name: e.target.value })} className="p-1.5 bg-surface border border-slate-300 rounded font-bold text-slate-800 sm:col-span-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Description" />
                      {isCouple ? (
                        <select value={inc.owner} onChange={(e) => updateListItem('otherIncomes', inc.id, { owner: e.target.value })} className="p-1.5 bg-surface border border-slate-300 rounded text-slate-700"><option value="Myself">Myself</option><option value="Partner">Partner</option></select>
                      ) : <div className="p-1.5 text-slate-500 font-semibold">Myself</div>}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Age</span>
                        <input type="number" min="0" max="120" placeholder="Start" onFocus={handleFocus} value={inc.startAge} onChange={(e) => updateListItem('otherIncomes', inc.id, { startAge: parseInputNumber(e.target.value) })} className="w-12 p-1 bg-surface border border-slate-300 rounded font-mono text-center font-bold" />
                        <span className="text-slate-400">to</span>
                        <input type="number" min="0" max="120" placeholder="End" onFocus={handleFocus} value={inc.endAge} onChange={(e) => updateListItem('otherIncomes', inc.id, { endAge: parseInputNumber(e.target.value) })} className="w-12 p-1 bg-surface border border-slate-300 rounded font-mono text-center font-bold" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" step="500" placeholder="£/yr" onFocus={handleFocus} value={inc.amount} onChange={(e) => updateListItem('otherIncomes', inc.id, { amount: parseInputNumber(e.target.value) })} className="w-24 p-1.5 bg-surface border border-slate-300 rounded font-mono text-emerald-700 font-bold" />
                        <select value={inc.incomeType} onChange={(e) => updateListItem('otherIncomes', inc.id, { incomeType: e.target.value })} className="p-1.5 bg-surface border border-slate-300 rounded text-xs font-semibold text-amber-700" title="Drives both income tax and whether this counts as relevant earnings for pension contributions">
                          {Object.keys(E.INCOME_TYPES).map(k => <option key={k} value={k}>{E.INCOME_TYPES[k].label}</option>)}
                        </select>
                      </div>
                      <div className="flex justify-end"><button onClick={() => deleteOtherIncome(inc.id)} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"><Trash2 className="w-4 h-4" /></button></div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* One-offs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2"><Plus className="w-4 h-4 text-blue-600" /> 4. One-Off Deposits (by Wrapper)</h3>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Lump sums into a chosen wrapper. Anything above that year's allowance is parked in Other Investments and fed in over later years.</span>
                    <button type="button" onClick={() => goToDoc('doc-one-off-deposits')} className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-semibold flex items-center gap-1 cursor-pointer mt-0.5"><HelpCircle className="w-3.5 h-3.5" /> How one-off deposits &amp; multi-year staging work &rarr;</button>
                  </div>
                  <button onClick={addOneOffContrib} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer border border-slate-200 self-start sm:self-auto"><Plus className="w-3.5 h-3.5" /> Add Lump Sum</button>
                </div>
                <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl text-xs text-slate-700 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-indigo-950 text-sm"><Info className="w-4 h-4 text-indigo-600" /> Annual Allowance Headroom: {ctx.baseYear} tax year</div>
                  {ctx.owners.map(o => (
                    <div key={o.key} className="flex flex-wrap gap-x-4">
                      <span className="font-semibold">{o.label}:</span>
                      <span>S&amp;S ISA remaining <strong>{formatGBP(E.wrapperHeadroomAtYear(ctx, o.key, 'isa', 0))}</strong>/yr</span>
                      <span>Pension remaining <strong>{formatGBP(E.wrapperHeadroomAtYear(ctx, o.key, 'pen', 0))}</strong>/yr</span>
                    </div>
                  ))}
                  <p className="text-slate-500 text-[11px] leading-relaxed">A one-off deposit that exceeds remaining headroom is auto-staged: the allowed amount deposits now, the rest parks in Other Investments and drip-feeds into the target wrapper as future years' allowance opens up.</p>
                  <p className="text-slate-500 text-[11px] leading-relaxed">These are <strong>this year's</strong> figures. Headroom changes in later years as regular contributions escalate, and again once contributions stop at retirement. Each deposit below shows the headroom for its own year.</p>
                </div>
                {(plan?.oneOffContributions || []).length === 0 ? (
                  <div className="text-xs text-slate-400 italic p-3 bg-slate-50 border border-slate-200 rounded-xl">No one-off contributions scheduled.</div>
                ) : (
                  <div className="space-y-2">
                    {plan.oneOffContributions.map(c => {
                      const st = ctx.oneOffStaging.get(c.id);
                      const isExpanded = expandedOneOff.has(c.id);
                      // the engine drops any deposit whose year will not parse, so flag it rather than
                      // letting it silently vanish from the projection
                      const depYear = c.date ? parseInt(String(c.date).slice(0, 4)) : E.num(c.year, NaN);
                      const missingDate = !Number.isFinite(depYear);
                      const missingDest = !c.category;
                      const incomplete = missingDate || missingDest;
                      return (
                        <div key={c.id} className={`p-2.5 rounded-xl text-xs space-y-2 border ${incomplete ? 'bg-rose-50/70 border-rose-300' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex flex-wrap items-center gap-2">
                            <input type="date" value={c.date || (c.year ? `${c.year}-01-01` : '')} onChange={(e) => { const d = e.target.value; updateListItem('oneOffContributions', c.id, { date: d, year: parseInt(d.slice(0, 4)) || '' }); }} className={`p-1 bg-surface border rounded font-mono text-slate-800 text-xs ${missingDate ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-300'}`} />
                            {isCouple ? (
                              <select value={c.owner} onChange={(e) => updateListItem('oneOffContributions', c.id, { owner: e.target.value })} className="p-1 bg-surface border border-slate-300 rounded text-slate-700"><option value="Myself">Myself</option><option value="Partner">Partner</option></select>
                            ) : <span className="text-slate-500 font-semibold px-1">Myself</span>}
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] text-slate-400 leading-none">Funding source: new capital or internal transfer?</span>
                              <select value={c.transferredFrom} onChange={(e) => updateListItem('oneOffContributions', c.id, { transferredFrom: e.target.value })} className="p-1 bg-surface border border-slate-300 rounded text-slate-700" title="Transferred from">
                                <option value="External">External (New Capital)</option>
                                {Object.values(E.CATEGORY_LABEL).map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                            <div className="flex flex-col gap-0.5">
                              <span className="text-[9px] text-slate-400 leading-none">Funding destination</span>
                              <select value={c.category} onChange={(e) => { const category = e.target.value; const patch = { category }; if (c.stagedTargetWrapper === c.category) patch.stagedTargetWrapper = category; updateListItem('oneOffContributions', c.id, patch); }} className={`p-1 bg-surface border rounded text-blue-700 font-semibold ${missingDest ? 'border-rose-400 ring-1 ring-rose-300' : 'border-slate-300'}`}>
                                {Object.values(E.CATEGORY_LABEL).map(l => <option key={l} value={l}>{l}</option>)}
                              </select>
                            </div>
                            <input type="number" min="0" step="1000" placeholder="Amount (£)" onFocus={handleFocus} value={c.amount} onChange={(e) => updateListItem('oneOffContributions', c.id, { amount: parseInputNumber(e.target.value) })} className="w-24 p-1 bg-surface border border-slate-300 rounded font-mono text-emerald-700 font-bold" />
                            {st && !st.direct && (
                              <button onClick={() => toggleOneOffExpand(c.id)} className="p-1 text-amber-600 hover:text-amber-800 cursor-pointer transition-colors" title="Staging schedule"><Settings className="w-4 h-4" /></button>
                            )}
                            <button onClick={() => deleteOneOffContrib(c.id)} className="p-1 ml-auto text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
                          {incomplete && (
                            <div className="flex items-start gap-1.5 text-[11px] text-rose-700 font-semibold">
                              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-600" />
                              <span>{missingDate ? 'Add a date' : ''}{missingDate && missingDest ? ' and a destination wrapper' : missingDest ? 'Choose a destination wrapper' : ''} ; this deposit is excluded from the projection until you do.</span>
                            </div>
                          )}
                          {st && (
                            <div className="flex flex-wrap items-center gap-2">
                              {st.direct ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-sans text-[10px] font-bold">Direct Deposit (£{Math.round(st.amount).toLocaleString()} within headroom)</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-sans text-[10px] font-bold">Staged (Option A): £{Math.round(st.H0).toLocaleString()} now &rarr; {c.category}, £{Math.round(st.surplus0).toLocaleString()} parked in Other Investments</span>
                              )}
                              <span className="text-slate-500 font-sans text-[10px]">
                                {Number.isFinite(st.yearHeadroom)
                                  ? `${c.category} headroom in ${c.year}: ${formatGBP(st.yearHeadroom)}`
                                  : `${c.category} has no annual limit`}
                              </span>
                            </div>
                          )}
                          {st && !st.direct && isExpanded && (
                            <div className="w-full p-2.5 bg-surface border border-amber-200 rounded-lg text-[11px] space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-600">Staged destination:</span>
                                <select value={c.stagedTargetWrapper} onChange={(e) => updateListItem('oneOffContributions', c.id, { stagedTargetWrapper: e.target.value })} className="p-1 bg-surface border border-slate-300 rounded text-slate-700">
                                  {Object.values(E.CATEGORY_LABEL).map(l => <option key={l} value={l}>{l}</option>)}
                                </select>
                              </div>
                              <div className="space-y-0.5 text-slate-600">
                                <div>Year {c.year}: £{Math.round(st.H0).toLocaleString()} direct to {c.category} + £{Math.round(st.surplus0).toLocaleString()} parked in Other Investments</div>
                                {st.tranches.map((tr, i) => (
                                  <div key={i}>Year {tr.year}: £{Math.round(tr.amount).toLocaleString()} transferred to {c.stagedTargetWrapper}</div>
                                ))}
                                {st.unresolvedRemainder > 0 && (
                                  <div className="text-amber-700">£{Math.round(st.unresolvedRemainder).toLocaleString()} remains parked in Other Investments beyond the plan horizon.</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-2"><Trash2 className="w-4 h-4 text-rose-600" /> 5. One-Off Capital Costs</h3>
                    <button type="button" onClick={() => goToDoc('doc-one-offs')} className="text-[11px] text-rose-600 hover:text-rose-800 hover:underline font-semibold flex items-center gap-1 cursor-pointer mt-0.5"><HelpCircle className="w-3.5 h-3.5" /> How costs are liquidated from your wrappers &rarr;</button>
                  </div>
                  <button onClick={addOneOffCost} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer border border-slate-200 self-start sm:self-auto"><Plus className="w-3.5 h-3.5" /> Add Cost</button>
                </div>
                {(plan?.oneOffCosts || []).length === 0 ? (
                  <div className="text-xs text-slate-400 italic p-3 bg-slate-50 border border-slate-200 rounded-xl">No one-off capital expenses scheduled.</div>
                ) : (
                  <div className="space-y-2">
                    {plan.oneOffCosts.map(cost => (
                      <div key={cost.id} className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <input type="date" value={cost.date || (cost.year ? `${cost.year}-01-01` : '')} onChange={(e) => { const d = e.target.value; updateListItem('oneOffCosts', cost.id, { date: d, year: parseInt(d.slice(0, 4)) || '' }); }} className="p-1 bg-surface border border-slate-300 rounded font-mono text-slate-800 text-xs" />
                        <input type="text" onFocus={handleFocus} value={cost.desc} onChange={(e) => updateListItem('oneOffCosts', cost.id, { desc: e.target.value })} className="p-1 bg-surface border border-slate-300 rounded text-slate-700 flex-1" placeholder="Purpose" />
                        <input type="number" min="0" step="1000" placeholder="Amount (£)" onFocus={handleFocus} value={cost.amount} onChange={(e) => updateListItem('oneOffCosts', cost.id, { amount: parseInputNumber(e.target.value) })} className="w-24 p-1 bg-surface border border-slate-300 rounded font-mono text-rose-700 font-bold" />
                        <button onClick={() => deleteOneOffCost(cost.id)} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONFIG */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Sliders className="w-4 h-4 text-blue-600" /> Decumulation &amp; Pension Withdrawal Methodology</h2>
                  <p className="text-xs text-slate-500 mt-1">Select how withdrawals are ordered across tax wrappers and how pensions are crystallised. <button type="button" onClick={() => goToDoc('doc-decumulation')} className="text-blue-600 hover:underline font-semibold cursor-pointer">What the evidence says &rarr;</button></p>
                </div>
                <div className="shrink-0">
                  <button type="button" onClick={handleFindBestPolicy} disabled={isPolicySearching || !policySweepReady}
                    className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 dark:from-[#2C5C8F] dark:to-[#A9781F] dark:hover:from-[#204568] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 dark:fill-[#FCD34D] dark:text-[#FCD34D]" />
                    {isPolicySearching ? 'Searching…' : '⚡ Auto-Pick Best Policy'}
                  </button>
                  {!policySweepReady && <span className="text-[10px] text-slate-400 mt-1 block text-right max-w-[15rem]">Add balances or contributions and a living spend first: with nothing to draw down, every policy scores the same.</span>}
                </div>
              </div>
              {policyProgress && <ProgressBar value={policyProgress.value} label={policyProgress.label} />}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Decumulation Policy</label>
                  <select value={plan?.spending?.decumulationPolicy} onChange={(e) => updateSpending('decumulationPolicy', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-blue-700 font-bold focus:bg-surface focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer">
                    {Object.entries(E.DECUMULATION_POLICIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {plan?.spending?.decumulationPolicy === 'Bracket Fill Basic' ? `Fills the £${P.pa.toLocaleString()} allowance, then draws pension income up to £${P.higherRateStartsAt.toLocaleString()} before touching cash, GIA and ISAs.`
                      : plan?.spending?.decumulationPolicy === 'Bracket Fill' ? `Draws pension only up to £${P.pa.toLocaleString()} (0% tax), then cash, GIA and ISAs; pension income above the allowance is the last resort.`
                      : 'Liquidates each wrapper to zero in rigid sequential order.'}
                  </span>
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Pension Drawdown Strategy</label>
                  <select value={plan?.spending?.drawdownStrategy} onChange={(e) => updateSpending('drawdownStrategy', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-blue-700 font-bold focus:bg-surface focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer">
                    <option value="Phased Drawdown">Phased Drawdown (Ongoing {Math.round(P.pclsProp * 100)}% tax-free proportion)</option>
                    <option value="Full 25% Lump Sum">Full Lump Sum (Upfront statutory PCLS into Cash)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">Phased crystallises {Math.round(P.pclsProp * 100)}% tax-free with each draw; Lump Sum moves the tax-free cash (capped at £{P.lsa.toLocaleString()}) into cash savings at retirement.</span>
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Harvest unused 0% allowance</label>
                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-300 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={!!plan?.config?.harvestPersonalAllowance} onChange={(e) => updateConfig('harvestPersonalAllowance', e.target.checked)} className="accent-blue-600" />
                    <span className="text-slate-700 font-semibold">Draw pension to fill the allowance even when income is covered; net proceeds go to ISA (then cash).</span>
                  </label>
                  <span className="text-[10px] text-slate-400 mt-1 block">Applies to the two bracket-fill policies once retired and past the access age.</span>
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Capital gains tax on the GIA</label>
                  <label className="flex items-center gap-2 p-2 bg-slate-50 border border-slate-300 rounded-lg cursor-pointer">
                    <input type="checkbox" checked={!!plan?.config?.cgtEnabled} onChange={(e) => updateConfig('cgtEnabled', e.target.checked)} className="accent-blue-600" />
                    <span className="text-slate-700 font-semibold">Tax gains realised when Other Investments are sold, using the cost basis of each holding.</span>
                  </label>
                  <span className="text-[10px] text-slate-400 mt-1 block">Off treats the GIA as tax-free. Gains are wiped on death, so nothing is charged at the terminal age.</span>
                  <button type="button" onClick={() => goToDoc('doc-cgt')} className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-semibold flex items-center gap-1 cursor-pointer mt-1"><HelpCircle className="w-3.5 h-3.5" /> How capital gains are tracked &amp; taxed &rarr;</button>
                </div>
              </div>

              {policyResults && (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5"><Trophy className="w-3.5 h-3.5 text-emerald-600" /> Policy search results: winner applied above</h3>
                    <span className="text-[10px] text-slate-400">{policyResults.rows.length} combinations · {policyResults.trials.toLocaleString()} paths each · seed {policyResults.seed} · ranked by survival, ties within 0.5 points broken by the 10th-percentile pot</span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-[11px] border-collapse">
                      <thead><tr className="border-b border-slate-200 text-slate-500 font-semibold"><th className="pb-1.5 pr-3">Policy combination</th><th className="pb-1.5 pr-3">Survival</th><th className="pb-1.5 pr-3">Pre-SIPP access failures</th><th className="pb-1.5 pr-3">10th %ile pot</th><th className="pb-1.5">Median pot</th></tr></thead>
                      <tbody className="divide-y divide-slate-100 font-mono">
                        {policyResults.rows.map(r => {
                          const won = r.id === policyResults.bestId;
                          return (
                            <tr key={r.id} className={won ? 'bg-emerald-50/70' : 'hover:bg-slate-50/80'}>
                              <td className={`py-1.5 pr-3 font-sans ${won ? 'font-bold text-emerald-900' : 'text-slate-700'}`}>{won && <Trophy className="w-3 h-3 text-emerald-600 inline mr-1 -mt-0.5" />}{r.label}</td>
                              <td className={`py-1.5 pr-3 font-bold ${r.stats.successRate >= 90 ? 'text-emerald-700' : r.stats.successRate >= 75 ? 'text-amber-700' : 'text-rose-700'}`}>{r.stats.successRate.toFixed(1)}%</td>
                              <td className={`py-1.5 pr-3 ${r.stats.preNmpaFailRate > 5 ? 'text-rose-600 font-bold' : 'text-slate-600'}`}>{r.stats.preNmpaFailRate.toFixed(1)}%</td>
                              <td className="py-1.5 pr-3 text-slate-700">{fmtK(r.stats.p10Terminal)}</td>
                              <td className="py-1.5 text-slate-700">{fmtK(r.stats.medianTerminal)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-[10px] text-slate-400">Every combination is scored on the same market paths, so differences between rows are more reliable than each row's own sampling error. Changing any plan input invalidates these results. Re-run to refresh.</p>
                </div>
              )}
            </div>

            <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Settings className="w-4 h-4 text-blue-600" /> Global Economic &amp; Calculation Configuration</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-3">
                <div><label className="text-slate-600 font-semibold block mb-1">Valuation Date (Today)</label><input type="date" value={plan?.config?.valuationDate ?? ''} onChange={(e) => updateConfig('valuationDate', e.target.value)} className={inputCls} /><span className="text-[10px] text-slate-400 mt-1 block">Year 0 flows are pro-rated to the {(ctx.yf * 100).toFixed(0)}% of the year remaining.</span></div>
                <div><label className="text-slate-600 font-semibold block mb-1">Headline Inflation CPI (% pa)</label><input type="number" step="0.1" placeholder="2.5" onFocus={handleFocus} value={plan?.config?.inflation ?? ''} onChange={(e) => updateConfig('inflation', e.target.value)} className={inputCls} /><span className="text-[10px] text-slate-400 mt-1 block">Only used for the nominal display series.</span></div>
                <div><label className="text-slate-600 font-semibold block mb-1">Personal Pension Access Age (NMPA)</label><input type="number" min="0" max="120" placeholder="58" onFocus={handleFocus} value={plan?.demographics?.privatePensionAge ?? ''} onChange={(e) => updateDemographics('privatePensionAge', e.target.value)} className={inputCls} /><span className="text-[10px] text-slate-400 mt-1 block">Statutory NMPA is 55 today and 57 from April 2028.</span></div>
                <div><label className="text-slate-600 font-semibold block mb-1">State Pension Start Age</label><input type="number" min="0" max="120" placeholder="68" onFocus={handleFocus} value={plan?.demographics?.statePensionAge ?? ''} onChange={(e) => updateDemographics('statePensionAge', e.target.value)} className={inputCls} /></div>
                <div><label className="text-slate-600 font-semibold block mb-1">Tournament bridge safety margin (%)</label><input type="number" min="0" step="5" placeholder="30" onFocus={handleFocus} value={plan?.config?.bridgeSafetyMargin ?? ''} onChange={(e) => updateConfig('bridgeSafetyMargin', e.target.value)} className={inputCls} /><span className="text-[10px] text-slate-400 mt-1 block">Uplift on the pre-SIPP access reserve, assuming 0% real growth. This scales the bridge <em>target</em> upwards; the tournament's emergency buffer instead holds savings back from counting towards it.</span></div>
                <div><label className="text-slate-600 font-semibold block mb-1">Pension death-tax haircut (%)</label><input type="number" min="0" max="100" step="5" placeholder="0" onFocus={handleFocus} value={plan?.config?.pensionDeathTaxRate ?? ''} onChange={(e) => updateConfig('pensionDeathTaxRate', e.target.value)} className={inputCls} /><span className="text-[10px] text-slate-400 mt-1 block">Applied to pension left at age {terminalAge} for the "net" pot figures only (IHT from April 2027 / beneficiary income tax).</span></div>
                <div><label className="text-slate-600 font-semibold block mb-1">Monte Carlo seed</label><div className="flex gap-1"><input type="number" value={mcSeed} onChange={(e) => setMcSeed(Math.max(1, parseInt(e.target.value) || 1))} className={inputCls} /><button type="button" onClick={() => setMcSeed(Math.floor(Math.random() * 1e9) + 1)} className="px-2 bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-semibold cursor-pointer hover:bg-slate-200">Reseed</button></div><span className="text-[10px] text-slate-400 mt-1 block">Same seed = same market paths (reproducible, fair comparisons).</span></div>
              </div>
            </div>

            <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4 overflow-x-auto">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider">Asset Allocations, Return Matrix &amp; Volatilities (σ)</h3>
                  <span className="text-[11px] text-slate-500">Expected real return is treated as the median (geometric) annual rate; Monte Carlo paths are log-normal around it with the stated σ, one market factor for all wrappers. The lucky and unlucky columns are calculated from the expected rate, σ, forecast uncertainty and your {ctx.totalYears}-year horizon, so they are not editable.</span>
                </div>
                <button onClick={() => setIsEditingRisk(!isEditingRisk)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${isEditingRisk ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}><Pencil className="w-3.5 h-3.5" />{isEditingRisk ? 'Done Editing' : 'Edit Matrix'}</button>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Assumptions:</span>
                {[['builtin', 'Built-in defaults', 'The figures this planner shipped with.'],
                  ...Object.entries(E.CMA_PRESETS).map(([k, v]) => [k, v.name, `${v.detail} · published ${v.published}`])
                ].map(([key, name, detail]) => {
                  const on = (plan?.riskSource || 'builtin') === key;
                  return (
                    <button key={key} type="button" onClick={() => applyRiskPreset(key)} title={detail}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-pointer ${on ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold' : 'bg-surface border-slate-200 text-slate-500 hover:text-slate-800'}`}>
                      {name}{on && <Check className="w-3 h-3 inline ml-1.5 -mt-0.5 text-slate-600" />}
                    </button>
                  );
                })}
                {plan?.riskSource && E.CMA_PRESETS[plan.riskSource] && (
                  <span className="text-[11px] text-slate-500">
                    {E.CMA_PRESETS[plan.riskSource].detail}. {E.CMA_PRESETS[plan.riskSource].note} Published figures are
                    nominal and are shown here deflated at your {E.num(plan?.config?.inflation, 2.5)}% inflation setting;
                    change that and these update. Expires {E.CMA_PRESETS[plan.riskSource].expires} — refresh from the
                    source after that. Editing any cell makes the table your own.
                  </span>
                )}
                {!plan?.riskSource && (
                  <span className="text-[11px] text-slate-500">Or load a published set of capital market assumptions. Every figure stays editable either way.</span>
                )}
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead><tr className="border-b border-slate-200 text-slate-500 font-semibold"><th className="pb-2">Allocation Category</th><th className="pb-2">Expected Real Return (% pa)</th><th className="pb-2">Unlucky, 10th %ile (% pa)</th><th className="pb-2">Lucky, 90th %ile (% pa)</th><th className="pb-2">Nominal Return (% pa)</th><th className="pb-2">Annual Volatility (σ % pa)</th><th className="pb-2">Forecast Uncertainty (% pa)</th></tr></thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {Object.entries(activeRiskMatrix).map(([key, val]) => {
                    // totalYears + 1, not totalYears: stepYear runs t = 0..totalYears inclusive, so the plan
                    // compounds one more time than its stated length. Matching it here is what lets the rate
                    // in this column actually compound to the pot quoted under the Monte Carlo fan.
                    const band = E.luckyBand(E.num(val.real, 0) / 100, E.num(val.volatility, 12) / 100, ctx.totalYears + 1, E.num(val.sigmaParam, 0) / 100);
                    return (
                    <tr key={key} className="hover:bg-slate-50/80">
                      <td className="py-2.5 font-sans font-bold text-slate-800">{val.label || key}</td>
                      {[['real', 'text-blue-700', 0.05], ['unlucky', 'text-rose-700', 0.05], ['lucky', 'text-emerald-700', 0.05], ['nominal', 'text-purple-700', 0.05], ['volatility', 'text-amber-700', 0.5], ['sigmaParam', 'text-slate-600', 0.05]].map(([field, color, step]) => (
                        <td key={field} className="py-2.5">
                          {field === 'lucky' || field === 'unlucky' ? (
                            <span className={`${color} font-bold`}>{(band[field] * 100).toFixed(2)}%</span>
                          ) : isEditingRisk ? (
                            <input type="number" step={step} min={field === 'volatility' || field === 'sigmaParam' ? 0 : undefined} onFocus={handleFocus} value={val[field] ?? ''} onChange={(e) => updateRiskField(key, field, e.target.value)} className={`w-20 p-1 bg-slate-50 border border-slate-300 rounded font-mono ${color} font-bold focus:bg-surface focus:ring-1 focus:ring-blue-500`} />
                          ) : <span className={`${color} font-bold`}>{E.num(val[field], 0).toFixed(field === 'volatility' ? 1 : 2)}%</span>}
                        </td>
                      ))}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider">UK Income Tax, National Insurance &amp; Pension Allowances</h3>
              <p className="text-[11px] text-slate-500">Defaults are 2025/26 (frozen to April 2028), and all thresholds are held constant in real terms.</p>
              <div className="pb-1">
                <label className="text-slate-600 font-semibold block mb-1 text-xs">Where you pay income tax</label>
                <select value={plan?.config?.taxRegion ?? 'ruk'} onChange={(e) => updateConfig('taxRegion', e.target.value)} className="w-full sm:w-80 p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-blue-700 font-bold focus:bg-surface focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer">
                  {Object.entries(E.TAX_REGION_LABELS).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
                </select>
                <span className="text-[10px] text-slate-400 mt-1 block">
                  {plan?.config?.taxRegion === 'scotland'
                    ? 'Scotland sets six bands, and its higher rate starts at £43,662 rather than £50,270. Only income tax is devolved: National Insurance, capital gains tax, the personal allowance and its taper are the same everywhere, and relief at source on a pension contribution is 20% for everyone.'
                    : plan?.config?.taxRegion === 'wales'
                      ? 'Wales can vary its rates under the Welsh Rates of Income Tax but has set them equal to England and Northern Ireland every year so far, so this returns the same figures. It is here so the answer is confirmed rather than assumed.'
                      : 'Three bands at 20, 40 and 45%. Choose Scotland for its six-band set, or Wales, whose rates currently match these.'}
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                {[
                  ['personalAllowance', 'Personal Allowance (£)'], ['paTaperThreshold', 'PA Taper Threshold (£)'], ['paTaperRate', 'PA Taper Rate (% of excess)'],
                  ...(plan?.config?.taxRegion === 'scotland' ? [
                    ['scotStarterRate', 'Starter Rate (%)'], ['scotStarterLimit', 'Basic Rate Starts At (£ income)'],
                    ['scotBasicRate', 'Basic Rate (%)'], ['scotBasicLimit', 'Intermediate Rate Starts At (£ income)'],
                    ['scotIntermediateRate', 'Intermediate Rate (%)'], ['scotIntermediateLimit', 'Higher Rate Starts At (£ income)'],
                    ['scotHigherRate', 'Higher Rate (%)'], ['scotHigherLimit', 'Advanced Rate Starts At (£ income)'],
                    ['scotAdvancedRate', 'Advanced Rate (%)'], ['scotAdvancedLimit', 'Top Rate Starts At (£ income)'],
                    ['scotTopRate', 'Top Rate (%)']
                  ] : [
                    ['basicBandLimit', 'Higher Rate Starts At (£ income)'], ['basicTaxRate', 'Basic Rate (%)'],
                    ['higherBandLimit', 'Additional Rate Starts At (£ income)'], ['higherTaxRate', 'Higher Rate (%)'], ['additionalTaxRate', 'Additional Rate (%)']
                  ]),
                  ['nicPrimaryThreshold', 'NIC Primary Threshold (£)'], ['nicUpperEarningsLimit', 'NIC Upper Earnings Limit (£)'], ['nicMainRate', 'NIC Main Rate (%)'], ['nicUpperRate', 'NIC Upper Rate (%)'],
                  ['class4MainRate', 'Class 4 Main Rate (%, self-employed)'], ['class4UpperRate', 'Class 4 Upper Rate (%, self-employed)'],
                  ['employerNicRate', 'Employer NIC Rate (%)'], ['pclsProportion', 'PCLS Tax-Free (%)'], ['pclsMaxCap', 'Lump Sum Allowance (£ LSA)'],
                  ['isaAnnualAllowance', 'ISA Allowance (£/person/yr)'], ['pensionAnnualAllowance', 'Pension Annual Allowance (£/person/yr)'], ['pensionNoEarningsLimit', 'Pension Limit With No Earnings (£/person/yr)'], ['mpaaLimit', 'Money Purchase Annual Allowance (£/person/yr)'], ['pensionTaperThreshold', 'Annual Allowance Taper Threshold (£ earnings)'], ['pensionTaperRate', 'Annual Allowance Taper Rate (%)'], ['pensionTaperFloor', 'Tapered Annual Allowance Floor (£)'], ['cgtAnnualExempt', 'CGT Annual Exempt Amount (£/person/yr)'], ['cgtBasicRate', 'CGT Rate: Basic Band (%)'], ['cgtHigherRate', 'CGT Rate: Higher/Additional Band (%)']
                ].map(([field, label]) => (
                  <div key={field}><span className="text-slate-600 font-sans font-semibold block mb-1">{label}</span><input type="number" min="0" placeholder={String(E.DEFAULT_CONFIG[field])} onFocus={handleFocus} value={plan?.config?.[field] ?? ''} onChange={(e) => updateConfig(field, e.target.value)} className={smallInputCls} /></div>
                ))}
              </div>
              <div className="pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowAdvancedConfig(v => !v)} className="text-[11px] font-bold text-slate-600 hover:text-slate-900 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                  <Settings className="w-3.5 h-3.5" /> Advanced inputs {showAdvancedConfig ? '▾' : '▸'}
                  <span className="font-normal normal-case tracking-normal text-slate-400">(niche settings most plans leave at the default)</span>
                </button>
                {showAdvancedConfig && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono mt-3">
                    <div><span className="text-slate-600 font-sans font-semibold block mb-1">Employer NIC Passed to Pension (%)</span><input type="number" min="0" placeholder={String(E.DEFAULT_CONFIG.employerNicPassThrough)} onFocus={handleFocus} value={plan?.config?.employerNicPassThrough ?? ''} onChange={(e) => updateConfig('employerNicPassThrough', e.target.value)} className={smallInputCls} /><span className="text-[10px] text-slate-400 font-sans mt-1 block">Share of the employer's NIC saving added to a salary-sacrifice contribution.</span></div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}


        {/* TAB 3: TRAJECTORY & SANDBOX */}
        {activeTab === 'trajectory' && (
          <div className="space-y-6">
            <div className="p-4 bg-blue-50/80 border border-blue-200 rounded-2xl text-xs text-slate-700 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-blue-950 text-sm"><Layers className="w-4 h-4 text-blue-600" /> Deterministic Portfolio Trajectory &amp; Sandbox</div>
              <p className="leading-relaxed"><strong>What it does:</strong> Models compound wealth paths and tax-wrapper decumulation at one steady real rate per wrapper, recalculated live as you type. It is the fast view: change a contribution or a retirement age in the Sandbox and the whole projection moves with you.</p>
              <p className="text-slate-500 text-[11px] leading-relaxed"><strong>Where are the lucky and unlucky curves?</strong> This tab used to draw one either side of the expected line, and both were removed because a constant rate cannot carry sequence-of-returns risk. That risk applies only on the way down, once you are withdrawing: a bad run of years early in retirement forces selling units cheaply and the loss never comes back. Measured against the simulation the upper line was fine, but the lower one finished a mean 23% above the 10-in-100 worst outcome, and 70% above it at worst. A smooth curve is the wrong shape for that question, so the range now comes from the Monte Carlo tab, where it is read off {MC_TRIALS.toLocaleString()} actual paths.</p>
              <p className={`text-[11px] font-semibold ${deterministicVerdict.survived ? 'text-emerald-700' : 'text-rose-700'}`}>
                {deterministicVerdict.survived ? `Expected path survives to ${terminalAge}` : `Expected path fails at age ${deterministicVerdict.failAge} (${deterministicVerdict.failReason === 'pre-access' ? 'pre-SIPP access bridge exhausted' : deterministicVerdict.failReason === 'floor' ? 'below the bequest floor' : 'spending shortfall'})`}; lifetime tax {formatGBP(deterministicVerdict.lifetimeTax)}{P.cgtEnabled ? ' (income tax + CGT)' : ''}.
              </p>
            </div>

            <div className="bg-surface border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">Active View:</span>
                {(isCouple ? ['Combined', 'Myself', 'Partner'] : ['Combined']).map(p => (
                  <button key={p} onClick={() => setPlan(prev => ({ ...prev, activeProfileView: p }))} className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${plan?.activeProfileView === p ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'}`}>{p}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs"><div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Expected Terminal Pot</div><div className="text-2xl font-black font-mono text-blue-600 mt-2">{formatGBP(chartDisplayData[chartDisplayData.length - 1]?.expected)}</div><div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-blue-600" /> Constant expected real growth to age {terminalAge}</div></div>
              <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs"><div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Expected Pot at Retirement</div><div className="text-2xl font-black font-mono text-indigo-600 mt-2">{formatGBP(timelineData.find(r => r.ageSelf === ctx.owners[0].retireAge)?.totalCombined)}</div><div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-indigo-600" /> The year contributions stop, at age {ctx.owners[0].retireAge}</div></div>
              {/*
                * Where the two deterministic band lines used to sit. A single constant rate cannot carry
                * sequence-of-returns risk, so its downside finished well above the simulated one; the
                * honest range is a distribution, and it lives one tab across.
                */}
              <button type="button" onClick={() => setActiveTab('simulation')} className="text-left bg-slate-50 border border-slate-200 p-5 rounded-2xl shadow-xs hover:border-indigo-200 hover:bg-surface transition-colors cursor-pointer group"><div className="text-xs font-semibold uppercase tracking-wider text-slate-500">How good or bad could it get?</div><div className="text-base font-bold text-slate-800 mt-2 group-hover:text-indigo-700">Run the Monte Carlo &rarr;</div><div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><Dices className="w-3.5 h-3.5 text-indigo-600" /> One smooth line cannot show the spread. {MC_TRIALS.toLocaleString()} simulated paths can.</div></button>
            </div>

            <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Layers className="w-4 h-4 text-blue-600" /> Projected Portfolio Trajectory</h2>
                  <span className="text-xs text-slate-500">Real purchasing power by account wrapper{isSandboxModified && <span className="ml-2 font-bold text-amber-600">• Showing Sandbox Impact (dashed)</span>}</span>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs w-full sm:w-auto">
                  <span className="text-slate-600 whitespace-nowrap">Horizon: <strong>Age {effectiveMaxVisibleAge}</strong></span>
                  <input type="range" min={currentAge + 1} max={terminalAge} value={effectiveMaxVisibleAge} onChange={(e) => setMaxVisibleAge(Number(e.target.value))} className="w-32 sm:w-40 accent-blue-600 cursor-pointer" />
                </div>
              </div>
              <div className="relative overflow-x-auto">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto select-none" onMouseLeave={() => setHoveredPoint(null)}>
                  <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {yScale.ticks(6).map((t, i) => <g key={i} transform={`translate(0, ${yScale(t)})`}><line x2={innerWidth} stroke={cp.gridMajor} strokeDasharray="3,3" /><text x={-10} dy="0.32em" fill={cp.axisText} fontSize="10" textAnchor="end" fontFamily="monospace">£{(t / 1000).toFixed(0)}k</text></g>)}
                    {xScale.ticks(10).map((t, i) => <g key={i} transform={`translate(${xScale(t)}, 0)`}><line y2={innerHeight} stroke={cp.gridMinor} /><text y={innerHeight + 20} fill={cp.axisText} fontSize="11" textAnchor="middle" fontFamily="monospace">{t}</text></g>)}
                    {markers(xScale)}
                    {themedSeries.map(s => (activeSeries[s.id] && pathGenerators[s.id]) ? <path key={s.id} d={pathGenerators[s.id]} fill="none" stroke={s.color} strokeWidth={s.strokeWidth} strokeDasharray={s.dash} strokeLinecap="round" /> : null)}
                    {sandboxLinePath && <path d={sandboxLinePath} fill="none" stroke={cp.sandboxDash} strokeWidth="3.5" strokeDasharray="6,4" strokeLinecap="round" />}
                    {comparePaths.map(c => <path key={c.id} d={c.d} fill="none" stroke={c.tone} strokeWidth="2.5" strokeDasharray="5,3" strokeLinecap="round" />)}
                    <rect width={innerWidth} height={innerHeight} fill="transparent" onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const age = Math.round(xScale.invert((e.clientX - rect.left) * (innerWidth / Math.max(1, rect.width)))); setHoveredPoint(visibleData.find(d => d.ageSelf === age) || null); }} />
                    {hoveredPoint && <g transform={`translate(${xScale(hoveredPoint.ageSelf)}, 0)`}><line y2={innerHeight} stroke={cp.hoverCrosshair} strokeWidth="1" strokeDasharray="2,2" /><circle cy={yScale(hoveredPoint.expected || 0)} r="4" fill={cp.trajectoryHoverFill} stroke={cp.hoverDotStroke} strokeWidth="2" /></g>}
                  </g>
                </svg>
                {hoveredPoint && (
                  <div className="absolute top-4 left-24 bg-surface/95 border border-slate-200 p-3 rounded-xl shadow-lg text-xs space-y-1 backdrop-blur-md pointer-events-none">
                    <div className="font-bold text-slate-800 border-b border-slate-100 pb-1 flex justify-between gap-4"><span>Age {hoveredPoint.ageSelf} ({hoveredPoint.year})</span><span className="text-slate-500">Spend Demand: {formatGBP(hoveredPoint.targetSpend)}/yr</span></div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 font-mono">
                      {activeSeries.expected && <div className="text-blue-600 font-bold">Projected Pot: {formatGBP(hoveredPoint.expected)}</div>}
                      {isSandboxModified && <div className="text-amber-600 font-bold">Sandbox Pot: {formatGBP(sandboxTimeline.find(d => d.ageSelf === hoveredPoint.ageSelf)?.totalCombined)}</div>}
                      {activeSeries.pensions && <div className="text-sky-600">Pensions: {formatGBP(hoveredPoint.pensions)}</div>}
                      {activeSeries.isas && <div className="text-teal-600">ISAs: {formatGBP(hoveredPoint.isas)}</div>}
                      <div className="text-slate-600">Tax this year: {formatGBP(hoveredPoint.taxPaid)}</div>
                      {compareRuns.filter(r => r.rows).map(r => (
                        <div key={r.id} className="font-bold truncate" style={{ color: r.tone }}>{r.name}: {formatGBP(r.rows.find(d => d.ageSelf === hoveredPoint.ageSelf)?.totalCombined)}</div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  {themedSeries.map(s => (
                    <button key={s.id} onClick={() => setActiveSeries(prev => ({ ...prev, [s.id]: !prev[s.id] }))} className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer border ${activeSeries[s.id] ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold' : 'bg-surface border-slate-200 text-slate-400 opacity-60'}`}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />{s.label}{activeSeries[s.id] && <Check className="w-3 h-3 text-slate-600" />}
                    </button>
                  ))}
                </div>
                {isSandboxModified && <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" /> Sandbox Active (Dashed Line)</div>}
              </div>
              {scenarios.filter(s => s.id !== activeScenarioId).length > 0 && (
                <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                  <span className="text-xs text-slate-500 font-semibold whitespace-nowrap">Compare saved scenarios:</span>
                  {scenarios.filter(s => s.id !== activeScenarioId).map(s => {
                    const run = compareRuns.find(r => r.id === s.id);
                    const atCap = !run && selectedCompare.length >= MAX_COMPARE;
                    return (
                      <button key={s.id} type="button" disabled={atCap} onClick={() => toggleCompare(s.id)} title={atCap ? `Up to ${MAX_COMPARE} at once` : s.name}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all border max-w-[16rem] ${run ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold cursor-pointer' : atCap ? 'bg-surface border-slate-200 text-slate-300 cursor-not-allowed' : 'bg-surface border-slate-200 text-slate-500 opacity-70 cursor-pointer hover:opacity-100'}`}>
                        <span className="w-2.5 h-2.5 rounded-full shrink-0 border" style={{ backgroundColor: run ? run.tone : 'transparent', borderColor: run ? run.tone : 'currentColor' }} />
                        <span className="truncate">{s.name}</span>{run && <Check className="w-3 h-3 text-slate-600 shrink-0" />}
                      </button>
                    );
                  })}
                  {selectedCompare.length > 0 && <button type="button" onClick={() => setCompareIds([])} className="text-xs text-slate-500 hover:text-slate-800 hover:underline font-semibold cursor-pointer">Clear</button>}
                </div>
              )}
            </div>

            {selectedCompare.length > 0 && (
              <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Table className="w-4 h-4 text-blue-600" /> Scenario Comparison</h2>
                  <span className="text-xs text-slate-500">Every figure on the expected-return path, in today&rsquo;s money. Each scenario&rsquo;s retirement pot is read at its own retirement age. Click a column to sort.</span>
                </div>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold font-sans">
                      <tr>
                        <th className="p-2.5">Scenario</th>
                        {[['retireAge', 'Retires'], ['retirePot', 'Pot at retirement'], ['terminal', 'Terminal pot'], ['delta', 'vs current'], ['lifetimeTax', 'Lifetime tax']].map(([key, label]) => (
                          <th key={key} className="p-2.5">
                            <button type="button" onClick={() => sortCompareBy(key)} className="font-semibold hover:text-slate-900 cursor-pointer flex items-center gap-1">
                              {label}{compareSort.key === key && <span className="text-[9px]">{compareSort.dir === 'desc' ? '▼' : '▲'}</span>}
                            </button>
                          </th>
                        ))}
                        <th className="p-2.5 text-right">Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {sortedCompareRows.map(r => (
                        <tr key={r.id} className={`transition-colors ${r.isBase ? 'bg-slate-50/80' : 'hover:bg-slate-50/80'}`}>
                          <td className="p-2 font-sans font-semibold text-slate-800">
                            <span className="flex items-center gap-2">
                              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: r.tone }} />
                              <span className="truncate max-w-[14rem]">{r.name}</span>
                              {r.isBase && <span className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[9px] font-bold uppercase tracking-wide shrink-0">Baseline</span>}
                            </span>
                          </td>
                          {r.error ? (
                            <td colSpan={5} className="p-2 font-sans text-slate-400 italic">This scenario cannot be projected: {r.error}</td>
                          ) : (
                            <>
                              <td className="p-2 text-slate-700">{r.retireAge}</td>
                              <td className="p-2 text-slate-700">{formatGBP(r.retirePot)}</td>
                              <td className="p-2 font-bold text-blue-700">{formatGBP(r.terminal)}</td>
                              <td className={`p-2 font-semibold ${r.delta === null ? 'text-slate-300' : r.delta > 0 ? 'text-emerald-700' : r.delta < 0 ? 'text-rose-700' : 'text-slate-500'}`}>
                                {r.delta === null ? '—' : `${r.delta > 0 ? '+' : r.delta < 0 ? '−' : ''}${formatGBP(Math.abs(r.delta))}`}
                              </td>
                              <td className="p-2 text-slate-600">{formatGBP(r.lifetimeTax)}</td>
                            </>
                          )}
                          <td className="p-2 text-right">
                            {r.error ? <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-sans text-[10px] font-bold">Unavailable</span>
                              : <span className={`px-2 py-0.5 rounded font-sans text-[10px] font-bold ${r.survived ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>{outcomeLabel(r)}</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">One steady real rate per wrapper, so this ranks the plans against each other rather than against a market. It carries no sequence-of-returns risk: for the chance each scenario survives, enter them in the tournament on the Monte Carlo tab, which runs every scenario on the same market paths.</p>
              </div>
            )}

            {renderSandboxPanel({ tab: 'trajectory' })}
          </div>
        )}

        {/* TAB 4: MONTE CARLO */}
        {activeTab === 'simulation' && (
          <div className="space-y-6">
            <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl text-xs text-slate-700 space-y-2 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-indigo-950 text-sm"><Dices className="w-4 h-4 text-indigo-600" /> Monte Carlo Simulation</div>
              <p className="leading-relaxed">Runs your plan through {MC_TRIALS.toLocaleString()} randomised market paths and answers three questions in one go: how often your current spend holds, the most you could take instead, and whether a different split between wrappers would do better.</p>
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <button type="button" onClick={() => goToDoc('doc-mc-buttons')} className="text-[11px] text-blue-700 hover:text-blue-900 hover:underline font-semibold flex items-center gap-1 cursor-pointer">
                  <HelpCircle className="w-3.5 h-3.5" /> What each stage does, and how to read it &rarr;
                </button>
                <button type="button" onClick={() => goToDoc('doc-tournament')} className="text-[11px] text-blue-700 hover:text-blue-900 hover:underline font-semibold flex items-center gap-1 cursor-pointer">
                  <HelpCircle className="w-3.5 h-3.5" /> Tournament methodology and players &rarr;
                </button>
              </div>
            </div>

            <div className="bg-surface border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Run the numbers</h3>
                  <span className="text-[11px] text-slate-500">Each stage appears as it finishes, so the first answer arrives while the rest is still working. Every figure is in today&rsquo;s money.</span>
                </div>
                <div className="flex items-center gap-2">
                  {mcBusy && (
                    <button type="button" onClick={handleCancelMC} className="px-3 py-1.5 rounded-xl text-xs font-bold border border-slate-300 bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer">Stop</button>
                  )}
                  <button onClick={handleRunAll} disabled={mcBusy}
                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 dark:from-[#2C5C8F] dark:to-[#A9781F] dark:hover:from-[#204568] text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-60">
                    <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300 dark:fill-[#FCD34D] dark:text-[#FCD34D]" />
                    {isSimulating && !isOptimizing ? 'Testing…' : isOptimizing ? 'Solving…' : tournament.isEvaluating ? 'Comparing…' : '⚡ Run the numbers'}
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-slate-600 pt-2.5 border-t border-slate-100">
                <span className="text-slate-400">Always runs: how your current spend holds up.</span>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input type="checkbox" checked={mcStages.safeMax} onChange={(e) => setMcStages(s => ({ ...s, safeMax: e.target.checked }))} className="accent-indigo-600 cursor-pointer" />
                  <span className="font-semibold text-slate-700">Also solve for the most I could spend</span>
                </label>
                <div className={`flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 ${mcStages.safeMax || safeMaxResult ? '' : 'opacity-40'}`}>
                  <span className="text-slate-500 px-2">Target survival rate:</span>
                  {[85, 90, 95].map(rate => <button key={rate} type="button" onClick={() => setTargetSurvivalRate(rate)} className={`px-2 py-0.5 rounded-lg font-semibold transition-all cursor-pointer ${targetSurvivalRate === rate ? 'bg-surface text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>{rate}%</button>)}
                </div>
                <label className="flex items-center gap-1.5 cursor-pointer select-none">
                  <input type="checkbox" checked={mcStages.tournament} onChange={(e) => setMcStages(s => ({ ...s, tournament: e.target.checked }))} className="accent-indigo-600 cursor-pointer" />
                  <span className="font-semibold text-slate-700">Also compare wrapper strategies</span>
                </label>
              </div>
              {simProgress && <div className="w-full"><ProgressBar value={simProgress.value} label={simProgress.label} /></div>}
            </div>

            {(simResult || safeMaxResult) && (
              <div className={`p-5 rounded-2xl shadow-xs border transition-all ${!simResult ? 'bg-slate-50 border-slate-200' : simResult.successRate >= 90 ? 'bg-emerald-50/90 border-emerald-200' : simResult.successRate >= 75 ? 'bg-amber-50/90 border-amber-200' : 'bg-rose-50/90 border-rose-200'}`}>
                <div className="flex items-start gap-3.5">
                  {simResult && (
                    <div className={`p-3 rounded-2xl border shrink-0 ${simResult.successRate >= 90 ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : simResult.successRate >= 75 ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-rose-100 border-rose-300 text-rose-700'}`}>{simResult.successRate >= 90 ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}</div>
                  )}
                  <div className="min-w-0 space-y-1.5">
                    {simResult && (simResult.spend > 0 ? (
                      <p className="text-sm text-slate-900 leading-snug">
                        Your <strong className="font-mono font-bold">{formatGBP(simResult.spend)}</strong> a year held in <strong className={`font-mono font-bold ${simResult.successRate >= 90 ? 'text-emerald-700' : simResult.successRate >= 75 ? 'text-amber-700' : 'text-rose-700'}`}>{simResult.successRate.toFixed(1)}%</strong> of {simResult.trials.toLocaleString()} paths.
                      </p>
                    ) : (
                      // Spending nothing survives everything, so quoting 100% here would read as reassurance
                      // about a plan that has not been entered yet.
                      <p className="text-sm text-slate-900 leading-snug">
                        Your net living spend is blank, so there is nothing to test. Enter it in Plan Inputs and run this again.
                      </p>
                    ))}
                    {safeMaxResult && (
                      <p className="text-sm text-slate-900 leading-snug">
                        {safeMaxResult.spend > 0 ? (
                          <>
                            You could take up to <strong className="font-mono font-bold text-indigo-700">{formatGBP(safeMaxResult.spend)}</strong> a year and still clear {safeMaxResult.targetRate}%
                            {simResult && simResult.spend > 0 && Math.abs(safeMaxResult.spend - simResult.spend) >= 250 && (
                              <span className="text-slate-600">, {formatGBP(Math.abs(safeMaxResult.spend - simResult.spend))} a year {safeMaxResult.spend > simResult.spend ? 'more' : 'less'} than you entered</span>
                            )}.
                          </>
                        ) : (
                          <>No level of spending at all clears {safeMaxResult.targetRate}%, so the solver returned nothing.</>
                        )}
                        {safeMaxResult.note && <span className="block text-[11px] text-rose-700 font-semibold mt-0.5">{safeMaxResult.note}</span>}
                      </p>
                    )}
                    {tournamentBest && (
                      <p className="text-sm text-slate-900 leading-snug">
                        Best wrapper strategy: <strong>{tournamentBest.name}</strong> at <strong className="font-mono font-bold">{tournamentBest.stats.successRate.toFixed(1)}%</strong>
                        {tournamentBaselinePlayer && tournamentBest.id !== 'baseline' && (
                          <span className="text-slate-600">, {(tournamentBest.stats.successRate - tournamentBaselinePlayer.stats.successRate).toFixed(1)} points {tournamentBest.stats.successRate >= tournamentBaselinePlayer.stats.successRate ? 'above' : 'below'} your current split</span>
                        )}.
                      </p>
                    )}
                    {safeMaxStale && !mcBusy && (
                      <button type="button" onClick={handleResolveSafeMax} className="text-[11px] text-blue-700 hover:text-blue-900 hover:underline font-semibold cursor-pointer">
                        Solve again at {targetSurvivalRate}% &rarr;
                      </button>
                    )}
                    <p className="text-[11px] text-slate-500 font-mono pt-0.5">
                      {MC_TRIALS.toLocaleString()} paths · seed {mcSeed}{simResult ? ` · ±${(1.96 * simResult.standardError).toFixed(1)} pts` : ''} · today&rsquo;s money
                    </p>
                  </div>
                </div>
                {simResult && simResult.preNmpaFailRate > 0 && (
                  <div className="mt-3.5 p-3 bg-rose-100/90 border border-rose-300 rounded-xl text-xs text-rose-950 flex items-start gap-2.5 shadow-2xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div><strong className="font-bold">Pre-Pension Bridge Exhaustion in {simResult.preNmpaFailRate.toFixed(1)}% of paths:</strong> non-pension investments (S&amp;S ISAs, other investments and cash) ran out while pension money was still locked (access age {nmpa}). Consider shifting contributions to your S&amp;S ISA, a later retirement age, or the strategy comparison below.</div>
                  </div>
                )}
              </div>
            )}

            {fanPaths && (
              <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Dices className="w-4 h-4 text-indigo-600" /> The range of outcomes, year by year</h3>
                    <span className="text-xs text-slate-500">Where {simResult.trials.toLocaleString()} simulated paths put your total pot at each age, spending {formatGBP(simResult.spend)} a year. Real purchasing power.</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-2.5 rounded-sm" style={{ background: cp.fanBand, border: `1px solid ${cp.fanEdge}` }} />10th&ndash;90th</span>
                    <span className="flex items-center gap-1.5"><span className="w-3.5 h-0.5 rounded" style={{ background: cp.fanMedian }} />Median</span>
                  </div>
                </div>
                <div className="relative overflow-x-auto">
                  <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto select-none" onMouseLeave={() => setHoveredFanPoint(null)}>
                    <g transform={`translate(${margin.left}, ${margin.top})`}>
                      {fanYScale.ticks(6).map((t, i) => <g key={i} transform={`translate(0, ${fanYScale(t)})`}><line x2={innerWidth} stroke={cp.gridMajor} strokeDasharray="3,3" /><text x={-10} dy="0.32em" fill={cp.axisText} fontSize="10" textAnchor="end" fontFamily="monospace">£{(t / 1000).toFixed(0)}k</text></g>)}
                      {histXScale.ticks(10).map((t, i) => <g key={i} transform={`translate(${histXScale(t)}, 0)`}><line y2={innerHeight} stroke={cp.gridMinor} /><text y={innerHeight + 20} fill={cp.axisText} fontSize="11" textAnchor="middle" fontFamily="monospace">{t}</text></g>)}
                      {markers(histXScale)}
                      <path d={fanPaths.band} fill={cp.fanBand} stroke="none" />
                      <path d={fanPaths.lower} fill="none" stroke={cp.fanEdge} strokeWidth="1.5" strokeDasharray="5,4" />
                      <path d={fanPaths.upper} fill="none" stroke={cp.fanEdge} strokeWidth="1.5" strokeDasharray="5,4" />
                      <path d={fanPaths.median} fill="none" stroke={cp.fanMedian} strokeWidth="3" strokeLinecap="round" />
                      <rect width={innerWidth} height={innerHeight} fill="transparent" onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const age = Math.round(histXScale.invert((e.clientX - rect.left) * (innerWidth / Math.max(1, rect.width)))); setHoveredFanPoint(fanData.find(d => d.ageSelf === age) || null); }} />
                      {hoveredFanPoint && (
                        <g transform={`translate(${histXScale(hoveredFanPoint.ageSelf)}, 0)`}>
                          <line y2={innerHeight} stroke={cp.hoverCrosshair} strokeWidth="1" strokeDasharray="2,2" />
                          <circle cy={fanYScale(hoveredFanPoint.p50)} r="4" fill={cp.fanMedian} stroke={cp.hoverDotStroke} strokeWidth="2" />
                        </g>
                      )}
                    </g>
                  </svg>
                  {hoveredFanPoint && (
                    <div className="absolute top-2 right-2 bg-surface/95 border border-slate-200 rounded-xl p-2.5 text-[11px] font-mono shadow-sm pointer-events-none">
                      <div className="font-bold text-slate-800 font-sans mb-1">Age {hoveredFanPoint.ageSelf}</div>
                      <div className="text-emerald-700">90th: {formatGBP(hoveredFanPoint.p90)}</div>
                      <div className="text-slate-800">Median: {formatGBP(hoveredFanPoint.p50)}</div>
                      <div className="text-rose-700">10th: {formatGBP(hoveredFanPoint.p10)}</div>
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {fanRuinAge !== null
                    ? <><strong className="text-rose-700">The lower edge reaches zero at age {fanRuinAge}:</strong> one plan in ten has run dry by then. </>
                    : <><strong className="text-emerald-700">The lower edge never reaches zero:</strong> more than nine plans in ten still hold something at age {terminalAge}. </>}
                  The band widens because nothing cancels out the early years. No single path follows any of these three lines, and none of them is a forecast: each is a percentile of where {simResult.trials.toLocaleString()} paths had landed by that age, so the right-hand edge is the same 10th, 50th and 90th percentile pot reported below.
                </p>
              </div>
            )}

            {sequenceLoss && (
              <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><ArrowDownRight className="w-4 h-4 text-rose-600" /> What the order of returns costs you</h3>
                  <span className="text-xs text-slate-500">A return forecast tells you what a holding left alone should earn. It cannot tell you this, because the answer is not in the returns &mdash; it is in the order they arrive.</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block mb-0.5">Unlucky return, arriving smoothly</span>
                    <span className="text-base font-bold font-mono text-slate-700">{formatGBP(sequenceLoss.smoothLow)}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">the 10th %ile rate, compounded to {terminalAge}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block mb-0.5">Unlucky return, arriving in any order</span>
                    <span className="text-base font-bold font-mono text-rose-700">{formatGBP(sequenceLoss.actualLow)}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">the simulation&rsquo;s 10th %ile pot</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
                    <span className="text-slate-500 block mb-0.5">Sequence risk</span>
                    {sequenceLoss.state === 'ruin'
                      ? <span className="text-base font-black font-mono text-rose-700">{fanRuinAge !== null ? `Broke by ${fanRuinAge}` : 'Runs dry'}</span>
                      : <span className={`text-base font-black font-mono ${sequenceLoss.state === 'loss' ? 'text-rose-700' : 'text-slate-700'}`}>{sequenceLoss.gapLow > 0 ? '−' : '+'}{formatGBP(Math.abs(sequenceLoss.gapLow))}</span>}
                    <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">{sequenceLoss.state === 'ruin' ? 'no 10th %ile pot to compare' : `${Math.abs(sequenceLoss.pctLow).toFixed(1)}% of the smooth figure`}</span>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {sequenceLoss.state === 'loss' && <>
                    <strong className="text-rose-700">Losing {formatGBP(sequenceLoss.gapLow)} to bad timing alone:</strong> an unlucky <em>rate</em>, arriving evenly, leaves {formatGBP(sequenceLoss.smoothLow)} at {terminalAge}. One plan in ten ends below {formatGBP(sequenceLoss.actualLow)}. Nothing separates those two figures but the order the same returns came in. It is one-sided: run the same comparison at the 90th percentile and {sequenceLoss.pctHigh < 0
                      ? <>the simulation comes out <em>ahead</em> of the smooth figure, {formatGBP(sequenceLoss.actualHigh)} against {formatGBP(sequenceLoss.smoothHigh)}</>
                      : <>it costs just {sequenceLoss.pctHigh.toFixed(1)}%, {formatGBP(sequenceLoss.smoothHigh)} smooth against {formatGBP(sequenceLoss.actualHigh)} actual, next to {sequenceLoss.pctLow.toFixed(1)}% at the bottom</>}. Selling units cheaply to live on is irreversible in a way that buying them cheaply is not.{' '}
                  </>}
                  {sequenceLoss.state === 'buying' && <>
                    <strong className="text-emerald-700">Nothing here to lose to sequence risk.</strong> This plan never draws the pot down, so no run of bad years can force a sale. The small difference shown is contribution timing rather than order of returns &mdash; money paid in later is exposed to fewer years of compounding than a steady rate assumes &mdash; and it falls either way. {sequenceLoss.gapHigh < 0 ? <>The upside makes the point: {formatGBP(sequenceLoss.actualHigh)} actual against {formatGBP(sequenceLoss.smoothHigh)} smooth, <em>ahead</em> of the even path, because a bumpy one buys more units when prices are low. </> : null}While you are buying, volatility is mildly on your side. Expect that to reverse sharply once the plan is living off the pot.{' '}
                  </>}
                  {sequenceLoss.state === 'small' && <>
                    <strong className="text-emerald-700">The order of returns costs you very little here.</strong> An unlucky rate arriving evenly leaves {formatGBP(sequenceLoss.smoothLow)} at {terminalAge}; one plan in ten ends below {formatGBP(sequenceLoss.actualLow)}, {sequenceLoss.gapLow >= 0 ? <>a difference of {sequenceLoss.pctLow.toFixed(1)}%</> : <>which is actually {Math.abs(sequenceLoss.pctLow).toFixed(1)}% <em>ahead</em> of the even path</>}. You are drawing down, but not hard enough relative to the pot for a bad early run to force selling at the bottom &mdash; the withdrawals are being met without liquidating into a fall. That is the position sequence risk is least able to hurt. It is also sensitive to spending: raising the annual draw is what turns this figure from a rounding error into a real number.{' '}
                  </>}
                  {sequenceLoss.state === 'ruin' && <>
                    <strong className="text-rose-700">Sequence risk here is a date, not an amount.</strong> More than one plan in ten runs dry{fanRuinAge !== null ? <> &mdash; the lower edge hits zero at age {fanRuinAge}</> : null}, so there is no 10th percentile pot left to compare against. {sequenceLoss.smoothSurvives ? <>The same unlucky <em>rate</em> arriving evenly would have left {formatGBP(sequenceLoss.smoothLow)} at {terminalAge}: the shortfall is caused by <em>when</em> the bad years land, not by the average return being too low.</> : <>The unlucky rate does not survive the plan even arriving evenly, so the returns themselves are short before order is considered.</>}{' '}
                  </>}
                  Both figures come from the same forecast band shown in the Config risk matrix, over this plan&rsquo;s own horizon. The only difference is that one arrives evenly and the other does not.
                </p>
              </div>
            )}

            {simResult && (
              <details open={mcDetailOpen} onToggle={(e) => setMcDetailOpen(e.currentTarget.open)} className="bg-surface border border-slate-200/90 rounded-2xl shadow-xs">
                <summary className="p-4 cursor-pointer text-xs font-bold text-slate-900 uppercase tracking-wider select-none">
                  The detail behind it{safeMaxResult ? <span className="ml-2 font-normal normal-case tracking-normal text-slate-400">both runs, side by side</span> : null}
                </summary>
                <div className="px-5 pb-5 space-y-4">
                  {[
                    { key: 'entered', label: 'Your plan as entered', spend: simResult.spend, st: simResult, accent: 'blue' },
                    ...(safeMaxResult ? [{ key: 'solved', label: `At the ${safeMaxResult.targetRate}% safe maximum`, spend: safeMaxResult.spend, st: safeMaxResult.stats, accent: 'indigo' }] : [])
                  ].map(row => (
                    <div key={row.key} className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${row.accent === 'indigo' ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'}`}>{row.label}</span>
                        <span className="font-mono text-xs font-bold text-slate-800">{formatGBP(row.spend)}/yr</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80"><span className="text-slate-500 block mb-0.5">Survival Rate</span><span className={`text-base font-black font-mono ${row.st.successRate >= 90 ? 'text-emerald-700' : row.st.successRate >= 75 ? 'text-amber-700' : 'text-rose-700'}`}>{row.st.successRate.toFixed(1)}%</span></div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80"><span className="text-slate-500 block mb-0.5">Age of Failure</span><span className={`text-base font-black font-mono ${!row.st.medianFailAge ? 'text-emerald-700' : row.st.medianFailAge < nmpa ? 'text-rose-700' : 'text-amber-700'}`}>{row.st.medianFailAge ? `Age ${row.st.medianFailAge}` : 'None'}</span><span className="text-[10px] text-slate-400 block mt-0.5 font-mono truncate">{row.st.medianFailAge ? `Median of failed paths (earliest ${row.st.earliestFailAge})` : '100% Solvency'}</span></div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80"><span className="text-slate-500 block mb-0.5">Pre-SIPP access failures</span><span className={`text-base font-black font-mono ${row.st.preNmpaFailRate > 5 ? 'text-rose-700' : 'text-slate-700'}`}>{row.st.preNmpaFailRate.toFixed(1)}%</span></div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80"><span className="text-slate-500 block mb-0.5">10th %ile Pot @ {terminalAge}</span><span className="text-base font-bold font-mono text-rose-700">{formatGBP(row.st.p10Terminal)}</span></div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80"><span className="text-slate-500 block mb-0.5">Median Pot @ {terminalAge}</span><span className="text-base font-bold font-mono text-blue-700">{formatGBP(row.st.medianTerminal)}</span>{ctx.pensionDeathTaxRate > 0 && <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">net of pension death tax {formatGBP(row.st.medianTerminalNet)}</span>}</div>
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80"><span className="text-slate-500 block mb-0.5">90th %ile Pot @ {terminalAge}</span><span className="text-base font-bold font-mono text-emerald-700">{formatGBP(row.st.p90Terminal)}</span><span className="text-[10px] text-slate-400 block mt-0.5 font-mono">median lifetime tax {formatGBP(row.st.medianLifetimeTax)}</span></div>
                      </div>
                    </div>
                  ))}
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    A path fails in any year that living costs or a one-off cost cannot be met from an accessible wrapper, or if the terminal pot ends below your bequest floor. A pre-SIPP access failure means pension money existed but was still locked. Paths are seeded, so the same seed reproduces the result exactly.
                  </p>
                </div>
              </details>
            )}

            <WrapperStrategyTournament plan={plan} ctx={ctx} seed={mcSeed} scenarios={scenarios} activeScenarioId={activeScenarioId} state={tournament} setState={setTournament} cancelRef={tournamentCancelRef} onApplyStrategyToSandbox={handleApplyStrategyToSandbox} onApplyStrategyToPlan={handleApplyStrategyToPlan} onNavigateDocs={() => goToDoc('doc-tournament')} />
            {renderSandboxPanel({ tab: 'simulation' })}
          </div>
        )}

        {/* TAB 5: HISTORICAL */}
        {activeTab === 'historical' && (
          <div className="space-y-6">
            <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl text-xs text-slate-700 space-y-2">
              <div className="flex items-center gap-2 font-bold text-indigo-900 text-sm"><History className="w-4 h-4 text-indigo-600" /> Empirical Historical Backtest ({E.HISTORICAL_FIRST_YEAR}–{E.HISTORICAL_LAST_YEAR})</div>
              <p>Feeds actual historical real returns (US large-cap equities and a 50/50 government/corporate bond blend, weighted by each wrapper's risk tier) into your plan, <strong>starting from today (Age {currentAge})</strong> through to Age {terminalAge}.</p>
              <p className="text-slate-500">Selectable start years are capped at <strong>{maxHistoricalStartYear}</strong> so your {spanYears}-year plan runs within recorded history through {E.HISTORICAL_LAST_YEAR}.{historicalMetrics?.beyondData && ' Years beyond the dataset use the expected return.'}</p>
            </div>
            <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div><h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Select Historical Scenario or Start Year</h3><span className="text-[11px] text-slate-500">Select an iconic crisis preset or slide to any year between {E.HISTORICAL_FIRST_YEAR} and {maxHistoricalStartYear}.</span></div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-indigo-700"><span>Start Year:</span><input type="number" min={E.HISTORICAL_FIRST_YEAR} max={maxHistoricalStartYear} value={activeHistoricalStartYear} onChange={(e) => setSelectedHistoricalYear(Math.max(E.HISTORICAL_FIRST_YEAR, Math.min(maxHistoricalStartYear, Number(e.target.value) || E.HISTORICAL_FIRST_YEAR)))} className="w-16 p-1 bg-surface border border-slate-300 rounded text-center text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" /></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {HISTORICAL_PRESETS.map(p => {
                  const isValid = p.year <= maxHistoricalStartYear;
                  return (
                    <button key={p.year} onClick={() => isValid && setSelectedHistoricalYear(p.year)} disabled={!isValid} className={`p-2.5 rounded-xl border text-left transition-all ${!isValid ? 'bg-slate-50 text-slate-300 border-slate-200/50 cursor-not-allowed opacity-50' : activeHistoricalStartYear === p.year ? 'bg-indigo-600 dark:bg-[#A9781F] text-white border-indigo-600 shadow-xs cursor-pointer' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer'}`}>
                      <div className="flex items-center justify-between"><span className="font-bold text-xs">{p.year}</span>{!isValid && <span className="text-[9px] text-slate-400 font-sans">Over {E.HISTORICAL_LAST_YEAR}</span>}</div>
                      <div className={`text-[10px] leading-tight truncate mt-0.5 ${!isValid ? 'text-slate-300' : activeHistoricalStartYear === p.year ? 'text-indigo-100' : 'text-slate-500'}`}>{p.label.split('(')[0]}</div>
                    </button>
                  );
                })}
              </div>
              <div className="pt-2 flex items-center gap-3"><span className="text-xs font-mono text-slate-400">{E.HISTORICAL_FIRST_YEAR}</span><input type="range" min={E.HISTORICAL_FIRST_YEAR} max={maxHistoricalStartYear} value={activeHistoricalStartYear} onChange={(e) => setSelectedHistoricalYear(Number(e.target.value))} className="w-full accent-indigo-600 cursor-pointer" /><span className="text-xs font-mono text-slate-600 font-bold">{maxHistoricalStartYear}</span></div>
            </div>
            {historicalMetrics && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className={`p-4 rounded-2xl border shadow-xs ${historicalMetrics.survived ? 'bg-emerald-50/90 border-emerald-200' : 'bg-rose-50/90 border-rose-200'}`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 mb-1">Backtest Verdict</span>
                  <div className="flex items-center gap-2">{historicalMetrics.survived ? <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />}<div><div className={`text-base font-black font-display italic ${historicalMetrics.survived ? 'text-emerald-800' : 'text-rose-800'}`}>{historicalMetrics.survived ? `Survived all ${spanYears} years` : historicalMetrics.failReason === 'floor' ? `All ${spanYears} years funded, below floor` : `Ran dry after ${historicalMetrics.fundedYears} of ${spanYears} years`}</div><span className="text-[11px] text-slate-500">{historicalMetrics.survived ? `Age ${currentAge} to ${terminalAge}, no shortfall in any year`
                    : historicalMetrics.failReason === 'floor' ? `Ends below the ${formatGBP(ctx.solvencyFloor)} bequest floor at Age ${terminalAge}`
                      : `${historicalMetrics.failReason === 'pre-access' ? `Pension still locked at Age ${historicalMetrics.failAge}` : `Age ${historicalMetrics.failAge}`} (${historicalMetrics.failYear}) · ${historicalMetrics.unfundedYears} years unfunded`}</span></div></div>
                </div>
                <div className="bg-surface border border-slate-200/90 p-4 rounded-2xl shadow-xs"><span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 mb-1">Starting Balance (Today)</span><div className="text-xl font-bold font-mono text-slate-900 mt-1">{formatGBP(historicalMetrics.startVal)}</div><span className="text-[11px] text-slate-400">After year-0 flows, at Age {currentAge}</span></div>
                <div className="bg-surface border border-slate-200/90 p-4 rounded-2xl shadow-xs"><span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 mb-1">Lowest Portfolio Trough</span><div className="text-xl font-bold font-mono text-amber-700 mt-1">{formatGBP(historicalMetrics.minVal)}</div><span className="text-[11px] text-slate-400">Lowest total experienced</span></div>
                <div className="bg-surface border border-slate-200/90 p-4 rounded-2xl shadow-xs"><span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 mb-1">Terminal Pot @ {terminalAge}</span><div className={`text-xl font-bold font-mono mt-1 ${historicalMetrics.terminalVal > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatGBP(historicalMetrics.terminalVal)}</div><span className="text-[11px] text-slate-400">Real purchasing power remaining · lifetime tax {formatGBP(historicalMetrics.lifetimeTax)}</span></div>
              </div>
            )}
            <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <div><h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Historical Wealth Path (Simulating {activeHistoricalStartYear}–{activeHistoricalStartYear + spanYears})</h3><span className="text-xs text-slate-500">Real purchasing power across accumulation and decumulation</span></div>
              <div className="relative overflow-x-auto">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto select-none" onMouseLeave={() => setHoveredHistPoint(null)}>
                  <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {histYScale.ticks(6).map((t, i) => <g key={i} transform={`translate(0, ${histYScale(t)})`}><line x2={innerWidth} stroke={cp.gridMajor} strokeDasharray="3,3" /><text x={-10} dy="0.32em" fill={cp.axisText} fontSize="10" textAnchor="end" fontFamily="monospace">£{(t / 1000).toFixed(0)}k</text></g>)}
                    {histXScale.ticks(10).map((t, i) => <g key={i} transform={`translate(${histXScale(t)}, 0)`}><line y2={innerHeight} stroke={cp.gridMinor} /><text y={innerHeight + 20} fill={cp.axisText} fontSize="11" textAnchor="middle" fontFamily="monospace">{t}</text></g>)}
                    {markers(histXScale)}
                    {histLinePath && <path d={histLinePath} fill="none" stroke={cp.historicalLine} strokeWidth="3" strokeLinecap="round" />}
                    <rect width={innerWidth} height={innerHeight} fill="transparent" onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const age = Math.round(histXScale.invert((e.clientX - rect.left) * (innerWidth / Math.max(1, rect.width)))); setHoveredHistPoint(historicalTimeline.find(d => d.ageSelf === age) || null); }} />
                    {hoveredHistPoint && <g transform={`translate(${histXScale(hoveredHistPoint.ageSelf)}, 0)`}><line y2={innerHeight} stroke={cp.hoverCrosshair} strokeWidth="1" strokeDasharray="2,2" /><circle cy={histYScale(hoveredHistPoint.totalCombined)} r="4" fill={cp.historicalHoverFill} stroke={cp.hoverDotStroke} strokeWidth="2" /></g>}
                  </g>
                </svg>
                {hoveredHistPoint && (
                  <div className="absolute top-4 left-24 bg-surface/95 border border-slate-200 p-3 rounded-xl shadow-lg text-xs space-y-1 backdrop-blur-md pointer-events-none">
                    <div className="font-bold text-slate-800 border-b border-slate-100 pb-1 flex justify-between gap-4"><span>Age {hoveredHistPoint.ageSelf} (Simulated {hoveredHistPoint.histYear ?? 'beyond data'})</span><span className="text-slate-500">Plan Year: {hoveredHistPoint.year}</span></div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 font-mono">
                      <div className="text-indigo-600 font-bold">Total Pot: {formatGBP(hoveredHistPoint.totalCombined)}</div>
                      <div className="text-slate-600">Living Target: {formatGBP(hoveredHistPoint.targetSpend)}</div>
                      {hoveredHistPoint.histStockReturn !== null && <div className={hoveredHistPoint.histStockReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}>Equity Return: {hoveredHistPoint.histStockReturn.toFixed(1)}%</div>}
                      {hoveredHistPoint.histBondReturn !== null && <div className={hoveredHistPoint.histBondReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}>Bond Return: {hoveredHistPoint.histBondReturn.toFixed(1)}%</div>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: AUDIT */}
        {activeTab === 'audit' && (
          <div className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div><h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Table className="w-4 h-4 text-blue-600" /> Year-by-Year Cash Flow &amp; Wrapper Ledger</h2><span className="text-xs text-slate-500">Expected-return path: contributions, guaranteed income, decumulation waterfall, tax and wrapper balances (end of year).</span></div>
              <button onClick={handleExportCSV} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200 cursor-pointer self-start sm:self-auto"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export CSV Spreadsheet</button>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold font-sans"><tr><th className="p-2.5">Year</th><th className="p-2.5">Age (M)</th>{isCouple && <th className="p-2.5">Age (P)</th>}<th className="p-2.5">Spend Target</th><th className="p-2.5">Guaranteed + Take-home (net)</th><th className="p-2.5">Net Drawdown</th><th className="p-2.5">Pension Draw (gross)</th><th className="p-2.5">Tax</th>{P.cgtEnabled && <th className="p-2.5">CGT</th>}<th className="p-2.5">Pensions</th><th className="p-2.5">ISAs</th><th className="p-2.5">Other Inv</th><th className="p-2.5">Cash</th><th className="p-2.5">Total Combined</th><th className="p-2.5">Pre-SIPP access Liquid</th><th className="p-2.5 text-right">Status</th></tr></thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {timelineData.map(r => (
                    <tr key={r.year} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2 font-bold text-slate-800">{r.year}</td><td className="p-2">{r.ageSelf}</td>{isCouple && <td className="p-2">{r.agePart}</td>}
                      <td className="p-2 font-sans font-medium text-slate-700">{formatGBP(r.targetSpend)}</td>
                      <td className="p-2 text-emerald-700">{formatGBP(r.netGuaranteed + r.workingTakeHome)}</td>
                      <td className="p-2 text-rose-600 font-medium">{formatGBP(r.netDrawdown)}</td>
                      <td className="p-2 text-sky-700">{formatGBP(r.drawdownPensions)}{r.harvested > 0 && <span className="text-[9px] text-slate-400 block">incl. {formatGBP(r.harvested)} harvested</span>}</td>
                      <td className="p-2 text-slate-600">{formatGBP(r.taxPaid)}</td>
                      {P.cgtEnabled && <td className="p-2 text-amber-700">{formatGBP(r.cgtPaid || 0)}{r.realisedGains > 0 && <span className="text-[9px] text-slate-400 block">on {formatGBP(r.realisedGains)} gains</span>}</td>}
                      <td className="p-2 text-sky-700">{formatGBP(r.pensions)}</td><td className="p-2 text-teal-700">{formatGBP(r.isas)}</td><td className="p-2 text-amber-700">{formatGBP(r.other)}</td><td className="p-2 text-slate-700">{formatGBP(r.cash)}</td>
                      <td className="p-2 font-bold text-blue-700">{formatGBP(r.totalCombined)}</td><td className="p-2 text-slate-600">{formatGBP(r.preNmpaLiquid)}</td>
                      <td className="p-2 text-right">{r.preNmpaInsolvent ? <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-sans text-[10px] font-bold">Pre-SIPP access Gap</span> : r.unmetDemand > E.FAIL_TOLERANCE ? <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-sans text-[10px] font-bold">Shortfall {formatGBP(r.unmetDemand)}</span> : <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-sans text-[10px] font-bold">Solvent</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 7: DOCS */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            <div id="doc-mc-buttons" className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Dices className="w-4 h-4 text-blue-600" /> The Three Stages of a Monte Carlo Run</h2>
              <p className="text-xs text-slate-600 leading-relaxed">One button runs all three, and each result appears as its stage finishes. The first two use the same engine on the same {MC_TRIALS.toLocaleString()} randomised market paths and differ only in which side of the equation is held fixed: one fixes your spending and reports the risk, the other fixes the risk and reports the spending. The third leaves both alone and changes where the money sits instead. The last two can be switched off if you only want the fast answer.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <strong className="text-slate-800 block">Stage 1, always runs: "will this plan hold?"</strong>
                  <p className="text-slate-500">Takes the target living expenditure from Plan Inputs exactly as entered and runs it through {MC_TRIALS.toLocaleString()} paths. The answer is a <strong>survival rate</strong>: the share of paths that funded every year to age {terminalAge} without running dry and finished above your bequest floor. Use it once you know roughly what you want to spend. This stage reports a probability rather than targeting one, so the target survival rate does not affect it.</p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <strong className="text-slate-800 block">Stage 2, optional: "how much could I spend?"</strong>
                  <p className="text-slate-500">Ignores your target figure and solves for the <strong>largest annual spend</strong> that still survives at the target survival rate you pick. It bisects on the spending amount, re-running the full simulation at each step, which is why it takes longer than the first stage. At 95% it finds the spend that fails in no more than 1 path in 20. Because it describes a different spend from the one you entered, it gets its own line in the verdict and its own row of figures, rather than overwriting stage 1.</p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <strong className="text-slate-800 block">The target survival rate (85 / 90 / 95%)</strong>
                  <p className="text-slate-500">Only affects stage 2. It is the share of paths you are asking the spending figure to survive, so a <em>lower</em> target returns a <em>higher</em> figure: 85% buys you more income now in exchange for a 1-in-7 chance of running short. 95% is the conventional planning benchmark. Changing it after a run offers to solve stage 2 again on its own, since nothing else depends on it.</p>
                </div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <strong className="text-slate-800 block">Stage 3, optional: "would a different split do better?"</strong>
                  <p className="text-slate-500">Holds your spending and your budget fixed and re-splits the budget between wrappers, scoring each strategy on identical market paths. It is the slowest stage because it runs several full simulations, and two of its players search a range of candidates first. The methodology and the players are documented below.</p>
                </div>
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                <strong className="text-slate-800 block">The range chart, and why it is not a pair of lines</strong>
                <p className="text-slate-500">Stage 1 keeps every simulated path, not just its ending, so the chart can show where all {MC_TRIALS.toLocaleString()} of them stood at each age: the shaded band is the 10th to 90th percentile, the solid line the median. Read the right-hand edge and you get the same three pot figures reported underneath it, because both use the same quantile. No path follows any of the three lines, and the band widens with age because nothing cancels out the early years.</p>
                <p className="text-slate-500">The Trajectory tab used to answer this with two deterministic lines run at a steady 90th and 10th percentile rate. The upper one was close to the simulated 90th-percentile pot. The lower one was not: it finished a mean 23% above the simulated 10th-percentile pot, and 70% above it at worst. The reason is sequence-of-returns risk, which applies only while you are withdrawing. A bad run of years early in retirement forces selling units cheaply and the loss never comes back, and a constant rate has no bad years to express that with. Holding one household fixed and changing only the length of drawdown isolates it: −2.5% over 7 years, +16.3% over 32, −0.9% with no withdrawals at all, and 0.3% once volatility is set to nearly zero. So the lines went, and the distribution took their place.</p>
                <p className="text-slate-500">Where the lower edge touches zero, a tenth of the paths have run dry by that age. That is a statement no smooth line could have made.</p>
                <p className="text-slate-500"><strong className="text-slate-800">Sequence risk, priced.</strong> The card under the chart puts a number on the same effect rather than describing it. It takes each tier&rsquo;s 10th-percentile annualised return &mdash; the unlucky column of the Config risk matrix, over your own horizon &mdash; compounds it evenly to age {terminalAge}, and sets that against the 10th-percentile pot the simulation actually produced. The two runs share an expected return, a plan and a horizon; all that separates them is the order the returns arrive in, so the difference is sequence risk in pounds. It is one-sided by nature: the same comparison at the 90th percentile comes out far smaller, and sometimes favourable, because selling units cheaply to live on is irreversible in a way that buying them cheaply is not. While you are still contributing it disappears, and can turn mildly favourable &mdash; a bumpy path buys more units when prices are low. This is also the one thing a published return forecast cannot supply, however detailed: withdrawal order is not a property of a return distribution.</p>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed"><strong className="text-slate-800">Reading any of it honestly.</strong> Every figure is in today&rsquo;s money. The headline carries a &plusmn; sampling error: at {MC_TRIALS.toLocaleString()} trials a difference smaller than that is noise, so treat 94.2% and 95.1% as the same answer. Check the <strong>pre-SIPP access failure</strong> line separately: a plan can survive overall while still stranding you before age {nmpa}, which is a bridging problem, not a saving-enough problem. A path counts as failed in any year that living costs or a one-off cost cannot be met from an accessible wrapper, or if the terminal pot ends below your bequest floor. Paths are seeded, so the same seed reproduces the result exactly; change the seed in Config to test a different draw of markets.</p>
              <p className="text-[11px] text-slate-500 leading-relaxed">No stage changes your plan on its own. Applying a strategy from stage 3 is a separate, deliberate click.</p>
            </div>

            <div id="doc-tournament" className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Zap className="w-4 h-4 text-indigo-600" /> Automated Strategy Tournament &amp; Optimisation Methodology</h2>
              <p className="text-xs text-slate-600 leading-relaxed">The tournament compares six ways of splitting the same annual take-home budget between S&amp;S ISAs and pensions. Every player is run on the same {TOURNAMENT_TRIALS.toLocaleString()} market paths (common random numbers), so the ranking reflects the strategies rather than sampling luck. Any saved scenario can be entered as an extra player; those run exactly as saved and are not held to the same budget, which their cards state.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1"><strong className="text-slate-800 block">1. Equal net budget</strong><p className="text-slate-500">Each strategy costs the same take-home pay. Pension money is grossed up using each owner's own salary (income tax + NIC relief, plus any employer NIC pass-through set in Config), capped by the annual allowance (£{P.pensionAllowance.toLocaleString()}) and salary; ISA money is capped at £{P.isaAllowance.toLocaleString()} per person; anything left over flows to a GIA.</p></div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1"><strong className="text-slate-800 block">2. Conservative bridge sizing</strong><p className="text-slate-500">If spending starts before anyone can access a pension (age {nmpa}), the bridge reserve is the sum of net drawdown in those years (after guaranteed income and a working partner's take-home), uplifted by the safety margin ({E.num(plan?.config?.bridgeSafetyMargin, 30)}%) and assuming 0% real growth.</p></div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1"><strong className="text-slate-800 block">3. The players</strong><p className="text-slate-500"><strong>Current Plan</strong> · <strong>Survival Maximizer</strong> (searches the ISA share from 0% to 100% and keeps the best survival, subject to the bridge-risk cap) · <strong>Bridge-Sized Relief</strong> (pension-first, with only the pre-access bridge carved out: the requirement is sized with growth counted on both existing balances and new contributions, then cover levels either side of it are searched, some paid in level and some over the final years only, and spare ISA capital above the reserve is moved into the pension) · <strong>Relief-First</strong> (pension first, bridge minimum kept; with a Bed &amp; SIPP transfer of spare ISA capital in full scope) · <strong>Bracket-Smoothed Sizing</strong> (pension funded only to the pot whose sustainable withdrawal plus state pension fills the basic-rate band, the rest to ISA) · <strong>Relief-First, Bridge-Last</strong> (pension-max early, ISA-max in the final years before retirement).</p></div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1"><strong className="text-slate-800 block">4. Reading the results</strong><p className="text-slate-500">Rank by survival first; ties within 0.5 points are broken by the 10th-percentile pot. Watch the pre-SIPP access failure rate: a strategy can win on total survival by accepting more bridge risk. The "Partner balancing" option steers new money to the partner with the smaller projected pension so both personal allowances can be used in retirement; it costs relief if that partner pays a lower marginal rate, so it does not always win.</p></div>
              </div>
            </div>

            <div id="doc-decumulation" className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Sliders className="w-4 h-4 text-blue-600" /> Decumulation Policies &amp; Pension Drawdown Strategies</h2>
              <p className="text-xs text-slate-600 leading-relaxed">How money is withdrawn across wrappers changes lifetime tax and the size of the pot left at the end; it changes the probability of maintaining your living costs far less than the spend level, asset allocation and the pre-SIPP access bridge do.</p>
              <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1.5">
                <li><strong>Tax Smoothing (default):</strong> fills the £{P.pa.toLocaleString()} allowance from pension income (0%), then draws pension income up to the £{P.basicLimit.toLocaleString()} higher-rate threshold (about {Math.round((1 - P.pclsProp) * P.basicRate * 100)}% effective with the {Math.round(P.pclsProp * 100)}% tax-free element), then cash, GIA and ISA, with pension income above the threshold as the last resort. Cash and ISAs are preserved as the low-volatility reserve and the tax-free shield for later life.</li>
                <li><strong>UK FIRE Bracket Fill:</strong> draws pension only up to the £{P.pa.toLocaleString()} allowance, then cash, GIA and ISAs; pension income above the allowance is the last resort. Pays the least tax during your lifetime and leaves the largest pot, but that pot is mostly taxable pension. Set the pension death-tax haircut in Config to see the difference net of what beneficiaries would pay.</li>
                <li><strong>Sequential:</strong> cash → GIA → ISA → pension, no bracket management. Shown as the naive baseline; it wastes the personal allowance in early retirement.</li>
                <li><strong>Harvest unused allowance:</strong> once retired and past age {nmpa}, any unused 0% allowance is filled from the pension and the net proceeds moved to ISA (within the £{P.isaAllowance.toLocaleString()} limit) or cash. It only matters when spending is largely covered by guaranteed income.</li>
                <li><strong>Phased Drawdown</strong> crystallises {Math.round(P.pclsProp * 100)}% tax-free with each withdrawal (UFPLS-style), keeping the rest invested. <strong>Full Lump Sum</strong> moves the maximum tax-free cash (capped at £{P.lsa.toLocaleString()}) into cash savings at retirement; later withdrawals are then fully taxable.</li>
              </ul>
            </div>

            <div id="doc-coverage" className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-indigo-600" /> Modelling Decisions, Coverage &amp; Known Gaps</h2>
              <p className="text-xs text-slate-600 leading-relaxed">Where the rules leave room for judgement, this is the decision the model makes and why. Read this before trusting a number.</p>

              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-1">Decisions taken</h3>
              <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                <li><strong>Everything is in today's money.</strong> Growth uses each tier's <em>real</em> rate, so every pot, spend and bequest figure is in today's purchasing power. The "Combined (Nominal)" chart series is the only place inflation is added back, for display. A £100,000 bequest floor therefore means £100,000 of today's money. Do not gross it up.</li>
                <li><strong>Pay is flat in real terms unless you say otherwise.</strong> Salary, or trading profit for the self-employed, is held at the figure you enter for every working year. Because the projection is in today's money that is not a frozen wage, it is pay rising exactly with inflation. Set a real growth rate per person under Advanced inputs to model promotions or a career winding down; it compounds on top of inflation and feeds the relevant-earnings cap, the annual allowance taper and the relief rate on every pension contribution.</li>
                <li><strong>The MPAA is derived, not declared.</strong> The model runs the expected path once, finds the first year each person draws taxable pension income, and applies the £{P.mpaaLimit.toLocaleString()} allowance from that age. It assumes you have <em>not</em> already flexibly accessed a pension: reasonable for planning, wrong if you have, which would need the trigger set earlier.</li>
                <li><strong>Carry-forward is not consumed.</strong> Unused allowance from the prior three years is offered as headroom but is not tracked as being used up, so a plan that leans on it repeatedly is optimistic. It never lifts the earnings limit, and it accrues at each prior year's <em>tapered</em> allowance.</li>
                <li><strong>The annual allowance taper keys off earnings.</strong> HMRC tapers on adjusted income, which adds employer contributions; the model only knows earnings, so the taper is approximate for anyone near the £{P.aaTaperThr.toLocaleString()} threshold.</li>
                <li><strong>A blank salary means "unknown", not "zero".</strong> While you are still working, leaving salary empty leaves the pension allowance unconstrained rather than dropping it to £{P.pensionNoEarningsLimit.toLocaleString()}. Enter a salary for an accurate limit.</li>
                <li><strong>CGT is realisation-based.</strong> Gains are booked only when the GIA is actually sold, using a running cost basis. Gains are wiped by the uplift on death, so nothing is charged on whatever remains at the terminal age.</li>
                <li><strong>The tournament holds contributions equal.</strong> Every strategy is re-priced to cost the same total over the accumulation years as your current plan, by solving its contribution escalation. Without this a strategy could win simply by asking you to pay in more.</li>
                <li><strong>Allowance harvesting is a bequest tool.</strong> It never improves survival. It moves money from a pot taxed on death into one that is not. It is worth nothing unless you set a pension death tax rate, and close calls are broken on the pot left <em>after</em> that tax.</li>
                <li><strong>The self-employed get income tax relief only.</strong> A sole trader cannot salary sacrifice, so a personal contribution saves income tax at the marginal rate but no NIC, and no employer NIC can be passed through. That is 40% relief for a higher-rate trader against 42% for an employee, and 20% against 28% in the basic band. Set the employment type per person in Advanced inputs.</li>
                <li><strong>Allowances are frozen in real terms</strong> at the Config figures. Any future rise in the ISA or pension allowance is not modelled, so long staging schedules are deliberately cautious.</li>
              </ul>

              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-1">Modelled</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Income tax including the personal-allowance taper, employee Class 1 NIC and self-employed Class 4 NIC, the {Math.round(P.pclsProp * 100)}% tax-free element capped at the £{P.lsa.toLocaleString()} Lump Sum Allowance, the £{P.pensionAllowance.toLocaleString()} annual allowance with taper and three-year carry-forward, the relevant-earnings limit, the MPAA, ISA allowances, realisation-based CGT with its annual exempt amount and band split, state pension timing, the pre-SIPP access bridge, one-off deposits with multi-year staging, one-off costs, spending bands by age, salary-sacrifice relief including any employer NIC pass-through, and relief at source for the self-employed.</p>

              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-1">Not modelled yet</h3>
              <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                <li><strong>Lumpy self-employed profits.</strong> Trading profit is carried as a single figure that grows at a steady rate, exactly like a salary. Real self-employment swings year to year, and a bad year can waste an annual allowance that carry-forward only partly recovers. <strong>Class 2 NIC</strong> is also not charged: it stopped being mandatory above the Small Profits Threshold in 2024, and the voluntary route for those below it does not change a projection. Payments on account, the trading allowance, capital allowances and incorporation are all out of scope.</li>
                <li><strong>Devolved income tax:</strong> covered. Set where you pay tax in Config. Scotland uses its own six bands, Wales
                  is offered but currently matches England and Northern Ireland. Only the bands are devolved: National Insurance, capital gains
                  tax, the personal allowance and its taper apply unchanged, and relief at source on a pension contribution stays at 20%.
                  Note that the region only shows up where the model actually routes income through the tax calculation - pension drawdown,
                  the state pension and other taxable income - so it does not change a projection whose earning years are all before anyone
                  has retired.</li>
                <li><strong>Inheritance tax on the estate.</strong> The pension death tax setting applies a haircut to leftover pension only, so it represents the <em>extra</em> tax a pension suffers relative to an ISA, not IHT on everything.</li>
                <li><strong>Defined benefit pensions</strong> beyond entering them as a taxable income stream; no accrual, revaluation or transfer values.</li>
                <li><strong>Care costs, the Lifetime ISA, the National Minimum Wage floor on salary sacrifice, dividend and savings-interest taxation inside the GIA, share pooling and the 30-day CGT rule.</strong></li>
                <li><strong>Allowance and threshold changes</strong> announced for future years, and any change to the state pension triple lock.</li>
              </ul>
              <p className="text-xs text-slate-500 leading-relaxed">This is an educational model, not advice. Where a figure matters to a real decision, check it against current HMRC guidance or a regulated adviser.</p>
            </div>

            <div id="doc-taper" className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><HelpCircle className="w-4 h-4 text-blue-600" /> Spending by Age</h2>
              <p className="text-xs text-slate-600 leading-relaxed">Retirement spending often isn't flat. Set what a stretch of years actually costs in Plan Inputs as bands: a start age, an end age and what those years cost in today's money. A band that names ages 58 to 67 at {formatGBP(45000)}, then 68 to 79 at {formatGBP(34000)}, then 80 onwards at {formatGBP(40000)}, says exactly that, including the rise at the end for care. Ages are "Myself" ages.</p>
              <p className="text-xs text-slate-600 leading-relaxed">Bands only override the years they cover. Any year outside every band falls back to the headline living spend, so naming a single expensive stretch is enough; you do not have to describe the whole retirement. Leave the end age blank to run a band to the terminal age. If two bands overlap the earlier one wins for the shared years, and the model says so in the warnings rather than picking silently.</p>
              <p className="text-xs text-slate-500 leading-relaxed">Bands replaced an older pair of percentage "tapers" that could only step spending down at two fixed ages. Any saved plan still carrying tapers is converted to the equivalent bands when it loads, so its projection is unchanged. The safe-spend solver scales the whole shape at once: it finds the multiple of your headline spend that survives, and every band moves with it in proportion.</p>
            </div>

            <div id="doc-risk-profiles" className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-600" /> Asset Allocations, Return Bounds &amp; Volatility (σ)</h2>
              <p className="text-xs text-slate-600 leading-relaxed">Each wrapper is assigned a risk tier carrying an expected real return (treated as the median annual rate), a volatility, and a forecast uncertainty. The first two describe the <em>path</em>; the third describes how sure we are of the average that path is scattered around, and the distinction matters more the longer you plan for. Volatility averages out as σ/√T. Being wrong about the long-run average does not average out at all, so it is drawn once per simulated path and then lived with, giving an annualised spread of √(u² + σ²/T). The built-in tiers set that uncertainty to zero, which is itself a claim — that we know the long-run average and are only unsure of the route — and a published set of capital market assumptions will generally say otherwise.</p>
              <p className="text-xs text-slate-600 leading-relaxed">The 10th and 90th percentile columns beside them are that spread at the two tails: over your horizon the annualised return lands between them eight times in ten. They are there to make the risk figures legible, and they drive no chart. Nothing turns them into a percentile <em>pot</em>, because that leap is the one that fails once withdrawals start. All wrappers move together (one market factor scaled by each tier's σ), so the correlations a published set also carries cannot be used without a second factor; the historical backtest blends real US equity and bond returns by the tier's equity weight ({Object.entries(E.RISK_EQUITY_WEIGHTS).map(([k, v]) => `${k.replace(' Risk', '')} ${Math.round(v * 100)}%`).join(', ')}).</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {Object.entries(activeRiskMatrix).map(([k, v]) => (
                  <div key={k} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1"><span className="font-bold text-slate-800">{k} ({v.label})</span><p className="text-slate-500">Expected real {E.num(v.real, 0).toFixed(2)}% pa, σ = {E.num(v.volatility, 0).toFixed(1)}%.</p></div>
                ))}
              </div>
            </div>

            <div id="doc-one-off-deposits" className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Plus className="w-4 h-4 text-blue-600" /> One-Off Deposits &amp; Multi-Year Staging</h2>
              <p className="text-xs text-slate-600 leading-relaxed">A one-off deposit is a lump sum paid into a chosen wrapper in a chosen year. Because ISAs and pensions are capped each tax year, the engine checks the deposit against that year's remaining allowance before it lands.</p>

              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-1">Where the money comes from</h3>
              <p className="text-xs text-slate-600 leading-relaxed"><strong>External (new capital)</strong> is money arriving from outside the plan (an inheritance, a bonus, a property sale), and nothing is deducted from your existing pots. Choosing any wrapper instead treats it as an internal transfer: the full amount is taken out of that pot in the deposit year. If that pot does not hold enough at the time, the engine moves what is there and the rest is recorded as a shortfall.</p>

              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-1">How much fits this year (headroom)</h3>
              <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                <li><strong>S&amp;S ISA:</strong> {formatGBP(P.isaAllowance)} less whatever your regular ISA contribution is that year.</li>
                <li><strong>Carry forward:</strong> unused annual allowance from the previous three tax years is added to the current year's. Years inside the projection are worked out from your contribution schedule; for the three years before it starts the model has no data, so it assumes nothing unless you enter a figure under Advanced inputs. Carry forward never lifts the earnings limit, so it does nothing for someone with no relevant earnings.</li>
                <li><strong>Pension after flexible access:</strong> taking taxable pension income permanently replaces the allowance with the money purchase annual allowance of {formatGBP(P.mpaaLimit)}, and carry forward is no longer available. Taking only tax-free cash, or buying an annuity, does not trigger it. You do not enter this: the model works out the first year your plan draws taxable pension income and applies it from there.</li>
                <li><strong>Pension:</strong> {formatGBP(P.pensionAllowance)}, but capped at your <em>relevant UK earnings</em>, less your regular pension contribution that year. Only employment and self-employment income counts as earnings; DB pensions, annuities, rent, dividends and interest do not. With no relevant earnings the limit is <strong>{formatGBP(P.pensionNoEarningsLimit)}</strong>, which is what normally applies once you have retired. If you leave your salary blank while still working, the engine treats your earnings as unknown and does not constrain the allowance.</li>
                <li><strong>Other Investments and Cash Savings:</strong> no annual limit, so a deposit there is never staged.</li>
              </ul>
              <p className="text-xs text-slate-600 leading-relaxed">Headroom is therefore not a fixed number. It shrinks in later years if your regular contributions escalate, and it changes again at retirement, when regular contributions stop and the pension earnings test begins to constrain it. The card above the deposits table shows this tax year only. Each deposit row shows the headroom for its own year.</p>

              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-1">If the deposit exceeds the headroom</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Rather than silently breaching the allowance, the deposit is staged across several tax years:</p>
              <ol className="list-decimal pl-5 text-xs text-slate-600 space-y-1">
                <li>As much as fits the current year's allowance goes straight into the target wrapper.</li>
                <li>The surplus is parked in <strong>Other Investments (GIA)</strong>, where it stays invested and grows at that account's risk tier. Once it has grown, moving it out is a disposal, so with CGT switched on each transfer year realises a proportional gain.</li>
                <li>At the start of each following tax year, as much as that year's allowance permits is moved from the GIA into the target wrapper, repeating until nothing is left. You can redirect where the staged money ends up from the row's settings icon.</li>
              </ol>
              <p className="text-xs text-slate-600 leading-relaxed">Where several deposits compete for the same person's allowance in the same year, they are resolved in date order, so one allowance is never counted twice. If a market fall shrinks the parked money, that year's transfer is capped at whatever the GIA actually holds. Anything still parked at the end of the plan stays in Other Investments and is flagged as a warning.</p>

              <p className="text-xs text-slate-500 leading-relaxed"><strong>Assumption:</strong> allowances are held fixed in real terms at the figures in Config ({formatGBP(P.isaAllowance)} ISA, {formatGBP(P.pensionAllowance)} pension, {formatGBP(P.pensionNoEarningsLimit)} with no earnings). Any future increase in these limits is <strong>not</strong> modelled, so a long staging schedule is a cautious estimate. If allowances do rise, the money would move across in fewer years than shown. You can edit the figures in Config to test a different assumption.</p>
            </div>

            <div id="doc-cgt" className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Wallet className="w-4 h-4 text-blue-600" /> Capital Gains Tax on Other Investments (GIA)</h2>
              <p className="text-xs text-slate-600 leading-relaxed">Pensions and ISAs shelter growth, but a general investment account does not. When CGT is switched on in Config, the engine tracks the <strong>cost basis</strong> of each person's GIA and charges tax on gains as they are realised.</p>

              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-1">Growth is not taxed until you sell</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Holding costs nothing. Money paid in is added at cost; growth raises the value without raising the cost, so the unrealised gain builds up untaxed. Tax is only triggered by a disposal: funding your spending, paying a one-off cost, or moving money out under a staged deposit. Each disposal is treated as selling a slice of the whole holding, so the gain is the same proportion of the sale as the unrealised gain is of the pot.</p>
              <p className="text-xs text-slate-600 leading-relaxed">Example: a {formatGBP(100000)} GIA holding {formatGBP(40000)} of gain is 40% gain. Selling {formatGBP(10000)} realises {formatGBP(4000)}; the remaining {formatGBP(3000)} exemption leaves {formatGBP(1000)} taxable, so the bill is {formatGBP(180)} at the basic rate.</p>

              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-1">Rates and allowances</h3>
              <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                <li>Each person has a {formatGBP(P.cgtAnnualExempt)} annual exempt amount. If you have already realised gains this tax year, enter them in Plan Inputs so the current year's exemption is reduced; leaving it blank assumes the full allowance is available.</li>
                <li>Gains stack on top of that year's income: the part falling in your remaining basic-rate band is taxed at {Math.round(P.cgtBasicRate * 100)}%, anything above at {Math.round(P.cgtHigherRate * 100)}%.</li>
                <li>The bill is settled from cash, then the GIA, then ISAs, then an accessible pension. This is the same order used for one-off costs. Selling to pay the bill realises a little more gain, which is carried into the next year, mirroring the fact that CGT is due the January after the tax year.</li>
              </ul>

              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-1">Setting your opening position</h3>
              <p className="text-xs text-slate-600 leading-relaxed">The "of which unrealised gain" figure on the GIA row tells the engine how much of today's balance is profit. Left blank, the balance is treated as entirely cost, so only future growth is ever taxed, which may provide too much weight to GIA. If you hold long-standing investments with a large embedded gain, enter it, or the model will understate your tax.</p>

              <p className="text-xs text-slate-500 leading-relaxed"><strong>Deliberate omissions:</strong> gains are wiped by the uplift on death, so nothing is charged on whatever remains at the terminal age. This is a real reason to spend other wrappers first. Dividends and interest inside the GIA are not modelled separately, share pooling and the 30-day rule are ignored, and the exempt amount and rates are held flat in real terms at the Config figures.</p>
            </div>

            <div id="doc-one-offs" className="bg-surface border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Coins className="w-4 h-4 text-blue-600" /> One-Off Cost Liquidation Hierarchy</h2>
              <p className="text-xs text-slate-600 leading-relaxed">When a one-off capital cost is scheduled, the engine liquidates assets in this order:</p>
              <ol className="list-decimal pl-5 text-xs text-slate-600 space-y-1">
                <li><strong>Cash Savings</strong> (both owners), then <strong>Other Investments (GIA)</strong>, then <strong>Stocks &amp; Shares ISAs</strong>.</li>
                <li><strong>Pensions</strong>, but only for an owner who has reached the access age ({nmpa}). If the cost still cannot be met, the year is flagged as a shortfall, or a pre-SIPP access gap when pension money existed but was locked.</li>
              </ol>
              <p className="text-xs text-slate-500">Known simplifications: state pension is held flat in real terms (no triple-lock uplift), tax thresholds and allowances are held flat in real terms, and the death of a partner is not modelled.</p>
              <p className="text-xs text-slate-500 leading-relaxed"><strong>Pension allowance limitations.</strong> The model assumes you have <strong>not</strong> yet flexibly accessed a pension, because it is built for planning towards retirement rather than for someone already drawing an income. If you have already taken taxable pension income, your annual allowance is already {formatGBP(P.mpaaLimit)} and the projection will overstate how much you can contribute until the year it starts drawing. Carry forward is also worked out independently for each year rather than being consumed as it is used, so several large staged deposits in overlapping years could each count the same unused allowance. Neither the tapered annual allowance for high earners nor annual allowance charges themselves are modelled.</p>
            </div>
          </div>
        )}

      </div>
      <EditMode />
    </div>
  );
}
