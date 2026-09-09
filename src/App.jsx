import React, { useState, useMemo, useRef, useEffect } from 'react';
import * as d3 from 'd3';
import {
  TrendingUp,
  Layers,
  Check,
  RotateCcw,
  Calculator,
  Dices,
  Zap,
  Award,
  ShieldCheck,
  Target,
  Sliders,
  Download,
  Upload,
  Users,
  Wallet,
  Coins,
  Settings,
  Plus,
  Trash2,
  Table,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Pencil,
  Info,
  HelpCircle,
  BookOpen,
  ArrowRight,
  UserCheck,
  History,
  Bookmark,
  Save,
  Sparkles,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const STORAGE_KEY = 'rp_plan_full_v28';
const SCENARIOS_STORAGE_KEY = 'rp_saved_scenarios_v3';

// 98-Year Empirical Dataset (1928–2025): Real S&P 500 (s) and 50/50 Govt/Corp Real Bond (b) Returns
export const HISTORICAL_DATA = [
  { y: 1928, s: 45.49, b: 3.22 }, { y: 1929, s: -8.83, b: 3.01 }, { y: 1930, s: -20.01, b: 9.55 }, { y: 1931, s: -38.07, b: 0.22 },
  { y: 1932, s: 1.82, b: 29.49 }, { y: 1933, s: 48.85, b: 6.6 }, { y: 1934, s: -2.66, b: 11.7 }, { y: 1935, s: 42.49, b: 5.73 },
  { y: 1936, s: 30.06, b: 6.66 }, { y: 1937, s: -37.13, b: -4.25 }, { y: 1938, s: 32.98, b: 9.77 }, { y: 1939, s: -1.1, b: 6.2 },
  { y: 1940, s: -11.31, b: 6.27 }, { y: 1941, s: -20.65, b: -7.67 }, { y: 1942, s: 9.3, b: -4.86 }, { y: 1943, s: 21.47, b: 2.24 },
  { y: 1944, s: 16.36, b: 2.22 }, { y: 1945, s: 32.84, b: 2.99 }, { y: 1946, s: -22.48, b: -12.96 }, { y: 1947, s: -3.34, b: -7.58 },
  { y: 1948, s: 2.63, b: -0.29 }, { y: 1949, s: 20.81, b: 7.25 }, { y: 1950, s: 23.48, b: -3.4 }, { y: 1951, s: 16.68, b: -5.89 },
  { y: 1952, s: 17.27, b: 2.58 }, { y: 1953, s: -1.94, b: 2.12 }, { y: 1954, s: 53.71, b: 5.51 }, { y: 1955, s: 32.1, b: -0.02 },
  { y: 1956, s: 4.33, b: -5.14 }, { y: 1957, s: -12.98, b: 0.14 }, { y: 1958, s: 41.23, b: 0.4 }, { y: 1959, s: 10.15, b: -2.23 },
  { y: 1960, s: -1.01, b: 7.69 }, { y: 1961, s: 25.79, b: 2.89 }, { y: 1962, s: -10.01, b: 4.7 }, { y: 1963, s: 20.63, b: 1.9 },
  { y: 1964, s: 15.3, b: 3.44 }, { y: 1965, s: 10.28, b: 0.03 }, { y: 1966, s: -12.98, b: -3.6 }, { y: 1967, s: 20.15, b: -3.28 },
  { y: 1968, s: 5.82, b: -0.63 }, { y: 1969, s: -13.6, b: -9.15 }, { y: 1970, s: -1.9, b: 5.33 }, { y: 1971, s: 10.61, b: 8.35 },
  { y: 1972, s: 14.84, b: 3.59 }, { y: 1973, s: -21.17, b: -4.34 }, { y: 1974, s: -34.04, b: -12.05 }, { y: 1975, s: 28.11, b: 0.37 },
  { y: 1976, s: 18.09, b: 12.4 }, { y: 1977, s: -12.82, b: -1.01 }, { y: 1978, s: -2.3, b: -7.19 }, { y: 1979, s: 4.61, b: -12.32 },
  { y: 1980, s: 17.08, b: -13.93 }, { y: 1981, s: -12.51, b: -0.54 }, { y: 1982, s: 15.98, b: 26.1 }, { y: 1983, s: 17.87, b: 5.69 },
  { y: 1984, s: 2.11, b: 10.32 }, { y: 1985, s: 26.43, b: 20.22 }, { y: 1986, s: 17.21, b: 21.55 }, { y: 1987, s: 1.32, b: -5.52 },
  { y: 1988, s: 11.6, b: 6.94 }, { y: 1989, s: 25.64, b: 11.56 }, { y: 1990, s: -8.64, b: 0.08 }, { y: 1991, s: 26.36, b: 12.97 },
  { y: 1992, s: 4.46, b: 7.64 }, { y: 1993, s: 7.03, b: 12.24 }, { y: 1994, s: -1.31, b: -7.16 }, { y: 1995, s: 33.8, b: 18.8 },
  { y: 1996, s: 18.74, b: -0.21 }, { y: 1997, s: 30.88, b: 9.03 }, { y: 1998, s: 26.3, b: 9.67 }, { y: 1999, s: 17.72, b: -6.22 },
  { y: 2000, s: -12.01, b: 9.29 }, { y: 2001, s: -13.2, b: 5.07 }, { y: 2002, s: -23.78, b: 11.01 }, { y: 2003, s: 25.99, b: 4.98 },
  { y: 2004, s: 7.25, b: 3.81 }, { y: 2005, s: 1.37, b: 0.46 }, { y: 2006, s: 12.75, b: 1.92 }, { y: 2007, s: 1.35, b: 2.5 },
  { y: 2008, s: -36.61, b: 7.42 }, { y: 2009, s: 22.6, b: 3.3 }, { y: 2010, s: 13.13, b: 6.81 }, { y: 2011, s: -0.84, b: 11.02 },
  { y: 2012, s: 13.91, b: 4.72 }, { y: 2013, s: 30.19, b: -6.48 }, { y: 2014, s: 12.67, b: 9.74 }, { y: 2015, s: 0.64, b: -0.43 },
  { y: 2016, s: 9.5, b: 3.38 }, { y: 2017, s: 19.09, b: 4.07 }, { y: 2018, s: -6.02, b: -3.24 }, { y: 2019, s: 28.28, b: 9.97 },
  { y: 2020, s: 16.44, b: 9.38 }, { y: 2021, s: 19.95, b: -8.26 }, { y: 2022, s: -22.96, b: -21.22 }, { y: 2023, s: 22.2, b: 3.73 },
  { y: 2024, s: 21.51, b: 0.98 }, { y: 2025, s: 14.78, b: 2.86 }
];

export const RISK_EQUITY_WEIGHTS = {
  'High Risk': 0.90,
  'Medium/High Risk': 0.70,
  'Medium Risk': 0.50,
  'Medium/Low Risk': 0.30,
  'Low Risk': 0.10,
  'Cash Equivalents': 0.00
};

export const getHistoricalPoint = (startYear, t) => {
  const targetYear = Number(startYear) + t;
  return HISTORICAL_DATA.find(d => d.y === targetYear) || null;
};

export const DEFAULT_RISK_PROFILES = {
  'High Risk': { label: '80–100% Equities', real: 4.44, unlucky: 1.66, lucky: 7.31, nominal: 7.05, volatility: 15.5 },
  'Medium/High Risk': { label: '60–80% Equities', real: 3.72, unlucky: 1.38, lucky: 6.13, nominal: 6.31, volatility: 11.5 },
  'Medium Risk': { label: '40–60% Equities', real: 3.00, unlucky: 1.10, lucky: 4.95, nominal: 5.58, volatility: 8.0 },
  'Medium/Low Risk': { label: '20–40% Equities', real: 2.28, unlucky: 0.82, lucky: 3.77, nominal: 4.84, volatility: 5.5 },
  'Low Risk': { label: 'High interest Cash Savings, Fixed Income, Bonds', real: 1.56, unlucky: 0.54, lucky: 2.59, nominal: 4.10, volatility: 3.0 },
  'Cash Equivalents': { label: 'instant cash savings/money market', real: -0.50, unlucky: -1.00, lucky: 0.00, nominal: 1.99, volatility: 0.5 }
};

const parseInputNumber = (val) => {
  if (val === '' || val === null || val === undefined) return '';
  return String(val).replace(/^0+(?=\d)/, '');
};

const calculateYearFraction = (dateStr) => {
  if (!dateStr) return 0.315;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return 0.315;
  const year = d.getFullYear();
  const start = new Date(year, 0, 1).getTime();
  const end = new Date(year + 1, 0, 1).getTime();
  return Math.max(0.01, Math.min(1.0, (end - d.getTime()) / (end - start)));
};

const BLANK_PLAN = {
  activeProfileView: 'Combined',
  demographics: {
    planningMode: 'couple',
    currentAgeSelf: '',
    currentAgePart: '',
    retireAgeSelf: '',
    retireAgePart: '',
    statePensionAge: 68,
    privatePensionAge: 58,
    statePensionSelf: '',
    statePensionPart: '',
    terminalAge: 100
  },
  spending: {
    targetSpend: '',
    taper1Age: '',
    taper1Rate: '',
    taper2Age: '',
    taper2Rate: '',
    drawdownStrategy: 'Phased Drawdown',
    decumulationPolicy: 'Bracket Fill'
  },
  accounts: [
    { id: 'pen_self', owner: 'Myself', category: 'Pensions', balance: '', contrib: '', growth: '', risk: 'High Risk' },
    { id: 'isa_self', owner: 'Myself', category: 'S&S ISAs', balance: '', contrib: '', growth: '', risk: 'High Risk' },
    { id: 'other_self', owner: 'Myself', category: 'Other Investments', balance: '', contrib: '', growth: '', risk: 'Low Risk' },
    { id: 'cash_self', owner: 'Myself', category: 'Cash Savings', balance: '', contrib: '', growth: '', risk: 'Low Risk' },
    { id: 'pen_part', owner: 'Partner', category: 'Pensions', balance: '', contrib: '', growth: '', risk: 'High Risk' },
    { id: 'isa_part', owner: 'Partner', category: 'S&S ISAs', balance: '', contrib: '', growth: '', risk: 'High Risk' },
    { id: 'other_part', owner: 'Partner', category: 'Other Investments', balance: '', contrib: '', growth: '', risk: 'Medium Risk' },
    { id: 'cash_part', owner: 'Partner', category: 'Cash Savings', balance: '', contrib: '', growth: '', risk: 'Medium Risk' }
  ],
  riskProfiles: DEFAULT_RISK_PROFILES,
  otherIncomes: [],
  oneOffContributions: [],
  oneOffCosts: [],
  config: {
    valuationDate: new Date().toISOString().slice(0, 10),
    inflation: 2.5,
    personalAllowance: 12570,
    paTaperThreshold: 100000,
    basicBandLimit: 50270,
    basicTaxRate: 20.0,
    higherBandLimit: 125140,
    higherTaxRate: 40.0,
    additionalTaxRate: 45.0,
    pclsProportion: 25.0,
    pclsMaxCap: 268275,
    solvencyFloor: 0
  }
};

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

// UK Tax & NIC Helper Methods
export function calculateUKTaxAndNIC(income) {
  let pa = 12570;
  if (income > 100000) pa = Math.max(0, 12570 - (income - 100000) * 0.5);
  let taxable = Math.max(0, income - pa);
  let tax = 0;
  if (taxable > 0) {
    const basic = Math.min(taxable, Math.max(0, 50270 - 12570));
    tax += basic * 0.20;
    taxable -= basic;
  }
  if (taxable > 0) {
    const higher = Math.min(taxable, 125140 - 50270);
    tax += higher * 0.40;
    taxable -= higher;
  }
  if (taxable > 0) tax += taxable * 0.45;

  let nic = 0;
  if (income > 12570) {
    const mainBand = Math.min(income, 50270) - 12570;
    nic += mainBand * 0.08;
  }
  if (income > 50270) {
    nic += (income - 50270) * 0.02;
  }
  return tax + nic;
}

export function calculateMarginalRelief(salaryInput, grossSacrifice) {
  const gross = Number(grossSacrifice) || 0;
  if (gross <= 0) return { netCost: 0, taxSaved: 0, reliefRate: 42.0 };
  if (!salaryInput || Number(salaryInput) <= 0) {
    const taxSaved = gross * 0.42;
    return { netCost: gross - taxSaved, taxSaved, reliefRate: 42.0 };
  }
  const salary = Number(salaryInput);
  const initialDeductions = calculateUKTaxAndNIC(salary);
  const postSacrificeDeductions = calculateUKTaxAndNIC(Math.max(0, salary - gross));
  const taxSaved = initialDeductions - postSacrificeDeductions;
  const netCost = gross - taxSaved;
  const reliefRate = gross > 0 ? (taxSaved / gross) * 100 : 42.0;
  return { netCost, taxSaved, reliefRate };
}

export function grossUpNet(netAmount, salaryInput) {
  const net = Number(netAmount) || 0;
  if (net <= 0) return 0;
  if (!salaryInput || Number(salaryInput) <= 0) {
    return net / 0.58;
  }
  let low = net;
  let high = net * 3.0;
  for (let i = 0; i < 22; i++) {
    const mid = (low + high) / 2;
    const { netCost } = calculateMarginalRelief(salaryInput, mid);
    if (netCost < net) low = mid;
    else high = mid;
  }
  return low;
}

function calculateUKNetIncome(grossTaxable, config) {
  const gross = Number(grossTaxable) || 0;
  if (gross <= 0) return 0;
  const paBase = Number(config.personalAllowance) || 12570;
  const taperThreshold = Number(config.paTaperThreshold) || 100000;
  const basicLimit = Number(config.basicBandLimit) || 50270;
  const basicRate = (Number(config.basicTaxRate) || 20) / 100;
  const higherLimit = Number(config.higherBandLimit) || 125140;
  const higherRate = (Number(config.higherTaxRate) || 40) / 100;
  const addRate = (Number(config.additionalTaxRate) || 45) / 100;

  let pa = paBase;
  if (gross > taperThreshold) {
    pa = Math.max(0, paBase - (gross - taperThreshold) * 0.5);
  }
  let taxable = Math.max(0, gross - pa);
  let tax = 0;
  if (taxable > 0) {
    const basicBracket = Math.max(0, basicLimit - paBase);
    const basicTaxable = Math.min(taxable, basicBracket);
    tax += basicTaxable * basicRate;
    taxable -= basicTaxable;
  }
  if (taxable > 0) {
    const higherBracket = Math.max(0, higherLimit - basicLimit);
    const higherTaxable = Math.min(taxable, higherBracket);
    tax += higherTaxable * higherRate;
    taxable -= higherTaxable;
  }
  if (taxable > 0) {
    tax += taxable * addRate;
  }
  return gross - tax;
}

function grossPensionNeededForNet(netTarget, otherTaxableIncome = 0, config, isFullyCrystallized = false, pclsHeadroom = 268275, maxTaxableCeiling = Infinity) {
  const target = Number(netTarget) || 0;
  if (target <= 0) return 0;
  const pclsProp = (Number(config.pclsProportion) || 25) / 100;
  let low = target;
  let high = target * 2.5;

  for (let i = 0; i < 22; i++) {
    const mid = (low + high) / 2;
    let taxFree = 0;
    let taxablePart = mid;

    if (!isFullyCrystallized && pclsHeadroom > 0) {
      taxFree = Math.min(mid * pclsProp, pclsHeadroom);
      taxablePart = mid - taxFree;
    }

    if (otherTaxableIncome + taxablePart > maxTaxableCeiling) {
      high = mid;
      continue;
    }

    const currentNetWithout = calculateUKNetIncome(otherTaxableIncome, config);
    const newNetWith = calculateUKNetIncome(otherTaxableIncome + taxablePart, config);
    const generatedNet = taxFree + (newNetWith - currentNetWithout);

    if (Math.abs(generatedNet - target) < 1) return mid;
    if (generatedNet < target) low = mid;
    else high = mid;
  }
  return low;
}

// Sub-Component: Salary Sacrifice vs ISA Ratio Optimizer
function SalarySacrificeOptimizer({ plan, onApplyToSandbox, onApplyToPlan, onNavigateDocs }) {
  const [grossSalary, setGrossSalary] = useState('');

  const currentPen = Number(plan.accounts.find(a => a.id === 'pen_self')?.contrib) || 0;
  const currentIsa = Number(plan.accounts.find(a => a.id === 'isa_self')?.contrib) || 0;
  const totalExistingInvested = currentPen + currentIsa;

  const curAge = Number(plan.demographics.currentAgeSelf) || 40;
  const retAge = Number(plan.demographics.retireAgeSelf) || 60;
  const realRate = 0.044;

  const currentNetCostOfPension = calculateMarginalRelief(grossSalary, currentPen).netCost;
  const currentTotalTakeHomeCost = currentIsa + currentNetCostOfPension;

  const baselineRatio = currentTotalTakeHomeCost > 0
    ? Math.round((currentNetCostOfPension / currentTotalTakeHomeCost) * 100)
    : 50;

  const [pensionPercent, setPensionPercent] = useState(baselineRatio);

  useEffect(() => {
    setPensionPercent(baselineRatio);
  }, [baselineRatio]);

  let newPensionContrib = currentPen;
  let newIsaContrib = currentIsa;

  if (currentTotalTakeHomeCost > 0) {
    const targetNetPension = currentTotalTakeHomeCost * (pensionPercent / 100);
    newIsaContrib = Math.max(0, currentTotalTakeHomeCost * (1 - pensionPercent / 100));
    newPensionContrib = Math.max(0, grossUpNet(targetNetPension, grossSalary));
  }

  const newTotalNominal = newPensionContrib + newIsaContrib;
  const dayOneDelta = newTotalNominal - totalExistingInvested;
  const dayOnePercentBoost = totalExistingInvested > 0 ? (dayOneDelta / totalExistingInvested) * 100 : 0;

  const netExitFactor = 0.85;
  const calculateWealthMultiple = (years) => {
    if (currentTotalTakeHomeCost <= 0) return 1.0;
    const fvNewNet = (newIsaContrib + newPensionContrib * netExitFactor) * ((Math.pow(1 + realRate, years) - 1) / realRate);
    const fvAllIsa = currentTotalTakeHomeCost * ((Math.pow(1 + realRate, years) - 1) / realRate);
    return fvAllIsa > 0 ? (fvNewNet / fvAllIsa) : 1.0;
  };

  const yearsToRetire = Math.max(1, retAge - curAge);
  const yearsTo80 = Math.max(1, 80 - curAge);
  const yearsTo100 = Math.max(1, 100 - curAge);

  const mRetire = calculateWealthMultiple(yearsToRetire);
  const m80 = calculateWealthMultiple(yearsTo80);
  const m100 = calculateWealthMultiple(yearsTo100);

  return (
    <div className="p-4 sm:p-5 bg-gradient-to-br from-indigo-50/90 via-blue-50/50 to-slate-50 border border-indigo-100 rounded-2xl shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-indigo-100/70">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-600 text-white rounded-lg">
            <Zap className="w-4 h-4 fill-amber-300 text-amber-300" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
              Salary Sacrifice &amp; Wrapper Optimizer
            </h4>
            <span className="text-[11px] text-slate-500">
              Rebalance your existing investment budget between S&amp;S ISA and pre-tax Pension salary sacrifice.
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onNavigateDocs}
          className="text-xs text-indigo-600 hover:text-indigo-800 hover:underline font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
        >
          <HelpCircle className="w-3.5 h-3.5" />
          How pre-tax salary sacrifice works &rarr;
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans items-start">
        <div>
          <label className="text-slate-700 font-semibold block mb-1">Gross Annual Salary (£)</label>
          <input
            type="number"
            placeholder="e.g. 65000 (assumes 40% Higher Rate if blank)"
            value={grossSalary}
            onChange={(e) => setGrossSalary(e.target.value)}
            className="w-full p-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 font-bold focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
          <p className="text-[11px] text-slate-500 mt-1 leading-normal">
            add your salary to check how much salary sacrifice could boost your portfolio vs S&amp;S ISA, if you leave this blank it will assume savings are all higher rate tax payer.
          </p>
        </div>

        <div className="bg-white/80 p-3.5 rounded-xl border border-indigo-100 space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-slate-600 font-semibold">Allocation Ratio:</span>
            <span className="text-xs font-bold text-indigo-700 font-mono">
              {100 - pensionPercent}% ISA / {pensionPercent}% Pension
            </span>
          </div>

          <input
            type="range"
            min="0"
            max="100"
            step="1"
            value={pensionPercent}
            onChange={(e) => setPensionPercent(Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer"
          />

          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>100% ISA (£0 Pen)</span>
            <span className="text-indigo-600 font-bold">Base: {baselineRatio}% Pen</span>
            <span>100% Pen (£0 ISA)</span>
          </div>

          <div className="pt-1 border-t border-slate-100 text-[11px] text-slate-600 flex justify-between font-mono">
            <span>Current Total: <strong>£{totalExistingInvested.toLocaleString()}/yr</strong></span>
            <span className="text-indigo-700 font-bold">New Total: £{Math.round(newTotalNominal).toLocaleString()}/yr</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-xs">
        <div className="p-3 bg-white/90 border border-indigo-100 rounded-xl">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Day-1 Capital Boost</span>
          <span className={`text-base font-black font-mono ${dayOneDelta >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {dayOneDelta >= 0 ? '+' : ''}£{Math.round(dayOneDelta).toLocaleString()}
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5 font-mono">{dayOnePercentBoost >= 0 ? '+' : ''}{dayOnePercentBoost.toFixed(1)}% nominal boost</span>
        </div>

        <div className="p-3 bg-white/90 border border-indigo-100 rounded-xl">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Multiple @ Retire ({retAge})</span>
          <span className="text-base font-black font-mono text-indigo-700">
            {mRetire.toFixed(2)}x
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Net wealth vs 100% ISA</span>
        </div>

        <div className="p-3 bg-white/90 border border-indigo-100 rounded-xl">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Multiple @ Age 80</span>
          <span className="text-base font-black font-mono text-indigo-700">
            {m80.toFixed(2)}x
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Net wealth vs 100% ISA</span>
        </div>

        <div className="p-3 bg-white/90 border border-indigo-100 rounded-xl">
          <span className="text-[10px] text-slate-500 uppercase font-bold block">Multiple @ Age 100</span>
          <span className="text-base font-black font-mono text-indigo-700">
            {m100.toFixed(2)}x
          </span>
          <span className="text-[10px] text-slate-400 block mt-0.5">Purchasing power multiple</span>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 pt-1 border-t border-indigo-100/70">
        <div className="text-[11px] text-slate-600">
          Resulting Contributions: <strong className="text-teal-700 font-mono">£{Math.round(newIsaContrib).toLocaleString()}/yr ISA</strong> + <strong className="text-blue-700 font-mono">£{Math.round(newPensionContrib).toLocaleString()}/yr Pension</strong> (Net salary cost: £{Math.round(currentTotalTakeHomeCost).toLocaleString()}/yr)
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onApplyToSandbox(Math.round(newPensionContrib), Math.round(newIsaContrib))}
            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200 transition-all cursor-pointer"
          >
            Apply to Sandbox Below
          </button>
          <button
            type="button"
            onClick={() => onApplyToPlan(Math.round(newPensionContrib), Math.round(newIsaContrib))}
            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
          >
            Apply to Plan Inputs
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-Component: Strategy Tournament & Optimizer (Revised with Tax Relief & Correct Budgets)
function WrapperStrategyTournament({ plan, runSingleTrial, onApplyStrategyToSandbox }) {
  const [salaryInput, setSalaryInput] = useState('');
  const [scope, setScope] = useState('contributions'); // 'contributions' or 'full'
  const [emergencyFloor, setEmergencyFloor] = useState(25000);
  const [tournamentResults, setTournamentResults] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const isCouple = plan.demographics.planningMode !== 'single';
  const isaAnnualCap = isCouple ? 40000 : 20000;
  const pensionAnnualCap = isCouple ? 120000 : 60000;

  const handleRunTournament = () => {
    setIsEvaluating(true);
    setTimeout(() => {
      const curAge = Number(plan.demographics.currentAgeSelf) || 40;
      const retAge = Number(plan.demographics.retireAgeSelf) || 60;
      const privAge = Number(plan.demographics.privatePensionAge) || 58;
      const yearsToRetire = Math.max(1, retAge - curAge);
      const gapYears = Math.max(0, privAge - retAge);
      const targetSpend = Number(plan.spending.targetSpend) || 0;

      // Extract existing contributions
      const currentPenGross = (Number(plan.accounts.find(a => a.id === 'pen_self')?.contrib) || 0) +
        (isCouple ? (Number(plan.accounts.find(a => a.id === 'pen_part')?.contrib) || 0) : 0);
      const currentIsaNet = (Number(plan.accounts.find(a => a.id === 'isa_self')?.contrib) || 0) +
        (isCouple ? (Number(plan.accounts.find(a => a.id === 'isa_part')?.contrib) || 0) : 0);

      // Convert existing contributions into equal Net Out-of-Pocket Take-Home Budget
      const currentPenNetCost = calculateMarginalRelief(salaryInput, currentPenGross).netCost;
      let totalNetBudget = currentIsaNet + currentPenNetCost;
      if (totalNetBudget <= 0) {
        totalNetBudget = Number(salaryInput) ? Number(salaryInput) * 0.15 : 12000;
      }

      // Existing liquid reserves
      const currentIsaBal = (Number(plan.accounts.find(a => a.id === 'isa_self')?.balance) || 0) +
        (isCouple ? (Number(plan.accounts.find(a => a.id === 'isa_part')?.balance) || 0) : 0);
      const currentCashBal = (Number(plan.accounts.find(a => a.id === 'cash_self')?.balance) || 0) +
        (isCouple ? (Number(plan.accounts.find(a => a.id === 'cash_part')?.balance) || 0) : 0);
      const currentOtherBal = (Number(plan.accounts.find(a => a.id === 'other_self')?.balance) || 0) +
        (isCouple ? (Number(plan.accounts.find(a => a.id === 'other_part')?.balance) || 0) : 0);
      const totalLiquidToday = currentIsaBal + currentCashBal + currentOtherBal;

      // Compounded liquid projection at retirement (assuming 4% real growth)
      const projectedLiquidAtRetire = totalLiquidToday * Math.pow(1.04, yearsToRetire);

      // Pre-58 Bridge Sizing
      const bridgeCapitalNeeded = gapYears > 0 ? (gapYears * targetSpend * 1.25) : 0;
      const bridgeShortfall = Math.max(0, bridgeCapitalNeeded - projectedLiquidAtRetire);

      // Annual net contribution needed to fund bridge shortfall
      const annuityFactor = Math.pow(1.04, yearsToRetire) - 1;
      const annualIsaNeededForBridge = annuityFactor > 0 ? (bridgeShortfall * 0.04) / annuityFactor : (bridgeShortfall / yearsToRetire);

      // Helper to build a plan variant
      const createStrategyPlan = (isaAnnualNet, penAnnualGross, transferNet = 0, transferGross = 0) => {
        const cloned = JSON.parse(JSON.stringify(plan));
        cloned.accounts.forEach(a => {
          if (isCouple) {
            if (a.id === 'pen_self' || a.id === 'pen_part') a.contrib = Math.round(penAnnualGross / 2);
            if (a.id === 'isa_self' || a.id === 'isa_part') a.contrib = Math.round(isaAnnualNet / 2);
          } else {
            if (a.id === 'pen_self') a.contrib = penAnnualGross;
            if (a.id === 'isa_self') a.contrib = isaAnnualNet;
          }
        });

        // Bed & SIPP Transfer Execution
        if (transferNet > 0 && transferGross > 0) {
          cloned.accounts.forEach(a => {
            if (a.id === 'isa_self') a.balance = Math.max(0, (Number(a.balance) || 0) - transferNet);
            if (a.id === 'pen_self') a.balance = (Number(a.balance) || 0) + transferGross;
          });
        }
        return cloned;
      };

      // --- STRATEGY 1: Baseline Current Plan ---
      const stratBaseline = {
        name: 'Current Plan Baseline',
        description: 'Your existing contribution ratio and wrapper balances.',
        isaContrib: currentIsaNet,
        penContrib: currentPenGross,
        taxReliefSaved: currentPenGross - currentPenNetCost,
        transferNet: 0,
        transferGross: 0,
        planState: JSON.parse(JSON.stringify(plan))
      };

      // --- STRATEGY 2: Tax Arbitrage Maximizer (Max SIPP / Pension) ---
      const taxMaxIsaNet = Math.min(isaAnnualCap, Math.min(totalNetBudget, Math.round(annualIsaNeededForBridge / 250) * 250));
      const taxMaxPenNet = Math.max(0, totalNetBudget - taxMaxIsaNet);
      const taxMaxPenGross = Math.min(pensionAnnualCap, grossUpNet(taxMaxPenNet, salaryInput));

      // Bed & SIPP calculation
      let bedSippNet = 0;
      let bedSippGross = 0;
      if (scope === 'full' && totalLiquidToday > (bridgeCapitalNeeded + emergencyFloor)) {
        const surplusLiquid = totalLiquidToday - (bridgeCapitalNeeded + emergencyFloor);
        bedSippNet = Math.min(surplusLiquid, isCouple ? 40000 : 20000);
        bedSippGross = grossUpNet(bedSippNet, salaryInput);
      }

      const stratTaxMax = {
        name: 'Tax Arbitrage Maximizer',
        description: 'Prioritizes maximum salary sacrifice relief; funds only the bare mathematical bridge.',
        isaContrib: taxMaxIsaNet,
        penContrib: Math.round(taxMaxPenGross),
        taxReliefSaved: (taxMaxPenGross - taxMaxPenNet) + (bedSippGross - bedSippNet),
        transferNet: Math.round(bedSippNet),
        transferGross: Math.round(bedSippGross),
        planState: createStrategyPlan(taxMaxIsaNet, Math.round(taxMaxPenGross), Math.round(bedSippNet), Math.round(bedSippGross))
      };

      // --- STRATEGY 3: Bridge-First & Liquidity Hedge ---
      const robustBridgeNeeded = gapYears > 0 ? (gapYears * targetSpend * 1.50) : 0;
      const robustShortfall = Math.max(0, robustBridgeNeeded - projectedLiquidAtRetire);
      const robustAnnualIsa = annuityFactor > 0 ? (robustShortfall * 0.04) / annuityFactor : (robustShortfall / yearsToRetire);

      const bridgeFirstIsaNet = Math.min(isaAnnualCap, Math.max(totalNetBudget * 0.5, Math.min(totalNetBudget, Math.round(robustAnnualIsa / 250) * 250)));
      const bridgeFirstPenNet = Math.max(0, totalNetBudget - bridgeFirstIsaNet);
      const bridgeFirstPenGross = Math.min(pensionAnnualCap, grossUpNet(bridgeFirstPenNet, salaryInput));

      const stratBridgeFirst = {
        name: 'Bridge-First & Liquidity',
        description: 'Generously funds your pre-58 ISA bridge to insulate against early retirement shocks.',
        isaContrib: bridgeFirstIsaNet,
        penContrib: Math.round(bridgeFirstPenGross),
        taxReliefSaved: bridgeFirstPenGross - bridgeFirstPenNet,
        transferNet: 0,
        transferGross: 0,
        planState: createStrategyPlan(bridgeFirstIsaNet, Math.round(bridgeFirstPenGross))
      };

      // --- STRATEGY 4: Decumulation Tax Bracket Smoother ---
      const statePen = Number(plan.demographics.statePensionSelf) || 11500;
      const maxSmoothDraw = Math.max(0, 50270 - statePen);
      const maxSmoothPot = maxSmoothDraw / 0.04;
      const existingPenBal = (Number(plan.accounts.find(a => a.id === 'pen_self')?.balance) || 0) +
        (isCouple ? (Number(plan.accounts.find(a => a.id === 'pen_part')?.balance) || 0) : 0);
      const projectedPenAtRetire = existingPenBal * Math.pow(1.044, yearsToRetire);

      let smoothIsaNet, smoothPenNet;
      if (projectedPenAtRetire > maxSmoothPot) {
        smoothIsaNet = Math.min(isaAnnualCap, totalNetBudget);
        smoothPenNet = Math.max(0, totalNetBudget - smoothIsaNet);
      } else {
        smoothPenNet = totalNetBudget * 0.65;
        smoothIsaNet = Math.min(isaAnnualCap, Math.max(0, totalNetBudget - smoothPenNet));
      }
      const smoothPenGross = Math.min(pensionAnnualCap, grossUpNet(smoothPenNet, salaryInput));

      const stratSmooth = {
        name: 'Tax Bracket Smoother',
        description: 'Limits pension pot size to prevent retirement withdrawals hitting the 40% higher rate band.',
        isaContrib: Math.round(smoothIsaNet),
        penContrib: Math.round(smoothPenGross),
        taxReliefSaved: smoothPenGross - smoothPenNet,
        transferNet: 0,
        transferGross: 0,
        planState: createStrategyPlan(Math.round(smoothIsaNet), Math.round(smoothPenGross))
      };

      // Execute 1,500 trials per strategy
      const strats = [stratBaseline, stratTaxMax, stratBridgeFirst, stratSmooth];
      const TRIALS = 1500;

      const results = strats.map(st => {
        let succ = 0;
        const failAges = [];
        const terminalPots = [];
        let pre58Fails = 0;

        for (let i = 0; i < TRIALS; i++) {
          const res = runSingleTrial(st.planState);
          if (res.survived) {
            succ++;
          } else {
            if (res.failAge !== null) failAges.push(res.failAge);
            if (res.pre58Failed) pre58Fails++;
          }
          terminalPots.push(res.terminalPot);
        }

        terminalPots.sort((a, b) => a - b);
        failAges.sort((a, b) => a - b);

        const successRate = (succ / TRIALS) * 100;
        const medianPot = terminalPots[Math.floor(TRIALS * 0.5)] || 0;
        const medianFailAge = failAges.length > 0 ? failAges[Math.floor(failAges.length * 0.5)] : null;
        const pre58Risk = (pre58Fails / TRIALS) * 100;

        return {
          ...st,
          successRate,
          medianPot,
          medianFailAge,
          pre58Risk
        };
      });

      setTournamentResults(results);
      setIsEvaluating(false);
    }, 30);
  };

  return (
    <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div>
          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Zap className="w-4 h-4 text-indigo-600 fill-indigo-600" /> Automated Strategy Tournament &amp; Optimizer
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Test 4 distinct UK wrapper philosophies head-to-head under 1,500 stochastic trials each to find your optimal balance between tax relief and liquidity.
          </p>
        </div>
      </div>

      {/* Inline Tuning Controls */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-sans p-3 bg-slate-50 border border-slate-200 rounded-xl">
        <div>
          <label className="text-slate-700 font-semibold block mb-1">Gross Annual Salary (£)</label>
          <input
            type="number"
            placeholder="e.g. 65000 (assumes 40% if blank)"
            value={salaryInput}
            onChange={(e) => setSalaryInput(e.target.value)}
            className="w-full p-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-slate-700 font-semibold block mb-1">Optimization Scope</label>
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            className="w-full p-2 bg-white border border-slate-300 rounded-lg text-slate-800 font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer"
          >
            <option value="contributions">Contributions Only (Rebalance future deposits)</option>
            <option value="full">Full Reallocation (Contributions + Bed &amp; SIPP transfers)</option>
          </select>
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-slate-700 font-semibold">Protected Emergency Buffer</label>
            <span className="font-mono font-bold text-indigo-700">£{emergencyFloor.toLocaleString()}</span>
          </div>
          <input
            type="range"
            min="10000"
            max="60000"
            step="5000"
            value={emergencyFloor}
            onChange={(e) => setEmergencyFloor(Number(e.target.value))}
            className="w-full accent-indigo-600 cursor-pointer mt-2"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleRunTournament}
          disabled={isEvaluating}
          className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white rounded-xl text-xs font-bold shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
        >
          <Zap className="w-3.5 h-3.5 fill-amber-300 text-amber-300" />
          {isEvaluating ? 'Evaluating 6,000 Paths across 4 Strategies...' : '⚡ Run Strategy Tournament'}
        </button>
      </div>

      {/* Tournament Results Grid */}
      {tournamentResults && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-2">
          {tournamentResults.map((res, idx) => (
            <div key={idx} className={`p-4 rounded-2xl border flex flex-col justify-between space-y-3 ${
              idx === 0 ? 'bg-slate-50 border-slate-200' : 'bg-white border-indigo-100 shadow-xs'
            }`}>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 leading-tight">{res.name}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold font-mono ${
                    res.successRate >= 90 ? 'bg-emerald-100 text-emerald-800' : res.successRate >= 75 ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {res.successRate.toFixed(1)}% Safe
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 leading-normal">{res.description}</p>

                <div className="pt-2 border-t border-slate-100 space-y-1 text-[11px] font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">S&amp;S ISA:</span>
                    <strong className="text-teal-700">£{res.isaContrib.toLocaleString()}/yr</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pension:</span>
                    <strong className="text-blue-700">£{res.penContrib.toLocaleString()}/yr</strong>
                  </div>
                  {res.taxReliefSaved > 0 && (
                    <div className="flex justify-between text-emerald-700 font-bold">
                      <span className="font-sans">Tax Relief Saved:</span>
                      <span>+£{Math.round(res.taxReliefSaved).toLocaleString()}/yr</span>
                    </div>
                  )}
                  {res.transferNet > 0 && (
                    <div className="flex justify-between text-indigo-700 font-bold">
                      <span>Bed &amp; SIPP:</span>
                      <span>£{res.transferNet.toLocaleString()} &rarr; £{res.transferGross.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="flex justify-between pt-1 border-t border-slate-100">
                    <span className="text-slate-500 font-sans">Median Pot @ 100:</span>
                    <span className="font-bold text-slate-800">£{Math.round(res.medianPot / 1000).toLocaleString()}k</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500 font-sans">Failure Point:</span>
                    <span className={`font-bold ${res.pre58Risk > 5 ? 'text-rose-600' : 'text-slate-700'}`}>
                      {res.medianFailAge ? `Age ${res.medianFailAge}` : 'None'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onApplyStrategyToSandbox(res.isaContrib, res.penContrib, res.transferNet, res.transferGross)}
                className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Apply to Sandbox
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ... remaining tabs (Historical, Audit, Docs) rendered below inside main component body