import { CheckCircle2, Circle, Loader2, XCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export interface HealthCheckStep {
	label: string;
	status: "pending" | "running" | "success" | "failed";
}

interface Props {
	steps: HealthCheckStep[];
}

const stepIcons = {
	pending: <Circle className="size-4 text-muted-foreground" />,
	running: <Loader2 className="size-4 animate-spin text-blue-500" />,
	success: <CheckCircle2 className="size-4 text-emerald-500" />,
	failed: <XCircle className="size-4 text-red-500" />,
};

export const HealthCheckProgress = ({ steps }: Props) => {
	const completedCount = steps.filter((s) => s.status === "success").length;
	const totalCount = steps.length;
	const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

	return (
		<div className="space-y-3">
			<Progress value={progress} className="h-2" />
			<div className="space-y-2">
				{steps.map((step) => (
					<div key={step.label} className="flex items-center gap-2 text-sm">
						{stepIcons[step.status]}
						<span
							className={
								step.status === "running"
									? "font-medium text-foreground"
									: step.status === "success"
										? "text-muted-foreground"
										: step.status === "failed"
											? "text-red-500 font-medium"
											: "text-muted-foreground"
							}
						>
							{step.label}
						</span>
					</div>
				))}
			</div>
		</div>
	);
};
