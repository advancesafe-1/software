export function formatIncidentTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffMs / 60000);
  if (diffSec < 60) return 'Just now';
  if (diffMin < 60) return `${diffMin} minutes ago`;
  const sameDay = d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  if (sameDay) {
    const h = d.getHours();
    const m = d.getMinutes();
    return `Today ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  }
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dd = d.getDate();
  const mon = months[d.getMonth()];
  const h = d.getHours();
  const min = d.getMinutes();
  return `${dd} ${mon} ${h.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
}
