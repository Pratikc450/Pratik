import { z } from 'zod';

/**
 * Product Management & Definition Schemas
 */

export const ProductSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, 'Product name is required'),
  vision: z.string().min(1, 'Product vision is required'),
  description: z.string().optional(),
  targetAudience: z.string().optional().default('General B2B Users'),
  industry: z.string().optional().default('SaaS / Enterprise'),
  createdAt: z.string().optional()
});

export const CreateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  vision: z.string().min(1, 'Product vision is required'),
  description: z.string().optional(),
  targetAudience: z.string().optional(),
  industry: z.string().optional()
});

export const UpdateProductSchema = z.object({
  name: z.string().min(1).optional(),
  vision: z.string().min(1).optional(),
  description: z.string().optional(),
  targetAudience: z.string().optional(),
  industry: z.string().optional()
});

export const ProblemSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional(),
  title: z.string().min(1, 'Problem title is required'),
  description: z.string().optional(),
  impactScore: z.coerce.number().min(1).max(10).optional().default(8),
  frequency: z.string().optional().default('Daily')
});

export const AddProblemSchema = z.object({
  title: z.string().min(1, 'Problem title is required'),
  description: z.string().optional(),
  impactScore: z.coerce.number().min(1).max(10).optional().default(8),
  frequency: z.string().optional().default('Daily')
});

export const PersonaSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional(),
  name: z.string().min(1, 'Persona name is required'),
  role: z.string().min(1, 'Persona role is required'),
  goal: z.string().optional().default('Streamline workflow'),
  painPoint: z.string().optional().default('Manual inefficiencies'),
  painPoints: z.union([z.array(z.string()), z.string()]).optional(),
  techComfort: z.enum(['Low', 'Medium', 'High', 'Expert']).optional(),
  technicalLiteracy: z.string().optional(),
  demographics: z.string().optional(),
  jtbd: z.string().optional(),
  quote: z.string().optional()
});

export const AddPersonaSchema = z.object({
  name: z.string().min(1, 'Persona name is required'),
  role: z.string().min(1, 'Persona role is required'),
  goal: z.string().optional().default('Streamline workflow'),
  painPoint: z.string().optional().default('Manual inefficiencies'),
  painPoints: z.union([z.array(z.string()), z.string()]).optional(),
  techComfort: z.enum(['Low', 'Medium', 'High', 'Expert']).optional(),
  technicalLiteracy: z.string().optional(),
  demographics: z.string().optional(),
  jtbd: z.string().optional(),
  quote: z.string().optional()
});

export const ResearchDocSchema = z.object({
  id: z.string().optional(),
  productId: z.string().optional(),
  title: z.string().min(1, 'Document title is required'),
  content: z.string().min(1, 'Document content is required'),
  type: z.string().optional().default('User Interview'),
  isUntrusted: z.boolean().optional().default(false)
});

export const AddDocSchema = z.object({
  title: z.string().min(1, 'Document title is required'),
  content: z.string().min(1, 'Document content is required'),
  type: z.string().optional().default('User Interview'),
  isUntrusted: z.boolean().optional().default(false)
});
