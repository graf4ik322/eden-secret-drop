import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Share2, ShieldCheck, Award, Verified, Truck, Clock, Eye, Package, MapPin } from 'lucide-react';
import { getTrpcQueryOptions } from '@/lib/trpc';
import { GlassCard, Badge } from '@/components/ui';

export function DropDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: dropRaw, isLoading, error } = useQuery({
    ...getTrpcQueryOptions('drop.getByDisplayId', { displayId: id || '' }),
    enabled: !!id,
  });

  const drop = dropRaw as Record<string, unknown> | null | undefined;

  let specs: { key: string; value: string }[] = [];
  if (drop?.specifications) {
    try {
      const parsed = JSON.parse(String(drop.specifications));
      specs = Object.entries(parsed).map(([key, value]) => ({ key, value: String(value) }));
    } catch { /* ignore */ }
  }

  const trustItems = [
    { icon: ShieldCheck, label: 'Original' },
    { icon: Award, label: 'Warranty' },
    { icon: Verified, label: 'Verified' },
    { icon: Truck, label: 'Fast Delivery' },
  ];

  const formatPrice = (price: unknown) => {
    if (!price) return 'Price on request';
    const num = parseFloat(String(price));
    return '\u20AC' + num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };

  const timeAgo = (dateStr: unknown) => {
    if (!dateStr) return 'N/A';
    const hours = Math.floor((Date.now() - new Date(String(dateStr)).getTime()) / (1000 * 60 * 60));
    if (hours < 1) return 'Published less than an hour ago';
    if (hours === 1) return 'Published 1 hour ago';
    return 'Published ' + hours + ' hours ago';
  };

  const deeplink = drop
    ? 'https://t.me/edensecretdrop?text=Hi!%20I%27m%20interested%20in%20' + drop.displayId + '%20-%20' + encodeURIComponent(String(drop.title || ''))
    : '';

  if (isLoading) {
    return (
      <div className="min-h-dvh safe-top scroll-safe">
        <div className="animate-pulse">
          <header className="app-header flex items-center justify-between px-4">
            <div className="w-[44px] h-[44px] rounded-full" style={{ background: 'var(--surface)' }} />
            <div className="flex gap-2">
              <div className="w-[44px] h-[44px] rounded-full" style={{ background: 'var(--surface)' }} />
              <div className="w-[44px] h-[44px] rounded-full" style={{ background: 'var(--surface)' }} />
            </div>
          </header>
          <div className="mx-4 space-y-4">
            <div className="h-[340px] rounded-2xl" style={{ background: 'var(--surface)' }} />
            <div className="h-8 w-3/4 rounded" style={{ background: 'var(--surface)' }} />
            <div className="h-6 w-1/2 rounded" style={{ background: 'var(--surface)' }} />
            <div className="h-20 rounded-2xl" style={{ background: 'var(--surface)' }} />
            <div className="h-32 rounded-2xl" style={{ background: 'var(--surface)' }} />
          </div>
        </div>
      </div>
    );
  }

  if (error || !drop) {
    return (
      <div className="min-h-dvh safe-top flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Drop not found</p>
          <p className="text-sm mt-2" style={{ color: 'var(--muted)' }}>The drop you are looking for does not exist</p>
          <button onClick={() => navigate('/')} className="mt-6 px-6 py-3 rounded-xl font-semibold" style={{ background: 'var(--emerald)', color: 'var(--text)' }}>Go Home</button>
        </div>
      </div>
    );
  }

  const isLive = drop.status === 'live';
  const isSold = drop.status === 'sold';
  const remaining = Number(drop.remaining ?? 1);

  return (
    <div className="min-h-dvh safe-top scroll-safe">
      <header className="app-header flex items-center justify-between px-4">
        <button onClick={() => navigate(-1)} className="back-btn w-11 h-11 rounded-full glass-card flex items-center justify-center transition-all">
          <ArrowLeft size={20} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div className="flex-1" />
        <div className="flex gap-2">
          <button className="w-11 h-11 rounded-full glass-card flex items-center justify-center transition-all"><Share2 size={20} style={{ color: 'var(--text-secondary)' }} /></button>
        </div>
      </header>

      <section className="mx-4 mt-8 relative h-[340px] flex items-center justify-center overflow-hidden" style={{ background: 'var(--surface)', borderRadius: 'var(--radius-card)' }}>
        {drop.cutoutUrl ? (
          <img src={String(drop.cutoutUrl)} alt={String(drop.title || '')} className="h-full w-auto object-contain max-w-none" style={{ filter: 'drop-shadow(0 0 40px rgba(31,139,116,0.35))' }} />
        ) : drop.imageUrl ? (
          <img src={String(drop.imageUrl)} alt={String(drop.title || '')} className="w-full h-full object-cover" />
        ) : (
          <span className="text-6xl opacity-20">{'\u2726'}</span>
        )}
        <Badge variant={isLive ? 'new' : isSold ? 'default' : 'limited'} className="absolute top-4 left-4">
          {isLive ? 'LIVE' : isSold ? 'SOLD' : 'LIMITED'}
        </Badge>
      </section>

      <div className="flex justify-center gap-1.5 mt-3">
        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--gold)' }} />
        <div className="w-2 h-2 rounded-full" style={{ background: 'var(--surface-light)' }} />
      </div>

      <section className="px-4 mt-5">
        <h1 className="text-3xl font-bold leading-tight" style={{ color: 'var(--text)' }}>{String(drop.title || '')}</h1>
        {!!drop.brand && <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{String(drop.brand)}</p>}
      </section>

      <section className="px-4 mt-4 flex items-center justify-between">
        <span className="text-4xl font-bold" style={{ color: 'var(--gold)' }}>{formatPrice(drop.price)}</span>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: 'var(--success)' }} />
          <span className="text-sm" style={{ color: 'var(--success)' }}>{remaining > 0 ? 'In Stock (' + remaining + ')' : 'Sold Out'}</span>
        </div>
      </section>

      <section className="mx-4 mt-5 glass-card p-4">
        <div className="grid grid-cols-4 gap-3 text-center">
          {trustItems.map((item, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <item.icon size={20} style={{ color: 'var(--gold)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
            </div>
          ))}
        </div>
      </section>

      {!!drop.description && (
        <section className="px-4 mt-6">
          <p className="text-base leading-relaxed line-clamp-5" style={{ color: 'var(--text-secondary)' }}>{String(drop.description)}</p>
        </section>
      )}

      {specs.length > 0 && (
        <section className="mx-4 mt-5">
          <div className="grid grid-cols-2 gap-3">
            {specs.map((spec, i) => (
              <GlassCard key={i} className="p-4">
                <p className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--muted)' }}>{spec.key}</p>
                <p className="text-sm font-semibold mt-1" style={{ color: 'var(--text)' }}>{spec.value}</p>
              </GlassCard>
            ))}
          </div>
        </section>
      )}

      <section className="mx-4 mt-5 glass-card p-5">
        <div className="flex items-start gap-3">
          <div className="w-[40px] h-[40px] rounded-full flex items-center justify-center flex-shrink-0" style={{ background: 'var(--emerald)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--gold)" strokeWidth="2"><polygon points="12,2 22,8 22,18 12,24 2,18 2,8" /></svg>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>From Eden</p>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Every item is handpicked and verified. Your satisfaction is guaranteed &mdash; we stand behind every drop with our authenticity promise.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-4 mt-5 glass-card p-5">
        <h3 className="text-sm font-semibold mb-3" style={{ color: 'var(--text)' }}>Drop Information</h3>
        <div className="space-y-2.5">
          <div className="flex items-center gap-3"><Package size={16} style={{ color: 'var(--gold)' }} /><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{String(drop.displayId || '')}</span></div>
          <div className="flex items-center gap-3"><Clock size={16} style={{ color: 'var(--gold)' }} /><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{timeAgo(drop.publishedAt)}</span></div>
          <div className="flex items-center gap-3"><Eye size={16} style={{ color: 'var(--gold)' }} /><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Viewed {String(drop.views ?? 0)} times</span></div>
          <div className="flex items-center gap-3"><Package size={16} style={{ color: 'var(--gold)' }} /><span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Remaining {remaining} pcs</span></div>
        </div>
      </section>

      <section className="mx-4 mt-5 glass-card p-5">
        <div className="flex items-center gap-3">
          <MapPin size={18} style={{ color: 'var(--gold)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Estimated Delivery</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>3-5 business days via DHL Express</p>
          </div>
        </div>
      </section>

      <div className="sticky bottom-0 left-0 right-0 p-4 pb-6 z-10" style={{ background: 'linear-gradient(to top, var(--bg) 60%, transparent)' }}>
        <a href={deeplink} target="_blank" rel="noopener noreferrer"
          className="w-full h-16 flex items-center justify-center rounded-xl font-bold text-base gap-2 transition-all hover:opacity-90"
          style={{ background: 'linear-gradient(135deg, var(--gold), var(--gold-light))', color: '#071A17', boxShadow: 'var(--shadow-glow-gold)' }}>
          Buy Now {formatPrice(drop.price)}
        </a>
      </div>
    </div>
  );
}
