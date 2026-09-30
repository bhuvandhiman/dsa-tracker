import assert from 'node:assert/strict';
import { test } from 'node:test';
import { dashboardSections, highlightReason, orderPatterns, readDashboardView } from '../apps/web/src/dashboard-view.js';

const category = (slug, order, summary, deficit = 0) => ({ slug, name: slug, order, summary, goal: { deficit }, children: [{ name: `${slug} child` }] });
const dated = (strength, date = '2026-09-20T10:00:00Z') => ({ assessed: true, experienced: true, displayStrength: strength, lastPracticedAt: date });

test('coverage sorts strict goal deficits without changing the input or API order', () => {
  const input = [category('strong', 0, dated(90), 20), category('weak', 1, dated(10), 10), category('other', 2, dated(1), 100)];
  assert.deepEqual(orderPatterns(input, 'coverage').map(item => item.slug), ['strong', 'weak', 'other']);
  assert.deepEqual(input.map(item => item.slug), ['strong', 'weak', 'other']);
  assert.deepEqual(orderPatterns(input.map(({ goal: _goal, ...item }) => item), 'coverage').map(item => item.slug), ['strong', 'weak', 'other']);
});

test('retention ranks dated weakness and age, separating unknown dates and no experience', () => {
  const input = [category('new', 0, { experienced: false }), category('legacy', 1, { experienced: true }), category('recent', 2, dated(20)), category('older', 3, dated(20, '2026-08-20T10:00:00Z')), category('strong', 4, dated(80))];
  const sections = dashboardSections(input, 'retention');
  assert.deepEqual(sections.map(section => [section.id, section.items.map(item => item.slug)]), [['dated', ['older', 'recent', 'strong']], ['unknown', ['legacy']], ['new', ['new']]]);
  assert.equal(highlightReason(input[1], 'retention'), null);
  assert.equal(highlightReason(input[0], 'retention'), null);
});

test('search includes first-ranked categories and subpatterns with a consistent empty state', () => {
  const input = [category('arrays', 0, dated(10), 20), category('graphs', 1, dated(30), 10)];
  assert.deepEqual(dashboardSections(input, 'coverage', ' ARRAYS ').flatMap(section => section.items).map(item => item.slug), ['arrays']);
  assert.equal(dashboardSections(input, 'retention', 'arrays child')[0].items[0].slug, 'arrays');
  assert.equal(dashboardSections(input, 'coverage', 'missing')[0].items.length, 0);
  assert.deepEqual(dashboardSections(input, 'retention', 'missing'), []);
});

test('saved perspective has a safe default for invalid or unavailable storage', () => {
  assert.equal(readDashboardView({ getItem: () => 'retention' }), 'retention');
  for (const value of [null, 'coverage', 'invalid']) assert.equal(readDashboardView({ getItem: () => value }), 'coverage');
  assert.equal(readDashboardView({ getItem() { throw new Error('blocked'); } }), 'coverage');
});
