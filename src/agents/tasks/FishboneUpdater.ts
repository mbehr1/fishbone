import { EventBus } from '../core/EventBus';
import { KnowledgeGraph, KnowledgeEntry } from '../core/KnowledgeGraph';
import { Fishbone, FBEffect, FBCategory, FBRootCause, fbaToString } from '../../extension/fbaFormat';
import { EventType } from '../core/types';
import * as vscode from 'vscode';

/**
 * FishboneUpdater agent: Listens for UPDATE_FISHBONE_FROM_KNOWLEDGE events and updates the Fishbone object/file
 * with new insights from the KnowledgeGraph.
 */
export class FishboneUpdater {
  constructor(
    private eventBus: EventBus,
    private knowledgeGraph: KnowledgeGraph,
    private log: vscode.LogOutputChannel
  ) {
    this.eventBus.subscribe(EventType.UPDATE_FISHBONE_FROM_KNOWLEDGE, this.handleUpdate.bind(this));
  }

  /**
   * Handler for UPDATE_FISHBONE_FROM_KNOWLEDGE event.
   * @param event Event with payload: { fishboneUri: string, filter?: any }
   */
  async handleUpdate(event: any) {
    try {
      this.log.info('[FishboneUpdater] handleUpdate called', event);
      const { fishboneUri, filter } = event.payload;
      // 1. Query KnowledgeGraph for relevant entries (optionally filter)
      const entries = filter
        ? this.knowledgeGraph.query((e: KnowledgeEntry) => filter(e))
        : Array.from(this.knowledgeGraph['entries'].values());
      // 2. Transform entries into Fishbone structure (simple mapping: each entry -> root cause)
      const rootCauses: FBRootCause[] = entries.map(e => ({
        fbUid: e.id,
        type: 'knowledge',
        title: e.label || e.id,
        props: {
          label: e.label || e.id,
          value: e.data,
          instructions: e.provenance ? `Source: ${e.provenance}` : undefined,
        },
      }));
      // 3. Compose Fishbone object (single effect/category for demo)
      const fishbone: Fishbone = {
        type: 'fba',
        version: '0.7',
        title: 'KnowledgeGraph Insights',
        attributes: [],
        fishbone: [
          {
            fbUid: 'effect-knowledge',
            name: 'KnowledgeGraph Insights',
            categories: [
              {
                fbUid: 'cat-knowledge',
                name: 'Knowledge',
                rootCauses,
              },
            ],
          },
        ],
        backups: [],
      };
      // 4. Serialize and save to file
      const yaml = fbaToString(fishbone);
      const uri = vscode.Uri.parse(fishboneUri);
      await vscode.workspace.fs.writeFile(uri, Buffer.from(yaml, 'utf8'));
      this.log.info(`[FishboneUpdater] Fishbone updated at ${fishboneUri}`);
      // 5. Optionally emit an event for completion
      this.eventBus.publish({ type: EventType.FISHBONE_UPDATED, payload: { fishboneUri } }, this.log);
    } catch (e) {
      this.log.error(`[FishboneUpdater] handleUpdate error: ${e}`);
      this.eventBus.publish({ type: EventType.ERROR, payload: { error: e, source: 'FishboneUpdater' } }, this.log);
    }
  }
}
