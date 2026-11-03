import type { BoneInfo } from './types';

export const BONES: BoneInfo[] = [
  {
    id: 'skull', latin: 'Cranium', count: 22, category: 'axial',
    name: { zh: '颅骨', en: 'Skull' },
    summary: { zh: '由脑颅骨和面颅骨组成，保护大脑和感觉器官。除下颌骨外都以骨缝紧密连接。', en: 'Neurocranium and facial bones protecting the brain and sense organs. All but the mandible are fused by sutures.' },
    features: [{ zh: '下颌骨是唯一可活动的颅骨', en: 'The mandible is the only movable skull bone' }, { zh: '枕骨与寰椎构成"点头"关节', en: 'Occipital bone and atlas form the "nodding" joint' }],
  },
  {
    id: 'cervical', latin: 'Vertebrae cervicales', count: 7, category: 'axial',
    name: { zh: '颈椎', en: 'Cervical vertebrae' },
    summary: { zh: '7节体积最小、最灵活的椎骨，C1寰椎与C2枢椎形态特殊。', en: 'The 7 smallest, most mobile vertebrae; C1 (atlas) and C2 (axis) are specialised.' },
    features: [{ zh: '生理曲度：前凸', en: 'Natural curve: lordosis' }, { zh: '横突孔内有椎动脉通过', en: 'Transverse foramina carry the vertebral arteries' }],
  },
  {
    id: 'thoracic', latin: 'Vertebrae thoracicae', count: 12, category: 'axial',
    name: { zh: '胸椎', en: 'Thoracic vertebrae' },
    summary: { zh: '12节与肋骨相连的椎骨，组成胸廓后壁，旋转能力较强。', en: '12 vertebrae articulating with the ribs to form the back of the thorax; good rotational capacity.' },
    features: [{ zh: '生理曲度：后凸', en: 'Natural curve: kyphosis' }, { zh: '棘突长而向下倾斜', en: 'Long, downward-sloping spinous processes' }],
  },
  {
    id: 'lumbar', latin: 'Vertebrae lumbales', count: 5, category: 'axial',
    name: { zh: '腰椎', en: 'Lumbar vertebrae' },
    summary: { zh: '5节最粗大的椎骨，承受上半身重量，以屈伸为主、旋转很少。', en: 'The 5 largest vertebrae carrying upper-body load; mainly flexion/extension with little rotation.' },
    features: [{ zh: '生理曲度：前凸', en: 'Natural curve: lordosis' }, { zh: '腰椎间盘突出多发于L4–S1', en: 'Disc herniations are most common at L4–S1' }],
  },
  {
    id: 'sacrum', latin: 'Os sacrum et coccyx', count: 2, category: 'axial',
    name: { zh: '骶骨与尾骨', en: 'Sacrum & coccyx' },
    summary: { zh: '5节骶椎融合成三角形骶骨，嵌在两块髋骨之间，构成骨盆后壁。', en: 'Five fused sacral vertebrae wedged between the hip bones, forming the back of the pelvis.' },
    features: [{ zh: '骶髂关节传递躯干与下肢之间的力', en: 'Sacroiliac joints transfer force between trunk and legs' }],
  },
  {
    id: 'ribs', latin: 'Costae', count: 24, category: 'axial',
    name: { zh: '肋骨', en: 'Ribs' },
    summary: { zh: '12对肋骨：1–7为真肋直接连胸骨，8–10为假肋，11–12为浮肋。', en: '12 pairs: 1–7 true ribs join the sternum directly, 8–10 false ribs, 11–12 floating ribs.' },
    features: [{ zh: '呼吸时做"水泵柄"和"桶柄"运动', en: 'Move like a "pump handle" and "bucket handle" when breathing' }],
  },
  {
    id: 'sternum', latin: 'Sternum', count: 1, category: 'axial',
    name: { zh: '胸骨', en: 'Sternum' },
    summary: { zh: '胸前正中的扁骨，分胸骨柄、胸骨体和剑突。', en: 'Flat bone at the front of the chest: manubrium, body and xiphoid process.' },
    features: [{ zh: '胸骨角平第2肋，是临床计数肋骨的标志', en: 'The sternal angle marks rib 2 — a landmark for counting ribs' }],
  },
  {
    id: 'clavicle', latin: 'Clavicula', count: 2, category: 'appendicular',
    name: { zh: '锁骨', en: 'Clavicle' },
    summary: { zh: 'S形长骨，像支柱一样把肩撑离躯干，是最常骨折的骨之一。', en: 'An S-shaped strut holding the shoulder away from the trunk; one of the most frequently fractured bones.' },
    features: [{ zh: '内侧连胸骨，外侧连肩峰', en: 'Medially joins the sternum, laterally the acromion' }],
  },
  {
    id: 'scapula', latin: 'Scapula', count: 2, category: 'appendicular',
    name: { zh: '肩胛骨', en: 'Scapula' },
    summary: { zh: '贴于背部的三角形扁骨，是17块肌肉的附着点，肩关节盂就在其外侧角。', en: 'Triangular flat bone on the upper back; 17 muscles attach to it, and it carries the glenoid fossa.' },
    features: [{ zh: '肩胛冈、肩峰、喙突是重要骨性标志', en: 'Spine, acromion and coracoid process are key landmarks' }],
  },
  {
    id: 'humerus', latin: 'Humerus', count: 2, category: 'appendicular',
    name: { zh: '肱骨', en: 'Humerus' },
    summary: { zh: '上臂唯一的长骨，上端肱骨头与肩胛盂构成肩关节，下端参与肘关节。', en: 'The single long bone of the upper arm; its head forms the shoulder, its lower end the elbow.' },
    features: [{ zh: '大、小结节是肩袖附着点', en: 'Greater and lesser tubercles anchor the rotator cuff' }, { zh: '内上髁/外上髁分别是屈肌/伸肌起点', en: 'Medial/lateral epicondyles anchor forearm flexors/extensors' }],
  },
  {
    id: 'radius', latin: 'Radius', count: 2, category: 'appendicular',
    name: { zh: '桡骨', en: 'Radius' },
    summary: { zh: '前臂拇指侧的长骨，远端宽大构成腕关节主体，可绕尺骨旋转。', en: 'The thumb-side forearm bone; its wide distal end forms most of the wrist and it rotates around the ulna.' },
    features: [{ zh: '桡骨远端骨折（摔倒手撑地）很常见', en: 'Distal radius fractures (falling on an outstretched hand) are common' }],
  },
  {
    id: 'ulna', latin: 'Ulna', count: 2, category: 'appendicular',
    name: { zh: '尺骨', en: 'Ulna' },
    summary: { zh: '前臂小指侧的长骨，近端鹰嘴形成"肘尖"，与肱骨构成铰链关节。', en: 'The little-finger-side forearm bone; its olecranon forms the point of the elbow and the hinge with the humerus.' },
    features: [{ zh: '鹰嘴是肱三头肌止点', en: 'The olecranon is the triceps insertion' }],
  },
  {
    id: 'hand', latin: 'Ossa manus', count: 54, category: 'appendicular',
    name: { zh: '手骨', en: 'Hand bones' },
    summary: { zh: '每只手27块：8块腕骨、5块掌骨、14块指骨，支持精细动作。', en: '27 per hand: 8 carpals, 5 metacarpals and 14 phalanges, enabling fine motor control.' },
    features: [{ zh: '拇指腕掌关节是典型的鞍状关节', en: 'The thumb CMC joint is the classic saddle joint' }],
  },
  {
    id: 'pelvis', latin: 'Os coxae', count: 2, category: 'appendicular',
    name: { zh: '髋骨（骨盆）', en: 'Hip bone (pelvis)' },
    summary: { zh: '由髂骨、坐骨、耻骨融合而成，与骶骨围成骨盆，连接躯干与下肢。', en: 'Ilium, ischium and pubis fused together; with the sacrum it forms the pelvis, linking trunk and legs.' },
    features: [{ zh: '髋臼是三骨融合处', en: 'The acetabulum is where the three bones meet' }, { zh: '髂前上棘、坐骨结节是重要骨性标志', en: 'ASIS and ischial tuberosity are key landmarks' }],
  },
  {
    id: 'femur', latin: 'Femur', count: 2, category: 'appendicular',
    name: { zh: '股骨', en: 'Femur' },
    summary: { zh: '人体最长、最强壮的骨，长度约为身高的1/4。', en: 'The longest and strongest bone, roughly a quarter of body height.' },
    features: [{ zh: '股骨颈与骨干约成125°颈干角', en: 'Neck–shaft angle of about 125°' }, { zh: '大转子是臀中肌附着点', en: 'The greater trochanter anchors the glute med' }],
  },
  {
    id: 'patella', latin: 'Patella', count: 2, category: 'appendicular',
    name: { zh: '髌骨', en: 'Patella' },
    summary: { zh: '人体最大的籽骨，包埋在股四头肌腱中，增大伸膝力臂。', en: 'The largest sesamoid bone, embedded in the quadriceps tendon to lengthen the knee-extension lever.' },
    features: [{ zh: '可使股四头肌效率提升约30%', en: 'Improves quadriceps efficiency by roughly 30%' }],
  },
  {
    id: 'tibia', latin: 'Tibia', count: 2, category: 'appendicular',
    name: { zh: '胫骨', en: 'Tibia' },
    summary: { zh: '小腿内侧粗大的承重骨，前缘就在皮下（"迎面骨"）。', en: 'The thick weight-bearing shin bone; its front edge lies just under the skin.' },
    features: [{ zh: '内踝是胫骨下端', en: 'The medial malleolus is its lower end' }],
  },
  {
    id: 'fibula', latin: 'Fibula', count: 2, category: 'appendicular',
    name: { zh: '腓骨', en: 'Fibula' },
    summary: { zh: '小腿外侧细长的骨，几乎不负重，主要供肌肉附着并稳定踝关节。', en: 'The slender lateral leg bone; bears little weight but anchors muscles and stabilises the ankle.' },
    features: [{ zh: '外踝是腓骨下端', en: 'The lateral malleolus is its lower end' }],
  },
  {
    id: 'foot', latin: 'Ossa pedis', count: 52, category: 'appendicular',
    name: { zh: '足骨', en: 'Foot bones' },
    summary: { zh: '每只脚26块：7块跗骨、5块跖骨、14块趾骨，构成弹性足弓。', en: '26 per foot: 7 tarsals, 5 metatarsals and 14 phalanges forming the springy arches.' },
    features: [{ zh: '跟骨是最大的跗骨，跟腱止于此', en: 'The calcaneus is the largest tarsal and anchors the Achilles' }],
  },
];

export const BONE_MAP: Record<string, BoneInfo> = Object.fromEntries(
  BONES.map((b) => [b.id, b]),
);
