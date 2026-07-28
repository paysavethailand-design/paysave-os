import type { Metadata } from "next";
import { SecurityReviewView } from "@/features/security-review";
import { loadSecurityReview } from "@/features/security-review/server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Security Review | Infrastructure Platform",
  description: "Read-only Infrastructure Platform security and compliance review.",
};

export default async function SecurityReviewPage() {
  const model = await loadSecurityReview();
  return <SecurityReviewView model={model} />;
}
