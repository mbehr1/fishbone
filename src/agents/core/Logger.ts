
import { EventType } from './types';
import { globalEventBus, EventBus } from './EventBus';

export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

import * as vscode from 'vscode';
/**
 * Logger (Agentic/Event-Driven)
 *
 * Centralized logging utility for all agents and workflows.
 * Supports log levels, event emission, and robust error handling.
 *
 * Responsibilities:
 *   - Log messages at various levels (debug, info, warn, error)
 *   - Emit log events to the EventBus for observability
 *   - Handle log channel failures gracefully
 *
 * All log actions are routed through the provided log channel.
 */
export class Logger {
  private eventBus: EventBus;
  constructor(eventBus?: EventBus) {
    this.eventBus = eventBus || globalEventBus;
  }

  /**
   * Log a message at the specified level, with optional metadata.
   * Emits log events to the EventBus for observability.
   * Handles log channel failures gracefully.
   */
  log(msg: string, level: LogLevel = LogLevel.INFO, log: vscode.LogOutputChannel, meta?: any) {
    const prefix = `[FAI][${level.toUpperCase()}]`;
    try {
      switch (level) {
        case LogLevel.ERROR: {
          log.error(prefix, msg, meta || '');
          break;
        }
        case LogLevel.WARN: {
          log.warn(prefix, msg, meta || '');
          break;
        }
        case LogLevel.DEBUG: {
          log.debug(prefix, msg, meta || '');
          break;
        }
        default: {
          log.info(prefix, msg, meta || '');
        }
      }
    } catch (err) {
      // If log channel fails, try to log the error using the same channel (if possible)
      if (log && typeof log.error === 'function') {
        try {
          log.error('[FAI][ERROR] Logger failed to write to log channel', err && err.toString(), { originalMsg: msg });
        } catch {}
      }
      // Use a safe no-op log channel for the fallback event emission
      const safeLog = {
        name: 'safe',
        logLevel: 0,
        onDidChangeLogLevel: () => ({ dispose: () => {} }),
        info: () => {},
        debug: () => {},
        error: () => {},
        warn: () => {},
        trace: () => {},
        append: () => {},
        appendLine: () => {},
        replace: () => {},
        clear: () => {},
        show: () => {},
        hide: () => {},
        dispose: () => {},
      } as vscode.LogOutputChannel;
      this.eventBus.publish({
        type: EventType.UPDATE,
        payload: { update: { log: `Logger failed to write to log channel: ${err}`, level: LogLevel.ERROR, meta: { originalMsg: msg, error: err && err.toString() } } },
      }, safeLog);
    }
    // Emit log event for monitoring/traceability
    this.eventBus.publish({
      type: EventType.UPDATE,
      payload: { update: { log: msg, level, meta } },
    }, log);
  }
}
