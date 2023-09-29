// export const DEBUG = true
export const DEBUG = false
if (DEBUG) console.log("DEBUG is enabled")
else console.log("DEBUG is disabled")

export function debugLog(...args: unknown[]) {
    if (DEBUG) {
        console.log(new Date().toISOString().slice(11, 23), ...args);
    }
}
