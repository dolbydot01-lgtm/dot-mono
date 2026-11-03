import type { Localized, RegionId } from './types';

export const REGIONS: { id: RegionId; name: Localized }[] = [
  { id: 'neck', name: { zh: '颈部', en: 'Neck' } },
  { id: 'shoulder', name: { zh: '肩部', en: 'Shoulder' } },
  { id: 'chest', name: { zh: '胸部', en: 'Chest' } },
  { id: 'back', name: { zh: '背部', en: 'Back' } },
  { id: 'arm', name: { zh: '手臂', en: 'Arm' } },
  { id: 'core', name: { zh: '核心', en: 'Core' } },
  { id: 'hip', name: { zh: '髋部', en: 'Hip' } },
  { id: 'thigh', name: { zh: '大腿', en: 'Thigh' } },
  { id: 'leg', name: { zh: '小腿', en: 'Lower leg' } },
];
