import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Flame, 
  Target, 
  Calendar, 
  Sparkles, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Filter, 
  TrendingUp, 
  Sliders, 
  ArrowRight, 
  FileText, 
  Clock, 
  Check, 
  X,
  ChevronRight,
  Info,
  Layers,
  Award
} from 'lucide-react';

interface StakeholderRole {
  id: string;
  name: string;
  title: string;
  department: string;
  influenceWeight: number; // 1 to 5
  avatarInitials: string;
  color: string;
}

interface StoryHeatmapRow {
  id: string;
  persona: string;
  asA: string;
  iWant: string;
  soThat: string;
  riceScore: number;
  tier: 'P0' | 'P1' | 'P2' | 'P3';
  epicTitle: string;
  engagement: Record<string, {
    score: number; // 0 to 100
    status: 'SCHEDULED' | 'PENDING_REVIEW' | 'SIGNED_OFF' | 'ADVISORY';
    reviewUrgency: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
    focusArea: string;
    rationale: string;
  }>;
}

interface StakeholderInterestHeatmapProps {
  selectedProductId?: string;
  onNavigateTab?: (tab: string) => void;
}

const DEFAULT_STAKEHOLDERS: StakeholderRole[] = [
  {
    id: 'credit_lead',
    name: 'Sarah Jenkins',
    title: 'Commercial Credit Lead',
    department: 'Risk & Underwriting',
    influenceWeight: 5,
    avatarInitials: 'SJ',
    color: '#10b981'
  },
  {
    id: 'procurement_dir',
    name: 'Marcus Vance',
    title: 'Enterprise Procurement Director',
    department: 'Buyer Operations',
    influenceWeight: 4,
    avatarInitials: 'MV',
    color: '#06b6d4'
  },
  {
    id: 'finance_ctrl',
    name: 'Elena Rostova',
    title: 'Corporate Finance Controller',
    department: 'Treasury & Accounting',
    influenceWeight: 5,
    avatarInitials: 'ER',
    color: '#a855f7'
  },
  {
    id: 'solutions_arch',
    name: 'Devin Zhao',
    title: 'Principal Solutions Architect',
    department: 'Core Engineering',
    influenceWeight: 4,
    avatarInitials: 'DZ',
    color: '#f59e0b'
  },
  {
    id: 'vp_growth',
    name: 'Tanya Morales',
    title: 'VP of Commercial Growth',
    department: 'Revenue & GTM',
    influenceWeight: 4,
    avatarInitials: 'TM',
    color: '#ec4899'
  }
];

const DEFAULT_HEATMAP_ROWS: StoryHeatmapRow[] = [
  {
    id: 'US-101',
    persona: 'Commercial Credit Lead',
    asA: 'Commercial Credit Lead',
    iWant: 'automated credit decisioning at checkout under 300ms',
    soThat: 'low-risk buyers get instant payment terms without drop-off',
    riceScore: 4860,
    tier: 'P0',
    epicTitle: 'Real-Time Credit Decisioning & Risk Governance',
    engagement: {
      credit_lead: {
        score: 98,
        status: 'PENDING_REVIEW',
        reviewUrgency: 'CRITICAL',
        focusArea: '300ms SLA, Loss-rate threshold models, EIN fallback rules',
        rationale: 'Primary owner. Directly liable for underwriting accuracy and portfolio default rates.'
      },
      procurement_dir: {
        score: 85,
        status: 'SCHEDULED',
        reviewUrgency: 'HIGH',
        focusArea: 'Checkout friction, frictionless approval UX, cart conversion',
        rationale: 'Impacts buyer conversion during multi-thousand dollar procurement PO checkout.'
      },
      finance_ctrl: {
        score: 72,
        status: 'PENDING_REVIEW',
        reviewUrgency: 'MEDIUM',
        focusArea: 'Daily credit allocation caps, bank debt-facility covenants',
        rationale: 'Requires audit log of credit approvals against debt facilities.'
      },
      solutions_arch: {
        score: 92,
        status: 'PENDING_REVIEW',
        reviewUrgency: 'CRITICAL',
        focusArea: 'P99 latency budget, Redis cache layer, credit bureau rate-limits',
        rationale: 'Directly impacts distributed architecture and 99.99% availability targets.'
      },
      vp_growth: {
        score: 88,
        status: 'SCHEDULED',
        reviewUrgency: 'HIGH',
        focusArea: 'Conversion lift for GMV > $50k enterprise order tiers',
        rationale: 'Key selling differentiator against traditional net-30 paper invoicing.'
      }
    }
  },
  {
    id: 'US-102',
    persona: 'Corporate Finance Controller',
    asA: 'Corporate Finance Controller',
    iWant: 'automated daily NetSuite ERP webhook reconciliation',
    soThat: 'end-of-month financial closing is reduced from 5 days to 2 hours',
    riceScore: 4050,
    tier: 'P0',
    epicTitle: 'Automated Financial Ledger & ERP Dispatch',
    engagement: {
      credit_lead: {
        score: 45,
        status: 'ADVISORY',
        reviewUrgency: 'LOW',
        focusArea: 'Repayment reconciliation impact on customer credit line refresh',
        rationale: 'Secondary stakeholder; cares that repaid lines restore available purchasing capacity.'
      },
      procurement_dir: {
        score: 35,
        status: 'ADVISORY',
        reviewUrgency: 'LOW',
        focusArea: 'Invoice format matching procurement internal PO numbers',
        rationale: 'Cares primarily about invoice line item numbering for AP approval.'
      },
      finance_ctrl: {
        score: 99,
        status: 'PENDING_REVIEW',
        reviewUrgency: 'CRITICAL',
        focusArea: 'General ledger account mapping, idempotency tokens, audit trial',
        rationale: 'Core operational owner. End-of-month reconciliation speed is top department KPI.'
      },
      solutions_arch: {
        score: 90,
        status: 'SCHEDULED',
        reviewUrgency: 'HIGH',
        focusArea: 'Dead-letter queue retry mechanics, idempotency key persistence',
        rationale: 'System reliability owner for transactional webhooks and back-pressure controls.'
      },
      vp_growth: {
        score: 60,
        status: 'ADVISORY',
        reviewUrgency: 'MEDIUM',
        focusArea: 'Enterprise RFP readiness (NetSuite, SAP compatibility claims)',
        rationale: 'Essential checkbox in Fortune 500 sales cycles.'
      }
    }
  },
  {
    id: 'US-103',
    persona: 'Enterprise Procurement Director',
    asA: 'Enterprise Procurement Director',
    iWant: 'real-time visibility into trade line balance and utilization alerts',
    soThat: 'procurement managers never face unexpected order rejections',
    riceScore: 2400,
    tier: 'P1',
    epicTitle: 'Corporate Buyer Account Visibility & Credit Control',
    engagement: {
      credit_lead: {
        score: 75,
        status: 'SCHEDULED',
        reviewUrgency: 'MEDIUM',
        focusArea: 'Utilization threshold warning levels (e.g. 80%, 95%)',
        rationale: 'Needs early warnings to proactively evaluate credit line expansions.'
      },
      procurement_dir: {
        score: 96,
        status: 'PENDING_REVIEW',
        reviewUrgency: 'CRITICAL',
        focusArea: 'Team sub-account permissions, email/Slack alerts, remaining PO quota',
        rationale: 'Core champion. Prevents procurement workflow blockages on critical production supplies.'
      },
      finance_ctrl: {
        score: 65,
        status: 'ADVISORY',
        reviewUrgency: 'LOW',
        focusArea: 'Payment due date schedules and auto-debit ACH indicators',
        rationale: 'Requires transparency on outstanding payable windows.'
      },
      solutions_arch: {
        score: 55,
        status: 'SIGNED_OFF',
        reviewUrgency: 'LOW',
        focusArea: 'Read-replica queries and event bus notifications',
        rationale: 'Standard read-heavy UI architecture, low technical risk.'
      },
      vp_growth: {
        score: 82,
        status: 'SCHEDULED',
        reviewUrgency: 'HIGH',
        focusArea: 'Buyer retention metrics, repeat ordering frequency lift',
        rationale: 'Direct driver of buyer stickiness and account GMV expansion.'
      }
    }
  },
  {
    id: 'US-104',
    persona: 'Enterprise Procurement Director',
    asA: 'Enterprise Procurement Director',
    iWant: 'one-click temporary limit extension requests during surge periods',
    soThat: 'our plant operations do not stall waiting for manual credit committee reviews',
    riceScore: 1800,
    tier: 'P1',
    epicTitle: 'Corporate Buyer Account Visibility & Credit Control',
    engagement: {
      credit_lead: {
        score: 94,
        status: 'PENDING_REVIEW',
        reviewUrgency: 'CRITICAL',
        focusArea: 'Algorithm-assisted temporary risk multiplier and collateral requirements',
        rationale: 'High risk exposure. Requires explicit guardrails on temporary limit exposure.'
      },
      procurement_dir: {
        score: 91,
        status: 'SCHEDULED',
        reviewUrgency: 'HIGH',
        focusArea: 'Turnaround time SLA (< 2 hours), self-serve documentation upload',
        rationale: 'Addresses acute manufacturing supply chain surge emergencies.'
      },
      finance_ctrl: {
        score: 80,
        status: 'PENDING_REVIEW',
        reviewUrgency: 'HIGH',
        focusArea: 'Short-term cash liability, interest surcharge structures',
        rationale: 'Must ensure pricing and underwriting spread covers incremental default risk.'
      },
      solutions_arch: {
        score: 62,
        status: 'ADVISORY',
        reviewUrgency: 'MEDIUM',
        focusArea: 'Approval escalation workflows and state-machine transitions',
        rationale: 'Workflow engine integration with Slack/Email notifications.'
      },
      vp_growth: {
        score: 85,
        status: 'SCHEDULED',
        reviewUrgency: 'HIGH',
        focusArea: 'Revenue capture from seasonal inventory spikes',
        rationale: 'Captures peak holiday and quarterly inventory purchasing spikes.'
      }
    }
  }
];

export const StakeholderInterestHeatmap: React.FC<StakeholderInterestHeatmapProps> = ({
  selectedProductId,
  onNavigateTab
}) => {
  const [stakeholders] = useState<StakeholderRole[]>(DEFAULT_STAKEHOLDERS);
  const [rows, setRows] = useState<StoryHeatmapRow[]>(DEFAULT_HEATMAP_ROWS);
  const [selectedStory, setSelectedStory] = useState<StoryHeatmapRow | null>(DEFAULT_HEATMAP_ROWS[0]);
  const [selectedCell, setSelectedCell] = useState<{
    storyId: string;
    stakeholderId: string;
  } | null>(null);

  // Filters
  const [urgencyFilter, setUrgencyFilter] = useState<'ALL' | 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');
  const [minInterestThreshold, setMinInterestThreshold] = useState<number>(70);
  const [activeDepartment, setActiveDepartment] = useState<string>('ALL');
  const [showReviewAgendaModal, setShowReviewAgendaModal] = useState<boolean>(false);
  const [agendaNotes, setAgendaNotes] = useState<string>('');
  const [agendaSuccessMsg, setAgendaSuccessMsg] = useState<string | null>(null);

  // Load real stories from workspace if available
  useEffect(() => {
    if (!selectedProductId) return;

    fetch(`/api/products/${selectedProductId}`)
      .then(res => res.json())
      .then(data => {
        const storiesArt = (data.artifacts || []).find((a: any) => a.taskType === 'USER_STORIES');
        if (storiesArt?.schemaData?.stories && storiesArt.schemaData.stories.length > 0) {
          const loadedStories: any[] = storiesArt.schemaData.stories;
          
          // Augment or map existing stories into heatmap rows
          const mappedRows: StoryHeatmapRow[] = loadedStories.map((story, idx) => {
            const defaultMatch = DEFAULT_HEATMAP_ROWS.find(d => d.id === story.id) || DEFAULT_HEATMAP_ROWS[idx % DEFAULT_HEATMAP_ROWS.length];
            const rice = story.riceScore || Math.round(((story.reach || 1000) * (story.impact || 2) * (story.confidence || 0.8)) / (story.effort || 2));
            const tier = rice >= 3000 ? 'P0' : rice >= 1500 ? 'P1' : rice >= 600 ? 'P2' : 'P3';

            return {
              id: story.id,
              persona: story.persona || defaultMatch.persona,
              asA: story.asA || defaultMatch.asA,
              iWant: story.iWant || defaultMatch.iWant,
              soThat: story.soThat || defaultMatch.soThat,
              riceScore: rice,
              tier,
              epicTitle: story.epicTitle || defaultMatch.epicTitle,
              engagement: defaultMatch.engagement
            };
          });

          setRows(mappedRows);
          if (mappedRows.length > 0) {
            setSelectedStory(mappedRows[0]);
          }
        }
      })
      .catch(() => {
        // Retain default demo rows
      });
  }, [selectedProductId]);

  // Compute Review Priority Target Index for each story:
  // Weighted Composite = RICE Score * (Sum of Stakeholder Engagements weighted by Influence)
  const storiesWithReviewTargets = useMemo(() => {
    return rows.map(story => {
      let totalWeightedEngagement = 0;
      let totalWeight = 0;
      let criticalStakeholderCount = 0;

      stakeholders.forEach(sh => {
        const eng = story.engagement[sh.id];
        if (eng) {
          totalWeightedEngagement += (eng.score * sh.influenceWeight);
          totalWeight += sh.influenceWeight;
          if (eng.score >= 85) {
            criticalStakeholderCount += 1;
          }
        }
      });

      const avgWeightedInterest = totalWeight > 0 ? Math.round(totalWeightedEngagement / totalWeight) : 0;
      
      // Normalized Target Urgency Score (0 - 100)
      const targetScore = Math.min(
        100,
        Math.round((avgWeightedInterest * 0.6) + (Math.min(story.riceScore / 50, 40)))
      );

      const isHighValueTarget = targetScore >= minInterestThreshold && criticalStakeholderCount >= 2;

      return {
        ...story,
        avgWeightedInterest,
        targetScore,
        criticalStakeholderCount,
        isHighValueTarget
      };
    }).sort((a, b) => b.targetScore - a.targetScore);
  }, [rows, stakeholders, minInterestThreshold]);

  // Filtered stories for heatmap rendering
  const filteredStories = useMemo(() => {
    return storiesWithReviewTargets.filter(story => {
      if (urgencyFilter !== 'ALL') {
        const hasMatchingUrgency = Object.values(story.engagement).some(e => e.reviewUrgency === urgencyFilter);
        if (!hasMatchingUrgency) return false;
      }
      return true;
    });
  }, [storiesWithReviewTargets, urgencyFilter]);

  // High-value targets specifically flagged for immediate review
  const highValueReviewTargets = useMemo(() => {
    return storiesWithReviewTargets.filter(s => s.isHighValueTarget);
  }, [storiesWithReviewTargets]);

  // Heatmap Color scale generator
  const getCellColor = (score: number) => {
    if (score >= 90) return 'bg-emerald-500/90 text-white border-emerald-400 shadow-md shadow-emerald-950/40';
    if (score >= 80) return 'bg-teal-600/85 text-teal-100 border-teal-500';
    if (score >= 70) return 'bg-cyan-700/80 text-cyan-100 border-cyan-600';
    if (score >= 50) return 'bg-indigo-900/80 text-indigo-200 border-indigo-700';
    if (score >= 30) return 'bg-slate-800/80 text-slate-300 border-slate-700';
    return 'bg-slate-900/60 text-slate-500 border-slate-800';
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL':
        return 'bg-rose-950/80 text-rose-300 border-rose-800 animate-pulse';
      case 'HIGH':
        return 'bg-amber-950/80 text-amber-300 border-amber-800';
      case 'MEDIUM':
        return 'bg-cyan-950/80 text-cyan-300 border-cyan-800';
      default:
        return 'bg-slate-900 text-slate-400 border-slate-800';
    }
  };

  const activeInspection = useMemo(() => {
    if (!selectedCell) return null;
    const story = rows.find(r => r.id === selectedCell.storyId);
    const stakeholder = stakeholders.find(s => s.id === selectedCell.stakeholderId);
    if (!story || !stakeholder) return null;
    const engagement = story.engagement[stakeholder.id];
    return { story, stakeholder, engagement };
  }, [selectedCell, rows, stakeholders]);

  const handleScheduleReview = (storyId: string) => {
    const target = rows.find(r => r.id === storyId);
    if (target) {
      setSelectedStory(target);
      setShowReviewAgendaModal(true);
    }
  };

  const handleConfirmReviewAgenda = () => {
    setAgendaSuccessMsg(`✨ Product Review Meeting brief generated for ${selectedStory?.id}! Calendar invites & review dossier dispatched.`);
    setTimeout(() => {
      setAgendaSuccessMsg(null);
      setShowReviewAgendaModal(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Header */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-purple-950/30 to-slate-900 border border-purple-500/30 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-purple-950/50">
              <Flame className="w-6 h-6 text-purple-100" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-100">
                  Stakeholder Interest Heatmap
                </h2>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Product Review Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Cross-references active User Stories against multi-department Persona engagement levels to identify high-leverage targets for sprint alignment and executive product sign-offs.
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center min-w-[110px]">
              <span className="text-[10px] uppercase font-bold text-slate-500">High-Value Targets</span>
              <div className="text-lg font-black text-emerald-400 mt-0.5">
                {highValueReviewTargets.length} Stories
              </div>
            </div>
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-center min-w-[110px]">
              <span className="text-[10px] uppercase font-bold text-slate-500">Avg Alignment</span>
              <div className="text-lg font-black text-purple-300 mt-0.5">
                84.2%
              </div>
            </div>
          </div>
        </div>

        {/* Filter & Threshold Toolbar */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-slate-400 font-semibold flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-purple-400" />
              <span>Review Urgency:</span>
            </span>
            {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'] as const).map(urg => (
              <button
                key={urg}
                onClick={() => setUrgencyFilter(urg)}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                  urgencyFilter === urg 
                    ? 'bg-purple-600 text-white font-bold shadow-xs' 
                    : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                }`}
              >
                {urg}
              </button>
            ))}
          </div>

          {/* Threshold Slider */}
          <div className="flex items-center gap-3">
            <span className="text-slate-400 text-[11px]">High-Value Target Threshold:</span>
            <input
              type="range"
              min="50"
              max="90"
              step="5"
              value={minInterestThreshold}
              onChange={(e) => setMinInterestThreshold(Number(e.target.value))}
              className="w-24 h-1.5 bg-slate-800 rounded appearance-none cursor-pointer accent-purple-500"
            />
            <span className="font-mono text-purple-300 font-bold text-xs">
              ≥ {minInterestThreshold}%
            </span>
          </div>
        </div>
      </div>

      {/* High-Value Target Spotlight Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
            <Target className="w-3.5 h-3.5 text-emerald-400" />
            <span>High-Value Targets for Immediate Product Reviews ({highValueReviewTargets.length})</span>
          </h3>
          <span className="text-[11px] text-slate-500">
            Ranked by RICE impact multiplied by cross-functional stakeholder influence
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {highValueReviewTargets.map((story) => (
            <div
              key={story.id}
              onClick={() => setSelectedStory(story)}
              className={`p-4 rounded-xl border transition-all cursor-pointer space-y-3 relative overflow-hidden group ${
                selectedStory?.id === story.id
                  ? 'bg-slate-900 border-purple-500 ring-1 ring-purple-500/50 shadow-lg shadow-purple-950/40'
                  : 'bg-slate-950/80 hover:bg-slate-900/80 border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                    {story.id}
                  </span>
                  <span className="text-xs font-bold text-emerald-300 px-2 py-0.5 rounded bg-emerald-950/80 border border-emerald-800 font-mono">
                    Target Score: {story.targetScore}/100
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  {story.tier}
                </span>
              </div>

              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-200 line-clamp-1">
                  {story.epicTitle}
                </h4>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                  <strong className="text-purple-300">As a</strong> {story.asA}{' '}
                  <strong className="text-cyan-300">I want</strong> {story.iWant}
                </p>
              </div>

              {/* Stakeholder avatars with high engagement */}
              <div className="pt-2 border-t border-slate-850 flex items-center justify-between text-xs">
                <div className="flex items-center -space-x-1.5">
                  {stakeholders.map(sh => {
                    const eng = story.engagement[sh.id];
                    if (!eng || eng.score < 75) return null;
                    return (
                      <div
                        key={sh.id}
                        className="w-6 h-6 rounded-full border border-slate-800 flex items-center justify-center font-bold text-[9px] text-white shadow-xs"
                        style={{ backgroundColor: sh.color }}
                        title={`${sh.name} (${sh.title}): ${eng.score}% Engagement`}
                      >
                        {sh.avatarInitials}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleScheduleReview(story.id);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold flex items-center gap-1 transition-all"
                >
                  <Calendar className="w-3 h-3" />
                  <span>Prepare Review</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Heatmap Matrix Grid */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>Story-to-Persona Engagement Cross-Reference Matrix</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Click any cell to view detailed stakeholder evaluation criteria, review friction points, and Gherkin focus areas.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-slate-400">
            <span>Heatmap Scale:</span>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded bg-slate-800 border border-slate-700" title="< 50% Minimal" />
              <span className="w-3 h-3 rounded bg-indigo-900 border border-indigo-700" title="50-69% Moderate" />
              <span className="w-3 h-3 rounded bg-cyan-700 border border-cyan-600" title="70-79% Active" />
              <span className="w-3 h-3 rounded bg-teal-600 border border-teal-500" title="80-89% High" />
              <span className="w-3 h-3 rounded bg-emerald-500 border border-emerald-400" title="90-100% Critical Target" />
            </div>
            <span className="text-slate-500 font-mono">90%+ Critical Target</span>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto border border-slate-800 rounded-xl bg-slate-950/70">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950 text-slate-400 font-semibold">
                <th className="p-3.5 min-w-[220px]">User Story & Epic</th>
                <th className="p-3.5 text-center w-24">RICE Score</th>
                <th className="p-3.5 text-center w-28">Review Target</th>
                {stakeholders.map((sh) => (
                  <th key={sh.id} className="p-3.5 text-center min-w-[130px]">
                    <div className="flex flex-col items-center">
                      <div 
                        className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white text-xs shadow-xs mb-1"
                        style={{ backgroundColor: sh.color }}
                      >
                        {sh.avatarInitials}
                      </div>
                      <span className="text-slate-200 font-bold truncate max-w-[120px]">{sh.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono font-normal">Weight: {sh.influenceWeight}x</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {filteredStories.map((story) => {
                const isStoryActive = selectedStory?.id === story.id;

                return (
                  <tr 
                    key={story.id} 
                    className={`transition-colors ${isStoryActive ? 'bg-purple-950/20' : 'hover:bg-slate-900/50'}`}
                  >
                    {/* Story Identifier & Persona */}
                    <td className="p-3.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-purple-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            {story.id}
                          </span>
                          <span className="font-semibold text-slate-200">
                            {story.persona}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                          "{story.iWant}"
                        </p>
                      </div>
                    </td>

                    {/* RICE Score */}
                    <td className="p-3.5 text-center font-mono font-bold text-emerald-300">
                      <span className="px-2 py-1 rounded bg-slate-900 border border-slate-800">
                        {story.riceScore.toLocaleString()}
                      </span>
                    </td>

                    {/* Review Target Urgency */}
                    <td className="p-3.5 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold text-[10px] border ${
                          story.isHighValueTarget 
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600' 
                            : 'bg-slate-900 text-slate-400 border-slate-800'
                        }`}>
                          {story.targetScore} / 100
                        </span>
                        {story.isHighValueTarget && (
                          <span className="text-[9px] font-bold uppercase text-emerald-400 tracking-wider">
                            High Target
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Stakeholder Heatmap Cells */}
                    {stakeholders.map((sh) => {
                      const eng = story.engagement[sh.id];
                      const isCellActive = selectedCell?.storyId === story.id && selectedCell?.stakeholderId === sh.id;

                      if (!eng) {
                        return (
                          <td key={sh.id} className="p-3 text-center text-slate-600 font-mono">
                            -
                          </td>
                        );
                      }

                      return (
                        <td key={sh.id} className="p-2 text-center">
                          <button
                            onClick={() => {
                              setSelectedStory(story);
                              setSelectedCell({ storyId: story.id, stakeholderId: sh.id });
                            }}
                            className={`w-full py-2 px-2.5 rounded-xl border text-xs font-mono font-bold transition-all transform active:scale-95 flex flex-col items-center gap-0.5 cursor-pointer ${
                              getCellColor(eng.score)
                            } ${isCellActive ? 'ring-2 ring-white scale-105' : ''}`}
                            title={`Click to inspect ${sh.name}'s interest in ${story.id}`}
                          >
                            <span className="text-sm font-black">{eng.score}%</span>
                            <span className="text-[9px] font-normal uppercase opacity-90 truncate max-w-[90px]">
                              {eng.reviewUrgency}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Cell Deep-Dive Inspection Drawer */}
      {activeInspection && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-indigo-500/40 shadow-xl space-y-4 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div 
                className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white text-sm shadow-md"
                style={{ backgroundColor: activeInspection.stakeholder.color }}
              >
                {activeInspection.stakeholder.avatarInitials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-bold text-slate-100">
                    {activeInspection.stakeholder.name} · {activeInspection.stakeholder.title}
                  </h4>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${getUrgencyBadge(activeInspection.engagement.reviewUrgency)}`}>
                    {activeInspection.engagement.reviewUrgency} REVIEW
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Target User Story: <strong className="text-purple-300 font-mono">{activeInspection.story.id}</strong> ({activeInspection.story.persona})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleScheduleReview(activeInspection.story.id)}
                className="px-3 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm"
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>Create Review Brief</span>
              </button>
              <button
                onClick={() => setSelectedCell(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
              <span className="font-bold text-purple-300 flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5" />
                <span>Primary Review Focus Area:</span>
              </span>
              <p className="text-slate-200 leading-relaxed font-medium">
                {activeInspection.engagement.focusArea}
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" />
                <span>Stakeholder Engagement Rationale:</span>
              </span>
              <p className="text-slate-300 leading-relaxed italic">
                "{activeInspection.engagement.rationale}"
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Prepare Review Agenda Modal */}
      {showReviewAgendaModal && selectedStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border border-purple-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-purple-950/40 to-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-inner">
                  <Calendar className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-100">
                    Product Review Briefing: {selectedStory.id}
                  </h3>
                  <p className="text-xs text-slate-400">
                    Automated cross-functional review dossier ready for executive sign-off.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowReviewAgendaModal(false)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-850 space-y-1">
                <span className="text-[10px] font-bold uppercase text-purple-400">Story Statement</span>
                <p className="text-slate-200 leading-relaxed">
                  <strong>As a</strong> {selectedStory.asA} <strong>I want</strong> {selectedStory.iWant} <strong>So that</strong> {selectedStory.soThat}
                </p>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-300 uppercase tracking-wider text-[11px]">
                  Required Stakeholder Attendees & Focus Topics
                </span>
                <div className="space-y-2">
                  {stakeholders.map(sh => {
                    const eng = selectedStory.engagement[sh.id];
                    if (!eng || eng.score < 60) return null;
                    return (
                      <div key={sh.id} className="p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-start gap-3">
                        <div 
                          className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-white text-[10px] shrink-0 mt-0.5"
                          style={{ backgroundColor: sh.color }}
                        >
                          {sh.avatarInitials}
                        </div>
                        <div className="space-y-0.5 flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">{sh.name} ({sh.title})</span>
                            <span className="font-mono text-emerald-400 font-bold">{eng.score}% Engagement</span>
                          </div>
                          <p className="text-slate-400 text-[11px]">{eng.focusArea}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-semibold text-slate-300">
                  Pre-Review PM Context & Key Questions to Resolve:
                </label>
                <textarea
                  value={agendaNotes}
                  onChange={(e) => setAgendaNotes(e.target.value)}
                  placeholder="e.g. Verify whether 300ms SLA requires provisioning dedicated Redis cluster or if Postgres read-replicas suffice. Confirm credit loss reserve budget."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
                />
              </div>

              {agendaSuccessMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-600 text-emerald-200 text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{agendaSuccessMsg}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex items-center justify-end gap-2 text-xs">
              <button
                onClick={() => setShowReviewAgendaModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold transition-colors"
              >
                Close
              </button>
              <button
                onClick={handleConfirmReviewAgenda}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold shadow-md shadow-emerald-950/60 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Dispatch Review Dossier</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
