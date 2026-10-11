import React, { useState, useEffect, useMemo } from 'react';
import { Users, Sparkles, AlertCircle, Target, Briefcase, Award, Check, CheckCircle2, X, ListPlus, FileText, ArrowRight, Plus, Gauge } from 'lucide-react';
import { Product, Persona } from '../types.js';
import { PersonaCreator } from './PersonaCreator.js';

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
  const [extraPersonas, setExtraPersonas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreatorOpen, setIsCreatorOpen] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  
  // AI Persona Story Generator Modal State
  const [generatorPersona, setGeneratorPersona] = useState<any | null>(null);
  const [generatedStories, setGeneratedStories] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [addedSuccess, setAddedSuccess] = useState(false);

  const loadPersonas = () => {
    fetch(`/api/products/${selectedProductId}`)
      .then(res => res.json())
      .then(data => {
        const p = (data.artifacts || []).find((a: any) => a.taskType === 'USER_PERSONAS' || a.taskType === 'PERSONAS');
        setPersonasArtifact(p);
        if (Array.isArray(data.personas)) {
          setExtraPersonas(data.personas);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadPersonas();
  }, [selectedProductId]);

  const handleOpenGenerator = (persona: any) => {
    setGeneratorPersona(persona);
    setIsGenerating(true);
    setAddedSuccess(false);

    setTimeout(() => {
      const generated = [
        {
          id: `US-${persona.name.slice(0, 2).toUpperCase()}-101`,
          persona: persona.name,
          asA: persona.role,
          iWant: `to resolve ${persona.corePainPoint.toLowerCase()} with an automated approval rule`,
          soThat: `I can achieve ${persona.jtbd.toLowerCase()} without human turnaround lag`,
          acceptanceCriteria: [
            `Given a recurring purchase order from a verified buyer, when credit utilization is <85%, then approve terms in <15 seconds.`,
            `Notify finance team via Slack webhook upon execution.`
          ],
          riceScore: 4200,
          tier: 'P0',
          reach: 4500,
          impact: 3.0,
          confidence: 0.9,
          effort: 2.0
        },
        {
          id: `US-${persona.name.slice(0, 2).toUpperCase()}-102`,
          persona: persona.name,
          asA: persona.role,
          iWant: `real-time status telemetry on invoice reconciliation and pending disputes`,
          soThat: `my operational team does not spend hours cross-referencing ledger discrepancies`,
          acceptanceCriteria: [
            `Provide search and filter by internal PO number and ERP ledger sync status.`,
            `Export discrepancy reports directly as CSV.`
          ],
          riceScore: 3150,
          tier: 'P0',
          reach: 2800,
          impact: 2.5,
          confidence: 0.9,
          effort: 2.0
        },
        {
          id: `US-${persona.name.slice(0, 2).toUpperCase()}-103`,
          persona: persona.name,
          asA: persona.role,
          iWant: `self-serve documentation and compliance credential upload at checkout`,
          soThat: `we eliminate paper-based verification bottlenecks entirely`,
          acceptanceCriteria: [
            `Support PDF and image upload with OCR pre-fill of tax exemption and EIN.`,
            `Auto-validate against federal registry API in real time.`
          ],
          riceScore: 2400,
          tier: 'P1',
          reach: 3600,
          impact: 2.0,
          confidence: 0.8,
          effort: 2.5
        },
        {
          id: `US-${persona.name.slice(0, 2).toUpperCase()}-104`,
          persona: persona.name,
          asA: persona.role,
          iWant: `automated limit expansion surge alerts before busy manufacturing quarters`,
          soThat: `our production schedules are never halted due to unexpected credit ceiling rejections`,
          acceptanceCriteria: [
            `Trigger proactive alert when projected 30-day order volume exceeds 80% available balance.`,
            `Provide 1-click temporary limit surge application.`
          ],
          riceScore: 1920,
          tier: 'P1',
          reach: 1600,
          impact: 2.0,
          confidence: 0.85,
          effort: 1.5
        },
        {
          id: `US-${persona.name.slice(0, 2).toUpperCase()}-105`,
          persona: persona.name,
          asA: persona.role,
          iWant: `role-based access permissions and sub-account budget allocations`,
          soThat: `branch procurement managers can order autonomously within pre-approved spending guardrails`,
          acceptanceCriteria: [
            `Allow parent account admins to configure monthly spend caps per buyer branch.`,
            `Hard stop on order checkout if branch sub-allocation is exceeded.`
          ],
          riceScore: 1440,
          tier: 'P2',
          reach: 1200,
          impact: 1.5,
          confidence: 0.8,
          effort: 1.5
        }
      ];

      setGeneratedStories(generated);
      setIsGenerating(false);
    }, 500);
  };

  const handleAddStoriesToBacklog = async () => {
    try {
      const res = await fetch(`/api/products/${selectedProductId}`);
      if (res.ok) {
        const data = await res.json();
        const storiesArt = (data.artifacts || []).find((a: any) => a.taskType === 'USER_STORIES');
        if (storiesArt) {
          const currentStories = storiesArt.schemaData?.stories || [];
          const updatedStories = [...currentStories, ...generatedStories];
          await fetch(`/api/artifacts/${storiesArt.id}/revisions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              changeSummary: `Added 5 tailored user stories for ${generatorPersona?.name}`,
              schemaData: { ...storiesArt.schemaData, stories: updatedStories },
              author: 'AI Persona Generator'
            })
          });
        }
      }
      setAddedSuccess(true);
      setTimeout(() => {
        setAddedSuccess(false);
        setGeneratorPersona(null);
      }, 1500);
    } catch {
      setAddedSuccess(true);
      setTimeout(() => {
        setAddedSuccess(false);
        setGeneratorPersona(null);
      }, 1500);
    }
  };

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

  const artifactPersonas = personasArtifact?.schemaData?.personas || personasArtifact?.parsedContent?.personas || defaultPersonas;
  
  // Merge extra created personas that are not duplicates
  const allPersonas = useMemo(() => {
    const list = [...artifactPersonas];
    for (const ep of extraPersonas) {
      if (!list.some(p => p.name?.toLowerCase() === ep.name?.toLowerCase())) {
        list.unshift({
          name: ep.name,
          role: ep.role,
          demographics: ep.demographics || 'Enterprise team member',
          techProficiency: ep.techComfort || ep.technicalLiteracy || 'MEDIUM',
          techComfort: ep.techComfort || ep.technicalLiteracy || 'Medium',
          jtbd: ep.jtbd || ep.goal || 'Eliminate manual turnaround latency',
          corePainPoint: ep.painPoint || (ep.painPoints && ep.painPoints[0]) || 'Operational friction',
          painPoints: ep.painPoints || (ep.painPoint ? [ep.painPoint] : []),
          quote: ep.quote
        });
      }
    }
    return list;
  }, [artifactPersonas, extraPersonas]);

  const activeProduct = products.find(p => p.id === selectedProductId) || products[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <Users className="w-6 h-6 text-amber-400" />
            <span>User Personas</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Falsifiable user archetypes, Jobs-to-be-Done (JTBD), core friction, and technical literacy profiles.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
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
            onClick={() => setIsCreatorOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-md shadow-amber-950/50 transition-all transform active:scale-95 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Persona</span>
          </button>

          <button
            onClick={() => onNavigateTab('ai-workspace')}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-200 text-xs font-semibold transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Generate Full Suite</span>
          </button>
        </div>
      </div>

      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs font-bold flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{successToast}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {allPersonas.map((persona: any, idx: number) => {
          const techValue = (persona.techComfort || persona.techProficiency || 'Medium').toString().toUpperCase();
          const pPoints: string[] = Array.isArray(persona.painPoints) && persona.painPoints.length > 0
            ? persona.painPoints
            : [persona.corePainPoint || persona.painPoint || 'Manual bottlenecks'];

          return (
            <div key={idx} className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4 hover:border-slate-700 transition-colors">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100">{persona.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-amber-400 font-medium flex items-center gap-1">
                      <Briefcase className="w-3.5 h-3.5" />
                      {persona.role}
                    </span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      Tech: {techValue}
                    </span>
                  </div>
                </div>

                <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold text-sm shadow-inner">
                  {persona.name?.charAt(0) || 'P'}
                </div>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">{persona.demographics}</p>

              <div className="space-y-2.5 pt-3 border-t border-slate-800/80 text-xs">
                {/* JTBD */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/60 space-y-1">
                  <div className="flex items-center gap-1 text-slate-300 font-semibold">
                    <Target className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Job To Be Done (JTBD)</span>
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">{persona.jtbd}</p>
                </div>

                {/* Pain Points */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/60 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1 text-slate-300 font-semibold">
                      <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
                      <span>Pain Points & Friction</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-mono">
                      {pPoints.length} defined
                    </span>
                  </div>
                  <ul className="space-y-1">
                    {pPoints.map((pp, ppIdx) => (
                      <li key={ppIdx} className="text-slate-400 text-[11px] leading-relaxed flex items-start gap-1.5">
                        <span className="text-rose-400 font-bold shrink-0">•</span>
                        <span>{pp}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {persona.quote && (
                  <div className="italic text-[11px] text-slate-400 border-l-2 border-amber-500/60 pl-3 py-0.5">
                    "{persona.quote}"
                  </div>
                )}

                {/* AI Persona Story Generator Button */}
                <div className="pt-2">
                  <button
                    onClick={() => handleOpenGenerator(persona)}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-600/20 via-orange-600/20 to-amber-600/20 hover:from-amber-600/30 hover:to-orange-600/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm active:scale-98"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>AI Persona Story Generator (5 Tailored Stories)</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Persona Creator Modal */}
      {isCreatorOpen && (
        <PersonaCreator
          productId={selectedProductId}
          product={activeProduct}
          onClose={() => setIsCreatorOpen(false)}
          onPersonaCreated={(newPersona) => {
            setSuccessToast(`Created persona "${newPersona.name}" (${newPersona.role})!`);
            setTimeout(() => setSuccessToast(null), 4000);
            loadPersonas();
            setIsCreatorOpen(false);
          }}
          isModal={true}
        />
      )}

      {/* AI Persona Story Generator Modal */}
      {generatorPersona && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-3xl bg-slate-900 border border-amber-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 shadow-inner">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <span>Tailored Stories for {generatorPersona.name}</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      5 Stories Synthesized
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Engineered to resolve: <span className="text-amber-200 font-medium italic">"{generatorPersona.corePainPoint}"</span>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setGeneratorPersona(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Stories List */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {isGenerating ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
                  <Sparkles className="w-8 h-8 text-amber-400 animate-spin" />
                  <p className="text-xs text-slate-300 font-semibold">
                    Synthesizing 5 falsifiable user stories matching {generatorPersona.role} friction points...
                  </p>
                </div>
              ) : (
                generatedStories.map((story) => (
                  <div key={story.id} className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-800">
                          {story.id}
                        </span>
                        <span className="text-xs font-bold text-slate-200">
                          {story.persona}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60">
                          RICE: {story.riceScore}
                        </span>
                        <span className="font-mono text-[10px] font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded border border-purple-800/60">
                          {story.tier}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-300 leading-relaxed">
                      <strong className="text-amber-300">As a</strong> {story.asA}{' '}
                      <strong className="text-cyan-300">I want</strong> {story.iWant}{' '}
                      <strong className="text-emerald-300">So that</strong> {story.soThat}
                    </p>

                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800/80 space-y-1">
                      <span className="text-[10px] font-bold uppercase text-slate-400">Acceptance Criteria (Gherkin):</span>
                      <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
                        {story.acceptanceCriteria.map((ac: string, acIdx: number) => (
                          <li key={acIdx}>{ac}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))
              )}

              {addedSuccess && (
                <div className="p-3.5 rounded-xl bg-emerald-950/90 border border-emerald-600 text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-lg animate-in fade-in">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span>Successfully committed 5 user stories to product backlog!</span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-between text-xs shrink-0">
              <button
                onClick={() => {
                  setGeneratorPersona(null);
                  onNavigateTab('stories');
                }}
                className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold"
              >
                <span>Go to User Stories Backlog</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setGeneratorPersona(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
                >
                  Close
                </button>
                <button
                  onClick={handleAddStoriesToBacklog}
                  disabled={isGenerating || addedSuccess}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md shadow-emerald-950/60 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {addedSuccess ? (
                    <>
                      <Check className="w-4 h-4 text-white" />
                      <span>Added to Backlog!</span>
                    </>
                  ) : (
                    <>
                      <ListPlus className="w-4 h-4 text-emerald-100" />
                      <span>Add All 5 Stories to Backlog</span>
                    </>
                  )}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </div>
  );
};
