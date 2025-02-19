import { z } from 'zod'

export const BreadcrumbHandle = z.object({ breadcrumb: z.any() })
export type BreadcrumbHandle = z.infer<typeof BreadcrumbHandle>
export const BreadcrumbHandleMatch = z.object({ handle: BreadcrumbHandle })
