/** @jsxImportSource @emotion/react */

import React from 'react';
import { css } from '@emotion/react';
import {
  useTable,
  useSortBy,
  useResizeColumns,
  useBlockLayout,
  useFlexLayout,
  useFilters,
  useRowSelect,
  Row,
  HeaderGroup,
} from 'react-table';
import {
  AutoSizer,
  CellMeasurer,
  CellMeasurerCache,
  List,
} from 'react-virtualized';

const inputStyles = css`
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #fff;
  padding: 5px 7px;
  font-size: inherit;
  border-radius: 3px;
  font-weight: 400;
  outline-width: 0;
`;

function generateFilterInput({
  column: { filterValue, preFilteredRows, setFilter },
}: {
  column: {
    filterValue: any;
    preFilteredRows: any;
    setFilter: any;
  };
}) {
  return (
    <input
      css={inputStyles}
      type="text"
      placeholder="Filter column..."
      value={filterValue ? filterValue : ''}
      onClick={(event) => event.stopPropagation()}
      onChange={
        (event) => setFilter(event.target.value || undefined) // Set undefined to remove the filter entirely
      }
      aria-label="Filter column..."
    />
  );
}

// --- styles ---
const tableStyles = (tableWidth: number, height: number) => css`
  height: ${height}px;

  /* These styles are suggested for the table fill all available space in its containing element */
  display: block;

  /* These styles are required for a horizontaly scrollable table overflow */
  overflow: auto;

  .rt-table {
    border-spacing: 0;
    border: 1px solid rgba(0, 0, 0, 0.1);
    width: ${tableWidth}px;

    .rt-thead {
      color: #57585a;
      background-color: #f1f1f1;
      font-size: 0.85em;

      .rt-tr {
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      }
    }

    .rt-tbody {
      .rt-tr {
        border-bottom: 1px solid rgba(0, 0, 0, 0.02);
      }

      .rt-tr.rt-striped.-even {
        background-color: rgba(0, 0, 0, 0.03);
      }

      .rt-tr.rt-selected {
        background-color: #b4daf5 !important;
      }
    }

    .rt-th,
    .rt-td {
      margin: 0;
      overflow: hidden;

      /* This is required for the absolutely positioned resizer */
      position: relative;

      :last-child {
        border-right: 0;
      }
    }

    .rt-th {
      padding: 5px;
      font-weight: normal;
      border-right: 1px solid rgba(0, 0, 0, 0.05);

      span {
        float: right;
      }
    }

    .rt-td {
      padding: 7px 5px;
      border-right: 1px solid rgba(0, 0, 0, 0.02);
      font-size: 0.78em;
    }

    .rt-tr:last-child .rt-td {
      border-bottom: 0;
    }

    .rt-resizer {
      right: 0;
      width: 10px;
      height: 100%;
      position: absolute;
      top: 0;
      z-index: 1;
      cursor: col-resize !important;

      /* prevents from scrolling while dragging on touch devices */
      touch-action: none;

      /* prevents highlighting text while resizing */
      user-select: none;
    }

    .rt-col-title {
      padding: 2px;
    }

    .rt-filter {
      padding-top: 10px;
    }
  }
`;

// --- components ---
type Props = {
  id: string;
  data: Array<any>;
  getColumns: Function;
  idColumn: string;
  striped?: boolean;
  height: number;
  initialSelectedRowIds: any;
  onSelectionChange: Function;
  sortBy: any;
};

function ReactTable({
  id,
  data,
  getColumns,
  idColumn,
  striped = false,
  height,
  initialSelectedRowIds,
  onSelectionChange,
  sortBy,
}: Props) {
  // Initializes the column widths based on the table width
  const [tableWidth, setTableWidth] = React.useState(0);
  const columns = React.useMemo(() => {
    return getColumns(tableWidth);
  }, [tableWidth, getColumns]);

  // default column settings
  const defaultColumn = React.useMemo(
    () => ({
      // When using the useFlexLayout:
      minWidth: 50, // minWidth is only used as a limit for resizing
      width: 150, // width is used for both the flex-basis and flex-grow
      maxWidth: 1000, // maxWidth is only used as a limit for resizing
      Filter: generateFilterInput,
    }),
    [],
  );

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    rows,
    prepareRow,
    state: { selectedRowIds },
    totalColumnsWidth,
  }: {
    getTableProps: any;
    getTableBodyProps: any;
    headerGroups: HeaderGroup<Object>[];
    rows: Row<Object>[];
    prepareRow: (row: Row<Object>) => void;
    selectedFlatRows: any;
    state: any;
    totalColumnsWidth: number;
  } = useTable(
    {
      autoResetSortBy: false,
      columns,
      data,
      defaultColumn,
      initialState: {
        selectedRowIds: initialSelectedRowIds.ids,
        sortBy,
      } as any,
    } as any,
    useResizeColumns,
    useBlockLayout,
    useFlexLayout,
    useFilters,
    useSortBy,
    useRowSelect,
  ) as any;

  // measures the table width
  const measuredTableRef = React.useCallback((node) => {
    if (!node) return;
    setTableWidth(node.getBoundingClientRect().width);
  }, []);

  const [scrollToRow, setScrollToRow] = React.useState(-1);

  React.useEffect(() => {
    // don't scroll for row clicks
    const ids = Object.keys(initialSelectedRowIds.ids);
    if (
      ids.length === 0 ||
      initialSelectedRowIds.selectionMethod === 'row-click'
    ) {
      setScrollToRow(-1);
      return;
    }
    const firstRowId = ids[0] as any;

    const index = rows.findIndex(
      (row: any) => row.original.PERMANENT_IDENTIFIER === firstRowId,
    );

    setScrollToRow(index);
  }, [initialSelectedRowIds, data, id, rows]);

  function rowRenderer({
    index,
    isScrolling,
    key,
    parent,
    style,
  }: {
    index: any;
    isScrolling: any;
    key: any;
    parent: any;
    style: any;
  }) {
    // cast as any to workaround toggleRowSelected not being on the type
    const row = rows[index] as any;

    const selected = Object.keys(selectedRowIds).includes(
      row.original.PERMANENT_IDENTIFIER,
    );
    const isEven = index % 2 === 0;
    prepareRow(row);
    return (
      <CellMeasurer
        cache={cache}
        columnIndex={0}
        rowCount={rows.length}
        parent={parent}
        key={key}
        rowIndex={index}
      >
        <div style={style}>
          <div
            id={row.original[idColumn]}
            className={`rt-tr ${striped ? 'rt-striped' : ''} ${
              isEven ? '-odd' : '-even'
            } ${selected ? 'rt-selected' : ''}`}
            role="row"
            {...row.getRowProps()}
            onClick={() => {
              row.toggleRowSelected(!selected);

              if (!onSelectionChange) return;

              onSelectionChange(row);
            }}
          >
            {row.cells.map((cell: any) => {
              const column: any = cell.column;
              if (typeof column.show === 'boolean' && !column.show) {
                return null;
              }
              return (
                <div className="rt-td" role="gridcell" {...cell.getCellProps()}>
                  {cell.render('Cell')}
                </div>
              );
            })}
          </div>
        </div>
      </CellMeasurer>
    );
  }

  const [cache] = React.useState(
    new CellMeasurerCache({
      defaultHeight: 36,
      fixedWidth: true,
    }),
  );
  const listRef = React.useRef<any>(null);

  // Resizes the rows (accordion items) of the react-virtualized list.
  // This is done anytime an accordion item is expanded/collapsed
  React.useEffect(() => {
    cache.clearAll();
    const tempListRef = listRef as any;
    if (listRef?.current) tempListRef.current.recomputeRowHeights();
  }, [cache, listRef, data]);

  return (
    <div
      id={id}
      ref={measuredTableRef}
      className="ReactTable"
      css={tableStyles(totalColumnsWidth, height)}
    >
      <div className="rt-table" role="grid" {...getTableProps()}>
        <div className="rt-thead">
          {headerGroups.map((headerGroup) => (
            <div
              className="rt-tr"
              role="row"
              {...headerGroup.getHeaderGroupProps()}
            >
              {headerGroup.headers.map((column: any) => {
                if (typeof column.show === 'boolean' && !column.show) {
                  return null;
                }
                return (
                  <div
                    className="rt-th"
                    role="columnheader"
                    {...column.getHeaderProps(column.getSortByToggleProps())}
                  >
                    <div>
                      <div className="rt-col-title">
                        {column.render('Header')}
                        <span>
                          {column.isSorted ? (
                            column.isSortedDesc ? (
                              <i className="fas fa-arrow-down" />
                            ) : (
                              <i className="fas fa-arrow-up" />
                            )
                          ) : (
                            ''
                          )}
                        </span>
                      </div>
                      {column.filterable && (
                        <div className="rt-filter">
                          {column.render('Filter')}
                        </div>
                      )}
                    </div>
                    {column.canResize && (
                      <div
                        {...column.getResizerProps()}
                        className={`rt-resizer ${
                          column.isResizing ? 'isResizing' : ''
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="rt-tbody" {...getTableBodyProps()}>
          <AutoSizer disableHeight>
            {({ width }) => (
              <List
                ref={listRef}
                // autoHeight
                deferredMeasurementCache={cache}
                height={height - 94}
                width={width}
                rowCount={rows.length}
                rowHeight={cache.rowHeight}
                rowRenderer={rowRenderer}
                overscanRowCount={20}
                scrollToIndex={scrollToRow}
              />
            )}
          </AutoSizer>
        </div>
      </div>
    </div>
  );
}

export default ReactTable;
