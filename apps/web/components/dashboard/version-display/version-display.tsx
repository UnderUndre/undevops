import { api } from "@/utils/api";

export const VersionDisplay = () => {
	const { data: dokployVersion } = api.settings.getDokployVersion.useQuery();

	const undevopsVersion = process.env.NEXT_PUBLIC_UNDEVOPS_VERSION || "dev";
	const upstreamVersion = dokployVersion || "unknown";
	const pluginCount = 0;

	return (
		<div className="flex items-center gap-2 text-xs text-muted-foreground">
			<span>undevops v{undevopsVersion}</span>
			<span className="text-border">|</span>
			<span>upstream: {upstreamVersion}</span>
			<span className="text-border">|</span>
			<span>{pluginCount} plugins</span>
		</div>
	);
};
