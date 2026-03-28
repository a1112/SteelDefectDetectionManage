/**
 * TraditionalMode Hooks
 *
 * 导出所有传统模式相关的自定义 hooks
 */

export { useTraditionalData } from './useTraditionalData';
export { useImageNavigation } from './useImageNavigation';
export { useAnnotation } from './useAnnotation';
export { useSystemStatus } from './useSystemStatus';

export type {
  TraditionalDataState,
  TraditionalDataActions,
} from './useTraditionalData';

export type {
  ImageNavigationState,
  ImageNavigationActions,
} from './useImageNavigation';

export type {
  AnnotationState,
  AnnotationActions,
} from './useAnnotation';

export type {
  SystemStatusState,
  SystemStatusActions,
} from './useSystemStatus';
