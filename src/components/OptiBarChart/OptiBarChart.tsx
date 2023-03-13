import { AxisLeft, AxisBottom } from "@visx/axis";
import { localPoint } from "@visx/event";
import { Grid } from "@visx/grid";
import { Group } from "@visx/group";
import { Line } from "@visx/shape";
import { scaleBand, scaleLinear, scaleOrdinal } from "@visx/scale";
import { BarStack } from "@visx/shape";
import { SeriesPoint } from "@visx/shape/lib/types";
import { defaultStyles, useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { quantize } from 'd3-interpolate';
import { interpolateRainbow } from 'd3-scale-chromatic';
import { LegendOrdinal, LegendItem, LegendLabel } from '@visx/legend';
import { get } from 'lodash';
import React, { useEffect, useRef } from "react";

function groupBy(xs: any[], f: (item: any) => any) {
    return xs.reduce((r, v, i, a, k = f(v)) => ((r[k] || (r[k] = [])).push(v), r), {});
}

interface BarData {
    category: string,
    count: number
};

interface StackBarData {
    category: string,
    stackData: BarData[];
};

export interface OptiBarChart {
    width: number,
    height: number,
    data: any[],
    stackCategory: string,
    xAxisCategory: string,
    events?: boolean,
    maxLine?: number
};

type TooltipData = {
    bar?: SeriesPoint<StackBarData>;
    key: string;
    index: number;
    color: string;
    stringValue?: string;
};

let tooltipTimeout: number;

export default function OptiBarChart({ width, height, data, xAxisCategory, events = false, stackCategory, maxLine }: OptiBarChart) {
    const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, hideTooltip, showTooltip } = useTooltip<TooltipData>();
    const [xAxisValues, setXAxisValues] = React.useState<string[]>([] as string[]);
    const [chartData, setChartData] = React.useState<any[]>([] as any[]);
    const [xCategory, setXCategory] = React.useState('');
    const [stackCategoryField, setStackCategoryField] = React.useState([] as string[]);
    const [aggregatedData, setAggregatedData] = React.useState([] as any[])
    const margin = { top: 40, right: 200, bottom: 150, left: 0 };
    const xOffset = 30;
    const [xMax, setXMax] = React.useState(0);
    const [yMax, setYMax] = React.useState(0);
    const [colors, setColors] = React.useState([] as string[]);

    React.useEffect(() => {
        setXMax(width);
        setYMax(height - margin.top - 50);
    }, [width, height]);

    const { containerRef, TooltipInPortal } = useTooltipInPortal({
        scroll: true,
    });

    const categoryTotals = React.useMemo(() => {
        return aggregatedData.reduce((allTotals, currentCategory) => {
            const categoryTotal = stackCategoryField.reduce((catItemTotal, k) => {
                catItemTotal += Number(currentCategory[k]);
                return catItemTotal;
            }, 0);
            allTotals.push(categoryTotal);
            return allTotals;
        }, [] as number[]);
    }, [aggregatedData, stackCategoryField, xCategory]);

    const scaleXAxis = React.useMemo(() => scaleBand({
        domain: xAxisValues,
        range: [0, xMax - margin.left - margin.right]
    }), [xAxisValues, xMax, xCategory]);

    const colorMap = useRef<Record<string, string> | undefined>();

    // creates a custom color scale with 150 colors
    const customColorScale = scaleOrdinal<string>({
        range: quantize(interpolateRainbow, 10),
    });

    function getColorForString(str: string): string {
        // lodash get
        const checkString = str.toLowerCase()
        const existingColor = colorMap.current?.[checkString];
        if (existingColor) {
            return existingColor;
        }

        // Calculate a hash code for the input string
        let hash = 0;
        for (let i = 0; i < checkString.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }

        const color = customColorScale(hash.toString());

        // Store the color in the color map and return it
        colorMap.current = { ...colorMap.current, [checkString]: color } as Record<string, string>;

        return color as string;
    }

    useEffect(() => {
        setColors(stackCategoryField.map((category: string) => getColorForString(category)));
    }, [stackCategoryField]);


    // Generate an array of colors using a color scale
    const colorScale = React.useMemo(() => scaleOrdinal({
        domain: xAxisValues,
        range: colors as string[],
    }), [xAxisValues, xCategory, colors]);

    // Generate an array of colors using a color scale
    // const dataColorScale = React.useMemo(() => scaleOrdinal({
    //     domain: aggregatedData,
    //     range: aggregatedData.map(d => getColorForString(d.name)),
    // }), [xAxisValues, xCategory, colors]);

    const scaleYAxis = React.useMemo(() => {
        const categoryTotalMax = categoryTotals.sort((a: any, b: any) => (a < b ? -1 : 1)).at(-1) || 0;
        const maxLineVal = maxLine ? maxLine + 10 : 10;
        return scaleLinear<number>({
            domain: [0, categoryTotalMax > maxLineVal ? categoryTotalMax : maxLineVal],
            range: [yMax, 0],
            nice: true
        })
    }, [yMax, aggregatedData, stackCategoryField, xCategory, maxLine]);

    const getUniqueValues = (data: any[], propertyName: string): string[] => {
        const propertyValues = data.map(item => get(item, propertyName));
        return Array.from(new Set(propertyValues));
    };

    React.useLayoutEffect(() => {
        setXCategory(xAxisCategory);
    }, [xAxisCategory]);

    React.useLayoutEffect(() => {
        const stackCategoryValues = getUniqueValues(chartData, stackCategory);
        setStackCategoryField(stackCategoryValues);
    }, [chartData, stackCategory]);

    React.useLayoutEffect(() => {
        const groupedData = groupBy(chartData || [], (item) => get(item, xCategory));
        const newData = Object.keys(groupedData).sort().map((key) => {
            let stackCats = stackCategoryField.reduce((acc, curr) => ({ ...acc, [curr]: 0 }), {}) as any;
            groupedData[key].forEach((dataObj: any) => {
                stackCats[get(dataObj, stackCategory)] = (stackCats[get(dataObj, stackCategory)] || 0) + 1;
            });
            return { category: key, ...stackCats };
        });
        setAggregatedData(newData);
        let values = [""];
        if (xCategory === 'status') {
            values = ["submitted", "running", "stopped", "cancelled", "error", "done"];
        } else {
            values = [...new Set(chartData.map(item => get(item, xCategory, 'unknown').toString()))].sort();
        }
        setXAxisValues(values);
    }, [chartData, xCategory, stackCategoryField]);

    React.useEffect(() => {
        setChartData(data);
    }, [data]);

    return width < 10 || aggregatedData.length == 0 ? null : (
        <div style={{ position: 'relative' }}>
            <svg ref={containerRef} width={xMax} height={height > 0 ? height : 0}>
                <rect x={0} y={0} width={xMax} height={height > 0 ? height : 0} fill={'#efefef'} rx={14} />
                <Grid
                    top={margin.top}
                    left={margin.left + xOffset}
                    xScale={scaleXAxis}
                    yScale={scaleYAxis}
                    width={xMax - margin.right}
                    height={yMax > 0 ? yMax : 0}
                    stroke='black'
                    strokeOpacity={0.1}
                    xOffset={scaleXAxis.bandwidth() / 2}
                    rowTickValues={Array.from({ length: yMax }, (_, i) => i + 1)}
                />
                <Group top={margin.top}>
                    <Line
                        x1={margin.top}
                        y1={scaleYAxis(maxLine || 0)}
                        x2={xMax - 175}
                        y2={scaleYAxis(maxLine || 0)}
                        stroke="#1976d2"
                        strokeWidth={3}
                        strokeDasharray="50 4"
                        strokeOpacity={0.3}
                        onMouseLeave={() => {
                            tooltipTimeout = window.setTimeout(() => {
                                hideTooltip();
                            }, 300);
                        }}
                        onMouseOver={(event) => {
                            if (tooltipTimeout) clearTimeout(tooltipTimeout);
                            // TooltipInPortal expects coordinates to be relative to containerRef
                            // localPoint returns coordinates relative to the nearest SVG, which
                            // is what containerRef is set to in this example.
                            const eventSvgCoords = localPoint(event);
                            showTooltip({
                                tooltipData: { key: 'Maximum Concurrent Jobs', index: -1, color: '#1976d2', stringValue: maxLine?.toString() },
                                tooltipTop: eventSvgCoords?.y,
                                tooltipLeft: eventSvgCoords?.x
                            });
                        }}
                    />
                    <BarStack
                        data={aggregatedData}
                        keys={stackCategoryField}
                        x={(item) => (item.category)}
                        xScale={scaleXAxis}
                        yScale={scaleYAxis}
                        // fill='gray'
                        color={colorScale}
                    >
                        {(barStacks) =>
                            barStacks.map((barStack) =>
                                barStack.bars.map((bar) => (
                                    <rect
                                        key={`bar-stack-${barStack.index}-${bar.index}`}
                                        x={bar.x + (bar.width / 4) + xOffset}
                                        y={bar.y}
                                        height={bar.height > 0 ? bar.height : 0}
                                        width={bar.width / 2}
                                        fill={getColorForString(bar.key)}
                                        onClick={() => {
                                            if (events) alert(`clicked: ${JSON.stringify(bar)}`);
                                        }}
                                        onMouseLeave={() => {
                                            tooltipTimeout = window.setTimeout(() => {
                                                hideTooltip();
                                            }, 300);
                                        }}
                                        onMouseMove={(event) => {
                                            if (tooltipTimeout) clearTimeout(tooltipTimeout);
                                            // TooltipInPortal expects coordinates to be relative to containerRef
                                            // localPoint returns coordinates relative to the nearest SVG, which
                                            // is what containerRef is set to in this example.
                                            const eventSvgCoords = localPoint(event);
                                            const left = bar.x + bar.width / 2;
                                            showTooltip({
                                                tooltipData: bar,
                                                tooltipTop: eventSvgCoords?.y,
                                                tooltipLeft: eventSvgCoords?.x,
                                            });
                                        }}
                                    />
                                )),
                            )
                        }
                    </BarStack>
                    <AxisLeft
                        scale={scaleYAxis}
                        label={'Count'}
                        numTicks={10}
                        tickFormat={value => value.toLocaleString()}
                        left={xOffset}
                    />
                </Group>
                <AxisBottom
                    top={height - 50}
                    left={margin.left + xOffset}
                    scale={scaleXAxis}
                    stroke={'black'}
                    tickStroke={'black'}
                    tickLabelProps={() => ({
                        fill: 'black',
                        fontSize: 11,
                        textAnchor: 'middle',
                    })}
                />
            </svg>
            <div
                style={{
                    position: 'absolute',
                    right: 0,
                    top: '40px',
                }}
            >
                <LegendOrdinal scale={colorScale} labelFormat={(label) => `${label}`}>
                    {(labels) => (
                        <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', width: '150px' }}>
                            {labels.filter(l => !['submitted', 'running', 'stopped', 'cancelled', 'error', 'done'].includes(l.text.toLowerCase())).map((label, i) => (
                                <LegendItem
                                    key={`legend-quantile-${i}`}
                                    margin="0 5px"
                                    style={{ display: 'flex', flexDirection: 'row', columnGap: '0.5rem', alignItems: 'flex-start', overflow: 'hidden' }}
                                    onClick={() => {
                                        if (events) alert(`clicked: ${JSON.stringify(label)}`);
                                    }}
                                >
                                    <div>
                                        <svg width={15} height={15} style={{ margin: '2px 0' }}>
                                            <rect
                                                fill={getColorForString(label.text || 's')}
                                                height={15}
                                                width={15}
                                            />
                                        </svg>
                                    </div>
                                    <LegendLabel style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {label.text}
                                    </LegendLabel>
                                </LegendItem>
                            ))}
                        </div>
                    )}
                </LegendOrdinal>
            </div >
            {tooltipOpen && tooltipData && (
                <TooltipInPortal top={tooltipTop} left={tooltipLeft} style={defaultStyles}>
                    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                        <div style={{ color: getColorForString(tooltipData.key), marginBottom: '0.5rem' }}>
                            <strong>{tooltipData.key}</strong>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '5rem' }}>
                            {tooltipData.bar ? get(tooltipData.bar.data, tooltipData.key) : tooltipData.stringValue}
                        </div>
                    </div>
                </TooltipInPortal>
            )}
        </div >
    );
}