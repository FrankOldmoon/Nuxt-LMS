import { describe, it, expect } from 'vitest'
import { indexNavItems } from '../../app/composables/useNavigation'

describe('indexNavItems', () => {
  it('returns empty array for empty input', () => {
    expect(indexNavItems([])).toEqual([])
  })

  it('adds sequential index to flat items', () => {
    const items = [
      { label: 'A' },
      { label: 'B' },
      { label: 'C' },
    ]
    const result = indexNavItems(items)
    expect(result.map(i => i.label)).toEqual(['1 A', '2 B', '3 C'])
  })

  it('adds hierarchical index to nested items', () => {
    const items = [
      {
        label: 'Parent',
        children: [
          { label: 'Child 1' },
          { label: 'Child 2' },
        ],
      },
    ]
    const result = indexNavItems(items)
    expect(result[0].label).toBe('1 Parent')
    expect(result[0].children![0].label).toBe('1.1 Child 1')
    expect(result[0].children![1].label).toBe('1.2 Child 2')
  })

  it('adds three-level index for deeply nested items', () => {
    const items = [
      {
        label: 'L1',
        children: [
          {
            label: 'L2',
            children: [
              { label: 'L3a' },
              { label: 'L3b' },
            ],
          },
        ],
      },
    ]
    const result = indexNavItems(items)
    expect(result[0].label).toBe('1 L1')
    expect(result[0].children![0].label).toBe('1.1 L2')
    expect(result[0].children![0].children![0].label).toBe('1.1.1 L3a')
    expect(result[0].children![0].children![1].label).toBe('1.1.2 L3b')
  })

  it('skips first item when skipFirst is true', () => {
    const items = [
      { label: 'Course' },
      { label: 'Chapter 1' },
      { label: 'Chapter 2' },
    ]
    const result = indexNavItems(items, '', true)
    expect(result[0].label).toBe('Course')
    expect(result[1].label).toBe('1 Chapter 1')
    expect(result[2].label).toBe('2 Chapter 2')
  })

  it('skips first item but still indexes its children when skipFirst is true', () => {
    const items = [
      {
        label: 'Course',
        children: [
          { label: 'A' },
          { label: 'B' },
        ],
      },
      {
        label: 'Other',
        children: [
          { label: 'C' },
        ],
      },
    ]
    const result = indexNavItems(items, '', true)
    expect(result[0].label).toBe('Course')
    expect(result[0].children![0].label).toBe('1 A')
    expect(result[0].children![1].label).toBe('2 B')
    expect(result[1].label).toBe('1 Other')
    expect(result[1].children![0].label).toBe('1.1 C')
  })

  it('supports custom prefix', () => {
    const items = [
      { label: 'A' },
      { label: 'B' },
    ]
    const result = indexNavItems(items, '2', false)
    expect(result[0].label).toBe('2.1 A')
    expect(result[1].label).toBe('2.2 B')
  })

  it('preserves other item properties', () => {
    const items = [
      { label: 'A', to: '/a', icon: 'i-lucide-a' },
    ]
    const result = indexNavItems(items)
    expect(result[0].label).toBe('1 A')
    expect(result[0].to).toBe('/a')
    expect(result[0].icon).toBe('i-lucide-a')
  })

  it('handles multiple top-level items with children', () => {
    const items = [
      {
        label: 'First',
        children: [{ label: 'A' }],
      },
      {
        label: 'Second',
        children: [{ label: 'B' }],
      },
    ]
    const result = indexNavItems(items)
    expect(result[0].label).toBe('1 First')
    expect(result[0].children![0].label).toBe('1.1 A')
    expect(result[1].label).toBe('2 Second')
    expect(result[1].children![0].label).toBe('2.1 B')
  })

  it('does not mutate original items', () => {
    const items = [
      { label: 'A' },
      { label: 'B' },
    ]
    const result = indexNavItems(items)
    expect(items[0].label).toBe('A')
    expect(result[0].label).toBe('1 A')
  })
})
