import {
	EyeIcon,
	Key,
	Loader2,
	PlusIcon,
	RotateCcw,
	Trash2,
} from "lucide-react";
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
import { CreateSecretDialog } from "./create-secret-dialog";
import { DeleteSecretDialog } from "./delete-secret-dialog";
import { RotateSecretDialog } from "./rotate-secret-dialog";

const scopeLabels: Record<string, string> = {
	organization: "Organization",
	project: "Project",
	environment: "Environment",
	application: "Application",
	compose: "Compose",
};

interface Props {
	scope: "organization" | "project" | "environment" | "application" | "compose";
	scopeId: string;
}

export const ShowSecrets = ({ scope, scopeId }: Props) => {
	const { data: secrets, isPending } = api.secret.list.useQuery(
		{ scope, scopeId },
		{ enabled: !!scopeId },
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
						<Key className="size-5 text-muted-foreground" />
						Secrets
					</CardTitle>
					<CardDescription>
						Manage sensitive configuration values. Values are never shown after
						creation.
					</CardDescription>
				</div>
				{permissions?.secrets?.create !== false && (
					<CreateSecretDialog scope={scope} scopeId={scopeId} />
				)}
			</CardHeader>
			<CardContent>
				{!secrets || secrets.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-3 min-h-[25vh]">
						<Key className="size-8 text-muted-foreground" />
						<span className="text-base text-muted-foreground">
							No secrets configured
						</span>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Key</TableHead>
								<TableHead>Scope</TableHead>
								<TableHead>Version</TableHead>
								<TableHead>Last Rotated</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{secrets.map((secret: any) => (
								<TableRow key={secret.secretId}>
									<TableCell className="font-mono text-sm">
										{secret.key}
									</TableCell>
									<TableCell>
										<Badge variant="outline">
											{scopeLabels[secret.scope] || secret.scope}
										</Badge>
									</TableCell>
									<TableCell>
										<Badge variant="secondary">v{secret.version || 1}</Badge>
									</TableCell>
									<TableCell className="text-sm text-muted-foreground">
										{secret.lastRotatedAt
											? new Date(secret.lastRotatedAt).toLocaleDateString()
											: "Never"}
									</TableCell>
									<TableCell className="text-right">
										<div className="flex items-center justify-end gap-1">
											<RotateSecretDialog
												secretId={secret.secretId}
												secretKey={secret.key}
											/>
											<DeleteSecretDialog
												secretId={secret.secretId}
												secretKey={secret.key}
												scope={scope}
												scopeId={scopeId}
											/>
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
