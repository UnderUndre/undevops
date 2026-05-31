import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import { EyeIcon, EyeOffIcon, RotateCcw } from "lucide-react";
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
import { api } from "@/utils/api";

const rotateSecretSchema = z.object({
	newValue: z.string().min(1, "New value is required"),
});

type RotateSecretForm = z.infer<typeof rotateSecretSchema>;

interface Props {
	secretId: string;
	secretKey: string;
}

export const RotateSecretDialog = ({ secretId, secretKey }: Props) => {
	const utils = api.useUtils();
	const [isOpen, setIsOpen] = useState(false);
	const [showValue, setShowValue] = useState(false);

	const { mutateAsync, error, isError } = api.secret.rotate.useMutation();

	const form = useForm<RotateSecretForm>({
		defaultValues: { newValue: "" },
		resolver: standardSchemaResolver(rotateSecretSchema),
	});

	const onSubmit = async (data: RotateSecretForm) => {
		try {
			await mutateAsync({ secretId, newValue: data.newValue });
			toast.success("Secret rotated successfully");
			setIsOpen(false);
			form.reset();
		} catch {
			toast.error("Error rotating secret");
		}
	};

	return (
		<Dialog open={isOpen} onOpenChange={setIsOpen}>
			<DialogTrigger asChild>
				<Button variant="ghost" size="icon" className="h-8 w-8">
					<RotateCcw className="size-4" />
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-lg">
				<DialogHeader>
					<DialogTitle>Rotate Secret</DialogTitle>
					<DialogDescription>
						Rotate the value for <code className="font-mono text-sm bg-muted px-1 rounded">{secretKey}</code>.
						The previous value will be invalidated.
					</DialogDescription>
				</DialogHeader>
				{isError && <AlertBlock type="error">{error?.message}</AlertBlock>}
				<Form {...form}>
					<form
						id="hook-form-rotate-secret"
						onSubmit={form.handleSubmit(onSubmit)}
						className="grid w-full gap-4"
					>
						<FormField
							control={form.control}
							name="newValue"
							render={({ field }) => (
								<FormItem>
									<FormLabel>New Value</FormLabel>
									<FormControl>
										<div className="relative">
											<Input
												type={showValue ? "text" : "password"}
												placeholder="Enter new secret value"
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
					</form>
				</Form>
				<DialogFooter>
					<Button
						isLoading={form.formState.isSubmitting}
						form="hook-form-rotate-secret"
						type="submit"
					>
						Rotate
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
};
