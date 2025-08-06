
import * as assert from 'assert';
import { ErrorHandler, ErrorSeverity, AgentError } from '../../agents/core/ErrorHandler';
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

suite('ErrorHandler', () => {
  test('should emit ERROR and RETRY events for WARNING severity', async () => {
    /**
     * 1. Precondition: ErrorHandler is instantiated, globalEventBus is available, and mock log is set up.
     * 2. Test steps: Subscribe to ERROR and RETRY events, call handler.handle() with a warning message and agentId.
     * 3. Expected response: ERROR and RETRY events are emitted, errorEvent.severity is WARNING, retryEvent.agentId matches, and log contains RETRY event emission.
     * 4. Postcondition: No side effects, globalEventBus subscriptions are not cleaned up (test isolation is not enforced here).
     */
    const handler = new ErrorHandler();
    let errorEvent: any = null;
    let retryEvent: any = null;
    globalEventBus.subscribe(EventType.ERROR, (event) => {
      if ('error' in event.payload) { errorEvent = event.payload.error; }
    });
    globalEventBus.subscribe('RETRY' as EventType, (event) => {
      if ('error' in event.payload) { retryEvent = event.payload.error; }
    });
    const { log, calls } = createMockLog();
    handler.handle({ message: 'warn: something went wrong' }, 'agent1', log);
    await new Promise(res => setTimeout(res, 10));
    assert.ok(errorEvent, 'ERROR event should be emitted');
    assert.strictEqual(errorEvent.severity, ErrorSeverity.WARNING);
    assert.ok(retryEvent, 'RETRY event should be emitted');
    assert.strictEqual(retryEvent.agentId, 'agent1');
    assert.ok(calls.some(c => c.level === 'info' && c.args[0].includes('RETRY event emitted')));
  });

  test('should emit ERROR and ESCALATE events for CRITICAL severity', async () => {
    /**
     * 1. Precondition: ErrorHandler is instantiated, globalEventBus is available, and mock log is set up.
     * 2. Test steps: Subscribe to ERROR and ESCALATE events, call handler.handle() with a critical message and agentId.
     * 3. Expected response: ERROR and ESCALATE events are emitted, errorEvent.severity is CRITICAL, escalateEvent.agentId matches, and log contains ESCALATE event emission.
     * 4. Postcondition: No side effects, globalEventBus subscriptions are not cleaned up (test isolation is not enforced here).
     */
    const handler = new ErrorHandler();
    let errorEvent: any = null;
    let escalateEvent: any = null;
    globalEventBus.subscribe(EventType.ERROR, (event) => {
      if ('error' in event.payload) { errorEvent = event.payload.error; }
    });
    globalEventBus.subscribe('ESCALATE' as EventType, (event) => {
      if ('error' in event.payload) { escalateEvent = event.payload.error; }
    });
    const { log, calls } = createMockLog();
    handler.handle({ message: 'critical: unrecoverable failure' }, 'agent2', log);
    await new Promise(res => setTimeout(res, 10));
    assert.ok(errorEvent, 'ERROR event should be emitted');
    assert.strictEqual(errorEvent.severity, ErrorSeverity.CRITICAL);
    assert.ok(escalateEvent, 'ESCALATE event should be emitted');
    assert.strictEqual(escalateEvent.agentId, 'agent2');
    assert.ok(calls.some(c => c.level === 'error' && c.args[0].includes('ESCALATE event emitted')));
  });

  test('should emit only ERROR event for INFO severity', async () => {
    /**
     * 1. Precondition: ErrorHandler is instantiated, globalEventBus is available, and mock log is set up.
     * 2. Test steps: Subscribe to ERROR, RETRY, and ESCALATE events, call handler.handle() with an info message and agentId.
     * 3. Expected response: Only ERROR event is emitted, errorEvent.severity is INFO, retryEvent and escalateEvent remain null.
     * 4. Postcondition: No side effects, globalEventBus subscriptions are not cleaned up (test isolation is not enforced here).
     */
    const handler = new ErrorHandler();
    let errorEvent: any = null;
    let retryEvent: any = null;
    let escalateEvent: any = null;
    globalEventBus.subscribe(EventType.ERROR, (event) => {
      if ('error' in event.payload) { errorEvent = event.payload.error; }
    });
    globalEventBus.subscribe('RETRY' as EventType, (event) => {
      if ('error' in event.payload) { retryEvent = event.payload.error; }
    });
    globalEventBus.subscribe('ESCALATE' as EventType, (event) => {
      if ('error' in event.payload) { escalateEvent = event.payload.error; }
    });
    const { log } = createMockLog();
    handler.handle({ message: 'info: just FYI' }, 'agent3', log);
    await new Promise(res => setTimeout(res, 10));
    assert.ok(errorEvent, 'ERROR event should be emitted');
    assert.strictEqual(errorEvent.severity, ErrorSeverity.INFO);
    assert.strictEqual(retryEvent, null);
    assert.strictEqual(escalateEvent, null);
  });
});
