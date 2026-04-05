import { getBlueprint, type BlueprintConfig, type SectionEntry } from '@tatparya/shared';

export type { BlueprintConfig, SectionEntry };

/** Get the full blueprint config for a vertical (falls back to GENERAL). */
export function getBlueprintForVertical(vertical: string): BlueprintConfig {
  return getBlueprint(vertical);
}

/** Get the default homepage section list for a vertical. */
export function getDefaultSections(vertical: string): SectionEntry[] {
  return getBlueprint(vertical).sections;
}

/** Check if a PDP feature is recommended for a vertical's blueprint. */
export function shouldUsePdpFeature(vertical: string, feature: string): boolean {
  const bp = getBlueprint(vertical);
  return bp.pdpFeatures?.includes(feature) ?? false;
}
