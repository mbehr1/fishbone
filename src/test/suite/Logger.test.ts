import * as assert from 'assert';
import { Logger, LogLevel } from '../../agents/core/Logger';
import { globalEventBus } from '../../agents/core/EventBus';
import { EventType } from '../../agents/core/types';
import * as vscode from 'vscode';


function createMockLog() {
  const calls: { level: string, args: any[] }[] = [];
  const log: vscode.LogOutputChannel = {
    name: 'mock',
    logLevel: 0,
    onDidChangeLogLevel: () => ({ dispose: () => {} }),
    info: (...args: any[]) => { calls.push({ level: 'info', args }); },
    debug: (...args: any[]) => { calls.push({ level: 'debug', args }); },
    error: (...args: any[]) => { calls.push({ level: 'error', args }); },
    warn: (...args: any[]) => { calls.push({ level: 'warn', args }); },
    trace: (..._args: any[]) => {},
    append: () => {},
    appendLine: () => {},
    replace: () => {},
    clear: () => {},
    show: () => {},
    hide: () => {},
    dispose: () => {},
  };
  return { log, calls };
}

suite('Logger', () => {
  test('should emit UPDATE event and log at correct level', async () => {
    /**
     * 1. Precondition: Logger is instantiated, globalEventBus and mock log are set up.
     * 2. Test steps: Subscribe to UPDATE events, call logger.log() with a message and level.
     * 3. Expected response: UPDATE event is emitted with correct payload, log method is called at correct level.
     * 4. Postcondition: No side effects, globalEventBus subscriptions are not cleaned up.
     */
    const logger = new Logger();
    let updateEvent: any = null;
    globalEventBus.subscribe(EventType.UPDATE, (event) => {
      // Type guard: only access 'update' for UPDATE events
      if ('update' in event.payload) { updateEvent = event.payload.update; }
    });
    const { log, calls } = createMockLog();
    const msg = 'Test log message';
    const meta = { foo: 'bar' };
    logger.log(msg, LogLevel.WARN, log, meta);
    // Wait a tick to ensure async event is processed
    await new Promise(res => setTimeout(res, 10));
    assert.ok(updateEvent, 'UPDATE event should be emitted');
    assert.strictEqual(updateEvent.log, msg);
    assert.strictEqual(updateEvent.level, LogLevel.WARN);
    assert.deepStrictEqual(updateEvent.meta, meta);
    assert.ok(calls.some(c => c.level === 'warn' && c.args[1] === msg), 'log.warn should be called with message');
  });

  test('should log at all levels and emit UPDATE event', async () => {
    /**
     * 1. Precondition: Logger is instantiated, globalEventBus and mock log are set up.
     * 2. Test steps: For each log level, subscribe to UPDATE events, call logger.log() with a message and level.
     * 3. Expected response: UPDATE event is emitted with correct payload, log method is called at correct level for each level.
     * 4. Postcondition: No side effects, globalEventBus subscriptions are not cleaned up.
     */
    const logger = new Logger();
    const levels = [LogLevel.INFO, LogLevel.DEBUG, LogLevel.WARN, LogLevel.ERROR];
    for (const level of levels) {
      let updateEvent: any = null;
      globalEventBus.subscribe(EventType.UPDATE, (event) => {
        if ('update' in event.payload) { updateEvent = event.payload.update; }
      });
      const { log, calls } = createMockLog();
      const msg = `Level ${level}`;
      logger.log(msg, level, log);
      await new Promise(res => setTimeout(res, 5));
      assert.ok(updateEvent, `UPDATE event for ${level}`);
      assert.strictEqual(updateEvent.log, msg);
      assert.strictEqual(updateEvent.level, level);
      assert.ok(calls.some(c => c.level === level && c.args[1] === msg), `log.${level} called`);
    }
  });

  test('should handle missing meta argument', async () => {
    /**
     * 1. Precondition: Logger is instantiated, globalEventBus and mock log are set up.
     * 2. Test steps: Subscribe to UPDATE events, call logger.log() without meta argument.
     * 3. Expected response: UPDATE event is emitted with correct payload, log.info is called.
     * 4. Postcondition: No side effects, globalEventBus subscriptions are not cleaned up.
     */
    const logger = new Logger();
    let updateEvent: any = null;
    globalEventBus.subscribe(EventType.UPDATE, (event) => {
      if ('update' in event.payload) { updateEvent = event.payload.update; }
    });
    const { log, calls } = createMockLog();
    const msg = 'No meta';
    logger.log(msg, LogLevel.INFO, log);
    await new Promise(res => setTimeout(res, 5));
    assert.ok(updateEvent, 'UPDATE event should be emitted');
    assert.strictEqual(updateEvent.log, msg);
    assert.strictEqual(updateEvent.level, LogLevel.INFO);
    assert.ok(calls.some(c => c.level === 'info' && c.args[1] === msg), 'log.info should be called');
  });

  test('should handle empty and null messages', async () => {
    /**
     * 1. Precondition: Logger is instantiated, globalEventBus and mock log are set up.
     * 2. Test steps: Subscribe to UPDATE events, call logger.log() with empty and null messages.
     * 3. Expected response: UPDATE event is emitted for both cases, log.info is called.
     * 4. Postcondition: No side effects, globalEventBus subscriptions are not cleaned up.
     */
    const logger = new Logger();
    let updateEvent: any = null;
    globalEventBus.subscribe(EventType.UPDATE, (event) => {
      if ('update' in event.payload) { updateEvent = event.payload.update; }
    });
    const { log, calls } = createMockLog();
    logger.log('', LogLevel.INFO, log);
    await new Promise(res => setTimeout(res, 5));
    assert.ok(updateEvent, 'UPDATE event for empty message');
    assert.strictEqual(updateEvent.log, '');
    logger.log(null as any, LogLevel.INFO, log);
    await new Promise(res => setTimeout(res, 5));
    // Should emit event with null log
    assert.strictEqual(updateEvent.log, null);
  });

  test('should not crash if log channel throws', async () => {
    /**
     * 1. Precondition: Logger is instantiated with a fresh EventBus (testBus) to ensure test isolation and avoid pollution from other tests.
     * 2. Test steps: Subscribe to UPDATE events on testBus, call logger.log() with a log channel that throws.
     * 3. Expected response: Logger does not throw, UPDATE event is still emitted and received by the test handler.
     * 4. Postcondition: No side effects, testBus is not shared with other tests, ensuring reliable event delivery.
     */
    // Use a fresh EventBus for this test to avoid test pollution
    const { EventBus } = require('../../agents/core/EventBus');
    const testBus = new EventBus();
    const logger = new Logger(testBus);
    let updateEvent: any = null;
    // Fix TS7006 by explicitly typing event as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    testBus.subscribe(EventType.UPDATE, (event: any) => {
      if ('update' in event.payload) { updateEvent = event.payload.update; }
    });
    const log = {
      name: 'mock',
      logLevel: 0,
      onDidChangeLogLevel: () => ({ dispose: () => {} }),
      info: () => { throw new Error('info fail'); },
      debug: () => { throw new Error('debug fail'); },
      error: () => { throw new Error('error fail'); },
      warn: () => { throw new Error('warn fail'); },
      trace: () => {},
      append: () => {},
      appendLine: () => {},
      replace: () => {},
      clear: () => {},
      show: () => {},
      hide: () => {},
      dispose: () => {},
    } as vscode.LogOutputChannel;
    // Should not throw
    assert.doesNotThrow(() => logger.log('fail', LogLevel.INFO, log));
    await new Promise(res => setTimeout(res, 5));
    assert.ok(updateEvent, 'UPDATE event should still be emitted');
  });
});
