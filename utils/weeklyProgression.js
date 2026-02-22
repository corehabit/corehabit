// ===============================
// CoreHabit Weekly Progression Engine
// Deterministic Rule-Based v1
// ===============================


// -------------------------------
// Public Entry Points
// -------------------------------

export function evaluateCheckIn(plan, checkIn) {
  const goal = plan.goal;

  let adjustments = {
    calorieDelta: 0,
    volumeChange: 0,
    addCompoundSet: false
  };

  if (goal === "fat_loss") {
    return fatLossRules(checkIn, adjustments);
  }

  if (goal === "muscle_gain") {
    return muscleGainRules(checkIn, adjustments);
  }

  return adjustments;
}


export function applyAdjustments(plan, adjustments) {
  let newPlan = structuredClone(plan);

  if (adjustments.calorieDelta !== 0) {
    newPlan = adjustCalories(newPlan, adjustments.calorieDelta);
  }

  if (adjustments.volumeChange !== 0) {
    newPlan = adjustVolume(newPlan, adjustments.volumeChange);
  }

  if (adjustments.addCompoundSet) {
    newPlan = addSetToCompounds(newPlan);
  }

  return newPlan;
}


export function generateChangeSummary(adjustments) {
  let summary = [];

  if (adjustments.calorieDelta !== 0) {
    summary.push({
      type: "nutrition",
      message: `Calories ${adjustments.calorieDelta > 0 ? "increased" : "reduced"} by ${Math.abs(adjustments.calorieDelta)} to support your progress.`
    });
  }

  if (adjustments.volumeChange > 0) {
    summary.push({
      type: "training",
      message: "Training volume slightly increased for progressive overload."
    });
  }

  if (adjustments.volumeChange < 0) {
    summary.push({
      type: "training",
      message: "Training volume slightly reduced to improve recovery."
    });
  }

  if (adjustments.addCompoundSet) {
    summary.push({
      type: "training",
      message: "Added one set to major compound lifts based on strength improvements."
    });
  }

  if (summary.length === 0) {
    summary.push({
      type: "neutral",
      message: "Your plan remains the same — you're progressing perfectly."
    });
  }

  return summary;
}



// -------------------------------
// Fat Loss Rules
// -------------------------------

function fatLossRules(data, adj) {
  const {
    weight_change,
    strength_trend,
    energy,
    adherence,
    sleep
  } = data;

  // On track
  if (
    weight_change <= -0.5 &&
    weight_change >= -1.2 &&
    strength_trend !== "down" &&
    energy >= 3
  ) {
    adj.volumeChange = 0.03;
    return adj;
  }

  // Stalled
  if (weight_change > -0.3 && adherence >= 80) {
    adj.calorieDelta = -150;
    return adj;
  }

  // Recovery issue
  if (
    strength_trend === "down" &&
    energy <= 2 &&
    sleep <= 2
  ) {
    adj.calorieDelta = 100;
    adj.volumeChange = -0.1;
    return adj;
  }

  return adj;
}



// -------------------------------
// Muscle Gain Rules
// -------------------------------

function muscleGainRules(data, adj) {
  const { weight_change, strength_trend } = data;

  if (weight_change > 1.5) {
    adj.calorieDelta = -150;
  }

  if (weight_change < 0.3) {
    adj.calorieDelta = 200;
  }

  if (strength_trend === "up") {
    adj.addCompoundSet = true;
  }

  return adj;
}



// -------------------------------
// Plan Modifiers
// -------------------------------

function adjustCalories(plan, delta) {
  const newCalories = clamp(
    plan.macros.calories + delta,
    plan.macros.calories * 0.7,  // lower safety bound
    plan.macros.calories * 1.3   // upper safety bound
  );

  const calorieChange = newCalories - plan.macros.calories;

  plan.macros.calories = newCalories;

  // Adjust carbs and fats proportionally
  plan.macros.carbs += Math.round((calorieChange * 0.6) / 4);
  plan.macros.fat += Math.round((calorieChange * 0.4) / 9);

  return plan;
}


function adjustVolume(plan, percentChange) {
  const safeChange = clamp(percentChange, -0.1, 0.1);

  plan.workout_days.forEach(day => {
    day.exercises.forEach(exercise => {
      const newSets = Math.round(
        exercise.sets * (1 + safeChange)
      );

      exercise.sets = clamp(newSets, 2, 6);
    });
  });

  return plan;
}


function addSetToCompounds(plan) {
  plan.workout_days.forEach(day => {
    day.exercises.forEach(exercise => {
      if (exercise.type === "compound") {
        exercise.sets = clamp(exercise.sets + 1, 2, 6);
      }
    });
  });

  return plan;
}



// -------------------------------
// Utility
// -------------------------------

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
