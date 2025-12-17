/** @jsxImportSource @emotion/react */

import React, {
  Fragment,
  KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { css } from '@emotion/react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  getExpandedRowModel,
  Row,
  Table,
  SortingState,
  CellContext,
  ExpandedState,
} from '@tanstack/react-table';
import {
  useVirtualizer,
  VirtualItem,
  Virtualizer,
} from '@tanstack/react-virtual';
// components
import Select from 'components/Select';
// styles
import { reactSelectStyles } from 'styles';

const baseInputStyles = css`
  width: 100%;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: #fff;
  padding: 5px 7px;
  font-size: inherit;
  border-radius: 3px;
  font-weight: 400;
  outline-width: 0;
  height: 38px;
`;

const checkboxStyles = css`
  align-items: center;
  display: flex;
  height: 100%;

  input {
    ${baseInputStyles}
    height: 24px;
  }
`;

const inputStyles = css`
  ${baseInputStyles}
`;

// --- styles ---
const tableStyles = ({
  height,
  hideHeader,
}: {
  height?: number;
  hideHeader: boolean;
}) => css`
  ${height === -1 ? '' : height ? `height: ${height}px;` : 'max-height: 400px;'}
  border: ${hideHeader ? 'none' : '1px solid rgba(0, 0, 0, 0.1)'};

  /* These styles are suggested for the table fill all available space in its containing element */
  display: block;

  /* These styles are required for a horizontaly scrollable table overflow */
  overflow: auto;

  table {
    border-spacing: 0;
    border: 1px solid rgba(0, 0, 0, 0.1);
    width: 100%;
    margin: 0;

    thead {
      color: #57585a;
      background-color: #f1f1f1;
      font-size: 0.85em;

      tr {
        ${hideHeader ? 'border: none !important;' : ''}
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
      }
    }

    tbody {
      tr:first-of-type {
        ${hideHeader ? 'border: none !important;' : ''}

        td {
          ${hideHeader ? 'border: none !important;' : ''}
        }
      }

      tr {
        border-bottom: 1px solid rgba(0, 0, 0, 0.02);
      }

      tr.rt-striped.-even {
        background-color: rgba(0, 0, 0, 0.02);
      }

      tr.rt-selected {
        background-color: #b4daf5 !important;
      }
    }

    th,
    td {
      margin: 0;
      overflow: hidden;

      /* This is required for the absolutely positioned resizer */
      position: relative;

      :last-child {
        border-right: 0;
      }
    }

    th {
      padding: 5px;
      font-weight: normal;
      border-right: 1px solid rgba(0, 0, 0, 0.05);
      ${hideHeader ? 'border: none;' : ''}

      span {
        float: right;
      }
    }

    td {
      padding: 7px 5px;
      border-right: 1px solid rgba(0, 0, 0, 0.02);
      border-bottom: none;
      font-size: 0.78em;
    }

    tr:last-child td {
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

    .rt-full-width {
      padding: 0 !important;
      border: none;
    }
  }
`;

// --- components ---
type Props = {
  id: string;
  data: Array<any>;
  getColumns: Function;
  striped?: boolean;
  height?: number;
  initialSelectedRowIds?: any;
  onSelectionChange?: Function;
  sortBy?: any;
};

export function ReactTable({
  id,
  data,
  getColumns,
  striped = false,
  height,
  initialSelectedRowIds,
  onSelectionChange,
  sortBy,
}: Props) {
  const [tableWidth, setTableWidth] = useState(0);
  const columns = useMemo(
    () => getColumns(tableWidth).filter((c) => c.show !== false),
    [tableWidth, getColumns],
  );

  const [rowSelection, setRowSelection] = React.useState({});
  const [rowSelectionType, setRowSelectionType] = React.useState({});
  const [sorting, setSorting] = React.useState<SortingState>(sortBy || []);

  const table = useReactTable({
    data,
    columns,
    columnResizeMode: 'onChange',
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    state: {
      rowSelection,
      sorting,
    },
    enableMultiRowSelection: false,
    enableRowSelection: onSelectionChange ? true : false,
  });

  useEffect(() => {
    if (!onSelectionChange) return;
    if (
      initialSelectedRowIds.length === 0 &&
      rowSelection &&
      Object.keys(rowSelection).length > 0
    ) {
      setRowSelection({});
      setRowSelectionType({});
      return;
    }

    const rows = table.getRowModel().rows;
    const newSelections: any = {};
    const newSelectionsType: any = {};
    initialSelectedRowIds.forEach((item: any) => {
      const index = rows.findIndex(
        (r) =>
          r.original.DECISIONUNITUUID === item.DECISIONUNITUUID &&
          r.original.PERMANENT_IDENTIFIER === item.PERMANENT_IDENTIFIER,
      );

      if (index !== -1) {
        newSelections[index] = true;
        newSelectionsType[index] = item.selection_method;
      }
    });

    if (JSON.stringify(rowSelection) !== JSON.stringify(newSelections)) {
      setRowSelection(newSelections);
      setRowSelectionType(newSelectionsType);
    }
  }, [initialSelectedRowIds, rowSelection, table]);

  const measuredTableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!measuredTableRef?.current) return;
    setTableWidth(measuredTableRef.current.getBoundingClientRect().width);
  }, [measuredTableRef]);

  return (
    <div
      id={id}
      ref={measuredTableRef}
      className="ReactTable"
      css={tableStyles({
        height,
        hideHeader: false,
      })}
    >
      <table style={{ display: 'grid' }}>
        <thead
          style={{
            display: 'grid',
            position: 'sticky',
            top: 0,
            zIndex: 1,
          }}
        >
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id} style={{ display: 'flex', width: '100%' }}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  style={{ display: 'flex', width: header.getSize() }}
                >
                  <div
                    {...{
                      className: header.column.getCanSort()
                        ? 'cursor-pointer select-none'
                        : '',
                      onClick: header.column.getToggleSortingHandler(),
                    }}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      width: '100%',
                    }}
                  >
                    <span>
                      {flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </span>
                    <span>
                      {{
                        asc: <i className="fas fa-arrow-up" />,
                        desc: <i className="fas fa-arrow-down" />,
                      }[header.column.getIsSorted() as string] ?? null}
                    </span>
                  </div>
                  <div
                    {...{
                      onDoubleClick: () => header.column.resetSize(),
                      onMouseDown: header.getResizeHandler(),
                      onTouchStart: header.getResizeHandler(),
                      className: `rt-resizer ${
                        table.options.columnResizeDirection
                      } ${header.column.getIsResizing() ? 'isResizing' : ''}`,
                    }}
                  />
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <TableBody
          table={table}
          tableContainerRef={measuredTableRef}
          rowSelection={rowSelectionType}
          onSelectionChange={onSelectionChange}
          striped={striped}
        />
      </table>
    </div>
  );
}

interface TableBodyProps {
  table: Table<any>;
  tableContainerRef: React.RefObject<HTMLDivElement>;
  rowSelection: any;
  striped: boolean;
  onSelectionChange?: Function;
}

function TableBody({
  table,
  tableContainerRef,
  rowSelection,
  striped = false,
  onSelectionChange,
}: TableBodyProps) {
  const { rows } = table.getRowModel();

  // Important: Keep the row virtualizer in the lowest component possible to avoid unnecessary re-renders.
  const rowVirtualizer = useVirtualizer<HTMLDivElement, HTMLTableRowElement>({
    count: rows.length,
    estimateSize: () => 38, //estimate row height for accurate scrollbar dragging
    getScrollElement: () => tableContainerRef.current,
    //measure dynamic row height, except in firefox because it measures table border height incorrectly
    measureElement:
      typeof window !== 'undefined' &&
      navigator.userAgent.indexOf('Firefox') === -1
        ? (element) => element?.getBoundingClientRect().height
        : undefined,
    overscan: 5,
  });

  useEffect(() => {
    if (!Object.keys(rowSelection).length) return;

    const [selectedRowId, value] = Object.entries(rowSelection)[0];
    if (value === 'row-click') return;

    const selectedRowIndex = table
      .getRowModel()
      .rows.findIndex((row) => row.id === selectedRowId);

    if (selectedRowIndex !== -1) {
      rowVirtualizer.scrollToIndex(selectedRowIndex, { align: 'start' });
    }
  }, [rowSelection, table, rowVirtualizer]);

  return (
    <tbody
      style={{
        display: 'grid',
        height: `${rowVirtualizer.getTotalSize()}px`, //tells scrollbar how big the table is
        position: 'relative', //needed for absolute positioning of rows
      }}
    >
      {rowVirtualizer.getVirtualItems().map((virtualRow) => {
        const row = rows[virtualRow.index] as Row<any>;
        return (
          <TableBodyRow
            key={row.id}
            row={row}
            virtualRow={virtualRow}
            rowVirtualizer={rowVirtualizer}
            onSelectionChange={onSelectionChange}
            striped={striped}
          />
        );
      })}
    </tbody>
  );
}

interface TableBodyRowProps {
  row: Row<any>;
  virtualRow: VirtualItem;
  rowVirtualizer: Virtualizer<HTMLDivElement, HTMLTableRowElement>;
  onSelectionChange?: Function;
  striped: boolean;
}

function TableBodyRow({
  row,
  virtualRow,
  rowVirtualizer,
  onSelectionChange,
  striped = false,
}: TableBodyRowProps) {
  return (
    <tr
      data-index={virtualRow.index} //needed for dynamic row height measurement
      ref={(node) => rowVirtualizer.measureElement(node)} //measure dynamic row height
      key={row.id}
      className={`rt-striped ${striped ? (virtualRow.index % 2 === 0 ? '-odd' : '-even') : ''} ${row.getIsSelected() ? 'rt-selected' : ''}`}
      style={{
        display: 'flex',
        position: 'absolute',
        transform: `translateY(${virtualRow.start}px)`, //this should always be a `style` as it changes on scroll
        width: '100%',
      }}
      onClick={() => {
        if (!onSelectionChange) return;
        onSelectionChange(row);
      }}
    >
      {row.getVisibleCells().map((cell) => {
        return (
          <td
            key={cell.id}
            style={{
              display: 'flex',
              width: cell.column.getSize(),
            }}
          >
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </td>
        );
      })}
    </tr>
  );
}

const expandableColumnWidth = '20px';

type EditableProps = {
  id: string;
  data: Array<any>;
  getColumns: Function;
  hideHeader?: boolean;
  striped?: boolean;
  height?: number;
  onDataChange?: Function;
  expandable?: boolean;
  resizable?: boolean;
};

export function ReactTableEditable({
  id,
  data,
  getColumns,
  striped = false,
  hideHeader = false,
  height,
  onDataChange,
  expandable = false,
  resizable = true,
}: EditableProps) {
  const [tableWidth, setTableWidth] = useState(0);
  const columns = useMemo(
    () => getColumns(tableWidth).filter((c) => c.show !== false),
    [tableWidth, getColumns],
  );

  const [expanded, setExpanded] = React.useState<ExpandedState>({});

  const table = useReactTable({
    data,
    columns,
    columnResizeMode: 'onChange',
    enableColumnResizing: resizable,
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: expandable ? getExpandedRowModel() : undefined,
    onExpandedChange: setExpanded,
    getRowCanExpand: (row) => !!row.original.subRows,
    state: { expanded },
    meta: { updateMyData: onDataChange },
  });

  const measuredTableRef = useCallback((node) => {
    if (node) setTableWidth(node.getBoundingClientRect().width);
  }, []);

  return (
    <div
      id={id}
      ref={measuredTableRef}
      className="ReactTable"
      style={{ height }}
      css={tableStyles({ height, hideHeader })}
    >
      <table
        style={{
          tableLayout: 'fixed',
          width: '100%',
          borderCollapse: 'collapse',
        }}
      >
        <thead style={hideHeader ? { visibility: 'hidden' } : {}}>
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {expandable && <th style={{ width: expandableColumnWidth }} />}
              {headerGroup.headers.map((header) => (
                <th key={header.id} style={{ width: header.getSize() }}>
                  {!hideHeader &&
                    flexRender(
                      header.column.columnDef.header,
                      header.getContext(),
                    )}
                  {resizable && (
                    <div
                      {...{
                        onDoubleClick: () => header.column.resetSize(),
                        onMouseDown: header.getResizeHandler(),
                        onTouchStart: header.getResizeHandler(),
                        className: `rt-resizer ${
                          table.options.columnResizeDirection
                        } ${header.column.getIsResizing() ? 'isResizing' : ''}`,
                      }}
                    />
                  )}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row, i) => {
            return (
              <Fragment key={row.id}>
                <tr
                  className={`rt-striped ${striped ? (i % 2 === 0 ? '-odd' : '-even') : ''}`}
                >
                  {expandable && row.getCanExpand() && (
                    <td
                      style={{ width: expandableColumnWidth }}
                      onClick={row.getToggleExpandedHandler()}
                    >
                      <div
                        style={{
                          display: 'flex',
                          justifyContent: 'space-around',
                        }}
                      >
                        <i
                          className={`fas fa-${row.getIsExpanded() ? 'minus' : 'plus'}`}
                        />
                      </div>
                    </td>
                  )}
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
                {expandable && row.getIsExpanded() && (
                  <tr>
                    <td />
                    <td colSpan={columns.length} className="rt-full-width">
                      <ReactTableEditable
                        resizable={resizable}
                        id={`${id}-sub-${row.id}`}
                        data={row.original.subRows || []}
                        getColumns={getColumns}
                        striped={striped}
                        hideHeader={true}
                        onDataChange={(
                          rowIndex: any,
                          columnId: any,
                          value: any,
                        ) => {
                          if (!onDataChange) return;

                          const originalSubRows = row.original.subRows || [];
                          const newSubRows = originalSubRows.map(
                            (row: any, index: number) => {
                              // update the row if it is the row in focus and the data has changed
                              if (
                                index === rowIndex &&
                                row[columnId] !== value
                              ) {
                                return {
                                  ...originalSubRows[rowIndex],
                                  [columnId]: value,
                                };
                              }
                              return row;
                            },
                          );
                          onDataChange(i, 'subRows', newSubRows);
                        }}
                        expandable={false}
                      />
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

type EditableCellProps = {
  getValue: () => any;
  row: CellContext<any, any>['row'];
  column: CellContext<any, any>['column'];
  table: Table<any>;
};

export function ReactTableEditableCell({
  getValue,
  row,
  column,
  table,
}: EditableCellProps) {
  // State to manage input values
  const [value, setValue] = useState(getValue());

  // Get necessary properties
  const index = row.index;
  const id = column.id;
  const ariaLabelCol = column.columnDef.ariaLabelCol;
  const editType = column.columnDef.editType;
  const options = column.columnDef.options;

  const updateMyData = table.options.meta?.updateMyData; // Get update function from table meta
  const onChange = (e) => {
    if (editType === 'checkbox') setValue(e.target.checked);
    else setValue(e.target.value);
  };

  const onBlur = () => {
    const newValue =
      typeof row.original[id] === 'number' ? parseFloat(value) : value;
    updateMyData(index, id, newValue);
  };

  const onKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const newValue =
        typeof row.original[id] === 'number' ? parseFloat(value) : value;
      updateMyData(index, id, newValue);
    }
  };

  useEffect(() => {
    setValue(getValue());
  }, [getValue]);

  const rowId = row.original.id;
  const colName = column.columnDef.header?.toString() || 'Unknown';
  let label = colName;
  if (ariaLabelCol && row.original[ariaLabelCol])
    label += ` for ${row.original[ariaLabelCol]}`;

  if (editType === 'checkbox') {
    if (row.original.media?.includes('Exterior')) return null;
    return (
      <div css={checkboxStyles}>
        <label>
          <input
            type="checkbox"
            checked={value}
            onChange={onChange}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
          />
          <span className="sr-only">{label}</span>
        </label>
      </div>
    );
  }

  if (editType === 'input')
    return (
      <label>
        <input
          value={value}
          onChange={onChange}
          onBlur={onBlur}
          onKeyDown={onKeyDown}
          css={inputStyles}
        />
        <span className="sr-only">{label}</span>
      </label>
    );

  if (editType === 'select')
    return (
      <Fragment>
        <label className="sr-only" htmlFor={`${rowId}_${colName}`}>
          {label}
        </label>
        <Select
          inputId={`${rowId}_${colName}`}
          styles={{
            ...(reactSelectStyles as any),
            menuPortal: (base) => ({
              ...base,
              fontSize: '0.78em',
              zIndex: 9999,
            }),
          }}
          value={value}
          options={options}
          menuPortalTarget={document.body}
          onChange={(selectedOption) => {
            setValue(selectedOption?.value || '');
            updateMyData(index, id, selectedOption || '');
          }}
          isClearable={true}
        />
      </Fragment>
    );

  return value;
}
