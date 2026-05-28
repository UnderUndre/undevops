import type { ReactElement } from "react";
import type { NextPageWithLayout } from "@/pages/_app";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { ShowAgentActions } from "@/components/dashboard/agent-actions/show-agent-actions";
import { validateRequest } from "@undevops/server/lib/auth";

const AgentActionsPage: NextPageWithLayout = () => {
	return (
		<div className="flex flex-col gap-4 w-full">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Agent Actions</h1>
					<p className="text-sm text-muted-foreground">Review and manage AI agent deployment requests</p>
				</div>
			</div>
			<ShowAgentActions />
		</div>
	);
};

AgentActionsPage.getLayout = (page: ReactElement) => {
	return <DashboardLayout>{page}</DashboardLayout>;
};

export default AgentActionsPage;

export async function getServerSideProps({ req, res }: any) {
	const { user } = await validateRequest(req);
	if (!user) {
		return { redirect: { destination: "/auth/login", permanent: false } };
	}

	return { props: {} };
}
