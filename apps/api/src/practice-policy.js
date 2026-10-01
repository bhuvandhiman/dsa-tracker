// Product defaults, not fitted probabilities or universal memory constants.
export const practicePolicy = Object.freeze({
  blockWeight:4,minimumDistinct:4,bufferCredits:2,
  baseHoldDays:3,spacedHoldIncrementDays:2,maxHoldDays:14,
  evidenceWeight:{independent:1,hint:0.5,solution:0.2,unknown:0},
});
