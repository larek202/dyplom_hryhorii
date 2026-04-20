import {
  Table as MuiTable,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';

/**
 * Tabela: `columns` — [{ field, headerName?, align?, renderCell? }], `rows` — tablica obiektów.
 * @param {{ headerCellSx?: object; paperSx?: object; rowSx?: object | ((row: object) => object) }} props
 */
export default function Table({
  columns,
  rows,
  size = 'medium',
  emptyText = 'Brak danych',
  headerCellSx,
  paperSx,
  rowSx,
  ...tableContainerProps
}) {
  return (
    <TableContainer
      component={Paper}
      variant="outlined"
      sx={[
        {
          overflowX: 'auto',
          WebkitOverflowScrolling: 'touch',
          maxWidth: '100%',
        },
        paperSx,
      ]}
      {...tableContainerProps}
    >
      <MuiTable size={size}>
        <TableHead>
          <TableRow>
            {columns.map((col) => (
              <TableCell key={col.field} align={col.align || 'left'} sx={headerCellSx}>
                {col.headerName ?? col.field}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length || 1} align="center">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            rows.map((row, rowIndex) => {
              const rowKey = row.id ?? row._id ?? rowIndex;
              const resolvedRowSx = typeof rowSx === 'function' ? rowSx(row) : rowSx;
              return (
                <TableRow key={rowKey} hover sx={resolvedRowSx}>
                  {columns.map((col) => {
                    const align = col.align || 'left';
                    return (
                      <TableCell
                        key={col.field}
                        align={align}
                        sx={
                          align === 'right'
                            ? {
                                verticalAlign: 'middle',
                                '& > *': { display: 'inline-flex', justifyContent: 'flex-end' },
                              }
                            : undefined
                        }
                      >
                        {col.renderCell ? col.renderCell(row) : row[col.field]}
                      </TableCell>
                    );
                  })}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </MuiTable>
    </TableContainer>
  );
}
