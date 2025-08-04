import { EventBus } from '../core/EventBus';
import { Event, EventType } from '../core/types';
import * as vscode from 'vscode';

/**
 * QueryAgent (Agentic/Event-Driven)
 *
 * Listens for QUERY events on the EventBus, parses and validates the query payload,
 * and delegates DLT log queries to the injected DLT provider. Emits QUERY_RESULT events
 * with results or errors, and emits ERROR events for critical failures. All logging is
 * routed through the provided log channel for observability.
 *
 * Responsibilities:
 *   - Validate and parse incoming QUERY events
 *   - Transform query payloads into DLT filter configs
 *   - Call DLT provider and handle results/errors
 *   - Emit QUERY_RESULT and ERROR events as appropriate
 *   - Log all actions and errors for traceability
 */
export class QueryAgent {
    constructor(
        private eventBus: EventBus,
        private dltProvider: { performRestQueryUri: (uri: string) => Promise<any>, DltFilter: any, rqUriEncode: any, RQ: any }
    ) {
        // No log property; log will be passed to handleQuery
        // The event bus or orchestrator must pass log to handleQuery
        // Subscribe to QUERY events and delegate to handleQuery
        this.eventBus.subscribe(EventType.QUERY, (event, log) => this.handleQuery(event, log));
    }

    /**
     * Handles QUERY events: parses, validates, and executes DLT log queries.
     * Emits QUERY_RESULT and ERROR events as appropriate.
     * @param event The QUERY event (payload: { query: string })
     * @param log The log output channel for tracing
     */
    async handleQuery(event: any, log: vscode.LogOutputChannel): Promise<void> {
        // Always require log parameter for traceability
        const correlationId = event?.payload?.correlationId;
        try {
            log.info(`[QueryAgent] handleQuery CALLED: event.type='${event.type}' payload= ${JSON.stringify(event.payload)}`);
            // Only process QUERY events
            if (event.type !== EventType.QUERY) { return; }

            // Validate payload and query string
            if (!event.payload || typeof event.payload.query !== 'string' || event.payload.query.trim() === '') {
                log.info(`QueryAgent.handleQuery missing payload or query: ${JSON.stringify(event)}`);
                await this.eventBus.publish({
                    type: EventType.QUERY_RESULT,
                    payload: { error: 'Invalid query/filter: missing payload or query' }
                }, log);
                return;
            }

            // Parse query string as JSON to build DLT filter(s)
            const { query } = event.payload;
            let filters: any[] = [];
            try {
                const filterFrags = JSON.parse(query);
                log.debug(`QueryAgent.handleQuery parsed query: ${JSON.stringify(filterFrags)}`);
                filters = Array.isArray(filterFrags)
                    ? filterFrags.map(f => new this.dltProvider.DltFilter(f))
                    : [new this.dltProvider.DltFilter(filterFrags)];
            } catch (e) {
                // Query string was not valid JSON
                log.info(`QueryAgent.handleQuery failed to parse query: ${query} ${e}`);
                await this.eventBus.publish({
                    type: EventType.QUERY_RESULT,
                    payload: { error: `Invalid query/filter: ${e}` }
                }, log);
                // Emit critical error event for parse failure
                await this.eventBus.publish({
                    type: EventType.ERROR,
                    payload: { error: { message: `QueryAgent failed to parse query: ${e}`, eventType: event.type, eventPayload: event.payload, correlationId } }
                }, log);
                return;
            }

            // Convert DLT filters to configuration objects
            const filterConfigs = filters.map(f => f.asConfiguration());
            if (filterConfigs.length > 0) { filterConfigs[0].addLifecycles = true; }

            // Build the DLT provider request object
            const rq = {
                path: 'ext:mbehr1.dlt-logs/get/docs/0/filters',
                commands: [
                    { cmd: 'query', param: JSON.stringify(filterConfigs) }
                ]
            };
            try {
                log.debug(`QueryAgent.handleQuery calling DLT provider with rq: ${JSON.stringify(rq)}`);
                // Call the DLT provider and await results
                const resJson = await this.dltProvider.performRestQueryUri(this.dltProvider.rqUriEncode(rq));
                if (resJson.data && Array.isArray(resJson.data)) {
                    // Filter for DLT messages only
                    const msgs = resJson.data.filter((d: any) => d.type === 'msg');
                    log.info(`QueryAgent.handleQuery DLT provider returned ${msgs.length} messages`);
                    await this.eventBus.publish({
                        type: EventType.QUERY_RESULT,
                        payload: { result: msgs }
                    }, log);
                } else {
                    // No data returned from DLT provider
                    log.info(`QueryAgent.handleQuery no data returned from DLT provider: ${JSON.stringify(resJson)}`);
                    await this.eventBus.publish({
                        type: EventType.QUERY_RESULT,
                        payload: { error: 'No data returned from DLT.' }
                    }, log);
                    // Emit critical error event for no data
                    await this.eventBus.publish({
                        type: EventType.ERROR,
                        payload: { error: { message: 'No data returned from DLT.', eventType: event.type, eventPayload: event.payload, correlationId } }
                    }, log);
                }
            } catch (e) {
                // DLT provider query failed
                log.error(`QueryAgent.handleQuery DLT query failed: ${e}`);
                await this.eventBus.publish({
                    type: EventType.QUERY_RESULT,
                    payload: { error: `DLT query failed: ${e}` }
                }, log);
                // Emit critical error event for DLT query failure
                await this.eventBus.publish({
                    type: EventType.ERROR,
                    payload: { error: { message: `DLT query failed: ${e}`, eventType: event.type, eventPayload: event.payload, correlationId } }
                }, log);
            }
        } catch (e) {
            // Unexpected error in handler
            log.error(`QueryAgent.handleQuery unexpected error: ${e}`);
            // Emit critical error event for unexpected error
            await this.eventBus.publish({
                type: EventType.ERROR,
                payload: { error: { message: `QueryAgent unexpected error: ${e}`, eventType: event.type, eventPayload: event.payload, correlationId } }
            }, log);
        }
    }
}
