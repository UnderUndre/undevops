import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { api } from "@/utils/api";

interface Props {
	projectId: string;
	selectedEnvironmentId: string;
	onEnvironmentChange: (environmentId: string) => void;
}

export const EnvironmentSelector = ({
	projectId,
	selectedEnvironmentId,
	onEnvironmentChange,
}: Props) => {
	const { data: environments, isPending } = api.environment.byProjectId.useQuery(
		{ projectId },
		{ enabled: !!projectId },
	);

	return (
		<Select
			value={selectedEnvironmentId}
			onValueChange={onEnvironmentChange}
			disabled={isPending}
		>
			<SelectTrigger className="w-[200px]">
				<SelectValue placeholder={isPending ? "Loading..." : "Select environment"} />
			</SelectTrigger>
			<SelectContent>
				{environments?.map((env) => (
					<SelectItem key={env.environmentId} value={env.environmentId}>
						{env.name}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
};
