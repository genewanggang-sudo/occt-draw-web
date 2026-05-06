export interface Vector4 {
    readonly w: number;
    readonly x: number;
    readonly y: number;
    readonly z: number;
}

export class Vec4 implements Vector4 {
    public readonly w: number;
    public readonly x: number;
    public readonly y: number;
    public readonly z: number;

    constructor(x: number, y: number, z: number, w: number) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    public static from(value: Vector4): Vec4 {
        return new Vec4(value.x, value.y, value.z, value.w);
    }

    public static of(x: number, y: number, z: number, w: number): Vec4 {
        return new Vec4(x, y, z, w);
    }
}
