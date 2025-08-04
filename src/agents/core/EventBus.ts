// EventBus.ts

import { Event, EventType } from './types';
import { ErrorHandler, ErrorSeverity } from './ErrorHandler';

// Strongly typed async event handler that receives log
import * as vscode from 'vscode';
type AsyncEventHandler = (event: Event, log: vscode.LogOutputChannel) => Promise<void> | void;

interface HandlerEntry {
  handler: AsyncEventHandler;
  once: boolean;
}


export class EventBus {
  private handlers: Map<EventType, HandlerEntry[]> = new Map();
  private errorHandler: ErrorHandler;

  constructor() {
    this.errorHandler = new ErrorHandler();
  }

  /**
   * Subscribe to an event type. Returns an unsubscribe function.
   */

  subscribe(type: EventType, handler: AsyncEventHandler): () => void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    const entry: HandlerEntry = { handler, once: false };
    this.handlers.get(type)!.push(entry);
    return () => {
      const typeHandlers = this.handlers.get(type)!;
      const idx = typeHandlers.indexOf(entry);
      if (idx !== -1) { typeHandlers.splice(idx, 1); }
    };
  }

  /**
   * Subscribe to an event type, but only for the next event (one-time listener).
   */
  once(type: EventType, handler: AsyncEventHandler): void {
    if (!this.handlers.has(type)) {
      this.handlers.set(type, []);
    }
    this.handlers.get(type)!.push({ handler, once: true });
  }

  /**
   * Publish an event asynchronously. All handlers are awaited, errors are isolated.
   */
  async publish(event: Event, log: vscode.LogOutputChannel): Promise<void> {
    log.debug(`[EventBus] publish called: event.type='${event.type}' payload=${JSON.stringify(event.payload)}`);
    const entries = this.handlers.get(event.type) || [];
    // Copy to avoid mutation during iteration
    const toRemove: HandlerEntry[] = [];
    await Promise.all(entries.map(async entry => {
      try {
        await entry.handler(event, log);
      } catch (error) {
        // Enhanced error handling: include event context and correlation ID if present
        const correlationId = (event as any)?.payload?.correlationId;
        this.errorHandler.handle(
          {
            error,
            eventType: event.type,
            eventPayload: event.payload,
            correlationId,
          },
          undefined,
          log
        );
        // Optionally, emit an error event for critical errors (if ErrorHandler supports escalation)
        // If error is critical, broadcast to ERROR event listeners
        // (Assumes ErrorHandler.classify returns severity)
        const classified = this.errorHandler.classify(error);
        if (classified.severity === ErrorSeverity.CRITICAL) {
          const errorEvent: Event = {
            type: EventType.ERROR,
            payload: { error: { ...classified, correlationId } },
          };
          // Avoid infinite loop: only emit if not already an ERROR event
          if (event.type !== EventType.ERROR) {
            await this.publish(errorEvent, log);
          }
        }
      }
      if (entry.once) { toRemove.push(entry); }
    }));
    // Remove one-time listeners
    if (toRemove.length) {
      this.handlers.set(event.type, entries.filter(e => !toRemove.includes(e)));
    }
  }
}

export const globalEventBus = new EventBus();