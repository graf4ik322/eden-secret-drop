import { Package } from 'lucide-react';

export function MockupsSection() {
  return (
    <section className="mx-4 mt-6">
      <div className="text-center py-16">
        <Package size={48} style={{ color: 'var(--muted)' }} className="mx-auto mb-4 opacity-40" />
        <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>Mockups</p>
        <p className="text-xs mt-1" style={{ color: 'var(--muted)' }}>Coming soon</p>
      </div>
    </section>
  );
}
