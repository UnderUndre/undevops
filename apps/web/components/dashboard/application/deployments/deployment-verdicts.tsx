import { ChevronDown, ChevronUp, Clock, Loader2, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
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

const verdictVariant: Record<string, "default" | "destructive" | "secondary" | "outline"> = {
	pass: "default",
	fail: "destructive",
	abstain: "secondary",
	error: "outline",
};

interface Props {
	deploymentId: string;
}

function formatDuration(ms: number | null): string {
	if (ms === null || ms === undefined) return "—";
	if (ms < 1000) return `${ms}ms`;
	return `${(ms / 1000).toFixed(1)}s`;
}

function ReasoningCell({ text }: { text: string | null }) {
	const [open, setOpen] = useState(false);
	if (!text) return <span className="text-muted-foreground">—</span>;
	const truncated = text.length > 120 ? `${text.slice(0, 120)}…` : text;
	if (text.length <= 120) return <span className="text-sm">{text}</span>;
	return (
		<div className="flex flex-col gap-1">
			<span className="text-sm">{open ? text : truncated}</span>
			<button
				type="button"
				className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-fit"
				onClick={() => setOpen(!open)}
			>
				{open ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
				{open ? "Show less" : "Show more"}
			</button>
		</div>
	);
}

function ConfidenceBar({ value }: { value: number | null }) {
	if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
	const pct = Math.max(0, Math.min(100, value));
	return (
		<div className="flex items-center gap-2">
			<div className="h-2 w-20 rounded-full bg-muted overflow-hidden">
				<div
					className="h-full rounded-full bg-primary transition-all"
					style={{ width: `${pct}%` }}
				/>
			</div>
			<span className="text-sm tabular-nums">{value}</span>
		</div>
	);
}

export const DeploymentVerdicts = ({ deploymentId }: Props) => {
	const { data: verdicts, isPending } = api.deploymentVerdict.list.useQuery({
		deploymentId,
	});

	if (isPending) {
		return (
			<div className="flex flex-row gap-2 items-center justify-center text-sm text-muted-foreground min-h-[15vh]">
				<span>Loading verdicts...</span>
				<Loader2 className="animate-spin size-4" />
			</div>
		);
	}

	return (
		<Card className="bg-background border-none">
			<CardHeader>
				<CardTitle className="text-xl flex items-center gap-2">
					<ShieldCheck className="size-5 text-muted-foreground" />
					AI Review Verdicts
				</CardTitle>
				<CardDescription>
					Per-reviewer verdicts for this deployment.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{!verdicts || verdicts.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-3 min-h-[15vh]">
						<ShieldCheck className="size-8 text-muted-foreground" />
						<span className="text-base text-muted-foreground">
							No AI reviews for this deployment
						</span>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Reviewer</TableHead>
								<TableHead>Verdict</TableHead>
								<TableHead>Confidence</TableHead>
								<TableHead>
									<span className="flex items-center gap-1">
										<Clock className="size-3.5" />
										Duration
									</span>
								</TableHead>
								<TableHead>Reasoning</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{verdicts.map((v) => (
								<TableRow key={v.verdictId}>
									<TableCell className="font-medium">{v.reviewerName}</TableCell>
									<TableCell>
										<Badge variant={verdictVariant[v.verdict] ?? "outline"}>
											{v.verdict}
										</Badge>
									</TableCell>
									<TableCell>
										<ConfidenceBar value={v.confidence} />
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{formatDuration(v.durationMs)}
									</TableCell>
									<TableCell>
										<ReasoningCell text={v.reasoning} />
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
