export interface Beast {
  id: string;
  number: string;
  name: string;
  pinyin: string;
  alias: string;
  tier: "S" | "A";
  category: "神祇" | "龙蛇" | "翼兽" | "灵兽" | "水族";
  habitat: string;
  title: string;
  description: string;
  traits: string[];
  appearance: string;
  behavior: string;
  sound: string;
  color: string;
  model: string;
  preview: string;
}

// 形貌以项目蓝图为依据；栖境、称号与动态描写为本图鉴的艺术设定。
const entries: Omit<Beast, "number" | "model" | "preview">[] = [
  {
    id: "zhulong",
    name: "烛龙",
    pinyin: "ZHÚ LÓNG",
    alias: "烛九阴",
    tier: "S",
    category: "神祇",
    habitat: "赤壁幽谷",
    title: "赤色长躯 · 昼夜之神",
    color: "#be684b",
    description:
      "人面蛇身，赤色长躯隐入重重山影。静卧时如岩脉沉眠，抬首凝望，仿佛昼与夜在眼底交替。",
    traits: ["人面蛇身", "赤色鳞甲", "盘绕长躯"],
    appearance:
      "冷峻人面衔接粗壮蛇躯，暗赤鳞片沿脊背渐沉为黑褐。低矮背棘与磨损纹理保留古老质感，避免繁复装饰。",
    behavior:
      "长躯缓缓收紧，呼吸带动腹部起伏。苏醒时先抬颈，再转动面部凝视；尾部始终保持沉重而克制的摆动。",
    sound: "低频长吟、深沉鼻息与鳞片擦过岩面的细响。",
  },
  {
    id: "yinglong",
    name: "应龙",
    pinyin: "YÌNG LÓNG",
    alias: "有翼之龙",
    tier: "S",
    category: "龙蛇",
    habitat: "云海高崖",
    title: "苍青双翼 · 凌云之龙",
    color: "#80a6a1",
    description:
      "修长龙躯生出宽阔双翼，苍青鳞甲在云光中微明。收翼时沉稳如山，展翼时风从膜纹之间穿过。",
    traits: ["东方龙躯", "宽阔双翼", "角须长吻"],
    appearance:
      "修长颈尾与有力四肢相连，角、须、长吻保持东方龙形。双翼骨架清晰，薄翼膜呈灰金与苍青层次。",
    behavior:
      "落地时前肢承重，双翼缓慢折拢；起飞先压低重心，再以连续振翼抬升。滑翔中尾部微调方向。",
    sound: "悠长龙吟、翼面掠风与鳞甲轻擦的共鸣。",
  },
  {
    id: "xiangliu",
    name: "相柳",
    pinyin: "XIĀNG LIǓ",
    alias: "九首蛇怪",
    tier: "S",
    category: "龙蛇",
    habitat: "黑水沼泽",
    title: "九首分流 · 深泽之影",
    color: "#7f9b83",
    description:
      "九条颈首从深青蛇躯展开，各自凝望不同方向。水面只映出错落的轮廓，呼吸间暗流缓慢散开。",
    traits: ["九首蛇躯", "分首巡视", "深青毒纹"],
    appearance:
      "粗壮主躯支撑九条独立颈部，主首稍高，副首错落分布。黑绿鳞甲带暗紫斑纹，颈部褶皱与毒腺清晰可辨。",
    behavior:
      "九首以不同节律探查，避免整齐摆动。警觉时逐次抬高，形成扇面；身体推进时尾段带动水面起伏。",
    sound: "多声部蛇嘶、湿腔低鸣与疏落水滴。",
  },
  {
    id: "qiongqi",
    name: "穷奇",
    pinyin: "QIÓNG QÍ",
    alias: "有翼凶兽",
    tier: "S",
    category: "翼兽",
    habitat: "风蚀残垣",
    title: "虎形双翼 · 伏风而行",
    color: "#bd9568",
    description:
      "虎形躯体生有双翼，厚重肩背藏着蓄势的力量。低伏时羽翼贴紧脊线，抬眼便显出掠食者的警觉。",
    traits: ["虎形四足", "肩背生翼", "厚重胸腔"],
    appearance:
      "大型猫科骨架配以发达胸肩，灰褐毛皮间隐现深色斑纹。双翼贴合肩胛，头部保留猛兽自然的骨相。",
    behavior:
      "缓步嗅探，尾端轻摆。警戒时伏低前身、露齿，随后展开双翼；奔跑时肩胛与脊柱共同起伏。",
    sound: "猫科低吼、粗粝喉鸣与沉重翼风。",
  },
  {
    id: "paoxiao",
    name: "狍鸮",
    pinyin: "PÁO XIĀO",
    alias: "饕餮原型",
    tier: "S",
    category: "灵兽",
    habitat: "石坛山口",
    title: "羊身人面 · 腋目窥视",
    color: "#a28e72",
    description:
      "羊身与人面相接，虎齿隐于紧闭的口中。双目前移至腋下，抬起前肢时，那道注视才悄然显露。",
    traits: ["羊身人面", "目在腋下", "虎齿人手"],
    appearance:
      "厚实羊形身体覆粗短毛，面部保留人形骨相与明显虎齿。前肢末端似手，腋下双目构成最关键的辨识特征。",
    behavior:
      "低头觅食，呼吸牵动厚重胸腹。观察时抬起前肢，令腋下双目转向来者；移动短促，重心始终偏低。",
    sound: "沙哑羊鸣、胸腔低吼与深重吞咽声。",
  },
  {
    id: "dijiang",
    name: "帝江",
    pinyin: "DÌ JIĀNG",
    alias: "无面之神",
    tier: "S",
    category: "神祇",
    habitat: "暖雾空谷",
    title: "六足四翼 · 无面有形",
    color: "#cba369",
    description:
      "囊状身体不见面目，六足与四翼围绕温润的轮廓舒展。它以轻微脉动回应空谷，安静而难以揣度。",
    traits: ["无面目", "六足四翼", "囊状神躯"],
    appearance:
      "赭黄囊体表面有柔和褶皱和古老纹路，无眼、鼻、口。六足分布于身体下侧，四片短翼成对伸出。",
    behavior:
      "身体低低悬浮，四翼错落轻振，六足偶尔收拢。转向依靠整个体积的缓慢倾斜，情绪由脉动节律表达。",
    sound: "空腔震鸣、风箱般呼吸与有节律的低频脉冲。",
  },
  {
    id: "kaiming",
    name: "开明兽",
    pinyin: "KĀI MÍNG",
    alias: "九面守卫",
    tier: "S",
    category: "灵兽",
    habitat: "青铜山门",
    title: "虎身九首 · 静守山门",
    color: "#b39c68",
    description:
      "庞大的虎身承托九张人面，神情相近而目光各异。它静立于门前，只有颈首细微转动，巡视四方。",
    traits: ["虎身九首", "九首人面", "守门姿态"],
    appearance:
      "宽阔肩背承接九条短颈，九面保持统一的古朴骨相。体表以旧铜、暗金和石灰色形成沉稳层次。",
    behavior:
      "身体静止时九面分别观察，偶尔同时睁眼。行走缓慢，足掌落地有明确重量，尾巴随重心微摆。",
    sound: "多重低吟与虎类喉音交织，余音停留在石壁之间。",
  },
  {
    id: "bashe",
    name: "巴蛇",
    pinyin: "BĀ SHÉ",
    alias: "吞象之蛇",
    tier: "S",
    category: "龙蛇",
    habitat: "幽岩石林",
    title: "古鳞重躯 · 盘山之蛇",
    color: "#84928a",
    description:
      "粗壮蛇躯沿岩石盘绕，大片古鳞带着磨损的痕迹。原始而厚重的头部缓缓探出，舌信试探潮湿空气。",
    traits: ["巨蟒轮廓", "粗糙大鳞", "沉重盘绕"],
    appearance:
      "以粗壮巨蟒为基础，头部宽厚，口裂明显。黑褐与暗青鳞片粗粝交叠，腹部颜色稍浅，突出身体体积。",
    behavior:
      "盘踞时肌肉波动极慢，移动时腹鳞依次贴地推进。抬颈前会收紧盘圈，尾部保留稳定支点。",
    sound: "深长呼气、沙石拖曳与短促蛇嘶。",
  },
  {
    id: "heluoyu",
    name: "何罗鱼",
    pinyin: "HÉ LUÓ YÚ",
    alias: "一首十身",
    tier: "S",
    category: "水族",
    habitat: "深潭暗流",
    title: "一首十身 · 如水中花",
    color: "#78a2ab",
    description:
      "一个主首连接十条鱼身，冷色鳍膜在暗水中舒展。游动时分体错落起伏，仿佛水中开出一朵异花。",
    traits: ["一首十身", "分体波动", "半透鳍膜"],
    appearance:
      "主头集中于前端，十条鱼状躯体向后展开，各具尾鳍。乌青背鳞过渡至苍白腹部，薄鳍呈湿润半透明质感。",
    behavior:
      "主首先转向，十身随后以不同相位摆动。停驻时仅鳍膜轻颤；加速时分体向内收拢，保持整体流线。",
    sound: "水下低鸣、轻缓拍水与细密气泡。",
  },
  {
    id: "xingtian",
    name: "刑天",
    pinyin: "XÍNG TIĀN",
    alias: "无首之神",
    tier: "S",
    category: "神祇",
    habitat: "荒原石阙",
    title: "乳目脐口 · 执斧持盾",
    color: "#b68a66",
    description:
      "无首之躯仍然挺立，以双乳为目，以腹脐为口。斧与盾随呼吸轻晃，粗犷身形留住不屈的意志。",
    traits: ["无首巨人", "乳目脐口", "斧盾相持"],
    appearance:
      "身体厚重有力，岩土般肌肤留有岁月痕迹。胸前双目与腹部口腔清晰可辨，朴拙巨斧和古纹盾牌分持两侧。",
    behavior:
      "以胸眼注视前方，腰背带动沉稳转身。抬斧时先调整步伐和重心，落足、举盾都保留可感知的重量。",
    sound: "腹腔低吼、盾斧金属摩擦与沉重足音。",
  },
  {
    id: "xiwangmu",
    name: "西王母",
    pinyin: "XĪ WÁNG MǓ",
    alias: "上古神祇",
    tier: "S",
    category: "神祇",
    habitat: "高台风殿",
    title: "豹尾虎齿 · 蓬发戴胜",
    color: "#b3a087",
    description:
      "蓬发之下神情冷峻，虎齿与豹尾保留上古异神的野性。她立于高处，衣纹与发束随山风缓缓移动。",
    traits: ["人形豹尾", "虎齿蓬发", "上古威仪"],
    appearance:
      "高大人形配以冷厉面容、虎齿和明显豹尾。头饰简洁，衣着采用兽皮与质朴织物，保持原始祭祀气质。",
    behavior:
      "呼吸平稳，目光缓慢下移。转身时豹尾先行调整平衡，抬手动作克制，发束和衣摆稍后跟随。",
    sound: "低吟、隐约虎类喉音与风中的空谷回响。",
  },
  {
    id: "shuhu",
    name: "孰湖",
    pinyin: "SHÚ HÚ",
    alias: "人面翼马",
    tier: "S",
    category: "翼兽",
    habitat: "长风山脊",
    title: "马身鸟翼 · 蛇尾迎风",
    color: "#aeb5a6",
    description:
      "骏马般的身躯承接人面与鸟翼，蛇尾独自盘曲。它在山脊停步，前蹄轻点石面，羽毛顺风逐层展开。",
    traits: ["马身人面", "肩生鸟翼", "独立蛇尾"],
    appearance:
      "修长马躯、古朴人面与宽阔鸟翼形成统一轮廓。青灰短毛衔接深色羽片，蛇尾鳞片沿尾端逐渐细密。",
    behavior:
      "站立时轮换前蹄承重，蛇尾独立试探。奔跑带动长颈起伏，跃起时展开双翼，落地后再逐层收拢。",
    sound: "悠长嘶鸣、羽翼破风与蛇尾轻嘶。",
  },
  {
    id: "luwu",
    name: "陆吾",
    pinyin: "LÙ WÚ",
    alias: "九尾守卫",
    tier: "A",
    category: "灵兽",
    habitat: "玄岩神台",
    title: "虎身人面 · 九尾垂云",
    color: "#b39364",
    description:
      "人面虎身静伏于高台，九条长尾层叠铺开。抬首时尾端依次扬起，目光越过石阶，落向远处群山。",
    traits: ["虎身人面", "九尾层叠", "守护姿态"],
    appearance:
      "虎形躯干宽阔而结实，人面处理为古朴神像般骨相。九尾自臀部自然分出，以深浅错落的毛色区分层次。",
    behavior:
      "静伏时九尾轻缓交错，抬首巡视后逐渐展开。起身由前肢撑地开始，行走保持守卫般的沉稳节律。",
    sound: "虎吼、低沉共鸣与多尾扫风。",
  },
  {
    id: "bifang",
    name: "毕方",
    pinyin: "BÌ FĀNG",
    alias: "独足神鸟",
    tier: "A",
    category: "翼兽",
    habitat: "赤霞疏林",
    title: "独足长羽 · 一鸣入霞",
    color: "#c77559",
    description:
      "修长鸟躯以独足静立，羽色如余烬映着晚霞。颈部缓缓抬起，双翼舒展，细长羽尖随气流颤动。",
    traits: ["独足鸟形", "修长颈喙", "火色羽纹"],
    appearance:
      "轮廓修长，唯一的足稳稳承重。尖喙、长颈与层叠翼羽保持清晰比例，青灰羽色中点染赤红纹理。",
    behavior:
      "单足停栖时通过颈部和尾羽调整平衡。跃起后双翼同时下压，鸣叫前微抬头部，羽毛逐层抖开。",
    sound: "清亮长鸣、高处风声与柔和火焰般的气流。",
  },
  {
    id: "gudiao",
    name: "蛊雕",
    pinyin: "GǓ DIĀO",
    alias: "有角猛禽",
    tier: "A",
    category: "翼兽",
    habitat: "断崖枯林",
    title: "雕形有角 · 俯视寒林",
    color: "#92958e",
    description:
      "雕形猛禽的额上生角，密羽覆盖厚实肩背。它栖在断崖边缘，收紧利爪，细小转头也带着警戒。",
    traits: ["雕形有角", "宽翼利爪", "掠食鸟喙"],
    appearance:
      "强健猛禽骨架配深灰褐羽毛，头角从额部自然延伸。钩喙与利爪质感粗糙，翼羽由肩部向外逐层细长。",
    behavior:
      "停栖时身体不动，头部快速转向观察。起飞先蹬离支点，再张翼接风；收翼俯冲时尾羽负责转向。",
    sound: "短促尖啸、低沉喉鸣与羽面掠风。",
  },
  {
    id: "nine-tailed-fox",
    name: "九尾狐",
    pinyin: "JIǓ WĚI HÚ",
    alias: "九尾灵兽",
    tier: "A",
    category: "灵兽",
    habitat: "月白竹径",
    title: "九尾舒卷 · 回首无声",
    color: "#d1c5b0",
    description:
      "狐身轻巧，九尾如层叠云烟舒卷。缓步时尾端擦过薄雾，停下回首，耳尖先捕捉到远处的动静。",
    traits: ["狐身九尾", "层叠长毛", "轻步回首"],
    appearance:
      "修长口鼻、直立耳尖与轻盈四足保留狐形。九尾从尾根清晰分出，月白与浅灰毛色表现柔软的体积层次。",
    behavior:
      "沿直线轻步前行，转头时耳部先动，身体稍后跟随。九尾错落舒卷，警觉时收紧，放松时缓缓展开。",
    sound: "轻短狐鸣、细微气音与柔软扫风。",
  },
  {
    id: "fuzhu",
    name: "夫诸",
    pinyin: "FŪ ZHŪ",
    alias: "四角白鹿",
    tier: "A",
    category: "灵兽",
    habitat: "白沙浅泽",
    title: "白鹿四角 · 涉水听风",
    color: "#c4cfbd",
    description:
      "白鹿形体修长，四角在浅水倒影中交错。它抬首聆听，蹄边细小的涟漪散去，水泽又恢复了平静。",
    traits: ["白鹿轮廓", "四角分立", "水泽气质"],
    appearance:
      "白色鹿躯以淡灰阴影塑造肌肉和骨点。四支角有明确根部与分立轮廓，细长腿部和小巧蹄尖保持自然比例。",
    behavior:
      "静立时耳朵先转向声源，随后抬首。涉水动作轻缓，落蹄后短暂停顿；奔行时四肢舒展，角架稳定。",
    sound: "悠远鹿鸣、浅水轻响与空灵余音。",
  },
  {
    id: "yayu",
    name: "猰貐",
    pinyin: "YÀ YǓ",
    alias: "窫窳",
    tier: "A",
    category: "灵兽",
    habitat: "褐岩荒谷",
    title: "牛身异面 · 重步入谷",
    color: "#a1765e",
    description:
      "形貌存在不同描述，本图鉴取牛身人面的创作方向。厚重前躯缓缓俯低，呼吸推着肩背起伏，尘土停在蹄边。",
    traits: ["牛身人面", "厚重前躯", "强健四足"],
    appearance:
      "采用牛形身体与异化人面相结合的方案。褐色皮肤带粗毛和自然褶皱，宽额、厚颈与有力前肢突出重量。",
    behavior:
      "站立时后肢稳定支撑，前蹄偶尔刨地。转向先摆头，再带动肩背；冲行前压低重心，胸腹随步幅起伏。",
    sound: "深沉牛鸣、粗重喘息与兽类低吼。",
  },
  {
    id: "ranyiyu",
    name: "冉遗鱼",
    pinyin: "RǍN YÍ YÚ",
    alias: "六足蛇首鱼",
    tier: "A",
    category: "水族",
    habitat: "湿石溪岸",
    title: "蛇首鱼身 · 六足循水",
    color: "#83a798",
    description:
      "鱼身接着细长蛇首，六足从腹侧探出。它沿湿石缓慢移动，尾鳍仍留在水中，鳞面映出细碎波光。",
    traits: ["鱼身蛇首", "腹生六足", "两栖步态"],
    appearance:
      "鱼类主躯与蛇形头颈平滑相连，六足成三对分布腹侧。青灰鳞片和湿润鳍膜保留水生质感，脚趾清晰可辨。",
    behavior:
      "水中以尾部摆动推进，靠岸后由前足先行支撑。六足交替移动，蛇首探向前方，尾鳍随身体拖曳。",
    sound: "细碎气泡、湿滑摩擦与轻微蛇嘶。",
  },
  {
    id: "bingfeng",
    name: "并封",
    pinyin: "BÌNG FĒNG",
    alias: "双首猪兽",
    tier: "A",
    category: "灵兽",
    habitat: "苔地密林",
    title: "前后双首 · 厚躯踏苔",
    color: "#a18c79",
    description:
      "厚重猪形身体的前后各生一首，分别观察林间两端。双鼻拱动潮湿苔土，短足交替踏下，背鬃微微颤动。",
    traits: ["前后双首", "厚重猪身", "短足粗鬃"],
    appearance:
      "桶状猪身的前后各接一颗头颅，避免并排双头。粗硬背鬃、厚实口鼻与短而有力的四足构成朴实轮廓。",
    behavior:
      "两首分向嗅探，身体随当前前进方向调整重心。刨地时另一首保持警觉，行走短促，腹部有轻微惯性。",
    sound: "双重低哼、沉重鼻息与蹄爪翻动泥土的声音。",
  },
];

export const beasts: Beast[] = entries.map((beast, index) => ({
  ...beast,
  number: String(index + 1).padStart(2, "0"),
  model: `/models/${beast.id}.glb`,
  preview: `/previews/${beast.id}.png`,
}));
