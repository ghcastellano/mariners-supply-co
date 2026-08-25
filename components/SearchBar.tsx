"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

/**
 * Busca do topo. Submete navegando, não filtrando no cliente: o
 * resultado precisa vir do índice do banco, e o link tem que poder
 * ser copiado e compartilhado.
 */
export default function SearchBar({ defaultValue = "" }: { defaultValue?: string }) {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(defaultValue || params.get("q") || "");

  return (
    <form
      className="searchwrap"
      onSubmit={(e) => {
        e.preventDefault();
        const term = q.trim();
        router.push(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
      }}
      role="search"
    >
      <div className="searchbox">
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search the whole store…"
          aria-label="Search products"
          enterKeyHint="search"
        />
        <button type="submit" aria-label="Search">
          🔍
        </button>
      </div>
    </form>
  );
}
