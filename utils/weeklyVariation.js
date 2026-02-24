export function applyWeeklyVariation(plan, weekNumber) {

  const newPlan = structuredClone(plan);

  rotateWorkouts(newPlan, weekNumber);
  rotateMeals(newPlan, weekNumber);
  regenerateGrocery(newPlan);

  return newPlan;
}


function rotateWorkouts(plan, week) {

  if (!plan.full_week_workout_plan) return;

  const variants = [
    "A",
    "B",
    "C"
  ];

  const variant = variants[(week - 1) % variants.length];

  Object.keys(plan.full_week_workout_plan).forEach(day => {

    plan.full_week_workout_plan[day] =
      plan.full_week_workout_plan[day].map(ex => {

        if (variant === "A") return ex;

        if (variant === "B") return ex + " (tempo focus)";

        if (variant === "C") return ex + " (paused reps)";

      });

  });
}


function rotateMeals(plan, week) {

  if (!plan.seven_day_meal_plan) return;

  const proteinRotation = ["Chicken", "Turkey", "Lean Beef", "Salmon"];

  const protein =
    proteinRotation[(week - 1) % proteinRotation.length];

  plan.seven_day_meal_plan =
    plan.seven_day_meal_plan.map(meal => {
      return `${protein} variation of ${meal}`;
    });
}


function regenerateGrocery(plan) {

  if (!plan.seven_day_meal_plan) return;

  const items = [];

  plan.seven_day_meal_plan.forEach(meal => {
    meal.split(" ").forEach(word => {
      if (word.length > 4) items.push(word);
    });
  });

  plan.grocery_list = [...new Set(items)];
}
