"use client";

import { samePlace, type Region } from "@/lib/core/logic";
import { Select } from "./ui/field";

export interface RegionValue {
  city: string;
  neighborhood: string;
}

/** Region filter: city and neighborhood lists built from open jobs. */
export function RegionFilter({
  regions,
  value,
  onChange,
}: {
  regions: Region[];
  value: RegionValue;
  onChange: (v: RegionValue) => void;
}) {
  const region = regions.find((r) => samePlace(r.city, value.city));
  const neighborhoods = region?.neighborhoods ?? [];
  // A selected place can lose its last open job: keep it selectable.
  const missing =
    value.neighborhood && !neighborhoods.some((n) => samePlace(n.name, value.neighborhood));
  const missingCity = value.city && !region;

  return (
    <div className="grid grid-cols-2 gap-3 sm:max-w-md">
      <label className="sr-only" htmlFor="f-city">
        Cidade
      </label>
      <Select
        id="f-city"
        value={value.city}
        onChange={(e) => onChange({ city: e.target.value, neighborhood: "" })}
      >
        <option value="">Todas as cidades</option>
        {missingCity && <option value={value.city}>{value.city} (0)</option>}
        {regions.map((r) => (
          <option key={r.city} value={r.city}>
            {r.city}/{r.state} ({r.count})
          </option>
        ))}
      </Select>
      <label className="sr-only" htmlFor="f-hood">
        Bairro
      </label>
      <Select
        id="f-hood"
        value={value.neighborhood}
        disabled={!value.city}
        onChange={(e) => onChange({ ...value, neighborhood: e.target.value })}
      >
        <option value="">{value.city ? "Todos os bairros" : "Escolha a cidade"}</option>
        {missing && <option value={value.neighborhood}>{value.neighborhood} (0)</option>}
        {neighborhoods.map((n) => (
          <option key={n.name} value={n.name}>
            {n.name} ({n.count})
          </option>
        ))}
      </Select>
    </div>
  );
}

/** "em Joinville, bairro Iririú" / "em Joinville" / "em todas as cidades" */
export function describeRegion({ city, neighborhood }: RegionValue): string {
  if (!city) return "em todas as cidades";
  return neighborhood ? `em ${city}, bairro ${neighborhood}` : `em ${city}`;
}
