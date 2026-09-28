# 应龙图源对照

2026-09-24。本轮用于本项目的选型，不是通用引擎性能榜。每个目标引擎只取一张首轮样本，随机性、分辨率与服务端默认值使其不构成严格统计实验。

## 固定内容

共同提示词见 `references/yinglong-benchmark-prompt.txt`（1008 字符）。要求东方长体、四足、双翼、小眼长吻、自然承重、苍黑鳞甲与全身无裁切；中性背景以便重建。所有对照首轮使用同一提示词，未使用美化场景掩盖模型结构。

## 实際回执

| 路径 | 任务 | Tripo credits | 观察 |
| --- | --- | ---: | --- |
| 直接 GPT 内置生图 | exec-345214c8-7e58-45a9-bdb7-cf344255c990 | 不属于 Tripo 计费 | 鳞甲、肌肉、头部威慑力较强，双翼端部裁切 |
| Tripo Seedream v5 | 627a454f-b758-40d6-98aa-2ef2cc969a46 | 5 | 2496×1664；承重姿态明确，翼尖和尾端裁切，膜面更偏压纹 |
| Tripo banana_pro | 23ef7ee5-1788-43c1-addf-da3a9a0ebc65 | 15 | 2528×1696；伏身姿态与皮肤褶皱自然，右翼裁切，轮廓较紧凑 |

调用问题：最初两个命令将含末尾换行的 PowerShell 字符串传给 npx.cmd，后续选项未生效。任务 553c2ef8-20a2-4a44-bf11-c5179ebbd787 与 7910d614-c2b7-4f54-baec-a320ddd24792 的回执均为 seedream_v4（各 5 credits）。它们仅作额外失败配置样本，不冒充 v5 / Gemini 对照。修复为 Trim 后直接通过 Node 执行已安装 CLI，并核对返回模型名称。

## 可控编辑

GPT 和 banana_pro 各做一次拉远补全翼尖的编辑。GPT 得到完整双翼（`references/yinglong-gpt-complete.png`）；banana_pro 任务 5fa3a20f-61d3-4c7c-ba2c-2a0542565348（15 credits）基本保留原构图，右翼裁切仍存在。因此两者的后续 3D 比较属于实际制作流程结果，不可把 B 输入裁切引起的损失完全归因于 3D 引擎。

## 3D 对照

阶段记录：同一 Tripo v3.1-20260211、高精几何、extreme 纹理、PBR 与 model_seed=42137；两路服务端均已成功，各 70 credits。应用户要求先提交阶段版，尚未进行中性光照三角度、四足/双翼、鳞甲、背面与翼膜验收，不能据此宣布 3D 胜出者。任务编号与恢复入口见 production-checkpoint.json，恢复已有任务下载无需重新生成。

## 官方能力依据

- https://developers.tripo3d.ai/en/docs/generation-text-to-image
- https://developers.tripo3d.ai/en/pricing

Tripo 是多引擎入口，不能把入口名称当成一个独立图像模型。内置生图工具不暴露与 Tripo 完全相同的底层参数，所以本轮不声称同模型、同分辨率、同质量档位的严格平台 A/B。
