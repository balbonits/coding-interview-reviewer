import { MfeRegistry, type MfeConfig } from './starter';

const shop: MfeConfig = { name: 'shop', url: 'https://cdn.example.com/shop.js', routes: ['/shop'] };
const pdp: MfeConfig = { name: 'pdp', url: 'https://cdn.example.com/pdp.js', routes: ['/shop/product'] };
const checkout: MfeConfig = { name: 'checkout', url: 'https://cdn.example.com/checkout.js', routes: ['/checkout', '/cart'] };

function fresh() {
  return new MfeRegistry();
}

test('register adds to list()', () => {
  const r = fresh();
  r.register(shop);
  expect(r.list()).toHaveLength(1);
  expect(r.list()[0].name).toBe('shop');
});

test('list() preserves insertion order', () => {
  const r = fresh();
  r.register(shop);
  r.register(checkout);
  expect(r.list().map((m) => m.name)).toEqual(['shop', 'checkout']);
});

test('register throws on duplicate name', () => {
  const r = fresh();
  r.register(shop);
  expect(() => r.register({ ...shop, url: 'other' })).toThrow();
});

test('register throws when a route is already claimed', () => {
  const r = fresh();
  r.register(shop);
  expect(() => r.register({ name: 'other', url: '...', routes: ['/shop'] })).toThrow();
});

test('resolve returns matching config by prefix', () => {
  const r = fresh();
  r.register(shop);
  expect(r.resolve('/shop/cart')?.name).toBe('shop');
});

test('resolve returns undefined for unregistered path', () => {
  const r = fresh();
  r.register(shop);
  expect(r.resolve('/account')).toBeUndefined();
});

test('resolve picks the longest matching prefix', () => {
  const r = fresh();
  r.register(shop);
  r.register(pdp); // /shop/product is more specific than /shop
  expect(r.resolve('/shop/product/123')?.name).toBe('pdp');
  expect(r.resolve('/shop/cart')?.name).toBe('shop');
});

test('resolve works when MFE owns multiple routes', () => {
  const r = fresh();
  r.register(checkout);
  expect(r.resolve('/checkout/step/1')?.name).toBe('checkout');
  expect(r.resolve('/cart')?.name).toBe('checkout');
});

test('unregister returns true and removes the MFE', () => {
  const r = fresh();
  r.register(shop);
  expect(r.unregister('shop')).toBe(true);
  expect(r.list()).toHaveLength(0);
});

test('unregister returns false for unknown name', () => {
  const r = fresh();
  expect(r.unregister('ghost')).toBe(false);
});

test('route is re-claimable after unregister', () => {
  const r = fresh();
  r.register(shop);
  r.unregister('shop');
  expect(() => r.register({ name: 'shop2', url: '...', routes: ['/shop'] })).not.toThrow();
});

test('resolve returns undefined after unregister', () => {
  const r = fresh();
  r.register(shop);
  r.unregister('shop');
  expect(r.resolve('/shop/anything')).toBeUndefined();
});
