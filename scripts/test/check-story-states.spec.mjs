import assert from 'node:assert/strict';
import {describe, it} from 'node:test';

import {validate} from '../check-story-states.mjs';

const CATEGORIES = [
  {
    name: 'Field',
    components: ['input'],
    states: {Default: /^Default$/, ReadOnly: /^Read[Oo]nly$/},
  },
];

const run = (names, gaps = []) => validate(new Map([['input', names]]), gaps, CATEGORIES);

describe('check-story-states', () => {
  it('passes when every state has a story', () => {
    assert.deepEqual(run(['Default', 'Readonly']), []);
  });

  it('fails on a state with no story', () => {
    assert.match(run(['Default']).join('\n'), /input\/ReadOnly: no story/);
  });

  it('accepts a gap the baseline justifies', () => {
    assert.deepEqual(run(['Default'], [{component: 'input', state: 'ReadOnly', reason: 'x'}]), []);
  });

  it('fails on a stale baseline entry, an unknown one, or one without a reason', () => {
    const stale = run(
      ['Default', 'ReadOnly'],
      [{component: 'input', state: 'ReadOnly', reason: 'x'}]
    );
    assert.match(stale.join('\n'), /has a story now/);
    const unknown = run(['Default', 'ReadOnly'], [{component: 'chip', state: 'Off', reason: 'x'}]);
    assert.match(unknown.join('\n'), /no category requires/);
    const bare = run(['Default'], [{component: 'input', state: 'ReadOnly', reason: ' '}]);
    assert.match(bare.join('\n'), /no reason/);
  });

  it('fails on a component with no directory', () => {
    assert.match(
      validate(new Map([['input', null]]), [], CATEGORIES).join('\n'),
      /no component directory/
    );
  });
});
