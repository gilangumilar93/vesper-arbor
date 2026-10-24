import { createFileRoute } from "@tanstack/react-router";
import { TreeStudio } from "@/components/tree-studio";

export const Route = createFileRoute("/")({ component: TreeStudio });
