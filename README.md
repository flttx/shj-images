# 山海经 · 异兽图鉴

基于项目蓝图的三维异兽展厅。React + TypeScript + Three.js，全部内容与模型保存在项目中。

## 启动

```sh
npm install
npm run dev
```

打开终端显示的本地地址。端口占用时 Vite 会使用下一个端口。

## 验证与发布

```sh
npm run lint
npm run typecheck
npm test
npm run assets:check
npm run build
npm run preview
```

`dist/` 可发布到静态网站托管。模型文件较大，请开启 HTTP 压缩与长期缓存；保留模型按需加载方式，勿把全部模型预载入首页。Playwright 首次运行可能需要 `npx playwright install chromium`。

## 使用

- 拖动旋转、滚轮或双指缩放；按钮支持缩放、复位与自动巡览。
- 键盘左右方向键切换异兽；图鉴支持名称、别名、拼音和形态搜索。
- 展开异兽志阅读形态、行为、声音设定。收藏保存在当前浏览器。
- 声景默认关闭，点击开启；设置中调整音量和动态效果。
- 支持 `?beast=zhulong` 等深链，slug 见 `src/data/beasts.ts`。

## 资产与来源

- 内容依据 `shanhaijing_3d_beast_blueprint.md`；栖境、声音及造型属于创作演绎，非古籍逐字引文。
- `assets/` 在本机保存生产输入、任务记录和高精源资产，不纳入 Git；`assets-manifest.json` 记录展示资产状态与计费。
- `public/models/` 为网页 GLB，`public/previews/` 为模型预览。
- 已导入的骨骼动画会自动列入动作选择；未包含动画的模型提供镜头巡览，不冒充完整骨骼表演。
- 展示字体为 Google Fonts 的 Noto Serif SC 字符子集（SIL Open Font License）；其余文字采用系统中文字体。

## 性能与兼容性

需要支持 WebGL 2 的现代浏览器。一次只加载和显示一个模型；切换会释放旧模型网格、材质和纹理。高精模型首次下载耗时依网络与设备而异。WebGL 或模型加载失败时显示预览和重试，并保持档案可读。

## 外部服务

前端不包含 API 密钥，不向 Tripo 提交实时请求。资产生产使用本机 Tripo CLI 的安全凭据配置。

## 阶段版本（2026-09-28）

已接入 20 个网页模型、14 段声音及应龙骨骼待机动画。巨物场景加入低机位、墨青岩地、微型松树与古亭、雾和飞鸟。

这是可运行的阶段版本，模型艺术质量仍在迭代：12 只核心形态通过，7 只待修，何罗鱼十身数量待核。应龙 GPT / Tripo 生图对照的新 3D 候选尚未验收替换，不能将现有模型理解为最终巨物品质。

后续工作与恢复入口见 `progress.md`、`design/production-checkpoint.json` 和 `design/reference-benchmark.md`。源模型、Blender 工程、QA 截图和生产中间文件保留在本机的 `assets/`、`qa/`，不随 Git 克隆；`public/` 下运行所需模型、预览、音频与字体全部纳入版本。
