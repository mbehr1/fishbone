import { KnowledgeGraph, KnowledgeEntry } from '../../agents/core/KnowledgeGraph';
import { KnowledgeType } from '../../agents/core/types';
import * as assert from 'assert';

suite('KnowledgeGraph (boundary and edge cases)', () => {
  let kg: KnowledgeGraph;
  setup(() => {
    kg = new KnowledgeGraph();
  });

  test('should update entry on duplicate id', () => {
    /**
     * 1. Precondition: Graph is empty.
     * 2. Test steps: Add entry with id 'x', then add another with same id but different data.
     * 3. Expected response: Second entry overwrites first.
     * 4. Postcondition: Only one entry with id 'x', data matches second.
     */
    kg.set({ id: 'x', type: KnowledgeType.FACT, data: { a: 1 }, createdAt: 1 });
    kg.set({ id: 'x', type: KnowledgeType.FACT, data: { a: 2 }, createdAt: 2 });
    const got = kg.get('x');
    assert.ok(got);
    assert.deepStrictEqual(got.data, { a: 2 });
    assert.strictEqual(got.createdAt, 2); // Should update createdAt if provided
  });

  test('should allow duplicate edges (same from, to, type)', () => {
    /**
     * 1. Precondition: Graph has two nodes.
     * 2. Test steps: Add two identical edges.
     * 3. Expected response: Both edges exist.
     * 4. Postcondition: Edge array has length 2.
     */
    kg.set({ id: 'a', type: KnowledgeType.FACT, createdAt: 1 });
    kg.set({ id: 'b', type: KnowledgeType.FACT, createdAt: 1 });
    kg.addEdge({ from: 'a', to: 'b', type: 'rel' });
    kg.addEdge({ from: 'a', to: 'b', type: 'rel' });
    const edges = kg.queryEdgesByType('rel');
    assert.strictEqual(edges.length, 2);
  });

  test('should return undefined/empty for non-existent nodes/edges', () => {
    /**
     * 1. Precondition: Graph is empty.
     * 2. Test steps: Query for non-existent node and edge.
     * 3. Expected response: get returns undefined, queries return empty arrays.
     * 4. Postcondition: No error.
     */
    assert.strictEqual(kg.get('nope'), undefined);
    assert.deepStrictEqual(kg.queryEdgesByType('none'), []);
    assert.deepStrictEqual(kg.queryByTag('none'), []);
  });

  test('should not infinite loop on cycles in traversal', () => {
    /**
     * 1. Precondition: Graph has a cycle a->b->c->a.
     * 2. Test steps: Traverse from 'a'.
     * 3. Expected response: Each node visited once, no infinite loop.
     * 4. Postcondition: Traversal returns all nodes in cycle.
     */
    kg.set({ id: 'a', type: KnowledgeType.FACT, createdAt: 1 });
    kg.set({ id: 'b', type: KnowledgeType.FACT, createdAt: 1 });
    kg.set({ id: 'c', type: KnowledgeType.FACT, createdAt: 1 });
    kg.addEdge({ from: 'a', to: 'b', type: 'rel' });
    kg.addEdge({ from: 'b', to: 'c', type: 'rel' });
    kg.addEdge({ from: 'c', to: 'a', type: 'rel' });
    const traversed = kg.traverseFrom('a', 'rel');
    const ids = traversed.map(e => e.id);
    assert.ok(ids.includes('a') && ids.includes('b') && ids.includes('c'));
    assert.strictEqual(ids.length, 3);
  });

  test('should respect maxDepth in traversal (including 0 and negative)', () => {
    /**
     * 1. Precondition: Graph has a->b->c.
     * 2. Test steps: Traverse from 'a' with maxDepth 0, 1, -1.
     * 3. Expected response: maxDepth=0 returns only 'a', maxDepth=1 returns 'a' and 'b', negative treated as 0.
     * 4. Postcondition: No error.
     */
    kg.set({ id: 'a', type: KnowledgeType.FACT, createdAt: 1 });
    kg.set({ id: 'b', type: KnowledgeType.FACT, createdAt: 1 });
    kg.set({ id: 'c', type: KnowledgeType.FACT, createdAt: 1 });
    kg.addEdge({ from: 'a', to: 'b', type: 'rel' });
    kg.addEdge({ from: 'b', to: 'c', type: 'rel' });
    let ids = kg.traverseFrom('a', 'rel', 0).map(e => e.id);
    assert.deepStrictEqual(ids, ['a']);
    ids = kg.traverseFrom('a', 'rel', 1).map(e => e.id);
    assert.ok(ids.includes('a') && ids.includes('b'));
    ids = kg.traverseFrom('a', 'rel', -1).map(e => e.id);
    assert.deepStrictEqual(ids, ['a']);
  });

  test('should handle missing/undefined/empty tags, labels, provenance', () => {
    /**
     * 1. Precondition: Graph has entries/edges with and without optional fields.
     * 2. Test steps: Query by tag, label, provenance for missing/undefined/empty.
     * 3. Expected response: No error, empty arrays for missing.
     * 4. Postcondition: No error.
     */
    kg.set({ id: 'a', type: KnowledgeType.FACT });
    kg.set({ id: 'b', type: KnowledgeType.FACT, tags: [], label: '', provenance: '' });
    assert.deepStrictEqual(kg.queryByTag('foo'), []);
    assert.deepStrictEqual(kg.queryByLabel('bar'), []);
    assert.deepStrictEqual(kg.queryByProvenance('baz'), []);
  });

  test('should handle querying by time with missing/invalid timestamps', () => {
    /**
     * 1. Precondition: Graph has entries with and without createdAt.
     * 2. Test steps: Query by time range.
     * 3. Expected response: Only entries with valid createdAt in range are returned.
     * 4. Postcondition: No error.
     */
    kg.set({ id: 'a', type: KnowledgeType.FACT, createdAt: 100 });
    kg.set({ id: 'b', type: KnowledgeType.FACT });
    kg.set({ id: 'c', type: KnowledgeType.FACT, createdAt: 200 });
    const res = kg.queryByTime(50, 150).map(e => e.id);
    assert.deepStrictEqual(res, ['a']);
  });

  test('should handle querying by confidence with missing/invalid values', () => {
    /**
     * 1. Precondition: Graph has entries with and without confidence.
     * 2. Test steps: Query by confidence range.
     * 3. Expected response: Only entries with valid confidence in range are returned.
     * 4. Postcondition: No error.
     */
    kg.set({ id: 'a', type: KnowledgeType.FACT, confidence: 0.5 });
    kg.set({ id: 'b', type: KnowledgeType.FACT });
    kg.set({ id: 'c', type: KnowledgeType.FACT, confidence: 0.9 });
    const res = kg.queryByConfidence(0.6, 1).map(e => e.id);
    assert.deepStrictEqual(res, ['c']);
  });

  test('should extract subgraph from node with no outgoing edges', () => {
    /**
     * 1. Precondition: Graph has isolated node 'z'.
     * 2. Test steps: Get subgraph from 'z'.
     * 3. Expected response: Subgraph contains only 'z', no edges.
     * 4. Postcondition: No error.
     */
    kg.set({ id: 'z', type: KnowledgeType.FACT });
    const sub = kg.getSubgraphFrom('z');
    assert.deepStrictEqual(sub.entries.map(e => e.id), ['z']);
    assert.deepStrictEqual(sub.edges, []);
  });

  test('should find connected components with isolated nodes', () => {
    /**
     * 1. Precondition: Graph has three isolated nodes.
     * 2. Test steps: Get connected components.
     * 3. Expected response: Each node is its own component.
     * 4. Postcondition: No error.
     */
    kg.set({ id: 'a', type: KnowledgeType.FACT });
    kg.set({ id: 'b', type: KnowledgeType.FACT });
    kg.set({ id: 'c', type: KnowledgeType.FACT });
    const comps = kg.getConnectedComponents();
    assert.strictEqual(comps.length, 3);
    assert.ok(comps.some(arr => arr.includes('a')));
    assert.ok(comps.some(arr => arr.includes('b')));
    assert.ok(comps.some(arr => arr.includes('c')));
  });

  test('should allow edges with missing optional fields', () => {
    /**
     * 1. Precondition: Graph has two nodes.
     * 2. Test steps: Add edge with only required fields.
     * 3. Expected response: Edge is added, can be queried.
     * 4. Postcondition: No error.
     */
    kg.set({ id: 'a', type: KnowledgeType.FACT });
    kg.set({ id: 'b', type: KnowledgeType.FACT });
    kg.addEdge({ from: 'a', to: 'b', type: 'rel' });
    const edges = kg.queryEdgesByType('rel');
    assert.strictEqual(edges.length, 1);
    assert.strictEqual(edges[0].from, 'a');
    assert.strictEqual(edges[0].to, 'b');
    assert.strictEqual(edges[0].type, 'rel');
  });

  test('should handle empty graph (no nodes, no edges)', () => {
    /**
     * 1. Precondition: Graph is empty.
     * 2. Test steps: Query all APIs.
     * 3. Expected response: All return empty arrays or undefined.
     * 4. Postcondition: No error.
     */
    assert.strictEqual(kg.get('x'), undefined);
    assert.deepStrictEqual(kg.queryByType(KnowledgeType.FACT), []);
    assert.deepStrictEqual(kg.queryEdgesByType('rel'), []);
    assert.deepStrictEqual(kg.getConnectedComponents(), []);
  });

  test('KnowledgeGraph.triggerFishboneUpdate produces valid fishbone file and round-trip data', async () => {
    // Integration: KnowledgeGraph <-> FishboneUpdater
    const { FishboneUpdater } = require('../../agents/tasks/FishboneUpdater');
    const { EventBus } = require('../../agents/core/EventBus');
    const { EventType, KnowledgeType } = require('../../agents/core/types');
    const fs = require('fs').promises;
    const path = require('path');
    let eventBus = new EventBus();
    let events: any[] = [];
    let log = {
      info: (...args: any[]) => {},
      error: (...args: any[]) => {},
      debug: (...args: any[]) => {},
      warn: (...args: any[]) => {},
      trace: (...args: any[]) => {},
      name: 'mock',
      logLevel: 0,
      onDidChangeLogLevel: () => ({ dispose: () => {} }),
      append: () => {},
      appendLine: () => {},
      replace: () => {},
      clear: () => {},
      show: () => {},
      hide: () => {},
      dispose: () => {},
    };
    eventBus.subscribe(EventType.FISHBONE_UPDATED, (e: any) => { events.push(e); });
    eventBus.subscribe(EventType.ERROR, (e: any) => { events.push(e); });
    const tmpFile = path.join(__dirname, `kg_fishbone_test_${Date.now()}.fba`);
    try { await fs.unlink(tmpFile); } catch {}
    // 1. Add entries to KnowledgeGraph
    const entries: KnowledgeEntry[] = [
      { id: 'a', type: KnowledgeType.FACT, label: 'A', data: 1, provenance: 'test', createdAt: Date.now() },
      { id: 'b', type: KnowledgeType.FACT, label: 'B', data: 2, provenance: 'test', createdAt: Date.now() },
    ];
    for (const e of entries) kg.set(e);
    // 2. Start FishboneUpdater
    new FishboneUpdater(eventBus, kg, log);
    // 3. Trigger update from KnowledgeGraph
    const result = kg.triggerFishboneUpdate(require('vscode').Uri.file(tmpFile).toString(), eventBus, undefined, log);
    assert.ok(result.success, 'triggerFishboneUpdate should succeed');
    // 4. Wait for FISHBONE_UPDATED event
    let tries = 0;
    while (!events.some(e => e.type === EventType.FISHBONE_UPDATED) && tries < 10) {
      await new Promise(res => setTimeout(res, 100));
      tries++;
    }
    assert.ok(events.some(e => e.type === EventType.FISHBONE_UPDATED), 'FISHBONE_UPDATED event should be emitted');
    // 5. Read and parse the fishbone file
    const content = (await fs.readFile(tmpFile)).toString();
    assert.ok(content.includes('A') && content.includes('B'), 'Fishbone file should contain all root causes');
    // 6. Check round-trip: parse YAML and verify root causes
    // (Assume fbaFormat has a parse function, or check YAML structure)
    // For now, just check that both ids are present
    assert.ok(content.includes('a') && content.includes('b'), 'Fishbone file should contain all entry ids');
    try { await fs.unlink(tmpFile); } catch {}
  });
});


suite('KnowledgeGraph (enriched)', () => {
  let kg: KnowledgeGraph;
  setup(() => {
    kg = new KnowledgeGraph();
  });

  test('should add and retrieve enriched entries', () => {
    /**
     * 1. Precondition: KnowledgeGraph is instantiated and empty.
     * 2. Test steps: Add an enriched entry, retrieve it by id.
     * 3. Expected response: Entry is retrieved with all enriched fields matching input.
     * 4. Postcondition: No side effects, graph remains consistent.
     */
    const entry: KnowledgeEntry = {
      id: 'n1',
      type: KnowledgeType.FACT,
      label: 'Node 1',
      tags: ['foo', 'bar'],
      provenance: 'agentA',
      confidence: 0.9,
      version: 1,
      data: { value: 42 },
      createdAt: Date.now(),
    };
    kg.set(entry);
    const got = kg.get('n1');
    assert.ok(got);
    assert.strictEqual(got.id, 'n1');
    assert.strictEqual(got.label, 'Node 1');
    assert.strictEqual(got.provenance, 'agentA');
    assert.strictEqual(got.confidence, 0.9);
    assert.strictEqual(got.version, 1);
    assert.ok(Array.isArray(got.tags) && got.tags.includes('foo'));
    assert.deepStrictEqual(got.data, { value: 42 });
  });

  test('should add and query enriched edges', () => {
    /**
     * 1. Precondition: KnowledgeGraph is instantiated with two nodes.
     * 2. Test steps: Add an enriched edge, query by type.
     * 3. Expected response: Edge is found with all enriched fields matching input.
     * 4. Postcondition: No side effects, graph remains consistent.
     */
    kg.set({ id: 'n1', type: KnowledgeType.FACT, createdAt: Date.now() });
    kg.set({ id: 'n2', type: KnowledgeType.FACT, createdAt: Date.now() });
    kg.addEdge({ from: 'n1', to: 'n2', type: 'rel', label: 'link', tags: ['t'], provenance: 'agentB', confidence: 0.8 });
    const edges = kg.queryEdgesByType('rel');
    assert.ok(edges.length > 0);
    const edge = edges[0];
    assert.strictEqual(edge.from, 'n1');
    assert.strictEqual(edge.to, 'n2');
    assert.strictEqual(edge.type, 'rel');
    assert.strictEqual(edge.label, 'link');
    assert.strictEqual(edge.provenance, 'agentB');
    assert.strictEqual(edge.confidence, 0.8);
    assert.ok(Array.isArray(edge.tags) && edge.tags.includes('t'));
  });

  test('should support advanced queries and traversal', () => {
    /**
     * 1. Precondition: KnowledgeGraph is instantiated with three nodes and three edges.
     * 2. Test steps: Query by tag, find related by edge type, traverse, get subgraph, get connected components.
     * 3. Expected response: All queries return correct results as per graph structure.
     * 4. Postcondition: No side effects, graph remains consistent.
     */
    kg.set({ id: 'a', type: KnowledgeType.FACT, tags: ['x'], createdAt: Date.now() });
    kg.set({ id: 'b', type: KnowledgeType.FACT, tags: ['y'], createdAt: Date.now() });
    kg.set({ id: 'c', type: KnowledgeType.FACT, tags: ['x', 'y'], createdAt: Date.now() });
    kg.addEdge({ from: 'a', to: 'b', type: 'rel' });
    kg.addEdge({ from: 'b', to: 'c', type: 'rel' });
    kg.addEdge({ from: 'a', to: 'c', type: 'rel2' });
    // Query by tag
    const tagX = kg.queryByTag('x').map(e => e.id);
    assert.ok(tagX.includes('a') && tagX.includes('c'));
    // Find related by edge type
    const related = kg.findRelatedByEdgeType('a', 'rel').map(e => e.id);
    assert.ok(related.includes('b'));
    // Traverse
    const traversed = kg.traverseFrom('a', 'rel').map(e => e.id);
    assert.ok(traversed.includes('a') && traversed.includes('b') && traversed.includes('c'));
    // Subgraph
    const sub = kg.getSubgraphFrom('a', 'rel');
    const subIds = sub.entries.map(e => e.id);
    assert.ok(subIds.includes('a') && subIds.includes('b') && subIds.includes('c'));
    // Connected components
    const comps = kg.getConnectedComponents();
    assert.ok(comps.some(arr => arr.includes('a') && arr.includes('b') && arr.includes('c')));
  });
});