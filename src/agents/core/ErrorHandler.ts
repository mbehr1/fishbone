import { EventType, Event } from './types';
import { globalEventBus } from './EventBus';
import * as vscode from 'vscode';

export enum ErrorSeverity {
  INFO = 'info',
  WARNING = 'warning',
  CRITICAL = 'critical',
}

export interface AgentError {
  message: string;
  code?: string;
  severity: ErrorSeverity;
  cause?: any;
  agentId?: string;
  timestamp: number;
}

/**
 * ErrorHandler (Agentic/Event-Driven)
 *
 * Centralized error handling for all agents and workflows.
 * Classifies, logs, emits, and recovers from errors in an agentic context.
 *
 * Responsibilities:
 *   - Classify errors by severity and agent
 *   - Log errors and emit ERROR events to the EventBus
 *   - Attempt recovery or escalation as needed
 */
export class ErrorHandler {
  /**
   * Handle an error: classify, log, emit event, and attempt recovery.
   */
  handle(error: any, agentId: string | undefined, log: vscode.LogOutputChannel) {
    const agentError: AgentError = this.classify(error, agentId);
    log.error(`[${agentError.severity}] Error: ${agentError.message}`, agentError);
    // Emit error event for agentic workflows
    const event: Event<EventType.ERROR> = {
      type: EventType.ERROR,
      payload: { error: agentError },
    };
    globalEventBus.publish(event, log);
    this.recover(agentError, log);
  }

  /**
   * Classify an error by severity, message, and agent.
   * Returns a structured AgentError for logging and event emission.
   */
  classify(error: any, agentId?: string): AgentError {
    // Simple classification logic (customize as needed)
    let severity = ErrorSeverity.WARNING;
    let message = '';
    if (typeof error === 'string') {
      message = error;
    } else if (error instanceof Error) {
      message = error.message;
    } else if (error && error.message) {
      message = error.message;
    } else {
      message = JSON.stringify(error);
    }
    if (message.match(/critical|fatal|unrecoverable/i)) {
      severity = ErrorSeverity.CRITICAL;
    } else if (message.match(/warn|timeout|retry/i)) {
      severity = ErrorSeverity.WARNING;
    } else {
      severity = ErrorSeverity.INFO;
    }
    return {
      message,
      code: error.code || undefined,
      severity,
      cause: error,
      agentId,
      timestamp: Date.now(),
    };
  }

  recover(agentError: AgentError, log: vscode.LogOutputChannel) {
    // Recovery logic based on severity
    switch (agentError.severity) {
      case ErrorSeverity.INFO:
        // No action needed for informational errors
        break;
      case ErrorSeverity.WARNING:
        // Attempt a retry: emit a RETRY event if agentId is available
        if (agentError.agentId) {
          const retryEvent: Event = {
            type: 'RETRY' as EventType, // Add RETRY to EventType if not present
            payload: { error: agentError },
          };
          log.info('[Recovery] RETRY event emitted', retryEvent);
          globalEventBus.publish(retryEvent, log);
        }
        break;
      case ErrorSeverity.CRITICAL:
        // Escalate: emit an ESCALATE event if agentId is available
        const escalateEvent: Event = {
          type: 'ESCALATE' as EventType, // Add ESCALATE to EventType if not present
          payload: { error: agentError },
        };
        log.error('[Recovery] ESCALATE event emitted', escalateEvent);
        globalEventBus.publish(escalateEvent, log);
        break;
    }
  }
}
