export const DEFAULT_PLAN = {
  demographics: {
    currentAgeSelf: 35,
    currentAgePart: 36,
    retireAgeSelf: 62,
    retireAgePart: 62,
    statePensionAge: 68,
    statePensionSelf: 11500,
    statePensionPart: 11500,
    terminalAge: 100,
  },  
  spending: {
    targetSpend: 55000,
    taperAge: 80,
    taperRate: 0.15, // 15% reduction
  },
  balances: {
    pensionSelf: 50000,
    pensionPart: 40000,
    isaSelf: 25000,
    isaPart: 15000,
    cash: 15000,
    other: 0,
  },
  contributions: {
    pensionSelf: 14000,
    pensionIncreaseSelf: 3.0,
    isaSelf: 6600,
    isaIncreaseSelf: 2.0,
    pensionPart: 4000,
    pensionIncreasePart: 2.5,
    isaPart: 0,
    isaIncreasePart: 2.0,
  },
  assumptions: {
    expectedRealReturn: 4.44, // %
    luckyRealReturn: 6.31, // %
    unluckyRealReturn: 1.56, // %
    volatility: 13.5, // %
    inflation: 2.5, // %
    cashRealReturn: -0.5, // %
    personalAllowance: 12570,
    basicBandLimit: 50270,
    higherBandLimit: 125140,
  },
};
