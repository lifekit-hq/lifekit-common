import {type MenuItem} from './menu.component';

/** Whether the item opens a route, by the id convention on {@link MenuItem.id}. */
export function isRouteMenuItem(item: MenuItem): boolean {
  return item.id.startsWith('/');
}
