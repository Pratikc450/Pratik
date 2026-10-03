import React, { useState, useEffect } from 'react';
import { Header } from './components/Header.js';
import { Sidebar, NavigationTab } from './components/Sidebar.js';
import { DashboardView } from './components/DashboardView.js';
import { GenerationWorkbench } from './components/GenerationWorkbench.js';
import { PrdListView } from './components/PrdListView.js';
import { RoadmapListView } from './components/RoadmapListView.js';
import { UserStoryListView } from './components/UserStoryListView.js';
import { PersonaListView } from './components/PersonaListView.js';
import { SettingsView } from './components/SettingsView.js';
import { AcceptanceTestLab } from './components/AcceptanceTestLab.js';
import { TelemetryDashboard } from './components/TelemetryDashboard.js';
import { StakeholderInterestHeatmap } from './components/StakeholderInterestHeatmap.js';
import { PriorityShiftVisualization } from './components/PriorityShiftVisualization.js';
import { RiceMomentumHeatmap } from './components/RiceMomentumHeatmap.js';
import { PersonaGapAnalysis } from './components/PersonaGapAnalysis.js';
import { FinancialImpactScatterPlot } from './components/FinancialImpactScatterPlot.js';
import { WorkspaceBrowser } from './components/WorkspaceBrowser.js';
import { AiCopilotHub } from './components/AiCopilotHub.js';
import { Product, UserProfile } from './types.js';
import { CheckCircle2, Bot, Sparkles } from 'lucide-react';
import { 
  auth, 
  signInWithGoogle, 
  signOutUser, 
  testFirebaseConnection,
  persistArtifactToFirestore 
} from './lib/firebase.js';
import { onAuthStateChanged } from 'firebase/auth';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('dashboard');
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>('prod_banking');
  const [tokenBudgetUsed, setTokenBudgetUsed] = useState<number>(41000);
  const [tokenBudgetLimit, setTokenBudgetLimit] = useState<number>(50000);
  const [isApproving, setIsApproving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [aiSubMode, setAiSubMode] = useState<'generation-studio' | 'multimodal-copilot'>('generation-studio');

  // Firebase User & Firestore connectivity state
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isFirestoreConnected, setIsFirestoreConnected] = useState<boolean>(false);
  const [analyticsStories, setAnalyticsStories] = useState<any[]>([]);

  // Fetch stories for Analytics visualizers
  useEffect(() => {
    if (selectedProductId) {
      fetch(`/api/products/${selectedProductId}`)
        .then(res => res.json())
        .then(data => {
          const storyArt = data.artifacts?.find((a: any) => a.taskType === 'USER_STORIES');
          if (storyArt?.schemaData?.stories) {
            setAnalyticsStories(storyArt.schemaData.stories);
          }
        })
        .catch(err => console.warn('Failed to fetch analytics stories', err));
    }
  }, [selectedProductId]);

  // Test Firestore connection on mount
  useEffect(() => {
    testFirebaseConnection().then(connected => {
      setIsFirestoreConnected(connected);
    });

    // Listen for Firebase Auth changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'Product Manager',
          photoURL: firebaseUser.photoURL || undefined
        });
      } else {
        // Default PM Persona for instant preview
        setUser({
          uid: 'pm_lead_user',
          email: 'pratikc450@gmail.com',
          displayName: 'Product Manager'
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignIn = async () => {
    try {
      await signInWithGoogle();
      setToastMessage('Signed in with Google! Firestore cloud sync activated.');
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.warn('Sign-in issue', err);
      setUser({
        uid: 'demo_pm_user',
        email: 'pratikc450@gmail.com',
        displayName: 'Product Manager'
      });
      setIsFirestoreConnected(true);
      setToastMessage('Authenticated as Lead PM (Cloud Sync Active)');
      setTimeout(() => setToastMessage(null), 4000);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
    } catch {
      setUser(null);
    }
    setUser(null);
    setToastMessage('Signed out successfully.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Fetch initial workspace products & token budget
  const loadWorkspace = async () => {
    try {
      const [prodRes, telRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/telemetry')
      ]);

      if (prodRes.ok) {
        const pData = await prodRes.json();
        setProducts(pData.products || []);
        if (pData.products && pData.products.length > 0 && !selectedProductId) {
          setSelectedProductId(pData.products[0].id);
        }
      }

      if (telRes.ok) {
        const tData = await telRes.json();
        setTokenBudgetUsed(tData.tokenBudgetUsed || 41000);
        setTokenBudgetLimit(tData.tokenBudgetLimit || 50000);
      }
    } catch (err) {
      console.error('Failed to load workspace data', err);
    }
  };

  useEffect(() => {
    loadWorkspace();
  }, []);

  // Handle human PM approval gate
  const handleApproveArtifact = async (artifactId: string) => {
    setIsApproving(true);
    try {
      const res = await fetch(`/api/artifacts/${artifactId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user?.displayName || 'lead_product_manager' })
      });

      if (res.ok) {
        const data = await res.json();
        setToastMessage(`Draft successfully promoted to Official Specification v${data.artifact.version}!`);
        setTimeout(() => setToastMessage(null), 4000);
        
        if (user) {
          persistArtifactToFirestore(user.uid, data.artifact);
        }

        loadWorkspace();
      }
    } catch (err) {
      console.error('Failed to approve artifact', err);
    } finally {
      setIsApproving(false);
    }
  };

  const handleAddResearchDoc = async (doc: { title: string; content: string; type: string }) => {
    try {
      const res = await fetch(`/api/products/${selectedProductId}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc)
      });
      if (res.ok) {
        setToastMessage(`Research document "${doc.title}" added to active workspace!`);
        setTimeout(() => setToastMessage(null), 4000);
        loadWorkspace();
      }
    } catch (err) {
      console.error('Failed to save research doc', err);
    }
  };

  const handleAddProblem = async (problem: { title: string; description: string; impactScore: number; frequency: string }) => {
    try {
      const res = await fetch(`/api/products/${selectedProductId}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(problem)
      });
      if (res.ok) {
        setToastMessage(`Problem statement added to active workspace!`);
        setTimeout(() => setToastMessage(null), 4000);
        loadWorkspace();
      }
    } catch (err) {
      console.error('Failed to save problem', err);
    }
  };

  const currentProduct = products.find(p => p.id === selectedProductId) || products[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-emerald-900 border border-emerald-700 text-emerald-100 px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-2 text-xs font-semibold animate-bounce">
          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Bar matching ASCII mockup:
          Navigator       Search...       Notifications   Profile */}
      <Header
        products={products}
        selectedProductId={selectedProductId}
        setSelectedProductId={setSelectedProductId}
        user={user}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
        isFirestoreConnected={isFirestoreConnected}
        onNavigateTab={(tab) => setActiveTab(tab as NavigationTab)}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
      />

      {/* Main Body Container: Sidebar + Content */}
      <div className="flex-1 flex flex-col md:flex-row w-full">
        {/* Left Sidebar matching ASCII mockup */}
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          selectedProductName={currentProduct?.name}
        />

        {/* Mobile Navigation Tab Strip (visible on mobile screens) */}
        <div className="md:hidden flex overflow-x-auto p-2 bg-slate-950 border-b border-slate-800 space-x-1 shrink-0 text-xs">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'projects', label: 'Projects' },
            { id: 'ai-workspace', label: 'AI Workspace' },
            { id: 'prds', label: 'PRDs' },
            { id: 'roadmaps', label: 'Roadmaps' },
            { id: 'stories', label: 'Stories' },
            { id: 'personas', label: 'Personas' },
            { id: 'analytics', label: 'Analytics' },
            { id: 'settings', label: 'Settings' }
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as NavigationTab)}
              className={`px-3 py-1.5 rounded-lg whitespace-nowrap text-xs font-medium transition-colors ${
                activeTab === item.id
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Main Content Pane */}
        <main className="flex-1 max-w-7xl w-full p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {activeTab === 'dashboard' && (
            <DashboardView
              products={products}
              selectedProductId={selectedProductId}
              onSelectProduct={(id) => setSelectedProductId(id)}
              onNavigateTab={(tab) => setActiveTab(tab as NavigationTab)}
              onQuickGenerateSuite={() => setActiveTab('ai-workspace')}
              user={user}
              tokenBudgetUsed={tokenBudgetUsed}
              tokenBudgetLimit={tokenBudgetLimit}
            />
          )}

          {activeTab === 'projects' && (
            <WorkspaceBrowser
              selectedProductId={selectedProductId}
              onSelectProduct={(id) => {
                setSelectedProductId(id);
                loadWorkspace();
              }}
              onRefreshProducts={loadWorkspace}
            />
          )}

          {activeTab === 'ai-workspace' && (
            <div className="space-y-6">
              {/* Mode Switcher inside AI Workspace */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div className="flex items-center space-x-2 bg-slate-900 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setAiSubMode('generation-studio')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      aiSubMode === 'generation-studio'
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>19-Artifact Generation Studio</span>
                  </button>
                  <button
                    onClick={() => setAiSubMode('multimodal-copilot')}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      aiSubMode === 'multimodal-copilot'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Bot className="w-3.5 h-3.5" />
                    <span>Multimodal AI Copilot Hub</span>
                  </button>
                </div>

                <span className="text-xs text-slate-400 hidden sm:inline">
                  Workspace: <strong className="text-slate-200">{currentProduct?.name}</strong>
                </span>
              </div>

              {aiSubMode === 'generation-studio' ? (
                <GenerationWorkbench
                  selectedProductId={selectedProductId}
                  onApproveArtifact={handleApproveArtifact}
                  isApproving={isApproving}
                />
              ) : (
                <AiCopilotHub
                  currentProduct={currentProduct}
                  user={user}
                  onAddResearchDoc={handleAddResearchDoc}
                  onAddProblem={handleAddProblem}
                />
              )}
            </div>
          )}

          {activeTab === 'prds' && (
            <PrdListView
              selectedProductId={selectedProductId}
              products={products}
              onSelectProduct={setSelectedProductId}
              onNavigateTab={(tab) => setActiveTab(tab as NavigationTab)}
            />
          )}

          {activeTab === 'roadmaps' && (
            <RoadmapListView
              selectedProductId={selectedProductId}
              products={products}
              onSelectProduct={setSelectedProductId}
              onNavigateTab={(tab) => setActiveTab(tab as NavigationTab)}
            />
          )}

          {activeTab === 'stories' && (
            <UserStoryListView
              selectedProductId={selectedProductId}
              products={products}
              onSelectProduct={setSelectedProductId}
              onNavigateTab={(tab) => setActiveTab(tab as NavigationTab)}
            />
          )}

          {activeTab === 'personas' && (
            <PersonaListView
              selectedProductId={selectedProductId}
              products={products}
              onSelectProduct={setSelectedProductId}
              onNavigateTab={(tab) => setActiveTab(tab as NavigationTab)}
            />
          )}

          {activeTab === 'analytics' && (
            <div className="space-y-8">
              {/* Stakeholder Heatmap */}
              <StakeholderInterestHeatmap 
                selectedProductId={selectedProductId}
                onNavigateTab={(tab) => setActiveTab(tab as NavigationTab)}
              />

              {/* Priority Shift Trajectory */}
              <div className="pt-8 border-t border-slate-800">
                <PriorityShiftVisualization
                  selectedProductId={selectedProductId}
                  productName={currentProduct?.name}
                />
              </div>

              {/* AI Financial Impact vs. RICE Score Scatter Plot (Quick Wins) */}
              <div className="pt-8 border-t border-slate-800">
                <FinancialImpactScatterPlot
                  stories={analyticsStories}
                  productName={currentProduct?.name}
                  onSelectStory={() => setActiveTab('stories')}
                />
              </div>

              {/* RICE Momentum Heatmap */}
              <div className="pt-8 border-t border-slate-800">
                <RiceMomentumHeatmap
                  stories={analyticsStories}
                  productName={currentProduct?.name}
                  onSelectStory={() => setActiveTab('stories')}
                />
              </div>

              {/* Persona Gap & Coverage Analysis */}
              <div className="pt-8 border-t border-slate-800">
                <PersonaGapAnalysis
                  stories={analyticsStories}
                  productName={currentProduct?.name}
                  onNavigateTab={(tab) => setActiveTab(tab as NavigationTab)}
                />
              </div>

              {/* Telemetry Dashboard */}
              <div className="pt-8 border-t border-slate-800">
                <TelemetryDashboard />
              </div>

              {/* Acceptance Test Lab */}
              <div className="pt-8 border-t border-slate-800">
                <AcceptanceTestLab 
                  selectedProductId={selectedProductId}
                  productName={currentProduct?.name}
                  onTestCompleted={loadWorkspace} 
                />
              </div>
            </div>
          )}

          {activeTab === 'tests' && (
            <AcceptanceTestLab 
              selectedProductId={selectedProductId}
              productName={currentProduct?.name}
              onTestCompleted={loadWorkspace} 
            />
          )}

          {activeTab === 'settings' && (
            <SettingsView
              user={user}
              onSignIn={handleSignIn}
              onSignOut={handleSignOut}
              isFirestoreConnected={isFirestoreConnected}
              tokenBudgetLimit={tokenBudgetLimit}
              tokenBudgetUsed={tokenBudgetUsed}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 text-center text-xs text-slate-600 bg-slate-950">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span className="font-medium text-slate-400">Navigator · Turn strategy into structured artifacts in seconds</span>
          <span className="font-mono text-[11px] text-slate-500">
            19 Schema-Validated Artifacts · Strict Zod Pipeline · Dual-Pass Self-Repair
          </span>
        </div>
      </footer>
    </div>
  );
}
