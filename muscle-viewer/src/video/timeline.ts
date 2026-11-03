import type { Localized } from '../data/types';

export type SceneId = 'intro' | 'movement' | 'levers' | 'muscles' | 'fibres' | 'sarcomere' | 'recap';

export interface Cue {
  /** Seconds from the start of the scene. */
  at: number;
  text: Localized;
}

export interface SceneDef {
  id: SceneId;
  start: number;
  duration: number;
  title: Localized;
  /** One-line summary for the chapter list. */
  summary: Localized;
  cues: Cue[];
}

const scenes: Omit<SceneDef, 'start'>[] = [
  {
    id: 'intro',
    duration: 5,
    title: { zh: '片头', en: 'Intro' },
    summary: { zh: '一次分腿蹲，从动作到分子', en: 'One rep, from movement to molecules' },
    cues: [{ at: 0.3, text: { zh: '保加利亚分腿蹲：一次下蹲，从动作一路放大到分子。', en: 'The Bulgarian split squat: one rep, zoomed from movement all the way down to molecules.' } }],
  },
  {
    id: 'movement',
    duration: 15,
    title: { zh: '① 动作', en: '① Movement' },
    summary: { zh: '姿势、节奏与关节角度', en: 'Set-up, tempo and joint angles' },
    cues: [
      { at: 0, text: { zh: '后脚搭在约膝高的凳子上，前脚向前一大步，大部分负荷落在前腿。', en: 'Rear foot on a knee-high bench, front foot a long stride ahead — most of the load sits on the front leg.' } },
      { at: 5, text: { zh: '下降（离心）约 2 秒：前侧髋、膝弯曲，踝关节背屈，躯干微微前倾。', en: 'Lowering (eccentric), about 2 s: the front hip and knee flex, the ankle dorsiflexes and the torso leans slightly.' } },
      { at: 10, text: { zh: '起身（向心）：前脚踩实地面，伸髋、伸膝，把身体推回顶部。', en: 'Rising (concentric): drive through the front foot, extending hip and knee back to the top.' } },
    ],
  },
  {
    id: 'levers',
    duration: 20,
    title: { zh: '② 骨骼与杠杆', en: '② Bones & levers' },
    summary: { zh: '地面反作用力、力臂与关节力矩', en: 'Ground force, moment arms and joint torque' },
    cues: [
      { at: 0, text: { zh: '去掉皮肤和肌肉，身体就是一套杠杆：骨骼是杠杆，关节是支点。', en: 'Strip away skin and muscle and the body is a set of levers: bones are the bars, joints the pivots.' } },
      { at: 5, text: { zh: '地面反作用力从前脚向上。它到膝、髋的垂直距离就是力臂——力臂越长，关节需要的肌肉力矩越大。', en: 'The ground pushes up through the front foot. Its perpendicular distance to knee and hip is the moment arm — the longer it is, the more muscle torque the joint needs.' } },
      { at: 11, text: { zh: '到了底部，膝盖前移、髋部后移，两个力臂同时达到最大：这是全程最吃力的位置。', en: 'At the bottom the knee moves forward and the hip back, so both moment arms peak — the hardest point of the rep.' } },
      { at: 16, text: { zh: '肌肉附着点离关节很近，力臂只有几厘米，所以股四头肌要产生数倍于体重的拉力。', en: 'Muscles attach only a few centimetres from the joint, so the quadriceps must pull with several times body weight.' } },
    ],
  },
  {
    id: 'muscles',
    duration: 20,
    title: { zh: '③ 肌肉伸缩', en: '③ Muscles' },
    summary: { zh: '主动肌、协同肌、稳定肌；离心与向心', en: 'Prime movers, synergists, stabilisers; eccentric vs concentric' },
    cues: [
      { at: 0, text: { zh: '股四头肌伸膝，臀大肌和大收肌伸髋——它们是这个动作的主动肌。', en: 'The quadriceps extend the knee; gluteus maximus and adductor magnus extend the hip — the prime movers.' } },
      { at: 6, text: { zh: '下降时它们一边用力一边被拉长，这叫离心收缩，像刹车一样控制下落。', en: 'On the way down they work while lengthening — an eccentric contraction that brakes the descent.' } },
      { at: 11, text: { zh: '起身时同样的肌肉主动缩短（向心收缩）。腘绳肌同时跨越髋和膝，长度变化很小，主要协同与稳定。', en: 'On the way up the same muscles shorten (concentric). The hamstrings cross hip and knee, barely change length and mainly assist and stabilise.' } },
      { at: 16, text: { zh: '臀中肌防止骨盆侧倾、膝盖内扣；后腿的股直肌被拉长——上身越直立，拉伸越明显。', en: 'Gluteus medius keeps the pelvis level and the knee on track; the rear leg’s rectus femoris is stretched — more so with an upright torso.' } },
    ],
  },
  {
    id: 'fibres',
    duration: 20,
    title: { zh: '④ 肌束与肌纤维', en: '④ Fascicles & fibres' },
    summary: { zh: '肌肉的层级结构与神经驱动', en: 'Muscle hierarchy and nerve drive' },
    cues: [
      { at: 0, text: { zh: '把镜头推进前腿的股外侧肌。', en: 'Zoom into the front leg’s vastus lateralis.' } },
      { at: 4, text: { zh: '整块肌肉由肌外膜包裹，里面是一束束肌束，每一束外面包着肌束膜。', en: 'The whole muscle is wrapped in epimysium and packed with fascicles, each sheathed in perimysium.' } },
      { at: 9, text: { zh: '每个肌束里有成百上千根肌纤维。一根肌纤维就是一个肌细胞：细长、多核，直径约 10–100 微米。', en: 'Each fascicle holds hundreds of fibres. One muscle fibre is one muscle cell: long, multinucleated, 10–100 µm across.' } },
      { at: 14, text: { zh: '运动神经元在神经肌肉接头释放乙酰胆碱，触发动作电位传遍整根纤维。需要更大力量时，神经系统会募集更多运动单位、提高放电频率。', en: 'A motor neuron releases acetylcholine at the neuromuscular junction, firing an action potential along the fibre. For more force, the nervous system recruits more motor units and fires them faster.' } },
    ],
  },
  {
    id: 'sarcomere',
    duration: 30,
    title: { zh: '⑤ 肌细胞内部：肌节与横桥', en: '⑤ Inside the cell: sarcomeres' },
    summary: { zh: '钙离子、肌丝滑行与横桥循环', en: 'Calcium, sliding filaments and the cross-bridge cycle' },
    cues: [
      { at: 0, text: { zh: '肌细胞里塞满了肌原纤维。动作电位经横小管深入细胞，肌浆网随即释放钙离子。', en: 'The cell is packed with myofibrils. The action potential dives in through T-tubules and the sarcoplasmic reticulum releases calcium.' } },
      { at: 6, text: { zh: '肌原纤维由一节节肌节首尾相连，肌节是肌肉收缩的最小单位。', en: 'Myofibrils are chains of sarcomeres — the smallest contractile units.' } },
      { at: 10, text: { zh: '粗肌丝（肌球蛋白）与细肌丝（肌动蛋白）交错排列。收缩时二者相对滑动：A 带长度不变，I 带和 H 区变窄。', en: 'Thick (myosin) and thin (actin) filaments interlock and slide past each other: the A band stays constant while the I band and H zone narrow.' } },
      { at: 18, text: { zh: '横桥循环：钙离子让结合位点暴露，肌球蛋白头抓住肌动蛋白、摆动完成动力冲程，再由 ATP 帮它松开并重新“上膛”。', en: 'The cross-bridge cycle: calcium exposes binding sites, a myosin head grabs actin and pivots in a power stroke, then ATP releases and re-cocks it.' } },
      { at: 24, text: { zh: '下蹲时横桥被负荷强行拉开：离心收缩能产生更大的力、耗能更少，但更容易引起延迟性肌肉酸痛。', en: 'On the way down cross-bridges are dragged apart by the load: eccentric work makes more force for less energy, but causes more delayed soreness.' } },
    ],
  },
  {
    id: 'recap',
    duration: 10,
    title: { zh: '⑥ 总结', en: '⑥ Recap' },
    summary: { zh: '从动作到分子的完整链条', en: 'The whole chain, movement to molecules' },
    cues: [
      { at: 0, text: { zh: '一次分腿蹲：关节构成杠杆，肌肉产生力矩，神经驱动肌纤维，亿万个横桥在肌节里拉动细肌丝。', en: 'One split squat: joints form levers, muscles create torque, nerves drive fibres, and countless cross-bridges pull filaments inside sarcomeres.' } },
      { at: 5, text: { zh: '训练提示：下降控制 2–3 秒，前膝与脚尖方向一致；躯干稍前倾偏重臀部，更直立则偏重股四头肌。', en: 'Tip: lower over 2–3 s and keep the front knee in line with the toes; lean slightly to bias the glutes, stay upright to bias the quads.' } },
    ],
  },
];

let cursor = 0;
export const SCENES: SceneDef[] = scenes.map((s) => {
  const def = { ...s, start: cursor };
  cursor += s.duration;
  return def;
});

export const TOTAL_DURATION = cursor;

export function sceneAt(t: number): SceneDef {
  return SCENES.find((s) => t >= s.start && t < s.start + s.duration) ?? SCENES[SCENES.length - 1];
}

export function cueAt(t: number): Cue | null {
  const scene = sceneAt(t);
  const local = t - scene.start;
  let current: Cue | null = null;
  for (const c of scene.cues) if (c.at <= local) current = c;
  return current;
}

export function formatTime(t: number) {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
