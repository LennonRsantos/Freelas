"use client";

import { Search, X } from "lucide-react";
import {
  useId,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type KeyboardEvent,
  type Ref,
} from "react";
import { ROLE_GROUPS, matchesRole, type Role } from "@/lib/core/roles";
import { cn } from "@/lib/utils";
import { Chip } from "./ui/chip";

function SearchBox({
  id,
  value,
  onChange,
  placeholder,
  ref,
  ...aria
}: {
  id?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  ref?: Ref<HTMLInputElement>;
} & Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange">) {
  return (
    <div className="relative">
      <Search
        className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted"
        aria-hidden
      />
      <input
        ref={ref}
        id={id}
        type="search"
        autoComplete="off"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-11 w-full rounded-xl border border-line bg-card pr-10 pl-10 text-[15px] text-ink placeholder:text-muted/70 focus:border-ink focus:ring-2 focus:ring-ink/10 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        {...aria}
      />
      {value && (
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onChange("")}
          aria-label="Limpar busca"
          className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-lg text-muted hover:bg-subtle hover:text-ink"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
}

function useGroups(query: string) {
  return useMemo(
    () =>
      ROLE_GROUPS.map((g) => ({
        ...g,
        roles: (g.roles as readonly Role[]).filter((r) => matchesRole(r, query)),
      })).filter((g) => g.roles.length > 0),
    [query],
  );
}

/**
 * Search box + grouped chips, for forms. Single choice (publish a job) or
 * several (a freelancer's specialties).
 */
export function RoleChooser(
  props:
    | { multiple?: false; value: Role; onChange: (r: Role) => void; label: string }
    | { multiple: true; value: Role[]; onChange: (r: Role[]) => void; label: string },
) {
  const [query, setQuery] = useState("");
  const groups = useGroups(query);
  const inputId = useId();
  const selected = (r: Role) => (props.multiple ? props.value.includes(r) : props.value === r);

  function toggle(r: Role) {
    if (props.multiple) {
      props.onChange(
        props.value.includes(r) ? props.value.filter((x) => x !== r) : [...props.value, r],
      );
    } else {
      props.onChange(r);
    }
  }

  const chosen = props.multiple ? props.value : [props.value];

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-1.5 text-sm font-medium">{props.label}</legend>
      {chosen.length > 0 && (
        <p className="text-sm text-muted">
          {props.multiple ? "Escolhidas: " : "Escolhida: "}
          <span className="font-medium text-ink">{chosen.join(", ")}</span>
        </p>
      )}
      <label htmlFor={inputId} className="sr-only">
        Buscar função
      </label>
      <SearchBox
        id={inputId}
        value={query}
        onChange={setQuery}
        placeholder="Buscar função (ex.: eletricista, faxina)"
      />
      <div className="flex max-h-72 flex-col gap-4 overflow-y-auto rounded-xl border border-line p-3">
        {groups.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            Nenhuma função encontrada para “{query}”.
          </p>
        ) : (
          groups.map((g) => (
            <div key={g.id}>
              <p className="mb-2 text-xs font-semibold text-muted">{g.label}</p>
              <div className="flex flex-wrap gap-2">
                {g.roles.map((r) => (
                  <Chip key={r} selected={selected(r)} onClick={() => toggle(r)}>
                    {r}
                  </Chip>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </fieldset>
  );
}

/**
 * Feed filter: a search combobox over the whole catalog (grouped, with
 * open-job counts) plus quick chips for the roles with most open jobs.
 */
export function RoleFilter({
  value,
  onChange,
  counts,
}: {
  value: Role | "todas";
  onChange: (r: Role | "todas") => void;
  counts: Map<Role, number>;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const groups = useGroups(query);
  const flat = groups.flatMap((g) => g.roles);

  const popular = [...counts.entries()]
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([r]) => r);
  // The chosen role always comes first, so it is visible without scrolling.
  const quick = value === "todas" ? popular : [value, ...popular.filter((r) => r !== value)];

  function choose(r: Role) {
    onChange(r);
    setQuery("");
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" && open && flat[active]) {
      e.preventDefault();
      choose(flat[active]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const optionId = (r: Role) => `${listId}-${flat.indexOf(r)}`;

  return (
    <div className="flex flex-col gap-3">
      <div className="relative sm:max-w-md">
        <label htmlFor={`${listId}-input`} className="sr-only">
          Buscar função
        </label>
        <SearchBox
          id={`${listId}-input`}
          ref={inputRef}
          value={query}
          onChange={(v) => {
            setQuery(v);
            setActive(0);
            setOpen(true);
          }}
          placeholder="Buscar função (ex.: eletricista)"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={open && flat[active] ? optionId(flat[active]) : undefined}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={onKeyDown}
        />
        {open && (
          <div
            id={listId}
            role="listbox"
            aria-label="Funções"
            className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-xl border border-line bg-card p-2 shadow-xl"
          >
            {groups.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted">
                Nenhuma função encontrada para “{query}”.
              </p>
            ) : (
              groups.map((g) => (
                <div key={g.id} role="group" aria-label={g.label} className="mb-1 last:mb-0">
                  <p className="px-3 pt-2 pb-1 text-xs font-semibold text-muted">{g.label}</p>
                  {g.roles.map((r) => {
                    const n = counts.get(r) ?? 0;
                    const isActive = flat[active] === r;
                    return (
                      <div
                        key={r}
                        id={optionId(r)}
                        role="option"
                        aria-selected={value === r}
                        onMouseDown={(e) => e.preventDefault()}
                        onMouseEnter={() => setActive(flat.indexOf(r))}
                        onClick={() => choose(r)}
                        className={cn(
                          "flex cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-2 text-[15px]",
                          isActive && "bg-subtle",
                          value === r && "font-semibold",
                        )}
                      >
                        <span className={cn(n === 0 && "text-muted")}>{r}</span>
                        <span className="shrink-0 text-xs text-muted tabular-nums">
                          {n === 0 ? "sem vagas" : n === 1 ? "1 vaga" : `${n} vagas`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        )}
      </div>

      <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        <Chip selected={value === "todas"} onClick={() => onChange("todas")}>
          Todas as funções
        </Chip>
        {quick.map((r) => (
          <Chip key={r} selected={value === r} onClick={() => onChange(value === r ? "todas" : r)}>
            {r}
            <span className="tabular-nums opacity-70">{counts.get(r) ?? 0}</span>
          </Chip>
        ))}
      </div>
    </div>
  );
}
