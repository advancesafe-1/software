import { useState, useEffect } from 'react';
import { useToast } from '@/store/toast-store';

export function AlertDeliverySettings() {
  const [sid, setSid] = useState('');
  const [token, setToken] = useState('');
  const [fromPhone, setFromPhone] = useState('');
  const [whatsappFrom, setWhatsappFrom] = useState('');
  const [saving, setSaving] = useState(false);
  const [hasCreds, setHasCreds] = useState(false);
  const [testPhone, setTestPhone] = useState('');
  const [testModal, setTestModal] = useState<'sms' | 'whatsapp' | null>(null);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    window.advancesafe?.settings?.hasCredentials().then(setHasCreds);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await window.advancesafe?.settings?.saveCredentials({
        twilioAccountSid: sid.trim(),
        twilioAuthToken: token.trim(),
        twilioFromPhone: fromPhone.trim(),
        twilioWhatsappFrom: whatsappFrom.trim(),
      });
      if (result?.success) {
        toast.success('Credentials saved');
        setHasCreds(true);
      } else {
        toast.error(result?.error ?? 'Save failed');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (channel: 'sms' | 'whatsapp') => {
    if (!testPhone.trim()) return;
    setTesting(true);
    try {
      const result = channel === 'sms' ? await window.advancesafe?.settings?.testSMS(testPhone.trim()) : await window.advancesafe?.settings?.testWhatsApp(testPhone.trim());
      if (result?.success) toast.success('Test sent');
      else toast.error(result?.error ?? 'Send failed');
      setTestModal(null);
      setTestPhone('');
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)]/30 p-3">
        <p className="mb-3 font-mono text-xs font-semibold text-[var(--text-primary)]">TWILIO SMS & WHATSAPP</p>
        <div className="grid gap-2 font-mono text-xs">
          <label className="block"><span className="text-[var(--text-secondary)]">Account SID</span><input type="text" value={sid} onChange={(e) => setSid(e.target.value)} maxLength={50} className="ml-2 w-64 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1 text-[var(--text-primary)]" /></label>
          <label className="block"><span className="text-[var(--text-secondary)]">Auth Token</span><input type="password" value={token} onChange={(e) => setToken(e.target.value)} maxLength={100} className="ml-2 w-64 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1 text-[var(--text-primary)]" /></label>
          <label className="block"><span className="text-[var(--text-secondary)]">From Phone</span><input type="tel" value={fromPhone} onChange={(e) => setFromPhone(e.target.value)} placeholder="+91XXXXXXXXXX" className="ml-2 w-48 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1 text-[var(--text-primary)]" /></label>
          <label className="block"><span className="text-[var(--text-secondary)]">WhatsApp From</span><input type="tel" value={whatsappFrom} onChange={(e) => setWhatsappFrom(e.target.value)} placeholder="+14155552671" className="ml-2 w-48 rounded border border-[var(--border-default)] bg-[var(--bg-primary)] px-2 py-1 text-[var(--text-primary)]" /></label>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={handleSave} disabled={saving} className="rounded border border-[var(--accent-cyan)] bg-[var(--accent-cyan)]/10 px-3 py-1.5 font-mono text-xs text-[var(--accent-cyan)] disabled:opacity-50">SAVE CREDENTIALS</button>
          <button type="button" onClick={() => setTestModal('sms')} className="rounded border border-[var(--border-default)] px-3 py-1.5 font-mono text-xs text-[var(--text-secondary)]">TEST SMS</button>
          <button type="button" onClick={() => setTestModal('whatsapp')} className="rounded border border-[var(--border-default)] px-3 py-1.5 font-mono text-xs text-[var(--text-secondary)]">TEST WHATSAPP</button>
        </div>
        <div className="mt-2 font-mono text-[10px]">{hasCreds ? <span className="text-[var(--status-safe)]">CREDENTIALS CONFIGURED</span> : <span className="text-[var(--status-warning)]">NOT CONFIGURED</span>}</div>
      </div>
      {testModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-80 rounded border border-[var(--border-default)] bg-[var(--bg-card)] p-4">
            <p className="font-mono text-xs text-[var(--text-primary)]">Test phone number</p>
            <input type="tel" value={testPhone} onChange={(e) => setTestPhone(e.target.value)} className="mt-2 w-full rounded border border-[var(--border-default)] bg-[var(--bg-tertiary)] px-2 py-1.5 font-mono text-sm text-[var(--text-primary)]" />
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => { setTestModal(null); setTestPhone(''); }} className="rounded border border-[var(--border-default)] px-2 py-1 font-mono text-xs">Cancel</button>
              <button type="button" onClick={() => handleTest(testModal)} disabled={testing} className="rounded bg-[var(--accent-cyan)]/20 px-2 py-1 font-mono text-xs text-[var(--accent-cyan)] disabled:opacity-50">Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
