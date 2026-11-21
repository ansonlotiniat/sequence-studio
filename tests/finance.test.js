import test from 'node:test';
import assert from 'node:assert/strict';
import { annuityPresentValue, amortizeLoan } from '../src/learning/finance.js';

const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-8, `${actual} ≠ ${expected}`);

test('present value discounts every cash flow to today for both timings', () => {
  near(annuityPresentValue(121, 0.1, 2), 210);
  near(annuityPresentValue(121, 0.1, 2, true), 231);
  assert.equal(annuityPresentValue(800, 0, 3, true), 2400);
  near(annuityPresentValue(800, 1e-14, 3), 2400);
  near(annuityPresentValue(1000, 0.05, 1, true), 1000);
});

test('loan repayments discount back to principal and amortize to zero', () => {
  const { rate, monthlyPayment, schedule, totalInterest, totalPaid } = amortizeLoan(20100, 12, 2);
  assert.equal(rate, 0.01);
  near(monthlyPayment, 10201);
  near(schedule[0].interest, 201);
  near(schedule[0].principal, 10000);
  near(schedule[0].balance, 10100);
  near(schedule[1].interest, 101);
  assert.equal(schedule[1].balance, 0);
  near(totalInterest, 302);
  near(totalPaid, 20402);
  near(schedule.reduce((sum, row) => sum + row.payment / (1 + rate) ** row.month, 0), 20100);
  const noInterest = amortizeLoan(1000, 0, 3);
  near(noInterest.monthlyPayment, 1000 / 3);
  assert.equal(noInterest.totalInterest, 0);
  assert.equal(noInterest.schedule.at(-1).balance, 0);
});
