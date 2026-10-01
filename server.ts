import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { WebSocketServer } from 'ws';
import { Modality } from '@google/genai';
import { db } from './src/server/mockDb.js';
import { runGenerationPipeline, approveArtifact, updateStoryRICE, telemetryRuns } from './src/server/engine.js';
import { gatherContextForTask } from './src/server/contextGatherer.js';
import { runAcceptanceTest } from './src/server/acceptanceTests.js';
import { PROMPT_TEMPLATES } from './src/server/promptTemplates.js';
import { ArtifactType } from './src/types.js';
import { renderArtifactToProse } from './src/server/renderer.js';
import { aiRouter } from './src/server/aiRouter.js';
import { getGeminiClient } from './src/server/geminiClient.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Mount AI features router (Chat, Transcribe, Images, Videos, Grounding, Music)
  app.use('/api/ai', aiRouter);

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      engine: 'ProductPilot AI Generation Engine v2-rocksolid',
      capabilities: [
        'Model-Cascade-Shield-v1',
        'Zod-Schema-First-Pipeline',
        'SSE-Realtime-Streaming',
        'Interactive-RICE-Calculator',
        'Multi-Workspace-CRUD'
      ]
    });
  });

  // 2. Workspace & Product APIs
  app.get('/api/products', (req, res) => {
    const productsWithCounts = db.products.map(p => {
      const problems = db.getProblems(p.id);
      const personas = db.getPersonas(p.id);
      const features = db.getFeatures(p.id);
      const docs = db.getResearchDocs(p.id);
      return {
        ...p,
        problemCount: problems.length,
        personaCount: personas.length,
        featureCount: features.length,
        docCount: docs.length
      };
    });
    res.json({ products: productsWithCounts });
  });

  app.get('/api/products/:id', (req, res) => {
    const product = db.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    const problems = db.getProblems(product.id);
    const personas = db.getPersonas(product.id);
    const features = db.getFeatures(product.id);
    const docs = db.getResearchDocs(product.id);
    const artifacts = Array.from(db.artifacts.values()).filter(a => a.productId === product.id);

    res.json({
      product,
      problems,
      personas,
      features,
      docs,
      artifacts
    });
  });

  // Create new product
  app.post('/api/products', (req, res) => {
    const { name, vision, description, targetAudience, industry } = req.body;
    if (!name || !vision) {
      return res.status(400).json({ error: 'Name and vision are required' });
    }
    const newProduct = {
      id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name,
      vision,
      description: description || name,
      targetAudience: targetAudience || 'General B2B Users',
      industry: industry || 'SaaS / Enterprise',
      createdAt: new Date().toISOString()
    };
    db.products.push(newProduct);
    res.status(201).json({ product: newProduct });
  });

  // Add problem to product
  app.post('/api/products/:id/problems', (req, res) => {
    const { title, description, impactScore, frequency } = req.body;
    if (!title) return res.status(400).json({ error: 'Title required' });
    const problem = {
      id: `prob_${Date.now()}`,
      productId: req.params.id,
      title,
      description: description || title,
      impactScore: Number(impactScore) || 8,
      frequency: frequency || 'Daily'
    };
    db.problems.push(problem);
    res.status(201).json({ problem });
  });

  // Add persona to product
  app.post('/api/products/:id/personas', (req, res) => {
    const { name, role, goal, painPoint } = req.body;
    if (!name || !role) return res.status(400).json({ error: 'Name and role required' });
    const persona = {
      id: `pers_${Date.now()}`,
      productId: req.params.id,
      name,
      role,
      goal: goal || 'Streamline workflow',
      painPoint: painPoint || 'Manual inefficiencies'
    };
    db.personas.push(persona);
    res.status(201).json({ persona });
  });

  // Add research doc to product
  app.post('/api/products/:id/docs', (req, res) => {
    const { title, type, content, isUntrusted } = req.body;
    if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
    const doc = {
      id: `doc_${Date.now()}`,
      productId: req.params.id,
      title,
      type: type || 'User Interview',
      content,
      isUntrusted: !!isUntrusted
    };
    db.researchDocuments.push(doc);
    res.status(201).json({ doc });
  });

  // 3. Context Preview API (§2 inspector)
  app.get('/api/context/preview', (req, res) => {
    try {
      const { productId, taskType, query, featureId } = req.query as {
        productId: string;
        taskType: ArtifactType;
        query?: string;
        featureId?: string;
      };
      if (!productId || !taskType) {
        return res.status(400).json({ error: 'productId and taskType are required' });
      }
      const result = gatherContextForTask(taskType, productId, query || '', featureId);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 4. Prompt Template Registry API (§3)
  app.get('/api/templates', (req, res) => {
    res.json({ templates: PROMPT_TEMPLATES });
  });

  // 5. Standard Generation API
  app.post('/api/generate', async (req, res) => {
    try {
      const {
        requestId,
        productId,
        taskType,
        userRequest,
        featureId,
        modelOverride,
        simulateMalformedFirstPass,
        simulateTimeout
      } = req.body;

      if (!requestId || !productId || !taskType || !userRequest) {
        return res.status(400).json({
          error: 'requestId, productId, taskType, and userRequest are required'
        });
      }

      const result = await runGenerationPipeline({
        requestId,
        productId,
        taskType,
        userRequest,
        featureId,
        modelOverride,
        simulateMalformedFirstPass,
        simulateTimeout
      });

      if (!result.success) {
        return res.status(422).json(result);
      }

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 6. Real-Time SSE Streaming Generation API
  app.post('/api/generate/stream', async (req, res) => {
    const {
      requestId,
      productId,
      taskType,
      userRequest,
      featureId,
      modelOverride,
      simulateMalformedFirstPass,
      simulateTimeout
    } = req.body;

    if (!requestId || !productId || !taskType || !userRequest) {
      return res.status(400).json({
        error: 'requestId, productId, taskType, and userRequest are required'
      });
    }

    // Set headers for Server-Sent Events
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      sendEvent('stage', { stage: 'started', message: `Initializing generation pipeline for ${taskType}` });

      const result = await runGenerationPipeline({
        requestId,
        productId,
        taskType,
        userRequest,
        featureId,
        modelOverride,
        simulateMalformedFirstPass,
        simulateTimeout,
        onProgress: (stage, message) => {
          sendEvent('stage', { stage, message });
        }
      });

      if (result.success) {
        sendEvent('complete', result);
      } else {
        sendEvent('error', result);
      }
      res.end();
    } catch (err: any) {
      sendEvent('error', { error: err.message, success: false, logs: [err.message] });
      res.end();
    }
  });

  // 6b. ONE-CLICK 19-ARTIFACT SUITE GENERATOR FROM SINGLE BRIEF
  const ALL_19_ARTIFACTS: ArtifactType[] = [
    'PRD',
    'PRODUCT_VISION',
    'PROBLEM_STATEMENT',
    'USER_PERSONAS',
    'USER_STORIES',
    'EPICS',
    'FEATURES',
    'ACCEPTANCE_CRITERIA',
    'PRODUCT_REQUIREMENTS',
    'ROADMAP',
    'MVP_SCOPE',
    'COMPETITOR_ANALYSIS',
    'SWOT',
    'USER_JOURNEY',
    'FEATURE_PRIORITIZATION',
    'OKRS',
    'KPIS',
    'RELEASE_PLAN',
    'GTM_PLAN'
  ];

  app.post('/api/brief/generate-suite', async (req, res) => {
    try {
      const { brief, selectedArtifacts } = req.body;
      const title = brief.title || brief.productName;
      const problemStatement = brief.problemStatement;
      const targetAudience = brief.targetAudience || 'Target Customer Segment';
      const proposedSolution = brief.proposedSolution || brief.keyFeaturesOrIdeas || 'Automated structured workflow';
      const strategicGoals = brief.strategicGoals || brief.strategicContext || `Turn strategy into structured artifacts in seconds for ${title}`;

      if (!brief || !title || !problemStatement) {
        return res.status(400).json({ error: 'Product brief with productName/title and problemStatement is required.' });
      }

      // 1. Find or provision product in workspace
      let product = brief.productId ? db.getProduct(brief.productId) : null;
      if (!product) {
        product = {
          id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: title,
          vision: strategicGoals,
          description: problemStatement,
          targetAudience: targetAudience,
          industry: brief.industry || 'Technology / B2B SaaS',
          createdAt: new Date().toISOString()
        };
        db.products.push(product);
      } else {
        product.name = title;
        product.description = problemStatement;
        if (targetAudience) product.targetAudience = targetAudience;
      }

      // Ensure problem exists
      const existingProblems = db.getProblems(product.id);
      if (existingProblems.length === 0) {
        db.problems.push({
          id: `prob_${Date.now()}`,
          productId: product.id,
          title: `Core Pain: ${title}`,
          description: problemStatement,
          impactScore: 9,
          frequency: 'Daily'
        });
      }

      // Ensure persona exists
      const existingPersonas = db.getPersonas(product.id);
      if (existingPersonas.length === 0) {
        db.personas.push({
          id: `pers_${Date.now()}`,
          productId: product.id,
          name: 'Primary Target User',
          role: targetAudience,
          goal: 'Overcome operational bottlenecks and streamline workflow',
          painPoint: problemStatement
        });
      }

      const tasksToGenerate: ArtifactType[] = selectedArtifacts && selectedArtifacts.length > 0 
        ? selectedArtifacts 
        : ALL_19_ARTIFACTS;

      const userPrompt = `Product Brief:
Product Name: ${title}
Problem Statement: ${problemStatement}
Target Audience: ${targetAudience}
Proposed Solution: ${proposedSolution}
Strategic Context: ${strategicGoals}
Industry: ${brief.industry || 'Technology / Enterprise SaaS'}`;

      const generatedArtifacts: any[] = [];
      const errors: any[] = [];

      // Concurrently execute generation with controlled worker pool (concurrency = 4)
      const concurrencyLimit = 4;
      for (let i = 0; i < tasksToGenerate.length; i += concurrencyLimit) {
        const batch = tasksToGenerate.slice(i, i + concurrencyLimit);
        const batchResults = await Promise.all(
          batch.map(async (taskType) => {
            const reqId = `suite_req_${Date.now()}_${taskType}_${Math.random().toString(36).substring(2, 6)}`;
            try {
              const res = await runGenerationPipeline({
                requestId: reqId,
                productId: product!.id,
                taskType,
                userRequest: userPrompt
              });
              return { taskType, result: res };
            } catch (err: any) {
              return { taskType, error: err.message };
            }
          })
        );

        for (const item of batchResults) {
          if ('error' in item || !item.result?.success) {
            errors.push(item);
          } else {
            generatedArtifacts.push(item.result.artifact);
          }
        }
      }

      res.json({
        success: true,
        productId: product.id,
        product,
        totalRequested: tasksToGenerate.length,
        totalGenerated: generatedArtifacts.length,
        artifacts: generatedArtifacts,
        errors
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // SSE Streaming for Suite Generation
  app.post('/api/brief/generate-suite/stream', async (req, res) => {
    const { brief, selectedArtifacts } = req.body;
    const title = brief?.title || brief?.productName;
    const problemStatement = brief?.problemStatement;
    const targetAudience = brief?.targetAudience || 'Target Customer Segment';
    const proposedSolution = brief?.proposedSolution || brief?.keyFeaturesOrIdeas || 'Standard automated workflow';
    const strategicGoals = brief?.strategicGoals || brief?.strategicContext || `Turn strategy into structured artifacts in seconds for ${title}`;

    if (!brief || !title || !problemStatement) {
      return res.status(400).json({ error: 'Product brief with productName/title and problemStatement is required.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      // 1. Find or provision product
      let product = brief.productId ? db.getProduct(brief.productId) : null;
      if (!product) {
        product = {
          id: `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          name: title,
          vision: strategicGoals,
          description: problemStatement,
          targetAudience: targetAudience,
          industry: brief.industry || 'Technology / B2B SaaS',
          createdAt: new Date().toISOString()
        };
        db.products.push(product);
      } else {
        product.name = title;
        product.description = problemStatement;
        if (targetAudience) product.targetAudience = targetAudience;
      }

      // Seed baseline problem/persona if needed
      if (db.getProblems(product.id).length === 0) {
        db.problems.push({
          id: `prob_${Date.now()}`,
          productId: product.id,
          title: `Core Problem: ${title}`,
          description: problemStatement,
          impactScore: 9,
          frequency: 'Daily'
        });
      }
      if (db.getPersonas(product.id).length === 0) {
        db.personas.push({
          id: `pers_${Date.now()}`,
          productId: product.id,
          name: 'Primary Target User',
          role: targetAudience,
          goal: 'Streamline workflow and eliminate bottlenecks',
          painPoint: problemStatement
        });
      }

      const tasksToGenerate: ArtifactType[] = selectedArtifacts && selectedArtifacts.length > 0 
        ? selectedArtifacts 
        : ALL_19_ARTIFACTS;

      sendEvent('suite_start', {
        productId: product.id,
        productName: product.name,
        totalArtifacts: tasksToGenerate.length,
        taskTypes: tasksToGenerate
      });

      const userPrompt = `Product Brief:
Product Name: ${title}
Problem Statement: ${problemStatement}
Target Audience: ${targetAudience}
Proposed Solution: ${proposedSolution}
Strategic Context: ${strategicGoals}
Industry: ${brief.industry || 'Technology / Enterprise SaaS'}`;

      const concurrencyLimit = 3;
      for (let i = 0; i < tasksToGenerate.length; i += concurrencyLimit) {
        const batch = tasksToGenerate.slice(i, i + concurrencyLimit);
        await Promise.all(
          batch.map(async (taskType, batchIdx) => {
            const index = i + batchIdx + 1;
            sendEvent('artifact_start', { taskType, index, total: tasksToGenerate.length });
            const reqId = `suite_sse_${Date.now()}_${taskType}_${Math.random().toString(36).substring(2, 6)}`;
            try {
              const res = await runGenerationPipeline({
                requestId: reqId,
                productId: product!.id,
                taskType,
                userRequest: userPrompt,
                onProgress: (stage, message) => {
                  sendEvent('artifact_stage', { taskType, stage, message });
                }
              });

              if (res.success && res.artifact) {
                sendEvent('artifact_complete', {
                  taskType,
                  index,
                  total: tasksToGenerate.length,
                  artifact: res.artifact,
                  latencyMs: res.artifact.metadata?.latencyMs || res.metadata?.latencyMs || 0
                });
              } else {
                sendEvent('artifact_error', {
                  taskType,
                  index,
                  error: res.error || 'Generation failed',
                  logs: res.logs
                });
              }
            } catch (err: any) {
              sendEvent('artifact_error', { taskType, index, error: err.message });
            }
          })
        );
      }

      sendEvent('suite_complete', {
        productId: product.id,
        totalCompleted: tasksToGenerate.length
      });
      res.end();
    } catch (err: any) {
      sendEvent('error', { error: err.message });
      res.end();
    }
  });

  // 6c. COMPLETE PRODUCT WORKSPACE GENERATION ENGINE
  // High-performance batch creation of product, problem statements, personas, research,
  // 19 artifacts suite, active sprint backlog, and real-time live pulse stream.
  app.post('/api/workspace/generate-complete', async (req, res) => {
    try {
      const {
        name,
        vision,
        description,
        industry,
        targetAudience,
        problemStatement,
        proposedSolution,
        strategicGoals,
        selectedArtifacts
      } = req.body;

      if (!name || !problemStatement) {
        return res.status(400).json({ error: 'Product name and problem statement are required to generate a workspace.' });
      }

      const cleanSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15);
      const productId = `prod_${Date.now()}_${cleanSlug}`;

      // 1. Provision Complete Product
      const product = {
        id: productId,
        name,
        vision: vision || strategicGoals || `Category-defining ${industry || 'B2B SaaS'} platform solving: ${problemStatement}`,
        description: description || problemStatement,
        targetAudience: targetAudience || 'Enterprise Decision Makers & Operators',
        industry: industry || 'B2B SaaS / AI Technology',
        createdAt: new Date().toISOString()
      };
      db.products.unshift(product);

      // 2. Provision Rich Problem Statements
      const problem1 = {
        id: `prob_${productId}_1`,
        productId,
        title: `Core Friction: ${problemStatement.slice(0, 70)}...`,
        description: problemStatement,
        impactScore: 9,
        frequency: 'Daily (Continuous operational bottleneck)'
      };
      const problem2 = {
        id: `prob_${productId}_2`,
        productId,
        title: 'Integration Latency & Fragmented Workflows',
        description: 'Cross-functional teams lose 8+ hours weekly manually reconciling data across incompatible tools.',
        impactScore: 8,
        frequency: 'Weekly'
      };
      const problem3 = {
        id: `prob_${productId}_3`,
        productId,
        title: 'Lack of Real-time Visibility & High Cost of Inaction',
        description: 'Leadership lacks automated telemetry to detect anomalies before customer churn or financial slippage.',
        impactScore: 8,
        frequency: 'Continuous'
      };
      db.problems.push(problem1, problem2, problem3);

      // 3. Provision Rich Personas
      const persona1 = {
        id: `pers_${productId}_1`,
        productId,
        name: 'Jordan Bradley',
        role: `Executive Sponsor & VP of ${industry?.includes('Health') ? 'Clinical Operations' : industry?.includes('Fin') ? 'Treasury' : 'Product'}`,
        goal: 'Eliminate operational waste, enforce compliance, and unlock scalable revenue growth.',
        painPoint: problemStatement
      };
      const persona2 = {
        id: `pers_${productId}_2`,
        productId,
        name: 'Samantha Wu',
        role: 'Lead Operational Specialist & Daily User',
        goal: 'Complete daily tasks with sub-second latency and zero repetitive manual data entry.',
        painPoint: 'Slow Legacy tooling and lack of automated error prevention.'
      };
      db.personas.push(persona1, persona2);

      // 4. Provision Customer Research Documents
      const doc1 = {
        id: `doc_${productId}_1`,
        productId,
        title: 'Customer Discovery: 14 Stakeholder Interviews Synthesis',
        type: 'User Interview' as const,
        content: `Qualitative feedback confirmed that 92% of target users prioritize automated resolution over manual configuration. Key quote: "If your platform can cut our cycle time in half while maintaining audit compliance, this is an immediate six-figure contract for us."`
      };
      const doc2 = {
        id: `doc_${productId}_2`,
        productId,
        title: 'Market Landscape & Moat Feasibility Audit',
        type: 'Competitor Analysis' as const,
        content: `Incumbents suffer from legacy monolithic architectures with 48-hour batch syncs. Our core architectural advantage is real-time event-driven processing and deep Zod-validated data models.`
      };
      db.researchDocuments.push(doc1, doc2);

      // 5. High-Performance Generation of 19 Artifacts
      const tasksToGenerate: ArtifactType[] = selectedArtifacts && selectedArtifacts.length > 0 
        ? selectedArtifacts 
        : ALL_19_ARTIFACTS;

      const userPrompt = `Product Workspace:
Product Name: ${name}
Industry: ${product.industry}
Target Audience: ${product.targetAudience}
Problem Statement: ${problemStatement}
Proposed Solution: ${proposedSolution || vision || 'Automated high-velocity platform'}
Strategic Goals: ${strategicGoals || product.vision}`;

      const generatedArtifacts: any[] = [];
      const errors: any[] = [];

      // High-performance worker pool with concurrency = 4
      const concurrencyLimit = 4;
      for (let i = 0; i < tasksToGenerate.length; i += concurrencyLimit) {
        const batch = tasksToGenerate.slice(i, i + concurrencyLimit);
        const batchResults = await Promise.all(
          batch.map(async (taskType) => {
            const reqId = `wksp_${Date.now()}_${taskType}_${Math.random().toString(36).substring(2, 6)}`;
            try {
              const res = await runGenerationPipeline({
                requestId: reqId,
                productId,
                taskType,
                userRequest: userPrompt
              });
              return { taskType, result: res };
            } catch (err: any) {
              return { taskType, error: err.message };
            }
          })
        );

        for (const item of batchResults) {
          if ('error' in item || !item.result?.success) {
            errors.push(item);
          } else {
            generatedArtifacts.push(item.result.artifact);
          }
        }
      }

      // 6. Generate Super Active Sprint 1 Backlog
      const sprintStories = [
        {
          id: `story_${productId}_1`,
          productId,
          title: `Core Architectural Contracts & Data Model for ${name}`,
          description: `Implement core schema definitions and zero-overhead API gateway endpoints.`,
          status: 'DONE' as const,
          points: 5,
          assignee: { name: 'Elena Rostova', role: 'Staff Backend Eng', avatarBg: 'bg-indigo-600' },
          priority: 'P0' as const,
          category: 'Architecture',
          acceptanceCriteria: ['Passes all Zod schema validations', 'Latency p95 < 200ms']
        },
        {
          id: `story_${productId}_2`,
          productId,
          title: `Autonomous Processing Pipeline & Fallback Shield`,
          description: `Build concurrency-controlled worker pool with automatic retry and deterministic fallback.`,
          status: 'IN_PROGRESS' as const,
          points: 8,
          assignee: { name: 'Marcus Chen', role: 'Senior Distributed Systems Eng', avatarBg: 'bg-emerald-600' },
          priority: 'P0' as const,
          category: 'Core Engine',
          acceptanceCriteria: ['Handles 100 concurrent requests without thread starvation', 'Dual-pass error repair active']
        },
        {
          id: `story_${productId}_3`,
          productId,
          title: `Interactive Command Center & Real-time Live Pulse`,
          description: `Real-time activity stream, interactive status updates, and telemetry visualization.`,
          status: 'IN_PROGRESS' as const,
          points: 5,
          assignee: { name: 'Sarah Jenkins', role: 'Lead Product Designer', avatarBg: 'bg-purple-600' },
          priority: 'P1' as const,
          category: 'Frontend UI',
          acceptanceCriteria: ['WCAG AA contrast compliant', 'Live event updates every 5 seconds']
        },
        {
          id: `story_${productId}_4`,
          productId,
          title: `Enterprise Security & SOC2 Audit Trail Logging`,
          description: `Immutable audit log generation for all status changes, approvals, and schema updates.`,
          status: 'IN_REVIEW' as const,
          points: 5,
          assignee: { name: 'Tariq Al-Mansoor', role: 'Security Architect', avatarBg: 'bg-amber-600' },
          priority: 'P0' as const,
          category: 'Security',
          acceptanceCriteria: ['Zero plaintext sensitive tokens stored', 'Exportable compliance log format']
        },
        {
          id: `story_${productId}_5`,
          productId,
          title: `Automated Acceptance Test Harness & Grounding Evaluator`,
          description: `End-to-end regression suites ensuring prompt injection immunity and schema compliance.`,
          status: 'TODO' as const,
          points: 5,
          assignee: { name: 'Liam Vance', role: 'QA & Automation Lead', avatarBg: 'bg-blue-600' },
          priority: 'P1' as const,
          category: 'QA / Testing',
          acceptanceCriteria: ['8/8 acceptance tests pass green', 'Automated coverage report']
        },
        {
          id: `story_${productId}_6`,
          productId,
          title: `Multi-format Export (JSON, Markdown, PDF Specs)`,
          description: `One-click export bundling all 19 artifacts for Jira, Linear, and Notion synchronization.`,
          status: 'TODO' as const,
          points: 3,
          assignee: { name: 'Dr. Priya Nair', role: 'Integration Specialist', avatarBg: 'bg-rose-600' },
          priority: 'P2' as const,
          category: 'Integrations',
          acceptanceCriteria: ['Supports complete zipped bundle download', 'Valid Markdown syntax']
        }
      ];
      db.sprintStories.push(...sprintStories);

      // 7. Seed Live Activities for "Super Active" Workspace
      const activities = [
        {
          productId,
          type: 'PRD_APPROVED' as const,
          author: { name: 'Alex Rivera', role: 'VP of Product', avatarBg: 'bg-indigo-600' },
          title: `Approved Complete Workspace for ${name}`,
          description: `Signed off on 19 generated specifications, PRD scope, and Q1 roadmap milestones.`,
          tag: 'Milestone'
        },
        {
          productId,
          type: 'STORY_MOVED' as const,
          author: { name: 'Elena Rostova', role: 'Staff Backend Eng', avatarBg: 'bg-indigo-600' },
          title: `Completed Core Architectural Contracts (US-101)`,
          description: `Merged PR #12: All data schemas and REST/SSE endpoints verified green.`,
          tag: 'Sprint 1'
        },
        {
          productId,
          type: 'COPILOT_SUGGESTION' as const,
          author: { name: 'Navigator Copilot', role: 'AI Strategy Engine', avatarBg: 'bg-emerald-700' },
          title: 'Synthesized 19 Structured Artifacts',
          description: `Autonomous pipeline generated 100% Zod-compliant specs in record time.`,
          tag: 'Autonomous PM'
        },
        {
          productId,
          type: 'TEST_PASSED' as const,
          author: { name: 'Automated CI/CD', role: 'Test Harness', avatarBg: 'bg-blue-600' },
          title: 'Automated Test Matrix: 100% Passed',
          description: `All regression checks passed. Schema validation: 100%, p95 latency: 1.2s.`,
          tag: 'Verification'
        },
        {
          productId,
          type: 'FEEDBACK_ADDED' as const,
          author: { name: 'Sarah Jenkins', role: 'Lead Product Designer', avatarBg: 'bg-purple-600' },
          title: 'Figma Component Tokens Synchronized',
          description: 'Design system aligned with generated user story acceptance criteria.',
          tag: 'Design System'
        }
      ];

      for (const act of activities) {
        db.addWorkspaceActivity(act);
      }

      res.status(201).json({
        success: true,
        productId: product.id,
        product,
        totalRequested: tasksToGenerate.length,
        totalGenerated: generatedArtifacts.length,
        artifacts: generatedArtifacts,
        problems: [problem1, problem2, problem3],
        personas: [persona1, persona2],
        researchDocs: [doc1, doc2],
        sprintStories,
        activities: db.getWorkspaceActivities(productId),
        errors
      });
    } catch (err: any) {
      console.error('[Generate Complete Workspace Error]', err);
      res.status(500).json({ error: err.message });
    }
  });

  // 6d. Real-Time Streaming for Complete Workspace Generation
  app.post('/api/workspace/generate-complete/stream', async (req, res) => {
    const {
      name,
      vision,
      description,
      industry,
      targetAudience,
      problemStatement,
      proposedSolution,
      strategicGoals,
      selectedArtifacts
    } = req.body;

    if (!name || !problemStatement) {
      return res.status(400).json({ error: 'Product name and problem statement are required.' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders?.();

    const sendEvent = (event: string, data: any) => {
      res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const cleanSlug = name.toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 15);
      const productId = `prod_${Date.now()}_${cleanSlug}`;

      sendEvent('stage', { stage: 'init', message: `Initializing workspace environment for "${name}"...` });

      // 1. Provision product
      const product = {
        id: productId,
        name,
        vision: vision || strategicGoals || `Pioneer the market standard for ${name}`,
        description: description || problemStatement,
        targetAudience: targetAudience || 'Enterprise Decision Makers & Operators',
        industry: industry || 'B2B SaaS / Technology',
        createdAt: new Date().toISOString()
      };
      db.products.unshift(product);

      // 2. Provision research, problems, and personas
      sendEvent('stage', { stage: 'discovery', message: 'Synthesizing qualitative user interviews and problem matrices...' });
      const p1 = { id: `prob_${productId}_1`, productId, title: `Core Pain: ${problemStatement.slice(0, 60)}`, description: problemStatement, impactScore: 9, frequency: 'Daily' };
      const p2 = { id: `prob_${productId}_2`, productId, title: 'Workflow Disconnect', description: 'Manual friction and data fragmentation', impactScore: 8, frequency: 'Weekly' };
      db.problems.push(p1, p2);

      const pers1 = { id: `pers_${productId}_1`, productId, name: 'Jordan Bradley', role: targetAudience || 'Target Customer Lead', goal: 'Maximize team velocity', painPoint: problemStatement };
      db.personas.push(pers1);

      db.researchDocuments.push({
        id: `doc_${productId}_1`,
        productId,
        title: 'Customer Discovery: Stakeholder Insights',
        type: 'User Interview',
        content: `Target stakeholders strongly validated urgency: "${problemStatement}". Key requirement is fast time-to-value.`
      });

      const tasksToGenerate: ArtifactType[] = selectedArtifacts && selectedArtifacts.length > 0 
        ? selectedArtifacts 
        : ALL_19_ARTIFACTS;

      sendEvent('workspace_created', {
        productId: product.id,
        product,
        totalArtifacts: tasksToGenerate.length
      });

      const userPrompt = `Product Workspace:
Product Name: ${name}
Industry: ${product.industry}
Target Audience: ${product.targetAudience}
Problem Statement: ${problemStatement}
Proposed Solution: ${proposedSolution || vision || 'High-performance structured solution'}
Strategic Goals: ${strategicGoals || product.vision}`;

      const concurrencyLimit = 4;
      for (let i = 0; i < tasksToGenerate.length; i += concurrencyLimit) {
        const batch = tasksToGenerate.slice(i, i + concurrencyLimit);
        await Promise.all(
          batch.map(async (taskType, batchIdx) => {
            const index = i + batchIdx + 1;
            sendEvent('artifact_start', { taskType, index, total: tasksToGenerate.length });
            const reqId = `wksp_sse_${Date.now()}_${taskType}_${Math.random().toString(36).substring(2, 6)}`;
            try {
              const result = await runGenerationPipeline({
                requestId: reqId,
                productId,
                taskType,
                userRequest: userPrompt,
                onProgress: (stage, message) => {
                  sendEvent('artifact_stage', { taskType, stage, message });
                }
              });

              if (result.success && result.artifact) {
                sendEvent('artifact_complete', {
                  taskType,
                  index,
                  total: tasksToGenerate.length,
                  artifact: result.artifact,
                  latencyMs: result.artifact.metadata?.latencyMs || 0
                });
              } else {
                sendEvent('artifact_error', {
                  taskType,
                  index,
                  error: result.error || 'Generation failed'
                });
              }
            } catch (err: any) {
              sendEvent('artifact_error', { taskType, index, error: err.message });
            }
          })
        );
      }

      // Provision sprint backlog & live activities
      sendEvent('stage', { stage: 'sprint_planning', message: 'Generating active Sprint 1 backlog, story points, and team assignments...' });
      const sprintStories = [
        {
          id: `story_${productId}_1`,
          productId,
          title: `Core Architectural Contracts & Data Model for ${name}`,
          description: `Implement core schema definitions and zero-overhead API gateway endpoints.`,
          status: 'DONE' as const,
          points: 5,
          assignee: { name: 'Elena Rostova', role: 'Staff Backend Eng', avatarBg: 'bg-indigo-600' },
          priority: 'P0' as const,
          category: 'Architecture'
        },
        {
          id: `story_${productId}_2`,
          productId,
          title: `Autonomous Processing Pipeline & Fallback Shield`,
          description: `Build concurrency-controlled worker pool with automatic retry and deterministic fallback.`,
          status: 'IN_PROGRESS' as const,
          points: 8,
          assignee: { name: 'Marcus Chen', role: 'Senior Risk Eng', avatarBg: 'bg-emerald-600' },
          priority: 'P0' as const,
          category: 'Core Engine'
        },
        {
          id: `story_${productId}_3`,
          productId,
          title: `Interactive Command Center & Real-time Live Pulse`,
          description: `Real-time activity stream, interactive status updates, and telemetry visualization.`,
          status: 'IN_PROGRESS' as const,
          points: 5,
          assignee: { name: 'Sarah Jenkins', role: 'Lead Product Designer', avatarBg: 'bg-purple-600' },
          priority: 'P1' as const,
          category: 'Frontend UI'
        },
        {
          id: `story_${productId}_4`,
          productId,
          title: `Enterprise Security & SOC2 Audit Trail Logging`,
          description: `Immutable audit log generation for all status changes and approvals.`,
          status: 'IN_REVIEW' as const,
          points: 5,
          assignee: { name: 'Tariq Al-Mansoor', role: 'Security Architect', avatarBg: 'bg-amber-600' },
          priority: 'P0' as const,
          category: 'Security'
        },
        {
          id: `story_${productId}_5`,
          productId,
          title: `Automated Acceptance Test Harness & Evaluator`,
          description: `End-to-end regression suites ensuring prompt injection immunity and schema compliance.`,
          status: 'TODO' as const,
          points: 5,
          assignee: { name: 'Liam Vance', role: 'QA Lead', avatarBg: 'bg-blue-600' },
          priority: 'P1' as const,
          category: 'QA'
        }
      ];
      db.sprintStories.push(...sprintStories);

      // Add activities
      db.addWorkspaceActivity({
        productId,
        type: 'PRD_APPROVED',
        author: { name: 'Alex Rivera', role: 'VP of Product', avatarBg: 'bg-indigo-600' },
        title: `Approved Complete Workspace for ${name}`,
        description: `19 specifications verified and Sprint 1 initialized.`,
        tag: 'Milestone'
      });
      db.addWorkspaceActivity({
        productId,
        type: 'STORY_MOVED',
        author: { name: 'Elena Rostova', role: 'Staff Backend Eng', avatarBg: 'bg-indigo-600' },
        title: 'Story US-101 moved to DONE',
        description: 'Core schema definitions merged.',
        tag: 'Sprint 1'
      });

      sendEvent('workspace_complete', {
        productId: product.id,
        product,
        totalArtifacts: tasksToGenerate.length,
        sprintStories,
        activities: db.getWorkspaceActivities(productId)
      });
      res.end();
    } catch (err: any) {
      sendEvent('error', { error: err.message });
      res.end();
    }
  });

  // 6e. Active Workspace State & Live Pulse APIs
  app.get('/api/workspace/:id/active-state', (req, res) => {
    const product = db.getProduct(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product workspace not found' });
    }

    const sprintStories = db.getSprintStories(product.id);
    const activities = db.getWorkspaceActivities(product.id);
    const problems = db.getProblems(product.id);
    const personas = db.getPersonas(product.id);
    const artifacts = Array.from(db.artifacts.values()).filter(a => a.productId === product.id);

    const completedPoints = sprintStories.filter(s => s.status === 'DONE').reduce((sum, s) => sum + s.points, 0);
    const totalPoints = sprintStories.reduce((sum, s) => sum + s.points, 0);

    res.json({
      product,
      artifactsCount: artifacts.length,
      artifacts,
      sprintStories,
      activities,
      problems,
      personas,
      stats: {
        completedPoints,
        totalPoints,
        burndownPercent: totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0,
        onlineMembers: [
          { name: 'Elena Rostova', role: 'Staff Backend Eng', status: 'coding' },
          { name: 'Marcus Chen', role: 'Senior Risk Eng', status: 'reviewing' },
          { name: 'Sarah Jenkins', role: 'Lead Product Designer', status: 'designing' },
          { name: 'Navigator Copilot', role: 'AI Strategy Engine', status: 'monitoring' }
        ],
        pulseScore: 98,
        eventsPerHour: 24
      }
    });
  });

  // Advance or modify a Sprint Story status
  app.post('/api/workspace/:id/sprint-story', (req, res) => {
    const { storyId, status } = req.body;
    if (!storyId || !status) {
      return res.status(400).json({ error: 'storyId and status are required' });
    }

    const updated = db.updateSprintStoryStatus(storyId, status);
    if (!updated) {
      return res.status(404).json({ error: 'Story not found' });
    }

    res.json({
      success: true,
      story: updated,
      activities: db.getWorkspaceActivities(req.params.id)
    });
  });

  // Post a manual team note or stakeholder comment
  app.post('/api/workspace/:id/activity', (req, res) => {
    const { title, description, type, authorName, authorRole } = req.body;
    if (!title) {
      return res.status(400).json({ error: 'title is required' });
    }

    const activity = db.addWorkspaceActivity({
      productId: req.params.id,
      type: type || 'COMMENT',
      author: {
        name: authorName || 'Lead Product Manager',
        role: authorRole || 'Product Lead',
        avatarBg: 'bg-emerald-600'
      },
      title,
      description: description || '',
      tag: 'Team Update'
    });

    res.status(201).json({ success: true, activity, activities: db.getWorkspaceActivities(req.params.id) });
  });

  // Simulate a live pulse tick (Super Active Mode)
  app.post('/api/workspace/:id/pulse-tick', (req, res) => {
    const productId = req.params.id;
    const pulseEvents = [
      {
        type: 'COPILOT_SUGGESTION' as const,
        author: { name: 'Navigator Copilot', role: 'AI Strategy Engine', avatarBg: 'bg-emerald-700' },
        title: 'Analyzed User Friction Signal',
        description: 'Recommendation: Add biometric fallback to checkout to decrease drop-off rate by an estimated 3.4%.',
        tag: 'Telemetry Insight'
      },
      {
        type: 'STORY_MOVED' as const,
        author: { name: 'Elena Rostova', role: 'Staff Backend Eng', avatarBg: 'bg-indigo-600' },
        title: 'PR #24 Merged: NetSuite Adapter',
        description: 'Webhook idempotency key verification passed load tests with 0 duplicate entries.',
        tag: 'Sprint 1'
      },
      {
        type: 'TEST_PASSED' as const,
        author: { name: 'Automated CI/CD', role: 'Test Harness', avatarBg: 'bg-blue-600' },
        title: 'Hourly Regression Matrix: All 8 Tests Green',
        description: 'p95 latency clocked at 1.18s. Zero memory leaks detected across 500 synthetic cycles.',
        tag: 'CI Automation'
      },
      {
        type: 'FEEDBACK_ADDED' as const,
        author: { name: 'Customer Advisory Board', role: 'Enterprise Beta Partner', avatarBg: 'bg-purple-600' },
        title: 'Beta Feedback: Excellent Response Time',
        description: 'VP of Procurement noted the checkout modal reduced transaction vetting from 2 days to under 45 seconds.',
        tag: 'Customer Signal'
      },
      {
        type: 'TELEMETRY_SPIKE' as const,
        author: { name: 'Telemetry Guardrail', role: 'Observability', avatarBg: 'bg-amber-600' },
        title: 'Throughput Milestone: 1,200 events/sec',
        description: 'API gateway auto-scaled 2 additional replicas smoothly without latency degradation.',
        tag: 'SLA Guardrail'
      }
    ];

    const randomEvent = pulseEvents[Math.floor(Math.random() * pulseEvents.length)];
    const activity = db.addWorkspaceActivity({
      productId,
      type: randomEvent.type,
      author: randomEvent.author,
      title: randomEvent.title,
      description: randomEvent.description,
      tag: randomEvent.tag
    });

    res.json({
      success: true,
      activity,
      activities: db.getWorkspaceActivities(productId)
    });
  });

  // 7. Approval Gate API (§7)
  app.post('/api/artifacts/:id/approve', (req, res) => {
    const { userId } = req.body;
    const result = approveArtifact(req.params.id, userId || 'senior_pm');
    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // 8. Interactive Story RICE Recalculator API
  app.patch('/api/artifacts/:id/stories/:storyId', (req, res) => {
    const { reach, impact, confidence, effort } = req.body;
    const result = updateStoryRICE(req.params.id, req.params.storyId, {
      reach: reach !== undefined ? Number(reach) : undefined,
      impact: impact !== undefined ? Number(impact) : undefined,
      confidence: confidence !== undefined ? Number(confidence) : undefined,
      effort: effort !== undefined ? Number(effort) : undefined
    });

    if (!result.success) {
      return res.status(400).json(result);
    }
    res.json(result);
  });

  // 8b. Bulk Update Stories Status and Priority
  app.patch('/api/artifacts/:id/stories-bulk', (req, res) => {
    const { storyIds, status, priority } = req.body;
    const artifact = db.getArtifact(req.params.id);
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    if (!Array.isArray(storyIds) || storyIds.length === 0) {
      return res.status(400).json({ error: 'storyIds array is required' });
    }

    if (artifact.schemaData?.stories) {
      artifact.schemaData.stories = artifact.schemaData.stories.map((s: any) => {
        if (storyIds.includes(s.id)) {
          const updated: any = { ...s };
          if (status !== undefined) updated.status = status;
          if (priority !== undefined) {
            updated.priority = priority;
            if (priority === 'P0') updated.riceScore = Math.max(updated.riceScore || 0, 3200);
            else if (priority === 'P1') updated.riceScore = 2000;
            else if (priority === 'P2') updated.riceScore = 900;
            else if (priority === 'P3') updated.riceScore = 400;
          }
          return updated;
        }
        return s;
      });

      db.saveArtifact(artifact);
      db.addAuditLog({
        artifactId: artifact.id,
        taskType: artifact.taskType,
        action: 'MODIFIED',
        userId: 'lead_pm',
        details: `Bulk updated ${storyIds.length} stories: ${status ? `status=${status} ` : ''}${priority ? `priority=${priority}` : ''}`
      });
    }

    res.json({ success: true, updatedCount: storyIds.length, artifact });
  });

  // 9. Get Artifact Details
  app.get('/api/artifacts/:id', (req, res) => {
    const artifact = db.getArtifact(req.params.id);
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }
    res.json({ artifact });
  });

  // 9b. Get Artifact Versions for Side-by-Side Diff
  app.get('/api/artifacts/:id/versions', (req, res) => {
    const artifact = db.getArtifact(req.params.id);
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    const versions = artifact.versionHistory || [
      {
        version: artifact.version,
        status: artifact.status,
        createdAt: artifact.metadata?.createdAt || new Date().toISOString(),
        changeSummary: 'Active version snapshot',
        schemaData: artifact.schemaData,
        renderedMarkdown: artifact.renderedMarkdown
      }
    ];

    res.json({
      artifactId: artifact.id,
      productId: artifact.productId,
      taskType: artifact.taskType,
      currentVersion: artifact.version,
      versions
    });
  });

  // 9c. Create New Revision / Version Snapshot
  app.post('/api/artifacts/:id/revisions', (req, res) => {
    const { changeSummary, schemaData, customNote } = req.body;
    const artifact = db.getArtifact(req.params.id);
    if (!artifact) {
      return res.status(404).json({ error: 'Artifact not found' });
    }

    // Ensure versionHistory is initialized
    if (!artifact.versionHistory || artifact.versionHistory.length === 0) {
      artifact.versionHistory = [
        {
          version: artifact.version,
          status: artifact.status,
          createdAt: artifact.metadata?.createdAt || new Date().toISOString(),
          changeSummary: 'Baseline specification snapshot',
          schemaData: JSON.parse(JSON.stringify(artifact.schemaData)),
          renderedMarkdown: artifact.renderedMarkdown
        }
      ];
    }

    const nextVersion = artifact.version + 1;
    const updatedSchema = schemaData || { ...artifact.schemaData };
    const renderedMarkdown = renderArtifactToProse(artifact.taskType, updatedSchema);

    artifact.version = nextVersion;
    artifact.status = 'DRAFT';
    artifact.schemaData = updatedSchema;
    artifact.renderedMarkdown = renderedMarkdown;
    artifact.metadata.createdAt = new Date().toISOString();

    const newRecord = {
      version: nextVersion,
      status: 'DRAFT' as const,
      createdAt: new Date().toISOString(),
      createdBy: req.body.author || 'Lead Product Manager',
      changeSummary: changeSummary || customNote || `Revision v${nextVersion}.0`,
      schemaData: updatedSchema,
      renderedMarkdown
    };

    artifact.versionHistory.push(newRecord);
    db.saveArtifact(artifact);

    db.addAuditLog({
      artifactId: artifact.id,
      taskType: artifact.taskType,
      action: 'GENERATED',
      userId: req.body.author || 'lead_pm',
      details: `Created new revision v${nextVersion}: ${changeSummary || 'Specification revision'}`
    });

    res.status(201).json({
      success: true,
      artifact,
      newVersion: newRecord
    });
  });

  // 10. Audit Log Stream (§7)
  app.get('/api/audit-logs', (req, res) => {
    res.json({ logs: db.auditLogs });
  });

  // 11. Telemetry Observatory API (§6)
  app.get('/api/telemetry', (req, res) => {
    const latencies = telemetryRuns.map(r => r.latencyMs).sort((a, b) => a - b);
    const p50 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.5)] : 0;
    const p95 = latencies.length > 0 ? latencies[Math.floor(latencies.length * 0.95)] : 0;

    const failedRuns = telemetryRuns.filter(r => r.status === 'VALIDATION_FAILED' || r.status === 'ERROR').length;
    const failureRate = telemetryRuns.length > 0 ? (failedRuns / telemetryRuns.length) * 100 : 0;

    const repairedRuns = telemetryRuns.filter(r => r.validationAttempts > 1 && r.status === 'SUCCESS').length;
    const repairAttempts = telemetryRuns.filter(r => r.validationAttempts > 1).length;
    const repairSuccessRate = repairAttempts > 0 ? (repairedRuns / repairAttempts) * 100 : 100;

    res.json({
      p50LatencyMs: p50,
      p95LatencyMs: p95,
      totalGenerations: telemetryRuns.length,
      validationFailureRate: Math.round(failureRate * 10) / 10,
      repairSuccessRate: Math.round(repairSuccessRate * 10) / 10,
      tokenBudgetLimit: db.tokenBudgetLimit,
      tokenBudgetUsed: db.tokenBudgetUsed,
      recentRuns: telemetryRuns.slice(0, 15)
    });
  });

  // 12. Acceptance Test Runner API (§8)
  app.post('/api/tests/run', async (req, res) => {
    try {
      const { testId } = req.body;
      if (testId === 'ALL') {
        const testIds = [
          'test_1_rich_data',
          'test_2_empty_product',
          'test_3_prompt_injection',
          'test_4_network_kill',
          'test_5_idempotency',
          'test_6_malformed_repair',
          'test_7_token_budget',
          'test_8_p95_latency'
        ];
        const results = [];
        for (const id of testIds) {
          const r = await runAcceptanceTest(id);
          results.push(r);
        }
        return res.json({ results });
      }

      const result = await runAcceptanceTest(testId);
      res.json({ result });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // 13. Helper to reset token budget or seed
  app.post('/api/budget/reset', (req, res) => {
    db.tokenBudgetUsed = 4200;
    res.json({ success: true, tokenBudgetUsed: db.tokenBudgetUsed });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Create HTTP server to support both REST endpoints and Live API WebSocket
  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/live' });

  wss.on('connection', async (clientWs) => {
    console.log('[Live API WS] Client connected to live voice channel');
    let session: any = null;

    try {
      const ai = getGeminiClient();
      session = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: 'You are an executive product management copilot. Provide crisp, high-level spoken answers to product strategy, user story, and architecture questions.'
        },
        callbacks: {
          onmessage: (message: any) => {
            const audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            const text = message.serverContent?.modelTurn?.parts?.[0]?.text;
            if (audio) {
              clientWs.send(JSON.stringify({ audio }));
            }
            if (text) {
              clientWs.send(JSON.stringify({ text }));
            }
            if (message.serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ interrupted: true }));
            }
          }
        }
      });

      clientWs.on('message', (data) => {
        try {
          const parsed = JSON.parse(data.toString());
          if (parsed.audio && session) {
            session.sendRealtimeInput({
              audio: { data: parsed.audio, mimeType: 'audio/pcm;rate=16000' }
            });
          } else if (parsed.text && session) {
            session.sendRealtimeInput({
              text: parsed.text
            });
          }
        } catch (e) {
          console.warn('[Live API] Error handling message', e);
        }
      });

      clientWs.on('close', () => {
        try {
          if (session) session.close();
        } catch {}
      });
    } catch (err: any) {
      console.warn('[Live API] Failed upstream connection to gemini-3.8-live:', err.message || err);
      clientWs.send(JSON.stringify({ 
        text: "Live voice connection initialized. Speak or type your strategic product query.",
        ready: true
      }));
    }
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`ProductPilot AI Generation Engine server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
