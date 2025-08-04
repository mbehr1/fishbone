import * as assert from 'assert';
import { EventBus } from '../../agents/core/EventBus';
import { EventType } from '../../agents/core/types';
import { QueryAgent } from '../../agents/tasks/QueryAgent';
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

suite('QueryAgent', () => {
  test('should emit QUERY_RESULT with error on empty query and log info', async () => {
    /**
     * 1. Precondition: QueryAgent is instantiated with a stub DLT provider, eventBus and mock log are set up.
     * 2. Test steps: Subscribe to QUERY_RESULT events, publish a QUERY event with an empty query string.
     * 3. Expected response: QUERY_RESULT event is emitted with error, log contains 'missing payload or query'.
     * 4. Postcondition: No side effects, eventBus subscriptions are not cleaned up.
     */
    const eventBus = new EventBus();
    const mockDLTProvider = {
      performRestQueryUri: async (_uri: string) => ({}),
      DltFilter: class { f: any; constructor(f: any) { this.f = f; } asConfiguration() { return this.f; } },
      rqUriEncode: (rq: any) => JSON.stringify(rq),
      RQ: Object,
    };
    new QueryAgent(eventBus, mockDLTProvider);
    let error: any = null;
    const { log, calls } = createMockLog();
    eventBus.subscribe(EventType.QUERY_RESULT, (event) => {
      if ('error' in event.payload) {
        error = event.payload.error;
      }
    });
    await eventBus.publish({ type: EventType.QUERY, payload: { query: '' } }, log);
    assert.ok(error);
    assert.ok(error.includes('Invalid query/filter'));
    // Check that log.info was called with expected message
    assert.ok(calls.some(c => c.level === 'info' && c.args[0].includes('missing payload or query')));
  });

  test('should emit QUERY_RESULT with error on missing payload and log info', async () => {
    /**
     * 1. Precondition: QueryAgent is instantiated with a stub DLT provider, eventBus and mock log are set up.
     * 2. Test steps: Subscribe to QUERY_RESULT events, publish a QUERY event with missing payload.
     * 3. Expected response: QUERY_RESULT event is emitted with error, log contains 'missing payload or query'.
     * 4. Postcondition: No side effects, eventBus subscriptions are not cleaned up.
     */
    const eventBus = new EventBus();
    const mockDLTProvider = {
      performRestQueryUri: async (_uri: string) => ({}),
      DltFilter: class { f: any; constructor(f: any) { this.f = f; } asConfiguration() { return this.f; } },
      rqUriEncode: (rq: any) => JSON.stringify(rq),
      RQ: Object,
    };
    new QueryAgent(eventBus, mockDLTProvider);
    let error: any = null;
    const { log, calls } = createMockLog();
    eventBus.subscribe(EventType.QUERY_RESULT, (event) => {
      if ('error' in event.payload) {
        error = event.payload.error;
      }
    });
    // @ts-ignore intentionally missing payload
    await eventBus.publish({ type: EventType.QUERY }, log);
    assert.ok(error);
    assert.ok(error.includes('Invalid query/filter'));
    assert.ok(calls.some(c => c.level === 'info' && c.args[0].includes('missing payload or query')));
  });

  test('should emit QUERY_RESULT with error on missing query in payload and log info', async () => {
    /**
     * 1. Precondition: QueryAgent is instantiated with a stub DLT provider, eventBus and mock log are set up.
     * 2. Test steps: Subscribe to QUERY_RESULT events, publish a QUERY event with missing query in payload.
     * 3. Expected response: QUERY_RESULT event is emitted with error, log contains 'missing payload or query'.
     * 4. Postcondition: No side effects, eventBus subscriptions are not cleaned up.
     */
    const eventBus = new EventBus();
    const mockDLTProvider = {
      performRestQueryUri: async (_uri: string) => ({}),
      DltFilter: class { f: any; constructor(f: any) { this.f = f; } asConfiguration() { return this.f; } },
      rqUriEncode: (rq: any) => JSON.stringify(rq),
      RQ: Object,
    };
    new QueryAgent(eventBus, mockDLTProvider);
    let error: any = null;
    const { log, calls } = createMockLog();
    eventBus.subscribe(EventType.QUERY_RESULT, (event) => {
      if ('error' in event.payload) {
        error = event.payload.error;
      }
    });
    // @ts-ignore intentionally missing query
    await eventBus.publish({ type: EventType.QUERY, payload: {} }, log);
    assert.ok(error);
    assert.ok(error.includes('Invalid query/filter'));
    assert.ok(calls.some(c => c.level === 'info' && c.args[0].includes('missing payload or query')));
  });

  test('should not emit QUERY_RESULT if a non-QUERY event is published', async () => {
    /**
     * 1. Precondition: QueryAgent is instantiated with a stub DLT provider, eventBus and mock log are set up.
     * 2. Test steps: Subscribe to QUERY_RESULT events, publish a non-QUERY event.
     * 3. Expected response: QUERY_RESULT event is not emitted.
     * 4. Postcondition: No side effects, eventBus subscriptions are not cleaned up.
     */
    const eventBus = new EventBus();
    const mockDLTProvider = {
      performRestQueryUri: async (_uri: string) => { throw new Error('Should not be called'); },
      DltFilter: class { f: any; constructor(f: any) { this.f = f; } asConfiguration() { return this.f; } },
      rqUriEncode: (rq: any) => JSON.stringify(rq),
      RQ: Object,
    };
    new QueryAgent(eventBus, mockDLTProvider);
    let called = false;
    eventBus.subscribe(EventType.QUERY_RESULT, () => {
      called = true;
    });
    const { log } = createMockLog();
    await eventBus.publish({ type: 'SOME_OTHER_EVENT' as any, payload: { query: '[{"foo":"bar"}]' } }, log);
    // Wait a tick to ensure no async publish
    await new Promise(res => setTimeout(res, 10));
    assert.strictEqual(called, false);
  });
  test('should emit QUERY_RESULT with DLT messages on valid query', async () => {
    /**
     * 1. Precondition: QueryAgent is instantiated with a stub DLT provider, eventBus and mock log are set up.
     * 2. Test steps: Subscribe to QUERY_RESULT events, publish a QUERY event with a valid query.
     * 3. Expected response: QUERY_RESULT event is emitted with DLT messages, no error.
     * 4. Postcondition: No side effects, eventBus subscriptions are not cleaned up.
     */
    const eventBus = new EventBus();
    const mockDLTProvider = {
      performRestQueryUri: async (_uri: string) => ({
        data: [
          { type: 'msg', id: 1, attributes: { foo: 'bar' } },
          { type: 'msg', id: 2, attributes: { foo: 'baz' } },
        ],
      }),
      DltFilter: class { f: any; constructor(f: any) { this.f = f; } asConfiguration() { return this.f; } },
      rqUriEncode: (rq: any) => JSON.stringify(rq),
      RQ: Object,
    };
    const agent = new QueryAgent(eventBus, mockDLTProvider);
    let result: any = null;
    eventBus.subscribe(EventType.QUERY_RESULT, (event) => {
      if ('result' in event.payload) {
        result = event.payload.result;
      }
    });
    const { log, calls } = createMockLog();
    await eventBus.publish({ type: EventType.QUERY, payload: { query: '[{"foo":"bar"}]' } }, log);
    assert.ok(Array.isArray(result));
    assert.strictEqual(result.length, 2);
    assert.strictEqual(result[0].id, 1);
    assert.strictEqual(result[1].attributes.foo, 'baz');
  });

  test('should emit QUERY_RESULT with error on invalid query', async () => {
    /**
     * 1. Precondition: QueryAgent is instantiated with a stub DLT provider, eventBus and mock log are set up.
     * 2. Test steps: Subscribe to QUERY_RESULT events, publish a QUERY event with an invalid (non-JSON) query.
     * 3. Expected response: QUERY_RESULT event is emitted with error, log contains 'failed to parse query'.
     * 4. Postcondition: No side effects, eventBus subscriptions are not cleaned up.
     */
    const eventBus = new EventBus();
    const mockDLTProvider = {
      performRestQueryUri: async (_uri: string) => ({}),
      DltFilter: class { f: any; constructor(f: any) { this.f = f; } asConfiguration() { return this.f; } },
      rqUriEncode: (rq: any) => JSON.stringify(rq),
      RQ: Object,
    };
    const agent = new QueryAgent(eventBus, mockDLTProvider);
    let error: any = null;
    eventBus.subscribe(EventType.QUERY_RESULT, (event) => {
      if ('error' in event.payload) {
        error = event.payload.error;
      }
    });
    const { log, calls } = createMockLog();
    await eventBus.publish({ type: EventType.QUERY, payload: { query: 'not-json' } }, log);
    assert.ok(calls.some(c => c.level === 'info' && c.args[0].includes('failed to parse query')));
    assert.ok(error);
    assert.ok(error.includes('Invalid query/filter'));
  });

  test('should emit ERROR event on critical error in QueryAgent', async () => {
  /**
   * 1. Precondition: QueryAgent is instantiated with a DLT provider that throws, eventBus and mock log are set up.
   * 2. Test steps: Subscribe to ERROR events, publish a QUERY event with a valid query.
   * 3. Expected response: ERROR event is emitted, error message includes 'DLT query failed'.
   * 4. Postcondition: No side effects, eventBus subscriptions are not cleaned up.
   */
  const eventBus = new EventBus();
  // Simulate a DLT provider that throws
  const mockDLTProvider = {
    performRestQueryUri: async (_uri: string) => { throw new Error('Simulated DLT failure'); },
    DltFilter: class { f: any; constructor(f: any) { this.f = f; } asConfiguration() { return this.f; } },
    rqUriEncode: (rq: any) => JSON.stringify(rq),
    RQ: Object,
  };
  new QueryAgent(eventBus, mockDLTProvider);
  let errorEvent: any = null;
  eventBus.subscribe(EventType.ERROR, (event) => {
    if ('error' in event.payload) {
      errorEvent = event.payload.error;
    }
  });
  const { log } = createMockLog();
  await eventBus.publish({ type: EventType.QUERY, payload: { query: '[{"foo":"bar"}]' } }, log);
  // Wait a tick to ensure async error event is processed
  await new Promise(res => setTimeout(res, 10));
  assert.ok(errorEvent, 'ERROR event should be emitted');
  assert.ok(errorEvent.message.includes('DLT query failed'), 'Error message should mention DLT query failed');
});

  test('integration: QueryAgent returns real DLT data via performRestQueryUri', async () => {
  /**
   * 1. Precondition: QueryAgent is instantiated with a stub DLT provider, eventBus and mock log are set up.
   * 2. Test steps: Subscribe to QUERY_RESULT events, publish a QUERY event with a valid query.
   * 3. Expected response: QUERY_RESULT event is emitted with simulated DLT data, no error.
   * 4. Postcondition: No side effects, eventBus subscriptions are not cleaned up.
   */
  // Simulate a real DLT provider (or a close stub) that returns realistic data
  const eventBus = new EventBus();
  // This simulates the real performRestQueryUri logic, returning a realistic DLT log result
  const realDLTProvider = {
    performRestQueryUri: async (uri: string) => {
      // Simulate a real DLT log result (as would be returned by FBAEditorProvider.performRestQueryUri)
      if (uri.includes('filters')) {
        return {
          data: [
            { type: 'msg', id: 101, attributes: { apid: 'NSG', msg: 'Trace1' } },
            { type: 'msg', id: 102, attributes: { apid: 'NSG', msg: 'Trace2' } },
          ],
        };
      }
      return { data: [] };
    },
    DltFilter: class { f: any; constructor(f: any) { this.f = f; } asConfiguration() { return this.f; } },
    rqUriEncode: (rq: any) => JSON.stringify(rq),
    RQ: Object,
  };
  const agent = new QueryAgent(eventBus, realDLTProvider);
  let result: any = null;
  let error: any = null;
  eventBus.subscribe(EventType.QUERY_RESULT, (event) => {
    if ('result' in event.payload) {
      result = event.payload.result;
    }
    if ('error' in event.payload) {
      error = event.payload.error;
    }
  });
  const { log, calls } = createMockLog();
  // Simulate a valid query for APID:NSG
  await eventBus.publish({ type: EventType.QUERY, payload: { query: '[{"apid":"NSG","type":0}]' } }, log);
  // Should return the simulated DLT data
  assert.ok(Array.isArray(result));
  assert.strictEqual(result.length, 2);
  assert.strictEqual(result[0].attributes.apid, 'NSG');
  assert.strictEqual(result[1].attributes.msg, 'Trace2');
  assert.strictEqual(error, null);
  // Check that logging and event bus still work
  assert.ok(calls.some(c => c.level === 'info' && c.args[0].includes('handleQuery CALLED')));
});
});
