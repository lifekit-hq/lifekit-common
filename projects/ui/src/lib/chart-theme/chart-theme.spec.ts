import {type Type} from '@angular/core';
import {type ComponentFixture, TestBed} from '@angular/core/testing';
import {Chart} from 'chart.js';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

import {AreaChartComponent} from '../components/area-chart/area-chart.component';
import {BarChartComponent} from '../components/bar-chart/bar-chart.component';
import {DonutChartComponent} from '../components/donut-chart/donut-chart.component';
import {LineChartComponent} from '../components/line-chart/line-chart.component';
import {ThemeService} from '../services/theme/theme.service';

const TEXT_TOKEN = '--color-text-secondary';
const LIGHT_TEXT = 'rgb(71, 78, 81)';
const DARK_TEXT = 'rgb(181, 190, 193)';

interface ChartCase {
  name: string;
  component: Type<unknown>;
  input: string;
  data: unknown;
  /** The colour a chart draws its text with: axis ticks, or the legend where there is no axis. */
  textColor: (chart: Chart) => unknown;
}

const POINTS = [
  {label: 'Jan', value: 100},
  {label: 'Feb', value: 120},
];
const SERIES = [{label: 'Banking', points: POINTS}];

const CASES: ChartCase[] = [
  {
    name: 'area',
    component: AreaChartComponent,
    input: 'series',
    data: SERIES,
    textColor: chart => chart.options.scales?.['y']?.ticks?.color,
  },
  {
    name: 'bar',
    component: BarChartComponent,
    input: 'series',
    data: SERIES,
    textColor: chart => chart.options.scales?.['y']?.ticks?.color,
  },
  {
    name: 'line',
    component: LineChartComponent,
    input: 'data',
    data: POINTS,
    textColor: chart => chart.options.scales?.['y']?.ticks?.color,
  },
  {
    name: 'donut',
    component: DonutChartComponent,
    input: 'segments',
    data: [
      {label: 'Banks', value: 400},
      {label: 'Crypto', value: 100},
    ],
    textColor: chart => chart.options.plugins?.legend?.labels?.color,
  },
];

describe('charts follow a live theme change', () => {
  const root = document.documentElement;
  let theme: ThemeService;

  beforeEach(() => {
    localStorage.clear();
    root.style.setProperty(TEXT_TOKEN, LIGHT_TEXT);
    theme = TestBed.inject(ThemeService);
    theme.setTheme('light');
  });

  afterEach(() => {
    theme.resetSeed();
    localStorage.clear();
    root.style.removeProperty(TEXT_TOKEN);
    root.removeAttribute('data-theme');
  });

  function mount(testCase: ChartCase): ComponentFixture<unknown> {
    const fixture = TestBed.createComponent(testCase.component);
    fixture.componentRef.setInput(testCase.input, testCase.data);
    fixture.detectChanges();
    return fixture;
  }

  function chartOf(fixture: ComponentFixture<unknown>): Chart {
    return Chart.getChart(fixture.nativeElement.querySelector('canvas')) as Chart;
  }

  /** What the CSS tokens do when `data-theme` flips: the same property resolves to a new value. */
  function flipTokens(): void {
    root.style.setProperty(TEXT_TOKEN, DARK_TEXT);
  }

  describe.each(CASES)('$name chart', testCase => {
    it('rebuilds with the new token values when the theme flips', () => {
      const fixture = mount(testCase);
      const before = chartOf(fixture);
      expect(testCase.textColor(before)).toBe(LIGHT_TEXT);

      flipTokens();
      theme.setTheme('dark');
      fixture.detectChanges();

      const after = chartOf(fixture);
      expect(after).not.toBe(before);
      expect(testCase.textColor(after)).toBe(DARK_TEXT);
    });

    it('rebuilds when the seed colour changes', () => {
      const fixture = mount(testCase);
      const before = chartOf(fixture);

      theme.setSeed('#cc3366');
      fixture.detectChanges();

      expect(chartOf(fixture)).not.toBe(before);
    });

    it('keeps the same chart when nothing about the theme changed', () => {
      const fixture = mount(testCase);
      const before = chartOf(fixture);

      theme.setTheme('light');
      fixture.detectChanges();

      expect(chartOf(fixture)).toBe(before);
    });
  });
});
