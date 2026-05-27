import type { ReactElement } from "react";
import type { NextPageWithLayout } from "@/pages/_app";
import { DashboardLayout } from "@/components/layouts/dashboard-layout";
import { ShowAgentActions } from "@/components/dashboard/agent-actions/show-agent-actions";
import { auth } from "@/auth";

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

export async function getServerSideProps(context: any) {
	const session = await auth(context.req, context.res);
	if (!session) {
		return { redirect: { destination: "/auth/login", permanent: false } };
	}

	return { props: {} };
}
