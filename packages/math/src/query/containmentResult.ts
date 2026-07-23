import type { PolygonPointClassification } from '../geometry-2d/polygon2';
import { ClassificationStatus } from './classification';

export class ContainmentResult {
    public readonly contains: boolean;
    public readonly status: ClassificationStatus;

    private constructor(status: ClassificationStatus) {
        this.contains = status !== ClassificationStatus.Outside;
        this.status = status;
    }

    public static inside(): ContainmentResult {
        return new ContainmentResult(ClassificationStatus.Inside);
    }

    public static onBoundary(): ContainmentResult {
        return new ContainmentResult(ClassificationStatus.OnBoundary);
    }

    public static outside(): ContainmentResult {
        return new ContainmentResult(ClassificationStatus.Outside);
    }

    public static fromPolygonPointClassification(
        classification: PolygonPointClassification,
    ): ContainmentResult {
        switch (classification) {
            case 'inside':
                return ContainmentResult.inside();
            case 'on-boundary':
                return ContainmentResult.onBoundary();
            default:
                return ContainmentResult.outside();
        }
    }
}
