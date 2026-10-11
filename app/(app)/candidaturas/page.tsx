"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Old address: applications now live in Serviços › Prestados. */
export default function CandidaturasRedirect() {
  const router = useRouter();
  useEffect(() => router.replace("/servicos"), [router]);
  return null;
}
