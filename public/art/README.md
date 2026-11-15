# 고양이 일러스트 교체

코드로 그린 고양이 대신 직접 준비한 그림(PNG, 투명 배경)을 쓸 수 있습니다.

1. `public/art/cats/` 에 아래 이름으로 그림을 넣습니다. (`<id>`는 아래 표 참고)
   - `<id>-back.png` : 전투 화면 아래쪽에 서 있는 **뒷모습** (세로로 긴 그림, 발이 아래쪽 끝에 닿게)
   - `<id>-face.png` : 로비·도감용 **정면 얼굴** (정사각형 권장)
   - `<id>-card.png` : 스킬 카드 위로 튀어나오는 **전신/반신 그림**
   - 또는 **전신 일러스트 한 장**(`full`)만 넣고 얼굴 위치(`faceFocus`)를 적으면, 고양이 탭 전신 그림·스킬 카드 상반신·동그란 얼굴 아이콘을 그 한 장에서 자동으로 잘라 씁니다.
2. `public/art/manifest.json` 에 넣은 그림을 적습니다.

```json
{
  "cheese": ["back", "face", "card"],
  "cheesetabby": { "full": "cheesetabby-full.jpg", "face": "cheesetabby-full.jpg", "faceFocus": [0.476, 0.27, 0.16] }
}
```

`faceFocus` = [얼굴 중심 x 비율, 얼굴 중심 y 비율, 얼굴 반지름(가로 대비 비율)]. 파일 이름은 jpg/png 모두 됩니다.

### 그림 스타일 가이드 (치즈태비 일러스트 기준)
- 두 발로 선 의인화 고양이, 실제 털무늬를 살린 반실사 애니메이션 채색
- 교복 + 고양이 장난감·행동을 무기로 들고 있는 전투 자세
- 세로 9:20 정도 전신, 배경은 단순하게 (글씨는 넣지 않기)

없는 그림은 자동으로 코드로 그린 그림을 사용합니다.

| id | 고양이 |
| --- | --- |
| cheese | 치즈 (주인공, 반치즈 코숏) |
| godeungeo | 고등어 |
| huindungi | 흰둥이 |
| chaos | 카오스 |
| cheesetabby | 치즈태비 |
| tuxedo | 턱시도 |
| samsaek | 삼색이 |
| russianblue | 블루 (러시안 블루) |
| scottish | 폴드 (스코티시 폴드) |
| munchkin | 먼치 (먼치킨) |
| persian | 페르 (페르시안) |
| mainecoon | 쿤 (메인쿤) |
| siamese | 샴 |
