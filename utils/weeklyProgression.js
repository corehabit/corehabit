// ===============================
// CoreHabit Weekly Progression Engine v2
// Built for AI Plan Structure
// ===============================

export function evaluateCheckIn(plan, data) {
  let adjustments = {
    calorieDelta: 0,
    volumePercent: 0,
    addCompoundSet: false
  };

  const {
    weight_change,
    strength_trend,
    energy,
    adherence,
    sleep
  } = data;

  // FAT LOSS LOGIC (assume deficit if calories < maintenance-ish)
  if (plan.macro_targets?.calories < 3200) {

    if (
      weight_change <= -0.5 &&
      weight_change >= -1.2 &&
      strength_trend !== "down" &&
      energy >= 3
    ) {
      adjustments.volumePercent = 0.05;
    }

    if (weight_change > -0.3 && adherence >= 80) {
      adjustments.calorieDelta = -150;
    }

    if (strength_trend === "down" && energy <= 2 && sleep <= 2) {
      adjustments.calorieDelta = 100;
      adjustments.volumePercent = -0.1;
    }

  } else {
    // MUSCLE GAIN LOGIC

    if (weight_change > 1.5) {
      adjustments.calorieDelta = -150;
    }

    if (weight_change < 0.3) {
      adjustments.calorieDelta = 200;
    }

    if (strength_trend === "up") {
      adjustments.addCompoundSet = true;
    }
  }

  return adjustments;
}


export function applyAdjustments(plan, adj) {
  let newPlan = structuredClone(plan);

  if (adj.calorieDelta !== 0) {
    adjustCalories(newPlan, adj.calorieDelta);
  }

  if (adj.volumePercent !== 0) {
    adjustWorkoutVolume(newPlan, adj.volumePercent);
  }

  if (adj.addCompoundSet) {
    addSetToCompoundMovements(newPlan);
  }

  return newPlan;
}


export function generateChangeSummary(adj) {
  let summary = [];

  if (adj.calorieDelta !== 0) {
    summary.push({
      message: `Calories ${adj.calorieDelta > 0 ? "increased" : "reduced"} by ${Math.abs(adj.calorieDelta)}.`
    });
  }

  if (adj.volumePercent > 0) {
    summary.push({
      message: "Training volume slightly increased."
    });
  }

  if (adj.volumePercent < 0) {
    summary.push({
      message: "Training volume slightly reduced for recovery."
    });
  }

  if (adj.addCompoundSet) {
    summary.push({
      message: "Added one set to compound lifts."
    });
  }

  if (summary.length === 0) {
    summary.push({
      message: "Your plan remains the same — you're progressing perfectly."
    });
  }

  return summary;
}



// ===============================
// CALORIE ADJUSTMENT
// ===============================

function adjustCalories(plan, delta) {

  const macros = plan.macro_targets;
  if (!macros) return;

  const newCalories = macros.calories + delta;
  macros.calories = newCalories;

  // 60% carbs, 40% fats adjustment
  macros.carbs += Math.round((delta * 0.6) / 4);
  macros.fats += Math.round((delta * 0.4) / 9);
}



// ===============================
// VOLUME ADJUSTMENT
// ===============================

function adjustWorkoutVolume(plan, percent) {

  const workout = plan.full_week_workout_plan;
  if (!workout) return;

  Object.keys(workout).forEach(day => {
    workout[day] = workout[day].map(line => {
      const match = line.match(/(\d+)x(\d+)/);
      if (!match) return line;

      const sets = parseInt(match[1]);
      const reps = match[2];

      const newSets = Math.max(2, Math.min(6,
        Math.round(sets * (1 + percent))
      ));

      return line.replace(/\d+x\d+/, `${newSets}x${reps}`);
    });
  });
}



// ===============================
// ADD SET TO COMPOUNDS
// ===============================

function addSetToCompoundMovements(plan) {

  const workout = plan.full_week_workout_plan;
  if (!workout) return;

  const compoundKeywords = [
    "bench",
    "squat",
    "deadlift",
    "press",
    "row",
    "pull"
  ];

  Object.keys(workout).forEach(day => {
    workout[day] = workout[day].map(line => {

      const lower = line.toLowerCase();

      if (!compoundKeywords.some(k => lower.includes(k))) {
        return line;
      }

      const match = line.match(/(\d+)x(\d+)/);
      if (!match) return line;

      const sets = parseInt(match[1]);
      const reps = match[2];

      const newSets = Math.min(6, sets + 1);

      return line.replace(/\d+x\d+/, `${newSets}x${reps}`);
    });
  });
}
