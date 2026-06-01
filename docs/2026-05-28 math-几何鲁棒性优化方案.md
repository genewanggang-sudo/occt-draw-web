# Math 几何鲁棒性优化方案

本文聚焦 `packages/math` 中需要优先处理的几何正确性问题，用于后续复制给 Codex 执行。

## 背景

当前草图已实现中心点圆、3 点圆和椭圆。浏览器烟测主路径通过，但 `packages/math` 中仍有两个需要优先修正的底层问题：

- `Circle2.fromThreePoints(...)` 的三点构圆退化判断仍偏绝对容差，近共线和大坐标场景不够稳。
- `EllipticalArc2.bounds()` 仍按轴对齐椭圆弧处理，已经不适配当前支持旋转坐标系的 `Ellipse2`。

这两个问题属于几何内核能力，不应该放到 editor、request 或 UI 层规避。

## 参考依据

- OCCT 的椭圆采用局部坐标系加半径表达，局部原点是中心，局部 X/Y 方向分别定义椭圆两个轴向。
- Onshape 椭圆交互允许用户通过 primary axis 和 secondary axis 定义椭圆，两个轴谁更长取决于用户绘制结果。
- CGAL 和 Shewchuk 的几何谓词资料都强调 orientation / collinear 判断必须考虑数值鲁棒性；本项目当前不引入 exact predicate，但应避免固定绝对面积容差。

参考链接：

- https://dev.opencascade.org/doc/refman/html/classgp___elips.html
- https://cad.onshape.com/help/Content/Sketch/ellipse.htm
- https://cad.onshape.com/FsDoc/library.html
- https://doc.cgal.org/Manual/3.1/doc_html/cgal_manual/Kernel_23/Chapter_predicates_constructions.html
- https://www.cs.cmu.edu/~quake/robust.html

## 改动边界

### packages/math

修改文件：

- `packages/math/src/geometry-2d/circle2.ts`
- `packages/math/src/geometry-2d/ellipse2.ts`

改动内容：

- 优化 `Circle2.fromThreePoints(...)` 的局部坐标构造和近共线判断。
- 修复 `EllipticalArc2.bounds()` 对旋转椭圆弧的 bounds 计算。

不做的事：

- 不新增 package 依赖。
- 不引入 exact arithmetic 或第三方几何谓词库。
- 不修改 `Ellipse2` 的 `majorRadius/minorRadius` 命名。
- 不强制 `majorRadius >= minorRadius`。

### packages/sketch

相邻但不属于本文 math 范围的后续优化：

- `Ellipse2D` 构造时应把 `xAxis/yAxis` 规范化后再存入模型属性，保证 snapshot/model 与 math 实际几何一致。
- 该项涉及 `packages/sketch/src/geometry/geometry.ts`，应单独执行或在实施前明确纳入边界。

## 方案 1：优化三点圆构造

目标：让 `Circle2.fromThreePoints(first, second, third, tolerance?)` 在普通坐标、大坐标、近共线输入下都更稳定。

当前问题：

- 直接使用世界坐标平方公式，坐标值较大时更容易出现抵消误差。
- 使用 `Math.abs(denominator) <= tolerance` 判断近共线，但 `denominator` 是面积量纲，`tolerance` 是距离量纲，尺度不匹配。

建议实现：

```ts
const firstPoint = Vec2.from(first);
const secondPoint = Vec2.from(second);
const thirdPoint = Vec2.from(third);

const u = firstPoint.vectorTo(secondPoint);
const v = firstPoint.vectorTo(thirdPoint);
const w = secondPoint.vectorTo(thirdPoint);

const uLength = u.length();
const vLength = v.length();
const wLength = w.length();

if (uLength <= tolerance || vLength <= tolerance || wLength <= tolerance) {
    return null;
}

const cross = u.x * v.y - u.y * v.x;
const scale = Math.max(uLength, vLength, wLength);
const collinearTolerance = Math.max(tolerance * scale, Number.EPSILON * scale * scale * 16);

if (Math.abs(cross) <= collinearTolerance) {
    return null;
}

const denominator = 2 * cross;
const uLengthSquared = u.lengthSquared();
const vLengthSquared = v.lengthSquared();
const offset = Vec2.of(
    (v.y * uLengthSquared - u.y * vLengthSquared) / denominator,
    (u.x * vLengthSquared - v.x * uLengthSquared) / denominator,
);
const center = firstPoint.translated(offset);
const circle = new Circle2(center, center.distanceTo(firstPoint));

return circle.isValid() ? circle : null;
```

说明：

- 使用 `firstPoint` 作为局部原点，减少大坐标平方公式带来的抵消误差。
- `tolerance * scale` 表示“点到基准线距离接近 0”的距离容差语义。
- `Number.EPSILON * scale * scale * 16` 是浮点相对误差兜底，避免极大坐标下 determinant 误判。

## 方案 2：修复旋转椭圆弧 bounds

目标：让 `EllipticalArc2.bounds()` 对旋转椭圆弧返回正确的紧包围盒。

当前问题：

`EllipticalArc2.bounds()` 只检查以下角度：

- `0`
- `Math.PI / 2`
- `Math.PI`
- `(3 * Math.PI) / 2`

这些角度只适用于轴对齐椭圆。旋转椭圆的 x/y 极值角需要通过导数求解。

数学表达：

```txt
P(t) = C + a * X * cos(t) + b * Y * sin(t)
```

其中：

- `C` 是椭圆中心。
- `a` 是 `majorRadius`。
- `b` 是 `minorRadius`。
- `X` 是 `coord.xAxis`。
- `Y` 是 `coord.yAxis`。

x 分量：

```txt
px(t) = cx + a * X.x * cos(t) + b * Y.x * sin(t)
px'(t) = -a * X.x * sin(t) + b * Y.x * cos(t)
```

x 极值候选角：

```txt
t = atan2(b * Y.x, a * X.x)
t + PI
```

y 极值候选角：

```txt
t = atan2(b * Y.y, a * X.y)
t + PI
```

建议实现：

- 起点角、终点角始终加入候选角。
- 如果 sweep 覆盖整圈或超过整圈，直接返回 `ellipse.bounds()`。
- 计算 x/y 极值候选角。
- 使用现有 `isAngleInSweep(...)` 过滤落在弧段内的候选角。
- 用 `ellipse.pointAt(angle)` 转换为点，再通过 `BBox2.fromPoints(...)` 生成 bounds。

伪代码：

```ts
public override bounds(): GeometryResult<BBox2> {
    if (!this.isValid()) {
        return GeometryResult.empty();
    }

    if (Math.abs(this.endAngleRadians - this.startAngleRadians) >= Math.PI * 2) {
        return this.ellipse.bounds();
    }

    const angles = [this.startAngleRadians, this.endAngleRadians];

    for (const angle of this.extremaAngles()) {
        if (EllipticalArc2.isAngleInSweep(angle, this.startAngleRadians, this.endAngleRadians)) {
            angles.push(angle);
        }
    }

    const bounds = BBox2.fromPoints(angles.map((angle) => this.ellipse.pointAt(angle)));

    return bounds ? GeometryResult.success(bounds) : GeometryResult.empty();
}
```

极值角 helper：

```ts
private extremaAngles(): readonly number[] {
    const { coord, majorRadius, minorRadius } = this.ellipse;

    return [
        Math.atan2(minorRadius * coord.yAxis.x, majorRadius * coord.xAxis.x),
        Math.atan2(minorRadius * coord.yAxis.x, majorRadius * coord.xAxis.x) + Math.PI,
        Math.atan2(minorRadius * coord.yAxis.y, majorRadius * coord.xAxis.y),
        Math.atan2(minorRadius * coord.yAxis.y, majorRadius * coord.xAxis.y) + Math.PI,
    ];
}
```

注意：

- `atan2(0, 0)` 在 JavaScript 中返回 `0`，不会抛错；候选角可能重复，但重复点不会影响 bounds。
- 不要用采样近似 bounds，这会让后续选择、视图自适应、框选等能力依赖分段精度。

## 验收方式

不默认新增测试文件。建议使用临时脚本或 REPL 做几何验算，执行后删除临时文件。

必须验证：

- 正常三点可以生成圆。
- 三点近共线返回 `null`。
- 大坐标下正常三点构圆结果合理。
- 旋转完整椭圆的 `bounds()` 不回退。
- 旋转椭圆弧的 `bounds()` 能包住高密度采样点。
- `pnpm check` 通过。

如果本轮同时纳入 `packages/sketch` 的 `Ellipse2D` 轴规范化，还需要额外验证：

- 非单位 `xAxis/yAxis` 的 `Ellipse2D.fromSnapshot(...)` 重新 snapshot 后输出单位、正交轴。
- 椭圆绘制、选择整椭圆、删除、undo/redo 不受影响。
