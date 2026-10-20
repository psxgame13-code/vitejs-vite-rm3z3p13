import type { ReactNode } from 'react'

export type DataColumn<T> = {
  key: string
  header: string
  render: (row: T) => ReactNode
}

export function DataTable<T>({
  caption,
  columns,
  rows,
  rowKey,
  empty,
}: {
  caption: string
  columns: DataColumn<T>[]
  rows: T[]
  rowKey: (row: T) => string
  empty: string
}) {
  if (rows.length === 0) {
    return (
      <p className="nexo-card text-sm leading-6 text-slate-600" role="status">
        {empty}
      </p>
    )
  }

  return (
    <div className="nexo-card overflow-x-auto p-0 sm:p-0">
      <table className="w-full min-w-[36rem] border-separate border-spacing-0 text-left text-sm">
        <caption className="px-4 py-3 text-left text-sm font-extrabold text-brand-900">
          {caption}
        </caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className="border-b border-slate-200 px-4 py-2 text-xs font-bold uppercase tracking-wide text-slate-500"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="odd:bg-slate-50">
              {columns.map((column) => (
                <td key={column.key} className="border-b border-slate-100 px-4 py-3 align-top text-slate-800">
                  {column.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}