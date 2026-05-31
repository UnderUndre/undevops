import { formatDistanceToNow } from "date-fns";
import {
	Filter,
	Loader2,
	ScrollText,
	ChevronLeft,
	ChevronRight,
} from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/utils/api";

const actorTypes = ["human", "agent", "plugin", "system"] as const;
const actionTypes = [
	"create",
	"update",
	"delete",
	"deploy",
	"cancel",
	"redeploy",
	"login",
	"logout",
] as const;
const resourceTypes = [
	"project",
	"service",
	"environment",
	"deployment",
	"user",
	"customRole",
	"domain",
	"certificate",
	"registry",
	"server",
	"sshKey",
	"gitProvider",
	"notification",
	"settings",
	"session",
] as const;

const actionVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	create: "default",
	update: "secondary",
	delete: "destructive",
	deploy: "default",
	cancel: "outline",
	redeploy: "secondary",
	login: "default",
	logout: "outline",
};

const PAGE_SIZE = 50;

export const ShowAuditLogs = () => {
	const [page, setPage] = useState(0);
	const [actorType, setActorType] = useState<string>("");
	const [action, setAction] = useState<string>("");
	const [resourceType, setResourceType] = useState<string>("");
	const [dateFrom, setDateFrom] = useState<string>("");
	const [dateTo, setDateTo] = useState<string>("");

	const { data, isPending } = api.auditLog.all.useQuery({
		action: (action || undefined) as typeof actionTypes[number] | undefined,
		resourceType: (resourceType || undefined) as typeof resourceTypes[number] | undefined,
		from: dateFrom ? new Date(dateFrom) : undefined,
		to: dateTo ? new Date(dateTo) : undefined,
		limit: PAGE_SIZE,
		offset: page * PAGE_SIZE,
	});

	const clearFilters = () => {
		setActorType("");
		setAction("");
		setResourceType("");
		setDateFrom("");
		setDateTo("");
		setPage(0);
	};

	return (
		<Card className="bg-background border-none">
			<CardHeader>
				<CardTitle className="text-xl flex items-center gap-2">
					<ScrollText className="size-5 text-muted-foreground" />
					Audit Log
				</CardTitle>
				<CardDescription>
					Track all actions across your organization.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="flex flex-wrap gap-2 items-end">
					<div className="flex flex-col gap-1">
						<span className="text-xs text-muted-foreground">Action</span>
						<Select value={action} onValueChange={(v) => { setAction(v === "__all__" ? "" : v); setPage(0); }}>
							<SelectTrigger className="w-[140px]">
								<SelectValue placeholder="All actions" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__all__">All actions</SelectItem>
								{actionTypes.map((a) => (
									<SelectItem key={a} value={a}>{a}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1">
						<span className="text-xs text-muted-foreground">Resource</span>
						<Select value={resourceType} onValueChange={(v) => { setResourceType(v === "__all__" ? "" : v); setPage(0); }}>
							<SelectTrigger className="w-[160px]">
								<SelectValue placeholder="All resources" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="__all__">All resources</SelectItem>
								{resourceTypes.map((r) => (
									<SelectItem key={r} value={r}>{r}</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="flex flex-col gap-1">
						<span className="text-xs text-muted-foreground">From</span>
						<Input
							type="date"
							value={dateFrom}
							onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
							className="w-[150px]"
						/>
					</div>
					<div className="flex flex-col gap-1">
						<span className="text-xs text-muted-foreground">To</span>
						<Input
							type="date"
							value={dateTo}
							onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
							className="w-[150px]"
						/>
					</div>
					<Button variant="outline" size="sm" onClick={clearFilters}>
						Clear
					</Button>
				</div>

				{isPending ? (
					<div className="flex flex-row gap-2 items-center justify-center text-sm text-muted-foreground min-h-[25vh]">
						<span>Loading...</span>
						<Loader2 className="animate-spin size-4" />
					</div>
				) : !data || data.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-3 min-h-[25vh]">
						<ScrollText className="size-8 text-muted-foreground" />
						<span className="text-base text-muted-foreground">No audit logs found</span>
					</div>
				) : (
					<>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Time</TableHead>
									<TableHead>Actor</TableHead>
									<TableHead>Action</TableHead>
									<TableHead>Resource</TableHead>
									<TableHead>Metadata</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{data.map((entry, idx) => (
									<TableRow key={`${entry.auditLogId}-${idx}`}>
										<TableCell className="text-sm text-muted-foreground whitespace-nowrap">
											{entry.createdAt
												? formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })
												: "-"}
										</TableCell>
										<TableCell>
											<div className="flex flex-col gap-0.5">
												<Badge variant="outline" className="w-fit text-xs">
													{entry.userRole ?? "system"}
												</Badge>
												<span className="text-xs text-muted-foreground">
													{entry.userEmail ?? "-"}
												</span>
											</div>
										</TableCell>
										<TableCell>
											<Badge variant={actionVariant[entry.action] ?? "outline"}>
												{entry.action}
											</Badge>
										</TableCell>
										<TableCell>
											<div className="flex flex-col gap-0.5">
												<span className="text-xs font-medium">{entry.resourceType}</span>
												<span className="text-xs text-muted-foreground">
													{entry.resourceName ?? entry.resourceId ?? "-"}
												</span>
											</div>
										</TableCell>
										<TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">
											{entry.metadata
												? JSON.stringify(entry.metadata)
												: "-"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
						<div className="flex items-center justify-between pt-2">
							<span className="text-sm text-muted-foreground">
								Page {page + 1}
							</span>
							<div className="flex gap-2">
								<Button
									variant="outline"
									size="sm"
									disabled={page === 0}
									onClick={() => setPage((p) => Math.max(0, p - 1))}
								>
									<ChevronLeft className="size-4" />
									Previous
								</Button>
								<Button
									variant="outline"
									size="sm"
									disabled={data.length < PAGE_SIZE}
									onClick={() => setPage((p) => p + 1)}
								>
									Next
									<ChevronRight className="size-4" />
								</Button>
							</div>
						</div>
					</>
				)}
			</CardContent>
		</Card>
	);
};
