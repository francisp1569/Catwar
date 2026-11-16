# 냥냥 방위대 적·배경·요소 일러스트 프롬프트

고양이 캐릭터([PROMPTS.md](PROMPTS.md))와 같은 그림체로 **적, 전투 배경, 전투 요소, 아이콘**을 만드는 프롬프트입니다.
블록 안의 영어 프롬프트를 그대로 복사해서 그림 생성 AI에 붙여 넣으면 됩니다.

## 사용법
1. **치즈(혜옹이) 앞모습 그림을 참고 이미지로 함께 넣으면** 선 굵기·채색이 맞춰집니다.
2. 적·소품·아이콘은 **배경을 단색(#DEDEDE 연회색)** 으로 받습니다. 배경은 제가 지웁니다.
3. 여러 개를 한 장에 그리는 "시트" 프롬프트는 칸이 반듯하게 나뉘어 있어야 자르기 쉽습니다. 칸이 어긋나면 하나씩 따로 뽑아도 됩니다.
4. 다 만든 그림은 파일 이름 없이 보내셔도 됩니다. 그림을 보고 제가 맞춰 넣습니다.

### 우선순위 (게임에서 눈에 띄는 순서)
| 순서 | 묶음 | 개수 | 게임에서 쓰이는 곳 |
| --- | --- | --- | --- |
| 1 | 적 6종 (A) | 6장 | 전투 화면, 도감 |
| 2 | 전투 배경 4곳 (B) | 4장 | 전투 화면 바닥, 로비 미리보기 |
| 3 | 바리케이드·집주인 소녀·로봇청소기 (C) | 3~4장 | 전투 화면 아래쪽 |
| 4 | 재화·상자·장비·스킬 아이콘 (D) | 시트 여러 장 | 로비, 카드, 결과 화면 |
| 5 | 로비·지도 배경 (E) | 2장 | 로비 |
| 선택 | 추가 적 후보 (A-2) | 4장 | 새 스테이지용 |

### 공통 스타일 문구
모든 프롬프트 끝에 이미 들어가 있습니다. 직접 새 프롬프트를 쓸 때만 붙이세요.
```
Thick clean black line art, cel shading with soft highlights, vivid colors, cute but mischievous game-character design, same style as the attached orange tabby cat illustration.
```

---

## ⚡ 원샷 프롬프트 (한 번에 다 뽑기)

아래 블록 **하나만 통째로** 붙여 넣으면 시트 3장(적·소품 / 배경 4곳 / 아이콘)이 나옵니다.
치즈(혜옹이) 그림을 참고 이미지로 함께 넣어 주세요.
그림 AI가 한 번에 1장만 만들면 "다음 시트" 라고 보내면 이어서 만듭니다.
결과가 뭉개진 칸이 있으면 그 칸만 아래 개별 프롬프트(A~E)로 다시 뽑으면 됩니다.

```
Create 3 separate images for a cute mobile tower-defense game where anthropomorphic school-uniform cats defend a girl's house from a gang of bugs and mice called the "Squeak Bandits".
Match the art style of the attached orange tabby cat illustration exactly: thick clean black line art, cel shading with soft highlights, vivid colors, cute anime game style.
Every cell must be clearly separated in a clean even grid with generous empty space, each item fully inside its cell, nothing cut off. No text, no labels, no numbers, no watermark anywhere.

IMAGE 1 — CHARACTER & PROP SHEET. Square 1:1, a clean 4x4 grid of equal cells, plain flat light grey background (#DEDEDE), no ground shadows.
Enemies are cute but mischievous villains, seen from slightly above in front 3/4 view, walking toward the viewer.
Row 1: (1) tiny dark-brown ant henchman with red bandana carrying a kibble piece; (2) chubby grey mouse thief with black bandit eye mask, striped shirt and a sack of stolen cheese; (3) glossy reddish-brown cockroach speedster with goggles and a flapping red scarf, running; (4) skinny grey mosquito with big red eyes, pilot cap and a needle nose like a rapier, flying.
Row 2: (5) round fuzzy purple spider sniper with a small witch hat and a web slingshot; (6) BOSS: huge fat grey rat king with a crooked gold crown, red royal cape, cheese medallion and a giant fork scepter, drawn larger to fill its cell; (7) metallic-green housefly with chef bandana rubbing its hands; (8) stocky brown mouse soldier with bottle-cap helmet and tin-lid shield.
Row 3: (9) BOSS: armored cockroach general with military cap, antenna moustache and toothpick sword; (10) BOSS: elegant black-violet spider queen with silver tiara and lace web cape; (11) round white robot vacuum seen from above with cute LED face and little cat ears; (12) sticky white spider web ball projectile and a small web splat.
Row 4: (13)(14)(15) the same 10-year-old Korean girl, chest-up, brown low pigtails, pink ribbon, yellow cat-ear hoodie hugging a cushion — (13) happy cheering, (14) worried biting lip, (15) crying with big tears; (16) a short horizontal barricade of colorful cushions, cardboard boxes with paw prints and stacked books.

IMAGE 2 — BATTLE BACKGROUNDS. Wide 9:5, four equal tall vertical panels side by side (each panel 9:20 portrait), thin white gaps between panels, no characters.
Each panel is a top-down floor view seen from above at a slight angle: the top 8% is a wall with exactly three dark arched mouse holes evenly spaced left, center and right; the middle 75% is floor with the center left EMPTY and props only along the left and right edges; the bottom 17% is plain warm wooden floor.
Panel 1 entrance hall: cream wallpaper, beige stone tiles, shoe rack, sneakers, umbrella, doormat, warm afternoon light.
Panel 2 living room: mint wallpaper, honey wood floor with a round rug, sofa corner, TV stand with cobwebs, potted plant, cat toys.
Panel 3 kitchen: white tiled wall, blue-and-white checkered floor, sink cabinets, fridge side, trash bin with spilled wrappers, cat food bowl.
Panel 4 attic: slanted plank wall with cobwebs, old dark floorboards, boxes, old trunk, stacked books, moonbeam from a round window, moody purple-blue light.

IMAGE 3 — ICON SHEET. Square 1:1, a clean 6x6 grid of equal cells, plain flat light grey background (#DEDEDE), bold readable silhouettes with glossy highlights.
Row 1: gold coin with a paw stamp; blue tuna can; pink yarn ball; closed wooden chest with paw lock; open chest spilling golden light and coins; golden royal chest with cat crown emblem.
Rows 2-6 are round colorful badge icons, one bold item in the center of each:
Row 2: twin toy pistols with paw grips; round cardboard scratching-post shield; pink yarn ball with trailing thread; three claw slash marks; cat exercise wheel; jingle bell ball.
Row 3: grooming brush; feather fishing-rod cat wand; bread loaf shaped like a sitting cat; pair of cat paws with claws out; pink microphone with music notes; giant fluffy cat paw punch.
Row 4: red laser pointer with beam; churu treat tube bomb with a fuse; toy mouse boomerang; fur-ball trap; static electricity spark on fur; soft cushion shield with paw print.
Row 5: pouncing leopard-spotted paw; water spray bottle; cotton collar; red collar with silver bell; pearl collar; golden collar with treat-shaped gem.
Row 6: wool beanie; pink ribbon headband; toy mouse plush; feather wand; fluffy cushion; golden tuna bowl.
```

---

## A. 적 캐릭터 (현재 게임에 있는 6종)

**공통 설정**: 고양이들의 집을 노리는 **"찍찍 도적단"**. 개미·바퀴·모기·거미는 도적단의 졸개, 대왕쥐가 두목입니다.
무섭기보다는 **얄밉고 귀여운 악당**으로 만듭니다.

**공통 구도**: 적은 화면 위에서 아래로 걸어 내려옵니다. 그래서 **약간 위에서 내려다본 정면 3/4 시점, 보는 사람 쪽으로 걸어오는 모습**이 필요합니다.
정사각형 1:1, 몸 전체가 잘리지 않게, 단색 배경입니다.

### A1. 개미 (가장 약한 졸개, 떼로 몰려옴)
```
Game enemy sprite, square 1:1, full body, seen from slightly above in front 3/4 view, walking toward the viewer.
Character: a tiny dark-brown ant henchman with a big round head, red bandana tied on the head, oversized shiny eyes with a sneaky grin, six thin legs mid-step, small antennae.
Carrying a stolen cat kibble piece over its shoulder.
Thick clean black line art, cel shading with soft highlights, vivid colors, cute but mischievous game-character design.
Plain flat light grey background (#DEDEDE), no shadow on the ground, no text, no watermark.
```

### A2. 생쥐 (기본 근접 적)
```
Game enemy sprite, square 1:1, full body, seen from slightly above in front 3/4 view, walking toward the viewer on two legs.
Character: a chubby grey house mouse thief with pink ears, pink nose and long pink tail, black bandit eye mask, striped black-and-white thief shirt, small cloth sack of stolen cheese on its back, cheeky buck-tooth smirk.
Thick clean black line art, cel shading with soft highlights, vivid colors, cute but mischievous game-character design.
Plain flat light grey background (#DEDEDE), no shadow on the ground, no text, no watermark.
```

### A3. 바퀴벌레 (빠르게 달려오는 적)
```
Game enemy sprite, square 1:1, full body, seen from slightly above in front 3/4 view, dashing toward the viewer very fast.
Character: a glossy reddish-brown cockroach speedster, long wavy antennae, aviator goggles pushed up on the head, a tiny red scarf flapping behind, legs blurred from running, cocky grin.
Speed lines behind the body.
Thick clean black line art, cel shading with soft highlights, vivid colors, cute but mischievous game-character design.
Plain flat light grey background (#DEDEDE), no shadow on the ground, no text, no watermark.
```

### A4. 모기 (날아오는 적)
```
Game enemy sprite, square 1:1, full body, seen from slightly above in front 3/4 view, flying toward the viewer.
Character: a skinny grey-striped mosquito with big translucent wings, huge red compound eyes, long needle nose like a tiny rapier, wearing a small pilot cap, dangling thin legs, sly laughing face.
Thick clean black line art, cel shading with soft highlights, vivid colors, cute but mischievous game-character design.
Plain flat light grey background (#DEDEDE), no shadow on the ground, no text, no watermark.
```

### A5. 거미 (멀리서 거미줄을 쏘는 적)
```
Game enemy sprite, square 1:1, full body, seen from slightly above in front 3/4 view, facing the viewer.
Character: a round fuzzy dark purple spider sniper with eight legs, cluster of glossy violet eyes, small purple witch-like hat, holding a slingshot made of web strands loaded with a sticky web ball, smug expression.
Thick clean black line art, cel shading with soft highlights, vivid colors, cute but mischievous game-character design.
Plain flat light grey background (#DEDEDE), no shadow on the ground, no text, no watermark.
```

### A6. 대왕쥐 (보스)
```
Game boss enemy sprite, square 1:1, full body, seen from slightly above in front 3/4 view, stomping toward the viewer.
Character: a huge fat grey rat king, scar over one eye, pink ears, crooked golden crown, red royal cape with white fur trim, gold chain necklace with a big cheese medallion, holding a giant fork as a scepter, menacing but comical grin with big yellow front teeth.
Powerful heavy pose, dust puffs at the feet.
Thick clean black line art, cel shading with soft highlights, vivid colors, cute but mischievous game-character design.
Plain flat light grey background (#DEDEDE), no shadow on the ground, no text, no watermark.
```

### (선택) 맞는 모습
6종을 다 만든 뒤 여유가 있으면, 같은 대화에서 아래 문장을 이어서 보내 **맞아서 찡그린 표정**을 만들어 주세요. 피격 연출이 훨씬 살아납니다.
```
Same character, same angle and size, now getting hit: eyes squeezed shut in a dizzy cartoon wince, body flinching backward, small stars around the head. Plain flat light grey background (#DEDEDE), no text.
```

---

## A-2. 추가 적 후보 (선택 · 새 스테이지나 엘리트 적으로 쓸 수 있음)

### 파리 (부엌 · 무리 비행)
```
Game enemy sprite, square 1:1, full body, seen from slightly above in front 3/4 view, buzzing toward the viewer.
Character: a chubby metallic-green housefly with big red eyes, tiny chef bandana, rubbing its front hands together greedily, translucent wings.
Thick clean black line art, cel shading with soft highlights, vivid colors, cute but mischievous game-character design.
Plain flat light grey background (#DEDEDE), no shadow on the ground, no text, no watermark.
```

### 쥐 방패병 (튼튼한 적)
```
Game enemy sprite, square 1:1, full body, seen from slightly above in front 3/4 view, marching toward the viewer.
Character: a stocky brown mouse soldier wearing a bottle-cap helmet, holding a dented tin-can lid as a shield in front, determined frown, pink tail.
Thick clean black line art, cel shading with soft highlights, vivid colors, cute but mischievous game-character design.
Plain flat light grey background (#DEDEDE), no shadow on the ground, no text, no watermark.
```

### 바퀴 장군 (부엌 보스)
```
Game boss enemy sprite, square 1:1, full body, seen from slightly above in front 3/4 view, facing the viewer.
Character: a giant armored cockroach general, shiny dark-brown shell like plate armor, military cap with a gold badge, long curled antenna moustache, wielding a toothpick like a sword, four arms crossed and on hips.
Thick clean black line art, cel shading with soft highlights, vivid colors, cute but mischievous game-character design.
Plain flat light grey background (#DEDEDE), no shadow on the ground, no text, no watermark.
```

### 거미 여왕 (다락방 보스)
```
Game boss enemy sprite, square 1:1, full body, seen from slightly above in front 3/4 view, facing the viewer.
Character: a large elegant black-and-violet spider queen, eight legs spread wide, glowing pink eyes, tiny silver tiara, lace web cape, weaving a web between her front legs, haughty smile.
Thick clean black line art, cel shading with soft highlights, vivid colors, cute but mischievous game-character design.
Plain flat light grey background (#DEDEDE), no shadow on the ground, no text, no watermark.
```

---

## B. 전투 배경 (4곳)

**공통 구도 (중요)**: 게임 화면은 세로입니다. 그림 하나가 전투 화면 전체 바닥이 됩니다.
- 비율 **세로 9:20** (예: 1080×2400)
- **맨 위 약 8%**: 벽. 벽 아래쪽에 **쥐구멍 3개**를 왼쪽·가운데·오른쪽에 같은 간격으로 둡니다. 적이 여기서 나옵니다.
- **가운데 약 75%**: 바닥. 적이 걸어 내려오는 공간이라 **가운데는 비워 두고** 소품은 가장자리에만 둡니다.
- **맨 아래 약 17%**: 집 안쪽 바닥 (바리케이드와 고양이들이 이 위에 그려지니 단순하게).
- 캐릭터, 바리케이드, 글자는 넣지 않습니다.

### B1. 현관 (St.1~3)
```
Top-down game battle background, vertical 9:20, seen from above at a slight angle, no characters.
Location: the entrance hall of a cozy Korean apartment. Top edge: cream wallpaper wall with a white baseboard and three dark arched mouse holes evenly spaced left, center and right.
Middle: light beige stone tile floor, mostly empty open space in the center. Along the left and right edges only: a shoe rack, scattered sneakers and slippers, an umbrella, a doormat.
Bottom strip: warm wooden floor step up into the house, simple.
Warm afternoon light. Thick clean line art, cel shading, vivid cozy colors, cute anime game style. No text, no watermark.
```

### B2. 거실 (St.4~6)
```
Top-down game battle background, vertical 9:20, seen from above at a slight angle, no characters.
Location: a cozy living room. Top edge: mint green wallpaper wall with a white baseboard and three dark arched mouse holes evenly spaced left, center and right.
Middle: honey-colored wooden floor with a large soft round rug, mostly empty open space in the center. Along the left and right edges only: corner of a sofa, a TV stand with cobwebs behind it, a potted plant, scattered cat toys and a feather wand.
Bottom strip: warm wooden floor, simple.
Soft daylight. Thick clean line art, cel shading, vivid cozy colors, cute anime game style. No text, no watermark.
```

### B3. 부엌 (St.7~9)
```
Top-down game battle background, vertical 9:20, seen from above at a slight angle, no characters.
Location: a home kitchen. Top edge: white tiled kitchen wall with a baseboard and three dark arched mouse holes evenly spaced left, center and right.
Middle: blue-and-white checkered vinyl floor, mostly empty open space in the center. Along the left and right edges only: lower cabinets under the sink, the side of a fridge, a trash bin with spilled wrappers, a cat food bowl, a few crumbs.
Bottom strip: warm wooden floor, simple.
Bright kitchen light. Thick clean line art, cel shading, vivid cozy colors, cute anime game style. No text, no watermark.
```

### B4. 다락방 (St.10 · 보스)
```
Top-down game battle background, vertical 9:20, seen from above at a slight angle, no characters.
Location: a dusty attic. Top edge: slanted wooden plank wall with three dark arched mouse holes evenly spaced left, center and right, cobwebs in the corners.
Middle: old dark wooden floorboards with dust, mostly empty open space in the center. Along the left and right edges only: cardboard boxes, an old trunk, a broken lamp, stacked books, a small round window letting in a beam of moonlight.
Bottom strip: warmer wooden floor, simple.
Dim moody purple-blue lighting with warm accents. Thick clean line art, cel shading, cute anime game style. No text, no watermark.
```

---

## C. 전투 요소

### C1. 바리케이드 (가로로 긴 한 줄)
화면 아래에 가로로 길게 깔립니다. 체력이 줄면 금이 간 버전으로 바꿀 수 있게 **멀쩡한 것 / 부서진 것** 두 장을 만듭니다.
```
Game prop, very wide horizontal strip, aspect ratio 4:1, front view from slightly above.
A cute homemade barricade wall built by cats: a tight row of fluffy colorful cushions (pink, sky blue, yellow), cardboard boxes with paw prints, stacked books, a folded blanket, all pushed together side by side in one straight line filling the whole width.
Thick clean black line art, cel shading, vivid cozy colors, cute anime game style.
Plain flat light grey background (#DEDEDE), no text, no watermark.
```
```
Same barricade, same size and layout, but badly damaged: torn cushions with stuffing coming out, dented crushed boxes, scattered pages, scratch marks and small holes. Plain flat light grey background (#DEDEDE), no text.
```

### C2. 집주인 소녀 (바리케이드 뒤에서 응원)
고양이들이 지키는 사람입니다. 얼굴 위주의 작은 그림이라 **상반신**이면 충분합니다. 같은 대화에서 표정 3개를 이어서 만드세요.
```
Game character bust portrait, square 1:1, chest-up, facing the viewer.
A cheerful 10-year-old Korean girl with brown hair in two low pigtails, pink ribbon, big sparkling eyes, oversized cozy yellow hoodie with cat ears on the hood, hugging a cushion, happy smile cheering.
Thick clean black line art, cel shading with soft highlights, vivid colors, cute anime game style.
Plain flat light grey background (#DEDEDE), no text, no watermark.
```
```
Same girl, same angle and size, now worried: eyebrows raised, biting her lip, clutching the cushion tightly. Plain flat light grey background (#DEDEDE), no text.
```
```
Same girl, same angle and size, now crying: big tears, mouth wide open wailing. Plain flat light grey background (#DEDEDE), no text.
```

### C3. 로봇청소기 (지원 공격)
```
Game prop sprite, square 1:1, seen from directly above at a slight angle.
A round white robot vacuum cleaner with a cute face on the display (happy LED eyes), two little cat ears stuck on top, spinning side brushes, a small blue light ring, slightly worn with a cat paw sticker.
Thick clean black line art, cel shading, vivid colors, cute anime game style.
Plain flat light grey background (#DEDEDE), no text, no watermark.
```

### C4. 적 투사체·흔적 (시트 1장)
```
Game effect sprite sheet, square 1:1, a clean 2x2 grid with equal cells and generous empty space between items, all on plain flat light grey background (#DEDEDE).
Cell 1: a sticky white spider web ball projectile with trailing strands.
Cell 2: a flat sticky spider web splat on the floor seen from above.
Cell 3: a green slime splat stain on the floor seen from above.
Cell 4: a small poof dust cloud with a few stars.
Thick clean black line art, cel shading, cute anime game style. No text, no watermark.
```

---

## D. 아이콘

**공통**: 정사각형, 칸이 반듯한 격자, 칸 사이 여백 넉넉하게, 단색 배경. 아이콘 하나하나가 **작게 줄여도 알아보기 쉬운 굵은 실루엣**이어야 합니다.

### D1. 재화·상자 (시트 1장)
```
Game icon sprite sheet, square 1:1, a clean 3x2 grid with equal cells and generous empty space between icons, plain flat light grey background (#DEDEDE).
Row 1: a shiny gold coin stamped with a cat paw; a blue tuna can with a fish label; a ball of pink yarn.
Row 2: a wooden treasure chest with a paw-print lock (closed); the same chest open with golden light and coins spilling; a golden royal chest with a cat crown emblem.
Bold readable silhouettes, thick clean black line art, cel shading, glossy highlights, cute anime game icon style. No text, no watermark.
```

### D2. 장비 (부위별 시트 6장 · 각 4등급)
게임 장비는 6부위 × 4등급(N·R·SR·SSR)입니다. **한 부위당 한 장**, 왼쪽에서 오른쪽으로 갈수록 화려하게 만듭니다.
아래 블록의 `{부위 설명}` 부분만 바꿔서 6번 생성하세요.
```
Game equipment icon sheet, wide 4:1, a clean row of 4 equal cells with generous space between, plain flat light grey background (#DEDEDE).
From left to right the same item type gets fancier: common (plain), rare (blue accents), epic (purple accents with sparkles), legendary (gold with glowing aura).
Items: {부위 설명}
Bold readable silhouettes, thick clean black line art, cel shading, cute anime game icon style. No text, no watermark.
```
| 부위 | `{부위 설명}`에 넣을 문장 |
| --- | --- |
| 목걸이 | `cat collars - a plain cotton collar; a red collar with a silver bell; a pearl collar; a golden collar with a churu-treat-shaped gem pendant.` |
| 모자 | `cat headwear - a knitted wool beanie; a pink ribbon headband; a hoodie hood with cat ears; a small jeweled crown headband.` |
| 장난감 | `cat toys - a crumpled paper ball; a grey toy mouse plush; a feather wand; an automatic laser toy robot.` |
| 방석 | `cat beds - a folded towel cushion; a fluffy microfiber cushion; a cozy cat cave bed; a cloud-shaped cat tower.` |
| 밥그릇 | `cat food bowls - a plastic bowl; a ceramic bowl with a fish pattern; an automatic feeder; a golden tuna buffet bowl overflowing with tuna.` |
| 방울 | `bells - a small brass bell; a silver bell; a four-leaf-clover lucky bell; a lucky beckoning cat (maneki-neko) bell.` |

### D3. 스킬 아이콘 (고양이 무기 20개 · 시트 2장)
레벨업 카드에 들어갈 아이콘입니다. 10개씩 두 장으로 나눕니다.
```
Game skill icon sheet, wide 5:2, a clean 5x2 grid of equal round badge icons with generous space between, plain flat light grey background (#DEDEDE).
Each icon is a round badge with a colorful background and one bold item in the center:
1 twin toy pistols with a paw grip, 2 a round cardboard scratching-post shield, 3 a pink yarn ball, 4 three claw slash marks, 5 a cat exercise wheel,
6 a jingle bell ball, 7 a grooming brush, 8 a feather fishing-rod cat wand, 9 a loaf of bread shaped like a sitting cat, 10 a pair of cat paws with claws out.
Bold readable silhouettes, thick clean black line art, cel shading, glossy highlights, cute anime game icon style. No text, no numbers, no watermark.
```
```
Game skill icon sheet, wide 5:2, a clean 5x2 grid of equal round badge icons with generous space between, plain flat light grey background (#DEDEDE).
Each icon is a round badge with a colorful background and one bold item in the center:
1 a pink microphone with music notes, 2 a giant fluffy cat paw punch, 3 a red laser pointer dot with beam, 4 a churu treat tube bomb with a fuse, 5 a toy mouse boomerang,
6 a fur-ball trap, 7 a static electricity spark on fur, 8 a soft cushion shield with paw print, 9 a pouncing leopard-spotted paw, 10 a water spray bottle.
Bold readable silhouettes, thick clean black line art, cel shading, glossy highlights, cute anime game icon style. No text, no numbers, no watermark.
```

---

## E. 로비·지도 배경

### E1. 로비 배경
로비 화면 뒤에 은은하게 깔립니다. 글자·버튼이 올라가니 너무 복잡하지 않게 만듭니다.
```
Game lobby background, vertical 9:20, no characters.
A cozy girl's bedroom at dusk seen from the inside: a bed with cat plushies, a window with a pink-purple sunset sky, a tall cat tower, fairy lights, cat posters on the wall, a toy box.
Soft blurred depth, slightly dark purple tone overall so that UI on top stays readable.
Thick clean line art, cel shading, cute anime game style. No text, no watermark.
```

### E2. 지도 (집 전체 단면도)
지도 탭에서 스테이지 길을 그 위에 표시합니다.
```
Game world map, vertical 9:16, cute cross-section dollhouse view of a two-story Korean house, no characters.
From bottom to top: the entrance hall with shoes, the living room with a sofa and TV, the kitchen with a fridge and sink, and the dusty attic under the roof at the very top.
A winding dotted path connects the rooms from the entrance at the bottom up to the attic, with small round empty stage markers along it.
Night sky with stars around the house. Thick clean line art, cel shading, vivid cozy colors, cute anime game style. No text, no numbers, no watermark.
```
