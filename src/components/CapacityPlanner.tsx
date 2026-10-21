import React, { useState, useMemo } from 'react';
import {
  Users,
  Calendar,
  Gauge,
  TrendingDown,
  TrendingUp,
  Target,
  Flag,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Sliders,
  ArrowRight,
  Info,
  ShieldCheck,
  Check,
  RefreshCw,
  UserCheck,
  Award,
  Layers,
  Clock,
  ChevronDown,
  ChevronUp,
  Brain,
  Palette,
  Server,
  Code,
  Cpu,
  ShieldAlert,
  CheckCheck,
  ArrowUpRight,
  History,
  BarChart3,
  GitCommit
} from 'lucide-react';
import {
  TeamMemberAvailability,
  RoadmapMilestoneTarget,
  BurnDownDayPoint,
  SkillDomain,
  SkillProficiency,
  SkillDomainDescriptor,
  SkillGapAnalysisResult,
  HistoricalSprintRecord
} from '../types.js';

interface CapacityPlannerProps {
  selectedProductId: string;
  sprintStories: any[];
  committedPoints: number;
  currentVelocity: number;
  onApplyVelocity: (newVelocity: number) => void;
  onAssignStoryMember?: (storyId: string, member: { name: string; role: string; avatarBg: string }) => void;
  onNavigateTab?: (tab: string) => void;
}

export const SKILL_DOMAINS: SkillDomainDescriptor[] = [
  {
    key: 'backend',
    name: 'Backend Architecture & Distributed APIs',
    shortLabel: 'Backend',
    color: 'text-indigo-400',
    textColor: 'text-indigo-300',
    bgColor: 'bg-indigo-950/80',
    borderColor: 'border-indigo-700/80',
    description: 'Go, Node.js, Python, PostgreSQL schema design, and asynchronous webhook pipelines.'
  },
  {
    key: 'frontend',
    name: 'Frontend Engineering & Web App',
    shortLabel: 'Frontend',
    color: 'text-cyan-400',
    textColor: 'text-cyan-300',
    bgColor: 'bg-cyan-950/80',
    borderColor: 'border-cyan-700/80',
    description: 'React, TypeScript, state synchronization, client-side caching, and responsive workflows.'
  },
  {
    key: 'uiux',
    name: 'UI/UX Design Systems & Interfaces',
    shortLabel: 'UI/UX',
    color: 'text-fuchsia-400',
    textColor: 'text-fuchsia-300',
    bgColor: 'bg-fuchsia-950/80',
    borderColor: 'border-fuchsia-700/80',
    description: 'Design tokens, modal interactions, WCAG accessibility, and visual information hierarchy.'
  },
  {
    key: 'risk_data',
    name: 'Risk Modeling & ML Decisioning',
    shortLabel: 'Risk / ML',
    color: 'text-amber-400',
    textColor: 'text-amber-300',
    bgColor: 'bg-amber-950/80',
    borderColor: 'border-amber-700/80',
    description: 'Algorithmic underwriting, EIN verification, financial fraud detection, and probability scoring.'
  },
  {
    key: 'devops_sre',
    name: 'DevOps, Cloud & SRE Infrastructure',
    shortLabel: 'DevOps / SRE',
    color: 'text-teal-400',
    textColor: 'text-teal-300',
    bgColor: 'bg-teal-950/80',
    borderColor: 'border-teal-700/80',
    description: 'Canary deployments, rate limit routing, eBPF telemetry, and zero-downtime rollback.'
  },
  {
    key: 'qa_automation',
    name: 'QA & Resiliency Automation',
    shortLabel: 'QA / Test',
    color: 'text-purple-400',
    textColor: 'text-purple-300',
    bgColor: 'bg-purple-950/80',
    borderColor: 'border-purple-700/80',
    description: 'End-to-end integration tests, chaos rule injection, contract verification, and test coverage.'
  }
];

const DEFAULT_TEAM_MEMBERS: TeamMemberAvailability[] = [
  {
    id: 'tm_1',
    name: 'Elena Rostova',
    role: 'Staff Backend & Risk Architect',
    avatarBg: 'bg-indigo-600',
    email: 'elena@enterprise.io',
    totalWorkingDays: 10,
    ptoDays: 1,
    dailyFocusHours: 6.5,
    focusFactor: 0.85,
    ptsPerDay: 1.0,
    assignedMilestoneIds: ['ms_1', 'ms_2'],
    skills: ['Go', 'Node.js', 'PostgreSQL', 'Risk Scoring'],
    primarySkill: 'backend',
    skillProficiencies: {
      backend: 3,
      frontend: 1,
      uiux: 0,
      risk_data: 3,
      devops_sre: 2,
      qa_automation: 2
    }
  },
  {
    id: 'tm_2',
    name: 'Marcus Chen',
    role: 'Senior Risk & Decisioning Eng',
    avatarBg: 'bg-emerald-600',
    email: 'marcus@enterprise.io',
    totalWorkingDays: 10,
    ptoDays: 0,
    dailyFocusHours: 6.0,
    focusFactor: 0.80,
    ptsPerDay: 0.9,
    assignedMilestoneIds: ['ms_1', 'ms_4'],
    skills: ['Python', 'FastAPI', 'ML Risk', 'PCI-DSS'],
    primarySkill: 'risk_data',
    skillProficiencies: {
      backend: 2,
      frontend: 0,
      uiux: 0,
      risk_data: 3,
      devops_sre: 1,
      qa_automation: 2
    }
  },
  {
    id: 'tm_3',
    name: 'Sophia Lin',
    role: 'Lead Frontend & Design Systems',
    avatarBg: 'bg-cyan-600',
    email: 'sophia@enterprise.io',
    totalWorkingDays: 10,
    ptoDays: 2,
    dailyFocusHours: 6.0,
    focusFactor: 0.75,
    ptsPerDay: 1.0,
    assignedMilestoneIds: ['ms_3'],
    skills: ['React', 'TypeScript', 'Tailwind', 'Micro-frontends'],
    primarySkill: 'frontend',
    skillProficiencies: {
      backend: 1,
      frontend: 3,
      uiux: 3,
      risk_data: 0,
      devops_sre: 1,
      qa_automation: 2
    }
  },
  {
    id: 'tm_4',
    name: 'Dev Patel',
    role: 'Full-Stack Integration Eng',
    avatarBg: 'bg-amber-600',
    email: 'dev@enterprise.io',
    totalWorkingDays: 10,
    ptoDays: 0,
    dailyFocusHours: 6.5,
    focusFactor: 0.80,
    ptsPerDay: 0.85,
    assignedMilestoneIds: ['ms_2', 'ms_3'],
    skills: ['React', 'Node.js', 'GraphQL', 'Jest'],
    primarySkill: 'frontend',
    skillProficiencies: {
      backend: 2,
      frontend: 2,
      uiux: 1,
      risk_data: 1,
      devops_sre: 2,
      qa_automation: 2
    }
  },
  {
    id: 'tm_5',
    name: 'Aisha Bello',
    role: 'SDET & Resiliency Automation',
    avatarBg: 'bg-purple-600',
    email: 'aisha@enterprise.io',
    totalWorkingDays: 10,
    ptoDays: 1,
    dailyFocusHours: 6.0,
    focusFactor: 0.80,
    ptsPerDay: 0.75,
    assignedMilestoneIds: ['ms_4'],
    skills: ['Playwright', 'Chaos Eng', 'eBPF', 'CI/CD'],
    primarySkill: 'qa_automation',
    skillProficiencies: {
      backend: 2,
      frontend: 1,
      uiux: 0,
      risk_data: 1,
      devops_sre: 2,
      qa_automation: 3
    }
  }
];

const DEFAULT_MILESTONES: RoadmapMilestoneTarget[] = [
  {
    id: 'ms_1',
    title: 'M1: Instant Risk Decisioning API (Sub-Second P99)',
    quarter: 'Q1',
    targetSprintDay: 3,
    requiredPoints: 8,
    assignedMemberIds: ['tm_1', 'tm_2'],
    status: 'IN_PROGRESS',
    confidenceScore: 92,
    theme: 'Core Engine Velocity',
    description: 'Underwrite B2B trade applications in < 800ms with automated EIN risk scoring.',
    skillDemands: [
      { domain: 'backend', points: 5, minProficiency: 2 },
      { domain: 'risk_data', points: 3, minProficiency: 3 }
    ]
  },
  {
    id: 'ms_2',
    title: 'M2: Automated ERP Reconciliation & Webhook Hub',
    quarter: 'Q1',
    targetSprintDay: 6,
    requiredPoints: 11,
    assignedMemberIds: ['tm_1', 'tm_4'],
    status: 'PENDING',
    confidenceScore: 88,
    theme: 'Platform Integrations',
    description: 'Bi-directional NetSuite and QuickBooks ledger auto-sync on invoice maturity.',
    skillDemands: [
      { domain: 'backend', points: 6, minProficiency: 2 },
      { domain: 'devops_sre', points: 3, minProficiency: 2 },
      { domain: 'qa_automation', points: 2, minProficiency: 2 }
    ]
  },
  {
    id: 'ms_3',
    title: 'M3: Multi-Currency Checkout Underwriting Modal',
    quarter: 'Q1',
    targetSprintDay: 8,
    requiredPoints: 9,
    assignedMemberIds: ['tm_3', 'tm_4'],
    status: 'PENDING',
    confidenceScore: 85,
    theme: 'Merchant Experience',
    description: 'Client-side zero-latency checkout embed with USD, EUR, and GBP support.',
    skillDemands: [
      { domain: 'frontend', points: 5, minProficiency: 2 },
      { domain: 'uiux', points: 4, minProficiency: 2 }
    ]
  },
  {
    id: 'ms_4',
    title: 'M4: Canary Deployment Validation & Audit Gate',
    quarter: 'Q1',
    targetSprintDay: 10,
    requiredPoints: 6,
    assignedMemberIds: ['tm_2', 'tm_5'],
    status: 'PENDING',
    confidenceScore: 95,
    theme: 'Security & Resiliency',
    description: 'Automated circuit breaker and zero-downtime traffic graduation in sandbox.',
    skillDemands: [
      { domain: 'devops_sre', points: 3, minProficiency: 2 },
      { domain: 'qa_automation', points: 2, minProficiency: 2 },
      { domain: 'backend', points: 1, minProficiency: 1 }
    ]
  }
];

export const DEFAULT_HISTORICAL_SPRINTS: HistoricalSprintRecord[] = [
  {
    id: 'sp_prev_4',
    name: 'Sprint 24: Core Gateway Foundation',
    cycle: 'Sep 08 – Sep 19',
    headcount: 5,
    pointsCommitted: 32,
    pointsDelivered: 30,
    completionRate: 94,
    focusFactor: 80,
    spilloverPoints: 2,
    unplannedPointsAdded: 3,
    ptsPerDevDay: 0.88,
    theme: 'Core Rails & Distributed Idempotency'
  },
  {
    id: 'sp_prev_3',
    name: 'Sprint 25: Automated Underwriting P99',
    cycle: 'Sep 22 – Oct 03',
    headcount: 5,
    pointsCommitted: 35,
    pointsDelivered: 33,
    completionRate: 94,
    focusFactor: 82,
    spilloverPoints: 2,
    unplannedPointsAdded: 1,
    ptsPerDevDay: 0.91,
    theme: 'Risk Engine Microservices'
  },
  {
    id: 'sp_prev_2',
    name: 'Sprint 26: ERP Ledger Auto-Reconcile',
    cycle: 'Oct 06 – Oct 17',
    headcount: 5,
    pointsCommitted: 30,
    pointsDelivered: 29,
    completionRate: 97,
    focusFactor: 85,
    spilloverPoints: 1,
    unplannedPointsAdded: 0,
    ptsPerDevDay: 0.89,
    theme: 'NetSuite & QuickBooks Integrations'
  },
  {
    id: 'sp_prev_1',
    name: 'Sprint 27: Multi-Currency Checkout V1',
    cycle: 'Oct 20 – Oct 31',
    headcount: 5,
    pointsCommitted: 36,
    pointsDelivered: 34,
    completionRate: 94,
    focusFactor: 78,
    spilloverPoints: 2,
    unplannedPointsAdded: 4,
    ptsPerDevDay: 0.92,
    theme: 'Global FX Liquidity Rails'
  }
];

export const CapacityPlanner: React.FC<CapacityPlannerProps> = ({
  selectedProductId,
  sprintStories,
  committedPoints,
  currentVelocity,
  onApplyVelocity,
  onAssignStoryMember,
  onNavigateTab
}) => {
  // Navigation within CapacityPlanner: Headcount Burn-down vs Team Skill Matrix
  const [activePlannerTab, setActivePlannerTab] = useState<'burndown' | 'skill_matrix'>('burndown');

  // Historical velocity toggle and dataset
  const [showHistoricalVelocity, setShowHistoricalVelocity] = useState<boolean>(true);
  const [historicalSprints, setHistoricalSprints] = useState<HistoricalSprintRecord[]>(DEFAULT_HISTORICAL_SPRINTS);

  // Team members roster
  const [teamMembers, setTeamMembers] = useState<TeamMemberAvailability[]>(DEFAULT_TEAM_MEMBERS);
  
  // Roadmap milestones
  const [milestones, setMilestones] = useState<RoadmapMilestoneTarget[]>(DEFAULT_MILESTONES);
  
  // Burn-down interactive day scrubber (Day 0 to 10)
  const [currentSprintDay, setCurrentSprintDay] = useState<number>(3);
  
  // Actual points burned per day override (for interactive simulation)
  const [dailyBurnedPoints, setDailyBurnedPoints] = useState<Record<number, number>>({
    1: 3,
    2: 4,
    3: 3
  });

  // UI state
  const [showAddMemberModal, setShowAddMemberModal] = useState<boolean>(false);
  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState<boolean>(false);
  const [selectedMilestoneId, setSelectedMilestoneId] = useState<string | null>('ms_1');
  const [appliedToast, setAppliedToast] = useState<string | null>(null);
  const [skillMatrixFilter, setSkillMatrixFilter] = useState<string>('ALL');

  // New member form state
  const [newMemberName, setNewMemberName] = useState<string>('');
  const [newMemberRole, setNewMemberRole] = useState<string>('Full-Stack Engineer');
  const [newMemberDays, setNewMemberDays] = useState<number>(10);
  const [newMemberPto, setNewMemberPto] = useState<number>(0);
  const [newMemberFocus, setNewMemberFocus] = useState<number>(80);
  const [newMemberPtsDay, setNewMemberPtsDay] = useState<number>(0.9);
  const [newMemberPrimarySkill, setNewMemberPrimarySkill] = useState<SkillDomain>('frontend');

  // New milestone form state
  const [newMilestoneTitle, setNewMilestoneTitle] = useState<string>('');
  const [newMilestoneDay, setNewMilestoneDay] = useState<number>(5);
  const [newMilestonePoints, setNewMilestonePoints] = useState<number>(8);
  const [newMilestoneTheme, setNewMilestoneTheme] = useState<string>('Core Delivery');

  // ==========================================
  // 1. CALCULATE TEAM CAPACITY & VELOCITY
  // ==========================================
  const capacityStats = useMemo(() => {
    let grossDays = 0;
    let totalPto = 0;
    let netDays = 0;
    let totalCalculatedPoints = 0;
    let weightedFocusSum = 0;

    const memberCapacities = teamMembers.map((m) => {
      const availableDays = Math.max(0, m.totalWorkingDays - m.ptoDays);
      const individualPts = Math.round(availableDays * m.focusFactor * m.ptsPerDay * 10) / 10;
      
      grossDays += m.totalWorkingDays;
      totalPto += m.ptoDays;
      netDays += availableDays;
      totalCalculatedPoints += individualPts;
      weightedFocusSum += availableDays * m.focusFactor;

      const assignedStories = sprintStories.filter((s) => s.assignee?.name === m.name);
      const assignedStoryPoints = assignedStories.reduce((sum, s) => sum + (s.points || 0), 0);
      const utilizationRate = individualPts > 0 ? Math.round((assignedStoryPoints / individualPts) * 100) : 0;

      return {
        ...m,
        availableDays,
        individualPts,
        assignedStoryPoints,
        assignedStoriesCount: assignedStories.length,
        utilizationRate
      };
    });

    const blendedFocusFactor = netDays > 0 ? Math.round((weightedFocusSum / netDays) * 100) : 80;
    const roundedVelocity = Math.round(totalCalculatedPoints);

    return {
      headcount: teamMembers.length,
      grossDays,
      totalPto,
      netDays,
      blendedFocusFactor,
      totalCalculatedPoints: Math.round(totalCalculatedPoints * 10) / 10,
      roundedVelocity,
      memberCapacities,
      bufferPoints: roundedVelocity - committedPoints,
      bufferPercentage: roundedVelocity > 0 ? Math.round(((roundedVelocity - committedPoints) / roundedVelocity) * 100) : 0
    };
  }, [teamMembers, sprintStories, committedPoints]);

  // ==========================================
  // 2. SKILL GAP & BOTTLENECK ANALYSIS ENGINE
  // ==========================================
  const skillAnalysis = useMemo(() => {
    const analysisResults: SkillGapAnalysisResult[] = SKILL_DOMAINS.map((domain) => {
      let totalSquadPointsAvailable = 0;
      const qualifiedMembers: string[] = [];
      let expertCount = 0;

      teamMembers.forEach((member) => {
        const prof: SkillProficiency = member.skillProficiencies?.[domain.key] ?? 0;
        if (prof >= 2) qualifiedMembers.push(member.name);
        if (prof === 3) expertCount++;

        // Weight available capacity by proficiency level
        // Level 3 (Expert) = 100% capacity contribution to this skill
        // Level 2 (Competent) = 75% capacity contribution
        // Level 1 (Novice) = 35% contribution
        // Level 0 = 0%
        const weight = prof === 3 ? 1.0 : prof === 2 ? 0.75 : prof === 1 ? 0.35 : 0;
        const memberCapacity = capacityStats.memberCapacities.find((m) => m.id === member.id)?.individualPts || 7.0;
        totalSquadPointsAvailable += memberCapacity * weight;
      });

      // Sum points demanded by active roadmap milestones
      let totalMilestonePointsDemanded = 0;
      milestones.forEach((ms) => {
        const demand = ms.skillDemands?.find((d) => d.domain === domain.key);
        if (demand) {
          totalMilestonePointsDemanded += demand.points;
        }
      });

      const netDeltaPoints = Math.round((totalSquadPointsAvailable - totalMilestonePointsDemanded) * 10) / 10;
      const coverageRatioPercent = totalMilestonePointsDemanded > 0
        ? Math.round((totalSquadPointsAvailable / totalMilestonePointsDemanded) * 100)
        : 100;

      // Single Point of Failure (SPOF): only 1 member has >= 2 proficiency and there is milestone demand
      const isSinglePointOfFailure = qualifiedMembers.length === 1 && totalMilestonePointsDemanded > 0;

      let status: 'OPTIMAL' | 'MODERATE_SURPLUS' | 'BOTTLENECK_DEFICIT' | 'CRITICAL_DEFICIT' = 'OPTIMAL';
      if (coverageRatioPercent < 80 || netDeltaPoints < -2.0) {
        status = 'CRITICAL_DEFICIT';
      } else if (coverageRatioPercent < 100 || netDeltaPoints < 0) {
        status = 'BOTTLENECK_DEFICIT';
      } else if (coverageRatioPercent > 160) {
        status = 'MODERATE_SURPLUS';
      } else {
        status = 'OPTIMAL';
      }

      // Generate context-aware PM recommendation
      let recommendation = `Adequate skill coverage (${coverageRatioPercent}% ratio).`;
      if (status === 'CRITICAL_DEFICIT') {
        recommendation = `Severe resource bottleneck! Demand exceeds squad capacity by ${Math.abs(netDeltaPoints)} pts. Rebalance sprint scope or cross-train a secondary engineer.`;
      } else if (status === 'BOTTLENECK_DEFICIT') {
        recommendation = `Tight capacity deficit (${Math.abs(netDeltaPoints)} pts deficit). Vacation/PTO during this sprint poses delivery delay risk.`;
      } else if (isSinglePointOfFailure) {
        recommendation = `Single Point of Failure (SPOF): Only ${qualifiedMembers[0]} is qualified. Pair with a secondary engineer for risk mitigation.`;
      } else if (status === 'MODERATE_SURPLUS') {
        recommendation = `Surplus bandwidth (+${netDeltaPoints} pts). Squad can assist adjacent bottleneck domains or pull forward backlog epics.`;
      }

      return {
        domain: domain.key,
        domainName: domain.name,
        totalSquadPointsAvailable: Math.round(totalSquadPointsAvailable * 10) / 10,
        totalMilestonePointsDemanded,
        netDeltaPoints,
        coverageRatioPercent,
        status,
        qualifiedMemberCount: qualifiedMembers.length,
        expertCount,
        isSinglePointOfFailure,
        assignedMembers: qualifiedMembers,
        recommendation
      };
    });

    const totalBottlenecks = analysisResults.filter(
      (r) => r.status === 'CRITICAL_DEFICIT' || r.status === 'BOTTLENECK_DEFICIT'
    ).length;

    const spofCount = analysisResults.filter((r) => r.isSinglePointOfFailure).length;

    return {
      results: analysisResults,
      totalBottlenecks,
      spofCount
    };
  }, [teamMembers, milestones, capacityStats.memberCapacities]);

  // Milestone-by-milestone skill audits & capacity demand analysis
  const milestoneSkillAudits = useMemo(() => {
    const totalTeamCapacity = capacityStats.roundedVelocity;

    return milestones.map((ms) => {
      const assignedMembers = teamMembers.filter((m) => ms.assignedMemberIds.includes(m.id));

      // Calculate capacity available strictly from assigned members
      const assignedCapacityPts = Math.round(
        assignedMembers.reduce((sum, m) => {
          const cap = capacityStats.memberCapacities.find((c) => c.id === m.id);
          return sum + (cap?.individualPts || 0);
        }, 0) * 10
      ) / 10;

      // Ratio of milestone demand to assigned capacity
      const demandVsAssignedPercent = assignedCapacityPts > 0 
        ? Math.round((ms.requiredPoints / assignedCapacityPts) * 100)
        : 100;

      // Ratio of milestone demand to total squad velocity
      const demandVsTotalTeamPercent = totalTeamCapacity > 0
        ? Math.round((ms.requiredPoints / totalTeamCapacity) * 100)
        : 100;

      // Check if demand exceeds assigned capacity or total capacity
      const exceedsAssignedCapacity = ms.requiredPoints > assignedCapacityPts;
      const exceedsTotalCapacity = ms.requiredPoints > totalTeamCapacity;
      const assignedDeficit = Math.max(0, Math.round((ms.requiredPoints - assignedCapacityPts) * 10) / 10);
      const totalDeficit = Math.max(0, Math.round((ms.requiredPoints - totalTeamCapacity) * 10) / 10);

      // Color-coded alert level:
      // 'SAFE' (< 80%), 'BALANCED' (80-100%), 'WARNING' (100-120%), 'CRITICAL' (> 120% or exceeds total capacity)
      let capacityAlertLevel: 'SAFE' | 'BALANCED' | 'WARNING' | 'CRITICAL' = 'SAFE';
      if (exceedsTotalCapacity || demandVsAssignedPercent > 120 || (exceedsAssignedCapacity && assignedDeficit >= 2)) {
        capacityAlertLevel = 'CRITICAL';
      } else if (exceedsAssignedCapacity || demandVsAssignedPercent >= 100) {
        capacityAlertLevel = 'WARNING';
      } else if (demandVsAssignedPercent >= 80) {
        capacityAlertLevel = 'BALANCED';
      }

      const missingSkills: Array<{ domain: SkillDomain; requiredPoints: number; reason: string }> = [];
      const satisfiedSkills: Array<{ domain: SkillDomain; points: number; qualifiedNames: string[] }> = [];

      (ms.skillDemands || []).forEach((demand) => {
        // Check if assigned members have this skill with proficiency >= (demand.minProficiency || 2)
        const qualifiedAssigned = assignedMembers.filter(
          (m) => (m.skillProficiencies?.[demand.domain] ?? 0) >= (demand.minProficiency || 2)
        );

        if (qualifiedAssigned.length === 0) {
          missingSkills.push({
            domain: demand.domain,
            requiredPoints: demand.points,
            reason: `None of the assigned members (${assignedMembers.map((m) => m.name).join(', ')}) possess proficiency ≥ ${demand.minProficiency || 2} in ${demand.domain}.`
          });
        } else {
          satisfiedSkills.push({
            domain: demand.domain,
            points: demand.points,
            qualifiedNames: qualifiedAssigned.map((m) => m.name)
          });
        }
      });

      const hasGaps = missingSkills.length > 0;

      return {
        ...ms,
        assignedMembers,
        assignedCapacityPts,
        totalTeamCapacity,
        demandVsAssignedPercent,
        demandVsTotalTeamPercent,
        exceedsAssignedCapacity,
        exceedsTotalCapacity,
        assignedDeficit,
        totalDeficit,
        capacityAlertLevel,
        missingSkills,
        satisfiedSkills,
        hasGaps,
        auditStatus: hasGaps ? ('SKILL_GAP' as const) : ('BALANCED' as const)
      };
    });
  }, [milestones, teamMembers, capacityStats]);

  // Aggregate roadmap milestones demand vs squad velocity summary
  const roadmapDemandSummary = useMemo(() => {
    const totalDemandedPoints = milestones.reduce((sum, m) => sum + (m.requiredPoints || 0), 0);
    const totalTeamCapacity = capacityStats.roundedVelocity;
    const isExceedingTotalCapacity = totalDemandedPoints > totalTeamCapacity;
    const totalDeficitPoints = Math.max(0, Math.round((totalDemandedPoints - totalTeamCapacity) * 10) / 10);
    const overallUtilizationPercent = totalTeamCapacity > 0
      ? Math.round((totalDemandedPoints / totalTeamCapacity) * 100)
      : 100;

    const milestonesExceedingCapacity = milestoneSkillAudits.filter(
      (m) => m.exceedsAssignedCapacity || m.exceedsTotalCapacity
    );

    return {
      totalDemandedPoints,
      totalTeamCapacity,
      isExceedingTotalCapacity,
      totalDeficitPoints,
      overallUtilizationPercent,
      overCapacityCount: milestonesExceedingCapacity.length,
      hasAnyOverCapacity: isExceedingTotalCapacity || milestonesExceedingCapacity.length > 0
    };
  }, [milestones, capacityStats.roundedVelocity, milestoneSkillAudits]);

  // ==========================================
  // 2c. HISTORICAL VELOCITY & PREDICTIVE ANALYTICS ENGINE
  // ==========================================
  const historicalAnalytics = useMemo(() => {
    const count = historicalSprints.length;
    const totalDelivered = historicalSprints.reduce((sum, s) => sum + s.pointsDelivered, 0);
    const totalCommitted = historicalSprints.reduce((sum, s) => sum + s.pointsCommitted, 0);
    const avgDelivered = Math.round((totalDelivered / Math.max(1, count)) * 10) / 10;
    const avgCommitted = Math.round((totalCommitted / Math.max(1, count)) * 10) / 10;
    const avgCompletionRate = Math.round(
      (historicalSprints.reduce((sum, s) => sum + s.completionRate, 0) / Math.max(1, count)) * 10
    ) / 10;
    const avgFocusFactor = Math.round(
      historicalSprints.reduce((sum, s) => sum + s.focusFactor, 0) / Math.max(1, count)
    );
    const avgPtsPerDay = Math.round(
      (historicalSprints.reduce((sum, s) => sum + s.ptsPerDevDay, 0) / Math.max(1, count)) * 100
    ) / 100;

    // Current forecast comparison
    const currentForecast = capacityStats.roundedVelocity;
    const varianceFromHistorical = Math.round((currentForecast - avgDelivered) * 10) / 10;
    const variancePercent = avgDelivered > 0 
      ? Math.round(((currentForecast - avgDelivered) / avgDelivered) * 100) 
      : 0;

    // Predictability confidence scoring & bias guidance
    let predictabilityConfidence: 'HIGH' | 'MODERATE' | 'LOW' = 'HIGH';
    let predictabilityScore = 95;
    let recommendation = 'Forecast is closely aligned with rolling historical delivery rate (±5%). High predictability.';

    const absVariance = Math.abs(variancePercent);
    if (absVariance <= 10) {
      predictabilityConfidence = 'HIGH';
      predictabilityScore = Math.max(88, 96 - Math.round(absVariance * 0.8));
      recommendation = `Forecast (${currentForecast} pts) is within ±${absVariance}% of the ${count}-sprint historical average (${avgDelivered} pts). High confidence in sprint realization.`;
    } else if (absVariance <= 20) {
      predictabilityConfidence = 'MODERATE';
      predictabilityScore = Math.max(78, 88 - Math.round((absVariance - 10) * 0.9));
      recommendation = variancePercent > 0
        ? `Optimistic velocity bias (+${variancePercent}% above historical mean of ${avgDelivered} pts). Monitor Day 3 burn checkpoint closely.`
        : `Conservative velocity forecast (${variancePercent}% below historical mean of ${avgDelivered} pts). Squad has bandwidth to absorb stretch backlog.`;
    } else {
      predictabilityConfidence = 'LOW';
      predictabilityScore = Math.max(62, 75 - Math.round((absVariance - 20) * 0.8));
      recommendation = variancePercent > 0
        ? `Aggressive forecast warning! Planned velocity (${currentForecast} pts) is +${variancePercent}% higher than historical mean (${avgDelivered} pts). Spillover risk is elevated.`
        : `Substantial under-capacity planned (${variancePercent}% below historical avg). Risk of under-utilizing dev bandwidth.`;
    }

    const minDelivered = Math.min(...historicalSprints.map((s) => s.pointsDelivered));
    const maxDelivered = Math.max(...historicalSprints.map((s) => s.pointsDelivered));

    return {
      count,
      avgDelivered,
      avgCommitted,
      avgCompletionRate,
      avgFocusFactor,
      avgPtsPerDay,
      minDelivered,
      maxDelivered,
      currentForecast,
      varianceFromHistorical,
      variancePercent,
      predictabilityConfidence,
      predictabilityScore,
      recommendation
    };
  }, [historicalSprints, capacityStats.roundedVelocity]);

  // ==========================================
  // 3. BURN-DOWN TRAJECTORY SIMULATION
  // ==========================================
  const burnDownData: BurnDownDayPoint[] = useMemo(() => {
    const totalCommitted = committedPoints > 0 ? committedPoints : capacityStats.roundedVelocity;
    const days: BurnDownDayPoint[] = [];
    const totalDays = 10;

    let runningActual = totalCommitted;
    const historicalAvg = historicalAnalytics.avgDelivered;
    const historicalBurnFractions = [1.0, 0.93, 0.84, 0.73, 0.61, 0.49, 0.37, 0.25, 0.14, 0.06, 0.0];

    for (let day = 0; day <= totalDays; day++) {
      const idealRemaining = Math.max(0, Math.round((totalCommitted - (totalCommitted / totalDays) * day) * 10) / 10);

      let dayBurnWeight = 1.0;
      if (day === 1) dayBurnWeight = 0.7;
      else if (day >= 3 && day <= 7) dayBurnWeight = 1.15;
      else if (day >= 8) dayBurnWeight = 0.9;

      const cumulativeExpectedBurn = Math.min(totalCommitted, (totalCommitted / totalDays) * day * 1.02);
      const projectedRemaining = Math.max(0, Math.round((totalCommitted - cumulativeExpectedBurn) * 10) / 10);

      let actualRemaining: number | undefined = undefined;
      let completedPointsToday = 0;

      if (day === 0) {
        actualRemaining = totalCommitted;
      } else if (day <= currentSprintDay) {
        completedPointsToday = dailyBurnedPoints[day] !== undefined 
          ? dailyBurnedPoints[day] 
          : Math.round((totalCommitted / totalDays) * (day === 2 ? 1.3 : day === 3 ? 1.1 : 1.0));
        runningActual = Math.max(0, runningActual - completedPointsToday);
        actualRemaining = runningActual;
      }

      const milestoneTarget = milestones.find((m) => m.targetSprintDay === day);
      const historicalRemaining = Math.max(0, Math.round(historicalAvg * historicalBurnFractions[day] * 10) / 10);

      days.push({
        day,
        dayLabel: day === 0 ? 'Start' : `Day ${day}`,
        dateStr: `Sprint Day ${day}`,
        idealRemaining,
        projectedRemaining,
        actualRemaining,
        historicalRemaining,
        milestonePointsRemaining: milestoneTarget ? milestoneTarget.requiredPoints : undefined,
        completedPointsToday
      });
    }

    return days;
  }, [committedPoints, capacityStats.roundedVelocity, currentSprintDay, dailyBurnedPoints, milestones, historicalAnalytics.avgDelivered]);

  // Current burn-down pacing diagnostics
  const burnDownDiagnostics = useMemo(() => {
    const currentPoint = burnDownData.find((d) => d.day === currentSprintDay);
    if (!currentPoint || currentPoint.actualRemaining === undefined) {
      return { status: 'ON_TRACK', diff: 0, label: 'On Track', color: 'text-emerald-400' };
    }

    const diff = Math.round((currentPoint.idealRemaining - currentPoint.actualRemaining) * 10) / 10;
    if (diff > 1.5) {
      return {
        status: 'AHEAD',
        diff,
        label: `${diff} pts ahead of schedule 🚀`,
        color: 'text-emerald-400',
        bg: 'bg-emerald-950/80 border-emerald-500/50'
      };
    } else if (diff < -2.0) {
      return {
        status: 'BEHIND',
        diff: Math.abs(diff),
        label: `${Math.abs(diff)} pts behind schedule ⚠️`,
        color: 'text-rose-400',
        bg: 'bg-rose-950/80 border-rose-500/50'
      };
    }
    return {
      status: 'ON_TRACK',
      diff,
      label: 'On Schedule (Nominal)',
      color: 'text-teal-400',
      bg: 'bg-teal-950/80 border-teal-500/50'
    };
  }, [burnDownData, currentSprintDay]);

  // ==========================================
  // HANDLERS
  // ==========================================
  const handleApplyCalculatedVelocity = () => {
    onApplyVelocity(capacityStats.roundedVelocity);
    setAppliedToast(`Applied ${capacityStats.roundedVelocity} pts capacity to Active Sprint!`);
    setTimeout(() => setAppliedToast(null), 4000);
  };

  const handleCalibrateToHistorical = () => {
    const target = Math.round(historicalAnalytics.avgDelivered);
    onApplyVelocity(target);
    setAppliedToast(`Calibrated Sprint Forecast to Historical Rolling Average (${target} pts)!`);
    setTimeout(() => setAppliedToast(null), 4000);
  };

  const handleUpdateMemberPto = (id: string, delta: number) => {
    setTeamMembers((prev) =>
      prev.map((m) => {
        if (m.id === id) {
          const nextPto = Math.max(0, Math.min(m.totalWorkingDays, m.ptoDays + delta));
          return { ...m, ptoDays: nextPto };
        }
        return m;
      })
    );
  };

  const handleUpdateMemberFocus = (id: string, newFocus: number) => {
    setTeamMembers((prev) =>
      prev.map((m) => (m.id === id ? { ...m, focusFactor: newFocus } : m))
    );
  };

  // Interactive Skill Proficiency Cycle: 0 -> 1 -> 2 -> 3 -> 0
  const handleCycleSkillProficiency = (memberId: string, domainKey: SkillDomain) => {
    setTeamMembers((prev) =>
      prev.map((m) => {
        if (m.id === memberId) {
          const current = m.skillProficiencies?.[domainKey] ?? 0;
          const nextProf = ((current + 1) % 4) as SkillProficiency;
          return {
            ...m,
            skillProficiencies: {
              ...m.skillProficiencies,
              [domainKey]: nextProf
            }
          };
        }
        return m;
      })
    );
  };

  const handleToggleMemberMilestone = (memberId: string, milestoneId: string) => {
    setTeamMembers((prev) =>
      prev.map((m) => {
        if (m.id === memberId) {
          const has = m.assignedMilestoneIds.includes(milestoneId);
          return {
            ...m,
            assignedMilestoneIds: has
              ? m.assignedMilestoneIds.filter((x) => x !== milestoneId)
              : [...m.assignedMilestoneIds, milestoneId]
          };
        }
        return m;
      })
    );
  };

  // Rebalance recommendation action: auto-assign qualified member to resolve gap
  const handleResolveMilestoneGap = (milestoneId: string, missingDomain: SkillDomain) => {
    // Find squad member who has highest proficiency in missingDomain
    const bestCandidate = [...teamMembers].sort((a, b) => {
      const pB = b.skillProficiencies?.[missingDomain] ?? 0;
      const pA = a.skillProficiencies?.[missingDomain] ?? 0;
      return pB - pA;
    })[0];

    if (!bestCandidate) return;

    // Assign bestCandidate to milestone
    setMilestones((prev) =>
      prev.map((ms) => {
        if (ms.id === milestoneId && !ms.assignedMemberIds.includes(bestCandidate.id)) {
          return {
            ...ms,
            assignedMemberIds: [...ms.assignedMemberIds, bestCandidate.id]
          };
        }
        return ms;
      })
    );

    // Also update member's assignedMilestoneIds
    setTeamMembers((prev) =>
      prev.map((m) => {
        if (m.id === bestCandidate.id && !m.assignedMilestoneIds.includes(milestoneId)) {
          return {
            ...m,
            assignedMilestoneIds: [...m.assignedMilestoneIds, milestoneId]
          };
        }
        return m;
      })
    );

    setAppliedToast(`Assigned ${bestCandidate.name} (${missingDomain}) to ${milestoneId.toUpperCase()} to resolve skill gap!`);
    setTimeout(() => setAppliedToast(null), 4000);
  };

  // Dynamically adjust milestone required points to test capacity thresholds
  const handleUpdateMilestonePoints = (milestoneId: string, delta: number) => {
    setMilestones((prev) =>
      prev.map((ms) => {
        if (ms.id === milestoneId) {
          const nextPoints = Math.max(1, ms.requiredPoints + delta);
          const ratio = nextPoints / (ms.requiredPoints || 1);
          const nextDemands = (ms.skillDemands || []).map((d) => ({
            ...d,
            points: Math.max(1, Math.round(d.points * ratio))
          }));
          return {
            ...ms,
            requiredPoints: nextPoints,
            skillDemands: nextDemands
          };
        }
        return ms;
      })
    );
  };

  // Auto-staff additional squad engineers to resolve a capacity deficit
  const handleAutoStaffMilestone = (milestoneId: string) => {
    const ms = milestones.find((m) => m.id === milestoneId);
    if (!ms) return;

    // Find squad members not yet assigned to this milestone
    const unassigned = teamMembers.filter((m) => !ms.assignedMemberIds.includes(m.id));
    if (unassigned.length === 0) {
      setAppliedToast(`All squad members are already assigned to ${ms.title.slice(0, 30)}`);
      setTimeout(() => setAppliedToast(null), 3000);
      return;
    }

    // Pick unassigned member with highest available points
    const bestMember = [...unassigned].sort((a, b) => {
      const capA = capacityStats.memberCapacities.find((c) => c.id === a.id)?.individualPts || 0;
      const capB = capacityStats.memberCapacities.find((c) => c.id === b.id)?.individualPts || 0;
      return capB - capA;
    })[0];

    // Assign to milestone
    setMilestones((prev) =>
      prev.map((item) => {
        if (item.id === milestoneId) {
          return {
            ...item,
            assignedMemberIds: [...item.assignedMemberIds, bestMember.id]
          };
        }
        return item;
      })
    );

    // Also update member's assignedMilestoneIds
    setTeamMembers((prev) =>
      prev.map((m) => {
        if (m.id === bestMember.id && !m.assignedMilestoneIds.includes(milestoneId)) {
          return {
            ...m,
            assignedMilestoneIds: [...m.assignedMilestoneIds, milestoneId]
          };
        }
        return m;
      })
    );

    setAppliedToast(`Auto-staffed ${bestMember.name} to ${ms.title.slice(0, 25)} (+capacity added)!`);
    setTimeout(() => setAppliedToast(null), 4000);
  };

  // One-click cap milestone demand to match available capacity
  const handleCapMilestoneDemand = (milestoneId: string, maxPoints: number) => {
    const targetPoints = Math.max(1, Math.floor(maxPoints));
    setMilestones((prev) =>
      prev.map((ms) => {
        if (ms.id === milestoneId) {
          const ratio = targetPoints / (ms.requiredPoints || 1);
          const nextDemands = (ms.skillDemands || []).map((d) => ({
            ...d,
            points: Math.max(1, Math.round(d.points * ratio))
          }));
          return {
            ...ms,
            requiredPoints: targetPoints,
            skillDemands: nextDemands
          };
        }
        return ms;
      })
    );
    setAppliedToast(`Recalibrated milestone demand to ${targetPoints} pts to match assigned team capacity!`);
    setTimeout(() => setAppliedToast(null), 4000);
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    const bgColors = ['bg-indigo-600', 'bg-emerald-600', 'bg-cyan-600', 'bg-amber-600', 'bg-purple-600', 'bg-rose-600', 'bg-teal-600'];
    const randomBg = bgColors[teamMembers.length % bgColors.length];

    const defaultProf: Record<SkillDomain, SkillProficiency> = {
      backend: newMemberPrimarySkill === 'backend' ? 3 : 1,
      frontend: newMemberPrimarySkill === 'frontend' ? 3 : 1,
      uiux: newMemberPrimarySkill === 'uiux' ? 3 : 0,
      risk_data: newMemberPrimarySkill === 'risk_data' ? 3 : 0,
      devops_sre: newMemberPrimarySkill === 'devops_sre' ? 3 : 1,
      qa_automation: newMemberPrimarySkill === 'qa_automation' ? 3 : 2
    };

    const newMember: TeamMemberAvailability = {
      id: `tm_${Date.now()}`,
      name: newMemberName.trim(),
      role: newMemberRole,
      avatarBg: randomBg,
      totalWorkingDays: newMemberDays,
      ptoDays: newMemberPto,
      dailyFocusHours: 6.5,
      focusFactor: newMemberFocus / 100,
      ptsPerDay: newMemberPtsDay,
      assignedMilestoneIds: ['ms_1'],
      skills: ['Full-Stack', 'Delivery'],
      primarySkill: newMemberPrimarySkill,
      skillProficiencies: defaultProf
    };

    setTeamMembers([...teamMembers, newMember]);
    setNewMemberName('');
    setShowAddMemberModal(false);
  };

  const handleRemoveMember = (id: string) => {
    if (teamMembers.length <= 1) return;
    setTeamMembers(teamMembers.filter((m) => m.id !== id));
  };

  const handleAddMilestone = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMilestoneTitle.trim()) return;

    const newMs: RoadmapMilestoneTarget = {
      id: `ms_${Date.now()}`,
      title: newMilestoneTitle.trim(),
      quarter: 'Q1',
      targetSprintDay: newMilestoneDay,
      requiredPoints: newMilestonePoints,
      assignedMemberIds: [teamMembers[0].id],
      status: 'PENDING',
      confidenceScore: 90,
      theme: newMilestoneTheme,
      skillDemands: [
        { domain: 'backend', points: Math.ceil(newMilestonePoints * 0.6), minProficiency: 2 },
        { domain: 'frontend', points: Math.floor(newMilestonePoints * 0.4), minProficiency: 2 }
      ]
    };

    setMilestones([...milestones, newMs]);
    setNewMilestoneTitle('');
    setShowAddMilestoneModal(false);
  };

  // Helper to render proficiency dots
  const renderProficiencyBadge = (level: SkillProficiency) => {
    switch (level) {
      case 3:
        return (
          <div className="flex items-center space-x-1 text-emerald-400 font-bold" title="Level 3: Expert / Staff Lead (100% capacity contribution)">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span className="text-[10px] ml-1 font-mono">Expert</span>
          </div>
        );
      case 2:
        return (
          <div className="flex items-center space-x-1 text-cyan-400 font-semibold" title="Level 2: Competent / Production (75% capacity contribution)">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            <span className="text-[10px] ml-1 font-mono">Competent</span>
          </div>
        );
      case 1:
        return (
          <div className="flex items-center space-x-1 text-amber-400" title="Level 1: Novice / Learning (35% capacity contribution)">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-700" />
            <span className="text-[10px] ml-1 font-mono">Novice</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-1 text-slate-600" title="Level 0: None / Untrained (0% capacity contribution)">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            <span className="w-1.5 h-1.5 rounded-full bg-slate-800" />
            <span className="text-[10px] ml-1 font-mono text-slate-500">—</span>
          </div>
        );
    }
  };

  const getDomainIcon = (domainKey: SkillDomain) => {
    switch (domainKey) {
      case 'backend': return <Server className="w-3.5 h-3.5 text-indigo-400" />;
      case 'frontend': return <Code className="w-3.5 h-3.5 text-cyan-400" />;
      case 'uiux': return <Palette className="w-3.5 h-3.5 text-fuchsia-400" />;
      case 'risk_data': return <Brain className="w-3.5 h-3.5 text-amber-400" />;
      case 'devops_sre': return <Cpu className="w-3.5 h-3.5 text-teal-400" />;
      case 'qa_automation': return <CheckCheck className="w-3.5 h-3.5 text-purple-400" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. CAPACITY PLANNER HERO & APPLIED NOTIFICATION */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-indigo-500/30 p-6 shadow-2xl">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-72 h-72 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-950/90 border border-indigo-700/80 text-indigo-300 text-xs font-semibold">
              <Users className="w-3.5 h-3.5 text-indigo-400" />
              <span>RESOURCE ALLOCATION & TEAM SKILL MATRIX</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight flex items-center gap-2">
              <span>Squad Capacity & Roadmap Skill Bottleneck Engine</span>
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              Map member technical expertise across Frontend, Backend, UI/UX, and ML Risk to active roadmap milestones to eliminate resource bottlenecks, prevent single points of failure, and forecast real-time burn-down pacing.
            </p>
          </div>

          {/* Quick Velocity Sync Call-to-Action */}
          <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 text-center sm:text-left">
              <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                Modelled Velocity
              </span>
              <span className="text-2xl font-black font-mono text-indigo-400">
                {capacityStats.roundedVelocity} <span className="text-xs font-sans text-slate-400">pts / 2wks</span>
              </span>
            </div>

            <button
              onClick={handleApplyCalculatedVelocity}
              className="w-full sm:w-auto px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-emerald-600 to-indigo-600 hover:from-indigo-500 hover:to-emerald-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/60 flex items-center justify-center space-x-2 transition-all transform active:scale-95 cursor-pointer"
            >
              <Zap className="w-4 h-4 text-amber-300" />
              <span>Apply to Sprint ({capacityStats.roundedVelocity} pts)</span>
            </button>
          </div>
        </div>

        {appliedToast && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 text-xs font-semibold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>{appliedToast}</span>
            </div>
          </div>
        )}
      </div>

      {/* 2. SUB-VIEW SWITCHER: Headcount & Burn-down vs Team Skill Matrix */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-950 p-1.5 rounded-2xl border border-slate-800">
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => setActivePlannerTab('burndown')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activePlannerTab === 'burndown'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <TrendingDown className="w-4 h-4 text-emerald-300" />
            <span>Headcount Capacity & Real-Time Burn-Down</span>
          </button>

          <button
            type="button"
            onClick={() => setActivePlannerTab('skill_matrix')}
            className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center space-x-2 transition-all cursor-pointer ${
              activePlannerTab === 'skill_matrix'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
            }`}
          >
            <Brain className="w-4 h-4 text-indigo-300" />
            <span>Team Skill Matrix & Milestone Bottlenecks</span>
            {skillAnalysis.totalBottlenecks > 0 ? (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-rose-500 text-white animate-pulse">
                {skillAnalysis.totalBottlenecks} Bottlenecks
              </span>
            ) : (
              <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                Balanced
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center space-x-3 text-xs px-3 py-1">
          <span className="text-slate-400 font-semibold">Skill Deficits:</span>
          <span className={`font-mono font-bold ${skillAnalysis.totalBottlenecks > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            {skillAnalysis.totalBottlenecks} Gaps
          </span>
          <span className="text-slate-700">·</span>
          <span className="text-slate-400 font-semibold">Milestone Demand:</span>
          <span className={`font-mono font-bold ${roadmapDemandSummary.hasAnyOverCapacity ? 'text-rose-400' : 'text-emerald-400'}`}>
            {roadmapDemandSummary.overallUtilizationPercent}% {roadmapDemandSummary.hasAnyOverCapacity ? '⚠️ (Deficit)' : '(Nominal)'}
          </span>
        </div>
      </div>

      {/* 2b. EXECUTIVE CAPACITY DEFICIT ALERT BANNER */}
      {roadmapDemandSummary.hasAnyOverCapacity && (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/80 via-rose-900/60 to-slate-900 border border-rose-600 text-rose-200 shadow-xl space-y-3 animate-fadeIn">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <div className="p-2.5 rounded-xl bg-rose-900/90 border border-rose-500 shadow-md shrink-0">
                <AlertTriangle className="w-5 h-5 text-rose-200 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                  <span>Milestone Resource Demand Exceeds Team Capacity!</span>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-600 text-white shadow-xs">
                    {roadmapDemandSummary.overCapacityCount} Milestone(s) in Deficit
                  </span>
                </h4>
                <p className="text-xs text-rose-300/90 mt-0.5 leading-relaxed">
                  Total roadmap milestone demand is <strong>{roadmapDemandSummary.totalDemandedPoints} pts</strong> against total calculated team velocity of <strong>{roadmapDemandSummary.totalTeamCapacity} pts</strong> ({roadmapDemandSummary.overallUtilizationPercent}% load). One or more roadmap milestones demand more story points than available team bandwidth.
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2 shrink-0">
              <span className="text-xs font-mono font-bold px-3 py-1.5 rounded-xl bg-rose-950 border border-rose-700 text-rose-300">
                -{roadmapDemandSummary.totalDeficitPoints}p Deficit
              </span>
            </div>
          </div>

          {/* Color-Coded Aggregate Capacity Meter Bar */}
          <div className="space-y-1.5 pt-2 border-t border-rose-800/60">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-rose-300 text-[11px] font-semibold">Total Milestone Demand vs Team Velocity:</span>
              <span className="font-bold text-white">
                {roadmapDemandSummary.totalDemandedPoints} pts demanded / {roadmapDemandSummary.totalTeamCapacity} pts velocity ({roadmapDemandSummary.overallUtilizationPercent}%)
              </span>
            </div>
            <div className="w-full bg-slate-950 rounded-full h-3 overflow-hidden border border-rose-700/80 relative">
              <div
                className="h-full rounded-full transition-all duration-300 bg-gradient-to-r from-rose-500 via-red-600 to-rose-400 animate-pulse shadow-md shadow-rose-950"
                style={{ width: `${Math.min(100, (roadmapDemandSummary.totalDemandedPoints / Math.max(1, roadmapDemandSummary.totalTeamCapacity)) * 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* CONDITIONAL SUB-VIEW: 1. BURN-DOWN VIEW vs 2. SKILL MATRIX VIEW */}
      {activePlannerTab === 'skill_matrix' ? (
        /* =========================================================================
           VIEW B: TEAM SKILL MATRIX & ROADMAP BOTTLENECK ENGINE
           ========================================================================= */
        <div className="space-y-6 animate-fadeIn">
          {/* A. BOTTLENECK & RESOURCE GAP EXECUTIVE ALERTS */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                <ShieldAlert className="w-4 h-4 text-amber-400" />
                <span>Resource Bottleneck & Skill Deficit Diagnostics</span>
              </h3>
              <span className="text-xs text-slate-400">
                Evaluated against {milestones.length} active roadmap milestones ({milestones.reduce((s, m) => s + m.requiredPoints, 0)} total demanded pts)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {skillAnalysis.results.map((item) => {
                const descriptor = SKILL_DOMAINS.find((d) => d.key === item.domain)!;
                const isDeficit = item.status === 'CRITICAL_DEFICIT' || item.status === 'BOTTLENECK_DEFICIT';

                return (
                  <div
                    key={item.domain}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                      item.status === 'CRITICAL_DEFICIT'
                        ? 'bg-rose-950/40 border-rose-800/80 shadow-md shadow-rose-950/30'
                        : item.status === 'BOTTLENECK_DEFICIT'
                        ? 'bg-amber-950/40 border-amber-800/80 shadow-md shadow-amber-950/20'
                        : item.isSinglePointOfFailure
                        ? 'bg-amber-950/30 border-amber-800/60'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div className={`p-1.5 rounded-lg ${descriptor.bgColor} border ${descriptor.borderColor}`}>
                            {getDomainIcon(item.domain)}
                          </div>
                          <h4 className="text-xs font-bold text-slate-100">{descriptor.shortLabel}</h4>
                        </div>

                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                            item.status === 'CRITICAL_DEFICIT'
                              ? 'bg-rose-950 text-rose-300 border-rose-700'
                              : item.status === 'BOTTLENECK_DEFICIT'
                              ? 'bg-amber-950 text-amber-300 border-amber-700'
                              : item.status === 'MODERATE_SURPLUS'
                              ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          }`}
                        >
                          {item.status === 'CRITICAL_DEFICIT'
                            ? 'Critical Bottleneck'
                            : item.status === 'BOTTLENECK_DEFICIT'
                            ? 'Pacing Deficit'
                            : item.status === 'MODERATE_SURPLUS'
                            ? 'Surplus Capacity'
                            : 'Optimal Ratio'}
                        </span>
                      </div>

                      {/* Coverage Progress Bar */}
                      <div className="space-y-1.5 mt-2">
                        <div className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-400 text-[11px]">Squad Available / Milestone Demand:</span>
                          <span className="font-bold text-slate-200">
                            {item.totalSquadPointsAvailable}p / <span className={descriptor.color}>{item.totalMilestonePointsDemanded}p</span>
                          </span>
                        </div>
                        <div className="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isDeficit ? 'bg-rose-500' : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, item.coverageRatioPercent)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-slate-400">
                          <span>{item.coverageRatioPercent}% Coverage</span>
                          <span className={item.netDeltaPoints >= 0 ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                            {item.netDeltaPoints >= 0 ? `+${item.netDeltaPoints}p Net Buffer` : `${item.netDeltaPoints}p Skill Deficit`}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Recommendation & SPOF Indicator */}
                    <div className="pt-2 border-t border-slate-800/80 space-y-1.5 text-[11px]">
                      {item.isSinglePointOfFailure && (
                        <div className="flex items-center space-x-1.5 text-amber-400 font-bold">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Single Point of Failure (SPOF) Risk</span>
                        </div>
                      )}
                      <p className="text-slate-400 leading-relaxed text-[11px]">
                        {item.recommendation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* B. INTERACTIVE TEAM SKILL MATRIX HEATMAP TABLE */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <Layers className="w-4 h-4 text-indigo-400" />
                  <span>Interactive Squad Skill Matrix & Proficiency Heatmap</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click on any matrix cell to cycle member proficiency levels (<span className="text-slate-500">None</span> → <span className="text-amber-400">Novice</span> → <span className="text-cyan-400">Competent</span> → <span className="text-emerald-400">Expert</span>) to simulate cross-training impact.
                </p>
              </div>

              <div className="flex items-center space-x-3 text-xs bg-slate-950 p-2 rounded-xl border border-slate-800">
                <span className="text-slate-400 font-semibold">Proficiency Contribution:</span>
                <span className="text-emerald-400 font-mono">Expert (100%)</span>
                <span className="text-slate-600">·</span>
                <span className="text-cyan-400 font-mono">Competent (75%)</span>
                <span className="text-slate-600">·</span>
                <span className="text-amber-400 font-mono">Novice (35%)</span>
              </div>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-950/70 text-slate-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Squad Member</th>
                    <th className="py-3 px-3 text-center">Net Days</th>
                    {SKILL_DOMAINS.map((domain) => (
                      <th key={domain.key} className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center space-x-1">
                          {getDomainIcon(domain.key)}
                          <span>{domain.shortLabel}</span>
                        </div>
                      </th>
                    ))}
                    <th className="py-3 px-3 text-center">Capacity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {teamMembers.map((member) => {
                    const capacityItem = capacityStats.memberCapacities.find((c) => c.id === member.id);
                    return (
                      <tr key={member.id} className="hover:bg-slate-950/40 transition-colors">
                        {/* Member Identity */}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className={`w-7 h-7 rounded-lg ${member.avatarBg} text-white font-black text-[10px] flex items-center justify-center shrink-0`}>
                              {member.name.split(' ').map((n) => n[0]).join('')}
                            </div>
                            <div className="truncate">
                              <span className="font-bold text-slate-100 block truncate">{member.name}</span>
                              <span className="text-[10px] text-slate-400 truncate">{member.role}</span>
                            </div>
                          </div>
                        </td>

                        {/* Net Days */}
                        <td className="py-3 px-3 text-center font-mono font-bold text-slate-300">
                          {capacityItem?.availableDays}d
                        </td>

                        {/* Skill Proficiency Cells (Interactive click-to-cycle) */}
                        {SKILL_DOMAINS.map((domain) => {
                          const prof: SkillProficiency = member.skillProficiencies?.[domain.key] ?? 0;
                          return (
                            <td
                              key={domain.key}
                              onClick={() => handleCycleSkillProficiency(member.id, domain.key)}
                              className="py-3 px-3 text-center cursor-pointer hover:bg-slate-800/60 transition-colors group"
                              title={`Click to cycle proficiency for ${member.name} in ${domain.shortLabel}`}
                            >
                              <div className="flex items-center justify-center">
                                {renderProficiencyBadge(prof)}
                              </div>
                            </td>
                          );
                        })}

                        {/* Total Member Story Points Capacity */}
                        <td className="py-3 px-3 text-center font-mono font-bold text-indigo-400">
                          {capacityItem?.individualPts} pts
                        </td>
                      </tr>
                    );
                  })}

                  {/* Summary Row: Available Squad Points */}
                  <tr className="bg-slate-950/90 font-bold border-t-2 border-slate-700 text-xs">
                    <td className="py-3 px-4 text-slate-200">
                      <span>Total Squad Skill Capacity (Available)</span>
                    </td>
                    <td className="py-3 px-3 text-center font-mono text-slate-400">
                      {capacityStats.netDays}d
                    </td>
                    {SKILL_DOMAINS.map((domain) => {
                      const analysisItem = skillAnalysis.results.find((r) => r.domain === domain.key);
                      return (
                        <td key={domain.key} className="py-3 px-3 text-center font-mono text-slate-100">
                          {analysisItem?.totalSquadPointsAvailable} pts
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 text-center font-mono text-emerald-400">
                      {capacityStats.roundedVelocity} pts
                    </td>
                  </tr>

                  {/* Milestone Demand Row */}
                  <tr className="bg-slate-950 font-bold text-xs text-slate-400">
                    <td className="py-2.5 px-4">
                      <span>Roadmap Milestone Demand (Required)</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">—</td>
                    {SKILL_DOMAINS.map((domain) => {
                      const analysisItem = skillAnalysis.results.find((r) => r.domain === domain.key);
                      return (
                        <td key={domain.key} className="py-2.5 px-3 text-center font-mono text-amber-400">
                          {analysisItem?.totalMilestonePointsDemanded} pts
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 text-center font-mono text-amber-400">
                      {milestones.reduce((s, m) => s + m.requiredPoints, 0)} pts
                    </td>
                  </tr>

                  {/* Net Skill Gap Row */}
                  <tr className="bg-slate-950/90 font-black text-xs">
                    <td className="py-2.5 px-4 text-slate-200">
                      <span>Net Skill Gap / Bottleneck Delta</span>
                    </td>
                    <td className="py-2.5 px-3 text-center text-slate-600">—</td>
                    {SKILL_DOMAINS.map((domain) => {
                      const analysisItem = skillAnalysis.results.find((r) => r.domain === domain.key);
                      const delta = analysisItem?.netDeltaPoints ?? 0;
                      return (
                        <td
                          key={domain.key}
                          className={`py-2.5 px-3 text-center font-mono ${
                            delta < 0 ? 'text-rose-400 bg-rose-950/40' : 'text-emerald-400 bg-emerald-950/20'
                          }`}
                        >
                          {delta >= 0 ? `+${delta}p` : `${delta}p ⚠️`}
                        </td>
                      );
                    })}
                    <td className="py-2.5 px-3 text-center font-mono text-teal-400">
                      {capacityStats.bufferPoints >= 0 ? `+${capacityStats.bufferPoints}p` : `${capacityStats.bufferPoints}p`}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* C. MILESTONE-BY-MILESTONE SKILL AUDIT & RESOLUTION ACTIONS */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span>Roadmap Milestone Skill Gap Audit & Reallocation</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verifies that engineers mapped to each milestone possess the required competency levels. If a skill deficit is detected, one-click rebalance attaches an expert squad member.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {milestoneSkillAudits.map((ms) => {
                return (
                  <div
                    key={ms.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3 ${
                      ms.hasGaps
                        ? 'bg-rose-950/30 border-rose-800/80 shadow-md shadow-rose-950/20'
                        : 'bg-slate-950/70 border-slate-800'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                          {ms.quarter} · Target Sprint Day {ms.targetSprintDay}
                        </span>

                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            ms.hasGaps
                              ? 'bg-rose-950 text-rose-300 border-rose-700'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          }`}
                        >
                          {ms.hasGaps ? 'Skill Gap Detected ⚠️' : 'Fully Staffed & Covered'}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-100 leading-snug">{ms.title}</h4>
                      <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{ms.description}</p>

                      {/* Required Skills Chips */}
                      <div className="mt-3 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Demanded Skill Profiles:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {(ms.skillDemands || []).map((demand) => {
                            const desc = SKILL_DOMAINS.find((d) => d.key === demand.domain)!;
                            return (
                              <span
                                key={demand.domain}
                                className={`text-[10px] font-mono px-2 py-1 rounded-lg border flex items-center space-x-1.5 ${desc.bgColor} ${desc.borderColor} ${desc.textColor}`}
                              >
                                {getDomainIcon(demand.domain)}
                                <span>{desc.shortLabel}: {demand.points} pts (Min Lv{demand.minProficiency || 2})</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>

                      {/* Missing Skill Alerts if any */}
                      {ms.hasGaps && (
                        <div className="mt-3 p-2.5 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-200 text-xs space-y-2">
                          {ms.missingSkills.map((gap) => (
                            <div key={gap.domain} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <span className="text-[11px] text-rose-300">
                                <strong>Missing {gap.domain.toUpperCase()}:</strong> {gap.reason}
                              </span>
                              <button
                                onClick={() => handleResolveMilestoneGap(ms.id, gap.domain)}
                                className="px-2.5 py-1 rounded-md bg-rose-600 hover:bg-rose-500 text-white font-bold text-[10px] shrink-0 flex items-center space-x-1 transition-colors cursor-pointer"
                              >
                                <span>Auto-Assign Expert</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      {/* Milestone Capacity Demand vs Assigned Squad Bandwidth with Color-Coded Bar */}
                      <div className={`mt-3 p-2.5 rounded-xl border space-y-2 ${
                        ms.exceedsAssignedCapacity
                          ? 'bg-rose-950/40 border-rose-800/80 shadow-xs'
                          : 'bg-slate-950/80 border-slate-800/80'
                      }`}>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-400 font-semibold flex items-center space-x-1">
                            <Gauge className="w-3.5 h-3.5 text-indigo-400" />
                            <span>Resource Demand vs Capacity:</span>
                          </span>
                          <span className={`font-mono font-bold ${ms.exceedsAssignedCapacity ? 'text-rose-300' : 'text-slate-200'}`}>
                            {ms.requiredPoints}p <span className="text-slate-500">/</span> {ms.assignedCapacityPts}p ({ms.demandVsAssignedPercent}%)
                          </span>
                        </div>

                        {/* Color-Coded Bar */}
                        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800 relative">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              ms.capacityAlertLevel === 'CRITICAL'
                                ? 'bg-gradient-to-r from-rose-500 to-red-600 animate-pulse'
                                : ms.capacityAlertLevel === 'WARNING'
                                ? 'bg-amber-500'
                                : ms.capacityAlertLevel === 'BALANCED'
                                ? 'bg-cyan-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, ms.demandVsAssignedPercent)}%` }}
                          />
                        </div>

                        {/* Capacity Alert Pill / Status */}
                        {ms.exceedsAssignedCapacity ? (
                          <div className="flex items-center justify-between pt-0.5 text-[10px]">
                            <span className="text-rose-400 font-bold flex items-center space-x-1">
                              <AlertTriangle className="w-3 h-3 text-rose-400" />
                              <span>Demand exceeds capacity (-{ms.assignedDeficit}p deficit)</span>
                            </span>
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => handleCapMilestoneDemand(ms.id, ms.assignedCapacityPts)}
                                className="text-amber-400 hover:text-amber-300 font-bold hover:underline cursor-pointer"
                              >
                                Fit ({ms.assignedCapacityPts}p)
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAutoStaffMilestone(ms.id)}
                                className="text-indigo-400 hover:text-indigo-300 font-bold hover:underline cursor-pointer"
                              >
                                + Staff Dev
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-0.5 text-[10px] text-slate-400">
                            <span className="text-emerald-400 font-semibold">Capacity Safe (+{Math.round((ms.assignedCapacityPts - ms.requiredPoints) * 10) / 10}p buffer)</span>
                            <span>{ms.assignedMembers.length} assigned</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assigned Squad Members Footer */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5">
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {ms.assignedMembers.map((m) => (
                            <div
                              key={m.id}
                              className={`w-6 h-6 rounded-full ${m.avatarBg} text-white font-bold text-[9px] flex items-center justify-center border border-slate-900`}
                              title={`${m.name} (${m.role})`}
                            >
                              {m.name.split(' ').map((n) => n[0]).join('')}
                            </div>
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-400">
                          {ms.assignedMembers.map((m) => m.name.split(' ')[0]).join(', ')}
                        </span>
                      </div>

                      <span className="font-mono text-xs font-bold text-slate-200">
                        {ms.requiredPoints} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* =========================================================================
           VIEW A: HEADCOUNT CAPACITY & REAL-TIME BURN-DOWN TRAJECTORY
           ========================================================================= */
        <div className="space-y-6 animate-fadeIn">
          {/* STATS OVERVIEW CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Headcount</span>
                <Users className="w-3.5 h-3.5 text-indigo-400" />
              </span>
              <div className="mt-2">
                <span className="text-xl font-mono font-black text-slate-100">{capacityStats.headcount}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Devs & QA</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Gross Days</span>
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
              </span>
              <div className="mt-2">
                <span className="text-xl font-mono font-black text-slate-100">{capacityStats.grossDays}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Person-Days</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 flex items-center justify-between">
                <span>PTO / Leave</span>
                <Clock className="w-3.5 h-3.5 text-rose-400" />
              </span>
              <div className="mt-2">
                <span className="text-xl font-mono font-black text-rose-400">-{capacityStats.totalPto}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">{capacityStats.netDays} Net Days</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Blended Focus</span>
                <Gauge className="w-3.5 h-3.5 text-cyan-400" />
              </span>
              <div className="mt-2">
                <span className="text-xl font-mono font-black text-cyan-400">{capacityStats.blendedFocusFactor}%</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Sprint Story Focus</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Committed</span>
                <Target className="w-3.5 h-3.5 text-emerald-400" />
              </span>
              <div className="mt-2">
                <span className="text-xl font-mono font-black text-emerald-400">{committedPoints}</span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Active Sprint pts</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                <span>Skill Gaps</span>
                <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
              </span>
              <div className="mt-2">
                <span className={`text-xl font-mono font-black ${skillAnalysis.totalBottlenecks > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {skillAnalysis.totalBottlenecks}
                </span>
                <button
                  onClick={() => setActivePlannerTab('skill_matrix')}
                  className="text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold block mt-0.5 hover:underline cursor-pointer"
                >
                  View Matrix →
                </button>
              </div>
            </div>
          </div>

          {/* REAL-TIME SPRINT BURN-DOWN TRAJECTORY VISUALIZATION */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center space-x-2">
                  <TrendingDown className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-base font-bold text-slate-100">
                    Real-Time Sprint Burn-Down Trajectory & Milestone Pins
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visualizes the actual vs. projected point burn rate across 10 working days, anchored against roadmap delivery milestones.
                </p>
              </div>

              {/* Interactive Day Scrubber */}
              <div className="flex items-center space-x-3 bg-slate-950 px-3 py-2 rounded-xl border border-slate-800">
                <span className="text-xs font-semibold text-slate-400">Current Sprint Day:</span>
                <div className="flex items-center space-x-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((d) => (
                    <button
                      key={d}
                      onClick={() => setCurrentSprintDay(d)}
                      className={`w-6 h-6 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
                        currentSprintDay === d
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Burn-down SVG Chart */}
            <div className="space-y-2">
              <div className="relative w-full h-72 bg-slate-950/70 rounded-xl border border-slate-800/80 p-4">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 700 240" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity="0.25" />
                      <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                    </linearGradient>
                    <linearGradient id="actualGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>

                  {/* Horizontal Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1.0].map((ratio, idx) => {
                    const y = 20 + ratio * 190;
                    const ptVal = Math.round((committedPoints || 30) * (1 - ratio));
                    return (
                      <g key={idx}>
                        <line x1="40" y1={y} x2="680" y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                        <text x="32" y={y + 4} fill="#64748b" fontSize="9" textAnchor="end" fontFamily="monospace">
                          {ptVal}
                        </text>
                      </g>
                    );
                  })}

                  {/* Vertical Grid lines for Days 0 to 10 */}
                  {burnDownData.map((pt) => {
                    const x = 50 + (pt.day / 10) * 620;
                    return (
                      <g key={pt.day}>
                        <line x1={x} y1="20" x2={x} y2="210" stroke="#1e293b" strokeWidth="1" />
                        <text x={x} y="226" fill={pt.day === currentSprintDay ? '#34d399' : '#64748b'} fontSize="9" textAnchor="middle" fontWeight={pt.day === currentSprintDay ? 'bold' : 'normal'} fontFamily="monospace">
                          D{pt.day}
                        </text>
                      </g>
                    );
                  })}

                  {/* 1. IDEAL LINE (Slate dashed line) */}
                  {(() => {
                    const totalPts = committedPoints || 30;
                    const pathD = burnDownData.map((pt, idx) => {
                      const x = 50 + (pt.day / 10) * 620;
                      const y = 210 - (pt.idealRemaining / (totalPts || 1)) * 190;
                      return `${idx === 0 ? 'M' : 'L'} ${x} ${y}`;
                    }).join(' ');

                    return <path d={pathD} fill="none" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 4" />;
                  })()}

                  {/* 2. PROJECTED TRAJECTORY (Teal glowing line) */}
                  {(() => {
                    const totalPts = committedPoints || 30;
                    const coords = burnDownData.map((pt) => {
                      const x = 50 + (pt.day / 10) * 620;
                      const y = 210 - (pt.projectedRemaining / (totalPts || 1)) * 190;
                      return { x, y };
                    });

                    const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');
                    const areaD = `${pathD} L ${coords[coords.length - 1].x} 210 L ${coords[0].x} 210 Z`;

                    return (
                      <>
                        <path d={areaD} fill="url(#projectedGrad)" />
                        <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2.5" />
                      </>
                    );
                  })()}

                  {/* 3. ACTUAL BURNED POINTS (Cyan solid line up to currentSprintDay) */}
                  {(() => {
                    const totalPts = committedPoints || 30;
                    const actualPoints = burnDownData.filter((pt) => pt.day <= currentSprintDay);
                    if (actualPoints.length > 1) {
                      const coords = actualPoints.map((pt) => {
                        const x = 50 + (pt.day / 10) * 620;
                        const y = 210 - ((pt.actualRemaining ?? pt.idealRemaining) / (totalPts || 1)) * 190;
                        return { x, y };
                      });

                      const pathD = coords.map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ');

                      return (
                        <>
                          <path d={pathD} fill="none" stroke="#06b6d4" strokeWidth="3" />
                          {coords.map((c, idx) => (
                            <circle key={idx} cx={c.x} cy={c.y} r="4" fill="#0891b2" stroke="#e0f2fe" strokeWidth="2" />
                          ))}
                        </>
                      );
                    }
                    return null;
                  })()}

                  {/* 4. MILESTONE CHECKPOINT PINS ON THE TRAJECTORY */}
                  {milestones.map((ms) => {
                    const totalPts = committedPoints || 30;
                    const x = 50 + (ms.targetSprintDay / 10) * 620;
                    const dayPoint = burnDownData.find((d) => d.day === ms.targetSprintDay);
                    const remaining = dayPoint ? dayPoint.projectedRemaining : (totalPts * (1 - ms.targetSprintDay / 10));
                    const y = 210 - (remaining / (totalPts || 1)) * 190;

                    const isSelected = selectedMilestoneId === ms.id;
                    const auditItem = milestoneSkillAudits.find((a) => a.id === ms.id);
                    const isOverCapacity = auditItem?.exceedsAssignedCapacity || auditItem?.exceedsTotalCapacity;
                    const pinColor = isOverCapacity ? '#f43f5e' : '#f59e0b';
                    const rectFill = isOverCapacity ? '#881337' : '#78350f';
                    const rectWidth = isOverCapacity ? 58 : 44;

                    return (
                      <g
                        key={ms.id}
                        onClick={() => setSelectedMilestoneId(ms.id)}
                        className="cursor-pointer group"
                      >
                        <line x1={x} y1={y} x2={x} y2="20" stroke={pinColor} strokeWidth={isOverCapacity ? '1.5' : '1'} strokeDasharray={isOverCapacity ? '1 1' : '2 2'} opacity="0.8" />
                        {isOverCapacity && (
                          <circle
                            cx={x}
                            cy={y}
                            r="11"
                            fill="none"
                            stroke="#f43f5e"
                            strokeWidth="1.5"
                            className="animate-ping"
                            opacity="0.6"
                          />
                        )}
                        <circle
                          cx={x}
                          cy={y}
                          r={isSelected ? 7 : 5}
                          fill={pinColor}
                          stroke="#ffffff"
                          strokeWidth={isSelected ? 2.5 : 1.5}
                          className="transition-all"
                        />
                        <rect
                          x={x - rectWidth / 2}
                          y={y - 24}
                          width={rectWidth}
                          height="16"
                          rx="4"
                          fill={rectFill}
                          stroke={pinColor}
                          strokeWidth={isOverCapacity ? '1.5' : '1'}
                        />
                        <text
                          x={x}
                          y={y - 13}
                          fill="#ffffff"
                          fontSize="9"
                          fontWeight="bold"
                          textAnchor="middle"
                          fontFamily="monospace"
                        >
                          {ms.id.toUpperCase().replace('MS_', 'M')} ({ms.requiredPoints}p){isOverCapacity ? ' ⚠️' : ''}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Chart Legend & Telemetry Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 text-xs pt-2">
                <div className="flex flex-wrap items-center gap-4">
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-0.5 border-t-2 border-dashed border-slate-400 inline-block" />
                    <span className="text-slate-400 text-[11px]">Ideal Burn-down</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-1 bg-emerald-500 rounded inline-block" />
                    <span className="text-emerald-300 text-[11px] font-semibold">Projected Trajectory</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-3 h-1 bg-cyan-400 rounded inline-block" />
                    <span className="text-cyan-300 text-[11px] font-semibold">Actual Burned (Day {currentSprintDay})</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                    <span className="text-amber-300 text-[11px] font-semibold">Milestone Checkpoint</span>
                  </div>
                  {roadmapDemandSummary.hasAnyOverCapacity && (
                    <div className="flex items-center space-x-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block animate-pulse" />
                      <span className="text-rose-300 text-[11px] font-semibold">Demand Exceeds Capacity ⚠️</span>
                    </div>
                  )}
                </div>

                <div className={`px-3 py-1 rounded-full border text-xs font-bold flex items-center space-x-1.5 ${burnDownDiagnostics.bg} ${burnDownDiagnostics.color}`}>
                  {burnDownDiagnostics.status === 'AHEAD' ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : burnDownDiagnostics.status === 'BEHIND' ? (
                    <AlertTriangle className="w-3.5 h-3.5" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>{burnDownDiagnostics.label}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ROADMAP MILESTONES: RESOURCE DEMAND VS CALCULATED CAPACITY WITH VISUAL ALERTS */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <Target className="w-4 h-4 text-amber-400" />
                  <span>Roadmap Milestones: Resource Demand vs Calculated Capacity</span>
                  {roadmapDemandSummary.hasAnyOverCapacity && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-rose-950 text-rose-300 border border-rose-700 font-bold ml-2 animate-pulse flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3 text-rose-400" />
                      <span>{roadmapDemandSummary.overCapacityCount} Milestone(s) Over Capacity</span>
                    </span>
                  )}
                </h3>
                <p className="text-xs text-slate-400">
                  Monitors required story point delivery against assigned engineer capacity. Color-coded alert bars trigger dynamically when resource demand for a milestone exceeds available team capacity.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddMilestoneModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Milestone</span>
                </button>
              </div>
            </div>

            {/* Milestones Grid with Color-Coded Capacity Bars */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {milestoneSkillAudits.map((ms) => {
                const isOver = ms.exceedsAssignedCapacity || ms.exceedsTotalCapacity;

                return (
                  <div
                    key={ms.id}
                    className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3.5 ${
                      isOver
                        ? 'bg-rose-950/40 border-rose-600/90 shadow-lg shadow-rose-950/30 ring-1 ring-rose-500/40'
                        : ms.capacityAlertLevel === 'WARNING'
                        ? 'bg-amber-950/30 border-amber-600/80 shadow-md shadow-amber-950/20'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div>
                      {/* Milestone Header with Quarter and Status Tag */}
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                            {ms.quarter} · Target Sprint Day {ms.targetSprintDay}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {ms.theme}
                          </span>
                        </div>

                        {/* Visual Alert Badge */}
                        <span
                          className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border flex items-center space-x-1 ${
                            isOver
                              ? 'bg-rose-600 text-white border-rose-500 animate-pulse shadow-xs'
                              : ms.capacityAlertLevel === 'WARNING'
                              ? 'bg-amber-950 text-amber-300 border-amber-700'
                              : ms.capacityAlertLevel === 'BALANCED'
                              ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                              : 'bg-emerald-950 text-emerald-300 border-emerald-700'
                          }`}
                        >
                          {isOver ? (
                            <>
                              <AlertTriangle className="w-3 h-3 text-white" />
                              <span>Over Capacity (-{ms.assignedDeficit}p deficit)</span>
                            </>
                          ) : ms.capacityAlertLevel === 'WARNING' ? (
                            <span>Near Capacity Limit ({ms.demandVsAssignedPercent}%)</span>
                          ) : ms.capacityAlertLevel === 'BALANCED' ? (
                            <span>Balanced Staffing</span>
                          ) : (
                            <span>Capacity Surplus</span>
                          )}
                        </span>
                      </div>

                      {/* Milestone Title & Description */}
                      <div className="space-y-1">
                        <h4 className="text-xs font-bold text-slate-100 leading-snug">{ms.title}</h4>
                        <p className="text-[11px] text-slate-400 line-clamp-1">{ms.description}</p>
                      </div>

                      {/* Resource Point Demand Stepper & Capacity Numbers */}
                      <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-slate-400 font-semibold">Resource Demand:</span>
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleUpdateMilestonePoints(ms.id, -1)}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                              title="Decrease demanded points"
                            >
                              -
                            </button>
                            <span className="font-mono text-sm font-bold text-slate-100 min-w-[2.5rem] text-center">
                              {ms.requiredPoints} pts
                            </span>
                            <button
                              type="button"
                              onClick={() => handleUpdateMilestonePoints(ms.id, 1)}
                              className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                              title="Increase demanded points"
                            >
                              +
                            </button>
                          </div>
                        </div>

                        {/* Color-Coded Capacity Bar */}
                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-400">Assigned Team Capacity:</span>
                            <span className={`font-mono font-bold ${isOver ? 'text-rose-400' : 'text-slate-200'}`}>
                              {ms.assignedCapacityPts} pts <span className="text-slate-500 font-normal">({ms.demandVsAssignedPercent}% load)</span>
                            </span>
                          </div>

                          <div className="w-full bg-slate-900 rounded-full h-2.5 overflow-hidden border border-slate-800 relative">
                            {/* 100% capacity tick */}
                            <div className="absolute top-0 bottom-0 left-[100%] -ml-[1px] w-[2px] bg-slate-600 z-10" />
                            <div
                              className={`h-full rounded-full transition-all duration-300 ${
                                isOver
                                  ? 'bg-gradient-to-r from-rose-500 via-red-600 to-rose-400 animate-pulse shadow-md shadow-rose-950'
                                  : ms.capacityAlertLevel === 'WARNING'
                                  ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                                  : ms.capacityAlertLevel === 'BALANCED'
                                  ? 'bg-gradient-to-r from-cyan-500 to-indigo-500'
                                  : 'bg-gradient-to-r from-emerald-500 to-teal-400'
                              }`}
                              style={{ width: `${Math.min(100, ms.demandVsAssignedPercent)}%` }}
                            />
                          </div>

                          <div className="flex items-center justify-between text-[10px] text-slate-500">
                            <span>0 pts</span>
                            <span className={isOver ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                              {isOver ? `⚠️ Demand exceeds capacity by ${ms.assignedDeficit} pts` : `Buffer: +${Math.round((ms.assignedCapacityPts - ms.requiredPoints) * 10) / 10} pts`}
                            </span>
                            <span>{ms.assignedCapacityPts} pts cap</span>
                          </div>
                        </div>

                        {/* Interactive Over-Capacity Alert Box */}
                        {isOver && (
                          <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-200 text-xs space-y-2 animate-fadeIn">
                            <div className="flex items-start space-x-2">
                              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                              <div className="text-[11px] leading-snug">
                                <strong className="text-rose-300 block font-bold">Capacity Bottleneck Triggered!</strong>
                                Required points ({ms.requiredPoints}p) exceed available capacity of assigned engineers ({ms.assignedCapacityPts}p).
                              </div>
                            </div>

                            <div className="flex items-center justify-end space-x-2 pt-1 border-t border-rose-900/60">
                              <button
                                type="button"
                                onClick={() => handleCapMilestoneDemand(ms.id, ms.assignedCapacityPts)}
                                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-amber-300 border border-amber-800/80 text-[10px] font-bold transition-colors cursor-pointer"
                              >
                                Scale to {ms.assignedCapacityPts} pts
                              </button>
                              <button
                                type="button"
                                onClick={() => handleAutoStaffMilestone(ms.id)}
                                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center space-x-1 transition-colors cursor-pointer"
                              >
                                <span>Auto-Staff Engineer</span>
                                <ArrowRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Assigned Squad Members Footer */}
                    <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                      <div className="flex items-center space-x-1.5">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mr-1">Staffed:</span>
                        <div className="flex -space-x-1.5 overflow-hidden">
                          {ms.assignedMembers.map((m) => (
                            <div
                              key={m.id}
                              className={`w-6 h-6 rounded-full ${m.avatarBg} text-white font-bold text-[9px] flex items-center justify-center border border-slate-900`}
                              title={`${m.name} (${m.role})`}
                            >
                              {m.name.split(' ').map((n) => n[0]).join('')}
                            </div>
                          ))}
                        </div>
                        <span className="text-[11px] text-slate-300 ml-1">
                          {ms.assignedMembers.map((m) => m.name.split(' ')[0]).join(', ')}
                        </span>
                      </div>

                      <div className="flex items-center space-x-1">
                        <button
                          type="button"
                          onClick={() => handleAutoStaffMilestone(ms.id)}
                          className="text-[10px] text-indigo-400 hover:text-indigo-300 font-bold hover:underline cursor-pointer"
                          title="Assign another squad engineer"
                        >
                          + Staff
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SQUAD AVAILABILITY & STORY ALLOCATION MATRIX */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center space-x-2">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Squad Working Availability & Allocation</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-semibold ml-2">
                    {teamMembers.length} Members
                  </span>
                </h3>
                <p className="text-xs text-slate-400">
                  Adjust working days, PTO vacations, and focus factor ratios to recalibrate real-time story point delivery.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowAddMemberModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </button>
              </div>
            </div>

            {/* Member Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {capacityStats.memberCapacities.map((member) => (
                <div
                  key={member.id}
                  className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-9 h-9 rounded-xl ${member.avatarBg} text-white font-black text-xs flex items-center justify-center shrink-0 shadow-sm`}>
                        {member.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div className="truncate">
                        <h4 className="text-xs font-bold text-slate-100 truncate">{member.name}</h4>
                        <p className="text-[11px] text-slate-400 truncate">{member.role}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleRemoveMember(member.id)}
                      disabled={teamMembers.length <= 1}
                      className="text-slate-500 hover:text-rose-400 p-1 rounded transition-colors disabled:opacity-30 cursor-pointer"
                      title="Remove team member"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Working Days & PTO Stepper */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800/80">
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block font-semibold">Available Days</span>
                      <div className="flex items-center space-x-1 font-mono">
                        <span className="text-sm font-bold text-slate-100">{member.availableDays}</span>
                        <span className="text-[10px] text-slate-500">/ {member.totalWorkingDays}d</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 block font-semibold">PTO / Leave</span>
                      <div className="flex items-center space-x-1.5">
                        <button
                          onClick={() => handleUpdateMemberPto(member.id, -1)}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                        >
                          -
                        </button>
                        <span className="font-mono text-xs font-bold text-rose-400">{member.ptoDays}d</span>
                        <button
                          onClick={() => handleUpdateMemberPto(member.id, 1)}
                          className="w-5 h-5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold text-xs cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Focus Factor & Capacity Output */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400">Focus Factor:</span>
                      <span className="font-mono font-bold text-cyan-400">{Math.round(member.focusFactor * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.0"
                      step="0.05"
                      value={member.focusFactor}
                      onChange={(e) => handleUpdateMemberFocus(member.id, parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
                    />
                  </div>

                  {/* Story Allocation vs Individual Capacity Bar */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-800/80">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-400 text-[11px]">Sprint Workload:</span>
                      <span className="font-mono text-xs font-bold text-slate-200">
                        {member.assignedStoryPoints} / <span className="text-indigo-400">{member.individualPts} pts</span>
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          member.utilizationRate > 105
                            ? 'bg-rose-500'
                            : member.utilizationRate >= 80
                            ? 'bg-emerald-500'
                            : 'bg-amber-500'
                        }`}
                        style={{ width: `${Math.min(100, member.utilizationRate)}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[10px]">
                      <span className={member.utilizationRate > 105 ? 'text-rose-400 font-bold' : 'text-slate-400'}>
                        {member.utilizationRate > 105 ? 'Over-allocated' : `${member.utilizationRate}% Capacity`}
                      </span>
                      <span className="text-slate-500 font-mono">
                        {member.assignedStoriesCount} stories assigned
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 4. ADD MEMBER MODAL */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-400" />
                <span>Add Squad Engineer & Set Primary Expertise</span>
              </h3>
              <button onClick={() => setShowAddMemberModal(false)} className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMember} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Developer Name</label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="e.g. Liam Gallagher"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Role / Job Title</label>
                <input
                  type="text"
                  value={newMemberRole}
                  onChange={(e) => setNewMemberRole(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Primary Skill Domain</label>
                <select
                  value={newMemberPrimarySkill}
                  onChange={(e) => setNewMemberPrimarySkill(e.target.value as SkillDomain)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:outline-none focus:border-indigo-500 font-medium cursor-pointer"
                >
                  {SKILL_DOMAINS.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.shortLabel} — {d.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Working Days</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newMemberDays}
                    onChange={(e) => setNewMemberDays(parseInt(e.target.value) || 10)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">PTO / Leave Days</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={newMemberPto}
                    onChange={(e) => setNewMemberPto(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Focus Factor (%)</label>
                  <input
                    type="number"
                    min="50"
                    max="100"
                    value={newMemberFocus}
                    onChange={(e) => setNewMemberFocus(parseInt(e.target.value) || 80)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Points per Day</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.5"
                    max="2.0"
                    value={newMemberPtsDay}
                    onChange={(e) => setNewMemberPtsDay(parseFloat(e.target.value) || 0.9)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddMemberModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
                >
                  Add Engineer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. ADD MILESTONE MODAL */}
      {showAddMilestoneModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-100 flex items-center space-x-2">
                <Target className="w-4 h-4 text-amber-400" />
                <span>Add Roadmap Milestone Target</span>
              </h3>
              <button onClick={() => setShowAddMilestoneModal(false)} className="text-slate-400 hover:text-slate-200 text-xs cursor-pointer">
                ✕
              </button>
            </div>

            <form onSubmit={handleAddMilestone} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-300 block mb-1">Milestone Title</label>
                <input
                  type="text"
                  required
                  value={newMilestoneTitle}
                  onChange={(e) => setNewMilestoneTitle(e.target.value)}
                  placeholder="e.g. M5: Real-Time Webhook Gateway"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-500 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Target Sprint Day (1-10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newMilestoneDay}
                    onChange={(e) => setNewMilestoneDay(parseInt(e.target.value) || 5)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-300 block mb-1">Required Points</label>
                  <input
                    type="number"
                    min="1"
                    max="40"
                    value={newMilestonePoints}
                    onChange={(e) => setNewMilestonePoints(parseInt(e.target.value) || 8)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="font-semibold text-slate-300 block mb-1">Strategic Theme</label>
                <input
                  type="text"
                  value={newMilestoneTheme}
                  onChange={(e) => setNewMilestoneTheme(e.target.value)}
                  placeholder="e.g. Resiliency & Scale"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddMilestoneModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold cursor-pointer"
                >
                  Save Milestone
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
