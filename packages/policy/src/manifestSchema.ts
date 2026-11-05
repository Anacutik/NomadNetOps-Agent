import { z } from 'zod';

export const ToolManifestSchema = z.object({
  version: z.string(),
  tools: z.array(
    z.object({
      id: z.string(),
      tier: z.enum(['0', '1', '2', '3']).transform((v) => Number(v) as RiskTier),
      description: z.string().optional(),
    })
  ),
});

export type RiskTier = 0 | 1 | 2 | 3;

export type ToolManifest = z.infer<typeof ToolManifestSchema>;

export function parseToolManifest(json: string): ToolManifest {
  const parsed = JSON.parse(json);
  return ToolManifestSchema.parse(parsed) as ToolManifest;
}
