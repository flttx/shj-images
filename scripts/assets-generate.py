"""Reproducible HQ Tripo generation. CLI performs all blocking watch/download work."""
import concurrent.futures
import json
import pathlib
import shutil
import struct
import subprocess
import sys
import threading

ROOT = pathlib.Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
RECORDS = ASSETS / "records"
RECORDS.mkdir(parents=True, exist_ok=True)
for folder in ["models", "previews"]:
    (ROOT / "public" / folder).mkdir(parents=True, exist_ok=True)
LOCK = threading.Lock()
STYLE = " Photorealistic ancient Chinese creature, anatomical naturalism, detailed organic materials and weathering, PBR. Full body three-quarter pose, appendages separated, no pedestal, scenery, text, cartoon or armor."
PROMPTS = {
 "zhulong": "An ancient Chinese deity: a HUMAN MAN'S HEAD joined directly to a giant RED SNAKE BODY. The single head has an anatomically HUMAN MALE FACE, a flat short human nose, human lips, rounded human forehead, human eyes, human chin, high cheekbones, deep-set eyes and solemn expression. This is a HUMAN FACE, like a bald stern old man, absolutely NO animal muzzle, NO snout, NO horns, NO reptile head. Below the human head is one continuous thick LIMBLESS SERPENT body with dark crimson and black-red organic scales. Long thick red snake body rests in a loose open S coil, neck rises high, human face looking forward. Long tapering tail fully visible. NO arms, NO legs, NO wings, NO antlers, NO beard. Photorealistic human face attached to realistic red python body.",
 "yinglong": "Yinglong, ancient Chinese winged rain dragon: long sinuous EASTERN Chinese dragon body, four powerful clawed legs, TWO enormous clearly spread thin bat-membrane WINGS rooted at the shoulders. Long muzzle, elegant backward antler horns and two short whiskers, narrow dragon head. Long muscular tail curving behind. Standing quadruped pose, both wings half spread high and clearly separate from body. Weathered dark teal and blue-black scales, grey-gold underbelly and ridges, aged gold wing fingers with slate teal semi-translucent leathery membranes, subtle cloud motifs. Athletic slender Eastern dragon silhouette, realistic heavy scales and leathery wings, not a bulky western dinosaur.",
 "nine-tailed-fox": "Nine-tailed fox of Qingqiu, one realistic elegant white arctic fox with EXACTLY NINE distinct long luxuriant fluffy tails spreading in a clearly separated fan behind its body. Four slender fox legs, pointed ears, narrow alert face, small amber eyes, realistic dense ivory fur with subtle warm silver tips. Standing with head looking back slightly, all nine tails visible as individual curved tapered forms. Sacred wild animal, no clothes, no accessories.",
 "dijiang": "A SIX-LEGGED FOUR-WINGED HEADLESS primordial creature. Its entire body is a smooth fat horizontal OVAL of red-orange leathery flesh. EXACTLY SIX short legs in THREE DISTINCT PAIRS along the underside: front pair, middle pair, rear pair, like the layout of an insect. Each leg has one clawed foot, SIX FEET all distinctly visible. Exactly FOUR short feathered wings in two pairs on the upper sides. Absolutely NO HEAD, NO FACE, NO EYES, NO NOSE, NO MOUTH, no stem, no fruit. Uniform gently wrinkled warm vermilion organic skin, no spots or holes. Long horizontal oval body, six legs and four wings, photographed from a side three-quarter angle so all three pairs of legs can be counted. Ancient faceless spirit, realistic organic material.",
 "xiangliu": "Xiangliu, ancient Chinese nine-headed venom serpent. One enormous dark swamp-green and black-violet limbless coiled snake body with exactly NINE separate long curved snake necks branching from its thick front torso, each with its own fierce Eastern serpent head. Main central head higher and larger, eight smaller heads symmetrically dispersed in a broad clear fan. All nine distinct heads visible, narrow reptile heads with fangs and venom glands, not dragon horns. Rough wet scales, pale scarred belly. No wings and no limbs.",
 "qiongqi": "A photorealistic FOUR-LEGGED BENGAL TIGER with TWO bird wings attached to its back. Ordinary anatomically correct TIGER anatomy: horizontal spine, tiger head, front paws ON THE GROUND, hind paws ON THE GROUND, all FOUR paws supporting its weight. Full tiger body standing on ALL FOUR LEGS, like a real zoo tiger. Long feline tail. Huge dark eagle feathered wings half spread above the back. Orange brown fur with black stripes, realistic feline face with whiskers, amber eyes. Strictly a QUADRUPED ANIMAL, absolutely NO human body, NO human torso, NO arms, NO hands, NO biped, NO standing upright, NO armor. Side three-quarter view displaying the four grounded tiger paws and both wings clearly.",
 "paoxiao": "Paoxiao, ancient Chinese glutton beast. Massive stocky goat-bodied quadruped with shaggy dark brown coarse fur, a sinister archaic humanoid face and very long tiger fangs. Most distinctive: its TWO amber eyes are located in its armpits beneath the front shoulders, clearly visible; the face itself has no eyes. The front limbs terminate in powerful five-finger human-like clawed hands, rear limbs goat-like, two weathered ram horns. Hunched heavy body, forelegs slightly splayed to expose armpit eyes. No gore.",
 "kaiming": "Kaiming, guardian of Kunlun. A single enormous tiger body with four massive paws, worn charcoal and old bronze-gold striped fur, and exactly NINE distinct human-faced heads clustered on nine short necks in three tiers at the shoulders. Main central stern archaic deity face larger, other eight ancient human faces clearly visible, solemn varied expressions. All nine heads have human facial anatomy and short coarse dark hair, not tiger faces. Monumental guardian pose, long tiger tail, no wings.",
 "bashe": "Bashe, elephant-swallowing colossal primordial python. One extremely thick heavy limbless snake, massive broad primitive python head and wide jaw, small deep gold eyes. Huge dark slate and black-brown weathered scales, scuffed pale stone-grey belly plates. Powerful enormous body in a loose low coil, head raised modestly, thick tapering tail separated. Ancient naturalistic rock-like skin, no dragon horns, no legs, no wings, no prey.",
 "heluoyu": "Heluoyu of Shan Hai Jing: an aquatic mythological fish with exactly ONE large fish HEAD at the front connecting to TEN separate long fish-shaped bodies and tails radiating backwards from one shared neck hub. Ten distinct fish bodies each end with its own translucent tail fin, clearly spread out as a branching fan. One fish face only with two eyes and wide fish mouth. Wet cold slate blue scales, pale underbellies, dark teal back, delicate translucent grey-blue fins. No legs, no octopus tentacles.",
 "xingtian": "Xingtian, headless ancient Chinese warrior god. Massive rugged muscular humanoid giant with absolutely NO HEAD or neck above his broad shoulders. TWO fierce eyes replace his nipples on the upper chest and a large closed mouth is situated on his abdomen at the navel. Weathered earthen bronze skin and ancient scars. Carries a huge primitive bronze battle axe in right hand and rectangular battered bronze shield in left. Rough hide skirt around waist, thick bare legs and feet, aggressive grounded standing pose. Torso face visible. No gore.",
 "xiwangmu": "Xiwangmu in her ORIGINAL archaic Shan Hai Jing form: tall imposing mature female deity with stern human face, visible sharp tiger canine teeth, wild voluminous dark hair, small primitive carved jade hair ornament, and a long clearly visible spotted LEOPARD TAIL curving behind her. Clawed hands, rough layered dark hide and woven ritual garments covering body, worn bronze details. Proud upright grounded stance, solemn wild mountain goddess, realistic face and primitive clothing, not a modern beauty or imperial queen.",
 "shuhu": "Shuhu of Shan Hai Jing, one tall powerful horse body with four horse legs and hooves, a solemn HUMAN FACE on the horse neck, two large feathered bird wings spread out from the shoulders, and a long scaled SERPENT TAIL ending in a small snake head, curling visibly beside the hind legs. Ivory grey horse coat, ancient bronze feather edges, black mane, naturalistic mythical hybrid anatomy, no rider, no tack.",
 "luwu": "Luwu, divine Kunlun guardian with huge realistic tiger body, four muscular tiger paws, ONE solemn ancient HUMAN FACE on the neck, and exactly NINE long striped tiger tails clearly separated into a sweeping broad fan behind. Charcoal and amber-brown tiger fur, weathered human deity face with heavy brows and amber eyes, nine individually visible slender furry tails, majestic standing guard pose, no wings.",
 "bifang": "Bifang, one-legged ancient Chinese fire bird. Tall elegant crane-like bird with EXACTLY ONE long sturdy LEG placed centrally beneath its body, one foot with three toes, two beautiful partly spread long feathered wings, long curved neck, narrow white beak. Deep blue-green plumage with vivid cinnabar-red flame-like markings and bronze feather edging, long elegant tail feathers, realistic bird anatomy. Absolutely only one leg, no second leg, no flame scenery.",
 "gudiao": "Gudiao, a massive horned predatory eagle from Shan Hai Jing. Realistic powerful dark eagle body, TWO distinct curved weathered black horns emerging above its fierce eyes, hooked heavy ivory beak, powerful raptor feet and talons, broad dark charcoal feathered wings half spread. Rust-brown breast and old gold feather edges, rough scales on feet, alert perched upright pose without perch or base. Horned eagle, not mammal.",
 "fuzhu": "Fuzhu, sacred white deer with exactly FOUR elegant antlers rising from four distinct bases on its head, two front and two back, all clearly visible. One realistic slender white deer, four long legs, pale ivory short fur, soft silver fur on neck, dark reflective eyes, moist black nose, translucent pale jade-white antlers with delicate natural branches. Quiet alert standing pose, pristine graceful wetland spirit, no wings, no accessories.",
 "yayu": "Yayu of Shan Hai Jing using the ox-bodied human-faced version: enormous muscular bull body with four powerful hooved legs, reddish brown rough hide and heavy black mane, one fierce archaic HUMAN FACE with broad nose and deep-set amber eyes replacing the bull face, two short curved thick black horns. Long bovine tail. Low aggressive stance with neck and chest powerful, rugged ancient sacred beast, no wings.",
 "ranyiyu": "Ranyiyu of Shan Hai Jing, amphibious monster with one large realistic scaled FISH BODY, a long narrow SNAKE HEAD with reptile eyes and forked tongue, and exactly SIX short sturdy clawed LEGS arranged three per side below the fish body. Thick fish torso covered in pale slate and teal iridescent scales, distinct broad translucent fish tail fin, small dorsal fin. Six limbs clearly separated in crawling stance, snake head looking ahead, no additional heads.",
 "bingfeng": "Bingfeng, archaic two-headed boar. One huge stocky coarse-furred dark brown boar body on four stout hoofed legs with TWO BOAR HEADS at OPPOSITE ENDS: one head facing forward at the front, the second head facing backward where a tail would be. No tail. Both heads have heavy snouts, ivory tusks and alert small eyes. Rough black-brown bristles, mud weathered skin, compact heavy charging body, show both heads clearly in side three-quarter pose. Not two heads side by side."
}

def write_manifest(slug, record):
    with LOCK:
        file = ROOT / "assets-manifest.json"
        manifest = json.loads(file.read_text("utf-8")) if file.exists() else {}
        manifest[slug] = record
        file.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), "utf-8")

def generate(slug, reference=None):
    assert len(PROMPTS[slug] + STYLE) <= 1024, "Tripo prompt limit"
    previous = json.loads((ROOT/"assets-manifest.json").read_text("utf-8")).get(slug,{}) if (ROOT/"assets-manifest.json").exists() else {}
    previous_credits = previous.get("credits",0)
    if previous_credits:
        for suffix in [".stdout.json", ".stderr.log", ".prompt.txt", ".plan.json"]:
            path=RECORDS/(slug+suffix)
            if path.exists(): shutil.copy2(path,RECORDS/(slug+".previous"+suffix))
    args = ["npx.cmd", "tripo-cli@latest", "make", str(reference) if reference else PROMPTS[slug] + STYLE,
            "--model", "tripo-v3.1", "-p", "geometry_quality=detailed", "-p", "texture_quality=detailed",
            "-p", "texture=true", "-p", "pbr=true", "--name", "SHJ_HQ_" + slug + ("_reference" if reference else ""),
            "-o", "./assets", "--json", "--yes"]
    record = {"model": "/models/"+slug+".glb", "preview": "/previews/"+slug+".png", "status":"pending", "animations":[], "credits":previous_credits, "notes":"HQ v3.1 detailed geometry + detailed PBR; generation pending"}
    write_manifest(slug, record)
    (RECORDS / (slug+".prompt.txt")).write_text("IMAGE REFERENCE: "+str(reference) if reference else PROMPTS[slug]+STYLE, "utf-8")
    dry = subprocess.run(args + ["--dry-run"], cwd=ROOT, capture_output=True, text=True, encoding="utf-8")
    (RECORDS / (slug+".plan.json")).write_text(dry.stdout, "utf-8")
    if dry.returncode:
        record.update(status="failed", notes="Dry-run validation failed: "+dry.stderr[-600:])
        write_manifest(slug, record)
        return {"slug":slug,"status":"failed","phase":"dry-run"}
    print(json.dumps({"slug":slug,"status":"submitting"}), flush=True)
    out_file = RECORDS / (slug+".stdout.json")
    err_file = RECORDS / (slug+".stderr.log")
    with out_file.open("w", encoding="utf-8") as stdout, err_file.open("w", encoding="utf-8") as stderr:
        result = subprocess.run(args, cwd=ROOT, stdout=stdout, stderr=stderr)
    result_text = out_file.read_text("utf-8")
    error_text = err_file.read_text("utf-8")
    if result.returncode:
        record.update(status="failed", notes="CLI exit "+str(result.returncode)+": "+error_text[-700:])
        write_manifest(slug, record)
        return {"slug":slug,"status":"failed","exit":result.returncode}
    data = json.loads(result_text.strip().splitlines()[-1])
    model = pathlib.Path(data["model_file"])
    if not model.is_absolute(): model = ROOT/model
    header = model.read_bytes()[:12]
    if header[:4] != b"glTF" or struct.unpack("<I",header[4:8])[0] != 2:
        raise ValueError("Invalid GLB: "+str(model))
    shutil.copy2(model, ROOT/"public"/"models"/(slug+".glb"))
    if data.get("preview"):
        preview=pathlib.Path(data["preview"])
        if not preview.is_absolute(): preview=ROOT/preview
        shutil.copy2(preview, ROOT/"public"/"previews"/(slug+".png"))
    record.update(status="ready", credits=previous_credits+data.get("credits_consumed",0), notes="HQ Tripo v3.1 detailed geometry + detailed PBR. GLB header validated; visual anatomy review pending.")
    write_manifest(slug,record)
    return {"slug":slug,"status":"ready","task_id":data.get("task_id"),"credits":record["credits"],"bytes":model.stat().st_size}

if __name__ == "__main__":
    if sys.argv[1:2]==["--image"]:
        print(json.dumps(generate(sys.argv[2],sys.argv[3])),flush=True)
        sys.exit(0)
    selected = sys.argv[1:]
    if not selected:
        raise SystemExit("Choose explicit slugs; generation spends Tripo credits. Use --image SLUG PATH for a reference rebuild.")
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        for future in concurrent.futures.as_completed([pool.submit(generate,slug) for slug in selected]):
            print(json.dumps(future.result()),flush=True)
