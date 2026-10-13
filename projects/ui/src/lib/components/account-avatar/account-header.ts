import {type MenuHeader} from '../menu/menu.component';
import {type AccountIdentity} from './account-avatar.component';

/**
 * The identity header the avatar menu and the More page show for an account, so both name it the
 * same way: the name (else the email) as title, the email beneath it only when a name leads, and
 * `label` (else the title) as the avatar's text. Undefined when the identity has neither a name
 * nor an email, which is how an account that is only a label keeps its menu without a header.
 */
export function accountHeader(
  identity: AccountIdentity | undefined,
  label = ''
): MenuHeader | undefined {
  const name = identity?.name?.trim() ?? '';
  const email = identity?.email?.trim() ?? '';
  const title = name || email;
  if (!title) {
    return undefined;
  }
  return {
    title,
    subtitle: name && email ? email : undefined,
    pictureUrl: identity?.pictureUrl,
    avatarLabel: label.trim() || title,
  };
}
