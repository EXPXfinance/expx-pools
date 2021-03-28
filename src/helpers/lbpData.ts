import { calcSpotPrice } from './math';
import { bnum } from './utils';

const reserveCurrencies = {
  56: [
    '0xe9e7CEA3DedcA5984780Bafc599bD69ADd087D56', // BUSD
    '0x55d398326f99059fF775485246999027B3197955', // USDT
    '0x1AF3F329e8BE154074D8769D1FFa4eE058B1DBc3' // DAI
  ],
  97: [
    '0xc92808e1D74Bc795fC3a9A4396d15dA1F23190DA' // BUSD
  ]
};

export function swapPrice(pool, chainId, swap) {
  const reserves = new Set(reserveCurrencies[chainId]);
  const poolTokens = new Set(pool.tokensList);

  const intersection = new Set([...poolTokens].filter(x => reserves.has(x)));

  const reserveToken = intersection
    .values()
    .next()
    .value.toLowerCase();

  return swap.tokenIn === reserveToken
    ? swap.tokenAmountIn / swap.tokenAmountOut
    : swap.tokenAmountOut / swap.tokenAmountIn;
}

export function getLbpData(pool, chainId) {
  const reserves = new Set(reserveCurrencies[chainId]);
  const poolTokens = new Set(pool.tokensList);

  let projectToken;
  let projectIdx;
  let reserveIdx;

  // Reserve token is the pool token that IS in reserves
  const intersection = new Set([...poolTokens].filter(x => reserves.has(x)));

  // Project token is the pool token that is NOT in reserves
  const difference = new Set([...poolTokens].filter(x => !reserves.has(x)));

  // An LB Pool has to have two tokens, only one of which is a reserve token
  const lbpPoolFlag = pool.tokensList.length === 2 && intersection.size === 1;
  if (lbpPoolFlag) {
    projectToken = difference.values().next().value;

    if (pool.tokens[0].checksum === projectToken) {
      projectIdx = 0;
      reserveIdx = 1;
    } else {
      projectIdx = 1;
      reserveIdx = 0;
    }
  }

  if (reserveIdx === undefined || projectIdx === undefined) return {};

  return {
    // There are two tokens and (only) one of them is a reserve currency
    // We want the price of the pool token in terms of the reserve
    // tokenIn is reserve; token out is project
    isLbpPool: lbpPoolFlag,
    lbpPrice: calcSpotPrice(
      bnum(pool.tokens[reserveIdx].balance),
      bnum(pool.tokens[reserveIdx].denormWeight),
      bnum(pool.tokens[projectIdx].balance),
      bnum(pool.tokens[projectIdx].denormWeight),
      bnum(pool.swapFee * 1e18)
    ).div(1e18),
    projectToken: pool.tokens[projectIdx].symbol
  };
}
