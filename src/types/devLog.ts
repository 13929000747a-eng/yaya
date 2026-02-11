export interface DevLog {
    id: string;
    category: 'feature' | 'bugfix' | 'optimization' | 'doc' | 'other';
    title: string;
    description: string;
    author: string; // e.g., "AI Agent", "Menhao"
    timestamp: Date;
    links?: string[]; // Optional URLs or file paths
}

export type DevLogCategory = DevLog['category'];

export const LOG_CATEGORIES: { [key in DevLogCategory]: { label: string; color: string } } = {
    feature: { label: 'New Feature', color: '#10b981' }, // Green
    bugfix: { label: 'Bug Fix', color: '#ef4444' }, // Red
    optimization: { label: 'Optimization', color: '#3b82f6' }, // Blue
    doc: { label: 'Documentation', color: '#f59e0b' }, // Amber
    other: { label: 'Other', color: '#6b7280' } // Gray
};
