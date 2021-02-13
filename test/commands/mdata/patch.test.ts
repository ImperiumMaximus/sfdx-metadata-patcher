import { expect, test } from '@salesforce/command/lib/test';
//import { ensureJsonMap, ensureString } from '@salesforce/ts-types';

describe('mdata:patch', () => {
  test
    .stdout()
    .command(['mdata:patch', '-e', 'default'])
    .it('runs mdata:patch -e default', ctx => {
      expect(ctx.stdout).to.contain('');
    });
});
