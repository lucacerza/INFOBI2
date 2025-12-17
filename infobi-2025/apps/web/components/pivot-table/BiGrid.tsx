"use client"

import React, { useMemo, useState, useEffect, useRef } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getGroupedRowModel,
  getExpandedRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  Row,
  GroupingState,
  ExpandedState,
  SortingState,
  ColumnFiltersState,
  RowData,
  VisibilityState,
  FilterFn,
  Column,
  AggregationFnOption,
  CellContext,
} from '@tanstack/react-table'
import { useVirtualizer } from '@tanstack/react-virtual'
import { ChevronRight, ChevronDown, Layers, ArrowUp, ArrowDown, Filter, Plus, Trash2, SlidersHorizontal, Play, FileSpreadsheet, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import * as XLSX from 'xlsx'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription, SheetFooter } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { MetricBuilderSheet, CalculatedMetric } from './MetricBuilderSheet'
import { DebouncedInput } from '@/components/ui/debounced-input'
import { Label } from '@/components/ui/label'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    isNumber?: boolean
    isCalculated?: boolean
    isYearHeader?: boolean
    isTreeColumn?: boolean
  }
}

// Estensione Tipi per Excel
interface CustomXLSXRow extends XLSX.RowInfo {
    level?: number;
    hidden?: boolean;
    collapsed?: boolean;
}

type FilterOperator = 
  | 'contains' | 'equals' | 'startsWith' | 'endsWith' | 'neq'
  | 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'between' 
  | 'compare_gt' | 'compare_lt' | 'compare_gte' | 'compare_lte' | 'compare_eq'
  | ''

interface AdvancedFilterRule {
  id: string
  field: string
  operator: FilterOperator
  value: string | number
  value2?: string | number
  compareField?: string
  targetLevel?: string
}

interface RepConfig {
  initialConfig?: {
    rowGroups?: string[]
    valueCols?: { field: string, aggFunc: string }[]
    defaultSort?: { column: { field: string }, direction: 'asc' | 'desc' }
  }
  availableFields?: string[]
  calculatedMetrics?: CalculatedMetric[]
}

interface BiGridProps<TData> {
  data: TData[]
  config?: RepConfig
  onConfigChange?: (newConfig: RepConfig) => void
}

// --- HELPER LOGICA DI CONFRONTO ---
const checkRowRule = (row: Row<Record<string, unknown>>, rule: AdvancedFilterRule): boolean => {
    if (!rule.operator) return true;

    const rawValue = row.getValue(rule.field);
    const numValue = typeof rawValue === 'number' ? rawValue : 0;
    const strValue = String(rawValue ?? '').toLowerCase();

    if (rule.operator.startsWith('compare_')) {
        if (!rule.compareField) return true;
        const compareRaw = row.getValue(rule.compareField);
        const valB = typeof compareRaw === 'number' ? compareRaw : 0;
        
        switch (rule.operator) {
            case 'compare_gt': return numValue > valB;
            case 'compare_gte': return numValue >= valB;
            case 'compare_lt': return numValue < valB;
            case 'compare_lte': return numValue <= valB;
            case 'compare_eq': return numValue === valB;
            default: return true;
        }
    }

    const term = rule.value;
    if (typeof rawValue === 'number' || ['gt','lt','gte','lte','eq','between'].includes(rule.operator)) {
        const numTerm = Number(term);
        if (term === '' || isNaN(numTerm)) return true; 
        switch (rule.operator) {
            case 'gt': return numValue > numTerm;
            case 'gte': return numValue >= numTerm;
            case 'lt': return numValue < numTerm;
            case 'lte': return numValue <= numTerm;
            case 'eq': return numValue === numTerm;
            case 'neq': return numValue !== numTerm;
            case 'between': 
                const numTerm2 = Number(rule.value2);
                return numValue >= numTerm && numValue <= numTerm2;
            default: return true;
        }
    }

    const strTerm = String(term).toLowerCase();
    if (strTerm === '') return true;
    switch (rule.operator) {
        case 'contains': return strValue.includes(strTerm);
        case 'startsWith': return strValue.startsWith(strTerm);
        case 'endsWith': return strValue.endsWith(strTerm);
        case 'equals': return strValue === strTerm;
        case 'neq': return strValue !== strTerm;
        default: return true;
    }
    return true;
}

// --- FILTRO TANSTACK (FASE 1: FOGLIE) ---
const advancedFilterFunction: FilterFn<Record<string, unknown>> = (row, _columnId, filterValue: AdvancedFilterRule[]) => {
  if (!filterValue || filterValue.length === 0) return true;
  const leafRules = filterValue.filter(r => r.targetLevel === 'leaf' || r.targetLevel === 'all');
  if (leafRules.length === 0) return true;
  return leafRules.every(rule => checkRowRule(row, rule));
};

export function BiGrid<TData extends Record<string, unknown>>({ data: rawData, config, onConfigChange }: BiGridProps<TData>) {
  const [grouping, setGrouping] = useState<GroupingState>([])
  const [expanded, setExpanded] = useState<ExpandedState>({})
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  
  const [activeFilters, setActiveFilters] = useState<AdvancedFilterRule[]>([])
  const [draftFilters, setDraftFilters] = useState<AdvancedFilterRule[]>([])
  const [isFilterOpen, setIsFilterOpen] = useState(false)

  const [pivotedData, setPivotedData] = useState<Record<string, unknown>[]>([])
  const [yearsFound, setYearsFound] = useState<string[]>([])

  // 1. PIVOTING
  useEffect(() => {
    if (!rawData || rawData.length === 0) {
        setPivotedData([]);
        return;
    }
    const hasEsercizio = "Esercizio" in rawData[0];
    if (!hasEsercizio) {
        setPivotedData(rawData);
        setYearsFound([]);
        return;
    }
    const years = new Set<string>();
    const groupedMap = new Map<string, Record<string, unknown>>();
    const keysToGroup = Object.keys(rawData[0]).filter(k => k !== 'Esercizio' && typeof rawData[0][k] !== 'number');
    
    rawData.forEach(row => {
        const year = String(row['Esercizio'] || 'N/A');
        years.add(year);
        const rowKey = keysToGroup.map(k => row[k]).join('|||');
        if (!groupedMap.has(rowKey)) {
            const baseRow: Record<string, unknown> = {};
            keysToGroup.forEach(k => baseRow[k] = row[k]);
            groupedMap.set(rowKey, baseRow);
        }
        const targetRow = groupedMap.get(rowKey);
        if (targetRow) {
            Object.keys(row).forEach(key => {
                if (typeof row[key] === 'number') {
                    targetRow[`${year}_${key}`] = row[key];
                }
            });
        }
    });
    const sortedYears = Array.from(years).sort();
    setYearsFound(sortedYears);
    setPivotedData(Array.from(groupedMap.values()));
  }, [rawData]);

  // 2. CONFIG
  useEffect(() => {
    if (config?.initialConfig?.rowGroups) {
        const groups = config.initialConfig.rowGroups;
        setGrouping(groups);
        const newVisibility: VisibilityState = {};
        groups.forEach(g => { newVisibility[g] = false; });
        setColumnVisibility(newVisibility);
    }
  }, [config])

  const handleOpenFilters = (open: boolean) => {
      if (open) {
          setDraftFilters([...activeFilters]);
      }
      setIsFilterOpen(open);
  }

  const applyFilters = () => {
      setActiveFilters(draftFilters);
      setIsFilterOpen(false);
  }

  const clearAllFilters = () => {
      setDraftFilters([]);
  }

  const handleAddMetric = (metric: CalculatedMetric) => {
      if (onConfigChange && config) {
          const newConfig = { ...config };
          newConfig.calculatedMetrics = [...(newConfig.calculatedMetrics || []), metric];
          onConfigChange(newConfig);
      }
  }

  const formatCell = (val: unknown, isNumber: boolean | undefined) => {
    if (isNumber && typeof val === 'number') {
      return new Intl.NumberFormat('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val)
    }
    return val
  }

  // 3. COLONNE
  const columns = useMemo<ColumnDef<Record<string, unknown>, unknown>[]>(() => {
    if (!pivotedData || pivotedData.length === 0) return []
    
    const colDefs: ColumnDef<Record<string, unknown>, unknown>[] = []
    const hierarchyFields = config?.initialConfig?.rowGroups || [];
    
    // TREE COLUMN (MODIFICATO PER NASCONDERE FRECCIA SU ULTIMO LIVELLO)
    if (hierarchyFields.length > 0) {
        colDefs.push({
            id: 'tree_column',
            header: hierarchyFields.join('  >  ').toUpperCase(),
            accessorFn: (row) => row, 
            size: 350,
            minSize: 200,
            meta: { isTreeColumn: true },
            enableColumnFilter: false,
            cell: ({ row }) => {
                const currentField = hierarchyFields[row.depth] || hierarchyFields[hierarchyFields.length - 1];
                const value = (row.original)[currentField];
                
                // FIX: Determina se siamo all'ultimo livello di raggruppamento
                const maxDepth = hierarchyFields.length - 1;
                const isLastLevel = row.depth === maxDepth;
                const showArrow = row.getCanExpand() && !isLastLevel;

                return (
                    <div className="flex items-center" style={{ paddingLeft: `${row.depth * 20}px` }}>
                        {showArrow ? (
                            <button onClick={row.getToggleExpandedHandler()} className="mr-2 p-0.5 hover:bg-slate-200 rounded text-slate-500">
                                {row.getIsExpanded() ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                            </button>
                        ) : <span className="w-6 inline-block" />}
                        
                        <span className={cn("truncate font-medium", showArrow || row.getIsExpanded() ? "text-slate-900" : "text-slate-600")} title={String(value)}>
                            {value as string}
                        </span>
                        
                        {/* Mostra conteggio solo se è un nodo espandibile reale */}
                        {showArrow && <span className="ml-2 text-[10px] text-slate-400 bg-slate-100 px-1.5 rounded-full">{row.subRows.length}</span>}
                    </div>
                );
            }
        });
    }

    hierarchyFields.forEach(key => {
        colDefs.push({
            accessorKey: key,
            header: key,
            enableGrouping: true,
            enableColumnFilter: true,
            filterFn: advancedFilterFunction
        });
    });

    const groupFieldsSet = new Set(hierarchyFields);
    
    const createColumn = (
        id: string, 
        header: string, 
        isNum: boolean, 
        accessor: string | ((row: Record<string, unknown>) => unknown), 
        aggFn: AggregationFnOption<Record<string, unknown>> = 'sum', 
        cellFn?: ColumnDef<Record<string, unknown>, unknown>['cell']
    ): ColumnDef<Record<string, unknown>, unknown> => {
        const commonProps = {
            id, header, aggregationFn: aggFn, minSize: 100, size: isNum ? 110 : 150,
            meta: { isNumber: isNum },
            cell: cellFn || ((info: CellContext<Record<string, unknown>, unknown>) => formatCell(info.getValue(), isNum)),
            enableColumnFilter: true, filterFn: advancedFilterFunction
        };
        if (typeof accessor === 'string') return { ...commonProps, accessorKey: accessor } as ColumnDef<Record<string, unknown>, unknown>;
        else return { ...commonProps, accessorFn: accessor } as ColumnDef<Record<string, unknown>, unknown>;
    };

    if (yearsFound.length > 0) {
        yearsFound.forEach(year => {
            let valueFields = ['Venduto', 'Costo'];
            if (config?.availableFields) valueFields = config.availableFields.filter(f => !groupFieldsSet.has(f) && f !== 'Esercizio');
            
            const yearColumns: ColumnDef<Record<string, unknown>, unknown>[] = [];
            valueFields.forEach(field => yearColumns.push(createColumn(`${year}_${field}`, field, true, `${year}_${field}`)));

            if (config?.calculatedMetrics) {
                config.calculatedMetrics.forEach(metric => {
                    const isTemplate = !metric.field1.includes('_') && !metric.field2.includes('_');
                    if (isTemplate) {
                        const f1 = `${year}_${metric.field1}`;
                        const f2 = `${year}_${metric.field2}`;
                        const colId = `${year}_${metric.name}`;
                        yearColumns.push(createColumn(
                            colId, metric.label, true,
                            (row) => {
                                const v1 = Number(row[f1] || 0);
                                const v2 = Number(row[f2] || 0);
                                if (metric.operation === 'subtract') return v1 - v2;
                                if (metric.operation === 'add') return v1 + v2;
                                if (metric.operation === 'multiply') return v1 * v2;
                                if (metric.operation === 'divide') return v2 !== 0 ? v1 / v2 : 0;
                                if (metric.operation === 'percentage_margin_on_field1') return v1===0?0:((v1-v2)/v1)*100;
                                return 0;
                            },
                            (_colId, leafRows) => {
                                let s1=0; let s2=0;
                                leafRows.forEach(row => {
                                    const original = row.original;
                                    s1+=Number(original[f1]||0);
                                    s2+=Number(original[f2]||0);
                                });
                                if (metric.operation === 'subtract') return s1 - s2;
                                if (metric.operation === 'add') return s1 + s2;
                                if (metric.operation === 'percentage_margin_on_field1') return s1===0?0:((s1-s2)/s1)*100;
                                return 0;
                            },
                            (info) => {
                                const v = info.getValue() as number;
                                return metric.label.includes("%") ? <span className="font-mono text-blue-700 font-bold">{v.toFixed(2)}%</span> : formatCell(v, true);
                            }
                        ));
                    }
                })
            }
            
            colDefs.push({ header: year, meta: { isYearHeader: true }, columns: yearColumns })
        });
    } else {
        let dataKeys = Object.keys(pivotedData[0] || {}).filter(k => !groupFieldsSet.has(k) && k !== 'Esercizio');
        if (config?.availableFields) dataKeys = config.availableFields.filter(k => !groupFieldsSet.has(k) && k in (pivotedData[0] || {}));
        dataKeys.forEach(key => colDefs.push(createColumn(key, key.replace(/_/g, ' '), typeof pivotedData[0][key] === 'number', key)));
    }

    if (config?.calculatedMetrics) {
        config.calculatedMetrics.forEach(metric => {
             const isSpecific = metric.field1.includes('_') || metric.field2.includes('_');
             const shouldAddGlobal = yearsFound.length > 0 ? isSpecific : true;

             if (shouldAddGlobal) {
                 colDefs.push(createColumn(
                    metric.name, metric.label, true,
                    (row) => {
                        const v1 = Number(row[metric.field1] || 0);
                        const v2 = Number(row[metric.field2] || 0);
                        if (metric.operation === 'subtract') return v1 - v2;
                        if (metric.operation === 'add') return v1 + v2;
                        if (metric.operation === 'multiply') return v1 * v2;
                        if (metric.operation === 'divide') return v2 !== 0 ? v1 / v2 : 0;
                        if (metric.operation === 'percentage_margin_on_field1') return v1===0?0:((v1-v2)/v1)*100;
                        return 0;
                    },
                    (_colId, leafRows) => {
                        let s1=0; let s2=0;
                        leafRows.forEach(row => {
                            const original = row.original;
                            s1+=Number(original[metric.field1]||0);
                            s2+=Number(original[metric.field2]||0);
                        });
                        if (metric.operation === 'subtract') return s1 - s2;
                        if (metric.operation === 'add') return s1 + s2;
                        if (metric.operation === 'percentage_margin_on_field1') return s1===0?0:((s1-s2)/s1)*100;
                        return 0;
                    },
                    (info) => {
                        const v = info.getValue() as number;
                        return metric.label.includes("%") ? <span className="font-mono text-blue-700 font-bold">{v.toFixed(2)}%</span> : formatCell(v, true);
                    }
                ));
             }
        });
    }
    return colDefs
  }, [pivotedData, config, yearsFound])

  const columnFilters = useMemo<ColumnFiltersState>(() => {
      const groupedFilters: Record<string, AdvancedFilterRule[]> = {};
      activeFilters.forEach(f => {
          if (!groupedFilters[f.field]) groupedFilters[f.field] = [];
          groupedFilters[f.field].push(f);
      });
      return Object.entries(groupedFilters).map(([id, value]) => ({ id, value }));
  }, [activeFilters]);

  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: pivotedData,
    columns,
    state: { grouping, expanded, sorting, columnVisibility, columnFilters },
    onGroupingChange: setGrouping,
    onExpandedChange: setExpanded,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getGroupedRowModel: getGroupedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    enableColumnResizing: true,
    columnResizeMode: 'onChange',
    filterFromLeafRows: true,
  })

  const { rows: rootRows } = table.getRowModel()

  // --- 4. FILTRO POST-AGGREGAZIONE ---
  const visibleRows = useMemo(() => {
      if (activeFilters.length === 0) return rootRows;
      const hasGroupRules = activeFilters.some(r => r.targetLevel !== 'leaf');
      if (!hasGroupRules) return rootRows;

      const flattenAndFilter = (nodes: Row<Record<string, unknown>>[]): Row<Record<string, unknown>>[] => {
          const flat: Row<Record<string, unknown>>[] = [];
          nodes.forEach(node => {
              const relevantRules = activeFilters.filter(r => {
                  if (r.targetLevel === 'leaf') return false; 
                  const rLevel = r.targetLevel || '0';
                  return parseInt(rLevel, 10) === node.depth;
              });

              let passes = true;
              if (relevantRules.length > 0) {
                  passes = relevantRules.every(rule => checkRowRule(node, rule));
              }
              if (passes) {
                  flat.push(node);
                  if (node.getIsExpanded() && node.subRows) {
                      flat.push(...flattenAndFilter(node.subRows));
                  }
              }
          });
          return flat;
      };
      return flattenAndFilter(rootRows);
  }, [rootRows, activeFilters]);

  const parentRef = useRef<HTMLDivElement>(null)
  const rowVirtualizer = useVirtualizer({
    count: visibleRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 36,
    overscan: 20,
  })

  // --- EXPORT EXCEL CORRETTO (STOP ALLE FOGLIE DOPPIE) ---
  const handleExportExcel = () => {
    const maxDepth = (config?.initialConfig?.rowGroups?.length || 0) - 1;

    const getAllExportRows = (nodes: Row<Record<string, unknown>>[]): Row<Record<string, unknown>>[] => {
         const flat: Row<Record<string, unknown>>[] = [];
         nodes.forEach(node => {
            // 1. Filtri
            const relevantRules = activeFilters.filter(r => {
                if (r.targetLevel === 'leaf') return false;
                const rLevel = r.targetLevel || '0';
                return parseInt(rLevel, 10) === node.depth;
            });
            let passes = true;
            if (relevantRules.length > 0) {
                passes = relevantRules.every(rule => checkRowRule(node, rule));
            }

            if (passes) {
                flat.push(node);
                // 2. CRUCIALE: Se siamo all'ultimo livello di raggruppamento (maxDepth),
                //    ci fermiamo! Non esportiamo i figli (subRows) perché sono i dati raw duplicati.
                if (node.depth < maxDepth && node.subRows && node.subRows.length > 0) {
                    flat.push(...getAllExportRows(node.subRows));
                }
            }
         });
         return flat;
    };

    const fullExportRows = getAllExportRows(rootRows);
    const aoaData: (string | number | null)[][] = [];
    const merges: XLSX.Range[] = [];

    const headerRow1: string[] = ["Gerarchia"];
    const headerRow2: string[] = [""];
    merges.push({ s: { r: 0, c: 0 }, e: { r: 1, c: 0 } });
    
    let colIdx = 1;
    const headerGroups = table.getHeaderGroups();
    
    const exportableColumns = table.getAllLeafColumns().filter(col => 
        col.id !== 'tree_column' && col.getIsVisible()
    );

    if (headerGroups.length > 1) {
        const topHeaders = headerGroups[0].headers;
        topHeaders.forEach(h => {
            if (h.column.id === 'tree_column') return;
            const leafCols = h.getLeafHeaders().filter(lh => lh.column.getIsVisible() && lh.column.id !== 'tree_column');
            if (leafCols.length === 0) return;

            const label = h.column.columnDef.header as string;
            const colspan = leafCols.length;
            headerRow1.push(label);
            for (let i = 1; i < colspan; i++) headerRow1.push("");
            if (colspan > 1) {
                merges.push({ s: { r: 0, c: colIdx }, e: { r: 0, c: colIdx + colspan - 1 } });
            }
            colIdx += colspan;
        });
        exportableColumns.forEach(col => {
             headerRow2.push(col.columnDef.header as string);
        });
        aoaData.push(headerRow1);
        aoaData.push(headerRow2);
    } else {
        exportableColumns.forEach(col => {
            headerRow1.push(col.columnDef.header as string);
        });
        aoaData.push(headerRow1);
    }

    fullExportRows.forEach(row => {
        
        const rowData: (string | number | null)[] = [];
        const hierarchyFields = config?.initialConfig?.rowGroups || [];
        const currentField = hierarchyFields[row.depth] || hierarchyFields[hierarchyFields.length - 1];
        
        // Nome del nodo
        let treeValue = "";
        if (row.getIsGrouped()) {
             const groupVal = row.groupingValue;
             treeValue = String(groupVal ?? "Totale");
        } else {
             // Se per caso è una foglia (ma non dovrebbe succedere con la logica sopra), fallback
             treeValue = String(row.original[currentField] ?? "Totale");
        }

        const indent = "    ".repeat(row.depth);
        rowData.push(indent + treeValue);

        exportableColumns.forEach(col => {
            rowData.push(row.getValue(col.id));
        });
        aoaData.push(rowData);
    });

    const ws = XLSX.utils.aoa_to_sheet(aoaData);
    if(merges.length > 0) ws['!merges'] = merges;

    // Outline Excel
    const wsRows: CustomXLSXRow[] = [];
    const headerOffset = headerGroups.length > 1 ? 2 : 1;
    
    fullExportRows.forEach((row, i) => {
        const rowIndex = headerOffset + i;
        while (wsRows.length <= rowIndex) wsRows.push({});
        
        wsRows[rowIndex] = { level: row.depth };
        // Chiudiamo tutto di default
        if (row.depth > 0) {
            wsRows[rowIndex].hidden = true;
            wsRows[rowIndex].collapsed = true;
        }
    });
    ws['!rows'] = wsRows;
    
    const wscols = [{ wch: 40 }];
    exportableColumns.forEach(() => wscols.push({ wch: 15 }));
    ws['!cols'] = wscols;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Export Dati");
    XLSX.writeFile(wb, `Export_InfoBi_${new Date().toISOString().slice(0,10)}.xlsx`);
  }

  const addFilter = () => {
      const availableCols = table.getAllLeafColumns().filter(c => c.id !== 'tree_column');
      const firstField = availableCols.length > 0 ? availableCols[0].id : '';
      const hasGroups = (config?.initialConfig?.rowGroups?.length || 0) > 0;
      setDraftFilters([...draftFilters, { 
          id: Math.random().toString(), 
          field: firstField, 
          operator: '' as FilterOperator, 
          value: '', 
          compareField: '',
          targetLevel: hasGroups ? '0' : 'leaf'
      }])
  }

  const removeFilter = (id: string) => {
      setDraftFilters(draftFilters.filter(f => f.id !== id));
  }

  const updateFilter = (id: string, key: keyof AdvancedFilterRule, val: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setDraftFilters(draftFilters.map(f => f.id === id ? { ...f, [key]: val } as any : f));
  }

  const getColumnLabel = (col: Column<Record<string, unknown>, unknown>) => {
      const match = col.id.match(/^(\d{4})_(.+)$/);
      return match ? `[${match[1]}] ${col.columnDef.header}` : (col.columnDef.header as string);
  }

  const numericColumnsForBuilder = table.getAllLeafColumns()
    .filter(c => c.id !== 'tree_column' && c.columnDef.meta?.isNumber)
    .filter(c => !(config?.initialConfig?.rowGroups || []).includes(c.id))
    .map(c => ({ id: c.id, label: getColumnLabel(c) }));

  const filterableColumns = table.getAllLeafColumns().filter(c => c.id !== 'tree_column');
  const groupLevels = config?.initialConfig?.rowGroups || [];

  return (
    <div className="flex flex-col h-full border rounded-lg bg-white shadow-sm overflow-hidden select-none">
      
      <div className="p-2 border-b bg-slate-50 text-xs flex justify-between items-center text-slate-500 shrink-0">
        <div className="flex items-center gap-2">
            <Layers size={14} className="text-blue-600" />
            <span className="font-semibold text-slate-700">Analisi Pivot</span>
            <span className="bg-slate-200 px-2 rounded-full text-slate-600">{visibleRows.length.toLocaleString()} record</span>
        </div>
        
        <div className="flex gap-2">
            <MetricBuilderSheet 
                columns={numericColumnsForBuilder}
                onSave={handleAddMetric}
            />
            
            <Sheet open={isFilterOpen} onOpenChange={handleOpenFilters}>
                <SheetTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-7 gap-1 bg-white", activeFilters.length > 0 ? "border-blue-500 text-blue-700 ring-1 ring-blue-200" : "")}>
                        <SlidersHorizontal size={14} /> 
                        Filtri {activeFilters.length > 0 && `(${activeFilters.length})`}
                    </Button>
                </SheetTrigger>
                <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto flex flex-col">
                    <SheetHeader className="mb-6 pb-4 border-b border-slate-100">
                        <SheetTitle className="text-xl font-bold flex items-center gap-2 text-slate-800">
                            <Filter size={20} className="text-slate-500" /> Configurazione Filtri
                        </SheetTitle>
                        <SheetDescription>Premi &quot;Applica&quot; per confermare.</SheetDescription>
                    </SheetHeader>
                    
                    <div className="flex-1 space-y-4">
                        {draftFilters.length === 0 && (
                            <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                                <Filter className="mx-auto h-8 w-8 text-slate-300 mb-2" />
                                <p className="text-sm text-slate-500 font-medium">Nessun filtro attivo</p>
                                <p className="text-xs text-slate-400 mt-1">Aggiungi una regola per iniziare a filtrare i dati.</p>
                            </div>
                        )}

                        {draftFilters.map((filter, index) => {
                            const col = table.getColumn(filter.field);
                            const isNum = col?.columnDef.meta?.isNumber;

                            return (
                                <div key={filter.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm relative group transition-all hover:border-blue-200 hover:shadow-md">
                                    <div className="absolute top-3 right-3 opacity-50 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-full" onClick={() => removeFilter(filter.id)}>
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                    
                                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">
                                        Regola #{index + 1}
                                    </div>

                                    <div className="grid grid-cols-1 gap-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] text-slate-500 font-medium">Campo</span>
                                                <Select value={filter.field} onValueChange={(v) => updateFilter(filter.id, 'field', v)}>
                                                    <SelectTrigger className="h-9 text-xs bg-white border-slate-200 font-medium"><SelectValue placeholder="Seleziona..." /></SelectTrigger>
                                                    <SelectContent className="max-h-[250px]">
                                                        {filterableColumns.map(c => <SelectItem key={c.id} value={c.id}>{getColumnLabel(c)}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            
                                            {groupLevels.length > 0 ? (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] text-slate-500 font-medium">Applica a</span>
                                                    <Select value={filter.targetLevel || '0'} onValueChange={(v) => updateFilter(filter.id, 'targetLevel', v)}>
                                                        <SelectTrigger className="h-9 text-xs bg-white text-blue-700"><SelectValue /></SelectTrigger>
                                                        <SelectContent>
                                                            {groupLevels.map((g, i) => (
                                                                <SelectItem key={i} value={String(i)}>Livello {i}: {g}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col gap-1">
                                                    <span className="text-[10px] text-slate-500 font-medium">Applica a</span>
                                                    <div className="h-9 text-xs bg-slate-50 border border-slate-200 rounded flex items-center px-3 text-slate-500">Righe Dati</div>
                                                </div>
                                            )}
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            <span className="text-[10px] text-slate-500 font-medium">Condizione</span>
                                            <Select value={filter.operator} onValueChange={(v) => updateFilter(filter.id, 'operator', v)}>
                                                <SelectTrigger className="h-9 text-xs bg-slate-50 border-slate-200">
                                                    <SelectValue placeholder="Seleziona condizione" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {isNum ? (
                                                        <>
                                                            <SelectItem value="gt">Maggiore di (&gt;)</SelectItem>
                                                            <SelectItem value="gte">Maggiore o Uguale (&ge;)</SelectItem>
                                                            <SelectItem value="lt">Minore di (&lt;)</SelectItem>
                                                            <SelectItem value="lte">Minore o Uguale (&le;)</SelectItem>
                                                            <SelectItem value="eq">Uguale a (=)</SelectItem>
                                                            <SelectItem value="neq">Diverso da (!=)</SelectItem>
                                                            <SelectItem value="between">Compreso tra</SelectItem>
                                                            <Separator className="my-1" />
                                                            <SelectItem value="compare_gt">Maggiore della Colonna...</SelectItem>
                                                            <SelectItem value="compare_gte">Maggiore/Uguale Colonna...</SelectItem>
                                                            <SelectItem value="compare_lt">Minore della Colonna...</SelectItem>
                                                            <SelectItem value="compare_lte">Minore/Uguale Colonna...</SelectItem>
                                                            <SelectItem value="compare_eq">Uguale alla Colonna...</SelectItem>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <SelectItem value="contains">Contiene</SelectItem>
                                                            <SelectItem value="startsWith">Inizia con</SelectItem>
                                                            <SelectItem value="endsWith">Finisce con</SelectItem>
                                                            <SelectItem value="equals">Uguale esatto</SelectItem>
                                                            <SelectItem value="neq">Diverso da</SelectItem>
                                                        </>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                            {filter.operator.startsWith('compare_') ? (
                                                <Select value={filter.compareField} onValueChange={(v) => updateFilter(filter.id, 'compareField', v)}>
                                                    <SelectTrigger className="h-9 text-xs bg-blue-50 border-blue-200"><SelectValue placeholder="Confronta con..." /></SelectTrigger>
                                                    <SelectContent className="max-h-[250px]">
                                                        {filterableColumns.filter(c => c.id !== filter.field).map(c => <SelectItem key={c.id} value={c.id}>{getColumnLabel(c)}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            ) : (
                                                <div className="flex gap-2">
                                                    <DebouncedInput 
                                                        className="h-9 text-xs bg-white flex-1 font-medium" 
                                                        placeholder={filter.operator === 'between' ? 'Min...' : 'Valore...'} 
                                                        value={filter.value} 
                                                        onChange={(v) => updateFilter(filter.id, 'value', v)} 
                                                    />
                                                    {filter.operator === 'between' && (
                                                        <DebouncedInput 
                                                            className="h-9 text-xs bg-white flex-1 font-medium" 
                                                            placeholder="Max..." 
                                                            value={filter.value2 || ''} 
                                                            onChange={(v) => updateFilter(filter.id, 'value2', v)} 
                                                        />
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                        <Button variant="outline" onClick={addFilter} className="w-full border-dashed border-slate-300 text-slate-500 hover:text-blue-600 hover:border-blue-300 hover:bg-blue-50 transition-colors h-10">
                            <Plus size={16} className="mr-2" /> Aggiungi Nuova Regola
                        </Button>
                    </div>

                    <SheetFooter className="mt-6 pt-4 border-t border-slate-100 sm:justify-between gap-3 bg-white sticky bottom-0">
                        <div className="flex gap-2 w-full sm:w-auto mr-auto">
                             {draftFilters.length > 0 && (
                                <Button variant="outline" size="sm" onClick={clearAllFilters} className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 w-full sm:w-auto">
                                    <Trash2 size={14} className="mr-2" /> Rimuovi filtri
                                </Button>
                            )}
                        </div>
                        <div className="flex gap-2 w-full sm:w-auto">
                            <Button variant="ghost" onClick={() => setIsFilterOpen(false)} className="flex-1 sm:flex-none text-slate-500">Annulla</Button>
                            <Button onClick={applyFilters} className="flex-1 sm:flex-none bg-slate-900 hover:bg-slate-800 text-white shadow-md">
                                <Play size={14} className="mr-2"/> Applica
                            </Button>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            <button onClick={handleExportExcel} className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-md shadow-sm transition-all text-xs font-semibold tracking-wide">
                <FileSpreadsheet size={14} /> EXCEL
            </button>
        </div>
      </div>

      {/* BODY */}
      <div ref={parentRef} className="flex-1 overflow-auto w-full relative">
        <div style={{ width: table.getTotalSize(), minWidth: '100%' }}>
             <div className="sticky top-0 z-20 bg-slate-100 shadow-sm border-b border-slate-300">
                {table.getHeaderGroups().map(headerGroup => (
                    <div key={headerGroup.id} className="flex">
                        {headerGroup.headers.map(header => {
                            const meta = header.column.columnDef.meta;
                            const isNum = meta?.isNumber && !meta?.isYearHeader;
                            return (
                                <div
                                    key={header.id}
                                    className={cn(
                                        "px-2 py-2 flex items-center relative border-r border-slate-200",
                                        meta?.isYearHeader ? "bg-slate-200 text-slate-800 justify-center border-b border-slate-300" : "",
                                        isNum ? "justify-center text-center" : "justify-start text-left",
                                        meta?.isTreeColumn ? "bg-slate-50 border-r-2" : ""
                                    )}
                                    style={{ width: header.getSize(), flex: `0 0 ${header.getSize()}px` }}
                                >
                                    <div 
                                        className={cn(
                                            "flex items-center gap-1 w-full font-bold text-xs uppercase tracking-wider text-slate-600", 
                                            meta?.isYearHeader || isNum ? "justify-center" : ""
                                        )}
                                        onClick={header.column.getToggleSortingHandler()}
                                    >
                                        <span className="truncate">
                                            {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                        </span>
                                        {!meta?.isYearHeader && header.column.getCanSort() && (
                                            <span className="ml-1 opacity-50">
                                                {{
                                                    asc: <ArrowUp size={12} />,
                                                    desc: <ArrowDown size={12} />,
                                                }[header.column.getIsSorted() as string]}
                                            </span>
                                        )}
                                    </div>
                                    <div
                                        onMouseDown={header.getResizeHandler()}
                                        onTouchStart={header.getResizeHandler()}
                                        className={cn(
                                            "absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-blue-400 touch-none",
                                            header.column.getIsResizing() ? "bg-blue-600 w-1" : "bg-transparent"
                                        )}
                                    />
                                </div>
                            )
                        })}
                    </div>
                ))}
            </div>
            <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: 'relative' }}>
                {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = visibleRows[virtualRow.index];
                    return (
                        <div
                            key={row.id}
                            className={cn(
                                "absolute top-0 left-0 flex w-full border-b border-slate-100 transition-colors hover:bg-blue-50/40",
                                row.getIsGrouped() ? "bg-slate-50 font-medium text-slate-800" : "bg-white"
                            )}
                            style={{ height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }}
                        >
                            {row.getVisibleCells().map(cell => {
                                const meta = cell.column.columnDef.meta;
                                return (
                                    <div
                                        key={cell.id}
                                        className={cn(
                                            "px-2 py-2 text-sm flex items-center border-r border-slate-100 last:border-r-0 overflow-hidden",
                                            meta?.isNumber ? "justify-end text-right font-mono" : "justify-start text-left",
                                            meta?.isCalculated ? "bg-blue-50/20 text-slate-900" : "",
                                            meta?.isTreeColumn ? "border-r-2 border-slate-300 bg-slate-50/50" : ""
                                        )}
                                        style={{ width: cell.column.getSize(), flex: `0 0 ${cell.column.getSize()}px` }}
                                    >
                                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                    </div>
                                )
                            })}
                        </div>
                    )
                })}
            </div>
        </div>
      </div>
    </div>
  )
}