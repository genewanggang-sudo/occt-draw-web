export type CloudClientModuleStatus = 'scaffold';

export interface CloudClientModuleManifest {
    readonly name: '@occt-draw/cloud-client';
    readonly status: CloudClientModuleStatus;
    readonly summary: string;
}

export const CLOUD_CLIENT_MODULE_MANIFEST: CloudClientModuleManifest = {
    name: '@occt-draw/cloud-client',
    status: 'scaffold',
    summary: '云端项目、文件、版本、权限、协同和任务状态的前端客户端包。',
};

export function getCloudClientModuleManifest(): CloudClientModuleManifest {
    return CLOUD_CLIENT_MODULE_MANIFEST;
}
