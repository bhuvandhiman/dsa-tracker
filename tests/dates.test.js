import assert from 'node:assert/strict';
import {test} from 'node:test';
import {dayString,relativePractice,workspaceTime,workspaceTimeToISO} from '../apps/web/src/dates.js';
test('workspace calendar boundaries agree with practice-day policy across browser timezones',()=>{
  assert.equal(dayString('2026-09-29T18:31:00Z'),'2026-09-30');
  assert.equal(relativePractice('2026-09-29T18:29:00Z','2026-09-29T18:31:00Z'),'Yesterday');
  assert.equal(workspaceTime('2026-09-29T18:31:25Z'),'2026-09-30T00:01:25');
  assert.equal(workspaceTimeToISO('2026-09-30T00:01:25'),'2026-09-29T18:31:25.000Z');
  assert.throws(()=>workspaceTimeToISO('2026-02-30T12:00:00'));
});
