export interface AnchorSelector {
	exact: string;
	prefix: string;
	suffix: string;
}

export interface AnchorPosition {
	from: number;
	to: number;
}

export function findAnchorPosition(
	doc: string,
	anchor: AnchorSelector,
	storedPosition?: { start: number; end: number }
): AnchorPosition | null {
	const { exact, prefix, suffix } = anchor;
	if (!exact) return null;

	if (storedPosition) {
		const slice = doc.substring(storedPosition.start, storedPosition.end);
		if (slice === exact) {
			return { from: storedPosition.start, to: storedPosition.end };
		}
	}

	let searchStart = 0;
	while (true) {
		const idx = doc.indexOf(exact, searchStart);
		if (idx === -1) break;

		const suffixOk = suffix
			? contextMatches(
					doc.substring(idx + exact.length, idx + exact.length + suffix.length),
					suffix,
					0.5
			  )
			: true;

		if (prefix) {
			const actualPrefix = doc.substring(Math.max(0, idx - prefix.length), idx);
			if (contextMatches(actualPrefix, prefix, 0.5) && suffixOk) {
				return { from: idx, to: idx + exact.length };
			}
		} else if (suffixOk) {
			return { from: idx, to: idx + exact.length };
		}
		searchStart = idx + 1;
	}

	return fuzzyFind(doc, exact);
}

function contextMatches(actual: string, expected: string, threshold: number): boolean {
	if (!expected) return true;
	const shorter = Math.min(actual.length, expected.length);
	if (shorter === 0) return true;
	const compare = actual.slice(-shorter);
	let matches = 0;
	for (let i = 0; i < shorter; i++) {
		if (compare[i] === expected[expected.length - shorter + i]) matches++;
	}
	return matches / shorter >= threshold;
}

function fuzzyFind(doc: string, exact: string): AnchorPosition | null {
	if (exact.length < 4) return null;
	const maxDist = Math.floor(exact.length * 0.2);
	let best: AnchorPosition | null = null;
	let bestDist = Number.POSITIVE_INFINITY;

	for (let i = 0; i <= doc.length - exact.length; i++) {
		const slice = doc.substring(i, i + exact.length);
		const dist = levenshtein(slice, exact);
		if (dist <= maxDist && dist < bestDist) {
			bestDist = dist;
			best = { from: i, to: i + exact.length };
			if (dist === 0) return best;
		}
	}

	return best;
}

function levenshtein(a: string, b: string): number {
	const m = a.length;
	const n = b.length;
	const dp = Array.from({ length: m + 1 }, (_, i) =>
		Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
	);

	for (let i = 1; i <= m; i++) {
		for (let j = 1; j <= n; j++) {
			dp[i][j] =
				a[i - 1] === b[j - 1]
					? dp[i - 1][j - 1]
					: 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
		}
	}

	return dp[m][n];
}

export function extractAnchor(doc: string, from: number, to: number): AnchorSelector {
	return {
		exact: doc.substring(from, to),
		prefix: doc.substring(Math.max(0, from - 32), from),
		suffix: doc.substring(to, Math.min(doc.length, to + 32)),
	};
}
