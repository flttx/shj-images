"""Persist explicit anatomy review separately from technical file readiness."""
import json
import pathlib

ROOT=pathlib.Path(__file__).resolve().parents[1]
REVIEWS={
    "zhulong":("pass","修正版：人面、无肢赤蛇、盘绕身躯通过；初版龙头未采用。"),
    "yinglong":("pass","东方有角长身、双翼、四肢、长尾通过。"),
    "nine-tailed-fox":("pass","白狐、九条分离扇形尾、四足；已查看正面与背面。"),
    "dijiang":("pass","参考图重建版：无面卵圆囊体、四翼、三对短足通过；原梨形四足版本废弃。"),
    "xiangliu":("pass","参考图重建版：上层七首、下侧两首，九条独立蛇颈及盘绕蛇身通过。"),
    "qiongqi":("pass","参考图重建版：四足虎身、双羽翼、真实虎脸通过；原直立虎人版本废弃。"),
    "paoxiao":("pass","参考图重建版：人面、山羊躯体、腋下双眼、人手前爪和獠牙通过；旧兽面肩眼版废弃。"),
    "kaiming":("pass","参考图重建版：横向四足虎躯、上层八个人面加低侧一个人面，共九首；旧直立虎人版废弃。"),
    "bashe":("pass","粗壮无肢巨蟒、宽阔原始头部、大块岩灰鳞片、盘绕体态通过。"),
    "heluoyu":("unverified","一首、多鱼身辐射结构已生成；十身准确数量尚待后视复核。"),
    "xiwangmu":("needs-revision","庄严女性、蓬发、原始祭服和背面豹尾通过；当前闭嘴未显露蓝图所要求的虎齿。"),
    "shuhu":("needs-revision","马身双鸟翼成立；当前仍为马脸，人面未生成，蛇尾特征也不足。"),
    "xingtian":("pass","Blender局部补全：双胸眼窝、内嵌眼球、虹膜、厚眼睑与脐口浅腔、唇舌粗牙；无头与斧盾保留。"),
    "luwu":("needs-revision","虎身、多尾成立，但人面生成成背上额外半身人像，未替代虎首；九尾数量也需再核。"),
    "gudiao":("pass","鹰雕体态、双角、利喙、双翼和猛禽爪通过。"),
    "ranyiyu":("needs-revision","鱼身鱼尾和多足已生成，但头部仍为鱼头而非蛇首，六足数量需再校正。"),
    "bifang":("needs-revision","一条长腿之外仍有第二条蜷缩短腿，待Blender局部移除。"),
    "fuzhu":("needs-revision","白鹿体态通过，当前仅双角，待Blender补为四角。"),
    "yayu":("needs-revision","重型牛身与凶兽体态通过；当前为牛脸，未实现本次采用的牛身人面版本。"),
    "bingfeng":("needs-revision","正背视已复核，当前仅单首野猪并保留猪尾，未生成前后双首。")
}

path=ROOT/"assets-manifest.json"
manifest=json.loads(path.read_text("utf-8"))
for slug,record in manifest.items():
    review=REVIEWS.get(slug,("unverified","技术文件已生成；尚未完成逐视图形态复核。"))
    record.update(anatomy=review[0],review=review[1])
    if slug=="yinglong" and (ROOT/"assets/animated/yinglong.glb").exists():
        record.update(animations=["Idle_Breath"],credits=75,
                      notes="HQ v3.1 detailed 4K PBR; web Meshopt/WebP 290015 triangles, 9011484 bytes. Tripo rig + Blender 8s skeletal Idle_Breath, seamless loop; no flight or walk clip. Failed retarget tasks refunded.")
path.write_text(json.dumps(manifest,ensure_ascii=False,indent=2),"utf-8")
(ROOT/"assets"/"anatomy-review.json").write_text(json.dumps({slug:{"anatomy":review[0],"review":review[1]} for slug,review in REVIEWS.items()},ensure_ascii=False,indent=2),"utf-8")
print(json.dumps({slug:record["anatomy"] for slug,record in manifest.items()}))
