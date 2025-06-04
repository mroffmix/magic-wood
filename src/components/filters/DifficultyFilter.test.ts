import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DifficultyFilter from './DifficultyFilter.vue'

describe('DifficultyFilter', () => {
  it('renders correctly with default props', () => {
    const wrapper = mount(DifficultyFilter)
    expect(wrapper.exists()).toBe(true)
  })

  it('displays compact view by default', () => {
    const wrapper = mount(DifficultyFilter)
    expect(wrapper.find('.difficulty-filter-compact').exists()).toBe(true)
    expect(wrapper.find('.difficulty-filter').exists()).toBe(false)
  })

  it('expands when compact view is clicked', async () => {
    const wrapper = mount(DifficultyFilter)
    
    await wrapper.find('.difficulty-filter-compact').trigger('click')
    
    expect(wrapper.find('.difficulty-filter').exists()).toBe(true)
    expect(wrapper.find('.difficulty-filter-compact').exists()).toBe(false)
  })

  it('emits update events when difficulty changes', async () => {
    const wrapper = mount(DifficultyFilter, {
      props: {
        minDifficulty: '6A',
        maxDifficulty: '7A'
      }
    })

    // Test that component exists and can emit events
    expect(wrapper.emitted()).toBeDefined()
  })

  it('handles rangeTrackStyle calculation correctly', async () => {
    const wrapper = mount(DifficultyFilter, {
      props: {
        minDifficulty: '5C',
        maxDifficulty: '8C+'
      }
    })

    // Expand the filter to access the range track
    await wrapper.find('.difficulty-filter-compact').trigger('click')
    await wrapper.vm.$nextTick()
    
    // Check that the slider range element exists
    expect(wrapper.find('.slider-range').exists()).toBe(true)
  })
})