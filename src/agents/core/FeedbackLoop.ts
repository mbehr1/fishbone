
import { Event, EventType, AgentType } from './types';
import { globalEventBus } from './EventBus';
import * as vscode from 'vscode';

export interface FeedbackCriteria {
  minScore?: number;
  maxRetries?: number;
  customRule?: (result: any) => boolean;
}

/**
 * FeedbackLoop (Agentic/Event-Driven)
 *
 * Provides feedback and refinement logic for agent tasks.
 * Tracks retries, emits UPDATE and ERROR events, and enables robust agentic workflows.
 *
 * Responsibilities:
 *   - Refine agent tasks based on result and feedback criteria
 *   - Track and limit retries for each agent
 *   - Emit UPDATE events for further refinement
 *   - Emit ERROR events when max retries are exceeded
 */
export class FeedbackLoop {
  private retryCounts: Map<string, number> = new Map();

  /**
   * Refine agent task based on result and feedback criteria.
   * Optionally triggers new events for further refinement.
   * Emits ERROR if max retries are exceeded.
   */
  async refine(agentId: string, result: any, criteria: FeedbackCriteria, log: vscode.LogOutputChannel): Promise<void> {
    let shouldRefine = false;
    // Check if result score is below minimum
    if (criteria.minScore !== undefined && typeof result.score === 'number') {
      shouldRefine = result.score < criteria.minScore;
    }
    // Check custom rule if provided
    if (criteria.customRule && !shouldRefine) {
      shouldRefine = !criteria.customRule(result);
    }
    if (shouldRefine) {
      // Track retries for this agent
      const retries = (this.retryCounts.get(agentId) || 0) + 1;
      this.retryCounts.set(agentId, retries);
      // If max retries exceeded, emit ERROR event
      if (criteria.maxRetries !== undefined && retries > criteria.maxRetries) {
        log.warn(`FeedbackLoop: Max retries exceeded for agent ${agentId}`);
        await globalEventBus.publish({
          type: EventType.ERROR,
          payload: { error: `Max retries exceeded for agent ${agentId}` },
        }, log);
        return;
      }
      log.info(`FeedbackLoop: Refine triggered for agent ${agentId}, retries=${retries}`);
      // Emit UPDATE event for agent to adjust parameters
      await globalEventBus.publish({
        type: EventType.UPDATE,
        payload: { update: { action: 'refine', retries, lastResult: result } },
      }, log);
    }
  }
}
