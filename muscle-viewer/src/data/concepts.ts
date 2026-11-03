import type { Concept } from './types';

export const CONCEPTS: Concept[] = [
  {
    id: 'dof',
    icon: '🧭',
    title: { zh: '关节自由度（DOF）', en: 'Degrees of freedom (DOF)' },
    summary: {
      zh: '一个关节能够独立运动的方向数量。1个自由度只能在一个平面内转动，3个自由度则可在三个平面内转动。',
      en: 'The number of independent ways a joint can move. 1 DOF rotates in a single plane; 3 DOF rotates in all three planes.',
    },
    body: [
      {
        zh: '在运动学中，每个可独立变化的角度就是一个自由度。人体大部分关节的自由度在 1–3 之间，关节的骨性形状、韧带和关节囊共同决定了它有几个自由度。',
        en: 'In kinematics, each independently variable angle is one degree of freedom. Most human joints have 1–3 rotational DOF, determined by bone shape, ligaments and capsule.',
      },
      {
        zh: '在 3D 视图中选择任一关节，彩色圆环代表它的每个自由度：红色＝矢状面，绿色＝冠状面，蓝色＝水平面，圆环上移动的小球演示活动范围。',
        en: 'Select any joint in the 3D view: each coloured ring is one DOF — red = sagittal, green = frontal, blue = transverse — and the moving dot sweeps the range of motion.',
      },
    ],
    points: [
      { term: { zh: '1 个自由度', en: '1 DOF' }, text: { zh: '肘关节、膝关节（铰链）；桡尺关节（车轴）', en: 'Elbow, knee (hinge); radioulnar (pivot)' } },
      { term: { zh: '2 个自由度', en: '2 DOF' }, text: { zh: '腕关节（髁状）、踝关节复合体、拇指腕掌关节（鞍状）', en: 'Wrist (condyloid), ankle complex, thumb CMC (saddle)' } },
      { term: { zh: '3 个自由度', en: '3 DOF' }, text: { zh: '肩关节、髋关节（球窝）', en: 'Shoulder, hip (ball-and-socket)' } },
      { term: { zh: '冗余自由度', en: 'Redundancy' }, text: { zh: '整条手臂约有7个自由度，比定位手所需的6个多，因此同一位置可用多种姿势到达。', en: 'The whole arm has ~7 DOF — more than the 6 needed to place the hand — so one hand position can be reached many ways.' } },
    ],
    related: { joints: ['shoulder', 'elbow', 'wrist', 'hip', 'knee'], layers: { joints: true } },
  },
  {
    id: 'planes',
    icon: '📐',
    title: { zh: '运动平面与运动轴', en: 'Planes and axes of motion' },
    summary: {
      zh: '用三个互相垂直的平面描述人体运动：矢状面（前后）、冠状面（左右）、水平面（旋转）。',
      en: 'Three perpendicular planes describe human movement: sagittal (forward/back), frontal (side to side), transverse (rotation).',
    },
    body: [
      {
        zh: '每个运动平面都有一条与之垂直的运动轴，关节绕这条轴转动。训练计划应覆盖三个平面，而不只是最常见的矢状面。',
        en: 'Each plane has an axis perpendicular to it around which the joint rotates. A balanced programme trains all three planes, not just the familiar sagittal one.',
      },
    ],
    points: [
      { term: { zh: '矢状面 · 左右轴', en: 'Sagittal · mediolateral axis' }, text: { zh: '屈 / 伸。例：深蹲、弯举、跑步', en: 'Flexion / extension. e.g. squat, curl, running' } },
      { term: { zh: '冠状面 · 前后轴', en: 'Frontal · anteroposterior axis' }, text: { zh: '外展 / 内收、侧屈。例：侧平举、侧弓步', en: 'Abduction / adduction, side-bending. e.g. lateral raise, lateral lunge' } },
      { term: { zh: '水平面 · 垂直轴', en: 'Transverse · vertical axis' }, text: { zh: '内旋 / 外旋、躯干旋转。例：伐木、投掷', en: 'Internal / external rotation, trunk rotation. e.g. woodchop, throwing' } },
    ],
    related: { joints: ['hip', 'spine'], layers: { joints: true } },
  },
  {
    id: 'joint-types',
    icon: '🦴',
    title: { zh: '关节的分类', en: 'Types of joints' },
    summary: {
      zh: '按结构可分为纤维连结、软骨连结和滑膜关节；滑膜关节又按关节面形状分为六种。',
      en: 'Structurally joints are fibrous, cartilaginous or synovial; synovial joints are further divided into six shapes.',
    },
    body: [
      {
        zh: '关节面形状决定自由度：球面可向任何方向转，圆柱面只能绕一条轴转。3D 视图中关节球的颜色对应其类型。',
        en: 'Surface shape dictates DOF: a sphere turns any way, a cylinder only about one axis. Joint markers in the 3D view are coloured by type.',
      },
    ],
    points: [
      { term: { zh: '球窝关节', en: 'Ball-and-socket' }, text: { zh: '肩、髋 — 3 自由度', en: 'Shoulder, hip — 3 DOF' } },
      { term: { zh: '屈戌（铰链）关节', en: 'Hinge' }, text: { zh: '肘、膝、指间 — 1 自由度', en: 'Elbow, knee, finger joints — 1 DOF' } },
      { term: { zh: '车轴关节', en: 'Pivot' }, text: { zh: '寰枢关节、桡尺关节 — 1 自由度（旋转）', en: 'Atlanto-axial, radioulnar — 1 DOF (rotation)' } },
      { term: { zh: '椭圆（髁状）关节', en: 'Condyloid' }, text: { zh: '桡腕关节、掌指关节 — 2 自由度', en: 'Wrist, knuckles — 2 DOF' } },
      { term: { zh: '鞍状关节', en: 'Saddle' }, text: { zh: '拇指腕掌关节、胸锁关节 — 2–3 自由度', en: 'Thumb CMC, sternoclavicular — 2–3 DOF' } },
      { term: { zh: '平面关节', en: 'Plane' }, text: { zh: '腕骨间、椎骨小关节 — 滑动', en: 'Intercarpal, facet joints — gliding' } },
    ],
    related: { joints: ['shoulder', 'elbow', 'radioulnar', 'wrist', 'sternoclavicular'], layers: { joints: true, skeleton: true } },
  },
  {
    id: 'mobility-stability',
    icon: '⚖️',
    title: { zh: '灵活性与稳定性交替', en: 'Joint-by-joint approach' },
    summary: {
      zh: '训练学中的经典模型：人体关节自下而上大致在"需要灵活"与"需要稳定"之间交替。',
      en: 'A classic training model: from the ground up, joints roughly alternate between needing mobility and needing stability.',
    },
    body: [
      {
        zh: '当一个本应灵活的关节受限（如髋、胸椎），相邻本应稳定的关节（如腰椎、膝）往往会被迫代偿，长期可能引发疼痛。',
        en: 'When a joint that should be mobile (hip, thoracic spine) gets stiff, a neighbouring joint meant to be stable (lumbar spine, knee) compensates — a common path to pain.',
      },
    ],
    points: [
      { term: { zh: '踝 — 灵活', en: 'Ankle — mobility' }, text: { zh: '尤其是背屈', en: 'Especially dorsiflexion' } },
      { term: { zh: '膝 — 稳定', en: 'Knee — stability' }, text: { zh: '控制内扣', en: 'Control valgus' } },
      { term: { zh: '髋 — 灵活', en: 'Hip — mobility' }, text: { zh: '三平面活动', en: 'Three-plane range' } },
      { term: { zh: '腰椎 — 稳定', en: 'Lumbar — stability' }, text: { zh: '深层核心负责', en: 'The deep core’s job' } },
      { term: { zh: '胸椎 — 灵活', en: 'Thoracic — mobility' }, text: { zh: '旋转与伸展', en: 'Rotation and extension' } },
      { term: { zh: '肩胛 — 稳定 / 肩 — 灵活', en: 'Scapula — stability / Shoulder — mobility' }, text: { zh: '稳定的肩胛是肩部灵活的基座', en: 'A stable scapula is the base for a mobile shoulder' } },
    ],
    related: { joints: ['ankle', 'knee', 'hip', 'spine', 'scapulothoracic', 'shoulder'], layers: { joints: true } },
  },
  {
    id: 'muscle-layers',
    icon: '🧅',
    title: { zh: '浅层肌与深层肌', en: 'Superficial vs deep muscles' },
    summary: {
      zh: '浅层肌多为跨越多关节、产生大幅动作的"动力肌"；深层肌靠近骨骼和关节，负责节段稳定的"稳定肌"。',
      en: 'Superficial muscles tend to be multi-joint "movers" producing large motions; deep muscles sit close to bones and joints as segmental "stabilisers".',
    },
    body: [
      {
        zh: '深层稳定肌通常力臂短、慢肌比例高、在动作开始前预先激活（前馈），疼痛或久坐后容易"休眠"，需要低负荷、注重控制的训练来唤醒。',
        en: 'Deep stabilisers have short levers, more slow-twitch fibres and fire before movement (feed-forward). After pain or inactivity they "switch off" and respond best to low-load, control-focused work.',
      },
      {
        zh: '在图层面板中降低"浅层肌透明度"或关闭浅层，即可看到肩袖、多裂肌、腹横肌、髂腰肌等深层肌肉。',
        en: 'Lower the superficial opacity or hide that layer in the layer panel to reveal the rotator cuff, multifidus, transversus abdominis, iliopsoas and more.',
      },
    ],
    points: [
      { term: { zh: '浅层 / 整体动力肌', en: 'Superficial / global movers' }, text: { zh: '三角肌、胸大肌、背阔肌、腹直肌、臀大肌', en: 'Deltoid, pec major, lats, rectus abdominis, glute max' } },
      { term: { zh: '深层 / 局部稳定肌', en: 'Deep / local stabilisers' }, text: { zh: '肩袖、多裂肌、腹横肌、颈深屈肌、髋深层外旋肌', en: 'Rotator cuff, multifidus, transversus, deep neck flexors, deep hip rotators' } },
    ],
    related: {
      muscles: ['rotator-cuff', 'multifidus', 'transversus-abdominis', 'deep-neck-flexors', 'deep-hip-rotators'],
      layers: { deep: true, superficial: false },
    },
  },
  {
    id: 'deep-core',
    icon: '🫁',
    title: { zh: '深层核心（内核心）', en: 'The deep core (inner unit)' },
    summary: {
      zh: '膈肌（顶）、盆底肌（底）、腹横肌（前侧壁）、多裂肌（后壁）围成一个"压力圆柱"，稳定腰椎与骨盆。',
      en: 'The diaphragm (roof), pelvic floor (base), transversus abdominis (walls) and multifidus (back) form a pressurised cylinder that stabilises spine and pelvis.',
    },
    body: [
      {
        zh: '吸气时膈肌下降、盆底随之下沉，腹壁在腹横肌控制下维持张力，腹内压升高，就像给脊柱打了"气垫"。这就是正确"核心收紧（bracing）"的基础。',
        en: 'On inhalation the diaphragm and pelvic floor descend while the transversus keeps tension, raising intra-abdominal pressure — an air cushion for the spine. This is the basis of proper bracing.',
      },
    ],
    points: [
      { term: { zh: '顶 — 膈肌', en: 'Roof — diaphragm' }, text: { zh: '呼吸与压力的发动机', en: 'The engine of breath and pressure' } },
      { term: { zh: '底 — 盆底肌', en: 'Floor — pelvic floor' }, text: { zh: '与膈肌同步升降', en: 'Moves in sync with the diaphragm' } },
      { term: { zh: '前侧 — 腹横肌', en: 'Front/sides — transversus' }, text: { zh: '天然护腰带', en: 'The natural weight belt' } },
      { term: { zh: '后 — 多裂肌', en: 'Back — multifidus' }, text: { zh: '节段稳定', en: 'Segmental control' } },
    ],
    related: {
      muscles: ['diaphragm', 'pelvic-floor', 'transversus-abdominis', 'multifidus'],
      layers: { deep: true, superficial: false, skeleton: true },
    },
  },
  {
    id: 'muscle-roles',
    icon: '🤝',
    title: { zh: '主动肌、拮抗肌、协同肌', en: 'Agonist, antagonist, synergist' },
    summary: {
      zh: '一个动作由多块肌肉分工完成：主动肌发力，拮抗肌对抗与控制，协同肌辅助，稳定肌固定。',
      en: 'Every movement is a team effort: the agonist drives it, the antagonist opposes and controls it, synergists assist and stabilisers hold steady.',
    },
    body: [
      {
        zh: '以哑铃弯举为例：肱二头肌是主动肌，肱三头肌是拮抗肌，肱肌和肱桡肌是协同肌，肩袖和三角肌负责稳定肩关节。',
        en: 'In a dumbbell curl the biceps is the agonist, the triceps the antagonist, brachialis and brachioradialis are synergists, and the rotator cuff and deltoid stabilise the shoulder.',
      },
    ],
    points: [
      { term: { zh: '主动肌', en: 'Agonist' }, text: { zh: '产生动作的主要肌肉', en: 'Main muscle producing the movement' } },
      { term: { zh: '拮抗肌', en: 'Antagonist' }, text: { zh: '做相反动作，放松以允许运动或离心刹车', en: 'Does the opposite action; relaxes to allow motion or brakes it' } },
      { term: { zh: '协同肌', en: 'Synergist' }, text: { zh: '辅助主动肌或抵消多余动作', en: 'Assists the agonist or neutralises unwanted motion' } },
      { term: { zh: '稳定肌', en: 'Stabiliser' }, text: { zh: '固定近端，提供发力基座', en: 'Fixes the proximal segment as a base' } },
    ],
    related: { muscles: ['biceps-brachii', 'triceps-brachii', 'brachialis', 'forearm-extensors'], joints: ['elbow'] },
  },
  {
    id: 'contraction',
    icon: '🔁',
    title: { zh: '肌肉收缩类型', en: 'Types of muscle contraction' },
    summary: {
      zh: '向心收缩（缩短发力）、离心收缩（拉长中发力）、等长收缩（长度不变发力）。',
      en: 'Concentric (shortening), eccentric (lengthening under load) and isometric (no length change).',
    },
    body: [
      {
        zh: '离心收缩能承受比向心更大的负荷，也更容易引起延迟性酸痛，但对肌腱健康和预防拉伤非常有效（如北欧挺之于腘绳肌）。',
        en: 'Eccentric contractions handle more load than concentric ones and cause more soreness, but are very effective for tendon health and strain prevention (e.g. Nordic curls for the hamstrings).',
      },
    ],
    points: [
      { term: { zh: '向心', en: 'Concentric' }, text: { zh: '深蹲站起时的股四头肌', en: 'Quads while standing up from a squat' } },
      { term: { zh: '离心', en: 'Eccentric' }, text: { zh: '深蹲下蹲时的股四头肌', en: 'Quads while lowering into a squat' } },
      { term: { zh: '等长', en: 'Isometric' }, text: { zh: '平板支撑中的腹肌', en: 'Abdominals in a plank' } },
    ],
    related: { muscles: ['quadriceps', 'hamstrings', 'rectus-abdominis'], joints: ['knee'] },
  },
  {
    id: 'origin-insertion',
    icon: '📍',
    title: { zh: '起点、止点与杠杆', en: 'Origin, insertion and levers' },
    summary: {
      zh: '肌肉通常从相对固定的起点（近端）拉向活动的止点（远端），跨过的关节就是它能够移动的关节。',
      en: 'A muscle usually pulls from a relatively fixed origin (proximal) toward a moving insertion (distal); the joints it crosses are the joints it can move.',
    },
    body: [
      {
        zh: '跨越两个关节的"双关节肌"（如股直肌、腘绳肌、腓肠肌、肱二头肌）的发力与长度受两个关节姿势共同影响。例如屈膝时腓肠肌变短，坐姿提踵便主要依靠比目鱼肌。',
        en: 'Two-joint muscles (rectus femoris, hamstrings, gastrocnemius, biceps) depend on the position of both joints. With the knee bent the gastrocnemius is slack, so seated calf raises rely on the soleus.',
      },
    ],
    points: [
      { term: { zh: '起点', en: 'Origin' }, text: { zh: '通常更靠近躯干、更固定', en: 'Usually closer to the trunk and more fixed' } },
      { term: { zh: '止点', en: 'Insertion' }, text: { zh: '通常更远端、随动作移动', en: 'Usually more distal and moving' } },
      { term: { zh: '双关节肌', en: 'Two-joint muscle' }, text: { zh: '跨越两个关节，存在"主动不足"和"被动不足"', en: 'Crosses two joints; subject to active and passive insufficiency' } },
    ],
    related: { muscles: ['gastrocnemius', 'soleus', 'biceps-brachii', 'hamstrings'], joints: ['knee', 'ankle'] },
  },
];
