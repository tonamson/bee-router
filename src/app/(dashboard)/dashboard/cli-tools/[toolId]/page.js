import { notFound } from "next/navigation";
import { getCliTool } from "@/shared/constants/cliTools";
import { getMachineId } from "@/shared/utils/machine";
import ToolDetailClient from "./ToolDetailClient";

export default async function ToolDetailPage({ params }) {
  const { toolId } = await params;
  if (!getCliTool(toolId)) notFound();
  const machineId = await getMachineId();
  return <ToolDetailClient toolId={toolId} machineId={machineId} />;
}
