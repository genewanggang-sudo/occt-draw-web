import type { SegmentSegment2OverlapIntersection } from './segmentSegment2OverlapIntersection';
import type { SegmentSegment2PointIntersection } from './segmentSegment2PointIntersection';

export type SegmentSegment2Intersection =
    | SegmentSegment2OverlapIntersection
    | SegmentSegment2PointIntersection;
