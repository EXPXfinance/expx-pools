import BigNumber from './bignumber';

const EONE = new BigNumber(10).pow(18);
const EXIT_FEE = new BigNumber(0);
const EPOW_PRECISION = EONE.idiv(new BigNumber(10).pow(10));

function eToi(a: BigNumber): BigNumber {
  return a.idiv(EONE);
}

function eFloor(a: BigNumber): BigNumber {
  return eToi(a).times(EONE);
}

function eSubSign(
  a: BigNumber,
  b: BigNumber
): { res: BigNumber; bool: boolean } {
  if (a.gte(b)) {
    const res = a.minus(b);
    const bool = false;
    return { res, bool };
  } else {
    const res = b.minus(a);
    const bool = true;
    return { res, bool };
  }
}

export function eMul(a: BigNumber, b: BigNumber): BigNumber {
  const c0 = a.times(b);
  const c1 = c0.plus(EONE.div(new BigNumber(2)));
  const c2 = c1.idiv(EONE);
  return c2;
}

export function eDiv(a: BigNumber, b: BigNumber): BigNumber {
  const c0 = a.times(EONE);
  const c1 = c0.plus(b.div(new BigNumber(2)));
  const c2 = c1.idiv(b);
  return c2;
}

function ePowi(a: BigNumber, n: BigNumber): BigNumber {
  let z = !n.modulo(new BigNumber(2)).eq(new BigNumber(0)) ? a : EONE;

  for (
    n = n.idiv(new BigNumber(2));
    !n.eq(new BigNumber(0));
    n = n.idiv(new BigNumber(2))
  ) {
    a = eMul(a, a);
    if (!n.modulo(new BigNumber(2)).eq(new BigNumber(0))) {
      z = eMul(z, a);
    }
  }
  return z;
}

function ePowApprox(
  base: BigNumber,
  exp: BigNumber,
  precision: BigNumber
): BigNumber {
  const a = exp;
  const { res: x, bool: xneg } = eSubSign(base, EONE);
  let term = EONE;
  let sum = term;
  let negative = false;
  const LOOP_LIMIT = 1000;

  let idx = 0;
  for (let i = 1; term.gte(precision); i++) {
    idx += 1;
    // Some values cause it to lock up the browser
    // Test case: Remove Liquidity, single asset, poolAmountIn >> max
    // Should be halted before calling this, but...
    // Retain this halt after a max iteration limit as a backstop/failsafe
    if (LOOP_LIMIT == idx) {
      break;
    }

    const bigK = new BigNumber(i).times(EONE);
    const { res: c, bool: cneg } = eSubSign(a, bigK.minus(EONE));
    term = eMul(term, eMul(c, x));
    term = eDiv(term, bigK);
    if (term.eq(new BigNumber(0))) break;

    if (xneg) negative = !negative;
    if (cneg) negative = !negative;
    if (negative) {
      sum = sum.minus(term);
    } else {
      sum = sum.plus(term);
    }
  }

  return sum;
}

function ePow(base: BigNumber, exp: BigNumber): BigNumber {
  const whole = eFloor(exp);
  const remain = exp.minus(whole);
  const wholePow = ePowi(base, eToi(whole));
  if (remain.eq(new BigNumber(0))) {
    return wholePow;
  }

  const partialResult = ePowApprox(base, remain, EPOW_PRECISION);
  return eMul(wholePow, partialResult);
}

export function calcOutGivenIn(
  tokenBalanceIn: BigNumber,
  tokenWeightIn: BigNumber,
  tokenBalanceOut: BigNumber,
  tokenWeightOut: BigNumber,
  tokenAmountIn: BigNumber,
  swapFee: BigNumber
): BigNumber {
  const weightRatio = eDiv(tokenWeightIn, tokenWeightOut);
  let adjustedIn = EONE.minus(swapFee);
  adjustedIn = eMul(tokenAmountIn, adjustedIn);
  const y = eDiv(tokenBalanceIn, tokenBalanceIn.plus(adjustedIn));
  const foo = ePow(y, weightRatio);
  const bar = EONE.minus(foo);
  return eMul(tokenBalanceOut, bar);
}

export function calcInGivenOut(
  tokenBalanceIn: BigNumber,
  tokenWeightIn: BigNumber,
  tokenBalanceOut: BigNumber,
  tokenWeightOut: BigNumber,
  tokenAmountOut: BigNumber,
  swapFee: BigNumber
): BigNumber {
  const weightRatio = eDiv(tokenWeightOut, tokenWeightIn);
  const diff = tokenBalanceOut.minus(tokenAmountOut);
  const y = eDiv(tokenBalanceOut, diff);
  let foo = ePow(y, weightRatio);
  foo = foo.minus(EONE);
  let tokenAmountIn = EONE.minus(swapFee);
  tokenAmountIn = eDiv(eMul(tokenBalanceIn, foo), tokenAmountIn);
  return tokenAmountIn;
}

export function calcSpotPrice(
  tokenBalanceIn: BigNumber,
  tokenWeightIn: BigNumber,
  tokenBalanceOut: BigNumber,
  tokenWeightOut: BigNumber,
  swapFee: BigNumber
): BigNumber {
  const numer = eDiv(tokenBalanceIn, tokenWeightIn);
  const denom = eDiv(tokenBalanceOut, tokenWeightOut);
  const ratio = eDiv(numer, denom);
  const scale = eDiv(EONE, eSubSign(EONE, swapFee).res);
  return eMul(ratio, scale);
}

export function calcPoolOutGivenSingleIn(
  tokenBalanceIn: BigNumber,
  tokenWeightIn: BigNumber,
  poolSupply: BigNumber,
  totalWeight: BigNumber,
  tokenAmountIn: BigNumber,
  swapFee: BigNumber
): BigNumber {
  const normalizedWeight = eDiv(tokenWeightIn, totalWeight);
  const zaz = eMul(EONE.minus(normalizedWeight), swapFee);
  const tokenAmountInAfterFee = eMul(tokenAmountIn, EONE.minus(zaz));

  const newTokenBalanceIn = tokenBalanceIn.plus(tokenAmountInAfterFee);
  const tokenInRatio = eDiv(newTokenBalanceIn, tokenBalanceIn);

  const poolRatio = ePow(tokenInRatio, normalizedWeight);
  const newPoolSupply = eMul(poolRatio, poolSupply);
  const poolAmountOut = newPoolSupply.minus(poolSupply);
  return poolAmountOut;
}

export function calcPoolInGivenSingleOut(
  tokenBalanceOut: BigNumber,
  tokenWeightOut: BigNumber,
  poolSupply: BigNumber,
  totalWeight: BigNumber,
  tokenAmountOut: BigNumber,
  swapFee: BigNumber
): BigNumber {
  const normalizedWeight = eDiv(tokenWeightOut, totalWeight);
  const zoo = EONE.minus(normalizedWeight);
  const zar = eMul(zoo, swapFee);
  const tokenAmountOutBeforeSwapFee = eDiv(tokenAmountOut, EONE.minus(zar));

  const newTokenBalanceOut = tokenBalanceOut.minus(tokenAmountOutBeforeSwapFee);
  const tokenOutRatio = eDiv(newTokenBalanceOut, tokenBalanceOut);

  const poolRatio = ePow(tokenOutRatio, normalizedWeight);
  const newPoolSupply = eMul(poolRatio, poolSupply);
  const poolAmountInAfterExitFee = poolSupply.minus(newPoolSupply);

  const poolAmountIn = eDiv(poolAmountInAfterExitFee, EONE.minus(EXIT_FEE));
  return poolAmountIn;
}

export function calcSingleInGivenPoolOut(
  tokenBalanceIn: BigNumber,
  tokenWeightIn: BigNumber,
  poolSupply: BigNumber,
  totalWeight: BigNumber,
  poolAmountOut: BigNumber,
  swapFee: BigNumber
): BigNumber {
  const normalizedWeight = eDiv(tokenWeightIn, totalWeight);
  const newPoolSupply = poolSupply.plus(poolAmountOut);
  const poolRatio = eDiv(newPoolSupply, poolSupply);

  const boo = eDiv(EONE, normalizedWeight);
  const tokenInRatio = ePow(poolRatio, boo);
  const newTokenBalanceIn = eMul(tokenInRatio, tokenBalanceIn);
  const tokenAmountInAfterFee = newTokenBalanceIn.minus(tokenBalanceIn);

  const zar = eMul(EONE.minus(normalizedWeight), swapFee);
  const tokenAmountIn = eDiv(tokenAmountInAfterFee, EONE.minus(zar));
  return tokenAmountIn;
}

export function calcSingleOutGivenPoolIn(
  tokenBalanceOut: BigNumber,
  tokenWeightOut: BigNumber,
  poolSupply: BigNumber,
  totalWeight: BigNumber,
  poolAmountIn: BigNumber,
  swapFee: BigNumber
): BigNumber {
  const normalizedWeight = eDiv(tokenWeightOut, totalWeight);
  const poolAmountInAfterExitFee = eMul(poolAmountIn, EONE.minus(EXIT_FEE));
  const newPoolSupply = poolSupply.minus(poolAmountInAfterExitFee);
  const poolRatio = eDiv(newPoolSupply, poolSupply);

  const tokenOutRatio = ePow(poolRatio, eDiv(EONE, normalizedWeight));
  const newTokenBalanceOut = eMul(tokenOutRatio, tokenBalanceOut);

  const tokenAmountOutBeforeSwapFee = tokenBalanceOut.minus(newTokenBalanceOut);

  const zaz = eMul(EONE.minus(normalizedWeight), swapFee);
  const tokenAmountOut = eMul(tokenAmountOutBeforeSwapFee, EONE.minus(zaz));
  return tokenAmountOut;
}

export function calcSingleInGivenWeightIncrease(
  tokenBalance: BigNumber,
  tokenWeight: BigNumber,
  tokenWeightNew: BigNumber
): BigNumber {
  const deltaWeight = tokenWeightNew.minus(tokenWeight);
  const tokenBalanceIn = eMul(tokenBalance, eDiv(deltaWeight, tokenWeight));
  return tokenBalanceIn;
}

export function calcSingleOutGivenWeightDecrease(
  tokenBalance: BigNumber,
  tokenWeight: BigNumber,
  tokenWeightNew: BigNumber
): BigNumber {
  const deltaWeight = tokenWeight.minus(tokenWeightNew);
  const tokenBalanceOut = eMul(tokenBalance, eDiv(deltaWeight, tokenWeight));
  return tokenBalanceOut;
}

export function calcPoolInGivenWeightDecrease(
  totalWeight: BigNumber,
  tokenWeight: BigNumber,
  tokenWeightNew: BigNumber,
  poolSupply: BigNumber
): BigNumber {
  const deltaWeight = tokenWeight.minus(tokenWeightNew);
  const poolAmountIn = eMul(poolSupply, eDiv(deltaWeight, totalWeight));
  return poolAmountIn;
}

export function calcPoolOutGivenWeightIncrease(
  totalWeight: BigNumber,
  tokenWeight: BigNumber,
  tokenWeightNew: BigNumber,
  poolSupply: BigNumber
): BigNumber {
  const deltaWeight = tokenWeightNew.minus(tokenWeight);
  const poolAmountOut = eMul(poolSupply, eDiv(deltaWeight, totalWeight));
  return poolAmountOut;
}

export function calcPoolInGivenTokenRemove(
  totalWeight: BigNumber,
  tokenWeight: BigNumber,
  poolSupply: BigNumber
): BigNumber {
  const poolAmountIn = eDiv(eMul(poolSupply, tokenWeight), totalWeight);
  return poolAmountIn;
}
