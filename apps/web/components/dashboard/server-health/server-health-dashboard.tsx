import { format } from "date-fns";
import {
	Cpu,
	HardDrive,
	Loader2,
	MemoryStick,
	Network,
	ServerIcon,
} from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/utils/api";

function getHealthColor(pct: number): "text-emerald-500" | "text-yellow-500" | "text-red-500" {
	if (pct < 60) return "text-emerald-500";
	if (pct < 85) return "text-yellow-500";
	return "text-red-500";
}

function getHealthVariant(pct: number): "default" | "secondary" | "destructive" {
	if (pct < 60) return "default";
	if (pct < 85) return "secondary";
	return "destructive";
}

function StatusIndicator({ status }: { status: "healthy" | "warning" | "critical" | "offline" }) {
	const colors = {
		healthy: "bg-emerald-500",
		warning: "bg-yellow-500",
		critical: "bg-red-500",
		offline: "bg-gray-400",
	};
	return (
		<span
			className={`size-3 rounded-full ${colors[status]}`}
			title={status}
		/>
	);
}

export const ServerHealthDashboard = () => {
	const { data: servers, isPending } = api.server.all.useQuery();
	const { data: webServerSettings } = api.settings.getWebServerSettings.useQuery();

	if (isPending) {
		return (
			<div className="flex flex-row gap-2 items-center justify-center text-sm text-muted-foreground min-h-[25vh]">
				<span>Loading...</span>
				<Loader2 className="animate-spin size-4" />
			</div>
		);
	}

	const allServers = [
		...(servers || []).map((s) => ({
			id: s.serverId,
			name: s.name,
			ipAddress: s.ipAddress,
			status: s.serverStatus as string,
			isLocal: false,
		})),
	];

	return (
		<Card className="h-full bg-sidebar p-2.5 rounded-xl">
			<div className="rounded-xl bg-background shadow-md">
				<CardHeader>
					<CardTitle className="text-xl flex items-center gap-2">
						<ServerIcon className="size-6 text-muted-foreground" />
						Server Health
					</CardTitle>
					<CardDescription>
						Monitor server health and resource usage across your infrastructure
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					{allServers.length === 0 ? (
						<div className="flex flex-col items-center justify-center gap-3 min-h-[25vh]">
							<ServerIcon className="size-8 text-muted-foreground" />
							<span className="text-base text-muted-foreground">
								No servers found
							</span>
						</div>
					) : (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
							{allServers.map((server) => (
								<ServerHealthCard
									key={server.id}
									serverId={server.id}
									name={server.name}
									ipAddress={server.ipAddress}
									status={server.status}
								/>
							))}
						</div>
					)}
				</CardContent>
			</div>
		</Card>
	);
};

function ServerHealthCard({
	serverId,
	name,
	ipAddress,
	status,
}: {
	serverId: string;
	name: string;
	ipAddress: string;
	status: string;
}) {
	const { data: metrics, isPending: metricsLoading } =
		api.server.getServerMetrics.useQuery(
			{
				serverId,
			} as any,
			{
				enabled: !!serverId,
				refetchInterval: 30000,
			},
		);

	const isActive = status === "active";
	const latestMetric = (metrics as any)?.[(metrics as any)?.length - 1];

	const cpuUsage = latestMetric ? Number.parseFloat(latestMetric.cpu) : null;
	const memUsed = latestMetric ? Number.parseFloat(latestMetric.memUsed) : null;
	const memTotal = latestMetric ? Number.parseFloat(latestMetric.memTotal) : null;
	const diskUsed = latestMetric ? Number.parseFloat(latestMetric.diskUsed) : null;
	const memPct = memUsed !== null && memTotal ? (memUsed / memTotal) * 100 : null;

	const healthStatus: "healthy" | "warning" | "critical" | "offline" =
		!isActive
			? "offline"
			: cpuUsage === null
				? "offline"
				: cpuUsage > 90 || (memPct && memPct > 90)
					? "critical"
					: cpuUsage > 70 || (memPct && memPct > 70)
						? "warning"
						: "healthy";

	return (
		<Card className="hover:shadow-lg transition-shadow">
			<CardHeader className="pb-3">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-2">
						<StatusIndicator status={healthStatus} />
						<CardTitle className="text-lg">{name}</CardTitle>
					</div>
					<Badge
						variant={isActive ? "default" : "destructive"}
						className="text-xs"
					>
						{isActive ? "Active" : "Offline"}
					</Badge>
				</div>
				<div className="flex items-center gap-2 text-sm text-muted-foreground">
					<Network className="size-3" />
					{ipAddress}
				</div>
			</CardHeader>
			<CardContent className="space-y-3">
				{metricsLoading ? (
					<div className="flex items-center justify-center py-4">
						<Loader2 className="size-5 animate-spin text-muted-foreground" />
					</div>
				) : latestMetric ? (
					<>
						<ResourceBar
							icon={<Cpu className="size-4" />}
							label="CPU"
							value={cpuUsage || 0}
							max={100}
							unit="%"
						/>
						<ResourceBar
							icon={<MemoryStick className="size-4" />}
							label="Memory"
							value={memPct || 0}
							max={100}
							unit="%"
						/>
						<ResourceBar
							icon={<HardDrive className="size-4" />}
							label="Disk"
							value={diskUsed || 0}
							max={100}
							unit="%"
						/>
						<div className="text-xs text-muted-foreground pt-2 border-t">
							Connected since {format(new Date(), "PPp")}
						</div>
					</>
				) : (
					<div className="text-sm text-muted-foreground text-center py-4">
						No metrics available
					</div>
				)}
			</CardContent>
		</Card>
	);
}

function ResourceBar({
	icon,
	label,
	value,
	max,
	unit,
}: {
	icon: React.ReactNode;
	label: string;
	value: number;
	max: number;
	unit: string;
}) {
	const pct = max > 0 ? (value / max) * 100 : 0;
	return (
		<div className="space-y-1">
			<div className="flex items-center justify-between text-sm">
				<div className="flex items-center gap-1.5 text-muted-foreground">
					{icon}
					{label}
				</div>
				<span className={`font-medium ${getHealthColor(pct)}`}>
					{value.toFixed(1)}{unit}
				</span>
			</div>
			<Progress value={pct} className="h-1.5" />
		</div>
	);
}
