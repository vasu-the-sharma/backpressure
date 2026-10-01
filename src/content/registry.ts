import { type System, systemSchema } from "./schema";
import { uber } from "./systems/uber";
import { urlShortener } from "./systems/url-shortener";
import { whatsapp } from "./systems/whatsapp";

/**
 * All systems are validated here, at module load. Because the registry is
 * imported by server components that are statically generated, any schema
 * violation fails `next build` rather than reaching a browser.
 */
const sources = [uber, whatsapp, urlShortener];

const systems: System[] = sources.map((source) => systemSchema.parse(source));

const bySlug = new Map<string, System>(systems.map((s) => [s.slug, s]));

export function getAllSystems(): System[] {
  return systems;
}

export function getAllSlugs(): string[] {
  return systems.map((s) => s.slug);
}

export function getSystem(slug: string): System | undefined {
  return bySlug.get(slug);
}
