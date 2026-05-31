import { Loader2, PlusIcon, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/utils/api";
import { HandleEnvironment } from "./handle-environment";

const gatePolicyLabels: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
	disabled: { label: "Disabled", variant: "secondary" },
	single: { label: "Single Reviewer", variant: "default" },
	unanimous: { label: "Unanimous", variant: "default" },
	manual_only: { label: "Manual Only", variant: "outline" },
};

interface Props {
	projectId: string;
}

export const ShowEnvironments = ({ projectId }: Props) => {
	const { data: environments, isPending } = api.environment.byProjectId.useQuery(
		{ projectId },
		{ enabled: !!projectId },
	);
	const { data: permissions } = api.user.getPermissions.useQuery();

	if (isPending) {
		return (
			<div className="flex flex-row gap-2 items-center justify-center text-sm text-muted-foreground min-h-[25vh]">
				<span>Loading...</span>
				<Loader2 className="animate-spin size-4" />
			</div>
		);
	}

	return (
		<Card className="bg-background border-none">
			<CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
				<div className="flex flex-col gap-2">
					<CardTitle className="text-xl flex items-center gap-2">
						<Shield className="size-5 text-muted-foreground" />
						Environments
					</CardTitle>
					<CardDescription>
						Manage environments, gate policies, and deployment approvals
					</CardDescription>
				</div>
				{permissions?.environment.create && (
					<HandleEnvironment projectId={projectId} />
				)}
			</CardHeader>
			<CardContent>
				{!environments || environments.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-3 min-h-[25vh]">
						<Shield className="size-8 text-muted-foreground" />
						<span className="text-base text-muted-foreground">
							No environments found
						</span>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Gate Policy</TableHead>
								<TableHead>Services</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{environments.map((env) => {
								const serviceCount =
									(env.applications?.length || 0) +
									(env.compose?.length || 0) +
									(env.postgres?.length || 0) +
									(env.mysql?.length || 0) +
									(env.mongo?.length || 0) +
									(env.mariadb?.length || 0) +
									(env.redis?.length || 0) +
									(env.libsql?.length || 0);

								const gatePolicy = (env as any).gatePolicy || "disabled";
								const policyDisplay = gatePolicyLabels[gatePolicy] || gatePolicyLabels.disabled;

								return (
									<TableRow key={env.environmentId}>
										<TableCell className="font-medium">
											<div className="flex items-center gap-2">
												{env.name}
												{env.isDefault && (
													<Badge variant="outline" className="text-xs">
														default
													</Badge>
												)}
											</div>
										</TableCell>
										<TableCell>
											<Badge variant={policyDisplay.variant}>
												{policyDisplay.label}
											</Badge>
										</TableCell>
										<TableCell>{serviceCount}</TableCell>
										<TableCell>
											<Badge variant="secondary">
												Active
											</Badge>
										</TableCell>
										<TableCell className="text-right">
											{permissions?.environment.update && !env.isDefault && (
												<HandleEnvironment
													environmentId={env.environmentId}
													projectId={projectId}
												/>
											)}
										</TableCell>
									</TableRow>
								);
							})}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
};
