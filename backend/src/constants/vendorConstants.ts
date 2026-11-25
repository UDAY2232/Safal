export const VENDOR_WHITELISTED_LOCATIONS = [
  'Chennai',
  'Madurai',
  'Varanasi',
  'Siliguri',
  'Bengaluru',
  'Hyderabad',
  'Warangal',
  'Vijayawada',
] as const;

export type VendorWhitelistedLocation = typeof VENDOR_WHITELISTED_LOCATIONS[number];

export const VENDOR_WHITELISTED_FRUITS = [
  'Kashmir Apples',
  'Pomegranate',
  'Watermelon',
  'Muskmelon',
  'Banana',
  'Orange',
  'Plum',
] as const;

export type VendorWhitelistedFruit = typeof VENDOR_WHITELISTED_FRUITS[number];

export const VENDOR_ADVANCE_PERCENTAGE = 70;

export function isValidVendorLocation(location: string): boolean {
  if (!location || typeof location !== 'string' || !location.trim()) return false;
  return true;
}

export function isValidVendorFruit(fruit: string): boolean {
  if (!fruit) return false;
  return VENDOR_WHITELISTED_FRUITS.some(
    (f) => f.toLowerCase() === fruit.trim().toLowerCase()
  );
}
