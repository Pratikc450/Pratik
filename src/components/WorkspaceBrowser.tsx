import React, { useState, useEffect } from 'react';
import { Product, Problem, Persona, Feature, ResearchDocument } from '../types.js';
import {
  Database,
  AlertTriangle,
  Users,
  FileText,
  CheckCircle2,
  ShieldAlert,
  Layers,
  Plus,
  Search,
  Sparkles,
  ExternalLink
} from 'lucide-react';

interface WorkspaceBrowserProps {
  selectedProductId: string;
  onSelectProduct?: (id: string) => void;
  onRefreshProducts?: () => void;
}

export const WorkspaceBrowser: React.FC<WorkspaceBrowserProps> = ({
  selectedProductId,
  onSelectProduct,
  onRefreshProducts
}) => {
  const [productData, setProductData] = useState<{
    product: Product;
    problems: Problem[];
    personas: Persona[];
    features: Feature[];
    docs: ResearchDocument[];
    artifacts: any[];
  } | null>(null);
  const [activeTab, setActiveTab] = useState<'problems' | 'personas' | 'features' | 'docs'>('problems');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [showAddProblemModal, setShowAddProblemModal] = useState(false);
  const [showAddPersonaModal, setShowAddPersonaModal] = useState(false);
  const [showAddDocModal, setShowAddDocModal] = useState(false);

  // Form states
  const [newProdName, setNewProdName] = useState('');
  const [newProdVision, setNewProdVision] = useState('');
  const [newProdAudience, setNewProdAudience] = useState('');
  const [newProdIndustry, setNewProdIndustry] = useState('');

  const [newProbTitle, setNewProbTitle] = useState('');
  const [newProbDesc, setNewProbDesc] = useState('');
  const [newProbScore, setNewProbScore] = useState(8);

  const [newPersName, setNewPersName] = useState('');
  const [newPersRole, setNewPersRole] = useState('');
  const [newPersGoal, setNewPersGoal] = useState('');
  const [newPersPain, setNewPersPain] = useState('');

  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocContent, setNewDocContent] = useState('');
  const [newDocUntrusted, setNewDocUntrusted] = useState(true);

  const fetchProduct = async () => {
    try {
      const res = await fetch(`/api/products/${selectedProductId}`);
      if (res.ok) {
        const data = await res.json();
        setProductData(data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [selectedProductId]);

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName || !newProdVision) return;
    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newProdName,
          vision: newProdVision,
          targetAudience: newProdAudience || 'B2B Enterprise',
          industry: newProdIndustry || 'FinTech / SaaS'
        })
      });
      if (res.ok) {
        const data = await res.json();
        setShowAddProductModal(false);
        setNewProdName('');
        setNewProdVision('');
        if (onRefreshProducts) onRefreshProducts();
        if (onSelectProduct && data.product?.id) {
          onSelectProduct(data.product.id);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddProblem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProbTitle) return;
    try {
      const res = await fetch(`/api/products/${selectedProductId}/problems`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newProbTitle,
          description: newProbDesc,
          impactScore: Number(newProbScore)
        })
      });
      if (res.ok) {
        setShowAddProblemModal(false);
        setNewProbTitle('');
        setNewProbDesc('');
        fetchProduct();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddPersona = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersName || !newPersRole) return;
    try {
      const res = await fetch(`/api/products/${selectedProductId}/personas`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPersName,
          role: newPersRole,
          goal: newPersGoal,
          painPoint: newPersPain
        })
      });
      if (res.ok) {
        setShowAddPersonaModal(false);
        setNewPersName('');
        setNewPersRole('');
        setNewPersGoal('');
        setNewPersPain('');
        fetchProduct();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTitle || !newDocContent) return;
    try {
      const res = await fetch(`/api/products/${selectedProductId}/docs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newDocTitle,
          content: newDocContent,
          isUntrusted: newDocUntrusted
        })
      });
      if (res.ok) {
        setShowAddDocModal(false);
        setNewDocTitle('');
        setNewDocContent('');
        fetchProduct();
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!productData) {
    return <div className="p-8 text-center text-slate-500 font-mono text-xs">Loading workspace records...</div>;
  }

  const { product, problems, personas, features, docs } = productData;

  const filteredProblems = problems.filter(
    (p) => p.title.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredPersonas = personas.filter(
    (p) => p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredDocs = docs.filter(
    (d) => d.title.toLowerCase().includes(searchQuery.toLowerCase()) || d.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Product Overview Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                {product.industry}
              </span>
              <span className="text-slate-600">·</span>
              <span className="text-[11px] text-slate-400">Target: {product.targetAudience}</span>
            </div>
            <h2 className="text-xl font-bold text-slate-100 mt-1">{product.name}</h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">{product.description}</p>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
            <div className="bg-slate-950 px-4 py-2 rounded-lg border border-slate-800 text-xs font-mono space-y-0.5 text-slate-400">
              <div>Problems: <span className="text-slate-200 font-semibold">{problems.length}</span></div>
              <div>Personas: <span className="text-slate-200 font-semibold">{personas.length}</span></div>
              <div>Research Docs: <span className="text-slate-200 font-semibold">{docs.length}</span></div>
            </div>

            <button
              onClick={() => setShowAddProductModal(true)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold border border-slate-700 flex items-center space-x-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-400" />
              <span>New Workspace</span>
            </button>
          </div>
        </div>

        {/* Vision Statement */}
        <div className="mt-4 p-3 bg-slate-950 rounded-lg border border-slate-800/80 text-xs text-slate-300">
          <span className="font-bold text-slate-200">Product Vision: </span>
          <span className="italic">{product.vision}</span>
        </div>
      </div>

      {/* Record Management Toolbar & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Navigation Tabs */}
        <div className="flex items-center space-x-1 bg-slate-900 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('problems')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'problems' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            <span>Problems ({problems.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('personas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'personas' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-3.5 h-3.5 text-blue-400" />
            <span>Personas ({personas.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('features')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'features' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Shipped Features ({features.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('docs')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer ${
              activeTab === 'docs' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            <span>Research Docs ({docs.length})</span>
          </button>
        </div>

        {/* Search & Add button */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search records..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500/50 w-44 sm:w-56"
            />
          </div>

          {activeTab === 'problems' && (
            <button
              onClick={() => setShowAddProblemModal(true)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Problem</span>
            </button>
          )}

          {activeTab === 'personas' && (
            <button
              onClick={() => setShowAddPersonaModal(true)}
              className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Persona</span>
            </button>
          )}

          {activeTab === 'docs' && (
            <button
              onClick={() => setShowAddDocModal(true)}
              className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Research Doc</span>
            </button>
          )}
        </div>
      </div>

      {/* Tab 1: Problems */}
      {activeTab === 'problems' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredProblems.map((prob) => (
            <div key={prob.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold text-sm text-slate-100 leading-snug">{prob.title}</h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-950/80 text-amber-300 border border-amber-800">
                  Impact: {prob.impactScore}/10
                </span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">{prob.description}</p>
              <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-500 font-mono">
                Frequency: {prob.frequency} · ID: {prob.id}
              </div>
            </div>
          ))}
          {filteredProblems.length === 0 && (
            <div className="col-span-2 p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
              No problem records matching query.
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Personas */}
      {activeTab === 'personas' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredPersonas.map((persona) => (
            <div key={persona.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-xs">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-100">{persona.name}</h3>
                  <div className="text-xs text-blue-400 font-medium">{persona.role}</div>
                </div>
                <span className="text-[10px] font-mono text-slate-500 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                  {persona.id}
                </span>
              </div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-300">Goal: </span>
                  <span className="text-slate-400">{persona.goal}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-300">Core Pain: </span>
                  <span className="text-slate-400">{persona.painPoint}</span>
                </div>
              </div>
            </div>
          ))}
          {filteredPersonas.length === 0 && (
            <div className="col-span-2 p-8 text-center bg-slate-900/40 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs">
              No persona records matching query.
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Shipped Features */}
      {activeTab === 'features' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {features.map((feat) => (
            <div key={feat.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                  {feat.priority} Priority
                </span>
                <span className="text-[10px] font-mono text-slate-500">{feat.id}</span>
              </div>
              <h3 className="font-bold text-xs text-slate-200">{feat.title}</h3>
              <p className="text-[11px] text-slate-400">{feat.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tab 4: Research Docs */}
      {activeTab === 'docs' && (
        <div className="space-y-4">
          <div className="bg-slate-950 border border-slate-800 p-3 rounded-lg text-xs text-slate-400 flex items-center space-x-2">
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Section 3 Security Boundary:</strong> All customer research documents are isolated inside{' '}
              <code className="text-slate-200">&lt;untrusted_context&gt;</code> tags to eliminate prompt injection hazards.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {filteredDocs.map((doc) => (
              <div key={doc.id} className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3 shadow-xs">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-4 h-4 text-purple-400" />
                    <h3 className="font-bold text-sm text-slate-100">{doc.title}</h3>
                  </div>
                  <div className="flex items-center space-x-2">
                    {doc.isUntrusted ? (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-950 text-amber-300 border border-amber-800">
                        UNTRUSTED BOUNDARY ACTIVE
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
                        VERIFIED INTERNAL
                      </span>
                    )}
                    <span className="text-[10px] font-mono text-slate-500">{doc.type}</span>
                  </div>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-44 overflow-y-auto">
                  {doc.content}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Modal: Add Product */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form onSubmit={handleCreateProduct} className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-6 space-y-4">
            <h3 className="font-bold text-slate-100 text-base">Create Custom Product Workspace</h3>
            <p className="text-xs text-slate-400">
              Add your own initiative to run PRDs, stories, and roadmaps grounded in your real product data.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Product Name *</label>
              <input
                type="text"
                required
                value={newProdName}
                onChange={(e) => setNewProdName(e.target.value)}
                placeholder="e.g. Acme Logistics AI"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Product Vision *</label>
              <textarea
                required
                rows={2}
                value={newProdVision}
                onChange={(e) => setNewProdVision(e.target.value)}
                placeholder="e.g. Eliminate 90% of warehouse freight dispatch friction via autonomous fleet routing."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Audience</label>
                <input
                  type="text"
                  value={newProdAudience}
                  onChange={(e) => setNewProdAudience(e.target.value)}
                  placeholder="e.g. Fleet Managers"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Industry</label>
                <input
                  type="text"
                  value={newProdIndustry}
                  onChange={(e) => setNewProdIndustry(e.target.value)}
                  placeholder="e.g. Supply Chain / SaaS"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-emerald-500/60"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                Create Workspace
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Problem */}
      {showAddProblemModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form onSubmit={handleAddProblem} className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4">
            <h3 className="font-bold text-slate-100 text-sm">Add Customer Problem Statement</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Problem Title *</label>
              <input
                type="text"
                required
                value={newProbTitle}
                onChange={(e) => setNewProbTitle(e.target.value)}
                placeholder="e.g. Invoicing takes 4 business days"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Description</label>
              <textarea
                rows={3}
                value={newProbDesc}
                onChange={(e) => setNewProbDesc(e.target.value)}
                placeholder="Detailed explanation of customer friction..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Impact Score (1-10): {newProbScore}</label>
              <input
                type="range"
                min={1}
                max={10}
                value={newProbScore}
                onChange={(e) => setNewProbScore(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddProblemModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-emerald-600 text-white rounded text-xs font-semibold"
              >
                Save Problem
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Persona */}
      {showAddPersonaModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form onSubmit={handleAddPersona} className="bg-slate-900 border border-slate-800 rounded-xl max-w-md w-full p-5 space-y-4">
            <h3 className="font-bold text-slate-100 text-sm">Add Persona Profile</h3>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Name *</label>
                <input
                  type="text"
                  required
                  value={newPersName}
                  onChange={(e) => setNewPersName(e.target.value)}
                  placeholder="e.g. Jordan Smith"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Role *</label>
                <input
                  type="text"
                  required
                  value={newPersRole}
                  onChange={(e) => setNewPersRole(e.target.value)}
                  placeholder="e.g. VP Operations"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Goal</label>
              <input
                type="text"
                value={newPersGoal}
                onChange={(e) => setNewPersGoal(e.target.value)}
                placeholder="e.g. Reduce manual reconciliation hours"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Primary Pain Point</label>
              <textarea
                rows={2}
                value={newPersPain}
                onChange={(e) => setNewPersPain(e.target.value)}
                placeholder="e.g. Fragmented vendor billing portals"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddPersonaModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-blue-600 text-white rounded text-xs font-semibold"
              >
                Save Persona
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Add Research Doc */}
      {showAddDocModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <form onSubmit={handleAddDoc} className="bg-slate-900 border border-slate-800 rounded-xl max-w-lg w-full p-5 space-y-4">
            <h3 className="font-bold text-slate-100 text-sm">Add Customer Research / Interview Transcript</h3>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Document Title *</label>
              <input
                type="text"
                required
                value={newDocTitle}
                onChange={(e) => setNewDocTitle(e.target.value)}
                placeholder="e.g. Customer Call Transcript - Enterprise Procurement"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Raw Interview Text / Transcript *</label>
              <textarea
                required
                rows={6}
                value={newDocContent}
                onChange={(e) => setNewDocContent(e.target.value)}
                placeholder="Paste verbatim notes, customer quotes, or support feedback here..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs text-slate-200 font-mono"
              />
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-300">
              <input
                type="checkbox"
                id="untrustedCheck"
                checked={newDocUntrusted}
                onChange={(e) => setNewDocUntrusted(e.target.checked)}
                className="rounded accent-emerald-500"
              />
              <label htmlFor="untrustedCheck" className="cursor-pointer">
                Enforce untrusted boundary tags (protects against prompt injection in raw user transcripts)
              </label>
            </div>

            <div className="flex justify-end space-x-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowAddDocModal(false)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-semibold"
              >
                Save Document
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
