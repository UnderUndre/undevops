import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { Copy, PlusIcon, Shield } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/utils/api";

const createTokenSchema = z.object({
	name: z.string().min(1, "Name is required").max(128),
	scope: z.enum(["read", "deploy", "admin"]),
	targetScope: z.string().optional(),
});

type CreateTokenForm = z.infer<typeof createTokenSchema>;

export const CreateTokenDialog = () => {
	const utils = api.useUtils();
	const [isOpen, setIsOpen] = useState(false);
	const [createdToken, setCreatedToken] = useState<string | null>(null);

	const { mutateAsync, error, isError } = api.mcpToken.create.useMutation();

	const form = useForm<CreateTokenForm>({
		defaultValues: {
			name: "",
			scope: "read",
			targetScope: "",
		},
		resolver: standardSchemaResolver(createTokenSchema),
	});

	const onSubmit = async (data: CreateTokenForm) => {
		const result = await mutateAsync({
			name: data.name,
			scope: data.scope,
			targetScope: data.targetScope || undefined,
		});
		setCreatedToken(result.token);
		await utils.mcpToken.list.invalidate();
		form.reset();
	};

	const copyToken = () => {
		if (createdToken) {
			navigator.clipboard.writeText(createdToken);
			toast.success("Token copied to clipboard");
		}
	};

	const handleClose = (open: boolean) => {
		if (!open) {
			setCreatedToken(null);
			form.reset();
		}
		setIsOpen(open);
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogTrigger asChild>
				<Button>
					<PlusIcon className="h-4 w-4" />
					Create Token
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Create MCP Token</DialogTitle>
					<DialogDescription>
						Generate a token for MCP integrations. The token value will only be
						shown once — store it securely.
					</DialogDescription>
				</DialogHeader>

				{createdToken ? (
					<div className="space-y-4">
						<AlertBlock type="warning">
							Copy this token now. You will not be able to see it again.
						</AlertBlock>
						<div className="flex items-center gap-2">
							<code className="flex-1 rounded bg-muted px-3 py-2 text-sm font-mono break-all select-all">
								{createdToken}
							</code>
							<Button variant="outline" size="icon" onClick={copyToken}>
								<Copy className="size-4" />
							</Button>
						</div>
						<Button className="w-full" onClick={() => handleClose(false)}>
							Done
						</Button>
					</div>
				) : (
					<>
						{isError && <AlertBlock type="error">{error?.message}</AlertBlock>}
						<Form {...form}>
							<form
								id="hook-form-create-mcp-token"
								onSubmit={form.handleSubmit(onSubmit)}
								className="grid w-full gap-4"
							>
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Name</FormLabel>
											<FormControl>
												<Input placeholder="my-agent-token" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="scope"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Scope</FormLabel>
											<Select value={field.value} onValueChange={field.onChange}>
												<FormControl>
													<SelectTrigger>
														<SelectValue />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="read">Read</SelectItem>
													<SelectItem value="deploy">Deploy</SelectItem>
													<SelectItem value="admin">Admin</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="targetScope"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Target Scope (optional)</FormLabel>
											<FormControl>
												<Input placeholder="project-id or leave empty" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</form>
						</Form>
						<DialogFooter>
							<Button
								isLoading={form.formState.isSubmitting}
								form="hook-form-create-mcp-token"
								type="submit"
							>
								Create
							</Button>
						</DialogFooter>
					</>
				)}
			</DialogContent>
		</Dialog>
	);
};
