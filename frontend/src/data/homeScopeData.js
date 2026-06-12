export const marketRecords = [
  { id: 1, state: 'CA', city: 'Los Angeles', beds: 3, baths: 2, sqft: 1850, price: 684000, priceSqft: 370 },
  { id: 2, state: 'CA', city: 'Los Angeles', beds: 4, baths: 3, sqft: 2360, price: 820000, priceSqft: 347 },
  { id: 3, state: 'CA', city: 'San Diego', beds: 3, baths: 2, sqft: 1740, price: 750000, priceSqft: 431 },
  { id: 4, state: 'CA', city: 'San Francisco', beds: 2, baths: 2, sqft: 1260, price: 980000, priceSqft: 778 },
  { id: 5, state: 'TX', city: 'Austin', beds: 3, baths: 2, sqft: 1920, price: 455000, priceSqft: 237 },
  { id: 6, state: 'TX', city: 'Dallas', beds: 4, baths: 3, sqft: 2520, price: 510000, priceSqft: 202 },
  { id: 7, state: 'TX', city: 'Houston', beds: 3, baths: 2, sqft: 2100, price: 395000, priceSqft: 188 },
  { id: 8, state: 'FL', city: 'Miami', beds: 3, baths: 2, sqft: 1680, price: 565000, priceSqft: 336 },
  { id: 9, state: 'FL', city: 'Orlando', beds: 4, baths: 3, sqft: 2300, price: 430000, priceSqft: 187 },
  { id: 10, state: 'NY', city: 'New York', beds: 2, baths: 1, sqft: 980, price: 890000, priceSqft: 908 },
  { id: 11, state: 'NY', city: 'Buffalo', beds: 3, baths: 2, sqft: 1880, price: 265000, priceSqft: 141 },
  { id: 12, state: 'OK', city: 'Oklahoma City', beds: 3, baths: 2, sqft: 1750, price: 285000, priceSqft: 163 },
  { id: 13, state: 'OK', city: 'Tulsa', beds: 3, baths: 2, sqft: 1690, price: 260000, priceSqft: 154 },
  { id: 14, state: 'WA', city: 'Seattle', beds: 3, baths: 2, sqft: 1810, price: 720000, priceSqft: 398 },
  { id: 15, state: 'WA', city: 'Tacoma', beds: 3, baths: 2, sqft: 1760, price: 425000, priceSqft: 241 },
  { id: 16, state: 'GA', city: 'Atlanta', beds: 3, baths: 2, sqft: 1900, price: 410000, priceSqft: 216 },
  { id: 17, state: 'AZ', city: 'Phoenix', beds: 4, baths: 3, sqft: 2450, price: 490000, priceSqft: 200 },
  { id: 18, state: 'CO', city: 'Denver', beds: 3, baths: 2, sqft: 1780, price: 565000, priceSqft: 317 },
];

export const nationalTrend = [
  { label: '2018', value: 385000 },
  { label: '2019', value: 383000 },
  { label: '2020', value: 391000 },
  { label: '2021', value: 453000 },
  { label: '2022', value: 535000 },
  { label: '2023', value: 505000 },
  { label: '2024', value: 513000 },
  { label: '2025', value: 522000 },
];

export const priceBuckets = [
  { label: '<$300K', value: 4 },
  { label: '$300K', value: 7 },
  { label: '$500K', value: 9 },
  { label: '$700K', value: 6 },
  { label: '$900K+', value: 3 },
];

export const modelMetrics = [
  { model: 'Linear Regression', mae: 190035, rmse: 298236, r2: 0.75, tone: 'blue' },
  { model: 'Random Forest', mae: 147247, rmse: 275123, r2: 0.792, tone: 'teal' },
];

export const residualPoints = [
  { x: 180, y: -22 },
  { x: 240, y: 14 },
  { x: 310, y: -8 },
  { x: 360, y: 36 },
  { x: 420, y: -28 },
  { x: 510, y: 12 },
  { x: 610, y: -40 },
  { x: 720, y: 22 },
  { x: 870, y: 54 },
  { x: 960, y: -18 },
];
