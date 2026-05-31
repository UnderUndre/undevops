import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
	AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { api } from "@/utils/api";

interface Props {
	secretId: string;
	secretKey: string;
	scope: string;
	scopeId: string;
}

export const DeleteSecretDialog = ({ secretId, secretKey, scope, scopeId }: Props) => {
	const utils = api.useUtils();
	const [isOpen, setIsOpen] = useState(false);

	const { mutateAsync } = api.secret.remove.useMutation();

	return (
		<AlertDialog open={isOpen} onOpenChange={setIsOpen}>
			<AlertDialogTrigger asChild>
				<Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
					<Trash2 className="size-4" />
				</Button>
			</AlertDialogTrigger>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>Delete Secret</AlertDialogTitle>
					<AlertDialogDescription>
						Are you sure you want to delete the secret{" "}
						<code className="font-mono text-sm bg-muted px-1 rounded">{secretKey}</code>?
						This action cannot be undone. Any services using this secret will lose
						access to its value.
					</AlertDialogDescription>
				</AlertDialogHeader>
				<AlertDialogFooter>
					<AlertDialogCancel>Cancel</AlertDialogCancel>
					<AlertDialogAction
						onClick={async () => {
							try {
								await mutateAsync({ secretId });
								toast.success("Secret deleted");
								await utils.secret.list.invalidate({ scope, scopeId });
							} catch {
								toast.error("Error deleting secret");
							}
						}}
					>
						Delete
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	);
};
