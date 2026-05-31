import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { PlusIcon, SquarePen } from "lucide-react";
import { useEffect, useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/utils/api";

const environmentSchema = z.object({
	name: z
		.string()
		.min(1, "Environment name is required")
		.max(50, "Name must be 50 characters or less"),
	description: z.string().optional(),
	gatePolicy: z.enum(["disabled", "single", "unanimous", "manual_only"]).default("disabled"),
});

type EnvironmentForm = z.infer<typeof environmentSchema>;

interface Props {
	projectId: string;
	environmentId?: string;
}

export const HandleEnvironment = ({ projectId, environmentId }: Props) => {
	const utils = api.useUtils();
	const [isOpen, setIsOpen] = useState(false);

	const { mutateAsync: createEnv, error: createError, isError: isCreateError } =
		api.environment.create.useMutation();
	const { mutateAsync: updateEnv, error: updateError, isError: isUpdateError } =
		api.environment.update.useMutation();

	const { data: environment } = api.environment.one.useQuery(
		{ environmentId: environmentId || "" },
		{ enabled: !!environmentId },
	);

	const isEdit = !!environmentId;
	const error = isEdit ? updateError : createError;
	const isError = isEdit ? isUpdateError : isCreateError;

	const form = useForm<EnvironmentForm>({
		defaultValues: {
			name: "",
			description: "",
			gatePolicy: "disabled",
		},
		resolver: standardSchemaResolver(environmentSchema),
	});

	useEffect(() => {
		if (environment && isEdit) {
			form.reset({
				name: environment.name || "",
				description: (environment as any).description || "",
				gatePolicy: (environment as any).gatePolicy || "disabled",
			});
		}
	}, [environment, isEdit, form]);

	const onSubmit = async (data: EnvironmentForm) => {
		try {
			if (isEdit) {
				await updateEnv({
					environmentId,
					name: data.name,
					description: data.description,
				} as any);
				toast.success("Environment updated");
			} else {
				await createEnv({
					name: data.name,
					description: data.description,
					projectId,
				} as any);
				toast.success("Environment created");
			}
			setIsOpen(false);
			form.reset();
			await utils.environment.byProjectId.invalidate({ projectId });
		} catch {
			toast.error(isEdit ? "Error updating environment" : "Error creating environment");
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				{isEdit ? (
					<Button variant="ghost" size="icon" className="h-8 w-8">
						<SquarePen className="size-4" />
					</Button>
				) : (
					<Button>
						<PlusIcon className="h-4 w-4" />
						Add Environment
					</Button>
				)}
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>{isEdit ? "Edit" : "Create"} Environment</DialogTitle>
					<DialogDescription>
						{isEdit
							? "Update environment settings and gate policy"
							: "Create a new environment for this project"}
					</DialogDescription>
				</DialogHeader>
				{isError && <AlertBlock type="error">{error?.message}</AlertBlock>}
				<Form {...form}>
					<form
						id="hook-form-environment"
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
										<Input placeholder="staging" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="description"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Description</FormLabel>
									<FormControl>
										<Textarea
											placeholder="Staging environment for QA"
											className="resize-none"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>
						<FormField
							control={form.control}
							name="gatePolicy"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Gate Policy</FormLabel>
									<Select
										value={field.value}
										onValueChange={field.onChange}
									>
										<FormControl>
											<SelectTrigger>
												<SelectValue placeholder="Select gate policy" />
											</SelectTrigger>
										</FormControl>
										<SelectContent>
											<SelectItem value="disabled">
												Disabled — No approval required
											</SelectItem>
											<SelectItem value="single">
												Single Reviewer — One approval needed
											</SelectItem>
											<SelectItem value="unanimous">
												Unanimous — All reviewers must approve
											</SelectItem>
											<SelectItem value="manual_only">
												Manual Only — Only manual triggers
											</SelectItem>
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
						form="hook-form-environment"
						type="submit"
					>
						{isEdit ? "Update" : "Create"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
