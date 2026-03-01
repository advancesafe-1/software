import { app, safeStorage } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

export interface StoredCredentials {
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFromPhone: string;
  twilioWhatsappFrom: string;
  firebaseServerKey: string;
  firebaseProjectId: string;
  firebaseServiceAccountJson: string;
}

const CREDENTIALS_FILENAME = 'credentials.enc';

export class CredentialsService {
  private credentialsPath: string = '';

  private getPath(): string {
    if (this.credentialsPath) return this.credentialsPath;
    const userData = app.getPath('userData');
    this.credentialsPath = path.join(userData, CREDENTIALS_FILENAME);
    return this.credentialsPath;
  }

  async saveCredentials(creds: Partial<StoredCredentials>): Promise<void> {
    const existing = await this.getCredentials();
    const merged: Partial<StoredCredentials> = { ...existing, ...creds };
    const toStore: Record<string, string> = {};
    for (const [k, v] of Object.entries(merged)) {
      if (typeof v === 'string' && v.length > 0) toStore[k] = v;
    }
    const json = JSON.stringify(toStore);
    if (!safeStorage.isEncryptionAvailable()) {
      throw new Error('Encryption not available');
    }
    const encrypted = safeStorage.encryptString(json);
    fs.writeFileSync(this.getPath(), encrypted, { mode: 0o600 });
  }

  async getCredentials(): Promise<Partial<StoredCredentials>> {
    const p = this.getPath();
    if (!fs.existsSync(p)) return {};
    try {
      const buf = fs.readFileSync(p);
      const decrypted = safeStorage.decryptString(buf);
      const parsed = JSON.parse(decrypted) as Record<string, string>;
      return parsed as Partial<StoredCredentials>;
    } catch (err) {
      if (err instanceof Error && !err.message.includes('decrypt')) {
        console.error('Credentials read error');
      }
      return {};
    }
  }

  async hasCredentials(): Promise<boolean> {
    const c = await this.getCredentials();
    const sid = c.twilioAccountSid?.trim();
    const token = c.twilioAuthToken?.trim();
    return Boolean(sid && token);
  }

  async clearCredentials(): Promise<void> {
    const p = this.getPath();
    if (fs.existsSync(p)) fs.unlinkSync(p);
    this.credentialsPath = '';
  }

  async testTwilioCredentials(): Promise<boolean> {
    try {
      const c = await this.getCredentials();
      const sid = c.twilioAccountSid?.trim();
      const token = c.twilioAuthToken?.trim();
      if (!sid || !token) return false;
      const auth = Buffer.from(sid + ':' + token).toString('base64');
      const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}.json`;
      const res = await fetch(url, {
        method: 'GET',
        headers: { Authorization: 'Basic ' + auth },
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}

export const credentialsService = new CredentialsService();
