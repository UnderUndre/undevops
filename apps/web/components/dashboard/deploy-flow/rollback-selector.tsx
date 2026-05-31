import { RefreshCcw } from "lucide-react";
import { toast } from "sonner";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/utils/api";

interface Props {
	applicationId: string;
	type: "application" | "compose";
}

export const RollbackSelector = ({ applicationId, type }: Props) => {
	const { data: deployments } = api.deployment.allByType.useQuery(
		{ id: applicationId, type },
		{ enabled: !!applicationId },
	);
	const { mutateAsync: rollback, isPending } = api.rollback.rollback.useMutation();

	const completedDeployments = deployments?.filter(
		(d) => d.status === "done" && d.rollback,
	) || [];

	if (completedDeployments.length === 0) {
		return null;
	}

	return (
		<div className="flex items-center gap-2">
			<Select
				disabled={isPending}
				onValueChange={async (rollbackId) => {
					try {
						await rollback({ rollbackId });
						toast.success("Rollback initiated");
					} catch {
						toast.error("Rollback failed");
					}
				}}
			>
				<SelectTrigger className="w-[250px]">
					<RefreshCcw className="size-4 mr-2" />
					<SelectValue placeholder="Rollback to..." />
				</SelectTrigger>
				<SelectContent>
					{completedDeployments.map((d) => (
						<SelectItem key={d.deploymentId} value={d.rollback?.rollbackId || ""}>
							{d.title || d.description || d.deploymentId.slice(0, 8)} —{" "}
							{new Date(d.createdAt).toLocaleDateString()}
						</SelectItem>
					))}
				</SelectContent>
			</Select>
		</div>
	);
};
