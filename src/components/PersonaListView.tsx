import React, { useState, useEffect } from 'react';
import { Users, Sparkles, AlertCircle, Target, Briefcase, Award } from 'lucide-react';
import { Product } from '../types.js';

interface PersonaListViewProps {
  selectedProductId: string;
  products: Product[];
  onSelectProduct: (id: string) => void;
  onNavigateTab: (tab: string) => void;
}

export const PersonaListView: React.FC<PersonaListViewProps> = ({
  selectedProductId,
  products,
  onSelectProduct,
  onNavigateTab
}) => {
  const [personasArtifact, setPersonasArtifact] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/products/${selectedProductId}`)
      .then(res => res.json())
      .then(data => {
        const p = (data.artifacts || []).find((a: any) => a.taskType === 'USER_PERSONAS');
        setPersonasArtifact(p);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedProductId]);

  const defaultPersonas = [
    {
      name: 'Elena Rostova',
      role: 'Director of Procurement',
      demographics: '38 years old, 12 years in B2B supply chain at mid-market wholesale distributor ($40M ARR).',
      techProficiency: 'MEDIUM',
      jtbd: 'Authorize multi-line purchase orders in under 5 minutes without manual email credit verifications.',
      corePainPoint: 'Spends 6+ hours weekly waiting on finance credit line sign-offs and resolving tax exemption errors.',
      quote: 'If I can’t place this order with net-30 terms right now, my warehouse crew sits idle tomorrow morning.'
    },
    {
      name: 'Marcus Chen',
      role: 'VP of E-commerce Operations',
      demographics: '44 years old, oversees digital storefronts and omnichannel catalog checkout.',
      techProficiency: 'HIGH',
      jtbd: 'Increase wholesale cart conversion from 22% to 35% by removing checkout friction.',
      corePainPoint: 'High cart abandonment when buyers are asked to download paper credit application forms.',
      quote: 'Every manual credit step we remove directly drops thousands of dollars to our bottom line.'
    }
  ];

  const personas = personasArtifact?.parsedContent?.personas || defaultPersonas;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-amber-400" />
            <span>User Personas</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Falsifiable user archetypes, Jobs-to-be-Done (JTBD), core friction, and verbatim customer quotes.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <select
            value={selectedProductId}
            onChange={(e) => onSelectProduct(e.target.value)}
            className="bg-slate-900 text-xs font-semibold text-slate-200 border border-slate-800 rounded-xl px-3 py-2 focus:outline-none focus:border-amber-500"
          >
            {products.map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          <button
            onClick={() => onNavigateTab('ai-workspace')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Generate Personas</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {personas.map((persona: any, idx: number) => (
          <div key={idx} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">{persona.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    {persona.role}
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Tech: {persona.techProficiency}
                  </span>
                </div>
              </div>

              <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center font-bold text-sm">
                {persona.name.charAt(0)}
              </div>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">{persona.demographics}</p>

            <div className="space-y-2.5 pt-3 border-t border-slate-800/80 text-xs">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/60 space-y-1">
                <div className="flex items-center gap-1 text-slate-300 font-semibold">
                  <Target className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Job To Be Done (JTBD)</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">{persona.jtbd}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/60 space-y-1">
                <div className="flex items-center gap-1 text-slate-300 font-semibold">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                  <span>Core Pain Point</span>
                </div>
                <p className="text-slate-400 text-[11px] leading-relaxed">{persona.corePainPoint}</p>
              </div>

              {persona.quote && (
                <div className="italic text-[11px] text-slate-400 border-l-2 border-amber-500/60 pl-3 py-0.5">
                  "{persona.quote}"
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
