# math 库架构设计

## 总架构图

```mermaid
flowchart TB
    App["上层模块<br/>editor / sketch / constraints / display / renderer"]

    subgraph Math["@occt-draw/math"]
        Context["context"]
        Value["value"]
        Linear["linear"]
        Coordinate["coordinate"]
        Geometry2D["geometry-2d"]
        Geometry3D["geometry-3d"]
        Query["query"]
        Approximation["approximation"]

        Context --> Value
        Value --> Linear
        Linear --> Coordinate
        Coordinate --> Geometry2D
        Coordinate --> Geometry3D
        Geometry2D --> Query
        Geometry3D --> Query
        Query --> Approximation
    end

    App --> Math
```

## 模块和类

### context

- `GeometryContext`
- `Tolerance`
- `UnitSystem`

### value

- `Scalar`
- `Angle`
- `Interval`
- `GeometryResult`

### linear

- `Vec2`
- `Vec3`
- `Vec4`
- `Matrix3`
- `Matrix4`
- `Quaternion`

### coordinate

- `Coord2`
- `Coord3`

### geometry-2d

- `Line2`
- `Circle2`
- `BBox2`
- `Curve2`
- `BoundedCurve2`
- `LineSegment2`
- `Arc2`
- `Ellipse2`
- `Polyline2`
- `Polygon2`
- `Bezier2`
- `BSpline2`
- `Nurbs2`
- `ParameterDomain`
- `CurveParameter`

### geometry-3d

- `Ray3`
- `Line3`
- `LineSegment3`
- `Plane3`
- `Triangle3`
- `Sphere3`
- `BBox3`
- `OBB3`

### query

- `Projection`
- `Intersection`
- `Measurement`
- `Distance`
- `Containment`
- `Classification`
- `Construction`
- `ProjectionResult`
- `IntersectionResult`
- `ClosestPointResult`
- `MeasurementResult`
- `ClassificationResult`

### approximation

- `CurveSampler`：按参数或精度采样曲线点。
- `PolylineApproximation`：把曲线近似为折线。
- `BoundsApproximation`：计算曲线或近似几何的包围盒。
