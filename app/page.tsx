import { MobileShell } from "@/components/mobile-shell";
import { AgentsTable } from "@/components/agents-table";

export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <MobileShell>
      <AgentsTable />
    </MobileShell>
  );
}
