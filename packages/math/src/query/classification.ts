export type ClassificationStatus = 'inside' | 'outside' | 'on-boundary' | 'unknown';

export interface ClassificationResult {
    readonly status: ClassificationStatus;
}

export class Classification {
    private static readonly defaultClassifier = new Classification();

    public static inside(): ClassificationResult {
        return Classification.defaultClassifier.inside();
    }

    public static outside(): ClassificationResult {
        return Classification.defaultClassifier.outside();
    }

    public static onBoundary(): ClassificationResult {
        return Classification.defaultClassifier.onBoundary();
    }

    public static unknown(): ClassificationResult {
        return Classification.defaultClassifier.unknown();
    }

    public static fromContainment(contains: boolean): ClassificationResult {
        return Classification.defaultClassifier.fromContainment(contains);
    }

    public inside(): ClassificationResult {
        return { status: 'inside' };
    }

    public outside(): ClassificationResult {
        return { status: 'outside' };
    }

    public onBoundary(): ClassificationResult {
        return { status: 'on-boundary' };
    }

    public unknown(): ClassificationResult {
        return { status: 'unknown' };
    }

    public fromContainment(contains: boolean): ClassificationResult {
        return contains ? this.inside() : this.outside();
    }
}
