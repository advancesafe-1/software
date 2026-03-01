import * as admin from 'firebase-admin';
import type { Firestore } from 'firebase-admin/firestore';

interface InitCredentials {
  projectId: string;
  serviceAccountJson?: string;
}

export class FirebaseClient {
  private app: admin.app.App | null = null;
  private db: Firestore | null = null;
  private initialized = false;

  async initialize(credentials: InitCredentials): Promise<boolean> {
    try {
      if (this.app) {
        await this.app.delete();
        this.app = null;
        this.db = null;
      }
      const appOptions: admin.AppOptions = { projectId: credentials.projectId };
      if (credentials.serviceAccountJson && credentials.serviceAccountJson.trim()) {
        const serviceAccount = JSON.parse(credentials.serviceAccountJson) as admin.ServiceAccount;
        appOptions.credential = admin.credential.cert(serviceAccount);
      } else {
        try {
          appOptions.credential = admin.credential.applicationDefault();
        } catch {
          this.initialized = false;
          return false;
        }
      }
      this.app = admin.initializeApp(appOptions, 'advancesafe-sync');
      this.db = admin.firestore(this.app);
      await this.db.collection('_test').doc('_test').get();
      this.initialized = true;
      return true;
    } catch {
      this.initialized = false;
      return false;
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async setDocument(path: string, data: Record<string, unknown>, merge = true): Promise<boolean> {
    try {
      if (!this.db) return false;
      const docRef = this.db.doc(path);
      const payload = {
        ...data,
        _lastSynced: admin.firestore.FieldValue.serverTimestamp(),
      };
      await docRef.set(payload, { merge });
      return true;
    } catch {
      return false;
    }
  }

  async batchWrite(
    operations: Array<{ path: string; data: Record<string, unknown>; merge?: boolean }>
  ): Promise<boolean> {
    try {
      if (!this.db) return false;
      const LIMIT = 500;
      for (let i = 0; i < operations.length; i += LIMIT) {
        const chunk = operations.slice(i, i + LIMIT);
        const batch = this.db.batch();
        for (const op of chunk) {
          const ref = this.db.doc(op.path);
          const payload = {
            ...op.data,
            _lastSynced: admin.firestore.FieldValue.serverTimestamp(),
          };
          batch.set(ref, payload, { merge: op.merge ?? true });
        }
        await batch.commit();
      }
      return true;
    } catch {
      return false;
    }
  }

  async deleteDocument(path: string): Promise<boolean> {
    return this.setDocument(path, {
      _deleted: true,
      _deletedAt: new Date().toISOString(),
    });
  }

  async checkConnectivity(): Promise<boolean> {
    try {
      if (!this.db) return false;
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('timeout')), 3000)
      );
      await Promise.race([this.db.collection('_ping').limit(1).get(), timeout]);
      return true;
    } catch {
      return false;
    }
  }

  getFirestore(): Firestore | null {
    return this.db;
  }

  shutdown(): void {
    if (this.app) {
      this.app.delete().catch(() => {});
      this.app = null;
    }
    this.db = null;
    this.initialized = false;
  }
}

export const firebaseClient = new FirebaseClient();
