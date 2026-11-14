// Offline stand-ins for USDA / Open Food Facts, enabled with FOOD_SOURCES_MOCK=1 (tests, demos).
// They run the real mappers over recorded-shape fixtures.
import offProduct from './fixtures/off-product.json';
import usdaSearch from './fixtures/usda-search.json';
import { mapFdcFood, type FdcFood } from './usda';
import { mapOffProduct, type OffProduct } from './off';
import type { FoodLike } from '../types';

export function mockSearch(q: string): FoodLike[] {
  const all = [
    ...(usdaSearch.foods as FdcFood[]).map(mapFdcFood),
    mapOffProduct(offProduct.product as OffProduct)!,
  ];
  const t = q.toLowerCase();
  return all.filter((f) => `${f.name} ${f.brand ?? ''}`.toLowerCase().includes(t));
}

export function mockBarcode(code: string): FoodLike | null {
  return offProduct.product.code === code ? mapOffProduct(offProduct.product as OffProduct) : null;
}
