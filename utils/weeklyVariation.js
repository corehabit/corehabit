export function applyWeeklyVariation(plan, weekNumber) {

  const newPlan = structuredClone(plan);

  // Workout variation
  if (newPlan.full_week_workout_plan) {
    Object.keys(newPlan.full_week_workout_plan).forEach(day => {
      newPlan.full_week_workout_plan[day] =
        newPlan.full_week_workout_plan[day].map(ex => {
          return varyExercise(ex, weekNumber);
        });
    });
  }

  // Meal variation
  if (newPlan.seven_day_meal_plan) {
    newPlan.seven_day_meal_plan =
      newPlan.seven_day_meal_plan.map(meal =>
        varyMeal(meal, weekNumber)
      );
  }

  // Grocery refresh
  if (newPlan.grocery_list) {
    newPlan.grocery_list = regenerateGrocery(newPlan.seven_day_meal_plan);
  }

  return newPlan;
}


function varyExercise(exercise, week) {
  if (week % 2 === 0) {
    return exercise.replace("Barbell", "Dumbbell");
  }

  if (week % 3 === 0) {
    return exercise.replace("Bench", "Incline Bench");
  }

  return exercise;
}


function varyMeal(meal, week) {
  if (week % 2 === 0) {
    return meal.replace("Chicken", "Turkey");
  }

  if (week % 3 === 0) {
    return meal.replace("Rice", "Quinoa");
  }

  return meal;
}


function regenerateGrocery(meals) {
  const items = [];

  meals.forEach(meal => {
    const words = meal.split(" ");
    words.forEach(word => {
      if (word.length > 4) items.push(word);
    });
  });

  return [...new Set(items)];
}
