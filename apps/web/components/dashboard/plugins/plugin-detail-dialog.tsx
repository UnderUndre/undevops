import { Loader2 } from "lucide-react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { api } from "@/utils/api";

interface Props {
	pluginId: string;
}

export const PluginDetailDialog = ({ pluginId }: Props) => {
	const { data: plugin, isPending } = api.plugin.detail.useQuery(
		{ pluginId },
		{ enabled: !!pluginId },
	);

	return (
		<Dialog>
			<DialogTrigger asChild>
				<Button variant="ghost" size="sm">
					Details
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-2xl">
				<DialogHeader>
					<DialogTitle>{plugin?.name ?? "Plugin Detail"}</DialogTitle>
					<DialogDescription>
						Full manifest, permissions, and hook subscriptions.
					</DialogDescription>
				</DialogHeader>

				{isPending || !plugin ? (
					<div className="flex flex-row gap-2 items-center justify-center text-sm text-muted-foreground py-8">
						<span>Loading...</span>
						<Loader2 className="animate-spin size-4" />
					</div>
				) : (
					<ScrollArea className="max-h-[60vh]">
						<div className="space-y-6 pr-4">
							<div className="space-y-2">
								<h4 className="text-sm font-semibold">General</h4>
								<div className="grid grid-cols-2 gap-2 text-sm">
									<span className="text-muted-foreground">Version</span>
									<span>{plugin.version}</span>
									<span className="text-muted-foreground">Status</span>
									<span>
										{plugin.enabled ? "Enabled" : "Disabled"}
										{plugin.faulted && (
											<Badge variant="destructive" className="ml-2">
												Faulted
											</Badge>
										)}
									</span>
									<span className="text-muted-foreground">Invoke Count</span>
									<span>{plugin.invokeCount}</span>
								</div>
							</div>

							{plugin.faulted && plugin.faultMessage && (
								<div className="space-y-1">
									<h4 className="text-sm font-semibold text-destructive">
										Fault Message
									</h4>
									<pre className="rounded bg-destructive/10 p-3 text-xs font-mono whitespace-pre-wrap break-all">
										{plugin.faultMessage}
									</pre>
								</div>
							)}

							<div className="space-y-2">
								<h4 className="text-sm font-semibold">Manifest</h4>
								<pre className="rounded bg-muted p-3 text-xs font-mono whitespace-pre-wrap break-all">
									{JSON.stringify(plugin.manifestJson, null, 2)}
								</pre>
							</div>

							<div className="space-y-2">
								<h4 className="text-sm font-semibold">Granted Permissions</h4>
								<div className="flex flex-wrap gap-1">
									{(plugin.grantedPermissions as string[])?.length ? (
										(plugin.grantedPermissions as string[]).map((p) => (
											<Badge key={p} variant="secondary">
												{p}
											</Badge>
										))
									) : (
										<span className="text-sm text-muted-foreground">
											No permissions granted
										</span>
									)}
								</div>
							</div>

							<div className="space-y-2">
								<h4 className="text-sm font-semibold">Hook Subscriptions</h4>
								{(plugin.hookSubscriptions as string[])?.length ? (
									<Table>
										<TableHeader>
											<TableRow>
												<TableHead>Hook</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{(plugin.hookSubscriptions as string[]).map((hook) => (
												<TableRow key={hook}>
													<TableCell className="font-mono text-sm">
														{hook}
													</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
								) : (
									<span className="text-sm text-muted-foreground">
										No hook subscriptions
									</span>
								)}
							</div>
						</div>
					</ScrollArea>
				)}
			</DialogContent>
		</Dialog>
	);
};
