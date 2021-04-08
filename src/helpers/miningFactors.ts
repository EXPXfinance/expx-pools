import { bnum } from '@/helpers/utils';

const FEE_FACTOR_K = 0.25;

function getFeeFactor(swapFee) {
  const exp = (FEE_FACTOR_K * swapFee * 100) ** 2;
  return Math.exp(-exp);
}

function computeRatioFactor(weights) {
  let rfSum = bnum(0);
  let pairWeightSum = bnum(0);
  const N = weights.length;

  for (let j = 0; j < N; j++) {
    if (weights[j].eq(bnum(0))) continue;

    for (let k = j + 1; k < N; k++) {
      const pairWeight = weights[j].times(weights[k]);
      const normalizedWeight1 = weights[j].div(weights[j].plus(weights[k]));
      const normalizedWeight2 = weights[k].div(weights[j].plus(weights[k]));

      // stretches factor for equal weighted pairs to 1
      const ratioFactorOfPair = bnum(4)
        .times(normalizedWeight1)
        .times(normalizedWeight2)
        .times(pairWeight);

      rfSum = rfSum.plus(ratioFactorOfPair);
      pairWeightSum = pairWeightSum.plus(pairWeight);
    }
  }

  return rfSum.div(pairWeightSum);
}

export function getFactors(pool) {
  const totalWeight = parseFloat(pool.metadata.totalWeight);
  const weights = pool.metadata.tokens.map(token =>
    bnum(parseFloat(token.denormWeight) / totalWeight)
  );

  return {
    feeFactor: getFeeFactor(pool.metadata.swapFee),
    ratioFactor: computeRatioFactor(weights)
  };
}
