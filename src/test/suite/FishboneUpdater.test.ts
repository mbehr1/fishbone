import * as assert from 'assert';
import * as vscode from 'vscode';
import { FishboneUpdater } from '../../agents/tasks/FishboneUpdater';
import { EventBus } from '../../agents/core/EventBus';
import { KnowledgeGraph, KnowledgeEntry } from '../../agents/core/KnowledgeGraph';
import { EventType, KnowledgeType } from '../../agents/core/types';
import { promises as fs } from 'fs';
import * as path from 'path';

suite('FishboneUpdater', () => {
  let eventBus: EventBus;
  let kg: KnowledgeGraph;
  let log: vscode.LogOutputChannel;
  let events: any[];
  let tmpFile: string;

  setup(async () => {
    eventBus = new EventBus();
    kg = new KnowledgeGraph();
    events = [];
    log = {
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
    eventBus.subscribe(EventType.FISHBONE_UPDATED, (e) => { events.push(e); });
    eventBus.subscribe(EventType.ERROR, (e) => { events.push(e); });
    // Create a temp file URI for fishbone output
    tmpFile = path.join(__dirname, `fishbone_test_${Date.now()}.fba`);
    // Clean up if exists
    try { await fs.unlink(tmpFile); } catch {}
  });

  teardown(async () => {
    try { await fs.unlink(tmpFile); } catch {}
  });

  test('should update fishbone file with all knowledge entries', async () => {
    /**
     * 1. Precondition: KnowledgeGraph has two entries.
     * 2. Test steps: Trigger update, read file, check contents.
     * 3. Expected: File contains both entries as rootCauses.
     * 4. Postcondition: FISHBONE_UPDATED event emitted.
     */
    kg.set({ id: 'a', type: KnowledgeType.FACT, label: 'A', data: 1, createdAt: Date.now() });
    kg.set({ id: 'b', type: KnowledgeType.FACT, label: 'B', data: 2, createdAt: Date.now() });
    new FishboneUpdater(eventBus, kg, log);
    await eventBus.publish({ type: EventType.UPDATE_FISHBONE_FROM_KNOWLEDGE, payload: { fishboneUri: vscode.Uri.file(tmpFile).toString() } }, log);
    const content = (await fs.readFile(tmpFile)).toString();
    assert.ok(content.includes('A'));
    assert.ok(content.includes('B'));
    assert.ok(events.some(e => e.type === EventType.FISHBONE_UPDATED));
  });

  test('should apply filter to only include matching entries', async () => {
    /**
     * 1. Precondition: KnowledgeGraph has two entries.
     * 2. Test steps: Trigger update with filter for label === 'A'.
     * 3. Expected: File contains only entry A.
     * 4. Postcondition: FISHBONE_UPDATED event emitted.
     */
    kg.set({ id: 'a', type: KnowledgeType.FACT, label: 'A', data: 1, createdAt: Date.now() });
    kg.set({ id: 'b', type: KnowledgeType.FACT, label: 'B', data: 2, createdAt: Date.now() });
    new FishboneUpdater(eventBus, kg, log);
    const filter = (e: KnowledgeEntry) => e.label === 'A';
    await eventBus.publish({ type: EventType.UPDATE_FISHBONE_FROM_KNOWLEDGE, payload: { fishboneUri: vscode.Uri.file(tmpFile).toString(), filter } }, log);
    const content = (await fs.readFile(tmpFile)).toString();
    assert.ok(content.includes('A'));
    assert.ok(!content.includes('B'));
    assert.ok(events.some(e => e.type === EventType.FISHBONE_UPDATED));
  });

  test('should handle empty knowledge graph', async () => {
    /**
     * 1. Precondition: KnowledgeGraph is empty.
     * 2. Test steps: Trigger update.
     * 3. Expected: File contains no rootCauses.
     * 4. Postcondition: FISHBONE_UPDATED event emitted.
     */
    new FishboneUpdater(eventBus, kg, log);
    await eventBus.publish({ type: EventType.UPDATE_FISHBONE_FROM_KNOWLEDGE, payload: { fishboneUri: vscode.Uri.file(tmpFile).toString() } }, log);
    const content = (await fs.readFile(tmpFile)).toString();
    assert.ok(content.includes('rootCauses: []'));
    assert.ok(events.some(e => e.type === EventType.FISHBONE_UPDATED));
  });

  test('should handle entries with missing optional fields', async () => {
    /**
     * 1. Precondition: KnowledgeGraph has entry with only required fields.
     * 2. Test steps: Trigger update.
     * 3. Expected: File contains entry id as label/title.
     * 4. Postcondition: FISHBONE_UPDATED event emitted.
     */
    kg.set({ id: 'x', type: KnowledgeType.FACT, createdAt: Date.now() });
    new FishboneUpdater(eventBus, kg, log);
    await eventBus.publish({ type: EventType.UPDATE_FISHBONE_FROM_KNOWLEDGE, payload: { fishboneUri: vscode.Uri.file(tmpFile).toString() } }, log);
    const content = (await fs.readFile(tmpFile)).toString();
    assert.ok(content.includes('x'));
    assert.ok(events.some(e => e.type === EventType.FISHBONE_UPDATED));
  });

  test('should emit ERROR event for invalid/empty fishboneUri', async () => {
    /**
     * 1. Precondition: KnowledgeGraph has one entry.
     * 2. Test steps: Trigger update with invalid fishboneUri.
     * 3. Expected: ERROR event emitted, no file written.
     * 4. Postcondition: No FISHBONE_UPDATED event.
     */
    kg.set({ id: 'a', type: KnowledgeType.FACT, label: 'A', data: 1, createdAt: Date.now() });
    new FishboneUpdater(eventBus, kg, log);
    await eventBus.publish({ type: EventType.UPDATE_FISHBONE_FROM_KNOWLEDGE, payload: { fishboneUri: '' } }, log);
    assert.ok(events.some(e => e.type === EventType.ERROR));
    assert.ok(!events.some(e => e.type === EventType.FISHBONE_UPDATED));
  });

  test('should emit ERROR event on file write error', async () => {
    /**
     * 1. Precondition: KnowledgeGraph has one entry.
     * 2. Test steps: Trigger update with fishboneUri to invalid path.
     * 3. Expected: ERROR event emitted.
     * 4. Postcondition: No FISHBONE_UPDATED event.
     */
    kg.set({ id: 'a', type: KnowledgeType.FACT, label: 'A', data: 1, createdAt: Date.now() });
    new FishboneUpdater(eventBus, kg, log);
    // Use an invalid path (should fail on most systems)
    await eventBus.publish({ type: EventType.UPDATE_FISHBONE_FROM_KNOWLEDGE, payload: { fishboneUri: 'file:///invalid_path/does_not_exist.fba' } }, log);
    assert.ok(events.some(e => e.type === EventType.ERROR));
    assert.ok(!events.some(e => e.type === EventType.FISHBONE_UPDATED));
  });

  test('should emit FISHBONE_UPDATED event on success', async () => {
    /**
     * 1. Precondition: KnowledgeGraph has one entry.
     * 2. Test steps: Trigger update.
     * 3. Expected: FISHBONE_UPDATED event emitted.
     * 4. Postcondition: File written.
     */
    kg.set({ id: 'a', type: KnowledgeType.FACT, label: 'A', data: 1, createdAt: Date.now() });
    new FishboneUpdater(eventBus, kg, log);
    await eventBus.publish({ type: EventType.UPDATE_FISHBONE_FROM_KNOWLEDGE, payload: { fishboneUri: vscode.Uri.file(tmpFile).toString() } }, log);
    assert.ok(events.some(e => e.type === EventType.FISHBONE_UPDATED));
    const content = (await fs.readFile(tmpFile)).toString();
    assert.ok(content.includes('A'));
  });
});
