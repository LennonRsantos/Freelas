// Approximate coordinates for the demo. ViaCEP returns no coordinates, so
// a published job is placed at its neighborhood's center. In production,
// geocode the full address (e.g. Google Geocoding) before saving.
import { normalizePlace } from "./logic";
import type { Address } from "./types";

type LatLng = { lat: number; lng: number };

const JOINVILLE_CENTER: LatLng = { lat: -26.3036, lng: -48.846 };

/** Joinville/SC neighborhood centers (approximate). */
const JOINVILLE: Record<string, LatLng> = {
  centro: JOINVILLE_CENTER,
  america: { lat: -26.295, lng: -48.85 },
  atiradores: { lat: -26.307, lng: -48.856 },
  "anita garibaldi": { lat: -26.317, lng: -48.85 },
  aventureiro: { lat: -26.262, lng: -48.81 },
  "boa vista": { lat: -26.298, lng: -48.822 },
  bucarein: { lat: -26.313, lng: -48.84 },
  "costa e silva": { lat: -26.272, lng: -48.872 },
  floresta: { lat: -26.331, lng: -48.852 },
  gloria: { lat: -26.294, lng: -48.87 },
  iririu: { lat: -26.281, lng: -48.82 },
  itaum: { lat: -26.33, lng: -48.835 },
  saguacu: { lat: -26.288, lng: -48.83 },
  "santo antonio": { lat: -26.272, lng: -48.857 },
};

export function approximateCoords(a: Pick<Address, "city" | "neighborhood">): LatLng {
  if (normalizePlace(a.city) === "joinville") {
    return JOINVILLE[normalizePlace(a.neighborhood)] ?? JOINVILLE_CENTER;
  }
  return JOINVILLE_CENTER;
}
