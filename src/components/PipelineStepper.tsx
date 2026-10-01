import React from 'react';
import { CheckCircle2, Circle, AlertCircle, RefreshCw } from 'lucide-react';

export interface PipelineStep {
  id: number;
  label: string;
  description: string;
  status: 'IDLE' | 'ACTIVE' | 'COMPLETED' | 'REPAIRED' | 'FAILED';
}

interface PipelineStepperProps {
  steps: PipelineStep[];
  currentStepIndex: number;
}

export const PipelineStepper: React.FC<PipelineStepperProps> = ({ steps }) => {
  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center space-x-2">
          <span>Engine Pipeline (§1 Standard)</span>
          <span className="text-[10px] text-slate-500 font-normal">Context → Template → Schema → Validation → Repair → Draft → Prose</span>
        </h3>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {steps.map((step) => {
          let badgeColor = 'bg-slate-950 border-slate-800 text-slate-400';
          let icon = <Circle className="w-3.5 h-3.5 text-slate-500" />;

          if (step.status === 'ACTIVE') {
            badgeColor = 'bg-blue-950/60 border-blue-600 text-blue-300 animate-pulse';
            icon = <RefreshCw className="w-3.5 h-3.5 text-blue-400 animate-spin" />;
          } else if (step.status === 'COMPLETED') {
            badgeColor = 'bg-emerald-950/50 border-emerald-700/60 text-emerald-300';
            icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />;
          } else if (step.status === 'REPAIRED') {
            badgeColor = 'bg-amber-950/60 border-amber-600 text-amber-300';
            icon = <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />;
          } else if (step.status === 'FAILED') {
            badgeColor = 'bg-rose-950/60 border-rose-600 text-rose-300';
            icon = <AlertCircle className="w-3.5 h-3.5 text-rose-400" />;
          }

          return (
            <div
              key={step.id}
              className={`p-2.5 rounded-lg border flex flex-col justify-between transition-all duration-200 ${badgeColor}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono opacity-60">0{step.id}</span>
                {icon}
              </div>
              <div className="font-semibold text-xs leading-tight">{step.label}</div>
              <div className="text-[10px] opacity-70 mt-0.5 truncate">{step.description}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
