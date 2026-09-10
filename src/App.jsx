import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import * as d3 from 'd3';
import {
  TrendingUp, Layers, Check, RotateCcw, Dices, Zap, ShieldCheck, Target, Sliders, Download, Upload, Users, Wallet, Coins,
  Settings, Plus, Trash2, Table, FileSpreadsheet, CheckCircle2, AlertTriangle, Pencil, HelpCircle, BookOpen, History, Bookmark,
  Save, Sparkles, ArrowUpRight, ArrowDownRight, Trophy, Info
} from 'lucide-react';
// ============================================================================================
// Retirement Planning Studio v3.4 — single-file build (engine + UI).
// The engine section is framework-free and unit-tested; the UI section starts at "export default function App".
// ============================================================================================
/* =====================================================================================
   Retirement Planning Studio — projection engine (pure, framework-free, unit-testable)
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

const DEFAULT_RISK_PROFILES = {
  'High Risk': { label: '80–100% Equities', real: 4.44, unlucky: 1.66, lucky: 7.31, nominal: 7.05, volatility: 15.5 },
  'Medium/High Risk': { label: '60–80% Equities', real: 3.72, unlucky: 1.38, lucky: 6.13, nominal: 6.31, volatility: 11.5 },
  'Medium Risk': { label: '40–60% Equities', real: 3.00, unlucky: 1.10, lucky: 4.95, nominal: 5.58, volatility: 8.0 },
  'Medium/Low Risk': { label: '20–40% Equities', real: 2.28, unlucky: 0.82, lucky: 3.77, nominal: 4.84, volatility: 5.5 },
  'Low Risk': { label: 'High interest Cash Savings, Fixed Income, Bonds', real: 1.56, unlucky: 0.54, lucky: 2.59, nominal: 4.10, volatility: 3.0 },
  'Cash Equivalents': { label: 'instant cash savings/money market', real: -0.50, unlucky: -1.00, lucky: 0.00, nominal: 1.99, volatility: 0.5 }
};

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
  // Employee National Insurance (Class 1, 2025/26)
  nicPrimaryThreshold: 12570,
  nicUpperEarningsLimit: 50270,
  nicMainRate: 8,
  nicUpperRate: 2,
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
    taper1Age: '', taper1Rate: '', taper2Age: '', taper2Rate: '',
    drawdownStrategy: 'Phased Drawdown',
    decumulationPolicy: 'Bracket Fill Basic'
  },
  accounts: defaultAccounts(),
  riskProfiles: DEFAULT_RISK_PROFILES,
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
function normalizePlan(raw) {
  const src = isPlainObject(raw) ? raw : {};
  const d = isPlainObject(src.demographics) ? src.demographics : {};
  const s = isPlainObject(src.spending) ? src.spending : {};
  const c = isPlainObject(src.config) ? src.config : {};
  const plan = {
    activeProfileView: ['Combined', 'Myself', 'Partner'].includes(src.activeProfileView) ? src.activeProfileView : 'Combined',
    demographics: { ...BLANK_PLAN.demographics, ...d },
    spending: { ...BLANK_PLAN.spending, ...s },
    accounts: [],
    riskProfiles: {},
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
  // React inputs need strings/numbers, never null/undefined/objects
  const scrub = (obj) => { Object.keys(obj).forEach(k => { const v = obj[k]; if (v === null || v === undefined || typeof v === 'object') obj[k] = ''; }); };
  scrub(plan.demographics); scrub(plan.spending); scrub(plan.config);
  if (typeof plan.config.harvestPersonalAllowance !== 'boolean') plan.config.harvestPersonalAllowance = plan.config.harvestPersonalAllowance === '' ? true : !!plan.config.harvestPersonalAllowance;
  if (!plan.config.valuationDate || isNaN(new Date(plan.config.valuationDate).getTime())) plan.config.valuationDate = todayISO();
  if (plan.demographics.planningMode !== 'single') plan.demographics.planningMode = 'couple';
  if (!DECUMULATION_POLICIES[plan.spending.decumulationPolicy]) plan.spending.decumulationPolicy = 'Bracket Fill Basic';
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
  const erNic = clamp(num(cfg.employerNicRate, DEFAULT_CONFIG.employerNicRate), 0, 99) / 100;
  const erPass = clamp(num(cfg.employerNicPassThrough, DEFAULT_CONFIG.employerNicPassThrough), 0, 100) / 100;
  const pclsProp = clamp(num(cfg.pclsProportion, DEFAULT_CONFIG.pclsProportion), 0, 100) / 100;
  const lsa = Math.max(0, num(cfg.pclsMaxCap, DEFAULT_CONFIG.pclsMaxCap));
  const isaAllowance = Math.max(0, num(cfg.isaAnnualAllowance, DEFAULT_CONFIG.isaAnnualAllowance));
  const pensionAllowance = Math.max(0, num(cfg.pensionAnnualAllowance, DEFAULT_CONFIG.pensionAnnualAllowance));
  const pensionNoEarningsLimit = clamp(num(cfg.pensionNoEarningsLimit, DEFAULT_CONFIG.pensionNoEarningsLimit), 0, pensionAllowance);
  const mpaaLimit = clamp(num(cfg.mpaaLimit, DEFAULT_CONFIG.mpaaLimit), 0, pensionAllowance);
  const cgtEnabled = cfg.cgtEnabled === undefined ? DEFAULT_CONFIG.cgtEnabled : !!cfg.cgtEnabled;
  const cgtAnnualExempt = Math.max(0, num(cfg.cgtAnnualExempt, DEFAULT_CONFIG.cgtAnnualExempt));
  const cgtBasicRate = clamp(num(cfg.cgtBasicRate, DEFAULT_CONFIG.cgtBasicRate), 0, 99) / 100;
  const cgtHigherRate = clamp(num(cfg.cgtHigherRate, DEFAULT_CONFIG.cgtHigherRate), 0, 99) / 100;
  // allowance remaining at a given income
  const paAt = (income) => taperRate > 0 && income > thr ? Math.max(0, pa - (income - thr) * taperRate) : pa;
  const basicWidth = Math.max(0, basicLimit - pa);                 // basic band measured in taxable income
  const higherTop = Math.max(basicWidth, higherLimit - paAt(higherLimit)); // higher band upper limit in taxable income
  const taperEnd = taperRate > 0 ? thr + pa / taperRate : Infinity;
  return { __isParams: true, pa, thr, taperRate, basicLimit, higherLimit, basicRate, higherRate, addRate, nicPT, nicUEL, nicMain, nicUpper, erNic, erPass, pclsProp, lsa, isaAllowance, pensionAllowance, pensionNoEarningsLimit, mpaaLimit, cgtEnabled, cgtAnnualExempt, cgtBasicRate, cgtHigherRate, paAt, basicWidth, higherTop, taperEnd };
}

function incomeTax(gross, cfg) {
  const p = taxParams(cfg);
  const g = Math.max(0, num(gross, 0));
  if (g <= 0) return 0;
  const taxable = Math.max(0, g - p.paAt(g));
  const basic = Math.min(taxable, p.basicWidth);
  const higher = Math.min(Math.max(0, taxable - p.basicWidth), Math.max(0, p.higherTop - p.basicWidth));
  const add = Math.max(0, taxable - p.higherTop);
  return basic * p.basicRate + higher * p.higherRate + add * p.addRate;
}
function calculateUKNetIncome(gross, cfg) { const g = Math.max(0, num(gross, 0)); return g - incomeTax(g, cfg); }
function employeeNIC(gross, cfg) {
  const p = taxParams(cfg);
  const g = Math.max(0, num(gross, 0));
  let nic = 0;
  if (g > p.nicPT) nic += (Math.min(g, p.nicUEL) - p.nicPT) * p.nicMain;
  if (g > p.nicUEL) nic += (g - p.nicUEL) * p.nicUpper;
  return nic;
}
function calculateUKTaxAndNIC(income, cfg) { return incomeTax(income, cfg) + employeeNIC(income, cfg); }

// Income-tax breakpoints (gross income) where the marginal rate changes; used by the analytic solver.
function taxBreakpoints(p) {
  const pts = [p.pa, p.basicLimit, p.thr, p.taperEnd];
  // gross income where taxable income reaches higherTop
  if (p.higherTop >= p.taperEnd - p.paAt(p.taperEnd)) pts.push(p.higherTop + p.paAt(p.higherTop));
  else if (p.higherTop + p.pa <= p.thr) pts.push(p.higherTop + p.pa);
  else pts.push((p.higherTop + p.pa - p.taperRate * p.thr) / (1 + p.taperRate));
  return pts.filter(x => Number.isFinite(x) && x > 0).sort((a, b) => a - b);
}

/*
 * Salary sacrifice economics. `sacrifice` is the gross salary given up; the pension receives the sacrifice
 * plus any employer NIC saving passed through. Net cost is the reduction in take-home pay.
 */
function calculateMarginalRelief(salaryInput, sacrificeInput, cfg) {
  const p = taxParams(cfg);
  const sacrifice = Math.max(0, num(sacrificeInput, 0));
  const passFactor = 1 + p.erNic * p.erPass;
  const assumedRate = p.higherRate + p.nicUpper; // used when salary unknown
  if (sacrifice <= 0) return { netCost: 0, taxSaved: 0, reliefRate: assumedRate * 100, pensionCredit: 0, sacrifice: 0 };
  const salary = num(salaryInput, 0);
  if (salary <= 0) {
    const taxSaved = sacrifice * assumedRate;
    return { netCost: sacrifice - taxSaved, taxSaved, reliefRate: assumedRate * 100, pensionCredit: sacrifice * passFactor, sacrifice, assumed: true };
  }
  const g = Math.min(sacrifice, salary);
  const taxSaved = calculateUKTaxAndNIC(salary, p) - calculateUKTaxAndNIC(salary - g, p);
  return { netCost: g - taxSaved, taxSaved, reliefRate: g > 0 ? (taxSaved / g) * 100 : 0, pensionCredit: g * passFactor, sacrifice: g, capped: g < sacrifice };
}
// Net take-home cost of a pension contribution (the amount landing in the pension, incl. employer pass-through).
function netCostOfPensionContrib(contrib, salaryInput, cfg) {
  const p = taxParams(cfg);
  const passFactor = 1 + p.erNic * p.erPass;
  return calculateMarginalRelief(salaryInput, Math.max(0, num(contrib, 0)) / passFactor, cfg).netCost;
}
// Pension credit obtainable for a given net take-home cost (inverse of the above), capped at maxCredit.
function grossUpNet(netAmount, salaryInput, cfg, maxCredit = Infinity) {
  const net = Math.max(0, num(netAmount, 0));
  if (net <= 0) return 0;
  const p = taxParams(cfg);
  const passFactor = 1 + p.erNic * p.erPass;
  const salary = num(salaryInput, 0);
  let credit;
  if (salary <= 0) {
    credit = (net / Math.max(0.01, 1 - (p.higherRate + p.nicUpper))) * passFactor;
  } else {
    // netCost(sacrifice) is increasing; bisection on sacrifice in [0, salary]
    let lo = 0, hi = salary;
    if (calculateMarginalRelief(salary, hi, p).netCost <= net) credit = hi * passFactor;
    else {
      for (let i = 0; i < 48; i++) {
        const mid = (lo + hi) / 2;
        if (calculateMarginalRelief(salary, mid, p).netCost < net) lo = mid; else hi = mid;
      }
      credit = ((lo + hi) / 2) * passFactor;
    }
  }
  return Math.min(credit, Math.max(0, maxCredit));
}
// Additional pension credit purchasable for `netAmount` on top of an existing `baseCredit` (marginal pricing).
function grossUpNetIncremental(netAmount, salaryInput, cfg, baseCredit = 0, maxAdditional = Infinity) {
  const net = Math.max(0, num(netAmount, 0));
  if (net <= 0 || !(maxAdditional > 0)) return 0;
  const base = Math.max(0, num(baseCredit, 0));
  if (base <= 0) return grossUpNet(net, salaryInput, cfg, maxAdditional);
  const p = taxParams(cfg);
  const passFactor = 1 + p.erNic * p.erPass;
  const salary = num(salaryInput, 0);
  const costBase = netCostOfPensionContrib(base, salaryInput, p);
  const maxTotal = salary > 0 ? Math.min(base + maxAdditional, salary * passFactor) : base + maxAdditional;
  if (maxTotal <= base) return 0;
  if (netCostOfPensionContrib(maxTotal, salaryInput, p) - costBase <= net) return maxTotal - base;
  let lo = base, hi = maxTotal;
  for (let i = 0; i < 48; i++) {
    const mid = (lo + hi) / 2;
    if (netCostOfPensionContrib(mid, salaryInput, p) - costBase < net) lo = mid; else hi = mid;
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
    if (isBlank(v)) { warnings.push(`${label} is blank — using ${fallback}.`); return fallback; }
    const n = clamp(num(v, fallback), lo, hi);
    if (n !== num(v, fallback)) warnings.push(`${label} clamped to ${n}.`);
    return n;
  };
  const ageSelf0 = req('Current age (Myself)', d.currentAgeSelf, 40, 0, 120);
  const agePart0 = isCouple ? req('Current age (Partner)', d.currentAgePart, ageSelf0, 0, 120) : 0;
  const retireSelf = req('Retirement age (Myself)', d.retireAgeSelf, 60, 0, 120);
  const retirePart = isCouple ? req('Retirement age (Partner)', d.retireAgePart, 60, 0, 120) : 999;
  let terminalAge = clamp(num(d.terminalAge, 100), 1, 120);
  if (terminalAge <= ageSelf0) { warnings.push(`Terminal age (${terminalAge}) must exceed current age — using ${ageSelf0 + 1}.`); terminalAge = ageSelf0 + 1; }
  const nmpa = clamp(num(d.privatePensionAge, 58), 0, 120);
  const spa = clamp(num(d.statePensionAge, 68), 0, 120);
  const targetSpend = Math.max(0, num(s.targetSpend, 0));
  if (targetSpend <= 0) warnings.push('Net living spend is blank or zero — no retirement spending is being modelled.');
  const totalYears = Math.max(1, Math.round(terminalAge - ageSelf0));
  const valuationDate = c.valuationDate || todayISO();
  const yf = calculateYearFraction(valuationDate);
  const baseYear = parseInt(String(valuationDate).slice(0, 4)) || new Date().getFullYear();

  const riskOf = (key) => plan.riskProfiles[key] || DEFAULT_RISK_PROFILES['High Risk'];
  const accounts = plan.accounts.filter(a => isCouple || a.owner === 'Myself').map(a => {
    const prof = riskOf(a.risk);
    const [cat, owner] = a.id.split('_');
    return {
      id: a.id, cat, owner, ownerLabel: a.owner,
      balance: Math.max(0, num(a.balance, 0)),
      // embedded gain in today's GIA balance; blank means the balance is treated as all cost
      unrealisedGain: clamp(num(a.unrealisedGain, 0), 0, Math.max(0, num(a.balance, 0))),
      contrib: Math.max(0, num(a.contrib, 0)),
      growth: clamp(num(a.growth, 0), -100, 100) / 100,
      contribByYear: Array.isArray(a.contribByYear) ? a.contribByYear.map(v => Math.max(0, num(v, 0))) : null,
      risk: a.risk,
      real: clamp(num(prof.real, 0), -50, 50) / 100,
      lucky: clamp(num(prof.lucky, 0), -50, 50) / 100,
      unlucky: clamp(num(prof.unlucky, 0), -50, 50) / 100,
      vol: clamp(num(prof.volatility, 12), 0, 100) / 100,
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
    if (pen && pen.contrib > P.pensionAllowance) warnings.push(`${o.label}: pension contribution £${Math.round(pen.contrib).toLocaleString()} exceeds the annual allowance £${P.pensionAllowance.toLocaleString()}.`);
    if (isa && isa.contrib > P.isaAllowance) warnings.push(`${o.label}: ISA contribution £${Math.round(isa.contrib).toLocaleString()} exceeds the ISA allowance £${P.isaAllowance.toLocaleString()}.`);
    if (o.salary > 0 && pen && pen.contrib > o.salary) warnings.push(`${o.label}: pension contribution exceeds salary.`);
    const gia = acc[o.ids.other];
    if (P.cgtEnabled && gia && gia.balance > 0 && isBlank(plan.accounts.find(a => a.id === o.ids.other)?.unrealisedGain)) {
      warnings.push(`${o.label}: no unrealised gain entered for Other Investments, so the £${Math.round(gia.balance).toLocaleString()} balance is treated as all cost and only future growth is taxed. Set it under Advanced inputs if the holding has an embedded gain.`);
    }
    // the plan draws taxable pension income while still paying in, so the MPAA bites and the excess
    // would face an annual allowance charge (which the model does not itself levy)
    if (Number.isFinite(o.mpaaAge) && pen && pen.contrib > P.mpaaLimit && o.mpaaAge < o.retireAge) {
      warnings.push(`${o.label}: the plan draws taxable pension income from age ${o.mpaaAge} while still contributing £${Math.round(pen.contrib).toLocaleString()}/yr, which permanently cuts the annual allowance to £${P.mpaaLimit.toLocaleString()} (the money purchase annual allowance). Contributions above that would face an annual allowance charge.`);
    }
    if (o.retireAge < o.age0 && o.age0 < 120) { /* already retired: fine */ }
  });
  if (isCouple) {
    const firstRetire = Math.min(...owners.map(o => o.retireAge));
    const stillWorking = owners.filter(o => o.retireAge > firstRetire && o.salary <= 0);
    if (stillWorking.length) warnings.push(`${stillWorking.map(w => w.label).join(', ')} keeps working after the first retirement but has no salary entered — the full joint spend will be drawn from the portfolio in those years.`);
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
  const policy = DECUMULATION_POLICIES[s.decumulationPolicy] || DECUMULATION_POLICIES['Bracket Fill Basic'];
  const ctx = {
    plan, warnings, isCouple, P, owners, accounts, acc,
    ageSelf0, agePart0, terminalAge, totalYears, nmpa, spa, targetSpend,
    taper1Age: num(s.taper1Age, 0), taper1Rate: clamp(num(s.taper1Rate, 0), 0, 100) / 100,
    taper2Age: num(s.taper2Age, 0), taper2Rate: clamp(num(s.taper2Rate, 0), 0, 100) / 100,
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

// Living-cost target at a given age of "Myself" (tapers compound, as documented).
function spendTargetAtAge(ctx, ageSelf) {
  let sp = ctx.targetSpend;
  if (ctx.taper1Age > 0 && ageSelf >= ctx.taper1Age && ctx.taper1Rate > 0) sp *= (1 - ctx.taper1Rate);
  if (ctx.taper2Age > 0 && ageSelf >= ctx.taper2Age && ctx.taper2Rate > 0) sp *= (1 - ctx.taper2Rate);
  return sp;
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
 * market: 'expected' | 'lucky' | 'unlucky' | { historical: true, startYear } | { z: number }
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
      const sacrifice = Math.min(o.salary, penContrib / (1 + P.erNic * P.erPass));
      const takeHome = o.salary - sacrifice - calculateUKTaxAndNIC(o.salary - sacrifice, P);
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
      else if (step === 'penBasic') pensionTier(() => P.basicLimit);
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
      const basicRoom = Math.max(0, P.basicWidth - taxableIncome);
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
    if (market === 'lucky') g = a.lucky;
    else if (market === 'unlucky') g = a.unlucky;
    else if (isHistorical) g = (histPoint && !a.isCash) ? (a.equityWeight * histPoint.s + (1 - a.equityWeight) * histPoint.b) / 100 : a.real;
    else if (typeof market === 'object' && market !== null && market.z !== undefined) {
      // log-return with median equal to the stated expected (geometric) real return
      g = Math.exp(Math.log(1 + a.real) + a.vol * market.z) - 1;
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
function runTrial(ctx, zs, spendOverride = null) {
  const state = freshState(ctx);
  let failed = false, failAge = null, preNmpaFailed = false, minPot = Infinity, lifetimeTax = 0;
  let terminalRow = null;
  for (let t = 0; t <= ctx.totalYears; t++) {
    const row = stepYear(ctx, state, t, { z: zs[t] }, spendOverride);
    lifetimeTax += row.taxPaid + (row.cgtPaid || 0);
    if (row.totalCombined < minPot) minPot = row.totalCombined;
    if (!failed && (row.unmetDemand > FAIL_TOLERANCE || row.preNmpaInsolvent)) {
      failed = true; failAge = row.ageSelf; preNmpaFailed = row.preNmpaInsolvent || !ctx.owners.some(o => (o.key === 'self' ? row.ageSelf : row.agePart) >= ctx.nmpa);
    }
    terminalRow = row;
  }
  const terminalPot = Math.max(0, terminalRow.totalCombined);
  if (!failed && ctx.solvencyFloor > 0 && terminalPot < ctx.solvencyFloor) { failed = true; failAge = terminalRow.ageSelf; }
  const terminalPotNet = Math.max(0, terminalPot - Math.max(0, terminalRow.pensions) * ctx.pensionDeathTaxRate);
  return { survived: !failed, failAge, preNmpaFailed, terminalPot, terminalPotNet, minPot, lifetimeTax };
}

function pathsForSeed(seed, trials, years) {
  const out = new Array(trials);
  for (let i = 0; i < trials; i++) out[i] = gaussianPath((seed + i * 7919) >>> 0, years + 1);
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
  return {
    trials: n,
    successRate,
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
function monteCarlo(planOrCtx, { trials = 5000, seed = 12345, spendOverride = null } = {}) {
  const ctx = planOrCtx && planOrCtx.P ? planOrCtx : buildContext(planOrCtx);
  const paths = pathsForSeed(seed, trials, ctx.totalYears);
  const results = paths.map(zs => runTrial(ctx, zs, spendOverride));
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
  if (rateAt(0) < targetRate) return { spend: 0, ...monteCarlo(ctx, { trials: finalTrials, seed: seed + 1, spendOverride: 0 }), note: 'Even zero spending fails the target (pre-access gap or one-off costs).' };
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
 * Pre-access bridge: years in which the household draws on the portfolio but nobody can touch a pension.
 * Conservative: 0% real growth on liquid assets, spending net of guaranteed income (and a working partner's take-home).
 */
function bridgeRequirement(ctx) {
  const rows = simulateDeterministic(ctx, 'expected');
  let years = 0, needed = 0;
  for (const r of rows) {
    const anyAccess = ctx.owners.some(o => (o.key === 'self' ? r.ageSelf : r.agePart) >= ctx.nmpa);
    if (anyAccess) break;
    if (r.targetSpend > 0) { years++; needed += r.netDrawdown; }
  }
  return { gapYears: years, netNeeded: needed };
}

// Regular-contribution amount for account `a` in projection-year index t (post-escalation, or a phased schedule).
function contribAtYear(a, t) {
  return a.contribByYear ? (a.contribByYear[t] || 0) : a.contrib * Math.pow(1 + a.growth, t);
}

// Relevant UK earnings for pension purposes in projection-year t: salary while still working, plus any
// earnings-type income streams active at that age. Pension income, annuities and rent do not count.
function relevantEarningsAtYear(ctx, o, t) {
  const age = o.age0 + t;
  const salary = age < o.retireAge ? o.salary : 0;
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
    total += Math.max(0, P.pensionAllowance - contributed);
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
  const allowance = mpaa ? P.mpaaLimit : P.pensionAllowance + carryForwardAtYear(ctx, o, t);
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
  const passFactor = 1 + P.erNic * P.erPass;
  const capOf = (o) => Math.min(
    mpaaAppliesAtYear(P, o, 0) ? P.mpaaLimit : P.pensionAllowance,
    o.salary > 0 ? o.salary * passFactor : P.pensionAllowance
  );
  let penNetRemaining = penNet;
  const order = owners.map((o, i) => i).sort((a, b) => penW[b] - penW[a]);
  // price every top-up at the owner's marginal rate given what is already going into that pension
  const allocate = (i, netAmt) => {
    if (netAmt <= 0) return 0;
    const o = owners[i];
    const cap = Math.max(0, capOf(o) - penGross[i]);
    if (cap <= 0) return 0;
    const credit = grossUpNetIncremental(netAmt, o.salary, P, penGross[i], cap);
    if (credit <= 0) return 0;
    penGross[i] += credit;
    const total = netCostOfPensionContrib(penGross[i], o.salary, P);
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
        const excessNet = penNetUsed[i] - netCostOfPensionContrib(penFloorGross[i], o.salary, P);
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

// Evaluate the Survival Maximizer's candidate grid and return the winner as a fully-formed strategy.
function resolveSurvivalMaximizer(strategy, { trials = 400, seed = 12345, preAccessCap = Infinity, onCandidate = null } = {}) {
  const evaluated = strategy.candidates.map((c, i) => {
    const stats = monteCarlo(c.planState, { trials, seed });
    if (onCandidate) onCandidate(i, strategy.candidates.length, c.share, stats);
    return { ...c, stats };
  });
  const best = pickBest(evaluated, 0.5, preAccessCap);
  return {
    ...strategy,
    chosenShare: best.share,
    searchResults: evaluated.map(e => ({ share: e.share, successRate: e.stats.successRate, preAccess: e.stats.preNmpaFailRate, p10: e.stats.p10Terminal, median: e.stats.medianTerminal })),
    isaContrib: best.alloc.isaContrib, penContrib: best.alloc.penContrib, giaContrib: best.alloc.giaContrib, taxReliefSaved: best.alloc.taxReliefSaved,
    planState: best.planState,
    description: `Searched every ISA/pension split of the same budget; best survival at ${Math.round(best.share * 100)}% ISA / ${Math.round((1 - best.share) * 100)}% pension (net budget).`
  };
}

/*
 * Strategy tournament — builds the six players. Every player invests the same net take-home budget.
 *   1 Current Plan            : as entered
 *   2 Survival Maximizer      : grid search over the ISA share (evaluated by the caller with common random numbers)
 *   3 Liquidity-First         : fill ISA allowances first, remainder to pension
 *   4 Relief-First            : pension first (subject to the pre-access bridge minimum), + Bed & SIPP in full scope
 *   5 Bracket-Smoothed Sizing : pension sized so retirement withdrawals + state pension stay inside the basic band
 *   6 Relief-First, Bridge-Last: pension-max early, switch to ISA-max for the final years to build the bridge
 */
function buildTournament(rawPlan, { emergencyFloor = 25000, scope = 'contributions', netBudgetOverride = null, balance = 'proportional' } = {}) {
  const ctx = buildContext(rawPlan);
  const plan = ctx.plan;
  const { P, owners, acc } = ctx;
  const cfg = plan.config;
  const margin = 1 + clamp(num(cfg.bridgeSafetyMargin, 30), 0, 500) / 100;

  const currentPen = owners.map(o => acc[o.ids.pen] ? acc[o.ids.pen].contrib : 0);
  const currentIsa = owners.map(o => acc[o.ids.isa] ? acc[o.ids.isa].contrib : 0);
  const currentPenNet = owners.reduce((s, o, i) => s + netCostOfPensionContrib(currentPen[i], o.salary, cfg), 0);
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
    return { share, alloc, planState: applyAllocationToPlan(plan, ctx, alloc) };
  });
  strategies.push({
    id: 'survival', name: 'Survival Maximizer',
    description: 'Searches every ISA/pension split of the same budget (0%–100% in 10% steps) and keeps the split with the highest survival rate, tie-broken by the 10th-percentile pot.',
    candidates: grid, isaContrib: null, penContrib: null, taxReliefSaved: null, transferNet: 0, transferGross: 0, planState: null
  });
  // 3 liquidity-first
  strategies.push(mk('liquidity', 'Liquidity-First', 'Fills ISA allowances first for maximum penalty-free, tax-free access; only the remainder goes to pension.',
    allocateBudget(ctx, netBudget, 1.0, { balance })));
  // 4 relief-first (+ bed & SIPP)
  {
    const alloc = allocateBudget(ctx, netBudget, 0, { isaMin: annualIsaNeeded, balance });
    let transfer = null, reliefExtra = 0;
    if (scope === 'full' && bridge.gapYears === 0) {
      // Bed & SIPP: a one-off personal contribution funded from spare ISA capital. Relief at source adds the basic
      // rate inside the pension; any higher/additional-rate relief is reclaimed as cash (no NIC saving on this route).
      const spare = Math.max(0, liquidToday - emergencyFloor);
      const o = owners[0];
      const isaSelfBal = acc[o.ids.isa] ? acc[o.ids.isa].balance : 0;
      const aaRoom = Math.max(0, Math.min(P.pensionAllowance, o.salary > 0 ? o.salary : P.pensionAllowance) - alloc.penByOwner[0]);
      const gross = Math.min(aaRoom, spare / (1 - P.basicRate), isaSelfBal / (1 - P.basicRate));
      if (gross > 250) {
        const net = gross * (1 - P.basicRate);
        const reliefTotal = o.salary > 0 ? incomeTax(o.salary, P) - incomeTax(Math.max(0, o.salary - gross), P) : gross * P.higherRate;
        const refund = Math.max(0, reliefTotal - gross * P.basicRate);
        transfer = { net, gross, refund, fromId: o.ids.isa, toId: o.ids.pen, refundId: o.ids.cash };
        reliefExtra = gross - net + refund;
      }
    }
    strategies.push(mk('relief', 'Relief-First' + (transfer ? ' + Bed & SIPP' : ''),
      'Routes the budget to pension first (subject to the pre-access bridge minimum) to capture maximum upfront tax and NIC relief' + (transfer ? '; also moves spare ISA capital into the pension.' : '.'),
      alloc, { transferNet: transfer ? Math.round(transfer.net) : 0, transferGross: transfer ? Math.round(transfer.gross) : 0, taxReliefSaved: alloc.taxReliefSaved + reliefExtra, planOpts: { transfer } }));
  }
  // 5 bracket-smoothed pension sizing
  {
    const penFloor = owners.map(o => {
      const a = acc[o.ids.pen]; if (!a) return 0;
      const accessAge = Math.max(o.retireAge, ctx.nmpa);
      const drawYears = Math.max(1, ctx.terminalAge - accessAge);
      const guaranteedTaxable = o.statePension + ctx.otherIncomes.filter(i => i.owner === o.key && !i.taxFree).reduce((s, i) => s + i.amount, 0);
      const taxableRoom = Math.max(0, P.basicLimit - guaranteedTaxable);
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
        ? `Pension-max for ${yearsToFirstRetire - switchYears} years so the tax uplift compounds longest, then ISA-max for the final ${switchYears} years to build the pre-access bridge.`
        : bridge.gapYears > 0
          ? 'Existing liquid assets already cover the bridge reserve, so this collapses to Relief-First (shown for completeness).'
          : 'No pre-access gap, so this collapses to Relief-First (shown for completeness).',
      blended, { phase: { switchYears, yearsToFirstRetire, early: reliefAlloc, late: isaAlloc }, planOpts: { contribByYear } }));
  }
  return { ctx, meta, strategies };
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
  top.sort((a, b) => (b.stats.p10Terminal - a.stats.p10Terminal) || (b.stats.medianTerminal - a.stats.medianTerminal));
  return top[0];
}

// Namespace used by the UI (mirrors the modular engine.js exports)
const E = { num, clamp, isBlank, round250, HISTORICAL_DATA, HISTORICAL_FIRST_YEAR, HISTORICAL_LAST_YEAR, getHistoricalPoint, RISK_EQUITY_WEIGHTS, DEFAULT_RISK_PROFILES, OWNERS, OWNER_LABEL, CATEGORIES, CATEGORY_LABEL, accountId, DEFAULT_CONFIG, BLANK_PLAN, DECUMULATION_POLICIES, todayISO, calculateYearFraction, normalizePlan, taxParams, incomeTax, calculateUKNetIncome, employeeNIC, calculateUKTaxAndNIC, calculateMarginalRelief, netCostOfPensionContrib, grossUpNet, grossUpNetIncremental, grossPensionNeededForNet, mulberry32, gaussianPath, buildContext, spendTargetAtAge, freshState, stepYear, simulateDeterministic, simulateHistorical, FAIL_TOLERANCE, evaluateRows, runTrial, pathsForSeed, summarizeTrials, monteCarlo, optimizeSpend, annuityFactor, fvContribStream, bridgeRequirement, contribAtYear, relevantEarningsAtYear, mpaaAppliesAtYear, carryForwardAtYear, resolveMpaa, wrapperHeadroomAtYear, INCOME_TYPES, incomeTypeOf, allocateBudget, applyAllocationToPlan, resolveSurvivalMaximizer, buildTournament, pickBest };
export { HISTORICAL_DATA, RISK_EQUITY_WEIGHTS, getHistoricalPoint, DEFAULT_RISK_PROFILES, calculateUKTaxAndNIC, calculateMarginalRelief, grossUpNet, normalizePlan, buildContext, simulateDeterministic, simulateHistorical, monteCarlo, optimizeSpend, buildTournament };


const STORAGE_KEY = 'rp_plan_full_v28';          // unchanged: old saved plans are migrated by normalizePlan
const SCENARIOS_STORAGE_KEY = 'rp_saved_scenarios_v3';
const APP_VERSION = 'v3.4';
const MC_TRIALS = 5000;
const TOURNAMENT_TRIALS = 1500;
const SEARCH_TRIALS = 400;

const SERIES_CONFIG = [
  { id: 'lucky', label: 'Lucky (90th %ile)', color: '#059669', strokeWidth: 2.5, dash: 'none', defaultActive: true },
  { id: 'expected', label: 'Expected (Real)', color: '#2563eb', strokeWidth: 3, dash: 'none', defaultActive: true },
  { id: 'unlucky', label: 'Unlucky (10th %ile)', color: '#dc2626', strokeWidth: 2.5, dash: '5,4', defaultActive: true },
  { id: 'nominal', label: 'Combined (Nominal)', color: '#7c3aed', strokeWidth: 2, dash: '4,3', defaultActive: false },
  { id: 'pensions', label: 'Combined Pensions', color: '#0284c7', strokeWidth: 2, dash: 'none', defaultActive: true },
  { id: 'isas', label: 'Combined ISAs', color: '#0d9488', strokeWidth: 2, dash: 'none', defaultActive: true },
  { id: 'other', label: 'Combined Other', color: '#d97706', strokeWidth: 1.5, dash: 'none', defaultActive: false },
  { id: 'cash', label: 'Combined Cash', color: '#475569', strokeWidth: 1.5, dash: '3,3', defaultActive: false }
];

const HISTORICAL_PRESETS = [
  { label: '1929 Crash (Great Depression)', year: 1929 },
  { label: '1945 Post-War', year: 1945 },
  { label: '1955 Mid-Century', year: 1955 },
  { label: '1965 Stagflation', year: 1965 },
  { label: '1973 Oil Shock', year: 1973 },
  { label: '2000 Dot-Com Bust', year: 2000 },
  { label: '2008 Global Financial Crisis', year: 2008 }
];

const formatGBP = (v) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(Number.isFinite(v) ? v : 0);
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
async function runMonteCarloAsync(ctx, { trials, seed, spendOverride = null, onProgress }) {
  const paths = E.pathsForSeed(seed, trials, ctx.totalYears);
  const results = [];
  const CHUNK = 250;
  for (let i = 0; i < trials; i += CHUNK) {
    const end = Math.min(trials, i + CHUNK);
    for (let j = i; j < end; j++) results.push(E.runTrial(ctx, paths[j], spendOverride));
    if (onProgress) onProgress(results.length / trials);
    await tick();
  }
  return { ...E.summarizeTrials(results), spend: spendOverride !== null ? spendOverride : ctx.targetSpend };
}

const inputCls = 'w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none';
const smallInputCls = 'w-full p-2 bg-slate-50 border border-slate-300 rounded font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none';

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
function WrapperStrategyTournament({ plan, ctx, seed, onApplyStrategyToSandbox, onNavigateDocs }) {
  const P = ctx.P;
  const isCouple = ctx.isCouple;
  const [scope, setScope] = useState('contributions');
  const [emergencyFloor, setEmergencyFloor] = useState(25000);
  const [budgetOverride, setBudgetOverride] = useState('');
  const [balance, setBalance] = useState('proportional');
  const [preAccessCap, setPreAccessCap] = useState(5);
  const [results, setResults] = useState(null);
  const [progress, setProgress] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const cancelRef = useRef(false);

  const preview = useMemo(() => {
    try { return E.buildTournament(E.resolveMpaa(plan), { emergencyFloor: E.num(emergencyFloor, 0), scope, netBudgetOverride: budgetOverride === '' ? null : budgetOverride, balance }); }
    catch (e) { return null; }
  }, [plan, emergencyFloor, scope, budgetOverride, balance]);
  const meta = preview?.meta;
  const salaryMissing = ctx.owners.filter(o => o.salary <= 0).map(o => o.label);

  const handleRun = async () => {
    if (!preview) return;
    setIsEvaluating(true); setResults(null); cancelRef.current = false;
    const total = preview.strategies.length;
    const out = [];
    try {
      for (let i = 0; i < total; i++) {
        let s = preview.strategies[i];
        if (s.id === 'survival') {
          setProgress({ label: `Player ${i + 1}/${total}: searching ISA/pension splits…`, value: i / total });
          const evaluated = [];
          for (let k = 0; k < s.candidates.length; k++) {
            const c = s.candidates[k];
            const stats = E.monteCarlo(c.planState, { trials: SEARCH_TRIALS, seed });
            evaluated.push({ ...c, stats });
            setProgress({ label: `Player ${i + 1}/${total}: split ${Math.round(c.share * 100)}% ISA → ${stats.successRate.toFixed(1)}% safe`, value: (i + (k + 1) / s.candidates.length * 0.6) / total });
            await tick();
          }
          const best = E.pickBest(evaluated, 0.5, preAccessCap === 'any' ? Infinity : Number(preAccessCap));
          s = {
            ...s, chosenShare: best.share,
            searchResults: evaluated.map(e => ({ share: e.share, successRate: e.stats.successRate, preAccess: e.stats.preNmpaFailRate, p10: e.stats.p10Terminal, median: e.stats.medianTerminal })),
            isaContrib: best.alloc.isaContrib, penContrib: best.alloc.penContrib, giaContrib: best.alloc.giaContrib, taxReliefSaved: best.alloc.taxReliefSaved, planState: best.planState,
            description: `Searched every ISA/pension split of the same budget; best survival at ${Math.round(best.share * 100)}% ISA / ${Math.round((1 - best.share) * 100)}% pension (bridge-risk cap ${preAccessCap === 'any' ? 'none' : preAccessCap + '%'}).`
          };
        }
        setProgress({ label: `Player ${i + 1}/${total}: ${s.name} — ${TOURNAMENT_TRIALS.toLocaleString()} paths`, value: (i + 0.6) / total });
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

  const se = results && results.players.length ? results.players[0].stats.standardError : 0;

  return (
    <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-600 fill-indigo-600" /> Automated Strategy Tournament &amp; Optimizer
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Six wrapper strategies with the same take-home budget, each tested on the same {TOURNAMENT_TRIALS.toLocaleString()} market paths (common random numbers) so differences are real, not noise.
          </p>
        </div>
        <button type="button" onClick={onNavigateDocs} className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto">
          <HelpCircle className="w-3.5 h-3.5" /> Tournament methodology &amp; players &rarr;
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-xs font-sans p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div>
          <label className="text-slate-700 font-semibold block mb-1">Annual take-home budget (£ net)</label>
          <input type="number" min="0" step="250" value={budgetOverride} placeholder={meta ? `${Math.round(meta.derivedBudget).toLocaleString()} (from plan)` : ''} onChange={(e) => setBudgetOverride(e.target.value)}
            className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none" />
          <span className="text-[10px] text-slate-500 block mt-1">Derived from current ISA + net cost of pension contributions{salaryMissing.length ? ` (salary missing for ${salaryMissing.join(', ')} — ${Math.round((P.higherRate + P.nicUpper) * 100)}% relief assumed)` : ''}.</span>
        </div>
        <div>
          <label className="text-slate-700 font-semibold block mb-1">Optimization scope</label>
          <select value={scope} onChange={(e) => setScope(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer">
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
        </div>
        <div>
          <label className="text-slate-700 font-semibold block mb-1">Bridge-risk cap (Survival Maximizer)</label>
          <select value={preAccessCap} onChange={(e) => setPreAccessCap(e.target.value === 'any' ? 'any' : Number(e.target.value))} className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer">
            <option value={0}>0% pre-access failures</option>
            <option value={2}>≤ 2%</option>
            <option value={5}>≤ 5%</option>
            <option value={10}>≤ 10%</option>
            <option value="any">No cap (total survival only)</option>
          </select>
        </div>
        <div>
          <label className="text-slate-700 font-semibold block mb-1">Owner split of new money</label>
          <select value={balance} disabled={!isCouple} onChange={(e) => setBalance(e.target.value)} className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer disabled:opacity-50">
            <option value="proportional">Keep current Myself/Partner ratio</option>
            <option value="balanced">Balance pensions between partners</option>
          </select>
        </div>
      </div>

      {meta && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px] font-mono">
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl"><span className="text-slate-500 font-sans block">Net budget tested</span><strong>£{Math.round(meta.netBudget).toLocaleString()}/yr</strong></div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl"><span className="text-slate-500 font-sans block">Pre-access gap</span><strong>{meta.bridge.gapYears} yr{meta.bridge.gapYears === 1 ? '' : 's'}</strong></div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl"><span className="text-slate-500 font-sans block">Bridge reserve target (+{Math.round(E.num(plan?.config?.bridgeSafetyMargin, 30))}%)</span><strong>{fmtK(meta.bridgeCapital)}</strong></div>
          <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl"><span className="text-slate-500 font-sans block">Liquid today above buffer</span><strong>{fmtK(Math.max(0, meta.liquidToday - E.num(emergencyFloor, 0)))}</strong></div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        {progress ? <div className="flex-1"><ProgressBar value={progress.value} label={progress.label} /></div> : <span className="text-[11px] text-slate-400">Seed {seed} — change it in Config to test a different set of market paths.</span>}
        <button type="button" onClick={handleRun} disabled={isEvaluating || !preview || (meta && meta.netBudget <= 0)}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
          <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
          {isEvaluating ? 'Evaluating…' : '⚡ Run Strategy Tournament'}
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
              return (
                <div key={res.id} className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${isBest ? 'bg-emerald-50/60 border-emerald-300 shadow-sm' : res.id === 'baseline' ? 'bg-slate-50 border-slate-200' : 'bg-white border-indigo-100 shadow-xs'}`}>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-900 leading-tight flex items-center gap-1">{isBest && <Trophy className="w-3.5 h-3.5 text-emerald-600" />}{res.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${st.successRate >= 90 ? 'bg-emerald-100 text-emerald-800' : st.successRate >= 75 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'}`}>{st.successRate.toFixed(1)}% Safe</span>
                    </div>
                    <p className="text-[11px] text-slate-500 leading-normal">{res.description}</p>
                    <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] font-mono">
                      <div className="flex justify-between"><span className="text-slate-500">S&amp;S ISA:</span><strong className="text-teal-700">£{Math.round(res.isaContrib || 0).toLocaleString()}/yr{res.phase && res.phase.switchYears > 0 ? ' avg' : ''}</strong></div>
                      <div className="flex justify-between"><span className="text-slate-500">Pension:</span><strong className="text-blue-700">£{Math.round(res.penContrib || 0).toLocaleString()}/yr{res.phase && res.phase.switchYears > 0 ? ' avg' : ''}</strong></div>
                      {res.giaContrib > 0 && <div className="flex justify-between"><span className="text-slate-500">GIA overflow:</span><strong className="text-amber-700">£{Math.round(res.giaContrib).toLocaleString()}/yr</strong></div>}
                      {res.taxReliefSaved > 0 && <div className="flex justify-between text-emerald-700 font-bold"><span className="font-sans">Tax &amp; NIC relief:</span><span>+£{Math.round(res.taxReliefSaved).toLocaleString()}/yr</span></div>}
                      {res.transferNet > 0 && <div className="flex justify-between text-indigo-700 font-bold"><span>Bed &amp; SIPP:</span><span>£{Math.round(res.transferNet).toLocaleString()} &rarr; £{Math.round(res.transferGross).toLocaleString()}</span></div>}
                      {res.phase && res.phase.switchYears > 0 && <div className="flex justify-between text-slate-600"><span className="font-sans">Phasing:</span><span>pension-max {res.phase.yearsToFirstRetire - res.phase.switchYears}y → ISA-max {res.phase.switchYears}y</span></div>}
                      <div className="flex justify-between pt-1 border-t border-slate-100"><span className="text-slate-500 font-sans">Median pot @ {ctx.terminalAge}:</span><span className="font-bold text-slate-800">{fmtK(st.medianTerminal)}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-sans">10th %ile pot:</span><span className="font-bold text-slate-800">{fmtK(st.p10Terminal)}</span></div>
                      {ctx.pensionDeathTaxRate > 0 && <div className="flex justify-between"><span className="text-slate-500 font-sans">Median pot net of pension death tax:</span><span className="font-bold text-slate-800">{fmtK(st.medianTerminalNet)}</span></div>}
                      <div className="flex justify-between"><span className="text-slate-500 font-sans">Median failure age:</span><span className={`font-bold ${st.preNmpaFailRate > 5 ? 'text-rose-600' : 'text-slate-700'}`}>{st.medianFailAge ? `Age ${st.medianFailAge}` : 'None'}</span></div>
                      <div className="flex justify-between"><span className="text-slate-500 font-sans">Pre-access (bridge) failures:</span><span className={`font-bold ${st.preNmpaFailRate > 5 ? 'text-rose-600' : 'text-slate-700'}`}>{st.preNmpaFailRate.toFixed(1)}%</span></div>
                    </div>
                    {res.searchResults && (
                      <details className="text-[10px] text-slate-500">
                        <summary className="cursor-pointer font-semibold">Search results by ISA share</summary>
                        <div className="grid grid-cols-4 gap-x-2 mt-1 font-mono">
                          {res.searchResults.map(r => <React.Fragment key={r.share}><span>{Math.round(r.share * 100)}%</span><span>{r.successRate.toFixed(1)}%</span><span>{r.preAccess.toFixed(1)}% pre</span><span>{fmtK(r.p10)}</span></React.Fragment>)}
                        </div>
                      </details>
                    )}
                  </div>
                  {res.id !== 'baseline' && (
                    <button type="button" onClick={() => onApplyStrategyToSandbox(res)} className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer">Apply to Sandbox</button>
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
  const [activeTab, setActiveTab] = useState('trajectory');
  const [isEditingRisk, setIsEditingRisk] = useState(false);
  const [selectedHistoricalYear, setSelectedHistoricalYear] = useState(1965);
  const [mcSeed, setMcSeed] = useState(12345);

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

  const [targetConfidence, setTargetConfidence] = useState(90);
  const [simResult, setSimResult] = useState(null);
  const [simProgress, setSimProgress] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
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
    const lucky = E.simulateDeterministic(ctx, 'lucky');
    const unlucky = E.simulateDeterministic(ctx, 'unlucky');
    return exp.map((r, i) => ({ ...r, lucky: lucky[i].totalCombined, unlucky: unlucky[i].totalCombined, nominal: r.totalCombined * Math.pow(1 + ctx.inflation, r.t) }));
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
    return { ...ev, startVal: historicalTimeline[0]?.totalCombined || 0, terminalVal: ev.terminalPot, minVal: ev.minPot, startHistoricalYear: activeHistoricalStartYear, beyondData: historicalTimeline.some(r => r.histYear === null) };
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
    visibleData.forEach(d => { if (activeSeries.lucky && d.lucky > max) max = d.lucky; if (activeSeries.expected && d.expected > max) max = d.expected; if (activeSeries.nominal && d.nominal > max) max = d.nominal; });
    if (isSandboxModified) sandboxTimeline.forEach(d => { if (d.ageSelf <= effectiveMaxVisibleAge && d.totalCombined > max) max = d.totalCombined; });
    return Math.max(max * 1.08, 100000);
  }, [visibleData, activeSeries, isSandboxModified, sandboxTimeline, effectiveMaxVisibleAge]);
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
  const histXScale = useMemo(() => d3.scaleLinear().domain([currentAge, Math.max(currentAge + 1, terminalAge)]).range([0, innerWidth]), [currentAge, terminalAge, innerWidth]);
  const histMaxY = useMemo(() => Math.max(Math.max(0, ...historicalTimeline.map(d => d.totalCombined)) * 1.12, 100000), [historicalTimeline]);
  const histYScale = useMemo(() => d3.scaleLinear().domain([0, histMaxY]).range([innerHeight, 0]).nice(), [histMaxY, innerHeight]);
  const histLinePath = useMemo(() => d3.line().x(d => histXScale(d.ageSelf)).y(d => histYScale(d.totalCombined)).curve(d3.curveMonotoneX)(historicalTimeline), [historicalTimeline, histXScale, histYScale]);

  // ------------------------------------------------------------ plan mutators
  const updateAccountField = (id, field, value) => setPlan(prev => ({ ...prev, accounts: (prev.accounts || []).map(a => a.id === id ? { ...a, [field]: field === 'risk' ? value : parseInputNumber(value) } : a) }));
  const updateRiskField = (riskKey, field, value) => setPlan(prev => ({ ...prev, riskProfiles: { ...(prev.riskProfiles || E.DEFAULT_RISK_PROFILES), [riskKey]: { ...(prev.riskProfiles || E.DEFAULT_RISK_PROFILES)[riskKey], [field]: parseInputNumber(value) } } }));
  const updateDemographics = (field, value) => setPlan(prev => ({ ...prev, demographics: { ...(prev.demographics || {}), [field]: field === 'planningMode' ? value : parseInputNumber(value) } }));
  const updateSpending = (field, value) => setPlan(prev => ({ ...prev, spending: { ...(prev.spending || {}), [field]: (field === 'drawdownStrategy' || field === 'decumulationPolicy') ? value : parseInputNumber(value) } }));
  const updateConfig = (field, value) => setPlan(prev => ({ ...prev, config: { ...(prev.config || {}), [field]: (field === 'valuationDate' || typeof value === 'boolean') ? value : parseInputNumber(value) } }));
  const updateListItem = (listKey, id, patch) => setPlan(p => ({ ...p, [listKey]: (p[listKey] || []).map(i => i.id === id ? { ...i, ...patch } : i) }));
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
    setSandboxCustomized(false); setActiveScenarioId(id); setPlan(data); setSimResult(null); setSandboxAccounts(sandboxFromPlan(data)); setSandboxRetire(sandboxRetireFromPlan(data));
  };
  const handleDeleteScenario = (idToDelete) => {
    if (scenarios.length <= 1) { window.alert('At least one scenario must be retained.'); return; }
    const remaining = scenarios.filter(s => s.id !== idToDelete);
    setScenarios(remaining);
    if (activeScenarioId === idToDelete) { setActiveScenarioId(remaining[0].id); setPlan(E.normalizePlan(remaining[0].data)); }
  };

  // ------------------------------------------------------------ sandbox
  const handleApplySandboxToPlan = () => {
    setSandboxCustomized(false);
    setPlan(prev => ({
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
    }));
    flash('Sandbox applied to plan inputs');
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
        setSandboxCustomized(false); setPlan(E.normalizePlan(parsed)); setSimResult(null); flash('Plan imported');
      } catch (err) { window.alert('Invalid JSON configuration file.'); }
    };
    reader.readAsText(file, 'UTF-8');
    e.target.value = '';
  };
  const handleResetDefaults = () => {
    if (window.confirm('Reset all inputs back to blank?')) { setSandboxCustomized(false); setPlan(E.normalizePlan(null)); safeStorageRemove(STORAGE_KEY); setSimResult(null); }
  };
  const handleExportCSV = () => {
    if (!timelineData.length) return;
    const headers = ['Year', 'Age (Myself)', 'Age (Partner)', 'Working (Myself)', 'Working (Partner)', 'Target Spend (£)', 'Net Guaranteed Income (£)', 'Working Partner Take-home (£)', 'State Pension (Myself £)', 'State Pension (Partner £)', 'Net Drawdown Demand (£)', 'Pension Withdrawals Gross (£)', 'PA Harvested (£)', 'Income Tax (£)', 'CGT (£)', 'Realised Gains (£)', 'Pensions (£)', 'ISAs (£)', 'Other Investments (£)', 'Cash Savings (£)', 'Total Combined Pot (£)', 'Pre-access Liquid (£)', 'Unmet (£)', 'Status'];
    const rows = timelineData.map(r => [r.year, r.ageSelf, isCouple ? r.agePart : 'N/A', r.workingSelf ? 'Yes' : 'No', isCouple ? (r.workingPart ? 'Yes' : 'No') : 'N/A', r.targetSpend.toFixed(0), r.netGuaranteed.toFixed(0), r.workingTakeHome.toFixed(0), r.spSelf.toFixed(0), isCouple ? r.spPart.toFixed(0) : '0', r.netDrawdown.toFixed(0), r.drawdownPensions.toFixed(0), r.harvested.toFixed(0), r.taxPaid.toFixed(0), (r.cgtPaid || 0).toFixed(0), (r.realisedGains || 0).toFixed(0), r.pensions.toFixed(0), r.isas.toFixed(0), r.other.toFixed(0), r.cash.toFixed(0), r.totalCombined.toFixed(0), r.preNmpaLiquid.toFixed(0), r.unmetDemand.toFixed(0), r.preNmpaInsolvent ? 'Pre-access gap' : r.unmetDemand > E.FAIL_TOLERANCE ? 'Shortfall' : 'Solvent']);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const link = document.createElement('a'); link.setAttribute('href', encodeURI(csvContent)); link.setAttribute('download', `retirement_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link); link.click(); link.remove();
  };

  // ------------------------------------------------------------ Monte Carlo
  const handleRunMC = async () => {
    setIsSimulating(true); setSimProgress({ label: `Testing ${MC_TRIALS.toLocaleString()} paths…`, value: 0 });
    await tick();
    try {
      const stats = await runMonteCarloAsync(ctx, { trials: MC_TRIALS, seed: mcSeed, onProgress: (f) => setSimProgress({ label: `Testing ${MC_TRIALS.toLocaleString()} paths…`, value: f }) });
      setSimResult({ type: 'test', title: 'Monte Carlo Stress Test', ...stats, spend: ctx.targetSpend });
    } finally { setIsSimulating(false); setSimProgress(null); }
  };
  const handleOptimize = async () => {
    setIsOptimizing(true); setSimProgress({ label: 'Solving for the safe maximum spend…', value: 0 });
    await tick();
    try {
      const paths = E.pathsForSeed(mcSeed, SEARCH_TRIALS, ctx.totalYears);
      const rateAt = (spend) => { let s = 0; for (const zs of paths) if (E.runTrial(ctx, zs, spend).survived) s++; return (s / SEARCH_TRIALS) * 100; };
      let low = 0, result;
      if (rateAt(0) < targetConfidence) {
        result = { spend: 0, note: 'Even zero spending fails the target — check the pre-access gap, one-off costs or the bequest floor.' };
      } else {
        let high = Math.max(20000, ctx.targetSpend * 2, 150000), guard = 0;
        while (rateAt(high) >= targetConfidence && guard++ < 8) { low = high; high *= 2; }
        for (let iter = 0; iter < 14; iter++) {
          const mid = E.round250((low + high) / 2);
          if (mid <= low || mid >= high) break;
          if (rateAt(mid) >= targetConfidence) low = mid; else high = mid;
          setSimProgress({ label: `Bisecting… £${low.toLocaleString()}–£${high.toLocaleString()}`, value: 0.1 + 0.5 * (iter + 1) / 14 });
          await tick();
        }
        result = { spend: E.round250(low) };
      }
      const stats = await runMonteCarloAsync(ctx, { trials: MC_TRIALS, seed: mcSeed + 1, spendOverride: result.spend, onProgress: (f) => setSimProgress({ label: `Confirming £${result.spend.toLocaleString()} over ${MC_TRIALS.toLocaleString()} paths…`, value: 0.6 + 0.4 * f }) });
      setSimResult({ type: 'optimize', title: `Safe Max Annual Spend (${targetConfidence}% Target)`, ...stats, spend: result.spend, note: result.note });
    } finally { setIsOptimizing(false); setSimProgress(null); }
  };

  const displayedAccounts = isCouple ? (plan?.accounts || []) : (plan?.accounts || []).filter(a => a.owner === 'Myself');
  const tabBtn = (id, Icon, label, accent = 'blue') => (
    <button key={id} onClick={() => setActiveTab(id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${activeTab === id ? (accent === 'indigo' ? 'bg-white text-indigo-600 shadow-xs' : 'bg-white text-blue-600 shadow-xs') : 'text-slate-600 hover:text-slate-900'}`}>
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
  const markers = (scale) => (
    <>
      {ageMarker(ctx.owners[0].retireAge, 'Retire M', '#f59e0b', '#fef3c7', '#fde68a', '#b45309', 10, scale)}
      {isCouple && ageMarker(ctx.owners[1].retireAge + (currentAge - ctx.agePart0), 'Retire P', '#d97706', '#fef3c7', '#fde68a', '#b45309', 32, scale, ctx.owners[1].retireAge)}
      {ageMarker(nmpa, 'NMPA', '#0284c7', '#e0f2fe', '#bae6fd', '#0369a1', 54, scale)}
      {ageMarker(ctx.spa, 'State Pen', '#059669', '#d1fae5', '#a7f3d0', '#065f46', 76, scale)}
    </>
  );


  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Bar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100"><TrendingUp className="w-5 h-5" /></div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Retirement Planning Studio</h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-100">{APP_VERSION}</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              UK multi-wrapper drawdown model, Monte Carlo &amp; historical backtesting. <strong className="text-slate-700 font-semibold">For educational &amp; illustrative purposes only — this is not financial advice.</strong> Please complete <span className="font-semibold text-blue-700">Plan Inputs</span> first; Config changes are optional.
            </p>
          </div>
          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 flex-wrap">
            {tabBtn('inputs', Sliders, 'Plan Inputs')}
            {tabBtn('config', Settings, 'Config & Assumptions')}
            {tabBtn('trajectory', Layers, 'Portfolio Trajectory')}
            {tabBtn('simulation', Dices, 'Monte Carlo Simulation', 'indigo')}
            {tabBtn('historical', History, 'Historical Backtest', 'indigo')}
            {tabBtn('audit', Table, 'Audit Data Table')}
            {tabBtn('docs', BookOpen, 'Documentation')}
          </div>
        </div>

        {/* Scenario Toolbar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
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
            <input type="text" placeholder="Scenario name (optional)" value={scenarioNameInput} onChange={(e) => setScenarioNameInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveScenario(); }} className="p-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-56" />
            <button onClick={handleSaveScenario} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"><Save className="w-3.5 h-3.5" /> Save</button>
            <button onClick={handleSaveAsNewScenario} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200 cursor-pointer"><Plus className="w-3.5 h-3.5 text-slate-600" /> Save as New Scenario</button>
            {saveSuccessMsg && <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200"><Check className="w-3 h-3 text-emerald-600" /> {saveSuccessMsg}</span>}
          </div>
        </div>

        {activeTab !== 'docs' && <WarningsBanner warnings={ctx.warnings} />}

        {/* TAB 1: PLAN INPUTS */}
        {activeTab === 'inputs' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
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
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2"><Users className="w-4 h-4 text-blue-600" /> 1. Demographics, Salaries &amp; Retirement Targets</h3>
                  <span className="text-xs text-slate-500">Choose whether this plan is for an individual or a couple.</span>
                </div>
                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button type="button" onClick={() => updateDemographics('planningMode', 'single')} className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${!isCouple ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>Single</button>
                  <button type="button" onClick={() => updateDemographics('planningMode', 'couple')} className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${isCouple ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>With Partner</button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div><label className="text-slate-600 font-semibold block mb-1">Current Age (Myself)</label><input type="number" min="0" max="120" placeholder="e.g. 40" onFocus={handleFocus} value={plan?.demographics?.currentAgeSelf ?? ''} onChange={(e) => updateDemographics('currentAgeSelf', e.target.value)} className={inputCls} /></div>
                {isCouple && <div><label className="text-slate-600 font-semibold block mb-1">Current Age (Partner)</label><input type="number" min="0" max="120" placeholder="e.g. 40" onFocus={handleFocus} value={plan?.demographics?.currentAgePart ?? ''} onChange={(e) => updateDemographics('currentAgePart', e.target.value)} className={inputCls} /></div>}
                <div><label className="text-slate-600 font-semibold block mb-1">Retirement Age (Myself)</label><input type="number" min="0" max="120" placeholder="e.g. 60" onFocus={handleFocus} value={plan?.demographics?.retireAgeSelf ?? ''} onChange={(e) => updateDemographics('retireAgeSelf', e.target.value)} className={inputCls} /></div>
                {isCouple && <div><label className="text-slate-600 font-semibold block mb-1">Retirement Age (Partner)</label><input type="number" min="0" max="120" placeholder="e.g. 60" onFocus={handleFocus} value={plan?.demographics?.retireAgePart ?? ''} onChange={(e) => updateDemographics('retireAgePart', e.target.value)} className={inputCls} /></div>}
                <div><label className="text-slate-600 font-semibold block mb-1">Gross Salary (Myself £/yr)</label><input type="number" min="0" step="1000" placeholder="for tax relief & bridging" onFocus={handleFocus} value={plan?.demographics?.salarySelf ?? ''} onChange={(e) => updateDemographics('salarySelf', e.target.value)} className={inputCls} /></div>
                {isCouple && <div><label className="text-slate-600 font-semibold block mb-1">Gross Salary (Partner £/yr)</label><input type="number" min="0" step="1000" placeholder="for tax relief & bridging" onFocus={handleFocus} value={plan?.demographics?.salaryPart ?? ''} onChange={(e) => updateDemographics('salaryPart', e.target.value)} className={inputCls} /></div>}
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
                  <span className="text-[10px] text-slate-400 mt-1 block">Bequest floor, tested at the terminal age only.</span>
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Lifestyle spending tapers (optional)</span>
                  <button type="button" onClick={() => goToDoc('doc-taper')} className="text-[11px] text-blue-600 hover:underline font-semibold flex items-center gap-1 cursor-pointer"><HelpCircle className="w-3.5 h-3.5" /> Go-go / slow-go / no-go years &rarr;</button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div><label className="text-slate-600 font-semibold block mb-1">Taper 1 from age (Myself)</label><input type="number" min="0" max="120" placeholder="e.g. 75" onFocus={handleFocus} value={plan?.spending?.taper1Age ?? ''} onChange={(e) => updateSpending('taper1Age', e.target.value)} className={inputCls} /></div>
                  <div><label className="text-slate-600 font-semibold block mb-1">Taper 1 reduction (%)</label><input type="number" min="0" max="100" step="1" placeholder="e.g. 10" onFocus={handleFocus} value={plan?.spending?.taper1Rate ?? ''} onChange={(e) => updateSpending('taper1Rate', e.target.value)} className={inputCls} /></div>
                  <div><label className="text-slate-600 font-semibold block mb-1">Taper 2 from age (Myself)</label><input type="number" min="0" max="120" placeholder="e.g. 85" onFocus={handleFocus} value={plan?.spending?.taper2Age ?? ''} onChange={(e) => updateSpending('taper2Age', e.target.value)} className={inputCls} /></div>
                  <div><label className="text-slate-600 font-semibold block mb-1">Taper 2 reduction (%)</label><input type="number" min="0" max="100" step="1" placeholder="e.g. 10" onFocus={handleFocus} value={plan?.spending?.taper2Rate ?? ''} onChange={(e) => updateSpending('taper2Rate', e.target.value)} className={inputCls} /></div>
                </div>
              </div>

              {/* Advanced: optional figures most plans can leave blank */}
              <div className="pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowAdvanced(v => !v)} className="text-[11px] font-bold text-slate-600 hover:text-slate-900 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                  <Settings className="w-3.5 h-3.5" /> Advanced inputs {showAdvanced ? '▾' : '▸'}
                  <span className="font-normal normal-case tracking-normal text-slate-400">— optional; sensible defaults are assumed if left blank</span>
                </button>
                {showAdvanced && (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs mt-3">
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
                        <span className="text-[10px] text-slate-400 mt-1 block">Gains already realised this tax year — reduces the {formatGBP(P.cgtAnnualExempt)} exemption in the current year only.</span>
                      </div>
                    ))}
                    {P.cgtEnabled && ctx.owners.map(o => {
                      const acc = (plan?.accounts || []).find(a => a.id === o.ids.other);
                      return (
                        <div key={`ug_${o.key}`}>
                          <label className="text-slate-600 font-semibold block mb-1">Other Investments — unrealised gain ({o.label} £)</label>
                          <input type="number" min="0" step="500" placeholder="blank = balance is all cost" onFocus={handleFocus}
                            value={acc?.unrealisedGain ?? ''} onChange={(e) => updateAccountField(o.ids.other, 'unrealisedGain', e.target.value)} className={inputCls} />
                          <span className="text-[10px] text-slate-400 mt-1 block">How much of today's GIA balance is profit. Left blank, only future growth is taxed — which understates CGT on long-held holdings.</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Balances & Contributions */}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4 overflow-x-auto">
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
                        <td className="py-2.5"><input type="number" min="0" step="500" placeholder="0" onFocus={handleFocus} value={acc.balance} onChange={(e) => updateAccountField(acc.id, 'balance', e.target.value)} className="w-32 p-1.5 bg-slate-50 border border-slate-300 rounded font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" /></td>
                        <td className="py-2.5"><input type="number" min="0" step="250" placeholder="0" onFocus={handleFocus} value={acc.contrib} onChange={(e) => { updateAccountField(acc.id, 'contrib', e.target.value); if (acc.contribByYear) setPlan(prev => ({ ...prev, accounts: prev.accounts.map(a => a.id === acc.id ? { ...a, contribByYear: undefined } : a) })); }} className={`w-28 p-1.5 bg-slate-50 border rounded text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none ${over ? 'border-rose-400 text-rose-700' : 'border-slate-300'}`} title={over ? 'Exceeds the annual allowance set in Config' : ''} /></td>
                        <td className="py-2.5"><input type="number" step="0.5" placeholder="0" onFocus={handleFocus} value={acc.growth} onChange={(e) => updateAccountField(acc.id, 'growth', e.target.value)} className="w-20 p-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" /></td>
                        <td className="py-2.5">
                          <select value={acc.risk} onChange={(e) => updateAccountField(acc.id, 'risk', e.target.value)} className="p-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-blue-700 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer">
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
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2"><Coins className="w-4 h-4 text-blue-600" /> 3. Expected Other Income Streams (e.g. DB Pension, Part-time work, Rental)</h3>
                  <span className="text-[11px] text-slate-500">Taxable streams count toward the personal allowance and tax bands; tax-free streams directly reduce net drawdown demand. Blank end age = plan end.</span>
                  <p className="text-[11px] text-slate-500 mt-1 leading-relaxed max-w-3xl"><strong>Earnings</strong> (employment / self-employment) are taxed <em>and</em> count as relevant UK earnings, so they raise how much you can pay into a pension that year. <strong>Other taxable income</strong> — DB pensions, annuities, rent, dividends, interest — is taxed at income-tax rates but does <strong>not</strong> support pension contributions. <strong>Tax-free income</strong> is neither taxed nor counted. With no relevant earnings the pension limit is {formatGBP(P.pensionNoEarningsLimit)}/yr.</p>
                </div>
                <button onClick={addOtherIncome} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs"><Plus className="w-3.5 h-3.5" /> Add Stream</button>
              </div>
              {(plan?.otherIncomes || []).length === 0 ? (
                <div className="text-xs text-slate-400 italic p-3 bg-slate-50 border border-slate-200 rounded-xl">No additional income streams registered.</div>
              ) : (
                <div className="space-y-2">
                  {plan.otherIncomes.map(inc => (
                    <div key={inc.id} className="grid grid-cols-1 sm:grid-cols-6 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs items-center">
                      <input type="text" onFocus={handleFocus} value={inc.name} onChange={(e) => updateListItem('otherIncomes', inc.id, { name: e.target.value })} className="p-1.5 bg-white border border-slate-300 rounded font-bold text-slate-800 sm:col-span-2 focus:ring-2 focus:ring-blue-500 focus:outline-none" placeholder="Description" />
                      {isCouple ? (
                        <select value={inc.owner} onChange={(e) => updateListItem('otherIncomes', inc.id, { owner: e.target.value })} className="p-1.5 bg-white border border-slate-300 rounded text-slate-700"><option value="Myself">Myself</option><option value="Partner">Partner</option></select>
                      ) : <div className="p-1.5 text-slate-500 font-semibold">Myself</div>}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Age</span>
                        <input type="number" min="0" max="120" placeholder="Start" onFocus={handleFocus} value={inc.startAge} onChange={(e) => updateListItem('otherIncomes', inc.id, { startAge: parseInputNumber(e.target.value) })} className="w-12 p-1 bg-white border border-slate-300 rounded font-mono text-center font-bold" />
                        <span className="text-slate-400">to</span>
                        <input type="number" min="0" max="120" placeholder="End" onFocus={handleFocus} value={inc.endAge} onChange={(e) => updateListItem('otherIncomes', inc.id, { endAge: parseInputNumber(e.target.value) })} className="w-12 p-1 bg-white border border-slate-300 rounded font-mono text-center font-bold" />
                      </div>
                      <div className="flex items-center gap-2">
                        <input type="number" min="0" step="500" placeholder="£/yr" onFocus={handleFocus} value={inc.amount} onChange={(e) => updateListItem('otherIncomes', inc.id, { amount: parseInputNumber(e.target.value) })} className="w-24 p-1.5 bg-white border border-slate-300 rounded font-mono text-emerald-700 font-bold" />
                        <select value={inc.incomeType} onChange={(e) => updateListItem('otherIncomes', inc.id, { incomeType: e.target.value })} className="p-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-amber-700" title="Drives both income tax and whether this counts as relevant earnings for pension contributions">
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
              <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2"><Plus className="w-4 h-4 text-blue-600" /> 4. One-Off Deposits (by Wrapper)</h3>
                    <span className="text-[11px] text-slate-500 block mt-0.5">Lump sums into a chosen wrapper. Anything above that year's allowance is parked in Other Investments and fed in over later years.</span>
                    <button type="button" onClick={() => goToDoc('doc-one-off-deposits')} className="text-[11px] text-blue-600 hover:text-blue-800 hover:underline font-semibold flex items-center gap-1 cursor-pointer mt-0.5"><HelpCircle className="w-3.5 h-3.5" /> How one-off deposits &amp; multi-year staging work &rarr;</button>
                  </div>
                  <button onClick={addOneOffContrib} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer border border-slate-200 self-start sm:self-auto"><Plus className="w-3.5 h-3.5" /> Add Lump Sum</button>
                </div>
                <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl text-xs text-slate-700 space-y-1.5">
                  <div className="flex items-center gap-2 font-bold text-indigo-950 text-sm"><Info className="w-4 h-4 text-indigo-600" /> Annual Allowance Headroom &mdash; {ctx.baseYear} tax year</div>
                  {ctx.owners.map(o => (
                    <div key={o.key} className="flex flex-wrap gap-x-4">
                      <span className="font-semibold">{o.label}:</span>
                      <span>S&amp;S ISA remaining <strong>{formatGBP(E.wrapperHeadroomAtYear(ctx, o.key, 'isa', 0))}</strong>/yr</span>
                      <span>Pension remaining <strong>{formatGBP(E.wrapperHeadroomAtYear(ctx, o.key, 'pen', 0))}</strong>/yr</span>
                    </div>
                  ))}
                  <p className="text-slate-500 text-[11px] leading-relaxed">A one-off deposit that exceeds remaining headroom is auto-staged: the allowed amount deposits now, the rest parks in Other Investments and drip-feeds into the target wrapper as future years' allowance opens up.</p>
                  <p className="text-slate-500 text-[11px] leading-relaxed">These are <strong>this year's</strong> figures. Headroom changes in later years as regular contributions escalate, and again once contributions stop at retirement — each deposit below shows the headroom for its own year.</p>
                </div>
                {(plan?.oneOffContributions || []).length === 0 ? (
                  <div className="text-xs text-slate-400 italic p-3 bg-slate-50 border border-slate-200 rounded-xl">No one-off contributions scheduled.</div>
                ) : (
                  <div className="space-y-2">
                    {plan.oneOffContributions.map(c => {
                      const st = ctx.oneOffStaging.get(c.id);
                      const isExpanded = expandedOneOff.has(c.id);
                      return (
                        <div key={c.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <input type="date" value={c.date || (c.year ? `${c.year}-01-01` : '')} onChange={(e) => { const d = e.target.value; updateListItem('oneOffContributions', c.id, { date: d, year: parseInt(d.slice(0, 4)) || '' }); }} className="p-1 bg-white border border-slate-300 rounded font-mono text-slate-800 text-xs" />
                            {isCouple ? (
                              <select value={c.owner} onChange={(e) => updateListItem('oneOffContributions', c.id, { owner: e.target.value })} className="p-1 bg-white border border-slate-300 rounded text-slate-700"><option value="Myself">Myself</option><option value="Partner">Partner</option></select>
                            ) : <span className="text-slate-500 font-semibold px-1">Myself</span>}
                            <select value={c.transferredFrom} onChange={(e) => updateListItem('oneOffContributions', c.id, { transferredFrom: e.target.value })} className="p-1 bg-white border border-slate-300 rounded text-slate-700" title="Transferred from">
                              <option value="External">External (New Capital)</option>
                              {Object.values(E.CATEGORY_LABEL).map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                            <select value={c.category} onChange={(e) => { const category = e.target.value; const patch = { category }; if (c.stagedTargetWrapper === c.category) patch.stagedTargetWrapper = category; updateListItem('oneOffContributions', c.id, patch); }} className="p-1 bg-white border border-slate-300 rounded text-blue-700 font-semibold">
                              {Object.values(E.CATEGORY_LABEL).map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                            <input type="number" min="0" step="1000" placeholder="Amount (£)" onFocus={handleFocus} value={c.amount} onChange={(e) => updateListItem('oneOffContributions', c.id, { amount: parseInputNumber(e.target.value) })} className="w-24 p-1 bg-white border border-slate-300 rounded font-mono text-emerald-700 font-bold" />
                            {st && !st.direct && (
                              <button onClick={() => toggleOneOffExpand(c.id)} className="p-1 text-amber-600 hover:text-amber-800 cursor-pointer transition-colors" title="Staging schedule"><Settings className="w-4 h-4" /></button>
                            )}
                            <button onClick={() => deleteOneOffContrib(c.id)} className="p-1 ml-auto text-slate-400 hover:text-rose-600 cursor-pointer transition-colors"><Trash2 className="w-4 h-4" /></button>
                          </div>
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
                            <div className="w-full p-2.5 bg-white border border-amber-200 rounded-lg text-[11px] space-y-1.5">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-slate-600">Staged destination:</span>
                                <select value={c.stagedTargetWrapper} onChange={(e) => updateListItem('oneOffContributions', c.id, { stagedTargetWrapper: e.target.value })} className="p-1 bg-white border border-slate-300 rounded text-slate-700">
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
              <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
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
                        <input type="date" value={cost.date || (cost.year ? `${cost.year}-01-01` : '')} onChange={(e) => { const d = e.target.value; updateListItem('oneOffCosts', cost.id, { date: d, year: parseInt(d.slice(0, 4)) || '' }); }} className="p-1 bg-white border border-slate-300 rounded font-mono text-slate-800 text-xs" />
                        <input type="text" onFocus={handleFocus} value={cost.desc} onChange={(e) => updateListItem('oneOffCosts', cost.id, { desc: e.target.value })} className="p-1 bg-white border border-slate-300 rounded text-slate-700 flex-1" placeholder="Purpose" />
                        <input type="number" min="0" step="1000" placeholder="Amount (£)" onFocus={handleFocus} value={cost.amount} onChange={(e) => updateListItem('oneOffCosts', cost.id, { amount: parseInputNumber(e.target.value) })} className="w-24 p-1 bg-white border border-slate-300 rounded font-mono text-rose-700 font-bold" />
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
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Sliders className="w-4 h-4 text-blue-600" /> Decumulation &amp; Pension Withdrawal Methodology</h2>
              <p className="text-xs text-slate-500">Select how withdrawals are ordered across tax wrappers and how pensions are crystallized. <button type="button" onClick={() => goToDoc('doc-decumulation')} className="text-blue-600 hover:underline font-semibold cursor-pointer">What the evidence says &rarr;</button></p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs pt-1">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Decumulation Policy</label>
                  <select value={plan?.spending?.decumulationPolicy} onChange={(e) => updateSpending('decumulationPolicy', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-blue-700 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer">
                    {Object.entries(E.DECUMULATION_POLICIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {plan?.spending?.decumulationPolicy === 'Bracket Fill Basic' ? `Fills the £${P.pa.toLocaleString()} allowance, then draws pension income up to £${P.basicLimit.toLocaleString()} before touching cash, GIA and ISAs.`
                      : plan?.spending?.decumulationPolicy === 'Bracket Fill' ? `Draws pension only up to £${P.pa.toLocaleString()} (0% tax), then cash, GIA and ISAs; pension income above the allowance is the last resort.`
                      : 'Liquidates each wrapper to zero in rigid sequential order.'}
                  </span>
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Pension Drawdown Strategy</label>
                  <select value={plan?.spending?.drawdownStrategy} onChange={(e) => updateSpending('drawdownStrategy', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-blue-700 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer">
                    <option value="Phased Drawdown">Phased Drawdown (Ongoing {Math.round(P.pclsProp * 100)}% tax-free proportion)</option>
                    <option value="Full 25% Lump Sum">Full Lump Sum (Upfront statutory PCLS into Cash)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">Phased crystallizes {Math.round(P.pclsProp * 100)}% tax-free with each draw; Lump Sum moves the tax-free cash (capped at £{P.lsa.toLocaleString()}) into cash savings at retirement.</span>
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
            </div>

            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Settings className="w-4 h-4 text-blue-600" /> Global Economic &amp; Calculation Configuration</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs pt-3">
                <div><label className="text-slate-600 font-semibold block mb-1">Valuation Date (Today)</label><input type="date" value={plan?.config?.valuationDate ?? ''} onChange={(e) => updateConfig('valuationDate', e.target.value)} className={inputCls} /><span className="text-[10px] text-slate-400 mt-1 block">Year 0 flows are pro-rated to the {(ctx.yf * 100).toFixed(0)}% of the year remaining.</span></div>
                <div><label className="text-slate-600 font-semibold block mb-1">Headline Inflation CPI (% pa)</label><input type="number" step="0.1" placeholder="2.5" onFocus={handleFocus} value={plan?.config?.inflation ?? ''} onChange={(e) => updateConfig('inflation', e.target.value)} className={inputCls} /><span className="text-[10px] text-slate-400 mt-1 block">Only used for the nominal display series.</span></div>
                <div><label className="text-slate-600 font-semibold block mb-1">Personal Pension Access Age (NMPA)</label><input type="number" min="0" max="120" placeholder="58" onFocus={handleFocus} value={plan?.demographics?.privatePensionAge ?? ''} onChange={(e) => updateDemographics('privatePensionAge', e.target.value)} className={inputCls} /><span className="text-[10px] text-slate-400 mt-1 block">Statutory NMPA is 55 today and 57 from April 2028.</span></div>
                <div><label className="text-slate-600 font-semibold block mb-1">State Pension Start Age</label><input type="number" min="0" max="120" placeholder="68" onFocus={handleFocus} value={plan?.demographics?.statePensionAge ?? ''} onChange={(e) => updateDemographics('statePensionAge', e.target.value)} className={inputCls} /></div>
                <div><label className="text-slate-600 font-semibold block mb-1">Cash buffer kept from surplus income (months)</label><input type="number" min="0" step="1" placeholder="6" onFocus={handleFocus} value={plan?.config?.cashBufferMonths ?? ''} onChange={(e) => updateConfig('cashBufferMonths', e.target.value)} className={inputCls} /></div>
                <div><label className="text-slate-600 font-semibold block mb-1">Tournament bridge safety margin (%)</label><input type="number" min="0" step="5" placeholder="30" onFocus={handleFocus} value={plan?.config?.bridgeSafetyMargin ?? ''} onChange={(e) => updateConfig('bridgeSafetyMargin', e.target.value)} className={inputCls} /><span className="text-[10px] text-slate-400 mt-1 block">Uplift on the pre-access reserve, assuming 0% real growth.</span></div>
                <div><label className="text-slate-600 font-semibold block mb-1">Pension death-tax haircut (%)</label><input type="number" min="0" max="100" step="5" placeholder="0" onFocus={handleFocus} value={plan?.config?.pensionDeathTaxRate ?? ''} onChange={(e) => updateConfig('pensionDeathTaxRate', e.target.value)} className={inputCls} /><span className="text-[10px] text-slate-400 mt-1 block">Applied to pension left at age {terminalAge} for the "net" pot figures only (IHT from April 2027 / beneficiary income tax).</span></div>
                <div><label className="text-slate-600 font-semibold block mb-1">Monte Carlo seed</label><div className="flex gap-1"><input type="number" value={mcSeed} onChange={(e) => setMcSeed(Math.max(1, parseInt(e.target.value) || 1))} className={inputCls} /><button type="button" onClick={() => setMcSeed(Math.floor(Math.random() * 1e9) + 1)} className="px-2 bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-semibold cursor-pointer hover:bg-slate-200">Reseed</button></div><span className="text-[10px] text-slate-400 mt-1 block">Same seed = same market paths (reproducible, fair comparisons).</span></div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4 overflow-x-auto">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider">Asset Allocations, Return Matrix &amp; Volatilities (σ)</h3>
                  <span className="text-[11px] text-slate-500">Expected real return is treated as the median (geometric) annual rate; Monte Carlo paths are log-normal around it with the stated σ, one market factor for all wrappers.</span>
                </div>
                <button onClick={() => setIsEditingRisk(!isEditingRisk)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${isEditingRisk ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'}`}><Pencil className="w-3.5 h-3.5" />{isEditingRisk ? 'Done Editing' : 'Edit Matrix'}</button>
              </div>
              <table className="w-full text-left text-xs border-collapse">
                <thead><tr className="border-b border-slate-200 text-slate-500 font-semibold"><th className="pb-2">Allocation Category</th><th className="pb-2">Expected Real Return (% pa)</th><th className="pb-2">Unlucky Real Return (% pa)</th><th className="pb-2">Lucky Real Return (% pa)</th><th className="pb-2">Nominal Return (% pa)</th><th className="pb-2">Annual Volatility (σ % pa)</th></tr></thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {Object.entries(activeRiskMatrix).map(([key, val]) => (
                    <tr key={key} className="hover:bg-slate-50/80">
                      <td className="py-2.5 font-sans font-bold text-slate-800">{val.label || key}</td>
                      {[['real', 'text-blue-700', 0.05], ['unlucky', 'text-rose-700', 0.05], ['lucky', 'text-emerald-700', 0.05], ['nominal', 'text-purple-700', 0.05], ['volatility', 'text-amber-700', 0.5]].map(([field, color, step]) => (
                        <td key={field} className="py-2.5">
                          {isEditingRisk ? (
                            <input type="number" step={step} min={field === 'volatility' ? 0 : undefined} onFocus={handleFocus} value={val[field] ?? ''} onChange={(e) => updateRiskField(key, field, e.target.value)} className={`w-20 p-1 bg-slate-50 border border-slate-300 rounded font-mono ${color} font-bold focus:bg-white focus:ring-1 focus:ring-blue-500`} />
                          ) : <span className={`${color} font-bold`}>{E.num(val[field], 0).toFixed(field === 'volatility' ? 1 : 2)}%</span>}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider">UK Income Tax, National Insurance &amp; Pension Allowances</h3>
              <p className="text-[11px] text-slate-500">Defaults are rUK 2025/26 (frozen to April 2028). Scottish bands differ. All thresholds are held constant in real terms.</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                {[
                  ['personalAllowance', 'Personal Allowance (£)'], ['paTaperThreshold', 'PA Taper Threshold (£)'], ['paTaperRate', 'PA Taper Rate (% of excess)'], ['basicBandLimit', 'Higher Rate Starts At (£ income)'],
                  ['basicTaxRate', 'Basic Rate (%)'], ['higherBandLimit', 'Additional Rate Starts At (£ income)'], ['higherTaxRate', 'Higher Rate (%)'], ['additionalTaxRate', 'Additional Rate (%)'],
                  ['nicPrimaryThreshold', 'NIC Primary Threshold (£)'], ['nicUpperEarningsLimit', 'NIC Upper Earnings Limit (£)'], ['nicMainRate', 'NIC Main Rate (%)'], ['nicUpperRate', 'NIC Upper Rate (%)'],
                  ['employerNicRate', 'Employer NIC Rate (%)'], ['pclsProportion', 'PCLS Tax-Free (%)'], ['pclsMaxCap', 'Lump Sum Allowance (£ LSA)'],
                  ['isaAnnualAllowance', 'ISA Allowance (£/person/yr)'], ['pensionAnnualAllowance', 'Pension Annual Allowance (£/person/yr)'], ['pensionNoEarningsLimit', 'Pension Limit With No Earnings (£/person/yr)'], ['mpaaLimit', 'Money Purchase Annual Allowance (£/person/yr)'], ['cgtAnnualExempt', 'CGT Annual Exempt Amount (£/person/yr)'], ['cgtBasicRate', 'CGT Rate — Basic Band (%)'], ['cgtHigherRate', 'CGT Rate — Higher/Additional Band (%)']
                ].map(([field, label]) => (
                  <div key={field}><span className="text-slate-600 font-sans font-semibold block mb-1">{label}</span><input type="number" min="0" placeholder={String(E.DEFAULT_CONFIG[field])} onFocus={handleFocus} value={plan?.config?.[field] ?? ''} onChange={(e) => updateConfig(field, e.target.value)} className={smallInputCls} /></div>
                ))}
              </div>
              <div className="pt-3 border-t border-slate-100">
                <button type="button" onClick={() => setShowAdvancedConfig(v => !v)} className="text-[11px] font-bold text-slate-600 hover:text-slate-900 uppercase tracking-wider flex items-center gap-1.5 cursor-pointer">
                  <Settings className="w-3.5 h-3.5" /> Advanced inputs {showAdvancedConfig ? '▾' : '▸'}
                  <span className="font-normal normal-case tracking-normal text-slate-400">— niche settings most plans leave at the default</span>
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
              <p className="leading-relaxed"><strong>What it does:</strong> Models compound wealth paths and tax-wrapper decumulation using steady real rates of return (Expected baseline, Lucky 90th percentile, Unlucky 10th percentile). Use the Sandbox below to test contributions and salary sacrifice ratios.</p>
              <p className="text-slate-500 text-[11px] leading-relaxed"><strong>Why these figures differ from Monte Carlo:</strong> this trajectory assumes smooth, constant returns without volatility or sequence-of-returns shocks. The Monte Carlo median is centred on the same expected rate, so the gap between the two is the cost of volatility.</p>
              <p className={`text-[11px] font-semibold ${deterministicVerdict.survived ? 'text-emerald-700' : 'text-rose-700'}`}>
                {deterministicVerdict.survived ? `Expected path survives to ${terminalAge}` : `Expected path fails at age ${deterministicVerdict.failAge} (${deterministicVerdict.failReason === 'pre-access' ? 'pre-access bridge exhausted' : deterministicVerdict.failReason === 'floor' ? 'below the bequest floor' : 'spending shortfall'})`} — lifetime tax {formatGBP(deterministicVerdict.lifetimeTax)}{P.cgtEnabled ? ' (income tax + CGT)' : ''}.
              </p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">Active View:</span>
                {(isCouple ? ['Combined', 'Myself', 'Partner'] : ['Combined']).map(p => (
                  <button key={p} onClick={() => setPlan(prev => ({ ...prev, activeProfileView: p }))} className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${plan?.activeProfileView === p ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'}`}>{p}</button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs"><div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Expected Terminal Pot</div><div className="text-2xl font-black font-mono text-blue-600 mt-2">{formatGBP(chartDisplayData[chartDisplayData.length - 1]?.expected)}</div><div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-blue-600" /> Constant expected real growth to age {terminalAge}</div></div>
              <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs"><div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lucky Scenario (90th %ile)</div><div className="text-2xl font-black font-mono text-emerald-600 mt-2">{formatGBP(timelineData[timelineData.length - 1]?.lucky)}</div><div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Constant above-average return rate</div></div>
              <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs"><div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Unlucky Scenario (10th %ile)</div><div className="text-2xl font-black font-mono text-rose-600 mt-2">{formatGBP(timelineData[timelineData.length - 1]?.unlucky)}</div><div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-rose-600" /> Constant below-average return rate</div></div>
            </div>

            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
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
                    {yScale.ticks(6).map((t, i) => <g key={i} transform={`translate(0, ${yScale(t)})`}><line x2={innerWidth} stroke="#f1f5f9" strokeDasharray="3,3" /><text x={-10} dy="0.32em" fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">£{(t / 1000).toFixed(0)}k</text></g>)}
                    {xScale.ticks(10).map((t, i) => <g key={i} transform={`translate(${xScale(t)}, 0)`}><line y2={innerHeight} stroke="#f8fafc" /><text y={innerHeight + 20} fill="#64748b" fontSize="11" textAnchor="middle" fontFamily="monospace">{t}</text></g>)}
                    {markers(xScale)}
                    {SERIES_CONFIG.map(s => (activeSeries[s.id] && pathGenerators[s.id]) ? <path key={s.id} d={pathGenerators[s.id]} fill="none" stroke={s.color} strokeWidth={s.strokeWidth} strokeDasharray={s.dash} strokeLinecap="round" /> : null)}
                    {sandboxLinePath && <path d={sandboxLinePath} fill="none" stroke="#f59e0b" strokeWidth="3.5" strokeDasharray="6,4" strokeLinecap="round" />}
                    <rect width={innerWidth} height={innerHeight} fill="transparent" onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const age = Math.round(xScale.invert((e.clientX - rect.left) * (innerWidth / Math.max(1, rect.width)))); setHoveredPoint(visibleData.find(d => d.ageSelf === age) || null); }} />
                    {hoveredPoint && <g transform={`translate(${xScale(hoveredPoint.ageSelf)}, 0)`}><line y2={innerHeight} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" /><circle cy={yScale(hoveredPoint.expected || 0)} r="4" fill="#2563eb" stroke="#ffffff" strokeWidth="2" /></g>}
                  </g>
                </svg>
                {hoveredPoint && (
                  <div className="absolute top-4 left-24 bg-white/95 border border-slate-200 p-3 rounded-xl shadow-lg text-xs space-y-1 backdrop-blur-md pointer-events-none">
                    <div className="font-bold text-slate-800 border-b border-slate-100 pb-1 flex justify-between gap-4"><span>Age {hoveredPoint.ageSelf} ({hoveredPoint.year})</span><span className="text-slate-500">Spend Demand: {formatGBP(hoveredPoint.targetSpend)}/yr</span></div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 font-mono">
                      {activeSeries.expected && <div className="text-blue-600 font-bold">Projected Pot: {formatGBP(hoveredPoint.expected)}</div>}
                      {isSandboxModified && <div className="text-amber-600 font-bold">Sandbox Pot: {formatGBP(sandboxTimeline.find(d => d.ageSelf === hoveredPoint.ageSelf)?.totalCombined)}</div>}
                      {activeSeries.lucky && <div className="text-emerald-600">Lucky: {formatGBP(hoveredPoint.lucky)}</div>}
                      {activeSeries.unlucky && <div className="text-rose-600">Unlucky: {formatGBP(hoveredPoint.unlucky)}</div>}
                      {activeSeries.pensions && <div className="text-sky-600">Pensions: {formatGBP(hoveredPoint.pensions)}</div>}
                      {activeSeries.isas && <div className="text-teal-600">ISAs: {formatGBP(hoveredPoint.isas)}</div>}
                      <div className="text-slate-600">Tax this year: {formatGBP(hoveredPoint.taxPaid)}</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  {SERIES_CONFIG.map(s => (
                    <button key={s.id} onClick={() => setActiveSeries(prev => ({ ...prev, [s.id]: !prev[s.id] }))} className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer border ${activeSeries[s.id] ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold' : 'bg-white border-slate-200 text-slate-400 opacity-60'}`}>
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />{s.label}{activeSeries[s.id] && <Check className="w-3 h-3 text-slate-600" />}
                    </button>
                  ))}
                </div>
                {isSandboxModified && <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl"><span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" /> Sandbox Active (Dashed Line)</div>}
              </div>
            </div>

            {/* SANDBOX */}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-5">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Sparkles className="w-4 h-4 text-amber-500" /> Contribution &amp; Escalation Sandbox</h3>
                <p className="text-xs text-slate-500 mt-0.5">Test contributions, escalation rates and tournament strategies without modifying your base plan inputs.</p>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 pb-3 border-y border-slate-100">
                <div><h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Wrapper Sandbox Controls</h4><span className="text-[11px] text-slate-500">Adjust retirement ages and individual wrappers below, or reset back to your baseline plan inputs.</span></div>
                <div className="flex items-center gap-2">
                  <button onClick={handleResetSandbox} disabled={!isSandboxModified} className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${isSandboxModified ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 cursor-pointer' : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'}`}><RotateCcw className="w-3.5 h-3.5" /> Reset Sandbox</button>
                  <button onClick={handleApplySandboxToPlan} disabled={!isSandboxModified} className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${isSandboxModified ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white cursor-pointer active:scale-95' : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'}`}><Check className="w-3.5 h-3.5" /> Apply to Plan Inputs</button>
                </div>
              </div>
              <div className="p-4 bg-slate-50/80 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Users className="w-4 h-4 text-slate-500" />
                  <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Retirement Age</h5>
                  <span className="text-[11px] text-slate-500">Contributions stop and drawdown begins at this age — test retiring earlier or later.</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {ctx.owners.map(o => {
                    const base = sandboxRetireFromPlan(plan)[o.key];
                    const val = sandboxRetire[o.key];
                    const changed = val !== base;
                    const yearsToGo = Math.max(0, Math.round(val - o.age0));
                    return (
                      <div key={o.key} className={`p-3 rounded-xl border transition-colors ${changed ? 'bg-amber-50/60 border-amber-200' : 'bg-white border-slate-200'}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-bold text-slate-800 font-sans">{o.label}</span>
                          {changed
                            ? <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-sans text-[10px] font-bold">{base} &rarr; {val}</span>
                            : <span className="text-slate-400 font-sans text-[10px]">Base: {base}</span>}
                        </div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <input type="number" min="0" max="120" step="1" value={val} onFocus={handleFocus} onChange={(e) => updateSandboxRetire(o.key, e.target.value)} className="w-20 p-1.5 bg-white border border-slate-300 rounded font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500" />
                          {[-5, -1, 1, 5].map(d => (
                            <button key={d} onClick={() => adjustSandboxRetire(o.key, d)} className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-sans font-semibold text-slate-700 cursor-pointer">{d > 0 ? '+' : ''}{d}</button>
                          ))}
                          <span className="text-[10px] text-slate-400 font-sans ml-auto">{yearsToGo > 0 ? `${yearsToGo} yr${yearsToGo === 1 ? '' : 's'} to go` : 'at/past current age'}</span>
                        </div>
                        {val < nmpa && <div className="text-[10px] text-amber-700 font-sans mt-1.5">Retires before pension access age {nmpa} — needs {Math.round(nmpa - val)} yr bridge from ISAs/GIA/cash.</div>}
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
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 shadow-2xs"><span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Wealth Compounding Multiple</span><div className="text-xl font-bold font-mono text-indigo-700 mt-1">{sandboxMetrics.cumulativeExtraCapital !== 0 ? `${sandboxMetrics.multiplier.toFixed(2)}x` : '—'}</div><span className="text-[11px] text-slate-500 block mt-0.5">Terminal change per £1 of extra deposits</span></div>
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
                          <td className="p-3"><div className="flex items-center gap-1.5"><input type="number" min="0" step="250" value={sb.contrib} onFocus={handleFocus} onChange={(e) => updateSandboxField(acc.id, 'contrib', e.target.value)} className="w-28 p-1.5 bg-white border border-slate-300 rounded font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500" />{sb.contribByYear && <span className="px-1.5 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[10px] font-sans" title="Year-by-year schedule from a phased strategy; editing replaces it">phased</span>}</div></td>
                          <td className="p-3"><div className="flex items-center gap-1">{[-1000, -500, 500, 1000].map(d => <button key={d} onClick={() => adjustSandboxContrib(acc.id, d)} className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-sans font-semibold text-slate-700 cursor-pointer">{d > 0 ? '+' : ''}{Math.abs(d) >= 1000 ? `${d / 1000}k` : d}</button>)}</div></td>
                          <td className="p-3"><div className="flex items-center gap-1.5"><input type="number" step="0.5" value={sb.growth} onFocus={handleFocus} onChange={(e) => updateSandboxField(acc.id, 'growth', e.target.value)} className="w-20 p-1.5 bg-white border border-slate-300 rounded text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500" /><span className="text-slate-400 font-sans">%</span></div></td>
                          <td className="p-3 text-right">{isModified ? <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-sans text-[10px] font-bold">Adjusted</span> : <span className="text-slate-400 font-sans text-[10px]">Unchanged</span>}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: MONTE CARLO */}
        {activeTab === 'simulation' && (
          <div className="space-y-6">
            <div className="p-4 bg-indigo-50/80 border border-indigo-200 rounded-2xl text-xs text-slate-700 space-y-1.5 shadow-2xs">
              <div className="flex items-center gap-2 font-bold text-indigo-950 text-sm"><Dices className="w-4 h-4 text-indigo-600" /> Stochastic Monte Carlo Stress Testing ({MC_TRIALS.toLocaleString()} Randomized Paths)</div>
              <p className="leading-relaxed"><strong>What it does:</strong> Stress-tests your target living expenditure against {MC_TRIALS.toLocaleString()} randomized market runs using each risk tier's annual volatility (σ). It reports the failure probability, when capital runs out, and solves for your sustainable maximum spending at a chosen confidence level.</p>
              <p className="text-slate-500 text-[11px] leading-relaxed"><strong>How failure is defined:</strong> a year in which living costs or a one-off cost cannot be met from any accessible wrapper (a pre-access failure means pension money existed but was locked), or a terminal pot below the bequest floor. Paths are seeded, so re-running with the same seed reproduces the result exactly.</p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div><h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Run Multi-Path Simulation</h3><span className="text-[11px] text-slate-500">Run {MC_TRIALS.toLocaleString()} stochastic trials or calculate your sustainable safe spending limit.</span></div>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs">
                  <span className="text-slate-500 px-2 font-medium">Confidence:</span>
                  {[85, 90, 95].map(rate => <button key={rate} onClick={() => setTargetConfidence(rate)} className={`px-2 py-0.5 rounded-lg font-semibold transition-all cursor-pointer ${targetConfidence === rate ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>{rate}%</button>)}
                </div>
                <button onClick={handleRunMC} disabled={isSimulating || isOptimizing} className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95 disabled:opacity-60"><Dices className="w-3.5 h-3.5 text-blue-200" />{isSimulating ? 'Testing…' : 'Test Current Spend'}</button>
                <button onClick={handleOptimize} disabled={isSimulating || isOptimizing} className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95 disabled:opacity-60"><Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />{isOptimizing ? 'Solving…' : `⚡ Safe Max Annual Spend (${targetConfidence}%)`}</button>
              </div>
              {simProgress && <div className="w-full"><ProgressBar value={simProgress.value} label={simProgress.label} /></div>}
            </div>

            {simResult && (
              <div className={`p-5 rounded-2xl shadow-xs border transition-all ${simResult.successRate >= 90 ? 'bg-emerald-50/90 border-emerald-200' : simResult.successRate >= 75 ? 'bg-amber-50/90 border-amber-200' : 'bg-rose-50/90 border-rose-200'}`}>
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`p-3 rounded-2xl border ${simResult.successRate >= 90 ? 'bg-emerald-100 border-emerald-300 text-emerald-700' : simResult.successRate >= 75 ? 'bg-amber-100 border-amber-300 text-amber-700' : 'bg-rose-100 border-rose-300 text-rose-700'}`}>{simResult.successRate >= 90 ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}</div>
                    <div>
                      <div className="flex items-center gap-2"><span className={`text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ${simResult.type === 'optimize' ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'}`}>{simResult.title}</span><span className="text-xs text-slate-500 font-medium">{simResult.trials.toLocaleString()} trials · seed {mcSeed} · ±{(1.96 * simResult.standardError).toFixed(1)} pts</span></div>
                      <div className="text-2xl font-black font-mono text-slate-900 mt-1">{formatGBP(simResult.spend)} <span className="text-sm font-normal text-slate-600">/ year net spend</span></div>
                      {simResult.note && <div className="text-[11px] text-rose-700 font-semibold mt-1">{simResult.note}</div>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 w-full lg:w-auto text-xs border-t lg:border-t-0 border-slate-200/80 pt-3 lg:pt-0">
                    <div className="bg-white/80 p-3 rounded-xl border border-slate-200/80 shadow-2xs"><span className="text-slate-500 block mb-0.5">Survival Rate</span><span className={`text-base font-black font-mono ${simResult.successRate >= 90 ? 'text-emerald-700' : simResult.successRate >= 75 ? 'text-amber-700' : 'text-rose-700'}`}>{simResult.successRate.toFixed(1)}%</span></div>
                    <div className="bg-white/80 p-3 rounded-xl border border-slate-200/80 shadow-2xs"><span className="text-slate-500 block mb-0.5">Age of Failure</span><span className={`text-base font-black font-mono ${!simResult.medianFailAge ? 'text-emerald-700' : simResult.medianFailAge < nmpa ? 'text-rose-700' : 'text-amber-700'}`}>{simResult.medianFailAge ? `Age ${simResult.medianFailAge}` : 'None'}</span><span className="text-[10px] text-slate-400 block mt-0.5 font-mono truncate">{simResult.medianFailAge ? `Median of failures (earliest ${simResult.earliestFailAge})` : '100% Solvency'}</span></div>
                    <div className="bg-white/80 p-3 rounded-xl border border-slate-200/80 shadow-2xs"><span className="text-slate-500 block mb-0.5">Pre-access failures</span><span className={`text-base font-black font-mono ${simResult.preNmpaFailRate > 5 ? 'text-rose-700' : 'text-slate-700'}`}>{simResult.preNmpaFailRate.toFixed(1)}%</span></div>
                    <div className="bg-white/80 p-3 rounded-xl border border-slate-200/80 shadow-2xs"><span className="text-slate-500 block mb-0.5">10th %ile Pot @ {terminalAge}</span><span className="text-base font-bold font-mono text-rose-700">{formatGBP(simResult.p10Terminal)}</span></div>
                    <div className="bg-white/80 p-3 rounded-xl border border-slate-200/80 shadow-2xs"><span className="text-slate-500 block mb-0.5">Median Pot @ {terminalAge}</span><span className="text-base font-bold font-mono text-blue-700">{formatGBP(simResult.medianTerminal)}</span>{ctx.pensionDeathTaxRate > 0 && <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">net of pension death tax {formatGBP(simResult.medianTerminalNet)}</span>}</div>
                    <div className="bg-white/80 p-3 rounded-xl border border-slate-200/80 shadow-2xs"><span className="text-slate-500 block mb-0.5">90th %ile Pot @ {terminalAge}</span><span className="text-base font-bold font-mono text-emerald-700">{formatGBP(simResult.p90Terminal)}</span><span className="text-[10px] text-slate-400 block mt-0.5 font-mono">median lifetime tax {formatGBP(simResult.medianLifetimeTax)}</span></div>
                  </div>
                </div>
                {simResult.preNmpaFailRate > 0 && (
                  <div className="mt-3.5 p-3 bg-rose-100/90 border border-rose-300 rounded-xl text-xs text-rose-950 flex items-start gap-2.5 shadow-2xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div><strong className="font-bold">Pre-Pension Bridge Exhaustion in {simResult.preNmpaFailRate.toFixed(1)}% of paths:</strong> non-pension investments (S&amp;S ISAs, other investments and cash) ran out while pension money was still locked (access age {nmpa}). Consider shifting contributions to your S&amp;S ISA, a later retirement age, or run the tournament below.</div>
                  </div>
                )}
              </div>
            )}

            <WrapperStrategyTournament plan={plan} ctx={ctx} seed={mcSeed} onApplyStrategyToSandbox={handleApplyStrategyToSandbox} onNavigateDocs={() => goToDoc('doc-tournament')} />
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
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div><h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Select Historical Scenario or Start Year</h3><span className="text-[11px] text-slate-500">Select an iconic crisis preset or slide to any year between {E.HISTORICAL_FIRST_YEAR} and {maxHistoricalStartYear}.</span></div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-indigo-700"><span>Start Year:</span><input type="number" min={E.HISTORICAL_FIRST_YEAR} max={maxHistoricalStartYear} value={activeHistoricalStartYear} onChange={(e) => setSelectedHistoricalYear(Math.max(E.HISTORICAL_FIRST_YEAR, Math.min(maxHistoricalStartYear, Number(e.target.value) || E.HISTORICAL_FIRST_YEAR)))} className="w-16 p-1 bg-white border border-slate-300 rounded text-center text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-500" /></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {HISTORICAL_PRESETS.map(p => {
                  const isValid = p.year <= maxHistoricalStartYear;
                  return (
                    <button key={p.year} onClick={() => isValid && setSelectedHistoricalYear(p.year)} disabled={!isValid} className={`p-2.5 rounded-xl border text-left transition-all ${!isValid ? 'bg-slate-50 text-slate-300 border-slate-200/50 cursor-not-allowed opacity-50' : activeHistoricalStartYear === p.year ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs cursor-pointer' : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer'}`}>
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
                  <div className="flex items-center gap-2">{historicalMetrics.survived ? <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" /> : <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />}<div><div className={`text-base font-black ${historicalMetrics.survived ? 'text-emerald-800' : 'text-rose-800'}`}>{historicalMetrics.survived ? `Survived to Age ${terminalAge}` : `${historicalMetrics.failReason === 'floor' ? 'Below floor' : 'Depleted'} at Age ${historicalMetrics.failAge}`}</div><span className="text-[11px] text-slate-500">{historicalMetrics.survived ? 'Zero insolvency detected' : `Failed in plan year ${historicalMetrics.failYear} (${historicalMetrics.failReason})`}</span></div></div>
                </div>
                <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs"><span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 mb-1">Starting Balance (Today)</span><div className="text-xl font-bold font-mono text-slate-900 mt-1">{formatGBP(historicalMetrics.startVal)}</div><span className="text-[11px] text-slate-400">After year-0 flows, at Age {currentAge}</span></div>
                <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs"><span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 mb-1">Lowest Portfolio Trough</span><div className="text-xl font-bold font-mono text-amber-700 mt-1">{formatGBP(historicalMetrics.minVal)}</div><span className="text-[11px] text-slate-400">Lowest total experienced</span></div>
                <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs"><span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 mb-1">Terminal Pot @ {terminalAge}</span><div className={`text-xl font-bold font-mono mt-1 ${historicalMetrics.terminalVal > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>{formatGBP(historicalMetrics.terminalVal)}</div><span className="text-[11px] text-slate-400">Real purchasing power remaining · lifetime tax {formatGBP(historicalMetrics.lifetimeTax)}</span></div>
              </div>
            )}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <div><h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Historical Wealth Path (Simulating {activeHistoricalStartYear}–{activeHistoricalStartYear + spanYears})</h3><span className="text-xs text-slate-500">Real purchasing power across accumulation and decumulation</span></div>
              <div className="relative overflow-x-auto">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto select-none" onMouseLeave={() => setHoveredHistPoint(null)}>
                  <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {histYScale.ticks(6).map((t, i) => <g key={i} transform={`translate(0, ${histYScale(t)})`}><line x2={innerWidth} stroke="#f1f5f9" strokeDasharray="3,3" /><text x={-10} dy="0.32em" fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">£{(t / 1000).toFixed(0)}k</text></g>)}
                    {histXScale.ticks(10).map((t, i) => <g key={i} transform={`translate(${histXScale(t)}, 0)`}><line y2={innerHeight} stroke="#f8fafc" /><text y={innerHeight + 20} fill="#64748b" fontSize="11" textAnchor="middle" fontFamily="monospace">{t}</text></g>)}
                    {markers(histXScale)}
                    {histLinePath && <path d={histLinePath} fill="none" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />}
                    <rect width={innerWidth} height={innerHeight} fill="transparent" onMouseMove={(e) => { const rect = e.currentTarget.getBoundingClientRect(); const age = Math.round(histXScale.invert((e.clientX - rect.left) * (innerWidth / Math.max(1, rect.width)))); setHoveredHistPoint(historicalTimeline.find(d => d.ageSelf === age) || null); }} />
                    {hoveredHistPoint && <g transform={`translate(${histXScale(hoveredHistPoint.ageSelf)}, 0)`}><line y2={innerHeight} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" /><circle cy={histYScale(hoveredHistPoint.totalCombined)} r="4" fill="#6366f1" stroke="#ffffff" strokeWidth="2" /></g>}
                  </g>
                </svg>
                {hoveredHistPoint && (
                  <div className="absolute top-4 left-24 bg-white/95 border border-slate-200 p-3 rounded-xl shadow-lg text-xs space-y-1 backdrop-blur-md pointer-events-none">
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
          <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div><h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Table className="w-4 h-4 text-blue-600" /> Year-by-Year Cash Flow &amp; Wrapper Ledger</h2><span className="text-xs text-slate-500">Expected-return path: contributions, guaranteed income, decumulation waterfall, tax and wrapper balances (end of year).</span></div>
              <button onClick={handleExportCSV} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200 cursor-pointer self-start sm:self-auto"><FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export CSV Spreadsheet</button>
            </div>
            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold font-sans"><tr><th className="p-2.5">Year</th><th className="p-2.5">Age (M)</th>{isCouple && <th className="p-2.5">Age (P)</th>}<th className="p-2.5">Spend Target</th><th className="p-2.5">Guaranteed + Take-home (net)</th><th className="p-2.5">Net Drawdown</th><th className="p-2.5">Pension Draw (gross)</th><th className="p-2.5">Tax</th>{P.cgtEnabled && <th className="p-2.5">CGT</th>}<th className="p-2.5">Pensions</th><th className="p-2.5">ISAs</th><th className="p-2.5">Other Inv</th><th className="p-2.5">Cash</th><th className="p-2.5">Total Combined</th><th className="p-2.5">Pre-access Liquid</th><th className="p-2.5 text-right">Status</th></tr></thead>
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
                      <td className="p-2 text-right">{r.preNmpaInsolvent ? <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-sans text-[10px] font-bold">Pre-access Gap</span> : r.unmetDemand > E.FAIL_TOLERANCE ? <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-sans text-[10px] font-bold">Shortfall {formatGBP(r.unmetDemand)}</span> : <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-sans text-[10px] font-bold">Solvent</span>}</td>
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
            <div id="doc-tournament" className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Zap className="w-4 h-4 text-indigo-600" /> Automated Strategy Tournament &amp; Optimization Methodology</h2>
              <p className="text-xs text-slate-600 leading-relaxed">The tournament compares six ways of splitting the same annual take-home budget between S&amp;S ISAs and pensions. Every player is run on the same {TOURNAMENT_TRIALS.toLocaleString()} market paths (common random numbers), so the ranking reflects the strategies rather than sampling luck.</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1"><strong className="text-slate-800 block">1. Equal net budget</strong><p className="text-slate-500">Each strategy costs the same take-home pay. Pension money is grossed up using each owner's own salary (income tax + NIC relief, plus any employer NIC pass-through set in Config), capped by the annual allowance (£{P.pensionAllowance.toLocaleString()}) and salary; ISA money is capped at £{P.isaAllowance.toLocaleString()} per person; anything left over flows to a GIA.</p></div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1"><strong className="text-slate-800 block">2. Conservative bridge sizing</strong><p className="text-slate-500">If spending starts before anyone can access a pension (age {nmpa}), the bridge reserve is the sum of net drawdown in those years (after guaranteed income and a working partner's take-home), uplifted by the safety margin ({E.num(plan?.config?.bridgeSafetyMargin, 30)}%) and assuming 0% real growth.</p></div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1"><strong className="text-slate-800 block">3. The players</strong><p className="text-slate-500"><strong>Current Plan</strong> · <strong>Survival Maximizer</strong> (searches the ISA share from 0% to 100% and keeps the best survival, subject to the bridge-risk cap) · <strong>Liquidity-First</strong> (ISA allowances first) · <strong>Relief-First</strong> (pension first, bridge minimum kept; with a Bed &amp; SIPP transfer of spare ISA capital in full scope) · <strong>Bracket-Smoothed Sizing</strong> (pension funded only to the pot whose sustainable withdrawal plus state pension fills the basic-rate band, the rest to ISA) · <strong>Relief-First, Bridge-Last</strong> (pension-max early, ISA-max in the final years before retirement).</p></div>
                <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1"><strong className="text-slate-800 block">4. Reading the results</strong><p className="text-slate-500">Rank by survival first; ties within 0.5 points are broken by the 10th-percentile pot. Watch the pre-access failure rate: a strategy can win on total survival by accepting more bridge risk. The "Partner balancing" option steers new money to the partner with the smaller projected pension so both personal allowances can be used in retirement; it costs relief if that partner pays a lower marginal rate, so it does not always win.</p></div>
              </div>
            </div>

            <div id="doc-decumulation" className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Sliders className="w-4 h-4 text-blue-600" /> Decumulation Policies &amp; Pension Drawdown Strategies</h2>
              <p className="text-xs text-slate-600 leading-relaxed">How money is withdrawn across wrappers changes lifetime tax and the size of the pot left at the end; it changes the probability of maintaining your living costs far less than the spend level, asset allocation and the pre-access bridge do.</p>
              <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1.5">
                <li><strong>Tax Smoothing (default):</strong> fills the £{P.pa.toLocaleString()} allowance from pension income (0%), then draws pension income up to the £{P.basicLimit.toLocaleString()} higher-rate threshold (about {Math.round((1 - P.pclsProp) * P.basicRate * 100)}% effective with the {Math.round(P.pclsProp * 100)}% tax-free element), then cash, GIA and ISA, with pension income above the threshold as the last resort. Cash and ISAs are preserved as the low-volatility reserve and the tax-free shield for later life.</li>
                <li><strong>UK FIRE Bracket Fill:</strong> draws pension only up to the £{P.pa.toLocaleString()} allowance, then cash, GIA and ISAs; pension income above the allowance is the last resort. Pays the least tax during your lifetime and leaves the largest pot, but that pot is mostly taxable pension — set the pension death-tax haircut in Config to see the difference net of what beneficiaries would pay.</li>
                <li><strong>Sequential:</strong> cash → GIA → ISA → pension, no bracket management. Shown as the naive baseline; it wastes the personal allowance in early retirement.</li>
                <li><strong>Harvest unused allowance:</strong> once retired and past age {nmpa}, any unused 0% allowance is filled from the pension and the net proceeds moved to ISA (within the £{P.isaAllowance.toLocaleString()} limit) or cash. It only matters when spending is largely covered by guaranteed income.</li>
                <li><strong>Phased Drawdown</strong> crystallizes {Math.round(P.pclsProp * 100)}% tax-free with each withdrawal (UFPLS-style), keeping the rest invested. <strong>Full Lump Sum</strong> moves the maximum tax-free cash (capped at £{P.lsa.toLocaleString()}) into cash savings at retirement; later withdrawals are then fully taxable.</li>
              </ul>
            </div>

            <div id="doc-salary-sacrifice" className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Zap className="w-4 h-4 text-indigo-600" /> Salary Sacrifice vs S&amp;S ISAs</h2>
              <p className="text-xs text-slate-600 leading-relaxed">Salary sacrifice redirects gross earnings into your pension before income tax and employee NIC are deducted. Relief is calculated from the salary you enter, so it correctly reflects the {Math.round(P.basicRate * 100)}% + {Math.round(P.nicMain * 100)}% basic-rate band, the {Math.round(P.higherRate * 100)}% + {Math.round(P.nicUpper * 100)}% higher-rate band, and the {Math.round((P.higherRate + P.nicUpper) * 100 + P.higherRate * 100 * P.taperRate)}% effective rate where the personal allowance is tapered (£{P.thr.toLocaleString()}–£{Math.round(P.taperEnd).toLocaleString()}).</p>
              <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                <li><strong>Day-one leverage:</strong> £1,000 of take-home becomes about £{Math.round(1000 / (1 - (P.higherRate + P.nicUpper))).toLocaleString()} inside a pension for a higher-rate taxpayer, versus £1,000 in an ISA. Employers sometimes add part of their own {Math.round(P.erNic * 100)}% NIC saving — set the pass-through in Config.</li>
                <li><strong>Exit tax:</strong> with {Math.round(P.pclsProp * 100)}% tax-free and the rest at the basic rate, the effective exit rate is about {Math.round((1 - P.pclsProp) * P.basicRate * 100)}%, so the pension keeps a large advantage unless withdrawals are pushed into higher rates — which is what Bracket-Smoothed Sizing guards against.</li>
                <li><strong>Constraints modelled:</strong> annual allowance £{P.pensionAllowance.toLocaleString()}, sacrifice limited to salary. Not modelled: the tapered annual allowance above £260k adjusted income, carry-forward, the National Minimum Wage floor, and the Lifetime ISA (worth considering below age 40).</li>
              </ul>
            </div>

            <div id="doc-taper" className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><HelpCircle className="w-4 h-4 text-blue-600" /> Lifestyle Spending Tapers</h2>
              <p className="text-xs text-slate-600 leading-relaxed">Retirement spending rarely stays constant. Research into spending curves suggests three phases:</p>
              <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                <li><strong>Go-Go Years:</strong> active travel, hobbies, home modifications and dining out in early retirement.</li>
                <li><strong>Slow-Go Years (Taper 1):</strong> spending on travel and lifestyle moderates naturally.</li>
                <li><strong>No-Go Years (Taper 2):</strong> a further decrease in leisure spending, partly offset by potential healthcare needs (not modelled — consider a one-off cost or a negative taper).</li>
              </ul>
              <p className="text-xs text-slate-600 leading-relaxed">Taper 2 applies to the post-Taper 1 figure: £40,000 with a 10% Taper 1 becomes £36,000, and a 10% Taper 2 then reduces that to £32,400. Tapers key off "Myself" ages.</p>
            </div>

            <div id="doc-risk-profiles" className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><ShieldCheck className="w-4 h-4 text-blue-600" /> Asset Allocations, Return Bounds &amp; Volatility (σ)</h2>
              <p className="text-xs text-slate-600 leading-relaxed">Each wrapper is assigned a risk tier with an expected real return (treated as the median annual rate), lucky/unlucky bounds for the deterministic chart, and a volatility used by the Monte Carlo. All wrappers move together (one market factor scaled by each tier's σ); the historical backtest blends real US equity and bond returns by the tier's equity weight ({Object.entries(E.RISK_EQUITY_WEIGHTS).map(([k, v]) => `${k.replace(' Risk', '')} ${Math.round(v * 100)}%`).join(', ')}).</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                {Object.entries(activeRiskMatrix).map(([k, v]) => (
                  <div key={k} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1"><span className="font-bold text-slate-800">{k} ({v.label})</span><p className="text-slate-500">Expected real {E.num(v.real, 0).toFixed(2)}% pa, σ = {E.num(v.volatility, 0).toFixed(1)}%.</p></div>
                ))}
              </div>
            </div>

            <div id="doc-one-off-deposits" className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Plus className="w-4 h-4 text-blue-600" /> One-Off Deposits &amp; Multi-Year Staging</h2>
              <p className="text-xs text-slate-600 leading-relaxed">A one-off deposit is a lump sum paid into a chosen wrapper in a chosen year. Because ISAs and pensions are capped each tax year, the engine checks the deposit against that year's remaining allowance before it lands.</p>

              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-1">Where the money comes from</h3>
              <p className="text-xs text-slate-600 leading-relaxed"><strong>External (new capital)</strong> is money arriving from outside the plan — an inheritance, a bonus, a property sale — and nothing is deducted from your existing pots. Choosing any wrapper instead treats it as an internal transfer: the full amount is taken out of that pot in the deposit year. If that pot does not hold enough at the time, the engine moves what is there and the rest is recorded as a shortfall.</p>

              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-1">How much fits this year (headroom)</h3>
              <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                <li><strong>S&amp;S ISA:</strong> {formatGBP(P.isaAllowance)} less whatever your regular ISA contribution is that year.</li>
                <li><strong>Carry forward:</strong> unused annual allowance from the previous three tax years is added to the current year's. Years inside the projection are worked out from your contribution schedule; for the three years before it starts the model has no data, so it assumes nothing unless you enter a figure under Advanced inputs. Carry forward never lifts the earnings limit, so it does nothing for someone with no relevant earnings.</li>
                <li><strong>Pension after flexible access:</strong> taking taxable pension income permanently replaces the allowance with the money purchase annual allowance of {formatGBP(P.mpaaLimit)}, and carry forward is no longer available. Taking only tax-free cash, or buying an annuity, does not trigger it. You do not enter this — the model works out the first year your plan draws taxable pension income and applies it from there.</li>
                <li><strong>Pension:</strong> {formatGBP(P.pensionAllowance)} — but capped at your <em>relevant UK earnings</em> — less your regular pension contribution that year. Only employment and self-employment income counts as earnings; DB pensions, annuities, rent, dividends and interest do not. With no relevant earnings the limit is <strong>{formatGBP(P.pensionNoEarningsLimit)}</strong>, which is what normally applies once you have retired. If you leave your salary blank while still working, the engine treats your earnings as unknown and does not constrain the allowance.</li>
                <li><strong>Other Investments and Cash Savings:</strong> no annual limit, so a deposit there is never staged.</li>
              </ul>
              <p className="text-xs text-slate-600 leading-relaxed">Headroom is therefore not a fixed number. It shrinks in later years if your regular contributions escalate, and it changes again at retirement, when regular contributions stop and the pension earnings test starts to bite. The card above the deposits table shows this tax year only — each deposit row shows the headroom for its own year.</p>

              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-1">If the deposit exceeds the headroom</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Rather than silently breaching the allowance, the deposit is staged across several tax years:</p>
              <ol className="list-decimal pl-5 text-xs text-slate-600 space-y-1">
                <li>As much as fits the current year's allowance goes straight into the target wrapper.</li>
                <li>The surplus is parked in <strong>Other Investments (GIA)</strong>, where it stays invested and grows at that account's risk tier. Once it has grown, moving it out is a disposal, so with CGT switched on each transfer year realises a proportional gain.</li>
                <li>At the start of each following tax year, as much as that year's allowance permits is moved from the GIA into the target wrapper, repeating until nothing is left. You can redirect where the staged money ends up from the row's settings icon.</li>
              </ol>
              <p className="text-xs text-slate-600 leading-relaxed">Where several deposits compete for the same person's allowance in the same year, they are resolved in date order, so one allowance is never counted twice. If a market fall shrinks the parked money, that year's transfer is capped at whatever the GIA actually holds. Anything still parked at the end of the plan stays in Other Investments and is flagged as a warning.</p>

              <p className="text-xs text-slate-500 leading-relaxed"><strong>Assumption:</strong> allowances are held fixed in real terms at the figures in Config ({formatGBP(P.isaAllowance)} ISA, {formatGBP(P.pensionAllowance)} pension, {formatGBP(P.pensionNoEarningsLimit)} with no earnings). Any future increase in these limits is <strong>not</strong> modelled, so a long staging schedule is a cautious estimate — if allowances do rise, the money would move across in fewer years than shown. You can edit the figures in Config to test a different assumption.</p>
            </div>

            <div id="doc-cgt" className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Wallet className="w-4 h-4 text-blue-600" /> Capital Gains Tax on Other Investments (GIA)</h2>
              <p className="text-xs text-slate-600 leading-relaxed">Pensions and ISAs shelter growth, but a general investment account does not. When CGT is switched on in Config, the engine tracks the <strong>cost basis</strong> of each person's GIA and charges tax on gains as they are realised.</p>

              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-1">Growth is not taxed until you sell</h3>
              <p className="text-xs text-slate-600 leading-relaxed">Holding costs nothing. Money paid in is added at cost; growth raises the value without raising the cost, so the unrealised gain builds up untaxed. Tax is only triggered by a disposal — funding your spending, paying a one-off cost, or moving money out under a staged deposit. Each disposal is treated as selling a slice of the whole holding, so the gain is the same proportion of the sale as the unrealised gain is of the pot.</p>
              <p className="text-xs text-slate-600 leading-relaxed">Example: a {formatGBP(100000)} GIA holding {formatGBP(40000)} of gain is 40% gain. Selling {formatGBP(10000)} realises {formatGBP(4000)}; the remaining {formatGBP(3000)} exemption leaves {formatGBP(1000)} taxable, so the bill is {formatGBP(180)} at the basic rate.</p>

              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-1">Rates and allowances</h3>
              <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                <li>Each person has a {formatGBP(P.cgtAnnualExempt)} annual exempt amount. If you have already realised gains this tax year, enter them in Plan Inputs so the current year's exemption is reduced; leaving it blank assumes the full allowance is available.</li>
                <li>Gains stack on top of that year's income: the part falling in your remaining basic-rate band is taxed at {Math.round(P.cgtBasicRate * 100)}%, anything above at {Math.round(P.cgtHigherRate * 100)}%.</li>
                <li>The bill is settled from cash, then the GIA, then ISAs, then an accessible pension — the same order used for one-off costs. Selling to pay the bill realises a little more gain, which is carried into the next year, mirroring the fact that CGT is due the January after the tax year.</li>
              </ul>

              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider pt-1">Setting your opening position</h3>
              <p className="text-xs text-slate-600 leading-relaxed">The "of which unrealised gain" figure on the GIA row tells the engine how much of today's balance is profit. Left blank, the balance is treated as entirely cost, so only future growth is ever taxed — a deliberately cautious default. If you hold long-standing investments with a large embedded gain, enter it, or the model will understate your tax.</p>

              <p className="text-xs text-slate-500 leading-relaxed"><strong>Deliberate omissions:</strong> gains are wiped by the uplift on death, so nothing is charged on whatever remains at the terminal age — a real reason to spend other wrappers first. Dividends and interest inside the GIA are not modelled separately, share pooling and the 30-day rule are ignored, and the exempt amount and rates are held flat in real terms at the Config figures.</p>
            </div>

            <div id="doc-one-offs" className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2"><Coins className="w-4 h-4 text-blue-600" /> One-Off Cost Liquidation Hierarchy</h2>
              <p className="text-xs text-slate-600 leading-relaxed">When a one-off capital cost is scheduled, the engine liquidates assets in this order:</p>
              <ol className="list-decimal pl-5 text-xs text-slate-600 space-y-1">
                <li><strong>Cash Savings</strong> (both owners), then <strong>Other Investments (GIA)</strong>, then <strong>Stocks &amp; Shares ISAs</strong>.</li>
                <li><strong>Pensions</strong>, but only for an owner who has reached the access age ({nmpa}). If the cost still cannot be met, the year is flagged as a shortfall — or a pre-access gap when pension money existed but was locked.</li>
              </ol>
              <p className="text-xs text-slate-500">Known simplifications: state pension is held flat in real terms (no triple-lock uplift), tax thresholds and allowances are held flat in real terms, and the death of a partner is not modelled.</p>
              <p className="text-xs text-slate-500 leading-relaxed"><strong>Pension allowance limitations.</strong> The model assumes you have <strong>not</strong> yet flexibly accessed a pension, because it is built for planning towards retirement rather than for someone already drawing an income. If you have already taken taxable pension income, your annual allowance is already {formatGBP(P.mpaaLimit)} and the projection will overstate how much you can contribute until the year it starts drawing. Carry forward is also worked out independently for each year rather than being consumed as it is used, so several large staged deposits in overlapping years could each count the same unused allowance. Neither the tapered annual allowance for high earners nor annual allowance charges themselves are modelled.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
