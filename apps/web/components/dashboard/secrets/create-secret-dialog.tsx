import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { EyeIcon, EyeOffIcon, PlusIcon } from "lucide-react";
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

const createSecretSchema = z.object({
	key: z
		.string()
		.min(1, "Key is required")
		.regex(/^[A-Z_][A-Z0-9_]*$/, "Key must be UPPER_SNAKE_CASE"),
	value: z.string().min(1, "Value is required"),
	scope: z.enum(["organization", "project", "environment", "application", "compose"]),
	scopeTargetId: z.string().optional(),
});

type CreateSecretForm = z.infer<typeof createSecretSchema>;

interface Props {
	scope: "organization" | "project" | "environment" | "application" | "compose";
	scopeId: string;
}

export const CreateSecretDialog = ({ scope, scopeId }: Props) => {
	const utils = api.useUtils();
	const [isOpen, setIsOpen] = useState(false);
	const [showValue, setShowValue] = useState(false);

	const { mutateAsync, error, isError } = api.secret.create.useMutation();

	const form = useForm<CreateSecretForm>({
		defaultValues: {
			key: "",
			value: "",
			scope,
			scopeTargetId: scopeId,
		},
		resolver: standardSchemaResolver(createSecretSchema),
	});

	const onSubmit = async (data: CreateSecretForm) => {
		try {
			await mutateAsync({
				key: data.key,
				value: data.value,
				scope: data.scope,
				scopeTargetId: data.scopeTargetId || scopeId,
			});
			toast.success("Secret created successfully");
			setIsOpen(false);
			form.reset();
			await utils.secret.list.invalidate({ scope, scopeId });
		} catch {
			toast.error("Error creating secret");
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button>
					<PlusIcon className="h-4 w-4" />
					Add Secret
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Create Secret</DialogTitle>
					<DialogDescription>
						Add a new secret. The value will be encrypted and never shown again.
					</DialogDescription>
				</DialogHeader>
				{isError && <AlertBlock type="error">{error?.message}</AlertBlock>}
				<Form {...form}>
					<form
						id="hook-form-create-secret"
						onSubmit={form.handleSubmit(onSubmit)}
						className="grid w-full gap-4"
					>
						<FormField
							control={form.control}
							name="key"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Key</FormLabel>
									<FormControl>
										<Input placeholder="DATABASE_URL" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="value"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Value</FormLabel>
									<FormControl>
										<div className="relative">
											<Input
												type={showValue ? "text" : "password"}
												placeholder="Enter secret value"
												{...field}
											/>
											<Button
												type="button"
												variant="ghost"
												size="icon"
												className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
												onClick={() => setShowValue(!showValue)}
											>
												{showValue ? (
													<EyeOffIcon className="size-4" />
												) : (
													<EyeIcon className="size-4" />
												)}
											</Button>
										</div>
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
											<SelectItem value="organization">Organization</SelectItem>
											<SelectItem value="project">Project</SelectItem>
											<SelectItem value="environment">Environment</SelectItem>
											<SelectItem value="application">Application</SelectItem>
											<SelectItem value="compose">Compose</SelectItem>
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
					</form>
				</Form>
				<DialogFooter>
					<Button
						isLoading={form.formState.isSubmitting}
						form="hook-form-create-secret"
						type="submit"
					>
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
