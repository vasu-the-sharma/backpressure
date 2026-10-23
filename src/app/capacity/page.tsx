import { CapacityPlanner } from "@/components/CapacityPlanner";
import { PageHeader } from "@/components/ui";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Capacity planner",
  description:
    "Back-of-the-envelope capacity estimates: from daily users to peak requests per second, servers and storage, with the headroom a queue needs.",
};

export default function CapacityPage() {
  return (
    <div>
      <PageHeader
        display
        title="Capacity planner"
        description="From daily users to servers, with the headroom a queue needs."
      />
      <CapacityPlanner />
    </div>
  );
}
