import { AxisBottom } from "@visx/axis";
import { localPoint } from "@visx/event";
import { Grid } from "@visx/grid";
import { Group } from "@visx/group";
import { scaleBand, scaleLinear, scaleOrdinal } from "@visx/scale";
import { BarStack } from "@visx/shape";
import { SeriesPoint } from "@visx/shape/lib/types";
import { defaultStyles, useTooltip, useTooltipInPortal } from "@visx/tooltip";
import { get } from 'lodash';
import React from "react";

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
    events?: boolean
};

type TooltipData = {
    bar: SeriesPoint<StackBarData>;
    key: string;
    index: number;
    height: number;
    width: number;
    x: number;
    y: number;
    color: string;
};

let tooltipTimeout: number;

export default function OptiBarChart({ width, height, data, xAxisCategory, events = false, stackCategory }: OptiBarChart) {
    const { tooltipOpen, tooltipLeft, tooltipTop, tooltipData, hideTooltip, showTooltip } = useTooltip<TooltipData>();
    const [xAxisValues, setXAxisValues] = React.useState<string[]>([] as string[]);
    const [chartData, setChartData] = React.useState<any[]>([] as any[]);
    const [xCategory, setXCategory] = React.useState('');
    const [stackCategoryField, setStackCategoryField] = React.useState([] as string[]);
    const [aggregatedData, setAggregatedData] = React.useState([] as any[])
    const margin = { top: 40, right: 0, bottom: 0, left: 0 };
    const [xMax, setXMax] = React.useState(0);
    const [yMax, setYMax] = React.useState(0);

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
        range: [0, xMax]
    }), [xAxisValues, xMax, xCategory]);

    const colorScale = React.useMemo(() => scaleOrdinal({
        domain: xAxisValues,
        range: ['#636292', '#44bd7e', '#f5787b', '#929bef', '#909090', '#f5cf47', '#5766f2'],
    }), [xAxisValues, xCategory]);

    const scaleYAxis = React.useMemo(() => scaleLinear<number>({
        domain: [0, categoryTotals.sort((a:any, b:any) => (a < b ? -1 : 1)).at(-1) || 100],
        range: [yMax, 0],
        nice: true
    }), [yMax, aggregatedData, stackCategoryField, xCategory]);

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
        setXAxisValues([...new Set(chartData.map(item => get(item, xCategory, 'unknown').toString()))]);
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
                    left={margin.left}
                    xScale={scaleXAxis}
                    yScale={scaleYAxis}
                    width={xMax}
                    height={yMax > 0 ? yMax : 0}
                    stroke="black"
                    strokeOpacity={0.1}
                    xOffset={scaleXAxis.bandwidth() / 2}
                />
                <Group top={margin.top}>
                    <BarStack
                        data={aggregatedData}
                        keys={stackCategoryField}
                        x={(item) => (item.category)}
                        xScale={scaleXAxis}
                        yScale={scaleYAxis}
                        color={colorScale}
                    >
                        {(barStacks) =>
                            barStacks.map((barStack) =>
                                barStack.bars.map((bar) => (
                                    <rect
                                        key={`bar-stack-${barStack.index}-${bar.index}`}
                                        x={bar.x + (bar.width / 4)}
                                        y={bar.y}
                                        height={bar.height > 0 ? bar.height : 0}
                                        width={bar.width / 2}
                                        fill={bar.color}
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
                                                tooltipLeft: left,
                                            });
                                        }}
                                    />
                                )),
                            )
                        }
                    </BarStack>
                </Group>
                <AxisBottom
                    top={height - 50}
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
            {tooltipOpen && tooltipData && (
                <TooltipInPortal top={tooltipTop} left={tooltipLeft} style={defaultStyles}>
                    <div style={{ color: colorScale(tooltipData.key) }}>
                        <strong>{tooltipData.key}</strong>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', maxWidth: '5rem'}}>{get(tooltipData.bar.data, tooltipData.key)}</div>
                    <div>
                        <small>{ }</small>
                    </div>
                </TooltipInPortal>
            )}
        </div >
    );
}