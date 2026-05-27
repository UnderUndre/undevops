import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { PlusIcon } from "lucide-react";
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

const createReviewerSchema = z.object({
	name: z.string().min(1, "Name is required").max(128),
	provider: z.enum(["claude", "openai", "gemini", "codex", "custom"]),
	model: z.string().min(1, "Model is required"),
	credentialRef: z.string().min(1, "Credential reference is required"),
	apiUrl: z.string().optional(),
	timeoutSeconds: z.number().int().min(5).max(300).default(30),
});

type CreateReviewerForm = z.infer<typeof createReviewerSchema>;

const PROVIDERS = [
	{ value: "claude", label: "Claude" },
	{ value: "openai", label: "OpenAI" },
	{ value: "gemini", label: "Gemini" },
	{ value: "codex", label: "Codex" },
	{ value: "custom", label: "Custom" },
] as const;

export const CreateReviewerDialog = () => {
	const utils = api.useUtils();
	const [isOpen, setIsOpen] = useState(false);

	const { mutateAsync, error, isError } = api.aiReviewer.create.useMutation();

	const form = useForm<CreateReviewerForm>({
		defaultValues: {
			name: "",
			provider: "claude",
			model: "",
			credentialRef: "",
			apiUrl: "",
			timeoutSeconds: 30,
		},
		resolver: standardSchemaResolver(createReviewerSchema),
	});

	const provider = form.watch("provider");

	const onSubmit = async (data: CreateReviewerForm) => {
		await mutateAsync({
			name: data.name,
			provider: data.provider,
			model: data.model,
			credentialRef: data.credentialRef,
			apiUrl: data.provider === "custom" ? data.apiUrl : undefined,
			timeoutSeconds: data.timeoutSeconds,
		});
		await utils.aiReviewer.list.invalidate();
		toast.success("AI reviewer created");
		setIsOpen(false);
		form.reset();
	};

	const handleClose = (open: boolean) => {
		if (!open) {
			form.reset();
		}
		setIsOpen(open);
	};

	return (
		<Dialog open={isOpen} onOpenChange={handleClose}>
			<DialogTrigger asChild>
				<Button>
					<PlusIcon className="h-4 w-4" />
					Add Reviewer
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Add AI Reviewer</DialogTitle>
					<DialogDescription>
						Configure an AI reviewer for automated deployment reviews.
					</DialogDescription>
				</DialogHeader>
				{isError && <AlertBlock type="error">{error?.message}</AlertBlock>}
				<Form {...form}>
					<form
						id="hook-form-create-ai-reviewer"
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
										<Input placeholder="e.g. Security Reviewer" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="provider"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Provider</FormLabel>
									<Select value={field.value} onValueChange={field.onChange}>
										<FormControl>
											<SelectTrigger>
												<SelectValue />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											{PROVIDERS.map((p) => (
												<SelectItem key={p.value} value={p.value}>
													{p.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="model"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Model</FormLabel>
									<FormControl>
										<Input placeholder="e.g. claude-sonnet-4-20250514" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="credentialRef"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Credential Reference</FormLabel>
									<FormControl>
										<Input placeholder="Select secret or enter env:KEY" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						{provider === "custom" && (
							<FormField
								control={form.control}
								name="apiUrl"
								render={({ field }) => (
									<FormItem>
										<FormLabel>API URL</FormLabel>
										<FormControl>
											<Input placeholder="https://api.example.com/v1" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						)}
						<FormField
							control={form.control}
							name="timeoutSeconds"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Timeout (seconds)</FormLabel>
									<FormControl>
										<Input
											type="number"
											min={5}
											max={300}
											{...field}
											onChange={(e) => {
												const v = e.target.value;
												field.onChange(v === "" || !Number.isFinite(Number(v)) ? 30 : Number(v));
											}}
										/>
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
						form="hook-form-create-ai-reviewer"
						type="submit"
					>
						Create
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
