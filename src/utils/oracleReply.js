/**
 * Parse Oracle JSON from model output: plain JSON, prose + ```json block, or embedded `{...}`.
 */
export function tryParseOracleReply(text) {
    const raw = String(text || '').trim()
    if (!raw) return null

    const tryParseObject = (candidate) => {
        const c = String(candidate || '').trim()
        if (!c.startsWith('{') || !c.endsWith('}')) return null
        try {
            const parsed = JSON.parse(c)
            return parsed && typeof parsed === 'object' ? parsed : null
        } catch {
            return null
        }
    }

    let m = raw.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i)
    if (m) {
        const p = tryParseObject(m[1])
        if (p) return p
    }

    const p0 = tryParseObject(raw)
    if (p0) return p0

    const blocks = [...raw.matchAll(/```(?:json)?\s*([\s\S]*?)\s*```/gi)]
    for (let i = blocks.length - 1; i >= 0; i--) {
        const p = tryParseObject(blocks[i][1])
        if (p) return p
    }

    for (let i = 0; i < raw.length; i++) {
        if (raw[i] !== '{') continue
        for (let j = raw.length; j > i; j--) {
            if (raw[j - 1] !== '}') continue
            const slice = raw.slice(i, j)
            try {
                const parsed = JSON.parse(slice)
                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed
            } catch {
                /* continue */
            }
        }
    }

    return null
}

/** User-facing line when the reply is not structured JSON. */
export function plainOracleDisplayText(text) {
    const parsed = tryParseOracleReply(text)
    if (parsed && typeof parsed.message === 'string' && parsed.message.trim()) {
        return parsed.message.trim()
    }
    let s = String(text || '').trim()
    s = s.replace(/```(?:json)?\s*[\s\S]*?\s*```/gi, '').trim()
    return s || text
}
