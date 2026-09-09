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

  const getMarginalRelief = (salaryInput, grossSacrifice) => {
    if (salaryInput === '' || salaryInput === null || salaryInput === undefined || Number(salaryInput) <= 0) {
      const taxAndNICSaved = grossSacrifice * 0.42;
      const netTakeHomeCost = grossSacrifice - taxAndNICSaved;
      return { netTakeHomeCost, taxAndNICSaved, effectiveReliefRate: 42.0 };
    }

    const salary = Number(salaryInput);
    const getTaxAndNIC = (income) => {
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
    };

    const initialDeductions = getTaxAndNIC(salary);
    const postSacrificeDeductions = getTaxAndNIC(Math.max(0, salary - grossSacrifice));
    const taxAndNICSaved = initialDeductions - postSacrificeDeductions;
    const netTakeHomeCost = grossSacrifice - taxAndNICSaved;
    const effectiveReliefRate = grossSacrifice > 0 ? (taxAndNICSaved / grossSacrifice) * 100 : 42.0;

    return { netTakeHomeCost, taxAndNICSaved, effectiveReliefRate };
  };

  const grossUpNetSacrifice = (netAmt, salaryInput) => {
    if (netAmt <= 0) return 0;
    if (salaryInput === '' || salaryInput === null || salaryInput === undefined || Number(salaryInput) <= 0) {
      return netAmt / 0.58;
    }
    let low = netAmt;
    let high = netAmt * 3.0;
    for (let i = 0; i < 22; i++) {
      const mid = (low + high) / 2;
      const { netTakeHomeCost } = getMarginalRelief(salaryInput, mid);
      if (netTakeHomeCost < netAmt) low = mid;
      else high = mid;
    }
    return low;
  };

  const currentNetCostOfPension = getMarginalRelief(grossSalary, currentPen).netTakeHomeCost;
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
    newPensionContrib = Math.max(0, grossUpNetSacrifice(targetNetPension, grossSalary));
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

export default function App() {
  const [activeTab, setActiveTab] = useState('inputs');
  const [isEditingRisk, setIsEditingRisk] = useState(false);
  const [selectedHistoricalYear, setSelectedHistoricalYear] = useState(1965);

  const [plan, setPlan] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (!parsed.riskProfiles) parsed.riskProfiles = DEFAULT_RISK_PROFILES;
        if (!parsed.demographics) parsed.demographics = BLANK_PLAN.demographics;
        if (!parsed.demographics.planningMode) parsed.demographics.planningMode = 'couple';
        if (!parsed.spending) parsed.spending = BLANK_PLAN.spending;
        if (!parsed.spending.decumulationPolicy) parsed.spending.decumulationPolicy = 'Bracket Fill';
        return parsed;
      }
      return BLANK_PLAN;
    } catch (e) {
      return BLANK_PLAN;
    }
  });

  const [scenarios, setScenarios] = useState(() => {
    try {
      const cached = localStorage.getItem(SCENARIOS_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {}
    return [
      { id: 'scen_default', name: 'Scenario 1', data: BLANK_PLAN }
    ];
  });

  const [activeScenarioId, setActiveScenarioId] = useState(() => {
    return scenarios[0]?.id || 'scen_default';
  });

  const [scenarioNameInput, setScenarioNameInput] = useState('');
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  const [sandboxCustomized, setSandboxCustomized] = useState(false);

  const [sandboxAccounts, setSandboxAccounts] = useState(() => {
    const init = {};
    plan.accounts.forEach(a => {
      init[a.id] = {
        contrib: a.contrib !== '' && a.contrib !== null && a.contrib !== undefined ? Number(a.contrib) : 0,
        growth: a.growth !== '' && a.growth !== null && a.growth !== undefined ? Number(a.growth) : 0
      };
    });
    return init;
  });

  useEffect(() => {
    if (!sandboxCustomized) {
      const fresh = {};
      plan.accounts.forEach(a => {
        fresh[a.id] = {
          contrib: a.contrib !== '' && a.contrib !== null && a.contrib !== undefined ? Number(a.contrib) : 0,
          growth: a.growth !== '' && a.growth !== null && a.growth !== undefined ? Number(a.growth) : 0
        };
      });
      setSandboxAccounts(fresh);
    }
  }, [plan.accounts, sandboxCustomized]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    } catch (e) {}
  }, [plan]);

  useEffect(() => {
    try {
      localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(scenarios));
    } catch (e) {}
  }, [scenarios]);

  const fileInputRef = useRef(null);
  const isCouple = plan.demographics.planningMode !== 'single';

  const spanYears = useMemo(() => {
    const ageStart = Number(plan.demographics.currentAgeSelf) || 40;
    const ageEnd = Number(plan.demographics.terminalAge) || 100;
    return Math.max(1, ageEnd - ageStart);
  }, [plan.demographics.currentAgeSelf, plan.demographics.terminalAge]);

  const maxHistoricalStartYear = useMemo(() => {
    return Math.max(1928, 2025 - spanYears);
  }, [spanYears]);

  const activeHistoricalStartYear = useMemo(() => {
    return Math.min(Math.max(1928, selectedHistoricalYear), maxHistoricalStartYear);
  }, [selectedHistoricalYear, maxHistoricalStartYear]);

  const [activeSeries, setActiveSeries] = useState(() => {
    const init = {};
    SERIES_CONFIG.forEach(s => { init[s.id] = s.defaultActive; });
    return init;
  });
  const [maxVisibleAge, setMaxVisibleAge] = useState(100);
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const [hoveredHistPoint, setHoveredHistPoint] = useState(null);

  const [targetConfidence, setTargetConfidence] = useState(90);
  const [simResult, setSimResult] = useState(null);
  const [isSimulating, setIsSimulating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const handleFocus = (e) => e.target.select();

  const activeRiskMatrix = useMemo(() => {
    return plan.riskProfiles || DEFAULT_RISK_PROFILES;
  }, [plan.riskProfiles]);

  const scrollToDocSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSaveScenario = () => {
    setScenarios(prev => prev.map(s => {
      if (s.id === activeScenarioId) {
        return {
          ...s,
          name: scenarioNameInput.trim() !== '' ? scenarioNameInput.trim() : s.name,
          data: JSON.parse(JSON.stringify(plan))
        };
      }
      return s;
    }));
    setScenarioNameInput('');
    setSaveSuccessMsg('Scenario saved');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleSaveAsNewScenario = () => {
    const trimmed = scenarioNameInput.trim();
    const finalName = trimmed !== '' ? trimmed : `Scenario ${scenarios.length + 1}`;
    const newId = 'scen_' + Date.now();
    const newScenario = {
      id: newId,
      name: finalName,
      data: JSON.parse(JSON.stringify(plan))
    };

    setScenarios(prev => [...prev, newScenario]);
    setActiveScenarioId(newId);
    setScenarioNameInput('');
    setSaveSuccessMsg(`Saved as "${finalName}"`);
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleSelectScenario = (id) => {
    const selected = scenarios.find(s => s.id === id);
    if (selected) {
      setSandboxCustomized(false);
      setActiveScenarioId(id);
      setPlan(JSON.parse(JSON.stringify(selected.data)));
      setSimResult(null);
      const fresh = {};
      selected.data.accounts.forEach(a => {
        fresh[a.id] = { contrib: Number(a.contrib) || 0, growth: Number(a.growth) || 0 };
      });
      setSandboxAccounts(fresh);
    }
  };

  const handleDeleteScenario = (idToDelete) => {
    if (scenarios.length <= 1) {
      alert("At least one scenario must be retained.");
      return;
    }
    const remaining = scenarios.filter(s => s.id !== idToDelete);
    setScenarios(remaining);
    if (activeScenarioId === idToDelete) {
      setActiveScenarioId(remaining[0].id);
      setPlan(JSON.parse(JSON.stringify(remaining[0].data)));
    }
  };

  const runEngineYear = (t, potsMap, planState, regimeOrShock = 'expected', tracking = { cumPclsSelf: 0, cumPclsPart: 0, lumpSumTakenSelf: false, lumpSumTakenPart: false }) => {
    const planIsCouple = planState.demographics.planningMode !== 'single';
    const ageSelfStart = Number(planState.demographics.currentAgeSelf) || 40;
    const agePartStart = planIsCouple ? (Number(planState.demographics.currentAgePart) || 40) : 0;
    const retireAgeSelf = Number(planState.demographics.retireAgeSelf) || 60;
    const retireAgePart = planIsCouple ? (Number(planState.demographics.retireAgePart) || 60) : 999;
    const privatePenAge = Number(planState.demographics.privatePensionAge) || 58;
    const statePenAge = Number(planState.demographics.statePensionAge) || 68;

    const targetSpend = Number(planState.spending.targetSpend) || 0;
    const lsaCap = Number(planState.config.pclsMaxCap) || 268275;
    const pclsProp = (Number(planState.config.pclsProportion) || 25) / 100;
    const paAllowance = Number(planState.config.personalAllowance) || 12570;
    const basicLimit = Number(planState.config.basicBandLimit) || 50270;
    const decumPolicy = planState.spending.decumulationPolicy || 'Bracket Fill';

    const yf = calculateYearFraction(planState.config.valuationDate);
    const baseYear = planState.config.valuationDate ? parseInt(planState.config.valuationDate.slice(0, 4)) : 2026;

    const ageSelf = ageSelfStart + t;
    const agePart = planIsCouple ? (agePartStart + t) : 0;
    const year = baseYear + t;
    const isYearZero = (t === 0);

    const workingSelf = ageSelf < retireAgeSelf;
    const workingPart = planIsCouple ? (agePart < retireAgePart) : false;

    const isHistorical = typeof regimeOrShock === 'object' && regimeOrShock !== null && regimeOrShock.historical;
    const histPoint = isHistorical ? getHistoricalPoint(regimeOrShock.startYear, t) : null;

    // 1. One-off Contributions
    planState.oneOffContributions.filter(c => {
      const itemYear = c.date ? parseInt(c.date.slice(0, 4)) : (Number(c.year) || year);
      const isOwnerValid = planIsCouple || c.owner === 'Myself';
      return itemYear === year && isOwnerValid;
    }).forEach(c => {
      const targetAcc = planState.accounts.find(a => a.owner === c.owner && a.category === c.category);
      if (targetAcc && potsMap[targetAcc.id] !== undefined) {
        potsMap[targetAcc.id] += Number(c.amount) || 0;
      }
    });

    // 2. Annual Contributions
    const fractionThisYear = isYearZero ? yf : 1.0;
    planState.accounts.forEach(acc => {
      if (!planIsCouple && acc.owner === 'Partner') return;
      const isWorking = acc.owner === 'Myself' ? workingSelf : workingPart;
      const contrib = Number(acc.contrib) || 0;
      const growth = Number(acc.growth) || 0;
      if (isWorking && contrib > 0) {
        potsMap[acc.id] += contrib * Math.pow(1 + growth / 100, t) * fractionThisYear;
      }
    });

    // 3. Full 25% Lump Sum Trigger
    if (planState.spending.drawdownStrategy === 'Full 25% Lump Sum') {
      const canAccessSelf = ageSelf >= Math.max(retireAgeSelf, privatePenAge);
      if (canAccessSelf && !tracking.lumpSumTakenSelf && potsMap.pen_self > 0) {
        const pcls = Math.min(potsMap.pen_self * pclsProp, Math.max(0, lsaCap - tracking.cumPclsSelf));
        potsMap.pen_self -= pcls;
        potsMap.cash_self += pcls;
        tracking.cumPclsSelf += pcls;
        tracking.lumpSumTakenSelf = true;
      }

      if (planIsCouple) {
        const canAccessPart = agePart >= Math.max(retireAgePart, privatePenAge);
        if (canAccessPart && !tracking.lumpSumTakenPart && potsMap.pen_part > 0) {
          const pcls = Math.min(potsMap.pen_part * pclsProp, Math.max(0, lsaCap - tracking.cumPclsPart));
          potsMap.pen_part -= pcls;
          potsMap.cash_part += pcls;
          tracking.cumPclsPart += pcls;
          tracking.lumpSumTakenPart = true;
        }
      }
    }

    // 4. Guaranteed Incomes & State Pension
    let otherNetSelf = 0, otherTaxableSelf = 0;
    let otherNetPart = 0, otherTaxablePart = 0;

    planState.otherIncomes.forEach(inc => {
      if (!planIsCouple && inc.owner === 'Partner') return;
      const sAge = Number(inc.startAge) || 0;
      const eAge = Number(inc.endAge) || 100;
      const amt = Number(inc.amount) || 0;
      const active = inc.owner === 'Myself' ? (ageSelf >= sAge && ageSelf <= eAge) : (agePart >= sAge && agePart <= eAge);

      if (active) {
        if (inc.taxTreatment === 'Tax-free') {
          if (inc.owner === 'Myself') otherNetSelf += amt;
          else otherNetPart += amt;
        } else {
          if (inc.owner === 'Myself') otherTaxableSelf += amt;
          else otherTaxablePart += amt;
        }
      }
    });

    const spSelf = ageSelf >= statePenAge ? (Number(planState.demographics.statePensionSelf) || 0) : 0;
    const spPart = (planIsCouple && agePart >= statePenAge) ? (Number(planState.demographics.statePensionPart) || 0) : 0;

    let currentTaxableSelf = otherTaxableSelf + spSelf;
    let currentTaxablePart = otherTaxablePart + spPart;

    const baseNetIncomeSelf = otherNetSelf + calculateUKNetIncome(currentTaxableSelf, planState.config);
    const baseNetIncomePart = planIsCouple ? (otherNetPart + calculateUKNetIncome(currentTaxablePart, planState.config)) : 0;
    const totalNetGuaranteed = baseNetIncomeSelf + baseNetIncomePart;

    let drawdownPensions = 0;
    const isFullLump = planState.spending.drawdownStrategy === 'Full 25% Lump Sum';

    const drawFromPension = (potOwner, netNeeded, maxTaxableCeiling = Infinity) => {
      if (netNeeded <= 0) return 0;
      const potKey = potOwner === 'Myself' ? 'pen_self' : 'pen_part';
      if (!potsMap[potKey] || potsMap[potKey] <= 0) return 0;

      const pclsHeadroom = Math.max(0, lsaCap - (potOwner === 'Myself' ? tracking.cumPclsSelf : tracking.cumPclsPart));
      const taxBase = potOwner === 'Myself' ? currentTaxableSelf : currentTaxablePart;

      if (taxBase >= maxTaxableCeiling) return 0;

      const grossNeeded = grossPensionNeededForNet(netNeeded, taxBase, planState.config, isFullLump, pclsHeadroom, maxTaxableCeiling);
      const actualGross = Math.min(potsMap[potKey], grossNeeded);
      if (actualGross <= 0) return 0;

      potsMap[potKey] -= actualGross;
      drawdownPensions += actualGross;

      let taxFreeTaken = 0;
      if (!isFullLump && pclsHeadroom > 0) {
        taxFreeTaken = Math.min(actualGross * pclsProp, pclsHeadroom);
        if (potOwner === 'Myself') tracking.cumPclsSelf += taxFreeTaken;
        else tracking.cumPclsPart += taxFreeTaken;
      }
      const taxableTaken = actualGross - taxFreeTaken;

      const currentNet = calculateUKNetIncome(taxBase, planState.config);
      const newNet = calculateUKNetIncome(taxBase + taxableTaken, planState.config);

      if (potOwner === 'Myself') currentTaxableSelf += taxableTaken;
      else currentTaxablePart += taxableTaken;

      return taxFreeTaken + (newNet - currentNet);
    };

    // 5. One-off Capital Costs
    let pre58Insolvent = false;
    const costThisYear = planState.oneOffCosts.filter(c => {
      const itemYear = c.date ? parseInt(c.date.slice(0, 4)) : (Number(c.year) || year);
      return itemYear === year;
    }).reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

    if (costThisYear > 0) {
      let rem = costThisYear;
      const priority = planIsCouple
        ? ['cash_self', 'cash_part', 'other_self', 'other_part', 'isa_self', 'isa_part']
        : ['cash_self', 'other_self', 'isa_self'];

      for (const pid of priority) {
        if (rem <= 0) break;
        const p = Math.min(potsMap[pid] || 0, rem);
        potsMap[pid] -= p;
        rem -= p;
      }

      if (rem > 0) {
        if (ageSelf >= privatePenAge) {
          const coveredSelf = drawFromPension('Myself', rem);
          rem = Math.max(0, rem - coveredSelf);

          if (planIsCouple && rem > 0) {
            const coveredPart = drawFromPension('Partner', rem);
            rem = Math.max(0, rem - coveredPart);
          }
        } else {
          pre58Insolvent = true;
        }
      }
    }

    // 6. Target Spend Demand
    let annualLivingTarget = 0;
    const isRetired = planIsCouple ? (!workingSelf || !workingPart) : !workingSelf;

    if (isRetired && targetSpend > 0) {
      let currentSpend = targetSpend;

      const t1Age = Number(planState.spending.taper1Age);
      const t1Rate = (Number(planState.spending.taper1Rate) || 0) / 100;
      if (t1Age > 0 && ageSelf >= t1Age && t1Rate > 0) {
        currentSpend *= (1 - t1Rate);
      }

      const t2Age = Number(planState.spending.taper2Age);
      const t2Rate = (Number(planState.spending.taper2Rate) || 0) / 100;
      if (t2Age > 0 && ageSelf >= t2Age && t2Rate > 0) {
        currentSpend *= (1 - t2Rate);
      }

      annualLivingTarget = currentSpend;
    }

    // 7. Decumulation Waterfall & Surplus Reinvestment
    let netDemand = Math.max(0, annualLivingTarget - totalNetGuaranteed);
    let demandSelf = 0;
    let demandPart = 0;

    if (annualLivingTarget > 0 && totalNetGuaranteed >= annualLivingTarget) {
      const surplus = totalNetGuaranteed - annualLivingTarget;
      const sixMonthBuffer = annualLivingTarget * 0.5;

      if (planIsCouple) {
        const surplusEach = surplus * 0.5;
        const bufferEach = sixMonthBuffer * 0.5;

        potsMap.cash_self += surplusEach;
        if (potsMap.cash_self > bufferEach) {
          const excess = potsMap.cash_self - bufferEach;
          potsMap.cash_self = bufferEach;
          potsMap.isa_self = (potsMap.isa_self || 0) + excess;
        }

        potsMap.cash_part += surplusEach;
        if (potsMap.cash_part > bufferEach) {
          const excess = potsMap.cash_part - bufferEach;
          potsMap.cash_part = bufferEach;
          potsMap.isa_part = (potsMap.isa_part || 0) + excess;
        }
      } else {
        potsMap.cash_self += surplus;
        if (potsMap.cash_self > sixMonthBuffer) {
          const excess = potsMap.cash_self - sixMonthBuffer;
          potsMap.cash_self = sixMonthBuffer;
          potsMap.isa_self = (potsMap.isa_self || 0) + excess;
        }
      }
    } else if (netDemand > 0) {
      if (planIsCouple) {
        demandSelf = netDemand * 0.5;
        demandPart = netDemand * 0.5;
      } else {
        demandSelf = netDemand;
        demandPart = 0;
      }

      const drawTier = (pSelfId, pPartId) => {
        const pullS = Math.min(potsMap[pSelfId] || 0, demandSelf);
        potsMap[pSelfId] -= pullS;
        demandSelf -= pullS;

        if (planIsCouple) {
          const pullP = Math.min(potsMap[pPartId] || 0, demandPart);
          potsMap[pPartId] -= pullP;
          demandPart -= pullP;

          if (demandSelf > 0 && potsMap[pPartId] > 0) {
            const absorb = Math.min(potsMap[pPartId], demandSelf);
            potsMap[pPartId] -= absorb;
            demandSelf -= absorb;
          }
          if (demandPart > 0 && potsMap[pSelfId] > 0) {
            const absorb = Math.min(potsMap[pSelfId], demandPart);
            potsMap[pSelfId] -= absorb;
            demandPart -= absorb;
          }
        }
      };

      if (ageSelf < privatePenAge) {
        drawTier('cash_self', 'cash_part');
        if (demandSelf > 0 || demandPart > 0) drawTier('other_self', 'other_part');
        if (demandSelf > 0 || demandPart > 0) drawTier('isa_self', 'isa_part');
        if (demandSelf > 0 || demandPart > 0) pre58Insolvent = true;
      } 
      else if (decumPolicy === 'Bracket Fill Basic') {
        const paRoomSelf = Math.max(0, paAllowance - currentTaxableSelf);
        if (paRoomSelf > 0 && demandSelf > 0) {
          const coveredS = drawFromPension('Myself', demandSelf, paAllowance);
          demandSelf = Math.max(0, demandSelf - coveredS);
        }

        if (planIsCouple) {
          const paRoomPart = Math.max(0, paAllowance - currentTaxablePart);
          if (paRoomPart > 0 && demandPart > 0) {
            const coveredP = drawFromPension('Partner', demandPart, paAllowance);
            demandPart = Math.max(0, demandPart - coveredP);
          }
          if (demandPart > 0 && currentTaxableSelf < paAllowance) {
            const crossCoverS = drawFromPension('Myself', demandPart, paAllowance);
            demandPart = Math.max(0, demandPart - crossCoverS);
          }
          if (demandSelf > 0 && currentTaxablePart < paAllowance) {
            const crossCoverP = drawFromPension('Partner', demandSelf, paAllowance);
            demandSelf = Math.max(0, demandSelf - crossCoverP);
          }
        }

        if (demandSelf > 0 || demandPart > 0) {
          if (demandSelf > 0) {
            const coveredS = drawFromPension('Myself', demandSelf, basicLimit);
            demandSelf = Math.max(0, demandSelf - coveredS);
          }
          if (planIsCouple) {
            if (demandPart > 0) {
              const coveredP = drawFromPension('Partner', demandPart, basicLimit);
              demandPart = Math.max(0, demandPart - coveredP);
            }
            if (demandPart > 0) {
              const crossCoverS = drawFromPension('Myself', demandPart, basicLimit);
              demandPart = Math.max(0, demandPart - crossCoverS);
            }
            if (demandSelf > 0) {
              const crossCoverP = drawFromPension('Partner', demandSelf, basicLimit);
              demandSelf = Math.max(0, demandSelf - crossCoverP);
            }
          }
        }

        if (demandSelf > 0 || demandPart > 0) drawTier('cash_self', 'cash_part');
        if (demandSelf > 0 || demandPart > 0) drawTier('other_self', 'other_part');
        if (demandSelf > 0 || demandPart > 0) drawTier('isa_self', 'isa_part');

        if (demandSelf > 0 || demandPart > 0) {
          if (demandSelf > 0) demandSelf = Math.max(0, demandSelf - drawFromPension('Myself', demandSelf));
          if (planIsCouple) {
            if (demandPart > 0) demandPart = Math.max(0, demandPart - drawFromPension('Partner', demandPart));
            if (demandPart > 0) demandPart = Math.max(0, demandPart - drawFromPension('Myself', demandPart));
            if (demandSelf > 0) demandSelf = Math.max(0, demandSelf - drawFromPension('Partner', demandSelf));
          }
        }
      } 
      else if (decumPolicy === 'Bracket Fill') {
        const paRoomSelf = Math.max(0, paAllowance - currentTaxableSelf);
        if (paRoomSelf > 0 && demandSelf > 0) {
          const coveredS = drawFromPension('Myself', demandSelf, paAllowance);
          demandSelf = Math.max(0, demandSelf - coveredS);
        }

        if (planIsCouple) {
          const paRoomPart = Math.max(0, paAllowance - currentTaxablePart);
          if (paRoomPart > 0 && demandPart > 0) {
            const coveredP = drawFromPension('Partner', demandPart, paAllowance);
            demandPart = Math.max(0, demandPart - coveredP);
          }
          if (demandPart > 0 && currentTaxableSelf < paAllowance) {
            const crossCoverS = drawFromPension('Myself', demandPart, paAllowance);
            demandPart = Math.max(0, demandPart - crossCoverS);
          }
          if (demandSelf > 0 && currentTaxablePart < paAllowance) {
            const crossCoverP = drawFromPension('Partner', demandSelf, paAllowance);
            demandSelf = Math.max(0, demandSelf - crossCoverP);
          }
        }

        if (demandSelf > 0 || demandPart > 0) drawTier('cash_self', 'cash_part');
        if (demandSelf > 0 || demandPart > 0) drawTier('other_self', 'other_part');
        if (demandSelf > 0 || demandPart > 0) drawTier('isa_self', 'isa_part');

        if (demandSelf > 0 || demandPart > 0) {
          if (demandSelf > 0) {
            const coveredS = drawFromPension('Myself', demandSelf, basicLimit);
            demandSelf = Math.max(0, demandSelf - coveredS);
          }
          if (planIsCouple) {
            if (demandPart > 0) {
              const coveredP = drawFromPension('Partner', demandPart, basicLimit);
              demandPart = Math.max(0, demandPart - coveredP);
            }
            if (demandPart > 0) {
              const crossCoverS = drawFromPension('Myself', demandPart, basicLimit);
              demandPart = Math.max(0, demandPart - crossCoverS);
            }
            if (demandSelf > 0) {
              const crossCoverP = drawFromPension('Partner', demandSelf, basicLimit);
              demandSelf = Math.max(0, demandSelf - crossCoverP);
            }
          }
        }

        if (demandSelf > 0 || demandPart > 0) {
          if (demandSelf > 0) demandSelf = Math.max(0, demandSelf - drawFromPension('Myself', demandSelf));
          if (planIsCouple) {
            if (demandPart > 0) demandPart = Math.max(0, demandPart - drawFromPension('Partner', demandPart));
            if (demandPart > 0) demandPart = Math.max(0, demandPart - drawFromPension('Myself', demandPart));
            if (demandSelf > 0) demandSelf = Math.max(0, demandSelf - drawFromPension('Partner', demandSelf));
          }
        }
      } 
      else {
        drawTier('cash_self', 'cash_part');
        if (demandSelf > 0 || demandPart > 0) drawTier('other_self', 'other_part');
        if (demandSelf > 0 || demandPart > 0) drawTier('isa_self', 'isa_part');
        if (demandSelf > 0 || demandPart > 0) {
          if (demandSelf > 0) demandSelf = Math.max(0, demandSelf - drawFromPension('Myself', demandSelf));
          if (planIsCouple) {
            if (demandPart > 0) demandPart = Math.max(0, demandPart - drawFromPension('Partner', demandPart));
            if (demandPart > 0) demandPart = Math.max(0, demandPart - drawFromPension('Myself', demandPart));
            if (demandSelf > 0) demandSelf = Math.max(0, demandSelf - drawFromPension('Partner', demandSelf));
          }
        }
      }
    }

    // 8. Compounding
    const compoundFactor = isYearZero ? yf : 1.0;
    planState.accounts.forEach(acc => {
      if (!planIsCouple && acc.owner === 'Partner') return;
      const profile = (planState.riskProfiles && planState.riskProfiles[acc.risk]) 
        ? planState.riskProfiles[acc.risk] 
        : (DEFAULT_RISK_PROFILES[acc.risk] || DEFAULT_RISK_PROFILES['High Risk']);

      const realRate = (Number(profile.real) || 0) / 100;
      const luckyRate = (Number(profile.lucky) || 0) / 100;
      const unluckyRate = (Number(profile.unlucky) || 0) / 100;
      const assetVol = (Number(profile.volatility) || 12.0) / 100;

      let growthRate = realRate;

      if (regimeOrShock === 'lucky') {
        growthRate = luckyRate;
      } else if (regimeOrShock === 'unlucky') {
        growthRate = unluckyRate;
      } else if (isHistorical && histPoint) {
        if (acc.risk === 'Cash Equivalents') {
          growthRate = (Number(profile.real) || -0.50) / 100;
        } else {
          const wStock = RISK_EQUITY_WEIGHTS[acc.risk] !== undefined ? RISK_EQUITY_WEIGHTS[acc.risk] : 0.90;
          growthRate = (wStock * histPoint.s + (1 - wStock) * histPoint.b) / 100;
        }
      } else if (typeof regimeOrShock === 'object' && regimeOrShock !== null && regimeOrShock.z !== undefined) {
        const z = regimeOrShock.z;
        const assetDrift = realRate - 0.5 * assetVol * assetVol;
        growthRate = Math.exp(assetDrift + assetVol * z) - 1;
      }

      potsMap[acc.id] = Math.max(0, (potsMap[acc.id] || 0) * (1 + growthRate * compoundFactor));
    });

    const totalSelf = (potsMap.pen_self || 0) + (potsMap.isa_self || 0) + (potsMap.other_self || 0) + (potsMap.cash_self || 0);
    const totalPart = planIsCouple ? ((potsMap.pen_part || 0) + (potsMap.isa_part || 0) + (potsMap.other_part || 0) + (potsMap.cash_part || 0)) : 0;
    const totalCombined = planIsCouple ? (totalSelf + totalPart) : totalSelf;

    return {
      year,
      t,
      ageSelf,
      agePart,
      histYear: histPoint ? histPoint.y : null,
      histStockReturn: histPoint ? histPoint.s : null,
      histBondReturn: histPoint ? histPoint.b : null,
      workingSelf: workingSelf ? 1 : 0,
      workingPart: workingPart ? 1 : 0,
      targetSpend: annualLivingTarget,
      spSelf,
      spPart,
      netDrawdown: netDemand,
      totalSelf,
      totalPart,
      totalCombined,
      pots: { ...potsMap },
      drawdownPensions,
      pre58Insolvent,
      unmetDemand: demandSelf + demandPart
    };
  };

  const timelineData = useMemo(() => {
    const rows = [];
    const ageSelfStart = Number(plan.demographics.currentAgeSelf) || 40;
    const terminalAge = Number(plan.demographics.terminalAge) || 100;
    const totalYears = Math.max(1, terminalAge - ageSelfStart);
    const inflation = (Number(plan.config.inflation) || 2.5) / 100;

    const potsExp = {};
    const potsLucky = {};
    const potsUnlucky = {};

    plan.accounts.forEach(acc => {
      const bal = Number(acc.balance) || 0;
      potsExp[acc.id] = bal;
      potsLucky[acc.id] = bal;
      potsUnlucky[acc.id] = bal;
    });

    const trackExp = { cumPclsSelf: 0, cumPclsPart: 0, lumpSumTakenSelf: false, lumpSumTakenPart: false };
    const trackLucky = { cumPclsSelf: 0, cumPclsPart: 0, lumpSumTakenSelf: false, lumpSumTakenPart: false };
    const trackUnlucky = { cumPclsSelf: 0, cumPclsPart: 0, lumpSumTakenSelf: false, lumpSumTakenPart: false };

    for (let t = 0; t <= totalYears; t++) {
      const stepExp = runEngineYear(t, potsExp, plan, 'expected', trackExp);
      const stepLucky = runEngineYear(t, potsLucky, plan, 'lucky', trackLucky);
      const stepUnlucky = runEngineYear(t, potsUnlucky, plan, 'unlucky', trackUnlucky);

      const combPensions = isCouple ? (potsExp.pen_self + potsExp.pen_part) : potsExp.pen_self;
      const combISAs = isCouple ? (potsExp.isa_self + potsExp.isa_part) : potsExp.isa_self;
      const combOther = isCouple ? (potsExp.other_self + potsExp.other_part) : potsExp.other_self;
      const combCash = isCouple ? (potsExp.cash_self + potsExp.cash_part) : potsExp.cash_self;
      const pre58LiquidEquity = combISAs + combOther + combCash;

      rows.push({
        ...stepExp,
        lucky: stepLucky.totalCombined,
        unlucky: stepUnlucky.totalCombined,
        nominal: stepExp.totalCombined * Math.pow(1 + inflation, t),
        pensions: combPensions,
        isas: combISAs,
        other: combOther,
        cash: combCash,
        pre58LiquidEquity
      });
    }

    return rows;
  }, [plan, isCouple]);

  const sandboxPlan = useMemo(() => {
    return {
      ...plan,
      accounts: plan.accounts.map(acc => {
        const sb = sandboxAccounts[acc.id];
        return {
          ...acc,
          contrib: sb !== undefined ? sb.contrib : (Number(acc.contrib) || 0),
          growth: sb !== undefined ? sb.growth : (Number(acc.growth) || 0)
        };
      })
    };
  }, [plan, sandboxAccounts]);

  const isSandboxModified = useMemo(() => {
    return plan.accounts.some(acc => {
      const sb = sandboxAccounts[acc.id];
      if (!sb) return false;
      return Number(acc.contrib || 0) !== Number(sb.contrib || 0) || Number(acc.growth || 0) !== Number(sb.growth || 0);
    });
  }, [plan.accounts, sandboxAccounts]);

  const sandboxTimeline = useMemo(() => {
    const rows = [];
    const ageSelfStart = Number(sandboxPlan.demographics.currentAgeSelf) || 40;
    const terminalAge = Number(sandboxPlan.demographics.terminalAge) || 100;
    const totalYears = Math.max(1, terminalAge - ageSelfStart);

    const pots = {};
    sandboxPlan.accounts.forEach(acc => {
      pots[acc.id] = Number(acc.balance) || 0;
    });

    const tracking = { cumPclsSelf: 0, cumPclsPart: 0, lumpSumTakenSelf: false, lumpSumTakenPart: false };

    for (let t = 0; t <= totalYears; t++) {
      const step = runEngineYear(t, pots, sandboxPlan, 'expected', tracking);
      rows.push(step);
    }
    return rows;
  }, [sandboxPlan, isCouple]);

  const sandboxMetrics = useMemo(() => {
    if (!timelineData.length || !sandboxTimeline.length) return null;

    const baseTerminal = timelineData[timelineData.length - 1]?.totalCombined || 0;
    const sbTerminal = sandboxTimeline[sandboxTimeline.length - 1]?.totalCombined || 0;
    const terminalDelta = sbTerminal - baseTerminal;

    const retAge = Number(plan.demographics.retireAgeSelf) || 60;
    const baseRetRow = timelineData.find(r => r.ageSelf === retAge) || timelineData[0];
    const sbRetRow = sandboxTimeline.find(r => r.ageSelf === retAge) || sandboxTimeline[0];
    const retirementDelta = sbRetRow.totalCombined - baseRetRow.totalCombined;

    const ageStart = Number(plan.demographics.currentAgeSelf) || 40;
    const accumYears = Math.max(0, retAge - ageStart);

    let cumulativeExtraCapital = 0;
    plan.accounts.forEach(acc => {
      if (!isCouple && acc.owner === 'Partner') return;
      const baseContrib = Number(acc.contrib) || 0;
      const baseGrowth = (Number(acc.growth) || 0) / 100;
      const sbContrib = Number(sandboxAccounts[acc.id]?.contrib) || 0;
      const sbGrowth = (Number(sandboxAccounts[acc.id]?.growth) || 0) / 100;

      for (let t = 0; t < accumYears; t++) {
        const baseThisYr = baseContrib * Math.pow(1 + baseGrowth, t);
        const sbThisYr = sbContrib * Math.pow(1 + sbGrowth, t);
        cumulativeExtraCapital += (sbThisYr - baseThisYr);
      }
    });

    const multiplier = cumulativeExtraCapital !== 0 ? (terminalDelta / cumulativeExtraCapital) : 0;

    return {
      baseTerminal,
      sbTerminal,
      terminalDelta,
      baseRetirement: baseRetRow.totalCombined,
      sbRetirement: sbRetRow.totalCombined,
      retirementDelta,
      cumulativeExtraCapital,
      multiplier
    };
  }, [timelineData, sandboxTimeline, plan.demographics.retireAgeSelf, plan.demographics.currentAgeSelf, plan.accounts, sandboxAccounts, isCouple]);

  const handleApplySandboxToPlan = () => {
    setSandboxCustomized(false);
    setPlan(prev => ({
      ...prev,
      accounts: prev.accounts.map(acc => {
        const sb = sandboxAccounts[acc.id];
        return {
          ...acc,
          contrib: sb !== undefined ? sb.contrib : acc.contrib,
          growth: sb !== undefined ? sb.growth : acc.growth
        };
      })
    }));
    setSaveSuccessMsg('Sandbox applied to plan inputs');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleResetSandbox = () => {
    setSandboxCustomized(false);
    const fresh = {};
    plan.accounts.forEach(a => {
      fresh[a.id] = { contrib: Number(a.contrib) || 0, growth: Number(a.growth) || 0 };
    });
    setSandboxAccounts(fresh);
  };

  const updateSandboxField = (id, field, value) => {
    setSandboxCustomized(true);
    setSandboxAccounts(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: parseInputNumber(value)
      }
    }));
  };

  const adjustSandboxContrib = (id, delta) => {
    setSandboxCustomized(true);
    setSandboxAccounts(prev => {
      const cur = Number(prev[id]?.contrib) || 0;
      return {
        ...prev,
        [id]: {
          ...prev[id],
          contrib: Math.max(0, cur + delta)
        }
      };
    });
  };

  const handleApplyOptimizerToSandbox = (grossPensionAnnual, netIsaAnnual) => {
    setSandboxCustomized(true);
    setSandboxAccounts(prev => ({
      ...prev,
      pen_self: { ...(prev.pen_self || {}), contrib: grossPensionAnnual },
      isa_self: { ...(prev.isa_self || {}), contrib: netIsaAnnual }
    }));
    setSaveSuccessMsg('Salary sacrifice applied to Sandbox');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const handleApplyOptimizerToPlan = (grossPensionAnnual, netIsaAnnual) => {
    setSandboxCustomized(false);
    setPlan(prev => ({
      ...prev,
      accounts: prev.accounts.map(acc => {
        if (acc.id === 'pen_self') return { ...acc, contrib: grossPensionAnnual };
        if (acc.id === 'isa_self') return { ...acc, contrib: netIsaAnnual };
        return acc;
      })
    }));
    setSaveSuccessMsg('Salary sacrifice saved to Plan Inputs');
    setTimeout(() => setSaveSuccessMsg(''), 3000);
  };

  const historicalTimeline = useMemo(() => {
    const rows = [];
    const ageSelfStart = Number(plan.demographics.currentAgeSelf) || 40;
    const terminalAge = Number(plan.demographics.terminalAge) || 100;
    const totalYears = Math.max(1, terminalAge - ageSelfStart);

    const potsHist = {};
    plan.accounts.forEach(acc => {
      potsHist[acc.id] = Number(acc.balance) || 0;
    });

    const tracking = { cumPclsSelf: 0, cumPclsPart: 0, lumpSumTakenSelf: false, lumpSumTakenPart: false };

    for (let t = 0; t <= totalYears; t++) {
      const step = runEngineYear(t, potsHist, plan, { historical: true, startYear: activeHistoricalStartYear }, tracking);
      const combPensions = isCouple ? ((potsHist.pen_self || 0) + (potsHist.pen_part || 0)) : (potsHist.pen_self || 0);
      const combISAs = isCouple ? ((potsHist.isa_self || 0) + (potsHist.isa_part || 0)) : (potsHist.isa_self || 0);
      const combOther = isCouple ? ((potsHist.other_self || 0) + (potsHist.other_part || 0)) : (potsHist.other_self || 0);
      const combCash = isCouple ? ((potsHist.cash_self || 0) + (potsHist.cash_part || 0)) : (potsHist.cash_self || 0);

      rows.push({
        ...step,
        pensions: combPensions,
        isas: combISAs,
        other: combOther,
        cash: combCash
      });
    }
    return rows;
  }, [plan, isCouple, activeHistoricalStartYear]);

  const historicalMetrics = useMemo(() => {
    if (!historicalTimeline.length) return null;
    const startVal = historicalTimeline[0]?.totalCombined || 0;
    const terminalVal = historicalTimeline[historicalTimeline.length - 1]?.totalCombined || 0;
    const minVal = Math.min(...historicalTimeline.map(r => r.totalCombined));
    const failedStep = historicalTimeline.find(r => r.totalCombined <= (Number(plan.config.solvencyFloor) || 0) || r.unmetDemand > 5 || r.pre58Insolvent);
    const survived = !failedStep;
    const failAge = failedStep ? failedStep.ageSelf : null;
    const failYear = failedStep ? failedStep.year : null;

    return {
      survived,
      failAge,
      failYear,
      startVal,
      terminalVal,
      minVal,
      startHistoricalYear: activeHistoricalStartYear
    };
  }, [historicalTimeline, plan.config.solvencyFloor, activeHistoricalStartYear]);

  const chartDisplayData = useMemo(() => {
    return timelineData.map(d => {
      let activeVal = d.totalCombined;
      if (!isCouple || plan.activeProfileView === 'Myself') activeVal = d.totalSelf;
      if (isCouple && plan.activeProfileView === 'Partner') activeVal = d.totalPart;
      return {
        ...d,
        expected: activeVal
      };
    });
  }, [timelineData, plan.activeProfileView, isCouple]);

  const runSingleTrial = (planState, spendOverride = null) => {
    const testPlan = spendOverride !== null
      ? { ...planState, spending: { ...planState.spending, targetSpend: spendOverride } }
      : planState;

    const ageSelfStart = Number(testPlan.demographics.currentAgeSelf) || 40;
    const terminalAge = Number(testPlan.demographics.terminalAge) || 100;
    const totalYears = Math.max(1, terminalAge - ageSelfStart);

    const pots = {};
    testPlan.accounts.forEach(acc => {
      pots[acc.id] = Number(acc.balance) || 0;
    });

    const tracking = { cumPclsSelf: 0, cumPclsPart: 0, lumpSumTakenSelf: false, lumpSumTakenPart: false };
    let failed = false;

    for (let t = 0; t <= totalYears; t++) {
      let u1 = 0, u2 = 0;
      while (u1 === 0) u1 = Math.random();
      while (u2 === 0) u2 = Math.random();
      const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

      const step = runEngineYear(t, pots, testPlan, { z }, tracking);

      if (step.totalCombined <= (Number(testPlan.config.solvencyFloor) || 0) || step.unmetDemand > 5 || step.pre58Insolvent) {
        failed = true;
      }
    }

    const terminalPot = (pots.pen_self || 0) + (pots.isa_self || 0) + (pots.other_self || 0) + (pots.cash_self || 0) +
      (testPlan.demographics.planningMode !== 'single'
        ? ((pots.pen_part || 0) + (pots.isa_part || 0) + (pots.other_part || 0) + (pots.cash_part || 0))
        : 0);

    return {
      survived: !failed,
      terminalPot: Math.max(0, terminalPot)
    };
  };

  const handleRunMC = () => {
    setIsSimulating(true);
    setTimeout(() => {
      const NUM_TRIALS = 1000;
      const terminalPots = [];
      let successCount = 0;
      const currentSpend = Number(plan.spending.targetSpend) || 0;

      for (let i = 0; i < NUM_TRIALS; i++) {
        const res = runSingleTrial(plan);
        if (res.survived) successCount++;
        terminalPots.push(res.terminalPot);
      }

      terminalPots.sort((a, b) => a - b);
      const p10 = terminalPots[Math.floor(NUM_TRIALS * 0.10)] || 0;
      const median = terminalPots[Math.floor(NUM_TRIALS * 0.50)] || 0;
      const p90 = terminalPots[Math.floor(NUM_TRIALS * 0.90)] || 0;

      setSimResult({
        type: 'test',
        title: 'Monte Carlo Stress Test',
        spend: currentSpend,
        successRate: (successCount / NUM_TRIALS) * 100,
        p10Terminal: p10,
        medianTerminal: median,
        p90Terminal: p90
      });
      setIsSimulating(false);
    }, 30);
  };

  const handleOptimize = () => {
    setIsOptimizing(true);
    setTimeout(() => {
      const targetRate = targetConfidence;
      let low = 0;
      let high = 150000;

      for (let iter = 0; iter < 10; iter++) {
        const mid = Math.round((low + high) / 2 / 250) * 250;
        let succ = 0;
        const testTrials = 250;
        for (let i = 0; i < testTrials; i++) {
          if (runSingleTrial(plan, mid).survived) succ++;
        }
        const rate = (succ / testTrials) * 100;
        if (rate >= targetRate) {
          low = mid;
        } else {
          high = mid;
        }
      }

      const optimalSpend = Math.round(low / 250) * 250;
      const NUM_TRIALS = 1000;
      const terminalPots = [];
      let finalSucc = 0;
      for (let i = 0; i < NUM_TRIALS; i++) {
        const res = runSingleTrial(plan, optimalSpend);
        if (res.survived) finalSucc++;
        terminalPots.push(res.terminalPot);
      }

      terminalPots.sort((a, b) => a - b);
      const p10 = terminalPots[Math.floor(NUM_TRIALS * 0.10)] || 0;
      const median = terminalPots[Math.floor(NUM_TRIALS * 0.50)] || 0;
      const p90 = terminalPots[Math.floor(NUM_TRIALS * 0.90)] || 0;

      setSimResult({
        type: 'optimize',
        title: `Safe Max Annual Spend (${targetConfidence}% Target)`,
        spend: optimalSpend,
        successRate: (finalSucc / NUM_TRIALS) * 100,
        p10Terminal: p10,
        medianTerminal: median,
        p90Terminal: p90
      });
      setIsOptimizing(false);
    }, 30);
  };

  const visibleData = useMemo(() => {
    return chartDisplayData.filter(d => d.ageSelf <= maxVisibleAge);
  }, [chartDisplayData, maxVisibleAge]);

  const chartWidth = 960;
  const chartHeight = 420;
  const margin = { top: 25, right: 35, bottom: 45, left: 80 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  const xScale = useMemo(() => {
    const curAge = Number(plan.demographics.currentAgeSelf) || 40;
    return d3.scaleLinear()
      .domain([curAge, Math.max(curAge + 1, maxVisibleAge)])
      .range([0, innerWidth]);
  }, [plan.demographics.currentAgeSelf, maxVisibleAge, innerWidth]);

  const maxY = useMemo(() => {
    let max = 0;
    visibleData.forEach(d => {
      if (activeSeries.lucky && d.lucky > max) max = d.lucky;
      if (activeSeries.expected && d.expected > max) max = d.expected;
      if (activeSeries.nominal && d.nominal > max) max = d.nominal;
    });
    if (isSandboxModified && sandboxTimeline.length) {
      sandboxTimeline.forEach(d => {
        if (d.totalCombined > max) max = d.totalCombined;
      });
    }
    return Math.max(max * 1.08, 100000);
  }, [visibleData, activeSeries, isSandboxModified, sandboxTimeline]);

  const yScale = useMemo(() => {
    return d3.scaleLinear()
      .domain([0, maxY])
      .range([innerHeight, 0])
      .nice();
  }, [maxY, innerHeight]);

  const pathGenerators = useMemo(() => {
    const paths = {};
    SERIES_CONFIG.forEach(s => {
      if (activeSeries[s.id]) {
        const lineGen = d3.line()
          .x(d => xScale(d.ageSelf))
          .y(d => yScale(d[s.id] || 0))
          .curve(d3.curveMonotoneX);
        paths[s.id] = lineGen(visibleData);
      }
    });
    return paths;
  }, [visibleData, activeSeries, xScale, yScale]);

  const sandboxLinePath = useMemo(() => {
    if (!isSandboxModified || !sandboxTimeline.length) return null;
    const visibleSandbox = sandboxTimeline.filter(d => d.ageSelf <= maxVisibleAge);
    const lineGen = d3.line()
      .x(d => xScale(d.ageSelf))
      .y(d => yScale(d.totalCombined))
      .curve(d3.curveMonotoneX);
    return lineGen(visibleSandbox);
  }, [isSandboxModified, sandboxTimeline, maxVisibleAge, xScale, yScale]);

  const histMaxY = useMemo(() => {
    let max = 0;
    historicalTimeline.forEach(d => {
      if (d.totalCombined > max) max = d.totalCombined;
    });
    return Math.max(max * 1.12, 100000);
  }, [historicalTimeline]);

  const histYScale = useMemo(() => {
    return d3.scaleLinear()
      .domain([0, histMaxY])
      .range([innerHeight, 0])
      .nice();
  }, [histMaxY, innerHeight]);

  const histLinePath = useMemo(() => {
    const lineGen = d3.line()
      .x(d => xScale(d.ageSelf))
      .y(d => histYScale(d.totalCombined))
      .curve(d3.curveMonotoneX);
    return lineGen(historicalTimeline);
  }, [historicalTimeline, xScale, histYScale]);

  const formatGBP = (v) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', maximumFractionDigits: 0 }).format(v || 0);

  const updateAccountField = (id, field, value) => {
    setPlan(prev => ({
      ...prev,
      accounts: prev.accounts.map(a => a.id === id ? { ...a, [field]: field === 'risk' ? value : parseInputNumber(value) } : a)
    }));
  };

  const updateRiskField = (riskKey, field, value) => {
    setPlan(prev => ({
      ...prev,
      riskProfiles: {
        ...(prev.riskProfiles || DEFAULT_RISK_PROFILES),
        [riskKey]: {
          ...(prev.riskProfiles || DEFAULT_RISK_PROFILES)[riskKey],
          [field]: parseInputNumber(value)
        }
      }
    }));
  };

  const updateDemographics = (field, value) => {
    setPlan(prev => ({ ...prev, demographics: { ...prev.demographics, [field]: field === 'planningMode' ? value : parseInputNumber(value) } }));
  };

  const updateSpending = (field, value) => {
    setPlan(prev => ({ ...prev, spending: { ...prev.spending, [field]: (field === 'drawdownStrategy' || field === 'decumulationPolicy') ? value : parseInputNumber(value) } }));
  };

  const updateConfig = (field, value) => {
    setPlan(prev => ({ ...prev, config: { ...prev.config, [field]: field === 'valuationDate' ? value : parseInputNumber(value) } }));
  };

  const addOtherIncome = () => {
    const newInc = {
      id: 'inc_' + Date.now(),
      name: '',
      owner: 'Myself',
      startAge: '',
      endAge: '',
      amount: '',
      taxTreatment: 'Taxable',
      notes: ''
    };
    setPlan(prev => ({ ...prev, otherIncomes: [...prev.otherIncomes, newInc] }));
  };

  const deleteOtherIncome = (id) => {
    setPlan(prev => ({ ...prev, otherIncomes: prev.otherIncomes.filter(i => i.id !== id) }));
  };

  const addOneOffContrib = () => {
    const newC = {
      id: 'c_' + Date.now(),
      date: `${new Date().getFullYear() + 1}-01-01`,
      year: new Date().getFullYear() + 1,
      owner: 'Myself',
      category: 'Pensions',
      amount: '',
      desc: ''
    };
    setPlan(prev => ({ ...prev, oneOffContributions: [...prev.oneOffContributions, newC] }));
  };

  const deleteOneOffContrib = (id) => {
    setPlan(prev => ({ ...prev, oneOffContributions: prev.oneOffContributions.filter(c => c.id !== id) }));
  };

  const addOneOffCost = () => {
    const newCost = {
      id: 'cost_' + Date.now(),
      date: `${new Date().getFullYear() + 1}-06-01`,
      year: new Date().getFullYear() + 1,
      owner: 'Myself',
      amount: '',
      desc: ''
    };
    setPlan(prev => ({ ...prev, oneOffCosts: [...prev.oneOffCosts, newCost] }));
  };

  const deleteOneOffCost = (id) => {
    setPlan(prev => ({ ...prev, oneOffCosts: prev.oneOffCosts.filter(c => c.id !== id) }));
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(plan, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `retirement_plan_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJSON = (e) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target.result);
          if (!parsed.riskProfiles) parsed.riskProfiles = DEFAULT_RISK_PROFILES;
          if (!parsed.demographics) parsed.demographics = BLANK_PLAN.demographics;
          if (!parsed.demographics.planningMode) parsed.demographics.planningMode = 'couple';
          if (!parsed.spending) parsed.spending = BLANK_PLAN.spending;
          if (!parsed.spending.decumulationPolicy) parsed.spending.decumulationPolicy = 'Bracket Fill';
          setSandboxCustomized(false);
          setPlan(parsed);
        } catch (err) {
          alert("Invalid JSON configuration file.");
        }
      };
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all inputs back to blank?")) {
      setSandboxCustomized(false);
      setPlan(BLANK_PLAN);
      localStorage.removeItem(STORAGE_KEY);
      setSimResult(null);
    }
  };

  const handleExportCSV = () => {
    if (!timelineData.length) return;
    const headers = [
      'Year',
      'Age (Myself)',
      'Age (Partner)',
      'Working (Myself)',
      'Working (Partner)',
      'Target Spend (£)',
      'State Pension (Myself £)',
      'State Pension (Partner £)',
      'Net Drawdown Demand (£)',
      'Pensions (£)',
      'ISAs (£)',
      'Other Investments (£)',
      'Cash Savings (£)',
      'Total Combined Pot (£)',
      'Pre-58 Liquid (£)',
      'Pension Drawdown (£)'
    ];

    const rows = timelineData.map(r => [
      r.year,
      r.ageSelf,
      isCouple ? r.agePart : 'N/A',
      r.workingSelf ? 'Yes' : 'No',
      isCouple ? (r.workingPart ? 'Yes' : 'No') : 'N/A',
      r.targetSpend.toFixed(0),
      r.spSelf.toFixed(0),
      isCouple ? r.spPart.toFixed(0) : '0',
      r.netDrawdown.toFixed(0),
      r.pensions.toFixed(0),
      r.isas.toFixed(0),
      r.other.toFixed(0),
      r.cash.toFixed(0),
      r.totalCombined.toFixed(0),
      r.pre58LiquidEquity.toFixed(0),
      r.drawdownPensions.toFixed(0)
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `retirement_audit_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const displayedAccounts = isCouple
    ? plan.accounts
    : plan.accounts.filter(a => a.owner === 'Myself');

  const HISTORICAL_PRESETS = [
    { label: '1929 Crash (Great Depression)', year: 1929, desc: 'Severe deflation & deepest stock drop' },
    { label: '1945 Post-War (Scenario 1)', year: 1945, desc: 'Post-WWII boom, followed 25 yrs later by 1970s stagflation' },
    { label: '1955 Mid-Century (Scenario 2)', year: 1955, desc: '15 favorable years, hitting oil shock at age 75' },
    { label: '1965 Stagflation (Scenario 3)', year: 1965, desc: 'Toughest historical sequence: 17 yrs of negative bond returns' },
    { label: '1973 Oil Shock', year: 1973, desc: 'High inflation crisis + rapid equity selloff' },
    { label: '2000 Dot-Com Bust', year: 2000, desc: '3-year equity slide followed by 2008 GFC' },
    { label: '2008 Global Financial Crisis', year: 2008, desc: 'Severe market plunge with low-rate recovery' }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header Bar */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
                <TrendingUp className="w-5 h-5" />
              </div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">Retirement Planning Studio</h1>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold border border-blue-100">v3.2</span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-3xl leading-relaxed">
              UK multi-wrapper drawdown model, Monte Carlo &amp; historical backtesting. <strong className="text-slate-700 font-semibold">For educational &amp; illustrative purposes only — this is not financial advice.</strong> Please complete <span className="font-semibold text-blue-700">Plan Inputs</span> first; Config changes are optional (it is advised to start with current default settings).
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-100 p-1.5 rounded-xl border border-slate-200/80 flex-wrap">
            <button
              onClick={() => setActiveTab('inputs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'inputs' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" /> Plan Inputs
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'config' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Settings className="w-3.5 h-3.5" /> Config &amp; Assumptions
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Dashboard &amp; Simulation
            </button>
            <button
              onClick={() => setActiveTab('historical')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'historical' ? 'bg-white text-indigo-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="w-3.5 h-3.5" /> Historical Backtest
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'audit' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Table className="w-3.5 h-3.5" /> Audit Data Table
            </button>
            <button
              onClick={() => setActiveTab('docs')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'docs' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" /> Documentation
            </button>
          </div>
        </div>

        {/* PERSISTENT SCENARIO TOOLBAR */}
        <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
              <Bookmark className="w-4 h-4 text-blue-600" />
              <span>Active Scenario:</span>
            </div>

            <div className="flex items-center gap-1.5">
              <select
                value={activeScenarioId}
                onChange={(e) => handleSelectScenario(e.target.value)}
                className="p-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                {scenarios.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>

              {scenarios.length > 1 && (
                <button
                  onClick={() => handleDeleteScenario(activeScenarioId)}
                  title="Delete this scenario"
                  className="p-1.5 text-slate-400 hover:text-rose-600 cursor-pointer rounded-lg hover:bg-rose-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap ml-auto">
            <input
              type="text"
              placeholder="Scenario name (optional)"
              value={scenarioNameInput}
              onChange={(e) => setScenarioNameInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSaveScenario(); }}
              className="p-1.5 px-3 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-48 sm:w-56"
            />

            <button
              onClick={handleSaveScenario}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
            >
              <Save className="w-3.5 h-3.5" /> Save
            </button>

            <button
              onClick={handleSaveAsNewScenario}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-slate-600" /> Save as New Scenario
            </button>

            {saveSuccessMsg && (
              <span className="text-xs font-bold text-emerald-700 flex items-center gap-1 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200">
                <Check className="w-3 h-3 text-emerald-600" /> {saveSuccessMsg}
              </span>
            )}
          </div>
        </div>

        {/* TAB 1: PLAN INPUTS */}
        {activeTab === 'inputs' && (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">User Inputs &amp; Wrapper Portfolios</h2>
                <p className="text-xs text-slate-500">Press <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded text-[10px] font-mono">Tab</kbd> to move between fields.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={handleExportJSON} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200">
                  <Download className="w-3.5 h-3.5" /> Export JSON
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200">
                  <Upload className="w-3.5 h-3.5" /> Import JSON
                </button>
                <input type="file" ref={fileInputRef} onChange={handleImportJSON} accept=".json" className="hidden" />
                <button onClick={handleResetDefaults} className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer">
                  <RotateCcw className="w-3.5 h-3.5" /> Clear All Inputs
                </button>
              </div>
            </div>

            {/* Demographics & Targets */}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
                <div>
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-600" /> 1. Demographics &amp; Retirement Targets
                  </h3>
                  <span className="text-xs text-slate-500">Choose whether this plan is for an individual or a couple.</span>
                </div>

                <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                  <button
                    type="button"
                    onClick={() => updateDemographics('planningMode', 'single')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      !isCouple ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Single
                  </button>
                  <button
                    type="button"
                    onClick={() => updateDemographics('planningMode', 'couple')}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      isCouple ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    With Partner
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Current Age (Myself)</label>
                  <input type="number" placeholder="e.g. 40" onFocus={handleFocus} value={plan.demographics.currentAgeSelf} onChange={(e) => updateDemographics('currentAgeSelf', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>

                {isCouple && (
                  <div>
                    <label className="text-slate-600 font-semibold block mb-1">Current Age (Partner)</label>
                    <input type="number" placeholder="e.g. 40" onFocus={handleFocus} value={plan.demographics.currentAgePart} onChange={(e) => updateDemographics('currentAgePart', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                )}

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Retirement Age (Myself)</label>
                  <input type="number" placeholder="e.g. 60" onFocus={handleFocus} value={plan.demographics.retireAgeSelf} onChange={(e) => updateDemographics('retireAgeSelf', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>

                {isCouple && (
                  <div>
                    <label className="text-slate-600 font-semibold block mb-1">Retirement Age (Partner)</label>
                    <input type="number" placeholder="e.g. 60" onFocus={handleFocus} value={plan.demographics.retireAgePart} onChange={(e) => updateDemographics('retireAgePart', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                )}

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Expected State Pension (Myself £/yr)</label>
                  <input type="number" step="250" placeholder="e.g. 11500" onFocus={handleFocus} value={plan.demographics.statePensionSelf} onChange={(e) => updateDemographics('statePensionSelf', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>

                {isCouple && (
                  <div>
                    <label className="text-slate-600 font-semibold block mb-1">Expected State Pension (Partner £/yr)</label>
                    <input type="number" step="250" placeholder="e.g. 11500" onFocus={handleFocus} value={plan.demographics.statePensionPart} onChange={(e) => updateDemographics('statePensionPart', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                )}

                <div className="sm:col-span-2">
                  <label className="text-slate-600 font-semibold block mb-1">{isCouple ? 'Joint Net Living Spend (£/yr)' : 'Net Living Spend (£/yr)'}</label>
                  <input type="number" step="1000" placeholder="e.g. 30000" onFocus={handleFocus} value={plan.spending.targetSpend} onChange={(e) => updateSpending('targetSpend', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>

              {/* Spending Tapers */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Lifestyle Spending Tapers (Optional)</h4>
                    <span className="text-[11px] text-slate-500">Model gradual lifestyle reductions in later life (e.g. Go-Go to Slow-Go phases).</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('docs');
                      setTimeout(() => scrollToDocSection('doc-taper'), 80);
                    }}
                    className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    How two-stage spending tapers work &rarr;
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <label className="text-slate-600 font-semibold block mb-1">Taper 1 Age (Optional)</label>
                    <input type="number" placeholder="e.g. 75" onFocus={handleFocus} value={plan.spending.taper1Age} onChange={(e) => updateSpending('taper1Age', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-slate-600 font-semibold block mb-1">Taper 1 Reduction (%)</label>
                    <div className="relative">
                      <input type="number" step="1" placeholder="e.g. 10" onFocus={handleFocus} value={plan.spending.taper1Rate} onChange={(e) => updateSpending('taper1Rate', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold pr-8 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                      <span className="absolute right-3 top-2 text-slate-400 font-bold">%</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-slate-600 font-semibold block mb-1">Taper 2 Age (Optional)</label>
                    <input type="number" placeholder="e.g. 85" onFocus={handleFocus} value={plan.spending.taper2Age} onChange={(e) => updateSpending('taper2Age', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                  </div>
                  <div>
                    <label className="text-slate-600 font-semibold block mb-1">Taper 2 Reduction (%)</label>
                    <div className="relative">
                      <input type="number" step="1" placeholder="e.g. 15" onFocus={handleFocus} value={plan.spending.taper2Rate} onChange={(e) => updateSpending('taper2Rate', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold pr-8 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                      <span className="absolute right-3 top-2 text-slate-400 font-bold">%</span>
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1 block">Taper 2 reduction is relative to income after Taper 1 reduction (e.g. 100% &rarr; 90% &rarr; 81%).</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Balances & Contributions */}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4 overflow-x-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-blue-600" /> 2. Current Balances, Annual Contributions &amp; Risk Profiles
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('docs');
                    setTimeout(() => scrollToDocSection('doc-risk-profiles'), 80);
                  }}
                  className="text-xs text-blue-600 hover:text-blue-800 hover:underline font-semibold flex items-center gap-1 cursor-pointer self-start sm:self-auto"
                >
                  <HelpCircle className="w-3.5 h-3.5" />
                  Guide to investment allocations &amp; fund types &rarr;
                </button>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="pb-2">Account Wrapper</th>
                    {isCouple && <th className="pb-2">Owner</th>}
                    <th className="pb-2">Balance Today (£)</th>
                    <th className="pb-2">Annual Contribution (£)</th>
                    <th className="pb-2">Contrib Growth (%/yr)</th>
                    <th className="pb-2">Asset Allocation (Risk Tier)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {displayedAccounts.map(acc => (
                    <tr key={acc.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-2.5 font-sans font-bold text-slate-800">{acc.category}</td>
                      {isCouple && <td className="py-2.5 font-sans text-slate-500">{acc.owner}</td>}
                      <td className="py-2.5">
                        <input
                          type="number"
                          step="500"
                          placeholder="0"
                          onFocus={handleFocus}
                          value={acc.balance}
                          onChange={(e) => updateAccountField(acc.id, 'balance', e.target.value)}
                          className="w-32 p-1.5 bg-slate-50 border border-slate-300 rounded font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5">
                        <input
                          type="number"
                          step="250"
                          placeholder="0"
                          onFocus={handleFocus}
                          value={acc.contrib}
                          onChange={(e) => updateAccountField(acc.id, 'contrib', e.target.value)}
                          className="w-28 p-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5">
                        <input
                          type="number"
                          step="0.5"
                          placeholder="0"
                          onFocus={handleFocus}
                          value={acc.growth}
                          onChange={(e) => updateAccountField(acc.id, 'growth', e.target.value)}
                          className="w-20 p-1.5 bg-slate-50 border border-slate-300 rounded text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5">
                        <select
                          value={acc.risk}
                          onChange={(e) => updateAccountField(acc.id, 'risk', e.target.value)}
                          className="p-1.5 bg-slate-50 border border-slate-300 rounded text-xs text-blue-700 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                        >
                          {Object.keys(activeRiskMatrix).map(rk => (
                            <option key={rk} value={rk}>{activeRiskMatrix[rk].label || rk}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Expected Other Income */}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                    <Coins className="w-4 h-4 text-blue-600" /> 3. Expected Other Income Streams (e.g. DB Pension, Part time work, Rental)
                  </h3>
                  <span className="text-[11px] text-slate-500">Taxable streams count toward personal allowance and tax bands; tax-free streams directly reduce net drawdown demand.</span>
                </div>
                <button onClick={addOtherIncome} className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs">
                  <Plus className="w-3.5 h-3.5" /> Add Stream
                </button>
              </div>

              {plan.otherIncomes.length === 0 ? (
                <div className="text-xs text-slate-400 italic p-3 bg-slate-50 border border-slate-200 rounded-xl">No additional income streams registered.</div>
              ) : (
                <div className="space-y-2">
                  {plan.otherIncomes.map(inc => (
                    <div key={inc.id} className="grid grid-cols-1 sm:grid-cols-6 gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs items-center">
                      <input
                        type="text"
                        onFocus={handleFocus}
                        value={inc.name}
                        onChange={(e) => setPlan(p => ({ ...p, otherIncomes: p.otherIncomes.map(i => i.id === inc.id ? { ...i, name: e.target.value } : i) }))}
                        className="p-1.5 bg-white border border-slate-300 rounded font-bold text-slate-800 sm:col-span-2 focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        placeholder="Description"
                      />
                      {isCouple ? (
                        <select
                          value={inc.owner}
                          onChange={(e) => setPlan(p => ({ ...p, otherIncomes: p.otherIncomes.map(i => i.id === inc.id ? { ...i, owner: e.target.value } : i) }))}
                          className="p-1.5 bg-white border border-slate-300 rounded text-slate-700"
                        >
                          <option value="Myself">Myself</option>
                          <option value="Partner">Partner</option>
                        </select>
                      ) : (
                        <div className="p-1.5 text-slate-500 font-semibold">Myself</div>
                      )}
                      <div className="flex items-center gap-1">
                        <span className="text-slate-500">Age</span>
                        <input
                          type="number"
                          placeholder="Start"
                          onFocus={handleFocus}
                          value={inc.startAge}
                          onChange={(e) => setPlan(p => ({ ...p, otherIncomes: p.otherIncomes.map(i => i.id === inc.id ? { ...i, startAge: parseInputNumber(e.target.value) } : i) }))}
                          className="w-12 p-1 bg-white border border-slate-300 rounded font-mono text-center font-bold"
                        />
                        <span className="text-slate-400">to</span>
                        <input
                          type="number"
                          placeholder="End"
                          onFocus={handleFocus}
                          value={inc.endAge}
                          onChange={(e) => setPlan(p => ({ ...p, otherIncomes: p.otherIncomes.map(i => i.id === inc.id ? { ...i, endAge: parseInputNumber(e.target.value) } : i) }))}
                          className="w-12 p-1 bg-white border border-slate-300 rounded font-mono text-center font-bold"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          step="500"
                          placeholder="£/yr"
                          onFocus={handleFocus}
                          value={inc.amount}
                          onChange={(e) => setPlan(p => ({ ...p, otherIncomes: p.otherIncomes.map(i => i.id === inc.id ? { ...i, amount: parseInputNumber(e.target.value) } : i) }))}
                          className="w-24 p-1.5 bg-white border border-slate-300 rounded font-mono text-emerald-700 font-bold"
                        />
                        <select
                          value={inc.taxTreatment}
                          onChange={(e) => setPlan(p => ({ ...p, otherIncomes: p.otherIncomes.map(i => i.id === inc.id ? { ...i, taxTreatment: e.target.value } : i) }))}
                          className="p-1.5 bg-white border border-slate-300 rounded text-xs font-semibold text-amber-700"
                        >
                          <option value="Tax-free">Tax-free</option>
                          <option value="Taxable">Taxable</option>
                        </select>
                      </div>
                      <div className="flex justify-end">
                        <button onClick={() => deleteOtherIncome(inc.id)} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* One-Offs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                      <Plus className="w-4 h-4 text-blue-600" /> 4. One-Off Deposits (by Wrapper)
                    </h3>
                  </div>
                  <button onClick={addOneOffContrib} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer border border-slate-200">
                    <Plus className="w-3.5 h-3.5" /> Add Lump Sum
                  </button>
                </div>
                {plan.oneOffContributions.length === 0 ? (
                  <div className="text-xs text-slate-400 italic p-3 bg-slate-50 border border-slate-200 rounded-xl">No one-off contributions scheduled.</div>
                ) : (
                  <div className="space-y-2">
                    {plan.oneOffContributions.map(c => (
                      <div key={c.id} className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <input
                          type="date"
                          value={c.date || `${c.year}-01-01`}
                          onChange={(e) => {
                            const d = e.target.value;
                            const yr = parseInt(d.slice(0, 4));
                            setPlan(p => ({
                              ...p,
                              oneOffContributions: p.oneOffContributions.map(x => x.id === c.id ? { ...x, date: d, year: yr } : x)
                            }));
                          }}
                          className="p-1 bg-white border border-slate-300 rounded font-mono text-slate-800 text-xs"
                        />
                        {isCouple ? (
                          <select
                            value={c.owner}
                            onChange={(e) => setPlan(p => ({ ...p, oneOffContributions: p.oneOffContributions.map(x => x.id === c.id ? { ...x, owner: e.target.value } : x) }))}
                            className="p-1 bg-white border border-slate-300 rounded text-slate-700"
                          >
                            <option value="Myself">Myself</option>
                            <option value="Partner">Partner</option>
                          </select>
                        ) : (
                          <span className="text-slate-500 font-semibold px-1">Myself</span>
                        )}
                        <select
                          value={c.category}
                          onChange={(e) => setPlan(p => ({ ...p, oneOffContributions: p.oneOffContributions.map(x => x.id === c.id ? { ...x, category: e.target.value } : x) }))}
                          className="p-1 bg-white border border-slate-300 rounded text-blue-700 font-semibold"
                        >
                          <option value="Pensions">Pensions</option>
                          <option value="S&amp;S ISAs">S&amp;S ISAs</option>
                          <option value="Other Investments">Other Investments</option>
                          <option value="Cash Savings">Cash Savings</option>
                        </select>
                        <input
                          type="number"
                          step="1000"
                          placeholder="Amount (£)"
                          onFocus={handleFocus}
                          value={c.amount}
                          onChange={(e) => setPlan(p => ({ ...p, oneOffContributions: p.oneOffContributions.map(x => x.id === c.id ? { ...x, amount: parseInputNumber(e.target.value) } : x) }))}
                          className="w-24 p-1 bg-white border border-slate-300 rounded font-mono text-emerald-700 font-bold"
                        />
                        <button onClick={() => deleteOneOffContrib(c.id)} className="p-1 ml-auto text-slate-400 hover:text-rose-600 cursor-pointer transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-rose-700 uppercase tracking-wider flex items-center gap-2">
                      <Trash2 className="w-4 h-4 text-rose-600" /> 5. One-Off Capital Costs
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('docs');
                        setTimeout(() => scrollToDocSection('doc-one-offs'), 80);
                      }}
                      className="text-[11px] text-rose-600 hover:text-rose-800 hover:underline font-semibold flex items-center gap-1 cursor-pointer mt-0.5"
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      How costs are liquidated from your portfolio wrappers &rarr;
                    </button>
                  </div>
                  <button onClick={addOneOffCost} className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer border border-slate-200 self-start sm:self-auto">
                    <Plus className="w-3.5 h-3.5" /> Add Cost
                  </button>
                </div>
                {plan.oneOffCosts.length === 0 ? (
                  <div className="text-xs text-slate-400 italic p-3 bg-slate-50 border border-slate-200 rounded-xl">No one-off capital expenses scheduled.</div>
                ) : (
                  <div className="space-y-2">
                    {plan.oneOffCosts.map(cost => (
                      <div key={cost.id} className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                        <input
                          type="date"
                          value={cost.date || `${cost.year}-01-01`}
                          onChange={(e) => {
                            const d = e.target.value;
                            const yr = parseInt(d.slice(0, 4));
                            setPlan(p => ({
                              ...p,
                              oneOffCosts: p.oneOffCosts.map(x => x.id === cost.id ? { ...x, date: d, year: yr } : x)
                            }));
                          }}
                          className="p-1 bg-white border border-slate-300 rounded font-mono text-slate-800 text-xs"
                        />
                        <input
                          type="text"
                          onFocus={handleFocus}
                          value={cost.desc}
                          onChange={(e) => setPlan(p => ({ ...p, oneOffCosts: p.oneOffCosts.map(x => x.id === cost.id ? { ...x, desc: e.target.value } : x) }))}
                          className="p-1 bg-white border border-slate-300 rounded text-slate-700 flex-1"
                          placeholder="Purpose"
                        />
                        <input
                          type="number"
                          step="1000"
                          placeholder="Amount (£)"
                          onFocus={handleFocus}
                          value={cost.amount}
                          onChange={(e) => setPlan(p => ({ ...p, oneOffCosts: p.oneOffCosts.map(x => x.id === cost.id ? { ...x, amount: parseInputNumber(e.target.value) } : x) }))}
                          className="w-24 p-1 bg-white border border-slate-300 rounded font-mono text-rose-700 font-bold"
                        />
                        <button onClick={() => deleteOneOffCost(cost.id)} className="p-1 text-slate-400 hover:text-rose-600 cursor-pointer transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: CONFIG & ASSUMPTIONS */}
        {activeTab === 'config' && (
          <div className="space-y-6">
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" /> Decumulation &amp; Pension Withdrawal Methodology
              </h2>
              <p className="text-xs text-slate-500">Select how portfolio withdrawals are ordered across tax wrappers and how pensions are crystallized.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-1">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Decumulation Policy</label>
                  <select
                    value={plan.spending.decumulationPolicy}
                    onChange={(e) => updateSpending('decumulationPolicy', e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-blue-700 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Bracket Fill">UK FIRE Bracket Fill (Fill 0% PA first, then ISAs)</option>
                    <option value="Bracket Fill Basic">Tax Smoothing (Fill 20% Basic Rate first, preserve ISAs)</option>
                    <option value="Sequential">Sequential (Cash &rarr; GIA &rarr; ISA &rarr; Pension)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {plan.spending.decumulationPolicy === 'Bracket Fill Basic'
                      ? 'Draws pensions up to £50,270 to preserve ISAs for late-life tax shielding.'
                      : plan.spending.decumulationPolicy === 'Bracket Fill'
                      ? 'Draws pension only up to £12,570, then drains ISAs to keep current tax at 0%.'
                      : 'Liquidates each wrapper to zero in rigid sequential order.'}
                  </span>
                </div>

                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Pension Drawdown Strategy</label>
                  <select
                    value={plan.spending.drawdownStrategy}
                    onChange={(e) => updateSpending('drawdownStrategy', e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg text-xs text-blue-700 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none cursor-pointer"
                  >
                    <option value="Phased Drawdown">Phased Drawdown (Ongoing 25% tax-free proportion)</option>
                    <option value="Full 25% Lump Sum">Full 25% Lump Sum (Upfront statutory PCLS into Cash)</option>
                  </select>
                  <span className="text-[10px] text-slate-400 mt-1 block">Phased crystallizes 25% tax-free with each draw; Lump Sum dumps 25% into cash upfront.</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-600" /> Global Economic &amp; Calculation Configuration
              </h2>
              <p className="text-xs text-slate-500">Economic and regulatory tax settings used throughout the projection engine.</p>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs pt-3">
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Valuation Date (Today)</label>
                  <input
                    type="date"
                    value={plan.config.valuationDate}
                    onChange={(e) => updateConfig('valuationDate', e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Year fraction remaining is calculated automatically.</span>
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Headline Inflation CPI (% pa)</label>
                  <input type="number" step="0.1" placeholder="0" onFocus={handleFocus} value={plan.config.inflation} onChange={(e) => updateConfig('inflation', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Personal Pension Access Age (NMPA)</label>
                  <input type="number" placeholder="0" onFocus={handleFocus} value={plan.demographics.privatePensionAge} onChange={(e) => updateDemographics('privatePensionAge', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">State Pension Start Age</label>
                  <input type="number" placeholder="0" onFocus={handleFocus} value={plan.demographics.statePensionAge} onChange={(e) => updateDemographics('statePensionAge', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-900 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <label className="text-slate-600 font-semibold block mb-1">Solvency Floor (£ at Age 100)</label>
                  <input
                    type="number"
                    step="5000"
                    placeholder="0"
                    onFocus={handleFocus}
                    value={plan.config.solvencyFloor}
                    onChange={(e) => updateConfig('solvencyFloor', e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-amber-700 font-bold focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">Minimum required capital at age 100 to pass a trial.</span>
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4 overflow-x-auto">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider">Asset Allocations, Return Matrix &amp; Volatilities (σ)</h3>
                  <span className="text-[11px] text-slate-500">Each risk tier has its own annual volatility (σ) driving the Monte Carlo simulation. Click Edit to customize.</span>
                </div>
                <button
                  onClick={() => setIsEditingRisk(!isEditingRisk)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    isEditingRisk ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200'
                  }`}
                >
                  <Pencil className="w-3.5 h-3.5" />
                  {isEditingRisk ? 'Done Editing' : 'Edit Matrix'}
                </button>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="pb-2">Allocation Category</th>
                    <th className="pb-2">Expected Real Return (% pa)</th>
                    <th className="pb-2">Unlucky Real Return (% pa)</th>
                    <th className="pb-2">Lucky Real Return (% pa)</th>
                    <th className="pb-2">Nominal Return (% pa)</th>
                    <th className="pb-2">Annual Volatility (σ % pa)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono">
                  {Object.entries(activeRiskMatrix).map(([key, val]) => (
                    <tr key={key} className="hover:bg-slate-50/80">
                      <td className="py-2.5 font-sans font-bold text-slate-800">{val.label || key}</td>
                      <td className="py-2.5">
                        {isEditingRisk ? (
                          <input
                            type="number"
                            step="0.05"
                            onFocus={handleFocus}
                            value={val.real}
                            onChange={(e) => updateRiskField(key, 'real', e.target.value)}
                            className="w-20 p-1 bg-slate-50 border border-slate-300 rounded font-mono text-blue-700 font-bold focus:bg-white focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-blue-700 font-bold">{Number(val.real).toFixed(2)}%</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        {isEditingRisk ? (
                          <input
                            type="number"
                            step="0.05"
                            onFocus={handleFocus}
                            value={val.unlucky}
                            onChange={(e) => updateRiskField(key, 'unlucky', e.target.value)}
                            className="w-20 p-1 bg-slate-50 border border-slate-300 rounded font-mono text-rose-700 font-bold focus:bg-white focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-rose-700 font-bold">{Number(val.unlucky).toFixed(2)}%</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        {isEditingRisk ? (
                          <input
                            type="number"
                            step="0.05"
                            onFocus={handleFocus}
                            value={val.lucky}
                            onChange={(e) => updateRiskField(key, 'lucky', e.target.value)}
                            className="w-20 p-1 bg-slate-50 border border-slate-300 rounded font-mono text-emerald-700 font-bold focus:bg-white focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-emerald-700 font-bold">{Number(val.lucky).toFixed(2)}%</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        {isEditingRisk ? (
                          <input
                            type="number"
                            step="0.05"
                            onFocus={handleFocus}
                            value={val.nominal}
                            onChange={(e) => updateRiskField(key, 'nominal', e.target.value)}
                            className="w-20 p-1 bg-slate-50 border border-slate-300 rounded font-mono text-purple-700 font-bold focus:bg-white focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-purple-700 font-bold">{Number(val.nominal).toFixed(2)}%</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        {isEditingRisk ? (
                          <input
                            type="number"
                            step="0.5"
                            onFocus={handleFocus}
                            value={val.volatility !== undefined ? val.volatility : 12.0}
                            onChange={(e) => updateRiskField(key, 'volatility', e.target.value)}
                            className="w-20 p-1 bg-slate-50 border border-slate-300 rounded font-mono text-amber-700 font-bold focus:bg-white focus:ring-1 focus:ring-blue-500"
                          />
                        ) : (
                          <span className="text-amber-700 font-bold">{Number(val.volatility !== undefined ? val.volatility : 12.0).toFixed(1)}%</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider">UK Income Tax Bands &amp; Pension Allowances</h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-mono">
                <div>
                  <span className="text-slate-600 font-sans font-semibold block mb-1">Personal Allowance (£)</span>
                  <input type="number" placeholder="0" onFocus={handleFocus} value={plan.config.personalAllowance} onChange={(e) => updateConfig('personalAllowance', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <span className="text-slate-600 font-sans font-semibold block mb-1">PA Taper Threshold (£)</span>
                  <input type="number" placeholder="0" onFocus={handleFocus} value={plan.config.paTaperThreshold} onChange={(e) => updateConfig('paTaperThreshold', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <span className="text-slate-600 font-sans font-semibold block mb-1">Basic Rate Band Limit (£)</span>
                  <input type="number" placeholder="0" onFocus={handleFocus} value={plan.config.basicBandLimit} onChange={(e) => updateConfig('basicBandLimit', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <span className="text-slate-600 font-sans font-semibold block mb-1">Higher Rate Band Limit (£)</span>
                  <input type="number" placeholder="0" onFocus={handleFocus} value={plan.config.higherBandLimit} onChange={(e) => updateConfig('higherBandLimit', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <span className="text-slate-600 font-sans font-semibold block mb-1">PCLS Tax-Free (%)</span>
                  <input type="number" placeholder="0" onFocus={handleFocus} value={plan.config.pclsProportion} onChange={(e) => updateConfig('pclsProportion', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
                <div>
                  <span className="text-slate-600 font-sans font-semibold block mb-1">PCLS Statutory Cap (£ LSA)</span>
                  <input type="number" placeholder="0" onFocus={handleFocus} value={plan.config.pclsMaxCap} onChange={(e) => updateConfig('pclsMaxCap', e.target.value)} className="w-full p-2 bg-slate-50 border border-slate-300 rounded font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:outline-none" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: DASHBOARD & SIMULATION */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <div className="p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-xs text-slate-700 flex items-start gap-3">
              <HelpCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-blue-900 block font-semibold mb-0.5">Simulation Modes:</strong>
                <span>
                  <strong>Test Current Spend</strong> evaluates your target annual spend against 1,000 market paths using asset-specific volatilities. <strong>Safe Max Annual Spend</strong> determines the highest annual budget that survives to age 100 at your chosen confidence level.
                </span>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 font-semibold">Active View:</span>
                {(isCouple ? ['Combined', 'Myself', 'Partner'] : ['Combined']).map(p => (
                  <button
                    key={p}
                    onClick={() => setPlan(prev => ({ ...prev, activeProfileView: p }))}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      plan.activeProfileView === p ? 'bg-blue-600 text-white shadow-xs' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center bg-slate-100 border border-slate-200 rounded-xl p-1 text-xs">
                  <span className="text-slate-500 px-2 font-medium">Confidence:</span>
                  {[85, 90, 95].map(rate => (
                    <button
                      key={rate}
                      onClick={() => setTargetConfidence(rate)}
                      className={`px-2 py-0.5 rounded-lg font-semibold transition-all ${targetConfidence === rate ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
                    >
                      {rate}%
                    </button>
                  ))}
                </div>

                <button
                  onClick={handleRunMC}
                  disabled={isSimulating || isOptimizing}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-xs active:scale-95"
                >
                  <Dices className="w-3.5 h-3.5 text-blue-200" />
                  {isSimulating ? 'Testing 1,000 Paths...' : 'Test Current Spend'}
                </button>

                <button
                  onClick={handleOptimize}
                  disabled={isSimulating || isOptimizing}
                  className="px-3.5 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer active:scale-95"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                  {isOptimizing ? 'Solving...' : `⚡ Safe Max Annual Spend (${targetConfidence}%)`}
                </button>
              </div>
            </div>

            {simResult && (
              <div className={`p-5 rounded-2xl shadow-xs border transition-all ${
                simResult.successRate >= 90
                  ? 'bg-emerald-50/90 border-emerald-200'
                  : simResult.successRate >= 75
                  ? 'bg-amber-50/90 border-amber-200'
                  : 'bg-rose-50/90 border-rose-200'
              }`}>
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  <div className="flex items-center gap-3.5">
                    <div className={`p-3 rounded-2xl border ${
                      simResult.successRate >= 90
                        ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                        : simResult.successRate >= 75
                        ? 'bg-amber-100 border-amber-300 text-amber-700'
                        : 'bg-rose-100 border-rose-300 text-rose-700'
                    }`}>
                      {simResult.successRate >= 90 ? <CheckCircle2 className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`text-[11px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-md ${
                          simResult.type === 'optimize' ? 'bg-indigo-100 text-indigo-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {simResult.title}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">1,000 trials</span>
                      </div>
                      <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                        {formatGBP(simResult.spend)} <span className="text-sm font-normal text-slate-600">/ year net spend</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full lg:w-auto text-xs border-t lg:border-t-0 border-slate-200/80 pt-3 lg:pt-0">
                    <div className="bg-white/80 p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-slate-500 block mb-0.5">Survival Rate</span>
                      <span className={`text-base font-black font-mono ${
                        simResult.successRate >= 90 ? 'text-emerald-700' : simResult.successRate >= 75 ? 'text-amber-700' : 'text-rose-700'
                      }`}>
                        {simResult.successRate.toFixed(1)}%
                      </span>
                    </div>

                    <div className="bg-white/80 p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-slate-500 block mb-0.5">10th %ile Pot @ 100</span>
                      <span className="text-base font-bold font-mono text-rose-700">
                        {formatGBP(simResult.p10Terminal)}
                      </span>
                    </div>

                    <div className="bg-white/80 p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-slate-500 block mb-0.5">Median Pot @ 100</span>
                      <span className="text-base font-bold font-mono text-blue-700">
                        {formatGBP(simResult.medianTerminal)}
                      </span>
                    </div>

                    <div className="bg-white/80 p-3 rounded-xl border border-slate-200/80 shadow-2xs">
                      <span className="text-slate-500 block mb-0.5">90th %ile Pot @ 100</span>
                      <span className="text-base font-bold font-mono text-emerald-700">
                        {formatGBP(simResult.p90Terminal)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Expected Terminal Pot</div>
                <div className="text-2xl font-black font-mono text-blue-600 mt-2">
                  {formatGBP(chartDisplayData[chartDisplayData.length - 1]?.expected)}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-blue-600" /> Projected balance at age 100</div>
              </div>
              <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Lucky Scenario (90th %ile)</div>
                <div className="text-2xl font-black font-mono text-emerald-600 mt-2">
                  {formatGBP(timelineData[timelineData.length - 1]?.lucky)}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Higher-than-average market returns</div>
              </div>
              <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs">
                <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">Unlucky Scenario (10th %ile)</div>
                <div className="text-2xl font-black font-mono text-rose-600 mt-2">
                  {formatGBP(timelineData[timelineData.length - 1]?.unlucky)}
                </div>
                <div className="text-xs text-slate-500 mt-1 flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5 text-rose-600" /> Lower-than-average market returns</div>
              </div>
            </div>

            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Layers className="w-4 h-4 text-blue-600" /> Projected Portfolio Trajectory
                  </h2>
                  <span className="text-xs text-slate-500">
                    Real purchasing power by account wrapper
                    {isSandboxModified && <span className="ml-2 font-bold text-amber-600">• Showing Sandbox Impact (dashed)</span>}
                  </span>
                </div>
                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl text-xs w-full sm:w-auto">
                  <span className="text-slate-600 whitespace-nowrap">Horizon: <strong>Age {maxVisibleAge}</strong></span>
                  <input
                    type="range"
                    min="50"
                    max="100"
                    value={maxVisibleAge}
                    onChange={(e) => setMaxVisibleAge(Number(e.target.value))}
                    className="w-32 sm:w-40 accent-blue-600 cursor-pointer"
                  />
                </div>
              </div>

              <div className="relative overflow-x-auto">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto select-none" onMouseLeave={() => setHoveredPoint(null)}>
                  <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {yScale.ticks(6).map((tick, i) => (
                      <g key={i} transform={`translate(0, ${yScale(tick)})`}>
                        <line x2={innerWidth} stroke="#f1f5f9" strokeDasharray="3,3" />
                        <text x={-10} dy="0.32em" fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">£{(tick / 1000).toFixed(0)}k</text>
                      </g>
                    ))}

                    {xScale.ticks(10).map((tick, i) => (
                      <g key={i} transform={`translate(${xScale(tick)}, 0)`}>
                        <line y2={innerHeight} stroke="#f8fafc" />
                        <text y={innerHeight + 20} fill="#64748b" fontSize="11" textAnchor="middle" fontFamily="monospace">{tick}</text>
                      </g>
                    ))}

                    {(Number(plan.demographics.retireAgeSelf) || 60) <= maxVisibleAge && (
                      <g transform={`translate(${xScale(Number(plan.demographics.retireAgeSelf) || 60)}, 0)`}>
                        <line y2={innerHeight} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,4" />
                        <rect x={-42} y={10} width={84} height={20} rx={4} fill="#fef3c7" stroke="#fde68a" />
                        <text y={24} textAnchor="middle" fill="#b45309" fontSize="10" fontWeight="bold">Retire M ({Number(plan.demographics.retireAgeSelf) || 60})</text>
                      </g>
                    )}

                    {isCouple && (Number(plan.demographics.retireAgePart) || 60) <= maxVisibleAge && (
                      <g transform={`translate(${xScale(Number(plan.demographics.retireAgePart) || 60)}, 0)`}>
                        <line y2={innerHeight} stroke="#d97706" strokeWidth="1.5" strokeDasharray="3,3" />
                        <rect x={-42} y={32} width={84} height={20} rx={4} fill="#fef3c7" stroke="#fde68a" />
                        <text y={46} textAnchor="middle" fill="#b45309" fontSize="10" fontWeight="bold">Retire P ({Number(plan.demographics.retireAgePart) || 60})</text>
                      </g>
                    )}

                    {(Number(plan.demographics.privatePensionAge) || 58) <= maxVisibleAge && (
                      <g transform={`translate(${xScale(Number(plan.demographics.privatePensionAge) || 58)}, 0)`}>
                        <line y2={innerHeight} stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4,4" />
                        <rect x={-36} y={54} width={72} height={20} rx={4} fill="#e0f2fe" stroke="#bae6fd" />
                        <text y={68} textAnchor="middle" fill="#0369a1" fontSize="10" fontWeight="bold">NMPA ({Number(plan.demographics.privatePensionAge) || 58})</text>
                      </g>
                    )}

                    {(Number(plan.demographics.statePensionAge) || 68) <= maxVisibleAge && (
                      <g transform={`translate(${xScale(Number(plan.demographics.statePensionAge) || 68)}, 0)`}>
                        <line y2={innerHeight} stroke="#059669" strokeWidth="1.5" strokeDasharray="4,4" />
                        <rect x={-38} y={76} width={76} height={20} rx={4} fill="#d1fae5" stroke="#a7f3d0" />
                        <text y={90} textAnchor="middle" fill="#065f46" fontSize="10" fontWeight="bold">State Pen ({Number(plan.demographics.statePensionAge) || 68})</text>
                      </g>
                    )}

                    {SERIES_CONFIG.map(s => {
                      if (!activeSeries[s.id] || !pathGenerators[s.id]) return null;
                      return (
                        <path key={s.id} d={pathGenerators[s.id]} fill="none" stroke={s.color} strokeWidth={s.strokeWidth} strokeDasharray={s.dash} strokeLinecap="round" />
                      );
                    })}

                    {sandboxLinePath && (
                      <path
                        d={sandboxLinePath}
                        fill="none"
                        stroke="#f59e0b"
                        strokeWidth="3.5"
                        strokeDasharray="6,4"
                        strokeLinecap="round"
                      />
                    )}

                    <rect
                      width={innerWidth}
                      height={innerHeight}
                      fill="transparent"
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const age = Math.round(xScale.invert(e.clientX - rect.left));
                        const point = visibleData.find(d => d.ageSelf === age);
                        if (point) setHoveredPoint(point);
                        else setHoveredPoint(null);
                      }}
                    />

                    {hoveredPoint && (
                      <g transform={`translate(${xScale(hoveredPoint.ageSelf)}, 0)`}>
                        <line y2={innerHeight} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
                        <circle cy={yScale(hoveredPoint.expected)} r="4" fill="#2563eb" stroke="#ffffff" strokeWidth="2" />
                      </g>
                    )}
                  </g>
                </svg>

                {hoveredPoint && (
                  <div className="absolute top-4 left-24 bg-white/95 border border-slate-200 p-3 rounded-xl shadow-lg text-xs space-y-1 backdrop-blur-md pointer-events-none">
                    <div className="font-bold text-slate-800 border-b border-slate-100 pb-1 flex justify-between gap-4">
                      <span>Age {hoveredPoint.ageSelf} ({hoveredPoint.year})</span>
                      <span className="text-slate-500">Spend Demand: {formatGBP(hoveredPoint.targetSpend)}/yr</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 font-mono">
                      {activeSeries.expected && <div className="text-blue-600 font-bold">Projected Pot: {formatGBP(hoveredPoint.expected)}</div>}
                      {isSandboxModified && (
                        <div className="text-amber-600 font-bold">
                          Sandbox Pot: {formatGBP(sandboxTimeline.find(d => d.ageSelf === hoveredPoint.ageSelf)?.totalCombined)}
                        </div>
                      )}
                      {activeSeries.lucky && <div className="text-emerald-600">Lucky: {formatGBP(hoveredPoint.lucky)}</div>}
                      {activeSeries.unlucky && <div className="text-rose-600">Unlucky: {formatGBP(hoveredPoint.unlucky)}</div>}
                      {activeSeries.pensions && <div className="text-sky-600">Pensions: {formatGBP(hoveredPoint.pensions)}</div>}
                      {activeSeries.isas && <div className="text-teal-600">ISAs: {formatGBP(hoveredPoint.isas)}</div>}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2">
                  {SERIES_CONFIG.map(s => (
                    <button
                      key={s.id}
                      onClick={() => setActiveSeries(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-medium flex items-center gap-2 transition-all cursor-pointer border ${
                        activeSeries[s.id] ? 'bg-slate-100 border-slate-300 text-slate-900 font-semibold' : 'bg-white border-slate-200 text-slate-400 opacity-60'
                      }`}
                    >
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.label}
                      {activeSeries[s.id] && <Check className="w-3 h-3 text-slate-600" />}
                    </button>
                  ))}
                </div>

                {isSandboxModified && (
                  <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1 rounded-xl">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 border border-amber-600" />
                    Sandbox Active (Dashed Line)
                  </div>
                )}
              </div>
            </div>

            {/* CONTRIBUTION & ESCALATION SANDBOX */}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-5">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" /> Contribution &amp; Escalation Sandbox
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Test increasing or decreasing annual contributions and escalation growth rates in real time without modifying your base plan inputs.
                </p>
              </div>

              {/* SALARY SACRIFICE TOGGLE & WRAPPER OPTIMIZER */}
              <SalarySacrificeOptimizer
                plan={plan}
                onApplyToSandbox={handleApplyOptimizerToSandbox}
                onApplyToPlan={handleApplyOptimizerToPlan}
                onNavigateDocs={() => {
                  setActiveTab('docs');
                  setTimeout(() => scrollToDocSection('doc-salary-sacrifice'), 80);
                }}
              />

              {/* RESET SANDBOX & APPLY ACTION BAR (Directly below Optimizer Box) */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 pb-3 border-y border-slate-100">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Wrapper Sandbox Controls
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    Adjust individual wrappers below or reset back to your baseline plan inputs.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleResetSandbox}
                    disabled={!isSandboxModified}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border ${
                      isSandboxModified
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300 cursor-pointer'
                        : 'bg-slate-50 text-slate-300 border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Sandbox
                  </button>

                  <button
                    onClick={handleApplySandboxToPlan}
                    disabled={!isSandboxModified}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs ${
                      isSandboxModified
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white cursor-pointer active:scale-95'
                        : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
                    }`}
                  >
                    <Check className="w-3.5 h-3.5" /> Apply to Plan Inputs
                  </button>
                </div>
              </div>

              {/* Sandbox Live Impact KPIs */}
              {sandboxMetrics && (
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className={`p-4 rounded-2xl border shadow-2xs ${
                    sandboxMetrics.terminalDelta >= 0 ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Terminal Pot Impact (@ 100)</span>
                      {sandboxMetrics.terminalDelta >= 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-rose-600" />
                      )}
                    </div>
                    <div className={`text-xl font-black font-mono mt-1 ${
                      sandboxMetrics.terminalDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {sandboxMetrics.terminalDelta >= 0 ? '+' : ''}{formatGBP(sandboxMetrics.terminalDelta)}
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5 font-mono">
                      {formatGBP(sandboxMetrics.baseTerminal)} &rarr; {formatGBP(sandboxMetrics.sbTerminal)}
                    </span>
                  </div>

                  <div className={`p-4 rounded-2xl border shadow-2xs ${
                    sandboxMetrics.retirementDelta >= 0 ? 'bg-emerald-50/70 border-emerald-200' : 'bg-rose-50/70 border-rose-200'
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Retirement Pot Impact</span>
                      {sandboxMetrics.retirementDelta >= 0 ? (
                        <ArrowUpRight className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <ArrowDownRight className="w-4 h-4 text-rose-600" />
                      )}
                    </div>
                    <div className={`text-xl font-black font-mono mt-1 ${
                      sandboxMetrics.retirementDelta >= 0 ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {sandboxMetrics.retirementDelta >= 0 ? '+' : ''}{formatGBP(sandboxMetrics.retirementDelta)}
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5 font-mono">
                      At Age {plan.demographics.retireAgeSelf || 60}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 shadow-2xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Cumulative Extra Invested</span>
                    <div className="text-xl font-bold font-mono text-slate-800 mt-1">
                      {sandboxMetrics.cumulativeExtraCapital >= 0 ? '+' : ''}{formatGBP(sandboxMetrics.cumulativeExtraCapital)}
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Total difference in deposits
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 shadow-2xs">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">Wealth Compounding Multiple</span>
                    <div className="text-xl font-bold font-mono text-indigo-700 mt-1">
                      {sandboxMetrics.cumulativeExtraCapital !== 0 ? `${sandboxMetrics.multiplier.toFixed(2)}x` : '1.00x'}
                    </div>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      Net return per £1 adjusted
                    </span>
                  </div>
                </div>
              )}

              {/* Interactive Wrapper Control Grid */}
              <div className="overflow-x-auto border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold font-sans">
                    <tr>
                      <th className="p-3">Portfolio Wrapper</th>
                      {isCouple && <th className="p-3">Owner</th>}
                      <th className="p-3">Annual Contribution (£)</th>
                      <th className="p-3">Quick Adjust</th>
                      <th className="p-3">Escalation (% / yr)</th>
                      <th className="p-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {displayedAccounts.map(acc => {
                      const sb = sandboxAccounts[acc.id] || { contrib: acc.contrib, growth: acc.growth };
                      const isContribChanged = Number(acc.contrib || 0) !== Number(sb.contrib || 0);
                      const isGrowthChanged = Number(acc.growth || 0) !== Number(sb.growth || 0);
                      const isModified = isContribChanged || isGrowthChanged;

                      return (
                        <tr key={acc.id} className={`transition-colors ${isModified ? 'bg-amber-50/40' : 'hover:bg-slate-50/60'}`}>
                          <td className="p-3 font-sans font-bold text-slate-800">
                            {acc.category}
                            <span className="block text-[10px] text-slate-400 font-normal">Base: {formatGBP(acc.contrib)} / yr @ {acc.growth || 0}%</span>
                          </td>
                          {isCouple && <td className="p-3 font-sans text-slate-600">{acc.owner}</td>}
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="250"
                                value={sb.contrib}
                                onFocus={handleFocus}
                                onChange={(e) => updateSandboxField(acc.id, 'contrib', e.target.value)}
                                className="w-28 p-1.5 bg-white border border-slate-300 rounded font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => adjustSandboxContrib(acc.id, -1000)}
                                className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-sans font-semibold text-slate-700 cursor-pointer"
                              >
                                -1k
                              </button>
                              <button
                                onClick={() => adjustSandboxContrib(acc.id, -500)}
                                className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-sans font-semibold text-slate-700 cursor-pointer"
                              >
                                -500
                              </button>
                              <button
                                onClick={() => adjustSandboxContrib(acc.id, 500)}
                                className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-sans font-semibold text-slate-700 cursor-pointer"
                              >
                                +500
                              </button>
                              <button
                                onClick={() => adjustSandboxContrib(acc.id, 1000)}
                                className="px-1.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded text-[10px] font-sans font-semibold text-slate-700 cursor-pointer"
                              >
                                +1k
                              </button>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                step="0.5"
                                value={sb.growth}
                                onFocus={handleFocus}
                                onChange={(e) => updateSandboxField(acc.id, 'growth', e.target.value)}
                                className="w-20 p-1.5 bg-white border border-slate-300 rounded text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                              />
                              <span className="text-slate-400 font-sans">%</span>
                            </div>
                          </td>
                          <td className="p-3 text-right">
                            {isModified ? (
                              <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-sans text-[10px] font-bold">
                                Adjusted
                              </span>
                            ) : (
                              <span className="text-slate-400 font-sans text-[10px]">Unchanged</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: HISTORICAL BACKTEST */}
        {activeTab === 'historical' && (
          <div className="space-y-6">
            <div className="p-4 bg-indigo-50/70 border border-indigo-200/80 rounded-2xl text-xs text-slate-700 space-y-2">
              <div className="flex items-center gap-2 font-bold text-indigo-900 text-sm">
                <History className="w-4 h-4 text-indigo-600" />
                Empirical Historical Backtest (1928–2025)
              </div>
              <p>
                This test feeds the actual historical real returns of the global stock and bond markets directly into your plan, <strong>starting from today (Age {plan.demographics.currentAgeSelf || 40})</strong> through to Age 100.
              </p>
              <p className="text-slate-500">
                To guarantee 100% empirical historical accuracy without arbitrary wrap-arounds, selectable start years are capped at <strong>{maxHistoricalStartYear}</strong> so your entire {spanYears}-year plan runs strictly within real recorded economic history through 2025.
              </p>
            </div>

            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Select Historical Scenario or Start Year</h3>
                  <span className="text-[11px] text-slate-500">Select an iconic crisis preset or slide to any year between 1928 and {maxHistoricalStartYear}.</span>
                </div>
                <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-mono font-bold text-indigo-700">
                  <span>Start Year:</span>
                  <input
                    type="number"
                    min="1928"
                    max={maxHistoricalStartYear}
                    value={activeHistoricalStartYear}
                    onChange={(e) => setSelectedHistoricalYear(Math.max(1928, Math.min(maxHistoricalStartYear, Number(e.target.value) || 1928)))}
                    className="w-16 p-1 bg-white border border-slate-300 rounded text-center text-indigo-900 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
                {HISTORICAL_PRESETS.map(p => {
                  const isValid = p.year <= maxHistoricalStartYear;
                  return (
                    <button
                      key={p.year}
                      onClick={() => isValid && setSelectedHistoricalYear(p.year)}
                      disabled={!isValid}
                      className={`p-2.5 rounded-xl border text-left transition-all ${
                        !isValid
                          ? 'bg-slate-50 text-slate-300 border-slate-200/50 cursor-not-allowed opacity-50'
                          : activeHistoricalStartYear === p.year
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs cursor-pointer'
                          : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200 cursor-pointer'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs">{p.year}</span>
                        {!isValid && <span className="text-[9px] text-slate-400 font-sans">Over 2025</span>}
                      </div>
                      <div className={`text-[10px] leading-tight truncate mt-0.5 ${
                        !isValid ? 'text-slate-300' : activeHistoricalStartYear === p.year ? 'text-indigo-100' : 'text-slate-500'
                      }`}>
                        {p.label.split('(')[0]}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-2 flex items-center gap-3">
                <span className="text-xs font-mono text-slate-400">1928</span>
                <input
                  type="range"
                  min="1928"
                  max={maxHistoricalStartYear}
                  value={activeHistoricalStartYear}
                  onChange={(e) => setSelectedHistoricalYear(Number(e.target.value))}
                  className="w-full accent-indigo-600 cursor-pointer"
                />
                <span className="text-xs font-mono text-slate-600 font-bold">{maxHistoricalStartYear}</span>
              </div>
            </div>

            {historicalMetrics && (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className={`p-4 rounded-2xl border shadow-xs ${
                  historicalMetrics.survived ? 'bg-emerald-50/90 border-emerald-200' : 'bg-rose-50/90 border-rose-200'
                }`}>
                  <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 mb-1">Backtest Verdict</span>
                  <div className="flex items-center gap-2">
                    {historicalMetrics.survived ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0" />
                    )}
                    <div>
                      <div className={`text-base font-black ${historicalMetrics.survived ? 'text-emerald-800' : 'text-rose-800'}`}>
                        {historicalMetrics.survived ? 'Survived to Age 100' : `Depleted at Age ${historicalMetrics.failAge}`}
                      </div>
                      <span className="text-[11px] text-slate-500">
                        {historicalMetrics.survived ? 'Zero insolvency detected' : `Failed in calendar year ${historicalMetrics.failYear}`}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 mb-1">Starting Balance (Today)</span>
                  <div className="text-xl font-bold font-mono text-slate-900 mt-1">
                    {formatGBP(historicalMetrics.startVal)}
                  </div>
                  <span className="text-[11px] text-slate-400">At Age {plan.demographics.currentAgeSelf || 40}</span>
                </div>

                <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 mb-1">Lowest Portfolio Trough</span>
                  <div className="text-xl font-bold font-mono text-amber-700 mt-1">
                    {formatGBP(historicalMetrics.minVal)}
                  </div>
                  <span className="text-[11px] text-slate-400">Lowest liquidity experienced</span>
                </div>

                <div className="bg-white border border-slate-200/90 p-4 rounded-2xl shadow-xs">
                  <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-500 mb-1">Terminal Pot @ 100</span>
                  <div className={`text-xl font-bold font-mono mt-1 ${historicalMetrics.terminalVal > 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                    {formatGBP(historicalMetrics.terminalVal)}
                  </div>
                  <span className="text-[11px] text-slate-400">Real purchasing power remaining</span>
                </div>
              </div>
            )}

            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Historical Wealth Path (Simulating {activeHistoricalStartYear}–{activeHistoricalStartYear + spanYears})</h3>
                  <span className="text-xs text-slate-500">Real purchasing power across accumulation and decumulation</span>
                </div>
              </div>

              <div className="relative overflow-x-auto">
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto select-none" onMouseLeave={() => setHoveredHistPoint(null)}>
                  <g transform={`translate(${margin.left}, ${margin.top})`}>
                    {histYScale.ticks(6).map((tick, i) => (
                      <g key={i} transform={`translate(0, ${histYScale(tick)})`}>
                        <line x2={innerWidth} stroke="#f1f5f9" strokeDasharray="3,3" />
                        <text x={-10} dy="0.32em" fill="#64748b" fontSize="10" textAnchor="end" fontFamily="monospace">£{(tick / 1000).toFixed(0)}k</text>
                      </g>
                    ))}

                    {xScale.ticks(10).map((tick, i) => (
                      <g key={i} transform={`translate(${xScale(tick)}, 0)`}>
                        <line y2={innerHeight} stroke="#f8fafc" />
                        <text y={innerHeight + 20} fill="#64748b" fontSize="11" textAnchor="middle" fontFamily="monospace">{tick}</text>
                      </g>
                    ))}

                    {(Number(plan.demographics.retireAgeSelf) || 60) <= maxVisibleAge && (
                      <g transform={`translate(${xScale(Number(plan.demographics.retireAgeSelf) || 60)}, 0)`}>
                        <line y2={innerHeight} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,4" />
                        <rect x={-42} y={10} width={84} height={20} rx={4} fill="#fef3c7" stroke="#fde68a" />
                        <text y={24} textAnchor="middle" fill="#b45309" fontSize="10" fontWeight="bold">Retire M ({Number(plan.demographics.retireAgeSelf) || 60})</text>
                      </g>
                    )}

                    {isCouple && (Number(plan.demographics.retireAgePart) || 60) <= maxVisibleAge && (
                      <g transform={`translate(${xScale(Number(plan.demographics.retireAgePart) || 60)}, 0)`}>
                        <line y2={innerHeight} stroke="#d97706" strokeWidth="1.5" strokeDasharray="3,3" />
                        <rect x={-42} y={32} width={84} height={20} rx={4} fill="#fef3c7" stroke="#fde68a" />
                        <text y={46} textAnchor="middle" fill="#b45309" fontSize="10" fontWeight="bold">Retire P ({Number(plan.demographics.retireAgePart) || 60})</text>
                      </g>
                    )}

                    {(Number(plan.demographics.privatePensionAge) || 58) <= maxVisibleAge && (
                      <g transform={`translate(${xScale(Number(plan.demographics.privatePensionAge) || 58)}, 0)`}>
                        <line y2={innerHeight} stroke="#0284c7" strokeWidth="1.5" strokeDasharray="4,4" />
                        <rect x={-36} y={54} width={72} height={20} rx={4} fill="#e0f2fe" stroke="#bae6fd" />
                        <text y={68} textAnchor="middle" fill="#0369a1" fontSize="10" fontWeight="bold">NMPA ({Number(plan.demographics.privatePensionAge) || 58})</text>
                      </g>
                    )}

                    {(Number(plan.demographics.statePensionAge) || 68) <= maxVisibleAge && (
                      <g transform={`translate(${xScale(Number(plan.demographics.statePensionAge) || 68)}, 0)`}>
                        <line y2={innerHeight} stroke="#059669" strokeWidth="1.5" strokeDasharray="4,4" />
                        <rect x={-38} y={76} width={76} height={20} rx={4} fill="#d1fae5" stroke="#a7f3d0" />
                        <text y={90} textAnchor="middle" fill="#065f46" fontSize="10" fontWeight="bold">State Pen ({Number(plan.demographics.statePensionAge) || 68})</text>
                      </g>
                    )}

                    {histLinePath && (
                      <path
                        d={histLinePath}
                        fill="none"
                        stroke="#6366f1"
                        strokeWidth="3"
                        strokeLinecap="round"
                      />
                    )}

                    <rect
                      width={innerWidth}
                      height={innerHeight}
                      fill="transparent"
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const age = Math.round(xScale.invert(e.clientX - rect.left));
                        const point = historicalTimeline.find(d => d.ageSelf === age);
                        if (point) setHoveredHistPoint(point);
                        else setHoveredHistPoint(null);
                      }}
                    />

                    {hoveredHistPoint && (
                      <g transform={`translate(${xScale(hoveredHistPoint.ageSelf)}, 0)`}>
                        <line y2={innerHeight} stroke="#94a3b8" strokeWidth="1" strokeDasharray="2,2" />
                        <circle cy={histYScale(hoveredHistPoint.totalCombined)} r="4" fill="#6366f1" stroke="#ffffff" strokeWidth="2" />
                      </g>
                    )}
                  </g>
                </svg>

                {hoveredHistPoint && (
                  <div className="absolute top-4 left-24 bg-white/95 border border-slate-200 p-3 rounded-xl shadow-lg text-xs space-y-1 backdrop-blur-md pointer-events-none">
                    <div className="font-bold text-slate-800 border-b border-slate-100 pb-1 flex justify-between gap-4">
                      <span>Age {hoveredHistPoint.ageSelf} (Simulated {hoveredHistPoint.histYear})</span>
                      <span className="text-slate-500">Plan Year: {hoveredHistPoint.year}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1 font-mono">
                      <div className="text-indigo-600 font-bold">Total Pot: {formatGBP(hoveredHistPoint.totalCombined)}</div>
                      <div className="text-slate-600">Living Target: {formatGBP(hoveredHistPoint.targetSpend)}</div>
                      {hoveredHistPoint.histStockReturn !== null && (
                        <div className={hoveredHistPoint.histStockReturn >= 0 ? "text-emerald-600" : "text-rose-600"}>
                          Equity Return: {hoveredHistPoint.histStockReturn.toFixed(1)}%
                        </div>
                      )}
                      {hoveredHistPoint.histBondReturn !== null && (
                        <div className={hoveredHistPoint.histBondReturn >= 0 ? "text-emerald-600" : "text-rose-600"}>
                          Bond Return: {hoveredHistPoint.histBondReturn.toFixed(1)}%
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT DATA TABLE */}
        {activeTab === 'audit' && (
          <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <Table className="w-4 h-4 text-blue-600" /> Year-by-Year Cash Flow &amp; Wrapper Ledger
                </h2>
                <span className="text-xs text-slate-500">
                  Detailed inspection of annual contributions, guaranteed income, decumulation waterfalls, and wrapper balances.
                </span>
              </div>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all border border-slate-200 cursor-pointer self-start sm:self-auto"
              >
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> Export CSV Spreadsheet
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100/80 border-b border-slate-200 text-slate-600 font-semibold font-sans">
                  <tr>
                    <th className="p-2.5">Year</th>
                    <th className="p-2.5">Age (M)</th>
                    {isCouple && <th className="p-2.5">Age (P)</th>}
                    <th className="p-2.5">Spend Target</th>
                    <th className="p-2.5">Net Drawdown</th>
                    <th className="p-2.5">Pensions</th>
                    <th className="p-2.5">ISAs</th>
                    <th className="p-2.5">Other Inv</th>
                    <th className="p-2.5">Cash</th>
                    <th className="p-2.5">Total Combined</th>
                    <th className="p-2.5">Pre-58 Liquid</th>
                    <th className="p-2.5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                  {timelineData.map(r => (
                    <tr key={r.year} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-2 font-bold text-slate-800">{r.year}</td>
                      <td className="p-2">{r.ageSelf}</td>
                      {isCouple && <td className="p-2">{r.agePart}</td>}
                      <td className="p-2 font-sans font-medium text-slate-700">{formatGBP(r.targetSpend)}</td>
                      <td className="p-2 text-rose-600 font-medium">{formatGBP(r.netDrawdown)}</td>
                      <td className="p-2 text-sky-700">{formatGBP(r.pensions)}</td>
                      <td className="p-2 text-teal-700">{formatGBP(r.isas)}</td>
                      <td className="p-2 text-amber-700">{formatGBP(r.other)}</td>
                      <td className="p-2 text-slate-700">{formatGBP(r.cash)}</td>
                      <td className="p-2 font-bold text-blue-700">{formatGBP(r.totalCombined)}</td>
                      <td className="p-2 text-slate-600">{formatGBP(r.pre58LiquidEquity)}</td>
                      <td className="p-2 text-right">
                        {r.pre58Insolvent ? (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-sans text-[10px] font-bold">
                            Pre-58 Gap
                          </span>
                        ) : r.unmetDemand > 5 ? (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-sans text-[10px] font-bold">
                            Shortfall
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-sans text-[10px] font-bold">
                            Solvent
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: DOCUMENTATION */}
        {activeTab === 'docs' && (
          <div className="space-y-6">
            <div id="doc-salary-sacrifice" className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-600" /> Salary Sacrifice vs S&amp;S ISAs
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Salary sacrifice redirects gross employment earnings directly into your pension scheme before Income Tax and National Insurance Contributions (NIC) are deducted.
              </p>
              <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                <li><strong>Day-One Leverage:</strong> A £1,000 net sacrifice yields £1,724 inside a pension for a higher-rate taxpayer (42% combined saving), compared to £1,000 inside an ISA.</li>
                <li><strong>The Taper Cliff:</strong> For earnings between £100,000 and £125,140, every £2 earned removes £1 of Personal Allowance (effective 60% income tax + 2% NIC). Salary sacrifice into pensions recovers the Personal Allowance entirely.</li>
                <li><strong>Decumulation Arbitrage:</strong> Even though pensions are taxable upon drawdown, the 25% tax-free PCLS plus the personal allowance ensures the effective exit tax rate is typically ~15%, retaining an overwhelming compounding advantage over ISAs.</li>
              </ul>
            </div>

            <div id="doc-taper" className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-blue-600" /> Lifestyle Spending Tapers
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Retirement spending rarely stays constant throughout life. Research into retirement spending curves indicates that spending typically follows three distinct phases:
              </p>
              <ul className="list-disc pl-5 text-xs text-slate-600 space-y-1">
                <li><strong>Go-Go Years:</strong> Active travel, hobbies, home modifications, and dining out in early retirement.</li>
                <li><strong>Slow-Go Years (Taper 1):</strong> Spending on travel and lifestyle moderates naturally.</li>
                <li><strong>No-Go Years (Taper 2):</strong> Further decrease in leisure travel and active pursuits, partially offset by potential healthcare needs.</li>
              </ul>
              <p className="text-xs text-slate-600 leading-relaxed">
                Taper 2 applies relative to the post-Taper 1 spending figure. For example, £40,000 with a 10% Taper 1 reduces to £36,000, and a 10% Taper 2 subsequently reduces that to £32,400.
              </p>
            </div>

            <div id="doc-risk-profiles" className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-blue-600" /> Asset Allocations, Return Bounds &amp; Volatility (σ)
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Each investment wrapper is assigned an asset allocation risk tier with specific real and nominal expectations:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-800">High Risk (80–100% Equities)</span>
                  <p className="text-slate-500">Global index funds and world equity trackers. Highest potential long-term real return (~4.4% net of fees), but higher annual volatility (σ = 15.5%).</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-800">Medium Risk (40–60% Equities)</span>
                  <p className="text-slate-500">Balanced multi-asset portfolios containing global equities, investment-grade bonds, and gilt holdings (σ = 8.0%).</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-800">Low Risk (Fixed Income / Bonds)</span>
                  <p className="text-slate-500">Sovereign bonds, gilts, high-interest cash savings, and short-dated capital preservation instruments (σ = 3.0%).</p>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="font-bold text-slate-800">Cash Equivalents</span>
                  <p className="text-slate-500">Instant-access bank accounts and money market funds intended for immediate expenditure buffers.</p>
                </div>
              </div>
            </div>

            <div id="doc-one-offs" className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Coins className="w-4 h-4 text-blue-600" /> One-Off Cost Liquidation Hierarchy
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                When a one-off capital cost is scheduled, the engine liquidates available assets following a strict tax-efficient ordering:
              </p>
              <ol className="list-decimal pl-5 text-xs text-slate-600 space-y-1">
                <li><strong>Cash Savings:</strong> Unencumbered cash reserves are drained first.</li>
                <li><strong>Other Investments (GIA):</strong> Taxable accounts are liquidated next.</li>
                <li><strong>Stocks &amp; Shares ISAs:</strong> Tax-free liquid wrapper covers remaining cost balance.</li>
                <li><strong>Pensions:</strong> Can only be accessed once reaching the private pension access age (NMPA, typically age 58). If a cost exceeds liquid pre-58 capital before age 58, a pre-58 insolvency warning is triggered.</li>
              </ol>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}