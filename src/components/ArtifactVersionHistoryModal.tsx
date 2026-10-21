import React from 'react';
import { GeneratedArtifact, ArtifactVersionRecord } from '../types.js';
import { ArtifactVersionHistoryViewer } from './ArtifactVersionHistoryViewer.js';

export interface ArtifactVersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  artifact: GeneratedArtifact | null;
  productName?: string;
  onRevertArtifact?: (artifactId: string, targetVersion: number) => Promise<void> | void;
  onApproveArtifact?: (artifactId: string) => Promise<void> | void;
  isReverting?: boolean;
  isApproving?: boolean;
  onSelectIterationForSpecView?: (iteration: ArtifactVersionRecord) => void;
}

export const ArtifactVersionHistoryModal: React.FC<ArtifactVersionHistoryModalProps> = ({
  isOpen,
  onClose,
  artifact,
  productName,
  onRevertArtifact,
  onApproveArtifact,
  isReverting = false,
  isApproving = false,
  onSelectIterationForSpecView
}) => {
  if (!isOpen || !artifact) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/85 backdrop-blur-md animate-in fade-in">
      <div className="w-full max-w-6xl">
        <ArtifactVersionHistoryViewer
          artifact={artifact}
          productName={productName}
          onRevertArtifact={onRevertArtifact}
          onApproveArtifact={onApproveArtifact}
          isReverting={isReverting}
          isApproving={isApproving}
          onClose={onClose}
          embedded={false}
          onSelectIterationForSpecView={onSelectIterationForSpecView}
        />
      </div>
    </div>
  );
};
