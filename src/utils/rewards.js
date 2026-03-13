export const getRewardForRank = (rank) => {
  if (rank === 1) return "WDC Premium + 500€ credit";
  if (rank === 2) return "WDC Premium + 350€ credit";
  if (rank === 3) return "WDC Premium + 250€ credit";
  if (rank === 4) return "WDC Premium + 100€ credit";
  if (rank === 5) return "WDC Premium + 50€ credit";
  if (rank >= 6 && rank <= 10) return "WDC Premium";
  
  if (rank === 11) return "WDC Standard + 200€ credit";
  if (rank === 12) return "WDC Standard + 175€ credit";
  if (rank === 13) return "WDC Standard + 150€ credit";
  if (rank === 14) return "WDC Standard + 125€ credit";
  if (rank === 15) return "WDC Standard + 100€ credit";
  if (rank === 16) return "WDC Standard + 75€ credit";
  if (rank === 17) return "WDC Standard + 50€ credit";
  if (rank === 18) return "WDC Standard + 25€ credit";
  if (rank === 19) return "WDC Standard + 15€ credit";
  if (rank === 20) return "WDC Standard + 10€ credit";
  
  if (rank >= 21 && rank <= 50) return "WDC Standard";
  if (rank >= 51 && rank <= 100) return "50% off WDC";
  if (rank >= 101 && rank <= 200) return "€10 coupon on WDC";
  
  return "Keep flying! (Top 200 win prizes)";
};

export const getRewardTierClass = (rank) => {
  if (rank <= 10) return "tier-1";
  if (rank <= 50) return "tier-2";
  if (rank <= 100) return "tier-3";
  if (rank <= 200) return "tier-4";
  return "participant";
};
