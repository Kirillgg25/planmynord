const assert = require("node:assert/strict");
const fs = require("node:fs/promises");
const path = require("node:path");
const vm = require("node:vm");

// Load browser ES modules without changing the CommonJS server package.
const modules = new Map();
async function load(filename) {
  filename = path.resolve(filename);
  if (modules.has(filename)) return modules.get(filename);
  const module = new vm.SourceTextModule(await fs.readFile(filename, "utf8"), { identifier: filename });
  modules.set(filename, module);
  await module.link((specifier) => load(path.resolve(path.dirname(filename), specifier)));
  return module;
}

(async () => {
  const planner = await load(path.join(__dirname, "../js/planner.js"));
  await planner.evaluate();
  const { createTripPlan } = planner.namespace;
  const base = { start: "Oslo", end: "Bergen", startDate: "2026-10-01", people: 2, carRentalEnabled: false };
  for (const days of [1, 2, 5, 10]) {
    for (const people of [1, 2, 3, 6]) {
      for (const carRentalEnabled of [false, true]) {
        const result = createTripPlan({ ...base, endDate: `2026-10-${String(days).padStart(2, "0")}`, budget: 200000, people, carRentalEnabled });
        assert.ok(!result.error);
        const b = result.fullBudget;
        assert.equal(b.total, b.hotelTotal + b.foodTotal + b.carTotal + b.otherMin);
        assert.equal(result.moneyLeft, result.budget - b.total);
        assert.equal(b.nights, days - 1);
        assert.equal(b.hotelTotal, b.hotelNightly * b.nights);
      }
    }
  }
  const two = createTripPlan({ ...base, endDate: "2026-10-02", budget: 5000 });
  assert.equal(two.fullBudget.total, 5000);
  assert.equal(two.moneyLeft, 0);
  const five = createTripPlan({ ...base, endDate: "2026-10-05", budget: 15000 });
  assert.equal(five.fullBudget.total, 15000);
  assert.equal(createTripPlan({ ...base, endDate: "2026-10-02", budget: 100 }).errorCode, "budgetTooLow");
  const stops = ["Drammen", "Kongsberg", "Geilo"];
  const manual = createTripPlan({ ...base, endDate: "2026-10-05", budget: 15000, manualStops: stops });
  assert.deepEqual(manual.selectedStops, stops);
  const itinerary = modules.get(path.resolve(__dirname, "../js/itinerary.js")).namespace;
  for (const days of [1, 2, 5, 10]) {
    const plan = itinerary.distributeRouteDays("Oslo", [...stops, "Geilo"], "Bergen", days);
    assert.equal(plan.length, days);
    assert.deepEqual(plan.flatMap((day) => day.visits), [...stops, "Bergen"]);
    assert.equal(plan[0].from, "Oslo");
    assert.equal(plan.at(-1).to, "Bergen");
    plan.slice(1).forEach((day, index) => assert.equal(day.from, plan[index].to));
  }
  console.log("PASS: 64 budget scenarios, reported regressions, ordered days and manual stops");
})().catch((error) => { console.error(error); process.exitCode = 1; });
