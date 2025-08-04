// types.ts

// Placeholder types for chat agent API (replace with real types as needed)
export interface ChatRequest {
  command?: string;
  prompt?: string;
  [key: string]: any;
}

export interface ChatContext {
  history?: any[];
  [key: string]: any;
}

export interface ChatResponseStream {
  write(data: string): void;
  end(): void;
}

export interface ChatResponse {
  response?: string;
  [key: string]: any;
}

/**
 * Agent interface for agentic/event-driven architecture.
 */
export interface Agent {
  id: string;
  type: AgentType;
  execute(
    request: ChatRequest,
    chatContext: ChatContext,
    stream: ChatResponseStream,
    token: any // Use 'any' for CancellationToken for now
  ): Promise<any>;
  handleEvent(event: Event): void;
}


/**
 * Types of agents in the system.
 */
export enum AgentType {
  QUERY = 'query',
  CONTEXT = 'context',
  TOOL = 'tool',
  SEQUENCE = 'sequence',
  FILTER = 'filter',
  SUMMARY = 'summary',
  UPDATER = 'updater',
  UPDATE_FISHBONE_FROM_KNOWLEDGE = 'update_fishbone_from_knowledge',
  FISHBONE_UPDATED = 'fishbone_updated',
  // Extend as needed
}

/**
 * Types of events in the system.
 */
export enum EventType {
  QUERY_RECEIVED = 'query_received',
  QUERY_PROCESSED = 'query_processed',
  CONTEXT_UPDATED = 'context_updated',
  TOOL_INVOKED = 'tool_invoked',
  TOOL_RESULT = 'tool_result',
  ERROR = 'error',
  SEQUENCE = 'sequence',
  FILTER = 'filter',
  QUERY = 'query',
  SUMMARY = 'summary',
  UPDATE = 'update',
  QUERY_RESULT = 'query_result',
  UPDATE_FISHBONE_FROM_KNOWLEDGE = 'update_fishbone_from_knowledge',
  FISHBONE_UPDATED = 'fishbone_updated',
  // Extend as needed
}

/**
 * Strongly-typed event payloads for each event type.
 */
export type EventPayloadMap = {
  [EventType.QUERY_RECEIVED]: { query: string };
  [EventType.QUERY_PROCESSED]: { result: any };
  [EventType.CONTEXT_UPDATED]: { context: any };
  [EventType.TOOL_INVOKED]: { tool: string; args: any };
  [EventType.TOOL_RESULT]: { tool: string; result: any };
  [EventType.ERROR]: { error: Error | string | any; source?: string };
  [EventType.SEQUENCE]: { sequence: any[] };
  [EventType.FILTER]: { filter: string; data: any };
  [EventType.QUERY]: { query: string };
  [EventType.SUMMARY]: { summary: string };
  [EventType.UPDATE]: { update: any };
  [EventType.QUERY_RESULT]: { result?: any; error?: any };
  [EventType.UPDATE_FISHBONE_FROM_KNOWLEDGE]: { fishboneUri: string; filter?: any };
  [EventType.FISHBONE_UPDATED]: { fishboneUri: string };
  // Extend as needed
};

/**
 * Generic Event interface for agentic/event-driven architecture.
 */
export interface Event<T extends EventType = EventType> {
  type: T;
  payload: EventPayloadMap[T];
}

/**
 * Types of knowledge entries for the knowledge graph.
 */
export enum KnowledgeType {
  CONTEXT = 'context',
  FACT = 'fact',
  RELATION = 'relation',
  HISTORY = 'history',
  // Extend as needed
}

/**
 * Knowledge entry for the knowledge graph.
 */
export interface KnowledgeEntry {
  id: string;
  type: KnowledgeType;
  data: any;
  createdAt: number;
  updatedAt?: number;
}

