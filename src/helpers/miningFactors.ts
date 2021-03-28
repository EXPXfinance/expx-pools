// This code is suspiciously similar to bal-mining-scripts
// If that changes, change this as well!

const FEE_FACTOR_K = 0.25;

function getFeeFactor(swapFee) {
  const exp = (FEE_FACTOR_K * swapFee * 100) ** 2;
  return Math.exp(-exp);
}

// export function getFactors(pool, chainId) {
export function getFactors(pool) {
  return {
    feeFactor: getFeeFactor(pool.metadata.swapFee)
  };
}
