import type { Metadata } from "next";
import { AdminHeader } from "@/components/admin-header";
import { ExportManager } from "@/components/export-manager";

export const metadata: Metadata = { title: "Export manager" };
export default function AdminExportsPage() { return <><AdminHeader eyebrow="Verified distribution" title="Export manager" description="Generate portable source, deployment, and presentation-edition packages with structural validation and SHA-256 checksums." /><ExportManager /></>; }
