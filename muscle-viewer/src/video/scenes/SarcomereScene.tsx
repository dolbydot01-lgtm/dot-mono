import type { Localized } from '../../data/types';
import { useI18n } from '../../i18n/context';
import { PHASE_COLORS, repState, sampleMotion, type RepPhase } from '../kinematics';
import { clamp, hash, lerp, ramp, type Vec } from '../math';
import { MiniRep } from '../svg/MiniRep';
import { Callout, Panel, SceneTitle } from '../svg/primitives';
import { SCENES } from '../timeline';
import type { SceneProps } from './types';

const ACTIN = '#4dabf7';
const MYOSIN = '#ff922b';
const Z_COLOR = '#ced4da';
const TITIN = '#868e96';
const SR = '#63e6be';
const CALCIUM = '#ffe066';

/** Sarcomere length (µm) follows the quadriceps: ~2.3 µm standing, ~3.0 µm at the bottom. */
const sarcomereLength = (quadsRatio: number) => 2.3 + clamp((quadsRatio - 1) / 0.16) * 0.7;

/** Shared firing model: same as the fibre scene. */
function spikeAges(g: number, activation: number) {
  const interval = lerp(1.1, 0.3, activation);
  const ages: number[] = [];
  for (let k = 0; k < 6; k++) {
    const age = (g % interval) + k * interval;
    if (age < 1.4) ages.push(age);
  }
  return ages;
}

// ───────────── Level 1: inside the cell ─────────────

function CellInterior({ t, g, activation, l }: { t: number; g: number; activation: number; l: (v: Localized) => string }) {
  const rods = [0, 1, 2, 3, 4].map((i) => 280 + i * 62);
  const tTubules = [330, 520, 710, 900];
  const ages = spikeAges(g, activation);
  return (
    <g>
      <defs>
        <pattern id="myofibril-bands" width="96" height="46" patternUnits="userSpaceOnUse">
          <rect width="96" height="46" fill="#e7a39b" />
          <rect x="22" width="52" height="46" fill="#a33b37" />
          <rect x="43" width="10" height="46" fill="#c45a54" />
          <rect x="0" width="3" height="46" fill="#f8f0e3" />
        </pattern>
      </defs>
      {/* Cell membrane */}
      <rect x={150} y={232} width={960} height={346} rx={60} fill="#5c2422" stroke="#f1e3d3" strokeWidth={4} />
      {/* Cut end showing myofibrils in cross-section */}
      <ellipse cx={210} cy={405} rx={70} ry={170} fill="#7d2b2a" stroke="#f1e3d3" strokeWidth={3} />
      {Array.from({ length: 22 }, (_, i) => {
        const a = hash(i) * Math.PI * 2;
        const r = Math.sqrt(hash(i + 40));
        return <circle key={i} cx={210 + Math.cos(a) * r * 52} cy={405 + Math.sin(a) * r * 145} r={11} fill="#c45a54" stroke={SR} strokeOpacity={0.6} strokeWidth={1.5} />;
      })}
      {rods.map((y, i) => (
        <rect key={i} x={260} y={y - 23} width={820} height={46} rx={23} fill="url(#myofibril-bands)" />
      ))}
      {/* Sarcoplasmic reticulum between the myofibrils */}
      {rods.slice(0, -1).map((y, i) => (
        <path
          key={i}
          d={`M262,${y + 31} ${Array.from({ length: 34 }, (_, k) => `Q${275 + k * 24},${y + 31 + (k % 2 ? 6 : -6)} ${287 + k * 24},${y + 31}`).join(' ')}`}
          fill="none"
          stroke={SR}
          strokeWidth={4}
          strokeOpacity={0.7}
        />
      ))}
      {/* T-tubules dive in from the surface */}
      {tTubules.map((x) => (
        <line key={x} x1={x} y1={232} x2={x} y2={578} stroke="#748ffc" strokeWidth={5} strokeDasharray="10 4" />
      ))}
      {/* Calcium released after each action potential */}
      {ages
        .filter((a) => a < 1.1)
        .map((age, s) =>
          rods.slice(0, -1).flatMap((y, i) =>
            Array.from({ length: 12 }, (_, k) => {
              const x = 280 + hash(k * 7 + i * 3) * 780;
              const dy = (hash(k * 11 + i) - 0.5) * 60 * Math.min(age * 3, 1);
              return <circle key={`${s}-${i}-${k}`} cx={x} cy={y + 31 + dy} r={4.5} fill={CALCIUM} opacity={1 - age / 1.1} />;
            }),
          ),
        )}
      <g opacity={ramp(t, 1, 2)}>
        <Callout target={[600, rods[2]]} at={[640, 180]} text={l({ zh: '肌原纤维', en: 'Myofibril' })} color="#ffa8a8" />
        <Callout target={[430, rods[0] + 31]} at={[470, 180]} text={l({ zh: '肌浆网（储存钙离子）', en: 'Sarcoplasmic reticulum (Ca²⁺ store)' })} color={SR} anchor="end" />
        <Callout target={[tTubules[2], 250]} at={[820, 180]} text={l({ zh: '横小管', en: 'T-tubule' })} color="#748ffc" />
        <Callout target={[1000, rods[0] + 31]} at={[1130, 250]} text="Ca²⁺" color={CALCIUM} />
      </g>
    </g>
  );
}

// ───────────── Level 2 & 3: sarcomeres ─────────────

const PX_PER_UM = 300;
const THICK_UM = 1.6;
const THIN_UM = 1.0;

function SarcomereDetail({ L, phase, g, l }: { L: number; phase: RepPhase; g: number; l: (v: Localized) => string }) {
  const cx = 540;
  const half = (L * PX_PER_UM) / 2;
  const zL = cx - half;
  const zR = cx + half;
  const thickHalf = (THICK_UM * PX_PER_UM) / 2;
  const thin = THIN_UM * PX_PER_UM;
  const thickRows = [310, 395, 480];
  const thinRows = [268, 352, 438, 522];
  const hZone = Math.max(L - 2 * THIN_UM, 0);

  const zigzag = (x: number, y0: number, y1: number) =>
    `M${x},${y0} ` + Array.from({ length: 12 }, (_, k) => `L${x + (k % 2 ? 7 : -7)},${y0 + ((y1 - y0) * (k + 1)) / 12}`).join(' ');
  const spring = (x0: number, x1: number, y: number) =>
    `M${x0},${y} ` + Array.from({ length: 10 }, (_, k) => `L${x0 + ((x1 - x0) * (k + 0.5)) / 10},${y + (k % 2 ? 5 : -5)} L${x0 + ((x1 - x0) * (k + 1)) / 10},${y}`).join(' ');

  return (
    <g>
      {/* Titin springs from the Z discs to the thick filaments */}
      {thickRows.map((y) => (
        <g key={y} stroke={TITIN} strokeWidth={1.6} fill="none">
          <path d={spring(zL, cx - thickHalf, y)} />
          <path d={spring(cx + thickHalf, zR, y)} />
        </g>
      ))}
      {/* Thin filaments (actin) anchored on each Z disc */}
      {thinRows.map((y) => (
        <g key={y}>
          {[
            [zL, zL + thin],
            [zR - thin, zR],
          ].map(([x0, x1], j) => (
            <g key={j}>
              <line x1={x0} y1={y} x2={x1} y2={y} stroke={ACTIN} strokeWidth={5} />
              {Array.from({ length: Math.floor((x1 - x0) / 14) }, (_, k) => (
                <circle key={k} cx={x0 + 7 + k * 14} cy={y + (k % 2 ? 3 : -3)} r={4} fill={ACTIN} />
              ))}
            </g>
          ))}
        </g>
      ))}
      {/* Thick filaments (myosin) with heads */}
      {thickRows.map((y, r) => (
        <g key={y}>
          <rect x={cx - thickHalf} y={y - 7} width={thickHalf * 2} height={14} rx={7} fill={MYOSIN} />
          {Array.from({ length: 20 }, (_, k) => {
            const side = k < 10 ? -1 : 1;
            const along = 24 + (k % 10) * 21;
            const x = cx + side * along;
            const stroke = phase === 'concentric' ? Math.sin(g * 9 + hash(k + r * 20) * 6) : phase === 'eccentric' ? -0.7 : 0.2 * Math.sin(g * 5 + k);
            const ang = side * (0.6 + 0.35 * stroke);
            return [-1, 1].map((up) => (
              <line
                key={`${k}-${up}`}
                x1={x}
                y1={y + up * 7}
                x2={x + Math.sin(ang) * 14}
                y2={y + up * (7 + Math.cos(ang) * 14)}
                stroke={MYOSIN}
                strokeWidth={4}
                strokeLinecap="round"
              />
            ));
          })}
        </g>
      ))}
      {/* Z discs and M line */}
      {[zL, zR].map((x) => (
        <path key={x} d={zigzag(x, 232, 560)} stroke={Z_COLOR} strokeWidth={5} fill="none" strokeLinejoin="round" />
      ))}
      <line x1={cx} y1={240} x2={cx} y2={552} stroke="#f8f9fa" strokeWidth={2} strokeDasharray="6 5" />

      {/* Band brackets */}
      <g fontSize={16} fontWeight={700}>
        <line x1={cx - thickHalf} x2={cx + thickHalf} y1={200} y2={200} stroke={MYOSIN} strokeWidth={3} />
        <text x={cx} y={190} fill={MYOSIN} textAnchor="middle">
          {l({ zh: 'A 带（长度不变）', en: 'A band (constant)' })}
        </text>
        <line x1={zL} x2={cx - thickHalf} y1={590} y2={590} stroke={ACTIN} strokeWidth={3} />
        <text x={(zL + cx - thickHalf) / 2} y={614} fill={ACTIN} textAnchor="middle">
          {l({ zh: 'I 带', en: 'I band' })}
        </text>
        {hZone > 0.02 && (
          <>
            <line x1={cx - (hZone * PX_PER_UM) / 2} x2={cx + (hZone * PX_PER_UM) / 2} y1={590} y2={590} stroke="#f8f9fa" strokeWidth={3} />
            <text x={cx} y={614} fill="#f8f9fa" textAnchor="middle">
              {l({ zh: 'H 区', en: 'H zone' })}
            </text>
          </>
        )}
        <text x={zL} y={222} fill={Z_COLOR} textAnchor="middle">
          Z
        </text>
        <text x={zR} y={222} fill={Z_COLOR} textAnchor="middle">
          Z
        </text>
        <text x={cx + 8} y={222} fill="#f8f9fa">
          M
        </text>
      </g>
    </g>
  );
}

// ───────────── Level 4: cross-bridge cycle ─────────────

const CYCLE = 2.4;
const STEPS: { from: number; to: number; text: Localized }[] = [
  { from: 0, to: 0.2, text: { zh: '① 钙离子结合肌钙蛋白，原肌球蛋白移开，暴露结合位点', en: '① Ca²⁺ binds troponin; tropomyosin shifts and exposes binding sites' } },
  { from: 0.2, to: 0.35, text: { zh: '② 携带 ADP + Pi 的肌球蛋白头结合肌动蛋白，形成横桥', en: '② The myosin head (holding ADP + Pi) binds actin — a cross-bridge' } },
  { from: 0.35, to: 0.6, text: { zh: '③ 释放 Pi 和 ADP，头部摆动——动力冲程，细肌丝被拉向 M 线', en: '③ Pi and ADP leave, the head pivots — the power stroke pulls actin toward the M line' } },
  { from: 0.6, to: 1, text: { zh: '④ ATP 结合，头部脱离；ATP 水解后头部重新“上膛”', en: '④ ATP binds and the head lets go; hydrolysing ATP re-cocks it' } },
];

const PIVOT: Vec = [600, 392];
const LEVER = 175;
const ACTIN_Y = 240;
const BEAD = 26;
const COCKED = 60;

/** Speed (px/s) the thin filament slides in the close-up at global time `g`. */
function slideVelocity(g: number) {
  const phase = repState(g).phase;
  const s = (g % CYCLE) / CYCLE;
  if (phase === 'concentric') return s >= 0.35 && s < 0.6 ? -(LEVER * (Math.cos((COCKED * Math.PI) / 180) * 2)) / (0.25 * CYCLE) : 0;
  if (phase === 'eccentric') return 60;
  return 0;
}

function actinOffset(fromG: number, toG: number) {
  let off = 0;
  const dt = 1 / 40;
  for (let x = fromG; x < toG; x += dt) off += slideVelocity(x) * Math.min(dt, toG - x);
  return off;
}

function CrossBridge({ g, sceneStart, phase, l }: { g: number; sceneStart: number; phase: RepPhase; l: (v: Localized) => string }) {
  const s = (g % CYCLE) / CYCLE;
  const offset = actinOffset(sceneStart, g);
  const wrapped = ((offset % (BEAD * 4)) + BEAD * 4) % (BEAD * 4);

  // Head angle (degrees from +x, pointing up) for each phase of the rep.
  const attached = s >= 0.2 && s < 0.6;
  let angle = COCKED;
  if (s >= 0.35 && s < 0.6) {
    const p = (s - 0.35) / 0.25;
    if (phase === 'concentric') angle = lerp(COCKED, 120, p);
    else if (phase === 'eccentric') angle = lerp(COCKED, 38, p); // dragged backwards by the load
    else angle = lerp(COCKED, 78, p); // isometric: strain without sliding
  } else if (s >= 0.6) {
    const p = (s - 0.6) / 0.4;
    const end = phase === 'concentric' ? 120 : phase === 'eccentric' ? 38 : 78;
    angle = p < 0.4 ? end : lerp(end, COCKED, (p - 0.4) / 0.6);
  }
  const rad = (angle * Math.PI) / 180;
  const reach = attached ? LEVER : LEVER * 0.86;
  const tip: Vec = [PIVOT[0] + Math.cos(rad) * reach, PIVOT[1] - Math.sin(rad) * reach];
  const exposed = s >= 0.05 && s < 0.9;
  const tropoShift = exposed ? -9 : 0;

  const pill = (x: number, y: number, label: string, color: string, o = 1) => (
    <g opacity={o}>
      <rect x={x - 26} y={y - 13} width={52} height={26} rx={13} fill={color} />
      <text x={x} y={y + 1} fill="#141925" fontSize={14} fontWeight={800} textAnchor="middle" dominantBaseline="middle">
        {label}
      </text>
    </g>
  );

  return (
    <g>
      {/* Actin: two-stranded bead chain */}
      {Array.from({ length: 46 }, (_, i) => {
        const x = 40 + i * BEAD + wrapped - BEAD * 4;
        const site = i % 4 === 1;
        return (
          <g key={i}>
            <circle cx={x} cy={ACTIN_Y - 10} r={13} fill={ACTIN} />
            <circle cx={x + BEAD / 2} cy={ACTIN_Y + 10} r={13} fill="#339af0" />
            {site && exposed && <circle cx={x} cy={ACTIN_Y - 2} r={6} fill="#69db7c" />}
          </g>
        );
      })}
      {/* Tropomyosin + troponin */}
      <path
        d={`M${(wrapped % 52) - 52},${ACTIN_Y + tropoShift} ` + Array.from({ length: 52 }, (_, k) => `Q${k * 26 + 13 + (wrapped % 52) - 52},${ACTIN_Y + tropoShift + (k % 2 ? 10 : -10)} ${k * 26 + 26 + (wrapped % 52) - 52},${ACTIN_Y + tropoShift}`).join(' ')}
        fill="none"
        stroke="#e599f7"
        strokeWidth={5}
      />
      {Array.from({ length: 11 }, (_, k) => {
        const x = 20 + k * BEAD * 4 + wrapped;
        return (
          <g key={k}>
            <circle cx={x} cy={ACTIN_Y - 22 + tropoShift} r={9} fill="#ffd43b" />
            {exposed && <circle cx={x + 8} cy={ACTIN_Y - 34 + tropoShift} r={5} fill={CALCIUM} stroke="#141925" strokeWidth={1.5} />}
          </g>
        );
      })}

      {/* Thick filament with background heads */}
      <rect x={20} y={PIVOT[1]} width={1240} height={30} rx={15} fill={MYOSIN} />
      {Array.from({ length: 16 }, (_, k) => {
        const x = 60 + k * 75;
        if (Math.abs(x - PIVOT[0]) < 60) return null;
        const a = ((COCKED + 25 * Math.sin(g * 3 + k)) * Math.PI) / 180;
        return <line key={k} x1={x} y1={PIVOT[1]} x2={x + Math.cos(a) * 70} y2={PIVOT[1] - Math.sin(a) * 70} stroke="#d9480f" strokeWidth={9} strokeLinecap="round" opacity={0.45} />;
      })}

      {/* The featured myosin head */}
      <line x1={PIVOT[0]} y1={PIVOT[1]} x2={tip[0]} y2={tip[1]} stroke={MYOSIN} strokeWidth={14} strokeLinecap="round" />
      <ellipse cx={tip[0]} cy={tip[1]} rx={22} ry={15} fill="#ff6b00" transform={`rotate(${-angle} ${tip[0]} ${tip[1]})`} />
      {attached && <circle cx={tip[0]} cy={tip[1] - 8} r={26} fill="none" stroke="#69db7c" strokeWidth={3} strokeDasharray="5 4" />}

      {/* Molecules */}
      {s < 0.35 && pill(tip[0] - 50, tip[1] + 34, 'ADP', '#a5d8ff')}
      {s < 0.35 && pill(tip[0] + 6, tip[1] + 44, 'Pi', '#d0bfff')}
      {s >= 0.35 && s < 0.6 && pill(tip[0] - 60 - (s - 0.35) * 400, tip[1] + 60 + (s - 0.35) * 300, 'Pi', '#d0bfff', 1 - (s - 0.35) * 4)}
      {s >= 0.45 && s < 0.6 && pill(tip[0] + 50 + (s - 0.45) * 400, tip[1] + 70 + (s - 0.45) * 300, 'ADP', '#a5d8ff', 1 - (s - 0.45) * 6)}
      {s >= 0.55 && s < 0.75 && pill(lerp(tip[0] + 220, tip[0] + 10, ramp(s, 0.55, 0.65)), tip[1] + 40, 'ATP', '#ffe066')}
      {s >= 0.75 && pill(tip[0] - 50, tip[1] + 34, 'ADP', '#a5d8ff', ramp(s, 0.75, 0.82))}
      {s >= 0.75 && pill(tip[0] + 6, tip[1] + 44, 'Pi', '#d0bfff', ramp(s, 0.75, 0.82))}

      <g fontSize={17} fontWeight={700}>
        <text x={40} y={ACTIN_Y - 48} fill={ACTIN}>
          {l({ zh: '细肌丝：肌动蛋白', en: 'Thin filament: actin' })}
        </text>
        <text x={40} y={PIVOT[1] + 64} fill={MYOSIN}>
          {l({ zh: '粗肌丝：肌球蛋白', en: 'Thick filament: myosin' })}
        </text>
        <text x={330} y={ACTIN_Y - 48} fill="#e599f7">
          {l({ zh: '原肌球蛋白', en: 'Tropomyosin' })}
        </text>
        <text x={560} y={ACTIN_Y - 48} fill="#ffd43b">
          {l({ zh: '肌钙蛋白 + Ca²⁺', en: 'Troponin + Ca²⁺' })}
        </text>
      </g>
      <text x={40} y={PIVOT[1] + 94} fill={phase === 'eccentric' ? PHASE_COLORS.eccentric : '#8b93a7'} fontSize={16}>
        {l({ zh: '← M 线方向（向心时细肌丝被拉向这边）', en: '← toward the M line (actin is pulled this way when shortening)' })}
      </text>
    </g>
  );
}

// ───────────── Scene ─────────────

export function SarcomereScene({ t, g }: SceneProps) {
  const { l } = useI18n();
  const motion = sampleMotion(g);
  const quads = motion.muscles.find((m) => m.id === 'quads')!;
  const L = sarcomereLength(quads.lengthRatio);
  const phase = motion.rep.phase;
  const scene = SCENES.find((s) => s.id === 'sarcomere')!;
  const s = (g % CYCLE) / CYCLE;
  const step = STEPS.findIndex((st) => s >= st.from && s < st.to);

  const l1 = 1 - ramp(t, 5.6, 6.4);
  const l2 = ramp(t, 5.8, 6.6) * (1 - ramp(t, 9.6, 10.4));
  const l3 = ramp(t, 9.8, 10.6) * (1 - ramp(t, 17.6, 18.4));
  const l4 = ramp(t, 17.8, 18.6);

  const status: Localized =
    phase === 'concentric'
      ? { zh: '向心：细肌丝滑向 M 线，肌节缩短', en: 'Concentric: actin slides toward the M line, the sarcomere shortens' }
      : phase === 'eccentric'
        ? { zh: '离心：负荷把细肌丝拉离 M 线，肌节被拉长——横桥仍在抓握，起刹车作用', en: 'Eccentric: the load pulls actin away from the M line — cross-bridges still grip, acting as brakes' }
        : { zh: '等长：长度不变，横桥持续循环维持张力', en: 'Isometric: length holds while cross-bridges keep cycling' };

  // Myofibril strip for level 2: sarcomeres repeat at the live length.
  const stripPx = L * 90;
  const stripCount = Math.ceil(1180 / stripPx) + 1;
  // Highlight the sarcomere nearest the centre of the frame.
  const focusIndex = Math.floor((640 - 50) / stripPx);

  return (
    <g>
      {l1 > 0 && (
        <g opacity={l1}>
          <CellInterior t={t} g={g} activation={quads.activation} l={l} />
        </g>
      )}

      {l2 > 0 && (
        <g opacity={l2}>
          {Array.from({ length: stripCount }, (_, i) => {
            const x0 = 50 + i * stripPx;
            const a0 = x0 + stripPx * ((L - THICK_UM) / 2 / L);
            const a1 = x0 + stripPx * (1 - (L - THICK_UM) / 2 / L);
            return (
              <g key={i}>
                <rect x={x0} y={340} width={Math.min(stripPx, 1230 - x0)} height={100} fill="#e7a39b" />
                <rect x={a0} y={340} width={a1 - a0} height={100} fill="#a33b37" />
                <rect x={x0} y={340} width={4} height={100} fill="#f8f0e3" />
              </g>
            );
          })}
          <rect x={50 + stripPx * focusIndex} y={326} width={stripPx} height={128} fill="none" stroke="#ffd43b" strokeWidth={4} rx={8} />
          <text x={50 + stripPx * (focusIndex + 0.5)} y={310} fill="#ffd43b" fontSize={20} fontWeight={700} textAnchor="middle">
            {l({ zh: '一个肌节（Z 线到 Z 线）', en: 'One sarcomere (Z line to Z line)' })}
          </text>
          <text x={640} y={520} fill="#c3c8d6" fontSize={19} textAnchor="middle">
            {l({ zh: '一根肌原纤维上首尾相连着数千个肌节', en: 'Thousands of sarcomeres lie end to end along each myofibril' })}
          </text>
        </g>
      )}

      {l3 > 0 && (
        <g opacity={l3}>
          <SarcomereDetail L={L} phase={phase} g={g} l={l} />
          <Panel x={1000} y={230} w={260} h={330}>
            <h4>{l({ zh: '实时测量', en: 'Live values' })}</h4>
            <div className="kv-row">
              <span>{l({ zh: '肌节长度', en: 'Sarcomere' })}</span>
              <b>{L.toFixed(2)} µm</b>
            </div>
            <div className="kv-row">
              <span style={{ color: MYOSIN }}>{l({ zh: 'A 带', en: 'A band' })}</span>
              <b>{THICK_UM.toFixed(2)} µm</b>
            </div>
            <div className="kv-row">
              <span style={{ color: ACTIN }}>{l({ zh: 'I 带', en: 'I band' })}</span>
              <b>{(L - THICK_UM).toFixed(2)} µm</b>
            </div>
            <div className="kv-row">
              <span>{l({ zh: 'H 区', en: 'H zone' })}</span>
              <b>{Math.max(L - 2 * THIN_UM, 0).toFixed(2)} µm</b>
            </div>
            <p className="footnote">{l({ zh: '肌丝本身长度不变，变的是它们的重叠程度。', en: 'The filaments never change length — only how much they overlap.' })}</p>
          </Panel>
        </g>
      )}

      {l4 > 0 && (
        <g opacity={l4}>
          <CrossBridge g={g} sceneStart={scene.start + 18} phase={phase} l={l} />
          <Panel x={860} y={436} w={400} h={196}>
            {STEPS.map((st, i) => (
              <div key={i} className={`step-row ${i === step ? 'is-active' : ''}`}>
                {l(st.text)}
              </div>
            ))}
          </Panel>
        </g>
      )}

      {l3 > 0.5 && (
        <text x={48} y={140} fill={PHASE_COLORS[phase]} fontSize={19} fontWeight={700}>
          {l(status)}
        </text>
      )}
      {l4 > 0.5 && (
        <foreignObject x={40} y={508} width={790} height={52}>
          <div className="stage-status" style={{ color: PHASE_COLORS[phase] }}>
            {l(status)}
          </div>
        </foreignObject>
      )}
      {l4 > 0.5 && phase === 'eccentric' && (
        <g>
          <rect x={40} y={566} width={790} height={40} rx={10} fill="#1864ab" opacity={0.35} />
          <text x={56} y={591} fill="#d0ebff" fontSize={16}>
            {l({
              zh: '横桥在完成动力冲程前就被强行拉开：单个横桥承受更大的力，ATP 消耗更少。',
              en: 'Cross-bridges are torn off before finishing the stroke: each bears more force while using less ATP.',
            })}
          </text>
        </g>
      )}

      <SceneTitle title={scene.title} sub={{ zh: '肌细胞 → 肌原纤维 → 肌节 → 横桥', en: 'Cell → myofibril → sarcomere → cross-bridge' }} opacity={ramp(t, 0, 0.6)} />
      <MiniRep motion={motion} x={1010} y={26} w={240} h={180} />
    </g>
  );
}
