import { fetchSheetData } from './googleSheetsApi';

export interface UserRecord {
    username: string;
    password: string;
    name: string;
    pageAccess: string[]; // e.g. ['all'] or ['Dashboard', 'SF Production', ...]
}

/**
 * Fetches all users from the "USER" sheet and attempts to authenticate.
 * Returns the matched UserRecord on success, or null on failure.
 */
export const loginWithSheet = async (
    username: string,
    password: string
): Promise<UserRecord | null> => {
    try {
        // Fetch all rows from the USER sheet
        const rows = await fetchSheetData('USER');

        if (!rows || rows.length < 2) {
            console.warn('USER sheet is empty or has no data rows.');
            return null;
        }

        // Row 0 is the header row: Username | Password | Name | Page Acess
        // Data starts from row 1
        const dataRows = rows.slice(1);

        for (const row of dataRows) {
            const sheetUsername = (row[0] || '').trim();
            const sheetPassword = (row[1] || '').trim();
            const sheetName = (row[2] || '').trim();
            const sheetPageAccess = (row[3] || '').trim();

            if (
                sheetUsername.toLowerCase() === username.toLowerCase() &&
                sheetPassword === password
            ) {
                // Parse page access — comma-separated or "all"
                const pageAccess = sheetPageAccess
                    ? sheetPageAccess.split(',').map((p) => p.trim()).filter(Boolean)
                    : ['all'];

                return {
                    username: sheetUsername,
                    password: sheetPassword,
                    name: sheetName,
                    pageAccess,
                };
            }
        }

        return null; // No match found
    } catch (error) {
        console.error('Error during sheet login:', error);
        throw error;
    }
};

/**
 * Checks whether the given user has access to a specific page/tab.
 * If the user's pageAccess contains "all", they have access to everything.
 */
export const hasPageAccess = (
    pageAccess: string[],
    pageName: string
): boolean => {
    if (!pageAccess || pageAccess.length === 0) return false;
    if (pageAccess.some((p) => p.toLowerCase() === 'all')) return true;
    return pageAccess.some((p) => p.toLowerCase() === pageName.toLowerCase());
};
