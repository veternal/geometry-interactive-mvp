// @vitest-environment happy-dom
import { describe, expect, it, beforeAll } from 'vitest';
import { mount } from '@vue/test-utils';
import App from '../App.vue';

/**
 * 渲染冒烟测试（V2 §10.3 的可执行部分）。
 *
 * 这里不替代真实浏览器，只保证：
 *  - 组件树能挂载，没有运行时异常
 *  - 关键区块（题目、步骤、画布、状态面板、提示条）都渲染出来
 *  - 文本里不出现 NaN / Infinity / undefined
 */

beforeAll(() => {
  // KaTeX 在 happy-dom 下不需要布局，但会读 window 上的度量接口
  if (!window.matchMedia) {
    (window as unknown as Record<string, unknown>).matchMedia = () => ({
      matches: false,
      media: '',
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    });
  }
});

describe('App 渲染', () => {
  it('挂载后包含题目、步骤、画布、状态面板', () => {
    const wrapper = mount(App, { attachTo: document.body });
    const text = wrapper.text();

    expect(text).toContain('椭圆');
    expect(text).toContain('分步解析');
    expect(text).toContain('当前数学状态');
    expect(wrapper.find('svg').exists()).toBe(true);

    // 题目三选一标签
    expect(wrapper.findAll('button.tab').length).toBe(3);

    wrapper.unmount();
  });

  it('第一题默认显示"题目条件相容"与 Σ = 2 的位置', () => {
    const wrapper = mount(App, { attachTo: document.body });
    const text = wrapper.text();
    expect(text).toContain('题目条件相容');
    expect(text).toContain('跳到 Σ = 2 的位置');
    wrapper.unmount();
  });

  it('页面文本不出现 NaN / Infinity / undefined', () => {
    const wrapper = mount(App, { attachTo: document.body });
    expect(wrapper.text()).not.toMatch(/NaN|Infinity|undefined/);
    wrapper.unmount();
  });

  it('切换到 P(0,2) 题后，明确原条件无有效解', async () => {
    const wrapper = mount(App, { attachTo: document.body });
    const tabs = wrapper.findAll('button.tab');
    await tabs[1].trigger('click');
    await wrapper.vm.$nextTick();

    const text = wrapper.text();
    expect(text).toContain('原条件无有效解');
    expect(text).toContain('y = 2 仅为越过定义域后得到的退化形式候选');
    expect(text).not.toContain('条件仅在被退化的情形下成立');
    expect(text).not.toContain('跳到 Σ = 2 的位置');

    const steps = wrapper.findAll('.steps .item');
    await steps[steps.length - 1].trigger('click');
    await wrapper.vm.$nextTick();
    expect(wrapper.text()).toContain('公式推导要求 m²≠4');
    expect(wrapper.find('.katex-error').exists()).toBe(false);
    wrapper.unmount();
  });

  it('切换到立体几何题后，画布变成三棱/四棱锥且提示"数据不满足"', async () => {
    const wrapper = mount(App, { attachTo: document.body });
    const tabs = wrapper.findAll('button.tab');
    await tabs[2].trigger('click');
    await wrapper.vm.$nextTick();

    const text = wrapper.text();
    expect(text).toContain('当前题面数据不满足该条件');
    expect(text).toContain('Experimental');
    expect(text).toContain('AE · DP');
    wrapper.unmount();
  });
});
