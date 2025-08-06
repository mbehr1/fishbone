import * as vscode from 'vscode';
import { EventBus, globalEventBus } from './EventBus';
import { EventType, KnowledgeType } from './types';
// ...existing code...


// Enriched KnowledgeEntry type
export interface KnowledgeEntry {
  id: string;
  type: KnowledgeType;
  label?: string;
  tags?: string[];
  data?: any;
  provenance?: string; // e.g., agent/source
  confidence?: number; // 0-1
  createdAt?: number;
  updatedAt?: number;
  version?: number;
}

// Enriched KnowledgeEdge type
interface KnowledgeEdge {
  from: string; // id
  to: string;   // id
  type: string;
  label?: string;
  tags?: string[];
  provenance?: string;
  confidence?: number;
  createdAt?: number;
  data?: any;
}

/**
 * KnowledgeGraph (Agentic/Event-Driven)
 *
 * Central, in-memory graph for all agent knowledge and relationships.
 * Stores entries (nodes) and edges (relationships) with rich metadata.
 *
 * Responsibilities:
 *   - Provide a shared, queryable context for all agents
 *   - Support advanced queries, traversals, and subgraph extraction
 *   - Track provenance, confidence, and versioning for all knowledge
 *   - Enable agentic workflows (reasoning, root cause, context, etc)
 *
 * All methods are synchronous and safe for concurrent agent use.
 */
export class KnowledgeGraph {
  /**
   * Validate that a set of entries is suitable for fishbone export.
   * Returns { valid: boolean, reason?: string }
   */
  static validateFishboneEntries(entries: KnowledgeEntry[]): { valid: boolean; reason?: string } {
    if (!Array.isArray(entries) || entries.length === 0) {
      return { valid: false, reason: 'No knowledge entries provided.' };
    }
    for (const e of entries) {
      if (!e.id || !e.type) {
        return { valid: false, reason: `Entry missing id or type: ${JSON.stringify(e)}` };
      }
    }
    return { valid: true };
  }

  /**
   * Trigger a FishboneUpdater event with validated knowledge entries.
   * Ensures the fishbone file will not be broken by malformed input.
   *
   * @param fishboneUri The URI of the fishbone file to create/edit
   * @param eventBus The EventBus to use (default: globalEventBus)
   * @param filter Optional predicate to filter entries
   * @param log Optional log channel for diagnostics
   * @returns { success: boolean, reason?: string }
   */
  triggerFishboneUpdate(
    fishboneUri: string,
    eventBus: EventBus = globalEventBus,
    filter?: (entry: KnowledgeEntry) => boolean,
    log?: vscode.LogOutputChannel
  ): { success: boolean; reason?: string } {
    const entries = filter ? this.query(filter) : Array.from(this.entries.values());
    const validation = KnowledgeGraph.validateFishboneEntries(entries);
    if (!validation.valid) {
      if (log) log.error(`[KnowledgeGraph] Fishbone update validation failed: ${validation.reason}`);
      return { success: false, reason: validation.reason };
    }
    if (log) log.info(`[KnowledgeGraph] Triggering FishboneUpdater for ${fishboneUri} with ${entries.length} entries.`);
    eventBus.publish({
      type: EventType.UPDATE_FISHBONE_FROM_KNOWLEDGE,
      payload: { fishboneUri, filter },
    }, log as vscode.LogOutputChannel);
    return { success: true };
  }
  private entries: Map<string, KnowledgeEntry> = new Map();
  private edges: KnowledgeEdge[] = [];


  /**
   * Add or update a knowledge entry (node).
   * Updates timestamps and merges by id.
   */
  set(entry: KnowledgeEntry) {
    entry.updatedAt = Date.now();
    if (!entry.createdAt) { entry.createdAt = Date.now(); }
    this.entries.set(entry.id, entry);
  }

  /**
   * Get a knowledge entry by id.
   * Returns undefined if not found.
   */
  get(id: string): KnowledgeEntry | undefined {
    return this.entries.get(id);
  }

  /**
   * Query all entries by KnowledgeType.
   */
  queryByType(type: KnowledgeType): KnowledgeEntry[] {
    return Array.from(this.entries.values()).filter(e => e.type === type);
  }

  /**
   * Add a relationship (edge) between entries.
   * Supports optional label, tags, provenance, confidence, createdAt, and data.
   */
  addEdge(params: {
    from: string;
    to: string;
    type: string;
    label?: string;
    tags?: string[];
    provenance?: string;
    confidence?: number;
    createdAt?: number;
    data?: any;
  }) {
    const edge: KnowledgeEdge = {
      from: params.from,
      to: params.to,
      type: params.type,
      label: params.label,
      tags: params.tags,
      provenance: params.provenance,
      confidence: params.confidence,
      createdAt: params.createdAt || Date.now(),
      data: params.data,
    };
    this.edges.push(edge);
  }

  /**
   * Query all edges by type.
   */
  queryEdgesByType(type: string): KnowledgeEdge[] {
    return this.edges.filter(e => e.type === type);
  }

  /**
   * Query all edges by label.
   */
  queryEdgesByLabel(label: string): KnowledgeEdge[] {
    return this.edges.filter(e => e.label === label);
  }

  /**
   * Query all edges by tag.
   */
  queryEdgesByTag(tag: string): KnowledgeEdge[] {
    return this.edges.filter(e => e.tags && e.tags.includes(tag));
  }

  /**
   * Get all direct neighbors (ids) of a given entry (outgoing edges).
   */
  getNeighbors(id: string): string[] {
    return this.edges.filter(e => e.from === id).map(e => e.to);
  }

  /**
   * Get all direct neighbors (ids) of a given entry (incoming edges).
   */
  getIncomingNeighbors(id: string): string[] {
    return this.edges.filter(e => e.to === id).map(e => e.from);
  }

  /**
   * Get all edges from a given entry (outgoing).
   */
  getEdgesFrom(id: string): KnowledgeEdge[] {
    return this.edges.filter(e => e.from === id);
  }

  /**
   * Get all edges to a given entry (incoming).
   */
  getEdgesTo(id: string): KnowledgeEdge[] {
    return this.edges.filter(e => e.to === id);
  }

  /**
   * Query all entries created within a time range (inclusive).
   */
  queryByTime(start: number, end: number): KnowledgeEntry[] {
    return Array.from(this.entries.values()).filter(e => e.createdAt && e.createdAt >= start && e.createdAt <= end);
  }

  /**
   * Query entries by arbitrary predicate (advanced agentic queries).
   */
  query(predicate: (entry: KnowledgeEntry) => boolean): KnowledgeEntry[] {
    return Array.from(this.entries.values()).filter(predicate);
  }

  /**
   * Query all entries by tag.
   */
  queryByTag(tag: string): KnowledgeEntry[] {
    return Array.from(this.entries.values()).filter(e => e.tags && e.tags.includes(tag));
  }

  /**
   * Query all entries by label.
   */
  queryByLabel(label: string): KnowledgeEntry[] {
    return Array.from(this.entries.values()).filter(e => e.label === label);
  }

  /**
   * Query all entries by provenance (agent/source).
   */
  queryByProvenance(provenance: string): KnowledgeEntry[] {
    return Array.from(this.entries.values()).filter(e => e.provenance === provenance);
  }

  /**
   * Query all entries by confidence threshold (min/max).
   */
  queryByConfidence(min: number, max: number = 1): KnowledgeEntry[] {
    return Array.from(this.entries.values()).filter(e => {
      const entry = e as KnowledgeEntry;
      return typeof entry.confidence === 'number' && entry.confidence >= min && entry.confidence <= max;
    });
  }

  /**
   * Find all entries related to a given entry by edge type (outgoing).
   */
  findRelatedByEdgeType(id: string, edgeType: string): KnowledgeEntry[] {
    const neighborIds = this.edges.filter(e => e.from === id && e.type === edgeType).map(e => e.to);
    return neighborIds
      .map(nid => this.entries.get(nid) as KnowledgeEntry | undefined)
      .filter((entry): entry is KnowledgeEntry => Boolean(entry));
  }

  /**
   * Traverse the graph from a start node, following edges of a given type, up to a max depth.
   * Returns all reachable entries (DFS, no cycles).
   */
  traverseFrom(id: string, edgeType?: string, maxDepth: number = 3): KnowledgeEntry[] {
    const visited = new Set<string>();
    const results: KnowledgeEntry[] = [];
    // Treat negative maxDepth as 0
    const safeMaxDepth = maxDepth < 0 ? 0 : maxDepth;
    const dfs = (currentId: string, depth: number, graph: KnowledgeGraph) => {
      if (depth > safeMaxDepth || visited.has(currentId)) { return; }
      visited.add(currentId);
      const entry = graph.entries.get(currentId);
      if (entry) { results.push(entry); }
      const neighbors = edgeType
        ? graph.edges.filter(e => e.from === currentId && e.type === edgeType).map(e => e.to)
        : graph.edges.filter(e => e.from === currentId).map(e => e.to);
      for (const n of neighbors) {
        dfs(n, depth + 1, graph);
      }
    };
    dfs(id, 0, this);
    return results;
  }

  /**
   * Get a subgraph containing all entries and edges reachable from a given entry (optionally by edge type).
   * Returns { entries, edges } for further agentic reasoning.
   */
  getSubgraphFrom(id: string, edgeType?: string, maxDepth: number = 3): { entries: KnowledgeEntry[]; edges: KnowledgeEdge[] } {
    const entrySet = new Set<string>();
    const edgeSet: Set<KnowledgeEdge> = new Set();
    const dfs = (currentId: string, depth: number, graph: KnowledgeGraph) => {
      if (depth > maxDepth || entrySet.has(currentId)) { return; }
      entrySet.add(currentId);
      const outgoing = edgeType
        ? graph.edges.filter(e => e.from === currentId && e.type === edgeType)
        : graph.edges.filter(e => e.from === currentId);
      for (const edge of outgoing) {
        edgeSet.add(edge);
        dfs(edge.to, depth + 1, graph);
      }
    };
    dfs(id, 0, this);
    return {
      entries: Array.from(entrySet).map(eid => this.entries.get(eid)).filter(Boolean) as KnowledgeEntry[],
      edges: Array.from(edgeSet),
    };
  }

  /**
   * Get all connected components (as arrays of entry ids).
   * Useful for finding isolated subgraphs or clusters.
   */
  getConnectedComponents(): string[][] {
    const visited = new Set<string>();
    const components: string[][] = [];
    for (const id of Array.from(this.entries.keys())) {
      if (!visited.has(id)) {
        const comp: string[] = [];
        const stack = [id];
        while (stack.length) {
          const curr = stack.pop()!;
          if (!visited.has(curr)) {
            visited.add(curr);
            comp.push(curr);
            const neighbors = this.edges.filter(e => e.from === curr).map(e => e.to);
            for (const n of neighbors) {
              if (!visited.has(n)) { stack.push(n); }
            }
          }
        }
        components.push(comp);
      }
    }
    return components;
  }
}
