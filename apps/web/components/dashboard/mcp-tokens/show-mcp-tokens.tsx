import { formatDistanceToNow } from "date-fns";
import { Copy, Loader2, Shield, Trash2, Zap } from "lucide-react";
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
import { CreateTokenDialog } from "./create-token-dialog";

const scopeVariant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
	read: "secondary",
	deploy: "default",
	admin: "destructive",
};

export const ShowMcpTokens = () => {
	const utils = api.useUtils();
	const { data: tokens, isPending } = api.mcpToken.list.useQuery();
	const { mutateAsync: revokeToken } = api.mcpToken.revoke.useMutation();

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
						<Shield className="size-5 text-muted-foreground" />
						MCP Tokens
					</CardTitle>
					<CardDescription>
						Manage tokens for MCP (Model Context Protocol) integrations.
						Token values are shown only once at creation.
					</CardDescription>
				</div>
				<CreateTokenDialog />
			</CardHeader>
			<CardContent>
				{!tokens || tokens.length === 0 ? (
					<div className="flex flex-col items-center justify-center gap-3 min-h-[25vh]">
						<Shield className="size-8 text-muted-foreground" />
						<span className="text-base text-muted-foreground">
							No MCP tokens configured
						</span>
					</div>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Name</TableHead>
								<TableHead>Scope</TableHead>
								<TableHead>Prefix</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Last Used</TableHead>
								<TableHead>Requests</TableHead>
								<TableHead className="text-right">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{tokens.map((token) => {
								const isRevoked = !!token.revokedAt;
								return (
									<TableRow key={token.mcpTokenId} className={isRevoked ? "opacity-50" : ""}>
										<TableCell className="font-medium">{token.name}</TableCell>
										<TableCell>
											<Badge variant={scopeVariant[token.scope] ?? "outline"}>
												{token.scope}
											</Badge>
										</TableCell>
										<TableCell className="font-mono text-sm">{token.prefix}...</TableCell>
										<TableCell>
											<Badge variant={isRevoked ? "destructive" : "default"}>
												{isRevoked ? "Revoked" : "Active"}
											</Badge>
										</TableCell>
										<TableCell className="text-sm text-muted-foreground">
											{token.lastUsedAt
												? formatDistanceToNow(new Date(token.lastUsedAt), { addSuffix: true })
												: "Never"}
										</TableCell>
										<TableCell className="text-sm">
											{token.requestCount ?? 0}
										</TableCell>
										<TableCell className="text-right">
											{!isRevoked && (
												<DialogAction
													title="Revoke Token"
													description={`Are you sure you want to revoke "${token.name}"? This action cannot be undone.`}
													type="destructive"
													onClick={async () => {
														await revokeToken({ mcpTokenId: token.mcpTokenId });
														await utils.mcpToken.list.invalidate();
														toast.success("Token revoked");
													}}
												>
													<Button variant="ghost" size="icon">
														<Trash2 className="size-4" />
													</Button>
												</DialogAction>
											)}
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
