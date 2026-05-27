import {
	Activity,
	AlertTriangle,
	Cpu,
	HardDrive,
	Loader2,
	Server,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/utils/api";

const statusConfig: Record<
	string,
	{ label: string; variant: "default" | "secondary" | "destructive" | "outline"; dot: string }
> = {
	active: { label: "Online", variant: "default", dot: "bg-emerald-500" },
	inactive: { label: "Offline", variant: "destructive", dot: "bg-red-500" },
};

function StatusDot({ status }: { status: string }) {
	const cfg = statusConfig[status] || statusConfig.inactive;
	return <span className={`size-2.5 rounded-full shrink-0 ${cfg.dot}`} />;
}

function StatCard({
	icon: Icon,
	label,
	value,
	subtext,
}: {
	icon: React.ElementType;
	label: string;
	value: number | string;
	subtext?: string;
}) {
	return (
		<Card>
			<CardContent className="p-4 flex items-center gap-3">
				<div className="rounded-lg bg-muted p-2">
					<Icon className="size-5 text-muted-foreground" />
				</div>
				<div>
					<p className="text-2xl font-bold">{value}</p>
					<p className="text-xs text-muted-foreground">{label}</p>
					{subtext && (
						<p className="text-xs text-muted-foreground">{subtext}</p>
					)}
				</div>
			</CardContent>
		</Card>
	);
}

function NodeCard({
	node,
}: {
	node: {
		serverId: string;
		name: string;
		address: string;
		status: string;
		applications: Array<{
			applicationId: string;
			name: string;
			replicas: number;
			status: string;
		}>;
	};
}) {
	const cfg = statusConfig[node.status] || statusConfig.inactive;
	const hasErrors = node.applications.some((a) => a.status === "error");
	const dotColor = hasErrors
		? "bg-yellow-500"
		: node.status === "active"
			? "bg-emerald-500"
			: "bg-red-500";

	return (
		<Card className="hover:shadow-lg transition-shadow">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2 min-w-0">
						<span className={`size-2.5 rounded-full shrink-0 ${dotColor}`} />
						<CardTitle className="text-lg truncate">{node.name}</CardTitle>
					</div>
					<Badge variant={cfg.variant} className="text-xs shrink-0">
						{cfg.label}
					</Badge>
				</div>
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Server className="size-3" />
					<span className="truncate">{node.address}</span>
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{node.applications.length > 0 && (
					<div className="space-y-1.5">
						<p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
							Applications
						</p>
						{node.applications.map((app) => (
							<div
								key={app.applicationId}
								className="flex items-center justify-between text-sm"
							>
								<div className="flex items-center gap-1.5 min-w-0">
									<span
										className={`size-1.5 rounded-full shrink-0 ${
											app.status === "running"
												? "bg-emerald-500"
												: app.status === "error"
													? "bg-red-500"
													: "bg-gray-400"
										}`}
									/>
									<span className="truncate">{app.name}</span>
								</div>
								<span className="text-xs text-muted-foreground shrink-0 ml-2">
									{app.replicas} replica{app.replicas !== 1 ? "s" : ""}
								</span>
							</div>
						))}
					</div>
				)}
				{node.applications.length === 0 && (
					<p className="text-sm text-muted-foreground">No applications</p>
				)}
			</CardContent>
		</Card>
	);
}

export const ClusterTopology = () => {
	const { data, isPending } = api.cluster.topology.useQuery();

	if (isPending) {
		return (
			<div className="flex flex-row gap-2 items-center justify-center text-sm text-muted-foreground min-h-[25vh]">
				<span>Loading cluster topology...</span>
				<Loader2 className="animate-spin size-4" />
			</div>
		);
	}

	if (!data || data.nodes.length === 0) {
		return (
			<Card className="h-full bg-sidebar p-2.5 rounded-xl">
				<div className="rounded-xl bg-background shadow-md">
					<CardHeader>
						<CardTitle className="text-xl flex items-center gap-2">
							<Activity className="size-6 text-muted-foreground" />
							Cluster Topology
						</CardTitle>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col items-center justify-center gap-3 min-h-[25vh]">
							<Server className="size-8 text-muted-foreground" />
							<span className="text-base text-muted-foreground">
								No servers found. Add a server to get started.
							</span>
						</div>
					</CardContent>
				</div>
			</Card>
		);
	}

	if (data.nodes.length === 1) {
		const node = data.nodes[0];
		return (
			<Card className="h-full bg-sidebar p-2.5 rounded-xl">
				<div className="rounded-xl bg-background shadow-md">
					<CardHeader>
						<CardTitle className="text-xl flex items-center gap-2">
							<Activity className="size-6 text-muted-foreground" />
							Cluster Topology
						</CardTitle>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="flex items-center gap-2 text-muted-foreground">
							<AlertTriangle className="size-4" />
							<span className="text-sm">Single-node cluster</span>
						</div>
						<NodeCard node={node} />
					</CardContent>
				</div>
			</Card>
		);
	}

	return (
		<Card className="h-full bg-sidebar p-2.5 rounded-xl">
			<div className="rounded-xl bg-background shadow-md">
				<CardHeader>
					<CardTitle className="text-xl flex items-center gap-2">
						<Activity className="size-6 text-muted-foreground" />
						Cluster Topology
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
						<StatCard
							icon={Server}
							label="Total Nodes"
							value={data.totalNodes}
						/>
						<StatCard
							icon={Activity}
							label="Healthy"
							value={data.healthyNodes}
						/>
						<StatCard
							icon={AlertTriangle}
							label="Degraded"
							value={data.degradedNodes}
						/>
						<StatCard
							icon={Cpu}
							label="Total Apps"
							value={data.totalApplications}
						/>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
						{data.nodes.map((node) => (
							<NodeCard key={node.serverId} node={node} />
						))}
					</div>
				</CardContent>
			</div>
		</Card>
	);
};
