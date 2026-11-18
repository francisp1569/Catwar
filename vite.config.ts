import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  // 그림 파일 이름은 그대로라 브라우저가 예전 그림을 기억할 수 있다: 빌드마다 바뀌는 꼬리표를 붙인다
  define: { __ART_V__: JSON.stringify(Date.now().toString(36)) },
});
