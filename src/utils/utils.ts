/**
 * Script from ESRI for escaping an ArcGIS Online usernames and
 * organization ids.
 *
 * @param value The ArcGIS Online username or organization id
 * @returns The escaped version of the username or org id.
 */
export function escapeForLucene(value: string) {
  var a = [
    '+',
    '-',
    '&',
    '!',
    '(',
    ')',
    '{',
    '}',
    '[',
    ']',
    '^',
    '"',
    '~',
    '*',
    '?',
    ':',
    '\\',
  ];
  var r = new RegExp('(\\' + a.join('|\\') + ')', 'g');
  return value.replace(r, '\\$1');
}
