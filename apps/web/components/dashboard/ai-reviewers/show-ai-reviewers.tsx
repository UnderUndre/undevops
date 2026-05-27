import { Bot, Loader2, Power, PowerOff, Trash2 } from "lucide-react";
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
import { CreateReviewerDialog } from "./create-reviewer-dialog";

const providerVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	claude: "default",
	openai: "secondary",
	gemini: "outline",
	codex: "destructive",
	custom: "outline",
};

export const ShowAiReviewers = () => {
	const utils = api.useUtils();
	const { data: reviewers, isPending } = api.aiReviewer.list.useQuery();
	const { mutateAsync: toggleReviewer } = api.aiReviewer.toggle.useMutation();
	const { mutateAsync: removeReviewer } = api.aiReviewer.remove.useMutation();

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
						<Bot className="size-5 text-muted-foreground" />
						AI Reviewers
					</CardTitle>
					<CardDescription>
						Manage AI reviewers for automated deployment reviews.
					</CardDescription>
				</div>
				<CreateReviewerDialog />
			</CardHeader>
			<CardContent>
				{!reviewers || reviewers.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-3 min-h-[25vh]">
						<Bot className="size-8 text-muted-foreground" />
						<span className="text-base text-muted-foreground">
							No AI reviewers configured
						</span>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Provider</TableHead>
								<TableHead>Model</TableHead>
								<TableHead>Timeout</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{reviewers.map((reviewer) => (
								<TableRow key={reviewer.aiReviewerId}>
									<TableCell className="font-medium">{reviewer.name}</TableCell>
									<TableCell>
										<Badge variant={providerVariant[reviewer.provider] ?? "outline"}>
											{reviewer.provider}
										</Badge>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{reviewer.model}
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{reviewer.timeoutSeconds}s
									</TableCell>
									<TableCell>
										<Badge variant={reviewer.isEnabled ? "default" : "secondary"}>
											{reviewer.isEnabled ? "Enabled" : "Disabled"}
										</Badge>
									</TableCell>
									<TableCell className="text-right">
										<div className="flex items-center justify-end gap-1">
											<Button
												variant="ghost"
												size="icon"
												onClick={async () => {
													await toggleReviewer({
														aiReviewerId: reviewer.aiReviewerId,
														isEnabled: !reviewer.isEnabled,
													});
													await utils.aiReviewer.list.invalidate();
													toast.success(
														reviewer.isEnabled ? "Reviewer disabled" : "Reviewer enabled",
													);
												}}
											>
												{reviewer.isEnabled ? (
													<PowerOff className="size-4" />
												) : (
													<Power className="size-4" />
												)}
											</Button>
											<DialogAction
												title="Delete Reviewer"
												description={`Are you sure you want to delete "${reviewer.name}"? This action cannot be undone.`}
												type="destructive"
												onClick={async () => {
													await removeReviewer({ aiReviewerId: reviewer.aiReviewerId });
													await utils.aiReviewer.list.invalidate();
													toast.success("Reviewer deleted");
												}}
											>
												<Button variant="ghost" size="icon">
													<Trash2 className="size-4 text-destructive" />
												</Button>
											</DialogAction>
										</div>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</CardContent>
		</Card>
	);
};
