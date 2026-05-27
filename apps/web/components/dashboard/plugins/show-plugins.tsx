import { formatDistanceToNow } from "date-fns";
import { Loader2, Puzzle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { DialogAction } from "@/components/shared/dialog-action";
import { api } from "@/utils/api";
import { PluginDetailDialog } from "./plugin-detail-dialog";

type Status = "active" | "faulted" | "disabled" | "failed";

function getStatus(plugin: {
	enabled: boolean;
	faulted: boolean;
	faultMessage: string | null;
}): Status {
	if (plugin.faulted) return "faulted";
	if (!plugin.enabled) return "disabled";
	return "active";
}

const statusConfig: Record<
	Status,
	{ label: string; variant: "default" | "secondary" | "destructive" | "outline" }
> = {
	active: { label: "Active", variant: "default" },
	faulted: { label: "Faulted", variant: "secondary" },
	disabled: { label: "Disabled", variant: "outline" },
	failed: { label: "Failed", variant: "destructive" },
};

export const ShowPlugins = () => {
	const utils = api.useUtils();
	const { data: plugins, isPending } = api.plugin.list.useQuery();
	const { mutateAsync: enablePlugin } = api.plugin.enable.useMutation();
	const { mutateAsync: disablePlugin } = api.plugin.disable.useMutation();
	const { mutateAsync: removePlugin } = api.plugin.remove.useMutation();

	const handleToggle = async (
		pluginId: string,
		currentEnabled: boolean,
	) => {
		try {
			if (currentEnabled) {
				await disablePlugin({ pluginId });
				toast.success("Plugin disabled");
			} else {
				await enablePlugin({ pluginId });
				toast.success("Plugin enabled");
			}
			await utils.plugin.list.invalidate();
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to toggle plugin",
			);
		}
	};

	const handleRemove = async (pluginId: string) => {
		try {
			await removePlugin({ pluginId });
			await utils.plugin.list.invalidate();
			toast.success("Plugin removed");
		} catch (err) {
			toast.error(
				err instanceof Error ? err.message : "Failed to remove plugin",
			);
		}
	};

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
			<CardHeader>
				<CardTitle className="text-xl flex items-center gap-2">
					<Puzzle className="size-5 text-muted-foreground" />
					Plugins
				</CardTitle>
				<CardDescription>
					Manage installed plugins, view status, and configure permissions.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{!plugins || plugins.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-3 min-h-[25vh]">
						<Puzzle className="size-8 text-muted-foreground" />
						<span className="text-base text-muted-foreground">
							No plugins installed
						</span>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Version</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Permissions</TableHead>
								<TableHead>Last Invoked</TableHead>
								<TableHead>Invocations</TableHead>
								<TableHead>Enabled</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{plugins.map((plugin) => {
								const status = getStatus({
									enabled: plugin.enabled,
									faulted: plugin.faulted,
									faultMessage: plugin.faultMessage,
								});
								const cfg = statusConfig[status];
								return (
									<TableRow key={plugin.pluginId}>
										<TableCell className="font-medium">
											{plugin.name}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{plugin.version}
										</TableCell>
										<TableCell>
											<Badge variant={cfg.variant}>{cfg.label}</Badge>
										</TableCell>
										<TableCell className="text-sm">
											{(plugin.grantedPermissions as string[])?.length ?? 0}
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{plugin.lastInvokedAt
												? formatDistanceToNow(new Date(plugin.lastInvokedAt), {
														addSuffix: true,
													})
												: "Never"}
										</TableCell>
										<TableCell className="text-sm">
											{plugin.invokeCount}
										</TableCell>
										<TableCell>
											<Switch
												checked={plugin.enabled}
												onCheckedChange={() =>
													handleToggle(plugin.pluginId, plugin.enabled)
												}
											/>
										</TableCell>
										<TableCell className="text-right">
											<div className="flex items-center justify-end gap-1">
												<PluginDetailDialog pluginId={plugin.pluginId} />
												<DialogAction
													title="Remove Plugin"
													description={`Remove "${plugin.name}"? This cannot be undone.`}
													type="destructive"
													onClick={() => handleRemove(plugin.pluginId)}
												>
													<Button variant="ghost" size="icon">
														<Trash2 className="size-4" />
													</Button>
												</DialogAction>
											</div>
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
