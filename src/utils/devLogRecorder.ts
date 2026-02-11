import { addDevLog } from '../services/devLogService';
import { DevLogCategory } from '../types/devLog';

// Helper to record a log entry
export const logDevActivity = async (
    category: DevLogCategory,
    title: string,
    description: string,
    author: string = 'System',
    links: string[] = []
) => {
    try {
        await addDevLog({
            category,
            title,
            description,
            author,
            timestamp: new Date(),
            links
        });
        console.log(`[DevLog] Recorded: ${title}`);
    } catch (error) {
        console.error('[DevLog] Failed to record activity:', error);
        // Fail silently to avoid interrupting the main flow
    }
};

// Specialized helpers for common activities
export const logNewFeature = (title: string, desc: string, author?: string) =>
    logDevActivity('feature', title, desc, author);

export const logBugFix = (title: string, desc: string, author?: string) =>
    logDevActivity('bugfix', title, desc, author);

export const logOptimization = (title: string, desc: string, author?: string) =>
    logDevActivity('optimization', title, desc, author);
