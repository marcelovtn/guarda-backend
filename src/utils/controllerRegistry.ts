export type MountedController = [basePath: string, controller: any]

const mountedControllers: MountedController[] = []

export function registerMountedController(base: string, controller: any) {
  mountedControllers.push([base, controller])
}

export function resolveMountedController(pathname: string): MountedController | undefined {
  return mountedControllers.find(([base]) => pathname === base || pathname.startsWith(base + '/'))
}

export function listMountedControllers(): MountedController[] {
  return mountedControllers.slice()
}
