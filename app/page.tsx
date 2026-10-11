"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { homeFor } from "@/components/app-shell";
import { useFreelas } from "@/lib/store/freelas-store";

export default function Home() {
  const { state } = useFreelas();
  const router = useRouter();

  useEffect(() => {
    router.replace(state.user ? homeFor(state.mode) : "/entrar");
  }, [state.user, state.mode, router]);

  return null;
}
