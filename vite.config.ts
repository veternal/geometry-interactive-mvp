import { defineConfig } from 'vitest/config';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  plugins: [vue()],
  server: {
    host: '127.0.0.1',
    port: 5273,
  },
  build: {
    // 本机有 safe-delete 拦截，清空已有 outDir 会被拒绝，因此不复用旧目录。
    // 后果：旧 hash 产物会残留，部署时按 index.html 引用取文件即可。
    outDir: 'build',
    emptyOutDir: false,
  },
  test: {
    environment: 'node',
    include: ['src/test/**/*.spec.ts'],
  },
});
