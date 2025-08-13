export function isValidHttpUrl(value) {
    try {
        const u = new URL(value)
        return u.protocol === 'http:' || u.protocol === 'https:'
    } catch {
        return false
    }
}