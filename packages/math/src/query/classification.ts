export type ClassificationStatus = 'inside' | 'outside' | 'on-boundary' | 'unknown';

export interface ClassificationResult {
    readonly status: ClassificationStatus;
}

export const Classification = {
    inside(): ClassificationResult {
        return { status: 'inside' };
    },

    outside(): ClassificationResult {
        return { status: 'outside' };
    },

    onBoundary(): ClassificationResult {
        return { status: 'on-boundary' };
    },

    unknown(): ClassificationResult {
        return { status: 'unknown' };
    },

    fromContainment(contains: boolean): ClassificationResult {
        return contains ? Classification.inside() : Classification.outside();
    },
} as const;
