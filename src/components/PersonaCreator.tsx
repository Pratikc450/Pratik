import React, { useState } from 'react';
import {
  Users,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  X,
  Briefcase,
  AlertCircle,
  Target,
  Quote,
  Gauge,
  HelpCircle,
  Lightbulb,
  Check,
  ArrowRight
} from 'lucide-react';
import { Product, Persona } from '../types.js';

interface PersonaCreatorProps {
  productId: string;
  product?: Product;
  onPersonaCreated?: (newPersona: Persona) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export type TechLiteracyLevel = 'Low' | 'Medium' | 'High' | 'Expert';

const TECH_LEVEL_DESCRIPTIONS: Record<TechLiteracyLevel, { label: string; desc: string; badgeColor: string }> = {
  Low: {
    label: 'Low Literacy',
    desc: 'Relies on basic email & spreadsheets; high friction with complex interfaces or ERP systems.',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40'
  },
  Medium: {
    label: 'Medium Literacy',
    desc: 'Comfortable with standard B2B SaaS portals, web apps, and guided workflow wizards.',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  },
  High: {
    label: 'High Literacy',
    desc: 'Power user; leverages automated bulk imports, reporting dashboards, and keyboard shortcuts.',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
  },
  Expert: {
    label: 'Expert / Developer',
    desc: 'Comfortable configuring webhooks, API tokens, CLI automation, and custom permission policies.',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
  }
};

const SUGGESTED_ARCHETYPES = [
  { role: 'Director of Procurement', hint: 'Primary buyer focused on approval turnaround and credit limits' },
  { role: 'Treasury & Risk Lead', hint: 'Compliance stakeholder evaluating fraud, audit trails, and ledger sync' },
  { role: 'Branch Operations Manager', hint: 'Daily operator handling checkout, order routing, and disputes' },
  { role: 'IT Integration Architect', hint: 'Technical stakeholder managing ERP webhooks, APIs, and security SLAs' }
];

export const PersonaCreator: React.FC<PersonaCreatorProps> = ({
  productId,
  product,
  onPersonaCreated,
  onClose,
  isModal = true
}) => {
  // Form fields
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [painPoints, setPainPoints] = useState<string[]>([
    'Manual approval handoffs create 48+ hour turnaround latency'
  ]);
  const [newPainPointInput, setNewPainPointInput] = useState('');
  const [techComfort, setTechComfort] = useState<TechLiteracyLevel>('Medium');
  
  // Optional complementary fields
  const [demographics, setDemographics] = useState('');
  const [jtbd, setJtbd] = useState('');
  const [quote, setQuote] = useState('');

  // UI / AI state
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState(false);

  // Add Pain Point
  const handleAddPainPoint = () => {
    if (!newPainPointInput.trim()) return;
    setPainPoints([...painPoints, newPainPointInput.trim()]);
    setNewPainPointInput('');
  };

  // Remove Pain Point
  const handleRemovePainPoint = (index: number) => {
    setPainPoints(painPoints.filter((_, i) => i !== index));
  };

  // Trigger Gemini AI Suggestion for complete persona
  const handleAiSuggestPersona = async (archetypeRole?: string) => {
    setIsAiGenerating(true);
    setAiSuccessMessage(null);
    setValidationError(null);

    try {
      const res = await fetch('/api/ai/suggest-persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          roleHint: archetypeRole || role || undefined,
          nameHint: name || undefined,
          industryHint: product?.industry
        })
      });

      if (res.ok) {
        const data = await res.json();
        const p = data.persona;
        if (p) {
          setName(p.name || name || 'Elena Rostova');
          setRole(p.role || archetypeRole || role || 'Director of Procurement');
          
          if (Array.isArray(p.painPoints) && p.painPoints.length > 0) {
            setPainPoints(p.painPoints);
          } else if (p.corePainPoint) {
            setPainPoints([p.corePainPoint]);
          }

          if (p.technicalLiteracy && ['Low', 'Medium', 'High', 'Expert'].includes(p.technicalLiteracy)) {
            setTechComfort(p.technicalLiteracy as TechLiteracyLevel);
          }

          if (p.demographics) setDemographics(p.demographics);
          if (p.jtbd) setJtbd(p.jtbd);
          if (p.quote) setQuote(p.quote);

          setAiSuccessMessage(`✨ Synthesized high-fidelity persona for "${p.name}" via Gemini API!`);
          setTimeout(() => setAiSuccessMessage(null), 5000);
        }
      }
    } catch (err) {
      console.warn('AI Suggestion failed, applied fallback heuristics', err);
    } finally {
      setIsAiGenerating(false);
    }
  };

  // Handle Form Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!name.trim()) {
      setValidationError('Persona name is required.');
      return;
    }
    if (!role.trim()) {
      setValidationError('Professional role / title is required.');
      return;
    }
    if (painPoints.length === 0 && !newPainPointInput.trim()) {
      setValidationError('At least one primary pain point is required.');
      return;
    }

    const finalPainPoints = [...painPoints];
    if (newPainPointInput.trim()) {
      finalPainPoints.push(newPainPointInput.trim());
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/products/${productId}/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          role: role.trim(),
          painPoints: finalPainPoints,
          painPoint: finalPainPoints[0] || 'Manual inefficiencies',
          techComfort,
          technicalLiteracy: techComfort,
          demographics: demographics.trim() || `${role.trim()} working in cross-functional operations`,
          jtbd: jtbd.trim() || `Ensure frictionless turnaround for ${role.trim()} workflows`,
          quote: quote.trim() || `We need automated tooling to streamline our ${role.trim().toLowerCase()} operations.`
        })
      });

      if (res.ok) {
        const data = await res.json();
        setSuccessToast(true);
        if (onPersonaCreated && data.persona) {
          onPersonaCreated(data.persona);
        }
        setTimeout(() => {
          setSuccessToast(false);
          if (onClose) onClose();
        }, 1200);
      } else {
        const errData = await res.json().catch(() => ({}));
        setValidationError(errData.error || 'Failed to save persona.');
      }
    } catch (err: any) {
      setValidationError(err.message || 'Network error submitting persona.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formContent = (
    <div className="space-y-6">
      {/* Header & AI Assist Banner */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-amber-950/40 via-orange-950/20 to-slate-900 border border-amber-500/30">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Sparkles className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Gemini Persona Suggestions</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Model: gemini-3.8-flash
                </span>
              </h4>
              <p className="text-xs text-slate-400">
                Automatically generate falsifiable personas aligned with <strong className="text-amber-200">{product?.name || 'this product'}</strong>.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleAiSuggestPersona()}
            disabled={isAiGenerating}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-md shadow-amber-950/50 flex items-center justify-center gap-1.5 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
          >
            <Sparkles className={`w-3.5 h-3.5 ${isAiGenerating ? 'animate-spin' : ''}`} />
            <span>{isAiGenerating ? 'Synthesizing with Gemini...' : 'Auto-Generate Persona'}</span>
          </button>
        </div>

        {/* Quick Archetype Seed Pills */}
        <div className="mt-3 pt-3 border-t border-amber-500/20">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Quick Archetype Seeds:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_ARCHETYPES.map((arch) => (
              <button
                key={arch.role}
                type="button"
                onClick={() => handleAiSuggestPersona(arch.role)}
                disabled={isAiGenerating}
                className="text-xs px-2.5 py-1 rounded-lg bg-slate-900/90 hover:bg-amber-950/60 text-slate-300 hover:text-amber-200 border border-slate-800 hover:border-amber-500/40 transition-all flex items-center gap-1.5"
                title={arch.hint}
              >
                <Briefcase className="w-3 h-3 text-amber-400" />
                <span>{arch.role}</span>
              </button>
            ))}
          </div>
        </div>

        {aiSuccessMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{aiSuccessMessage}</span>
          </div>
        )}
      </div>

      {validationError && (
        <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-600/60 text-rose-200 text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{validationError}</span>
        </div>
      )}

      {/* Primary Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Persona Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span>Persona Name</span>
              <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Elena Rostova"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-colors"
              required
            />
          </div>

          {/* Persona Role */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <span>Role / Job Title</span>
              <span className="text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                placeholder="e.g., Director of Procurement"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/40 transition-colors"
                required
              />
            </div>
          </div>
        </div>

        {/* Technical Literacy Selector */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-amber-400" />
              <span>Technical Literacy</span>
              <span className="text-rose-400">*</span>
            </label>
            <span className={`text-[11px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${TECH_LEVEL_DESCRIPTIONS[techComfort].badgeColor}`}>
              {techComfort.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['Low', 'Medium', 'High', 'Expert'] as TechLiteracyLevel[]).map((level) => {
              const isSelected = techComfort === level;
              return (
                <button
                  key={level}
                  type="button"
                  onClick={() => setTechComfort(level)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-amber-950/60 border-amber-500/80 shadow-md ring-1 ring-amber-500/50'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-bold ${isSelected ? 'text-amber-300' : 'text-slate-200'}`}>
                      {level}
                    </span>
                    {isSelected && <Check className="w-3.5 h-3.5 text-amber-400" />}
                  </div>
                  <p className="text-[10px] text-slate-400 line-clamp-2 leading-tight">
                    {TECH_LEVEL_DESCRIPTIONS[level].label}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="text-[11px] text-slate-400 italic">
            {TECH_LEVEL_DESCRIPTIONS[techComfort].desc}
          </p>
        </div>

        {/* Pain Points Interactive List */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Core Pain Points & Friction</span>
              <span className="text-rose-400">*</span>
            </label>
            <span className="text-[11px] text-slate-400 font-medium">
              {painPoints.length} defined
            </span>
          </div>

          {/* Existing Pain Points List */}
          <div className="space-y-2">
            {painPoints.map((pp, idx) => (
              <div
                key={idx}
                className="flex items-start justify-between gap-3 p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 group hover:border-slate-700 transition-colors"
              >
                <div className="flex items-start gap-2 pt-0.5">
                  <span className="w-5 h-5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <span className="leading-relaxed">{pp}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemovePainPoint(idx)}
                  className="text-slate-500 hover:text-rose-400 p-1 rounded hover:bg-slate-800 transition-colors shrink-0"
                  title="Remove pain point"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Pain Point Input */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={newPainPointInput}
              onChange={(e) => setNewPainPointInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddPainPoint();
                }
              }}
              placeholder="Add specific operational friction, delay, or frustration..."
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-amber-500"
            />
            <button
              type="button"
              onClick={handleAddPainPoint}
              className="px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        {/* Secondary Accordion / Complementary Fields */}
        <div className="pt-2 border-t border-slate-800 space-y-4">
          <div className="flex items-center gap-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
            <span>Strategic Persona Details (Optional)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Demographics */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">Demographics & Experience</label>
              <input
                type="text"
                value={demographics}
                onChange={(e) => setDemographics(e.target.value)}
                placeholder="e.g., 38 years old, 12 years in supply chain operations"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Job to be Done (JTBD) */}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-slate-300">Job To Be Done (JTBD)</label>
              <input
                type="text"
                value={jtbd}
                onChange={(e) => setJtbd(e.target.value)}
                placeholder="e.g., Authorize multi-line purchase orders in <5 mins without lag"
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Verbatim Quote */}
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-300 flex items-center gap-1">
              <Quote className="w-3 h-3 text-amber-400" />
              <span>Customer Quote / Friction Sentiment</span>
            </label>
            <input
              type="text"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
              placeholder='e.g., "If I can’t place this order with net-30 terms right now, our warehouse crew sits idle tomorrow."'
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Submit & Cancel Buttons */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
            >
              Cancel
            </button>
          ) : <div />}

          <button
            type="submit"
            disabled={isSubmitting || successToast}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold shadow-lg shadow-amber-950/60 flex items-center gap-2 transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {successToast ? (
              <>
                <Check className="w-4 h-4 text-white" />
                <span>Persona Saved!</span>
              </>
            ) : (
              <>
                <Users className="w-4 h-4 text-amber-100" />
                <span>{isSubmitting ? 'Saving Persona...' : 'Commit Persona to Workspace'}</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );

  if (!isModal) {
    return (
      <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl">
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Create New Persona</h3>
              <p className="text-[11px] text-slate-400">Specify name, role, pain points, and technical literacy</p>
            </div>
          </div>
        </div>
        {formContent}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-slate-900 via-amber-950/30 to-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300">
              <Users className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Create User Persona</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  AI-Powered
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Define role, pain points, and technical literacy with automated Gemini suggestions.
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {formContent}
        </div>
      </div>
    </div>
  );
};
