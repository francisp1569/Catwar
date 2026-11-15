# 고양이 일러스트 교체

코드로 그린 고양이 대신 직접 준비한 그림(PNG, 투명 배경)을 쓸 수 있습니다.

1. `public/art/cats/` 에 아래 이름으로 그림을 넣습니다. (`<id>`는 아래 표 참고)
   - `<id>-back.png` : 전투 화면 아래쪽에 서 있는 **뒷모습** (세로로 긴 그림, 발이 아래쪽 끝에 닿게)
   - `<id>-face.png` : 로비·도감용 **정면 얼굴** (정사각형 권장)
   - `<id>-card.png` : 스킬 카드 위로 튀어나오는 **전신/반신 그림**
2. `public/art/manifest.json` 에 넣은 그림을 적습니다.

```json
{
  "cheese": ["back", "face", "card"],
  "godeungeo": ["face"]
}
```

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
