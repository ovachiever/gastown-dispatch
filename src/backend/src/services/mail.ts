import { runGtJson, runGt } from "../commands/runner.js";
import type {
	MailMessage,
	MailInboxFilters,
	ActionResult,
} from "../types/gasown.js";

/**
 * Get mail inbox for an address.
 * If no address provided, returns inbox for current context.
 */
export async function getMailInbox(
	filters: MailInboxFilters = {},
	townRoot?: string,
): Promise<MailMessage[]> {
	const args = ["mail", "inbox"];

	if (filters.address) {
		args.push(filters.address);
	}
	if (filters.unread) {
		args.push("--unread");
	}

	return runGtJson<MailMessage[]>(args, { cwd: townRoot });
}

/**
 * Read a specific message by ID.
 * Marks the message as read.
 */
export async function readMailMessage(
	messageId: string,
	townRoot?: string,
): Promise<MailMessage> {
	return runGtJson<MailMessage>(["mail", "read", messageId], { cwd: townRoot });
}

/**
 * Get all messages in a thread.
 */
export async function getMailThread(
	threadId: string,
	townRoot?: string,
): Promise<MailMessage[]> {
	return runGtJson<MailMessage[]>(["mail", "thread", threadId], {
		cwd: townRoot,
	});
}

/**
 * Mark a message as read without retrieving it.
 */
export async function markMailRead(
	messageId: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runGt(["mail", "mark-read", messageId], {
		cwd: townRoot,
	});

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to mark message as read",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: `Marked message ${messageId} as read`,
	};
}

/**
 * Mark a message as unread.
 */
export async function markMailUnread(
	messageId: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runGt(["mail", "mark-unread", messageId], {
		cwd: townRoot,
	});

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to mark message as unread",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: `Marked message ${messageId} as unread`,
	};
}

/**
 * Archive a message.
 */
export async function archiveMail(
	messageId: string,
	townRoot?: string,
): Promise<ActionResult> {
	const result = await runGt(["mail", "archive", messageId], {
		cwd: townRoot,
	});

	if (result.exitCode !== 0) {
		return {
			success: false,
			message: "Failed to archive message",
			error: result.stderr,
		};
	}

	return {
		success: true,
		message: `Archived message ${messageId}`,
	};
}
