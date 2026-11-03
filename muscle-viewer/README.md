# Anatomy 3D · 人体解剖 3D

交互式人体骨骼 / 肌肉 / 关节学习应用（React + react-three-fiber）。

```bash
npm install
npm run dev
```

## 功能

- 可旋转缩放的 3D 人体：骨骼、浅层肌、深层肌、关节四个图层，可调浅层肌透明度以透视深层肌
- 点击肌群：功能、起止点、作用关节、训练动作（含器械、难度、要点）
- 点击关节：类型、自由度表格，3D 中用彩色圆环（红=矢状面、绿=冠状面、蓝=水平面）演示活动范围
- 概念学习：关节自由度、运动平面、关节分类、深层核心等，可"在 3D 中查看"
- 中英文切换（记忆在 localStorage）
- 科普视频（顶栏「科普视频」或 `/#video`）：2 分钟保加利亚分腿蹲动画，从动作、骨骼杠杆、肌肉伸缩到肌纤维与肌节横桥；
  支持章节跳转、双语字幕、倍速、全屏，`/?t=45#video` 从指定时间开始。分镜见 [docs/split-squat-video-storyboard.md](docs/split-squat-video-storyboard.md)
- 备考题库（顶栏「备考题库」或 `/#exam`）：3 套原创 NSCA-CSCS 风格模拟卷（每套 50 题 × 2 分 = 100 分，科学基础 / 实践应用各 25 题），
  练习模式（逐题核对与解析）、限时模拟考试（交卷评分、分部与知识领域分析）、打印 / 存为 PDF（可附答案与解析）、中英对照；
  每题可一键跳到相关的 3D 结构或视频时间点

## 目录结构

```
src/
  data/          纯数据：muscles / joints / bones / concepts（双语 Localized 文本）
  i18n/          I18nProvider、useI18n、UI 文案
  store/         zustand 全局状态（选中、悬停、图层、视角请求）
  scene/         3D 场景
    geometry/    程序化几何体：belly（肌腹）、sweep（截面沿曲线变化，用于长骨/肋骨/软骨）、
                 patch（有厚度的曲面板，用于髂骨/肩胛骨/胸骨/骶骨）、椭球、棒、管
    materials/   程序化贴图：肌纤维纹理、骨质纹理（无图片资源）
    anatomy/     左侧坐标数据（muscleShapes / skeletonShapes / jointAnchors），渲染时镜像
    parts/       Bilateral（左右镜像）、PickableMesh（可悬停/点击的网格）
    *Layer.tsx   SkeletonLayer / MuscleLayer / JointLayer、DofGizmo、CameraRig、HoverLabel
  exam/          备考题库：papers/（题目数据，正确答案与干扰项分开存放，构建时均衡打乱）、session（评分与本地保存）、components/
  video/         科普视频：kinematics（动作与生物力学模型）、timeline（章节与旁白）、scenes/、svg/、player/
  components/
    layout/      TopBar、LanguageSwitch
    sidebar/     Sidebar、ExploreTab、ListGroup、ConceptsTab、ConceptCard
    viewer/      Viewer、LayerPanel、ViewButtons、Legend
    info/        InfoPanel → MuscleDetail / JointDetail / BoneDetail、ExerciseCard、DofTable
    common/      Section、Chip
```

新增肌肉：在 `data/muscles.ts` 加内容，在 `scene/anatomy/muscleShapes.ts` 用同一个 id 加几何形状即可。
