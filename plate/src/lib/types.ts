import type { Basis, MetricKey, Nutrients } from './nutrients';

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snacks' | 'drinks';
export const MEALS: { key: Meal; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snacks', label: 'Snacks' },
  { key: 'drinks', label: 'Drinks' },
];
export type Status = 'planned' | 'consumed' | 'skipped';
export type Kind = 'food' | 'drink';
export type FoodState = 'raw' | 'cooked' | 'prepared' | 'dry' | null;

export interface Portion {
  label: string;
  /** In the food's basis unit (g, ml, or servings). */
  amount: number;
}

/** Anything that can be logged: a catalog item, a user food, a search result. */
export interface FoodLike {
  name: string;
  brand?: string | null;
  kind: Kind;
  state?: FoodState;
  basis: Basis;
  density?: number | null;
  nutrients: Nutrients;
  portions?: Portion[];
  default_amount?: number | null;
  max_amount?: number | null;
  tags?: string[];
  allergens?: string[];
  ingredients?: string | null;
  source?: string | null;
  source_id?: string | null;
  source_ref?: string | null;
  barcode?: string | null;
}

export interface CatalogFood extends FoodLike {
  id: string;
}

export interface UserFood extends FoodLike {
  id: string;
  is_favorite: boolean;
  at_home: boolean;
  created_at?: string;
}

export interface Entry {
  id: string;
  entry_date: string;
  meal: Meal;
  status: Status;
  position: number;
  food_id: string | null;
  catalog_id: string | null;
  meal_id?: string | null;
  name: string;
  brand: string | null;
  kind: Kind;
  state: FoodState;
  source: string | null;
  source_ref: string | null;
  basis: Basis;
  density: number | null;
  nutrients: Nutrients;
  tags: string[];
  allergens: string[];
  amount: number;
  unit: Basis;
  portion_label: string | null;
  portion_count: number | null;
  planned_amount: number | null;
  split_from: string | null;
  parent_id: string | null;
  swapped_from: string | null;
  note: string | null;
  consumed_at: string | null;
  created_at?: string;
}

export interface TargetSpec {
  min?: number | null;
  max?: number | null;
}

export interface Targets {
  id?: string;
  effective_date: string;
  calories: number;
  nutrients: Partial<Record<MetricKey, TargetSpec>>;
  fluid_ml: number | null;
  fluid_mode: 'all_drinks' | 'water_only';
}

export interface Profile {
  user_id: string;
  display_name: string | null;
  timezone: string;
  dashboard_nutrients: MetricKey[];
  diet: string[];
  allergies: string[];
  avoid_ingredients: string[];
  liked_foods: string[];
}

export interface SavedMeal {
  id: string;
  name: string;
  kind: 'group' | 'recipe';
  yield_amount: number | null;
  yield_unit: 'g' | 'serving' | null;
  default_meal: Meal | null;
  is_favorite: boolean;
  items: MealItem[];
}

export interface MealItem {
  id?: string;
  position: number;
  food_id: string | null;
  name: string;
  brand: string | null;
  kind: Kind;
  state: FoodState;
  basis: Basis;
  density: number | null;
  nutrients: Nutrients;
  amount: number;
  unit: Basis;
  portion_label: string | null;
  tags: string[];
  allergens: string[];
}
