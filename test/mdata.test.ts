import { expect, test } from '@salesforce/command/lib/test';
import { LoggerLevel } from '../src/typeDefs';
import { Mdata } from '../src/mdata';


describe('mdata logger', () => {

  test
  .stdout()
  .it('prints logs', (ctx) => {
    Mdata.setLogLevel('trace', false);
    Mdata.log('Test Trace Message', LoggerLevel.TRACE);
    Mdata.log('Test Debug Message', LoggerLevel.DEBUG);
    Mdata.log('Test Info Message', LoggerLevel.INFO);
    Mdata.log('Test Warn Message', LoggerLevel.WARN);
    Mdata.log('Test Error Message', LoggerLevel.ERROR);
    Mdata.log('Test Fatal Message', LoggerLevel.FATAL);

    expect(ctx.stdout).to.contain('Test Trace Message');
    expect(ctx.stdout).to.contain('Test Debug Message');
    expect(ctx.stdout).to.contain('Test Info Message');
    expect(ctx.stdout).to.contain('Test Warn Message');
    expect(ctx.stdout).to.contain('Test Error Message');
    expect(ctx.stdout).to.contain('Test Fatal Message');

  })

  test
  .stdout()
  .it('doesn\'t print logs below the level specified during initialization', (ctx) => {
    Mdata.setLogLevel('warn', false);
    Mdata.log('Test Trace Message', LoggerLevel.TRACE);
    Mdata.log('Test Debug Message', LoggerLevel.DEBUG);
    Mdata.log('Test Info Message', LoggerLevel.INFO);
    Mdata.log('Test Warn Message', LoggerLevel.WARN);
    Mdata.log('Test Error Message', LoggerLevel.ERROR);
    Mdata.log('Test Fatal Message', LoggerLevel.FATAL);

    expect(ctx.stdout).to.not.contain('Test Trace Message');
    expect(ctx.stdout).to.not.contain('Test Debug Message');
    expect(ctx.stdout).to.not.contain('Test Info Message');
    expect(ctx.stdout).to.contain('Test Warn Message');
    expect(ctx.stdout).to.contain('Test Error Message');
    expect(ctx.stdout).to.contain('Test Fatal Message');

  })

  test
  .stdout()
  .it('doesn\'t print when json output is requested', (ctx) => {
    Mdata.setLogLevel('warn', true);
    Mdata.log('Test Trace Message', LoggerLevel.TRACE);
    Mdata.log('Test Debug Message', LoggerLevel.DEBUG);
    Mdata.log('Test Info Message', LoggerLevel.INFO);
    Mdata.log('Test Warn Message', LoggerLevel.WARN);
    Mdata.log('Test Error Message', LoggerLevel.ERROR);
    Mdata.log('Test Fatal Message', LoggerLevel.FATAL);

    expect(ctx.stdout).to.not.contain('Test Trace Message');
    expect(ctx.stdout).to.not.contain('Test Debug Message');
    expect(ctx.stdout).to.not.contain('Test Info Message');
    expect(ctx.stdout).to.not.contain('Test Warn Message');
    expect(ctx.stdout).to.not.contain('Test Error Message');
    expect(ctx.stdout).to.not.contain('Test Fatal Message');

  })
})
