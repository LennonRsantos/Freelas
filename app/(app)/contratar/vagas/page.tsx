"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Old address: offered jobs now live in Serviços › Oferecidos. */
export default function MyJobsRedirect() {
  const router = useRouter();
  useEffect(() => router.replace("/servicos"), [router]);
  return null;
}
