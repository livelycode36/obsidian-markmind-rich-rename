export const DEBUG = true
if (DEBUG) console.log("DEBUG is enabled");

export function debugLog(...args: unknown[]) {
    if (DEBUG) {
        console.log(new Date().toISOString().slice(11, 23), ...args);
    }
}
