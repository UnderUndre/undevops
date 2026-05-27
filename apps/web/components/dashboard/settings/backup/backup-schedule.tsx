import { standardSchemaResolver as zodResolver } from "@hookform/resolvers/standard-schema";
import { Play } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { AlertBlock } from "@/components/shared/alert-block";
import { DialogAction } from "@/components/shared/dialog-action";
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
import { Switch } from "@/components/ui/switch";
import { api } from "@/utils/api";

const scheduleSchema = z.object({
	schedule: z.string().min(1, "Cron expression is required"),
	enabled: z.boolean(),
});

type ScheduleValues = z.infer<typeof scheduleSchema>;

function describeCron(expression: string): string {
	if (!expression) return "Invalid expression";

	const parts = expression.trim().split(/\s+/);
	if (parts.length < 5) return "Invalid expression";

	const minute = parts[0];
	const hour = parts[1];
	const dayOfMonth = parts[2];
	const month = parts[3];
	const dayOfWeek = parts[4];

	if (
		minute === "0" &&
		hour.startsWith("*/") &&
		dayOfMonth === "*" &&
		month === "*" &&
		dayOfWeek === "*"
	) {
		const interval = hour.replace("*/", "");
		return `Every ${interval} hours`;
	}

	if (
		minute === "0" &&
		hour === "*" &&
		dayOfMonth === "*" &&
		month === "*" &&
		dayOfWeek === "*"
	) {
		return "Every hour";
	}

	if (
		minute === "0" &&
		!hour.includes("*") &&
		!hour.includes("/") &&
		dayOfMonth === "*" &&
		month === "*" &&
		dayOfWeek === "*"
	) {
		return `Daily at ${hour.padStart(2, "0")}:00`;
	}

	if (
		minute === "0" &&
		!hour.includes("*") &&
		!hour.includes("/") &&
		dayOfMonth === "*" &&
		month === "*" &&
		dayOfWeek !== "*"
	) {
		const days = [
			"Sunday",
			"Monday",
			"Tuesday",
			"Wednesday",
			"Thursday",
			"Friday",
			"Saturday",
		];
		const dayIndex = Number.parseInt(dayOfWeek, 10);
		if (!Number.isNaN(dayIndex) && dayIndex >= 0 && dayIndex <= 6) {
			return `Weekly on ${days[dayIndex]} at ${hour.padStart(2, "0")}:00`;
		}
	}

	return expression;
}

export const BackupSchedule = () => {
	const [isTriggering, setIsTriggering] = useState(false);
	const utils = api.useUtils();

	const { data: config } = api.settings.getBackupConfig.useQuery();

	const {
		mutateAsync: saveConfig,
		isPending: isSaving,
		isError: isSaveError,
		error: saveError,
	} = api.settings.saveBackupSchedule.useMutation();

	const { mutateAsync: triggerBackup } =
		api.settings.triggerManualBackup.useMutation();

	const form = useForm<ScheduleValues>({
		defaultValues: {
			schedule: "0 */6 * * *",
			enabled: true,
		},
		resolver: zodResolver(scheduleSchema),
	});

	const watchedSchedule = form.watch("schedule");

	useEffect(() => {
		if (config) {
			form.reset({
				schedule: config.schedule ?? "0 */6 * * *",
				enabled: config.scheduleEnabled ?? true,
			});
		}
	}, [config, form]);

	const onSubmit = async (data: ScheduleValues) => {
		await saveConfig({
			schedule: data.schedule,
			enabled: data.enabled,
		})
			.then(async () => {
				toast.success("Backup schedule updated");
				await utils.settings.getBackupConfig.invalidate();
				await utils.settings.getBackupStatus.invalidate();
			})
			.catch((e) => {
				toast.error("Error updating schedule", {
					description: e.message,
				});
			});
	};

	const handleTriggerBackup = async () => {
		setIsTriggering(true);
		await triggerBackup()
			.then(async () => {
				toast.success("Backup triggered successfully");
				await utils.settings.getBackupStatus.invalidate();
			})
			.catch((e) => {
				toast.error("Error triggering backup", {
					description: e.message,
				});
			})
			.finally(() => {
				setIsTriggering(false);
			});
	};

	return (
		<Card className="bg-background">
			<CardHeader>
				<CardTitle className="text-xl">Backup Schedule</CardTitle>
				<CardDescription>
					Configure when automatic backups run.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-6">
				{isSaveError && (
					<AlertBlock type="error" className="mb-4">
						{saveError?.message}
					</AlertBlock>
				)}

				<Form {...form}>
					<form
						id="backup-schedule-form"
						onSubmit={form.handleSubmit(onSubmit)}
						className="grid w-full gap-4"
					>
						<FormField
							control={form.control}
							name="enabled"
							render={({ field }) => (
								<FormItem className="flex items-center justify-between rounded-lg border p-4">
									<div className="flex flex-col gap-0.5">
										<FormLabel>Enable Scheduled Backups</FormLabel>
										<span className="text-xs text-muted-foreground">
											Automatically run backups on the configured schedule.
										</span>
									</div>
									<FormControl>
										<Switch
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									</FormControl>
								</FormItem>
							)}
						/>

						<FormField
							control={form.control}
							name="schedule"
							render={({ field }) => (
								<FormItem>
									<FormLabel>Cron Expression</FormLabel>
									<FormControl>
										<Input placeholder="0 */6 * * *" {...field} />
									</FormControl>
									<div className="text-xs text-muted-foreground">
										Preview: {describeCron(watchedSchedule)}
									</div>
									<FormMessage />
								</FormItem>
							)}
						/>

						<Button type="submit" form="backup-schedule-form" isLoading={isSaving}>
							Save Schedule
						</Button>
					</form>
				</Form>

				<div className="border-t pt-4">
					<div className="flex items-center justify-between">
						<div className="flex flex-col gap-0.5">
							<span className="text-sm font-medium">Manual Backup</span>
							<span className="text-xs text-muted-foreground">
								Trigger a backup immediately.
							</span>
						</div>
						<DialogAction
							title="Trigger Manual Backup"
							description="Are you sure you want to start a backup now? This may take a while depending on the data size."
							type="default"
							onClick={handleTriggerBackup}
						>
							<Button
								variant="secondary"
								isLoading={isTriggering}
								className="gap-2"
							>
								<Play className="size-4" />
								Backup Now
							</Button>
						</DialogAction>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};
