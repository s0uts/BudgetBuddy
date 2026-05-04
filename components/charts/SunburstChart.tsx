import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, G, Circle, Text as SvgText } from 'react-native-svg';
import * as d3Hierarchy from 'd3-hierarchy';
import * as d3Shape from 'd3-shape';
import { Colors, Typography } from '@/lib/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_SIZE = Math.min(SCREEN_WIDTH - 32, 320);
const CENTER = CHART_SIZE / 2;
const INNER_RADIUS = CHART_SIZE * 0.18;
const OUTER_RADIUS = CHART_SIZE * 0.46;

export interface SunburstNode {
  name: string;
  value?: number;
  children?: SunburstNode[];
  color?: string;
}

interface SunburstChartProps {
  data: SunburstNode;
  selectedCategory?: string;
  onSelectCategory?: (name: string) => void;
  totalLabel?: string;
  totalValue?: string;
}

function buildArcPath(
  x0: number, x1: number,
  y0: number, y1: number,
  radius: number,
): string {
  const arc = d3Shape.arc<unknown, d3Shape.DefaultArcObject>();
  return arc({
    innerRadius: y0 * radius,
    outerRadius: y1 * radius,
    startAngle: x0 * 2 * Math.PI,
    endAngle: x1 * 2 * Math.PI,
  }) ?? '';
}

export function SunburstChart({
  data,
  selectedCategory,
  onSelectCategory,
  totalLabel = 'Spent',
  totalValue,
}: SunburstChartProps) {
  const nodes = useMemo(() => {
    const root = d3Hierarchy.hierarchy(data)
      .sum((d) => d.value ?? 0)
      .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

    const partition = d3Hierarchy.partition<SunburstNode>().size([1, 1]);
    partition(root);

    return root.descendants().slice(1); // skip root
  }, [data]);

  const colorPalette = Colors.chart;

  return (
    <View style={styles.container}>
      <Svg width={CHART_SIZE} height={CHART_SIZE}>
        <G x={CENTER} y={CENTER}>
          {nodes.map((node, i) => {
            // @ts-ignore — d3-hierarchy adds x0, x1, y0, y1 after partition
            const { x0, x1, y0, y1 } = node as { x0: number; x1: number; y0: number; y1: number };
            const depth = node.depth;
            const colorIndex = i % colorPalette.length;
            const baseColor = node.data.color ?? colorPalette[colorIndex];
            const isSelected = selectedCategory === node.data.name;
            const radius = OUTER_RADIUS;

            const d = buildArcPath(x0, x1, y0 * 0.35, y1 * 0.35, radius * 2.86);

            return (
              <Path
                key={`${node.data.name}-${i}`}
                d={d}
                fill={baseColor}
                stroke={Colors.background}
                strokeWidth={2}
                opacity={
                  selectedCategory && !isSelected ? 0.55 : 1
                }
                onPress={() => onSelectCategory?.(node.data.name)}
              />
            );
          })}
        </G>
        {/* Center label */}
        <G x={CENTER} y={CENTER}>
          <Circle r={INNER_RADIUS} fill={Colors.background} />
          {totalValue && (
            <>
              <SvgText
                textAnchor="middle"
                y={-8}
                fontSize={Typography.caption}
                fill={Colors.textSecondary}
                fontWeight="500"
              >
                {totalLabel}
              </SvgText>
              <SvgText
                textAnchor="middle"
                y={12}
                fontSize={Typography.subheading}
                fill={Colors.textPrimary}
                fontWeight="700"
              >
                {totalValue}
              </SvgText>
            </>
          )}
        </G>
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
