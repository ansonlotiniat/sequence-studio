export function presentValueFactor(rate, periods) {
  return rate === 0 ? periods : -Math.expm1(-periods * Math.log1p(rate)) / rate;
}

export function annuityPresentValue(payment, rate, periods, due = false) {
  return payment * presentValueFactor(rate, periods) * (due ? 1 + rate : 1);
}

export function amortizeLoan(principal, annualPercent, months) {
  const rate = annualPercent / 1200;
  const monthlyPayment = principal / presentValueFactor(rate, months);
  let balance = principal;
  const schedule = Array.from({ length: months }, (_, index) => {
    const interest = balance * rate;
    const repaid = index === months - 1 ? balance : monthlyPayment - interest;
    balance -= repaid;
    return { month: index + 1, payment: repaid + interest, interest, principal: repaid, balance };
  });
  const totalInterest = schedule.reduce((total, row) => total + row.interest, 0);
  return { rate, monthlyPayment, schedule, totalInterest, totalPaid: principal + totalInterest };
}
