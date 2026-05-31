import { AlertTriangle, CheckCircle2, Clock, Database } from "lucide-react";
import { AlertBlock } from "@/components/shared/alert-block";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { api } from "@/utils/api";

function formatRelativeTime(dateStr: string | null | undefined): string {
	if (!dateStr) return "Never";
	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffSeconds = Math.floor(diffMs / 1000);
	const diffMinutes = Math.floor(diffSeconds / 60);
	const diffHours = Math.floor(diffMinutes / 60);
	const diffDays = Math.floor(diffHours / 24);

	if (diffSeconds < 60) return "Just now";
	if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes !== 1 ? "s" : ""} ago`;
	if (diffHours < 24) return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
	if (diffDays < 30) return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
	return date.toLocaleDateString();
}

export const BackupStatus = () => {
	const { data: status, isLoading } = api.settings.getBackupStatus.useQuery();

	if (isLoading) {
		return (
			<Card className="bg-background">
				<CardHeader>
					<CardTitle className="text-xl flex flex-row gap-2">
						<Database className="size-6 text-muted-foreground" />
						Backup Status
					</CardTitle>
					<CardDescription>Loading backup status...</CardDescription>
				</CardHeader>
			</Card>
		);
	}

	return (
		<Card className="bg-background">
			<CardHeader>
				<CardTitle className="text-xl flex flex-row gap-2">
					<Database className="size-6 text-muted-foreground" />
					Backup Status
				</CardTitle>
				<CardDescription>
					Current state of system backups.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{status?.lastError && (
					<AlertBlock type="error">{status.lastError}</AlertBlock>
				)}

				<div className="grid md:grid-cols-2 gap-4">
					<div className="flex items-start gap-3 rounded-lg border p-4">
						<CheckCircle2
							className={`size-5 mt-0.5 ${
								status?.lastSuccessfulBackup
									? "text-green-500"
									: "text-muted-foreground"
							}`}
						/>
						<div className="flex flex-col gap-0.5">
							<span className="text-sm font-medium text-muted-foreground">
								Last Successful Backup
							</span>
							<span className="text-sm font-medium">
								{status?.lastSuccessfulBackup
									? formatRelativeTime(status.lastSuccessfulBackup)
									: "Never"}
							</span>
							{status?.lastSuccessfulBackup && (
								<span className="text-xs text-muted-foreground">
									{new Date(status.lastSuccessfulBackup).toLocaleString()}
								</span>
							)}
						</div>
					</div>

					<div className="flex items-start gap-3 rounded-lg border p-4">
						<Clock className="size-5 mt-0.5 text-muted-foreground" />
						<div className="flex flex-col gap-0.5">
							<span className="text-sm font-medium text-muted-foreground">
								Last Attempt
							</span>
							<span className="text-sm font-medium">
								{status?.lastAttemptedBackup
									? formatRelativeTime(status.lastAttemptedBackup)
									: "Never"}
							</span>
							{status?.lastAttemptedBackup && (
								<span className="text-xs text-muted-foreground">
									{new Date(status.lastAttemptedBackup).toLocaleString()}
								</span>
							)}
						</div>
					</div>

					<div className="flex items-start gap-3 rounded-lg border p-4">
						<Database className="size-5 mt-0.5 text-muted-foreground" />
						<div className="flex flex-col gap-0.5">
							<span className="text-sm font-medium text-muted-foreground">
								Total Backups in Retention
							</span>
							<span className="text-sm font-medium">
								{status?.totalBackupsInRetention ?? 0}
							</span>
						</div>
					</div>

					<div className="flex items-start gap-3 rounded-lg border p-4">
						<Clock className="size-5 mt-0.5 text-blue-500" />
						<div className="flex flex-col gap-0.5">
							<span className="text-sm font-medium text-muted-foreground">
								Next Scheduled Backup
							</span>
							<span className="text-sm font-medium">
								{status?.nextScheduledBackup
									? new Date(status.nextScheduledBackup).toLocaleString()
									: "Not scheduled"}
							</span>
							{status?.nextScheduledBackup && (
								<span className="text-xs text-muted-foreground">
									{formatRelativeTime(status.nextScheduledBackup)}
								</span>
							)}
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
