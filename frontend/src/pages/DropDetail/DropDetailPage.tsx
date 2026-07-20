import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Heart, Share2, ShieldCheck, Award, Verified, Truck,
  Clock, Eye, Package, MapPin,
} from 'lucide-react';
import { GlassCard, Badge } from '@/components/ui';

const specs = [
  { key: 'Material', value: 'Stainless Steel' },
  { key: 'Movement', value: 'Automatic' },
  { key: 'Water Resistance', value: '300m' },
  { key: 'Diameter', value: '41mm' },
];

const trustItems = [
  { icon: ShieldCheck, label: 'Original' },
  { icon: Award, label: 'Warranty' },
  { icon: Verified, label: 'Verified' },
  { icon: Truck, label: 'Fast Delivery' },
];

export function DropDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  return (
    <div className="min-h-dvh safe-top safe-bottom">
      {/* ===== Header (68px) (TZ 4.2.1) ===== */}
      <header className="flex items-center justify-between px-4 h-[68px]">
        <button
          onClick={() => navigate(-1)}
          className="w-[44px] h-[44px] rounded-full glass-card flex items-center justify-center hover:border-[var(--gold)]/50 transition-all"
        >
          <ArrowLeft size={20} style={{ color: 'var(--text-secondary)' }} />
        </button>
        <div className="flex gap-2">
          <button className="w-[44px] h-[44px] rounded-full glass-card flex items-center justify-center hover:border-[var(--gold)]/50 transition-all">
            <Heart size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
          <button className="w-[44px] h-[44px] rounded-full glass-card flex items-center justify-center hover:border-[var(--gold)]/50 transition-all">
            <Share2 size={20} style={{ color: 'var(--text-secondary)' }} />
          </button>
        </div>
      </header>

      {/* ===== Hero Image (340px) (TZ 4.2.2) ===== */}
      <div className="mx-4 mt-1 glass-card h-[340px] flex items-center justify-center relative overflow-hidden">
        {/* Ambient glow */}
        <div
          className="absolute inset-0 opacity-20"
          style={{
            background: 'radial-gradient(ellipse at center, var(--gold) 0%, transparent 70%)',
          }}
        />
        <span className="relative z-10 text-sm" style={{ color: 'var(--muted)' }}>
          Cutout Image — {id}
        </span>
        <Badge variant="limited" className="absolute top-3 left-3 z-10">Limited</Badge>
      </div>

      {/* ===== Content ===== */}
      <div className="px-4 mt-5 space-y-6 pb-32">
        {/* Title + Brand (TZ 4.2.4) */}
        <div>
          <h1 className="text-[30px] font-bold leading-tight" style={{ color: 'var(--text)' }}>
            Product Name
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>Brand / Manufacturer</p>
        </div>

        {/* Price + Stock (TZ 4.2.5) */}
        <div className="flex items-center justify-between">
          <span className="text-[36px] font-bold" style={{ color: 'var(--gold)' }}>€9,500</span>
          <span className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--success)' }}>
            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: 'var(--success)' }} />
            In Stock
          </span>
        </div>

        {/* Trust Strip (TZ 4.2.6) */}
        <GlassCard className="p-4 flex items-center justify-around">
          {trustItems.map(({ icon: Icon, label }) => (
            <div key={label} className="flex flex-col items-center gap-1.5">
              <Icon size={18} style={{ color: 'var(--gold)' }} />
              <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                {label}
              </span>
            </div>
          ))}
        </GlassCard>

        {/* Description (TZ 4.2.7) */}
        <div>
          <p className="text-base leading-relaxed line-clamp-5" style={{ color: 'var(--text-secondary)' }}>
            Experience unparalleled craftsmanship with this premium timepiece.
            Featuring a sapphire crystal, ceramic bezel, and a meticulously
            finished automatic movement visible through the exhibition caseback.
          </p>
        </div>

        {/* Specifications (TZ 4.2.8) */}
        <div>
          <h3 className="text-base font-semibold mb-3" style={{ color: 'var(--text)' }}>Specifications</h3>
          <div className="grid grid-cols-2 gap-3">
            {specs.map((spec) => (
              <GlassCard key={spec.key} className="p-3">
                <p className="text-xs font-medium" style={{ color: 'var(--muted)' }}>{spec.key}</p>
                <p className="text-sm font-semibold mt-0.5" style={{ color: 'var(--text)' }}>{spec.value}</p>
              </GlassCard>
            ))}
          </div>
        </div>

        {/* Seller Note (TZ 4.2.9) */}
        <GlassCard className="p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--emerald)]/20 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--emerald-glow)" strokeWidth="2">
                <polygon points="12,2 22,8 22,18 12,24 2,18 2,8" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text)' }}>From Eden</p>
              <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Every item in our collection is hand-selected and verified by our
                team. We guarantee authenticity and quality.
              </p>
            </div>
          </div>
        </GlassCard>

        {/* Drop Information (TZ 4.2.10) */}
        <GlassCard className="p-4 space-y-2">
          {[
            { icon: Package, label: 'Drop', value: id },
            { icon: Clock, label: 'Published', value: '2 hours ago' },
            { icon: Eye, label: 'Viewed', value: '47 times' },
            { icon: Package, label: 'Remaining', value: '3 pcs' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Icon size={14} style={{ color: 'var(--muted)' }} />
                <span className="text-sm" style={{ color: 'var(--muted)' }}>{label}</span>
              </div>
              <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{value}</span>
            </div>
          ))}
        </GlassCard>

        {/* Delivery (TZ 4.2.11) */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--emerald)]/20 flex items-center justify-center">
              <MapPin size={18} style={{ color: 'var(--emerald-glow)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Estimated Delivery</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>3–5 business days · Worldwide</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* ===== Sticky Buy Now (TZ 4.2.12) ===== */}
      <div className="fixed bottom-0 left-0 right-0 p-4 safe-bottom z-40">
        <div className="glass-card p-2 rounded-[var(--radius-card)]">
          <a
            href={`https://t.me/edensecretdrop?text=Hi!%20I%27m%20interested%20in%20${id}%20-%20Product%20Name`}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full h-[64px] leading-[64px] text-center font-bold text-lg rounded-[var(--radius-btn)]"
            style={{
              background: 'linear-gradient(135deg, var(--gold), var(--gold-light))',
              color: 'var(--bg)',
              boxShadow: 'var(--shadow-glow-gold)',
            }}
          >
            Buy Now €9,500
          </a>
        </div>
      </div>
    </div>
  );
}
