import { Loader2, Bot, CheckCircle, XCircle, Clock } from "lucide-react";
import { api } from "@/utils/api";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	CardDescription,
} from "@/components/ui/card";
import { DialogAction } from "@/components/shared/dialog-action";
import { toast } from "sonner";

const statusVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	pending: "outline",
	approved: "default",
	rejected: "destructive",
	expired: "secondary",
	cancelled: "secondary",
};

const statusIcon: Record<string, React.ReactNode> = {
	pending: <Clock className="size-3.5" />,
	approved: <CheckCircle className="size-3.5" />,
	rejected: <XCircle className="size-3.5" />,
};

export const ShowAgentActions = () => {
	const { data: actions, isLoading } = api.pendingAction.list.useQuery();
	const utils = api.useUtils();

	const approveMutation = api.pendingAction.approve.useMutation({
		onSuccess: () => {
			toast.success("Action approved");
			void utils.pendingAction.list.invalidate();
		},
		onError: (err) => {
			toast.error(`Failed to approve: ${err.message}`);
		},
	});

	const rejectMutation = api.pendingAction.reject.useMutation({
		onSuccess: () => {
			toast.success("Action rejected");
			void utils.pendingAction.list.invalidate();
		},
		onError: (err) => {
			toast.error(`Failed to reject: ${err.message}`);
		},
	});

	if (isLoading) {
		return (
			<Card className="bg-background border-none">
				<CardContent className="flex items-center justify-center min-h-[25vh]">
					<Loader2 className="size-4 animate-spin mr-2" />
					<span className="text-sm text-muted-foreground">Loading agent actions...</span>
				</CardContent>
			</Card>
		);
	}

	if (!actions || actions.length === 0) {
		return (
			<Card className="bg-background border-none">
				<CardContent className="flex flex-col items-center justify-center min-h-[25vh] gap-2">
					<Bot className="size-8 text-muted-foreground" />
					<span className="text-sm text-muted-foreground">No pending agent actions</span>
				</CardContent>
			</Card>
		);
	}

	return (
		<Card className="bg-background border-none">
			<CardHeader>
				<CardTitle>Agent Actions</CardTitle>
				<CardDescription>Pending actions from AI agents awaiting your approval</CardDescription>
			</CardHeader>
			<CardContent>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>Action</TableHead>
							<TableHead>Target</TableHead>
							<TableHead>Agent</TableHead>
							<TableHead>Status</TableHead>
							<TableHead>Requested</TableHead>
							<TableHead className="text-right">Actions</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{actions.map((action: any) => (
							<TableRow key={action.actionId}>
								<TableCell className="font-medium">{action.actionType}</TableCell>
								<TableCell className="text-sm text-muted-foreground">
									{action.targetType}: {action.targetId?.slice(0, 12)}...
								</TableCell>
								<TableCell className="text-sm text-muted-foreground">
									{action.mcpClientId?.slice(0, 12)}...
								</TableCell>
								<TableCell>
									<Badge variant={statusVariant[action.status] ?? "outline"} className="flex items-center gap-1 w-fit">
										{statusIcon[action.status]}
										{action.status}
									</Badge>
								</TableCell>
								<TableCell className="text-sm text-muted-foreground">
									{action.createdAt ? new Date(action.createdAt).toLocaleString() : "—"}
								</TableCell>
								<TableCell className="text-right space-x-2">
									{action.status === "pending" && (
										<>
											<DialogAction
												title="Approve Agent Action"
												description={`Allow the agent to ${action.actionType} on ${action.targetType} ${action.targetId?.slice(0, 12)}?`}
												type="default"
												onClick={async () => {
													await approveMutation.mutateAsync({ actionId: action.actionId });
												}}
											>
												<Button size="sm" variant="outline" disabled={approveMutation.isLoading}>
													{approveMutation.isLoading ? <Loader2 className="size-3 animate-spin mr-1" /> : <CheckCircle className="size-3 mr-1" />}
													Approve
												</Button>
											</DialogAction>
											<DialogAction
												title="Reject Agent Action"
												description={`Reject the agent's request to ${action.actionType}? The associated deployment will be cancelled.`}
												type="destructive"
												onClick={async () => {
													await rejectMutation.mutateAsync({ actionId: action.actionId });
												}}
											>
												<Button size="sm" variant="destructive" disabled={rejectMutation.isLoading}>
													{rejectMutation.isLoading ? <Loader2 className="size-3 animate-spin mr-1" /> : <XCircle className="size-3 mr-1" />}
													Reject
												</Button>
											</DialogAction>
										</>
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</CardContent>
		</Card>
	);
};
