import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AlertBlock } from "@/components/shared/alert-block";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
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

const backupConfigSchema = z.object({
	endpoint: z.string().min(1, "Endpoint is required"),
	bucket: z.string().min(1, "Bucket name is required"),
	accessKeyId: z.string().min(1, "Access Key ID is required"),
	secretAccessKey: z.string().min(1, "Secret Access Key is required"),
	pathPrefix: z.string().optional(),
	region: z.string().optional(),
});

type BackupConfigValues = z.infer<typeof backupConfigSchema>;

export const BackupConfigForm = () => {
	const [showSecret, setShowSecret] = useState(false);
	const utils = api.useUtils();

	const { data: config } = api.settings.getBackupConfig.useQuery();

	const {
		mutateAsync: saveConfig,
		isPending: isSaving,
		isError: isSaveError,
		error: saveError,
	} = api.settings.saveBackupConfig.useMutation();

	const {
		mutateAsync: testConnection,
		isPending: isTestingConnection,
		isError: isConnectionError,
		error: connectionError,
	} = api.settings.testBackupConnection.useMutation();

	const form = useForm<BackupConfigValues>({
		defaultValues: {
			endpoint: "",
			bucket: "",
			accessKeyId: "",
			secretAccessKey: "",
			pathPrefix: "",
			region: "",
		},
		resolver: zodResolver(backupConfigSchema),
	});

	useEffect(() => {
		if (config) {
			form.reset({
				endpoint: config.endpoint ?? "",
				bucket: config.bucket ?? "",
				accessKeyId: config.accessKeyId ?? "",
				secretAccessKey: config.secretAccessKey ?? "",
				pathPrefix: config.pathPrefix ?? "",
				region: config.region ?? "",
			});
		}
	}, [config, form]);

	const onSubmit = async (data: BackupConfigValues) => {
		await saveConfig({
			endpoint: data.endpoint,
			bucket: data.bucket,
			accessKeyId: data.accessKeyId,
			secretAccessKey: data.secretAccessKey,
			pathPrefix: data.pathPrefix || undefined,
			region: data.region || undefined,
		})
			.then(async () => {
				toast.success("Backup configuration saved");
				await utils.settings.getBackupConfig.invalidate();
			})
			.catch((e) => {
				toast.error("Error saving backup configuration", {
					description: e.message,
				});
			});
	};

	const handleTestConnection = async () => {
		const result = await form.trigger([
			"endpoint",
			"bucket",
			"accessKeyId",
			"secretAccessKey",
		]);
		if (!result) return;

		const values = form.getValues();
		await testConnection({
			endpoint: values.endpoint,
			bucket: values.bucket,
			accessKeyId: values.accessKeyId,
			secretAccessKey: values.secretAccessKey,
			region: values.region || undefined,
		})
			.then(() => {
				toast.success("Connection test successful");
			})
			.catch((e) => {
				toast.error("Connection test failed", {
					description: e.message,
				});
			});
	};

	return (
		<Card className="bg-background">
			<CardHeader>
				<CardTitle className="text-xl">S3 Configuration</CardTitle>
				<CardDescription>
					Configure the S3-compatible storage for system backups.
				</CardDescription>
			</CardHeader>
			<CardContent>
				{(isSaveError || isConnectionError) && (
					<AlertBlock type="error" className="mb-4">
						{connectionError?.message || saveError?.message}
					</AlertBlock>
				)}

				<Form {...form}>
					<form
						id="backup-config-form"
						onSubmit={form.handleSubmit(onSubmit)}
						className="grid w-full gap-4"
					>
						<FormField
							control={form.control}
							name="endpoint"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Endpoint</FormLabel>
									<FormControl>
										<Input
											placeholder="https://s3.amazonaws.com"
											{...field}
										/>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="bucket"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Bucket Name</FormLabel>
									<FormControl>
										<Input placeholder="my-backup-bucket" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="accessKeyId"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Access Key ID</FormLabel>
									<FormControl>
										<Input placeholder="AKIAIOSFODNN7EXAMPLE" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="secretAccessKey"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Secret Access Key</FormLabel>
									<FormControl>
										<div className="relative">
											<Input
												type={showSecret ? "text" : "password"}
												placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
												{...field}
											/>
											<button
												type="button"
												className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
												onClick={() => setShowSecret(!showSecret)}
											>
												{showSecret ? (
													<EyeOffIcon className="size-4" />
												) : (
													<EyeIcon className="size-4" />
												)}
											</button>
										</div>
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="pathPrefix"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Path Prefix (Optional)</FormLabel>
									<FormControl>
										<Input placeholder="backups/undevops/" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="region"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Region (Optional)</FormLabel>
									<FormControl>
										<Input placeholder="us-east-1" {...field} />
									</FormControl>
									<FormMessage />
								</FormItem>
							)}
						/>

						<div className="flex flex-row justify-between gap-4 pt-2">
							<Button
								type="button"
								variant="secondary"
								isLoading={isTestingConnection}
								onClick={handleTestConnection}
							>
								Test Connection
							</Button>
							<Button
								type="submit"
								form="backup-config-form"
								isLoading={isSaving}
							>
								Save Configuration
							</Button>
						</div>
					</form>
				</Form>
			</CardContent>
		</Card>
	);
};
