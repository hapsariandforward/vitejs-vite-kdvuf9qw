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
  Save
} from 'lucide-react';

const STORAGE_KEY = 'rp_plan_full_v27';
const SCENARIOS_STORAGE_KEY = 'rp_saved_scenarios_v2';

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

export default function App() {
  const [activeTab, setActiveTab] = useState('inputs');
  const [isEditingRisk, setIsEditingRisk] = useState(false);
  const [selectedHistoricalYear, setSelectedHistoricalYear] = useState(1965);

  // Active working plan state
  const [plan, setPlan] = useState(() => {
    try {
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (!parsed.riskProfiles) parsed.riskProfiles = DEFAULT_RISK_PROFILES;
        if (!parsed.demographics.planningMode) parsed.demographics.planningMode = 'couple';
        if (!parsed.spending.decumulationPolicy) parsed.spending.decumulationPolicy = 'Bracket Fill';
        return parsed;
      }
      return BLANK_PLAN;
    } catch (e) {
      return BLANK_PLAN;
    }
  });

  // Multiple Saved Scenarios persistent in localStorage
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

  // Sync working plan to local storage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    } catch (e) {}
  }, [plan]);

  // Sync scenarios collection to local storage
  useEffect(() => {
    try {
      localStorage.setItem(SCENARIOS_STORAGE_KEY, JSON.stringify(scenarios));
    } catch (e) {}
  }, [scenarios]);

  const fileInputRef = useRef(null);
  const isCouple = plan.demographics.planningMode !== 'single';

  // Dynamic empirical start year limit (Horizon fitting within 1928-2025)
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
  const [showMilestones, setShowMilestones] = useState(true);
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

  // =========================================================================
  // SCENARIO SAVE & SWITCH HANDLERS
  // =========================================================================
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
      setActiveScenarioId(id);
      setPlan(JSON.parse(JSON.stringify(selected.data)));
      setSimResult(null);
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

  // =========================================================================
  // 3. UNIFIED SIMULATION ENGINE
  // =========================================================================
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

    // Retrieve historical point if running in empirical backtest mode
    const isHistorical = typeof regimeOrShock === 'object' && regimeOrShock !== null && regimeOrShock.historical;
    const histPoint = isHistorical ? getHistoricalPoint(regimeOrShock.startYear, t) : null;

    // 1. One-off Scheduled Contributions
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

    // 2. Annual Accumulation Contributions
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

    // 5. One-off Capital Costs (Grossed up for tax if spilled into pensions)
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

    // 6. Target Spend Demand (Two Optional Taper Phases)
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

    // 7. Decumulation Waterfall & Surplus Reinvestment (6-Month Buffer Cap)
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
        const pullS = Math.min(potsMap[pSelfId], demandSelf);
        potsMap[pSelfId] -= pullS;
        demandSelf -= pullS;

        if (planIsCouple) {
          const pullP = Math.min(potsMap[pPartId], demandPart);
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

    // 8. Asset Compounding (Stochastic vs 100% Empirical Historical)
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
      } else if (typeof regimeOrShock === 'object' && regimeOrShock !== null) {
        const z = regimeOrShock.z;
        const assetDrift = realRate - 0.5 * assetVol * assetVol;
        growthRate = Math.exp(assetDrift + assetVol * z) - 1;
      }

      potsMap[acc.id] = Math.max(0, potsMap[acc.id] * (1 + growthRate * compoundFactor));
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

  // 4. Deterministic Multi-Regime Timeline
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

  // 4B. Dedicated Historical Backtest Timeline (Starts from Today at selected start year)
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

  // Historical Backtest Analysis Metrics
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

  const auditMetrics = useMemo(() => {
    if (!timelineData.length) return null;
    const startVal = timelineData[0]?.totalCombined || 0;
    const retAge = Number(plan.demographics.retireAgeSelf) || 60;
    const retRow = timelineData.find(r => r.ageSelf === retAge) || timelineData[0];
    const postRetRows = timelineData.filter(r => r.ageSelf >= retAge);
    const troughVal = postRetRows.length ? Math.min(...postRetRows.map(r => r.totalCombined)) : 0;
    const terminalVal = timelineData[timelineData.length - 1]?.totalCombined || 0;
    return { startVal, retAge, retVal: retRow.totalCombined, troughVal, terminalVal };
  }, [timelineData, plan.demographics.retireAgeSelf]);

  // =========================================================================
  // 5. MONTE CARLO STOCHASTIC ENGINE
  // =========================================================================
  const executeSimulation = (spendAmount, trials = 1000) => {
    let solventCount = 0;
    const terminalPots = [];
    const floor = Number(plan.config.solvencyFloor) || 0;
    const ageSelfStart = Number(plan.demographics.currentAgeSelf) || 40;
    const terminalAge = Number(plan.demographics.terminalAge) || 100;
    const totalYears = Math.max(1, terminalAge - ageSelfStart);

    const minRetireAge = isCouple
      ? Math.min(Number(plan.demographics.retireAgeSelf) || 60, Number(plan.demographics.retireAgePart) || 60)
      : (Number(plan.demographics.retireAgeSelf) || 60);

    const trialPlan = {
      ...plan,
      spending: {
        ...plan.spending,
        targetSpend: spendAmount
      }
    };

    for (let i = 0; i < trials; i++) {
      const trialPots = {};
      plan.accounts.forEach(acc => { trialPots[acc.id] = Number(acc.balance) || 0; });
      const trialTracking = { cumPclsSelf: 0, cumPclsPart: 0, lumpSumTakenSelf: false, lumpSumTakenPart: false };
      let failed = false;

      for (let t = 0; t <= totalYears; t++) {
        const u1 = Math.max(1e-9, Math.random());
        const u2 = Math.random();
        const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);

        const step = runEngineYear(t, trialPots, trialPlan, { z }, trialTracking);

        if (step.ageSelf >= minRetireAge) {
          if (step.totalCombined <= floor || step.unmetDemand > 5 || step.pre58Insolvent) {
            failed = true;
            break;
          }
        }
      }

      const finalVal = isCouple
        ? Object.values(trialPots).reduce((a, b) => a + b, 0)
        : ((trialPots.pen_self || 0) + (trialPots.isa_self || 0) + (trialPots.other_self || 0) + (trialPots.cash_self || 0));

      if (!failed && finalVal >= floor) solventCount++;
      terminalPots.push(Math.max(0, finalVal));
    }

    terminalPots.sort((a, b) => a - b);
    return {
      testedSpend: spendAmount,
      successRate: (solventCount / trials) * 100,
      medianTerminal: terminalPots[Math.floor(trials * 0.5)],
      p10Terminal: terminalPots[Math.floor(trials * 0.1)],
      p90Terminal: terminalPots[Math.floor(trials * 0.9)]
    };
  };

  const handleRunMC = () => {
    const spend = Number(plan.spending.targetSpend);
    if (!spend || spend <= 0) {
      alert('Please enter your Living Spend target in Plan Inputs first.');
      return;
    }
    setIsSimulating(true);
    setTimeout(() => {
      const res = executeSimulation(spend, 1000);
      setSimResult({
        type: 'test',
        title: 'Current Plan Stress Test',
        spend,
        ...res
      });
      setIsSimulating(false);
    }, 150);
  };

  const handleOptimize = () => {
    const relevantAccounts = isCouple ? plan.accounts : plan.accounts.filter(a => a.owner === 'Myself');
    const totalAssets = relevantAccounts.reduce((sum, a) => sum + (Number(a.balance) || 0), 0);
    if (totalAssets <= 0) {
      alert('Please enter your portfolio account balances in Plan Inputs first.');
      return;
    }
    setIsOptimizing(true);
    setTimeout(() => {
      const base = Number(plan.spending.targetSpend) || 30000;
      let low = Math.max(5000, Math.floor((base * 0.4) / 1000) * 1000);
      let high = Math.max(150000, Math.ceil((base * 3.0) / 1000) * 1000);
      let opt = low;

      while ((high - low) > 250) {
        const mid = (low + high) / 2;
        const res = executeSimulation(mid, 300);
        if (res.successRate >= targetConfidence) { opt = mid; low = mid; }
        else high = mid;
      }
      const rounded = Math.round(opt / 250) * 250;
      const fullRes = executeSimulation(rounded, 1000);
      setSimResult({
        type: 'optimize',
        title: `Safe Max Annual Spend (${targetConfidence}% Target Confidence)`,
        spend: rounded,
        confidenceTarget: targetConfidence,
        ...fullRes
      });
      setIsOptimizing(false);
    }, 200);
  };

  // D3 Geometry for Baseline Chart
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
    return Math.max(max * 1.08, 100000);
  }, [visibleData, activeSeries]);

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

  // D3 Geometry for Historical Chart
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

  // Field Handlers
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
          if (!parsed.demographics.planningMode) parsed.demographics.planningMode = 'couple';
          if (!parsed.spending.decumulationPolicy) parsed.spending.decumulationPolicy = 'Bracket Fill';
          setPlan(parsed);
        } catch (err) {
          alert("Invalid JSON configuration file.");
        }
      };
    }
  };

  const handleResetDefaults = () => {
    if (confirm("Reset all inputs back to blank?")) {
      setPlan(BLANK_PLAN);
      localStorage.removeItem(STORAGE_KEY);
      setSimResult(null);
    }
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
              UK multi-wrapper drawdown model, Monte Carlo & historical backtesting. <strong className="text-slate-700 font-semibold">For educational & illustrative purposes only — this is not financial advice.</strong> Please complete <span className="font-semibold text-blue-700">Plan Inputs</span> first; Config changes are optional (it is advised to start with current default settings).
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
              <Settings className="w-3.5 h-3.5" /> Config & Assumptions
            </button>
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Dashboard & Simulation
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

        {/* PERSISTENT SCENARIO TOOLBAR (Visible across all tabs) */}
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
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider">User Inputs & Wrapper Portfolios</h2>
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
                    <Users className="w-4 h-4 text-blue-600" /> 1. Demographics & Retirement Targets
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

              {/* Two-Stage Optional Taper Controls */}
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
                    How two-stage spending tapers work →
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
                    <span className="text-[10px] text-slate-400 mt-1 block">Taper 2 reduction is relative to income after Taper 1 reduction (e.g. 100% → 90% → 81%).</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Balances & Contributions */}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4 overflow-x-auto">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-blue-600" /> 2. Current Balances, Annual Contributions & Risk Profiles
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
                  Guide to investment allocations & fund types →
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
                    <Coins className="w-4 h-4 text-blue-600" /> 3. Expected Other Income Streams (e.g. Defined Benefit Pension, Part time work, Rental Income, benefits)
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

            {/* Sections 4 & 5: One-Offs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider flex items-center gap-2">
                      <Plus className="w-4 h-4 text-blue-600" /> 4. One-Off Injections (by Wrapper)
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
                          <option value="S&S ISAs">S&S ISAs</option>
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
                      <HelpCircle className="w-3 h-3" />
                      How costs are liquidated from your portfolio wrappers →
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
            {/* Decumulation Strategies Card */}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Sliders className="w-4 h-4 text-blue-600" /> Decumulation & Pension Withdrawal Methodology
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
                    <option value="Sequential">Sequential (Cash → GIA → ISA → Pension)</option>
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

            {/* Global Economic & Calculation Configuration */}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Settings className="w-4 h-4 text-blue-600" /> Global Economic & Calculation Configuration
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

            {/* Editable Risk Profiles & Multi-Sigma Matrix */}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4 overflow-x-auto">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider">Asset Allocations, Return Matrix & Specific Volatilities (σ)</h3>
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

            {/* UK Tax Bands */}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <h3 className="text-xs font-bold text-blue-700 uppercase tracking-wider">UK Income Tax Bands & Pension Allowances</h3>
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

            {/* BASELINE MODEL ASSUMPTIONS REFERENCE TABLE */}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4 overflow-x-auto">
              <div>
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-blue-600" /> Baseline Model Assumptions
                </h3>
                <span className="text-[11px] text-slate-500">Core architectural, actuarial, and fiscal baselines applied across all projection regimes.</span>
              </div>

              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500 font-semibold">
                    <th className="pb-2 w-1/4">Model Parameter</th>
                    <th className="pb-2 w-1/5">Baseline Setting</th>
                    <th className="pb-2">Explanatory Notes & Methodology</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 leading-relaxed text-slate-700">
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 font-bold text-slate-900">State Pension Inflation Indexation</td>
                    <td className="py-2.5 font-mono text-blue-700 font-semibold">Triple Lock (CPI)</td>
                    <td className="py-2.5 text-slate-600">State Pension payments are assumed to increase annually in line with inflation (Triple Lock / CPI), maintaining constant real purchasing power throughout retirement.</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 font-bold text-slate-900">Target Spend Indexation</td>
                    <td className="py-2.5 font-mono text-blue-700 font-semibold">100% (CPI)</td>
                    <td className="py-2.5 text-slate-600">Target retirement living expenditures adjust annually with inflation (100% CPI) to ensure lifestyle purchasing power is fully preserved over time.</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 font-bold text-slate-900">Surplus Income Allocation</td>
                    <td className="py-2.5 font-mono text-emerald-700 font-semibold">Cash Buffer (with ISA Sweep)</td>
                    <td className="py-2.5 text-slate-600">Any surplus retirement income generated beyond annual living expenditures is swept into Tier 1 Cash Savings up to a 6-month buffer; excess beyond this cap is reinvested into S&S ISAs to eliminate cash drag.</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 font-bold text-slate-900">Projection Horizon</td>
                    <td className="py-2.5 font-mono text-slate-900 font-semibold">Age 100 (60–65 Yrs)</td>
                    <td className="py-2.5 text-slate-600">Cash flows, withdrawals, and portfolio balances are continuously modeled from current age through to Age 100 to eliminate longevity risk.</td>
                  </tr>
                  <tr className="hover:bg-slate-50/60">
                    <td className="py-2.5 font-bold text-slate-900">Spousal Expenditure Split</td>
                    <td className="py-2.5 font-mono text-indigo-700 font-semibold">50% / 50%</td>
                    <td className="py-2.5 text-slate-600">Joint living expenditures are drawn equally between spouses until one partner's liquid assets deplete, after which the remaining partner covers remaining costs with marginal tax band tracking.</td>
                  </tr>
                </tbody>
              </table>
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

            {/* Results Banner */}
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
                  <span className="text-xs text-slate-500">Real purchasing power by account wrapper</span>
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

                    {showMilestones && (
                      <>
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
                      </>
                    )}

                    {SERIES_CONFIG.map(s => {
                      if (!activeSeries[s.id] || !pathGenerators[s.id]) return null;
                      return (
                        <path key={s.id} d={pathGenerators[s.id]} fill="none" stroke={s.color} strokeWidth={s.strokeWidth} strokeDasharray={s.dash} strokeLinecap="round" />
                      );
                    })}

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
                      {activeSeries.lucky && <div className="text-emerald-600">Lucky: {formatGBP(hoveredPoint.lucky)}</div>}
                      {activeSeries.unlucky && <div className="text-rose-600">Unlucky: {formatGBP(hoveredPoint.unlucky)}</div>}
                      {activeSeries.pensions && <div className="text-sky-600">Pensions: {formatGBP(hoveredPoint.pensions)}</div>}
                      {activeSeries.isas && <div className="text-teal-600">ISAs: {formatGBP(hoveredPoint.isas)}</div>}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
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
            </div>

            {auditMetrics && (
              <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-3">
                <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Plan Benchmarks
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <span className="text-slate-500 font-sans font-semibold block mb-1">Starting Balance</span>
                    <span className="text-base font-bold text-slate-900">{formatGBP(auditMetrics.startVal)}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <span className="text-slate-500 font-sans font-semibold block mb-1">Pot at Retirement (Age {auditMetrics.retAge})</span>
                    <span className="text-base font-bold text-amber-700">{formatGBP(auditMetrics.retVal)}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <span className="text-slate-500 font-sans font-semibold block mb-1">Lowest Projected Balance</span>
                    <span className="text-base font-bold text-emerald-700">{formatGBP(auditMetrics.troughVal)}</span>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
                    <span className="text-slate-500 font-sans font-semibold block mb-1">Pot at Age 100</span>
                    <span className="text-base font-bold text-blue-700">{formatGBP(auditMetrics.terminalVal)}</span>
                  </div>
                </div>
              </div>
            )}
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

            {/* Scenario Preset Selector & Dynamic Start Year */}
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

              {/* Presets */}
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

              {/* Slider */}
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

            {/* Historical Outcome Metrics */}
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

            {/* Historical Trajectory Chart */}
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

                    {/* Milestones */}
                    {(Number(plan.demographics.retireAgeSelf) || 60) <= maxVisibleAge && (
                      <g transform={`translate(${xScale(Number(plan.demographics.retireAgeSelf) || 60)}, 0)`}>
                        <line y2={innerHeight} stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4,4" />
                        <rect x={-42} y={10} width={84} height={20} rx={4} fill="#fef3c7" stroke="#fde68a" />
                        <text y={24} textAnchor="middle" fill="#b45309" fontSize="10" fontWeight="bold">Retire M ({Number(plan.demographics.retireAgeSelf) || 60})</text>
                      </g>
                    )}

                    {(Number(plan.demographics.statePensionAge) || 68) <= maxVisibleAge && (
                      <g transform={`translate(${xScale(Number(plan.demographics.statePensionAge) || 68)}, 0)`}>
                        <line y2={innerHeight} stroke="#059669" strokeWidth="1.5" strokeDasharray="4,4" />
                        <rect x={-38} y={32} width={76} height={20} rx={4} fill="#d1fae5" stroke="#a7f3d0" />
                        <text y={46} textAnchor="middle" fill="#065f46" fontSize="10" fontWeight="bold">State Pen ({Number(plan.demographics.statePensionAge) || 68})</text>
                      </g>
                    )}

                    {/* Historical Curve */}
                    <path
                      d={histLinePath}
                      fill="none"
                      stroke="#4f46e5"
                      strokeWidth="3.5"
                      strokeLinecap="round"
                    />

                    {/* Interactive overlay */}
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
                        <line y2={innerHeight} stroke="#6366f1" strokeWidth="1.5" strokeDasharray="2,2" />
                        <circle cy={histYScale(hoveredHistPoint.totalCombined)} r="5" fill="#4f46e5" stroke="#ffffff" strokeWidth="2" />
                      </g>
                    )}
                  </g>
                </svg>

                {hoveredHistPoint && (
                  <div className="absolute top-4 left-24 bg-white/95 border border-slate-200 p-3 rounded-xl shadow-lg text-xs space-y-1 backdrop-blur-md pointer-events-none font-mono">
                    <div className="font-bold text-slate-800 border-b border-slate-100 pb-1 flex justify-between gap-4 font-sans">
                      <span>Age {hoveredHistPoint.ageSelf} ({hoveredHistPoint.year})</span>
                      <span className="text-indigo-600 font-bold">Historical Year: {hoveredHistPoint.histYear}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 pt-1">
                      <div className="text-indigo-700 font-bold">Total Pot: {formatGBP(hoveredHistPoint.totalCombined)}</div>
                      <div className="text-slate-600">Spend: {formatGBP(hoveredHistPoint.targetSpend)}/yr</div>
                      <div className={hoveredHistPoint.histStockReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        Stocks: {hoveredHistPoint.histStockReturn > 0 ? '+' : ''}{hoveredHistPoint.histStockReturn}%
                      </div>
                      <div className={hoveredHistPoint.histBondReturn >= 0 ? 'text-emerald-600' : 'text-rose-600'}>
                        Bonds: {hoveredHistPoint.histBondReturn > 0 ? '+' : ''}{hoveredHistPoint.histBondReturn}%
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Historical Ledger Table */}
            <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
                    Historical Backtest Cash Flow Ledger
                  </h3>
                  <span className="text-xs text-slate-500">Year-by-year cash flows and historical returns applied from start year {activeHistoricalStartYear}.</span>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[500px] border border-slate-200 rounded-xl">
                <table className="w-full text-left text-xs border-collapse font-mono whitespace-nowrap">
                  <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 z-10 font-bold">
                    <tr>
                      <th className="p-2.5 sticky left-0 bg-slate-100">Year</th>
                      <th className="p-2.5">t</th>
                      <th className="p-2.5">Age (M)</th>
                      <th className="p-2.5 text-indigo-700 font-bold">Simulated Year</th>
                      <th className="p-2.5 text-emerald-700">Hist Stocks</th>
                      <th className="p-2.5 text-sky-700">Hist Bonds</th>
                      <th className="p-2.5">Work</th>
                      <th className="p-2.5">Spend Demand</th>
                      <th className="p-2.5">State Pension</th>
                      <th className="p-2.5 text-amber-700">Net Drawdown</th>
                      <th className="p-2.5 text-indigo-900 font-black">Combined Real Pot</th>
                      <th className="p-2.5 text-sky-700">Pensions</th>
                      <th className="p-2.5 text-teal-700">ISAs</th>
                      <th className="p-2.5 text-amber-700">Other</th>
                      <th className="p-2.5 text-slate-500">Cash</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {historicalTimeline.map((r, idx) => (
                      <tr key={r.year} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-indigo-50/40 transition-colors`}>
                        <td className="p-2.5 font-bold text-slate-900 sticky left-0 bg-inherit border-r border-slate-100">{r.year}</td>
                        <td className="p-2.5 text-slate-400">{r.t}</td>
                        <td className="p-2.5">{r.ageSelf}</td>
                        <td className="p-2.5 font-bold text-indigo-700 bg-indigo-50/30">{r.histYear}</td>
                        <td className={`p-2.5 font-bold ${r.histStockReturn >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {r.histStockReturn > 0 ? '+' : ''}{r.histStockReturn}%
                        </td>
                        <td className={`p-2.5 font-bold ${r.histBondReturn >= 0 ? 'text-sky-700' : 'text-rose-700'}`}>
                          {r.histBondReturn > 0 ? '+' : ''}{r.histBondReturn}%
                        </td>
                        <td className="p-2.5 text-center">{r.workingSelf}</td>
                        <td className="p-2.5 text-slate-700">{formatGBP(r.targetSpend)}</td>
                        <td className="p-2.5 text-slate-500">{formatGBP(r.spSelf)}</td>
                        <td className="p-2.5 text-amber-700 font-bold">{formatGBP(r.netDrawdown)}</td>
                        <td className="p-2.5 font-black text-indigo-950 bg-indigo-50/50">{formatGBP(r.totalCombined)}</td>
                        <td className="p-2.5 text-sky-700">{formatGBP(r.pensions)}</td>
                        <td className="p-2.5 text-teal-700">{formatGBP(r.isas)}</td>
                        <td className="p-2.5 text-amber-700">{formatGBP(r.other)}</td>
                        <td className="p-2.5 text-slate-500">{formatGBP(r.cash)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: AUDIT DATA TABLE */}
        {activeTab === 'audit' && (
          <div className="bg-white border border-slate-200/90 p-5 rounded-2xl shadow-xs space-y-4">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" /> Year-by-Year Cash Flow Audit
                </h2>
                <p className="text-xs text-slate-500">Granular annual ledger matching the underlying spreadsheet columns.</p>
              </div>
              <button
                onClick={handleExportJSON}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-slate-200"
              >
                <Download className="w-3.5 h-3.5" /> Export Audit JSON
              </button>
            </div>

            <div className="overflow-x-auto max-h-[600px] border border-slate-200 rounded-xl">
              <table className="w-full text-left text-xs border-collapse font-mono whitespace-nowrap">
                <thead className="sticky top-0 bg-slate-100 border-b border-slate-200 text-slate-600 z-10 font-bold">
                  <tr>
                    <th className="p-2.5 sticky left-0 bg-slate-100">Year</th>
                    <th className="p-2.5">t</th>
                    <th className="p-2.5">Age (M)</th>
                    {isCouple && <th className="p-2.5">Age (P)</th>}
                    <th className="p-2.5">Work (M)</th>
                    {isCouple && <th className="p-2.5">Work (P)</th>}
                    <th className="p-2.5">Spend Demand</th>
                    <th className="p-2.5">SP (M)</th>
                    {isCouple && <th className="p-2.5">SP (P)</th>}
                    <th className="p-2.5">Net Drawdown</th>
                    <th className="p-2.5 text-blue-700 font-bold">Combined (Real)</th>
                    <th className="p-2.5 text-purple-700">Combined (Nominal)</th>
                    <th className="p-2.5 text-emerald-700">Lucky (Real)</th>
                    <th className="p-2.5 text-rose-700">Unlucky (Real)</th>
                    <th className="p-2.5">Pensions</th>
                    <th className="p-2.5">ISAs</th>
                    <th className="p-2.5">Other</th>
                    <th className="p-2.5">Cash</th>
                    <th className="p-2.5">Drawdown Pensions</th>
                    <th className="p-2.5 text-emerald-700">Pre-58 Liquid Equity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {timelineData.map((r, idx) => (
                    <tr key={r.year} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/50 transition-colors`}>
                      <td className="p-2.5 font-bold text-slate-900 sticky left-0 bg-inherit border-r border-slate-100">{r.year}</td>
                      <td className="p-2.5 text-slate-400">{r.t}</td>
                      <td className="p-2.5">{r.ageSelf}</td>
                      {isCouple && <td className="p-2.5">{r.agePart}</td>}
                      <td className="p-2.5 text-center">{r.workingSelf}</td>
                      {isCouple && <td className="p-2.5 text-center">{r.workingPart}</td>}
                      <td className="p-2.5 text-slate-700">{formatGBP(r.targetSpend)}</td>
                      <td className="p-2.5 text-slate-500">{formatGBP(r.spSelf)}</td>
                      {isCouple && <td className="p-2.5 text-slate-500">{formatGBP(r.spPart)}</td>}
                      <td className="p-2.5 text-amber-700 font-bold">{formatGBP(r.netDrawdown)}</td>
                      <td className="p-2.5 font-bold text-blue-700 bg-blue-50/30">{formatGBP(r.totalCombined)}</td>
                      <td className="p-2.5 text-purple-700">{formatGBP(r.nominal)}</td>
                      <td className="p-2.5 text-emerald-700">{formatGBP(r.lucky)}</td>
                      <td className="p-2.5 text-rose-700">{formatGBP(r.unlucky)}</td>
                      <td className="p-2.5 text-sky-700">{formatGBP(r.pensions)}</td>
                      <td className="p-2.5 text-teal-700">{formatGBP(r.isas)}</td>
                      <td className="p-2.5 text-amber-700">{formatGBP(r.other)}</td>
                      <td className="p-2.5 text-slate-500">{formatGBP(r.cash)}</td>
                      <td className="p-2.5 text-rose-700">{formatGBP(r.drawdownPensions)}</td>
                      <td className="p-2.5 text-emerald-800 font-semibold">{formatGBP(r.pre58LiquidEquity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 6: DOCUMENTATION */}
        {activeTab === 'docs' && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
            
            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs lg:sticky lg:top-6 space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                <BookOpen className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-900">Table of Contents</span>
              </div>
              <nav className="space-y-1 text-xs">
                {[
                  { id: 'doc-philosophy', label: '1. Architecture & Real Terms' },
                  { id: 'doc-taper', label: '2. Two-Stage Spending Tapers' },
                  { id: 'doc-timeline', label: '3. Timeline & Mid-Year Starts' },
                  { id: 'doc-incomes', label: '4. Guaranteed Income & UK Tax' },
                  { id: 'doc-gia-tax', label: '5. Note on GIA / Other Tax' },
                  { id: 'doc-surplus', label: '6. Surplus Income & 6-Mo Cash Cap' },
                  { id: 'doc-decumulation', label: '7. Decumulation Policies' },
                  { id: 'doc-pension-rules', label: '8. Phased vs 25% Lump Sum' },
                  { id: 'doc-spousal', label: '9. Spousal Absorption & Single Mode' },
                  { id: 'doc-one-offs', label: '10. One-Off Costs & Pension Tax Math' },
                  { id: 'doc-monte-carlo', label: '11. Monte Carlo & Multi-Sigma Volatility' },
                  { id: 'doc-hist', label: '12. Historical Backtesting Methodology' },
                  { id: 'doc-risk-profiles', label: '13. Asset Allocations & Fund Types' },
                  { id: 'doc-scenarios', label: '14. Saving Scenarios & Browser Storage' }
                ].map(item => (
                  <button
                    key={item.id}
                    onClick={() => scrollToDocSection(item.id)}
                    className="w-full text-left py-1.5 px-2 rounded-lg text-slate-600 hover:text-blue-700 hover:bg-blue-50/50 transition-colors block font-medium"
                  >
                    {item.label}
                  </button>
                ))}
              </nav>
            </div>

            <div className="lg:col-span-3 space-y-8 bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-xs text-slate-700 text-sm leading-relaxed">
              
              <div className="pb-6 border-b border-slate-100">
                <h2 className="text-xl font-bold text-slate-900">Model Logic & Reference Guide</h2>
                <p className="text-slate-500 text-xs mt-1">
                  How the model handles UK tax bands, wrapper liquidation order, asset allocations, volatility, scenarios, and historical sequences.
                </p>
              </div>

              {/* 1. Architecture */}
              <section id="doc-philosophy" className="space-y-3 pt-2">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
                  Architecture & Real Terms
                </h3>
                <p>
                  The model runs entirely in <strong>real terms</strong> (today's purchasing power) rather than nominal pounds. If you enter £30,000/yr, that represents £30,000 of goods and services whether you are 40, 65, or 90. Asset return rates are net of inflation.
                </p>
              </section>

              {/* 2. Two-Stage Spending Tapers */}
              <section id="doc-taper" className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">2</span>
                  Two-Stage Lifestyle Spending Tapers
                </h3>
                <p>
                  In empirical retirement research (the "spending smile"), spending naturally declines across distinct life phases:
                </p>
                <div className="space-y-2 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <strong className="text-slate-900 font-bold block">Phase 1: The "Go-Go" Years (Retirement to Age 70–75)</strong>
                    <p className="text-slate-600">Active lifestyle with peak travel, hobbies, home projects, and discretionary spending. Funded at 100% of target living spend.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <strong className="text-slate-900 font-bold block">Phase 2: The "Slow-Go" Years (Taper 1, e.g. Age 75)</strong>
                    <p className="text-slate-600">Energy levels gradually ease, overseas travel becomes domestic or less frequent, and dining out slows. Optional Taper 1 applies a percentage reduction (e.g. 10%–15%).</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <strong className="text-slate-900 font-bold block">Phase 3: The "No-Go" Years (Taper 2, e.g. Age 85)</strong>
                    <p className="text-slate-600">Lifestyle centers largely around the home. Baseline living expenditures hit their lowest point. Optional Taper 2 applies a further reduction (e.g. an additional 10%–20% relative to post-Taper 1 income).</p>
                  </div>
                </div>
              </section>

              {/* 3. Timeline */}
              <section id="doc-timeline" className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">3</span>
                  Timeline & Mid-Year Starts
                </h3>
                <p>
                  In Year 0 ($t=0$), contributions and annual growth are scaled by the remaining fraction of the year so balances reflect where you will actually be at year-end.
                </p>
              </section>

              {/* 4. Guaranteed Incomes */}
              <section id="doc-incomes" className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">4</span>
                  Guaranteed Income & UK Income Tax
                </h3>
                <p>
                  Before liquidating any invested assets, the model totals your non-portfolio income (State Pension, DB pensions, annuities, consulting). Taxable income is routed through standard UK tax bands (0% PA, 20% Basic, 40% Higher, 45% Additional, with the £100k taper).
                </p>
              </section>

              {/* 5. GIA Note */}
              <section id="doc-gia-tax" className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-base font-bold text-amber-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center text-xs font-bold">5</span>
                  Note on GIA / Other Investment Taxation
                </h3>
                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                  <p>
                    Withdrawals from <strong>Other Investments (GIAs)</strong> are treated as gross = net. We don't model Capital Gains Tax (CGT) or dividend tax because they depend heavily on individual Section 104 cost pooling and Bed & ISA transfers.
                  </p>
                </div>
              </section>

              {/* 6. Surplus Income */}
              <section id="doc-surplus" className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">6</span>
                  Surplus Income & 6-Month Emergency Buffer Cap
                </h3>
                <p>
                  If guaranteed income exceeds your living spend in a given year, portfolio withdrawals drop to £0. The model maintains a maximum emergency buffer of <strong>6 months of living expenses</strong> in Cash Savings; any excess beyond this is swept directly into the owner's <strong>Stocks & Shares ISA</strong> to prevent cash drag.
                </p>
              </section>

              {/* 7. Decumulation Waterfall */}
              <section id="doc-decumulation" className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">7</span>
                  Decumulation Policies: UK FIRE vs Tax Smoothing vs Sequential
                </h3>
                <div className="space-y-3 pt-1">
                  <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-2 text-xs">
                    <strong>Option A: UK FIRE Bracket Fill (PA Only)</strong>
                    <p className="text-slate-700">Draws pension money up to the £12,570 Personal Allowance, then drains ISAs to keep current income tax at 0%.</p>
                  </div>
                  <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-xl space-y-2 text-xs">
                    <strong>Option B: Tax Smoothing (Fill 20% Basic Rate First, Preserve ISAs)</strong>
                    <p className="text-slate-700">Fills both the 0% Personal Allowance and the 20% Basic Rate Band (up to £50,270) with pension withdrawals before touching ISAs, preserving ISAs as a tax-free emergency buffer for late retirement.</p>
                  </div>
                </div>
              </section>

              {/* 8. Pension Rules */}
              <section id="doc-pension-rules" className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">8</span>
                  Phased Drawdown vs 25% Lump Sum & LSA Cap
                </h3>
                <p className="text-xs text-slate-600">
                  Phased drawdown splits each withdrawal into 25% tax-free PCLS and 75% taxable income. Full 25% Lump Sum takes the entire 25% tax-free lump sum upfront at retirement into cash. Both track the statutory £268,275 Lump Sum Allowance cap.
                </p>
              </section>

              {/* 9. Spousal Absorption */}
              <section id="doc-spousal" className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">9</span>
                  Spousal Absorption & Single Planner Logic
                </h3>
                <p className="text-xs text-slate-600">
                  In couple mode, net living spend is split 50/50 and cross-absorbed at each tier. In single mode, 100% of spending demand routes to your own accounts without partner fallbacks.
                </p>
              </section>

              {/* 10. One-Off Costs */}
              <section id="doc-one-offs" className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">10</span>
                  One-Off Costs & Liquidation Priority
                </h3>
                <p className="text-xs text-slate-600">
                  One-off capital expenses liquidate non-pension wrappers in sequence: <code>Cash → Other (GIA) → ISAs</code>. This shields large one-off purchases from being pushed into the 40% or 45% income tax band. If non-pension accounts run out, emergency withdrawals from pensions (age 58+) are <strong>grossed up for income tax and PCLS</strong>, preventing phantom tax-free capital.
                </p>
              </section>

              {/* 11. Monte Carlo */}
              <section id="doc-monte-carlo" className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">11</span>
                  Monte Carlo & Multi-Sigma Volatility
                </h3>
                <p className="text-xs text-slate-600">
                  The engine runs 1,000 randomized 60-year paths using Geometric Brownian Motion. Rather than applying a single global volatility, each asset wrapper uses its own specific annual volatility ($\sigma$).
                </p>
              </section>

              {/* 12. Historical Backtest */}
              <section id="doc-hist" className="space-y-3 pt-4 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold">12</span>
                  Historical Backtesting Methodology (1928–2025)
                </h3>
                <div className="space-y-2 text-xs text-slate-600">
                  <p>
                    <strong>1. Starts from Today:</strong> The historical sequence starts in Year $t=0$ at your current age. If you are 40 and choose 1965, you experience 1965–1984 while working and saving, and enter retirement at 60 right into the 1985–2000 bull market.
                  </p>
                  <p>
                    <strong>2. Strictly Empirical Horizon:</strong> Selectable start years are capped so your entire lifetime horizon to age 100 runs strictly within recorded market history through 2025 without arbitrary wrap-arounds.
                  </p>
                  <p>
                    <strong>3. Asset Class Weights:</strong> Each wrapper compounds by its weighted real equity and bond returns (e.g. High Risk is 90% S&P 500 / 10% Bonds; Low Risk is 10% S&P 500 / 90% Bonds).
                  </p>
                </div>
              </section>

              {/* 13. Asset Allocations */}
              <section id="doc-risk-profiles" className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">13</span>
                  Asset Allocations & Fund Types
                </h3>
                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <strong className="text-slate-900 font-bold block">80–100% Equities (Expected Real: ~4.44% pa / σ: 15.5%)</strong>
                    <p className="text-slate-600">Global index trackers, all-cap funds, S&P 500, Vanguard LifeStrategy 100.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <strong className="text-slate-900 font-bold block">60–80% Equities (Expected Real: ~3.72% pa / σ: 11.5%)</strong>
                    <p className="text-slate-600">Vanguard LifeStrategy 80, workplace default growth funds.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <strong className="text-slate-900 font-bold block">40–60% Equities (Expected Real: ~3.00% pa / σ: 8.0%)</strong>
                    <p className="text-slate-600">Classic balanced 60/40 portfolios, Vanguard LifeStrategy 60.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <strong className="text-slate-900 font-bold block">20–40% Equities (Expected Real: ~2.28% pa / σ: 5.5%)</strong>
                    <p className="text-slate-600">Cautious capital preservation funds, Vanguard LifeStrategy 20/40.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <strong className="text-slate-900 font-bold block">High interest Cash Savings, Fixed Income, Bonds (Expected Real: ~1.56% pa / σ: 3.0%)</strong>
                    <p className="text-slate-600">UK Gilts, investment-grade corporate bonds, fixed-term bonds.</p>
                  </div>
                  <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
                    <strong className="text-slate-900 font-bold block">instant cash savings/money market (Expected Real: ~-0.50% pa / σ: 0.5%)</strong>
                    <p className="text-slate-600">Easy-access bank savings, short-term treasury bills, SONIA funds (e.g. CSH2).</p>
                  </div>
                </div>
              </section>

              {/* 14. Saving Scenarios & Browser Storage */}
              <section id="doc-scenarios" className="space-y-4 pt-4 border-t border-slate-100">
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">14</span>
                  Saving Scenarios & Browser Storage
                </h3>
                <p>
                  The studio allows you to build, name, and compare multiple financial scenarios side-by-side (such as retiring at 55 vs 60, testing higher living expenditures, or evaluating single vs couple modes).
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Bookmark className="w-4 h-4 text-blue-600" />
                      Persistent In-Browser Memory
                    </div>
                    <p className="text-slate-600">
                      All created scenarios and your active working plan are saved directly to your browser's local storage (<code>localStorage</code>). They persist across page reloads, browser restarts, and tab closures without needing any login or cloud database.
                    </p>
                  </div>

                  <div className="p-3.5 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-1.5 font-bold text-slate-900">
                      <Save className="w-4 h-4 text-indigo-600" />
                      Save vs. Save as New Scenario
                    </div>
                    <p className="text-slate-600">
                      Use the <strong>Save</strong> button to overwrite and update your currently selected scenario with any recent changes. Use <strong>Save as New Scenario</strong> to branch your current plan into a new separate scenario (using your custom name if typed in, or auto-numbering like "Scenario 2").
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl text-xs text-amber-950 space-y-1.5">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Important Note on Local Storage & Backups
                  </div>
                  <p>
                    Because localStorage is tied to your specific browser and machine, clearing your browser cookies/site data will wipe them. Using the Export JSON button remains the recommended way to create permanent file backups.
                  </p>
                </div>
              </section>

            </div>
          </div>
        )}

      </div>
    </div>
  );
}