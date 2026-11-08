import {type WhatsNewData} from './whats-new.model';

/**
 * Fake releases for stories and specs: a household task app, so no real product, person or amount
 * appears. 4.5.0 has lines (one for the owner), 4.4.2 has lines and a change fold, 4.4.0 has only a
 * change fold, and 4.3.0 has neither.
 */
export const WHATS_NEW_FIXTURE: WhatsNewData = {
  versions: [
    {
      version: '4.5.0',
      date: '2026-11-02',
      notes: [
        {text: 'Tasks can repeat every week, month or year.', owner: false},
        {text: 'The calendar opens on today.', owner: false},
        {text: 'You can invite people from the People page in Settings.', owner: true},
      ],
      changes: ['Repeat a task on a schedule', 'Open the calendar on today'],
    },
    {
      version: '4.4.2',
      date: '2026-10-27',
      notes: [{text: 'A task you finish moves to the bottom of its list.', owner: false}],
      changes: ['Move finished tasks to the bottom', 'Keep the list position after a reload'],
    },
    {
      version: '4.4.0',
      date: '2026-10-13',
      notes: [],
      changes: ['Add a due-date reminder', 'Show who a task is assigned to', 'Fix a missing label'],
    },
    {version: '4.3.0', date: '2026-09-29', notes: [], changes: []},
  ],
};
