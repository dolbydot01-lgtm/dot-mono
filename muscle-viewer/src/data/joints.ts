import type { JointInfo, JointType, Localized, MotionPlane } from './types';

export const JOINT_TYPE_NAMES: Record<JointType, Localized> = {
  ball: { zh: '球窝关节', en: 'Ball-and-socket' },
  hinge: { zh: '屈戌（铰链）关节', en: 'Hinge' },
  pivot: { zh: '车轴关节', en: 'Pivot' },
  condyloid: { zh: '椭圆（髁状）关节', en: 'Condyloid' },
  saddle: { zh: '鞍状关节', en: 'Saddle' },
  plane: { zh: '平面关节', en: 'Plane' },
  functional: { zh: '功能性关节', en: 'Functional joint' },
  cartilaginous: { zh: '软骨连结（椎间盘）', en: 'Cartilaginous (discs)' },
};

export const JOINT_TYPE_COLORS: Record<JointType, string> = {
  ball: '#4fc3f7',
  hinge: '#ffb74d',
  pivot: '#ba68c8',
  condyloid: '#81c784',
  saddle: '#f06292',
  plane: '#90a4ae',
  functional: '#fff176',
  cartilaginous: '#a1887f',
};

export const PLANE_NAMES: Record<MotionPlane, Localized> = {
  sagittal: { zh: '矢状面', en: 'Sagittal' },
  frontal: { zh: '冠状面', en: 'Frontal' },
  transverse: { zh: '水平面', en: 'Transverse' },
};

export const PLANE_COLORS: Record<MotionPlane, string> = {
  sagittal: '#ff6b6b',
  frontal: '#51cf66',
  transverse: '#4dabf7',
};

export const JOINTS: JointInfo[] = [
  {
    id: 'neck',
    name: { zh: '颈椎', en: 'Cervical spine (neck)' },
    type: 'pivot',
    summary: {
      zh: '7节颈椎组成的关节链。寰枕关节负责"点头"，寰枢关节（车轴关节）贡献约一半的转头幅度。',
      en: 'A chain of 7 cervical vertebrae. The atlanto-occipital joint gives the "yes" nod, the atlanto-axial pivot provides ~half of head rotation.',
    },
    dofs: [
      { plane: 'sagittal', movement: { zh: '屈 / 伸（低头、仰头）', en: 'Flexion / extension' }, rangeText: { zh: '屈 50° / 伸 60°', en: 'Flex 50° / Ext 60°' }, range: [-60, 50], ref: 'up' },
      { plane: 'frontal', movement: { zh: '左右侧屈', en: 'Lateral flexion' }, rangeText: { zh: '各约 45°', en: '~45° each side' }, range: [-45, 45], ref: 'up' },
      { plane: 'transverse', movement: { zh: '左右旋转', en: 'Rotation' }, rangeText: { zh: '各约 80°', en: '~80° each side' }, range: [-80, 80], ref: 'front' },
    ],
    notes: [
      { zh: '整体看作3个自由度，但由多个椎间关节共同完成。', en: 'Treated as 3 DOF overall, but distributed across many segments.' },
      { zh: '头前伸姿势会让上颈段过伸、下颈段过屈。', en: 'Forward-head posture hyper-extends the upper and flexes the lower neck.' },
    ],
  },
  {
    id: 'sternoclavicular',
    name: { zh: '胸锁关节', en: 'Sternoclavicular joint' },
    type: 'saddle',
    summary: {
      zh: '锁骨与胸骨相接的鞍状关节，是整个上肢与躯干唯一的骨性连接。',
      en: 'The saddle joint between clavicle and sternum — the only bony link between the whole arm and the trunk.',
    },
    dofs: [
      { plane: 'frontal', movement: { zh: '上提 / 下降', en: 'Elevation / depression' }, rangeText: { zh: '上提 45° / 下降 10°', en: 'Elev 45° / Dep 10°' }, range: [-10, 45], ref: 'lateral' },
      { plane: 'transverse', movement: { zh: '前伸 / 后缩', en: 'Protraction / retraction' }, rangeText: { zh: '各约 15–30°', en: '~15–30° each' }, range: [-25, 25], ref: 'lateral' },
      { plane: 'sagittal', movement: { zh: '锁骨轴向旋转', en: 'Axial (posterior) rotation' }, rangeText: { zh: '后旋约 50°', en: '~50° posterior' }, range: [0, 50], ref: 'up' },
    ],
    notes: [
      { zh: '手臂上举超过90°时，锁骨必须向后旋转。', en: 'Raising the arm above 90° requires posterior clavicular rotation.' },
    ],
  },
  {
    id: 'scapulothoracic',
    name: { zh: '肩胛胸壁关节', en: 'Scapulothoracic joint' },
    type: 'functional',
    summary: {
      zh: '肩胛骨在胸廓上滑动形成的"功能性关节"，没有关节囊，但贡献了约1/3的手臂上举幅度（肩肱节律 2:1）。',
      en: 'A "functional" joint where the scapula glides over the ribs. No capsule, yet it supplies about one-third of arm elevation (2:1 scapulohumeral rhythm).',
    },
    dofs: [
      { plane: 'frontal', movement: { zh: '上回旋 / 下回旋', en: 'Upward / downward rotation' }, rangeText: { zh: '上回旋约 60°', en: '~60° upward' }, range: [-10, 60], ref: 'down' },
      { plane: 'frontal', movement: { zh: '上提 / 下沉（滑动）', en: 'Elevation / depression (glide)' }, rangeText: { zh: '约 10–12 cm', en: '~10–12 cm' }, range: [-15, 25], ref: 'up' },
      { plane: 'transverse', movement: { zh: '前伸 / 后缩（滑动）', en: 'Protraction / retraction (glide)' }, rangeText: { zh: '约 15 cm', en: '~15 cm' }, range: [-30, 30], ref: 'front' },
    ],
    notes: [
      { zh: '前锯肌与斜方肌组成"力偶"共同完成上回旋。', en: 'Serratus anterior and trapezius form a force couple for upward rotation.' },
    ],
  },
  {
    id: 'shoulder',
    name: { zh: '肩关节（盂肱关节）', en: 'Shoulder (glenohumeral)' },
    type: 'ball',
    summary: {
      zh: '人体活动度最大的关节：大大的肱骨头配浅浅的关节盂，"高尔夫球放在球座上"，灵活但不稳定，依赖肩袖动态稳定。',
      en: 'The most mobile joint in the body: a large humeral head on a shallow glenoid — "a golf ball on a tee". Mobile but unstable, relying on the rotator cuff.',
    },
    dofs: [
      { plane: 'sagittal', movement: { zh: '前屈 / 后伸', en: 'Flexion / extension' }, rangeText: { zh: '屈 180° / 伸 60°', en: 'Flex 180° / Ext 60°' }, range: [-180, 60], ref: 'down' },
      { plane: 'frontal', movement: { zh: '外展 / 内收', en: 'Abduction / adduction' }, rangeText: { zh: '外展 180° / 内收 30°', en: 'Abd 180° / Add 30°' }, range: [-30, 180], ref: 'down' },
      { plane: 'transverse', movement: { zh: '内旋 / 外旋', en: 'Internal / external rotation' }, rangeText: { zh: '内旋 70° / 外旋 90°', en: 'IR 70° / ER 90°' }, range: [-70, 90], ref: 'front' },
    ],
    notes: [
      { zh: '标准3自由度关节；水平内收/外展是屈伸与外展的组合。', en: 'A classic 3-DOF joint; horizontal ab/adduction combines these axes.' },
      { zh: '180°上举中约120°来自盂肱关节，60°来自肩胛骨。', en: 'Of 180° elevation, ~120° comes from the glenohumeral joint and ~60° from the scapula.' },
    ],
  },
  {
    id: 'elbow',
    name: { zh: '肘关节（肱尺关节）', en: 'Elbow (humeroulnar)' },
    type: 'hinge',
    summary: {
      zh: '典型的铰链关节，只能在一个平面内屈伸——1个自由度。骨性结构紧密，非常稳定。',
      en: 'A textbook hinge: flexion and extension in one plane — 1 DOF. The bony fit makes it very stable.',
    },
    dofs: [
      { plane: 'sagittal', movement: { zh: '屈 / 伸', en: 'Flexion / extension' }, rangeText: { zh: '屈 145° / 伸 0°（可过伸5–10°）', en: 'Flex 145° / Ext 0° (5–10° hyperextension possible)' }, range: [-145, 5], ref: 'down' },
    ],
    notes: [
      { zh: '前臂的旋前/旋后发生在桡尺关节，不属于肱尺关节。', en: 'Forearm rotation happens at the radioulnar joints, not the humeroulnar hinge.' },
    ],
  },
  {
    id: 'radioulnar',
    name: { zh: '桡尺关节', en: 'Radioulnar joints' },
    type: 'pivot',
    summary: {
      zh: '近端与远端桡尺关节组成的车轴关节，桡骨绕尺骨旋转，实现掌心朝上/朝下。',
      en: 'Proximal and distal radioulnar pivot joints: the radius rolls around the ulna to turn the palm up or down.',
    },
    dofs: [
      { plane: 'transverse', movement: { zh: '旋前 / 旋后', en: 'Pronation / supination' }, rangeText: { zh: '旋前 80° / 旋后 90°（中立位起算）', en: 'Pron 80° / Sup 90° (from neutral)' }, range: [-170, 0], ref: 'front' },
    ],
    notes: [
      { zh: '解剖学姿势（掌心向前）即完全旋后位。', en: 'Anatomical position (palms forward) is full supination.' },
    ],
  },
  {
    id: 'wrist',
    name: { zh: '腕关节（桡腕关节）', en: 'Wrist (radiocarpal)' },
    type: 'condyloid',
    summary: {
      zh: '椭圆形关节面构成的髁状关节，可在两个平面活动——2个自由度，但不能独立旋转。',
      en: 'An ellipsoid (condyloid) joint moving in two planes — 2 DOF — but it cannot rotate on its own.',
    },
    dofs: [
      { plane: 'sagittal', movement: { zh: '掌屈 / 背伸', en: 'Flexion / extension' }, rangeText: { zh: '屈 80° / 伸 70°', en: 'Flex 80° / Ext 70°' }, range: [-80, 70], ref: 'down' },
      { plane: 'frontal', movement: { zh: '桡偏 / 尺偏', en: 'Radial / ulnar deviation' }, rangeText: { zh: '桡偏 20° / 尺偏 35°', en: 'Radial 20° / Ulnar 35°' }, range: [-35, 20], ref: 'down' },
    ],
    notes: [
      { zh: '两个自由度组合可实现"环转"（画圈）。', en: 'Combining the 2 DOF produces circumduction.' },
    ],
  },
  {
    id: 'spine',
    name: { zh: '胸腰椎（躯干）', en: 'Thoracolumbar spine (trunk)' },
    type: 'cartilaginous',
    summary: {
      zh: '由椎间盘（软骨连结）和小关节（平面关节）组成。每节活动很小，但累加后躯干具有3个自由度。胸椎偏旋转，腰椎偏屈伸。',
      en: 'Intervertebral discs (cartilaginous) plus facet joints (plane). Each segment moves little, but summed the trunk has 3 DOF. Thoracic spine favours rotation; lumbar favours flexion/extension.',
    },
    dofs: [
      { plane: 'sagittal', movement: { zh: '前屈 / 后伸', en: 'Flexion / extension' }, rangeText: { zh: '屈 80° / 伸 25°', en: 'Flex 80° / Ext 25°' }, range: [-25, 80], ref: 'up' },
      { plane: 'frontal', movement: { zh: '左右侧屈', en: 'Lateral flexion' }, rangeText: { zh: '各约 35°', en: '~35° each side' }, range: [-35, 35], ref: 'up' },
      { plane: 'transverse', movement: { zh: '左右旋转', en: 'Rotation' }, rangeText: { zh: '各约 40°（主要来自胸椎）', en: '~40° each (mostly thoracic)' }, range: [-40, 40], ref: 'front' },
    ],
    notes: [
      { zh: '腰椎每节旋转仅约1–2°，旋转主要应由胸椎和髋完成。', en: 'Each lumbar segment rotates only ~1–2°; rotation should come from thoracic spine and hips.' },
    ],
  },
  {
    id: 'hip',
    name: { zh: '髋关节', en: 'Hip joint' },
    type: 'ball',
    summary: {
      zh: '深髋臼包裹股骨头的球窝关节，3个自由度。与肩相比更稳定、负重能力更强，但活动范围较小。',
      en: 'A ball-and-socket joint with a deep acetabulum around the femoral head — 3 DOF. More stable and load-bearing than the shoulder, but less mobile.',
    },
    dofs: [
      { plane: 'sagittal', movement: { zh: '屈 / 伸', en: 'Flexion / extension' }, rangeText: { zh: '屈 120° / 伸 20°', en: 'Flex 120° / Ext 20°' }, range: [-120, 20], ref: 'down' },
      { plane: 'frontal', movement: { zh: '外展 / 内收', en: 'Abduction / adduction' }, rangeText: { zh: '外展 45° / 内收 30°', en: 'Abd 45° / Add 30°' }, range: [-30, 45], ref: 'down' },
      { plane: 'transverse', movement: { zh: '内旋 / 外旋', en: 'Internal / external rotation' }, rangeText: { zh: '内旋 40° / 外旋 45°', en: 'IR 40° / ER 45°' }, range: [-40, 45], ref: 'front' },
    ],
    notes: [
      { zh: '髋活动度不足时，腰椎常被迫代偿。', en: 'When hip mobility is lacking, the lumbar spine tends to compensate.' },
    ],
  },
  {
    id: 'knee',
    name: { zh: '膝关节', en: 'Knee joint' },
    type: 'hinge',
    summary: {
      zh: '人体最大的关节，"改良型铰链关节"：主要屈伸（1个自由度），屈膝时可有少量旋转。依赖韧带与半月板稳定。',
      en: 'The largest joint — a "modified hinge": mainly flexion/extension (1 DOF), with some rotation when bent. Relies on ligaments and menisci for stability.',
    },
    dofs: [
      { plane: 'sagittal', movement: { zh: '屈 / 伸', en: 'Flexion / extension' }, rangeText: { zh: '屈 140° / 伸 0°', en: 'Flex 140° / Ext 0°' }, range: [0, 140], ref: 'down' },
      { plane: 'transverse', movement: { zh: '屈膝位内外旋（附属）', en: 'Rotation when flexed (accessory)' }, rangeText: { zh: '约 内旋 10° / 外旋 30°', en: '~IR 10° / ER 30°' }, range: [-10, 30], ref: 'front' },
    ],
    notes: [
      { zh: '伸直末端胫骨外旋"锁扣"（screw-home 机制）。', en: 'At full extension the tibia rotates outward to "lock" (screw-home mechanism).' },
      { zh: '膝在训练中更需要稳定性——避免动态内扣。', en: 'In training the knee needs stability — avoid dynamic valgus.' },
    ],
  },
  {
    id: 'ankle',
    name: { zh: '踝关节复合体', en: 'Ankle complex' },
    type: 'hinge',
    summary: {
      zh: '距小腿关节（铰链，负责勾脚/绷脚）与距下关节（负责内外翻）共同组成，合计约2个自由度。',
      en: 'The talocrural hinge (dorsi/plantarflexion) plus the subtalar joint (inversion/eversion) — about 2 DOF together.',
    },
    dofs: [
      { plane: 'sagittal', movement: { zh: '背屈 / 跖屈', en: 'Dorsiflexion / plantarflexion' }, rangeText: { zh: '背屈 20° / 跖屈 50°', en: 'DF 20° / PF 50°' }, range: [-20, 50], ref: 'front' },
      { plane: 'frontal', movement: { zh: '内翻 / 外翻（距下关节）', en: 'Inversion / eversion (subtalar)' }, rangeText: { zh: '内翻 35° / 外翻 15°', en: 'Inv 35° / Ev 15°' }, range: [-35, 15], ref: 'down' },
    ],
    notes: [
      { zh: '踝背屈不足会限制深蹲深度并导致膝内扣。', en: 'Limited dorsiflexion restricts squat depth and encourages knee valgus.' },
    ],
  },
];

export const JOINT_MAP: Record<string, JointInfo> = Object.fromEntries(
  JOINTS.map((j) => [j.id, j]),
);
