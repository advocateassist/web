// CRITICAL: This database exists only in the client's browser.
// Do not sync this file or its data to the backend.

import Dexie, { type EntityTable } from "dexie";

export interface Case {
  id?: number;
  title: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Document {
  id?: number;
  caseId: number;
  name: string;
  type: string;
  size: number;
  content: string;
  createdAt: Date;
}

export interface Analytics {
  id?: number;
  action: string;
  timestamp: Date;
}

class AdvocateAssistLocalDB extends Dexie {
  cases!: EntityTable<Case, "id">;
  documents!: EntityTable<Document, "id">;
  analytics!: EntityTable<Analytics, "id">;

  constructor() {
    super("AdvocateAssistLocal");
    this.version(1).stores({
      cases: "++id, title, status, createdAt, updatedAt",
      documents: "++id, caseId, name, type, size, content, createdAt",
      analytics: "++id, action, timestamp",
    });
  }
}

export const db = new AdvocateAssistLocalDB();
