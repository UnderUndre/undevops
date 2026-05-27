import { useCallback, useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Props {
	serverId?: string;
	logPath: string;
	errorMessage?: string;
	isStreaming?: boolean;
}

export const RealtimeLogViewer = ({
	logPath,
	errorMessage,
	isStreaming = true,
}: Props) => {
	const [logs, setLogs] = useState<string[]>([]);
	const scrollRef = useRef<HTMLDivElement>(null);
	const wsRef = useRef<WebSocket | null>(null);

	useEffect(() => {
		if (!logPath || !isStreaming) return;

		const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
		const wsUrl = `${protocol}//${window.location.host}/api/logs?path=${encodeURIComponent(logPath)}`;

		try {
			const ws = new WebSocket(wsUrl);
			wsRef.current = ws;

			ws.onmessage = (event) => {
				const data = JSON.parse(event.data);
				if (data.line) {
					setLogs((prev) => [...prev, data.line]);
				}
			};

			ws.onerror = () => {
				setLogs((prev) => [...prev, "[error] Connection lost"]);
			};

			return () => {
				ws.close();
				wsRef.current = null;
			};
		} catch {
			setLogs((prev) => [...prev, "[error] Failed to connect to log stream"]);
		}
	}, [logPath, isStreaming]);

	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [logs]);

	if (errorMessage) {
		return (
			<div className="rounded-lg border bg-red-950/20 border-red-900 p-4 font-mono text-sm text-red-400 whitespace-pre-wrap">
				{errorMessage}
			</div>
		);
	}

	return (
		<ScrollArea className="h-[400px] w-full rounded-lg border bg-black p-4">
			<div ref={scrollRef} className="font-mono text-sm text-green-400 whitespace-pre-wrap space-y-0.5">
				{logs.length === 0 ? (
					<span className="text-muted-foreground">Waiting for logs...</span>
				) : (
					logs.map((line, i) => (
						<div key={i}>{line}</div>
					))
				)}
			</div>
		</ScrollArea>
	);
};
